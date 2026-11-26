import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { BLOCKED } from './auth/guards';
import { Role, User } from './entities';
import { plainMail } from './mail-templates';
import { MailerService } from './mailer.service';
import { randomCode } from './common';

const ROLES: Role[] = ['student', 'teacher', 'parent', 'admin'];

@Injectable()
export class AdminService implements OnModuleInit {
  private log = new Logger('Admin');
  private sending = false;

  constructor(@InjectRepository(User) private users: Repository<User>, private mailer: MailerService) {}

  async onModuleInit() {
    const rows = await this.users.find({ where: { blocked: true }, select: ['id'] });
    rows.forEach((r) => BLOCKED.add(r.id));
  }

  async stats() {
    const q = <T>(sql: string, p: unknown[] = []) => this.users.query(sql, p) as Promise<T[]>;
    const [tot] = await q<{ total: string; students: string; teachers: string; parents: string; admins: string; unverified: string; blocked: string; today: string; week: string; active_today: string; active_week: string }>(
      `SELECT COUNT(*)::text total,
        COUNT(*) FILTER (WHERE role='student')::text students,
        COUNT(*) FILTER (WHERE role='teacher')::text teachers,
        COUNT(*) FILTER (WHERE role='parent')::text parents,
        COUNT(*) FILTER (WHERE role='admin')::text admins,
        COUNT(*) FILTER (WHERE NOT "emailVerified")::text unverified,
        COUNT(*) FILTER (WHERE blocked)::text blocked,
        COUNT(*) FILTER (WHERE "createdAt" >= date_trunc('day', now()))::text today,
        COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '7 days')::text week,
        COUNT(*) FILTER (WHERE "lastActiveDate" = CURRENT_DATE)::text active_today,
        COUNT(*) FILTER (WHERE "lastActiveDate" >= CURRENT_DATE - 6)::text active_week
       FROM users`,
    );
    const [att] = await q<{ today: string; week: string; correct_week: string; total: string }>(
      `SELECT COUNT(*) FILTER (WHERE "createdAt" >= date_trunc('day', now()))::text today,
        COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '7 days')::text week,
        COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '7 days' AND correct)::text correct_week,
        COUNT(*)::text total FROM attempts`,
    );
    const [cnt] = await q<{ topics: string; tasks: string; classes: string; subs: string; games: string }>(
      `SELECT (SELECT COUNT(*) FROM topics)::text topics, (SELECT COUNT(*) FROM tasks)::text tasks,
        (SELECT COUNT(*) FROM classrooms)::text classes,
        (SELECT COUNT(*) FROM subscriptions WHERE status='active' AND "expiresAt" > now())::text subs,
        (SELECT COUNT(*) FROM game_results)::text games`,
    );
    const reg = await q<{ d: string; n: string }>(
      `SELECT to_char(g::date,'YYYY-MM-DD') d, COUNT(u.id)::text n
       FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, interval '1 day') g
       LEFT JOIN users u ON u."createdAt"::date = g::date GROUP BY g ORDER BY g`,
    );
    const act = await q<{ d: string; n: string }>(
      `SELECT to_char(g::date,'YYYY-MM-DD') d, COUNT(a.id)::text n
       FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, interval '1 day') g
       LEFT JOIN attempts a ON a."createdAt"::date = g::date GROUP BY g ORDER BY g`,
    );
    const num = (v: string | undefined) => Number(v ?? 0);
    const week = num(att.week);
    return {
      users: { total: num(tot.total), students: num(tot.students), teachers: num(tot.teachers), parents: num(tot.parents), admins: num(tot.admins), unverified: num(tot.unverified), blocked: num(tot.blocked), today: num(tot.today), week: num(tot.week), activeToday: num(tot.active_today), activeWeek: num(tot.active_week) },
      attempts: { today: num(att.today), week, accuracyWeek: week ? Math.round((num(att.correct_week) / week) * 100) : 0, total: num(att.total) },
      content: { topics: num(cnt.topics), tasks: num(cnt.tasks), classes: num(cnt.classes), subscriptions: num(cnt.subs), games: num(cnt.games) },
      regSeries: reg.map((r) => ({ d: r.d, n: num(r.n) })),
      actSeries: act.map((r) => ({ d: r.d, n: num(r.n) })),
      system: { mail: this.mailer.enabled, uptimeH: Math.round(process.uptime() / 360) / 10, node: process.version },
    };
  }

