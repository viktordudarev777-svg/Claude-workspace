import fs from 'node:fs';
import path from 'node:path';

/**
 * Path resolution that works from `src` under tsx/vitest and from `dist` after
 * a build. `typeof __dirname` is guarded because the test runner transpiles to
 * ESM, where it does not exist.
 */
function currentDir(): string {
  return typeof __dirname === 'string' ? __dirname : process.cwd();
}

/** The backend package root — the nearest ancestor holding a package.json. */
export function packageRoot(): string {
  let dir = currentDir();
  for (let depth = 0; depth < 8; depth++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/** Where `additives/`, `references.json` and `whole-foods.json` live. */
export function dataDir(): string {
  const override = process.env.FOODLENS_DATA_DIR;
  return override ? path.resolve(override) : path.join(packageRoot(), 'data');
}
