import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Attempt, GameResult, Purchase, QuestClaim, User } from '../entities';
import { QUESTS, SHOP } from '../shop';

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Attempt) private attempts: Repository<Attempt>,
    @InjectRepository(GameResult) private games: Repository<GameResult>,
    @InjectRepository(QuestClaim) private claims: Repository<QuestClaim>,
    @InjectRepository(Purchase) private purchases: Repository<Purchase>,
  ) {}

  private startOfToday() {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  private async metrics(userId: string) {
    const since = this.startOfToday();
    const attempts = await this.attempts.count({ where: { userId, createdAt: MoreThanOrEqual(since) } });
    const correct = await this.attempts.count({ where: { userId, correct: true, createdAt: MoreThanOrEqual(since) } });
    const topics: { n: string }[] = await this.attempts.query(
      `SELECT COUNT(DISTINCT "topicId")::text AS n FROM attempts WHERE "userId" = $1 AND "createdAt" >= $2`,
      [userId, since],
    );
    const games = await this.games.count({ where: { userId, createdAt: MoreThanOrEqual(since) } });
    return { attempts, correct, topics: Number(topics[0]?.n ?? 0), games };
  }

  async quests(userId: string) {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    const m = await this.metrics(userId);
    const claimed = new Set((await this.claims.find({ where: { userId, date: this.today() } })).map((c) => c.questId));
    return {
      coins: user.coins,
      quests: QUESTS.map((q) => ({
        id: q.id,
        title: q.title,
        icon: q.icon,
        target: q.target,
        reward: q.reward,
        progress: Math.min(q.target, m[q.metric]),
        claimed: claimed.has(q.id),
      })),
    };
  }

  async claim(userId: string, questId: string) {
    const q = QUESTS.find((x) => x.id === questId);
    if (!q) throw new NotFoundException('Задание не найдено');
    const m = await this.metrics(userId);
    if (m[q.metric] < q.target) throw new BadRequestException('Задание ещё не выполнено');
    const date = this.today();
    if (await this.claims.findOne({ where: { userId, date, questId } })) throw new BadRequestException('Награда уже получена');
    try {
      await this.claims.save(this.claims.create({ userId, date, questId }));
    } catch {
      throw new BadRequestException('Награда уже получена');
    }
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    user.coins += q.reward;
    await this.users.save(user);
    return { coins: user.coins, reward: q.reward };
  }

  async shop(userId: string) {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    const owned = new Set((await this.purchases.find({ where: { userId } })).map((p) => p.itemId));
    return {
      coins: user.coins,
      frame: user.frame,
      titleId: user.titleId,
      items: SHOP.map((i) => ({ ...i, owned: owned.has(i.id), equipped: user.frame === i.id || user.titleId === i.id })),
    };
  }

  async buy(userId: string, itemId: string) {
    const item = SHOP.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Товар не найден');
    if (await this.purchases.findOne({ where: { userId, itemId } })) throw new BadRequestException('Уже куплено');
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    if (user.coins < item.price) throw new BadRequestException('Не хватает монет');
    user.coins -= item.price;
    if (item.kind === 'frame') user.frame = item.id;
    else user.titleId = item.id;
    await this.users.save(user);
    await this.purchases.save(this.purchases.create({ userId, itemId }));
    return this.shop(userId);
  }

  /** Надеть купленное; itemId = 'none-frame' или 'none-title' снимает. */
  async equip(userId: string, itemId: string) {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    if (itemId === 'none-frame') user.frame = null;
    else if (itemId === 'none-title') user.titleId = null;
    else {
      const item = SHOP.find((i) => i.id === itemId);
      if (!item) throw new NotFoundException('Товар не найден');
      if (!(await this.purchases.findOne({ where: { userId, itemId } }))) throw new BadRequestException('Сначала купите');
      if (item.kind === 'frame') user.frame = item.id;
      else user.titleId = item.id;
    }
    await this.users.save(user);
    return this.shop(userId);
  }
}
