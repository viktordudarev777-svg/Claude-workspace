import type { AdditiveFinding, Flag, Locale, Nutriments, Recommendation, Verdict } from '../types';
import { t } from '../../util/i18n';
import { round } from '../../util/text';

export interface RecommendInput {
  additives: AdditiveFinding[];
  flags: Flag[];
  nutriments: Nutriments;
  ingredientCount: number;
  verdict: Verdict;
  locale: Locale;
}

/** How many suggestions we show: more than this and nobody reads them. */
const MAX_RECOMMENDATIONS = 5;

/**
 * Turns findings into concrete advice.
 *
 * Every rule answers "what do I do instead", not "this is bad" — the flags
 * already say what is wrong. Ordered by priority, then truncated, so the user
 * sees the few things that actually matter for this product.
 */
export function buildRecommendations(input: RecommendInput): Recommendation[] {
  const { additives, flags, nutriments, locale } = input;
  const out: Recommendation[] = [];
  const seen = new Set<string>();

  const push = (id: string, text: string, rationale: string, priority: 1 | 2 | 3): void => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, text, rationale, priority });
  };

  const flagIds = new Set(flags.map((f) => f.id));
  const concerns = new Set(additives.flatMap((a) => a.concerns));

  // Trans fats outrank everything else.
  if (flagIds.has('trans-fat-ingredient') || flagIds.has('trans-fat-value')) {
    push('avoid-trans-fat', t(locale, 'rec.avoidTransFat'), t(locale, 'rec.avoidTransFatWhy'), 1);
  }

  // One suggestion per high-risk additive, capped so a bad label does not
  // produce a wall of near-identical lines.
  for (const additive of additives.filter((a) => a.risk === 'high').slice(0, 2)) {
    push(
      `avoid-${additive.code}`,
      t(locale, 'rec.avoidAdditive', { name: additive.name.toLowerCase(), code: additive.code }),
      additive.summary,
      1,
    );
  }

  if (concerns.has('nitrosamine-forming')) {
    push('avoid-nitrite', t(locale, 'rec.avoidNitrite'), t(locale, 'rec.avoidNitriteWhy'), 1);
  }
  if (concerns.has('phenylketonuria')) {
    push('phenylketonuria', t(locale, 'rec.phenylketonuria'), t(locale, 'rec.phenylketonuriaWhy'), 1);
  }
  if (additives.some((a) => a.code === 'E320' || a.code === 'E321' || a.code === 'E310')) {
    push('prefer-tocopherol', t(locale, 'rec.preferTocopherol'), t(locale, 'rec.preferTocopherolWhy'), 2);
  }
  if (concerns.has('hyperactivity-children')) {
    push('child-caution', t(locale, 'rec.childCaution'), t(locale, 'rec.childCautionWhy'), 2);
  }
  if (concerns.has('laxative-effect')) {
    push('laxative', t(locale, 'rec.laxative'), t(locale, 'rec.laxativeWhy'), 3);
  }

  if (flagIds.has('high-sugar') || flagIds.has('sugar-first')) {
    push(
      'less-sugar',
      t(locale, 'rec.lessSugar'),
      nutriments.sugars !== undefined
        ? t(locale, 'rec.lessSugarWhy', { value: round(nutriments.sugars, 1) })
        : t(locale, 'flag.sugarFirst.text'),
      2,
    );
  }
  if (flagIds.has('high-salt') && nutriments.salt !== undefined) {
    push('less-salt', t(locale, 'rec.lessSalt'), t(locale, 'rec.lessSaltWhy', { value: round(nutriments.salt, 2) }), 2);
  }

  const allergenFlag = flags.find((f) => f.id === 'allergens');
  if (allergenFlag) {
    const list = allergenFlag.title.split(':').slice(1).join(':').trim();
    push('check-allergen', t(locale, 'rec.checkAllergen', { list }), t(locale, 'rec.checkAllergenWhy'), 3);
  }

  if (input.ingredientCount > 12) {
    push(
      'short-list',
      t(locale, 'rec.preferShortList'),
      t(locale, 'rec.preferShortListWhy', { count: input.ingredientCount }),
      3,
    );
  }

  if (out.length === 0 && input.verdict.light === 'green') {
    push('good-choice', t(locale, 'rec.goodChoice'), t(locale, 'rec.goodChoiceWhy'), 3);
  }

  return out.sort((a, b) => a.priority - b.priority).slice(0, MAX_RECOMMENDATIONS);
}
