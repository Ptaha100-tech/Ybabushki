import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Звук: эффекты, фоновая музыка и озвучка текста.
 * - Эффекты и музыка: готовые файлы (web — /sfx и /music, Android — expo-audio).
 * - Озвучка: встроенный синтез речи устройства (web — speechSynthesis, Android — expo-speech). Бесплатно, без сервера.
 */
export type Sfx = 'correct' | 'wrong' | 'click' | 'coin' | 'flip' | 'win' | 'lose' | 'pop';
export interface SoundSettings { sfx: boolean; music: boolean; voice: boolean }

const DEFAULTS: SoundSettings = { sfx: true, music: false, voice: false };
let settings: SoundSettings = { ...DEFAULTS };
const listeners = new Set<() => void>();
const isWeb = Platform.OS === 'web';

const FILES: Record<Sfx, any> = isWeb
  ? ({} as any)
  : {
      correct: require('../assets/sfx/correct.wav'),
      wrong: require('../assets/sfx/wrong.wav'),
      click: require('../assets/sfx/click.wav'),
      coin: require('../assets/sfx/coin.wav'),
      flip: require('../assets/sfx/flip.wav'),
      win: require('../assets/sfx/win.wav'),
      lose: require('../assets/sfx/lose.wav'),
      pop: require('../assets/sfx/pop.wav'),
    };

const notify = () => listeners.forEach((f) => f());

export async function loadSoundSettings() {
  try {
    const raw = await AsyncStorage.getItem('snd_settings');
    if (raw) settings = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* без хранилища — настройки по умолчанию */
  }
  notify();
  if (settings.music) startMusic();
}

export function getSoundSettings() {
  return settings;
}

export function setSoundSetting<K extends keyof SoundSettings>(k: K, v: SoundSettings[K]) {
  settings = { ...settings, [k]: v };
  AsyncStorage.setItem('snd_settings', JSON.stringify(settings)).catch(() => undefined);
  if (k === 'music') (v ? startMusic() : stopMusic());
  if (k === 'voice' && !v) stopSpeaking();
  notify();
}

export function useSoundSettings(): SoundSettings {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  }, []);
  return settings;
}

// ---------- эффекты ----------
const cache: Record<string, any> = {};

export function play(name: Sfx) {
  if (!settings.sfx) return;
  try {
    if (isWeb) {
      const a = new (window as any).Audio(`/sfx/${name}.mp3`);
      a.volume = name === 'click' ? 0.5 : 0.8;
      a.play().catch(() => undefined);
    } else {
      const { createAudioPlayer } = require('expo-audio');
      let p = cache[name];
      if (!p) p = cache[name] = createAudioPlayer(FILES[name]);
      p.seekTo(0);
      p.play();
    }
  } catch {
    /* звук не критичен */
  }
}

// ---------- музыка ----------
let music: any = null;
let gestureHooked = false;

export function startMusic() {
  try {
    if (isWeb) {
      if (!music) {
        music = new (window as any).Audio('/music/loop.mp3');
        music.loop = true;
        music.volume = 0.22;
      }
      music.play().catch(() => {
        // браузер разрешает звук только после касания — запустим при первом нажатии
        if (gestureHooked) return;
        gestureHooked = true;
        const go = () => {
          gestureHooked = false;
          if (settings.music) music?.play().catch(() => undefined);
          window.removeEventListener('pointerdown', go);
        };
        window.addEventListener('pointerdown', go);
      });
    } else {
      const { createAudioPlayer } = require('expo-audio');
      if (!music) {
        music = createAudioPlayer(require('../assets/sfx/music.mp3'));
        music.loop = true;
        music.volume = 0.22;
      }
      music.play();
    }
  } catch {
    /* ignore */
  }
}

export function stopMusic() {
  try {
    music?.pause();
  } catch {
    /* ignore */
  }
}

// ---------- озвучка ----------
/** Убирает из текста значки и символы, которые нельзя прочитать вслух. */
export function cleanForSpeech(t: string): string {
  return t
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ')
    .replace(/[→⟶➜]/g, ' — ')
    .replace(/\s*[=]\s*/g, ' равно ')
    .replace(/\s*\+\s*/g, ' плюс ')
    .replace(/\s+−\s+|\s+-\s+/g, ' минус ')
    .replace(/×|·/g, ' умножить на ')
    .replace(/÷/g, ' разделить на ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function speak(text: string) {
  const t = cleanForSpeech(text);
  if (!t) return;
  try {
    if (isWeb) {
      const synth = (window as any).speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new (window as any).SpeechSynthesisUtterance(t);
      u.lang = 'ru-RU';
      u.rate = 0.92;
      const ru = synth.getVoices().find((v: any) => /^ru/i.test(v.lang));
      if (ru) u.voice = ru;
      synth.speak(u);
    } else {
      const Speech = require('expo-speech');
      Speech.stop();
      Speech.speak(t, { language: 'ru-RU', rate: 0.92 });
    }
  } catch {
    /* ignore */
  }
}

export function stopSpeaking() {
  try {
    if (isWeb) (window as any).speechSynthesis?.cancel();
    else require('expo-speech').stop();
  } catch {
    /* ignore */
  }
}

/** Читает вслух только если включена автоозвучка. */
export function autoSpeak(text: string) {
  if (settings.voice) speak(text);
}
