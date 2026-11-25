import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, errMsg, LightningTask, SubjectMeta } from '../api';
import { HeroPic, Icon } from '../Art';
import { useHero } from '../heroes';
import { Button, Card, Chip, colors, ErrorText, Heading, Muted, Row, Screen, Title } from '../ui';

type Game = 'lightning' | 'memory' | null;

export default function GamesScreen({ grade, onClose }: { grade?: number | null; onClose: () => void }) {
  const [game, setGame] = useState<Game>(null);
  const [subjects, setSubjects] = useState<SubjectMeta[]>([]);
  const [subject, setSubject] = useState<string | undefined>(undefined);

  useEffect(() => {
    api.catalog().then((c) => setSubjects(c.subjects)).catch(() => undefined);
  }, []);

  if (game === 'lightning') return <Lightning subject={subject} grade={grade ?? undefined} onClose={() => setGame(null)} />;
  if (game === 'memory') return <Memory subject={subject} grade={grade ?? undefined} onClose={() => setGame(null)} />;

  return (
    <Screen>
      <Button kind="secondary" title="← Назад" onPress={onClose} />
      <Title>🎮 Игры</Title>
      <Muted>Игры дают опыт (XP), но не тратят бесплатный лимит заданий. За день можно получить до 100 XP за игры.</Muted>
      <Muted>Предмет для игр:</Muted>
      <Row style={{ marginBottom: 12 }}>
        <Chip label="Любой" active={!subject} onPress={() => setSubject(undefined)} />
        {subjects.map((s) => (
          <Chip key={s.key} label={`${s.emoji} ${s.title}`} active={subject === s.key} onPress={() => setSubject(s.key)} />
        ))}
      </Row>
      <Card>
        <Row style={{ flexWrap: 'nowrap' }}><Icon name="bulb" size={40} /><Heading>Молния</Heading></Row>
        <Muted>60 секунд. Отвечай на вопросы как можно быстрее. Серия верных ответов даёт бонус!</Muted>
        <Button title="Играть" onPress={() => setGame('lightning')} />
      </Card>
      <Card>
        <Row style={{ flexWrap: 'nowrap' }}><Icon name="magnifier" size={40} /><Heading>Найди пару</Heading></Row>
        <Muted>Переворачивай карточки и находи пары: понятие и его значение. Чем меньше ходов, тем больше XP.</Muted>
        <Button title="Играть" onPress={() => setGame('memory')} />
      </Card>
    </Screen>
  );
}

