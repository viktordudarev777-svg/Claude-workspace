import type {
  AdditiveFinding, ConcernTag, Flag, Locale, Nutriments, ParsedIngredient,
} from '../types';
import { t } from '../../util/i18n';
import { round } from '../../util/text';
import { flattenIngredients } from '../ingredients/parse';

/** Ingredient-name patterns that carry meaning beyond the E-number list. */
const PATTERNS = {
  partiallyHydrogenated: ['частично гидрогенизирован', 'частично отвержден', 'partially hydrogenated'],
  hydrogenated: ['гидрогенизирован', 'отвержденн', 'отверждённ', 'hydrogenated', 'gehärtet'],
  palmOil: ['пальмов', 'palm oil', 'palm fat', 'palm kernel', 'palmöl', 'palmfett'],
  sugar: [
    'сахар', 'глюкозно-фруктозный сироп', 'фруктозно-глюкозный сироп', 'кукурузный сироп',
    'сироп глюкозы', 'глюкозный сироп', 'патока', 'декстроза', 'мальтодекстрин', 'фруктоза',
    'инвертный сироп', 'сахарный сироп', 'мед натуральный',
    'sugar', 'glucose syrup', 'corn syrup', 'high fructose', 'dextrose', 'maltodextrin',
    'fructose', 'molasses', 'invert syrup', 'zucker',
  ],
  gmo: ['гмо', 'генно-модифицирован', 'генетически модифицирован', 'genetically modified', 'bioengineered'],
  allergens: [
    ['молоко', 'milk'], ['лактоз', 'lactose'], ['сливк', 'cream'], ['сыворотк', 'whey'],
    ['глютен', 'gluten'], ['пшениц', 'wheat'], ['ячмен', 'barley'], ['рож', 'rye'],
    ['яйц', 'egg'], ['со[яе]в', 'soy'], ['арахис', 'peanut'], ['миндал', 'almond'],
    ['фундук', 'hazelnut'], ['кешью', 'cashew'], ['фисташ', 'pistachio'], ['грецк', 'walnut'],
    ['рыб', 'fish'], ['ракообразн', 'crustacean'], ['моллюск', 'mollusc'],
    ['сельдере', 'celery'], ['горчиц', 'mustard'], ['кунжут', 'sesame'], ['люпин', 'lupin'],
  ] as const,
};

function containsAny(haystack: string, needles: readonly string[]): string | null {
  for (const needle of needles) {
    if (haystack.includes(needle)) return needle;
  }
  return null;
}

export interface FlagInput {
  ingredients: ParsedIngredient[];
  additives: AdditiveFinding[];
  nutriments: Nutriments;
  locale: Locale;
  /** Free text from the pack that is not part of the ingredient list (claims, warnings). */
  packText?: string;
}

/**
 * Derives the headline issues shown above the additive list.
 *
 * Everything here is label-derived: no flag is raised on data we do not have,
 * which is why a product with no nutrition table simply gets fewer flags rather
 * than a worse verdict.
 */
