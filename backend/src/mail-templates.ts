/**
 * Оформление писем «Моя школа». Здесь можно менять тексты, цвета и картинки.
 * Картинки лежат в app/public/mail и доступны по адресу https://my-school-51.ru/mail/…
 */
const SITE = () => process.env.PUBLIC_URL || 'https://my-school-51.ru';
export const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface Layout {
  preheader: string; // короткая строка, которую видно в списке писем
  hero: string; // имя картинки героя без .png
  title: string;
  lead: string; // HTML-абзац под заголовком
  code?: string;
  codeNote?: string;
  body?: string; // дополнительный HTML
  button?: { text: string; url: string };
  footNote?: string;
}

export function layout(o: Layout): string {
  const site = SITE();
  const code = o.code
    ? `<div style="text-align:center;margin:26px 0 8px"><div style="display:inline-block;background:linear-gradient(135deg,#eaf6ff,#fff4e6);border:2px dashed #33a0dc;border-radius:20px;padding:18px 28px">
<div style="font-size:13px;color:#6b7c8e;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">Ваш код</div>
<div style="font-size:44px;font-weight:800;letter-spacing:12px;color:#1478b8;font-family:'Courier New',monospace;padding-left:12px">${esc(o.code)}</div></div>
${o.codeNote ? `<div style="font-size:13px;color:#8795a5;margin-top:10px">${o.codeNote}</div>` : ''}</div>`
    : '';
  const button = o.button
    ? `<div style="text-align:center;margin:26px 0 6px"><a href="${o.button.url}" style="display:inline-block;background:#ff8a4c;color:#fff;text-decoration:none;font-weight:800;font-size:17px;padding:15px 34px;border-radius:16px;box-shadow:0 6px 0 #e06a2c">${o.button.text}</a></div>`
    : '';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e9f2fb;font-family:'Segoe UI',Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9f2fb"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td align="center" style="padding:0 0 14px">
<img src="${site}/icon-192.png" width="44" height="44" alt="" style="vertical-align:middle;border-radius:12px">
<span style="font-size:24px;font-weight:800;color:#1478b8;vertical-align:middle;margin-left:8px">Моя школа</span></td></tr>
<tr><td style="background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 10px 30px rgba(20,120,184,.15)">
<div style="background:linear-gradient(135deg,#33a0dc 0%,#5fc0f0 60%,#ffd27a 130%);padding:30px 24px 0;text-align:center">
<div style="font-size:26px;line-height:1.25;font-weight:800;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.12)">${o.title}</div>
<img src="${site}/mail/${o.hero}.png" width="190" alt="" style="display:block;margin:14px auto 0"></div>
<div style="padding:28px 30px 30px;color:#2b3a4a;font-size:16px;line-height:1.6">
<div>${o.lead}</div>${code}${o.body ?? ''}${button}
${o.footNote ? `<div style="margin-top:22px;padding:14px 16px;background:#fff8ec;border-radius:14px;color:#8a6a2f;font-size:13px;line-height:1.5">${o.footNote}</div>` : ''}
</div></td></tr>
<tr><td align="center" style="padding:20px 10px 0;color:#7d8fa3;font-size:12px;line-height:1.6">
Учиться интересно ✨ Задания, игры и награды для 1–11 классов<br>
<a href="${site}" style="color:#1478b8;text-decoration:none;font-weight:700">my-school-51.ru</a> · Это автоматическое письмо, отвечать на него не нужно
</td></tr></table></td></tr></table></body></html>`;
}

export function resetMail(name: string, code: string) {
  return {
    subject: `🔑 Код для смены пароля: ${code}`,
    text: `Здравствуйте, ${name}! Код для смены пароля: ${code}. Он действует 30 минут. Если вы не просили сброс, просто проигнорируйте письмо.`,
    html: layout({
      preheader: `Ваш код: ${code}. Действует 30 минут.`,
      hero: 'glasses-idea',
      title: 'Забыли пароль? Ничего страшного!',
      lead: `Привет, <b>${esc(name)}</b>! 👋<br>Мы получили просьбу сменить пароль в «Моей школе». Введите этот код на сайте или в приложении, придумайте новый пароль — и снова в бой за знаниями!`,
      code,
      codeNote: '⏱ Код действует 30 минут',
      body: `<div style="margin-top:22px;font-size:14px;color:#52677d"><b>Как это сделать:</b><br>1️⃣ Вернитесь на страницу «Восстановление пароля»<br>2️⃣ Введите код из письма<br>3️⃣ Придумайте новый пароль и нажмите «Сменить пароль и войти»</div>`,
      footNote: '🛡 Если вы не просили сменить пароль — просто проигнорируйте это письмо, ваш аккаунт в безопасности.',
    }),
  };
}

export function verifyMail(name: string, code: string) {
  return {
    subject: `✅ Подтвердите почту — код ${code}`,
    text: `Здравствуйте, ${name}! Код подтверждения почты: ${code}. Он действует 30 минут.`,
    html: layout({
      preheader: `Код подтверждения: ${code}`,
      hero: 'boy-wave',
      title: 'Добро пожаловать в «Мою школу»! 🎉',
      lead: `Привет, <b>${esc(name)}</b>!<br>Остался один маленький шаг — подтвердить почту. Так мы сможем помочь вам восстановить пароль и присылать приятные новости об успехах.`,
      code,
      codeNote: '⏱ Код действует 30 минут',
      body: `<div style="margin-top:22px;font-size:14px;color:#52677d"><b>Что вас ждёт:</b><br>📚 Сотни тем по всем школьным предметам<br>🎮 Игры и ежедневные задания с наградами<br>🏆 Рейтинг класса и коллекция рамок и титулов</div>`,
      footNote: 'Если вы не регистрировались в «Моей школе», просто проигнорируйте это письмо.',
    }),
  };
}

export interface ChildReport {
  name: string;
  grade: number | null;
  n: number;
  c: number;
  streak: number;
  xp: number;
  weak: string[];
}

export function reportMail(parent: string, kids: ChildReport[]) {
  const cards = kids
    .map((k) => {
      const pct = k.n ? Math.round((k.c / k.n) * 100) : 0;
      const tip = k.n === 0 ? '😴 На этой неделе занятий не было — самое время мягко напомнить!' : k.weak.length ? `📌 Стоит повторить: <b>${k.weak.map(esc).join('; ')}</b>` : '🌟 Слабых тем не видно — отличная работа!';
      const stat = (v: string, l: string, bg: string) => `<td align="center" style="background:${bg};border-radius:14px;padding:12px 6px;width:33%"><div style="font-size:24px;font-weight:800;color:#1478b8">${v}</div><div style="font-size:12px;color:#6b7c8e">${l}</div></td>`;
      return `<div style="margin-top:20px;border:2px solid #e1edf8;border-radius:20px;padding:16px">
<div style="font-size:19px;font-weight:800;color:#2b3a4a">🎒 ${esc(k.name)}${k.grade ? ` <span style="font-size:13px;color:#8795a5;font-weight:600">· ${k.grade} класс</span>` : ''}</div>
<table role="presentation" width="100%" cellspacing="6" style="margin-top:10px"><tr>${stat(String(k.n), 'заданий', '#eaf6ff')}${stat(k.n ? pct + '%' : '—', 'верно', '#eafbea')}${stat(String(k.streak), 'дней подряд', '#fff4e6')}</tr></table>
${k.n ? `<div style="height:10px;background:#e8eef5;border-radius:6px;margin:10px 0"><div style="height:10px;width:${pct}%;background:linear-gradient(90deg,#33a0dc,#6fd08c);border-radius:6px"></div></div>` : ''}
<div style="font-size:14px;color:#52677d;margin-top:8px">${tip}</div>
<div style="font-size:12px;color:#8795a5;margin-top:6px">Всего опыта: ${k.xp} XP</div></div>`;
    })
    .join('');
  const text = `Здравствуйте, ${parent}! Итоги недели:\n` + kids.map((k) => `${k.name}: заданий ${k.n}, верных ${k.c}, дней подряд ${k.streak}`).join('\n');
  return {
    subject: '📊 Итоги недели вашего ученика — Моя школа',
    text,
    html: layout({
      preheader: 'Сколько заданий решено, какие успехи и что повторить',
      hero: 'boy-thumbs',
      title: 'Итоги недели 🏆',
      lead: `Здравствуйте, <b>${esc(parent)}</b>!<br>Вот как прошла неделя у ваших учеников в «Моей школе»:`,
      body: cards,
      button: { text: 'Открыть кабинет родителя', url: SITE() },
      footNote: 'Не хотите получать такие письма? Отключить их можно в кабинете родителя.',
    }),
  };
}

/** Запасное оформление для любого другого текста. */
export function plainMail(text: string): string {
  return layout({
    preheader: text.slice(0, 80),
    hero: 'pink-wave',
    title: 'Моя школа',
    lead: esc(text).replace(/\n/g, '<br>'),
  });
}
