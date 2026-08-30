import type { Additive } from './../types';
import { normalize } from '../text';

export interface Reference {
  title: string;
  url: string;
}

/** One group file from `data/additives/`. */
export interface AdditiveGroup {
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
  /** Data revision, echoed to clients so they know when to refresh. */
  version: string;
}

const REQUIRED_FIELDS: Array<keyof Additive> = [
  'code', 'names', 'category', 'risk', 'summary', 'detail',
  'concerns', 'origin', 'restrictedIn', 'synonyms', 'sources',
];

function validate(additive: Additive, origin: string): void {
  for (const field of REQUIRED_FIELDS) {
    if (additive[field] === undefined || additive[field] === null) {
      throw new Error(`${origin}: additive ${additive.code ?? '<no code>'} is missing "${field}"`);
    }
  }
  if (!/^E\d{3,4}[a-z]{0,2}\d?$/.test(additive.code)) {
    throw new Error(`${origin}: "${additive.code}" is not a canonical E-code`);
  }
  if (!additive.names.ru || !additive.names.en) {
    throw new Error(`${origin}: ${additive.code} must have both ru and en names`);
  }
}

/**
 * Indexes the additive data.
 *
 * Deliberately free of any file access: the same function builds the database
 * from files on the server and from a cached bundle inside the mobile app.
 *
 * Synonyms are indexed in normalised form, and the code itself plus its
 * Cyrillic-Е spelling are registered as synonyms so a bare code inside a
 * sentence still resolves.
 */
export function buildAdditiveDatabase(
  groups: AdditiveGroup[],
  references: Record<string, Reference>,
  version = 'unknown',
): AdditiveDatabase {
  const byCode = new Map<string, Additive>();
  const bySynonym = new Map<string, Additive>();

  if (groups.length === 0) throw new Error('no additive groups supplied');

  for (const group of groups) {
    for (const additive of group.additives) {
      validate(additive, group.group);
      if (byCode.has(additive.code)) {
        throw new Error(`${group.group}: duplicate additive ${additive.code}`);
      }
      byCode.set(additive.code, additive);

      const keys = new Set<string>([
        additive.code.toLowerCase(),
        additive.code.toLowerCase().replace(/^e/, 'е'), // Cyrillic е variant
        ...additive.synonyms,
        additive.names.ru,
        additive.names.en,
      ]);
      for (const key of keys) {
        const normalized = normalize(key);
        if (!normalized) continue;
        // First writer wins: groups are supplied in a stable order, so a
        // synonym shared by two additives keeps deterministic ownership.
        if (!bySynonym.has(normalized)) bySynonym.set(normalized, additive);
      }
    }
  }

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

  return { byCode, bySynonym, synonymIndex, references, all: [...byCode.values()], version };
}
