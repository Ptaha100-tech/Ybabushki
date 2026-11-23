import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomCode } from '../common';
import { Attempt, Classroom, Homework, Topic, User } from '../entities';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Classroom) private classes: Repository<Classroom>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Topic) private topics: Repository<Topic>,
    @InjectRepository(Homework) private homeworks: Repository<Homework>,
    @InjectRepository(Attempt) private attempts: Repository<Attempt>,
  ) {}

  async create(teacherId: string, name: string) {
    let code = randomCode(6);
    while (await this.classes.findOne({ where: { code } })) code = randomCode(6);
    const c = await this.classes.save(this.classes.create({ name: name.trim(), code, teacherId }));
    return { id: c.id, name: c.name, code: c.code, students: 0 };
  }

  async listMine(teacherId: string) {
    const list = await this.classes.find({ where: { teacherId }, order: { createdAt: 'DESC' } });
    const result: { id: string; name: string; code: string; students: number }[] = [];
    for (const c of list) {
      const students = await this.users.count({ where: { classroomId: c.id } });
      result.push({ id: c.id, name: c.name, code: c.code, students });
    }
    return result;
  }

  /** Ученик входит в класс по коду. */
  async join(studentId: string, rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    const c = await this.classes.findOne({ where: { code } });
    if (!c) throw new NotFoundException('Класс с таким кодом не найден');
    await this.users.update({ id: studentId }, { classroomId: c.id });
    return { id: c.id, name: c.name };
  }

  /** Карточка класса: ученики, результаты по темам, выданные домашние задания. */
  async detail(teacherId: string, classId: string) {
    const c = await this.own(teacherId, classId);
    const students = await this.users.find({ where: { classroomId: c.id }, order: { name: 'ASC' } });
    const ids = students.map((s) => s.id);

    let perStudent: { userId: string; total: string; correct: string }[] = [];
    let perTopic: { topicId: string; total: string; correct: string }[] = [];
    if (ids.length) {
      perStudent = await this.attempts
        .createQueryBuilder('a')
        .select('a.userId', 'userId')
        .addSelect('COUNT(*)', 'total')
        .addSelect('SUM(CASE WHEN a.correct THEN 1 ELSE 0 END)', 'correct')
        .where('a.userId IN (:...ids)', { ids })
        .groupBy('a.userId')
        .getRawMany();
      perTopic = await this.attempts
        .createQueryBuilder('a')
        .select('a.topicId', 'topicId')
        .addSelect('COUNT(*)', 'total')
        .addSelect('SUM(CASE WHEN a.correct THEN 1 ELSE 0 END)', 'correct')
        .where('a.userId IN (:...ids)', { ids })
        .groupBy('a.topicId')
        .getRawMany();
    }

    const topicTitles = new Map((await this.topics.find()).map((t) => [t.id, t.title]));
    const homework = await this.homeworks.find({ where: { classroomId: c.id }, order: { createdAt: 'DESC' }, take: 20 });

    return {
      id: c.id,
      name: c.name,
      code: c.code,
      students: students.map((s) => {
        const row = perStudent.find((r) => r.userId === s.id);
        const total = row ? Number(row.total) : 0;
        const correct = row ? Number(row.correct) : 0;
        return { id: s.id, name: s.name, xp: s.xp, total, correct, accuracy: total ? Math.round((correct / total) * 100) : 0 };
      }),
      topics: perTopic.map((r) => ({
        topicId: r.topicId,
        title: topicTitles.get(r.topicId) ?? '—',
        total: Number(r.total),
        correct: Number(r.correct),
      })),
      homework: homework.map((h) => ({
        id: h.id,
        topicTitle: topicTitles.get(h.topicId) ?? '—',
        dueAt: h.dueAt,
        createdAt: h.createdAt,
      })),
    };
  }

  async assignHomework(teacherId: string, classId: string, topicId: string, dueAt?: string) {
    const c = await this.own(teacherId, classId);
    const topic = await this.topics.findOne({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Тема не найдена');
    const hw = await this.homeworks.save(
      this.homeworks.create({ classroomId: c.id, topicId, dueAt: dueAt ? new Date(dueAt) : null }),
    );
    return { id: hw.id, topicTitle: topic.title };
  }

  private async own(teacherId: string, classId: string): Promise<Classroom> {
    const c = await this.classes.findOne({ where: { id: classId } });
    if (!c) throw new NotFoundException('Класс не найден');
    if (c.teacherId !== teacherId) throw new ForbiddenException('Это не ваш класс');
    return c;
  }
}
