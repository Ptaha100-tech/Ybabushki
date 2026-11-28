import { RichText } from './Art';
import { colors, T } from './theme';
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

export { colors };

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.screen}>
      <View style={s.column}>{children}</View>
    </ScrollView>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <RichText style={s.title}>{children}</RichText>;
}

export function Heading({ children }: { children: React.ReactNode }) {
  return <RichText style={s.heading}>{children}</RichText>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <RichText style={[s.muted, style]}>{children}</RichText>;
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
      <RichText style={[s.chipText, active && { color: T.btnText }]}>{label}</RichText>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.muted} {...props} style={[s.input, props.style]} />
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
  title: { fontSize: 26, fontWeight: String(T.titleWeight) as any, color: colors.text, marginBottom: 12 },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
  muted: { color: colors.muted, fontSize: 14, marginBottom: 6 },
  card: {
    backgroundColor: colors.card,
    borderRadius: T.cardRadius,
    padding: T.cardPad,
    marginBottom: 12,
    borderWidth: T.cardBorder,
    borderColor: colors.border,
    ...(T.cardShadow ? ({ boxShadow: '0 6px 18px rgba(0,0,0,0.12)', elevation: 3 } as any) : {}),
  },
  button: { paddingVertical: T.btnPadY, paddingHorizontal: 20, borderRadius: T.btnRadius, alignItems: 'center', marginVertical: 4, ...(T.btnShadow ? ({ boxShadow: '0 5px 0 rgba(0,0,0,0.18)', elevation: 3 } as any) : {}) },
  buttonPrimary: { backgroundColor: colors.cta },
  buttonSecondary: { backgroundColor: colors.primarySoft },
  buttonText: { color: T.btnText, fontWeight: '700', fontSize: T.btnFont },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: T.chipRadius,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.card,
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
    backgroundColor: colors.card,
    color: colors.text,
  },
  error: { color: colors.bad, marginVertical: 8 },
  info: { color: colors.good, marginVertical: 8 },
});
