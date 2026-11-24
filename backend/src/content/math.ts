import { Rng } from './rng';
import { generate, numOrChoice, topic, choice, tf, match, order, num, Extra } from './build';
import { Diff, TaskSeed, TopicSeed } from './types';

type Make = (r: Rng, d: Diff) => Omit<TaskSeed, 'difficulty'> | null;

const pick2 = <T,>(r: Rng, a: T[]) => a[r.int(0, a.length - 1)];
const fmt = (n: number) => String(Math.round(n * 1e6) / 1e6).replace('.', ',');
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Числовой ответ с проверкой по выражению. */
function calc(r: Rng, text: string, expr: string, ex: Extra = {}, chance = 0.35) {
  // eslint-disable-next-line no-new-func
  const v = new Function(`return (${expr});`)() as number;
  return numOrChoice(r, text, v, { expr, ...ex }, chance);
}

/** Расставить числа по возрастанию/убыванию. */
const orderNums =
  (lo: number, hi: number, cnt: number): Make =>
  (r) => {
    const s = new Set<number>();
    while (s.size < cnt) s.add(r.int(lo, hi));
    const asc = r.chance(0.5);
    const arr = [...s].sort((a, b) => (asc ? a - b : b - a));
    return { kind: 'order', prompt: `Расставь числа по ${asc ? 'возрастанию' : 'убыванию'}.`, answer: arr.join('|'), items: arr.map(String) };
  };

/** Соединить выражения с ответами. */
const matchExpr =
  (mk: (r: Rng) => [string, number]): Make =>
  (r) => {
    const pairs: [string, string][] = [];
    const used = new Set<number>();
    const lefts = new Set<string>();
    for (let t = 0; t < 60 && pairs.length < 4; t++) {
      const [l, v] = mk(r);
      if (used.has(v) || lefts.has(l)) continue;
      used.add(v);
      lefts.add(l);
      pairs.push([l, fmt(v)]);
    }
    if (pairs.length < 4) return null;
    return { kind: 'match', prompt: 'Соедини пример и ответ.', answer: pairs.map(([l, rr]) => `${l}=${rr}`).join('|'), pairs };
  };

/** Сравнение чисел/выражений. */
const compare =
  (mk: (r: Rng) => [string, string, number, number]): Make =>
  (r) => {
    const [a, b, va, vb] = mk(r);
    const ans = va > vb ? '>' : va < vb ? '<' : '=';
    return { kind: 'choice', prompt: `Поставь знак: ${a} ? ${b}`, answer: ans, options: ['<', '>', '='] };
  };

const T = (slug: string, grade: number, title: string, icon: string, per: number, mk: Make) =>
  topic(slug, 'math', grade, title, generate(slug, per, mk), icon);

const g1: TopicSeed[] = [
  T('math-1-sum10', 1, 'Сложение и вычитание до 10', '➕', 4, (r, d) => {
    const m = d <= 2 ? 10 : 10;
    const a = r.int(1, m - 1), b = r.int(1, m - a);
    if (r.chance(0.5) || d === 1) return calc(r, `${a} + ${b} = ?`, `${a}+${b}`, { hint: 'Посчитай по пальцам или предметам.' }, 0.5);
    const s = a + b;
    return calc(r, `${s} − ${a} = ?`, `${s}-${a}`, {}, 0.5);
  }),
  T('math-1-sum20', 1, 'Числа до 20', '🔟', 4, (r, d) => {
    const a = r.int(2, 18), b = r.int(2, 20 - a);
    if (d >= 3 && r.chance(0.4)) { const x = r.int(1, 9); return calc(r, `□ + ${x} = ${x + a}. Чему равен □?`, `${a}`); }
    return r.chance(0.5) ? calc(r, `${a} + ${b} = ?`, `${a}+${b}`) : calc(r, `${a + b} − ${b} = ?`, `${a + b}-${b}`);
  }),
  topic('math-1-compare', 'math', 1, 'Больше, меньше, равно', [
    ...generate('math-1-compare', 4, compare((r) => { const a = r.int(1, 20), b = r.int(1, 20); return [String(a), String(b), a, b]; })),
    ...generate('math-1-compare2', 3, compare((r) => { const a = r.int(1, 10), b = r.int(1, 10), c = r.int(1, 10), e = r.int(1, 10); return [`${a} + ${b}`, `${c} + ${e}`, a + b, c + e]; })),
    ...generate('math-1-order', 2, orderNums(1, 20, 4)),
  ], '⚖️'),
  topic('math-1-next', 'math', 1, 'Что идёт дальше', generate('math-1-next', 6, (r, d) => {
    const step = d <= 2 ? 1 : pick2(r, [2, 5, 10]);
    const st = r.int(0, 10);
    const sq = [0, 1, 2, 3].map((i) => st + step * i);
    return numOrChoice(r, `Продолжи ряд: ${sq.join(', ')}, …`, st + step * 4, { hint: `Каждое число больше предыдущего на ${step}.`, expr: `${st}+${step}*4` }, 0.4);
  }), '🔢'),
];

