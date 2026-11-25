import React, { useState } from 'react';
import { api, errMsg, User } from './api';
import { Button, Card, ErrorText, Field, Heading, Muted } from './ui';

/** Блок подтверждения почты. Не показывается, если почта уже подтверждена. */
export default function EmailVerify({ user, onUser }: { user: User; onUser: (u: User) => void }) {
  const [sent, setSent] = useState(false);
  const [mail, setMail] = useState(true);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  if (user.emailVerified) return null;
  const send = async () => {
    setError('');
    try {
      const r = await api.verifySend();
      setMail(r.mail);
      setSent(true);
    } catch (e) {
      setError(errMsg(e));
    }
  };
  const check = async () => {
    setError('');
    try {
      onUser(await api.verify(code.trim()));
    } catch (e) {
      setError(errMsg(e));
    }
  };
  return (
    <Card>
      <Heading>Подтвердите почту</Heading>
      <Muted>Подтверждённая почта нужна, чтобы вы могли восстановить пароль, если забудете его.</Muted>
      {!sent ? (
        <Button title="Отправить код на почту" onPress={send} />
      ) : (
        <>
          <Muted>{mail ? `Код отправлен на ${user.email}. Проверьте также папку «Спам».` : 'Почта на сервере ещё не настроена, поэтому письмо не ушло. Обратитесь к владельцу сервиса.'}</Muted>
          <Field label="Код из письма" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="6 цифр" />
          <Button title="Подтвердить" onPress={check} disabled={code.trim().length < 4} />
          <Button kind="secondary" title="Отправить код ещё раз" onPress={send} />
        </>
      )}
      <ErrorText text={error} />
    </Card>
  );
}
