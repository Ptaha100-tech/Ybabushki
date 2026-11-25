import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Отправка писем. Настраивается переменными SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.
 * Если SMTP_HOST не задан, письма не уходят, а печатаются в журнал сервера (docker compose logs backend).
 */
@Injectable()
export class MailerService {
  private log = new Logger('Mailer');
  private transport: nodemailer.Transporter | null = null;
  readonly enabled: boolean;

  constructor() {
    const host = process.env.SMTP_HOST;
    this.enabled = !!host;
    if (host) {
      const port = Number(process.env.SMTP_PORT ?? 465);
      this.transport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
    }
  }

  async send(to: string, subject: string, text: string): Promise<boolean> {
    if (!this.transport) {
      this.log.warn(`SMTP не настроен. Письмо для ${to}: «${subject}»\n${text}`);
      return false;
    }
    try {
      await this.transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
      return true;
    } catch (e) {
      this.log.error(`Не удалось отправить письмо на ${to}: ${(e as Error).message}`);
      return false;
    }
  }
}