const g2: TopicSeed[] = [
  T('math-2-sum100', 2, 'Сложение и вычитание до 100', '💯', 5, (r, d) => {
    const a = r.int(11, d <= 2 ? 49 : 89), b = r.int(2, d <= 2 ? 40 : 99 - a);
    if (a + b > 100) return null;
    return r.chance(0.5) ? calc(r, `${a} + ${b} = ?`, `${a}+${b}`) : calc(r, `${a + b} − ${b} = ?`, `${a + b}-${b}`);
  }),
  T('math-2-table', 2, 'Таблица умножения', '✖️', 5, (r, d) => {
    const a = r.int(2, d <= 2 ? 5 : 9), b = r.int(2, 9);
    return r.chance(0.6) ? calc(r, `${a} × ${b} = ?`, `${a}*${b}`, { hint: `Сложи число ${a} ровно ${b} раз.` }, 0.5) : calc(r, `${a * b} : ${a} = ?`, `${a * b}/${a}`, {}, 0.5);
  }),
  topic('math-2-match', 'math', 2, 'Соедини пример и ответ', generate('math-2-match', 6, matchExpr((r) => { const a = r.int(2, 9), b = r.int(2, 9); return [`${a} × ${b}`, a * b]; })), '🔗'),
  T('math-2-words', 2, 'Задачи в одно действие', '📖', 4, (r) => {
    const a = r.int(12, 60), b = r.int(3, 11);
    const k = r.int(0, 2);
    if (k === 0) return calc(r, `У Маши было ${a} наклеек, ей подарили ещё ${b}. Сколько наклеек стало?`, `${a}+${b}`);
    if (k === 1) return calc(r, `В корзине ${a} яблок. Взяли ${b}. Сколько яблок осталось?`, `${a}-${b}`);
    return calc(r, `В пакете по ${b} конфет. Сколько конфет в ${3} таких пакетах?`, `${b}*3`);
  }),
];

