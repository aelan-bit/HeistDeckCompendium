# Heist Deck — Blades in the Dark

A Foundry VTT module that brings the [Duskvol Heist Deck](https://www.drivethrurpg.com/product/209803/) into your game as linked compendium packs and rollable tables. The deck contains 130 cards across three categories — People, Treasures, and Obstacles — each with prompts designed to spark heist planning.

---

## Installation

1. In Foundry, go to **Setup → Add-on Modules → Install Module**
2. Paste the manifest URL into the field at the bottom:
   ```
   https://github.com/aelan-bit/HeistDeckCompendium/releases/latest/download/module.json
   ```
3. Click **Install**, then enable the module in your world

To update an already-installed version, click the **↺** refresh button next to the module in the module list.

---

## Using the Deck

Open the **Heist Deck — Tables** compendium and draw from the rollable tables during heist planning:

| Table | Draws | Purpose |
|---|---|---|
| Obstacles | 3 | Special defenses protecting the target site |
| Treasures | 1 | What motivates the heist |
| People | 2 | One hires the crew, one is the target |

Each table result links to its full compendium entry. Opening the entry shows the card's description, prompts, and — for obstacles — the Dangers and Remedies sections.

---

## Contents

| Compendium | Type | Entries |
|---|---|---|
| Heist Deck — People | Actor (NPC) | 40 |
| Heist Deck — Treasures | Item | 40 |
| Heist Deck — Obstacles | Item | 50 |
| Heist Deck — Tables | RollTable | 3 |

---

## Build Pipeline

The module is built from structured source data in `data/`. The pipeline has two steps:

```
data/*.json
   │
   │  npm run generate
   │  scripts/generate-sources.mjs
   │  Reads the structured card data and writes one JSON file
   │  per card into packs/src/, plus the three RollTable docs.
   ▼
packs/src/
   │
   │  npm run compile
   │  scripts/pack.mjs
   │  Reads packs/src/ and writes LevelDB databases — the
   │  binary format Foundry reads natively as compendium packs.
   ▼
packs/          ← compiled LevelDB (git-ignored, built by CI)
```

Running both steps:
```bash
npm install
npm run build
```

### Source data format

Each card type has its own file in `data/`:

**`data/people.json`** and **`data/treasures.json`**:
```json
{
  "name": "Minister Fourteen",
  "category": "Grungy Fixer, Underworld",
  "description": "The blind Skovlander holds court on the docks...",
  "questions": "He is connected in the Skovlander refugee community..."
}
```

**`data/obstacles.json`** (adds structured dangers and remedies):
```json
{
  "name": "Ghostport Lock",
  "category": "Weird Tech",
  "description": "Keys are tuned to locks that cannot be picked...",
  "questions": "Are these locks modern triumphs or old arcane defenses?",
  "dangers": [
    "The locks are hidden and trapped...",
    "The precise location of the lock must be known..."
  ],
  "remedies": [
    "The ghostport lock has been a fad several times in Duskvol...",
    "The owner may have stiffed a whisper locksmith..."
  ]
}
```

To edit a card, update the relevant file in `data/` and run `npm run build`.

### Deployment

A GitHub Actions workflow (`.github/workflows/release.yml`) triggers on every published release. It runs the build and attaches `module.json` and `module.zip` as release assets, which Foundry downloads during installation.
