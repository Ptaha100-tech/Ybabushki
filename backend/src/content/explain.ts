import { TaskSeed } from './types';
import { EXPLAIN } from './explain-data';

/** Короткий устойчивый ключ задания (для таблицы объяснений). */
export function explainKey(prompt: string, answer: string): string {
  let h = 2166136261;
  const s = prompt + '\u0001' + answer;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

const ARITH = /^[\d\s+\-−×÷·*/().,:]+$/;

/** Если в задании чистый пример «2 + 4 = ?», решаем его и объясняем порядок действий. */
function arith(prompt: string, answer: string): string | null {
  const m = prompt.match(/^(?:Вычисли:?\s*)?(.+?)\s*=\s*\?\s*$/);
  if (!m || !ARITH.test(m[1]) || !/\d\s*[+\-−×÷·*/:]\s*[\d(]/.test(m[1])) return null;
  const js = m[1].replace(/[×·]/g, '*').replace(/[÷:]/g, '/').replace(/−/g, '-').replace(/(\d),(\d)/g, '$1.$2');
  let v: number;
  try {
    v = Function(`"use strict";return (${js})`)();
  } catch {
    return null;
  }
  const a = Number(answer.replace(',', '.'));
  if (!Number.isFinite(v) || Math.abs(v - a) > 1e-9) return null;
  const mixed = /[×·*÷:/]/.test(m[1]) && /[+\-−]/.test(m[1]);
  const par = /\(/.test(m[1]);
  const rule = par ? 'Сначала считаем в скобках. ' : mixed ? 'Сначала умножение и деление, потом сложение и вычитание. ' : '';
  return `${rule}${m[1]} = ${answer}.`;
}

/** Объяснение для задания, у которого его нет в исходниках. Всегда возвращает короткий текст. */
export function autoExplain(s: TaskSeed): string {
  if (s.explanation) return s.explanation;
  const a = arith(s.prompt, s.answer);
  if (a) return a;
  if (s.expr) return `Решение: ${s.expr.replace(/\*\*/g, '^').replace(/\*/g, '×').replace(/\//g, '÷')} = ${s.answer}.`;
  const e = EXPLAIN[explainKey(s.prompt, s.answer)];
  if (e) return e;
  switch (s.kind) {
    case 'order':
      return `Правильный порядок: ${(s.items ?? s.answer.split('|')).join(' → ')}.`;
    case 'match':
      return `Правильные пары: ${(s.pairs ?? []).map(([l, r]) => `${l} — ${r}`).join('; ')}.`;
    case 'choice':
      if (s.options && s.options.length === 2 && s.options.includes('Верно') && s.options.includes('Неверно'))
        return s.answer === 'Верно'
          ? 'Это утверждение верное. Запомни его — оно пригодится в следующих заданиях.'
          : 'Это утверждение неверное. Перечитай его внимательно и сравни с правилом из теории темы.';
      return `Верный вариант — «${s.answer}». Остальные варианты не подходят: перечитай вопрос и теорию темы.`;
    case 'number':
      return `Верный ответ — ${s.answer}. Реши по шагам: выпиши данные, выбери формулу или правило, затем проверь вычисления.`;
    default:
      return `Верный ответ — «${s.answer}». Запомни написание и загляни в теорию темы.`;
  }
}
