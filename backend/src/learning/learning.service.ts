import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThanOrEqual, Repository } from 'typeorm';
import { Attempt, GameResult, Homework, Progress, Task, Topic, User } from '../entities';
import { SUBJECTS } from '../content/subjects';
import { badgesFor, levelInfo } from '../gamification';
import { SubscriptionsService } from '../subscriptions.service';

/** Сколько заданий в день ученик решает бесплатно (домашние задания учителя не считаются). */
const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT ?? 20);
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
    @InjectRepository(GameResult) private games: Repository<GameResult>,
    private subs: SubscriptionsService,
  ) {}

  listTopics() {
    return this.topics.find({ order: { position: 'ASC' } });
  }

  /** Каталог для клиента: предметы и темы (с уровнем ученика по каждой теме). */
  async catalog(userId: string) {
    const topics = await this.topics.find({ order: { position: 'ASC' } });
    const counts: { topicId: string; n: string }[] = await this.tasks.query(
      `SELECT "topicId", COUNT(*)::text AS n FROM tasks GROUP BY "topicId"`,
    );
    const nMap = new Map(counts.map((c) => [c.topicId, Number(c.n)]));
    const prog = await this.progress.find({ where: { userId } });
    const pMap = new Map(prog.map((p) => [p.topicId, p.level]));
    const user = await this.users.findOne({ where: { id: userId } });
    return {
      grade: user?.grade ?? null,
      subjects: SUBJECTS,
      topics: topics.map((t) => ({
        id: t.id, title: t.title, grade: t.grade, subject: t.subject, icon: t.icon,
        tasks: nMap.get(t.id) ?? 0, level: pMap.get(t.id) ?? null,
      })),
    };
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
    const task = await this.pickTask(userId, topicId, prog.level, excludeTaskId);
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
      correctAnswer: correct ? null : this.showAnswer(task),
      explanation: task.data.explanation ?? null,
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
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    const subj: { n: string }[] = await this.attempts.query(
      `SELECT COUNT(DISTINCT t.subject)::text AS n FROM attempts a JOIN topics t ON t.id = a."topicId" WHERE a."userId" = $1`,
      [userId],
    );
    const gamesPlayed = await this.games.count({ where: { userId } });
    return {
      id: user.id,
      name: user.name,
      grade: user.grade,
      xp: user.xp,
      dayStreak: user.dayStreak,
      ...levelInfo(user.xp),
      badges: badgesFor({ total, correct, dayStreak: user.dayStreak, accuracy, subjects: Number(subj[0]?.n ?? 0), games: gamesPlayed }),
      total,
      correct,
      accuracy,
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

  /** Берёт случайное задание, ближайшее к уровню ученика, не повторяя недавно решённые. */
  private async pickTask(userId: string, topicId: string, level: number, excludeTaskId?: string): Promise<Task | null> {
    const recent: { taskId: string }[] = await this.attempts.query(
      `SELECT "taskId" FROM attempts WHERE "userId" = $1 AND "topicId" = $2 ORDER BY "createdAt" DESC LIMIT 15`,
      [userId, topicId],
    );
    const excl = recent.map((r) => r.taskId);
    if (excludeTaskId && /^[0-9a-f-]{36}$/i.test(excludeTaskId)) excl.push(excludeTaskId);
    for (const list of [excl, excludeTaskId ? [excludeTaskId] : []]) {
      const rows: { id: string }[] = await this.tasks.query(
        `SELECT id FROM tasks WHERE "topicId" = $1 AND id <> ALL($3::uuid[]) ORDER BY ABS(difficulty - $2), RANDOM() LIMIT 1`,
        [topicId, level, list],
      );
      if (rows.length) return this.tasks.findOne({ where: { id: rows[0].id } });
    }
    return this.tasks.findOne({ where: { topicId } });
  }

  private shuffled<T>(arr: T[], differFrom?: string): T[] {
    for (let k = 0; k < 10; k++) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      if (!differFrom || a.join('|') !== differFrom) return a;
    }
    return arr.slice().reverse();
  }

  /** Клиенту правильный ответ не отдаём. */
  publicTask(t: Task) {
    return {
      id: t.id,
      topicId: t.topicId,
      type: t.type,
      prompt: t.prompt,
      options: t.data.options ?? null,
      items: t.type === 'order' && t.data.items ? this.shuffled(t.data.items, t.data.items.join('|')) : null,
      lefts: t.type === 'match' && t.data.pairs ? t.data.pairs.map((p) => p[0]) : null,
      rights: t.type === 'match' && t.data.pairs ? this.shuffled(t.data.pairs.map((p) => p[1])) : null,
      difficulty: t.difficulty,
    };
  }

  private showAnswer(t: Task): string {
    if (t.type === 'order') return (t.data.items ?? []).join(' → ');
    if (t.type === 'match') return (t.data.pairs ?? []).map((p) => `${p[0]} — ${p[1]}`).join('; ');
    return t.data.answer;
  }

  private static norm(s: string): string {
    return s.toLowerCase().replace(/ё/g, 'е').replace(/[\s]+/g, ' ').replace(/[.!]+$/, '').trim();
  }

  private static toNumber(s: string): number | null {
    const x = s.trim().replace(',', '.').replace(/\s+/g, '');
    if (/^-?\d+(\.\d+)?$/.test(x)) return Number(x);
    const f = x.match(/^(-?\d+)\/(\d+)$/);
    return f && Number(f[2]) !== 0 ? Number(f[1]) / Number(f[2]) : null;
  }

  private check(task: Task, raw: string): boolean {
    const N = LearningService.norm;
    const data = task.data;
    switch (task.type) {
      case 'choice':
        return raw.trim() === data.answer.trim();
      case 'order':
        return raw.trim() === data.answer;
      case 'match': {
        const want = new Map((data.pairs ?? []).map((p) => [p[0], p[1]]));
        const got = raw.split('|').map((x) => x.split(/=(.*)/s));
        return got.length === want.size && got.every(([l, r]) => want.get(l) === r);
      }
      default: {
        const given = raw.trim();
        if (!given) return false;
        const variants = [data.answer, ...(data.accept ?? [])];
        if (variants.some((v) => N(v) === N(given))) return true;
        const g = LearningService.toNumber(given);
        return g !== null && variants.some((v) => {
          const n = LearningService.toNumber(v);
          return n !== null && Math.abs(n - g) < 1e-9;
        });
      }
    }
  }

  private touchStreak(user: User) {
    const today = new Date().toISOString().slice(0, 10);
    if (user.lastActiveDate === today) return;
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    user.dayStreak = user.lastActiveDate === yesterday ? user.dayStreak + 1 : 1;
    user.lastActiveDate = today;
  }
}
