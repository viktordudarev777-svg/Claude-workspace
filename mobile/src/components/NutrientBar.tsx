import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NutrientLight } from '../api/types';
import { useTheme } from '../theme';

/**
 * One FSA traffic-light row. The explanation sits under the value because the
 * number alone ("1.8 г") means nothing without the threshold it is judged by.
 */
export function NutrientBar({ nutrient }: { nutrient: NutrientLight }): React.JSX.Element {
  const theme = useTheme();
  const color = theme.light[nutrient.light];

  return (
    <View style={styles.row}>
      <View style={[styles.pill, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={[styles.label, { color: theme.text }]}>{nutrient.label}</Text>
          <Text style={[styles.value, { color }]}>{nutrient.valuePer100g} г</Text>
        </View>
        <Text style={[styles.explanation, { color: theme.textMuted }]}>{nutrient.explanation}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  pill: { width: 4, borderRadius: 2 },
  body: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 15, fontWeight: '600' },
  value: { fontSize: 15, fontWeight: '700' },
  explanation: { fontSize: 13, lineHeight: 18, marginTop: 2 },
});
