import { randomInt } from 'crypto';
import { User } from './entities';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без похожих символов (0/O, 1/I)

export function randomCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function publicUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    linkCode: u.linkCode,
    classroomId: u.classroomId,
    xp: u.xp,
    dayStreak: u.dayStreak,
  };
}
