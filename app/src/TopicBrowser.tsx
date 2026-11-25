import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SubjectIcon } from './Art';
import { api, Catalog, errMsg, Topic } from './api';
import { Card, Chip, colors, ErrorText, Muted, Row } from './ui';

/**
 * Выбор темы: предмет → класс → тема. Используется учеником (тренировка) и учителем (домашнее задание).
 */
export default function TopicBrowser({
  onPick,
  initialGrade,
  selectedId,
  subjectFilter,
}: {
  onPick: (t: Topic) => void;
  initialGrade?: number | null;
  selectedId?: string | null;
  subjectFilter?: string;
}) {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState<string | null>(subjectFilter ?? null);
  const [grade, setGrade] = useState<number | null>(initialGrade ?? null);
  const [kind, setKind] = useState<'all' | 'regular' | 'vpr' | 'oge' | 'ege'>('all');

  useEffect(() => {
    api.catalog().then(setCat).catch((e) => setError(errMsg(e)));
  }, []);

  useEffect(() => {
    if (cat && grade === null && cat.grade) setGrade(cat.grade);
  }, [cat, grade]);

  const subjects = useMemo(() => {
    if (!cat) return [];
    return cat.subjects.filter((s) => cat.topics.some((t) => t.subject === s.key && (grade === null || t.grade === grade) && (kind === 'all' || examKind(t) === kind)));
  }, [cat, grade, kind]);

  const list = useMemo(() => {
    if (!cat) return [];
    return cat.topics.filter((t) => (!subject || t.subject === subject) && (grade === null || t.grade === grade) && (kind === 'all' || examKind(t) === kind));
  }, [cat, subject, grade, kind]);

  if (error) return <ErrorText text={error} />;
  if (!cat) return <ActivityIndicator size="large" color={colors.primary} />;

  const meta = (key: string) => cat.subjects.find((s) => s.key === key);

  return (
    <View>
      <Muted>Что нужно</Muted>
      <Row style={{ marginBottom: 10 }}>
        <Chip label="Все темы" active={kind === 'all'} onPress={() => setKind('all')} />
        <Chip label="📘 По программе" active={kind === 'regular'} onPress={() => setKind('regular')} />
        <Chip label="🎯 ВПР" active={kind === 'vpr'} onPress={() => setKind('vpr')} />
        <Chip label="🎓 ОГЭ" active={kind === 'oge'} onPress={() => setKind('oge')} />
        <Chip label="🏁 ЕГЭ" active={kind === 'ege'} onPress={() => setKind('ege')} />
      </Row>
      <Muted>Класс</Muted>
      <Row style={{ marginBottom: 10 }}>
        <Chip label="Все" active={grade === null} onPress={() => setGrade(null)} />
        {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
          <Chip key={g} label={String(g)} active={grade === g} onPress={() => setGrade(g)} />
        ))}
      </Row>
      {!subjectFilter && (
        <>
          <Muted>Предмет</Muted>
          <Row style={{ marginBottom: 12 }}>
            <Chip label="Все" active={subject === null} onPress={() => setSubject(null)} />
            {subjects.map((s) => (
              <Chip key={s.key} label={`${s.emoji} ${s.title}`} active={subject === s.key} onPress={() => setSubject(s.key)} />
            ))}
          </Row>
        </>
      )}
      {list.length === 0 && <Muted>Для такого сочетания тем пока нет — выберите другой класс или предмет.</Muted>}
      {list.map((t) => {
        const m = meta(t.subject);
        const active = selectedId === t.id;
        return (
          <Pressable key={t.id} onPress={() => onPick(t)}>
            <Card style={[s.topic, { borderLeftColor: m?.color ?? colors.primary }, active && { backgroundColor: '#E6F3FD', borderColor: colors.primary }]}>
              <View style={{ marginRight: 10 }}><SubjectIcon title={m?.title} fallback={m?.emoji} size={38} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{t.title}</Text>
                <Text style={s.sub}>
                  {m?.title} · {t.grade} класс · {t.tasks ?? 0} заданий
                </Text>
              </View>
              {t.level ? <Text style={s.level}>ур. {t.level}</Text> : null}
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

function examKind(t: Topic): 'regular' | 'vpr' | 'oge' | 'ege' {
  const p = t.slug ?? '';
  if (p.startsWith('vpr-')) return 'vpr';
  if (p.startsWith('oge-')) return 'oge';
  if (p.startsWith('ege-')) return 'ege';
  return 'regular';
}

const s = StyleSheet.create({
  topic: { flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 6, paddingVertical: 12 },
  icon: { fontSize: 28 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  level: { fontSize: 12, fontWeight: '700', color: colors.primary },
});