const g3: TopicSeed[] = [
  T('math-3-big', 3, 'Числа до 1000', '🏔️', 5, (r, d) => {
    const a = r.int(100, 600), b = r.int(20, 399);
    return r.chance(0.5) ? calc(r, `${a} + ${b} = ?`, `${a}+${b}`) : calc(r, `${a + b} − ${b} = ?`, `${a + b}-${b}`);
  }),
  T('math-3-muldiv', 3, 'Умножение и деление', '➗', 5, (r, d) => {
    const a = r.int(6, d <= 2 ? 12 : 30), b = r.int(2, 9);
    return r.chance(0.5) ? calc(r, `${a} × ${b} = ?`, `${a}*${b}`) : calc(r, `${a * b} : ${b} = ?`, `${a * b}/${b}`);
  }),
  T('math-3-order', 3, 'Порядок действий', '🧮', 6, (r, d) => {
    const a = r.int(2, 20), b = r.int(2, 9), c = r.int(2, 9);
    const k = r.int(0, 2);
    if (k === 0) return calc(r, `${a} + ${b} × ${c} = ?`, `${a}+${b}*${c}`, { hint: 'Сначала умножение.' });
    if (k === 1) return calc(r, `(${a} + ${b}) × ${c} = ?`, `(${a}+${b})*${c}`, { hint: 'Сначала скобки.' });
    return calc(r, `${a * c} − ${b} × ${c} + ${b}= ?`.replace('= ?', ' = ?'), `${a * c}-${b}*${c}+${b}`);
  }),
  T('math-3-perimeter', 3, 'Периметр и площадь', '📐', 5, (r, d) => {
    const a = r.int(2, 15), b = r.int(2, 12);
    return r.chance(0.5)
      ? calc(r, `Найди периметр прямоугольника со сторонами ${a} см и ${b} см (в см).`, `2*(${a}+${b})`, { hint: 'Сложи все четыре стороны.' })
      : calc(r, `Найди площадь прямоугольника ${a} см × ${b} см (в см²).`, `${a}*${b}`, { hint: 'Умножь длину на ширину.' });
  }),
];

const ROM: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const toRoman = (n: number) => { let s = ''; for (const [v, l] of ROM) while (n >= v) { s += l; n -= v; } return s; };

const g4: TopicSeed[] = [
  T('math-4-mult', 4, 'Многозначные числа', '🔢', 5, (r, d) => {
    const a = r.int(12, d <= 2 ? 99 : 999), b = r.int(3, d <= 2 ? 9 : 49);
    return r.chance(0.5) ? calc(r, `${a} × ${b} = ?`, `${a}*${b}`, {}, 0.2) : calc(r, `${a * b} : ${b} = ?`, `${a * b}/${b}`, {}, 0.2);
  }),
  T('math-4-motion', 4, 'Скорость, время, расстояние', '🚗', 5, (r, d) => {
    const v = r.int(4, 90), t = r.int(2, 8);
    const k = r.int(0, 2);
    if (k === 0) return calc(r, `Скорость ${v} км/ч, время в пути ${t} ч. Какое расстояние (км)?`, `${v}*${t}`);
    if (k === 1) return calc(r, `Расстояние ${v * t} км пройдено за ${t} ч. Какая скорость (км/ч)?`, `${v * t}/${t}`);
    return calc(r, `Расстояние ${v * t} км, скорость ${v} км/ч. Сколько часов в пути?`, `${v * t}/${v}`);
  }),
  T('math-4-units', 4, 'Единицы измерения', '📏', 5, (r) => {
    const k = r.int(0, 3);
    const x = r.int(2, 30);
    if (k === 0) return calc(r, `${x} м = ? см`, `${x}*100`);
    if (k === 1) return calc(r, `${x} км = ? м`, `${x}*1000`);
    if (k === 2) return calc(r, `${x} ч = ? мин`, `${x}*60`);
    return calc(r, `${x} кг = ? г`, `${x}*1000`);
  }),
  T('math-4-roman', 4, 'Римские цифры', '🏛️', 6, (r, d) => {
    const n = r.int(1, d <= 2 ? 20 : d <= 4 ? 100 : 399);
    return r.chance(0.5)
      ? { kind: 'choice', prompt: `Запиши римскими цифрами число ${n}.`, answer: toRoman(n), options: [...new Set([toRoman(n), toRoman(n + 1), toRoman(Math.max(1, n - 1)), toRoman(n + 10)])].slice(0, 4) }
      : { kind: 'number', prompt: `Какое число записано римскими цифрами: ${toRoman(n)}?`, answer: String(n), explanation: `${toRoman(n)} = ${n}` };
  }),
];

const frac = (a: number, b: number) => { const g = gcd(a, b); return b / g === 1 ? String(a / g) : `${a / g}/${b / g}`; };

