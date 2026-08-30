import type { AlternativeProduct, Locale, ProductInfo } from '../types';
import type { OpenFoodFactsClient, OffProduct } from '../../integrations/openfoodfacts';
import { analyzeProduct } from '../analyze';
import { t } from '../../util/i18n';

/**
 * Suggests better products from the same category.
 *
 * Candidates come from Open Food Facts and are then scored with *our* engine
 * rather than trusting the grade OFF stores: the point of the screen is "better
 * by the same yardstick you just saw".
 */
export async function findAlternatives(
  product: ProductInfo,
  currentScore: number,
  client: OpenFoodFactsClient,
  locale: Locale,
  limit = 3,
): Promise<AlternativeProduct[]> {
  const category = pickCategory(product.categories);
  if (!category) return [];

  const candidates = await client.searchByCategory(category, 20, locale);
  const scored: AlternativeProduct[] = [];

  for (const candidate of candidates) {
    if (!candidate.product.ingredientsText) continue;
    if (candidate.product.barcode && candidate.product.barcode === product.barcode) continue;

    const { result } = analyzeProduct({
      source: 'barcode',
      locale,
      product: candidate.product,
      nutriments: candidate.nutriments,
    });

    // Only worth showing if it beats the scanned product by a clear margin.
    if (result.verdict.score < currentScore + 10) continue;

    scored.push({
      barcode: candidate.product.barcode,
      name: candidate.product.name ?? '—',
      brand: candidate.product.brand,
      imageUrl: candidate.product.imageUrl,
      score: result.verdict.score,
      light: result.verdict.light,
      reason: t(locale, 'alt.reason.betterScore', { score: result.verdict.score }),
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Picks the most specific usable category tag.
 *
 * OFF category lists run from general to specific ("Snacks" → "Chocolate
 * biscuits"), and the specific end gives comparable products; anything shorter
 * than three characters is a stray tag fragment.
 */
export function pickCategory(categories: string[]): string | null {
  const usable = categories.filter((c) => c.length >= 3);
  if (usable.length === 0) return null;
  return usable[usable.length - 1]!.toLowerCase().replace(/\s+/g, '-');
}

/** Re-exported for tests that need to build a candidate without the network. */
export type { OffProduct };
