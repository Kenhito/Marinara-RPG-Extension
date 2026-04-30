# Adding a new ruleset

This page walks through adding an entirely new tabletop system to the overlay, using **Fate Core** as the worked example. If your target system is structurally similar to one already shipped (D&D 5e for d20 systems, Exalted 3e for dice-pool systems, Fate Core for narrative-ladder systems, plus the schema-only PbtA mode), you can usually copy that bundle and edit. If your system has a fundamentally different resolution mechanic, you'll add a new resolution mode — also documented here.

## Anatomy of a ruleset

Every ruleset is **four files** plus a small change to the schema if you're introducing a new resolution mode. Bundle layout, using fate-core as the example:

```
rulesets/fate-core/
├── ruleset.json     # The declarative spec the extension reads
├── gm-agent.md      # The GM agent system prompt
├── lorebook.json    # Keyword-triggered rules reference
└── INSTALL.md       # User-facing install walkthrough
```

The extension and schema live one level up at `extension/ruleset-loader.{css,js}` and `schema/ruleset.schema.json` and are shared across all rulesets.

## Decision tree — before you start

1. **Does my system fit one of the existing resolution modes?**
   - d20 + modifier vs DC → `single-roll`
   - dice pool counted against a target → `dice-pool`
   - 1d100 under skill → `d100-percentile`
   - 2d6 + stat with outcome bands → `2d6-stat`
   - 4dF + skill on a verbal ladder → `fate-ladder`

   If yes, skip to **"Authoring a new bundle"** below — you only edit data files.

2. **If not**, you're adding a new resolution mode. That means a small change to the schema (a new `oneOf` branch under `resolution`) and to the extension (a new constant in `MODES`, a new `buildXWidget` builder, a new `rollX` function, and a new dispatch branch). The Fate-core addition was about 100 lines total. **The recipe is in "Adding a new resolution mode" below.**

## Authoring a new bundle (resolution mode already exists)

The fastest path is to copy the closest existing bundle and edit:

```bash
cp -r rulesets/exalted3e rulesets/your-system
```

Then walk through:

### `ruleset.json`

- **`id`** — kebab-case, used as the localStorage key. Keep stable — your future-self will paste it into URLs.
- **`name`** / **`version`** / **`edition`** / **`license`** / **`summary`** — human-facing labels.
- **`dice`** — primary die type and notation example. The `notation` is for human reference only; the GM prompt and extension produce their own dice tags.
- **`resolution`** — pick the existing mode and fill the required sub-fields. Validators in `tools/validate-ruleset.mjs` will tell you what's missing.
- **`difficulties`** — map of label to threshold integer. Used by the GM prompt as a vocabulary.
- **`attributes`** / **`skills`** — your character stats. Empty `attributes` is not allowed; if your system has no separate attributes (e.g. some Fate variants), supply at least one synthetic attribute that captures a key resource.
- **`derivedStats`** — HP, mana, stress tracks, anima banner, etc. Use `renderAs: "track"` for ordered cells (Exalted health, Fate stress), `renderAs: "bar"` for filled bars (HP), `renderAs: "value"` for plain counters (Fate Points).
- **`states`** — named state selectors (Anima Banner stages, conditions). Optional.
- **`diceTagFormat`** — the exact format the GM should emit and the extension parses. Match this to what your `gm-agent.md` instructs and what your `roll*` extension function produces. They must agree.
- **`sheetSections`** — render order on the sheet.

After editing, validate:

```bash
node tools/validate-ruleset.mjs rulesets/your-system/ruleset.json
```

### `gm-agent.md`

The GM agent prompt teaches the LLM your system's mechanics, narration vocabulary, and dice-tag format. Aim for at least 800 characters. Cover:

- **Resolution rules** — what dice, what modifier, how outcomes are determined. Include a concrete `[tag: ...]` example.
- **Vocabulary** — names of difficulty levels, success classes, key resources. The model writes much better narration when it has the system's vocabulary.
- **Resource economy** — Fate Points, motes, sorcery charges, ammo, whatever loops the player and the GM share.
- **Negative space** — what the model should *not* do. e.g. for Fate, don't emit `[skill_check: ...]` (that's a different system); don't track HP.
- **Engine gotchas** — at minimum copy the reputation 50-char warning the shipped bundles include. See `docs/ENGINE-CONSTRAINTS.md`.

### `lorebook.json`

Each entry has `keys` (trigger keywords) and `content` (rule text injected when those keys appear in the recent context). Aim for one entry per discrete rule the GM might need to reference: how aspects work, how stress recovers, how charms fire, what stunts do. The marginal cost of an extra entry is near-zero (Marinara surfaces only matching ones per turn) and the model's accuracy on fiddly rules goes up sharply with relevant entries available.

