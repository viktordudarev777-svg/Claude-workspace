import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Recommendation } from '../api/types';
import { useTheme } from '../theme';

/** Advice, with the reason underneath so it never reads as an arbitrary rule. */
export function RecommendationRow({ recommendation }: { recommendation: Recommendation }): React.JSX.Element {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.bullet, { backgroundColor: theme.accent }]} />
      <View style={styles.body}>
        <Text style={[styles.text, { color: theme.text }]}>{recommendation.text}</Text>
        <Text style={[styles.rationale, { color: theme.textMuted }]}>{recommendation.rationale}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  bullet: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  body: { flex: 1 },
  text: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  rationale: { fontSize: 13, lineHeight: 18, marginTop: 3 },
});
