import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Text, View } from 'react-native';
import { AdminStats, AdminTopic, AdminUserDetail, AdminUserRow, api, errMsg, Role, User } from '../api';
import { artSrc, loadArt, overriddenKeys } from '../art';
import { DEFAULT_THEME, ensureFont, FONTS, PRESETS, saveThemeCache, T, Theme } from '../theme';
import { HERO_NAMES, HeroKey, heroImg, ICONS, SCENES } from '../heroes';
import { assetToDataUri, downloadDataUri, isWebEnv, pickImageFile, removeBackground, toPngDataUri } from '../imgtools';
import { Button, Card, Chip, colors, ErrorText, Field, Heading, InfoText, Muted, Row, Screen, Title } from '../ui';

type Tab = 'stats' | 'users' | 'topics' | 'mail' | 'img' | 'design';
const TABS: { k: Tab; t: string }[] = [
  { k: 'stats', t: 'Обзор' },
  { k: 'users', t: 'Люди' },
  { k: 'topics', t: 'Темы' },
  { k: 'mail', t: 'Рассылка' },
  { k: 'img', t: '🎨 Картинки' },
  { k: 'design', t: '🖌 Дизайн' },
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

const STYLE = ' Стиль: яркий дружелюбный 3D-мультфильм в духе Pixar, мягкий свет, большие добрые глаза, чистые насыщенные цвета, для детской образовательной платформы, без надписей и текста.';
const ASPECTS = ['1:1', '4:3', '3:4', '16:9', '9:16'];
interface Gen { uri: string; name: string }

/** Генератор картинок: описание → варианты → вырезать фон → скачать. */
const POSES = ['wave', 'point', 'book', 'think', 'idea', 'thumbs', 'shrug', 'write', 'shrug2', 'walk'];

/** Выбор места в сервисе, куда поставить картинку. */
function SlotPicker({ uri, onDone }: { uri: string; onDone: (msg: string) => void }) {
  const [group, setGroup] = useState<'hero' | 'icon' | 'scene' | 'bg'>('hero');
  const [hero, setHero] = useState<HeroKey>('boy');
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  const done = overriddenKeys();
  const keys: string[] =
    group === 'hero' ? POSES.map((p) => `hero:${hero}:${p}`) : group === 'icon' ? Object.keys(ICONS).map((k) => `icon:${k}`) : group === 'bg' ? ['bg:site'] : Object.keys(SCENES).map((k) => `scene:${k}`);

  const put = async (key: string) => {
    setBusy(true);
    try {
      await api.adminArtSet(key, await toPngDataUri(uri, 1024));
      await loadArt();
      tick((n) => n + 1);
      onDone(`✅ Поставлено: ${key}. Откройте сайт заново (обновите страницу), чтобы увидеть.`);
    } catch (e) {
      onDone(errMsg(e));
    }
    setBusy(false);
  };
  const reset = async (key: string) => {
    setBusy(true);
    try {
      await api.adminArtRemove(key);
      await loadArt();
      tick((n) => n + 1);
      onDone(`↩️ Возвращена исходная картинка: ${key}`);
    } catch (e) {
      onDone(errMsg(e));
    }
    setBusy(false);
  };

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 6 }}>Куда поставить?</Text>
      <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        <Chip label="Герои" active={group === 'hero'} onPress={() => setGroup('hero')} />
        <Chip label="Значки" active={group === 'icon'} onPress={() => setGroup('icon')} />
        <Chip label="Сцены" active={group === 'scene'} onPress={() => setGroup('scene')} />
        <Chip label="Фон сайта" active={group === 'bg'} onPress={() => setGroup('bg')} />
      </Row>
      {group === 'hero' && (
        <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {(['boy', 'glasses', 'pink'] as HeroKey[]).map((h) => <Chip key={h} label={HERO_NAMES[h]} active={hero === h} onPress={() => setHero(h)} />)}
        </Row>
      )}
      {busy && <ActivityIndicator color={colors.primary} />}
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {keys.map((k) => {
          const [kind, a, b] = k.split(':');
          const fb = kind === 'bg' ? undefined : kind === 'hero' ? heroImg(a as HeroKey, b as any) : kind === 'icon' ? (ICONS as any)[a] : (SCENES as any)[a];
          const on = done.includes(k);
          return (
            <View key={k} style={{ width: 84, alignItems: 'center' }}>
              <Text onPress={() => put(k)} style={{ cursor: 'pointer' } as any}>
                <Image source={artSrc(k, fb)} style={{ width: 76, height: 76, resizeMode: 'contain', backgroundColor: on ? '#DCFCE7' : '#F3F4F6', borderRadius: 10 }} />
              </Text>
              <Text style={{ fontSize: 10, color: colors.muted }} numberOfLines={1}>{kind === 'hero' ? b : a}</Text>
              {on && <Text onPress={() => reset(k)} style={{ fontSize: 11, color: '#DC2626' }}>вернуть</Text>}
            </View>
          );
        })}
      </Row>
      <Muted>Нажмите на картинку-место — новая картинка встанет вместо неё для всех. Зелёные — уже заменены.</Muted>
    </View>
  );
}