const g5: TopicSeed[] = [
  T('math-5-fractions', 5, 'Обыкновенные дроби', '🍕', 5, (r, d) => {
    const b = pick2(r, [4, 5, 6, 8, 10, 12]), a = r.int(1, b - 1), c = r.int(1, b - 1);
    if (a + c >= b) return null;
    const ans = frac(a + c, b);
    return { kind: 'text', prompt: `${a}/${b} + ${c}/${b} = ? (ответ дробью, сократи, например 1/2)`, answer: ans, explanation: `Складываем числители: ${a}+${c}=${a + c}, знаменатель ${b}.` , verify: () => Math.abs(eval(ans.replace('/', '/')) - (a + c) / b) < 1e-9 };
  }),
  T('math-5-decimals', 5, 'Десятичные дроби', '🔸', 5, (r, d) => {
    const a = r.int(11, 99) / 10, b = r.int(11, 99) / 10;
    const v = Math.round((a + b) * 10) / 10;
    return r.chance(0.5) ? { kind: 'number', prompt: `${fmt(a)} + ${fmt(b)} = ?`, answer: fmt(v), expr: `${a}+${b}`.replace(/,/g, '.') , verify: () => Math.abs(a + b - v) < 1e-9 } : { kind: 'number', prompt: `${fmt(a)} × 10 = ?`, answer: fmt(a * 10), verify: () => true };
  }),
  T('math-5-gcd', 5, 'НОД и НОК', '🔗', 5, (r, d) => {
    const a = r.int(4, 40), b = r.int(4, 40);
    if (a === b) return null;
    const g = gcd(a, b);
    const l = (a * b) / g;
    return r.chance(0.5)
      ? { kind: 'number', prompt: `Найди НОД чисел ${a} и ${b}.`, answer: String(g), verify: () => a % g === 0 && b % g === 0 && gcd(a / g, b / g) === 1 }
      : { kind: 'number', prompt: `Найди НОК чисел ${a} и ${b}.`, answer: String(l), verify: () => l % a === 0 && l % b === 0 };
  }),
  T('math-5-equations', 5, 'Уравнения', '🧩', 5, (r, d) => {
    const x = r.int(2, 30), a = r.int(2, 12);
    const k = r.int(0, 2);
    if (k === 0) return calc(r, `x + ${a} = ${x + a}. Найди x.`, `${x}`, {}, 0.2);
    if (k === 1) return calc(r, `${a} · x = ${a * x}. Найди x.`, `${x}`, {}, 0.2);
    return calc(r, `x − ${a} = ${x - a}. Найди x.`, `${x}`, {}, 0.2);
  }),
  T('math-5-percent', 5, 'Проценты', '％', 5, (r, d) => {
    const p = pick2(r, [10, 20, 25, 50, 5, 40]), n = pick2(r, [20, 40, 60, 80, 100, 200, 120, 300]);
    const v = (n * p) / 100;
    if (!Number.isInteger(v)) return null;
    return calc(r, `Найди ${p}% от числа ${n}.`, `${n}*${p}/100`, { hint: `1% от ${n} — это ${n / 100}.` });
  }),
];

