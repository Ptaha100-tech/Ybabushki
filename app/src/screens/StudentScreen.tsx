import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api, errMsg, HomeworkItem, Stats, Topic, User } from '../api';
import InstallCard from '../InstallCard';
import TopicBrowser from '../TopicBrowser';
import { Button, Card, Chip, colors, ErrorText, Field, Heading, InfoText, Muted, Row, Screen, Title } from '../ui';
import GamesScreen from './GamesScreen';
import { InfoKind } from './InfoScreen';
import PracticeScreen from './PracticeScreen';

type Tab = 'learn' | 'games' | 'rating' | 'me';

export default function StudentScreen({ user, onLogout, onInfo }: { user: User; onLogout: () => void; onInfo: (k: InfoKind) => void }) {
  const [tab, setTab] = useState<Tab>('learn');
  const [stats, setStats] = useState<Stats | null>(null);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [practice, setPractice] = useState<{ topic: Topic; homeworkId?: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [board, setBoard] = useState<{ classroom: boolean; rows: { name: string; xp: number; me: boolean }[] } | null>(null);
  const [hwTopics, setHwTopics] = useState<Topic[]>([]);

  const load = useCallback(async () => {
    try {
      const [s, h, c] = await Promise.all([api.stats(), api.myHomework(), api.catalog()]);
      setStats(s);
      setHomework(h);
      setHwTopics(c.topics);
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    if (!practice) load();
  }, [practice, load, tab]);

  useEffect(() => {
    if (tab === 'rating') api.leaderboard().then(setBoard).catch((e) => setError(errMsg(e)));
  }, [tab]);

  const join = async () => {
    setError('');
    setInfo('');
    try {
      const c = await api.joinClass(code);
      setInfo(`Вы в классе «${c.name}»`);
      setCode('');
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (practice) return <PracticeScreen topic={practice.topic} homeworkId={practice.homeworkId} onClose={() => setPractice(null)} />;
  if (tab === 'games') return <GamesScreen grade={stats?.grade ?? user.grade} onClose={() => { setTab('learn'); load(); }} />;

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Title>
          {stats?.avatar ?? '🐣'} {user.name}
        </Title>
        <Text style={s.xp}>⭐ {stats?.xp ?? user.xp}</Text>
      </Row>

      <Row style={{ marginBottom: 12 }}>
        <Chip label="📚 Учиться" active={tab === 'learn'} onPress={() => setTab('learn')} />
        <Chip label="🎮 Игры" active={false} onPress={() => setTab('games')} />
        <Chip label="🏆 Рейтинг" active={tab === 'rating'} onPress={() => setTab('rating')} />
        <Chip label="👤 Профиль" active={tab === 'me'} onPress={() => setTab('me')} />
      </Row>

      <ErrorText text={error} />

      {tab === 'learn' && (
        <>
          {stats && (
            <Muted>
              {stats.remaining === null ? '♾️ Безлимитные занятия включены' : `Бесплатных заданий сегодня осталось: ${stats.remaining}`} · 🔥 серия {stats.dayStreak} дн.
            </Muted>
          )}
          {homework.length > 0 && (
            <>
              <Heading>📌 Домашние задания</Heading>
              {homework.map((h) => {
                const topic = hwTopics.find((t) => t.id === h.topicId);
                return (
                  <Card key={h.id}>
                    <Text style={s.hwTitle}>{h.topicTitle}</Text>
                    <Muted>Решено: {h.done}</Muted>
                    {topic && <Button title="Выполнять" onPress={() => setPractice({ topic, homeworkId: h.id })} />}
                  </Card>
                );
              })}
            </>
          )}
          <Heading>Выбери тему</Heading>
          <TopicBrowser initialGrade={stats?.grade ?? user.grade ?? null} onPick={(t) => setPractice({ topic: t })} />
        </>
      )}

      {tab === 'rating' && (
        <>
          <Heading>🏆 Рейтинг класса</Heading>
          {!board ? (
            <Muted>Загрузка…</Muted>
          ) : !board.classroom ? (
            <Card>
              <Muted>Рейтинг появляется, когда вы вступаете в класс. Введите код от учителя во вкладке «Профиль».</Muted>
            </Card>
          ) : (
            board.rows.map((r, i) => (
              <Card key={`${r.name}-${i}`} style={r.me ? { borderColor: colors.primary, backgroundColor: '#EEF2FF' } : undefined}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={s.hwTitle}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {r.name}
                    {r.me ? ' (вы)' : ''}
                  </Text>
                  <Text style={s.xp}>⭐ {r.xp}</Text>
                </Row>
              </Card>
            ))
          )}
        </>
      )}

      {tab === 'me' && stats && (
        <>
          <Card>
            <Text style={s.big}>
              {stats.avatar} Уровень {stats.level}: {stats.title}
            </Text>
            <View style={s.bar}>
              <View style={[s.barFill, { width: `${stats.progress ?? 0}%` }]} />
            </View>
            <Muted>{stats.xpToNext ? `До следующего уровня: ${stats.xpToNext} XP` : 'Максимальный уровень!'}</Muted>
            <Muted>
              ⭐ {stats.xp} XP · 🔥 серия {stats.dayStreak} дн. · ✅ верных {stats.accuracy}% ({stats.correct} из {stats.total})
            </Muted>
            {stats.grade ? <Muted>Класс: {stats.grade}</Muted> : null}
            <Muted>
              Код для родителей: <Text style={{ fontWeight: '800', color: colors.text }}>{user.linkCode}</Text>
            </Muted>
          </Card>

          <Heading>🏅 Значки</Heading>
          <Row style={{ marginBottom: 8 }}>
            {(stats.badges ?? []).map((b) => (
              <View key={b.id} style={[s.badge, !b.earned && { opacity: 0.35 }]}>
                <Text style={{ fontSize: 28 }}>{b.emoji}</Text>
                <Text style={s.badgeTitle}>{b.title}</Text>
                <Text style={s.badgeText}>{b.text}</Text>
              </View>
            ))}
          </Row>

          <Heading>Вступить в класс</Heading>
          <Card>
            <Field label="Код от учителя" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="ABC123" />
            <InfoText text={info} />
            <Button title="Вступить" onPress={join} disabled={!code.trim()} />
          </Card>

          <InstallCard />

          <Row style={{ marginVertical: 8 }}>
            <Button kind="secondary" title="О сервисе" onPress={() => onInfo('about')} />
            <Button kind="secondary" title="Конфиденциальность" onPress={() => onInfo('privacy')} />
          </Row>
          <Button kind="secondary" title="Выйти" onPress={onLogout} />
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  xp: { fontSize: 18, fontWeight: '800', color: colors.accent },
  hwTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  big: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
  bar: { height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: 12, backgroundColor: colors.primary },
  badge: { width: '31%', alignItems: 'center', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  badgeTitle: { fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' },
  badgeText: { fontSize: 10, color: colors.muted, textAlign: 'center' },
});
