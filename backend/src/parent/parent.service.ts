import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParentLink, User } from '../entities';
import { LearningService } from '../learning/learning.service';
import { PLANS, SubscriptionsService } from '../subscriptions.service';

@Injectable()
export class ParentService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(ParentLink) private links: Repository<ParentLink>,
    private learning: LearningService,
    private subs: SubscriptionsService,
  ) {}

  /** Родитель привязывает ребёнка по коду из его профиля. */
  async link(parentId: string, rawCode: string) {
    const student = await this.users.findOne({
      where: { linkCode: rawCode.trim().toUpperCase(), role: 'student' },
    });
    if (!student) throw new NotFoundException('Ученик с таким кодом не найден');
    const exists = await this.links.findOne({ where: { parentId, studentId: student.id } });
    if (!exists) await this.links.save(this.links.create({ parentId, studentId: student.id }));
    return { id: student.id, name: student.name };
  }

  async children(parentId: string) {
    const links = await this.links.find({ where: { parentId } });
    const result: Awaited<ReturnType<LearningService['studentStats']>>[] = [];
    for (const l of links) result.push(await this.learning.studentStats(l.studentId));
    return result;
  }

  async subscribe(parentId: string, studentId: string, plan: string) {
    // Реальную оплату нужно подключить (ЮKassa и т. п.). Пока доступен только тестовый режим.
    if (process.env.PAYMENTS_MODE !== 'mock') {
      throw new NotImplementedException('Оплата не подключена: подключите платёжного провайдера');
    }
    if (!(plan in PLANS)) throw new NotFoundException('Неизвестный тариф');
    const link = await this.links.findOne({ where: { parentId, studentId } });
    if (!link) throw new ForbiddenException('Этот ребёнок не привязан к вашему аккаунту');
    const sub = await this.subs.grant(studentId, parentId, plan);
    return { studentId, until: sub.expiresAt };
  }
}
