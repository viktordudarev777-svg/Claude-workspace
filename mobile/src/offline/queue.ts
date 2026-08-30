import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnalysisResult } from '@foodlens/engine';
import { api, ApiError, type RequestContext } from '../api/client';

const QUEUE_KEY = 'foodlens.offlineQueue';
const MAX_QUEUED = 50;

interface QueuedScan {
  /** The id of the local result, so the entry can be matched after syncing. */
  localId: string;
  scannedAt: string;
  text: string;
  ocrConfidence: number;
  barcode: string | null;
}

/**
 * Scans made without a connection.
 *
 * They are already analysed locally and shown to the user; the queue exists so
 * the server's history matches what the person actually scanned. Re-submitting
 * the original label text rather than the local result keeps the server the
 * single source of truth — it may have a newer reference database, or find the
 * product in Open Food Facts where the phone could not.
 */
async function read(): Promise<QueuedScan[]> {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    return stored ? (JSON.parse(stored) as QueuedScan[]) : [];
  } catch {
    return [];
  }
}

async function write(items: QueuedScan[]): Promise<void> {
  // Keep the newest: an unbounded queue on a phone that is offline for weeks
  // is a memory leak, and old scans matter less than recent ones.
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUED)));
}

export async function enqueue(result: AnalysisResult, text: string, ocrConfidence: number): Promise<void> {
  const items = await read();
  items.push({
    localId: result.id,
    scannedAt: result.scannedAt,
    text,
    ocrConfidence,
    barcode: result.product.barcode,
  });
  await write(items);
}

export async function pendingCount(): Promise<number> {
  return (await read()).length;
}

export interface FlushOutcome {
  synced: number;
  remaining: number;
}

/**
 * Re-submits queued scans.
 *
 * Stops at the first network failure and keeps the rest: if the connection is
 * still flaky, hammering it does not help, and the queue survives to try again.
 */
export async function flush(context: RequestContext): Promise<FlushOutcome> {
  const items = await read();
  if (items.length === 0) return { synced: 0, remaining: 0 };

  let synced = 0;
  for (const item of items) {
    try {
      await api.analyzeLabel(item.text, context, {
        ...(item.barcode ? { barcode: item.barcode } : {}),
        ocrConfidence: item.ocrConfidence,
      });
      synced++;
    } catch (error) {
      // A rejected scan (bad text, say) would block the queue forever, so only
      // a transport failure stops the run; anything else is dropped as unsendable.
      if (error instanceof ApiError && (error.code === 'network_error' || error.code === 'timeout')) {
        break;
      }
      synced++;
    }
  }

  const remaining = items.slice(synced);
  await write(remaining);
  return { synced, remaining: remaining.length };
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
