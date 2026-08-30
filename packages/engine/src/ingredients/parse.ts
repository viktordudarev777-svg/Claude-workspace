import type { ParsedIngredient } from '../types';
import { cleanOcrText, normalize, parseNumber } from '../text';

/** Label prefixes that introduce the ingredient list; dropped before parsing. */
const LIST_PREFIXES = [
  'состав', 'ингредиенты', 'ingredients', 'ingredienti', 'zutaten',
  'ingrédients', 'ingredientes', 'składniki',
];

/**
 * Trailing sentences that are not ingredients: allergen advice, storage,
 * nutrition panels. Cutting them off keeps the last ingredient clean.
 */
// Compared against NFKD-normalised text, so these must be written without
// diacritics ("nahrwerte", not "nährwerte").
const TAIL_MARKERS = [
  'пищевая ценность', 'энергетическая ценность', 'условия хранения', 'срок годности',
  'хранить при', 'может содержать', 'изготовлено', 'произведено', 'продукт может содержать',
  'nutrition', 'nutritional information', 'may contain', 'best before', 'store in',
  'allergy advice', 'nahrwerte', 'mindestens haltbar',
];

/** Strips the "Состав:" prefix and everything after the ingredient list ends. */
export function extractIngredientSection(raw: string): string {
  const cleaned = cleanOcrText(raw);
  const lower = normalize(cleaned);

  let start = 0;
  for (const prefix of LIST_PREFIXES) {
    const index = lower.indexOf(prefix);
    if (index !== -1 && index < 200) {
      const afterPrefix = index + prefix.length;
      const colon = cleaned.slice(afterPrefix, afterPrefix + 4).indexOf(':');
      start = Math.max(start, afterPrefix + (colon === -1 ? 0 : colon + 1));
      break;
    }
  }

  let end = cleaned.length;
  for (const marker of TAIL_MARKERS) {
    const index = lower.indexOf(marker, start);
    if (index !== -1 && index < end) end = index;
  }

  return cleaned.slice(start, end).replace(/^[\s:.,;-]+/, '').replace(/[\s.;]+$/, '').trim();
}

/**
 * Splits on the given separators, but only at nesting depth zero, so
 * "стабилизаторы (E401, E407)" stays a single ingredient with two children.
 */
function splitTopLevel(text: string, separators: string[]): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

    if (depth === 0 && separators.includes(ch)) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

/** Pulls "28%" or "мин. 12 %" out of an ingredient and returns the rest. */
function extractPercent(text: string): { text: string; percent: number | null } {
  const match = /(?:^|[\s(])(?:мин\.?|min\.?|не менее|ок\.?)?\s*(\d{1,3}(?:[.,]\d+)?)\s*%/i.exec(text);
  if (!match) return { text: text.trim(), percent: null };
  const percent = parseNumber(match[1]!);
  const stripped = text.replace(match[0], ' ').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
  return { text: stripped.replace(/[\s,;-]+$/, ''), percent };
}

/** Separates "эмульгатор (лецитин соевый)" into the head and its children. */
function splitParenthetical(text: string): { head: string; inner: string | null } {
  const open = text.indexOf('(');
  if (open === -1) return { head: text.trim(), inner: null };
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      depth--;
      if (depth === 0) {
        const inner = text.slice(open + 1, i);
        const head = (text.slice(0, open) + ' ' + text.slice(i + 1)).replace(/\s+/g, ' ').trim();
        return { head, inner };
      }
    }
  }
  // Unbalanced parenthesis — common in OCR; treat the rest as the inner part.
  return { head: text.slice(0, open).trim(), inner: text.slice(open + 1) };
}

/**
 * Parses an ingredient list into a flat-with-one-level-of-children structure.
 *
 * Order matters: by law ingredients are declared in descending order of weight,
 * so `rank` is used later to weight how much a flagged component matters.
 */
export function parseIngredients(raw: string): ParsedIngredient[] {
  const section = extractIngredientSection(raw);
  if (!section) return [];

  const top = splitTopLevel(section, [',', ';', '•', '·']);
  const result: ParsedIngredient[] = [];

  top.forEach((part, index) => {
    const { text: withoutPercent, percent } = extractPercent(part);
    const { head, inner } = splitParenthetical(withoutPercent);
    const label = head || withoutPercent;
    if (!label) return;

    const children: ParsedIngredient[] = [];
    if (inner) {
      splitTopLevel(inner, [',', ';']).forEach((childRaw, childIndex) => {
        const child = extractPercent(childRaw);
        const childHead = splitParenthetical(child.text).head || child.text;
        if (!childHead) return;
        children.push({
          raw: childRaw.trim(),
          normalized: normalize(childHead),
          percent: child.percent,
          children: [],
          rank: childIndex,
        });
      });
    }

    result.push({
      raw: part.trim(),
      normalized: normalize(label),
      percent,
      children,
      rank: index,
    });
  });

  return result;
}

/**
 * Flattens parents and children into one list, in reading order: each parent is
 * immediately followed by its own sub-ingredients.
 */
export function flattenIngredients(ingredients: ParsedIngredient[]): ParsedIngredient[] {
  const out: ParsedIngredient[] = [];
  for (const ingredient of ingredients) {
    out.push(ingredient);
    out.push(...ingredient.children);
  }
  return out;
}
