import type { Locale, NutrientLight, Nutriments, TrafficLight } from '../types';
import { t } from '../i18n';
import { round } from '../text';

/**
 * UK FSA front-of-pack criteria, per 100 g for food and per 100 ml for drinks.
 * `low` is the upper bound of green, `high` is the lower bound of red.
 */
const THRESHOLDS = {
  food: {
    fat: { low: 3, high: 17.5 },
    saturatedFat: { low: 1.5, high: 5 },
    sugars: { low: 5, high: 22.5 },
    salt: { low: 0.3, high: 1.5 },
  },
  drink: {
    fat: { low: 1.5, high: 8.75 },
    saturatedFat: { low: 0.75, high: 2.5 },
    sugars: { low: 2.5, high: 11.25 },
    salt: { low: 0.3, high: 0.75 },
  },
} as const;

export type FoodKind = 'food' | 'drink';

const NUTRIENT_KEYS = ['fat', 'saturatedFat', 'sugars', 'salt'] as const;
export type LightNutrient = (typeof NUTRIENT_KEYS)[number];

export function lightFor(nutrient: LightNutrient, valuePer100g: number, kind: FoodKind): TrafficLight {
  const { low, high } = THRESHOLDS[kind][nutrient];
  if (valuePer100g <= low) return 'green';
  return valuePer100g > high ? 'red' : 'yellow';
}

/** Builds the per-nutrient traffic lights shown under the verdict. */
export function nutrientLights(
  nutriments: Nutriments,
  kind: FoodKind,
  locale: Locale,
): NutrientLight[] {
  const lights: NutrientLight[] = [];

  for (const nutrient of NUTRIENT_KEYS) {
    const value = nutriments[nutrient];
    if (value === undefined || !Number.isFinite(value)) continue;

    const light = lightFor(nutrient, value, kind);
    const name = t(locale, `nutrient.${nutrient}` as const);
    const params = { name, value: round(value, 1), unit: 'г', limit: THRESHOLDS[kind][nutrient].high };

    lights.push({
      nutrient,
      valuePer100g: round(value, 1),
      light,
      label: name,
      explanation:
        light === 'green' ? t(locale, 'nutrient.low', params)
        : light === 'yellow' ? t(locale, 'nutrient.medium', params)
        : t(locale, 'nutrient.high', params),
    });
  }

  return lights;
}

/** Category hints that mean the FSA drink thresholds apply. */
const DRINK_HINTS = [
  'напит', 'сок', 'вода', 'газиров', 'лимонад', 'квас', 'морс', 'нектар', 'пиво', 'вино',
  'beverage', 'drink', 'juice', 'water', 'soda', 'nectar', 'beer', 'wine', 'getränk',
];

/** Decides whether the FSA food or drink thresholds apply. */
export function detectFoodKind(categories: string[], productName: string | null): FoodKind {
  const haystack = [...categories, productName ?? ''].join(' ').toLowerCase();
  return DRINK_HINTS.some((hint) => haystack.includes(hint)) ? 'drink' : 'food';
}
