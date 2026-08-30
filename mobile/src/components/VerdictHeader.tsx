import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NutriScoreResult, Verdict } from '../api/types';
import { useTheme } from '../theme';
import { useApp } from '../context/AppContext';
import { NutriScoreBadge } from './NutriScoreBadge';

interface Props {
  verdict: Verdict;
  nutriScore: NutriScoreResult | null;
  source: string;
}

/**
 * The answer to "should I buy this", above the fold.
 *
 * The colour block carries the message on its own; the number is there for
 * people who want to compare two products, and the sentence explains the
 * colour so the verdict never looks arbitrary.
 */
export function VerdictHeader({ verdict, nutriScore, source }: Props): React.JSX.Element {
  const theme = useTheme();
  const { t } = useApp();
  const color = theme.light[verdict.light];

  return (
    <View style={[styles.container, { backgroundColor: theme.lightSoft[verdict.light] }]}>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: color }]}>
          <Text style={styles.score}>{verdict.score}</Text>
          <Text style={styles.scoreLabel}>{t('result.score')}</Text>
        </View>

        <View style={styles.headlineBlock}>
          <Text style={[styles.headline, { color }]} numberOfLines={2}>
            {verdict.headline}
          </Text>
          <Text style={[styles.source, { color: theme.textMuted }]}>{source}</Text>
        </View>

        {nutriScore ? <NutriScoreBadge result={nutriScore} /> : null}
      </View>

      <Text style={[styles.summary, { color: theme.text }]}>{verdict.summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dot: {
    width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center',
  },
  score: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', lineHeight: 32 },
  scoreLabel: { color: '#FFFFFF', fontSize: 10, opacity: 0.9 },
  headlineBlock: { flex: 1 },
  headline: { fontSize: 24, fontWeight: '800' },
  source: { fontSize: 13, marginTop: 2 },
  summary: { fontSize: 15, lineHeight: 21, marginTop: 14 },
});
