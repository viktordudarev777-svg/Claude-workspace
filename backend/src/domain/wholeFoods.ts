import fs from 'node:fs';
import path from 'node:path';
import type { LocalizedText, Locale, Nutriments, ProductInfo } from './types';
import { normalize, editDistance } from '../util/text';
import { dataDir as defaultDataDir } from '../util/paths';

export interface WholeFood {
  id: string;
  kind: 'fruit' | 'vegetable' | 'meat' | 'fish' | 'dairy' | 'grain' | 'dish' | 'nuts' | 'other';
  names: LocalizedText;
  synonyms: string[];
  nutriments: Nutriments;
  note: LocalizedText;
}

let cache: WholeFood[] | null = null;

export function loadWholeFoods(dataDir = defaultDataDir()): WholeFood[] {
  if (!cache) {
    const raw = fs.readFileSync(path.join(dataDir, 'whole-foods.json'), 'utf8');
    cache = (JSON.parse(raw) as { foods: WholeFood[] }).foods;
  }
  return cache;
}

export interface WholeFoodMatch {
  food: WholeFood;
  /** 0..1 — how sure we are the photo really shows this. */
  confidence: number;
}

/**
 * Resolves vision labels ("green apple", "fruit", "produce") to a known food.
 *
 * Vision APIs return a ranked list of labels, so we walk them in order and take
 * the first that resolves: the model's own confidence ordering is more reliable
 * than any re-ranking we could do here.
 */
export function matchWholeFood(labels: Array<{ name: string; score: number }>): WholeFoodMatch | null {
  const foods = loadWholeFoods();

  for (const label of labels) {
    const needle = normalize(label.name);
    if (needle.length < 3) continue;

    for (const food of foods) {
      for (const synonym of food.synonyms) {
        const key = normalize(synonym);
        if (key === needle || needle.includes(key) || key.includes(needle)) {
          return { food, confidence: Math.min(0.95, label.score) };
        }
      }
    }
    // A near miss on a longer label is usually a plural or a spelling variant.
    for (const food of foods) {
      for (const synonym of food.synonyms) {
        const key = normalize(synonym);
        if (key.length >= 5 && editDistance(needle, key, 2) <= 2) {
          return { food, confidence: Math.min(0.75, label.score) };
        }
      }
    }
  }

  return null;
}

/** Presents a whole food as a `ProductInfo` so it flows through the normal analysis. */
export function toProductInfo(food: WholeFood, locale: Locale): ProductInfo {
  return {
    barcode: null,
    name: food.names[locale],
    brand: null,
    quantity: null,
    categories: [food.kind],
    imageUrl: null,
    // Whole foods have no ingredient list; the food itself is the ingredient.
    ingredientsText: food.names[locale],
    ingredients: [],
    dataSource: 'vision',
  };
}
