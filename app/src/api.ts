import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Адрес API. В вебе по умолчанию тот же домен (/api, проксирует nginx).
 * Для мобильного приложения задайте полный адрес: EXPO_PUBLIC_API_URL=https://ваш-домен/api
 */
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '/api').replace(/\/$/, '');

export type Role = 'student' | 'teacher' | 'parent';

export interface QuestItem { id: string; title: string; icon: string; target: number; reward: number; progress: number; claimed: boolean }
export interface QuestsData { coins: number; quests: QuestItem[] }
export interface ShopItemData { id: string; kind: 'frame' | 'title'; name: string; price: number; value: string; owned: boolean; equipped: boolean }
export interface ShopData { coins: number; frame: string | null; titleId: string | null; items: ShopItemData[] }
export interface LeaderRow { name: string; xp: number; me: boolean }
export interface Leaderboard { classroom: boolean; rows: LeaderRow[]; weekRows: LeaderRow[]; myWeekXp: number }

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  linkCode: string | null;
  classroomId: string | null;
  grade?: number | null;
  gender?: 'm' | 'f' | null;
  emailVerified?: boolean;
  coins?: number;
  frame?: string | null;
  titleId?: string | null;
  xp: number;
  dayStreak: number;
}
export interface Topic {
  id: string;
  slug?: string | null;
  title: string;
  grade: number;
  subject: string;
  icon: string | null;
  tasks?: number;
  level?: number | null;
}
export interface SubjectMeta {
  key: string;
  title: string;
  emoji: string;
  color: string;
  fromGrade: number;
  toGrade: number;
}
export interface Catalog {
  grade: number | null;
  subjects: SubjectMeta[];
  topics: Topic[];
}
export interface Badge {
  id: string;
  emoji: string;
  title: string;
  text: string;
  earned: boolean;
}
export interface LightningTask {
  id: string;
  type: 'choice' | 'number';
  prompt: string;
  options: string[] | null;
  answer: string;
}
export interface TaskDto {
  id: string;
  topicId: string;
  type: 'choice' | 'number' | 'text' | 'order' | 'match';
  prompt: string;
  options: string[] | null;
  items: string[] | null;
  lefts: string[] | null;
  rights: string[] | null;
  difficulty: number;
}
export interface NextTask {
  task: TaskDto;
  level: number;
  remaining: number | null;
}
export interface AnswerResult {
  correct: boolean;
  correctAnswer: string | null;
  explanation: string | null;
  hint: string | null;
  xp: number;
  dayStreak: number;
  level: number;
  remaining: number | null;
}
export interface Stats {
  id: string;
  name: string;
  grade?: number | null;
  level?: number;
  title?: string;
  avatar?: string;
  xpToNext?: number;
  progress?: number;
  badges?: Badge[];
  xp: number;
  dayStreak: number;
  total: number;
  correct: number;
  accuracy: number;
  remaining: number | null;
  subscriptionUntil: string | null;
}
export interface HomeworkItem {
  id: string;
  topicId: string;
  topicTitle: string;
  dueAt: string | null;
  done: number;
}
export interface ClassSummary {
  id: string;
  name: string;
  code: string;
  students: number;
}
export interface ClassDetail {
  id: string;
  name: string;
  code: string;
  students: { id: string; name: string; xp: number; total: number; correct: number; accuracy: number }[];
  topics: { topicId: string; title: string; total: number; correct: number }[];
  homework: { id: string; topicTitle: string; dueAt: string | null; createdAt: string }[];
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const errMsg = (e: unknown): string => (e instanceof Error ? e.message : 'Что-то пошло не так');

let token: string | null = null;

export async function loadToken(): Promise<string | null> {
  token = await AsyncStorage.getItem('token');
  return token;
}

export async function setToken(t: string | null): Promise<void> {
  token = t;
  if (t) await AsyncStorage.setItem('token', t);
  else await AsyncStorage.removeItem('token');
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Нет связи с сервером');
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message ?? 'Ошибка запроса';
    throw new ApiError(res.status, data?.code, message);
  }
  return data as T;
}

