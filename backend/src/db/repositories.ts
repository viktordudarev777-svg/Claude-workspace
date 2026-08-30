import type { AnalysisResult, HistoryEntry, Locale } from '@foodlens/engine';
import type { OffProduct } from '../integrations/openfoodfacts';
import type { Db } from './client';

export class DeviceRepository {
  constructor(private readonly db: Db) {}

  /** Registers the device on first sight and refreshes `last_seen_at` after that. */
  touch(deviceId: string, locale: Locale): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO devices (id, created_at, last_seen_at, locale)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at, locale = excluded.locale`,
      )
      .run(deviceId, now, now, locale);
  }
}

interface ScanRow {
  id: string;
  scanned_at: string;
  source: string;
  barcode: string | null;
  name: string | null;
  brand: string | null;
  image_url: string | null;
  light: string;
  score: number;
  favorite: number;
  payload: string;
}

function toHistoryEntry(row: ScanRow): HistoryEntry {
  return {
    id: row.id,
    scannedAt: row.scanned_at,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    imageUrl: row.image_url,
    light: row.light as HistoryEntry['light'],
    score: row.score,
    source: row.source as HistoryEntry['source'],
    favorite: row.favorite === 1,
  };
}

export class ScanRepository {
  constructor(private readonly db: Db) {}

  save(deviceId: string, result: AnalysisResult): void {
    this.db
      .prepare(
        `INSERT INTO scans (id, device_id, scanned_at, source, barcode, name, brand, image_url, light, score, payload)
         VALUES (@id, @deviceId, @scannedAt, @source, @barcode, @name, @brand, @imageUrl, @light, @score, @payload)`,
      )
      .run({
        id: result.id,
        deviceId,
        scannedAt: result.scannedAt,
        source: result.source,
        barcode: result.product.barcode,
        name: result.product.name,
        brand: result.product.brand,
        imageUrl: result.product.imageUrl,
        light: result.verdict.light,
        score: result.verdict.score,
        payload: JSON.stringify(result),
      });
  }

  list(deviceId: string, limit: number, offset: number, favoritesOnly = false): HistoryEntry[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM scans
         WHERE device_id = ? ${favoritesOnly ? 'AND favorite = 1' : ''}
         ORDER BY scanned_at DESC LIMIT ? OFFSET ?`,
      )
      .all(deviceId, limit, offset) as ScanRow[];
    return rows.map(toHistoryEntry);
  }

  get(deviceId: string, id: string): AnalysisResult | null {
    const row = this.db
      .prepare('SELECT payload FROM scans WHERE device_id = ? AND id = ?')
      .get(deviceId, id) as { payload: string } | undefined;
    return row ? (JSON.parse(row.payload) as AnalysisResult) : null;
  }

  setFavorite(deviceId: string, id: string, favorite: boolean): boolean {
    const info = this.db
      .prepare('UPDATE scans SET favorite = ? WHERE device_id = ? AND id = ?')
      .run(favorite ? 1 : 0, deviceId, id);
    return info.changes > 0;
  }

  remove(deviceId: string, id: string): boolean {
    return this.db.prepare('DELETE FROM scans WHERE device_id = ? AND id = ?').run(deviceId, id).changes > 0;
  }

  /** Simple aggregate for the profile screen. */
  stats(deviceId: string): { total: number; green: number; yellow: number; red: number; averageScore: number } {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS total,
                SUM(light = 'green') AS green,
                SUM(light = 'yellow') AS yellow,
                SUM(light = 'red') AS red,
                COALESCE(AVG(score), 0) AS averageScore
         FROM scans WHERE device_id = ?`,
      )
      .get(deviceId) as Record<string, number>;
    return {
      total: row.total ?? 0,
      green: row.green ?? 0,
      yellow: row.yellow ?? 0,
      red: row.red ?? 0,
      averageScore: Math.round(row.averageScore ?? 0),
    };
  }
}

/** Caches Open Food Facts responses so a re-scan does not hit the network. */
export class OffCacheRepository {
  constructor(private readonly db: Db, private readonly ttlMs = 7 * 24 * 60 * 60 * 1000) {}

  get(barcode: string): OffProduct | null {
    const row = this.db.prepare('SELECT fetched_at, payload FROM off_cache WHERE barcode = ?').get(barcode) as
      | { fetched_at: string; payload: string }
      | undefined;
    if (!row) return null;
    if (Date.now() - Date.parse(row.fetched_at) > this.ttlMs) return null;
    return JSON.parse(row.payload) as OffProduct;
  }

  put(barcode: string, data: OffProduct): void {
    this.db
      .prepare(
        `INSERT INTO off_cache (barcode, fetched_at, payload) VALUES (?, ?, ?)
         ON CONFLICT(barcode) DO UPDATE SET fetched_at = excluded.fetched_at, payload = excluded.payload`,
      )
      .run(barcode, new Date().toISOString(), JSON.stringify(data));
  }
}
