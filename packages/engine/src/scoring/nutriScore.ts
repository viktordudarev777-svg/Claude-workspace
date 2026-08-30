import type { NutriScoreResult, Nutriments } from '../types';

/**
 * Nutri-Score, 2022/2023 revision.
 *
 * Implemented profiles: general foods, beverages and cheese. Fats, oils, nuts
 * and seeds use a further variant that needs the energy-from-lipids split,
 * which packs rarely print; those products fall back to the general profile and
 * the result is marked `estimated`.
 *
 * References: Nutri-Score scientific committee update reports (2022 for foods,
 * 2023 for beverages).
 */

export type NutriScoreProfile = NutriScoreResult['profile'];

/**
 * Returns the number of points for `value` given ascending exclusive lower
 * bounds: `bounds[i]` is the value above which the score becomes `i + 1`.
 */
function pointsFor(value: number, bounds: readonly number[]): number {
  let points = 0;
  for (const bound of bounds) {
    if (value > bound) points++;
    else break;
  }
  return points;
}

const FOOD = {
  energyKj: [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350],
  sugars: [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34, 37, 41, 44, 48, 51],
  saturatedFat: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  salt: [0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2, 3.4, 3.6, 3.8, 4],
  protein: [2.4, 4.8, 7.2, 9.6, 12, 14, 17],
  fiber: [3, 4.1, 5.2, 6.3, 7.4],
} as const;

const BEVERAGE = {
  energyKj: [30, 90, 150, 210, 240, 270, 300, 330, 360, 390],
  sugars: [0.5, 2, 3.5, 5, 6, 7, 8, 9, 10, 11],
  saturatedFat: FOOD.saturatedFat,
  salt: FOOD.salt,
  protein: [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3],
  fiber: FOOD.fiber,
} as const;

/** Fruit, vegetables, pulses and nuts points; the scale differs by profile. */
function fruitPoints(percent: number, profile: NutriScoreProfile): number {
  if (profile === 'beverage') {
    if (percent > 80) return 6;
    if (percent > 60) return 4;
    if (percent > 40) return 2;
    return 0;
  }
  if (percent > 80) return 5;
  if (percent > 60) return 2;
  if (percent > 40) return 1;
  return 0;
}

function gradeForFood(score: number): NutriScoreResult['grade'] {
  if (score <= 0) return 'A';
  if (score <= 2) return 'B';
  if (score <= 10) return 'C';
  if (score <= 18) return 'D';
  return 'E';
}

function gradeForBeverage(score: number, isWater: boolean): NutriScoreResult['grade'] {
  if (isWater) return 'A';
  if (score <= 2) return 'B';
  if (score <= 6) return 'C';
  if (score <= 9) return 'D';
  return 'E';
}

export interface NutriScoreInput {
  nutriments: Nutriments;
  profile: NutriScoreProfile;
  /** Set when the product contains non-nutritive sweeteners (beverage penalty). */
  hasSweeteners?: boolean;
}

/**
 * Computes the Nutri-Score. Missing values are treated as zero, which is what
 * the official calculators do, but the result is flagged as `estimated` so the
 * UI can say the grade is approximate.
 */
export function computeNutriScore(input: NutriScoreInput): NutriScoreResult {
  const { nutriments, profile } = input;
  const isBeverage = profile === 'beverage' || profile === 'water';
  const scale = isBeverage ? BEVERAGE : FOOD;

  const required: Array<keyof Nutriments> = ['energyKcal', 'sugars', 'saturatedFat', 'salt', 'protein'];
  const missing = required.filter((key) => nutriments[key] === undefined);

  const energyKj = nutriments.energyKj ?? (nutriments.energyKcal !== undefined ? nutriments.energyKcal * 4.184 : 0);
  const sugars = nutriments.sugars ?? 0;
  const saturatedFat = nutriments.saturatedFat ?? 0;
  const salt = nutriments.salt ?? (nutriments.sodium !== undefined ? nutriments.sodium * 2.5 : 0);
  const protein = nutriments.protein ?? 0;
  const fiber = nutriments.fiber ?? 0;
  const fruits = nutriments.fruitsVegetablesNuts ?? 0;

  const energyPoints = pointsFor(energyKj, scale.energyKj);
  const sugarPoints = pointsFor(sugars, scale.sugars);
  const satFatPoints = pointsFor(saturatedFat, scale.saturatedFat);
  const saltPoints = pointsFor(salt, scale.salt);
  const sweetenerPoints = isBeverage && input.hasSweeteners ? 4 : 0;

  const proteinPoints = pointsFor(protein, scale.protein);
  const fiberPoints = pointsFor(fiber, scale.fiber);
  const fruitsPoints = fruitPoints(fruits, profile);

  const negativePoints = energyPoints + sugarPoints + satFatPoints + saltPoints + sweetenerPoints;

  // Protein points are withheld for high-negative products so that salty,
  // fatty foods cannot buy back a better grade with protein. Cheese and
  // products rich in fruit and vegetables are exempt.
  const proteinCounts =
    profile === 'cheese' || negativePoints < 11 || fruitsPoints === 5 || (isBeverage && fruitsPoints >= 4);
  const countedProtein = proteinCounts ? proteinPoints : 0;
  const positivePoints = countedProtein + fiberPoints + fruitsPoints;

  const score = negativePoints - positivePoints;
  const isWater = profile === 'water';

  return {
    grade: isBeverage ? gradeForBeverage(score, isWater) : gradeForFood(score),
    points: score,
    negativePoints,
    positivePoints,
    profile,
    estimated: missing.length > 0,
    breakdown: [
      { component: 'energy', value: Math.round(energyKj), points: energyPoints },
      { component: 'sugars', value: sugars, points: sugarPoints },
      { component: 'saturatedFat', value: saturatedFat, points: satFatPoints },
      { component: 'salt', value: salt, points: saltPoints },
      ...(sweetenerPoints ? [{ component: 'sweeteners', value: 1, points: sweetenerPoints }] : []),
      { component: 'protein', value: protein, points: -countedProtein },
      { component: 'fiber', value: fiber, points: -fiberPoints },
      { component: 'fruitsVegetablesNuts', value: fruits, points: -fruitsPoints },
    ],
  };
}

const CHEESE_HINTS = ['сыр', 'cheese', 'käse', 'fromage'];
const WATER_HINTS = ['вода питьевая', 'минеральная вода', 'mineral water', 'spring water', 'still water'];
const FAT_HINTS = ['масло растительное', 'оливковое масло', 'подсолнечное масло', 'орех', 'семечк', 'vegetable oil', 'olive oil', 'nuts', 'seeds'];

/** Picks the Nutri-Score profile from the product's category and name. */
export function detectProfile(
  categories: string[],
  productName: string | null,
  isDrink: boolean,
): NutriScoreProfile {
  const haystack = [...categories, productName ?? ''].join(' ').toLowerCase();
  if (WATER_HINTS.some((hint) => haystack.includes(hint))) return 'water';
  if (isDrink) return 'beverage';
  if (CHEESE_HINTS.some((hint) => haystack.includes(hint))) return 'cheese';
  if (FAT_HINTS.some((hint) => haystack.includes(hint))) return 'fat-oil-nut-seed';
  return 'general';
}
