export type SubjectKey =
  | 'math'
  | 'russian'
  | 'literature'
  | 'english'
  | 'world'
  | 'biology'
  | 'geography'
  | 'physics'
  | 'chemistry'
  | 'history'
  | 'informatics';

/** choice — выбор из вариантов (в т.ч. «Верно/Неверно»), number — ввод числа, text — ввод слова,
 *  order — расставить элементы по порядку, match — соединить пары. */
export type Kind = 'choice' | 'number' | 'text' | 'order' | 'match';
export type Diff = 1 | 2 | 3 | 4 | 5;

export interface TaskSeed {
  kind: Kind;
  prompt: string;
  /** choice/number/text — правильный ответ; order — элементы через «|»; match — «левое=правое» через «|». */
  answer: string;
  /** choice: все варианты, включая правильный (перемешиваются при загрузке). */
  options?: string[];
  /** text: дополнительные допустимые ответы. */
  accept?: string[];
  /** order: элементы в ПРАВИЛЬНОМ порядке. */
  items?: string[];
  /** match: правильные пары. */
  pairs?: [string, string][];
  difficulty: Diff;
  hint?: string;
  /** Короткое объяснение, показывается после ответа. */
  explanation?: string;
  /** Арифметическое выражение JS, значение которого должно совпасть с ответом (проверка в check). */
  expr?: string;
  /** Независимая проверка ответа (запускается только в check, в базу не попадает). */
  verify?: () => boolean;
}

export interface TopicSeed {
  slug: string;
  subject: SubjectKey;
  grade: number;
  title: string;
  icon?: string;
  tasks: TaskSeed[];
}

/** Задание в том виде, в каком оно хранится в базе. */
export interface StoredTask {
  type: Kind;
  prompt: string;
  difficulty: number;
  hint: string | null;
  data: {
    answer: string;
    options?: string[];
    accept?: string[];
    items?: string[];
    pairs?: [string, string][];
    explanation?: string;
  };
}

export interface StoredTopic {
  slug: string;
  subject: SubjectKey;
  grade: number;
  title: string;
  icon: string | null;
  position: number;
  contentHash: string;
  tasks: StoredTask[];
}
