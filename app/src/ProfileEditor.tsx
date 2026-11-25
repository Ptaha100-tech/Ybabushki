import React, { useState } from 'react';
import { api, errMsg, User } from './api';
import { Chip, ErrorText, Muted, Row } from './ui';

/** Пол и класс можно изменить в любой момент. От них зависит герой-помощник. */
export default function ProfileEditor({ user, onChange }: { user: User; onChange: (u: User) => void }) {
  const [error, setError] = useState('');
  const save = async (patch: { gender?: 'm' | 'f'; grade?: number }) => {
    setError('');
    try {
      await api.updateProfile(patch);
      onChange({ ...user, ...patch });
    } catch (e) {
      setError(errMsg(e));
    }
  };
  return (
    <>
      <Muted>Пол</Muted>
      <Row style={{ marginBottom: 10 }}>
        <Chip label={user.role === 'student' ? '👦 Мальчик' : '👨 Мужской'} active={user.gender === 'm'} onPress={() => save({ gender: 'm' })} />
        <Chip label={user.role === 'student' ? '👧 Девочка' : '👩 Женский'} active={user.gender === 'f'} onPress={() => save({ gender: 'f' })} />
      </Row>
      {user.role === 'student' && (
        <>
          <Muted>Класс</Muted>
          <Row style={{ marginBottom: 6 }}>
            {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
              <Chip key={g} label={String(g)} active={user.grade === g} onPress={() => save({ grade: g })} />
            ))}
          </Row>
        </>
      )}
      <ErrorText text={error} />
    </>
  );
}
