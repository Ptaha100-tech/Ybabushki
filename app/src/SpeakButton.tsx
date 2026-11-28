import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Card, colors, Heading, Muted } from './ui';
import { setSoundSetting, speak, stopSpeaking, useSoundSettings } from './sound';

/** Кнопка «Прослушать»: читает текст вслух. */
export function SpeakButton({ text, label = '🔊 Прослушать' }: { text: string; label?: string }) {
  return (
    <Pressable
      onPress={() => speak(text)}
      onLongPress={stopSpeaking}
      style={{ alignSelf: 'flex-start', backgroundColor: '#E6F3FD', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginVertical: 6 }}
    >
      <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

function Toggle({ title, hint, value, onChange }: { title: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 }}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{title}</Text>
        <Muted>{hint}</Muted>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
    </View>
  );
}

/** Настройки звука: эффекты, музыка, озвучка. */
export default function SoundSettingsCard() {
  const st = useSoundSettings();
  return (
    <Card>
      <Heading>🔊 Звук</Heading>
      <Toggle title="Звуковые эффекты" hint="Звонкий сигнал за верный ответ, мелодии в играх" value={st.sfx} onChange={(v) => setSoundSetting('sfx', v)} />
      <Toggle title="Фоновая музыка" hint="Тихая мелодия во время занятий" value={st.music} onChange={(v) => setSoundSetting('music', v)} />
      <Toggle title="Озвучка вслух" hint="Сама читает пояснения и обучение. Кнопку «🔊 Прослушать» можно нажать и без этого" value={st.voice} onChange={(v) => setSoundSetting('voice', v)} />
    </Card>
  );
}