  async list(query: { q?: string; role?: string; page?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const where: string[] = [];
    const params: unknown[] = [];
    if (query.q?.trim()) {
      params.push(`%${query.q.trim().toLowerCase()}%`);
      where.push(`(lower(email) LIKE $${params.length} OR lower(name) LIKE $${params.length})`);
    }
    if (query.role && ROLES.includes(query.role as Role)) {
      params.push(query.role);
      where.push(`role = $${params.length}`);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [{ n }] = await this.users.query(`SELECT COUNT(*)::text n FROM users ${w}`, params);
    const rows = await this.users.query(
      `SELECT id, email, name, role, grade, xp, coins, "dayStreak", "emailVerified", blocked, "createdAt", "lastActiveDate"
       FROM users ${w} ORDER BY "createdAt" DESC LIMIT 25 OFFSET ${(page - 1) * 25}`,
      params,
    );
    return { total: Number(n), page, rows };
  }

  async detail(id: string) {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Пользователь не найден');
    const [a] = await this.users.query(
      `SELECT COUNT(*)::text n, COUNT(*) FILTER (WHERE correct)::text c FROM attempts WHERE "userId" = $1`,
      [id],
    );
    const links: { name: string; email: string; role: string }[] = await this.users.query(
      `SELECT x.name, x.email, x.role FROM parent_links l JOIN users x ON x.id = CASE WHEN l."parentId" = $1 THEN l."studentId" ELSE l."parentId" END
       WHERE l."parentId" = $1 OR l."studentId" = $1`,
      [id],
    );
    const [cls] = u.classroomId ? await this.users.query(`SELECT name FROM classrooms WHERE id = $1`, [u.classroomId]) : [null];
    return {
      id: u.id, email: u.email, name: u.name, role: u.role, grade: u.grade, gender: u.gender, xp: u.xp, coins: u.coins, dayStreak: u.dayStreak,
      emailVerified: u.emailVerified, blocked: u.blocked, createdAt: u.createdAt, lastActiveDate: u.lastActiveDate, consentAt: u.consentAt,
      attempts: Number(a.n), correct: Number(a.c), classroom: cls?.name ?? null, links,
    };
  }

  private async target(adminId: string, id: string, allowSelf = false) {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Пользователь не найден');
    if (u.id === adminId && !allowSelf) throw new BadRequestException('Это действие нельзя применить к самому себе');
    return u;
  }

  async setBlocked(adminId: string, id: string, blocked: boolean) {
    const u = await this.target(adminId, id);
    u.blocked = blocked;
    await this.users.save(u);
    if (blocked) BLOCKED.add(id);
    else BLOCKED.delete(id);
    return { ok: true, blocked };
  }

  async setRole(adminId: string, id: string, role: Role) {
    if (!ROLES.includes(role)) throw new BadRequestException('Неизвестная роль');
    const u = await this.target(adminId, id);
    u.role = role;
    if (role === 'student' && !u.linkCode) u.linkCode = randomCode(6);
    await this.users.save(u);
    return { ok: true, role, note: 'Пользователю нужно выйти и войти снова.' };
  }

  async verifyEmail(adminId: string, id: string) {
    const u = await this.target(adminId, id, true);
    u.emailVerified = true;
    await this.users.save(u);
    return { ok: true };
  }

  async addCoins(adminId: string, id: string, delta: number) {
    const u = await this.target(adminId, id, true);
    u.coins = Math.max(0, u.coins + Math.trunc(delta));
    await this.users.save(u);
    return { ok: true, coins: u.coins };
  }

  /** Выдаёт временный пароль (показывается администратору один раз). */
  async tempPassword(adminId: string, id: string) {
    const u = await this.target(adminId, id);
    const pass = randomCode(8).toLowerCase();
    u.passwordHash = await bcrypt.hash(pass, 10);
    await this.users.save(u);
    return { password: pass };
  }

  async remove(adminId: string, id: string) {
    const u = await this.target(adminId, id);
    if (u.role === 'admin') throw new BadRequestException('Сначала снимите роль администратора');
    await this.users.manager.transaction(async (m) => {
      await m.query(`DELETE FROM attempts WHERE "userId" = $1`, [id]);
      await m.query(`DELETE FROM progress WHERE "userId" = $1`, [id]);
      await m.query(`DELETE FROM game_results WHERE "userId" = $1`, [id]);
      await m.query(`DELETE FROM quest_claims WHERE "userId" = $1`, [id]);
      await m.query(`DELETE FROM purchases WHERE "userId" = $1`, [id]);
      await m.query(`DELETE FROM parent_links WHERE "parentId" = $1 OR "studentId" = $1`, [id]);
      await m.query(`DELETE FROM subscriptions WHERE "parentId" = $1 OR "studentId" = $1`, [id]);
      await m.query(`DELETE FROM users WHERE id = $1`, [id]);
    });
    BLOCKED.delete(id);
    return { ok: true };
  }

  async topics(q?: string) {
    const params: unknown[] = [];
    let w = '';
    if (q?.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      w = `WHERE lower(t.title) LIKE $1`;
    }
    return this.users.query(
      `SELECT t.id, t.title, t.grade, t.subject, t.slug, (t."ownerId" IS NOT NULL) AS custom, (t.theory IS NOT NULL) AS "hasTheory",
        (SELECT COUNT(*) FROM tasks k WHERE k."topicId" = t.id)::int AS tasks,
        (SELECT COUNT(*) FROM attempts a WHERE a."topicId" = t.id)::int AS attempts
       FROM topics t ${w} ORDER BY t.grade, t.subject, t.position LIMIT 400`,
      params,
    );
  }

  /** Рассылка по подтверждённым почтам. Идёт в фоне, по одному письму в секунду. */
  async broadcast(subject: string, text: string, audience: string, dryRun: boolean) {
    const where = audience === 'all' ? '' : `AND role = '${['student', 'teacher', 'parent'].includes(audience) ? audience : 'student'}'`;
    const rows: { email: string }[] = await this.users.query(`SELECT email FROM users WHERE "emailVerified" AND NOT blocked ${where} LIMIT 280`);
    if (dryRun) return { count: rows.length, started: false };
    if (this.sending) throw new BadRequestException('Предыдущая рассылка ещё идёт');
    if (!this.mailer.enabled) throw new BadRequestException('Почта на сервере не настроена');
    this.sending = true;
    void (async () => {
      let ok = 0;
      const html = plainMail(text);
      for (const r of rows) {
        if (await this.mailer.send(r.email, subject, text, html)) ok++;
        await new Promise((res) => setTimeout(res, 1000));
      }
      this.log.log(`Рассылка «${subject}»: отправлено ${ok} из ${rows.length}`);
      this.sending = false;
    })();
    return { count: rows.length, started: true };
  }
}
