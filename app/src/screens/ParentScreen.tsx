import EmailVerify from '../EmailVerify';
import { RichText } from '../Art';
import React, { useCallback, useEffect, useState } from 'react';
import { api, errMsg, Stats, User } from '../api';
import { Button, Card, ErrorText, Field, Heading, InfoText, Muted, Row, Screen, Title } from '../ui';

export default function ParentScreen({ user, onLogout, onTour, onUser }: { user: User; onLogout: () => void; onUser?: (u: User) => void; onTour?: () => void }) {
  const [children, setChildren] = useState<Stats[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const sendReport = async () => {
    setError('');
    setInfo('');
    try {
      const r = await api.reportNow();
      setInfo(!r.mail ? 'Почта на сервере ещё не настроена — письмо не отправлено.' : r.ok ? 'Отчёт отправлен на вашу почту.' : 'Нечего отправлять: добавьте ребёнка по коду.');
    } catch (e) {
      setError(errMsg(e));
    }
  };
  const toggleReports = async () => {
    setError('');
    try {
      const r = await api.setReports(!!user.reportsOff);
      onUser?.({ ...user, reportsOff: !r.enabled });
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const load = useCallback(async () => {
    try {
      setChildren(await api.children());
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const link = async () => {
    setError('');
    setInfo('');
    try {
      const c = await api.linkChild(code);
      setInfo(`Ребёнок «${c.name}» добавлен`);
      setCode('');
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const subscribe = async (studentId: string, plan: 'month' | 'year') => {
    setError('');
    setInfo('');
    try {
      const r = await api.subscribe(studentId, plan);
      setInfo(`Безлимит включён до ${new Date(r.until).toLocaleDateString('ru-RU')}`);
      load();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <Screen>
      <Title>Здравствуйте, {user.name}</Title>

      <Heading>Дети</Heading>
      {children.length === 0 && <Muted>Добавьте ребёнка по коду из его профиля.</Muted>}
      {children.map((c) => (
        <Card key={c.id}>
          <Heading>{c.name}</Heading>
          <Row>
            <Muted>Решено: {c.total}</Muted>
            <Muted>Верно: {c.accuracy}%</Muted>
            <Muted>⭐ {c.xp} XP</Muted>
            <Muted>🔥 {c.dayStreak} дн.</Muted>
          </Row>
          <Muted>
            {c.subscriptionUntil
              ? `Безлимит до ${new Date(c.subscriptionUntil).toLocaleDateString('ru-RU')}`
              : `Бесплатных заданий сегодня: ${c.remaining ?? 0}`}
          </Muted>
          <Row>
            <Button title="Безлимит на месяц" onPress={() => subscribe(c.id, 'month')} />
            <Button kind="secondary" title="На год" onPress={() => subscribe(c.id, 'year')} />
          </Row>
        </Card>
      ))}

      <Heading>Добавить ребёнка</Heading>
      <Card>
        <Field label="Код ребёнка" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="ABC123" />
        <ErrorText text={error} />
        <InfoText text={info} />
        <Button title="Добавить" onPress={link} disabled={!code.trim()} />
      </Card>

      {onUser && <EmailVerify user={user} onUser={onUser} />}
      <Heading>Письма об успехах</Heading>
      <Card>
        <Muted>Раз в неделю (по понедельникам) мы присылаем на вашу почту итоги: сколько заданий решил ребёнок, точность и темы для повторения.</Muted>
        <Button kind="secondary" title="Прислать отчёт сейчас" onPress={sendReport} />
        <Button
          kind="secondary"
          title={user.reportsOff ? 'Включить еженедельные письма' : 'Отключить еженедельные письма'}
          onPress={toggleReports}
        />
      </Card>
      {onTour && <Button kind="secondary" title="Показать обучение" onPress={onTour} />}
      <Button kind="secondary" title="Выйти" onPress={onLogout} />
    </Screen>
  );
}
