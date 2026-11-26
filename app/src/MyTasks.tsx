import React, { useCallback, useEffect, useState } from 'react';
import { api, errMsg, SubjectMeta } from './api';
import { Button, Card, Chip, ErrorText, Field, Heading, Muted, Row } from './ui';

const EXAMPLE = `Столица России? | Москва | Казань | Омск
2 + 2 = ? | 4
Как пишется слово? | корова / Корова`;

/** Учитель сам создаёт тему с заданиями из текста и потом выдаёт её классу как домашнее задание. */
export default function MyTasks() {
  const [list, setList] = useState<{ id: string; title: string; grade: number; subject: string; tasks: number }[]>([]);
  const [subjects, setSubjects] = useState<SubjectMeta[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState(5);
  const [subject, setSubject] = useState('math');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    try {
      setList(await api.myTopics());
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);
  useEffect(() => {
    load();
    api.catalog().then((c) => setSubjects(c.subjects)).catch(() => undefined);
  }, [load]);

  const save = async () => {
    setError('');
    setInfo('');
    try {
      const r = await api.createMyTopic({ title, grade, subject, text });
      setInfo(`Тема «${r.title}» создана: ${r.tasks} заданий. Теперь её можно выдать классу как домашнее задание.`);
      setTitle('');
      setText('');
      setOpen(false);
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const remove = async (id: string) => {
    setError('');
    try {
      await api.deleteMyTopic(id);
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <>
      <Heading>Мои задания</Heading>
      <Muted>Составьте свою тему из текста — ученики решат её как обычное задание.</Muted>
      {list.map((t) => (
        <Card key={t.id}>
          <Heading>{t.title}</Heading>
          <Muted>{t.grade} класс · заданий: {t.tasks}</Muted>
          <Button kind="secondary" title="Удалить" onPress={() => remove(t.id)} />
        </Card>
      ))}
      {info ? <Muted>{info}</Muted> : null}
      {!open ? (
        <Button title="Создать свою тему" onPress={() => setOpen(true)} />
      ) : (
        <Card>
          <Field label="Название темы" value={title} onChangeText={setTitle} placeholder="Например: Проверочная по географии" />
          <Muted>Класс</Muted>
          <Row style={{ marginBottom: 8 }}>
            {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
              <Chip key={g} label={String(g)} active={grade === g} onPress={() => setGrade(g)} />
            ))}
          </Row>
          <Muted>Предмет</Muted>
          <Row style={{ marginBottom: 8 }}>
            {subjects.map((s) => (
              <Chip key={s.key} label={s.title} active={subject === s.key} onPress={() => setSubject(s.key)} />
            ))}
          </Row>
          <Muted>Задания — по одному в строке. «Вопрос | верный ответ | неверный | неверный» — выбор ответа; «Вопрос | ответ» — ввод. Допустимые варианты ответа разделяйте « / ».</Muted>
          <Field label="Задания" value={text} onChangeText={setText} multiline placeholder={EXAMPLE} />
          <Button title="Сохранить тему" onPress={save} disabled={title.trim().length < 2 || !text.trim()} />
          <Button kind="secondary" title="Отмена" onPress={() => setOpen(false)} />
        </Card>
      )}
      <ErrorText text={error} />
    </>
  );
}
