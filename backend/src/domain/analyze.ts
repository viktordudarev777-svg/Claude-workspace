import { randomUUID } from 'node:crypto';
import type {
  AnalysisResult, AnalysisSource, Confidence, Locale, Nutriments, ProductInfo,
} from './types';
import { getAdditiveDatabase } from './additives/database';
import { findAdditives } from './additives/matcher';
import { parseIngredients, extractIngredientSection } from './ingredients/parse';
import { detectFoodKind, nutrientLights } from './nutrition/thresholds';
import { computeNutriScore, detectProfile } from './scoring/nutriScore';
import { buildFlags } from './scoring/flags';
import { scoreProduct, type ScoreBreakdownEntry } from './scoring/score';
import { buildRecommendations } from './recommend/rules';
import { t } from '../util/i18n';
import { clamp } from '../util/text';

export interface AnalyzeInput {
  source: AnalysisSource;
  locale: Locale;
  product: ProductInfo;
  nutriments: Nutriments;
  /** Text from the pack outside the ingredient list: claims, warnings, storage. */
  packText?: string;
  /** Warnings accumulated upstream (OCR quality, database unavailable, ...). */
  warnings?: string[];
  /** 0..1 quality of the upstream recognition step. */
  inputConfidence?: number;
}

export interface AnalyzeOutput {
  result: AnalysisResult;
  /** Why the score is what it is; returned on the debug endpoint, not to the app. */
  breakdown: ScoreBreakdownEntry[];
}

function assessConfidence(
  input: AnalyzeInput,
  hasIngredients: boolean,
  hasNutrition: boolean,
  locale: Locale,
): Confidence {
  const notes: string[] = [];
  let confidence = input.inputConfidence ?? 1;

  if (input.product.dataSource === 'openfoodfacts') {
    confidence = Math.min(1, confidence + 0.1);
  }
  if (!hasIngredients) {
    confidence -= 0.35;
    notes.push(t(locale, 'warning.noIngredients'));
  }
  if (!hasNutrition) {
    confidence -= 0.2;
    notes.push(t(locale, 'warning.noNutrition'));
  }
  if (input.source === 'photo' && input.product.dataSource === 'vision') {
    confidence -= 0.15;
  }

  return { overall: Number(clamp(confidence, 0.05, 1).toFixed(2)), notes };
}

/**
 * The single place where a product becomes a verdict.
 *
 * Pure and synchronous: everything network-bound (barcode lookup, OCR, finding
 * alternatives) happens in the routes, so this can be unit-tested against
 * fixtures and reused unchanged for a future on-device port.
 */
export function analyzeProduct(input: AnalyzeInput): AnalyzeOutput {
  const { locale } = input;
  const db = getAdditiveDatabase();
  const warnings = [...(input.warnings ?? [])];

  const rawIngredients = input.product.ingredientsText ?? '';
  const ingredientSection = extractIngredientSection(rawIngredients);
  const ingredients = parseIngredients(rawIngredients);

  const { findings, unknownCodes } = findAdditives(ingredientSection || rawIngredients, db, locale);
  if (unknownCodes.length > 0) {
    warnings.push(t(locale, 'warning.unknownCodes', { list: unknownCodes.join(', ') }));
  }

  const kind = detectFoodKind(input.product.categories, input.product.name);
  const lights = nutrientLights(input.nutriments, kind, locale);

  const hasNutrition = Object.keys(input.nutriments).length > 0;
  const hasIngredients = ingredients.length > 0;

  const nutriScore = hasNutrition
    ? computeNutriScore({
        nutriments: input.nutriments,
        profile: detectProfile(input.product.categories, input.product.name, kind === 'drink'),
        hasSweeteners: findings.some((f) => f.category === 'sweetener'),
      })
    : null;

  const flags = buildFlags({
    ingredients,
    additives: findings,
    nutriments: input.nutriments,
    locale,
    packText: input.packText ?? '',
  });

  const { verdict, breakdown } = scoreProduct({
    additives: findings,
    nutrientLights: lights,
    nutriScore,
    flags,
    ingredientCount: ingredients.length,
    locale,
  });

  const recommendations = buildRecommendations({
    additives: findings,
    flags,
    nutriments: input.nutriments,
    ingredientCount: ingredients.length,
    verdict,
    locale,
  });

  if (!hasIngredients && !warnings.some((w) => w === t(locale, 'warning.noIngredients'))) {
    warnings.push(t(locale, 'warning.noIngredients'));
  }
  if (!hasNutrition) warnings.push(t(locale, 'warning.noNutrition'));

  const result: AnalysisResult = {
    id: randomUUID(),
    source: input.source,
    scannedAt: new Date().toISOString(),
    locale,
    product: { ...input.product, ingredients },
    verdict,
    nutriScore,
    nutriments: input.nutriments,
    nutrientLights: lights,
    additives: findings,
    flags,
    recommendations,
    alternatives: [],
    confidence: assessConfidence(input, hasIngredients, hasNutrition, locale),
    warnings: [...new Set(warnings)],
  };

  return { result, breakdown };
}
