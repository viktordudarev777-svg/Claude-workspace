import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';
import { API_BASE_URL } from '../api/client';
import { hasOnDeviceOcr } from '../ocr';
import { refreshBundle } from '../engine/data';
import { referenceVersion } from '../engine/offlineAnalysis';
import { pendingCount } from '../offline/queue';
import type { Locale } from '../api/types';

const LANGUAGES: Array<{ code: Locale; label: string }> = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];

/** Language, what the app knows about this device, and the honest caveats. */
export function SettingsScreen(): React.JSX.Element {
  const theme = useTheme();
  const { locale, setLocale, deviceId, t } = useApp();

  const [reference, setReference] = useState<{ version: string; origin: string } | null>(null);
  const [pending, setPending] = useState(0);
  const [refreshState, setRefreshState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');

  const load = useCallback(async () => {
    setReference(await referenceVersion());
    setPending(await pendingCount());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshState('busy');
    try {
      await refreshBundle();
      await load();
      setRefreshState('done');
    } catch {
      setRefreshState('failed');
    }
  }, [load]);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Card title={t('settings.language')}>
        <View style={styles.languages}>
          {LANGUAGES.map((language) => (
            <Pressable
              key={language.code}
              onPress={() => setLocale(language.code)}
              style={[
                styles.language,
                {
                  backgroundColor: locale === language.code ? theme.accent : theme.surfaceAlt,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={{ color: locale === language.code ? '#FFFFFF' : theme.text, fontWeight: '600' }}>
                {language.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card title={t('settings.offline')}>
        <Text style={[styles.body, { color: theme.text }]}>{t('settings.offlineBody')}</Text>

        <Text style={[styles.mono, { color: theme.textMuted }]}>
          {t('settings.reference')}: {reference?.version ?? '…'}
          {reference
            ? ` (${reference.origin === 'downloaded' ? t('settings.referenceDownloaded') : t('settings.referenceSnapshot')})`
            : ''}
        </Text>

        {pending > 0 ? (
          <Text style={[styles.mono, { color: theme.light.yellow }]}>
            {t('settings.pending', { count: pending })}
          </Text>
        ) : null}

        <Pressable
          onPress={() => void refresh()}
          disabled={refreshState === 'busy'}
          style={[styles.refresh, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
        >
          {refreshState === 'busy' ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <Text style={{ color: theme.accent, fontWeight: '600' }}>{t('settings.refresh')}</Text>
          )}
        </Pressable>

        {refreshState === 'done' ? (
          <Text style={[styles.body, { color: theme.light.green }]}>{t('settings.refreshed')}</Text>
        ) : null}
        {refreshState === 'failed' ? (
          <Text style={[styles.body, { color: theme.light.red }]}>{t('settings.refreshFailed')}</Text>
        ) : null}
      </Card>

      <Card title={t('settings.disclaimer')}>
        <Text style={[styles.body, { color: theme.text }]}>{t('settings.disclaimerBody')}</Text>
      </Card>

      <Card title={t('settings.privacy')}>
        <Text style={[styles.body, { color: theme.text }]}>{t('settings.privacyBody')}</Text>
        <Text style={[styles.mono, { color: theme.textMuted }]}>
          {t('settings.deviceId')}: {deviceId ?? '…'}
        </Text>
      </Card>

      <Card title={t('settings.server')}>
        <Text style={[styles.mono, { color: theme.textMuted }]}>{API_BASE_URL}</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          OCR: {hasOnDeviceOcr() ? 'on-device' : 'server'}
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 40 },
  languages: { flexDirection: 'row', gap: 10 },
  language: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  body: { fontSize: 14, lineHeight: 20 },
  mono: { fontSize: 12, marginTop: 8, fontFamily: 'monospace' },
  refresh: {
    marginTop: 12, alignItems: 'center', paddingVertical: 11,
    borderRadius: 999, borderWidth: StyleSheet.hairlineWidth,
  },
});
