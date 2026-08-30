import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NutriScoreResult } from '../api/types';
import { useTheme } from '../theme';

/** Official Nutri-Score colours, so the badge is recognisable at a glance. */
const GRADE_COLORS: Record<NutriScoreResult['grade'], string> = {
  A: '#038141',
  B: '#85BB2F',
  C: '#FECB02',
  D: '#EE8100',
  E: '#E63E11',
};

export function NutriScoreBadge({ result }: { result: NutriScoreResult }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      <View style={[styles.badge, { backgroundColor: GRADE_COLORS[result.grade] }]}>
        <Text style={styles.grade}>{result.grade}</Text>
      </View>
      <Text style={[styles.caption, { color: theme.textMuted }]}>
        Nutri-Score{result.estimated ? '*' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  badge: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  grade: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  caption: { fontSize: 10, marginTop: 4 },
});
