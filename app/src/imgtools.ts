/** Инструменты для картинок в браузере (используются в админ-панели). Работают только на веб-версии. */
import { Image } from 'react-native';

export const isWebEnv = typeof document !== 'undefined';

/** Загружает картинку (адрес или data-URI) в элемент Image. */
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new (window as any).Image() as HTMLImageElement;
    im.crossOrigin = 'anonymous';
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('Не удалось открыть картинку'));
    im.src = src;
  });
}

/** Любой источник → PNG data-URI, не больше maxSide по длинной стороне (для референсов). */
export async function toPngDataUri(src: string, maxSide = 768): Promise<string> {
  const im = await loadImg(src);
  const k = Math.min(1, maxSide / Math.max(im.width, im.height));
  const c = document.createElement('canvas');
  c.width = Math.round(im.width * k);
  c.height = Math.round(im.height * k);
  c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

/** Ресурс приложения (require) → data-URI. */
export const assetToDataUri = (asset: any, maxSide = 768) => toPngDataUri(Image.resolveAssetSource(asset).uri, maxSide);

/** Выбор файла с устройства → data-URI. */
export function pickImageFile(): Promise<string | null> {
  return new Promise((res) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = () => {
      const f = inp.files?.[0];
      if (!f) return res(null);
      const r = new FileReader();
      r.onload = () => toPngDataUri(String(r.result)).then(res, () => res(null));
      r.readAsDataURL(f);
    };
    inp.click();
  });
}

/**
 * Вырезание однотонного фона: заливка от краёв цветом углов с допуском tol.
 * Хорошо работает на картинках с ровным (например, ярко-зелёным) фоном.
 */
export async function removeBackground(src: string, tol = 60): Promise<string> {
  const im = await loadImg(src);
  const c = document.createElement('canvas');
  c.width = im.width;
  c.height = im.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(im, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const px = d.data;
  const W = c.width;
  const H = c.height;
  const at = (x: number, y: number) => (y * W + x) * 4;
  // цвет фона — среднее по четырём углам
  const corners = [at(1, 1), at(W - 2, 1), at(1, H - 2), at(W - 2, H - 2)];
  const bg = [0, 1, 2].map((k) => corners.reduce((s, i) => s + px[i + k], 0) / 4);
  const near = (i: number) => Math.hypot(px[i] - bg[0], px[i + 1] - bg[1], px[i + 2] - bg[2]) <= tol;
  const seen = new Uint8Array(W * H);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const k = y * W + x;
    if (seen[k] || !near(k * 4)) return;
    seen[k] = 1;
    stack.push(k);
  };
  for (let x = 0; x < W; x++) {
    push(x, 0);
    push(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    push(0, y);
    push(W - 1, y);
  }
  while (stack.length) {
    const k = stack.pop()!;
    const x = k % W;
    const y = (k - x) / W;
    px[k * 4 + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  // мягкий край: пиксели, соседние с прозрачными и похожие на фон, делаем полупрозрачными
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const k = y * W + x;
      if (px[k * 4 + 3] === 0) continue;
      if (px[(k - 1) * 4 + 3] === 0 || px[(k + 1) * 4 + 3] === 0 || px[(k - W) * 4 + 3] === 0 || px[(k + W) * 4 + 3] === 0) {
        const dist = Math.hypot(px[k * 4] - bg[0], px[k * 4 + 1] - bg[1], px[k * 4 + 2] - bg[2]);
        if (dist < tol * 1.6) px[k * 4 + 3] = Math.round(255 * Math.max(0, (dist - tol) / (tol * 0.6)));
      }
    }
  }
  ctx.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}

/** Скачивание картинки как файла. */
export function downloadDataUri(uri: string, name: string) {
  const a = document.createElement('a');
  a.href = uri;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
