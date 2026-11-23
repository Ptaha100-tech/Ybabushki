import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { AnswerResult, api, ApiError, errMsg, NextTask, Topic } from '../api';
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
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNext = useCallback(
    async (exclude?: string) => {
      setLoading(true);
      setError('');
      setResult(null);
      setPicked(null);
      setValue('');
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
      setResult(await api.answer(item.task.id, answer, homeworkId));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'LIMIT_REACHED') setLimit(true);
      else setError(errMsg(e));
    }
  };

  const task = item?.task;

  return (
    <Screen>
      <Button kind="secondary" title="← К темам" onPress={onClose} />
      <Title>{topic.title}</Title>

      {limit ? (
        <Card>
          <Text style={s.limitTitle}>Бесплатные задания на сегодня закончились</Text>
          <Muted>
            Завтра лимит обновится. Домашние задания от учителя можно выполнять без ограничений, а родитель может
            включить безлимитные занятия в своём кабинете.
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

          <Text style={s.prompt}>{task.prompt}</Text>

          {task.type === 'choice' && task.options ? (
            <>
              {task.options.map((opt) => {
                const isPicked = picked === opt;
                const showGood = result && result.correct && isPicked;
                const showBad = result && !result.correct && isPicked;
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
                      showGood && { backgroundColor: colors.goodBg, borderColor: colors.good },
                      showBad && { backgroundColor: colors.badBg, borderColor: colors.bad },
                    ]}
                  >
                    <Text style={s.optionText}>{opt}</Text>
                  </Pressable>
                );
              })}
            </>
          ) : (
            <>
              <Field
                value={value}
                onChangeText={setValue}
                keyboardType="numeric"
                placeholder="Ваш ответ"
                editable={!result}
                onSubmitEditing={() => value.trim() && submit(value)}
              />
              {!result && <Button title="Проверить" onPress={() => submit(value)} disabled={!value.trim()} />}
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
                <Text style={[s.resultTitle, { color: colors.good }]}>Верно! +10 XP</Text>
              ) : (
                <>
                  <Text style={[s.resultTitle, { color: colors.bad }]}>
                    Неверно. Правильный ответ: {result.correctAnswer}
                  </Text>
                  {result.hint ? <Muted>Подсказка: {result.hint}</Muted> : null}
                </>
              )}
              <Muted>
                ⭐ {result.xp} XP · 🔥 {result.dayStreak} дн.
              </Muted>
              <Button title="Дальше" onPress={() => fetchNext(task.id)} />
            </Card>
          )}
        </Card>
      ) : null}

      <ErrorText text={error} />
    </Screen>
  );
}

const s = StyleSheet.create({
  prompt: { fontSize: 36, fontWeight: '800', color: colors.text, textAlign: 'center', marginVertical: 20 },
  option: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginVertical: 5,
    backgroundColor: '#fff',
  },
  optionText: { fontSize: 22, fontWeight: '700', textAlign: 'center', color: colors.text },
  resultTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  limitTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
});
