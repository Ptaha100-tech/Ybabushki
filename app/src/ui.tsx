import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

export const colors = {
  bg: '#F3F9FE',
  card: '#FFFFFF',
  primary: '#339DDA',
  primaryDark: '#2480B8',
  primarySoft: '#E6F3FD',
  cta: '#FD7124',
  dark: '#242424',
  text: '#242424',
  muted: '#5F6B76',
  good: '#16A34A',
  goodBg: '#DCFCE7',
  bad: '#DC2626',
  badBg: '#FEE2E2',
  border: '#D6E7F5',
  accent: '#FD7124',
};

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.screen}>
      <View style={s.column}>{children}</View>
    </ScrollView>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}

export function Heading({ children }: { children: React.ReactNode }) {
  return <Text style={s.heading}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.muted, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const primary = kind === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.button,
        primary ? s.buttonPrimary : s.buttonSecondary,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[s.buttonText, !primary && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} style={s.input} {...props} />
    </View>
  );
}

export function ErrorText({ text }: { text: string }) {
  return text ? <Text style={s.error}>{text}</Text> : null;
}

export function InfoText({ text }: { text: string }) {
  return text ? <Text style={s.info}>{text}</Text> : null;
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, style]}>{children}</View>;
}

const s = StyleSheet.create({
  screen: { padding: 16, paddingTop: 32, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 12 },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 14, marginBottom: 6 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', marginVertical: 4 },
  buttonPrimary: { backgroundColor: colors.cta },
  buttonSecondary: { backgroundColor: colors.primarySoft },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.primaryDark, fontWeight: '600' },
  label: { color: colors.muted, marginBottom: 4, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 13,
    fontSize: 16,
    backgroundColor: '#fff',
    color: colors.text,
  },
  error: { color: colors.bad, marginVertical: 8 },
  info: { color: colors.good, marginVertical: 8 },
});
