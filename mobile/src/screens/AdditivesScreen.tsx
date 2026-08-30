import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import type { AdditiveSummary } from '../api/types';
import { EmptyView } from '../components/StateViews';
import { useApp } from '../context/AppContext';
import { riskColor, useTheme } from '../theme';
import { riskLabel } from '../i18n';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/** Searchable reference, so a code can be looked up without scanning anything. */
export function AdditivesScreen(): React.JSX.Element {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { context, locale, t } = useApp();

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<AdditiveSummary[]>([]);

  const search = useCallback(
    async (text: string) => {
      if (!context) return;
      try {
        const response = await api.additives(context, text);
        setItems(response.items);
      } catch {
        setItems([]);
      }
    },
    [context],
  );

  useEffect(() => {
    // Debounce: the list is small, but this keeps typing smooth on slow links.
    const timer = setTimeout(() => void search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t('additives.search')}
        placeholderTextColor={theme.textMuted}
        autoCapitalize="characters"
        style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.code}
        ListEmptyComponent={<EmptyView message={t('additives.empty')} />}
        contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('AdditiveDetail', { code: item.code })}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <View style={[styles.code, { backgroundColor: riskColor(theme, item.risk) }]}>
              <Text style={styles.codeText}>{item.code}</Text>
            </View>
            <View style={styles.body}>
              <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.summary, { color: theme.textMuted }]} numberOfLines={2}>
                {item.summary}
              </Text>
            </View>
            <Text style={[styles.risk, { color: riskColor(theme, item.risk) }]}>
              {riskLabel(locale, item.risk)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: { margin: 16, marginBottom: 8, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, fontSize: 16 },
  listContent: { padding: 16, paddingTop: 4 },
  emptyContent: { flexGrow: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10,
  },
  code: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 56, alignItems: 'center' },
  codeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  summary: { fontSize: 13, marginTop: 2, lineHeight: 17 },
  risk: { fontSize: 11, maxWidth: 70, textAlign: 'right' },
});
