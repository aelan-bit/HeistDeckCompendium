/**
 * pack.mjs
 *
 * Compiles packs/src/<name>/*.json → packs/<name>/ (LevelDB) using the same
 * classic-level library that Foundry uses internally. Replaces the broken
 * `fvtt package pack` CLI which requires a persistent workon session.
 *
 * Key format mirrors Foundry's own compendium storage:
 *   Top-level document : !{collection}!{_id}
 *   Embedded result    : !tables.results!{tableId}.{resultId}
 *
 * Run: node scripts/pack.mjs
 */

import { ClassicLevel } from "classic-level";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const PACKS = [
  { name: "people",       collection: "actors" },
  { name: "treasures",    collection: "items"  },
  { name: "obstacles",    collection: "items"  },
  { name: "heist-tables", collection: "tables" },
];

async function packOne({ name, collection }) {
  const srcDir = path.join(ROOT, "packs", "src", name);
  const outDir = path.join(ROOT, "packs", name);

  fs.mkdirSync(outDir, { recursive: true });
  const db = new ClassicLevel(outDir, { keyEncoding: "utf8", valueEncoding: "json" });
  const batch = db.batch();

  for (const file of fs.readdirSync(srcDir)) {
    if (!file.endsWith(".json")) continue;
    const doc = JSON.parse(fs.readFileSync(path.join(srcDir, file), "utf8"));
    const { _id } = doc;

    if (collection === "tables" && Array.isArray(doc.results)) {
      // Store each result as its own LevelDB entry
      const resultIds = [];
      for (const result of doc.results) {
        resultIds.push(result._id);
        batch.put(`!tables.results!${_id}.${result._id}`, result);
      }
      // Store the table with results replaced by an array of IDs
      batch.put(`!${collection}!${_id}`, { ...doc, results: resultIds });
    } else {
      batch.put(`!${collection}!${_id}`, doc);
    }

    console.log(`  packed ${doc.name}`);
  }

  await batch.write();
  await db.close();
  console.log(`✓ ${name} (${collection})`);
}

for (const pack of PACKS) {
  console.log(`\nPacking ${pack.name}...`);
  await packOne(pack);
}

console.log("\nAll packs compiled.");
