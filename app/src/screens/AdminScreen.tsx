import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { AdminStats, AdminTopic, AdminUserDetail, AdminUserRow, api, errMsg, Role, User } from '../api';
import { Button, Card, Chip, colors, ErrorText, Field, Heading, InfoText, Muted, Row, Screen, Title } from '../ui';

type Tab = 'stats' | 'users' | 'topics' | 'mail';
const TABS: { k: Tab; t: string }[] = [
  { k: 'stats', t: 'Обзор' },
  { k: 'users', t: 'Люди' },
  { k: 'topics', t: 'Темы' },
  { k: 'mail', t: 'Рассылка' },
];
const ROLE_RU: Record<Role, string> = { student: 'Ученик', teacher: 'Учитель', parent: 'Родитель', admin: 'Админ' };
const fmt = (n: number) => n.toLocaleString('ru-RU');
const dt = (s: string | null) => (s ? new Date(s).toLocaleDateString('ru-RU') : '—');

/** Подтверждение: в вебе window.confirm, в приложении Alert. */
function ask(text: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(text)) onYes();
  } else {
    Alert.alert('Подтвердите', text, [{ text: 'Отмена', style: 'cancel' }, { text: 'Да', style: 'destructive', onPress: onYes }]);
  }
}

function Tile({ v, l, c }: { v: string; l: string; c?: string }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: '30%', minWidth: 96, backgroundColor: c ?? colors.primarySoft, borderRadius: 14, padding: 12, margin: 4 }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primaryDark }}>{v}</Text>
      <Text style={{ fontSize: 12, color: colors.muted }}>{l}</Text>
    </View>
  );
}

function Bars({ data, color }: { data: { d: string; n: number }[]; color: string }) {
  const max = Math.max(1, ...data.map((x) => x.n));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, marginTop: 8 }}>
      {data.map((x) => (
        <View key={x.d} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
          <View style={{ width: '70%', height: Math.max(3, (x.n / max) * 70), backgroundColor: color, borderRadius: 4 }} />
          <Text style={{ fontSize: 9, color: colors.muted, marginTop: 2 }}>{x.d.slice(8)}</Text>
        </View>
      ))}
    </View>
  );
}

function Stats() {
  const [s, setS] = useState<AdminStats | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => api.adminStats().then(setS).catch((e) => setErr(errMsg(e))), []);
  useEffect(() => {
    load();
  }, [load]);
  if (!s) return <><ErrorText text={err} /><Muted>Загрузка…</Muted></>;
  const u = s.users;
  return (
    <>
      <Heading>Люди</Heading>
      <Row style={{ flexWrap: 'wrap' }}>
        <Tile v={fmt(u.total)} l="всего" />
        <Tile v={fmt(u.students)} l="учеников" />
        <Tile v={fmt(u.teachers)} l="учителей" />
        <Tile v={fmt(u.parents)} l="родителей" />
        <Tile v={`+${u.today}`} l="сегодня" c="#DCFCE7" />
        <Tile v={`+${u.week}`} l="за неделю" c="#DCFCE7" />
        <Tile v={fmt(u.activeToday)} l="активны сегодня" c="#FFF4E6" />
        <Tile v={fmt(u.activeWeek)} l="активны за 7 дней" c="#FFF4E6" />
        <Tile v={fmt(u.unverified)} l="без подтверждения почты" c="#F3F4F6" />
      </Row>
      <Card>
        <Heading>Регистрации за 14 дней</Heading>
        <Bars data={s.regSeries} color={colors.primary} />
      </Card>
      <Heading>Обучение</Heading>
      <Row style={{ flexWrap: 'wrap' }}>
        <Tile v={fmt(s.attempts.today)} l="ответов сегодня" />
        <Tile v={fmt(s.attempts.week)} l="ответов за неделю" />
        <Tile v={`${s.attempts.accuracyWeek}%`} l="верных за неделю" c="#DCFCE7" />
        <Tile v={fmt(s.attempts.total)} l="ответов всего" />
      </Row>
      <Card>
        <Heading>Ответы за 14 дней</Heading>
        <Bars data={s.actSeries} color={colors.cta} />
      </Card>
      <Heading>Сервис</Heading>
      <Row style={{ flexWrap: 'wrap' }}>
        <Tile v={fmt(s.content.topics)} l="тем" />
        <Tile v={fmt(s.content.tasks)} l="заданий" />
        <Tile v={fmt(s.content.classes)} l="классов" />
        <Tile v={fmt(s.content.subscriptions)} l="подписок" />
        <Tile v={fmt(u.blocked)} l="заблокировано" c="#FEE2E2" />
        <Tile v={s.system.mail ? 'Да' : 'Нет'} l="почта работает" c={s.system.mail ? '#DCFCE7' : '#FEE2E2'} />
      </Row>
      <Muted>Сервер работает {s.system.uptimeH} ч · Node {s.system.node}</Muted>
      <Button title="Обновить" kind="secondary" onPress={load} />
    </>
  );
}

