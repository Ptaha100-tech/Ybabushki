import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HeroPic, Scene } from '../Art';
import { HERO_NAMES, Pose, useHero } from '../heroes';
import ProfileEditor from '../ProfileEditor';
import { User } from '../api';
import { BRAND } from '../config';
import { Button, Card, colors, Muted, Screen } from '../ui';

interface Step {
  pose: Pose;
  title: string;
  text: string;
  scene?: 'board' | 'jump' | 'walk';
  profile?: boolean;
}

const STUDENT: Step[] = [
  { pose: 'wave', title: 'Привет! Я {name}', text: 'Я буду помогать тебе в «{brand}». За пару минут покажу, как тут всё устроено.' },
  { pose: 'point', title: '1. Выбери тему', text: 'Во вкладке «Учёба» выбери класс и предмет. Есть темы по программе и подготовка к ВПР, ОГЭ и ЕГЭ.' },
  { pose: 'think', title: '2. Решай задания', text: 'Задания бывают разные: выбрать ответ, ввести число, расставить по порядку, соединить пары. Не получилось — будет подсказка и объяснение.' },
  { pose: 'idea', title: '3. Растёт уровень', text: 'За верные ответы ты получаешь опыт ⭐, растёт уровень, открываются значки 🏅, а за занятия каждый день растёт серия 🔥. Сложность подстраивается под тебя.' },
  { pose: 'thumbs', title: '4. Играй', text: 'Во вкладке «Игры» — «Молния» на скорость и «Найди пару». Игры дают опыт и не тратят бесплатные задания.' },
  { pose: 'book', title: '5. Класс — по желанию', text: 'Если учитель дал код класса, введи его в профиле — появятся домашние задания и рейтинг класса. Без класса тоже всё работает.' },
  { pose: 'wave', title: 'Готово!', text: 'Можешь начинать. Обучение всегда можно открыть снова в профиле. Удачи!', scene: 'jump' },
];

const TEACHER: Step[] = [
  { pose: 'wave', title: 'Здравствуйте! Я {name}', text: 'Коротко расскажу, как работать в «{brand}».' },
  { pose: 'point', title: '1. Создайте класс', text: 'На главной странице кабинета нажмите «Создать класс» и сообщите ученикам код класса.' },
  { pose: 'book', title: '2. Выдавайте задания', text: 'Выберите класс и тему из каталога (математика, русский, физика и другие предметы 1–11 классов) — ученики увидят домашнее задание у себя.', scene: 'board' },
  { pose: 'idea', title: '3. Смотрите результаты', text: 'В классе видны ученики, их опыт, точность ответов и результаты по темам.' },
  { pose: 'thumbs', title: 'Готово!', text: 'Обучение всегда можно открыть снова на главной странице кабинета.' },
];

const PARENT: Step[] = [
  { pose: 'wave', title: 'Здравствуйте! Я {name}', text: 'Расскажу, как следить за успехами ребёнка в «{brand}».' },
  { pose: 'point', title: '1. Добавьте ребёнка', text: 'Ребёнок видит свой код для родителей в профиле. Введите его в кабинете — появится статистика.' },
  { pose: 'idea', title: '2. Следите за прогрессом', text: 'Опыт, серия дней, точность ответов и слабые темы — всё в одном месте.' },
  { pose: 'thumbs', title: '3. Безлимит', text: 'Каждый день ребёнку доступно бесплатное число заданий. Безлимитные занятия включаются в вашем кабинете.', scene: 'walk' },
];

/** Короткое обучение по возможностям сервиса. Ведёт герой, выбранный по полу и классу. */
export default function OnboardingScreen({ user, onUser, onDone }: { user: User; onUser: (u: User) => void; onDone: () => void }) {
  const hero = useHero();
  const base = user.role === 'student' ? STUDENT : user.role === 'teacher' ? TEACHER : PARENT;
  const needProfile = !user.gender || (user.role === 'student' && !user.grade);
  const steps: Step[] = needProfile
    ? [{ pose: 'wave', title: 'Давай знакомиться', text: 'Укажи пол' + (user.role === 'student' ? ' и класс' : '') + ' — по ним мы выберем твоего помощника.', profile: true }, ...base]
    : base;
  const [i, setI] = useState(0);
  const step = steps[i];
  const fill = (t: string) => t.replace('{name}', HERO_NAMES[hero]).replace('{brand}', BRAND);
  const last = i === steps.length - 1;
  const blocked = !!step.profile && !user.gender;

  return (
    <Screen>
      <View style={s.top}>
        <View style={s.dots}>
          {steps.map((_, k) => (
            <View key={k} style={[s.dot, k === i && s.dotActive]} />
          ))}
        </View>
        {!last && <Button kind="secondary" title="Пропустить" onPress={onDone} />}
      </View>

      <View style={s.stage}>
        {step.scene ? (
          <Scene name={step.scene} width={300} ratio={step.scene === 'board' ? 1.12 : step.scene === 'jump' ? 1.09 : 1.17} />
        ) : (
          <HeroPic hero={hero} pose={step.pose} size={230} />
        )}
      </View>

      <Card style={s.bubble}>
        <Text style={s.title}>{fill(step.title)}</Text>
        <Text style={s.text}>{fill(step.text)}</Text>
        {step.profile ? <ProfileEditor user={user} onChange={onUser} /> : null}
        {blocked && <Muted>Выберите пол, чтобы продолжить.</Muted>}
      </Card>

      <Button title={last ? 'Начать' : 'Дальше'} onPress={() => (last ? onDone() : setI(i + 1))} disabled={blocked} />
      {i > 0 && <Button kind="secondary" title="← Назад" onPress={() => setI(i - 1)} />}
    </Screen>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  dotActive: { width: 26, backgroundColor: colors.cta },
  stage: { alignItems: 'center', justifyContent: 'center', minHeight: 250, marginBottom: 6 },
  bubble: { borderWidth: 2, borderColor: colors.primary },
  title: { fontSize: 22, fontWeight: '800', color: colors.dark, marginBottom: 8 },
  text: { fontSize: 16, lineHeight: 24, color: colors.text, marginBottom: 8 },
});
