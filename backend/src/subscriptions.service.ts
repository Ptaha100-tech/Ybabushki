import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Subscription } from './entities';

export const PLANS: Record<string, number> = { month: 30, year: 365 }; // дни

@Injectable()
export class SubscriptionsService {
  constructor(@InjectRepository(Subscription) private subs: Repository<Subscription>) {}

  /** Действующая подписка ученика (с самой поздней датой окончания) или null. */
  active(studentId: string): Promise<Subscription | null> {
    return this.subs.findOne({
      where: { studentId, status: 'active', expiresAt: MoreThan(new Date()) },
      order: { expiresAt: 'DESC' },
    });
  }

  async hasActive(studentId: string): Promise<boolean> {
    return (await this.active(studentId)) !== null;
  }

  /** Продлевает подписку от даты окончания текущей (или от сегодня). */
  async grant(studentId: string, parentId: string, plan: string): Promise<Subscription> {
    const days = PLANS[plan];
    const current = await this.active(studentId);
    const from = current ? current.expiresAt : new Date();
    const expiresAt = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
    return this.subs.save(this.subs.create({ studentId, parentId, plan, status: 'active', expiresAt }));
  }
}
