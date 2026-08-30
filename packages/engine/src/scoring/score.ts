import type {
  AdditiveFinding, Flag, Locale, NutrientLight, NutriScoreResult, TrafficLight, Verdict,
} from '../types';
import { t } from '../i18n';
import { clamp } from '../text';

export interface ScoreInput {
  additives: AdditiveFinding[];
  nutrientLights: NutrientLight[];
  nutriScore: NutriScoreResult | null;
  flags: Flag[];
  ingredientCount: number;
  locale: Locale;
}

export interface ScoreBreakdownEntry {
  reason: string;
  delta: number;
}

export interface ScoreResult {
  verdict: Verdict;
  breakdown: ScoreBreakdownEntry[];
}

/** Points removed per additive, before the confidence weighting. */
const ADDITIVE_PENALTY = { none: 0, low: 3, moderate: 9, high: 22 } as const;

/** Points removed per red/amber nutrient light. */
const LIGHT_PENALTY: Record<TrafficLight, number> = { green: 0, yellow: 5, red: 12 };

/** Nutri-Score grade nudges the score in the direction the official grade points. */
const GRADE_MODIFIER: Record<NutriScoreResult['grade'], number> = { A: 8, B: 4, C: 0, D: -6, E: -12 };

/** Flags that move the score on their own, beyond the additive and nutrient maths. */
const FLAG_MODIFIER: Record<string, number> = {
  'trans-fat-ingredient': -25,
  'trans-fat-value': -20,
  'palm-oil': -4,
  'sugar-first': -4,
  'ultra-processed': -6,
  'short-list': 6,
  'high-fiber': 4,
  'high-protein': 3,
};

/**
 * Turns the findings into a 0-100 score and a traffic light.
 *
 * The score is deliberately transparent rather than clever: every subtraction
 * is traceable to one finding, and `breakdown` is returned so the UI can show
 * "why 62 and not 80".
 */
export function scoreProduct(input: ScoreInput): ScoreResult {
  const { additives, nutrientLights, nutriScore, flags, locale } = input;
  const breakdown: ScoreBreakdownEntry[] = [];
  let score = 100;

  // Additives. Confidence weighting keeps a shaky OCR match from dominating.
  let additivePenalty = 0;
  for (const additive of additives) {
    const penalty = ADDITIVE_PENALTY[additive.risk] * additive.confidence;
    if (penalty > 0) {
      additivePenalty += penalty;
      breakdown.push({ reason: `${additive.code} (${additive.risk})`, delta: -Math.round(penalty) });
    }
  }
  additivePenalty = Math.min(additivePenalty, 45);
  score -= additivePenalty;

  // Nutrition traffic lights.
  let nutrientPenalty = 0;
  for (const light of nutrientLights) {
    const penalty = LIGHT_PENALTY[light.light];
    if (penalty > 0) {
      nutrientPenalty += penalty;
      breakdown.push({ reason: `${light.label}: ${light.light}`, delta: -penalty });
    }
  }
  score -= Math.min(nutrientPenalty, 40);

  // Nutri-Score. An estimated grade counts half.
  if (nutriScore) {
    const modifier = GRADE_MODIFIER[nutriScore.grade] * (nutriScore.estimated ? 0.5 : 1);
    if (modifier !== 0) {
      score += modifier;
      breakdown.push({ reason: `Nutri-Score ${nutriScore.grade}`, delta: Math.round(modifier) });
    }
  }

  // Ingredient-level flags.
  for (const flag of flags) {
    const modifier = FLAG_MODIFIER[flag.id];
    if (modifier) {
      score += modifier;
      breakdown.push({ reason: flag.title, delta: modifier });
    }
  }

  score = Math.round(clamp(score, 0, 100));

  const hasHighRisk = additives.some((a) => a.risk === 'high');
  const hasTransFat = flags.some((f) => f.id.startsWith('trans-fat'));
  const redLights = nutrientLights.filter((l) => l.light === 'red').length;
  const hasModerateRisk = additives.some((a) => a.risk === 'moderate');

  const light: TrafficLight =
    hasHighRisk || hasTransFat || score < 40 || redLights >= 2 ? 'red'
    : score >= 75 && !hasModerateRisk && redLights === 0 ? 'green'
    : 'yellow';

  const concerning = additives.filter((a) => a.risk === 'moderate' || a.risk === 'high').length;
  const summaryParts = [t(locale, `verdict.summary.${light}` as const)];
  if (concerning > 0) summaryParts.push(t(locale, 'verdict.summary.additives', { count: concerning }));
  if (input.ingredientCount === 0 && nutrientLights.length === 0) {
    summaryParts.push(t(locale, 'verdict.summary.noData'));
  }

  return {
    verdict: {
      light,
      score,
      headline: t(locale, `verdict.${light}` as const),
      summary: summaryParts.join(' '),
    },
    breakdown,
  };
}
