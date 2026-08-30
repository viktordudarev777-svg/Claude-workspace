/**
 * Bakes the reference data into the app bundle.
 *
 * The app has to work on first launch with no connection, before it has ever
 * reached the server, so a snapshot ships inside the binary. Once online it
 * refreshes from GET /api/v1/bundle and caches the newer copy.
 *
 * Run via `npm run build:snapshot`; the output is committed so a fresh clone
 * builds without a preliminary step.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadRawData } from '@foodlens/data';

const OUTPUT = path.resolve(__dirname, '../src/data/snapshot.json');

function main(): void {
  const data = loadRawData();
  const snapshot = {
    version: data.version,
    references: data.references,
    groups: data.groups,
    wholeFoods: data.wholeFoods,
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(snapshot));

  const additives = data.groups.reduce((total, group) => total + group.additives.length, 0);
  const sizeKb = Math.round(fs.statSync(OUTPUT).size / 1024);
  console.log(`snapshot ${data.version}: ${additives} additives, ${data.wholeFoods.length} foods, ${sizeKb} KB`);
}

main();
