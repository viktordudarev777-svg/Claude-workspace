import { describe, expect, it } from 'vitest';
import { analyzeProduct } from '../src/domain/analyze';
import type { Nutriments, ProductInfo } from '../src/domain/types';

function product(ingredientsText: string, overrides: Partial<ProductInfo> = {}): ProductInfo {
  return {
    barcode: null, name: null, brand: null, quantity: null, categories: [],
    imageUrl: null, ingredientsText, ingredients: [], dataSource: 'label', ...overrides,
  };
}

const analyze = (ingredientsText: string, nutriments: Nutriments = {}, overrides: Partial<ProductInfo> = {}) =>
  analyzeProduct({ source: 'label-ocr', locale: 'ru', product: product(ingredientsText, overrides), nutriments }).result;

describe('analyzeProduct', () => {
  it('rates a plain wholemeal bread green', () => {
    const result = analyze(
      'Состав: мука пшеничная цельнозерновая, вода, закваска, соль',
      { energyKcal: 240, fat: 1.5, saturatedFat: 0.3, sugars: 2, salt: 1, protein: 9, fiber: 7 },
    );
    expect(result.verdict.light).toBe('green');
    expect(result.additives).toHaveLength(0);
    expect(result.flags.map((f) => f.id)).toContain('high-fiber');
  });

  it('rates a sausage red and explains why', () => {
    const result = analyze(
      'Состав: свинина, вода, соль, фиксатор окраски E250, усилитель вкуса E621, стабилизатор E451, краситель E120',
      { energyKcal: 280, fat: 24, saturatedFat: 9, sugars: 1, salt: 2.2, protein: 12 },
    );

    expect(result.verdict.light).toBe('red');
    expect(result.verdict.score).toBeLessThan(50);
    expect(result.additives.map((a) => a.code)).toEqual(expect.arrayContaining(['E250', 'E621', 'E451']));

    const nitrite = result.additives.find((a) => a.code === 'E250')!;
    expect(nitrite.risk).toBe('high');
    expect(nitrite.detail).toMatch(/ботулизм/);

    expect(result.recommendations.map((r) => r.id)).toContain('avoid-nitrite');
    expect(result.flags.map((f) => f.id)).toContain('high-salt');
  });

  it('flags partially hydrogenated fat as a hard no', () => {
    const result = analyze('Состав: мука, сахар, частично гидрогенизированное растительное масло');
    expect(result.verdict.light).toBe('red');
    expect(result.flags.map((f) => f.id)).toContain('trans-fat-ingredient');
    expect(result.recommendations.map((r) => r.id)).toContain('avoid-trans-fat');
  });

  it('notices sugar high up the ingredient list', () => {
    const result = analyze('Состав: сахар, пшеничная мука, какао-порошок, вода');
    expect(result.flags.map((f) => f.id)).toContain('sugar-first');
  });

  it('warns about phenylalanine for a product with aspartame', () => {
    const result = analyze('Состав: вода, подсластитель аспартам (E951), ароматизатор');
    expect(result.recommendations.map((r) => r.id)).toContain('phenylketonuria');
  });

  it('carries the children attention warning through to advice', () => {
    const result = analyze('Состав: сахар, красители E102, E110, ароматизатор');
    expect(result.recommendations.map((r) => r.id)).toContain('child-caution');
  });

  it('produces a usable result when only the ingredient list is readable', () => {
    const result = analyze('Состав: вода, сахар, консервант E211');
    expect(result.nutriScore).toBeNull();
    expect(result.warnings.join(' ')).toMatch(/пищевая ценность|Пищевая ценность/i);
    expect(result.confidence.overall).toBeLessThan(1);
    expect(result.verdict.headline).toBeTruthy();
  });

  it('degrades honestly when nothing could be read', () => {
    const result = analyze('');
    expect(result.confidence.overall).toBeLessThan(0.6);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.additives).toHaveLength(0);
  });

  it('localises the whole result into English', () => {
    const result = analyzeProduct({
      source: 'label-ocr',
      locale: 'en',
      product: product('Ingredients: water, sugar, preservative E211, colour E129'),
      nutriments: { sugars: 30 },
    }).result;

    expect(result.verdict.headline).toMatch(/[A-Za-z]/);
    expect(result.additives[0]!.name).toBe('Sodium benzoate');
    expect(result.flags.some((f) => /sugar/i.test(f.title))).toBe(true);
  });

  it('applies drink thresholds to a drink', () => {
    const asFood = analyze('Состав: вода, сахар', { sugars: 12 });
    const asDrink = analyze('Состав: вода, сахар', { sugars: 12 }, { categories: ['напитки'], name: 'Лимонад' });
    const foodLight = asFood.nutrientLights.find((l) => l.nutrient === 'sugars')!.light;
    const drinkLight = asDrink.nutrientLights.find((l) => l.nutrient === 'sugars')!.light;
    // 12 g/100 is amber for food (red starts at 22.5) but red for a drink (11.25).
    expect(foodLight).toBe('yellow');
    expect(drinkLight).toBe('red');
  });

  it('keeps the score explainable', () => {
    const { breakdown } = analyzeProduct({
      source: 'label-ocr',
      locale: 'ru',
      product: product('Состав: мука, сахар, краситель E171'),
      nutriments: { sugars: 40, salt: 0.1 },
    });
    expect(breakdown.some((entry) => entry.reason.includes('E171'))).toBe(true);
    expect(breakdown.every((entry) => Number.isFinite(entry.delta))).toBe(true);
  });
});

describe('children attention advice', () => {
  const advice = (text: string) =>
    analyze(text).recommendations.find((r) => r.id === 'child-caution');

  it('names colours when the concern comes from a colour', () => {
    expect(advice('Состав: сахар, красители E102, E110')?.text).toMatch(/красител/);
  });

  it('names the actual additive when no colour is involved', () => {
    // Sodium benzoate carries the same concern, but telling the shopper to
    // avoid colours would send them looking for the wrong thing.
    const text = advice('Состав: вода, сахар, консервант E211')?.text ?? '';
    expect(text).toMatch(/бензоат натрия \(E211\)/);
    expect(text).not.toMatch(/красител/);
  });
});
