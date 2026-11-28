/**
 * Блоки тем внутри предмета: «Математика → Дроби и проценты → тема».
 * Ключ — «хвост» slug после «предмет-класс-» (например, для math-5-fractions это fractions).
 * Темы ВПР/ОГЭ/ЕГЭ попадают в блоки «Подготовка к …» автоматически по префиксу slug.
 */
const B: Record<string, Record<string, string[]>> = {
  math: {
    'Числа и счёт': ['sum10', 'sum20', 'compare', 'next', 'sum100', 'big', 'order', 'roman', 'negatives'],
    'Действия с числами': ['table', 'match', 'muldiv', 'mult', 'gcd', 'decimals'],
    'Дроби и проценты': ['fractions', 'percent', 'fracops'],
    'Задачи': ['words', 'motion'],
    'Величины и геометрия': ['perimeter', 'units', 'angles', 'pyth', 'volume'],
    'Уравнения и алгебра': ['equations', 'lineq', 'ratio', 'powers', 'expr', 'sys', 'roots', 'quad', 'ineq', 'system', 'prog'],
    'Вероятность и комбинаторика': ['prob', 'comb'],
    'Функции и анализ': ['log', 'deriv', 'trig', 'expo', 'integral', 'logeq'],
  },
  russian: {
    'Звуки и буквы': ['zvuki-bukvy', 'slog-udarenie', 'fonetika'],
    'Орфография': ['pravila', 'parnye-soglasnye', 'bezudarnye-glasnye', 'orfogrammy-kornya', 'pristavki', 'chereduyushchiesya', 'n-nn', 'ne-s-chastyami-rechi', 'spelling'],
    'Состав слова': ['sostav-slova'],
    'Части речи': ['chasti-rechi', 'padezhi', 'glagol', 'sklonenie', 'spryazhenie', 'chislitelnoe-mestoimenie', 'prichastie', 'deeprichastie', 'narechie'],
    'Предложение и пунктуация': ['predlozhenie', 'sintaksis', 'slovosochetanie', 'odnorodnye-chleny', 'vvodnye-obosoblennye', 'pryamaya-rech', 'sentence-types', 'punct'],
    'Слово, текст и речь': ['leksika', 'norms', 'lexicon', 'text'],
  },
  literature: {
    'Сказки и проза': ['skazki', 'proza', 'pisateli'],
    'Поэзия': ['poeziya'],
    'Классика XIX века': ['realism', 'klassika', 'xix'],
    'Литература XX века': ['xx'],
  },
  english: {
    'Слова и первые фразы': ['colors', 'alphabet', 'numbers', 'animals', 'food'],
    'Простые конструкции': ['to-be', 'have-got', 'there-is-are', 'can', 'articles', 'prepositions', 'comparison'],
    'Времена': ['present-simple', 'present-continuous', 'past-simple', 'future', 'present-perfect', 'past-continuous', 'past-perfect'],
    'Продвинутая грамматика': ['irregular-verbs', 'modal-verbs', 'passive', 'conditionals', 'third-conditional', 'reported-speech', 'gerund-infinitive', 'relative-clauses', 'word-formation'],
  },
  world: {
    'Природа': ['seasons', 'animals', 'plants', 'senses', 'water', 'nature-zones', 'ecology'],
    'Человек и безопасность': ['safety', 'human-body'],
    'Земля и Россия': ['solar-system', 'russia', 'continents'],
  },
  biology: {
    'Живые организмы и клетка': ['living', 'cell', 'kingdoms', 'organelles', 'molecules', 'metabolism', 'division'],
    'Растения': ['plant-organs', 'photosynthesis', 'plant-reproduction'],
    'Животные': ['invertebrates', 'vertebrates-cold', 'birds-mammals'],
    'Человек': ['blood', 'digestion', 'nervous', 'skeleton'],
    'Генетика и эволюция': ['genetics', 'evolution', 'genetics-advanced', 'evolution-factors'],
    'Экология': ['ecosystems'],
  },
  geography: {
    'Планета Земля': ['planeta', 'karta', 'materiki', 'litosfera', 'atmosfera', 'gidrosfera'],
    'Природа России': ['zony', 'rossiya-relef'],
    'Население и хозяйство': ['naselenie', 'hozyaistvo', 'strany', 'globalnye'],
  },
  physics: {
    'Механика': ['dvizhenie', 'plotnost-davlenie', 'sily-rabota', 'dinamika', 'impuls-volny'],
    'Тепловые явления': ['teplo', 'mkt'],
    'Электричество и магнетизм': ['elektr', 'magnit', 'elektrodinamika', 'em-kolebaniya'],
    'Свет и волны': ['optika', 'volnovaya-optika'],
    'Атом': ['atom'],
  },
  chemistry: {
    'Основы химии': ['atom', 'tablica', 'formuly', 'reakcii', 'mol', 'ovr'],
    'Неорганическая химия': ['kisloty', 'rastvory', 'metally'],
    'Органическая химия': ['organika', 'kislorod-org'],
  },
  history: {
    'Древний мир': ['egipet', 'greciya', 'rim'],
    'Средние века и Древняя Русь': ['evropa', 'rus-ix-xiii', 'rus-xiii-xv'],
    'Россия XVI–XVIII веков': ['rus-xvi', 'smuta', 'novoe-vremya', 'petr', 'ekaterina'],
    'XIX век': ['rus-xix', 'mir-xix'],
    'XX век': ['revolyutsii', 'rus-xx-nach', '1917-1941', 'vov', 'mirovye-voiny', 'holodnaya-voina', 'rossiya-1985'],
  },
  informatics: {
    'Информация и числа': ['units', 'bits', 'binary', 'hex', 'volume'],
    'Алгоритмы и логика': ['algo', 'logic', 'sort', 'comb'],
    'Данные': ['db'],
  },
};

const EXAM: Record<string, string> = { vpr: 'Подготовка к ВПР', oge: 'Подготовка к ОГЭ', ege: 'Подготовка к ЕГЭ' };

export function blockFor(slug: string, subject: string): string {
  const pre = slug.split('-')[0];
  if (EXAM[pre]) return EXAM[pre];
  const tail = slug.split('-').slice(2).join('-');
  for (const [name, tails] of Object.entries(B[subject] ?? {})) if (tails.includes(tail)) return name;
  return 'Другое';
}