const ANIM_SLOTS: { key: string; label: string }[] = [
  { key: 'anim:balloon_idle', label: '🎈 Шарик висит' },
  { key: 'anim:balloon_pop', label: '💥 Шарик лопается' },
  ...(['boy', 'glasses', 'pink'] as HeroKey[]).flatMap((h) =>
    POSES.map((p) => ({ key: `anim:hero:${h}:${p}`, label: `${HERO_NAMES[h]}: ${p}` })),
  ),
];

/** Видео: рисуем ролик, смотрим, ставим на «живое» место сервиса. */
function VideoLab() {
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [model, setModel] = useState('seedance-2.0-fast');
  const [prompt, setPrompt] = useState('');
  const [dur, setDur] = useState(4);
  const [res, setRes] = useState('720p');
  const [ratio, setRatio] = useState('1:1');
  const [hero, setHero] = useState<HeroKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [slots, setSlots] = useState(false);
  const [, tick] = useState(0);
  const web = isWebEnv;

  useEffect(() => {
    api.adminVideoModels().then(setModels).catch(() => undefined);
  }, []);

  const go = async () => {
    setErr(''); setInfo(''); setPreview(null); setJobId(null); setSlots(false); setBusy(true);
    try {
      let image: string | undefined;
      if (hero) image = await assetToDataUri(heroImg(hero, 'wave'), 768);
      let p = prompt.trim() + ' Фон: ровный однотонный ярко-зелёный (#00FF00), без теней, камера неподвижна, мультяшный 3D-стиль для детей.';
      const { id } = await api.adminVideoStart({ prompt: p, model, duration: dur, aspectRatio: ratio, resolution: res, image });
      setJobId(id);
      setInfo('Ролик рисуется, обычно 1–3 минуты. Не закрывайте страницу…');
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 8000));
        const st = await api.adminVideoStatus(id);
        if (st.status === 'completed') {
          setPreview(await api.adminVideoBlobUrl(id));
          setInfo(`Готово! Стоимость: ${st.cost ?? '?'} ₽. Посмотрите и нажмите «Поставить на сервис».`);
          setBusy(false);
          return;
        }
        if (['failed', 'expired', 'cancelled'].includes(st.status)) throw new Error(st.error || 'Не получилось, деньги возвращены. Попробуйте другое описание.');
      }
      throw new Error('Слишком долго. Попробуйте ещё раз.');
    } catch (e) {
      setErr(errMsg(e));
    }
    setBusy(false);
  };

  const put = async (key: string) => {
    if (!jobId) return;
    setBusy(true);
    try {
      await api.adminVideoInstall(jobId, key);
      await loadArt();
      tick((n) => n + 1);
      setInfo(`✅ Поставлено: ${key}. Обновите сайт, чтобы увидеть.`);
    } catch (e) {
      setErr(errMsg(e));
    }
    setBusy(false);
  };
  const reset = async (key: string) => {
    try {
      await api.adminArtRemove(key);
      await loadArt();
      tick((n) => n + 1);
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  if (!web) return <Card><Heading>🎬 Живые ролики</Heading><Muted>Создание роликов доступно на сайте (в браузере).</Muted></Card>;
  const done = overriddenKeys();
  return (
    <Card>
      <Heading>🎬 Живые ролики</Heading>
      <Muted>Опишите, что должно происходить: «воздушный шарик спокойно покачивается», «шарик лопается с конфетти», «мальчик машет рукой и улыбается». Фон автоматически станет прозрачным на сайте.</Muted>
      <Field label="Описание ролика" value={prompt} onChangeText={setPrompt} multiline />
      <Text style={{ fontWeight: '700', color: colors.text, marginVertical: 6 }}>Модель</Text>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>
        {models.map((m) => <Chip key={m.id} label={m.name} active={model === m.id} onPress={() => setModel(m.id)} />)}
      </Row>
      <Text style={{ fontWeight: '700', color: colors.text, marginVertical: 6 }}>Длина (сек) и качество</Text>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>
        {[3, 4, 5, 6, 8].map((d) => <Chip key={d} label={`${d} с`} active={dur === d} onPress={() => setDur(d)} />)}
        {['480p', '720p'].map((r) => <Chip key={r} label={r} active={res === r} onPress={() => setRes(r)} />)}
        {['1:1', '9:16', '16:9'].map((r) => <Chip key={r} label={r} active={ratio === r} onPress={() => setRatio(r)} />)}
      </Row>
      <Text style={{ fontWeight: '700', color: colors.text, marginVertical: 6 }}>Оживить нашего героя (первый кадр)</Text>
      <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        <Chip label="Без героя" active={hero === null} onPress={() => setHero(null)} />
        {(['boy', 'glasses', 'pink'] as HeroKey[]).map((h) => <Chip key={h} label={HERO_NAMES[h]} active={hero === h} onPress={() => setHero(h)} />)}
      </Row>
      <ErrorText text={err} />
      <InfoText text={info} />
      {busy ? <ActivityIndicator size="large" color={colors.primary} /> : <Button title="🎬 Создать ролик" onPress={go} disabled={prompt.trim().length < 3} />}
      {preview && (
        <View style={{ marginTop: 10 }}>
          {React.createElement('video', { src: preview, autoPlay: true, loop: true, muted: true, playsInline: true, controls: true, style: { width: '100%', maxHeight: 320, background: '#00B140', borderRadius: 12 } })}
          <View style={{ marginTop: 8 }}>
            <Button title={slots ? 'Скрыть' : '📌 Поставить на сервис'} onPress={() => setSlots(!slots)} />
          </View>
        </View>
      )}
      {preview && slots && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 6 }}>Куда поставить?</Text>
          <Row style={{ flexWrap: 'wrap', gap: 6 }}>
            {ANIM_SLOTS.map((a) => (
              <Chip key={a.key} label={(done.includes(a.key) ? '✅ ' : '') + a.label} active={done.includes(a.key)} onPress={() => put(a.key)} />
            ))}
          </Row>
          {done.some((k) => k.startsWith('anim:')) && (
            <>
              <Muted>Уже стоят (нажмите, чтобы убрать):</Muted>
              <Row style={{ flexWrap: 'wrap', gap: 6 }}>
                {done.filter((k) => k.startsWith('anim:')).map((k) => <Chip key={k} label={`✖ ${k.replace('anim:', '')}`} onPress={() => reset(k)} />)}
              </Row>
            </>
          )}
        </View>
      )}
    </Card>
  );
}

