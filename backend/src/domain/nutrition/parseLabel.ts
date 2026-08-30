import type { Nutriments } from '../types';
import { cleanOcrText, normalize, round } from '../../util/text';

export interface ParsedNutritionLabel {
  nutriments: Nutriments;
  /** `per-100g` when the panel is declared per 100 g/ml, `per-serving` otherwise. */
  basis: 'per-100g' | 'per-serving' | 'unknown';
  /** Serving size in grams when the label states one. */
  servingSizeG: number | null;
  warnings: string[];
}

type Unit = 'g' | 'mg' | 'kcal' | 'kj';

interface NutrientPattern {
  key: keyof Nutriments;
  /** Searched in this order; the first hit wins and its span is consumed. */
  labels: RegExp[];
  units: Unit[];
}

/**
 * Word boundaries have to be written out: JavaScript's `\b` is defined on ASCII
 * word characters, so it never matches next to a Cyrillic letter and `/жиры\b/`
 * would silently fail on every Russian label.
 */
const AFTER = String.raw`(?![\p{L}\p{N}])`;

/** Builds a label matcher with a Unicode-aware trailing boundary. */
function label(source: string): RegExp {
  return new RegExp(source + AFTER, 'u');
}

/**
 * Ordered from most specific to least: "насыщенные жирные кислоты" has to be
 * consumed before the bare "жиры" pattern can see it.
 */
const PATTERNS: NutrientPattern[] = [
  {
    key: 'transFat',
    labels: [label(String.raw`транс[\s-]?жир\w*`), label(String.raw`транс[\s-]?изомер\p{L}*`), label(String.raw`trans[\s-]?fat\w*`), label(String.raw`trans[\s-]?fetts\p{L}*`)],
    units: ['g', 'mg'],
  },
  {
    key: 'saturatedFat',
    labels: [
      label(String.raw`(?:в том числе |из них )?насыщенн\p{L}*(?:\s+жирн\p{L}*\s+кислот\p{L}*)?`),
      label(String.raw`(?:of which\s+)?saturat\w*`),
      label(String.raw`(?:davon\s+)?ges[aä]ttigte\s+fetts[aä]uren`),
    ],
    units: ['g', 'mg'],
  },
  {
    key: 'sugars',
    labels: [
      label(String.raw`(?:в том числе |из них )?сахар(?:а|ов)?`),
      label(String.raw`(?:of which\s+)?sugars?`),
      label(String.raw`(?:davon\s+)?zucker`),
    ],
    units: ['g', 'mg'],
  },
  {
    key: 'fiber',
    labels: [label('пищевые волокна'), label(String.raw`клетчатк\p{L}*`), label(String.raw`fib(?:re|er)`), label('ballaststoffe')],
    units: ['g', 'mg'],
  },
  { key: 'fat', labels: [label('жир(?:ы|а|ов)?'), label('fat'), label('fett')], units: ['g', 'mg'] },
  {
    key: 'carbohydrates',
    labels: [label('углевод(?:ы|а|ов)?'), label('carbohydrates?'), label('kohlenhydrate')],
    units: ['g', 'mg'],
  },
  {
    key: 'protein',
    labels: [label('бел(?:ки|ок|ка)'), label(String.raw`protein\w*`), label(String.raw`eiwei[sß]\w*`)],
    units: ['g', 'mg'],
  },
  { key: 'salt', labels: [label('сол[ьи]'), label('salt'), label('salz')], units: ['g', 'mg'] },
  { key: 'sodium', labels: [label('натри[йя]'), label('sodium')], units: ['mg', 'g'] },
  {
    key: 'energyKcal',
    labels: [label('энергетическая ценность'), label('калорийность'), label('energy'), label('brennwert'), label('калории')],
    units: ['kcal', 'kj'],
  },
];

const UNIT_PATTERN = String.raw`(ккал|kcal|кдж|kj|мг|mg|г|g|гр)`;

/** Finds `<number> <unit>` within `window` characters after `from`. */
function readValue(
  text: string,
  from: number,
  window: number,
): { value: number; unit: Unit; end: number } | null {
  const slice = text.slice(from, from + window);
  const match = new RegExp(String.raw`(\d+(?:[.,]\d+)?)\s*${UNIT_PATTERN}?`, 'i').exec(slice);
  if (!match) return null;

  const value = Number.parseFloat(match[1]!.replace(',', '.'));
  if (!Number.isFinite(value)) return null;

  const rawUnit = (match[2] ?? '').toLowerCase();
  const unit: Unit =
    rawUnit === 'ккал' || rawUnit === 'kcal' ? 'kcal'
    : rawUnit === 'кдж' || rawUnit === 'kj' ? 'kj'
    : rawUnit === 'мг' || rawUnit === 'mg' ? 'mg'
    : 'g';

  return { value, unit, end: from + match.index + match[0].length };
}

/** Markers that open the nutrition panel on a pack. */
const PANEL_MARKERS = [
  'пищевая ценность', 'пищевая и энергетическая ценность', 'энергетическая ценность',
  'пищевая ценность на', 'nutrition', 'nutritional information', 'nutrition facts',
  'nahrwerte', 'valeurs nutritionnelles', 'valori nutrizionali',
];

