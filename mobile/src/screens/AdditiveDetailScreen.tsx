import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../api/client';
import type { AdditiveDetail } from '../api/types';
import { Card } from '../components/Card';
import { ErrorView, LoadingView } from '../components/StateViews';
import { useApp } from '../context/AppContext';
import { riskColor, useTheme } from '../theme';
import { riskLabel } from '../i18n';
import type { RootScreenProps } from '../navigation/types';

/** The full entry for one additive, including the sources behind the claims. */
export function AdditiveDetailScreen({ route }: RootScreenProps<'AdditiveDetail'>): React.JSX.Element {
  const theme = useTheme();
  const { context, locale, t } = useApp();
  const { code } = route.params;

  const [additive, setAdditive] = useState<AdditiveDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!context) return;
    try {
      setAdditive(await api.additive(code, context));
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : String(caught));
    }
  }, [code, context]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorView message={error} onRetry={() => void load()} />;
  if (!additive) return <LoadingView />;

  const color = riskColor(theme, additive.risk);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.code, { backgroundColor: color }]}>
          <Text style={styles.codeText}>{additive.code}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: theme.text }]}>{additive.name}</Text>
          <Text style={[styles.risk, { color }]}>{riskLabel(locale, additive.risk)}</Text>
        </View>
      </View>

      <Card>
        <Text style={[styles.detail, { color: theme.text }]}>{additive.detail}</Text>
      </Card>

      <Card>
        <Row label={t('additives.origin')} value={additive.origin} />
        <Row
          label={t('additives.adi')}
          value={
            additive.adiMgPerKgBw === null
              ? t('additives.adiNone')
              : t('additives.adiValue', { value: additive.adiMgPerKgBw })
          }
        />
        {additive.restrictedIn.length > 0 ? (
          <Row label={t('additives.restricted')} value={additive.restrictedIn.join(', ')} highlight />
        ) : null}
        <Row label={t('additives.alsoKnown')} value={additive.synonyms.slice(0, 6).join(', ')} />
      </Card>

      {additive.sources.length > 0 ? (
        <Card title={t('additives.sources')}>
          {additive.sources.map((source) => (
            <Pressable key={source.url} onPress={() => void Linking.openURL(source.url)} style={styles.source}>
              <Text style={[styles.sourceTitle, { color: theme.accent }]}>{source.title}</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: highlight ? theme.light.red : theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  code: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  codeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  headerText: { flex: 1 },
  name: { fontSize: 20, fontWeight: '700' },
  risk: { fontSize: 13, marginTop: 2 },
  detail: { fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 10 },
  rowLabel: { fontSize: 14, flexShrink: 0 },
  rowValue: { fontSize: 14, flex: 1, textAlign: 'right' },
  source: { paddingVertical: 8 },
  sourceTitle: { fontSize: 14, lineHeight: 19 },
});
