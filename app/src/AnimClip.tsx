import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { animUri, useArtTick } from './art';

/**
 * «Живой» ролик из админки. На сайте ролик играет на холсте, зелёный фон вырезается (получается прозрачный персонаж).
 * Если ролика нет (или это приложение для телефона) — показывается запасной вариант (обычная картинка).
 */
export function AnimClip({
  slot, size, loop = true, onEnd, fallback, chroma = true,
}: { slot: string; size: number; loop?: boolean; onEnd?: () => void; fallback?: React.ReactNode; chroma?: boolean }) {
  useArtTick();
  const uri = Platform.OS === 'web' ? animUri(slot) : undefined;
  if (!uri) return <>{fallback ?? null}</>;
  return <WebClip uri={uri} size={size} loop={loop} onEnd={onEnd} chroma={chroma} />;
}

function WebClip({ uri, size, loop, onEnd, chroma }: { uri: string; size: number; loop: boolean; onEnd?: () => void; chroma: boolean }) {
  const ref = useRef<any>(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    let dead = false;
    let raf = 0;
    let url = '';
    const v = document.createElement('video');
    v.muted = true;
    v.loop = loop;
    v.setAttribute('playsinline', '');
    v.onended = () => endRef.current?.();
    fetch(uri)
      .then((r) => r.blob())
      .then((b) => {
        if (dead) return;
        url = URL.createObjectURL(b);
        v.src = url;
        v.play().catch(() => undefined);
      })
      .catch(() => undefined);

    const draw = () => {
      const c: HTMLCanvasElement | null = ref.current;
      if (c && v.videoWidth) {
        const k = Math.min(1, 420 / Math.max(v.videoWidth, v.videoHeight));
        const w = Math.round(v.videoWidth * k);
        const h = Math.round(v.videoHeight * k);
        if (c.width !== w) c.width = w;
        if (c.height !== h) c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, 0, 0, w, h);
          if (chroma) {
            const img = ctx.getImageData(0, 0, w, h);
            const d = img.data;
            for (let i = 0; i < d.length; i += 4) {
              const r = d[i], g = d[i + 1], b = d[i + 2];
              const over = g - Math.max(r, b);
              if (g > 90 && over > 40) d[i + 3] = 0;
              else if (g > 90 && over > 15) {
                d[i + 3] = 255 - Math.round(((over - 15) / 25) * 255);
                d[i + 1] = Math.max(r, b); // убираем зелёный ободок
              }
            }
            ctx.putImageData(img, 0, 0);
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      v.pause();
      v.removeAttribute('src');
      if (url) URL.revokeObjectURL(url);
    };
  }, [uri, loop, chroma]);

  return <View style={{ width: size, height: size }}>{React.createElement('canvas', { ref, style: { width: size, height: size, objectFit: 'contain' } })}</View>;
}
