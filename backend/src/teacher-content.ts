import { BadRequestException } from '@nestjs/common';

export interface ParsedTask {
  type: 'choice' | 'text';
  prompt: string;
  answer: string;
  options?: string[];
  accept?: string[];
}

/**
 * Формат: одно задание на строку.
 *   Вопрос | верный ответ | неверный 1 | неверный 2 …   — выбор ответа (верный пишется первым)
 *   Вопрос | ответ                                      — ввод ответа (другие допустимые: ответ / вариант)
 */
export function parseTasks(text: string): ParsedTask[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  if (lines.length === 0) throw new BadRequestException('Список заданий пуст');
  if (lines.length > 200) throw new BadRequestException('Не больше 200 заданий за раз');
  return lines.map((line, i) => {
    const parts = line.split('|').map((p) => p.trim());
    const n = i + 1;
    if (parts.length < 2 || parts.some((p) => !p)) throw new BadRequestException(`Строка ${n}: нужны вопрос и ответ через « | »`);
    if (parts.some((p) => p.length > 300)) throw new BadRequestException(`Строка ${n}: слишком длинный текст`);
    const [prompt, answer, ...wrong] = parts;
    if (wrong.length === 0) {
      const variants = answer.split('/').map((v) => v.trim()).filter(Boolean);
      return { type: 'text', prompt, answer: variants[0], accept: variants.length > 1 ? variants.slice(1) : undefined };
    }
    if (wrong.length > 5) throw new BadRequestException(`Строка ${n}: не больше 5 неверных вариантов`);
    if (new Set([answer, ...wrong]).size !== wrong.length + 1) throw new BadRequestException(`Строка ${n}: варианты ответа повторяются`);
    return { type: 'choice', prompt, answer, options: [answer, ...wrong] };
  });
}
