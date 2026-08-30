import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { useApp } from '../context/AppContext';

export function LoadingView({ message }: { message?: string }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.accent} />
      {message ? <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}
    </View>
  );
}

export function EmptyView({ message }: { message: string }): React.JSX.Element {
  const theme = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
    </View>
  );
}

interface ErrorProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorView({ message, onRetry }: ErrorProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useApp();

  return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t('error.title')}</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={[styles.button, { backgroundColor: theme.accent }]}>
          <Text style={styles.buttonText}>{t('error.retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  title: { fontSize: 18, fontWeight: '700' },
  message: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  button: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999 },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});
