import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { HeroKey, heroImg, ICONS, Pose } from './heroes';

/** Персонаж в нужной позе. Размер — высота в пикселях. */
export function HeroPic({ hero, pose, size, style }: { hero: HeroKey; pose: Pose; size: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={heroImg(hero, pose)} resizeMode="contain" style={[{ width: size * 0.9, height: size }, style]} />;
}

/** Значок из набора иллюстраций. */
export function Icon({ name, size = 40, style }: { name: keyof typeof ICONS; size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={ICONS[name]} resizeMode="contain" style={[{ width: size, height: size }, style]} />;
}
