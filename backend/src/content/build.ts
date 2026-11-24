import { Rng } from './rng';
import { Diff, SubjectKey, TaskSeed, TopicSeed } from './types';

export interface Extra {
  hint?: string;
  explanation?: string;
  expr?: string;
  verify?: () => boolean;
}

/** Выбор одного варианта. wrong — только НЕПРАВИЛЬНЫЕ варианты (правильный добавляется сам). */
export function choice(prompt: string, answer: string, wrong: string[], d: Diff, extra: Extra = {}): TaskSeed {
  return { kind: 'choice', prompt, answer, options: [answer, ...wrong], difficulty: d, ...extra };
}

/** «Верно или неверно?» — утверждение и правда ли оно. */
export function tf(statement: string, truth: boolean, d: Diff, extra: Extra = {}): TaskSeed {
  return {
    kind: 'choice',
    prompt: statement,
    answer: truth ? 'Верно' : 'Неверно',
    options: ['Верно', 'Неверно'],
    difficulty: d,
    ...extra,
  };
}

/** Ввод числа. Допускается запятая или точка. */
export function num(prompt: string, answer: number | string, d: Diff, extra: Extra = {}): TaskSeed {
  return { kind: 'number', prompt, answer: String(answer), difficulty: d, ...extra };
}

/** Ввод слова или короткой фразы. accept — другие допустимые написания. */
export function txt(prompt: string, answer: string, d: Diff, accept: string[] = [], extra: Extra = {}): TaskSeed {
  return { kind: 'text', prompt, answer, accept: accept.length ? accept : undefined, difficulty: d, ...extra };
}

/** Расставить по порядку. items — в ПРАВИЛЬНОМ порядке (3–7 штук). */
export function order(prompt: string, items: string[], d: Diff, extra: Extra = {}): TaskSeed {
  return { kind: 'order', prompt, answer: items.join('|'), items, difficulty: d, ...extra };
}

/** Соединить пары (3–6 штук). */
export function match(prompt: string, pairs: [string, string][], d: Diff, extra: Extra = {}): TaskSeed {
  return {
    kind: 'match',
    prompt,
    answer: pairs.map(([l, r]) => `${l}=${r}`).join('|'),
    pairs,
    difficulty: d,
    ...extra,
  };
}

export function topic(
  slug: string,
  subject: SubjectKey,
  grade: number,
  title: string,
  tasks: TaskSeed[],
  icon?: string,
): TopicSeed {
  return { slug, subject, grade, title, icon, tasks };
}

/**
 * Генерирует perLevel заданий для каждого уровня сложности 1–5.
 * make возвращает задание или null (если пример не получился), повторы текста отбрасываются.
 */
export function generate(
  slug: string,
  perLevel: number,
  make: (r: Rng, d: Diff) => Omit<TaskSeed, 'difficulty'> | null,
): TaskSeed[] {
  const r = new Rng(`gen:${slug}`);
  const out: TaskSeed[] = [];
  const seen = new Set<string>();
  for (const d of [1, 2, 3, 4, 5] as Diff[]) {
    let made = 0;
    for (let tries = 0; made < perLevel && tries < perLevel * 60; tries++) {
      const t = make(r, d);
      if (!t || seen.has(t.prompt)) continue;
      seen.add(t.prompt);
      out.push({ ...t, difficulty: d });
      made++;
    }
  }
  return out;
}

/** Числовое задание, которое иногда превращается в выбор из 4 вариантов (правдоподобные неправильные ответы). */
export function numOrChoice(
  r: Rng,
  prompt: string,
  answer: number,
  extra: Extra = {},
  choiceChance = 0.4,
): Omit<TaskSeed, 'difficulty'> {
  if (!Number.isInteger(answer) || !r.chance(choiceChance)) {
    return { kind: 'number', prompt, answer: String(answer), ...extra };
  }
  const cand = new Set<number>();
  const deltas = [1, -1, 2, -2, 10, -10, 5, -5, 3, -3, 11, -11];
  for (const dl of r.shuffle(deltas)) {
    const v = answer + dl;
    if (v !== answer && v >= 0 === answer >= 0) cand.add(v);
    if (cand.size >= 3) break;
  }
  if (cand.size < 3) return { kind: 'number', prompt, answer: String(answer), ...extra };
  return {
    kind: 'choice',
    prompt,
    answer: String(answer),
    options: [String(answer), ...[...cand].map(String)],
    ...extra,
  };
}
