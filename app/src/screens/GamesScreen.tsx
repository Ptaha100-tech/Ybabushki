import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, errMsg, LightningTask, SubjectMeta } from '../api';
import { HeroPic, Icon, Scene, RichText } from '../Art';
import { useHero } from '../heroes';
import { play } from '../sound';
import { KidTask, KID_WORDS, makeBasketTasks, makeCountTasks, shuffled } from '../kids';
import { Button, Card, Chip, colors, ErrorText, Heading, Muted, Row, Screen, Title } from '../ui';

type Game = 'lightning' | 'memory' | 'balloons' | 'truefalse' | 'baskets' | 'count' | 'words' | null;

export default function GamesScreen({ grade, onClose }: { grade?: number | null; onClose: () => void }) {
  const [game, setGame] = useState<Game>(null);
  const [subjects, setSubjects] = useState<SubjectMeta[]>([]);
  const [subject, setSubject] = useState<string | undefined>(undefined);

  useEffect(() => {
    api.catalog().then((c) => setSubjects(c.subjects)).catch(() => undefined);
  }, []);

  if (game === 'lightning') return <Lightning subject={subject} grade={grade ?? undefined} onClose={() => setGame(null)} />;
  if (game === 'words') return <WordBuilder onClose={() => setGame(null)} />;
  if (game === 'balloons' || game === 'truefalse' || game === 'baskets' || game === 'count') return <KidGame mode={game} subject={subject} grade={grade ?? undefined} onClose={() => setGame(null)} />;
  if (game === 'memory') return <Memory subject={subject} grade={grade ?? undefined} onClose={() => setGame(null)} />;

  const card = (icon: React.ReactNode, title: string, text: string, g: Game) => (
    <Card key={title}>
      <Row style={{ flexWrap: 'nowrap' }}>{icon}<Heading>{title}</Heading></Row>
      <Muted>{text}</Muted>
      <Button title="Играть" onPress={() => setGame(g)} />
    </Card>
  );
  const kids = (
    <View key="kids">
      <Heading>🧒 Малышам: слова, счёт и порядок</Heading>
      <Muted>Яркие игры с картинками для 1–4 классов.</Muted>
      {card(null, '🔤 Собери слово', 'Посмотри на картинку и собери слово из букв. Нажимай буквы по порядку!', 'words')}
      {card(null, '🧺 Разложи по корзинкам', 'Животные или растения? Фрукты или овощи? Выбери, в какую корзинку положить.', 'baskets')}
      {card(null, '🍎 Считаем картинки', 'Посчитай яблоки, звёздочки и рыбок: сколько всего и сколько осталось?', 'count')}
    </View>
  );
  const know = (
    <View key="know">
      <Heading>🧠 Знания по школьным предметам</Heading>
      <Muted>Вопросы берутся из выбранного предмета и твоего класса. Предмет:</Muted>
      <Row style={{ marginBottom: 12 }}>
        <Chip label="Любой" active={!subject} onPress={() => setSubject(undefined)} />
        {subjects.map((x) => (
          <Chip key={x.key} label={`${x.emoji} ${x.title}`} active={subject === x.key} onPress={() => setSubject(x.key)} />
        ))}
      </Row>
      {card(<Icon name="bulb" size={40} />, 'Молния', '60 секунд. Отвечай на вопросы как можно быстрее. Серия верных ответов даёт бонус!', 'lightning')}
      {card(<Icon name="magnifier" size={40} />, 'Найди пару', 'Переворачивай карточки и находи пары: понятие и его значение. Чем меньше ходов, тем больше XP.', 'memory')}
      {card(null, '🎈 Лопни шарик', 'Прочитай вопрос и лопни шарик с верным ответом. У тебя 3 жизни ❤️.', 'balloons')}
      {card(null, '👍 Правда или неправда?', 'Прочитай утверждение и реши: правда это или нет.', 'truefalse')}
    </View>
  );
  const young = (grade ?? 5) <= 4;
  return (
    <Screen>
      <Button kind="secondary" title="← Назад" onPress={onClose} />
      <Title>🎮 Игры</Title>
      <Muted>Игры дают опыт (XP), но не тратят бесплатный лимит заданий. За день можно получить до 100 XP за игры.</Muted>
      {young ? [kids, know] : [know, kids]}
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
      play('win');
      api.gameResult('lightning', score).then((r) => setAward(r.xp)).catch(() => setAward(0));
    }
  }, [finished, score]);

  const task = tasks?.[idx];

  const answer = (given: string) => {
    if (!task || flash) return;
    const norm = (x: string) => x.trim().replace(',', '.').toLowerCase();
    const ok = norm(given) === norm(task.answer) || (!Number.isNaN(Number(norm(given))) && norm(given) !== '' && Number(norm(given)) === Number(norm(task.answer)));
    setFlash(ok ? 'good' : 'bad');
    play(ok ? 'correct' : 'wrong');
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
          <Scene name="jump" width={200} ratio={1.09} />
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
        <RichText style={s.timer}>🔥 x{combo}</RichText>
        <RichText style={s.timer}>⭐ {score}</RichText>
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

const BALLOON_COLORS = ['#FF6B6B', '#4DABF7', '#FFD43B', '#69DB7C'];

/** Игры для малышей: «Лопни шарик» (4 разноцветных шарика) и «Правда или неправда» (две большие кнопки). 3 жизни. */
function KidGame({ mode, subject, grade, onClose }: { mode: 'balloons' | 'truefalse' | 'baskets' | 'count'; subject?: string; grade?: number; onClose: () => void }) {
  const [tasks, setTasks] = useState<(LightningTask | KidTask)[] | null>(null);
  const [error, setError] = useState('');
  const [idx, setIdx] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [flash, setFlash] = useState<{ ok: boolean; picked: string } | null>(null);
  const [award, setAward] = useState<number | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (mode === 'baskets') {
      setTasks(makeBasketTasks());
      return;
    }
    if (mode === 'count') {
      setTasks(makeCountTasks(grade ?? 2));
      return;
    }
    api
      .lightning(subject, grade, mode === 'balloons' ? 'choice' : 'tf')
      .then((r) => setTasks(r.tasks.slice(0, 25)))
      .catch((e) => setError(errMsg(e)));
  }, [subject, grade, mode]);

  const finished = !!tasks && (lives <= 0 || idx >= tasks.length);
  useEffect(() => {
    if (finished && !sent.current) {
      sent.current = true;
      play(lives > 0 ? 'win' : 'lose');
      api.gameResult(mode, score).then((r) => setAward(r.xp)).catch(() => setAward(0));
    }
  }, [finished, score, mode]);

  const task = tasks?.[idx];
  const norm = (x: string) => x.trim().toLowerCase();

  const pick = (o: string) => {
    if (!task || flash) return;
    const ok = norm(o) === norm(task.answer);
    play(ok ? 'correct' : 'wrong');
    setFlash({ ok, picked: o });
    if (ok) {
      const c = combo + 1;
      setCombo(c);
      setCorrect((n) => n + 1);
      setScore((n) => n + 4 + Math.min(c - 1, 4));
    } else {
      setCombo(0);
      setLives((l) => l - 1);
    }
    setTimeout(() => {
      setFlash(null);
      setIdx((i) => i + 1);
    }, ok ? 650 : 1500);
  };

  const back = <Button kind="secondary" title="← Назад" onPress={onClose} />;
  if (error) return <Screen>{back}<ErrorText text={error} /></Screen>;
  if (!tasks) return <Screen><ActivityIndicator size="large" color={colors.primary} /></Screen>;
  if (tasks.length === 0) return <Screen>{back}<Muted>Для этого предмета и класса пока нет подходящих вопросов — выбери «Любой» предмет.</Muted></Screen>;

  if (finished)
    return (
      <Screen>
        <Title>{lives > 0 ? '🎉 Ты прошёл(а) всё!' : '💔 Жизни закончились'}</Title>
        <Card>
          <Scene name="jump" width={200} ratio={1.09} />
          <Text style={s.big}>{correct} верных</Text>
          <Muted>Звёзды: {score}</Muted>
          <Muted>{award === null ? 'Считаем награду…' : award > 0 ? `Награда: +${award} XP` : 'Дневной лимит опыта за игры достигнут — приходи завтра!'}</Muted>
          <Button title="Закрыть" onPress={onClose} />
        </Card>
      </Screen>
    );

  const opts = (task?.options ?? []).slice(0, 4);
  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <RichText style={s.timer}>{'❤️'.repeat(lives) || '💔'}</RichText>
        <RichText style={s.timer}>🔥 x{combo}</RichText>
        <RichText style={s.timer}>⭐ {score}</RichText>
      </Row>
      <Card style={flash ? { backgroundColor: flash.ok ? colors.goodBg : colors.badBg } : undefined}>
        <Text style={s.q}>{task?.prompt}</Text>
        {flash && !flash.ok ? <Text style={s.wrongNote}>Правильно: {task?.answer}</Text> : null}
      </Card>
      {mode === 'baskets' ? (
        <View style={{ gap: 12 }}>
          {opts.map((o, i) => {
            const right = flash && norm(o) === norm(task!.answer);
            return (
              <Pressable key={o} onPress={() => pick(o)} style={{ minHeight: 84, borderRadius: 24, backgroundColor: i === 0 ? '#74C0FC' : '#FFC078', alignItems: 'center', justifyContent: 'center', borderWidth: right ? 5 : 0, borderColor: '#2F9E44' }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#1b1b1b' }}>{o}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : mode === 'balloons' || mode === 'count' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          {opts.map((o, i) => {
            const isRight = flash && norm(o) === norm(task!.answer);
            const isWrongPick = flash && !flash.ok && o === flash.picked;
            return (
              <Pressable
                key={o}
                onPress={() => pick(o)}
                style={{
                  width: '44%', minHeight: 110, borderRadius: 60, backgroundColor: BALLOON_COLORS[i % 4], alignItems: 'center', justifyContent: 'center', padding: 14,
                  opacity: isWrongPick ? 0.35 : 1, borderWidth: isRight ? 5 : 0, borderColor: '#2F9E44',
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1b1b1b', textAlign: 'center' }}>{flash && isWrongPick ? '💥' : o}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {['Верно', 'Неверно'].map((o) => {
            const right = flash && norm(o) === norm(task!.answer);
            return (
              <Pressable
                key={o}
                onPress={() => pick(o)}
                style={{ minHeight: 84, borderRadius: 24, backgroundColor: o === 'Верно' ? '#69DB7C' : '#FF8787', alignItems: 'center', justifyContent: 'center', borderWidth: right ? 5 : 0, borderColor: '#2F9E44' }}
              >
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#1b1b1b' }}>{o === 'Верно' ? '👍 Правда' : '👎 Неправда'}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <Button kind="secondary" title="Закончить" onPress={() => setLives(0)} />
    </Screen>
  );
}

/** «Собери слово»: картинка + буквы вперемешку. */
function WordBuilder({ onClose }: { onClose: () => void }) {
  const [words] = useState(() => shuffled(KID_WORDS).slice(0, 8));
  const [idx, setIdx] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]); // индексы букв в порядке выбора
  const [flash, setFlash] = useState<'good' | 'bad' | null>(null);
  const [award, setAward] = useState<number | null>(null);
  const sent = useRef(false);
  const cur = words[idx];
  const letters = React.useMemo(() => (cur ? shuffled(cur.word.split('')) : []), [cur]);
  const finished = lives <= 0 || idx >= words.length;

  useEffect(() => {
    if (finished && !sent.current) {
      sent.current = true;
      play('win');
      api.gameResult('words', score).then((r) => setAward(r.xp)).catch(() => setAward(0));
    }
  }, [finished, score]);

  const tap = (i: number) => {
    if (flash || placed.includes(i)) return;
    play('click');
    const next = [...placed, i];
    setPlaced(next);
    if (next.length === cur.word.length) {
      const ok = next.map((k) => letters[k]).join('') === cur.word;
      setFlash(ok ? 'good' : 'bad');
      play(ok ? 'correct' : 'wrong');
      if (ok) {
        setScore((n) => n + 5);
        setCorrect((n) => n + 1);
      } else setLives((l) => l - 1);
      setTimeout(() => {
        setFlash(null);
        setPlaced([]);
        if (ok) setIdx((x) => x + 1);
      }, ok ? 700 : 1200);
    }
  };

  if (finished)
    return (
      <Screen>
        <Title>{lives > 0 ? '🎉 Все слова собраны!' : '💔 Жизни закончились'}</Title>
        <Card>
          <Scene name="jump" width={200} ratio={1.09} />
          <Text style={s.big}>{correct} слов</Text>
          <Muted>{award === null ? 'Считаем награду…' : award > 0 ? `Награда: +${award} XP` : 'Дневной лимит опыта за игры достигнут — приходи завтра!'}</Muted>
          <Button title="Закрыть" onPress={onClose} />
        </Card>
      </Screen>
    );

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <RichText style={s.timer}>{'❤️'.repeat(lives)}</RichText>
        <RichText style={s.timer}>⭐ {score}</RichText>
      </Row>
      <Card style={flash ? { backgroundColor: flash === 'good' ? colors.goodBg : colors.badBg } : undefined}>
        <Text style={{ fontSize: 80, textAlign: 'center' }}>{cur.emoji}</Text>
        <Row style={{ justifyContent: 'center', gap: 6, marginVertical: 10 }}>
          {cur.word.split('').map((_, i) => (
            <Pressable key={i} onPress={() => !flash && setPlaced(placed.slice(0, i))} style={{ width: 38, height: 46, borderBottomWidth: 3, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>{placed[i] !== undefined ? letters[placed[i]] : ''}</Text>
            </Pressable>
          ))}
        </Row>
        {flash === 'bad' ? <Text style={s.wrongNote}>Правильно: {cur.word}</Text> : null}
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
        {letters.map((l, i) => (
          <Pressable key={i} onPress={() => tap(i)} style={{ width: 54, height: 60, borderRadius: 16, backgroundColor: placed.includes(i) ? '#E5E7EB' : '#FFD43B', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: placed.includes(i) ? '#9CA3AF' : '#1b1b1b' }}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <Button kind="secondary" title="Закончить" onPress={() => setLives(0)} />
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
      play(lives > 0 ? 'win' : 'lose');
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
              <RichText style={[s.memText, !shown && { fontSize: 28 }]}>{shown ? c.text : '❓'}</RichText>
            </Pressable>
          );
        })}
      </View>
      {finished && (
        <Card>
          <Scene name="jump" width={200} ratio={1.09} />
          <RichText style={s.big}>Все пары найдены! 🎉</RichText>
          <Muted>{award === null ? 'Считаем награду…' : award > 0 ? `Награда: +${award} XP` : 'Дневной лимит опыта за игры достигнут — приходи завтра!'}</Muted>
          <Button title="Закрыть" onPress={onClose} />
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  wrongNote: { marginTop: 8, fontSize: 16, fontWeight: '700', color: colors.bad },
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
