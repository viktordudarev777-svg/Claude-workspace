import { describe, expect, it, beforeAll } from 'vitest';
import { loadAdditiveDatabase, type AdditiveDatabase } from '../src/domain/additives/database';
import { findAdditives } from '../src/domain/additives/matcher';
import { dataDir } from '../src/util/paths';

let db: AdditiveDatabase;
beforeAll(() => {
  db = loadAdditiveDatabase(dataDir());
});

describe('additive database', () => {
  it('loads every group file and indexes by code', () => {
    expect(db.all.length).toBeGreaterThan(50);
    expect(db.byCode.get('E621')?.names.ru).toBe('Глутамат натрия');
    expect(db.byCode.get('E171')?.risk).toBe('high');
  });

  it('resolves every cited reference', () => {
    for (const additive of db.all) {
      for (const source of additive.sources) {
        expect(db.references[source], `${additive.code} -> ${source}`).toBeDefined();
      }
    }
  });
});

describe('findAdditives', () => {
  it('finds codes written in any of the usual ways', () => {
    const text = 'Состав: вода, сахар, консервант E211, усилитель вкуса Е-621, краситель INS 102';
    const codes = findAdditives(text, db).findings.map((f) => f.code);
    expect(codes).toEqual(expect.arrayContaining(['E211', 'E621', 'E102']));
  });

  it('finds additives written out by name in Russian and English', () => {
    const ru = findAdditives('Состав: мясо, соль, нитрит натрия, глутамат натрия', db);
    expect(ru.findings.map((f) => f.code)).toEqual(expect.arrayContaining(['E250', 'E621']));

    const en = findAdditives('Ingredients: water, sugar, sodium benzoate, monosodium glutamate', db, 'en');
    expect(en.findings.map((f) => f.code)).toEqual(expect.arrayContaining(['E211', 'E621']));
  });

  it('reports one finding when a product spells out both the code and the name', () => {
    const result = findAdditives('усилитель вкуса глутамат натрия (E621)', db);
    expect(result.findings.filter((f) => f.code === 'E621')).toHaveLength(1);
  });

  it('recovers codes damaged by OCR, with lower confidence', () => {
    const result = findAdditives('консервант E2II, краситель E1O2', db);
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('E211');
    expect(codes).toContain('E102');
    for (const finding of result.findings) {
      expect(finding.confidence).toBeLessThan(0.9);
    }
  });

  it('keeps the exact label text for each match', () => {
    const result = findAdditives('Состав: свинина, НИТРИТ НАТРИЯ, специи', db);
    expect(result.findings[0]!.matchedText).toBe('НИТРИТ НАТРИЯ');
  });

  it('does not fire on ordinary words or on the plain word sugar', () => {
    const result = findAdditives('Состав: вода, сахар, соль, мука пшеничная, энергетическая ценность', db);
    expect(result.findings).toHaveLength(0);
  });

  it('collects E-codes it does not know rather than silently dropping them', () => {
    const result = findAdditives('стабилизатор E9999', db);
    expect(result.unknownCodes).toContain('E9999');
    expect(result.findings).toHaveLength(0);
  });

  it('localises the finding into the requested language', () => {
    const en = findAdditives('preservative E250', db, 'en').findings[0]!;
    expect(en.name).toBe('Sodium nitrite');
    expect(en.summary).toMatch(/sausage/i);
  });
});
