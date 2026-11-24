import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

export type Role = 'student' | 'teacher' | 'parent';
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
  @Column({ type: 'int', default: 0 }) xp: number;
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
];