const g6: TopicSeed[] = [
  T('math-6-negatives', 6, 'Отрицательные числа', '➖', 6, (r, d) => {
    const a = r.int(-20, 20), b = r.int(-20, 20);
    const op = r.chance(0.5) ? '+' : '-';
    return calc(r, `${a} ${op === '-' ? '−' : '+'} (${b}) = ?`, `${a}${op}(${b})`.replace('--', '+'), { hint: 'Минус перед минусом даёт плюс.' }, 0.3);
  }),
  T('math-6-ratio', 6, 'Пропорции', '⚗️', 5, (r) => {
    const a = r.int(2, 9), b = r.int(2, 9), k = r.int(2, 9);
    return calc(r, `${a} : ${b} = x : ${b * k}. Найди x.`, `${a}*${k}`, { hint: 'Знаменатель вырос в несколько раз — числитель во столько же.' });
  }),
  T('math-6-lineq', 6, 'Линейные уравнения', '🧩', 5, (r, d) => {
    const x = r.int(-9, 15), a = r.int(2, 9), b = r.int(1, 30);
    return calc(r, `${a}x + ${b} = ${a * x + b}. Найди x.`, `${x}`, { hint: 'Перенеси число вправо с противоположным знаком.' }, 0.2);
  }),
  T('math-6-fracops', 6, 'Действия с дробями', '🍰', 4, (r) => {
    const a = r.int(1, 5), b = pick2(r, [2, 3, 4, 5]), c = r.int(1, 4), e = pick2(r, [2, 3, 4, 5]);
    if (a >= b || c >= e) return null;
    const num_ = a * e + c * b, den = b * e;
    const ans = frac(num_, den);
    return { kind: 'text', prompt: `${a}/${b} + ${c}/${e} = ? (дробью, сокращённо)`, answer: ans, explanation: `Общий знаменатель ${b * e}: (${a}·${e}+${c}·${b})/${den}.`, verify: () => Math.abs(a / b + c / e - Number(ans.split('/')[0]) / Number(ans.split('/')[1] ?? 1)) < 1e-9 };
  }),
];

const g7: TopicSeed[] = [
  T('math-7-powers', 7, 'Степени', '⬆️', 6, (r, d) => {
    const a = r.int(2, d <= 2 ? 5 : 9), n = r.int(2, d <= 2 ? 3 : 4);
    return calc(r, `${a}^${n} = ?`, `${a}**${n}`, {}, 0.3);
  }),
  T('math-7-expr', 7, 'Значение выражения', '🧮', 6, (r) => {
    const x = r.int(-5, 8), a = r.int(2, 9), b = r.int(-9, 9);
    return calc(r, `Найди значение ${a}x ${b >= 0 ? '+' : '−'} ${Math.abs(b)} при x = ${x}.`, `${a}*(${x})+(${b})`);
  }),
  T('math-7-angles', 7, 'Углы и треугольники', '📐', 6, (r) => {
    const a = r.int(20, 80), b = r.int(20, 90);
    if (a + b >= 170) return null;
    return r.chance(0.6) ? calc(r, `В треугольнике два угла ${a}° и ${b}°. Найди третий угол (в градусах).`, `180-${a}-${b}`, { hint: 'Сумма углов треугольника 180°.' }) : calc(r, `Смежные углы: один равен ${a}°. Найди второй (в градусах).`, `180-${a}`);
  }),
  T('math-7-sys', 7, 'Формулы сокращённого умножения', '✨', 5, (r) => {
    const a = r.int(2, 9), b = r.int(1, 9);
    return calc(r, `Вычисли (${a} + ${b})² − ${a}² − 2·${a}·${b}.`, `${b*b}`, { explanation: '(a+b)² = a² + 2ab + b², остаётся b².' });
  }),
];

