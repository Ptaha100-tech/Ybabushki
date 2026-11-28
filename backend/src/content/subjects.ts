import { SubjectKey } from './types';

export interface SubjectMeta {
  key: SubjectKey;
  title: string;
  emoji: string;
  color: string;
  fromGrade: number;
  toGrade: number;
}

export const SUBJECTS: SubjectMeta[] = [
  { key: 'math', title: 'Математика', emoji: '🔢', color: '#4F46E5', fromGrade: 1, toGrade: 11 },
  { key: 'russian', title: 'Русский язык', emoji: '📝', color: '#DC2626', fromGrade: 1, toGrade: 11 },
  { key: 'literature', title: 'Литература', emoji: '📖', color: '#9333EA', fromGrade: 5, toGrade: 11 },
  { key: 'english', title: 'Английский язык', emoji: '🔤', color: '#0284C7', fromGrade: 2, toGrade: 11 },
  { key: 'world', title: 'Окружающий мир', emoji: '🌳', color: '#16A34A', fromGrade: 1, toGrade: 4 },
  { key: 'biology', title: 'Биология', emoji: '🧬', color: '#15803D', fromGrade: 5, toGrade: 11 },
  { key: 'geography', title: 'География', emoji: '🌍', color: '#0D9488', fromGrade: 5, toGrade: 11 },
  { key: 'physics', title: 'Физика', emoji: '⚡', color: '#D97706', fromGrade: 7, toGrade: 11 },
  { key: 'chemistry', title: 'Химия', emoji: '🧪', color: '#DB2777', fromGrade: 8, toGrade: 11 },
  { key: 'history', title: 'История', emoji: '🏛️', color: '#B45309', fromGrade: 5, toGrade: 11 },
  { key: 'informatics', title: 'Информатика', emoji: '💻', color: '#475569', fromGrade: 5, toGrade: 11 },
];

export const SUBJECT_KEYS = SUBJECTS.map((s) => s.key);
