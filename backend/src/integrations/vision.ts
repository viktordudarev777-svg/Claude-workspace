import type { Config } from '../config';

export interface VisionLabel {
  name: string;
  score: number;
}

export interface VisionResult {
  labels: VisionLabel[];
  /** Best guess at a branded product name, when the provider recognises one. */
  productName: string | null;
  /** Barcode read from the photo, when the provider returns one. */
  barcode: string | null;
}

export interface VisionProvider {
  readonly name: string;
  recognize(imageBase64: string): Promise<VisionResult>;
}

const EMPTY: VisionResult = { labels: [], productName: null, barcode: null };

/** Used when no provider is configured: the app then falls back to OCR and barcode. */
class NoopVisionProvider implements VisionProvider {
  readonly name = 'none';
  async recognize(): Promise<VisionResult> {
    return EMPTY;
  }
}

/**
 * Google Cloud Vision. `LABEL_DETECTION` gives the food category and
 * `WEB_DETECTION` often returns the exact branded product name, which is what
 * makes "photograph the pack" work for products that are in Open Food Facts.
 */
class GoogleVisionProvider implements VisionProvider {
  readonly name = 'google-vision';

  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async recognize(imageBase64: string): Promise<VisionResult> {
    const response = await this.fetchImpl(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [
                { type: 'LABEL_DETECTION', maxResults: 10 },
                { type: 'WEB_DETECTION', maxResults: 5 },
              ],
            },
          ],
        }),
      },
    );
    if (!response.ok) throw new Error(`Google Vision responded ${response.status}`);

    const body = (await response.json()) as {
      responses?: Array<{
        labelAnnotations?: Array<{ description?: string; score?: number }>;
        webDetection?: { bestGuessLabels?: Array<{ label?: string }> };
      }>;
    };
    const first = body.responses?.[0];

    return {
      labels: (first?.labelAnnotations ?? [])
        .filter((a): a is { description: string; score: number } => Boolean(a.description))
        .map((a) => ({ name: a.description, score: a.score ?? 0.5 })),
      productName: first?.webDetection?.bestGuessLabels?.[0]?.label ?? null,
      barcode: null,
    };
  }
}

/** Clarifai's food model returns fine-grained dish names, which suits cooked food. */
class ClarifaiProvider implements VisionProvider {
  readonly name = 'clarifai';

  constructor(
    private readonly pat: string,
    private readonly model: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async recognize(imageBase64: string): Promise<VisionResult> {
    const response = await this.fetchImpl(
      `https://api.clarifai.com/v2/models/${encodeURIComponent(this.model)}/outputs`,
      {
        method: 'POST',
        headers: { Authorization: `Key ${this.pat}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: [{ data: { image: { base64: imageBase64 } } }] }),
      },
    );
    if (!response.ok) throw new Error(`Clarifai responded ${response.status}`);

    const body = (await response.json()) as {
      outputs?: Array<{ data?: { concepts?: Array<{ name?: string; value?: number }> } }>;
    };
    const concepts = body.outputs?.[0]?.data?.concepts ?? [];

    return {
      labels: concepts
        .filter((c): c is { name: string; value: number } => Boolean(c.name))
        .map((c) => ({ name: c.name, score: c.value ?? 0.5 })),
      productName: null,
      barcode: null,
    };
  }
}

export function createVisionProvider(config: Config, fetchImpl: typeof fetch = fetch): VisionProvider {
  switch (config.vision.provider) {
    case 'google-vision':
      return config.vision.googleApiKey
        ? new GoogleVisionProvider(config.vision.googleApiKey, fetchImpl)
        : new NoopVisionProvider();
    case 'clarifai':
      return config.vision.clarifaiPat
        ? new ClarifaiProvider(config.vision.clarifaiPat, config.vision.clarifaiModel, fetchImpl)
        : new NoopVisionProvider();
    default:
      return new NoopVisionProvider();
  }
}
