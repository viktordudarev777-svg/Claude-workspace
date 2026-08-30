import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

interface Props {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/** The one container used across the app, so every screen has the same rhythm. */
export function Card({ title, subtitle, children, style }: Props): React.JSX.Element {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: theme.radius.md },
        style,
      ]}
    >
      {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}
      {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, padding: 16, marginHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 12 },
});
