/**
 * generate-sources.mjs
 *
 * Reads the three Heist Deck table JSON files from the parent directory and
 * writes individual Foundry VTT document source files into packs/src/.
 *
 * Output:
 *   packs/src/people/        → 40 Actor JSON files (type: "npc")
 *   packs/src/treasures/     → 40 Item JSON files  (type: "item")
 *   packs/src/obstacles/     → 50 Item JSON files  (type: "item")
 *   packs/src/heist-tables/  → 3 RollTable JSON files with pack result references
 *
 * Run: node scripts/generate-sources.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PARENT = path.resolve(ROOT, '..');
const SRC = path.join(ROOT, 'packs', 'src');
const MODULE_ID = 'heist-deck-compendium';

// ---------------------------------------------------------------------------
// ID generation — stable 16-char alphanumeric derived from a seed string
// ---------------------------------------------------------------------------
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function stableId(seed) {
  // Simple deterministic hash → 16-char ID so UUIDs are reproducible across runs
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i);
    h = h >>> 0;
  }
  let id = '';
  let val = h;
  for (let i = 0; i < 16; i++) {
    // Mix in position to avoid repeating characters
    val = ((val * 1664525 + 1013904223) + i * 31337) >>> 0;
    id += CHARS[val % CHARS.length];
  }
  return id;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readTable(filename) {
  const p = path.join(PARENT, filename);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeDoc(dir, filename, doc) {
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(doc, null, 2));
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_').replace(/_+/g, '_').toLowerCase();
}

// ---------------------------------------------------------------------------
// People → Actors (type: "npc")
// ---------------------------------------------------------------------------
function generatePeople(results) {
  const dir = path.join(SRC, 'people');
  ensureDir(dir);
  const ids = {};

  for (const r of results) {
    const id = stableId('people:' + r.name);
    ids[r.name] = id;
    const doc = {
      _id: id,
      name: r.name,
      type: 'npc',
      img: 'icons/svg/mystery-man.svg',
      system: {
        notes: r.description ?? ''
      },
      ownership: { default: 0 },
      flags: { 'heist-deck': { category: r.flags?.['heist-deck']?.category ?? '' } }
    };
    writeDoc(dir, safeName(r.name) + '.json', doc);
  }

  console.log(`  ✓ People: ${results.length} Actor files`);
  return ids;
}

// ---------------------------------------------------------------------------
// Treasures → Items (type: "item")
// ---------------------------------------------------------------------------
function generateItems(results, packKey, dirName) {
  const dir = path.join(SRC, dirName);
  ensureDir(dir);
  const ids = {};

  for (const r of results) {
    const id = stableId(packKey + ':' + r.name);
    ids[r.name] = id;
    const doc = {
      _id: id,
      name: r.name,
      type: 'item',
      img: dirName === 'treasures' ? 'icons/svg/item-bag.svg' : 'icons/svg/shield.svg',
      system: {
        description: r.description ?? ''
      },
      ownership: { default: 0 },
      flags: { 'heist-deck': { category: r.flags?.['heist-deck']?.category ?? '' } }
    };
    writeDoc(dir, safeName(r.name) + '.json', doc);
  }

  console.log(`  ✓ ${dirName}: ${results.length} Item files`);
  return ids;
}

// ---------------------------------------------------------------------------
// RollTables → heist-tables pack (results reference compendium docs)
// ---------------------------------------------------------------------------
function generateTables(tables) {
  const dir = path.join(SRC, 'heist-tables');
  ensureDir(dir);

  for (const { tableData, packName, docIds, formula, description } of tables) {
    const tableId = stableId('table:' + tableData.name);
    const results = tableData.results.map((r, i) => ({
      _id: stableId(`result:${tableData.name}:${i}`),
      type: 'pack',
      collection: `${MODULE_ID}.${packName}`,
      resultId: docIds[r.name],
      weight: 1,
      range: r.range,
      drawn: false,
      flags: {},
      // Keep name so there's a fallback label in the UI
      text: r.name,
      img: r.img ?? 'icons/svg/d20-black.svg'
    }));

    const doc = {
      _id: tableId,
      name: tableData.name,
      description: description,
      formula: formula,
      replacement: true,
      displayRoll: true,
      results,
      ownership: { default: 0 },
      flags: {}
    };

    writeDoc(dir, safeName(tableData.name) + '.json', doc);
  }

  console.log(`  ✓ heist-tables: ${tables.length} RollTable files`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log('Reading source tables from parent directory...');
const peopleTable    = readTable('people-table.json');
const treasuresTable = readTable('treasures-table.json');
const obstaclesTable = readTable('obstacles-table.json');

console.log('Generating source documents...');

const peopleIds    = generatePeople(peopleTable.results);
const treasureIds  = generateItems(treasuresTable.results, 'treasures', 'treasures');
const obstacleIds  = generateItems(obstaclesTable.results, 'obstacles', 'obstacles');

generateTables([
  {
    tableData: peopleTable,
    packName: 'people',
    docIds: peopleIds,
    formula: '1d40',
    description: 'One will be hiring the crew, and the other will be the target. Draw 2 during heist planning.'
  },
  {
    tableData: treasuresTable,
    packName: 'treasures',
    docIds: treasureIds,
    formula: '1d40',
    description: 'This treasure is what is motivating the heist. Draw 1 during heist planning.'
  },
  {
    tableData: obstaclesTable,
    packName: 'obstacles',
    docIds: obstacleIds,
    formula: '1d50',
    description: 'Special obstacles defending the site of the heist. Draw 3 or so during heist planning.'
  }
]);

console.log('\nDone. Source files written to packs/src/');
console.log('Next: npm run compile');
