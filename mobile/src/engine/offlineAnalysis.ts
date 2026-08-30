import {
  analyzeProduct, extractIngredientSection, parseNutritionLabel, t, toPer100g,
  type AnalysisResult, type Locale, type ProductInfo,
} from '@foodlens/engine';
import { getEngineData } from './data';

/**
 * Runs the full analysis on the device.
 *
 * This is the same engine the server runs, on the same data, so the verdict is
 * identical rather than a simplified stand-in. What is missing offline is
 * everything that needs the network: the Open Food Facts lookup that gives a
 * product its name and picture, and the alternatives.
 */
export async function analyzeLabelOffline(
  rawText: string,
  locale: Locale,
  options: { barcode?: string; ocrConfidence?: number } = {},
): Promise<AnalysisResult> {
  const { additives } = await getEngineData();

  const label = parseNutritionLabel(rawText);
  const product: ProductInfo = {
    barcode: options.barcode ?? null,
    name: null,
    brand: null,
    quantity: null,
    categories: [],
    imageUrl: null,
    ingredientsText: extractIngredientSection(rawText) || rawText,
    ingredients: [],
    dataSource: 'label',
  };

  const { result } = analyzeProduct({
    source: 'label-ocr',
    locale,
    additives,
    product,
    nutriments: toPer100g(label),
    packText: rawText,
    warnings: [...label.warnings, t(locale, 'warning.offline')],
    inputConfidence: options.ocrConfidence ?? 0.85,
  });

  return result;
}

/** How old the on-device reference data is, for the settings screen. */
export async function referenceVersion(): Promise<{ version: string; origin: string }> {
  const { version, origin } = await getEngineData();
  return { version, origin };
}
