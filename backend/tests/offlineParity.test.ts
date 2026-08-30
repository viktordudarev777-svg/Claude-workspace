import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  analyzeProduct, buildAdditiveDatabase, extractIngredientSection, parseNutritionLabel,
  toPer100g, type AdditiveGroup, type ProductInfo, type Reference,
} from '@foodlens/engine';
import { createApp } from '../src/app';
import { config } from '../src/config';
import { openDatabase } from '../src/db/client';
import { OpenFoodFactsClient } from '../src/integrations/openfoodfacts';

/**
 * The offline promise is that the phone gives the *same* verdict as the server,
 * not a simplified one. These tests rebuild the database from the bundle
 * exactly as the app does and check that the answers match.
 */
function build() {
  const db = openDatabase(':memory:');
  const off = new OpenFoodFactsClient({
    baseUrl: 'http://stub.invalid', userAgent: 'test', timeoutMs: 100, enabled: false,
  });
  return createApp({ ...config, databasePath: ':memory:' }, { db, off }).app;
}

/** Mirrors mobile/src/engine/offlineAnalysis.ts. */
function analyzeOnDevice(
  bundle: { groups: AdditiveGroup[]; references: Record<string, Reference>; version: string },
  rawText: string,
) {
  const additives = buildAdditiveDatabase(bundle.groups, bundle.references, bundle.version);
  const label = parseNutritionLabel(rawText);

  const product: ProductInfo = {
    barcode: null, name: null, brand: null, quantity: null, categories: [],
    imageUrl: null, ingredientsText: extractIngredientSection(rawText) || rawText,
    ingredients: [], dataSource: 'label',
  };

  return analyzeProduct({
    source: 'label-ocr',
    locale: 'ru',
    additives,
    product,
    nutriments: toPer100g(label),
    packText: rawText,
    inputConfidence: 0.85,
  }).result;
}

const LABELS = [
  'Состав: свинина, вода, соль, фиксатор окраски Е250, усилитель вкуса Е621, краситель Е120. Пищевая ценность на 100 г: белки 12 г, жиры 24 г, в том числе насыщенные 9 г, углеводы 2 г, соль 2,2 г, энергетическая ценность 280 ккал',
  'Состав: мука пшеничная цельнозерновая, вода, закваска, соль. Пищевая ценность на 100 г: белки 9 г, жиры 1,5 г, в том числе насыщенные 0,3 г, углеводы 42 г, в том числе сахара 2 г, пищевые волокна 7 г, соль 1 г',
  'Состав: сахар, пальмовое масло, какао-порошок, эмульгатор лецитины E322, ароматизатор. Пищевая ценность на 100 г: жиры 30 г, в том числе насыщенные 12 г, углеводы 57 г, в том числе сахара 55 г',
  'Состав: вода, подсластители аспартам E951 и ацесульфам калия E950, регулятор кислотности E338, краситель E150d',
];

describe('offline parity', () => {
  it('reproduces the server verdict from the bundle, label for label', async () => {
    const app = build();
    const bundle = (await request(app).get('/api/v1/bundle').expect(200)).body;

    for (const text of LABELS) {
      const server = (
        await request(app).post('/api/v1/analyze/label').send({ text, ocrConfidence: 0.85 }).expect(200)
      ).body;
      const device = analyzeOnDevice(bundle, text);

      expect(device.verdict.score, text.slice(0, 40)).toBe(server.verdict.score);
      expect(device.verdict.light, text.slice(0, 40)).toBe(server.verdict.light);
      expect(device.additives.map((a) => a.code)).toEqual(server.additives.map((a: { code: string }) => a.code));
      expect(device.flags.map((f) => f.id)).toEqual(server.flags.map((f: { id: string }) => f.id));
      expect(device.recommendations.map((r) => r.id)).toEqual(
        server.recommendations.map((r: { id: string }) => r.id),
      );
      expect(device.nutriScore?.grade).toBe(server.nutriScore?.grade);
    }
  });

  it('builds an index identical to the one the server loads from disk', async () => {
    const app = build();
    const bundle = (await request(app).get('/api/v1/bundle').expect(200)).body;
    const fromBundle = buildAdditiveDatabase(bundle.groups, bundle.references, bundle.version);

    const health = (await request(app).get('/health').expect(200)).body;
    expect(fromBundle.all.length).toBe(health.additives);
    expect(fromBundle.version).toBe(health.dataVersion);
  });

  it('ships a mobile snapshot that matches the served bundle', async () => {
    // The snapshot is committed, so it can drift from the data files. If this
    // fails, run `npm run build:snapshot` in mobile/.
    const snapshot = (await import('../../mobile/src/data/snapshot.json')).default as {
      version: string;
      groups: AdditiveGroup[];
    };
    const bundle = (await request(build()).get('/api/v1/bundle').expect(200)).body;

    expect(snapshot.version).toBe(bundle.version);
    expect(snapshot.groups.flatMap((g) => g.additives).length).toBe(
      bundle.groups.flatMap((g: AdditiveGroup) => g.additives).length,
    );
  });
});
