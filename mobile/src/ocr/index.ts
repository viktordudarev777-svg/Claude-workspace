import type { OcrOutcome } from './types';

/**
 * On-device OCR, with a server fallback.
 *
 * Reading the label on the phone is faster, works without a connection and
 * never uploads a photo, so it is always tried first. ML Kit (Android) and
 * Vision (iOS) both need a custom dev build; in Expo Go the module is absent
 * and we fall back to sending the image to the backend.
 */

interface MlKitTextRecognition {
  recognize(uri: string): Promise<{ text: string; blocks?: unknown[] }>;
}

let cachedModule: MlKitTextRecognition | null | undefined;

/**
 * Loads the native module if this build has it.
 *
 * `require` is deliberate: a static import would make Metro fail the bundle in
 * Expo Go, where the module does not exist.
 */
function loadNativeModule(): MlKitTextRecognition | null {
  if (cachedModule !== undefined) return cachedModule ?? null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('@react-native-ml-kit/text-recognition') as
      | { default?: MlKitTextRecognition }
      | MlKitTextRecognition
      | undefined;
    // The package exports the recogniser as a default export; older builds
    // put it on the module object itself.
    const candidate =
      loaded && 'default' in loaded ? loaded.default : (loaded as MlKitTextRecognition | undefined);
    cachedModule = candidate && typeof candidate.recognize === 'function' ? candidate : null;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export function hasOnDeviceOcr(): boolean {
  return loadNativeModule() !== null;
}

/**
 * Recognises the text in a photo on the device.
 *
 * The confidence is a heuristic: ML Kit does not expose a document-level score,
 * so we judge by how much text came back and whether it looks like an
 * ingredient list. It only ever lowers the server's trust in the input, never
 * raises it.
 */
export async function recognizeOnDevice(imageUri: string): Promise<OcrOutcome> {
  const module = loadNativeModule();
  if (!module) return { available: false };

  try {
    const result = await module.recognize(imageUri);
    const text = result.text ?? '';
    const looksLikeIngredients = /состав|ingredient|zutaten|е\s?\d{3}|e\s?\d{3}/i.test(text);
    const confidence = text.length < 40 ? 0.3 : looksLikeIngredients ? 0.9 : 0.6;
    return { available: true, text, confidence };
  } catch {
    return { available: false };
  }
}
