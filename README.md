# Duskwall Heist Deck — Foundry VTT Module

A Foundry VTT module converting the [Duskwall Heist Deck](https://www.drivethrurpg.com/product/209803/) (a print-and-play card deck for Blades in the Dark) into linked compendium packs and rollable tables.

## Contents

| Pack | Type | Count |
|------|------|-------|
| Heist Deck — People | Actors (NPC) | 40 |
| Heist Deck — Treasures | Items | 40 |
| Heist Deck — Obstacles | Items | 50 |
| Heist Deck — Tables | RollTables | 3 |

## Usage

During heist planning, open the **Heist Deck — Tables** compendium and draw from:
- **Obstacles** (draw 3) — special defenses protecting the target site
- **Treasures** (draw 1) — what motivates the heist
- **People** (draw 2) — one hires the crew, one is the target

Each result links to its full compendium entry with prompts, dangers, and remedies.

## Installation

Paste the manifest URL into Foundry's module installer:

```
https://github.com/aelan-bit/HeistDeckCompendium/releases/latest/download/module.json
```

## Building from Source

Requires Node.js.

```bash
npm install
npm run generate   # convert table JSONs → individual source docs
npm run compile    # compile source docs → LevelDB packs
```

The source JSON files live in `packs/src/`. Compiled LevelDB packs are git-ignored.
