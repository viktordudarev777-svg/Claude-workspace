/**
 * Wire types returned by the FoodLens API.
 *
 * A hand-kept mirror of the server's `domain/types.ts`. All user-facing text
 * arrives already translated, so the client never needs the additive
 * dictionary — it renders what it is given.
 */

export type Locale = 'ru' | 'en';
export type RiskLevel = 'none' | 'low' | 'moderate' | 'high';
export type TrafficLight = 'green' | 'yellow' | 'red';
export type AnalysisSource = 'barcode' | 'label-ocr' | 'photo';
export type FlagSeverity = 'info' | 'warning' | 'danger';

export interface AdditiveFinding {
  code: string;
  name: string;
  category: string;
  risk: RiskLevel;
  summary: string;
  detail: string;
  concerns: string[];
  restrictedIn: string[];
  matchedText: string;
  confidence: number;
}

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
  fruitsVegetablesNuts?: number;
}

export interface NutrientLight {
  nutrient: 'fat' | 'saturatedFat' | 'sugars' | 'salt';
  valuePer100g: number;
  light: TrafficLight;
  label: string;
  explanation: string;
}

export interface NutriScoreResult {
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  points: number;
  negativePoints: number;
  positivePoints: number;
  profile: string;
  breakdown: Array<{ component: string; value: number; points: number }>;
  estimated: boolean;
}

export interface Flag {
  id: string;
  severity: FlagSeverity;
  title: string;
  explanation: string;
  concerns: string[];
}

export interface Recommendation {
  id: string;
  text: string;
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

export interface ParsedIngredient {
  raw: string;
  normalized: string;
  percent: number | null;
  children: ParsedIngredient[];
  rank: number;
}

export interface ProductInfo {
  barcode: string | null;
  name: string | null;
  brand: string | null;
  quantity: string | null;
  categories: string[];
  imageUrl: string | null;
  ingredientsText: string | null;
  ingredients: ParsedIngredient[];
  dataSource: 'openfoodfacts' | 'label' | 'vision' | 'unknown';
}

export interface Verdict {
  light: TrafficLight;
  score: number;
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
  confidence: { overall: number; notes: string[] };
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

export interface HistoryStats {
  total: number;
  green: number;
  yellow: number;
  red: number;
  averageScore: number;
}

export interface AdditiveSummary {
  code: string;
  name: string;
  category: string;
  risk: RiskLevel;
  summary: string;
}

export interface AdditiveDetail extends AdditiveSummary {
  detail: string;
  concerns: string[];
  origin: string;
  adiMgPerKgBw: number | null;
  restrictedIn: string[];
  synonyms: string[];
  sources: Array<{ title: string; url: string }>;
}
