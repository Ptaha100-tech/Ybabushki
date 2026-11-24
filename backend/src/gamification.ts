/** Уровни, звания и значки — считаются из опыта (XP) и статистики. */
export const LEVELS = [
  { min: 0, title: 'Новичок', avatar: '🐣' },
  { min: 100, title: 'Ученик', avatar: '🐥' },
  { min: 300, title: 'Исследователь', avatar: '🦊' },
  { min: 700, title: 'Знаток', avatar: '🦉' },
  { min: 1500, title: 'Мастер', avatar: '🦁' },
  { min: 3000, title: 'Легенда', avatar: '🐉' },
];

export function levelInfo(xp: number) {
  let idx = 0;
  LEVELS.forEach((l, i) => {
    if (xp >= l.min) idx = i;
  });
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  return {
    level: idx + 1,
    title: cur.title,
    avatar: cur.avatar,
    xpToNext: next ? next.min - xp : 0,
    progress: next ? Math.round(((xp - cur.min) / (next.min - cur.min)) * 100) : 100,
  };
}

export interface BadgeStats {
  total: number;
  correct: number;
  dayStreak: number;
  accuracy: number;
  subjects: number;
  games: number;
}

const BADGES: { id: string; emoji: string; title: string; text: string; ok: (s: BadgeStats) => boolean }[] = [
  { id: 'first', emoji: '🌱', title: 'Первый шаг', text: 'Решено первое задание', ok: (s) => s.total >= 1 },
  { id: 'ten', emoji: '⭐', title: '10 верных', text: '10 правильных ответов', ok: (s) => s.correct >= 10 },
  { id: 'fifty', emoji: '🌟', title: '50 верных', text: '50 правильных ответов', ok: (s) => s.correct >= 50 },
  { id: 'hundred', emoji: '🏅', title: 'Сотня', text: '100 правильных ответов', ok: (s) => s.correct >= 100 },
  { id: 'five100', emoji: '🏆', title: '500 верных', text: '500 правильных ответов', ok: (s) => s.correct >= 500 },
  { id: 'streak3', emoji: '🔥', title: 'Огонь', text: '3 дня подряд', ok: (s) => s.dayStreak >= 3 },
  { id: 'streak7', emoji: '☄️', title: 'Неделя', text: '7 дней подряд', ok: (s) => s.dayStreak >= 7 },
  { id: 'sharp', emoji: '🎯', title: 'Меткий', text: 'Точность от 90% (не меньше 30 ответов)', ok: (s) => s.total >= 30 && s.accuracy >= 90 },
  { id: 'explorer', emoji: '🧭', title: 'Исследователь', text: 'Заданий по 3 предметам', ok: (s) => s.subjects >= 3 },
  { id: 'gamer', emoji: '🎮', title: 'Игрок', text: 'Сыграна первая игра', ok: (s) => s.games >= 1 },
];

export function badgesFor(s: BadgeStats) {
  return BADGES.map((b) => ({ id: b.id, emoji: b.emoji, title: b.title, text: b.text, earned: b.ok(s) }));
}
