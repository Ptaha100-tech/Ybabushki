import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HeroPic, Icon } from '../Art';
import InstallCard from '../InstallCard';
import { BRAND, SUBJECT_INFO } from '../config';
import { Button, Card, colors, Heading, Muted, Row, Screen } from '../ui';
import { InfoKind } from './InfoScreen';

const FAQ = [
  ['Нужно ли вступать в класс?', 'Нет. Ученик регистрируется и сразу решает задания сам. Класс — по желанию, только если учитель выдаёт домашние задания.'],
  ['Это бесплатно?', 'Да. Каждый день доступно бесплатное число заданий самостоятельной тренировки, домашние задания и игры лимит не тратят. Безлимит включает родитель.'],
  ['Для каких классов?', 'Для 1–11 классов. Есть подготовка к ВПР, ОГЭ и ЕГЭ. Предметы: математика, русский язык, литература, английский, окружающий мир, биология, география, физика, химия, история, информатика.'],
  ['Нужно ли скачивать приложение?', 'Нет, сайт работает в любом браузере. Но его можно установить на телефон как приложение: значок на экране, быстрый запуск.'],
  ['Как учитель выдаёт домашнее задание?', 'Регистрируется как учитель, создаёт класс, сообщает ученикам код, выбирает тему — и ученики видят задание у себя.'],
  ['Как родитель следит за успехами?', 'Ученик показывает свой код для родителей в профиле, родитель вводит его в своём кабинете.'],
];

const STATS: [string, string, string, string][] = [
  ['11', 'школьных предметов', colors.primaryDark, '-2deg'],
  ['4000+', 'заданий с объяснениями', colors.cta, '1.5deg'],
  ['1–11', 'классы: от первого до выпускного', colors.primary, '1deg'],
  ['ВПР · ОГЭ · ЕГЭ', 'подготовка к экзаменам', colors.cta, '-1.5deg'],
  ['2', 'игры: Молния и Найди пару', colors.primary, '-1deg'],
  ['0 ₽', 'чтобы начать', colors.primaryDark, '2deg'],
];

const AUDIENCE: [string, string, string, string, string][] = [
  ['backpack', 'Ученикам', 'Решай задания по уровню, играй, получай опыт, уровни и значки. Класс не нужен — просто зарегистрируйся.', colors.primary, '#fff'],
  ['book_open', 'Учителям', 'Создайте класс, дайте ученикам код, выдавайте домашние задания и смотрите результаты каждого.', colors.cta, '#fff'],
  ['trophy', 'Родителям', 'Привяжите ребёнка по коду, следите за успехами и включайте безлимитные занятия.', colors.primaryDark, '#fff'],
];

