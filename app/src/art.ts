import { useEffect, useState } from 'react';

/** Картинки, заменённые администратором на сервере. Ключи: hero:<герой>:<поза>, icon:<имя>, scene:<имя>. */
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '/api').replace(/\/$/, '');
let overrides: Record<string, { uri: string; video: boolean }> = {};
const listeners = new Set<() => void>();

export async function loadArt() {
  try {
    const r = await fetch(`${BASE}/art`);
    if (!r.ok) return;
    const list: { key: string; v: string; m?: string }[] = await r.json();
    const next: Record<string, { uri: string; video: boolean }> = {};
    for (const x of list) next[x.key] = { uri: `${BASE}/art/img?key=${encodeURIComponent(x.key)}&v=${x.v}`, video: !!x.m && x.m.startsWith('video/') };
    overrides = next;
    listeners.forEach((f) => f());
  } catch {
    /* нет сети — остаются встроенные картинки */
  }
}

export const overriddenKeys = () => Object.keys(overrides);

/** Картинка по ключу: заменённая на сервере или встроенная. */
export function artSrc(key: string, fallback: any): any {
  const o = overrides[key];
  return o && !o.video ? { uri: o.uri } : fallback;
}

/** Адрес видео-ролика для «живого» места (или undefined, если ролика нет). */
export function animUri(key: string): string | undefined {
  const o = overrides[key];
  return o && o.video ? o.uri : undefined;
}

/** Перерисовка компонента, когда картинки загрузились. */
export function useArtTick() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  }, []);
}

/** Адрес загруженной картинки-фона (слот bg:*). */
export function bgUri(key: string): string | undefined {
  return overrides[key]?.uri;
}