const g8: TopicSeed[] = [
  T('math-8-roots', 8, 'Квадратные корни', '√', 6, (r, d) => {
    const x = r.int(2, d <= 3 ? 15 : 30);
    const y = r.int(1, 9);
    return r.chance(0.6) ? calc(r, `√${x * x} = ?`, `${x}`, {}, 0.3) : calc(r, `√${x * x} + √${y * y} = ?`, `${x}+${y}`, {}, 0.2);
  }),
  T('math-8-quad', 8, 'Квадратные уравнения', '📈', 6, (r) => {
    const x1 = r.int(-6, 7), x2 = r.int(-6, 7);
    if (x1 >= x2) return null;
    const b = -(x1 + x2), c = x1 * x2;
    return { kind: 'text', prompt: `Реши x² ${b >= 0 ? '+' : '−'} ${Math.abs(b)}x ${c >= 0 ? '+' : '−'} ${Math.abs(c)} = 0. Запиши корни через точку с запятой по возрастанию, например: -2;3`, answer: `${x1};${x2}`, accept: [`${x1}; ${x2}`], explanation: 'По теореме Виета сумма корней равна −b, произведение c.', verify: () => x1 * x1 + b * x1 + c === 0 && x2 * x2 + b * x2 + c === 0 };
  }),
  T('math-8-pyth', 8, 'Теорема Пифагора', '📐', 4, (r) => {
    const tr = pick2(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]]);
    const k = r.int(1, 4);
    const [a, b, c] = tr.map((x) => x * k);
    return r.chance(0.5) ? calc(r, `Катеты прямоугольного треугольника ${a} и ${b}. Найди гипотенузу.`, `${c}`, { verify: () => a * a + b * b === c * c }, 0.2) : calc(r, `Гипотенуза ${c}, катет ${a}. Найди второй катет.`, `${b}`, { verify: () => a * a + b * b === c * c }, 0.2);
  }),
  T('math-8-ineq', 8, 'Неравенства', '↔️', 5, (r) => {
    const a = r.int(2, 7), x = r.int(-5, 9), b = r.int(1, 12);
    return calc(r, `Реши ${a}x + ${b} > ${a * x + b}. Найди наименьшее целое x.`, `${x + 1}`, { hint: 'Решение: x > ' + x });
  }),
];

const g9: TopicSeed[] = [
  T('math-9-prog', 9, 'Прогрессии', '📊', 6, (r) => {
    const a1 = r.int(-5, 12), dd = r.int(2, 7), n = r.int(5, 15);
    if (r.chance(0.5)) return calc(r, `Арифметическая прогрессия: a₁ = ${a1}, d = ${dd}. Найди a${n}.`, `${a1}+${dd}*${n - 1}`, { hint: 'aₙ = a₁ + (n−1)d' }, 0.2);
    const q = r.int(2, 3), m = r.int(3, 6);
    return calc(r, `Геометрическая прогрессия: b₁ = 2, q = ${q}. Найди b${m}.`, `2*${q}**${m - 1}`, { hint: 'bₙ = b₁·q^(n−1)' }, 0.2);
  }),
  T('math-9-system', 9, 'Системы уравнений', '🧷', 5, (r) => {
    const x = r.int(-5, 9), y = r.int(-5, 9);
    return calc(r, `x + y = ${x + y}, x − y = ${x - y}. Найди x.`, `${x}`, { hint: 'Сложи уравнения.' }, 0.2);
  }),
  T('math-9-prob', 9, 'Вероятность', '🎲', 5, (r) => {
    const w = r.int(2, 9), bk = r.int(2, 9), tot = w + bk;
    const ans = frac(w, tot);
    return { kind: 'text', prompt: `В коробке ${w} белых и ${bk} чёрных шаров. Какова вероятность достать белый? (дробью, сокращённо)`, answer: ans, verify: () => ans.includes('/') ? Number(ans.split('/')[0]) * tot === w * Number(ans.split('/')[1]) : w === tot };
  }),
  T('math-9-comb', 9, 'Комбинаторика', '🔀', 8, (r) => {
    const n = r.int(3, 7), f = [1, 1, 2, 6, 24, 120, 720, 5040];
    return r.chance(0.5) ? calc(r, `Сколькими способами можно выстроить в ряд ${n} человек?`, `${f[n]}`, { explanation: `${n}! = ${f[n]}` }, 0.3) : calc(r, `Сколько двузначных чисел можно составить из цифр ${[1, 2, 3, 4, 5, 6, 7].slice(0, n).join(', ')} (цифры могут повторяться)?`, `${n}*${n}`, {}, 0.3);
  }),
];

