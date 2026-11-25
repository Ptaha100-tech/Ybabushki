import React from 'react';
import { Image, ImageStyle, StyleProp, Text, TextStyle } from 'react-native';
import { HeroKey, heroImg, ICONS, Pose, SCENES } from './heroes';

/** Персонаж в нужной позе. Размер — высота в пикселях. */
export function HeroPic({ hero, pose, size, style }: { hero: HeroKey; pose: Pose; size: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={heroImg(hero, pose)} resizeMode="contain" style={[{ width: size * 0.9, height: size }, style]} />;
}

/** Значок из набора иллюстраций. */
export function Icon({ name, size = 40, style }: { name: keyof typeof ICONS; size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={ICONS[name]} resizeMode="contain" style={[{ width: size, height: size }, style]} />;
}

/** Групповая сцена (иллюстрация с тремя героями). */
export function Scene({ name, width, ratio, style }: { name: keyof typeof SCENES; width: number; ratio: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={SCENES[name]} resizeMode="contain" style={[{ width, height: width / ratio }, style]} />;
}

/** Эмодзи → наша картинка. Всё, чего здесь нет, остаётся обычным эмодзи. */
const EMOJI: Record<string, keyof typeof ICONS> = {
  '📚': 'n_learn', '🎮': 'n_games', '🏆': 'n_rating', '👤': 'n_profile',
  '⭐': 'n_xp', '🌟': 'n_xp', '🔥': 'n_fire', '☄': 'n_fire', '✅': 'n_ok',
  '🥇': 'n_ribbon', '🥈': 'n_medals', '🥉': 'n_medals', '🏅': 'n_badges', '🌱': 'n_sprout',
  '🎉': 'n_party', '💡': 'n_bulb', '⚡': 'n_clock', '❓': 'n_card',
  '📘': 'n_prog', '🎯': 'n_vpr', '🎓': 'n_oge', '🏁': 'n_ege',
  '🧭': 'n_explorer', '👨‍🏫': 'n_t_m', '👩‍🏫': 'n_t_f', '🧔': 'n_p_m', '👩': 'n_p_f', '📱': 'n_app', '📌': 'n_hw', '♾': 'n_unl', '👦': 'n_g_m', '👧': 'n_g_f',
  '🔢': 'n_math', '📝': 'n_rus', '📖': 'n_lit', '🌳': 'n_okr', '🧬': 'n_bio', '🌍': 'n_geo', '🧪': 'n_chem', '🏛': 'n_hist', '💻': 'n_inf',
};
const SUBJECT_ICON: Record<string, keyof typeof ICONS> = {
  Математика: 'n_math', 'Русский язык': 'n_rus', Литература: 'n_lit', 'Окружающий мир': 'n_okr', Биология: 'n_bio',
  'Английский язык': 'n_eng', География: 'n_geo', Физика: 'n_phys', Химия: 'n_chem', История: 'n_hist', Информатика: 'n_inf',
};

/** Значок предмета по его названию (для английского значка пока нет — тогда эмодзи). */
export function SubjectIcon({ title, fallback, size = 36 }: { title?: string; fallback?: string; size?: number }) {
  const k = title ? SUBJECT_ICON[title] : undefined;
  if (k) return <Icon name={k} size={size} />;
  return <Text style={{ fontSize: size * 0.8 }}>{fallback ?? '📘'}</Text>;
}

/** Одиночный эмодзи → картинка (если есть). */
export function Emo({ e, size = 22 }: { e: string; size?: number }) {
  const k = EMOJI[e.replace(/\uFE0F/g, '')];
  return k ? <Icon name={k} size={size} /> : <Text style={{ fontSize: size * 0.85 }}>{e}</Text>;
}

const EMOJI_RX = new RegExp('(' + Object.keys(EMOJI).map((k) => k + '\\uFE0F?').join('|') + ')');

/** Текст, где известные эмодзи заменены нашими картинками (размер берётся из шрифта). */
export function RichText({ children, style, imgSize }: { children: React.ReactNode; style?: StyleProp<TextStyle>; imgSize?: number }) {
  const flat = StyleSheetFlat(style);
  const size = imgSize ?? Math.round((flat.fontSize ?? 16) * 1.35);
  const parts = React.Children.toArray(children).flatMap((c, ci) =>
    typeof c === 'string' || typeof c === 'number'
      ? String(c).split(EMOJI_RX).map((piece, i) => {
          const k = EMOJI[piece.replace(/\uFE0F/g, '')];
          return k ? <Image key={ci + '-' + i} source={ICONS[k]} resizeMode="contain" style={{ width: size, height: size }} /> : piece;
        })
      : [c],
  );
  return <Text style={style}>{parts}</Text>;
}

function StyleSheetFlat(style: StyleProp<TextStyle>): TextStyle {
  const out: TextStyle = {};
  const walk = (s: any) => {
    if (!s) return;
    if (Array.isArray(s)) s.forEach(walk);
    else Object.assign(out, s);
  };
  walk(style);
  return out;
}
