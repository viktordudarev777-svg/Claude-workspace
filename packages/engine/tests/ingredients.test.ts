import { describe, expect, it } from 'vitest';
import { parseIngredients, extractIngredientSection, flattenIngredients } from '../src/ingredients/parse';

describe('extractIngredientSection', () => {
  it('drops the prefix and everything after the list', () => {
    const raw = 'Состав: вода, сахар, соль. Пищевая ценность на 100 г: белки 2 г';
    expect(extractIngredientSection(raw)).toBe('вода, сахар, соль');
  });

  it('handles English and German labels', () => {
    expect(extractIngredientSection('Ingredients: water, sugar. Nutrition per 100g')).toBe('water, sugar');
    expect(extractIngredientSection('Zutaten: Wasser, Zucker. Nährwerte')).toBe('Wasser, Zucker');
  });

  it('returns the text unchanged when there is no prefix', () => {
    expect(extractIngredientSection('вода, сахар')).toBe('вода, сахар');
  });
});

describe('parseIngredients', () => {
  it('keeps declaration order, which is the order of decreasing weight', () => {
    const parsed = parseIngredients('Состав: сахар, какао тёртое, какао-масло');
    // Normalisation folds ё to е on purpose: labels spell it both ways.
    expect(parsed.map((i) => i.normalized)).toEqual(['сахар', 'какао тертое', 'какао-масло']);
    expect(parsed[1]!.raw).toBe('какао тёртое');
    expect(parsed.map((i) => i.rank)).toEqual([0, 1, 2]);
  });

  it('reads declared percentages', () => {
    const parsed = parseIngredients('Состав: томаты 62%, вода, соль');
    expect(parsed[0]!.percent).toBe(62);
    expect(parsed[0]!.normalized).toBe('томаты');
    expect(parsed[1]!.percent).toBeNull();
  });

  it('does not split inside parentheses', () => {
    const parsed = parseIngredients('Состав: вода, стабилизаторы (E401, E407), соль');
    expect(parsed).toHaveLength(3);
    expect(parsed[1]!.children.map((c) => c.normalized)).toEqual(['e401', 'e407']);
  });

  it('flattens children in reading order, each parent followed by its own parts', () => {
    const parsed = parseIngredients('Состав: шоколад (сахар, какао), молоко');
    expect(flattenIngredients(parsed).map((i) => i.normalized)).toEqual(['шоколад', 'сахар', 'какао', 'молоко']);
  });

  it('survives an unbalanced parenthesis from OCR', () => {
    const parsed = parseIngredients('Состав: эмульгатор (лецитин соевый, вода');
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]!.normalized).toBe('эмульгатор');
  });

  it('returns nothing for text with no list', () => {
    expect(parseIngredients('')).toEqual([]);
  });
});
