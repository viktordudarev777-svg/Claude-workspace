import type { Additive, AdditiveFinding, Locale } from '../types';
import type { AdditiveDatabase } from './database';
import { canonicalizeECode, repairECode, editDistance, normalizeWithMap } from '../text';

export interface MatchResult {
  findings: AdditiveFinding[];
  /** E-codes that were recognised as codes but are not in our database. */
  unknownCodes: string[];
}

interface Hit {
  additive: Additive;
  start: number;
  end: number;
  confidence: number;
}

/** Matches an E-code with optional separators: `E621`, `E-621`, `E 150 d`, `INS621`. */
const CODE_PATTERN = /(?:^|[^\p{L}\p{N}])((?:e|е|ins)\s*[-.]?\s*[a-z0-9а-я]{3,4}\s*(?:[a-z]{1,2}\d?)?)(?![\p{L}\p{N}])/giu;

/**
 * Synonyms that must never match by name alone.
 *
 * Two kinds live here. Ordinary ingredients ("соль", "сахар") share a name
 * with an additive but mean the food, not the additive. Nutrition-panel
 * wording ("насыщенные жирные кислоты") collides with additive names such as
 * E570 "жирные кислоты"; the panel is normally cut off before matching, but a
 * label with no "пищевая ценность" heading would otherwise leak into the
 * ingredient text and produce a phantom finding.
 *
 * Codes still match: a real label declares E570 as a code, not as a phrase.
 */
const AMBIGUOUS_SYNONYMS = new Set([
  'соль', 'сахар', 'вода', 'мука', 'salt', 'sugar', 'water', 'flour',
  'жирные кислоты', 'насыщенные жирные кислоты', 'fatty acids', 'saturated fat',
  'белки', 'жиры', 'углеводы', 'protein', 'proteins', 'carbohydrates',
]);

function toFinding(additive: Additive, matchedText: string, confidence: number, locale: Locale): AdditiveFinding {
  return {
    code: additive.code,
    name: additive.names[locale],
    category: additive.category,
    risk: additive.risk,
    summary: additive.summary[locale],
    detail: additive.detail[locale],
    concerns: additive.concerns,
    restrictedIn: additive.restrictedIn,
    matchedText,
    confidence,
  };
}

/** True when [start,end) overlaps a span already claimed by a longer match. */
function overlaps(hits: Hit[], start: number, end: number): boolean {
  return hits.some((hit) => start < hit.end && end > hit.start);
}

/**
 * Finds every additive mentioned in an ingredient list.
 *
 * Three passes, in decreasing confidence:
 *  1. exact E-codes (`E621`), including OCR digit repair (`E6Z1`);
 *  2. exact synonym phrases (`глутамат натрия`, `monosodium glutamate`);
 *  3. fuzzy synonyms, for long names damaged by OCR (edit distance <= 2).
 *
 * Later passes never overwrite a span already claimed by an earlier one, so a
 * product that spells out both the code and the name yields a single finding.
 */
export function findAdditives(
  ingredientsText: string,
  db: AdditiveDatabase,
  locale: Locale = 'ru',
): MatchResult {
  if (!ingredientsText.trim()) return { findings: [], unknownCodes: [] };

  const { text, map } = normalizeWithMap(ingredientsText);
  const hits: Hit[] = [];
  const unknownCodes = new Set<string>();

  const originalSpan = (start: number, end: number): string => {
    const from = map[start] ?? 0;
    const to = (map[Math.min(end, map.length) - 1] ?? from) + 1;
    return ingredientsText.slice(from, to).trim();
  };

  // Pass 1 — E-codes.
  CODE_PATTERN.lastIndex = 0;
  for (let match = CODE_PATTERN.exec(text); match; match = CODE_PATTERN.exec(text)) {
    const token = match[1]!;
    const exact = canonicalizeECode(token);
    const code = exact ?? repairECode(token);
    if (!code) continue;
    // A suffixed code we do not stock (E150b) falls back to its base entry.
    const additive = db.byCode.get(code) ?? db.byCode.get(code.replace(/[a-z]+\d?$/i, ''));
    const start = match.index + match[0].indexOf(token);
    const end = start + token.length;
    if (!additive) {
      unknownCodes.add(code);
      continue;
    }
    if (overlaps(hits, start, end)) continue;
    hits.push({ additive, start, end, confidence: exact ? 0.99 : 0.75 });
  }

  // Pass 2 — exact synonyms, longest first so "глутамат натрия" wins over "глутамат".
  for (const { key, additive } of db.synonymIndex) {
    if (AMBIGUOUS_SYNONYMS.has(key)) continue;
    let from = 0;
    for (;;) {
      const index = text.indexOf(key, from);
      if (index === -1) break;
      from = index + key.length;
      const before = text[index - 1];
      const after = text[index + key.length];
      const isWordBoundary =
        (before === undefined || !/[\p{L}\p{N}]/u.test(before)) &&
        (after === undefined || !/[\p{L}\p{N}]/u.test(after));
      if (!isWordBoundary) continue;
      if (overlaps(hits, index, from)) continue;
      hits.push({ additive, start: index, end: from, confidence: 0.9 });
    }
  }

  // Pass 3 — fuzzy synonyms for OCR damage. Only long keys: short ones produce
  // false positives at edit distance 2.
  const words = [...text.matchAll(/[\p{L}\p{N}][\p{L}\p{N}\s-]{7,60}/gu)];
  for (const { key, additive } of db.synonymIndex) {
    if (key.length < 9 || AMBIGUOUS_SYNONYMS.has(key)) continue;
    if (hits.some((hit) => hit.additive.code === additive.code)) continue;
    for (const word of words) {
      const start = word.index;
      const candidate = word[0].slice(0, key.length + 2).trim();
      if (Math.abs(candidate.length - key.length) > 2) continue;
      const distance = editDistance(candidate, key, 2);
      if (distance > 2) continue;
      const end = start + candidate.length;
      if (overlaps(hits, start, end)) continue;
      hits.push({ additive, start, end, confidence: distance === 1 ? 0.7 : 0.6 });
      break;
    }
  }

  // One finding per additive: keep the most confident, earliest mention.
  const best = new Map<string, Hit>();
  for (const hit of hits) {
    const existing = best.get(hit.additive.code);
    if (!existing || hit.confidence > existing.confidence) best.set(hit.additive.code, hit);
  }

  const findings = [...best.values()]
    .sort((a, b) => a.start - b.start)
    .map((hit) => toFinding(hit.additive, originalSpan(hit.start, hit.end), hit.confidence, locale));

  return { findings, unknownCodes: [...unknownCodes].sort() };
}
