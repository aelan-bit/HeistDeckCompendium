/**
 * generate-sources.mjs
 *
 * Reads structured source data from data/*.json and produces:
 *   packs/src/people/        → 40 Actor JSON files (type: "npc")
 *   packs/src/treasures/     → 40 Item JSON files  (type: "item")
 *   packs/src/obstacles/     → 50 Item JSON files  (type: "item")
 *   packs/src/heist-tables/  → 3 RollTable JSON files with pack result references
 *   ../people-table.json     → legacy Foundry RollTable import format
 *   ../treasures-table.json  → legacy Foundry RollTable import format
 *   ../obstacles-table.json  → legacy Foundry RollTable import format
 *
 * Run: node scripts/generate-sources.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT   = path.resolve(__dirname, '..');
const PARENT = path.resolve(ROOT, '..');
const DATA   = path.join(ROOT, 'data');
const SRC    = path.join(ROOT, 'packs', 'src');
const MODULE_ID = 'heist-deck-compendium';

// ---------------------------------------------------------------------------
// Stable ID generation — deterministic 16-char alphanumeric from a seed string
// ---------------------------------------------------------------------------
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function stableId(seed) {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i);
    h = h >>> 0;
  }
  let id = '';
  let val = h;
  for (let i = 0; i < 16; i++) {
    val = ((val * 1664525 + 1013904223) + i * 31337) >>> 0;
    id += CHARS[val % CHARS.length];
  }
  return id;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readData(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA, filename), 'utf8'));
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
// HTML reconstruction
// ---------------------------------------------------------------------------
function buildPersonHtml(r) {
  return [
    `<p><strong>${r.category}</strong></p>`,
    `<p>${r.description}</p>`,
    `<p><em>${r.questions}</em></p>`,
  ].join('');
}

function buildObstacleHtml(r) {
  const dangerLines = r.dangers.map(d => `<p>${d}</p>`).join('');
  const remedyLines = r.remedies.map(rem => `<p>${rem}</p>`).join('');
  return [
    `<p><strong>${r.category}</strong></p>`,
    `<p>${r.description}</p>`,
    `<p><em>${r.questions}</em></p>`,
    `<p><strong>Dangers</strong></p>`,
    dangerLines,
    `<p><strong>Remedies</strong></p>`,
    remedyLines,
  ].join('');
}

// ---------------------------------------------------------------------------
// People → Actors (type: "npc")
// ---------------------------------------------------------------------------
function generatePeople(entries) {
  const dir = path.join(SRC, 'people');
  ensureDir(dir);
  const ids = {};

  for (const r of entries) {
    const id = stableId('people:' + r.name);
    ids[r.name] = id;
    const [shortDesc, crewType = ''] = r.category.split(',').map(s => s.trim());
    const doc = {
      _id: id,
      name: r.name,
      type: 'npc',
      img: 'icons/svg/mystery-man.svg',
      system: {
        description_short: shortDesc,
        associated_crew_type: crewType,
        description: `${r.description}\n\n${r.questions}`,
      },
      ownership: { default: 0 },
      flags: { 'heist-deck': { category: r.category } },
    };
    writeDoc(dir, safeName(r.name) + '.json', doc);
  }

  console.log(`  ✓ People: ${entries.length} Actor files`);
  return ids;
}

// ---------------------------------------------------------------------------
// Items (treasures + obstacles)
// ---------------------------------------------------------------------------
function buildTreasureSystem(r) {
  return {
    class: r.category,
    description: r.description,
    additional_info: r.questions,
  };
}

function buildObstacleSystem(r) {
  return {
    class: r.category,
    description: r.description,
    additional_info: [
      r.questions,
      '',
      'Dangers:',
      ...r.dangers.map(d => `• ${d}`),
      '',
      'Remedies:',
      ...r.remedies.map(rem => `• ${rem}`),
    ].join('\n'),
  };
}

function generateItems(entries, packKey, dirName, buildSystem) {
  const dir = path.join(SRC, dirName);
  ensureDir(dir);
  const ids = {};
  const img = dirName === 'treasures' ? 'icons/svg/item-bag.svg' : 'icons/svg/shield.svg';

  for (const r of entries) {
    const id = stableId(packKey + ':' + r.name);
    ids[r.name] = id;
    const doc = {
      _id: id,
      name: r.name,
      type: 'item',
      img,
      system: buildSystem(r),
      ownership: { default: 0 },
      flags: { 'heist-deck': { category: r.category } },
    };
    writeDoc(dir, safeName(r.name) + '.json', doc);
  }

  console.log(`  ✓ ${dirName}: ${entries.length} Item files`);
  return ids;
}

// ---------------------------------------------------------------------------
// RollTables — both compendium-linked (packs/src) and legacy (*-table.json)
// ---------------------------------------------------------------------------
function generateTables(tableDefs) {
  const tablesDir = path.join(SRC, 'heist-tables');
  ensureDir(tablesDir);

  for (const { entries, ids, packName, meta, buildHtml } of tableDefs) {
    const tableId = stableId('table:' + meta.name);

    // Compendium-linked table (references Actor/Item docs by UUID)
    const linkedResults = entries.map((r, i) => ({
      _id: stableId(`result:${meta.name}:${i}`),
      type: 'pack',
      collection: `${MODULE_ID}.${packName}`,
      resultId: ids[r.name],
      weight: 1,
      range: [i + 1, i + 1],
      drawn: false,
      flags: {},
      text: r.name,
      img: 'icons/svg/d20-black.svg',
    }));

    writeDoc(tablesDir, safeName(meta.name) + '.json', {
      _id: tableId,
      name: meta.name,
      description: meta.description,
      formula: meta.formula,
      replacement: true,
      displayRoll: true,
      results: linkedResults,
      ownership: { default: 0 },
      flags: {},
    });

    // Legacy text-based table for direct Foundry RollTable import
    const legacyResults = entries.map((r, i) => ({
      type: 'text',
      weight: 1,
      range: [i + 1, i + 1],
      name: r.name,
      img: 'icons/svg/d20-black.svg',
      description: buildHtml(r),
      drawn: false,
      flags: {},
      documentUuid: null,
    }));

    const legacyTable = {
      name: meta.name,
      img: meta.img,
      description: meta.description,
      formula: meta.formula,
      replacement: true,
      displayRoll: true,
      folder: null,
      flags: {},
      ownership: { default: 0 },
      results: legacyResults,
    };

    fs.writeFileSync(
      path.join(PARENT, packName + '-table.json'),
      JSON.stringify(legacyTable, null, 2),
    );
  }

  console.log(`  ✓ heist-tables: ${tableDefs.length} RollTable files`);
  console.log(`  ✓ legacy *-table.json files written to parent directory`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log('Reading structured source data from data/...');
const peopleEntries   = readData('people.json');
const treasureEntries = readData('treasures.json');
const obstacleEntries = readData('obstacles.json');

console.log('Generating Foundry source documents...');
const peopleIds   = generatePeople(peopleEntries);
const treasureIds = generateItems(treasureEntries, 'treasures', 'treasures', buildTreasureSystem);
const obstacleIds = generateItems(obstacleEntries, 'obstacles', 'obstacles', buildObstacleSystem);

generateTables([
  {
    entries: peopleEntries,
    ids: peopleIds,
    packName: 'people',
    buildHtml: buildPersonHtml,
    meta: {
      name: 'People',
      img: 'icons/svg/d20-grey.svg',
      description: 'One will be hiring the crew, and the other will be the target. Draw 2 during heist planning.',
      formula: '1d40',
    },
  },
  {
    entries: treasureEntries,
    ids: treasureIds,
    packName: 'treasures',
    buildHtml: buildPersonHtml,
    meta: {
      name: 'Treasures',
      img: 'icons/svg/d20-grey.svg',
      description: 'This treasure is what is motivating the heist. Draw 1 during heist planning.',
      formula: '1d40',
    },
  },
  {
    entries: obstacleEntries,
    ids: obstacleIds,
    packName: 'obstacles',
    buildHtml: buildObstacleHtml,
    meta: {
      name: 'Obstacles',
      img: 'icons/svg/d20-grey.svg',
      description: 'Special obstacles defending the site of the heist. Draw 3 or so during heist planning.',
      formula: '1d50',
    },
  },
]);

console.log('\nDone. Run npm run compile to pack into LevelDB.');
