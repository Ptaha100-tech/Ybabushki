import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { GameResult, User } from '../entities';
import { Task } from '../entities';

const DAILY_GAME_XP_CAP = 100;
const PER_GAME_CAP: Record<string, number> = { lightning: 60, memory: 40, balloons: 40, truefalse: 40 };

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Task) private tasks: Repository<Task>,
    @InjectRepository(GameResult) private results: Repository<GameResult>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  /** «Молния»: быстрые вопросы (выбор/число). Это игра, ответы клиент проверяет сам. */
  async lightning(userId: string, subject?: string, grade?: number, mode?: string) {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    const g = grade ?? user.grade ?? null;
    const params: unknown[] = [];
    let where = `t.type IN ('choice','number') AND length(t.prompt) < 110 AND t.difficulty <= 4`;
    if (mode === 'tf') where = `t.type = 'choice' AND t.data::text LIKE '%"Верно"%' AND t.data::text LIKE '%"Неверно"%' AND length(t.prompt) < 140`;
    else if (mode === 'choice') where = `t.type = 'choice' AND jsonb_array_length(t.data->'options') BETWEEN 3 AND 4 AND length(t.prompt) < 110 AND t.difficulty <= 4`;
    if (subject) {
      params.push(subject);
      where += ` AND tp.subject = $${params.length}`;
    }
    if (g) {
      params.push(g);
      where += ` AND tp.grade BETWEEN $${params.length}::int - 1 AND $${params.length}::int + 1`;
    }
    const rows: Task[] = await this.tasks.query(
      `SELECT t.id, t.type, t.prompt, t.data, t.difficulty FROM tasks t JOIN topics tp ON tp.id = t."topicId" WHERE ${where} ORDER BY RANDOM() LIMIT 40`,
      params,
    );
    return {
      tasks: rows.map((r) => ({
        id: r.id,
        type: r.type,
        prompt: r.prompt,
        options: r.data.options ?? null,
        answer: r.data.answer,
      })),
    };
  }

  /** «Найди пару»: пары из заданий на соответствие. */
  async memory(userId: string, subject?: string, grade?: number) {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    const g = grade ?? user.grade ?? null;
    const params: unknown[] = [];
    let where = `t.type = 'match'`;
    if (subject) {
      params.push(subject);
      where += ` AND tp.subject = $${params.length}`;
    }
    if (g) {
      params.push(g);
      where += ` AND tp.grade BETWEEN $${params.length}::int - 1 AND $${params.length}::int + 1`;
    }
    const rows: Task[] = await this.tasks.query(
      `SELECT t.data FROM tasks t JOIN topics tp ON tp.id = t."topicId" WHERE ${where} ORDER BY RANDOM() LIMIT 8`,
      params,
    );
    const pairs: [string, string][] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      for (const p of r.data.pairs ?? []) {
        if (pairs.length >= 6) break;
        if (seen.has(p[0]) || seen.has(p[1])) continue;
        seen.add(p[0]);
        seen.add(p[1]);
        pairs.push(p);
      }
      if (pairs.length >= 6) break;
    }
    return { pairs };
  }

  async submit(userId: string, game: string, score: number) {
    if (!(game in PER_GAME_CAP)) throw new BadRequestException('Неизвестная игра');
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = await this.results.find({ where: { userId, createdAt: MoreThanOrEqual(start) } });
    const earned = today.reduce((n, r) => n + r.xp, 0);
    const xp = Math.max(0, Math.min(Math.floor(score), PER_GAME_CAP[game], DAILY_GAME_XP_CAP - earned));
    await this.results.save(this.results.create({ userId, game, score: Math.floor(score), xp }));
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    user.xp += xp;
    await this.users.save(user);
    return { xp, totalXp: user.xp, dailyCapReached: earned + xp >= DAILY_GAME_XP_CAP };
  }

  async leaderboard(userId: string) {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    const week: { id: string; xp: string }[] = await this.users.query(
      `SELECT u.id, (COALESCE(a.x, 0) + COALESCE(g.x, 0))::text AS xp
       FROM users u
       LEFT JOIN (SELECT "userId", COUNT(*) FILTER (WHERE correct) * 10 AS x FROM attempts WHERE "createdAt" >= now() - interval '7 days' GROUP BY "userId") a ON a."userId" = u.id
       LEFT JOIN (SELECT "userId", SUM(xp) AS x FROM game_results WHERE "createdAt" >= now() - interval '7 days' GROUP BY "userId") g ON g."userId" = u.id
       WHERE u.id = $1 OR (u."classroomId" IS NOT NULL AND u."classroomId" = $2 AND u.role = 'student')`,
      [userId, user.classroomId],
    );
    const weekXp = new Map(week.map((w) => [w.id, Number(w.xp)]));
    const myWeekXp = weekXp.get(userId) ?? 0;
    if (!user.classroomId) return { classroom: false, rows: [] as { name: string; xp: number; me: boolean }[], weekRows: [] as { name: string; xp: number; me: boolean }[], myWeekXp };
    const rows = await this.users.find({
      where: { classroomId: user.classroomId, role: 'student' },
      order: { xp: 'DESC' },
      take: 20,
    });
    return {
      classroom: true,
      rows: rows.map((r) => ({ name: r.name, xp: r.xp, me: r.id === userId })),
      weekRows: rows
        .map((r) => ({ name: r.name, xp: weekXp.get(r.id) ?? 0, me: r.id === userId }))
        .sort((a, b) => b.xp - a.xp),
      myWeekXp,
    };
  }
}