export const api = {
  register: (b: { email: string; password: string; name: string; role: Role; grade?: number; gender: 'm' | 'f'; consent: boolean }) =>
    request<{ token: string; user: User }>('POST', '/auth/register', b),
  forgot: (email: string) => request<{ ok: boolean; mail: boolean }>('POST', '/auth/forgot', { email }),
  reset: (b: { email: string; code: string; password: string }) => request<{ token: string; user: User }>('POST', '/auth/reset', b),
  verifySend: () => request<{ ok: boolean; mail: boolean }>('POST', '/auth/verify/send'),
  verify: (code: string) => request<User>('POST', '/auth/verify', { code }),
  login: (b: { email: string; password: string }) => request<{ token: string; user: User }>('POST', '/auth/login', b),
  me: () => request<User>('GET', '/auth/me'),
  updateProfile: (b: { gender?: 'm' | 'f'; grade?: number }) =>
    request<{ gender: 'm' | 'f' | null; grade: number | null }>('PATCH', '/me/profile', b),

  topics: () => request<Topic[]>('GET', '/topics'),
  catalog: () => request<Catalog>('GET', '/catalog'),
  lightning: (subject?: string, grade?: number) => {
    const q = new URLSearchParams();
    if (subject) q.set('subject', subject);
    if (grade) q.set('grade', String(grade));
    return request<{ tasks: LightningTask[] }>('GET', `/games/lightning?${q.toString()}`);
  },
  memory: (subject?: string, grade?: number) => {
    const q = new URLSearchParams();
    if (subject) q.set('subject', subject);
    if (grade) q.set('grade', String(grade));
    return request<{ pairs: [string, string][] }>('GET', `/games/memory?${q.toString()}`);
  },
  gameResult: (game: 'lightning' | 'memory', score: number) =>
    request<{ xp: number; totalXp: number; dailyCapReached: boolean }>('POST', '/games/result', { game, score }),
  leaderboard: () =>
    request<Leaderboard>('GET', '/me/leaderboard'),
  quests: () => request<QuestsData>('GET', '/me/quests'),
  claimQuest: (id: string) => request<{ coins: number; reward: number }>('POST', `/me/quests/${id}/claim`),
  shop: () => request<ShopData>('GET', '/shop'),
  buyItem: (id: string) => request<ShopData>('POST', `/shop/${id}/buy`),
  equipItem: (id: string) => request<ShopData>('POST', `/shop/${id}/equip`),
  weakTopics: () => request<(Topic & { total: number; accuracy: number })[]>('GET', '/me/weak'),
  nextTask: (topicId: string, homeworkId?: string, exclude?: string) => {
    const q = new URLSearchParams();
    if (homeworkId) q.set('homeworkId', homeworkId);
    if (exclude) q.set('exclude', exclude);
    const qs = q.toString();
    return request<NextTask>('GET', `/topics/${topicId}/next${qs ? `?${qs}` : ''}`);
  },
  answer: (taskId: string, answer: string, homeworkId?: string) =>
    request<AnswerResult>('POST', `/tasks/${taskId}/answer`, { answer, homeworkId }),
  stats: () => request<Stats>('GET', '/me/stats'),
  myHomework: () => request<HomeworkItem[]>('GET', '/me/homework'),
  joinClass: (code: string) => request<{ id: string; name: string }>('POST', '/classes/join', { code }),

  myClasses: () => request<ClassSummary[]>('GET', '/classes'),
  createClass: (name: string) => request<ClassSummary>('POST', '/classes', { name }),
  classDetail: (id: string) => request<ClassDetail>('GET', `/classes/${id}`),
  assignHomework: (classId: string, topicId: string) =>
    request<{ id: string; topicTitle: string }>('POST', `/classes/${classId}/homework`, { topicId }),

  linkChild: (code: string) => request<{ id: string; name: string }>('POST', '/parent/link', { code }),
  children: () => request<Stats[]>('GET', '/parent/children'),
  subscribe: (studentId: string, plan: 'month' | 'year') =>
    request<{ studentId: string; until: string }>('POST', '/parent/subscribe', { studentId, plan }),
};
