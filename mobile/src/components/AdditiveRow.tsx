import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AdditiveFinding } from '../api/types';
import { riskColor, useTheme } from '../theme';
import { useApp } from '../context/AppContext';
import { riskLabel } from '../i18n';

interface Props {
  finding: AdditiveFinding;
  onOpen?: (code: string) => void;
}

/**
 * One found additive. Tapping expands the full explanation in place, which
 * keeps the "why is this bad" answer one tap away without leaving the result.
 */
export function AdditiveRow({ finding, onOpen }: Props): React.JSX.Element {
  const theme = useTheme();
  const { locale, t } = useApp();
  const [expanded, setExpanded] = useState(false);
  const color = riskColor(theme, finding.risk);

  return (
    <Pressable
      onPress={() => setExpanded((value) => !value)}
      onLongPress={() => onOpen?.(finding.code)}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1, borderColor: theme.border }]}
      accessibilityRole="button"
      accessibilityLabel={`${finding.code} ${finding.name}, ${riskLabel(locale, finding.risk)}`}
    >
      <View style={styles.header}>
        <View style={[styles.code, { backgroundColor: color }]}>
          <Text style={styles.codeText}>{finding.code}</Text>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[styles.name, { color: theme.text }]}>{finding.name}</Text>
          <Text style={[styles.risk, { color }]}>{riskLabel(locale, finding.risk)}</Text>
        </View>
      </View>

      <Text style={[styles.summary, { color: theme.textMuted }]}>{finding.summary}</Text>

      {expanded ? (
        <View style={styles.details}>
          <Text style={[styles.detail, { color: theme.text }]}>{finding.detail}</Text>

          {finding.restrictedIn.length > 0 ? (
            <Text style={[styles.meta, { color: theme.light.red }]}>
              {t('additives.restricted')}: {finding.restrictedIn.join(', ')}
            </Text>
          ) : null}

          {finding.confidence < 0.85 ? (
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {t('result.matchedAs')} «{finding.matchedText}»
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  code: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, minWidth: 52, alignItems: 'center' },
  codeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  titleBlock: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  risk: { fontSize: 12, marginTop: 1 },
  summary: { fontSize: 14, lineHeight: 19, marginTop: 6 },
  details: { marginTop: 10, gap: 8 },
  detail: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 12 },
});
