/** Ежедневные задания и предметы магазина. Всё считается на сервере. */
export interface QuestDef {
  id: string;
  title: string;
  icon: string;
  target: number;
  reward: number;
  /** 'attempts' — любые ответы, 'correct' — верные, 'topics' — разные темы, 'games' — сыгранные игры */
  metric: 'attempts' | 'correct' | 'topics' | 'games';
}

export const QUESTS: QuestDef[] = [
  { id: 'solve10', title: 'Реши 10 заданий', icon: '📚', target: 10, reward: 15, metric: 'attempts' },
  { id: 'correct7', title: 'Дай 7 верных ответов', icon: '✅', target: 7, reward: 20, metric: 'correct' },
  { id: 'topics2', title: 'Позанимайся в 2 разных темах', icon: '🎯', target: 2, reward: 15, metric: 'topics' },
  { id: 'game1', title: 'Сыграй в игру', icon: '🎮', target: 1, reward: 10, metric: 'games' },
];

export interface ShopItem {
  id: string;
  kind: 'frame' | 'title';
  name: string;
  price: number;
  /** Для рамки — цвет, для звания — текст. */
  value: string;
}

export const SHOP: ShopItem[] = [
  { id: 'frame-green', kind: 'frame', name: 'Зелёная рамка', price: 30, value: '#22C55E' },
  { id: 'frame-purple', kind: 'frame', name: 'Фиолетовая рамка', price: 30, value: '#8B5CF6' },
  { id: 'frame-orange', kind: 'frame', name: 'Оранжевая рамка', price: 50, value: '#FD7124' },
  { id: 'frame-gold', kind: 'frame', name: 'Золотая рамка', price: 100, value: '#F5B301' },
  { id: 'frame-pink', kind: 'frame', name: 'Розовая рамка', price: 50, value: '#EC4899' },
  { id: 'title-clever', kind: 'title', name: 'Звание «Умник»', price: 40, value: 'Умник' },
  { id: 'title-explorer', kind: 'title', name: 'Звание «Исследователь»', price: 60, value: 'Исследователь' },
  { id: 'title-champ', kind: 'title', name: 'Звание «Чемпион»', price: 120, value: 'Чемпион' },
  { id: 'title-legend', kind: 'title', name: 'Звание «Легенда школы»', price: 250, value: 'Легенда школы' },
];
