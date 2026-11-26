import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RichText } from './Art';
import { api, errMsg, QuestsData } from './api';
import { Button, Card, colors, ErrorText, Heading, Muted } from './ui';

/** Ежедневные задания: выполнил — забери монеты. */
export default function QuestsCard({ refreshKey, onCoins }: { refreshKey: unknown; onCoins?: () => void }) {
  const [data, setData] = useState<QuestsData | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    api.quests().then(setData).catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(load, [load, refreshKey]);

  const claim = async (id: string) => {
    setError('');
    try {
      await api.claimQuest(id);
      load();
      onCoins?.();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (!data) return null;
  return (
    <>
      <Heading>Задания дня</Heading>
      <Muted>Выполняй задания и получай монеты 🪙. Их можно потратить в магазине. У тебя: {data.coins} 🪙</Muted>
      {data.quests.map((q) => {
        const done = q.progress >= q.target;
        return (
          <Card key={q.id}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <RichText style={s.title}>{q.icon} {q.title}</RichText>
                <View style={s.bar}>
                  <View style={[s.fill, { width: `${(q.progress / q.target) * 100}%` }, done && { backgroundColor: '#22C55E' }]} />
                </View>
                <Text style={s.small}>{q.progress} из {q.target} · награда {q.reward} 🪙</Text>
              </View>
              {q.claimed ? (
                <Text style={s.got}>Получено</Text>
              ) : (
                <Button title={`+${q.reward}`} onPress={() => claim(q.id)} disabled={!done} />
              )}
            </View>
          </Card>
        );
      })}
      <ErrorText text={error} />
    </>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 16, fontWeight: '700', color: colors.dark, marginBottom: 6 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden', marginBottom: 4 },
  fill: { height: 8, backgroundColor: colors.primary },
  small: { fontSize: 13, color: colors.muted },
  got: { fontSize: 14, fontWeight: '700', color: '#22C55E' },
});
