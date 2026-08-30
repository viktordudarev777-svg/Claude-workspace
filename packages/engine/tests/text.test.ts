import { describe, expect, it } from 'vitest';
import {
  canonicalizeECode, repairECode, cleanOcrText, normalizeWithMap, editDistance, parseNumber,
} from '../src/text';

describe('canonicalizeECode', () => {
  it('accepts the shapes that appear on real packs', () => {
    expect(canonicalizeECode('E621')).toBe('E621');
    expect(canonicalizeECode('e 621')).toBe('E621');
    expect(canonicalizeECode('E-621')).toBe('E621');
    expect(canonicalizeECode('INS 621')).toBe('E621');
    expect(canonicalizeECode('E150d')).toBe('E150d');
    expect(canonicalizeECode('E472e')).toBe('E472e');
  });

  it('treats a Cyrillic Е as the Latin one', () => {
    // A Russian label is typed with Cyrillic Е; OCR returns it verbatim.
    expect(canonicalizeECode('Е621')).toBe('E621');
    expect(canonicalizeECode('Е 250')).toBe('E250');
  });

  it('rejects text that only looks like a code', () => {
    expect(canonicalizeECode('EAN13')).toBeNull();
    expect(canonicalizeECode('energy')).toBeNull();
    expect(canonicalizeECode('E1')).toBeNull();
  });
});

describe('repairECode', () => {
  it('fixes digits that OCR read as letters', () => {
    expect(repairECode('E6Z1')).toBe('E621');
    expect(repairECode('EIOO')).toBe('E100');
    expect(repairECode('EЗ30')).toBe('E330');
  });

  it('does not invent a code from a word', () => {
    expect(repairECode('every')).toBeNull();
  });
});

describe('cleanOcrText', () => {
  it('re-joins words broken across lines', () => {
    expect(cleanOcrText('консер-\nвант')).toBe('консервант');
  });

  it('collapses line breaks and normalises dashes and quotes', () => {
    expect(cleanOcrText('Состав:\nвода,\nсахар')).toBe('Состав: вода, сахар');
    expect(cleanOcrText('«сахар»')).toBe('"сахар"');
  });
});

describe('normalizeWithMap', () => {
  it('maps every normalised character back to the original text', () => {
    const source = 'Сахар,  ПАЛЬМОВОЕ масло';
    const { text, map } = normalizeWithMap(source);
    expect(text).toBe('сахар, пальмовое масло');
    expect(map).toHaveLength(text.length);
    const start = text.indexOf('пальмовое');
    expect(source.slice(map[start]!, map[start]! + 9)).toBe('ПАЛЬМОВОЕ');
  });
});

describe('editDistance', () => {
  it('stops early once the bound is exceeded', () => {
    expect(editDistance('глутамат', 'глутамат')).toBe(0);
    expect(editDistance('глутамат', 'глyтамат')).toBe(1);
    expect(editDistance('глутамат', 'совершенно другое', 3)).toBe(4);
  });
});

describe('parseNumber', () => {
  it('reads both decimal separators', () => {
    expect(parseNumber('12,5 г')).toBe(12.5);
    expect(parseNumber('12.5g')).toBe(12.5);
    expect(parseNumber('нет числа')).toBeNull();
  });
});
