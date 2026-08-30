import React, { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, ApiError } from '../api/client';
import type { HistoryEntry, HistoryStats } from '../api/types';
import { EmptyView, ErrorView } from '../components/StateViews';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/** Everything scanned on this device, newest first. */
export function HistoryScreen(): React.JSX.Element {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { context, t, locale } = useApp();

  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!context) return;
    setRefreshing(true);
    try {
      const [history, statistics] = await Promise.all([
        api.history(context, { favorites: favoritesOnly }),
        api.historyStats(context),
      ]);
      setItems(history.items);
      setStats(statistics);
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : String(caught));
    } finally {
      setRefreshing(false);
    }
  }, [context, favoritesOnly]);

  // Reload on focus so a scan made a moment ago is already here.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (error && items.length === 0) return <ErrorView message={error} onRetry={() => void load()} />;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.tabs}>
        {([false, true] as const).map((value) => (
          <Pressable
            key={String(value)}
            onPress={() => setFavoritesOnly(value)}
            style={[
              styles.tab,
              {
                backgroundColor: favoritesOnly === value ? theme.accent : theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={{ color: favoritesOnly === value ? '#FFFFFF' : theme.text, fontWeight: '600' }}>
              {value ? t('history.favorites') : t('history.all')}
            </Text>
          </Pressable>
        ))}
      </View>

      {stats && stats.total > 0 ? (
        <Text style={[styles.stats, { color: theme.textMuted }]}>
          {t('history.stats', { total: stats.total, score: stats.averageScore })}
        </Text>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} tintColor={theme.accent} />}
        ListEmptyComponent={<EmptyView message={t('history.empty')} />}
        contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('Result', { scanId: item.id })}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="contain" />
            ) : (
              <View style={[styles.image, { backgroundColor: theme.surfaceAlt }]} />
            )}

            <View style={styles.body}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {item.name ?? item.barcode ?? t(`result.source.${item.source}`)}
              </Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                {[item.brand, new Date(item.scannedAt).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB')]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>

            {item.favorite ? <Text style={styles.star}>★</Text> : null}
            <View style={[styles.score, { backgroundColor: theme.light[item.light] }]}>
              <Text style={styles.scoreText}>{item.score}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  stats: { fontSize: 13, paddingHorizontal: 16, paddingBottom: 8 },
  listContent: { padding: 16, paddingTop: 4 },
  emptyContent: { flexGrow: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10,
  },
  image: { width: 44, height: 44, borderRadius: 8 },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 2 },
  star: { color: '#F5B84C', fontSize: 18 },
  score: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  scoreText: { color: '#FFFFFF', fontWeight: '700' },
});