function UserCard({ id, me, onClose, onChanged }: { id: string; me: string; onClose: () => void; onChanged: () => void }) {
  const [u, setU] = useState<AdminUserDetail | null>(null);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [coins, setCoins] = useState('50');
  const load = useCallback(() => api.adminUser(id).then(setU).catch((e) => setErr(errMsg(e))), [id]);
  useEffect(() => {
    load();
  }, [load]);
  const run = async (f: () => Promise<unknown>, ok: string) => {
    setErr('');
    setInfo('');
    try {
      await f();
      setInfo(ok);
      await load();
      onChanged();
    } catch (e) {
      setErr(errMsg(e));
    }
  };
  if (!u) return <Card><ErrorText text={err} /><Muted>Загрузка…</Muted></Card>;
  const self = u.id === me;
  return (
    <Card>
      <Heading>{u.name}</Heading>
      <Muted>{u.email}</Muted>
      <Muted>{ROLE_RU[u.role]}{u.grade ? ` · ${u.grade} класс` : ''}{u.classroom ? ` · класс «${u.classroom}»` : ''} · регистрация {dt(u.createdAt)} · был(а) {dt(u.lastActiveDate)}</Muted>
      <Muted>Опыт {u.xp} · монеты {u.coins} · серия {u.dayStreak} · ответов {u.attempts} (верных {u.correct}) · почта {u.emailVerified ? 'подтверждена' : 'не подтверждена'}{u.blocked ? ' · ЗАБЛОКИРОВАН' : ''}</Muted>
      {u.links.map((l, i) => <Muted key={i}>Связь: {l.name} ({ROLE_RU[l.role as Role] ?? l.role}, {l.email})</Muted>)}
      {u.role === 'student' && (
        <>
          <Text style={{ fontWeight: '700', marginTop: 6, color: colors.text }}>
            Безлимит: {u.subscriptionUntil ? (new Date(u.subscriptionUntil).getFullYear() >= 2100 ? 'навсегда' : `до ${dt(u.subscriptionUntil)}`) : 'нет (действует дневной лимит)'}
          </Text>
          <Row style={{ flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
            <Chip label="+7 дней" onPress={() => run(() => api.adminGrant(u.id, 7), 'Безлимит продлён на 7 дней')} />
            <Chip label="+30 дней" onPress={() => run(() => api.adminGrant(u.id, 30), 'Безлимит продлён на 30 дней')} />
            <Chip label="+365 дней" onPress={() => run(() => api.adminGrant(u.id, 365), 'Безлимит продлён на год')} />
            <Chip label="Навсегда" onPress={() => ask('Включить безлимит навсегда?', () => run(() => api.adminGrant(u.id, 0), 'Безлимит навсегда'))} />
            {u.subscriptionUntil && <Chip label="Снять безлимит" onPress={() => ask('Снять безлимит?', () => run(() => api.adminRevoke(u.id), 'Безлимит снят'))} />}
          </Row>
        </>
      )}
      <ErrorText text={err} />
      <InfoText text={info} />
      {!self && (
        <>
          <Button title={u.blocked ? 'Разблокировать' : 'Заблокировать'} kind="secondary" onPress={() => run(() => api.adminBlock(u.id, !u.blocked), u.blocked ? 'Разблокирован' : 'Заблокирован')} />
          <Button title="Выдать временный пароль" kind="secondary" onPress={() => ask('Старый пароль перестанет работать. Продолжить?', () => run(async () => { const r = await api.adminPassword(u.id); setInfo(`Временный пароль: ${r.password}`); }, ''))} />
          <Text style={{ fontWeight: '700', marginVertical: 6, color: colors.text }}>Роль</Text>
          <Row style={{ flexWrap: 'wrap', gap: 6 }}>
            {(['student', 'teacher', 'parent', 'admin'] as Role[]).map((r) => (
              <Chip key={r} label={ROLE_RU[r]} active={u.role === r} onPress={() => u.role !== r && ask(`Сделать роль «${ROLE_RU[r]}»?`, () => run(() => api.adminRole(u.id, r), 'Роль изменена, нужно перезайти'))} />
            ))}
          </Row>
        </>
      )}
      {!u.emailVerified && <Button title="Отметить почту подтверждённой" kind="secondary" onPress={() => run(() => api.adminVerify(u.id), 'Почта подтверждена')} />}
      <Row style={{ alignItems: 'flex-end', gap: 8 }}>
        <View style={{ flex: 1 }}><Field label="Монеты (можно отрицательные)" value={coins} onChangeText={setCoins} keyboardType="numeric" /></View>
        <View style={{ flex: 1 }}><Button title="Изменить" kind="secondary" onPress={() => run(() => api.adminCoins(u.id, parseInt(coins, 10) || 0), 'Монеты обновлены')} /></View>
      </Row>
      {!self && u.role !== 'admin' && <Button title="Удалить аккаунт навсегда" kind="secondary" onPress={() => ask(`Удалить «${u.name}» и все его данные? Это нельзя отменить.`, () => run(async () => { await api.adminDelete(u.id); onClose(); }, 'Удалён'))} />}
      <Button title="Закрыть" kind="secondary" onPress={onClose} />
    </Card>
  );
}

function People({ me }: { me: string }) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; rows: AdminUserRow[] } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    setErr('');
    api.adminUsers(q, role, page).then(setData).catch((e) => setErr(errMsg(e)));
  }, [q, role, page]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  return (
    <>
      <Field placeholder="Поиск по имени или почте" value={q} onChangeText={(t) => { setQ(t); setPage(1); }} autoCapitalize="none" />
      <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {[['', 'Все'], ['student', 'Ученики'], ['teacher', 'Учителя'], ['parent', 'Родители'], ['admin', 'Админы']].map(([k, t]) => (
          <Chip key={k} label={t} active={role === k} onPress={() => { setRole(k); setPage(1); }} />
        ))}
      </Row>
      <ErrorText text={err} />
      {data && <Muted>Найдено: {fmt(data.total)}</Muted>}
      {open && <UserCard id={open} me={me} onClose={() => setOpen(null)} onChanged={load} />}
      {data?.rows.map((r) => (
        <Card key={r.id}>
          <Text onPress={() => setOpen(r.id)} style={{ fontWeight: '700', fontSize: 16, color: r.blocked ? colors.bad : colors.primaryDark }}>
            {r.name} · {ROLE_RU[r.role]}{r.blocked ? ' · заблокирован' : ''}
          </Text>
          <Muted>{r.email}{r.emailVerified ? ' ✓' : ''} · {dt(r.createdAt)}</Muted>
        </Card>
      ))}
      {data && data.total > 25 && (
        <Row style={{ gap: 8 }}>
          <View style={{ flex: 1 }}><Button title="← Назад" kind="secondary" disabled={page <= 1} onPress={() => setPage(page - 1)} /></View>
          <View style={{ flex: 1 }}><Button title="Вперёд →" kind="secondary" disabled={page * 25 >= data.total} onPress={() => setPage(page + 1)} /></View>
        </Row>
      )}
    </>
  );
}

