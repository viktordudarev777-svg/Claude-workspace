/**
 * Text helpers shared by the OCR pipeline and the additive matcher.
 *
 * The hard part of reading a food label is not the OCR engine, it is what
 * arrives afterwards: mixed alphabets ("Е621" with a Cyrillic Е), digits read
 * as letters, hyphenated line breaks, and separators that vary by country.
 */

/**
 * Cyrillic letters that are visually identical to Latin ones. OCR engines pick
 * whichever alphabet the surrounding language suggests, so `Е621` on a Russian
 * label is usually a Cyrillic Е and would never match a Latin `E621`.
 */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', У: 'Y', Х: 'X',
  а: 'a', е: 'e', к: 'k', м: 'm', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x',
};

/** Characters OCR commonly confuses with digits inside an E-code. */
const GLYPH_TO_DIGIT: Record<string, string> = {
  O: '0', o: '0', О: '0', о: '0', D: '0', Q: '0',
  I: '1', l: '1', i: '1', '|': '1', '!': '1',
  Z: '2', z: '2', З: '3', з: '3',
  A: '4', S: '5', s: '5', G: '6', б: '6', Б: '6', T: '7', B: '8', g: '9', q: '9',
};

/** Lower-cases, strips diacritics and collapses whitespace. */
export function normalize(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[   ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Transliterates Cyrillic homoglyphs to Latin so `Е621` and `E621` compare equal. */
export function foldHomoglyphs(input: string): string {
  let out = '';
  for (const ch of input) out += CYRILLIC_TO_LATIN[ch] ?? ch;
  return out;
}

/**
 * Cleans raw OCR output before parsing:
 * de-hyphenates line breaks, drops the artefacts scanners add at page edges,
 * and normalises the many dash and quote variants to plain ASCII.
 */
export function cleanOcrText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    // "консер-\nвант" -> "консервант"
    .replace(/([\p{L}])[-‐-―]\n([\p{L}])/gu, '$1$2')
    .replace(/\n+/g, ' ')
    .replace(/[‐-―−]/g, '-')
    .replace(/[«»“”„]/g, '"')
    .replace(/[’‘]/g, "'")
    // Stray single characters surrounded by spaces are almost always scan noise,
    // except real one-letter words and the E of an E-number.
    .replace(/\s+([^\p{L}\p{N}\s(),.;:%/-])\s+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Canonicalises an E-code token to the form used as a database key: `E621`,
 * `E150d`, `E472e`. Returns `null` when the token is not an E-code.
 *
 * Accepts the shapes that actually appear on packs and in OCR output:
 * `E621`, `Е 621` (Cyrillic Е), `E-621`, `INS 621`, `E621i`, `E 150 d`.
 */
export function canonicalizeECode(token: string): string | null {
  const folded = foldHomoglyphs(token.trim());
  const match = /^(?:e|ins)\s*[-.]?\s*(\d{3,4})\s*([a-z]{0,2}\d?)$/i.exec(folded);
  if (!match) return null;
  const digits = match[1]!;
  const suffix = (match[2] ?? '').toLowerCase();
  return `E${digits}${suffix}`;
}

/**
 * Repairs an E-code where OCR read digits as letters (`E6Z1` -> `E621`).
 * Only applied to tokens that already look like an E-code, so it cannot
 * corrupt ordinary words.
 */
export function repairECode(token: string): string | null {
  const folded = foldHomoglyphs(token.trim());
  const match = /^(?:e|ins)\s*[-.]?\s*([\p{L}\p{N}]{3,4})\s*([a-z]{0,2}\d?)$/iu.exec(folded);
  if (!match) return null;
  let digits = '';
  for (const ch of match[1]!) {
    if (ch >= '0' && ch <= '9') digits += ch;
    else if (GLYPH_TO_DIGIT[ch]) digits += GLYPH_TO_DIGIT[ch];
    else return null;
  }
  if (digits.length < 3) return null;
  return `E${digits}${(match[2] ?? '').toLowerCase()}`;
}

/** Levenshtein distance, capped: returns `max + 1` as soon as the bound is exceeded. */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
      if (curr[j]! < rowMin) rowMin = curr[j]!;
    }
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[b.length]!;
}

/** Parses "12,5", "12.5 g", "<0,5" into a number. Returns `null` when there is none. */
export function parseNumber(raw: string): number | null {
  const match = /-?\d+(?:[.,]\d+)?/.exec(raw.replace(/\s/g, ''));
  if (!match) return null;
  const value = Number.parseFloat(match[0].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

/** Rounds to `digits` decimals without exposing float noise. */
export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface MappedText {
  /** Normalised text: lower case, homoglyph-folded, diacritic-free, single spaces. */
  text: string;
  /** `map[i]` is the index in the original string that produced `text[i]`. */
  map: number[];
}

/**
 * Like {@link normalize}, but keeps a character-level index back into the
 * original string so a match can be reported with the exact text the user saw
 * on the label rather than the mangled normalised form.
 *
 * Homoglyphs are deliberately *not* folded here: folding every Cyrillic с to a
 * Latin c would turn "сахар" into "caxap" and make Russian ingredient names
 * collide with unrelated English ones. Folding is applied per token, inside
 * {@link canonicalizeECode}, where it is actually needed.
 */
export function normalizeWithMap(input: string): MappedText {
  let text = '';
  const map: number[] = [];
  let pendingSpace = false;

  for (let i = 0; i < input.length; i++) {
    const original = input[i]!;
    const folded = original
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();

    if (/^\s$/.test(original) || folded === '') {
      if (text.length > 0) pendingSpace = true;
      continue;
    }
    if (pendingSpace) {
      text += ' ';
      map.push(i);
      pendingSpace = false;
    }
    for (const ch of folded) {
      text += ch;
      map.push(i);
    }
  }
  return { text, map };
}
