/**
 * Проверка банка заданий: запуск `npm run content:check`.
 * Находит пустые и повторяющиеся задания, неверные варианты ответов, смешение латиницы и кириллицы
 * в одном слове, а также перепроверяет вычисляемые ответы независимо от генератора.
 */
import { buildAll, ALL_SEEDS } from './index';
import { SUBJECTS } from './subjects';
import { TaskSeed, TopicSeed } from './types';

const errors: string[] = [];
const warns: string[] = [];

function fail(t: TopicSeed, i: number, msg: string) {
  errors.push(`[${t.slug} #${i + 1}] ${msg}`);
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

/** Вычисляет безопасное арифметическое выражение. */
function evalExpr(expr: string): number | null {
  const cleaned = expr.replace(/Math\.(sqrt|cbrt|pow|abs|floor|ceil|round|log2|log10|log|sin|cos|PI)/g, '0');
  if (!/^[0-9+\-*/().,\s%e]*$/.test(cleaned)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const v = new Function(`"use strict"; return (${expr});`)();
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

function parseAnswerNumber(a: string): number | null {
  const s = a.trim().replace(',', '.');
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  const f = s.match(/^(-?\d+)\/(\d+)$/);
  if (f && Number(f[2]) !== 0) return Number(f[1]) / Number(f[2]);
  return null;
}

const LAT = /[A-Za-z]/;
const CYR = /[А-Яа-яЁё]/;

function checkMixedScripts(t: TopicSeed, i: number, text: string, where: string) {
  for (const token of text.split(/[\s,.;:!?()«»"'—–\-/=|+<>[\]{}*^…]+/)) {
    if (LAT.test(token) && CYR.test(token)) fail(t, i, `${where}: латиница и кириллица в одном слове «${token}»`);
  }
}

function checkTask(t: TopicSeed, s: TaskSeed, i: number) {
  if (!s.prompt || s.prompt.trim() !== s.prompt) fail(t, i, 'пустой или с пробелами по краям текст задания');
  if (s.prompt.length > 400) fail(t, i, `слишком длинный текст задания (${s.prompt.length})`);
  if (![1, 2, 3, 4, 5].includes(s.difficulty)) fail(t, i, `сложность ${s.difficulty} вне 1–5`);
  if (!s.answer || !s.answer.trim()) fail(t, i, 'пустой ответ');
  if (s.answer.length > 240) fail(t, i, 'слишком длинный ответ');
  if (s.hint !== undefined && (s.hint.length === 0 || s.hint.length > 220)) fail(t, i, 'подсказка пустая или длиннее 220');
  if (s.explanation !== undefined && (s.explanation.length === 0 || s.explanation.length > 300))
    fail(t, i, 'объяснение пустое или длиннее 300');

  checkMixedScripts(t, i, s.prompt, 'текст');
  if (s.kind !== 'text') checkMixedScripts(t, i, s.answer, 'ответ');
  if (s.hint) checkMixedScripts(t, i, s.hint, 'подсказка');
  if (s.explanation) checkMixedScripts(t, i, s.explanation, 'объяснение');

  switch (s.kind) {
    case 'choice': {
      const o = s.options ?? [];
      if (o.length < 2 || o.length > 6) fail(t, i, `вариантов ${o.length}, нужно от 2 до 6`);
      if (new Set(o.map(norm)).size !== o.length) fail(t, i, 'повторяющиеся варианты ответа');
      if (!o.includes(s.answer)) fail(t, i, 'правильного ответа нет среди вариантов');
      if (o.some((x) => !x.trim() || x.length > 200)) fail(t, i, 'пустой или слишком длинный вариант');
      o.forEach((x) => checkMixedScripts(t, i, x, 'вариант'));
      break;
    }
    case 'number': {
      if (parseAnswerNumber(s.answer) === null) fail(t, i, `ответ «${s.answer}» не число`);
      break;
    }
    case 'text': {
      for (const a of [s.answer, ...(s.accept ?? [])]) {
        if (!a.trim()) fail(t, i, 'пустой допустимый ответ');
      }
      break;
    }
    case 'order': {
      const it = s.items ?? [];
      if (it.length < 3 || it.length > 7) fail(t, i, `элементов ${it.length}, нужно от 3 до 7`);
      if (new Set(it.map(norm)).size !== it.length) fail(t, i, 'повторяющиеся элементы');
      if (it.some((x) => /[|=]/.test(x) || !x.trim() || x.length > 50)) fail(t, i, 'элемент пустой, длинный или с символом | =');
      if (s.answer !== it.join('|')) fail(t, i, 'answer не совпадает с items');
      it.forEach((x) => checkMixedScripts(t, i, x, 'элемент'));
      break;
    }
    case 'match': {
      const p = s.pairs ?? [];
      if (p.length < 3 || p.length > 6) fail(t, i, `пар ${p.length}, нужно от 3 до 6`);
      if (new Set(p.map((x) => norm(x[0]))).size !== p.length) fail(t, i, 'повторяющиеся левые части пар');
      if (new Set(p.map((x) => norm(x[1]))).size !== p.length) fail(t, i, 'повторяющиеся правые части пар');
      if (p.some((x) => x.some((y) => /[|=]/.test(y) || !y.trim() || y.length > 50))) fail(t, i, 'часть пары пустая, длинная или с символом | =');
      if (s.answer !== p.map(([l, r]) => `${l}=${r}`).join('|')) fail(t, i, 'answer не совпадает с pairs');
      p.forEach((x) => x.forEach((y) => checkMixedScripts(t, i, y, 'пара')));
      break;
    }
  }

  if (s.expr !== undefined) {
    const v = evalExpr(s.expr);
    const a = parseAnswerNumber(s.answer);
    if (v === null) fail(t, i, `выражение «${s.expr}» не вычисляется`);
    else if (a === null) fail(t, i, 'есть expr, но ответ не число');
    else if (Math.abs(v - a) > 1e-6 * Math.max(1, Math.abs(v))) fail(t, i, `ответ ${s.answer} не совпадает с вычислением ${s.expr} = ${v}`);
  }
  if (s.verify) {
    try {
      if (!s.verify()) fail(t, i, 'независимая проверка ответа не пройдена');
    } catch (e) {
      fail(t, i, `ошибка независимой проверки: ${(e as Error).message}`);
    }
  }
}

function run() {
  const slugs = new Set<string>();
  for (const t of ALL_SEEDS) {
    if (!/^[a-z0-9-]+$/.test(t.slug)) errors.push(`[${t.slug}] недопустимый slug`);
    if (slugs.has(t.slug)) errors.push(`[${t.slug}] повторяющийся slug`);
    slugs.add(t.slug);
    if (!SUBJECTS.find((s) => s.key === t.subject)) errors.push(`[${t.slug}] неизвестный предмет ${t.subject}`);
    const meta = SUBJECTS.find((s) => s.key === t.subject);
    if (meta && (t.grade < meta.fromGrade || t.grade > meta.toGrade))
      warns.push(`[${t.slug}] класс ${t.grade} вне диапазона предмета ${meta.fromGrade}–${meta.toGrade}`);
    if (t.grade < 1 || t.grade > 11) errors.push(`[${t.slug}] класс ${t.grade} вне 1–11`);
    if (!t.title.trim()) errors.push(`[${t.slug}] пустое название темы`);
    if (t.tasks.length < 10) errors.push(`[${t.slug}] заданий ${t.tasks.length}, нужно не меньше 10`);

    const seen = new Set<string>();
    t.tasks.forEach((s, i) => {
      checkTask(t, s, i);
      const key = norm(s.prompt + '#' + (s.options ? [...s.options].sort().join('~') : '') + (s.items ? [...s.items].sort().join('~') : '') + (s.pairs ? s.pairs.map((x) => x.join(':')).sort().join('~') : ''));
      if (seen.has(key)) fail(t, i, `повтор текста задания «${s.prompt}»`);
      seen.add(key);
    });
    const diffs = new Set(t.tasks.map((s) => s.difficulty));
    if (diffs.size < 2) warns.push(`[${t.slug}] только один уровень сложности`);
    const kinds = new Set(t.tasks.map((s) => s.kind));
    if (kinds.size === 1 && t.tasks.length >= 30 && !kinds.has('choice')) warns.push(`[${t.slug}] один тип заданий`);
  }

  // Итоги
  const built = buildAll();
  const total = built.reduce((n, t) => n + t.tasks.length, 0);
  const lines: string[] = [];
  lines.push(`Тем: ${built.length}, заданий: ${total}`);
  lines.push('');
  lines.push('Предмет | тем | заданий | классы');
  for (const s of SUBJECTS) {
    const ts = built.filter((t) => t.subject === s.key);
    const grades = [...new Set(ts.map((t) => t.grade))].sort((a, b) => a - b);
    lines.push(`${s.title} | ${ts.length} | ${ts.reduce((n, t) => n + t.tasks.length, 0)} | ${grades.join(',') || '—'}`);
  }
  const kinds: Record<string, number> = {};
  const diffs: Record<string, number> = {};
  for (const t of built)
    for (const s of t.tasks) {
      kinds[s.type] = (kinds[s.type] ?? 0) + 1;
      diffs[s.difficulty] = (diffs[s.difficulty] ?? 0) + 1;
    }
  lines.push('');
  lines.push(`Типы заданий: ${JSON.stringify(kinds)}`);
  lines.push(`Сложность: ${JSON.stringify(diffs)}`);
  const byGrade: string[] = [];
  for (let g = 1; g <= 11; g++) {
    const ts = built.filter((t) => t.grade === g);
    byGrade.push(`${g} кл: ${ts.length} тем, ${ts.reduce((n, t) => n + t.tasks.length, 0)} заданий, предметов ${new Set(ts.map((t) => t.subject)).size}`);
    if (new Set(ts.map((t) => t.subject)).size < 3) warns.push(`в ${g} классе меньше 3 предметов`);
  }
  lines.push(byGrade.join('\n'));

  // позиция правильного ответа в вариантах (не должна быть почти всегда одной и той же)
  const pos = [0, 0, 0, 0];
  for (const t of built)
    for (const s of t.tasks)
      if (s.type === 'choice' && s.data.options && s.data.options.length === 4) pos[s.data.options.indexOf(s.data.answer)]++;
  lines.push(`Позиция верного среди 4 вариантов: ${pos.join(' / ')}`);

  console.log(lines.join('\n'));
  if (warns.length) console.log(`\nПредупреждения (${warns.length}):\n` + warns.join('\n'));
  if (errors.length) {
    console.log(`\nОШИБКИ (${errors.length}):\n` + errors.slice(0, 200).join('\n'));
    (globalThis as any).process.exit(1);
  }
  console.log('\nВсе проверки пройдены.');
}

run();
