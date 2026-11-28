/** Материалы для игр 1–4 классов (без сервера): слова с картинками, корзинки, счёт предметов. */
export interface KidWord { emoji: string; word: string }

export const KID_WORDS: KidWord[] = [
  { emoji: '🐱', word: 'КОТ' }, { emoji: '🐶', word: 'СОБАКА' }, { emoji: '🦊', word: 'ЛИСА' }, { emoji: '🐰', word: 'ЗАЯЦ' },
  { emoji: '🐸', word: 'ЛЯГУШКА' }, { emoji: '🐟', word: 'РЫБА' }, { emoji: '🐴', word: 'ЛОШАДЬ' }, { emoji: '🐄', word: 'КОРОВА' },
  { emoji: '🐻', word: 'МЕДВЕДЬ' }, { emoji: '🍎', word: 'ЯБЛОКО' }, { emoji: '🍌', word: 'БАНАН' }, { emoji: '🍐', word: 'ГРУША' },
  { emoji: '🍓', word: 'КЛУБНИКА' }, { emoji: '🍉', word: 'АРБУЗ' }, { emoji: '🍋', word: 'ЛИМОН' }, { emoji: '🥕', word: 'МОРКОВЬ' },
  { emoji: '🍅', word: 'ПОМИДОР' }, { emoji: '🌳', word: 'ДЕРЕВО' }, { emoji: '🌸', word: 'ЦВЕТОК' }, { emoji: '☀️', word: 'СОЛНЦЕ' },
  { emoji: '🌙', word: 'ЛУНА' }, { emoji: '⭐', word: 'ЗВЕЗДА' }, { emoji: '☁️', word: 'ОБЛАКО' }, { emoji: '❄️', word: 'СНЕГ' },
  { emoji: '🏠', word: 'ДОМ' }, { emoji: '🚗', word: 'МАШИНА' }, { emoji: '✈️', word: 'САМОЛЁТ' }, { emoji: '🚂', word: 'ПОЕЗД' },
  { emoji: '📚', word: 'КНИГА' }, { emoji: '✏️', word: 'КАРАНДАШ' }, { emoji: '🎒', word: 'РЮКЗАК' }, { emoji: '⚽', word: 'МЯЧ' },
  { emoji: '🍞', word: 'ХЛЕБ' }, { emoji: '🥛', word: 'МОЛОКО' }, { emoji: '🧀', word: 'СЫР' }, { emoji: '🎂', word: 'ТОРТ' },
];

export interface BasketSet { a: string; b: string; itemsA: string[]; itemsB: string[] }

export const BASKETS: BasketSet[] = [
  { a: '🐾 Животные', b: '🌿 Растения', itemsA: ['кошка', 'собака', 'лиса', 'заяц', 'медведь', 'лягушка', 'лошадь'], itemsB: ['ромашка', 'дуб', 'берёза', 'роза', 'ель', 'тюльпан', 'трава'] },
  { a: '🍎 Фрукты', b: '🥕 Овощи', itemsA: ['яблоко', 'груша', 'банан', 'слива', 'апельсин', 'лимон'], itemsB: ['морковь', 'капуста', 'огурец', 'помидор', 'лук', 'картофель', 'свёкла'] },
  { a: '🌱 Живое', b: '🪨 Неживое', itemsA: ['птица', 'дерево', 'рыба', 'жук', 'цветок', 'бабочка'], itemsB: ['камень', 'стол', 'книга', 'машина', 'песок', 'карандаш'] },
  { a: '🏠 Домашние', b: '🌲 Дикие', itemsA: ['корова', 'коза', 'свинья', 'курица', 'овца'], itemsB: ['волк', 'лиса', 'медведь', 'лось', 'заяц', 'ёж'] },
  { a: '🐾 Звери', b: '🐦 Птицы', itemsA: ['волк', 'лиса', 'заяц', 'медведь', 'ёж', 'белка'], itemsB: ['воробей', 'ворона', 'сорока', 'сова', 'утка', 'голубь'] },
  { a: '2️⃣ Чётные', b: '1️⃣ Нечётные', itemsA: ['2', '4', '6', '8', '10', '12', '14', '16'], itemsB: ['1', '3', '5', '7', '9', '11', '13', '15'] },
  { a: '🚗 Едет по земле', b: '✈️ Плывёт или летит', itemsA: ['автобус', 'трамвай', 'поезд', 'велосипед', 'грузовик'], itemsB: ['корабль', 'лодка', 'самолёт', 'вертолёт', 'катер'] },
];

export interface KidTask { id: string; type: string; prompt: string; options: string[] | null; answer: string }

const shuffle = <T,>(a: T[]): T[] => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};
export const shuffled = shuffle;

export function makeBasketTasks(n = 14): KidTask[] {
  const out: KidTask[] = [];
  const sets = shuffle(BASKETS);
  let k = 0;
  while (out.length < n) {
    const set = sets[k++ % sets.length];
    const pickA = shuffle(set.itemsA).slice(0, 2);
    const pickB = shuffle(set.itemsB).slice(0, 2);
    for (const it of shuffle([...pickA.map((t) => [t, set.a]), ...pickB.map((t) => [t, set.b])])) {
      out.push({ id: `b${out.length}`, type: 'choice', prompt: `Куда положим: «${it[0]}»?`, options: shuffle([set.a, set.b]), answer: it[1] });
    }
  }
  return out.slice(0, n);
}

const THINGS = ['🍎', '⭐', '🐟', '🌸', '🐞', '🎈', '🍪', '🐥'];
export function makeCountTasks(grade: number, n = 12): KidTask[] {
  const max = grade <= 1 ? 5 : grade <= 2 ? 9 : 12;
  const out: KidTask[] = [];
  for (let i = 0; i < n; i++) {
    const t = THINGS[Math.floor(Math.random() * THINGS.length)];
    const plus = Math.random() < 0.6;
    const a = 1 + Math.floor(Math.random() * max);
    const b = 1 + Math.floor(Math.random() * Math.min(max, plus ? max : a));
    const ans = plus ? a + b : a - b;
    const prompt = plus ? `${t.repeat(a)}\n+\n${t.repeat(b)}\nСколько всего?` : `${t.repeat(a)}\nубрали ${b}\nСколько осталось?`;
    const opts = new Set<number>([ans]);
    while (opts.size < 4) opts.add(Math.max(0, ans + Math.floor(Math.random() * 7) - 3));
    out.push({ id: `c${i}`, type: 'choice', prompt, options: shuffle([...opts]).map(String), answer: String(ans) });
  }
  return out;
}
