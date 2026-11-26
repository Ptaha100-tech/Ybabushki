import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RichText } from './Art';
import { api, errMsg, ShopData, User } from './api';
import { Button, Card, colors, ErrorText, Heading, Muted, Row } from './ui';

/** Магазин: рамки аватара и звания за монеты. */
export default function ShopPanel({ onUser }: { onUser: (u: User) => void }) {
  const [data, setData] = useState<ShopData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.shop().then(setData).catch((e) => setError(errMsg(e)));
  }, []);

  const act = useCallback(
    async (fn: () => Promise<ShopData>) => {
      setError('');
      try {
        setData(await fn());
        onUser(await api.me());
      } catch (e) {
        setError(errMsg(e));
      }
    },
    [onUser],
  );

  if (!data) return <Muted>Загрузка…</Muted>;
  const group = (kind: 'frame' | 'title', title: string) => (
    <>
      <Heading>{title}</Heading>
      {data.items
        .filter((i) => i.kind === kind)
        .map((i) => (
          <Card key={i.id} style={i.equipped ? { borderColor: colors.primary } : undefined}>
            <View style={s.row}>
              {kind === 'frame' ? <View style={[s.swatch, { borderColor: i.value }]} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{i.name}</Text>
                {!i.owned && <RichText style={s.price}>{i.price} 🪙</RichText>}
              </View>
              {!i.owned ? (
                <Button title="Купить" onPress={() => act(() => api.buyItem(i.id))} disabled={data.coins < i.price} />
              ) : i.equipped ? (
                <Button kind="secondary" title="Снять" onPress={() => act(() => api.equipItem(kind === 'frame' ? 'none-frame' : 'none-title'))} />
              ) : (
                <Button title="Надеть" onPress={() => act(() => api.equipItem(i.id))} />
              )}
            </View>
          </Card>
        ))}
    </>
  );
  return (
    <>
      <Row style={{ alignItems: 'center' }}>
        <Heading>Магазин</Heading>
      </Row>
      <Card>
        <RichText style={s.coins}>У тебя {data.coins} 🪙</RichText>
        <Muted>Монеты даются за верные ответы (1 за ответ) и за задания дня.</Muted>
      </Card>
      {group('frame', 'Рамки для аватара')}
      {group('title', 'Звания')}
      <ErrorText text={error} />
    </>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 4, backgroundColor: '#fff' },
  name: { fontSize: 16, fontWeight: '700', color: colors.dark },
  price: { fontSize: 14, color: colors.muted, marginTop: 2 },
  coins: { fontSize: 22, fontWeight: '800', color: colors.dark, marginBottom: 4 },
});
