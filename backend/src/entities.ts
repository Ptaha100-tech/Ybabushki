import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn, Unique } from 'typeorm';

export type Role = 'student' | 'teacher' | 'parent' | 'admin';
export type TaskType = 'choice' | 'number' | 'text' | 'order' | 'match';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ type: 'varchar' }) email: string;
  @Column({ type: 'varchar' }) passwordHash: string;
  @Column({ type: 'varchar' }) name: string;
  @Column({ type: 'varchar' }) role: Role;
  /** Код, по которому родитель привязывает ребёнка (только у учеников). */
  @Column({ type: 'varchar', nullable: true, unique: true }) linkCode: string | null;
  @Column({ type: 'uuid', nullable: true }) classroomId: string | null;
  @Column({ type: 'int', nullable: true }) grade: number | null;
  /** 'm' | 'f' — нужен, чтобы выбрать ведущего обучение героя. */
  @Column({ type: 'varchar', length: 1, nullable: true }) gender: string | null;
  @Column({ type: 'boolean', default: false }) emailVerified: boolean;
  /** Заблокирован администратором: войти и пользоваться сервисом нельзя. */
  @Column({ type: 'boolean', default: false }) blocked: boolean;
  /** Когда пользователь принял политику и условия. */
  @Column({ type: 'timestamp', nullable: true }) consentAt: Date | null;
  /** Одноразовые коды (хранятся хешем): 'reset' — сброс пароля, 'verify' — подтверждение почты. */
  @Column({ type: 'varchar', nullable: true }) resetHash: string | null;
  @Column({ type: 'timestamp', nullable: true }) resetExpires: Date | null;
  @Column({ type: 'int', default: 0 }) resetAttempts: number;
  @Column({ type: 'varchar', nullable: true }) verifyHash: string | null;
  @Column({ type: 'timestamp', nullable: true }) verifyExpires: Date | null;
  @Column({ type: 'int', default: 0 }) verifyAttempts: number;
  /** Родитель: отключены ли еженедельные письма, и когда последнее ушло. */
  @Column({ type: 'boolean', default: false }) reportsOff: boolean;
  @Column({ type: 'timestamp', nullable: true }) lastReportAt: Date | null;
  @Column({ type: 'int', default: 0 }) xp: number;
  /** Монеты: за верные ответы и ежедневные задания, тратятся в магазине. */
  @Column({ type: 'int', default: 0 }) coins: number;
  @Column({ type: 'varchar', nullable: true }) frame: string | null;
  @Column({ type: 'varchar', nullable: true }) titleId: string | null;
  @Column({ type: 'int', default: 0 }) dayStreak: number;
  @Column({ type: 'date', nullable: true }) lastActiveDate: string | null;
  @CreateDateColumn() createdAt: Date;
}

@Entity('classrooms')
export class Classroom {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar' }) name: string;
  /** Код, по которому ученики входят в класс. */
  @Column({ type: 'varchar', unique: true }) code: string;
  @Index() @Column({ type: 'uuid' }) teacherId: string;
  @CreateDateColumn() createdAt: Date;
}

@Entity('topics')
export class Topic {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar' }) title: string;
  @Column({ type: 'int' }) grade: number;
  @Column({ type: 'int' }) position: number;
  /** Устойчивый идентификатор темы из банка заданий (по нему идёт синхронизация). */
  @Index({ unique: true }) @Column({ type: 'varchar', nullable: true }) slug: string | null;
  @Column({ type: 'varchar', default: 'math' }) subject: string;
  @Column({ type: 'varchar', nullable: true }) icon: string | null;
  @Column({ type: 'varchar', nullable: true }) contentHash: string | null;
  /** Краткая теория перед заданиями (необязательно). */
  @Column({ type: 'text', nullable: true }) theory: string | null;
  /** Блок внутри предмета («Дроби и проценты»). */
  @Column({ type: 'varchar', nullable: true }) block: string | null;
  /** Тема, созданная учителем (у тем из общего банка пусто). */
  @Index() @Column({ type: 'uuid', nullable: true }) ownerId: string | null;
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) topicId: string;
  @Column({ type: 'varchar' }) type: TaskType;
  @Column({ type: 'text' }) prompt: string;
  /** Формат задания как данные: сайт и приложение рисуют его одним и тем же кодом. */
  @Column({ type: 'jsonb' }) data: {
    options?: string[];
    answer: string;
    accept?: string[];
    items?: string[];
    pairs?: [string, string][];
    explanation?: string;
  };
  @Column({ type: 'int' }) difficulty: number;
  @Column({ type: 'text', nullable: true }) hint: string | null;
}

@Entity('progress')
@Unique(['userId', 'topicId'])
export class Progress {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'uuid' }) topicId: string;
  @Column({ type: 'int', default: 1 }) level: number;
  @Column({ type: 'int', default: 0 }) streak: number;
}

@Entity('attempts')
export class Attempt {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'uuid' }) taskId: string;
  @Column({ type: 'uuid' }) topicId: string;
  @Column({ type: 'uuid', nullable: true }) homeworkId: string | null;
  @Column({ type: 'boolean' }) correct: boolean;
  @CreateDateColumn() createdAt: Date;
}

@Entity('quest_claims')
@Unique(['userId', 'date', 'questId'])
export class QuestClaim {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'varchar', length: 10 }) date: string;
  @Column({ type: 'varchar' }) questId: string;
}

@Entity('purchases')
@Unique(['userId', 'itemId'])
export class Purchase {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'varchar' }) itemId: string;
  @CreateDateColumn() createdAt: Date;
}

/** Картинки, поставленные администратором вместо встроенных (ключ вида hero:boy:wave). */
@Entity('art_overrides')
export class ArtOverride {
  @PrimaryColumn({ type: 'varchar' }) key: string;
  @Column({ type: 'bytea' }) data: Buffer;
  @Column({ type: 'varchar' }) mime: string;
  @Column({ type: 'bigint' }) version: string;
}

@Entity('game_results')
export class GameResult {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'varchar' }) game: string;
  @Column({ type: 'int' }) score: number;
  @Column({ type: 'int', default: 0 }) xp: number;
  @CreateDateColumn() createdAt: Date;
}

@Entity('homework')
export class Homework {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) classroomId: string;
  @Column({ type: 'uuid' }) topicId: string;
  @Column({ type: 'timestamptz', nullable: true }) dueAt: Date | null;
  @CreateDateColumn() createdAt: Date;
}

@Entity('parent_links')
@Unique(['parentId', 'studentId'])
export class ParentLink {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) parentId: string;
  @Column({ type: 'uuid' }) studentId: string;
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ type: 'uuid' }) studentId: string;
  @Column({ type: 'uuid' }) parentId: string;
  @Column({ type: 'varchar' }) plan: string;
  @Column({ type: 'varchar', default: 'active' }) status: string;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
  @CreateDateColumn() createdAt: Date;
}

export const ENTITIES = [
  User,
  Classroom,
  Topic,
  Task,
  Progress,
  Attempt,
  Homework,
  ParentLink,
  Subscription,
  GameResult,
  QuestClaim,
  Purchase,
  ArtOverride,
];
