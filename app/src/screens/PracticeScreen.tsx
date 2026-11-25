import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AnswerResult, api, ApiError, errMsg, NextTask, Topic } from '../api';
import { HeroPic, RichText } from '../Art';
import { useHero } from '../heroes';
import { Button, Card, colors, ErrorText, Field, Muted, Row, Screen, Title } from '../ui';

/**
 * «Проигрыватель» заданий. Задание приходит как данные (тип, текст, варианты),
 * поэтому один и тот же экран работает на сайте, iOS и Android.
 */
export default function PracticeScreen({
  topic,
  homeworkId,
  onClose,
}: {
  topic: Topic;
  homeworkId?: string;
  onClose: () => void;
}) {
  const [item, setItem] = useState<NextTask | null>(null);
  const [value, setValue] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]); // выбранные элементы по порядку
  const [pairs, setPairs] = useState<Record<string, string>>({}); // left -> right
  const [activeLeft, setActiveLeft] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(0);
  const [right, setRight] = useState(0);
  const hero = useHero();

  const fetchNext = useCallback(
    async (exclude?: string) => {
      setLoading(true);
      setError('');
      setResult(null);
      setPicked(null);
      setValue('');
      setOrder([]);
      setPairs({});
      setActiveLeft(null);
      try {
        setItem(await api.nextTask(topic.id, homeworkId, exclude));
      } catch (e) {
        if (e instanceof ApiError && e.code === 'LIMIT_REACHED') setLimit(true);
        else setError(errMsg(e));
      } finally {
        setLoading(false);
      }
    },
    [topic.id, homeworkId],
  );

  useEffect(() => {
    fetchNext();
  }, [fetchNext]);

  const submit = async (answer: string) => {
    if (!item || result) return;
    setError('');
    try {
      const r = await api.answer(item.task.id, answer, homeworkId);
      setResult(r);
      setDone((n) => n + 1);
      if (r.correct) setRight((n) => n + 1);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'LIMIT_REACHED') setLimit(true);
      else setError(errMsg(e));
    }
  };

  const task = item?.task;
  const long = (task?.prompt.length ?? 0) > 40;

  return (
    <Screen>
      <Button kind="secondary" title="← К темам" onPress={onClose} />
      <Title>{topic.title}</Title>
      {done > 0 && (
        <Muted>
          Сегодня в этой теме: {right} из {done} верно
        </Muted>
      )}

      {limit ? (
        <Card>
          <Text style={s.limitTitle}>Бесплатные задания на сегодня закончились</Text>
          <Muted>
            Завтра лимит обновится. Можно поиграть в игры (они дают опыт), а домашние задания от учителя решаются без
            ограничений. Родитель может включить безлимит в своём кабинете.
          </Muted>
          <Button title="Вернуться" onPress={onClose} />
        </Card>
      ) : loading && !task ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : task ? (
        <Card>
          <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <Muted>Уровень {item?.level} из 5</Muted>
            <Muted>
              {(result ? result.remaining : item?.remaining) === null
                ? 'Безлимит'
                : `Осталось сегодня: ${result ? result.remaining : item?.remaining}`}
            </Muted>
          </Row>

          <Text style={[s.prompt, long && s.promptLong]}>{task.prompt}</Text>

          {task.type === 'choice' && task.options && (
            <View>
              {task.options.map((opt) => {
                const isPicked = picked === opt;
                const isRight = !!result && !result.correct && result.correctAnswer === opt;
                return (
                  <Pressable
                    key={opt}
                    disabled={!!result}
                    onPress={() => {
                      setPicked(opt);
                      submit(opt);
                    }}
                    style={[
                      s.option,
                      result && result.correct && isPicked && s.optGood,
                      result && !result.correct && isPicked && s.optBad,
                      isRight && s.optGood,
                    ]}
                  >
                    <Text style={[s.optionText, task.options!.length === 2 && { fontSize: 20 }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {(task.type === 'number' || task.type === 'text') && (
            <>
              <Field
                value={value}
                onChangeText={setValue}
                keyboardType={task.type === 'number' ? 'numeric' : 'default'}
                placeholder="Ваш ответ"
                autoCapitalize="none"
                editable={!result}
                onSubmitEditing={() => value.trim() && submit(value)}
              />
              {!result && <Button title="Проверить" onPress={() => submit(value)} disabled={!value.trim()} />}
            </>
          )}

          {task.type === 'order' && task.items && (
            <>
              <Muted>Нажимай элементы по порядку. Нажми на выбранный, чтобы убрать.</Muted>
              <Row style={{ minHeight: 48, marginBottom: 10, padding: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: '#F3F9FE' }}>
                {order.length === 0 && <Muted>Здесь появится ответ…</Muted>}
                {order.map((it, i) => (
                  <Pressable key={`${it}-${i}`} disabled={!!result} onPress={() => setOrder(order.filter((_, k) => k !== i))} style={s.tokenPicked}>
                    <Text style={s.tokenText}>
                      {i + 1}. {it}
                    </Text>
                  </Pressable>
                ))}
              </Row>
              <Row style={{ marginBottom: 8 }}>
                {task.items.map((it, i) => {
                  const used = countIn(order, it) >= countIn(task.items!.slice(0, i + 1), it);
                  return (
                    <Pressable key={`${it}-${i}`} disabled={used || !!result} onPress={() => setOrder([...order, it])} style={[s.token, used && { opacity: 0.3 }]}>
                      <Text style={s.tokenText}>{it}</Text>
                    </Pressable>
                  );
                })}
              </Row>
              {!result && (
                <Row>
                  <Button kind="secondary" title="Сбросить" onPress={() => setOrder([])} disabled={order.length === 0} />
                  <Button title="Проверить" onPress={() => submit(order.join('|'))} disabled={order.length !== task.items.length} />
                </Row>
              )}
            </>
          )}

          {task.type === 'match' && task.lefts && task.rights && (
            <>
              <Muted>Выбери элемент слева, затем его пару справа.</Muted>
              {task.lefts.map((l) => {
                const chosen = pairs[l];
                const isRightPair = !!result && result.correct;
                return (
                  <Pressable key={l} disabled={!!result} onPress={() => setActiveLeft(l === activeLeft ? null : l)} style={[s.matchLeft, activeLeft === l && { borderColor: colors.primary, backgroundColor: '#E6F3FD' }, isRightPair && s.optGood]}>
                    <Text style={s.tokenText}>{l}</Text>
                    <Text style={[s.tokenText, { color: colors.primary, fontWeight: '800' }]}>{chosen ? `→ ${chosen}` : '→ ?'}</Text>
                  </Pressable>
                );
              })}
              <Row style={{ marginTop: 8 }}>
                {task.rights.map((rt) => {
                  const usedBy = Object.keys(pairs).find((k) => pairs[k] === rt);
                  return (
                    <Pressable
                      key={rt}
                      disabled={!!result || !activeLeft}
                      onPress={() => {
                        if (!activeLeft) return;
                        const next = { ...pairs };
                        for (const k of Object.keys(next)) if (next[k] === rt) delete next[k];
                        next[activeLeft] = rt;
                        setPairs(next);
                        const nextLeft = task.lefts!.find((l) => !next[l]);
                        setActiveLeft(nextLeft ?? null);
                      }}
                      style={[s.token, usedBy ? { opacity: 0.45 } : null]}
                    >
                      <Text style={s.tokenText}>{rt}</Text>
                    </Pressable>
                  );
                })}
              </Row>
              {!result && (
                <Row style={{ marginTop: 8 }}>
                  <Button kind="secondary" title="Сбросить" onPress={() => { setPairs({}); setActiveLeft(null); }} />
                  <Button title="Проверить" onPress={() => submit(task.lefts!.map((l) => `${l}=${pairs[l]}`).join('|'))} disabled={task.lefts.some((l) => !pairs[l])} />
                </Row>
              )}
            </>
          )}

          {result && (
            <Card
              style={{
                backgroundColor: result.correct ? colors.goodBg : colors.badBg,
                borderColor: result.correct ? colors.good : colors.bad,
                marginTop: 12,
              }}
            >
              {result.correct ? (
                <RichText style={[s.resultTitle, { color: colors.good }]}>Верно! 🎉 +10 XP</RichText>
              ) : (
                <>
                  <Text style={[s.resultTitle, { color: colors.bad }]}>Неверно. Правильный ответ: {result.correctAnswer}</Text>
                  {result.hint ? <Muted>Подсказка: {result.hint}</Muted> : null}
                </>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <HeroPic hero={hero} pose={result.correct ? 'thumbs' : 'think'} size={86} />
                <View style={{ flex: 1 }}>
                  {result.explanation ? <RichText style={s.explain}>💡 {result.explanation}</RichText> : null}
                </View>
              </View>
              <Muted>⭐ {result.xp} XP · 🔥 {result.dayStreak} дн.</Muted>
              <Button title="Дальше" onPress={() => fetchNext(task.id)} />
            </Card>
          )}
        </Card>
      ) : null}

      <ErrorText text={error} />
    </Screen>
  );
}

function countIn(arr: string[], v: string): number {
  let n = 0;
  for (const x of arr) if (x === v) n++;
  return n;
}

const s = StyleSheet.create({
  prompt: { fontSize: 34, fontWeight: '800', color: colors.text, textAlign: 'center', marginVertical: 16 },
  promptLong: { fontSize: 20, textAlign: 'left', lineHeight: 28, fontWeight: '700' },
  option: { borderWidth: 2, borderColor: colors.border, borderRadius: 12, padding: 14, marginVertical: 5, backgroundColor: '#fff' },
  optGood: { backgroundColor: colors.goodBg, borderColor: colors.good },
  optBad: { backgroundColor: colors.badBg, borderColor: colors.bad },
  optionText: { fontSize: 18, fontWeight: '700', textAlign: 'center', color: colors.text },
  token: { borderWidth: 2, borderColor: colors.border, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fff' },
  tokenPicked: { borderWidth: 2, borderColor: colors.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#E6F3FD' },
  tokenText: { fontSize: 16, fontWeight: '600', color: colors.text },
  matchLeft: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, borderWidth: 2, borderColor: colors.border, borderRadius: 10, padding: 12, marginVertical: 4, backgroundColor: '#fff' },
  resultTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  explain: { color: colors.text, marginVertical: 6, fontSize: 15, lineHeight: 21 },
  limitTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
});
