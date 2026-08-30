import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';
import { API_BASE_URL } from '../api/client';
import { hasOnDeviceOcr } from '../ocr';
import type { Locale } from '../api/types';

const LANGUAGES: Array<{ code: Locale; label: string }> = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
];

/** Language, what the app knows about this device, and the honest caveats. */
export function SettingsScreen(): React.JSX.Element {
  const theme = useTheme();
  const { locale, setLocale, deviceId, t } = useApp();

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
});
