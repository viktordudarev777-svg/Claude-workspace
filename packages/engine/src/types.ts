/**
 * Core domain contract of FoodLens.
 *
 * Everything the mobile client renders is described here. The API localises
 * texts server-side (see `util/i18n.ts`), so the client receives plain strings
 * and never has to ship the additive dictionary itself.
 */

export type Locale = 'ru' | 'en';

/** How dangerous a component is, on the scale we show the user. */
export type RiskLevel = 'none' | 'low' | 'moderate' | 'high';

/** The traffic light shown on the result screen. */
export type TrafficLight = 'green' | 'yellow' | 'red';

/** Where the analysed data came from. */
export type AnalysisSource = 'barcode' | 'label-ocr' | 'photo';

export interface LocalizedText {
  ru: string;
  en: string;
}

export type AdditiveCategory =
  | 'colour'
  | 'preservative'
  | 'antioxidant'
  | 'acidity-regulator'
  | 'thickener'
  | 'emulsifier'
  | 'flavour-enhancer'
  | 'sweetener'
  | 'anti-caking'
  | 'raising-agent'
  | 'glazing-agent'
  | 'flour-treatment'
  | 'stabiliser'
  | 'other';

/**
 * Machine readable concerns. They drive recommendations and the "why" texts,
 * so keep the vocabulary closed — `recommend/rules.ts` switches on these.
 */
export type ConcernTag =
  | 'allergen'
  | 'asthma-trigger'
  | 'hyperactivity-children'
  | 'laxative-effect'
  | 'gut-microbiome'
  | 'carcinogen-suspected'
  | 'carcinogen-classified'
  | 'nitrosamine-forming'
  | 'thyroid'
  | 'kidney'
  | 'phenylketonuria'
  | 'banned-somewhere'
  | 'ultra-processed-marker'
  | 'trans-fat'
  | 'excess-sugar'
  | 'excess-salt'
  | 'excess-satfat'
  | 'gmo-declared'
  | 'palm-oil';

export interface Additive {
  /** Canonical E-code, upper case, no spaces: `E621`, `E100i`. */
  code: string;
  names: LocalizedText;
  category: AdditiveCategory;
  risk: RiskLevel;
  /** One line, shown in the findings list. */
  summary: LocalizedText;
  /** Two to four sentences, shown on the additive detail screen. */
  detail: LocalizedText;
  concerns: ConcernTag[];
  origin: 'synthetic' | 'natural' | 'mixed';
  /** Acceptable daily intake in mg per kg body weight, `null` when "not specified". */
  adiMgPerKgBw: number | null;
  /** ISO country codes / region names where the additive is banned or restricted. */
  restrictedIn: string[];
  /** Alternative spellings used for matching; matching is diacritic and case insensitive. */
  synonyms: string[];
  sources: string[];
}

/** An additive actually found in a product, with the evidence for the match. */
export interface AdditiveFinding {
  code: string;
  name: string;
  category: AdditiveCategory;
  risk: RiskLevel;
  summary: string;
  detail: string;
  concerns: ConcernTag[];
  restrictedIn: string[];
  /** The exact substring of the ingredient list that produced the match. */
  matchedText: string;
  /** 0..1 — lower when the match came from a fuzzy/OCR-damaged token. */
  confidence: number;
}

/** Nutrition facts, always normalised to 100 g / 100 ml. */
export interface Nutriments {
  energyKcal?: number;
  energyKj?: number;
  fat?: number;
  saturatedFat?: number;
  transFat?: number;
  carbohydrates?: number;
  sugars?: number;
  fiber?: number;
  protein?: number;
  salt?: number;
  sodium?: number;
  /** Percentage of fruit, vegetables, pulses, nuts and rapeseed/walnut/olive oils. */
  fruitsVegetablesNuts?: number;
}

export type NutrientKey = keyof Nutriments;

/** UK FSA style per-nutrient traffic light. */
export interface NutrientLight {
  nutrient: 'fat' | 'saturatedFat' | 'sugars' | 'salt';
  valuePer100g: number;
  light: TrafficLight;
  label: string;
  /** e.g. "22 г на 100 г — это много: порог «красного» 22.5 г". */
  explanation: string;
}

export interface NutriScoreResult {
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  points: number;
  negativePoints: number;
  positivePoints: number;
  /** Which profile the 2023 algorithm used. */
  profile: 'general' | 'beverage' | 'fat-oil-nut-seed' | 'cheese' | 'water';
  breakdown: Array<{ component: string; value: number; points: number }>;
  /** True when required inputs were missing and the grade is an estimate. */
  estimated: boolean;
}

export type FlagSeverity = 'info' | 'warning' | 'danger';

/** A headline issue (or plus) that deserves its own line on the result card. */
export interface Flag {
  id: string;
  severity: FlagSeverity;
  title: string;
  explanation: string;
  concerns: ConcernTag[];
}

export interface Recommendation {
  id: string;
  /** Short, imperative, plain language: "Ищите колбасу без нитрита натрия (E250)". */
  text: string;
  /** Why we say it. */
  rationale: string;
  priority: 1 | 2 | 3;
}

export interface AlternativeProduct {
  barcode: string | null;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  score: number;
  light: TrafficLight;
  reason: string;
}

export interface ProductInfo {
  barcode: string | null;
  name: string | null;
  brand: string | null;
  quantity: string | null;
  categories: string[];
  imageUrl: string | null;
  ingredientsText: string | null;
  /** Individual ingredients as parsed from the list, in declaration order. */
  ingredients: ParsedIngredient[];
  /** Where the product record came from. */
  dataSource: 'openfoodfacts' | 'label' | 'vision' | 'unknown';
}

export interface ParsedIngredient {
  raw: string;
  normalized: string;
  /** Declared percentage, when the label states one ("томаты 62%"). */
  percent: number | null;
  /** Sub-ingredients from parentheses, flattened one level. */
  children: ParsedIngredient[];
  /** Position in the list; earlier means a larger share by law. */
  rank: number;
}

export interface Confidence {
  /** 0..1 for the analysis as a whole. */
  overall: number;
  notes: string[];
}

export interface Verdict {
  light: TrafficLight;
  /** 0..100, higher is better. */
  score: number;
  /** "Хороший состав", "Есть вопросы", "Лучше не брать". */
  headline: string;
  summary: string;
}

export interface AnalysisResult {
  id: string;
  source: AnalysisSource;
  scannedAt: string;
  locale: Locale;
  product: ProductInfo;
  verdict: Verdict;
  nutriScore: NutriScoreResult | null;
  nutriments: Nutriments;
  nutrientLights: NutrientLight[];
  additives: AdditiveFinding[];
  flags: Flag[];
  recommendations: Recommendation[];
  alternatives: AlternativeProduct[];
  confidence: Confidence;
  /** Non-fatal problems: partial OCR, product not in OFF, missing nutrition table. */
  warnings: string[];
}

export interface HistoryEntry {
  id: string;
  scannedAt: string;
  barcode: string | null;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  light: TrafficLight;
  score: number;
  source: AnalysisSource;
  favorite: boolean;
}
