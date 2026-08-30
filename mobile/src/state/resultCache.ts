import type { AnalysisResult } from '../api/types';

/**
 * Holds the last few analyses for the session.
 *
 * Navigation params are meant for ids, not for a payload this size, and a scan
 * the user just made should open instantly even before the history request
 * comes back.
 */
const MAX_ENTRIES = 20;
const cache = new Map<string, AnalysisResult>();

export function cacheResult(result: AnalysisResult): void {
  cache.set(result.id, result);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export function getCachedResult(id: string): AnalysisResult | undefined {
  return cache.get(id);
}
