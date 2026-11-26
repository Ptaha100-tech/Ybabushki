import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Отправка писем. Настраивается переменными SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.
 * Если SMTP_HOST не задан, письма не уходят, а печатаются в журнал сервера (docker compose logs backend).
 */
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Красивое HTML-оформление письма: шапка с логотипом, текст, подвал. Менять внешний вид можно здесь. */
export function mailHtml(text: string): string {
  const site = process.env.PUBLIC_URL || 'https://my-school-51.ru';
  const body = esc(text)
    .split('\n')
    .map((l) => (l.trim() ? `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#2b3a4a">${l.replace(/\b(\d{6})\b/g, '<span style="display:inline-block;font-size:32px;font-weight:800;letter-spacing:6px;color:#1e90d6;background:#e8f4fd;border-radius:12px;padding:8px 16px">$1</span>')}</p>` : ''))
    .join('');
  return `<!doctype html><html><body style="margin:0;background:#f2f7fd;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<div style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid #dbe8f5">
<div style="background:#33a0dc;padding:18px 24px;color:#fff;font-size:22px;font-weight:800">
<img src="${site}/icon-192.png" width="40" height="40" alt="" style="vertical-align:middle;border-radius:10px;margin-right:10px">Моя школа</div>
<div style="padding:24px">${body}</div>
<div style="padding:14px 24px;background:#f7fafd;color:#8795a5;font-size:12px">Это автоматическое письмо, отвечать на него не нужно. <a href="${site}" style="color:#33a0dc">my-school-51.ru</a></div>
</div></div></body></html>`;
}

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
          body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: text, htmlContent: mailHtml(text) }),
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
      await this.transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html: mailHtml(text) });
      return true;
    } catch (e) {
      this.log.error(`Не удалось отправить письмо на ${to}: ${(e as Error).message}`);
      return false;
    }
  }
}
