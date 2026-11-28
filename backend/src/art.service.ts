import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArtOverride } from './entities';

const KEY_RX = /^(hero:(boy|glasses|pink):[a-z0-9]+|icon:[a-z0-9_]+|scene:[a-z0-9_]+|anim:[a-z0-9_:]+|bg:[a-z0-9_]+)$/;

/** Картинки, которые администратор поставил вместо встроенных. Хранятся в базе, отдаются всем. */
@Injectable()
export class ArtService {
  constructor(@InjectRepository(ArtOverride) private repo: Repository<ArtOverride>) {}

  async list() {
    const rows = await this.repo.find({ select: ['key', 'version', 'mime'] });
    return rows.filter((r) => !r.key.startsWith('cfg:')).map((r) => ({ key: r.key, v: r.version, m: r.mime }));
  }

  async get(key: string) {
    return this.repo.findOne({ where: { key } });
  }

  async set(key: string, dataUri: string) {
    if (!KEY_RX.test(key)) throw new BadRequestException('Неизвестное место для картинки');
    const m = dataUri.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new BadRequestException('Нужна картинка PNG, JPEG или WEBP');
    const data = Buffer.from(m[2], 'base64');
    if (data.length > 4_000_000) throw new BadRequestException('Картинка слишком большая (больше 4 МБ)');
    await this.repo.save({ key, data, mime: m[1], version: String(Date.now()) });
    return { ok: true };
  }

  async setVideo(key: string, data: Buffer) {
    if (!/^anim:[a-z0-9_:]+$/.test(key)) throw new BadRequestException('Видео можно ставить только на «живые» места');
    await this.repo.save({ key, data, mime: 'video/mp4', version: String(Date.now()) });
    return { ok: true };
  }

  /** Оформление сайта (цвета, шрифт, кнопки…) — один JSON под ключом cfg:theme. */
  async getTheme(): Promise<Record<string, unknown>> {
    const r = await this.repo.findOne({ where: { key: 'cfg:theme' } });
    try {
      return r ? JSON.parse(r.data.toString('utf8')) : {};
    } catch {
      return {};
    }
  }

  async setTheme(raw: Record<string, unknown>) {
    const hex = /^#[0-9a-fA-F]{6}$/;
    const out: Record<string, unknown> = {};
    for (const k of ['bg', 'card', 'primary', 'primaryDark', 'primarySoft', 'cta', 'text', 'muted', 'good', 'bad', 'border', 'bg2', 'btnText']) {
      if (raw[k] === undefined) continue;
      if (typeof raw[k] !== 'string' || !hex.test(raw[k] as string)) throw new BadRequestException(`Цвет «${k}» должен быть вида #RRGGBB`);
      out[k] = raw[k];
    }
    const num = (k: string, min: number, max: number) => {
      if (raw[k] === undefined) return;
      const n = Number(raw[k]);
      if (!Number.isFinite(n)) throw new BadRequestException(`Некорректное число «${k}»`);
      out[k] = Math.min(max, Math.max(min, n));
    };
    num('bgAngle', 0, 360); num('btnRadius', 0, 40); num('btnPadY', 6, 26); num('btnFont', 12, 24);
    num('cardRadius', 0, 44); num('cardBorder', 0, 6); num('cardPad', 8, 32); num('chipRadius', 0, 999);
    num('uiZoom', 0.8, 1.3); num('titleWeight', 400, 900);
    for (const k of ['btnShadow', 'cardShadow']) if (raw[k] !== undefined) out[k] = !!raw[k];
    if (raw.bgMode !== undefined) {
      if (!['color', 'gradient', 'image'].includes(raw.bgMode as string)) throw new BadRequestException('Неизвестный вид фона');
      out.bgMode = raw.bgMode;
    }
    if (raw.font !== undefined) {
      if (typeof raw.font !== 'string' || !/^[A-Za-zА-Яа-я0-9 ]{0,30}$/.test(raw.font)) throw new BadRequestException('Неизвестный шрифт');
      out.font = raw.font;
    }
    await this.repo.save({ key: 'cfg:theme', data: Buffer.from(JSON.stringify(out)), mime: 'application/json', version: String(Date.now()) });
    return { ok: true };
  }

  async remove(key: string) {
    await this.repo.delete({ key });
    return { ok: true };
  }
}
