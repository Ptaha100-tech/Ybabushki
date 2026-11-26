import { ChildReport, reportMail } from './mail-templates';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailerService } from './mailer.service';
import { ParentLink, User } from './entities';

/** Еженедельное письмо родителю об успехах детей (по понедельникам, если настроена почта). */
@Injectable()
export class ReportsService implements OnModuleInit, OnModuleDestroy {
  private log = new Logger('Reports');
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(ParentLink) private links: Repository<ParentLink>,
    private mailer: MailerService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.tick().catch((e) => this.log.error(e.message)), 60 * 60_000);
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    const now = new Date();
    if (!this.mailer.enabled || now.getUTCDay() !== 1 || now.getUTCHours() < 6) return;
    const parents = await this.users.find({ where: { role: 'parent', reportsOff: false } });
    for (const p of parents) {
      if (p.lastReportAt && now.getTime() - p.lastReportAt.getTime() < 6 * 864e5) continue;
      await this.sendFor(p).catch((e) => this.log.error(`${p.email}: ${e.message}`));
    }
  }

  /** Отправляет отчёт сейчас. Возвращает false, если детей нет или письмо не ушло. */
  async sendFor(parent: User): Promise<boolean> {
    const links = await this.links.find({ where: { parentId: parent.id } });
    if (links.length === 0) return false;
    const kids: ChildReport[] = [];
    for (const l of links) {
      const child = await this.users.findOne({ where: { id: l.studentId } });
      if (!child) continue;
      const w: { n: string; c: string }[] = await this.users.query(
        `SELECT COUNT(*)::text AS n, COALESCE(SUM(CASE WHEN correct THEN 1 ELSE 0 END), 0)::text AS c FROM attempts WHERE "userId" = $1 AND "createdAt" >= now() - interval '7 days'`,
        [child.id],
      );
      const weak: { title: string }[] = await this.users.query(
        `SELECT t.title FROM attempts a JOIN topics t ON t.id = a."topicId"
         WHERE a."userId" = $1 AND a."createdAt" >= now() - interval '14 days'
         GROUP BY t.id HAVING COUNT(*) >= 4
         ORDER BY SUM(CASE WHEN a.correct THEN 1 ELSE 0 END)::float / COUNT(*) ASC LIMIT 3`,
        [child.id],
      );
      const n = Number(w[0]?.n ?? 0);
      const c = Number(w[0]?.c ?? 0);
      kids.push({ name: child.name, grade: child.grade ?? null, n, c, streak: child.dayStreak, xp: child.xp, weak: weak.map((x) => x.title) });
    }
    if (kids.length === 0) return false;
    const m = reportMail(parent.name, kids);
    const ok = await this.mailer.send(parent.email, m.subject, m.text, m.html);
    if (ok) {
      parent.lastReportAt = new Date();
      await this.users.save(parent);
    }
    return ok;
  }

  async sendNow(parentId: string) {
    const parent = await this.users.findOneOrFail({ where: { id: parentId } });
    const ok = await this.sendFor(parent);
    return { ok, mail: this.mailer.enabled };
  }

  async setEnabled(parentId: string, enabled: boolean) {
    await this.users.update({ id: parentId }, { reportsOff: !enabled });
    return { enabled };
  }
}
