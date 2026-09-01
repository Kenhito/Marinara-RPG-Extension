# Adding a new ruleset

> **Role of this page:** the decision tree for whether your system fits, plus the (maintainer-lane) recipe for adding a new resolution mode. **The canonical step-by-step build path is [`docs/AUTHORING.md`](AUTHORING.md)** — start there; come here when you're unsure your system fits at all.

This page walks through deciding how to add a new tabletop system to the overlay. If your target system is structurally similar to one already shipped (D&D 5e for d20 systems, Exalted 3e for dice-pool systems, Fate Core for narrative-ladder systems, PbtA via `2d6-stat`), you copy that bundle and edit — per AUTHORING.md. If your system has a fundamentally different resolution mechanic, a new resolution mode has to be added first — the recipe is preserved below, but it is maintainer work.

## Anatomy of a ruleset

See [`docs/AUTHORING.md`](AUTHORING.md) "Anatomy of a ruleset bundle" for the current layout — the short version: four SOURCE files you edit (`ruleset.json`, `gm-agent.md`, `lorebook.json`, `INSTALL.md`, plus optional `agents/` overrides) and two BUILT artifacts the tools generate (`bundle.json`, `agents.json` — what users import; never hand-edited). The extension and schema live one level up at `extension/RPG-Extension-GM-Mode.{css,js}` and `schema/ruleset.schema.json` and are shared across all rulesets.

## Decision tree — before you start

1. **Does my system fit one of the nine existing resolution modes?**
   - d20 + modifier vs DC → `single-roll`
   - dice pool counted against a target → `dice-pool`
   - 1d100 under skill → `d100-percentile` (roll-high percentile too — set `direction: "high"` and, if the system explodes, add `openEnded`; see [`AUTHORING-PHASE-6.md`](AUTHORING-PHASE-6.md) §1)
   - 2d6 + stat with outcome bands → `2d6-stat`
   - 4dF + skill on a verbal ladder → `fate-ladder`
   - dice total under a target (GURPS, CoC 7e, Pendragon) → `roll-under`
   - declare-a-stance-per-roll dice pool (L&F, Stewpot, Trophy Dark) → `stance-modal-pool`
   - Xd6 sum vs difficulty with optional Wild Die (OpenD6, WEG Star Wars, Mini Six) → `dice-pool-sum`
   - prose-resolved / GM-overrules (Trophy Dark dark dice, freeform scenes) → `narrative-handled`

   If yes, skip to **"Authoring a new bundle"** below — you only edit data files. See **[`docs/AUTHORING-PHASE-6.md`](AUTHORING-PHASE-6.md)** section 1 for the full `resolution` block shape of each mode (especially the five added after Phase 5).

2. **If not — STOP.** Don't author a bundle that pretends to fit the closest mode (that produces a sheet/widget that lies to the player). Adding a new resolution mode requires schema + framework JS changes, not a per-ruleset workaround. **Ask Kenhito in the Marinara Extension community thread** (linked from the project README) or open an issue at the project's GitHub repo. Describe the system, the resolution rule's page reference, the shape of one full roll, and what specifically breaks if you try to fit it under an existing mode. The detailed recipe for adding a new mode is preserved in **"Adding a new resolution mode" below** for reference, but the canonical path is the request-via-thread route — Kenhito's job, not yours.

## Authoring a new bundle (resolution mode already exists)

The fastest path is to copy the closest existing bundle and edit.

Linux / macOS:

```bash
cp -r rulesets/exalted3e rulesets/your-system
```

Windows (PowerShell):

```powershell
Copy-Item -Recurse rulesets/exalted3e rulesets/your-system
```

Cross-OS via Node:

```bash
node -e "require('fs').cpSync('rulesets/exalted3e', 'rulesets/your-system', {recursive: true})"
```

Then walk through:

### `ruleset.json`

- **`id`** — kebab-case, the stable namespace key for every stored artifact (server-backed character storage, house-rules stamps, agent naming). NEVER change it once anyone has played under it.
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

User-facing walkthrough. Required because the engine has no marketplace. The modern install is one `bundle.json` import (agents and lorebook ride inside it) followed by per-game activation — attach the lorebook, enable the agents. Cover that flow, a character build, a sanity-check roll, and the common failure modes. Structure per AUTHORING.md Step 7.

## Adding a new resolution mode

**Heads-up:** this section is preserved for reference (and for Kenhito's use when prepping a schema addition). If you're a bundle author, the **canonical path now is to ask Kenhito in the Marinara Extension community thread** rather than DIY the mode addition — see Decision tree step 2 above. This is rarer than authoring a fits-existing-mode bundle and was historically the case for systems that don't fit any of the nine existing modes. **The Fate-ladder mode was added with three changes** — schema, extension, and a new bundle that uses it. Follow the same recipe for your system.

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

In `extension/RPG-Extension-GM-Mode.js`:

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
node --check extension/RPG-Extension-GM-Mode.js
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
