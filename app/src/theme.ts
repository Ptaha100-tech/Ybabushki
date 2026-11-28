import { Platform } from 'react-native';

/** Оформление сайта: меняется в админке («🖌 Дизайн»), хранится на сервере. Здесь — значения по умолчанию и применение. */
export interface Theme {
  // цвета
  bg: string; card: string; primary: string; primaryDark: string; primarySoft: string; cta: string;
  text: string; muted: string; good: string; bad: string; border: string; btnText: string;
  // фон сайта
  bgMode: 'color' | 'gradient' | 'image'; bg2: string; bgAngle: number;
  // кнопки
  btnRadius: number; btnPadY: number; btnFont: number; btnShadow: boolean;
  // окна (карточки)
  cardRadius: number; cardBorder: number; cardShadow: boolean; cardPad: number;
  // «таблетки» (чипы)
  chipRadius: number;
  // шрифт
  font: string; uiZoom: number; titleWeight: number;
}

export const DEFAULT_THEME: Theme = {
  bg: '#F3F9FE', card: '#FFFFFF', primary: '#339DDA', primaryDark: '#2480B8', primarySoft: '#E6F3FD', cta: '#FD7124',
  text: '#242424', muted: '#5F6B76', good: '#16A34A', bad: '#DC2626', border: '#D6E7F5', btnText: '#FFFFFF',
  bgMode: 'color', bg2: '#DFF0FF', bgAngle: 160,
  btnRadius: 16, btnPadY: 14, btnFont: 16, btnShadow: false,
  cardRadius: 22, cardBorder: 1, cardShadow: false, cardPad: 18,
  chipRadius: 999,
  font: '', uiZoom: 1, titleWeight: 800,
};

/** Шрифты Google Fonts с кириллицей (имя → какие начертания подключать). */
export const FONTS: Record<string, string> = {
  Nunito: 'wght@400;600;700;800;900',
  Comfortaa: 'wght@400;600;700',
  Montserrat: 'wght@400;600;700;800',
  Rubik: 'wght@400;500;700;800',
  Manrope: 'wght@400;600;700;800',
  'PT Sans': 'wght@400;700',
  Ubuntu: 'wght@400;500;700',
  Neucha: '',
  Caveat: 'wght@400;700',
  'Marck Script': '',
  Pacifico: '',
};

export const PRESETS: { name: string; theme: Partial<Theme> }[] = [
  { name: '☀️ По умолчанию', theme: DEFAULT_THEME },
  { name: '🍭 Конфетная', theme: { bg: '#FFF1F7', card: '#FFFFFF', primary: '#E64980', primaryDark: '#C2255C', primarySoft: '#FFDEEB', cta: '#7950F2', border: '#FFC9DE', bgMode: 'gradient', bg2: '#E5DBFF', bgAngle: 150, btnRadius: 30, cardRadius: 30, font: 'Comfortaa', chipRadius: 999, btnShadow: true, cardShadow: true } },
  { name: '🌲 Лес', theme: { bg: '#F1F8EC', card: '#FFFFFF', primary: '#2F9E44', primaryDark: '#237032', primarySoft: '#DCF2D3', cta: '#F08C00', border: '#CFE5C4', bgMode: 'gradient', bg2: '#E3F3D6', bgAngle: 170, font: 'Nunito', cardRadius: 20 } },
  { name: '🌙 Ночь', theme: { bg: '#141B2D', card: '#1F2A44', primary: '#5C9DFF', primaryDark: '#9EC5FF', primarySoft: '#2A3858', cta: '#FFB000', text: '#EEF2FF', muted: '#A9B4D0', border: '#33425F', good: '#4ADE80', bad: '#F87171', btnText: '#141B2D', bgMode: 'gradient', bg2: '#0B1020', bgAngle: 180, font: 'Manrope', cardShadow: true } },
  { name: '🚀 Космос', theme: { bg: '#1B1040', card: '#2A1B5E', primary: '#9775FA', primaryDark: '#D0BFFF', primarySoft: '#3B2A7A', cta: '#FF6B6B', text: '#F3EEFF', muted: '#C5B8F0', border: '#4B3A8F', good: '#69DB7C', bad: '#FF8787', btnText: '#1B1040', bgMode: 'gradient', bg2: '#0B0620', bgAngle: 160, font: 'Rubik', btnRadius: 24, cardRadius: 26, cardShadow: true } },
  { name: '🧸 Мягкая', theme: { bg: '#FFF8E7', card: '#FFFFFF', primary: '#F59F00', primaryDark: '#B87400', primarySoft: '#FFE8A3', cta: '#E8590C', border: '#F3DFA2', font: 'Neucha', btnFont: 18, btnRadius: 26, cardRadius: 28, cardBorder: 2 } },
];

