import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { buildAll } from './content';
import { Attempt, Homework, Progress, Task, Topic } from './entities';

/**
 * При каждом запуске синхронизирует банк заданий (backend/src/content) с базой:
 * новые темы добавляются, изменённые обновляются, старые тестовые темы без slug удаляются.
 * Прогресс учеников по неизменённым темам сохраняется.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private log = new Logger('Seed');

  constructor(
    @InjectRepository(Topic) private topics: Repository<Topic>,
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(Progress) private progress: Repository<Progress>,
    @InjectRepository(Attempt) private attempts: Repository<Attempt>,
    @InjectRepository(Homework) private homeworks: Repository<Homework>,
  ) {}

  async onApplicationBootstrap() {
    // 1. Удаляем старые темы первой версии (без slug) вместе с зависимыми данными.
    const legacy = await this.topics.find({ where: { slug: IsNull(), ownerId: IsNull() } });
    if (legacy.length) {
      const ids = legacy.map((t) => t.id);
      await this.homeworks.delete({ topicId: In(ids) });
      await this.progress.delete({ topicId: In(ids) });
      await this.attempts.delete({ topicId: In(ids) });
      await this.tasks.delete({ topicId: In(ids) });
      await this.topics.delete({ id: In(ids) });
      this.log.log(`Удалено старых тем: ${legacy.length}`);
    }

    // 2. Синхронизируем банк заданий.
    const bank = buildAll();
    const existing = new Map((await this.topics.find()).map((t) => [t.slug, t]));
    let added = 0;
    let updated = 0;
    for (const t of bank) {
      const row = existing.get(t.slug);
      if (row && row.contentHash === t.contentHash) {
        if (row.position !== t.position) await this.topics.update(row.id, { position: t.position });
        continue;
      }
      const topic =
        row ??
        (await this.topics.save(
          this.topics.create({ slug: t.slug, title: t.title, grade: t.grade, position: t.position, subject: t.subject, icon: t.icon, contentHash: null, theory: null, ownerId: null }),
        ));
      if (row) {
        await this.tasks.delete({ topicId: row.id });
        updated++;
      } else added++;
      const rows = t.tasks.map((s) =>
        this.tasks.create({ topicId: topic.id, type: s.type, prompt: s.prompt, data: s.data, difficulty: s.difficulty, hint: s.hint }),
      );
      for (let i = 0; i < rows.length; i += 300) await this.tasks.save(rows.slice(i, i + 300));
      await this.topics.update(topic.id, {
        title: t.title, grade: t.grade, position: t.position, subject: t.subject, icon: t.icon, contentHash: t.contentHash, theory: t.theory, block: t.block,
      });
    }

    // 3. Темы, которых больше нет в банке, удаляем.
    const slugs = new Set(bank.map((t) => t.slug));
    const gone = [...existing.values()].filter((t) => t.slug && !slugs.has(t.slug));
    if (gone.length) {
      const ids = gone.map((t) => t.id);
      await this.homeworks.delete({ topicId: In(ids) });
      await this.progress.delete({ topicId: In(ids) });
      await this.tasks.delete({ topicId: In(ids) });
      await this.topics.delete({ id: In(ids) });
    }
    this.log.log(`Банк заданий: тем ${bank.length}; добавлено ${added}, обновлено ${updated}, удалено ${gone.length}`);
  }
}
