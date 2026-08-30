/**
 * Validates the shipped data files.
 *
 * The loader already enforces the schema and source references; this script
 * adds the editorial rules that keep the database useful rather than merely
 * well-formed, and prints a summary so a data PR is easy to review.
 */
import { loadAdditiveDatabase } from '../src/domain/additives/database';
import { loadWholeFoods } from '../src/domain/wholeFoods';
import { dataDir } from '../src/util/paths';

const MIN_SUMMARY_LENGTH = 20;
const MIN_DETAIL_LENGTH = 60;

function main(): void {
  const problems: string[] = [];
  const db = loadAdditiveDatabase(dataDir());

  for (const additive of db.all) {
    const where = `${additive.code}`;

    for (const locale of ['ru', 'en'] as const) {
      if (additive.summary[locale].length < MIN_SUMMARY_LENGTH) {
        problems.push(`${where}: ${locale} summary is too short to be useful`);
      }
      if (additive.detail[locale].length < MIN_DETAIL_LENGTH) {
        problems.push(`${where}: ${locale} detail is too short to explain anything`);
      }
    }

    if (additive.sources.length === 0) {
      problems.push(`${where}: has no sources`);
    }
    if (additive.synonyms.length === 0) {
      problems.push(`${where}: has no synonyms, so it can only be matched by its code`);
    }
    // A high-risk claim without a concern tag cannot drive any advice.
    if (additive.risk === 'high' && additive.concerns.length === 0) {
      problems.push(`${where}: marked high risk but carries no concern tags`);
    }
  }

  for (const food of loadWholeFoods(dataDir())) {
    if (!food.nutriments.energyKcal) problems.push(`${food.id}: missing energy`);
    if (food.note.ru.length < 20 || food.note.en.length < 20) {
      problems.push(`${food.id}: note is too short`);
    }
  }

  const byRisk = db.all.reduce<Record<string, number>>((acc, additive) => {
    acc[additive.risk] = (acc[additive.risk] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`additives:      ${db.all.length}`);
  console.log(`by risk:        ${JSON.stringify(byRisk)}`);
  console.log(`synonym keys:   ${db.bySynonym.size}`);
  console.log(`references:     ${Object.keys(db.references).length}`);
  console.log(`whole foods:    ${loadWholeFoods(dataDir()).length}`);

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log('\nAll data files are valid.');
}

main();
