import fs from 'node:fs';
import path from 'node:path';
import {
  buildAdditiveDatabase,
  type AdditiveDatabase,
  type AdditiveGroup,
  type Reference,
  type WholeFood,
} from '@foodlens/engine';

/**
 * FoodLens reference data.
 *
 * This package owns the JSON files and the only filesystem access in the
 * system. The engine itself is pure, which is what lets the mobile app build
 * the very same database from a cached bundle instead of from disk.
 */

/** Locates `data/`, whether running from `src` under tsx or from `dist`. */
export function dataDir(): string {
  const override = process.env.FOODLENS_DATA_DIR;
  if (override) return path.resolve(override);

  let dir = __dirname;
  for (let depth = 0; depth < 5; depth++) {
    const candidate = path.join(dir, 'data');
    if (fs.existsSync(path.join(candidate, 'references.json'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('FoodLens data directory not found; set FOODLENS_DATA_DIR');
}

/** Reads every group file in `data/additives/` and indexes them via the engine. */
export function loadAdditiveDatabase(dir = dataDir()): AdditiveDatabase {
  const additivesDir = path.join(dir, 'additives');
  const files = fs.readdirSync(additivesDir).filter((file) => file.endsWith('.json')).sort();
  if (files.length === 0) throw new Error(`no additive data files found in ${additivesDir}`);

  const groups: AdditiveGroup[] = files.map(
    (file) => JSON.parse(fs.readFileSync(path.join(additivesDir, file), 'utf8')) as AdditiveGroup,
  );
  const references = JSON.parse(
    fs.readFileSync(path.join(dir, 'references.json'), 'utf8'),
  ) as Record<string, Reference>;

  return buildAdditiveDatabase(groups, references, dataVersion(dir));
}

export function loadWholeFoods(dir = dataDir()): WholeFood[] {
  const raw = fs.readFileSync(path.join(dir, 'whole-foods.json'), 'utf8');
  return (JSON.parse(raw) as { foods: WholeFood[] }).foods;
}

/** The raw group files and references, for serving a bundle to the app. */
export function loadRawData(dir = dataDir()): {
  version: string;
  groups: AdditiveGroup[];
  references: Record<string, Reference>;
  wholeFoods: WholeFood[];
} {
  const additivesDir = path.join(dir, 'additives');
  const groups = fs
    .readdirSync(additivesDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => JSON.parse(fs.readFileSync(path.join(additivesDir, file), 'utf8')) as AdditiveGroup);

  return {
    version: dataVersion(dir),
    groups,
    references: JSON.parse(fs.readFileSync(path.join(dir, 'references.json'), 'utf8')) as Record<string, Reference>,
    wholeFoods: loadWholeFoods(dir),
  };
}

/**
 * A content-derived version string.
 *
 * The mobile app compares it against its cached copy to decide whether to pull
 * a fresh bundle, so it has to change whenever any data file does.
 */
export function dataVersion(dir = dataDir()): string {
  const additivesDir = path.join(dir, 'additives');
  const files = [
    path.join(dir, 'references.json'),
    path.join(dir, 'whole-foods.json'),
    ...fs.readdirSync(additivesDir).map((file) => path.join(additivesDir, file)),
  ];
  let latest = 0;
  let size = 0;
  for (const file of files) {
    const stat = fs.statSync(file);
    latest = Math.max(latest, stat.mtimeMs);
    size += stat.size;
  }
  return `${new Date(latest).toISOString().slice(0, 10)}-${size}`;
}

let cachedDatabase: AdditiveDatabase | null = null;
let cachedFoods: WholeFood[] | null = null;

/** Process-wide singletons; the data is read-only, so one copy is enough. */
export function getAdditiveDatabase(dir?: string): AdditiveDatabase {
  if (!cachedDatabase) cachedDatabase = loadAdditiveDatabase(dir);
  return cachedDatabase;
}

export function getWholeFoods(dir?: string): WholeFood[] {
  if (!cachedFoods) cachedFoods = loadWholeFoods(dir);
  return cachedFoods;
}

/** Test seam: drops the cached instances. */
export function resetDataCache(): void {
  cachedDatabase = null;
  cachedFoods = null;
}
