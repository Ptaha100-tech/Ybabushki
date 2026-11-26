import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Attempt, Homework, Progress, Task, Topic } from './entities';
import { parseTasks } from './teacher-content';

const MAX_TOPICS_PER_TEACHER = 50;

@Injectable()
export class TeacherContentService {
  constructor(
    @InjectRepository(Topic) private topics: Repository<Topic>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Homework) private homeworks: Repository<Homework>,
    @InjectRepository(Progress) private progress: Repository<Progress>,
    @InjectRepository(Attempt) private attempts: Repository<Attempt>,
  ) {}

  async list(teacherId: string) {
    const rows: { id: string; title: string; grade: number; subject: string; n: string }[] = await this.topics.query(
      `SELECT t.id, t.title, t.grade, t.subject, (SELECT COUNT(*) FROM tasks k WHERE k."topicId" = t.id)::text AS n
       FROM topics t WHERE t."ownerId" = $1 ORDER BY t.title`,
      [teacherId],
    );
    return rows.map((r) => ({ id: r.id, title: r.title, grade: r.grade, subject: r.subject, tasks: Number(r.n) }));
  }

  async create(teacherId: string, dto: { title: string; grade: number; subject: string; text: string }) {
    if ((await this.topics.count({ where: { ownerId: teacherId } })) >= MAX_TOPICS_PER_TEACHER) {
      throw new BadRequestException('Достигнут предел: 50 своих тем');
    }
    const parsed = parseTasks(dto.text);
    const topic = await this.topics.save(
      this.topics.create({ title: dto.title.trim(), grade: dto.grade, position: 0, slug: null, subject: dto.subject, icon: null, contentHash: null, theory: null, ownerId: teacherId }),
    );
    await this.tasks.save(
      parsed.map((p) =>
        this.tasks.create({
          topicId: topic.id,
          type: p.type,
          prompt: p.prompt,
          data: { answer: p.answer, options: p.options, accept: p.accept },
          difficulty: 2,
          hint: null,
        }),
      ),
    );
    return { id: topic.id, title: topic.title, tasks: parsed.length };
  }

  async remove(teacherId: string, topicId: string) {
    const topic = await this.topics.findOne({ where: { id: topicId, ownerId: teacherId } });
    if (!topic) throw new NotFoundException('Тема не найдена');
    await this.homeworks.delete({ topicId });
    await this.progress.delete({ topicId });
    await this.attempts.delete({ topicId });
    await this.tasks.delete({ topicId });
    await this.topics.delete({ id: In([topicId]) });
    return { ok: true };
  }
}
