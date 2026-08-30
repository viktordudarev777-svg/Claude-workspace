import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app';
import { config } from '../src/config';
import { openDatabase } from '../src/db/client';
import { OpenFoodFactsClient } from '../src/integrations/openfoodfacts';
import fixture from './fixtures/off-product.json';

const DEVICE = 'test-device-0001';

/**
 * A stub Open Food Facts client. Every test here is offline: the real API is
 * rate limited and would make the suite depend on someone else's uptime.
 */
function stubOff(overrides: Partial<OpenFoodFactsClient> = {}): OpenFoodFactsClient {
  const client = new OpenFoodFactsClient({
    baseUrl: 'http://stub.invalid',
    userAgent: 'test',
    timeoutMs: 100,
    enabled: false,
  });
  return Object.assign(client, overrides);
}

function build(off: OpenFoodFactsClient): Express {
  const db = openDatabase(':memory:');
  return createApp({ ...config, databasePath: ':memory:' }, { db, off }).app;
}

describe('GET /health', () => {
  it('reports how the instance is configured', async () => {
    const response = await request(build(stubOff())).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.additives).toBeGreaterThan(50);
  });
});

describe('POST /api/v1/analyze/barcode', () => {
  let app: Express;

  beforeEach(() => {
    app = build(
      stubOff({
        getByBarcode: async () => {
          const { mapOffProduct } = await import('../src/integrations/openfoodfacts');
          return { status: 'found', data: mapOffProduct(fixture.product, 'ru') };
        },
        searchByCategory: async () => [],
      } as Partial<OpenFoodFactsClient>),
    );
  });

  it('analyses a product found in the database', async () => {
    const response = await request(app)
      .post('/api/v1/analyze/barcode')
      .set('X-Device-Id', DEVICE)
      .send({ barcode: '3017620422003' })
      .expect(200);

    expect(response.body.product.name).toBe('Ореховая паста с какао');
    expect(response.body.verdict.light).toBe('red');
    expect(response.body.nutriScore.grade).toBe('E');
    expect(response.body.flags.map((f: { id: string }) => f.id)).toEqual(
      expect.arrayContaining(['high-sugar', 'palm-oil', 'sugar-first']),
    );
    expect(response.body.additives.map((a: { code: string }) => a.code)).toContain('E322');
  });

  it('rejects a barcode that fails the check digit', async () => {
    const response = await request(app)
      .post('/api/v1/analyze/barcode')
      .send({ barcode: '3017620422004' })
      .expect(400);
    expect(response.body.error).toBe('invalid_barcode');
  });

  it('rejects a malformed body with field-level detail', async () => {
    const response = await request(app).post('/api/v1/analyze/barcode').send({ barcode: 'abc' }).expect(400);
    expect(response.body.error).toBe('invalid_request');
    expect(response.body.details[0].path).toBe('barcode');
  });

  it('says so plainly when the product is unknown', async () => {
    const unknown = build(stubOff({ getByBarcode: async () => ({ status: 'not-found' }) } as Partial<OpenFoodFactsClient>));
    const response = await request(unknown)
      .post('/api/v1/analyze/barcode')
      .send({ barcode: '4600000000008' })
      .expect(200);
    expect(response.body.warnings.join(' ')).toMatch(/Open Food Facts/);
  });
});

describe('POST /api/v1/analyze/label', () => {
  it('analyses text recognised on the device', async () => {
    const app = build(stubOff());
    const response = await request(app)
      .post('/api/v1/analyze/label')
      .set('X-Device-Id', DEVICE)
      .send({
        text: 'Состав: вода, сахар, регулятор кислотности E338, консервант E211, краситель E150d. Пищевая ценность на 100 мл: углеводы 11 г, в том числе сахара 11 г, энергетическая ценность 42 ккал',
        ocrConfidence: 0.9,
      })
      .expect(200);

    expect(response.body.additives.map((a: { code: string }) => a.code)).toEqual(
      expect.arrayContaining(['E338', 'E211', 'E150d']),
    );
    expect(response.body.nutriments.sugars).toBe(11);
    expect(response.body.verdict.score).toBeLessThan(80);
  });

  it('honours the locale query parameter', async () => {
    const response = await request(build(stubOff()))
      .post('/api/v1/analyze/label?locale=en')
      .send({ text: 'Ingredients: water, sugar, preservative E211' })
      .expect(200);
    expect(response.body.locale).toBe('en');
    expect(response.body.additives[0].name).toBe('Sodium benzoate');
  });
});