function Lightning({ subject, grade, onClose }: { subject?: string; grade?: number; onClose: () => void }) {
  const hero = useHero();
  const [tasks, setTasks] = useState<LightningTask[] | null>(null);
  const [error, setError] = useState('');
  const [idx, setIdx] = useState(0);
  const [time, setTime] = useState(60);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const [value, setValue] = useState('');
  const [finished, setFinished] = useState(false);
  const [award, setAward] = useState<number | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    api
      .lightning(subject, grade)
      .then((r) => setTasks(r.tasks))
      .catch((e) => setError(errMsg(e)));
  }, [subject, grade]);

  useEffect(() => {
    if (!tasks || finished) return;
    if (time <= 0) {
      setFinished(true);
      return;
    }
    const t = setTimeout(() => setTime((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [tasks, time, finished]);

  useEffect(() => {
    if (finished && !sent.current) {
      sent.current = true;
      api.gameResult('lightning', score).then((r) => setAward(r.xp)).catch(() => setAward(0));
    }
  }, [finished, score]);

  const task = tasks?.[idx];

  const answer = (given: string) => {
    if (!task || flash) return;
    const norm = (x: string) => x.trim().replace(',', '.').toLowerCase();
    const ok = norm(given) === norm(task.answer) || (!Number.isNaN(Number(norm(given))) && norm(given) !== '' && Number(norm(given)) === Number(norm(task.answer)));
    setFlash(ok ? 'good' : 'bad');
    if (ok) {
      const c = combo + 1;
      setCombo(c);
      setCorrect((n) => n + 1);
      setScore((n) => n + 3 + Math.min(c - 1, 5));
    } else setCombo(0);
    setTimeout(() => {
      setFlash(null);
      setValue('');
      if (tasks && idx + 1 >= tasks.length) setFinished(true);
      else setIdx((i) => i + 1);
    }, 450);
  };

  if (error) return <Screen><Button kind="secondary" title="← Назад" onPress={onClose} /><ErrorText text={error} /></Screen>;
  if (!tasks) return <Screen><ActivityIndicator size="large" color={colors.primary} /></Screen>;
  if (tasks.length === 0)
    return <Screen><Button kind="secondary" title="← Назад" onPress={onClose} /><Muted>Для этого предмета и класса пока нет быстрых вопросов.</Muted></Screen>;

  if (finished)
    return (
      <Screen>
        <Title>⚡ Время вышло!</Title>
        <Card>
          <HeroPic hero={hero} pose="thumbs" size={130} />
          <Text style={s.big}>{correct} верных</Text>
          <Muted>Очки: {score}</Muted>
          <Muted>{award === null ? 'Считаем награду…' : award > 0 ? `Награда: +${award} XP` : 'Дневной лимит опыта за игры достигнут — приходи завтра!'}</Muted>
          <Button title="Закрыть" onPress={onClose} />
        </Card>
      </Screen>
    );

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={s.timer}>⏱ {time}</Text>
        <Text style={s.timer}>🔥 x{combo}</Text>
        <Text style={s.timer}>⭐ {score}</Text>
      </Row>
      <Card style={flash === 'good' ? { backgroundColor: colors.goodBg } : flash === 'bad' ? { backgroundColor: colors.badBg } : undefined}>
        <Text style={s.q}>{task?.prompt}</Text>
        {task?.options ? (
          task.options.map((o) => (
            <Pressable key={o} style={s.opt} onPress={() => answer(o)}>
              <Text style={s.optText}>{o}</Text>
            </Pressable>
          ))
        ) : (
          <NumberInput value={value} onChange={setValue} onSubmit={() => value.trim() && answer(value)} />
        )}
      </Card>
      <Button kind="secondary" title="Закончить" onPress={() => setFinished(true)} />
    </Screen>
  );
}

function NumberInput({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        autoFocus
        placeholder="Ответ"
        onSubmitEditing={onSubmit}
        style={s.numInput}
      />
      <Button title="Ответить" onPress={onSubmit} disabled={!value.trim()} />
    </View>
  );
}

interface CardItem {
  key: string;
  text: string;
  pair: number;
}

function Memory({ subject, grade, onClose }: { subject?: string; grade?: number; onClose: () => void }) {
  const hero = useHero();
  const [cards, setCards] = useState<CardItem[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [award, setAward] = useState<number | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    api
      .memory(subject, grade)
      .then((r) => {
        const list: CardItem[] = [];
        r.pairs.forEach(([l, rt], i) => {
          list.push({ key: `l${i}`, text: l, pair: i }, { key: `r${i}`, text: rt, pair: i });
        });
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        setCards(list);
      })
      .catch((e) => setError(errMsg(e)));
  }, [subject, grade]);

  const total = cards ? cards.length / 2 : 0;
  const finished = total > 0 && found.size === total;

  useEffect(() => {
    if (finished && !sent.current) {
      sent.current = true;
      const score = Math.max(10, 40 - Math.max(0, moves - total) * 2);
      api.gameResult('memory', score).then((r) => setAward(r.xp)).catch(() => setAward(0));
    }
  }, [finished, moves, total]);

  const flip = (i: number) => {
    if (!cards || open.length >= 2 || open.includes(i) || found.has(cards[i].pair)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a].pair === cards[b].pair) {
        setTimeout(() => {
          setFound((f) => new Set([...f, cards[a].pair]));
          setOpen([]);
        }, 500);
      } else setTimeout(() => setOpen([]), 900);
    }
  };

  if (error) return <Screen><Button kind="secondary" title="← Назад" onPress={onClose} /><ErrorText text={error} /></Screen>;
  if (!cards) return <Screen><ActivityIndicator size="large" color={colors.primary} /></Screen>;
  if (cards.length === 0)
    return <Screen><Button kind="secondary" title="← Назад" onPress={onClose} /><Muted>Для этого предмета и класса пока нет пар.</Muted></Screen>;

  return (
    <Screen>
      <Button kind="secondary" title="← Назад" onPress={onClose} />
      <Title>🃏 Найди пару</Title>
      <Muted>Ходов: {moves} · найдено пар: {found.size} из {total}</Muted>
      <View style={s.grid}>
        {cards.map((c, i) => {
          const shown = open.includes(i) || found.has(c.pair);
          return (
            <Pressable key={c.key} onPress={() => flip(i)} style={[s.memCard, shown && s.memShown, found.has(c.pair) && { backgroundColor: colors.goodBg, borderColor: colors.good }]}>
              <Text style={[s.memText, !shown && { fontSize: 28 }]}>{shown ? c.text : '❓'}</Text>
            </Pressable>
          );
        })}
      </View>
      {finished && (
        <Card>
          <HeroPic hero={hero} pose="thumbs" size={130} />
          <Text style={s.big}>Все пары найдены! 🎉</Text>
          <Muted>{award === null ? 'Считаем награду…' : award > 0 ? `Награда: +${award} XP` : 'Дневной лимит опыта за игры достигнут — приходи завтра!'}</Muted>
          <Button title="Закрыть" onPress={onClose} />
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  timer: { fontSize: 22, fontWeight: '800', color: colors.text },
  q: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center', marginVertical: 16 },
  opt: { borderWidth: 2, borderColor: colors.border, borderRadius: 12, padding: 14, marginVertical: 5, backgroundColor: '#fff' },
  optText: { fontSize: 18, fontWeight: '700', textAlign: 'center', color: colors.text },
  numInput: { borderWidth: 2, borderColor: colors.border, borderRadius: 12, padding: 12, fontSize: 24, textAlign: 'center', marginBottom: 8, color: colors.text, backgroundColor: '#fff' },
  big: { fontSize: 30, fontWeight: '800', color: colors.primary, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginVertical: 12 },
  memCard: { width: '47%', minHeight: 84, borderRadius: 12, borderWidth: 2, borderColor: colors.border, backgroundColor: '#CFE8F9', alignItems: 'center', justifyContent: 'center', padding: 8 },
  memShown: { backgroundColor: '#fff', borderColor: colors.primary },
  memText: { fontSize: 15, fontWeight: '700', textAlign: 'center', color: colors.text },
});