/** Текущие цвета — изменяются при применении темы (читаются из разных экранов). */
export const colors = {
  bg: DEFAULT_THEME.bg, card: DEFAULT_THEME.card, primary: DEFAULT_THEME.primary, primaryDark: DEFAULT_THEME.primaryDark,
  primarySoft: DEFAULT_THEME.primarySoft, cta: DEFAULT_THEME.cta, dark: '#242424', text: DEFAULT_THEME.text, muted: DEFAULT_THEME.muted,
  good: DEFAULT_THEME.good, goodBg: '#DCFCE7', bad: DEFAULT_THEME.bad, badBg: '#FEE2E2', border: DEFAULT_THEME.border, accent: DEFAULT_THEME.cta,
};
/** Текущие размеры, скругления и т. п. */
export const T: Theme = { ...DEFAULT_THEME };

const isWeb = Platform.OS === 'web';
const CACHE = 'theme_v1';
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '/api').replace(/\/$/, '');

export function applyTheme(t: Partial<Theme>) {
  Object.assign(T, DEFAULT_THEME, t);
  Object.assign(colors, {
    bg: T.bg, card: T.card, primary: T.primary, primaryDark: T.primaryDark, primarySoft: T.primarySoft, cta: T.cta, accent: T.cta,
    text: T.text, muted: T.muted, good: T.good, bad: T.bad, border: T.border,
    // тёмные темы: плашки «верно/неверно» тоже темнее
    goodBg: lum(T.card) < 0.3 ? '#14532D' : '#DCFCE7', badBg: lum(T.card) < 0.3 ? '#7F1D1D' : '#FEE2E2',
  });
  if (isWeb && T.bgMode !== 'color') colors.bg = 'transparent';
  if (isWeb) applyDom();
}

function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

let bgImage = '';
/** Адрес картинки фона (слот bg:site), если она загружена. */
export function setBgImage(uri: string) {
  bgImage = uri;
  if (isWeb) applyDom();
}

/** Подключает шрифт Google Fonts (только на сайте). */
export function ensureFont(name: string) {
  if (typeof document === 'undefined' || FONTS[name] === undefined) return;
  const id = 'font-' + name.replace(/ /g, '_');
  if (document.getElementById(id)) return;
  const l = document.createElement('link');
  l.id = id;
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}${FONTS[name] ? ':' + FONTS[name] : ''}&display=swap`;
  document.head.appendChild(l);
}

/** Запоминает тему как уже применённую (после сохранения в админке — перед перезагрузкой страницы). */
export function saveThemeCache(t: unknown) {
  try {
    localStorage.setItem(CACHE, JSON.stringify(t));
  } catch {
    /* ничего */
  }
}

function applyDom() {
  if (typeof document === 'undefined') return;
  let el = document.getElementById('theme-css') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'theme-css';
    document.head.appendChild(el);
  }
  let bg = T.bg;
  if (T.bgMode === 'gradient') bg = `linear-gradient(${T.bgAngle}deg, ${T.bg}, ${T.bg2})`;
  if (T.bgMode === 'image' && bgImage) bg = `${T.bg} url("${bgImage}") center / cover fixed no-repeat`;
  let css = `html,body{background:${bg} !important;min-height:100%}`;
  if (T.bgMode === 'gradient') css += 'html,body{background-attachment:fixed !important}';
  if (T.font && FONTS[T.font] !== undefined) {
    ensureFont(T.font);
    css += `#root, #root *{font-family:"${T.font}",system-ui,-apple-system,"Segoe UI",sans-serif !important}`;
  }
  if (T.uiZoom !== 1) css += `body{zoom:${T.uiZoom}}`;
  el.textContent = css;
}

// Сразу при запуске применяем сохранённую тему (на сайте — синхронно, чтобы не мигало).
try {
  if (isWeb && typeof localStorage !== 'undefined') {
    const c = localStorage.getItem(CACHE);
    if (c) applyTheme(JSON.parse(c));
  }
} catch {
  /* нет доступа к хранилищу — остаётся стандартное оформление */
}

/** Запрашивает тему с сервера. Если она изменилась — на сайте один раз перезагружает страницу, чтобы всё перерисовалось. */
export async function loadTheme(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/art/theme`);
    if (!r.ok) return false;
    const t = await r.json();
    const next = JSON.stringify(t && Object.keys(t).length ? t : {});
    if (isWeb) {
      const prev = localStorage.getItem(CACHE) ?? '{}';
      if (prev !== next) {
        localStorage.setItem(CACHE, next);
        if (sessionStorage.getItem('theme_reload') !== next) {
          sessionStorage.setItem('theme_reload', next);
          location.reload();
          return true;
        }
      }
    } else if (Object.keys(t).length) {
      applyTheme(t);
      return true;
    }
  } catch {
    /* нет сети — остаётся то, что было */
  }
  return false;
}
