import { describe, expect, it } from 'vitest';
import { parseNutritionLabel, toPer100g } from '../src/nutrition/parseLabel';

describe('parseNutritionLabel', () => {
  it('reads a Russian panel', () => {
    const raw = `Пищевая ценность на 100 г:
      белки 6,3 г, жиры 30,9 г, в том числе насыщенные 10,6 г,
      углеводы 57,5 г, в том числе сахара 56,3 г, соль 0,107 г,
      энергетическая ценность 2252 кДж / 539 ккал`;
    const { nutriments, basis } = parseNutritionLabel(raw);

    expect(basis).toBe('per-100g');
    expect(nutriments.protein).toBe(6.3);
    expect(nutriments.fat).toBe(30.9);
    expect(nutriments.saturatedFat).toBe(10.6);
    expect(nutriments.carbohydrates).toBe(57.5);
    expect(nutriments.sugars).toBe(56.3);
    expect(nutriments.salt).toBe(0.107);
    expect(nutriments.energyKcal).toBe(539);
    expect(nutriments.energyKj).toBe(2252);
  });

  it('does not read "насыщенные" as the total fat', () => {
    const { nutriments } = parseNutritionLabel('жиры 20 г, в том числе насыщенные 8 г');
    expect(nutriments.fat).toBe(20);
    expect(nutriments.saturatedFat).toBe(8);
  });

  it('reads an English panel and converts sodium in mg', () => {
    const { nutriments } = parseNutritionLabel(
      'Nutrition per 100g: energy 450 kcal, fat 12 g, of which saturates 4 g, carbohydrate 60 g, of which sugars 30 g, protein 8 g, sodium 400 mg',
    );
    expect(nutriments.fat).toBe(12);
    expect(nutriments.saturatedFat).toBe(4);
    expect(nutriments.sugars).toBe(30);
    expect(nutriments.sodium).toBe(0.4);
    // Salt is derived from sodium with the standard 2.5 factor.
    expect(nutriments.salt).toBe(1);
  });

  it('warns when the panel is per serving and rescales it', () => {
    const label = parseNutritionLabel('На порцию 50 г: жиры 10 г, сахара 20 г, белки 5 г');
    expect(label.basis).toBe('per-serving');
    expect(label.servingSizeG).toBe(50);
    expect(label.warnings.join(' ')).toMatch(/порцию/);

    const per100 = toPer100g(label);
    expect(per100.sugars).toBe(40);
    expect(per100.fat).toBe(20);
  });

  it('warns when both columns are present', () => {
    const label = parseNutritionLabel('на 100 г / на порцию: жиры 10 г');
    expect(label.warnings.join(' ')).toMatch(/две колонки/);
  });

  it('reports nothing rather than guessing when there is no panel', () => {
    const label = parseNutritionLabel('Состав: вода, сахар');
    expect(label.nutriments).toEqual({});
    expect(label.warnings.join(' ')).toMatch(/не удалось/);
  });
});
