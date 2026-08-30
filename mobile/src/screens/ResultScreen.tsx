import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, ApiError } from '../api/client';
import type { AnalysisResult } from '../api/types';
import { Card } from '../components/Card';
import { VerdictHeader } from '../components/VerdictHeader';
import { NutrientBar } from '../components/NutrientBar';
import { AdditiveRow } from '../components/AdditiveRow';
import { FlagRow } from '../components/FlagRow';
import { RecommendationRow } from '../components/RecommendationRow';
import { AlternativeRow } from '../components/AlternativeRow';
import { ErrorView, LoadingView } from '../components/StateViews';
import { useApp } from '../context/AppContext';
import { useTheme } from '../theme';
import { cacheResult, getCachedResult } from '../state/resultCache';
import type { RootScreenProps, RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * The analysis, in the order a shopper needs it: the verdict first, then what
 * is wrong, then what to do about it, and only then the raw data.
 */
export function ResultScreen({ route }: RootScreenProps<'Result'>): React.JSX.Element {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { context, t } = useApp();
  const { scanId } = route.params;

  const [result, setResult] = useState<AnalysisResult | null>(() => getCachedResult(scanId) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);

  const load = useCallback(async () => {
    if (!context || result) return;
    try {
      const fetched = await api.scan(scanId, context);
      cacheResult(fetched);
      setResult(fetched);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : String(caught));
    }
  }, [context, result, scanId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFavorite = useCallback(async () => {
    if (!context || !result) return;
    const next = !favorite;
    setFavorite(next);
    try {
      await api.setFavorite(result.id, next, context);
    } catch {
      setFavorite(!next);
    }
  }, [context, result, favorite]);

  if (error) return <ErrorView message={error} onRetry={() => void load()} />;
  if (!result) return <LoadingView message={t('scan.analyzing')} />;

  const { product, verdict } = result;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <View style={[styles.productHeader, { backgroundColor: theme.lightSoft[verdict.light] }]}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="contain" />
        ) : null}
        <View style={styles.productText}>
          <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
            {product.name ?? t('result.source.label-ocr')}
          </Text>
          {product.brand || product.quantity ? (
            <Text style={[styles.productMeta, { color: theme.textMuted }]}>
              {[product.brand, product.quantity].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>
      </View>

      <VerdictHeader
        verdict={verdict}
        nutriScore={result.nutriScore}
        source={t(`result.source.${result.source}`)}
      />

      {result.flags.length > 0 ? (
        <Card title={t('result.flags')}>
          {result.flags.map((flag) => (
            <FlagRow key={flag.id} flag={flag} />
          ))}
        </Card>
      ) : null}

      <Card title={t('result.additives')}>
        {result.additives.length === 0 ? (
          <Text style={[styles.muted, { color: theme.textMuted }]}>{t('result.noAdditives')}</Text>
        ) : (
          result.additives.map((finding) => (
            <AdditiveRow
              key={finding.code}
              finding={finding}
              onOpen={(code) => navigation.navigate('AdditiveDetail', { code })}
            />
          ))
        )}
      </Card>

      {result.nutrientLights.length > 0 ? (
        <Card title={t('result.nutrition')}>
          {result.nutrientLights.map((nutrient) => (
            <NutrientBar key={nutrient.nutrient} nutrient={nutrient} />
          ))}
          <NutrimentGrid result={result} />
        </Card>
      ) : null}

      {result.recommendations.length > 0 ? (
        <Card title={t('result.recommendations')}>
          {result.recommendations.map((recommendation) => (
            <RecommendationRow key={recommendation.id} recommendation={recommendation} />
          ))}
        </Card>
      ) : null}

      {result.alternatives.length > 0 ? (
        <Card title={t('result.alternatives')}>
          {result.alternatives.map((alternative, index) => (
            <AlternativeRow key={alternative.barcode ?? String(index)} product={alternative} />
          ))}
        </Card>
      ) : null}

      {product.ingredientsText ? (
        <Card title={t('result.ingredients')}>
          <Text style={[styles.ingredients, { color: theme.textMuted }]}>{product.ingredientsText}</Text>
        </Card>
      ) : null}

      {result.warnings.length > 0 ? (
        <Card title={t('result.warnings')} subtitle={`${t('result.confidence')}: ${Math.round(result.confidence.overall * 100)}%`}>
          {result.warnings.map((warning) => (
            <Text key={warning} style={[styles.warning, { color: theme.textMuted }]}>
              • {warning}
            </Text>
          ))}
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={() => void toggleFavorite()}
          style={[styles.action, { borderColor: theme.border, backgroundColor: theme.surface }]}
        >
          <Text style={{ color: theme.text, fontWeight: '600' }}>
            {favorite ? `★ ${t('result.saved')}` : `☆ ${t('result.save')}`}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.popTo('Tabs')}
          style={[styles.action, { backgroundColor: theme.accent, borderColor: theme.accent }]}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{t('result.rescan')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/** The numbers behind the traffic lights, for people who want them. */
function NutrimentGrid({ result }: { result: AnalysisResult }): React.JSX.Element {
  const theme = useTheme();
  const rows: Array<[string, number | undefined, string]> = [
    ['Калории', result.nutriments.energyKcal, 'ккал'],
    ['Белки', result.nutriments.protein, 'г'],
    ['Жиры', result.nutriments.fat, 'г'],
    ['Углеводы', result.nutriments.carbohydrates, 'г'],
    ['Клетчатка', result.nutriments.fiber, 'г'],
  ];

  return (
    <View style={[styles.grid, { borderTopColor: theme.border }]}>
      {rows
        .filter((row): row is [string, number, string] => row[1] !== undefined)
        .map(([label, value, unit]) => (
          <View key={label} style={styles.gridCell}>
            <Text style={[styles.gridValue, { color: theme.text }]}>
              {value} {unit}
            </Text>
            <Text style={[styles.gridLabel, { color: theme.textMuted }]}>{label}</Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  productHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, paddingBottom: 8 },
  productImage: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#FFFFFF' },
  productText: { flex: 1 },
  productName: { fontSize: 19, fontWeight: '700' },
  productMeta: { fontSize: 13, marginTop: 2 },

  muted: { fontSize: 14, lineHeight: 20 },
  ingredients: { fontSize: 14, lineHeight: 20 },
  warning: { fontSize: 13, lineHeight: 19, marginBottom: 6 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 4 },
  gridCell: { width: '33%', marginBottom: 10 },
  gridValue: { fontSize: 15, fontWeight: '700' },
  gridLabel: { fontSize: 12 },

  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 4 },
  action: {
    flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
