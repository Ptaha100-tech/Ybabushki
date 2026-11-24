/** Простое ограничение частоты запросов в памяти (на один сервер): защита входа от перебора паролей. */
export function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, 60_000).unref();
  return (req: any, res: any, next: () => void) => {
    const fwd = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
    const key = fwd || req.ip || 'unknown';
    const now = Date.now();
    const cur = hits.get(key);
    if (!cur || cur.reset < now) {
      hits.set(key, { n: 1, reset: now + windowMs });
      return next();
    }
    cur.n += 1;
    if (cur.n > max) {
      res.status(429).json({ statusCode: 429, message: 'Слишком много попыток. Подождите минуту и попробуйте снова.' });
      return;
    }
    next();
  };
}
