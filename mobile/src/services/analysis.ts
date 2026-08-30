import { api, ApiError, type RequestContext } from '../api/client';
import type { AnalysisResult } from '../api/types';
import { analyzeLabelOffline } from '../engine/offlineAnalysis';
import { enqueue } from '../offline/queue';

/**
 * The app's analysis entry points, with the offline fallback attached.
 *
 * The server is always tried first — it has Open Food Facts, the product name
 * and picture, and the alternatives. Only a transport failure falls back to the
 * on-device engine; a 400 from the server is a real answer and must surface as
 * an error rather than being papered over with a local guess.
 */
function isOffline(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 'network_error' || error.code === 'timeout');
}

export interface AnalyzeOutcome {
  result: AnalysisResult;
  /** True when the verdict was produced on the device. */
  offline: boolean;
}

export async function analyzeLabel(
  text: string,
  context: RequestContext,
  options: { barcode?: string; ocrConfidence?: number } = {},
): Promise<AnalyzeOutcome> {
  try {
    return { result: await api.analyzeLabel(text, context, options), offline: false };
  } catch (error) {
    if (!isOffline(error)) throw error;

    const result = await analyzeLabelOffline(text, context.locale, options);
    await enqueue(result, text, options.ocrConfidence ?? 0.85);
    return { result: result as AnalysisResult, offline: true };
  }
}

/**
 * A barcode is useless offline on its own — the product data lives in Open Food
 * Facts. Rather than invent a verdict, the failure is reported so the scan
 * screen can suggest photographing the ingredient list instead.
 */
export async function analyzeBarcode(barcode: string, context: RequestContext): Promise<AnalyzeOutcome> {
  return { result: await api.analyzeBarcode(barcode, context), offline: false };
}

export async function analyzePhoto(imageBase64: string, context: RequestContext): Promise<AnalyzeOutcome> {
  return { result: await api.analyzePhoto(imageBase64, context), offline: false };
}
