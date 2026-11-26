import EmailVerify from '../EmailVerify';
import MyTasks from '../MyTasks';
import { RichText } from '../Art';
import React, { useCallback, useEffect, useState } from 'react';
import { api, ClassDetail, ClassSummary, errMsg, Topic, User } from '../api';
import TopicBrowser from '../TopicBrowser';
import { Button, Card, Chip, ErrorText, Field, Heading, InfoText, Muted, Row, Screen, Title } from '../ui';

export default function TeacherScreen({ user, onLogout, onTour, onUser }: { user: User; onLogout: () => void; onUser?: (u: User) => void; onTour?: () => void }) {
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [name, setName] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setClasses(await api.myClasses());
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    if (!open) load();
  }, [open, load]);

  const create = async () => {
    setError('');
    try {
      await api.createClass(name);
      setName('');
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (open) return <ClassView id={open} onBack={() => setOpen(null)} />;

  return (
    <Screen>
      <Title>Здравствуйте, {user.name}</Title>
      <Heading>Мои классы</Heading>
      {classes.length === 0 && <Muted>Пока нет ни одного класса. Создайте первый ниже.</Muted>}
      {classes.map((c) => (
        <Card key={c.id}>
          <Heading>{c.name}</Heading>
          <Muted>
            Код для учеников: {c.code} · учеников: {c.students}
          </Muted>
          <Button title="Открыть" onPress={() => setOpen(c.id)} />
        </Card>
      ))}

      <Heading>Новый класс</Heading>
      <Card>
        <Field label="Название" value={name} onChangeText={setName} placeholder="Например, 2 «Б»" />
        <ErrorText text={error} />
        <Button title="Создать класс" onPress={create} disabled={!name.trim()} />
      </Card>

      <MyTasks />
      {onUser && <EmailVerify user={user} onUser={onUser} />}
      {onTour && <Button kind="secondary" title="Показать обучение" onPress={onTour} />}
      <Button kind="secondary" title="Выйти" onPress={onLogout} />
    </Screen>
  );
}

function ClassView({ id, onBack }: { id: string; onBack: () => void }) {
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    try {
      const [d, t] = await Promise.all([api.classDetail(id), api.topics()]);
      setDetail(d);
      setTopics(t);
    } catch (e) {
      setError(errMsg(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const assign = async () => {
    if (!topicId) return;
    setError('');
    setInfo('');
    try {
      const r = await api.assignHomework(id, topicId);
      setInfo(`Выдано домашнее задание: ${r.topicTitle}`);
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <Screen>
      <Button kind="secondary" title="← Все классы" onPress={onBack} />
      {detail && (
        <>
          <Title>{detail.name}</Title>
          <Card>
            <Muted>Ученики вводят этот код после регистрации:</Muted>
            <Title>{detail.code}</Title>
          </Card>

          <Heading>Ученики</Heading>
          {detail.students.length === 0 && <Muted>Пока никто не вступил в класс.</Muted>}
          {detail.students.map((s) => (
            <Card key={s.id}>
              <Heading>{s.name}</Heading>
              <Muted>
                Решено: {s.total} · верно: {s.accuracy}% · ⭐ {s.xp} XP
              </Muted>
            </Card>
          ))}

          <Heading>Результаты по темам</Heading>
          {detail.topics.length === 0 && <Muted>Данных пока нет.</Muted>}
          {detail.topics.map((t) => (
            <Card key={t.topicId}>
              <Heading>{t.title}</Heading>
              <Muted>
                Ответов: {t.total} · верных: {t.total ? Math.round((t.correct / t.total) * 100) : 0}%
              </Muted>
            </Card>
          ))}

          <Heading>Выдать домашнее задание</Heading>
          <Card>
            <TopicBrowser selectedId={topicId} onPick={(t) => setTopicId(t.id)} />
            <ErrorText text={error} />
            <InfoText text={info} />
            <Button title="Выдать классу" onPress={assign} disabled={!topicId} />
          </Card>

          {detail.homework.length > 0 && (
            <>
              <Heading>Выданные задания</Heading>
              {detail.homework.map((h) => (
                <Card key={h.id}>
                  <Muted>
                    {h.topicTitle} · {new Date(h.createdAt).toLocaleDateString('ru-RU')}
                  </Muted>
                </Card>
              ))}
            </>
          )}
        </>
      )}
      {!detail && <ErrorText text={error} />}
    </Screen>
  );
}
