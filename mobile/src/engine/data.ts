import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildAdditiveDatabase,
  type AdditiveDatabase,
  type AdditiveGroup,
  type Reference,
  type WholeFood,
} from '@foodlens/engine';
import snapshot from '../data/snapshot.json';
import { API_BASE_URL } from '../api/client';

export interface Bundle {
  version: string;
  references: Record<string, Reference>;
  groups: AdditiveGroup[];
  wholeFoods: WholeFood[];
}

export interface EngineData {
  additives: AdditiveDatabase;
  wholeFoods: WholeFood[];
  version: string;
  /** Where the data came from, so the UI can say the reference may be stale. */
  origin: 'snapshot' | 'downloaded';
}

const CACHE_KEY = 'foodlens.bundle';

/**
 * The data the offline engine runs on.
 *
 * A snapshot ships inside the app so the first launch works with no connection
 * at all; once online the app pulls a newer bundle and caches it. Building the
 * index costs a few tens of milliseconds, so it is done once and kept.
 */
let cached: EngineData | null = null;
let loading: Promise<EngineData> | null = null;

function build(bundle: Bundle, origin: EngineData['origin']): EngineData {
  return {
    additives: buildAdditiveDatabase(bundle.groups, bundle.references, bundle.version),
    wholeFoods: bundle.wholeFoods,
    version: bundle.version,
    origin,
  };
}

export async function getEngineData(): Promise<EngineData> {
  if (cached) return cached;
  if (loading) return loading;

  loading = (async () => {
    const bundled = snapshot as unknown as Bundle;
    try {
      const stored = await AsyncStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Bundle;
        // Only prefer the cache when it is actually newer than what shipped:
        // an app update can carry a fresher snapshot than the last download.
        if (parsed.version > bundled.version) {
          cached = build(parsed, 'downloaded');
          return cached;
        }
      }
    } catch {
      // A corrupt cache must never break analysis — fall through to the snapshot.
    }
    cached = build(bundled, 'snapshot');
    return cached;
  })();

  try {
    return await loading;
  } finally {
    loading = null;
  }
}

/**
 * Pulls a newer reference bundle if the server has one.
 *
 * Checks the version first: the full bundle is a few hundred kilobytes and
 * changes rarely, so almost every call ends after a tiny request.
 */
export async function refreshBundle(): Promise<{ updated: boolean; version: string }> {
  const current = await getEngineData();

  const probe = await fetch(`${API_BASE_URL}/api/v1/bundle/version`);
  if (!probe.ok) return { updated: false, version: current.version };

  const { version } = (await probe.json()) as { version: string };
  if (version === current.version) return { updated: false, version };

  const response = await fetch(`${API_BASE_URL}/api/v1/bundle`);
  if (!response.ok) return { updated: false, version: current.version };

  const bundle = (await response.json()) as Bundle;
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(bundle));
  cached = build(bundle, 'downloaded');
  return { updated: true, version: bundle.version };
}

/** Test seam and a way to recover from a bad cache. */
export async function clearBundleCache(): Promise<void> {
  cached = null;
  await AsyncStorage.removeItem(CACHE_KEY);
}