const g10: TopicSeed[] = [
  T('math-10-log', 10, 'Логарифмы', '🪜', 5, (r) => {
    const b = pick2(r, [2, 3, 5, 10]), n = r.int(1, b === 10 ? 4 : 5);
    return calc(r, `log${b === 2 ? '₂' : b === 3 ? '₃' : b === 5 ? '₅' : '₁₀'}(${b ** n}) = ?`, `${n}`, { hint: `В какую степень надо возвести ${b}, чтобы получить ${b ** n}?` }, 0.3);
  }),
  T('math-10-deriv', 10, 'Производные', '📈', 6, (r) => {
    const a = r.int(2, 9), n = r.int(2, 5), x = r.int(1, 4);
    return calc(r, `f(x) = ${a}x^${n}. Найди f'(${x}).`, `${a}*${n}*${x}**${n - 1}`, { hint: `(x^n)' = n·x^(n−1)` });
  }),
  T('math-10-trig', 10, 'Тригонометрия', '〰️', 5, (r) => {
    const t: [string, string][] = [['sin 30°', '1/2'], ['cos 60°', '1/2'], ['sin 90°', '1'], ['cos 0°', '1'], ['tg 45°', '1'], ['sin 0°', '0'], ['cos 90°', '0'], ['cos 180°', '-1'], ['sin 270°', '-1'], ['sin 180°', '0'], ['cos 270°', '0'], ['sin 150°', '1/2'], ['cos 120°', '-1/2'], ['tg 0°', '0'], ['cos 360°', '1']];
    const [q, a] = pick2(r, t);
    return { kind: 'text', prompt: `Найди значение: ${q}. Ответ: число, например 0, -1 или 1/2.`, answer: a, accept: a === '1/2' ? ['0,5', '0.5'] : undefined };
  }),
  T('math-10-expo', 10, 'Показательные уравнения', '🔝', 5, (r) => {
    const b = pick2(r, [2, 3, 5]), x = r.int(1, 5);
    return calc(r, `Реши ${b}^x = ${b ** x}.`, `${x}`, {}, 0.3);
  }),
];

const g11: TopicSeed[] = [
  T('math-11-integral', 11, 'Интегралы', '∫', 5, (r) => {
    const a = r.int(1, 6), n = r.int(1, 3), up = r.int(1, 3);
    // ∫0^up a*x^n dx = a*up^(n+1)/(n+1)
    const v = (a * up ** (n + 1)) / (n + 1);
    if (!Number.isInteger(v)) return null;
    return calc(r, `Вычисли ∫ от 0 до ${up} от ${a}x^${n} dx.`, `${a}*${up}**${n + 1}/${n + 1}`, { hint: 'Первообразная a·x^(n+1)/(n+1).' }, 0.2);
  }),
  T('math-11-comb', 11, 'Сочетания', '🧮', 5, (r) => {
    const n = r.int(4, 9), k = r.int(2, 3);
    const c = k === 2 ? (n * (n - 1)) / 2 : (n * (n - 1) * (n - 2)) / 6;
    return calc(r, `Сколькими способами можно выбрать ${k} человек из ${n}?`, k === 2 ? `${n}*${n - 1}/2` : `${n}*${n - 1}*${n - 2}/6`, { explanation: `C(${n},${k}) = ${c}` }, 0.2);
  }),
  T('math-11-volume', 11, 'Объёмы тел', '🧊', 5, (r) => {
    const a = r.int(2, 9), b = r.int(2, 9), c = r.int(2, 9);
    return r.chance(0.5) ? calc(r, `Найди объём прямоугольного параллелепипеда ${a}×${b}×${c}.`, `${a}*${b}*${c}`, {}, 0.2) : calc(r, `Найди объём пирамиды: площадь основания ${3 * a * b}, высота ${c}.`, `${3 * a * b}*${c}/3`, { hint: 'V = (1/3)·S·h' }, 0.2);
  }),
  T('math-11-logeq', 11, 'Логарифмические уравнения', '🪜', 5, (r) => {
    const b = pick2(r, [2, 3]), x = r.int(2, 6);
    return calc(r, `Реши log${b === 2 ? '₂' : '₃'}(x) = ${x}.`, `${b}**${x}`, {}, 0.2);
  }),
];

export const mathTopics: TopicSeed[] = [...g1, ...g2, ...g3, ...g4, ...g5, ...g6, ...g7, ...g8, ...g9, ...g10, ...g11];