export function buildFlags(input: FlagInput): Flag[] {
  const { ingredients, additives, nutriments, locale } = input;
  const flags: Flag[] = [];
  const flat = flattenIngredients(ingredients);
  const haystack = [...flat.map((i) => i.normalized), input.packText ?? ''].join(' | ').toLowerCase();

  const add = (
    id: string,
    severity: Flag['severity'],
    title: string,
    explanation: string,
    concerns: ConcernTag[] = [],
  ): void => {
    flags.push({ id, severity, title, explanation, concerns });
  };

  // --- Fats -------------------------------------------------------------
  if (containsAny(haystack, PATTERNS.partiallyHydrogenated) || containsAny(haystack, PATTERNS.hydrogenated)) {
    add('trans-fat-ingredient', 'danger', t(locale, 'flag.transFat.title'), t(locale, 'flag.transFat.text'), ['trans-fat']);
  }
  if (nutriments.transFat !== undefined && nutriments.transFat >= 0.5) {
    add(
      'trans-fat-value',
      'danger',
      t(locale, 'flag.transFatValue.title', { value: round(nutriments.transFat, 1) }),
      t(locale, 'flag.transFatValue.text'),
      ['trans-fat'],
    );
  }
  if (containsAny(haystack, PATTERNS.palmOil)) {
    add('palm-oil', 'warning', t(locale, 'flag.palmOil.title'), t(locale, 'flag.palmOil.text'), ['palm-oil']);
  }
  if (nutriments.saturatedFat !== undefined && nutriments.saturatedFat > 5) {
    add(
      'high-satfat',
      'warning',
      t(locale, 'flag.satFat.title', { value: round(nutriments.saturatedFat, 1) }),
      t(locale, 'flag.satFat.text'),
      ['excess-satfat'],
    );
  }

  // --- Sugar and salt ---------------------------------------------------
  if (nutriments.sugars !== undefined && nutriments.sugars > 22.5) {
    add(
      'high-sugar',
      'warning',
      t(locale, 'flag.sugar.title', { value: round(nutriments.sugars, 1) }),
      t(locale, 'flag.sugar.text'),
      ['excess-sugar'],
    );
  }
  const sugarRank = ingredients.findIndex((i) => containsAny(i.normalized, PATTERNS.sugar) !== null);
  if (sugarRank >= 0 && sugarRank < 3) {
    add('sugar-first', 'warning', t(locale, 'flag.sugarFirst.title'), t(locale, 'flag.sugarFirst.text'), ['excess-sugar']);
  }
  if (nutriments.salt !== undefined && nutriments.salt > 1.5) {
    add(
      'high-salt',
      'warning',
      t(locale, 'flag.salt.title', { value: round(nutriments.salt, 2) }),
      t(locale, 'flag.salt.text'),
      ['excess-salt'],
    );
  }

  // --- Additive-derived -------------------------------------------------
  const highRisk = additives.filter((a) => a.risk === 'high');
  if (highRisk.length > 0) {
    add(
      'high-risk-additives',
      'danger',
      t(locale, 'flag.additiveHigh.title', { list: highRisk.map((a) => a.code).join(', ') }),
      t(locale, 'flag.additiveHigh.text'),
      [...new Set(highRisk.flatMap((a) => a.concerns))],
    );
  }
  if (additives.some((a) => a.category === 'sweetener')) {
    add('sweeteners', 'info', t(locale, 'flag.sweeteners.title'), t(locale, 'flag.sweeteners.text'));
  }
  const markers = additives.filter((a) => a.concerns.includes('ultra-processed-marker'));
  if (markers.length >= 3) {
    add(
      'ultra-processed',
      'warning',
      t(locale, 'flag.ultraProcessed.title', { count: markers.length }),
      t(locale, 'flag.ultraProcessed.text'),
      ['ultra-processed-marker'],
    );
  }

  // --- Allergens and declarations --------------------------------------
  const allergens = new Set<string>();
  for (const [ruPattern, enWord] of PATTERNS.allergens) {
    if (new RegExp(ruPattern).test(haystack) || haystack.includes(enWord)) {
      allergens.add(locale === 'ru' ? ruPattern.replace(/\[.*?\]/g, '') : enWord);
    }
  }
  for (const additive of additives) {
    if (additive.concerns.includes('allergen')) allergens.add(additive.name);
  }
  if (allergens.size > 0) {
    add(
      'allergens',
      'info',
      t(locale, 'flag.allergen.title', { list: [...allergens].join(', ') }),
      t(locale, 'flag.allergen.text'),
      ['allergen'],
    );
  }
  if (containsAny(haystack, PATTERNS.gmo)) {
    add('gmo', 'info', t(locale, 'flag.gmo.title'), t(locale, 'flag.gmo.text'), ['gmo-declared']);
  }

  // --- Positives --------------------------------------------------------
  if (ingredients.length > 0 && ingredients.length <= 5 && additives.length === 0) {
    add('short-list', 'info', t(locale, 'flag.short.title'), t(locale, 'flag.short.text'));
  }
  if (nutriments.fiber !== undefined && nutriments.fiber >= 6) {
    add('high-fiber', 'info', t(locale, 'flag.fiber.title', { value: round(nutriments.fiber, 1) }), t(locale, 'flag.fiber.text'));
  }
  if (nutriments.protein !== undefined && nutriments.protein >= 12) {
    add('high-protein', 'info', t(locale, 'flag.protein.title', { value: round(nutriments.protein, 1) }), t(locale, 'flag.protein.text'));
  }

  return flags;
}