function Topics() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AdminTopic[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    const t = setTimeout(() => api.adminTopics(q).then(setRows).catch((e) => setErr(errMsg(e))), 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <>
      <Field placeholder="Поиск темы" value={q} onChangeText={setQ} />
      <ErrorText text={err} />
      <Muted>Показано: {rows.length}. «Пусто» — у темы нет заданий.</Muted>
      {rows.map((t) => (
        <Card key={t.id}>
          <Text style={{ fontWeight: '700', color: colors.text }}>{t.title}</Text>
          <Muted>{t.grade} класс · {t.subject} · заданий: {t.tasks === 0 ? 'ПУСТО' : t.tasks} · ответов: {t.attempts} · {t.hasTheory ? 'есть теория' : 'без теории'}{t.custom ? ' · учительская' : ''}</Muted>
        </Card>
      ))}
    </>
  );
}

function Mail() {
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [aud, setAud] = useState('all');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const go = async (dryRun: boolean) => {
    setErr('');
    setInfo('');
    try {
      const r = await api.adminBroadcast({ subject, text, audience: aud, dryRun });
      setInfo(dryRun ? `Письмо получат: ${r.count} чел. (только с подтверждённой почтой, не больше 280 за раз)` : `Рассылка запущена: ${r.count} писем, идёт в фоне.`);
    } catch (e) {
      setErr(errMsg(e));
    }
  };
  return (
    <>
      <Heading>Письмо всем</Heading>
      <Muted>Придёт в красивом оформлении «Моя школа». Бесплатный лимит Brevo — 300 писем в день.</Muted>
      <Row style={{ flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
        {[['all', 'Все'], ['student', 'Ученики'], ['teacher', 'Учителя'], ['parent', 'Родители']].map(([k, t]) => (
          <Chip key={k} label={t} active={aud === k} onPress={() => setAud(k)} />
        ))}
      </Row>
      <Field label="Тема письма" value={subject} onChangeText={setSubject} />
      <Field label="Текст" value={text} onChangeText={setText} multiline style={{ minHeight: 140 }} />
      <ErrorText text={err} />
      <InfoText text={info} />
      <Button title="Сколько получат?" kind="secondary" onPress={() => go(true)} />
      <Button title="Отправить" onPress={() => ask('Отправить письмо выбранной группе?', () => go(false))} />
    </>
  );
}

export default function AdminScreen({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('stats');
  return (
    <Screen>
      <Title>Админ-панель</Title>
      <Muted>{user.name}</Muted>
      <Row style={{ flexWrap: 'wrap', gap: 6, marginVertical: 10 }}>
        {TABS.map((t) => <Chip key={t.k} label={t.t} active={tab === t.k} onPress={() => setTab(t.k)} />)}
      </Row>
      {tab === 'stats' && <Stats />}
      {tab === 'users' && <People me={user.id} />}
      {tab === 'topics' && <Topics />}
      {tab === 'mail' && <Mail />}
      <View style={{ height: 16 }} />
      <Button title="Выйти" kind="secondary" onPress={onLogout} />
    </Screen>
  );
}
