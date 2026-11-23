import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, Topic } from './entities';

const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Spec {
  title: string;
  grade: number;
  hint: string;
  /** Генератор примера для сложности d = 1..5. */
  gen: (d: number) => { prompt: string; answer: number };
}

const SPECS: Spec[] = [
  {
    title: 'Сложение в пределах 20',
    grade: 1,
    hint: 'Начни с большего числа и прибавляй меньшее по одному.',
    gen: (d) => {
      const max = [10, 12, 15, 18, 20][d - 1];
      const a = rnd(1, max - 1);
      const b = rnd(1, max - a);
      return { prompt: `${a} + ${b} = ?`, answer: a + b };
    },
  },
  {
    title: 'Вычитание в пределах 20',
    grade: 1,
    hint: 'Отсчитай нужное количество назад от большего числа.',
    gen: (d) => {
      const max = [10, 12, 15, 18, 20][d - 1];
      const a = rnd(2, max);
      const b = rnd(1, a - 1);
      return { prompt: `${a} − ${b} = ?`, answer: a - b };
    },
  },
  {
    title: 'Таблица умножения',
    grade: 2,
    hint: 'Умножение — это сложение одинаковых чисел: 4 × 3 = 4 + 4 + 4.',
    gen: (d) => {
      const m = [3, 5, 7, 9, 10][d - 1];
      const a = rnd(2, m);
      const b = rnd(2, m);
      return { prompt: `${a} × ${b} = ?`, answer: a * b };
    },
  },
  {
    title: 'Деление',
    grade: 3,
    hint: 'Вспомни таблицу умножения: на что нужно умножить делитель, чтобы получить делимое?',
    gen: (d) => {
      const m = [3, 5, 7, 9, 10][d - 1];
      const b = rnd(2, m);
      const q = rnd(2, m);
      return { prompt: `${b * q} ÷ ${b} = ?`, answer: q };
    },
  },
  {
    title: 'Умножение на однозначное число',
    grade: 4,
    hint: 'Умножь отдельно десятки и единицы, потом сложи результаты.',
    gen: (d) => {
      const maxA = [30, 50, 99, 150, 250][d - 1];
      const maxB = [3, 5, 7, 9, 9][d - 1];
      const a = rnd(11, maxA);
      const b = rnd(2, maxB);
      return { prompt: `${a} × ${b} = ?`, answer: a * b };
    },
  },
];

const TASKS_PER_LEVEL = 12;

/** При первом запуске создаёт темы и сгенерированные задания по математике 1–4 классов. */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private log = new Logger('Seed');

  constructor(
    @InjectRepository(Topic) private topics: Repository<Topic>,
    @InjectRepository(Task) private tasks: Repository<Task>,
  ) {}

  async onApplicationBootstrap() {
    if ((await this.topics.count()) > 0) return;

    for (let i = 0; i < SPECS.length; i++) {
      const spec = SPECS[i];
      const topic = await this.topics.save(
        this.topics.create({ title: spec.title, grade: spec.grade, position: i }),
      );
      const batch: Task[] = [];
      for (let d = 1; d <= 5; d++) {
        for (let n = 0; n < TASKS_PER_LEVEL; n++) {
          const { prompt, answer } = spec.gen(d);
          const asChoice = n % 2 === 1;
          const data: Task['data'] = { answer: String(answer) };
          if (asChoice) {
            const options = new Set<number>([answer]);
            while (options.size < 4) {
              const candidate = answer + rnd(-5, 5);
              if (candidate >= 0) options.add(candidate);
            }
            data.options = shuffle([...options]).map(String);
          }
          batch.push(
            this.tasks.create({
              topicId: topic.id,
              type: asChoice ? 'choice' : 'number',
              prompt,
              data,
              difficulty: d,
              hint: spec.hint,
            }),
          );
        }
      }
      await this.tasks.save(batch);
    }
    this.log.log(`Создано тем: ${SPECS.length}, заданий: ${SPECS.length * 5 * TASKS_PER_LEVEL}`);
  }
}
