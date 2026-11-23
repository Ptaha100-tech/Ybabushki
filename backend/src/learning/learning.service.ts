import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThanOrEqual, Repository } from 'typeorm';
import { Attempt, Homework, Progress, Task, Topic, User } from '../entities';
import { SubscriptionsService } from '../subscriptions.service';

/** Сколько заданий в день ученик решает бесплатно (домашние задания учителя не считаются). */
const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT ?? 10);
const MAX_LEVEL = 5;

@Injectable()
export class LearningService {
  constructor(
    @InjectRepository(Topic) private topics: Repository<Topic>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Progress) private progress: Repository<Progress>,
    @InjectRepository(Attempt) private attempts: Repository<Attempt>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Homework) private homeworks: Repository<Homework>,
    private subs: SubscriptionsService,
  ) {}

  listTopics() {
    return this.topics.find({ order: { grade: 'ASC', position: 'ASC' } });
  }

  private startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** Сколько бесплатных заданий осталось сегодня; null = без ограничений (есть подписка). */
  async remainingToday(userId: string): Promise<number | null> {
    if (await this.subs.hasActive(userId)) return null;
    const used = await this.attempts.count({
      where: { userId, homeworkId: IsNull(), createdAt: MoreThanOrEqual(this.startOfToday()) },
    });
    return Math.max(0, FREE_DAILY_LIMIT - used);
  }

  private limitReached() {
    return new ForbiddenException({
      code: 'LIMIT_REACHED',
      message: 'Бесплатный лимит на сегодня закончился',
    });
  }

  private async assertHomework(userId: string, homeworkId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    const hw = user?.classroomId
      ? await this.homeworks.findOne({ where: { id: homeworkId, classroomId: user.classroomId } })
      : null;
    if (!hw) throw new ForbiddenException('Это домашнее задание вам не выдано');
  }

  async nextTask(userId: string, topicId: string, homeworkId?: string, excludeTaskId?: string) {
    const topic = await this.topics.findOne({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Тема не найдена');

    let remaining: number | null = null;
    if (homeworkId) {
      await this.assertHomework(userId, homeworkId);
    } else {
      remaining = await this.remainingToday(userId);
      if (remaining === 0) throw this.limitReached();
    }

    const prog = await this.getProgress(userId, topicId);
    const task = await this.pickTask(topicId, prog.level, excludeTaskId);
    if (!task) throw new NotFoundException('В этой теме пока нет заданий');
    return { task: this.publicTask(task), level: prog.level, remaining };
  }

  async answer(userId: string, taskId: string, raw: string, homeworkId?: string) {
    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задание не найдено');

    if (homeworkId) {
      await this.assertHomework(userId, homeworkId);
    } else if ((await this.remainingToday(userId)) === 0) {
      throw this.limitReached();
    }

    const correct = this.check(task, raw);
    await this.attempts.save(
      this.attempts.create({ userId, taskId, topicId: task.topicId, correct, homeworkId: homeworkId ?? null }),
    );

    // Простая адаптивность: 3 верных подряд — уровень выше, ошибка — уровень ниже.
    const prog = await this.getProgress(userId, task.topicId);
    if (correct) {
      prog.streak += 1;
      if (prog.streak >= 3 && prog.level < MAX_LEVEL) {
        prog.level += 1;
        prog.streak = 0;
      }
    } else {
      prog.streak = 0;
      if (prog.level > 1) prog.level -= 1;
    }
    await this.progress.save(prog);

    const user = await this.users.findOneOrFail({ where: { id: userId } });
    if (correct) user.xp += 10;
    this.touchStreak(user);
    await this.users.save(user);

    return {
      correct,
      correctAnswer: correct ? null : task.data.answer,
      hint: correct ? null : task.hint,
      xp: user.xp,
      dayStreak: user.dayStreak,
      level: prog.level,
      remaining: homeworkId ? null : await this.remainingToday(userId),
    };
  }

  async studentStats(userId: string) {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    const total = await this.attempts.count({ where: { userId } });
    const correct = await this.attempts.count({ where: { userId, correct: true } });
    const sub = await this.subs.active(userId);
    return {
      id: user.id,
      name: user.name,
      xp: user.xp,
      dayStreak: user.dayStreak,
      total,
      correct,
      accuracy: total ? Math.round((correct / total) * 100) : 0,
      remaining: await this.remainingToday(userId),
      subscriptionUntil: sub ? sub.expiresAt : null,
    };
  }

  async myHomework(userId: string) {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    if (!user.classroomId) return [];
    const list = await this.homeworks.find({
      where: { classroomId: user.classroomId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    const result: { id: string; topicId: string; topicTitle: string; dueAt: Date | null; done: number }[] = [];
    for (const hw of list) {
      const topic = await this.topics.findOne({ where: { id: hw.topicId } });
      const done = await this.attempts.count({ where: { userId, homeworkId: hw.id } });
      result.push({ id: hw.id, topicId: hw.topicId, topicTitle: topic?.title ?? '—', dueAt: hw.dueAt, done });
    }
    return result;
  }

  // ---- внутреннее ----

  private async getProgress(userId: string, topicId: string): Promise<Progress> {
    const found = await this.progress.findOne({ where: { userId, topicId } });
    return found ?? this.progress.save(this.progress.create({ userId, topicId, level: 1, streak: 0 }));
  }

  /** Берёт случайное задание, ближайшее к текущему уровню ученика. */
  private async pickTask(topicId: string, level: number, excludeTaskId?: string): Promise<Task | null> {
    const exclude = excludeTaskId ?? '00000000-0000-0000-0000-000000000000';
    const rows: { id: string }[] = await this.tasks.query(
      `SELECT id FROM tasks WHERE "topicId" = $1 AND id <> $3 ORDER BY ABS(difficulty - $2), RANDOM() LIMIT 1`,
      [topicId, level, exclude],
    );
    if (!rows.length) {
      return this.tasks.findOne({ where: { topicId } });
    }
    return this.tasks.findOne({ where: { id: rows[0].id } });
  }

  /** Клиенту правильный ответ не отдаём. */
  private publicTask(t: Task) {
    return {
      id: t.id,
      topicId: t.topicId,
      type: t.type,
      prompt: t.prompt,
      options: t.data.options ?? null,
      difficulty: t.difficulty,
    };
  }

  private check(task: Task, raw: string): boolean {
    const norm = (s: string) => s.trim().replace(',', '.').toLowerCase();
    const a = norm(raw);
    const b = norm(task.data.answer);
    if (a === b) return true;
    const na = Number(a);
    const nb = Number(b);
    return a !== '' && !Number.isNaN(na) && !Number.isNaN(nb) && na === nb;
  }

  private touchStreak(user: User) {
    const today = new Date().toISOString().slice(0, 10);
    if (user.lastActiveDate === today) return;
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    user.dayStreak = user.lastActiveDate === yesterday ? user.dayStreak + 1 : 1;
    user.lastActiveDate = today;
  }
}