Keep entry `content` factual. The GM agent prompt is where you set tone; the lorebook is where you ground the model in mechanics.

### `INSTALL.md`

User-facing walkthrough. Required because the engine has no marketplace — every install is paste-and-import. Cover: install the extension once, activate the ruleset (paste-or-fetch), install the GM agent, install the lorebook, build a character, troubleshoot the common failure modes. Look at `rulesets/fate-core/INSTALL.md` for the structure.

## Adding a new resolution mode

This is rarer but is what you do for systems that don't fit any of the five existing modes. **The Fate-ladder mode was added with three changes** — schema, extension, and a new bundle that uses it. Follow the same recipe for your system.

### Step 1 — schema

In `schema/ruleset.schema.json`, find the `resolution.oneOf` array and append a new branch. Use Fate's branch as the model:

```json
{
  "required": ["mode", "modifierFormula", "ladder", "successWithStyle"],
  "properties": {
    "mode": { "const": "fate-ladder" },
    "modifierFormula": { "type": "string", "description": "..." },
    "ladder": {
      "type": "array",
      "minItems": 5,
      "items": {
        "type": "object",
        "required": ["label", "value"],
        "properties": {
          "label": { "type": "string" },
          "value": { "type": "integer" }
        },
        "additionalProperties": false
      }
    },
    "successWithStyle": { "type": "integer", "minimum": 1 }
  },
  "additionalProperties": false
}
```

The pattern: `mode` is a const string identifying your system; the other required properties are whatever your math needs. Keep `additionalProperties: false` so unknown fields are caught. Validate the existing rulesets still pass:

```bash
npm run validate-rulesets
```

### Step 2 — extension MODES + dispatch + builder + roller

In `extension/ruleset-loader.js`:

1. **Add a `MODES` entry** — search for `var MODES = {` and add your mode constant. Example: `FATE: "fate-ladder"`.
2. **Add a dispatch branch** — search for `if      (mode === MODES.POOL)` and add an `else if` for your mode. The dispatcher calls `buildXWidget()`.
3. **Write `buildXWidget()`** — uses the existing `diceRow(...)` and `diceFooter(...)` helpers. It declares the input fields (skill, target, etc.) the player edits before rolling.
4. **Write `rollX()`** — generates the dice, computes outcome and shifts/successes, calls `finalizeRoll(text, kind, faces)` where `text` is the formatted `[your-mode: ...]` tag and `kind` is one of `"success"`, `"fail"`, `"botch"`, `"tie"` for CSS coloring.
5. **(Optional) `quickRollForSkill`** — search for that function. If the player clicks a skill row's "roll" button, it can pre-fill your widget's inputs.

Keep style consistent with the surrounding code: `var` declarations, no arrow functions in non-callback positions, no ES2015+ features that could break the `new Function("marinara", source)` runtime contract.

### Step 3 — bundle that exercises the new mode

Author the four files (`ruleset.json`, `gm-agent.md`, `lorebook.json`, `INSTALL.md`) using your new mode in `resolution.mode`. Validate.

### Step 4 — verify

```bash
node --check extension/ruleset-loader.js
npm run validate-rulesets
```

Reload Marinara, switch to your ruleset via the **Ruleset** header button, open a Game Mode chat, and roll.

If the dice widget renders correctly, the dice tag round-trips through the chat input, and the GM agent narrates outcomes using your vocabulary, the new mode is live.

## What "extensible" means here, honestly

The schema and extension take a system in 100-200 lines of JS plus 20-50 lines of schema. The GM agent prompt and lorebook do most of the heavy lifting; the math and UI are intentionally thin.

**What this overlay is good for:** swapping the resolution mechanic, the character sheet UI, the dice math, the rules vocabulary, and the GM's narration style.

**What it is not good for** (per `docs/ENGINE-CONSTRAINTS.md`): replacing the engine's combat-encounter modal, replacing the character creator wizard, persisting per-attribute data into Marinara's typed `RPGAttributes` field. Those require either upstream PRs into Marinara or a fork. This repo's scope is "no fork, no PR".

## Sharing your bundle

If you build a ruleset bundle for a system not yet covered (Pathfinder 2e, Blades in the Dark, Lancer, Lady Blackbird, Mörk Borg, GURPS, Cyberpunk RED, Vampire 5e, anything else), open a PR against this repo. The bar is: schema validates, GM prompt has the mechanics covered, lorebook entries trigger correctly, INSTALL.md walks a stranger through setup. License notes for the system's IP go in the bundle's `ruleset.json` `license` field (see how `dnd5e` and `exalted3e` handle it).
