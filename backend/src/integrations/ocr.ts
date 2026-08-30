import type { Config } from '../config';

export interface OcrResult {
  text: string;
  /** 0..1; providers that do not report confidence get a conservative default. */
  confidence: number;
}

export interface OcrProvider {
  readonly name: string;
  recognizeText(imageBase64: string): Promise<OcrResult>;
}

/**
 * The default. On-device OCR (ML Kit on Android, Vision on iOS) is faster,
 * free and private, so the app sends text rather than pixels; this server-side
 * provider exists only for clients that cannot do it themselves.
 */
class NoopOcrProvider implements OcrProvider {
  readonly name = 'none';
  async recognizeText(): Promise<OcrResult> {
    return { text: '', confidence: 0 };
  }
}

class GoogleVisionOcrProvider implements OcrProvider {
  readonly name = 'google-vision';

  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async recognizeText(imageBase64: string): Promise<OcrResult> {
    const response = await this.fetchImpl(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
              // Ingredient lists are dense small print; the language hints cut
              // the number of Cyrillic/Latin confusions noticeably.
              imageContext: { languageHints: ['ru', 'en', 'de'] },
            },
          ],
        }),
      },
    );
    if (!response.ok) throw new Error(`Google Vision OCR responded ${response.status}`);

    const body = (await response.json()) as {
      responses?: Array<{ fullTextAnnotation?: { text?: string; pages?: Array<{ confidence?: number }> } }>;
    };
    const annotation = body.responses?.[0]?.fullTextAnnotation;

    return {
      text: annotation?.text ?? '',
      confidence: annotation?.pages?.[0]?.confidence ?? (annotation?.text ? 0.8 : 0),
    };
  }
}

export function createOcrProvider(config: Config, fetchImpl: typeof fetch = fetch): OcrProvider {
  if (config.ocr.provider === 'google-vision' && config.vision.googleApiKey) {
    return new GoogleVisionOcrProvider(config.vision.googleApiKey, fetchImpl);
  }
  return new NoopOcrProvider();
}
