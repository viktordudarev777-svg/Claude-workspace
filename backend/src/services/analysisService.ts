import type { AnalysisResult, Locale, Nutriments, ProductInfo } from '../domain/types';
import { analyzeProduct } from '../domain/analyze';
import { findAlternatives } from '../domain/recommend/alternatives';
import { parseNutritionLabel, toPer100g } from '../domain/nutrition/parseLabel';
import { extractIngredientSection } from '../domain/ingredients/parse';
import { matchWholeFood, toProductInfo } from '../domain/wholeFoods';
import { OpenFoodFactsClient, isValidBarcode } from '../integrations/openfoodfacts';
import type { OcrProvider } from '../integrations/ocr';
import type { VisionProvider } from '../integrations/vision';
import type { OffCacheRepository, ScanRepository } from '../db/repositories';
import { t } from '../util/i18n';

export interface AnalysisServiceDeps {
  off: OpenFoodFactsClient;
  ocr: OcrProvider;
  vision: VisionProvider;
  scans: ScanRepository;
  cache: OffCacheRepository;
}

function emptyProduct(overrides: Partial<ProductInfo> = {}): ProductInfo {
  return {
    barcode: null,
    name: null,
    brand: null,
    quantity: null,
    categories: [],
    imageUrl: null,
    ingredientsText: null,
    ingredients: [],
    dataSource: 'unknown',
    ...overrides,
  };
}

export class InvalidBarcodeError extends Error {
  constructor(barcode: string) {
    super(`"${barcode}" is not a valid EAN/UPC barcode`);
    this.name = 'InvalidBarcodeError';
  }
}

/**
 * Ties the three entry points (barcode, label text, photo) to the analysis
 * engine, and owns everything the engine deliberately does not: network calls,
 * caching, history.
 */
export class AnalysisService {
  constructor(private readonly deps: AnalysisServiceDeps) {}

  /** Barcode scan — the most reliable path, since it needs no OCR at all. */
  async analyzeBarcode(barcode: string, locale: Locale, deviceId: string | null): Promise<AnalysisResult> {
    const trimmed = barcode.trim();
    if (!isValidBarcode(trimmed)) throw new InvalidBarcodeError(trimmed);

    const warnings: string[] = [];
    let product = emptyProduct({ barcode: trimmed });
    let nutriments: Nutriments = {};

    const cached = this.deps.cache.get(trimmed);
    if (cached) {
      product = cached.product;
      nutriments = cached.nutriments;
    } else {
      const lookup = await this.deps.off.getByBarcode(trimmed, locale);
      if (lookup.status === 'found') {
        product = lookup.data.product;
        nutriments = lookup.data.nutriments;
        this.deps.cache.put(trimmed, lookup.data);
      } else if (lookup.status === 'not-found') {
        warnings.push(t(locale, 'warning.notInDatabase'));
      } else {
        warnings.push(t(locale, 'warning.offOffline'));
      }
    }

    const { result } = analyzeProduct({ source: 'barcode', locale, product, nutriments, warnings });
    return this.finish(result, deviceId, locale);
  }

  /**
   * Text recognised on the device. The client sends the raw OCR output, not a
   * cleaned-up version: normalisation lives here so improvements ship without
   * an app release.
   */
  async analyzeLabelText(
    rawText: string,
    locale: Locale,
    deviceId: string | null,
    options: { barcode?: string; ocrConfidence?: number } = {},
  ): Promise<AnalysisResult> {
    const warnings: string[] = [];
    const label = parseNutritionLabel(rawText);
    warnings.push(...label.warnings);

    let product = emptyProduct({
      ingredientsText: extractIngredientSection(rawText) || rawText,
      dataSource: 'label',
      barcode: options.barcode ?? null,
    });
    let nutriments = toPer100g(label);

    // A barcode alongside the photo lets us enrich the label with the name,
    // brand and image, which the label text alone cannot give us.
    if (options.barcode && isValidBarcode(options.barcode)) {
      const lookup = await this.deps.off.getByBarcode(options.barcode, locale);
      if (lookup.status === 'found') {
        product = {
          ...lookup.data.product,
          // The photographed label wins: it is what is physically in the user's hand.
          ingredientsText: product.ingredientsText || lookup.data.product.ingredientsText,
          dataSource: 'openfoodfacts',
        };
        nutriments = Object.keys(nutriments).length > 0 ? nutriments : lookup.data.nutriments;
      }
    }

    if ((options.ocrConfidence ?? 1) < 0.6) warnings.push(t(locale, 'warning.lowOcrConfidence'));

    const { result } = analyzeProduct({
      source: 'label-ocr',
      locale,
      product,
      nutriments,
      packText: rawText,
      warnings,
      inputConfidence: options.ocrConfidence ?? 0.85,
    });
    return this.finish(result, deviceId, locale);
  }

  /**
   * Photo of a product with no usable label — fresh produce, a cooked dish, or
   * a pack whose text the client could not read.
   *
   * Order matters: OCR first (a readable ingredient list beats any guess about
   * what the photo shows), then object recognition.
   */
  async analyzePhoto(imageBase64: string, locale: Locale, deviceId: string | null): Promise<AnalysisResult> {
    const warnings: string[] = [];

    const ocr = await this.deps.ocr.recognizeText(imageBase64).catch(() => ({ text: '', confidence: 0 }));
    const section = extractIngredientSection(ocr.text);
    if (section.length > 40) {
      return this.analyzeLabelText(ocr.text, locale, deviceId, { ocrConfidence: ocr.confidence });
    }

    const vision = await this.deps.vision
      .recognize(imageBase64)
      .catch(() => ({ labels: [], productName: null, barcode: null }));

    if (vision.barcode && isValidBarcode(vision.barcode)) {
      return this.analyzeBarcode(vision.barcode, locale, deviceId);
    }

    const match = matchWholeFood(vision.labels);
    if (match) {
      const product = toProductInfo(match.food, locale);
      const { result } = analyzeProduct({
        source: 'photo',
        locale,
        product,
        nutriments: match.food.nutriments,
        warnings,
        inputConfidence: match.confidence,
      });
      // A whole food has no additives to explain, so the food note carries the
      // explanation the user came for.
      result.flags.unshift({
        id: `whole-food-${match.food.id}`,
        severity: 'info',
        title: match.food.names[locale],
        explanation: match.food.note[locale],
        concerns: [],
      });
      return this.finish(result, deviceId, locale);
    }

    const { result } = analyzeProduct({
      source: 'photo',
      locale,
      product: emptyProduct({ dataSource: 'vision' }),
      nutriments: {},
      warnings: [...warnings, t(locale, 'warning.noIngredients')],
      inputConfidence: 0.2,
    });
    return this.finish(result, deviceId, locale);
  }

  /** Attaches alternatives and persists the scan. */
  private async finish(result: AnalysisResult, deviceId: string | null, locale: Locale): Promise<AnalysisResult> {
    if (result.verdict.light !== 'green' && result.product.categories.length > 0) {
      result.alternatives = await findAlternatives(result.product, result.verdict.score, this.deps.off, locale);
    }
    if (deviceId) {
      this.deps.scans.save(deviceId, result);
    }
    return result;
  }
}
