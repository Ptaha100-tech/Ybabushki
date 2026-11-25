import React, { useState } from 'react';
import { View } from 'react-native';
import { api, errMsg, Role, setToken, User } from '../api';
import { HeroPic, Scene } from '../Art';
import { guideFor, HERO_NAMES } from '../heroes';
import { Button, Card, Chip, ErrorText, Field, Muted, Row, Screen, Title } from '../ui';

const ROLES: { value: Role; label: string }[] = [
  { value: 'student', label: 'Я ученик' },
  { value: 'teacher', label: 'Я учитель' },
  { value: 'parent', label: 'Я родитель' },
];

export default function AuthScreen({ onAuth, initialMode = 'login', onBack }: { onAuth: (u: User) => void; initialMode?: 'login' | 'register'; onBack?: () => void }) {
  const [gender, setGender] = useState<'m' | 'f' | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [grade, setGrade] = useState<number>(1);
  const [role, setRole] = useState<Role>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const hero = guideFor(gender, role === 'student' ? grade : null);

  const submit = async () => {
    setError('');
    if (mode === 'register' && !gender) {
      setError('Укажите пол — по нему мы выберем вашего помощника.');
      return;
    }
    setBusy(true);
    try {
      const res =
        mode === 'login'
          ? await api.login({ email, password })
          : await api.register({ email, password, name, role, grade: role === 'student' ? grade : undefined, gender: gender as 'm' | 'f' });
      await setToken(res.token);
      onAuth(res.user);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      {onBack && <Button kind="secondary" title="← На главную" onPress={onBack} />}
      <Row style={{ alignItems: 'flex-end', flexWrap: 'nowrap', marginBottom: 8 }}>
        <HeroPic hero={hero} pose="wave" size={110} />
        <View style={{ flex: 1 }}>
          <Title>{mode === 'login' ? 'С возвращением!' : 'Давай знакомиться!'}</Title>
          {mode === 'register' && gender ? <Muted>Я {HERO_NAMES[hero]}, буду твоим помощником.</Muted> : null}
        </View>
      </Row>
      <Card>
        {mode === 'register' && (
          <>
            <Row style={{ marginBottom: 12 }}>
              {ROLES.map((r) => (
                <Chip key={r.value} label={r.label} active={role === r.value} onPress={() => setRole(r.value)} />
              ))}
            </Row>
            <Field label="Имя" value={name} onChangeText={setName} placeholder="Имя или псевдоним" />
            <Muted>Пол</Muted>
            <Row style={{ marginBottom: 12 }}>
              <Chip label={role === 'student' ? '👦 Мальчик' : role === 'teacher' ? '👨‍🏫 Мужской' : '🧔 Мужской'} active={gender === 'm'} onPress={() => setGender('m')} />
              <Chip label={role === 'student' ? '👧 Девочка' : role === 'teacher' ? '👩‍🏫 Женский' : '👩 Женский'} active={gender === 'f'} onPress={() => setGender('f')} />
            </Row>
            {role === 'student' && (
              <>
                <Muted>В каком ты классе?</Muted>
                <Row style={{ marginBottom: 12 }}>
                  {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
                    <Chip key={g} label={String(g)} active={grade === g} onPress={() => setGrade(g)} />
                  ))}
                </Row>
              </>
            )}
          </>
        )}
        <Field
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="name@example.com"
        />
        <Field
          label="Пароль"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Не короче 6 символов"
        />
        <ErrorText text={error} />
        <Button title={mode === 'login' ? 'Войти' : 'Создать аккаунт'} onPress={submit} disabled={busy} />
        <Button
          kind="secondary"
          title={mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          onPress={() => {
            setError('');
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        />
      </Card>
      <Muted>Один аккаунт работает и на сайте, и в приложении.</Muted>
    </Screen>
  );
}
