import { describe, expect, it } from 'vitest';
import { computeNutriScore, detectProfile } from '../src/domain/scoring/nutriScore';

describe('computeNutriScore', () => {
  it('grades a chocolate spread E', () => {
    const result = computeNutriScore({
      nutriments: {
        energyKj: 2252, sugars: 56.3, saturatedFat: 10.6, salt: 0.107, protein: 6.3, fiber: 0,
      },
      profile: 'general',
    });
    expect(result.grade).toBe('E');
    expect(result.negativePoints).toBe(31);
    // 31 negative points is far past the cut-off, so protein cannot buy the
    // grade back.
    expect(result.positivePoints).toBe(0);
  });

  it('grades a whole apple A', () => {
    const result = computeNutriScore({
      nutriments: {
        energyKcal: 52, sugars: 10.4, saturatedFat: 0.03, salt: 0.003, protein: 0.3,
        fiber: 2.4, fruitsVegetablesNuts: 100,
      },
      profile: 'general',
    });
    expect(result.grade).toBe('A');
    expect(result.points).toBeLessThanOrEqual(0);
  });

  it('uses the beverage scale, where the same sugar level costs far more', () => {
    const asFood = computeNutriScore({
      nutriments: { energyKj: 180, sugars: 9, protein: 0.7 },
      profile: 'general',
    });
    const asDrink = computeNutriScore({
      nutriments: { energyKj: 180, sugars: 9, protein: 0.7 },
      profile: 'beverage',
    });
    expect(asDrink.negativePoints).toBeGreaterThan(asFood.negativePoints);
  });

  it('gives water an A regardless of the arithmetic', () => {
    expect(computeNutriScore({ nutriments: {}, profile: 'water' }).grade).toBe('A');
  });

  it('penalises sweeteners in drinks', () => {
    const plain = computeNutriScore({ nutriments: { energyKj: 20, sugars: 0 }, profile: 'beverage' });
    const sweetened = computeNutriScore({
      nutriments: { energyKj: 20, sugars: 0 },
      profile: 'beverage',
      hasSweeteners: true,
    });
    expect(sweetened.negativePoints - plain.negativePoints).toBe(4);
  });

  it('counts protein for cheese even at high negative points', () => {
    const nutriments = { energyKj: 1500, sugars: 0, saturatedFat: 20, salt: 1.8, protein: 25 };
    const asCheese = computeNutriScore({ nutriments, profile: 'cheese' });
    const asGeneral = computeNutriScore({ nutriments, profile: 'general' });
    expect(asCheese.positivePoints).toBeGreaterThan(asGeneral.positivePoints);
  });

  it('marks the result estimated when inputs are missing', () => {
    expect(computeNutriScore({ nutriments: { sugars: 5 }, profile: 'general' }).estimated).toBe(true);
  });
});

describe('detectProfile', () => {
  it('recognises drinks, water and cheese', () => {
    expect(detectProfile(['напитки'], 'Лимонад', true)).toBe('beverage');
    expect(detectProfile([], 'Минеральная вода', true)).toBe('water');
    expect(detectProfile(['молочные продукты'], 'Сыр Гауда', false)).toBe('cheese');
    expect(detectProfile(['снеки'], 'Печенье', false)).toBe('general');
  });
});
