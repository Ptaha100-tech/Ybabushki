import { Controller, Get, NotFoundException, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ArtService } from './art.service';

/** Публичная отдача картинок, заменённых в админ-панели. */
@Controller('art')
export class ArtController {
  constructor(private art: ArtService) {}

  @Get() list() {
    return this.art.list();
  }

  @Get('img') async img(@Query('key') key: string, @Res() res: Response) {
    const a = await this.art.get(key);
    if (!a) throw new NotFoundException();
    res.set({ 'Content-Type': a.mime, 'Cache-Control': 'public, max-age=31536000, immutable' }).send(a.data);
  }
}
