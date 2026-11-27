import React, { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { APK_PATH, BRAND } from './config';
import { apkAvailable, canPromptInstall, isStandalone, isWeb, platformKind, promptInstall, subscribeInstall } from './install';
import { Button, Card, colors, Heading, Muted } from './ui';

function IosSteps() {
  const steps: [string, string][] = [
    ['1', 'Откройте этот сайт именно в Safari (синий значок-компас). В Яндексе или Chrome установить не получится — скопируйте адрес my-school-51.ru и вставьте его в Safari.'],
    ['2', 'Нажмите внизу экрана кнопку «Поделиться» — квадратик со стрелкой вверх ⬆️. На iPad она вверху справа.'],
    ['3', 'Пролистайте меню вниз и выберите «На экран “Домой”» ➕.'],
    ['4', 'Нажмите «Добавить» в правом верхнем углу. Значок «Моя школа» появится среди ваших приложений — открывайте его как обычное приложение.'],
  ];
  return (
    <>
      <Heading>🍎 Как установить на iPhone и iPad</Heading>
      {steps.map(([n, t]) => (
        <View key={n} style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 5 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{n}</Text>
          </View>
          <Text style={{ flex: 1, color: colors.text, lineHeight: 22 }}>{t}</Text>
        </View>
      ))}
      <Muted>Файл APK подходит только для Android. Для iPhone отдельного файла не нужно — сайт работает как приложение.</Muted>
    </>
  );
}

/** Блок «Установить приложение»: кнопка установки, инструкции для iPhone/Android и ссылка на APK. */
export default function InstallCard() {
  const [, force] = useState(0);
  const [apk, setApk] = useState(false);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => subscribeInstall(() => force((n) => n + 1)), []);
  useEffect(() => {
    if (isWeb()) apkAvailable(APK_PATH).then(setApk);
  }, []);

  if (!isWeb() || isStandalone()) return null;
  const kind = platformKind();

  return (
    <Card>
      <Heading>📱 Приложение «{BRAND}» на телефон</Heading>
      <Muted>Установите сайт как приложение: значок на главном экране, открывается без адресной строки.</Muted>
      {canPromptInstall() && <Button title="Установить приложение" onPress={() => promptInstall()} />}
      {kind === 'ios' && <IosSteps />}
      {kind === 'android' && !canPromptInstall() && (
        <Text style={{ color: colors.text, lineHeight: 22 }}>
          Android: откройте меню браузера (три точки) и выберите «Установить приложение» или «Добавить на главный экран».
        </Text>
      )}
      {kind === 'desktop' && !canPromptInstall() && (
        <Text style={{ color: colors.text, lineHeight: 22 }}>
          Откройте этот сайт на телефоне, чтобы установить приложение. В Chrome на компьютере значок установки есть в адресной строке.
        </Text>
      )}
      {kind !== 'ios' && (
        <>
          <Button title={showIos ? 'Скрыть инструкцию для iPhone' : '🍎 У меня iPhone — как установить?'} kind="secondary" onPress={() => setShowIos(!showIos)} />
          {showIos && <IosSteps />}
        </>
      )}
      {apk && kind !== 'ios' && (
        <>
          <Button title="⬇️ Скачать приложение для Android (APK)" onPress={() => Linking.openURL(APK_PATH)} />
          <Muted>
            После скачивания откройте файл и разрешите установку из этого источника (Android спросит один раз). Это обычное приложение, магазин не нужен.
          </Muted>
        </>
      )}
    </Card>
  );
}
