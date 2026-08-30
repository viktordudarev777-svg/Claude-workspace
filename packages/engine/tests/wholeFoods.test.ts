import { describe, expect, it } from 'vitest';
import { matchWholeFood, toProductInfo } from '../src/wholeFoods';
import { loadAdditiveDatabase, loadWholeFoods } from '@foodlens/data';
import { analyzeProduct } from '../src/analyze';

const foods = loadWholeFoods();
const additives = loadAdditiveDatabase();

describe('matchWholeFood', () => {
  it('matches vision labels in English and Russian', () => {
    expect(matchWholeFood([{ name: 'Apple', score: 0.97 }], foods)?.food.id).toBe('apple');
    expect(matchWholeFood([{ name: 'банан', score: 0.9 }], foods)?.food.id).toBe('banana');
    expect(matchWholeFood([{ name: 'French fries', score: 0.88 }], foods)?.food.id).toBe('french-fries');
  });

  it('walks the label list in the order the model ranked it', () => {
    const match = matchWholeFood(
      [
        { name: 'Food', score: 0.99 },
        { name: 'Pizza', score: 0.93 },
      ],
      foods,
    );
    expect(match?.food.id).toBe('pizza');
  });

  it('returns nothing rather than guessing on unrelated labels', () => {
    expect(matchWholeFood([{ name: 'Bicycle', score: 0.9 }], foods)).toBeNull();
  });

  it('never returns a confidence above the model\'s own', () => {
    const match = matchWholeFood([{ name: 'Apple', score: 0.4 }], foods)!;
    expect(match.confidence).toBeLessThanOrEqual(0.4);
  });
});

describe('whole foods through the analyser', () => {
  it('rates a photographed apple green with no additives', () => {
    const apple = foods.find((f) => f.id === 'apple')!;
    const { result } = analyzeProduct({
      source: 'photo',
      locale: 'ru',
      additives,
      product: toProductInfo(apple, 'ru'),
      nutriments: apple.nutriments,
      inputConfidence: 0.9,
    });

    expect(result.verdict.light).toBe('green');
    expect(result.nutriScore?.grade).toBe('A');
    expect(result.additives).toHaveLength(0);
  });

  it('rates photographed fries worse than an apple', () => {
    const fries = foods.find((f) => f.id === 'french-fries')!;
    const apple = foods.find((f) => f.id === 'apple')!;
    const score = (food: typeof fries) =>
      analyzeProduct({
        source: 'photo', locale: 'ru', additives,
        product: toProductInfo(food, 'ru'), nutriments: food.nutriments,
      }).result.verdict.score;

    expect(score(fries)).toBeLessThan(score(apple));
  });

  it('has usable data for every food in the file', () => {
    for (const food of foods) {
      expect(food.names.ru, food.id).toBeTruthy();
      expect(food.names.en, food.id).toBeTruthy();
      expect(food.note.ru.length, food.id).toBeGreaterThan(20);
      expect(food.nutriments.energyKcal, food.id).toBeGreaterThan(0);
      expect(food.synonyms.length, food.id).toBeGreaterThan(0);
    }
  });
});
