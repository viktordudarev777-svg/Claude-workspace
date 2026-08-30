import type { Nutriments, ProductInfo } from '../domain/types';
import { round } from '../util/text';

export interface OffConfig {
  baseUrl: string;
  userAgent: string;
  timeoutMs: number;
  enabled: boolean;
  /** Injected in tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

export interface OffProduct {
  product: ProductInfo;
  nutriments: Nutriments;
  /** Grade OFF itself computed, when present — used as a cross-check. */
  nutriScoreGrade: string | null;
  novaGroup: number | null;
}

export type OffLookup =
  | { status: 'found'; data: OffProduct }
  | { status: 'not-found' }
  | { status: 'unavailable'; reason: string };

/** Fields we ask for; keeping the list tight makes the response an order of magnitude smaller. */
const PRODUCT_FIELDS = [
  'code', 'product_name', 'product_name_ru', 'product_name_en', 'brands', 'quantity',
  'categories_tags', 'categories', 'image_front_url', 'image_url',
  'ingredients_text', 'ingredients_text_ru', 'ingredients_text_en',
  'additives_tags', 'nutriments', 'nutriscore_grade', 'nova_group', 'labels_tags',
].join(',');

const NUTRIMENT_MAP: Array<[keyof Nutriments, string[]]> = [
  ['energyKcal', ['energy-kcal_100g']],
  ['energyKj', ['energy-kj_100g', 'energy_100g']],
  ['fat', ['fat_100g']],
  ['saturatedFat', ['saturated-fat_100g']],
  ['transFat', ['trans-fat_100g']],
  ['carbohydrates', ['carbohydrates_100g']],
  ['sugars', ['sugars_100g']],
  ['fiber', ['fiber_100g']],
  ['protein', ['proteins_100g']],
  ['salt', ['salt_100g']],
  ['sodium', ['sodium_100g']],
  ['fruitsVegetablesNuts', [
    'fruits-vegetables-nuts_100g',
    'fruits-vegetables-nuts-estimate_100g',
    'fruits-vegetables-nuts-estimate-from-ingredients_100g',
  ]],
];

interface RawProduct {
  code?: string;
  product_name?: string;
  product_name_ru?: string;
  product_name_en?: string;
  brands?: string;
  quantity?: string;
  categories_tags?: string[];
  categories?: string;
  image_front_url?: string;
  image_url?: string;
  ingredients_text?: string;
  ingredients_text_ru?: string;
  ingredients_text_en?: string;
  nutriments?: Record<string, unknown>;
  nutriscore_grade?: string;
  nova_group?: number;
}

function pickNumber(source: Record<string, unknown> | undefined, keys: string[]): number | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return round(value, 3);
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value.replace(',', '.'));
      if (Number.isFinite(parsed)) return round(parsed, 3);
    }
  }
  return undefined;
}

/** Turns an OFF record into our domain shapes, tolerating every field being absent. */
export function mapOffProduct(raw: RawProduct, locale: 'ru' | 'en' = 'ru'): OffProduct {
  const nutriments: Nutriments = {};
  for (const [key, sources] of NUTRIMENT_MAP) {
    const value = pickNumber(raw.nutriments, sources);
    if (value !== undefined) nutriments[key] = value;
  }
  if (nutriments.salt === undefined && nutriments.sodium !== undefined) {
    nutriments.salt = round(nutriments.sodium * 2.5, 3);
  }

  const localizedName = locale === 'ru' ? raw.product_name_ru : raw.product_name_en;
  const localizedIngredients = locale === 'ru' ? raw.ingredients_text_ru : raw.ingredients_text_en;

  const categories = (raw.categories_tags ?? [])
    .map((tag) => tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' '))
    .concat((raw.categories ?? '').split(',').map((c) => c.trim()))
    .filter(Boolean);

  const product: ProductInfo = {
    barcode: raw.code ?? null,
    name: localizedName || raw.product_name || raw.product_name_en || null,
    brand: raw.brands ? raw.brands.split(',')[0]!.trim() : null,
    quantity: raw.quantity ?? null,
    categories: [...new Set(categories)],
    imageUrl: raw.image_front_url ?? raw.image_url ?? null,
    ingredientsText: localizedIngredients || raw.ingredients_text || raw.ingredients_text_en || null,
    ingredients: [],
    dataSource: 'openfoodfacts',
  };

  return {
    product,
    nutriments,
    nutriScoreGrade: raw.nutriscore_grade ?? null,
    novaGroup: typeof raw.nova_group === 'number' ? raw.nova_group : null,
  };
}

/** EAN-8/13 and UPC-A check-digit validation — rejects OCR misreads early. */
export function isValidBarcode(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  let sum = 0;
  // Weights alternate 3/1 from the right-hand end, whatever the length.
  for (let i = digits.length - 1, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) {
    sum += digits[i]! * weight;
  }
  return (10 - (sum % 10)) % 10 === check;
}

export class OpenFoodFactsClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: OffConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async request(path: string): Promise<unknown | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.config.baseUrl}${path}`, {
        headers: { 'User-Agent': this.config.userAgent, Accept: 'application/json' },
        signal: controller.signal,
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`OpenFoodFacts responded ${response.status}`);
      return (await response.json()) as unknown;
    } finally {
      clearTimeout(timer);
    }
  }

  async getByBarcode(barcode: string, locale: 'ru' | 'en' = 'ru'): Promise<OffLookup> {
    if (!this.config.enabled) return { status: 'unavailable', reason: 'offline-mode' };
    try {
      const body = (await this.request(
        `/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${PRODUCT_FIELDS}`,
      )) as { status?: number; product?: RawProduct } | null;

      if (!body || body.status === 0 || !body.product) return { status: 'not-found' };
      return { status: 'found', data: mapOffProduct(body.product, locale) };
    } catch (error) {
      return { status: 'unavailable', reason: error instanceof Error ? error.message : 'unknown error' };
    }
  }

  /**
   * Finds products in the same category, best Nutri-Score first.
   * Used to answer "what should I buy instead".
   */
  async searchByCategory(
    categoryTag: string,
    limit = 12,
    locale: 'ru' | 'en' = 'ru',
  ): Promise<OffProduct[]> {
    if (!this.config.enabled) return [];
    try {
      const params = new URLSearchParams({
        categories_tags_en: categoryTag,
        sort_by: 'popularity_key',
        page_size: String(limit),
        fields: PRODUCT_FIELDS,
      });
      const body = (await this.request(`/api/v2/search?${params.toString()}`)) as
        | { products?: RawProduct[] }
        | null;
      return (body?.products ?? []).map((raw) => mapOffProduct(raw, locale));
    } catch {
      return [];
    }
  }
}
