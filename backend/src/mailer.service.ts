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
  private brevoKey = process.env.BREVO_API_KEY || '';
  readonly enabled: boolean;

  constructor() {
    const host = process.env.SMTP_HOST;
    this.enabled = !!host || !!this.brevoKey;
    if (host) {
      const port = Number(process.env.SMTP_PORT ?? 465);
      this.transport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
    }
  }

  async send(to: string, subject: string, text: string): Promise<boolean> {
    if (this.brevoKey) {
      // Через HTTPS (порт 443): работает там, где хостинг закрыл почтовые порты.
      try {
        const from = process.env.MAIL_FROM || '';
        const m = from.match(/^(.*)<(.+)>$/);
        const sender = m ? { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim() } : { name: 'Моя школа', email: from };
        const r = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': this.brevoKey, 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: text }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text()).slice(0, 300)}`);
        return true;
      } catch (e) {
        this.log.error(`Не удалось отправить письмо на ${to}: ${(e as Error).message}`);
        return false;
      }
    }
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
