import { describe, expect, it } from 'vitest';
import { OpenFoodFactsClient, isValidBarcode, mapOffProduct } from '../src/integrations/openfoodfacts';
import fixture from './fixtures/off-product.json';

describe('isValidBarcode', () => {
  it('accepts valid EAN-13 and EAN-8 codes', () => {
    expect(isValidBarcode('3017620422003')).toBe(true);
    expect(isValidBarcode('4600000000008')).toBe(true);
    expect(isValidBarcode('96385074')).toBe(true);
  });

  it('rejects check-digit errors and wrong lengths', () => {
    expect(isValidBarcode('3017620422004')).toBe(false);
    expect(isValidBarcode('12345')).toBe(false);
    expect(isValidBarcode('abcdefghijklm')).toBe(false);
  });
});

describe('mapOffProduct', () => {
  it('maps the fields we need and prefers the localised ones', () => {
    const mapped = mapOffProduct(fixture.product, 'ru');
    expect(mapped.product.name).toBe('Ореховая паста с какао');
    expect(mapped.product.brand).toBe('Test Brand');
    expect(mapped.product.ingredientsText).toMatch(/пальмовое масло/);
    expect(mapped.product.categories).toContain('chocolate spreads');
    expect(mapped.nutriments.sugars).toBe(56.3);
    expect(mapped.nutriScoreGrade).toBe('e');
  });

  it('falls back to English when the locale is English', () => {
    const mapped = mapOffProduct(fixture.product, 'en');
    expect(mapped.product.name).toBe('Hazelnut spread with cocoa');
    expect(mapped.product.ingredientsText).toMatch(/palm oil/);
  });

  it('survives a record where almost everything is missing', () => {
    const mapped = mapOffProduct({ code: '123' });
    expect(mapped.product.name).toBeNull();
    expect(mapped.nutriments).toEqual({});
  });

  it('derives salt from sodium when only sodium is given', () => {
    const mapped = mapOffProduct({ nutriments: { sodium_100g: 0.4 } });
    expect(mapped.nutriments.salt).toBe(1);
  });
});

describe('OpenFoodFactsClient', () => {
  const config = { baseUrl: 'https://off.test', userAgent: 'test', timeoutMs: 500, enabled: true };

  it('returns not-found for status 0', async () => {
    const client = new OpenFoodFactsClient({
      ...config,
      fetchImpl: async () => new Response(JSON.stringify({ status: 0 }), { status: 200 }),
    });
    expect(await client.getByBarcode('3017620422003')).toEqual({ status: 'not-found' });
  });

  it('reports unavailable rather than throwing when the API is down', async () => {
    const client = new OpenFoodFactsClient({
      ...config,
      fetchImpl: async () => {
        throw new Error('connection refused');
      },
    });
    const result = await client.getByBarcode('3017620422003');
    expect(result.status).toBe('unavailable');
  });

  it('does not call the network at all in offline mode', async () => {
    let called = false;
    const client = new OpenFoodFactsClient({
      ...config,
      enabled: false,
      fetchImpl: async () => {
        called = true;
        return new Response('{}');
      },
    });
    expect((await client.getByBarcode('3017620422003')).status).toBe('unavailable');
    expect(called).toBe(false);
  });

  it('sends the required User-Agent header', async () => {
    let seen: string | null = null;
    const client = new OpenFoodFactsClient({
      ...config,
      fetchImpl: async (_url, init) => {
        seen = new Headers(init?.headers).get('user-agent');
        return new Response(JSON.stringify({ status: 1, product: fixture.product }));
      },
    });
    await client.getByBarcode('3017620422003');
    expect(seen).toBe('test');
  });
});
