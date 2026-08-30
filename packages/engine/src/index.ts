/**
 * @foodlens/engine — the food-label analysis engine.
 *
 * Everything here is pure: no file access, no network, no Node built-ins. The
 * backend and the mobile app import the same code, which is what makes offline
 * analysis on the phone identical to the server's answer rather than an
 * approximation of it.
 *
 * Data (the additive database, whole foods) is supplied by the caller — from
 * disk on the server, from a cached bundle on the device.
 */

export * from './types';

export { buildAdditiveDatabase } from './additives/database';
export type { AdditiveDatabase, AdditiveGroup, Reference } from './additives/database';
export { findAdditives } from './additives/matcher';
export type { MatchResult } from './additives/matcher';

export { parseIngredients, extractIngredientSection, flattenIngredients } from './ingredients/parse';
export { parseNutritionLabel, toPer100g, extractNutritionSection } from './nutrition/parseLabel';
export type { ParsedNutritionLabel } from './nutrition/parseLabel';
export { nutrientLights, detectFoodKind, lightFor } from './nutrition/thresholds';
export type { FoodKind, LightNutrient } from './nutrition/thresholds';

export { computeNutriScore, detectProfile } from './scoring/nutriScore';
export type { NutriScoreInput, NutriScoreProfile } from './scoring/nutriScore';
export { buildFlags } from './scoring/flags';
export { scoreProduct } from './scoring/score';
export type { ScoreInput, ScoreResult, ScoreBreakdownEntry } from './scoring/score';

export { buildRecommendations } from './recommend/rules';
export type { RecommendInput } from './recommend/rules';

export { matchWholeFood, toProductInfo } from './wholeFoods';
export type { WholeFood, WholeFoodMatch } from './wholeFoods';

export { analyzeProduct } from './analyze';
export type { AnalyzeInput, AnalyzeOutput } from './analyze';

export { t, isLocale, localeFromHeader, pluralRu } from './i18n';
export type { MessageKey } from './i18n';

export {
  normalize, foldHomoglyphs, cleanOcrText, canonicalizeECode, repairECode,
  editDistance, parseNumber, round, clamp, normalizeWithMap,
} from './text';
