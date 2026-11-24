import React, { useEffect, useState } from 'react';
import { Linking, Text } from 'react-native';
import { APK_PATH, BRAND } from './config';
import { apkAvailable, canPromptInstall, isStandalone, isWeb, platformKind, promptInstall, subscribeInstall } from './install';
import { Button, Card, colors, Heading, Muted } from './ui';

/** Блок «Установить приложение»: кнопка установки, инструкции для iPhone/Android и ссылка на APK. */
export default function InstallCard() {
  const [, force] = useState(0);
  const [apk, setApk] = useState(false);

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
      {kind === 'ios' && (
        <Text style={{ color: colors.text, lineHeight: 22 }}>
          iPhone/iPad: откройте сайт в Safari, нажмите «Поделиться» (квадрат со стрелкой) и выберите «На экран “Домой”».
        </Text>
      )}
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
      {apk && kind !== 'ios' && <Button kind="secondary" title="Скачать APK для Android" onPress={() => Linking.openURL(APK_PATH)} />}
    </Card>
  );
}
