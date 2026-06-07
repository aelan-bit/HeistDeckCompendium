/**
 * migrate-to-structured.mjs — ONE-TIME migration script
 *
 * Converts the existing HTML-blob source files into clean structured JSON:
 *   data/people.json    — 40 entries
 *   data/treasures.json — 40 entries
 *   data/obstacles.json — 50 entries
 *
 * Run once: node scripts/migrate-to-structured.mjs
 * After running, edit data/*.json directly. Do not run again.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT   = path.resolve(__dirname, '..');
const PARENT = path.resolve(ROOT, '..');
const DATA   = path.join(ROOT, 'data');

fs.mkdirSync(DATA, { recursive: true });

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '').trim();
}

function parseTwoParagraphs(html) {
  const matches = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)];
  return matches.map(m => stripTags(m[1]).trim()).filter(Boolean);
}

// Parse a people/treasure HTML description into structured fields.
// Expected format: <p><strong>CATEGORY</strong></p><p>DESCRIPTION</p><p><em>QUESTIONS</em></p>
function parsePersonOrTreasure(html) {
  const catMatch = html.match(/<p><strong>([\s\S]*?)<\/strong><\/p>/);
  const emMatch  = html.match(/<em>([\s\S]*?)<\/em>/);

  const category  = catMatch ? stripTags(catMatch[1]) : '';
  const questions = emMatch  ? stripTags(emMatch[1])  : '';

  // Description is what remains after removing the category paragraph and questions paragraph
  let body = html;
  if (catMatch) body = body.replace(catMatch[0], '');
  body = body.replace(/<p><em>[\s\S]*?<\/em><\/p>/, '');
  // Strip remaining <p> tags and trim
  body = body.replace(/<\/?p>/g, ' ').replace(/\s+/g, ' ').trim();

  return { category, description: body, questions };
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------
console.log('Migrating people...');
const peopleTable = JSON.parse(fs.readFileSync(path.join(PARENT, 'people-table.json'), 'utf8'));
const people = peopleTable.results.map(r => {
  const { category, description, questions } = parsePersonOrTreasure(r.description);
  if (!category) console.warn(`  WARN: no category found for "${r.name}"`);
  return { name: r.name, category, description, questions };
});
fs.writeFileSync(path.join(DATA, 'people.json'), JSON.stringify(people, null, 2));
console.log(`  ✓ ${people.length} people written`);

// ---------------------------------------------------------------------------
// Treasures
// ---------------------------------------------------------------------------
console.log('Migrating treasures...');
const treasuresTable = JSON.parse(fs.readFileSync(path.join(PARENT, 'treasures-table.json'), 'utf8'));
const treasures = treasuresTable.results.map(r => {
  const { category, description, questions } = parsePersonOrTreasure(r.description);
  if (!category) console.warn(`  WARN: no category found for "${r.name}"`);
  return { name: r.name, category, description, questions };
});
fs.writeFileSync(path.join(DATA, 'treasures.json'), JSON.stringify(treasures, null, 2));
console.log(`  ✓ ${treasures.length} treasures written`);

// ---------------------------------------------------------------------------
// Obstacles — merge fronts + dangers + remedies, ordered by table
// ---------------------------------------------------------------------------
console.log('Migrating obstacles...');
const obstaclesTable  = JSON.parse(fs.readFileSync(path.join(PARENT, 'obstacles-table.json'),  'utf8'));
const obstaclesFronts = JSON.parse(fs.readFileSync(path.join(PARENT, 'obstacles-fronts.json'), 'utf8'));
const obstaclesDangers  = JSON.parse(fs.readFileSync(path.join(PARENT, 'obstacles-dangers.json'),  'utf8'));
const obstaclesRemedies = JSON.parse(fs.readFileSync(path.join(PARENT, 'obstacles-remedies.json'), 'utf8'));

const obstacles = obstaclesTable.results.map(r => {
  const name   = r.name;
  const front  = obstaclesFronts[name];
  const dHtml  = obstaclesDangers[name];
  const remHtml = obstaclesRemedies[name];

  if (!front)   console.warn(`  WARN: no front data for "${name}"`);
  if (!dHtml)   console.warn(`  WARN: no dangers for "${name}"`);
  if (!remHtml) console.warn(`  WARN: no remedies for "${name}"`);

  const dangers  = dHtml   ? parseTwoParagraphs(dHtml)   : [];
  const remedies = remHtml ? parseTwoParagraphs(remHtml) : [];

  return {
    name,
    category:    front?.category    ?? '',
    description: front?.description ?? '',
    questions:   front?.questions   ?? '',
    dangers,
    remedies,
  };
});
fs.writeFileSync(path.join(DATA, 'obstacles.json'), JSON.stringify(obstacles, null, 2));
console.log(`  ✓ ${obstacles.length} obstacles written`);

console.log('\nDone. Review data/*.json before proceeding.');
