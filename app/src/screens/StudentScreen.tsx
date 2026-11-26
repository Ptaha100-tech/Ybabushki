import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api, errMsg, HomeworkItem, Leaderboard, Stats, Topic, User } from '../api';
import { Emo, HeroPic, Icon, RichText } from '../Art';
import { HERO_NAMES, useHero } from '../heroes';
import EmailVerify from '../EmailVerify';
import QuestsCard from '../QuestsCard';
import ShopPanel from '../ShopPanel';
import ProfileEditor from '../ProfileEditor';
import InstallCard from '../InstallCard';
import TopicBrowser from '../TopicBrowser';
import { Button, Card, Chip, colors, ErrorText, Field, Heading, InfoText, Muted, Row, Screen, Title } from '../ui';
import GamesScreen from './GamesScreen';
import { InfoKind } from './InfoScreen';
import PracticeScreen from './PracticeScreen';

const FRAME_COLORS: Record<string, string> = {
  'frame-green': '#22C55E', 'frame-purple': '#8B5CF6', 'frame-orange': '#FD7124', 'frame-gold': '#F5B301', 'frame-pink': '#EC4899',
};
const TITLE_TEXT: Record<string, string> = {
  'title-clever': 'Умник', 'title-explorer': 'Исследователь', 'title-champ': 'Чемпион', 'title-legend': 'Легенда школы',
};

type Tab = 'learn' | 'games' | 'shop' | 'rating' | 'me';

