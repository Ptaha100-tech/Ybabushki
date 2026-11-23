import React, { useCallback, useEffect, useState } from 'react';
import { api, errMsg, HomeworkItem, Stats, Topic, User } from '../api';
import { Button, Card, ErrorText, Field, Heading, InfoText, Muted, Row, Screen, Title } from '../ui';
import PracticeScreen from './PracticeScreen';

export default function StudentScreen({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [practice, setPractice] = useState<{ topic: Topic; homeworkId?: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, t, h] = await Promise.all([api.stats(), api.topics(), api.myHomework()]);
      setStats(s);
      setTopics(t);
      setHomework(h);
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    if (!practice) load();
  }, [practice, load]);

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

  if (practice) {
    return (
      <PracticeScreen
        topic={practice.topic}
        homeworkId={practice.homeworkId}
        onClose={() => setPractice(null)}
      />
    );
  }

  const topicById = (id: string) => topics.find((t) => t.id === id);

  return (
    <Screen>
      <Title>Привет, {user.name}!</Title>

      {stats && (
        <Card>
          <Row>
            <Muted>⭐ {stats.xp} XP</Muted>
            <Muted>🔥 серия: {stats.dayStreak} дн.</Muted>
            <Muted>✅ верных: {stats.accuracy}%</Muted>
          </Row>
          <Muted>
            {stats.remaining === null
              ? 'Безлимитные занятия включены'
              : `Бесплатных заданий осталось сегодня: ${stats.remaining}`}
          </Muted>
          <Muted>
            Ваш код для родителей: <Muted style={{ fontWeight: '800' }}>{user.linkCode}</Muted>
          </Muted>
        </Card>
      )}

      {homework.length > 0 && (
        <>
          <Heading>Домашние задания</Heading>
          {homework.map((h) => {
            const topic = topicById(h.topicId);
            return (
              <Card key={h.id}>
                <Heading>{h.topicTitle}</Heading>
                <Muted>Решено: {h.done}</Muted>
                {topic && (
                  <Button title="Выполнять" onPress={() => setPractice({ topic, homeworkId: h.id })} />
                )}
              </Card>
            );
          })}
        </>
      )}

      <Heading>Темы</Heading>
      {topics.map((t) => (
        <Card key={t.id}>
          <Heading>{t.title}</Heading>
          <Muted>{t.grade} класс</Muted>
          <Button title="Тренироваться" onPress={() => setPractice({ topic: t })} />
        </Card>
      ))}

      <Heading>Вступить в класс</Heading>
      <Card>
        <Field label="Код от учителя" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="ABC123" />
        <ErrorText text={error} />
        <InfoText text={info} />
        <Button title="Вступить" onPress={join} disabled={!code.trim()} />
      </Card>

      <Button kind="secondary" title="Выйти" onPress={onLogout} />
    </Screen>
  );
}
