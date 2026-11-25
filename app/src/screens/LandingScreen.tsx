import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import InstallCard from '../InstallCard';
import { BRAND, SUBJECT_INFO, TAGLINE } from '../config';
import { Button, Card, colors, Heading, Muted, Row, Screen } from '../ui';
import { InfoKind } from './InfoScreen';

const FEATURES = [
  ['🎯', 'Задания по уровню', 'Сложность подстраивается: верные ответы подряд — задания труднее, ошибка — проще.'],
  ['🎮', 'Учёба как игра', 'Опыт, уровни, значки, серии дней и игры «Молния» и «Найди пару».'],
  ['💡', 'Объяснения и подсказки', 'После каждого ответа — разбор: почему так, а не иначе.'],
  ['🎯', 'Подготовка к ВПР, ОГЭ и ЕГЭ', 'Отдельные темы для ВПР (4–8 классы), ОГЭ по математике и ЕГЭ — тренируйтесь в формате экзамена.'],
  ['🧩', 'Разные типы заданий', 'Выбор, верно/неверно, ввод ответа, расстановка по порядку, соединение пар.'],
  ['🏫', 'Для классов', 'Учитель создаёт класс, выдаёт домашние задания и видит результаты каждого ученика.'],
  ['👨‍👩‍👧', 'Для родителей', 'Привязка по коду ребёнка, понятная статистика, безлимитные занятия.'],
];

const FAQ = [
  ['Нужно ли вступать в класс?', 'Нет. Ученик регистрируется и сразу решает задания сам. Класс — по желанию, только если учитель выдаёт домашние задания.'],
  ['Это бесплатно?', 'Да. Каждый день доступно бесплатное число заданий самостоятельной тренировки, домашние задания и игры лимит не тратят. Безлимит включает родитель.'],
  ['Для каких классов?', 'Для 1–11 классов. Есть подготовка к ВПР, ОГЭ и ЕГЭ. Предметы: математика, русский язык, литература, английский, окружающий мир, биология, география, физика, химия, история, информатика.'],
  ['Нужно ли скачивать приложение?', 'Нет, сайт работает в любом браузере. Но его можно установить на телефон как приложение: значок на экране, быстрый запуск.'],
  ['Как учитель выдаёт домашнее задание?', 'Регистрируется как учитель, создаёт класс, сообщает ученикам код, выбирает тему — и ученики видят задание у себя.'],
  ['Как родитель следит за успехами?', 'Ученик показывает свой код для родителей в профиле, родитель вводит его в своём кабинете.'],
];

export default function LandingScreen({ onStart, onInfo }: { onStart: (mode: 'login' | 'register') => void; onInfo: (k: InfoKind) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Screen>
      <View style={s.hero}>
        <Text style={s.logo}>🎓 {BRAND}</Text>
        <Text style={s.h1}>{TAGLINE}</Text>
        <Text style={s.lead}>Интерактивные задания, игры и подсказки. Для учеников, учителей и родителей — с телефона и компьютера.</Text>
        <Button title="Начать бесплатно" onPress={() => onStart('register')} />
        <Button kind="secondary" title="У меня уже есть аккаунт" onPress={() => onStart('login')} />
      </View>

      <Heading>Что внутри</Heading>
      {FEATURES.map(([e, t, d]) => (
        <Card key={t} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 28 }}>{e}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{t}</Text>
            <Text style={s.cardText}>{d}</Text>
          </View>
        </Card>
      ))}

      <Heading>Предметы</Heading>
      <Row style={{ marginBottom: 8 }}>
        {SUBJECT_INFO.map((x) => (
          <View key={x.title} style={[s.subject, { borderColor: x.color }]}>
            <Text style={{ fontSize: 24 }}>{x.emoji}</Text>
            <Text style={s.subjectTitle}>{x.title}</Text>
            <Text style={s.subjectSub}>{x.grades} кл.</Text>
          </View>
        ))}
      </Row>

      <Heading>Как начать</Heading>
      <Card>
        <Text style={s.cardText}>1. Создайте аккаунт — ученик, учитель или родитель.{'\n'}2. Ученик выбирает класс, предмет и тему.{'\n'}3. Решайте задания, играйте и растите уровень.</Text>
        <Button title="Создать аккаунт" onPress={() => onStart('register')} />
      </Card>

      <InstallCard />

      <Heading>Вопросы и ответы</Heading>
      {FAQ.map(([q, a], i) => (
        <Pressable key={q} onPress={() => setOpen(open === i ? null : i)}>
          <Card>
            <Text style={s.cardTitle}>{open === i ? '▾' : '▸'} {q}</Text>
            {open === i && <Text style={[s.cardText, { marginTop: 6 }]}>{a}</Text>}
          </Card>
        </Pressable>
      ))}

      <Row style={{ marginTop: 16, marginBottom: 24, justifyContent: 'center' }}>
        <Pressable onPress={() => onInfo('about')}><Text style={s.link}>О сервисе</Text></Pressable>
        <Pressable onPress={() => onInfo('privacy')}><Text style={s.link}>Конфиденциальность</Text></Pressable>
        <Pressable onPress={() => onInfo('terms')}><Text style={s.link}>Условия</Text></Pressable>
      </Row>
      <Muted style={{ textAlign: 'center' }}>© {BRAND}</Muted>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: '#EEF2FF', borderRadius: 20, padding: 20, marginBottom: 8 },
  logo: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 8 },
  h1: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 8, lineHeight: 34 },
  lead: { fontSize: 16, color: colors.muted, marginBottom: 12, lineHeight: 23 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardText: { fontSize: 14, color: colors.muted, lineHeight: 21, marginTop: 2 },
  subject: { borderWidth: 2, borderRadius: 14, padding: 10, width: '31%', alignItems: 'center', backgroundColor: '#fff' },
  subjectTitle: { fontSize: 12, fontWeight: '700', textAlign: 'center', color: colors.text, marginTop: 4 },
  subjectSub: { fontSize: 11, color: colors.muted },
  link: { color: colors.primary, fontWeight: '600', marginHorizontal: 8 },
});