export default function StudentScreen({ user, onLogout, onInfo, onUser, onTour }: { user: User; onLogout: () => void; onInfo: (k: InfoKind) => void; onUser: (u: User) => void; onTour: () => void }) {
  const [tab, setTab] = useState<Tab>('learn');
  const hero = useHero();
  const [stats, setStats] = useState<Stats | null>(null);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [practice, setPractice] = useState<{ topic: Topic; homeworkId?: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [period, setPeriod] = useState<'week' | 'all'>('week');
  const [weak, setWeak] = useState<(Topic & { total: number; accuracy: number })[]>([]);
  const [hwTopics, setHwTopics] = useState<Topic[]>([]);

  const load = useCallback(async () => {
    try {
      const [s, h, c, w] = await Promise.all([api.stats(), api.myHomework(), api.catalog(), api.weakTopics().catch(() => [])]);
      setStats(s);
      setWeak(w);
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

  const NAV: [Tab, string, string][] = [
    ['learn', '📚', 'Учёба'],
    ['games', '🎮', 'Игры'],
    ['shop', '🎒', 'Магазин'],
    ['rating', '🏆', 'Рейтинг'],
    ['me', '👤', 'Профиль'],
  ];

  return (
    <View style={{ flex: 1 }}>
    <Screen>
      <View style={s.head}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={[s.avatar, user.frame ? { borderWidth: 4, borderColor: FRAME_COLORS[user.frame] ?? colors.cta } : null]}>
              <HeroPic hero={hero} pose="wave" size={74} style={{ position: 'absolute', top: 0, left: -2 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.hello}>Привет, {user.name}!</Text>
              <Text style={s.lvl}>{stats ? `Уровень ${stats.level} · ${TITLE_TEXT[user.titleId ?? ''] ?? stats.title}` : ' '}</Text>
            </View>
          </View>
          <View style={s.xpPill}>
            <RichText style={s.xpPillText}>⭐ {stats?.xp ?? user.xp}</RichText>
          </View>
        </Row>
        <View style={s.barHead}>
          <View style={[s.barHeadFill, { width: `${stats?.progress ?? 0}%` }]} />
        </View>
        <RichText style={s.lvl}>🔥 серия {stats?.dayStreak ?? 0} дн.</RichText>
      </View>

      <ErrorText text={error} />

      {tab === 'shop' && <ShopPanel onUser={onUser} />}

      {tab === 'learn' && (
        <>
          <QuestsCard refreshKey={stats?.total} />
          {stats && (
            <Muted>
              {stats.remaining === null ? '♾️ Безлимитные занятия включены' : `Бесплатных заданий сегодня осталось: ${stats.remaining}`} · 🔥 серия {stats.dayStreak} дн.
            </Muted>
          )}
          {weak.length > 0 && (
            <>
              <Heading>🎯 Стоит повторить</Heading>
              <Muted>Здесь ответов с ошибками было больше всего. Потренируйся ещё — станет легче.</Muted>
              {weak.map((w) => (
                <Pressable key={w.id} onPress={() => setPractice({ topic: w })}>
                  <Card>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text style={s.hwTitle}>{w.title}</Text>
                      <Text style={s.xp}>{w.accuracy}%</Text>
                    </Row>
                    <Muted>{w.grade} класс · решено {w.total}, верно {w.accuracy}% — нажми, чтобы повторить</Muted>
                  </Card>
                </Pressable>
              ))}
            </>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon name="trophy" size={44} />
            <Heading>Рейтинг</Heading>
          </View>
          <Row style={{ marginBottom: 6 }}>
            <Chip label="За неделю" active={period === 'week'} onPress={() => setPeriod('week')} />
            <Chip label="За всё время" active={period === 'all'} onPress={() => setPeriod('all')} />
          </Row>
          {board && period === 'week' && (
            <Card>
              <RichText style={s.big}>⭐ {board.myWeekXp} XP за 7 дней</RichText>
              <Muted>Опыт за верные ответы и игры за последнюю неделю.</Muted>
            </Card>
          )}
          {!board ? (
            <Muted>Загрузка…</Muted>
          ) : !board.classroom ? (
            <Card>
              <Muted>Рейтинг класса появляется, когда вы вступаете в класс. Введите код от учителя во вкладке «Профиль».</Muted>
            </Card>
          ) : (
            (period === 'week' ? board.weekRows : board.rows).map((r, i) => (
              <Card key={`${r.name}-${i}`} style={r.me ? { borderColor: colors.primary, backgroundColor: '#E6F3FD' } : undefined}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <RichText style={s.hwTitle}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {r.name}
                    {r.me ? ' (вы)' : ''}
                  </RichText>
                  <RichText style={s.xp}>⭐ {r.xp}</RichText>
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
              Уровень {stats.level}: {stats.title}
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

          <EmailVerify user={user} onUser={onUser} />
          <Heading>Мой помощник</Heading>
          <Card style={{ alignItems: 'center' }}>
            <HeroPic hero={hero} pose="wave" size={130} />
            <Text style={s.big}>{HERO_NAMES[hero]}</Text>
            <Muted>Помощник выбирается по полу и классу.</Muted>
            <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
              <ProfileEditor user={user} onChange={onUser} />
            </View>
            <Button kind="secondary" title="Показать обучение" onPress={onTour} />
          </Card>

          <Heading>🏅 Значки</Heading>
          <Row style={{ marginBottom: 8 }}>
            {(stats.badges ?? []).map((b) => (
              <View key={b.id} style={[s.badge, !b.earned && { opacity: 0.35 }]}>
                <Emo e={b.emoji} size={46} />
                <Text style={s.badgeTitle}>{b.title}</Text>
                <Text style={s.badgeText}>{b.text}</Text>
              </View>
            ))}
          </Row>

          <Heading>Вступить в класс (по желанию)</Heading>
          <Muted>Занимайтесь и без класса. Код нужен, только если учитель дал вам его для домашних заданий.</Muted>
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
      <View style={{ height: 96 }} />
    </Screen>
    <View style={s.nav}>
      {NAV.map(([k, e, label]) => {
        const active = tab === k;
        return (
          <Pressable key={k} onPress={() => setTab(k)} style={[s.navItem, active && s.navActive]}>
            <Emo e={e} size={32} />
            {active && <Text style={s.navLabel}>{label}</Text>}
          </Pressable>
        );
      })}
    </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { backgroundColor: colors.primary, borderRadius: 28, padding: 18, marginBottom: 14 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff', overflow: 'hidden' },
  hello: { fontSize: 19, fontWeight: '800', color: '#fff' },
  lvl: { fontSize: 13, color: 'rgba(255,255,255,0.92)' },
  xpPill: { backgroundColor: '#fff', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  xpPillText: { fontWeight: '800', color: colors.cta },
  barHead: { height: 10, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 5, marginVertical: 12, overflow: 'hidden' },
  barHeadFill: { height: 10, backgroundColor: '#fff', borderRadius: 5 },
  nav: { position: 'absolute', left: 16, right: 16, bottom: 14, backgroundColor: colors.dark, borderRadius: 999, padding: 6, flexDirection: 'row', justifyContent: 'space-around', maxWidth: 460, alignSelf: 'center', width: '92%' },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  navActive: { backgroundColor: colors.primary },
  navLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  xp: { fontSize: 18, fontWeight: '800', color: colors.accent },
  hwTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  big: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
  bar: { height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: 12, backgroundColor: colors.primary },
  heroCard: { flex: 1, alignItems: 'center', padding: 8, borderRadius: 18, borderWidth: 2, borderColor: colors.border, backgroundColor: '#fff', marginHorizontal: 3 },
  badge: { width: '31%', alignItems: 'center', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  badgeTitle: { fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center' },
  badgeText: { fontSize: 10, color: colors.muted, textAlign: 'center' },
});
