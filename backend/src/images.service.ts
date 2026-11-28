import { BadRequestException, Injectable, Logger } from '@nestjs/common';

const BASE = 'https://api.aitunnel.ru';
const FALLBACK_MODELS = [
  { id: 'gemini-nano-banana-2.1', name: 'Nano Banana 2.1 (Google)' },
  { id: 'seedream-4.5', name: 'Seedream 4.5' },
  { id: 'seedream-5-0-flash', name: 'Seedream 5 Flash' },
  { id: 'gpt-image-1', name: 'GPT Image 1' },
];

export interface GenInput {
  prompt: string;
  model: string;
  aspectRatio?: string;
  background?: string;
  n?: number;
  refs?: string[];
}

/** Генерация картинок через AITunnel (доступно только администратору). */
@Injectable()
export class ImagesService {
  private log = new Logger('Images');
  private key = () => process.env.AITUNNEL_API_KEY || '';

  status() {
    return { configured: !!this.key() };
  }

  async models() {
    try {
      const r = await fetch(`${BASE}/public/aitunnel/models/images`, { signal: AbortSignal.timeout(10_000) });
      const j: any = await r.json();
      const list: any[] = Array.isArray(j) ? j : j.data ?? j.models ?? [];
      const out = list
        .map((m) => ({ id: String(m.id ?? m.model ?? ''), name: String(m.name ?? m.title ?? m.id ?? '') }))
        .filter((m) => m.id);
      if (out.length) return out.slice(0, 80);
    } catch {
      /* возьмём запасной список */
    }
    return FALLBACK_MODELS;
  }

  async generate(d: GenInput) {
    if (!this.key()) throw new BadRequestException('Ключ AITunnel не настроен на сервере (bash scripts/set-aitunnel.sh)');
    const body: Record<string, unknown> = { model: d.model, prompt: d.prompt, n: Math.min(Math.max(d.n ?? 1, 1), 4) };
    if (d.aspectRatio) body.aspect_ratio = d.aspectRatio;
    if (d.background && d.background !== 'auto') body.background = d.background;
    if (d.refs?.length) body.input_references = d.refs.map((url) => ({ type: 'image_url', image_url: { url } }));

    const call = async (b: Record<string, unknown>) =>
      fetch(`${BASE}/v1/images/generations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.key()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(b),
        signal: AbortSignal.timeout(170_000),
      });

    let res = await call(body);
    // Некоторые модели не принимают отдельные параметры (прозрачный фон, пропорции) — повторяем без них.
    if (res.status === 400 && (body.background || body.aspect_ratio)) {
      const text = await res.text();
      this.log.warn(`400 от AITunnel, повтор без доп. параметров: ${text.slice(0, 200)}`);
      delete body.background;
      delete body.aspect_ratio;
      res = await call(body);
    }
    const text = await res.text();
    let j: any;
    try {
      j = JSON.parse(text);
    } catch {
      throw new BadRequestException(`Ответ сервиса картинок: ${text.slice(0, 200)}`);
    }
    if (!res.ok) {
      const msg = j?.error?.message ?? j?.message ?? j?.detail ?? text.slice(0, 200);
      this.log.error(`Ошибка генерации: ${res.status} ${msg}`);
      throw new BadRequestException(`Сервис картинок: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    }
    const images = (j.data ?? []).map((x: any) => ({ b64: x.b64_json as string, mediaType: (x.media_type as string) || 'image/png' })).filter((x: any) => x.b64);
    if (!images.length) throw new BadRequestException('Сервис не вернул картинку. Попробуйте другое описание или модель.');
    return { images, cost: j.usage?.cost_rub ?? null, balance: j.usage?.balance ?? null };
  }
}
