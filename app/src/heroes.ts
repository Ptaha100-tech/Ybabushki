import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/** Герои (персонажи) и значки из папки assets. */
export type HeroKey = 'glasses' | 'boy' | 'pink';
export type Pose = 'wave' | 'point' | 'book' | 'think' | 'idea' | 'thumbs' | 'shrug' | 'write' | 'shrug2' | 'walk';

export const HERO_LIST: { key: HeroKey; name: string }[] = [
  { key: 'glasses', name: 'Умница' },
  { key: 'boy', name: 'Непоседа' },
  { key: 'pink', name: 'Выдумщица' },
];

const HEROES: Record<HeroKey, Record<Pose, any>> = {
  glasses: {
    wave: require('../assets/heroes/glasses-wave.webp'),
    point: require('../assets/heroes/glasses-point.webp'),
    book: require('../assets/heroes/glasses-book.webp'),
    think: require('../assets/heroes/glasses-think.webp'),
    idea: require('../assets/heroes/glasses-idea.webp'),
    thumbs: require('../assets/heroes/glasses-thumbs.webp'),
    shrug: require('../assets/heroes/glasses-shrug.webp'),
    write: require('../assets/heroes/glasses-write.webp'),
    shrug2: require('../assets/heroes/glasses-shrug2.webp'),
    walk: require('../assets/heroes/glasses-walk.webp'),
  },
  boy: {
    wave: require('../assets/heroes/boy-wave.webp'),
    point: require('../assets/heroes/boy-point.webp'),
    book: require('../assets/heroes/boy-book.webp'),
    think: require('../assets/heroes/boy-think.webp'),
    idea: require('../assets/heroes/boy-idea.webp'),
    thumbs: require('../assets/heroes/boy-thumbs.webp'),
    shrug: require('../assets/heroes/boy-shrug.webp'),
    write: require('../assets/heroes/boy-write.webp'),
    shrug2: require('../assets/heroes/boy-shrug2.webp'),
    walk: require('../assets/heroes/boy-walk.webp'),
  },
  pink: {
    wave: require('../assets/heroes/pink-wave.webp'),
    point: require('../assets/heroes/pink-point.webp'),
    book: require('../assets/heroes/pink-book.webp'),
    think: require('../assets/heroes/pink-think.webp'),
    idea: require('../assets/heroes/pink-idea.webp'),
    thumbs: require('../assets/heroes/pink-thumbs.webp'),
    shrug: require('../assets/heroes/pink-shrug.webp'),
    write: require('../assets/heroes/pink-write.webp'),
    shrug2: require('../assets/heroes/pink-shrug2.webp'),
    walk: require('../assets/heroes/pink-walk.webp'),
  },
};

export const heroImg = (h: HeroKey, p: Pose) => HEROES[h][p];

export const ICONS = {
  btn_start: require('../assets/ui/btn-start.webp'),
  btn_play: require('../assets/ui/btn-play.webp'),
  globe: require('../assets/ui/globe.webp'),
  medal: require('../assets/ui/medal.webp'),
  backpack: require('../assets/ui/backpack.webp'),
  trophy: require('../assets/ui/trophy.webp'),
  pencil: require('../assets/ui/pencil.webp'),
  book_red: require('../assets/ui/book-red.webp'),
  clock: require('../assets/ui/clock.webp'),
  book_open: require('../assets/ui/book-open.webp'),
  bulb: require('../assets/ui/bulb.webp'),
  cap: require('../assets/ui/cap.webp'),
  magnifier: require('../assets/ui/magnifier.webp'),
  stars: require('../assets/ui/stars.webp'),
  star: require('../assets/ui/star.webp'),
  star_orange: require('../assets/ui/star-orange.webp'),
  check: require('../assets/ui/check.webp'),
  cross: require('../assets/ui/cross.webp'),
  ribbon: require('../assets/ui/ribbon.webp'),
  ruler: require('../assets/ui/ruler.webp'),
  hand: require('../assets/ui/hand.webp'),
};

let current: HeroKey = 'boy';
const listeners = new Set<() => void>();
AsyncStorage.getItem('hero')
  .then((v) => {
    if (v === 'glasses' || v === 'boy' || v === 'pink') {
      current = v;
      listeners.forEach((f) => f());
    }
  })
  .catch(() => undefined);

export function setHero(h: HeroKey) {
  current = h;
  AsyncStorage.setItem('hero', h).catch(() => undefined);
  listeners.forEach((f) => f());
}

/** Выбранный героя ученика (хранится на устройстве). */
export function useHero(): HeroKey {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  }, []);
  return current;
}