export default function LandingScreen({ onStart, onInfo }: { onStart: (mode: 'login' | 'register') => void; onInfo: (k: InfoKind) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Screen>
      {/* Шапка-герой */}
      <View style={s.hero}>
        <View style={[s.blob, { width: 220, height: 220, right: -60, top: -60 }]} />
        <View style={[s.blob, { width: 140, height: 140, left: -40, bottom: -40 }]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Icon name="cap" size={34} />
          <Text style={[s.logo, { marginBottom: 0 }]}>{BRAND}</Text>
        </View>
        <Row style={{ marginBottom: 14 }}>
          {['ВПР', 'ОГЭ', 'ЕГЭ', '1–11 класс'].map((t) => (
            <View key={t} style={s.pill}>
              <Text style={s.pillText}>{t}</Text>
            </View>
          ))}
        </Row>
        <Text style={s.h1}>Учись играя: все школьные предметы в одном месте</Text>
        <Text style={s.lead}>Интерактивные задания, игры, объяснения и подготовка к экзаменам. С телефона и компьютера.</Text>
        <Button title="Начать бесплатно" onPress={() => onStart('register')} />
        <Pressable onPress={() => onStart('login')} style={{ alignItems: 'center', padding: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>У меня уже есть аккаунт</Text>
        </Pressable>
        <View style={s.kids}>
          <HeroPic hero="glasses" pose="wave" size={190} style={{ marginRight: -18 }} />
          <HeroPic hero="boy" pose="thumbs" size={215} style={{ zIndex: 2 }} />
          <HeroPic hero="pink" pose="wave" size={190} style={{ marginLeft: -18 }} />
        </View>
      </View>

      {/* Цифры */}
      <View style={s.statsWrap}>
        {STATS.map(([big, small, bg, rot]) => (
          <View key={small} style={[s.stat, { backgroundColor: bg, transform: [{ rotate: rot }] }]}>
            <Text style={s.statBig}>{big}</Text>
            <Text style={s.statSmall}>{small}</Text>
          </View>
        ))}
      </View>

      {/* Для кого */}
      <Text style={s.h2}>Для кого сервис</Text>
      {AUDIENCE.map(([e, t, d, bg, fg]) => (
        <View key={t} style={[s.audience, { backgroundColor: bg }]}>
          <Icon name={e as any} size={52} />
          <Text style={[s.audTitle, { color: fg }]}>{t}</Text>
          <Text style={[s.audText, { color: fg }]}>{d}</Text>
        </View>
      ))}

      {/* Баннер экзаменов */}
      <View style={s.banner}>
        <Text style={s.bannerTitle}>Начни готовиться к ВПР, ОГЭ и ЕГЭ уже сейчас</Text>
        <Text style={s.bannerText}>Отдельные темы для экзаменов, объяснения к каждому заданию.</Text>
        <HeroPic hero="pink" pose="idea" size={130} style={{ position: 'absolute', right: 8, top: 8 }} />
        <Pressable onPress={() => onStart('register')} style={s.bannerBtn}>
          <Text style={{ fontWeight: '800', color: colors.dark }}>Попробовать</Text>
        </Pressable>
      </View>

      {/* Предметы */}
      <Text style={s.h2}>Предметы</Text>
      <Row style={{ marginBottom: 8, gap: 10 }}>
        {SUBJECT_INFO.map((x) => (
          <View key={x.title} style={s.subject}>
            <View style={[s.subjectIcon, { backgroundColor: x.color }]}>
              <Text style={{ fontSize: 22 }}>{x.emoji}</Text>
            </View>
            <Text style={s.subjectTitle}>{x.title}</Text>
            <View style={s.tag}>
              <Text style={s.tagText}>{x.grades} кл.</Text>
            </View>
          </View>
        ))}
      </Row>

      <Text style={s.h2}>Как начать</Text>
      <Card>
        <Text style={s.step}>1. Создайте аккаунт — ученик, учитель или родитель.</Text>
        <Text style={s.step}>2. Выберите класс, предмет и тему.</Text>
        <Text style={s.step}>3. Решайте задания, играйте и растите уровень.</Text>
        <Button title="Создать аккаунт" onPress={() => onStart('register')} />
      </Card>

      <InstallCard />

      <Text style={s.h2}>Вопросы и ответы</Text>
      {FAQ.map(([q, a], i) => (
        <Pressable key={q} onPress={() => setOpen(open === i ? null : i)}>
          <Card>
            <Text style={s.faqQ}>{open === i ? '▾' : '▸'} {q}</Text>
            {open === i && <Text style={s.faqA}>{a}</Text>}
          </Card>
        </Pressable>
      ))}

      <Row style={{ marginTop: 16, marginBottom: 12, justifyContent: 'center' }}>
        <Pressable onPress={() => onInfo('about')}><Text style={s.link}>О сервисе</Text></Pressable>
        <Pressable onPress={() => onInfo('privacy')}><Text style={s.link}>Конфиденциальность</Text></Pressable>
        <Pressable onPress={() => onInfo('terms')}><Text style={s.link}>Условия</Text></Pressable>
      </Row>
      <Muted style={{ textAlign: 'center', marginBottom: 24 }}>© {BRAND}</Muted>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.primary, borderRadius: 32, padding: 22, paddingBottom: 0, marginBottom: 20, overflow: 'hidden' },
  kids: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: 10, height: 215 },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' },
  logo: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 14 },
  pill: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  pillText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  h1: { fontSize: 30, fontWeight: '800', color: '#fff', lineHeight: 37, marginBottom: 10 },
  lead: { fontSize: 16, color: 'rgba(255,255,255,0.92)', lineHeight: 24, marginBottom: 16 },
  heroEmoji: { position: 'absolute', right: 14, bottom: 8, fontSize: 64, opacity: 0.9 },
  statsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginVertical: 14 },
  stat: { width: '47%', borderRadius: 24, padding: 16, minHeight: 104, justifyContent: 'space-between' },
  statBig: { fontSize: 26, fontWeight: '800', color: '#fff' },
  statSmall: { fontSize: 12, color: 'rgba(255,255,255,0.95)', marginTop: 4, lineHeight: 16 },
  h2: { fontSize: 24, fontWeight: '800', color: colors.dark, marginTop: 18, marginBottom: 12 },
  audience: { borderRadius: 28, padding: 20, marginBottom: 12 },
  audTitle: { fontSize: 22, fontWeight: '800', marginTop: 6, marginBottom: 6 },
  audText: { fontSize: 15, lineHeight: 22, opacity: 0.95 },
  banner: { backgroundColor: colors.primary, borderRadius: 28, padding: 22, marginTop: 14 },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6, lineHeight: 28, paddingRight: 110 },
  bannerText: { color: 'rgba(255,255,255,0.92)', fontSize: 15, marginBottom: 14 },
  bannerBtn: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 13, alignItems: 'center' },
  subject: { width: '31%', backgroundColor: '#fff', borderRadius: 22, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  subjectIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  subjectTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center', color: colors.dark, minHeight: 30 },
  tag: { borderWidth: 1, borderColor: colors.dark, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  tagText: { fontSize: 11, color: colors.dark },
  step: { fontSize: 15, color: colors.text, lineHeight: 24 },
  faqQ: { fontSize: 16, fontWeight: '700', color: colors.dark },
  faqA: { fontSize: 14, color: colors.muted, lineHeight: 21, marginTop: 6 },
  link: { color: colors.primaryDark, fontWeight: '600', marginHorizontal: 8 },
});
