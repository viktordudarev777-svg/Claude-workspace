import fs from 'node:fs';
import path from 'node:path';
import type { Additive } from '../types';
import { normalize } from '../../util/text';
import { dataDir as defaultDataDir } from '../../util/paths';

export interface Reference {
  title: string;
  url: string;
}

interface GroupFile {
  group: string;
  additives: Additive[];
}

export interface AdditiveDatabase {
  /** Lookup by canonical code, e.g. `E621`. */
  byCode: ReadonlyMap<string, Additive>;
  /** Lookup by normalised synonym, e.g. `глутамат натрия`. */
  bySynonym: ReadonlyMap<string, Additive>;
  /** Synonyms long enough to be worth fuzzy matching, sorted longest first. */
  synonymIndex: ReadonlyArray<{ key: string; additive: Additive }>;
  references: Readonly<Record<string, Reference>>;
  all: readonly Additive[];
}

const REQUIRED_FIELDS: Array<keyof Additive> = [
  'code', 'names', 'category', 'risk', 'summary', 'detail',
  'concerns', 'origin', 'restrictedIn', 'synonyms', 'sources',
];

function validate(additive: Additive, file: string): void {
  for (const field of REQUIRED_FIELDS) {
    if (additive[field] === undefined || additive[field] === null) {
      throw new Error(`${file}: additive ${additive.code ?? '<no code>'} is missing "${field}"`);
    }
  }
  if (!/^E\d{3,4}[a-z]{0,2}\d?$/.test(additive.code)) {
    throw new Error(`${file}: "${additive.code}" is not a canonical E-code`);
  }
  if (!additive.names.ru || !additive.names.en) {
    throw new Error(`${file}: ${additive.code} must have both ru and en names`);
  }
}

/**
 * Loads every `*.json` group file in `dataDir` into a single indexed database.
 *
 * Synonyms are indexed in normalised, homoglyph-folded form, and the code
 * itself plus a few spelling variants ("е621", "e-621") are registered as
 * synonyms so a bare code inside a sentence still resolves.
 */
export function loadAdditiveDatabase(dataDir: string): AdditiveDatabase {
  const byCode = new Map<string, Additive>();
  const bySynonym = new Map<string, Additive>();
  const additivesDir = path.join(dataDir, 'additives');

  const files = fs.readdirSync(additivesDir).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) throw new Error(`no additive data files found in ${additivesDir}`);

  for (const file of files) {
    const parsed = JSON.parse(fs.readFileSync(path.join(additivesDir, file), 'utf8')) as GroupFile;
    for (const additive of parsed.additives) {
      validate(additive, file);
      if (byCode.has(additive.code)) {
        throw new Error(`${file}: duplicate additive ${additive.code}`);
      }
      byCode.set(additive.code, additive);

      const keys = new Set<string>([
        additive.code.toLowerCase(),
        `${additive.code.toLowerCase()} `.trim().replace(/^e/, 'е'), // Cyrillic е variant
        ...additive.synonyms,
        additive.names.ru,
        additive.names.en,
      ]);
      for (const key of keys) {
        const normalized = normalize(key);
        if (!normalized) continue;
        // First writer wins: group files are loaded in a stable order, so a
        // synonym shared by two additives keeps deterministic ownership.
        if (!bySynonym.has(normalized)) bySynonym.set(normalized, additive);
      }
    }
  }

  const referencesPath = path.join(dataDir, 'references.json');
  const references = JSON.parse(fs.readFileSync(referencesPath, 'utf8')) as Record<string, Reference>;

  for (const additive of byCode.values()) {
    for (const source of additive.sources) {
      if (!references[source]) {
        throw new Error(`additive ${additive.code} cites unknown reference "${source}"`);
      }
    }
  }

  const synonymIndex = [...bySynonym.entries()]
    .filter(([key]) => key.length >= 5)
    .map(([key, additive]) => ({ key, additive }))
    .sort((a, b) => b.key.length - a.key.length);

  return { byCode, bySynonym, synonymIndex, references, all: [...byCode.values()] };
}

let cached: AdditiveDatabase | null = null;

/** Process-wide singleton; the data is read-only, so one copy is enough. */
export function getAdditiveDatabase(dataDir = defaultDataDir()): AdditiveDatabase {
  if (!cached) cached = loadAdditiveDatabase(dataDir);
  return cached;
}

/** Test seam: drops the cached instance. */
export function resetAdditiveDatabase(): void {
  cached = null;
}
