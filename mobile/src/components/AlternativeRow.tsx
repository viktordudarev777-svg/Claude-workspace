import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AlternativeProduct } from '../api/types';
import { useTheme } from '../theme';

interface Props {
  product: AlternativeProduct;
  onPress?: (barcode: string) => void;
}

/** A better-scoring product from the same category. */
export function AlternativeRow({ product, onPress }: Props): React.JSX.Element {
  const theme = useTheme();
  const color = theme.light[product.light];

  return (
    <Pressable
      disabled={!product.barcode}
      onPress={() => product.barcode && onPress?.(product.barcode)}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={[styles.image, { backgroundColor: theme.surfaceAlt }]} />
      )}

      <View style={styles.body}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        {product.brand ? (
          <Text style={[styles.brand, { color: theme.textMuted }]}>{product.brand}</Text>
        ) : null}
        <Text style={[styles.reason, { color: theme.textMuted }]}>{product.reason}</Text>
      </View>

      <View style={[styles.score, { backgroundColor: color }]}>
        <Text style={styles.scoreText}>{product.score}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  image: { width: 48, height: 48, borderRadius: 8 },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  brand: { fontSize: 13 },
  reason: { fontSize: 12, marginTop: 2 },
  score: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scoreText: { color: '#FFFFFF', fontWeight: '700' },
});