/**
 * Narrows the text to the nutrition panel.
 *
 * Without this the parser reads the ingredient list: "Состав: вода, сахар, ..."
 * offers the word "сахар" long before the panel does, and the number that
 * follows it is part of an E-number, not a sugar content.
 */
export function extractNutritionSection(normalizedText: string): string {
  let start = -1;
  for (const marker of PANEL_MARKERS) {
    const index = normalizedText.indexOf(marker);
    if (index !== -1 && (start === -1 || index < start)) start = index;
  }
  return start === -1 ? normalizedText : normalizedText.slice(start);
}

/** Blanks out a consumed span so a later, less specific pattern cannot re-read it. */
function consume(text: string, start: number, end: number): string {
  return text.slice(0, start) + ' '.repeat(end - start) + text.slice(end);
}

/**
 * Reads a nutrition panel out of raw OCR text.
 *
 * Two-column panels ("на 100 г" and "на порцию") are the main source of error:
 * we take the first number after each label, which is the 100 g column in every
 * layout we have seen, and warn so the client can show a "check the numbers" hint.
 */
export function parseNutritionLabel(raw: string): ParsedNutritionLabel {
  const cleaned = cleanOcrText(raw);
  let text = extractNutritionSection(normalize(cleaned));
  const warnings: string[] = [];
  const nutriments: Nutriments = {};

  const per100 = /(?:на|per|je|pro)\s*100\s*(?:г|g|мл|ml)/.test(text);
  const perServing = /(?:на|per)\s*(?:порци|serving|portion)/.test(text);
  const basis: ParsedNutritionLabel['basis'] = per100 ? 'per-100g' : perServing ? 'per-serving' : 'unknown';

  if (per100 && perServing) {
    warnings.push('На этикетке две колонки (на 100 г и на порцию) — проверьте, что цифры совпали с колонкой «на 100 г».');
  }
  if (!per100 && perServing) {
    warnings.push('Пищевая ценность указана на порцию, а не на 100 г — оценка приблизительная.');
  }

  const servingMatch = /(?:порци\w*|serving|portion)\D{0,12}(\d+(?:[.,]\d+)?)\s*(г|g|мл|ml)/.exec(text);
  const servingSizeG = servingMatch ? Number.parseFloat(servingMatch[1]!.replace(',', '.')) : null;

  let energyKj: number | undefined;

  for (const pattern of PATTERNS) {
    let matched = false;

    for (const labelPattern of pattern.labels) {
      // Every occurrence is tried, not only the first: a label can appear in a
      // heading ("жиры, в том числе...") before the row that carries a number.
      const scanner = new RegExp(labelPattern.source, 'gu');
      for (const match of [...text.matchAll(scanner)]) {
        const read = readValue(text, match.index + match[0].length, 24);
        if (!read) continue;
        if (!pattern.units.includes(read.unit)) continue;

        if (pattern.key === 'energyKcal') {
          // Panels usually print "1980 кДж / 470 ккал"; keep both.
          if (read.unit === 'kj') {
            energyKj = read.value;
            const kcal = readValue(text, read.end, 24);
            if (kcal && kcal.unit === 'kcal') nutriments.energyKcal = kcal.value;
          } else {
            nutriments.energyKcal = read.value;
            const kj = readValue(text, read.end, 24);
            if (kj && kj.unit === 'kj') energyKj = kj.value;
          }
        } else {
          nutriments[pattern.key] = read.unit === 'mg' ? round(read.value / 1000, 4) : read.value;
        }

        text = consume(text, match.index, read.end);
        matched = true;
        break;
      }
      if (matched) break;
    }
  }

  if (energyKj !== undefined) nutriments.energyKj = energyKj;
  if (nutriments.energyKcal === undefined && energyKj !== undefined) {
    nutriments.energyKcal = round(energyKj / 4.184, 0);
  }
  // Labels give either salt or sodium; the other follows from the 2.5 factor.
  if (nutriments.salt === undefined && nutriments.sodium !== undefined) {
    nutriments.salt = round(nutriments.sodium * 2.5, 2);
  }
  if (nutriments.sodium === undefined && nutriments.salt !== undefined) {
    nutriments.sodium = round(nutriments.salt / 2.5, 3);
  }

  if (Object.keys(nutriments).length === 0) {
    warnings.push('Таблицу пищевой ценности распознать не удалось — оценка построена только по составу.');
  }

  return { nutriments, basis, servingSizeG, warnings };
}

/** Rescales a per-serving panel to per 100 g when the serving size is known. */
export function toPer100g(label: ParsedNutritionLabel): Nutriments {
  if (label.basis !== 'per-serving' || !label.servingSizeG || label.servingSizeG <= 0) {
    return label.nutriments;
  }
  const factor = 100 / label.servingSizeG;
  const scaled: Nutriments = {};
  for (const [key, value] of Object.entries(label.nutriments) as Array<[keyof Nutriments, number]>) {
    scaled[key] = round(value * factor, 2);
  }
  return scaled;
}
