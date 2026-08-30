/**
 * Database schema.
 *
 * Kept as a TypeScript constant rather than a .sql file so it survives the
 * build without a copy step, and so the statements are applied in a defined
 * order on every start (they are all idempotent).
 */
export const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS devices (
  id           TEXT PRIMARY KEY,
  created_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  locale       TEXT NOT NULL DEFAULT 'ru'
);

CREATE TABLE IF NOT EXISTS scans (
  id          TEXT PRIMARY KEY,
  device_id   TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  scanned_at  TEXT NOT NULL,
  source      TEXT NOT NULL,
  barcode     TEXT,
  name        TEXT,
  brand       TEXT,
  image_url   TEXT,
  light       TEXT NOT NULL,
  score       INTEGER NOT NULL,
  favorite    INTEGER NOT NULL DEFAULT 0,
  -- Full AnalysisResult, so history opens instantly and works offline.
  payload     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scans_device_time ON scans (device_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_barcode ON scans (barcode);

-- Cache of Open Food Facts lookups: the API is rate limited and a scanned
-- barcode is very likely to be scanned again.
CREATE TABLE IF NOT EXISTS off_cache (
  barcode    TEXT PRIMARY KEY,
  fetched_at TEXT NOT NULL,
  payload    TEXT NOT NULL
);
`;