/** Выбор цвета: на сайте — палитра, плюс поле для кода. */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Row style={{ marginBottom: 6, justifyContent: 'space-between', flexWrap: 'nowrap' }}>
      <Text style={{ color: colors.text, flex: 1 }}>{label}</Text>
      {isWebEnv && React.createElement('input', { type: 'color', value, onChange: (e: any) => onChange(e.target.value), style: { width: 44, height: 32, border: 'none', background: 'none', padding: 0 } })}
      <View style={{ width: 96 }}>
        <Field value={value} onChangeText={(v) => /^#[0-9a-fA-F]{0,6}$/.test(v) && onChange(v)} autoCapitalize="none" style={{ padding: 6, fontSize: 14 }} />
      </View>
    </Row>
  );
}

/** Число с кнопками − и +. */
function Stepper({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
  const set = (v: number) => onChange(Math.round(Math.min(max, Math.max(min, v)) * 100) / 100);
  return (
    <Row style={{ marginBottom: 6, justifyContent: 'space-between', flexWrap: 'nowrap' }}>
      <Text style={{ color: colors.text, flex: 1 }}>{label}</Text>
      <Chip label="−" onPress={() => set(value - step)} />
      <Text style={{ minWidth: 46, textAlign: 'center', fontWeight: '700', color: colors.text }}>{fmt ? fmt(value) : value}</Text>
      <Chip label="＋" onPress={() => set(value + step)} />
    </Row>
  );
}

const DESIGN_BLOCKS = ['🎁 Готовые темы', '🎨 Цвета', '🌄 Фон сайта', '🔘 Кнопки', '🪟 Окна и карточки', '🔤 Шрифт'] as const;

/** Редактор оформления всего сайта по блокам, с предпросмотром. */
function DesignLab() {
  const [d, setD] = useState<Theme>({ ...T });
  const [open, setOpen] = useState<string>(DESIGN_BLOCKS[0]);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const up = <K extends keyof Theme>(k: K, v: Theme[K]) => setD((x) => ({ ...x, [k]: v }));
  const web = isWebEnv;
  useEffect(() => {
    if (d.font) ensureFont(d.font);
  }, [d.font]);

  const save = async () => {
    setBusy(true); setErr(''); setInfo('');
    try {
      await api.adminThemeSet(d);
      saveThemeCache(await api.theme());
      setInfo('✅ Сохранено. Страница перезагрузится…');
      if (web) setTimeout(() => location.reload(), 600);
    } catch (e) {
      setErr(errMsg(e));
    }
    setBusy(false);
  };
  const reset = async () => {
    setBusy(true); setErr('');
    try {
      await api.adminThemeReset();
      saveThemeCache({});
      setInfo('Возвращено исходное оформление. Страница перезагрузится…');
      if (web) setTimeout(() => location.reload(), 600);
    } catch (e) {
      setErr(errMsg(e));
    }
    setBusy(false);
  };

  const bgStyle: any =
    d.bgMode === 'gradient' ? { backgroundImage: `linear-gradient(${d.bgAngle}deg, ${d.bg}, ${d.bg2})` } : { backgroundColor: d.bg };
  const ff: any = d.font ? { fontFamily: `"${d.font}", system-ui, sans-serif` } : {};

  return (
    <>
      <Card>
        <Heading>🖌 Дизайн сайта</Heading>
        <Muted>Меняйте оформление по блокам. Внизу — предпросмотр. Когда нравится — «Сохранить»: сайт у всех сразу получит новый вид. Картинку для фона загрузите в «Картинки» → «Поставить на сервис» → «Фон сайта», затем выберите здесь «Картинка».</Muted>
      </Card>

      {/* предпросмотр */}
      <View style={[{ borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#0002' }, bgStyle, ff]}>
        <Text style={[{ fontSize: 22, color: d.text, marginBottom: 8, fontWeight: String(d.titleWeight) as any }, ff]}>Так будет выглядеть заголовок</Text>
        <View style={[{ backgroundColor: d.card, borderRadius: d.cardRadius, padding: d.cardPad, borderWidth: d.cardBorder, borderColor: d.border }, d.cardShadow ? ({ boxShadow: '0 6px 18px rgba(0,0,0,0.15)' } as any) : null]}>
          <Text style={[{ color: d.text, fontWeight: '700', fontSize: 17 }, ff]}>Окно с заданием</Text>
          <Text style={[{ color: d.muted, marginVertical: 6 }, ff]}>Сколько будет 7 × 8? Подумай и выбери ответ.</Text>
          <Row style={{ gap: 6, marginBottom: 8 }}>
            {['54', '56', '64'].map((x, i) => (
              <View key={x} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: d.chipRadius, borderWidth: 1.5, borderColor: d.primary, backgroundColor: i === 1 ? d.primary : d.card }}>
                <Text style={[{ color: i === 1 ? d.btnText : d.primaryDark, fontWeight: '600' }, ff]}>{x}</Text>
              </View>
            ))}
          </Row>
          <View style={[{ backgroundColor: d.cta, paddingVertical: d.btnPadY, borderRadius: d.btnRadius, alignItems: 'center' }, d.btnShadow ? ({ boxShadow: '0 5px 0 rgba(0,0,0,0.18)' } as any) : null]}>
            <Text style={[{ color: d.btnText, fontWeight: '700', fontSize: d.btnFont }, ff]}>Проверить</Text>
          </View>
          <View style={{ backgroundColor: d.primarySoft, paddingVertical: d.btnPadY, borderRadius: d.btnRadius, alignItems: 'center', marginTop: 8 }}>
            <Text style={[{ color: d.primary, fontWeight: '700', fontSize: d.btnFont }, ff]}>Не сейчас</Text>
          </View>
          <Row style={{ marginTop: 8, gap: 8 }}>
            <Text style={[{ color: d.good, fontWeight: '700' }, ff]}>✔ Верно!</Text>
            <Text style={[{ color: d.bad, fontWeight: '700' }, ff]}>✖ Ошибка</Text>
          </Row>
        </View>
      </View>

      {DESIGN_BLOCKS.map((b) => (
        <Card key={b}>
          <Text onPress={() => setOpen(open === b ? '' : b)} style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{open === b ? '▾ ' : '▸ '}{b}</Text>
          {open === b && b === DESIGN_BLOCKS[0] && (
            <>
              <Muted>Нажмите — всё оформление заменится целиком. Потом можно подправить по блокам.</Muted>
              <Row style={{ gap: 6 }}>
                {PRESETS.map((p) => <Chip key={p.name} label={p.name} onPress={() => setD({ ...DEFAULT_THEME, ...p.theme })} />)}
              </Row>
            </>
          )}
          {open === b && b === DESIGN_BLOCKS[1] && (
            <View style={{ marginTop: 8 }}>
              <ColorField label="Основной (синий)" value={d.primary} onChange={(v) => up('primary', v)} />
              <ColorField label="Основной, тёмный (текст на светлом)" value={d.primaryDark} onChange={(v) => up('primaryDark', v)} />
              <ColorField label="Основной, светлый (вторые кнопки)" value={d.primarySoft} onChange={(v) => up('primarySoft', v)} />
              <ColorField label="Главная кнопка (оранжевая)" value={d.cta} onChange={(v) => up('cta', v)} />
              <ColorField label="Текст на кнопках" value={d.btnText} onChange={(v) => up('btnText', v)} />
              <ColorField label="Текст" value={d.text} onChange={(v) => up('text', v)} />
              <ColorField label="Подписи (серый текст)" value={d.muted} onChange={(v) => up('muted', v)} />
              <ColorField label="Окна и карточки" value={d.card} onChange={(v) => up('card', v)} />
              <ColorField label="Рамки" value={d.border} onChange={(v) => up('border', v)} />
              <ColorField label="Верно (зелёный)" value={d.good} onChange={(v) => up('good', v)} />
              <ColorField label="Ошибка (красный)" value={d.bad} onChange={(v) => up('bad', v)} />
            </View>
          )}
          {open === b && b === DESIGN_BLOCKS[2] && (
            <View style={{ marginTop: 8 }}>
              <Row style={{ gap: 6, marginBottom: 8 }}>
                <Chip label="Один цвет" active={d.bgMode === 'color'} onPress={() => up('bgMode', 'color')} />
                <Chip label="Плавный переход" active={d.bgMode === 'gradient'} onPress={() => up('bgMode', 'gradient')} />
                <Chip label="Картинка" active={d.bgMode === 'image'} onPress={() => up('bgMode', 'image')} />
              </Row>
              <ColorField label="Цвет фона" value={d.bg} onChange={(v) => up('bg', v)} />
              {d.bgMode === 'gradient' && (
                <>
                  <ColorField label="Второй цвет перехода" value={d.bg2} onChange={(v) => up('bg2', v)} />
                  <Stepper label="Направление (градусы)" value={d.bgAngle} min={0} max={360} step={30} onChange={(v) => up('bgAngle', v)} />
                </>
              )}
              {d.bgMode === 'image' && <Muted>Картинка берётся из «Картинки» → «Поставить на сервис» → «Фон сайта». Цвет выше виден, пока она грузится. Картинка-фон показывается только на сайте.</Muted>}
            </View>
          )}
          {open === b && b === DESIGN_BLOCKS[3] && (
            <View style={{ marginTop: 8 }}>
              <Stepper label="Скругление углов" value={d.btnRadius} min={0} max={40} step={4} onChange={(v) => up('btnRadius', v)} />
              <Stepper label="Высота кнопки" value={d.btnPadY} min={6} max={26} step={2} onChange={(v) => up('btnPadY', v)} />
              <Stepper label="Размер текста" value={d.btnFont} min={12} max={24} step={1} onChange={(v) => up('btnFont', v)} />
              <Stepper label="Скругление «таблеток»" value={Math.min(d.chipRadius, 40)} min={0} max={40} step={4} onChange={(v) => up('chipRadius', v)} />
              <Row style={{ gap: 6 }}>
                <Chip label={d.btnShadow ? '✓ Объёмные (с тенью)' : 'Плоские'} active={d.btnShadow} onPress={() => up('btnShadow', !d.btnShadow)} />
              </Row>
            </View>
          )}
          {open === b && b === DESIGN_BLOCKS[4] && (
            <View style={{ marginTop: 8 }}>
              <Stepper label="Скругление углов" value={d.cardRadius} min={0} max={44} step={4} onChange={(v) => up('cardRadius', v)} />
              <Stepper label="Толщина рамки" value={d.cardBorder} min={0} max={6} step={1} onChange={(v) => up('cardBorder', v)} />
              <Stepper label="Отступ внутри" value={d.cardPad} min={8} max={32} step={2} onChange={(v) => up('cardPad', v)} />
              <Row style={{ gap: 6 }}>
                <Chip label={d.cardShadow ? '✓ С тенью' : 'Без тени'} active={d.cardShadow} onPress={() => up('cardShadow', !d.cardShadow)} />
              </Row>
            </View>
          )}
          {open === b && b === DESIGN_BLOCKS[5] && (
            <View style={{ marginTop: 8 }}>
              {!web && <Muted>Шрифты работают только на сайте.</Muted>}
              <Row style={{ gap: 6, marginBottom: 8 }}>
                <Chip label="Системный" active={!d.font} onPress={() => up('font', '')} />
                {Object.keys(FONTS).map((f) => <Chip key={f} label={f} active={d.font === f} onPress={() => up('font', f)} />)}
              </Row>
              <Stepper label="Жирность заголовков" value={d.titleWeight} min={400} max={900} step={100} onChange={(v) => up('titleWeight', v)} />
              <Stepper label="Размер всего интерфейса" value={d.uiZoom} min={0.8} max={1.3} step={0.05} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(v) => up('uiZoom', v)} />
            </View>
          )}
        </Card>
      ))}

      <ErrorText text={err} />
      <InfoText text={info} />
      {busy ? <ActivityIndicator size="large" color={colors.primary} /> : (
        <>
          <Button title="💾 Сохранить и применить" onPress={save} />
          <Button title="↩️ Вернуть исходный дизайн" kind="secondary" onPress={reset} />
        </>
      )}
      <Muted>Меняется всё оформление сайта. Приложение для Android подхватывает цвета и шрифты при следующей сборке/запуске не полностью — основной упор на сайт.</Muted>
    </>
  );
}

function ImageLab() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [model, setModel] = useState('gemini-nano-banana-2.1');
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState('1:1');
  const [bg, setBg] = useState<'auto' | 'transparent' | 'green'>('green');
  const [n, setN] = useState(2);
  const [style, setStyle] = useState(true);
  const [refs, setRefs] = useState<{ label: string; uri: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [out, setOut] = useState<Gen[]>([]);
  const [slotFor, setSlotFor] = useState<string | null>(null);
  const web = isWebEnv;

  useEffect(() => {
    api.adminImageStatus().then((r) => setConfigured(r.configured)).catch((e) => setErr(errMsg(e)));
    api.adminImageModels().then(setModels).catch(() => undefined);
  }, []);

  const addHero = async (h: HeroKey) => {
    try {
      const uri = await assetToDataUri(heroImg(h, 'wave'));
      setRefs((r) => (r.some((x) => x.label === HERO_NAMES[h]) ? r.filter((x) => x.label !== HERO_NAMES[h]) : [...r, { label: HERO_NAMES[h], uri }].slice(0, 3)));
    } catch (e) {
      setErr(errMsg(e));
    }
  };
  const addFile = async () => {
    const uri = await pickImageFile();
    if (uri) setRefs((r) => [...r, { label: 'Файл', uri }].slice(0, 3));
  };

  const go = async () => {
    setErr('');
    setInfo('');
    setBusy(true);
    try {
      let p = prompt.trim();
      if (bg === 'green') p += ' Фон: ровный однотонный ярко-зелёный (#00FF00), без теней и градиентов, чтобы фон легко вырезался.';
      if (style) p += STYLE;
      const r = await api.adminImage({ prompt: p, model, aspectRatio: aspect, background: bg === 'transparent' ? 'transparent' : 'auto', n, refs: refs.map((x) => x.uri) });
      setOut((o) => [...r.images.map((i, k) => ({ uri: `data:${i.mediaType};base64,${i.b64}`, name: `art-${Date.now()}-${k + 1}.png` })), ...o].slice(0, 12));
      setInfo(`Готово. Стоимость: ${r.cost ?? '?'} ₽, остаток на балансе: ${r.balance ?? '?'} ₽`);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const cut = async (i: number) => {
    try {
      const uri = await removeBackground(out[i].uri);
      setOut((o) => o.map((x, k) => (k === i ? { ...x, uri } : x)));
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  if (configured === false)
    return (
      <Card>
        <Heading>Нужен ключ AITunnel</Heading>
        <Muted>Зайдите на aitunnel.ru → API-ключи → создайте ключ. Затем на сервере в Termius выполните:</Muted>
        <Text selectable style={{ fontFamily: 'monospace', color: colors.text, marginVertical: 8 }}>cd ~/Ybabushki && bash scripts/set-aitunnel.sh</Text>
        <Muted>Вставьте ключ и нажмите Enter. После этого обновите эту страницу.</Muted>
      </Card>
    );

  const modelList = models.length ? models : [{ id: model, name: model }];
  return (
    <>
      <Heading>Что нарисовать?</Heading>
      <Field label="Описание" value={prompt} onChangeText={setPrompt} multiline placeholder="Например: весёлая лисичка с рюкзаком идёт в школу" style={{ minHeight: 100 }} />
      <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 6 }}>Модель</Text>
      <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {modelList.slice(0, 12).map((m) => <Chip key={m.id} label={m.name || m.id} active={model === m.id} onPress={() => setModel(m.id)} />)}
      </Row>
      <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 6 }}>Пропорции</Text>
      <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {ASPECTS.map((a) => <Chip key={a} label={a} active={aspect === a} onPress={() => setAspect(a)} />)}
      </Row>
      <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 6 }}>Фон</Text>
      <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        <Chip label="Зелёный (потом вырежу)" active={bg === 'green'} onPress={() => setBg('green')} />
        <Chip label="Прозрачный (если модель умеет)" active={bg === 'transparent'} onPress={() => setBg('transparent')} />
        <Chip label="Как получится" active={bg === 'auto'} onPress={() => setBg('auto')} />
      </Row>
      <Text style={{ fontWeight: '700', color: colors.text, marginBottom: 6 }}>Сколько вариантов</Text>
      <Row style={{ gap: 6, marginBottom: 10 }}>
        {[1, 2, 3, 4].map((k) => <Chip key={k} label={String(k)} active={n === k} onPress={() => setN(k)} />)}
      </Row>
      <Chip label={style ? '✓ Наш стиль (3D-мультфильм) включён' : 'Наш стиль выключен'} active={style} onPress={() => setStyle(!style)} />
      <Text style={{ fontWeight: '700', color: colors.text, marginVertical: 8 }}>Образец стиля (референс, до 3)</Text>
      <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {(['boy', 'glasses', 'pink'] as HeroKey[]).map((h) => <Chip key={h} label={HERO_NAMES[h]} active={refs.some((x) => x.label === HERO_NAMES[h])} onPress={() => addHero(h)} />)}
        {web && <Chip label="＋ Свой файл" onPress={addFile} />}
        {refs.length > 0 && <Chip label="Сбросить" onPress={() => setRefs([])} />}
      </Row>
      <ErrorText text={err} />
      <InfoText text={info} />
      {busy ? <ActivityIndicator size="large" color={colors.primary} /> : <Button title="🎨 Нарисовать" onPress={go} disabled={prompt.trim().length < 3} />}
      {busy && <Muted>Рисуем, это может занять до минуты…</Muted>}
      {out.map((g, i) => (
        <Card key={g.name}>
          <Image source={{ uri: g.uri }} style={{ width: '100%', aspectRatio: 1, resizeMode: 'contain', backgroundColor: '#E5E7EB', borderRadius: 12 }} />
          {web ? (
            <Row style={{ gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}><Button title="✂️ Вырезать фон" kind="secondary" onPress={() => cut(i)} /></View>
              <View style={{ flex: 1 }}><Button title="⬇️ Скачать" kind="secondary" onPress={() => downloadDataUri(g.uri, g.name)} /></View>
            </Row>
          ) : (
            <Muted>Вырезание и скачивание доступны на сайте (в браузере).</Muted>
          )}
          <View style={{ marginTop: 8 }}>
            <Button title={slotFor === g.name ? 'Скрыть' : '📌 Поставить на сервис'} onPress={() => setSlotFor(slotFor === g.name ? null : g.name)} />
          </View>
          {slotFor === g.name && <SlotPicker uri={g.uri} onDone={setInfo} />}
        </Card>
      ))}
      <Muted>Понравилась картинка — нажмите «Поставить на сервис» и выберите, какую картинку она заменит.</Muted>
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
      {tab === 'img' && <><ImageLab /><VideoLab /></>}
      {tab === 'design' && <DesignLab />}
      <View style={{ height: 16 }} />
      <Button title="Выйти" kind="secondary" onPress={onLogout} />
    </Screen>
  );
}
