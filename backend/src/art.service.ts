import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArtOverride } from './entities';

const KEY_RX = /^(hero:(boy|glasses|pink):[a-z0-9]+|icon:[a-z0-9_]+|scene:[a-z0-9_]+|anim:[a-z0-9_:]+)$/;

/** Картинки, которые администратор поставил вместо встроенных. Хранятся в базе, отдаются всем. */
@Injectable()
export class ArtService {
  constructor(@InjectRepository(ArtOverride) private repo: Repository<ArtOverride>) {}

  async list() {
    const rows = await this.repo.find({ select: ['key', 'version', 'mime'] });
    return rows.map((r) => ({ key: r.key, v: r.version, m: r.mime }));
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

  async remove(key: string) {
    await this.repo.delete({ key });
    return { ok: true };
  }
}