describe('/api/v1/additives', () => {
  it('searches by code, name and risk', async () => {
    const app = build(stubOff());

    const byCode = await request(app).get('/api/v1/additives?q=E621').expect(200);
    expect(byCode.body.items[0].code).toBe('E621');

    const byName = await request(app).get('/api/v1/additives?q=нитрит').expect(200);
    expect(byName.body.items.map((i: { code: string }) => i.code)).toContain('E250');

    const highRisk = await request(app).get('/api/v1/additives?risk=high').expect(200);
    expect(highRisk.body.total).toBeGreaterThan(0);
    expect(highRisk.body.items.every((i: { risk: string }) => i.risk === 'high')).toBe(true);
  });

  it('returns a full entry with resolved sources', async () => {
    const response = await request(build(stubOff())).get('/api/v1/additives/e171').expect(200);
    expect(response.body.code).toBe('E171');
    expect(response.body.restrictedIn).toContain('EU');
    expect(response.body.sources[0].url).toMatch(/^https:\/\//);
  });

  it('404s on an unknown code', async () => {
    await request(build(stubOff())).get('/api/v1/additives/E4242').expect(404);
  });
});

describe('/api/v1/history', () => {
  it('stores scans per device and keeps them separate', async () => {
    const app = build(stubOff());
    const scan = async (deviceId: string, text: string) =>
      request(app).post('/api/v1/analyze/label').set('X-Device-Id', deviceId).send({ text }).expect(200);

    await scan(DEVICE, 'Состав: вода, сахар, консервант E211');
    await scan(DEVICE, 'Состав: мука, вода, соль');
    await scan('other-device-9999', 'Состав: молоко');

    const mine = await request(app).get('/api/v1/history').set('X-Device-Id', DEVICE).expect(200);
    expect(mine.body.items).toHaveLength(2);

    const stats = await request(app).get('/api/v1/history/stats').set('X-Device-Id', DEVICE).expect(200);
    expect(stats.body.total).toBe(2);
  });

  it('requires a device id', async () => {
    await request(build(stubOff())).get('/api/v1/history').expect(401);
  });

  it('toggles favourites and deletes entries', async () => {
    const app = build(stubOff());
    const created = await request(app)
      .post('/api/v1/analyze/label')
      .set('X-Device-Id', DEVICE)
      .send({ text: 'Состав: вода, сахар' })
      .expect(200);
    const id = created.body.id as string;

    await request(app).post(`/api/v1/history/${id}/favorite`).set('X-Device-Id', DEVICE).send({ favorite: true }).expect(200);
    const favorites = await request(app).get('/api/v1/history?favorites=true').set('X-Device-Id', DEVICE).expect(200);
    expect(favorites.body.items).toHaveLength(1);

    await request(app).delete(`/api/v1/history/${id}`).set('X-Device-Id', DEVICE).expect(204);
    await request(app).get(`/api/v1/history/${id}`).set('X-Device-Id', DEVICE).expect(404);
  });

  it('does not let one device read another device\'s scan', async () => {
    const app = build(stubOff());
    const created = await request(app)
      .post('/api/v1/analyze/label')
      .set('X-Device-Id', DEVICE)
      .send({ text: 'Состав: вода' })
      .expect(200);
    await request(app).get(`/api/v1/history/${created.body.id}`).set('X-Device-Id', 'someone-else-1').expect(404);
  });
});
