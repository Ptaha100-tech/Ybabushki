import { Rng, hashSeed } from './rng';
import { StoredTask, StoredTopic, TaskSeed, TopicSeed } from './types';
import { SUBJECT_KEYS } from './subjects';
import { biologyTopics } from './biology';
import { chemistryTopics } from './chemistry';
import { englishTopics } from './english';
import { geographyTopics } from './geography';
import { historyTopics } from './history';
import { informaticsTopics } from './informatics';
import { literatureTopics } from './literature';
import { mathTopics } from './math';
import { physicsTopics } from './physics';
import { russianTopics } from './russian';
import { worldTopics } from './world';
import { examTopics } from './exams';

export * from './types';
export * from './subjects';

export const ALL_SEEDS: TopicSeed[] = [
  ...mathTopics,
  ...russianTopics,
  ...literatureTopics,
  ...englishTopics,
  ...worldTopics,
  ...biologyTopics,
  ...geographyTopics,
  ...physicsTopics,
  ...chemistryTopics,
  ...historyTopics,
  ...informaticsTopics,
  ...examTopics,
];

const TF = ['Верно', 'Неверно'];

/** Превращает «черновик» задания в то, что хранится в базе: перемешивает варианты (стабильно). */
export function finalizeTask(seed: TaskSeed, slug: string, index: number): StoredTask {
  const data: StoredTask['data'] = { answer: seed.answer };
  if (seed.kind === 'choice' && seed.options) {
    const isTf = seed.options.length === 2 && seed.options.every((o) => TF.includes(o));
    data.options = isTf ? [...TF] : new Rng(`opt:${slug}:${index}`).shuffle(seed.options);
  }
  if (seed.accept) data.accept = seed.accept;
  if (seed.items) data.items = seed.items;
  if (seed.pairs) data.pairs = seed.pairs;
  if (seed.explanation) data.explanation = seed.explanation;
  return {
    type: seed.kind,
    prompt: seed.prompt,
    difficulty: seed.difficulty,
    hint: seed.hint ?? null,
    data,
  };
}

export function buildAll(seeds: TopicSeed[] = ALL_SEEDS): StoredTopic[] {
  const subjectOrder = new Map(SUBJECT_KEYS.map((k, i) => [k, i]));
  const sorted = seeds
    .map((t, i) => ({ t, i }))
    .sort(
      (a, b) =>
        (subjectOrder.get(a.t.subject) ?? 99) - (subjectOrder.get(b.t.subject) ?? 99) ||
        a.t.grade - b.t.grade ||
        a.i - b.i,
    )
    .map((x) => x.t);

  return sorted.map((t, position) => {
    const tasks = t.tasks.map((s, i) => finalizeTask(s, t.slug, i));
    const contentHash = hashSeed(JSON.stringify([t.title, t.grade, t.subject, t.icon ?? '', tasks])).toString(16);
    return {
      slug: t.slug,
      subject: t.subject,
      grade: t.grade,
      title: t.title,
      icon: t.icon ?? null,
      position,
      contentHash,
      tasks,
    };
  });
}
