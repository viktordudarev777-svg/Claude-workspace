import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Flag } from '../api/types';
import { severityColor, useTheme } from '../theme';

const ICONS: Record<Flag['severity'], string> = { danger: '⛔️', warning: '⚠️', info: 'ℹ️' };

/** A single headline issue (or plus) with its plain-language explanation. */
export function FlagRow({ flag }: { flag: Flag }): React.JSX.Element {
  const theme = useTheme();
  const color = severityColor(theme, flag.severity);

  return (
    <View style={[styles.row, { borderLeftColor: color, backgroundColor: theme.surfaceAlt }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        {ICONS[flag.severity]} {flag.title}
      </Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>{flag.explanation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { borderLeftWidth: 3, borderRadius: 8, padding: 12, marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  body: { fontSize: 14, lineHeight: 19 },
});
