# 03 — Ruleset Schema

The `ruleset.json` file declares every system-specific constant the framework needs: dice mechanic, resolution mode, attributes, skills, derived stats, states, damage types, ability categories. This document explains every field with system-agnostic examples.

The canonical schema is `schema/ruleset.schema.json` (JSON Schema draft 2020-12). Validate any file with:

```
node tools/validate-ruleset.mjs rulesets/<your-system>/ruleset.json
```

## Top-level shape

```json
{
  "id": "your-system",
  "name": "Your System",
  "version": "1.0.0",
  "edition": "Your System First Edition (Publisher, Year)",
  "license": "Original mechanics references; flavor text belongs to <Publisher>.",
  "summary": "One-paragraph elevator pitch describing the system's resolution mechanic and tone.",

  "dice": { "type": "d20", "notation": "d20+mod vs DC" },
  "resolution": { "mode": "single-roll", "modifierFormula": "1d20 + ability_mod + proficiency_bonus" },
  "xpTable": [ { "level": 1, "xp": 0 }, ... ],
  "scenarioDefaultDerive": false,

  "difficulties": { ... },
  "attributes": [ ... ],
  "skills": [ ... ],
  "saves": [ ... ],
  "conditions": [ ... ],
  "skillProficiency": { ... },
  "skillSpecialties": { ... },
  "backgrounds": { ... },
  "classOptions": [ ... ],
  "header": { "raceLabel": "...", "classLabel": "..." },

  "derivedStats": [ ... ],
  "states": [ ... ],

  "diceTagFormat": { "template": "...", "example": "..." },
  "sheetSections": ["attributes", "skills", "derived", "states", "abilities", "backgrounds", "inventory", "notes"],
  "lorebookKeys": ["..."],
  "abilities": { "label": "Spells", "categories": [ ... ] },

  "equipmentSlots": ["..."],
  "equipmentBonusTargets": ["..."]
}
```

(All of the above except `id`, `name`, `version`, `dice`, `resolution`, `attributes`, and `skills` are optional — see "Required fields" and "Optional fields" below. `saves`, `conditions`, `classOptions`, `header`, `backgrounds.textOnly`, and `scenarioDefaultDerive` are load-bearing for several shipped rulesets but easy to miss when skimming this example; each gets its own subsection below.)

`additionalProperties: false` is enforced at every level. Unknown fields are rejected.

## Required fields

### `id` — kebab-case unique key

Pattern: `^[a-z0-9][a-z0-9-]{1,63}$`. Used as the localStorage key for the active ruleset and as a tag prefix for managed agents/lorebooks. Pick something distinctive and short: `gurps4e`, `cofd2`, `dnd5e`, `exalted3e`.

### `name` — human-readable

What appears in the sheet header. Also fed to agent name templates: each role agent installs as `"<name> — <Role>"`.

### `version` — semver of YOUR data file

Independent of the framework version. Bump when you ship updates to your own ruleset.

### `dice` — primary die config

```json
{ "type": "d10", "notation": "Xd10 vs 7" }
```

Display-only metadata. Resolution math goes in `resolution`.

### `resolution` — one of the supported modes

The `mode` field selects which sub-fields apply. Each mode has its own required fields. As of v0.4.2 the supported modes are `single-roll`, `dice-pool`, `dice-pool-sum`, `d100-percentile`, `2d6-stat`, `roll-under`, `fate-ladder`, `stance-modal-pool`.

> **Family contrast: `dice-pool` vs `dice-pool-sum`.** The two pool modes are peers, not a default-and-variant. `dice-pool` (Storyteller / Exalted / Shadowrun) rolls N dice and **counts** the dice that meet a per-die target. `dice-pool-sum` (OpenD6 / WEG Star Wars / Mini Six / D6 System SRD) rolls N dice and **sums** their face values against a difficulty number. Same shape, different math. Read the mode name carefully.

#### Mode: `single-roll` (D&D, Pathfinder, Cypher, OSR)

```json
{
  "mode": "single-roll",
  "modifierFormula": "1d20 + ability_mod + proficiency_bonus"
}
```

**What the dice widget does with `modifierFormula`:** the widget rolls **one** die of the size declared in `dice.type` (`d20` for D&D, `d100` for percentile-flavored single-roll, etc.) and adds an integer modifier built from `{StatName}` token substitution against the live sheet. The formula text is descriptive for the GM/narrator — the widget does NOT parse arbitrary NdX dice expressions. If your system rolls more than one die per check, use `dice-pool`, `dice-pool-sum`, `2d6-stat`, or `roll-under` instead — `single-roll` is single-die-plus-modifier only. The `{StatName}` placeholders resolve against attributes, skills, and `derivedStats`; arithmetic is whitelisted to `+ - * / ( )` and integer literals (CSP-safe parser).

#### Mode: `dice-pool` (Exalted, Storyteller, Shadowrun)

```json
{
  "mode": "dice-pool",
  "poolFormula": "Attribute + Ability",
  "target": 7,
  "doubles": { "face": 10, "successes": 2 },
  "botches": { "onFace": 1, "trigger": "any-on-zero-successes" }
}
```

`botches.trigger` enum: `any-on-zero-successes`, `majority`, `always-on-face`.

#### Mode: `dice-pool-sum` (OpenD6, WEG Star Wars, Mini Six, D6 System SRD, MEGS) — NEW in v0.4.2

```json
{
  "mode": "dice-pool-sum",
  "poolFormula": "Attribute + Skill",
  "dieSize": 6,
  "pipsField": "pips",
  "difficultyHint": 15,
  "wildDie": {
    "enabled": true,
    "explodeFace": 6,
    "critFailFace": 1,
    "explodeCap": 0
  }
}
```

**Fields:**

| Field | Required | Default | What it does |
|---|---|---|---|
| `poolFormula` | yes | — | Plain-language formula for pool size **in DICE** (e.g. `"Attribute + Skill"`). The widget resolves this against the live sheet to an integer N. |
| `dieSize` | no | `6` | Face count per die — enum `[4, 6, 8, 10, 12]`. D6-family systems: 6. |
| `pipsField` | no | (none) | Name of the sheet field carrying +pips (the +P in OpenD6's `NDX+P` notation; pips are 1/3-of-a-die granularity). The widget adds this resolved integer to the rolled sum. Pair with each attribute/skill's `pipGranularity` block. |
| `difficultyHint` | yes | — | Static integer the widget shows as the difficulty input's placeholder. Player/GM overrides per roll. OpenD6 Adventure: 15 (Easy 10, Difficult 20, Heroic 30). v0.4.2 limits this to a static integer; opposed-roll formulas deferred. |
| `wildDie` | no | (no wild die) | Optional Wild Die block — see "Wild Die" below. |

**Wild Die mechanic.** One die in every pool gets special handling:

```json
"wildDie": {
  "enabled": true,
  "explodeFace": 6,
  "critFailFace": 1,
  "explodeCap": 0
}
```

| Field | Default | What it does |
|---|---|---|
| `enabled` | (required) | Master switch. `false` = no wild die designated (pure sum). |
| `explodeFace` | `6` | Face that triggers an **explode** — re-roll and add to total, cascading while the new face also matches. |
| `critFailFace` | `1` | Face that signals a potential **critical failure**. When the Wild Die lands on this face AND the rolled total falls short of difficulty, the widget reports `critFail: true` in the roll result. |
| `explodeCap` | `0` | Maximum chained explodes. **`0` means uncapped** (canon OpenD6). Set to N for a sanity-bounded streak cap. The widget enforces a hard safety bound of 100 cascades regardless, to prevent malformed-RNG infinite loops. |

**Boundary: widget surfaces, narrator resolves.** The Wild Die's crit-fail flag is **surfaced**, not auto-applied. OpenD6 says GM-fiat picks the consequence ("subtract highest other die OR add complication"). The `[mrr-roll: ...]` chat tag carries `wild=<face>`, `critFail=<bool>`, and the explode chain — the GM agent narrates the effect. Don't read the widget as auto-resolving; it reports honest data and lets the narrator decide.

**Pair with `pipGranularity` (also new in v0.4.2)** on each attribute/skill to express OpenD6 stat ratings as `ND+P` instead of just `N`. See "attributes" and "skills" below.

#### Mode: `d100-percentile` (Call of Cthulhu, BRP, Runequest)

```json
{ "mode": "d100-percentile", "skillFormula": "Roll 1d100 under skill_value" }
```

#### Mode: `2d6-stat` (PbtA, Dungeon World, Apocalypse World)

```json
{
  "mode": "2d6-stat",
  "modifierFormula": "2d6 + stat",
  "bands": [
    { "min": 10, "label": "10+: full success" },
    { "min": 7, "max": 9, "label": "7-9: success with cost" },
    { "max": 6, "label": "6-: miss" }
  ]
}
```

#### Mode: `fate-ladder` (Fate Core, Fate Accelerated, Fate-of-Cthulhu)

```json
{
  "mode": "fate-ladder",
  "modifierFormula": "Skill rating",
  "ladder": [
    { "label": "Legendary", "value": 8 },
    { "label": "Epic", "value": 7 },
    { "label": "Mediocre", "value": 0 },
    { "label": "Terrible", "value": -2 }
  ],
  "successWithStyle": 3
}
```

(`roll-under` and `stance-modal-pool` are covered in their own sections later in v0.4.2.)

If your system's dice math doesn't fit any of these modes, see `06-BUILD-PIPELINE.md` "Adding a new resolution mode" — it requires extending the framework JS, not just the data files.

### `attributes` — at least one

```json
[
  {
    "name": "Strength",
    "abbreviation": "STR",
    "group": "Physical",
    "min": 1,
    "max": 20,
    "default": 10,
    "description": "Raw physical power."
  }
]
```

`name` is canonical (referenced by skills' `linkedAttribute` and by formula `{Strength}` substitutions). `group` controls sheet grouping (e.g., Physical / Social / Mental in Exalted).

For systems where attributes don't naturally exist (some Fate variants), supply at least one synthetic attribute capturing a key resource.

#### Per-attribute `modifierFormula` — auto-calculated modifiers

```json
{
  "name": "Strength",
  "abbreviation": "STR",
  "min": 3, "max": 18, "default": 10,
  "modifierFormula": "({Score} - 10) / 2",
  "modifierName": "STR Mod"
}
```

Any attribute can declare `modifierFormula` to auto-compute a derived modifier (D&D-style ability modifiers, PF2e modifiers). Use the magic token `{Score}` for the attribute's own raw value, plus standard `{StatName}` placeholders for cross-attribute references. The result is floored. `modifierName` optionally labels the computed value on the sheet. **This is arithmetic-only** — see "Known schema limits" near the end of this doc for what it cannot express (piecewise/stepped modifier tables) and the documented workaround.

### `skills` — at least one

```json
[
  {
    "name": "Athletics",
    "linkedAttribute": "Strength",
    "min": 0,
    "max": 5,
    "default": 0,
    "description": "Climbing, swimming, jumping."
  }
]
```

`linkedAttribute` is set when the skill always pairs with the same attribute (D&D); omit when the narrator picks the attribute per check (Exalted).

## Optional fields

### `difficulties` — named difficulty ladder

```json
{
  "Routine":   { "threshold": 1, "description": "Trivial for a competent character." },
  "Standard":  { "threshold": 2, "description": "Default opposed baseline." },
  "Difficult": { "threshold": 3, "description": "Pushes a skilled mortal." },
  "Demanding": { "threshold": 4, "description": "Few mortals can do it reliably." },
  "Legendary": { "threshold": 5, "description": "Peak of mortal-scale achievement." }
}
```

Min 2 entries. Surfaces in the main narrator agent prompt as the standard target-number vocabulary.

### `saves` — saving throws linked to an attribute

```json
[
  { "name": "Strength Save", "linkedAttribute": "Strength", "description": "Resist being physically forced or moved." },
  { "name": "Wisdom Save", "linkedAttribute": "Wisdom" }
]
```

Each save renders a row whose displayed value auto-computes from the linked attribute's modifier plus the active `skillProficiency` tier (saves share the same tier system as skills). Both `name` and `linkedAttribute` are required per entry — **the schema has no "flat, unlinked save" shape**, which is D&D/PF2e-shaped by design (attribute-modifier-plus-proficiency).

**Workaround for a system whose saves are NOT attribute-modified** (e.g. classic B/X-tradition retroclones, where saving throws are flat class-and-level numbers with no ability modifier added): still declare `linkedAttribute` on each save — the schema requires it, and it's useful for sheet grouping and lorebook cross-referencing even when unused mechanically — but instruct the main narrator agent's prompt (and a lorebook entry) to ignore the sheet's auto-computed attribute-modifier contribution and treat the value as flat. The `Old School Essentials` reference ruleset (`rulesets/ose/`) ships this exact pattern: its `saves[]` entries declare a `linkedAttribute` for each of the five B/X save categories, but `gm-agent.md` explicitly states "saves in this system are flat class/level numbers with NO ability modifier added — do not add STR/DEX/etc. to a save."

### `conditions` — status condition definitions

```json
[
  {
    "name": "Prone",
    "description": "Lying on the ground. Melee attacks against you have advantage; your attacks vs. adjacent foes have disadvantage.",
    "imposesDisadvantageOn": ["attack"],
    "grantsAdvantageOn": []
  }
]
```

When declared, the sheet renders a Conditions section with an add dropdown of these names plus a free-text option. `name` is required; `description` surfaces as a tooltip and feeds the agent prompt. `imposesDisadvantageOn` / `grantsAdvantageOn` are optional arrays drawn from the enum `["attack", "save", "skill"]` — the dice widget's `quickRoll*` helpers consult these so the player doesn't have to remember which roll category a condition affects, auto-arming advantage/disadvantage on the matching category.

### `classOptions` — class / playbook / archetype picker

```json
[
  { "name": "Fighter", "hitDie": "d10", "description": "Martial expert with the most hit points and attacks." },
  { "name": "Wizard", "hitDie": "d6", "description": "Weak in melee, powerful with prepared spells." }
]
```

Optional list of class/playbook/archetype choices the player picks from in the sheet header. Both `name` and `hitDie` (pattern `^d[0-9]+$`) are required per entry; `description` is optional flavor for the dropdown hint. Resources declaring `dieFromClass: true` pick up `hitDie` from the selected class. D&D 5e ships the canonical 12-class example; Pathfinder 2e, Mörk Borg, and Old School Essentials (Fighter/Cleric/Magic-User/Thief plus demi-human race-as-class options) use the same shape. Note: as of this doc, the class-driven dropdown UI wiring is still a handoff item (see `docs/BUILDING.md` "Class-driven dropdown") — declaring `classOptions` documents the choice set even where the renderer still treats the field as free text.

### `header` — identity field labels

```json
{ "raceLabel": "Exalt Type", "classLabel": "Caste/Aspect" }
```

Optional per-ruleset labels for the two free-text identity fields in the sheet header (normally "Race" and "Class"). D&D ships `"Race"` / `"Class"` (the defaults, so it can omit this block entirely); Exalted ships `"Type"` / `"Caste/Aspect"`. Both sub-fields are optional strings; omit the whole block to keep the defaults.

### `derivedStats` — computed pools and tracks

Three render modes:

#### `renderAs: "value"` — flat number

```json
{
  "name": "Initiative",
  "formula": "(Wits + Awareness)",
  "renderAs": "value"
}
```

#### `renderAs: "bar"` — current/max with optional formula-driven max

```json
{
  "name": "Personal Motes",
  "formula": "Essence x 3 + 10 (Solar)",
  "maxFormula": "{Essence} * 3 + 10",
  "renderAs": "bar"
}
```

`maxFormula` is evaluated by a CSP-safe arithmetic parser inside the framework. Supports `+ - * / ( )`, integers, decimals, and `{StatName}` placeholders. Anything else returns null and falls back to `derived.max` or the framework's `DEFAULT_BAR_MAX = 10`. `{StatName}` substitutes from the live stat context (attributes + skills + derivedStats), so a bar's max recomputes whenever its referenced stat changes.

A `bar` may also declare a static `max: <int>` instead of `maxFormula`.

#### `renderAs: "track"` — penalty boxes (HP-style with wound thresholds)

```json
{
  "name": "Health Track",
  "formula": "7 levels: -0/-1/-1/-2/-2/-4/Incapacitated. Penalty equals the highest filled box.",
  "renderAs": "track",
  "track": [
    { "label": "-0", "penalty": 0 },
    { "label": "-1", "penalty": -1 },
    { "label": "-1", "penalty": -1 },
    { "label": "-2", "penalty": -2 },
    { "label": "-2", "penalty": -2 },
    { "label": "-4", "penalty": -4 },
    { "label": "Incapacitated", "penalty": -99 }
  ]
}
```

A track may optionally declare **typed damage** for systems where multiple damage flavors stack with severity:

```json
{
  "name": "Health Track",
  "renderAs": "track",
  "track": [ ... ],
  "damageTypes": [
    { "id": "bashing",    "label": "B", "severity": 0, "description": "..." },
    { "id": "lethal",     "label": "L", "severity": 1, "description": "..." },
    { "id": "aggravated", "label": "A", "severity": 2, "description": "..." }
  ]
}
```

When `damageTypes` is declared, the renderer:

- Shows each filled cell colored by damage type (CSS modifier classes `.<prefix>-track__cell--<id>`)
- Stacks higher-severity damage to the left so the worst always reads first
- Renders the type's `label` over the cell instead of the penalty number
- Provides "Take damage:" buttons for each type plus a "heal worst" button

The state-mutator can mutate typed damage with `field="<typeId>" delta="<+/-N>"`, e.g. `field="bashing" delta="+3"`.

`severity` integer is purely an ordering hint (higher = leftmost in the stack). Pick whatever monotonic integers make sense; the renderer sorts descending.

### `states` — dropdown selectors

```json
[
  {
    "name": "Anima Banner",
    "values": [
      { "label": "Dim",      "trigger": "0-4 Peripheral motes spent in one action." },
      { "label": "Glowing",  "trigger": "5-10 Peripheral motes spent in one action." },
      { "label": "Burning",  "trigger": "11-15 Peripheral motes spent in one action." },
      { "label": "Bonfire",  "trigger": "16+ Peripheral motes spent in one action." }
    ]
  }
]
```

Values' `trigger` text is purely for the main narrator agent prompt's reference; the extension does not auto-trigger them.

### `skillProficiency` — tier system

```json
{
  "tiers": [
    { "code": "U", "label": "Untrained" },
    { "code": "T", "label": "Trained" },
    { "code": "E", "label": "Expert" },
    { "code": "M", "label": "Master" }
  ],
  "default": "U"
}
```

When declared, each skill row gets letter buttons for tier selection. CSS classes `.<prefix>-skill-tier-btn--<code>` style the active tier. Optional `rollBonusFormula` per tier feeds the dice widget's modifier.

### `skillSpecialties` — fate-style aspects on skills

```json
{
  "enabled": true,
  "valueLabel": "+ dice",
  "valueKind": "dice",
  "defaultValue": 1
}
```

Adds a "+S" button per skill row that opens a sub-row for naming a specialty and assigning a numeric bonus.

### `backgrounds` — non-skill character traits

```json
{
  "enabled": true,
  "label": "Backgrounds & Merits",
  "min": 0,
  "max": 5,
  "default": 0
}
```

Renders a `Backgrounds` section on the sheet for free-text named traits with numeric values. `enabled` is the only required sub-field.

**`textOnly` (optional boolean)** — when `true`, the section renders name-only rows with no dot value and no stepper, for systems whose entries are described rather than rated. D&D 5e Feats use this shape (`min`/`max`/`default` become irrelevant when `textOnly` is set — Feats aren't dot-rated). Old School Essentials also ships `textOnly: true` for its "Class Features & Restrictions" section, since B/X class abilities are prose, not numeric traits. The convention for a `textOnly` section is that the user adds a companion lorebook entry per row to teach the agent the row's actual mechanics — the schema has no structured way to encode "what this named trait does," only that it exists.

### `abilities` — Charms / Spells / Powers

```json
{
  "label": "Charms",
  "categories": [
    { "id": "melee",    "label": "Melee" },
    { "id": "occult",   "label": "Occult" },
    { "id": "sorcery",  "label": "Sorceries" }
  ]
}
```

Renders a collapsible Spellbook flyout with one section per category. Each ability has `name`, `type` (at-will / once-per-scene / once-per-day), `effectText`, `description`, optional `costText` (cost auto-deducted by state-mutator on cast), and a button to push into the lorebook.

The category id `sorcery` is special-cased: when an ability lives there, its lorebook entry gets a `Type: Sorcery` header and a `sorcery` keyword tag. This signals the state-mutator to use multi-turn shape-sorcery casting flow instead of immediate-cost charm flow. See `05-AGENT-AUTHORING.md` for the full sorcery workflow.

### `diceTagFormat`

```json
{
  "template": "[dice: {pool}d10 vs 7 -> {successes} successes{tens}{botch}]",
  "example": "[dice: 8d10 vs 7 -> 5 successes, 2 tens doubled]"
}
```

The `template` is what the main narrator agent is told to emit; `example` is a concrete instance. The dice widget produces tags matching this format. Both fields required if `diceTagFormat` is set.

### `sheetSections` — sheet render order

```json
["attributes", "skills", "derived", "states", "abilities", "backgrounds", "inventory", "notes"]
```

Enum: any of these in any order. Sections you omit don't render. The framework's renderer dispatches on each name.

### `lorebookKeys` — suggested keys

Free-text array of suggested keywords for the bundled lorebook. Advisory only; the lorebook's actual keys live in `lorebook.json`.

### `scenarioDefaultDerive` — auto-derive a scenario default

```json
"scenarioDefaultDerive": true
```

Boolean, default `false`. When `true` AND top-level `scenarioDefault` is absent, `tools/build-scenario-default.mjs` auto-derives a scenario-default string from `ruleset.json` (name + summary + dice + resolution mode) and embeds it in the bundle as `bundle.scenarioDefault`, which the engine reads via `chatMeta.groupScenarioText` override. When `false` (the default) and `scenarioDefault` is absent, the bundle ships no scenario default at all. If you've hand-written a `scenarioDefault` string yourself, it always wins regardless of this flag.

### `equipmentSlots` and `equipmentBonusTargets` — autocomplete hints

```json
"equipmentSlots": ["Weapon", "Armor", "Shield", "Helmet"],
"equipmentBonusTargets": ["Melee", "Defense", "Soak"]
```

Advisory lists used to populate datalist dropdowns in the inventory editor. Items can use slots not in this list — the loader does not enforce membership. Bonus targets are matched by exact-string name against attributes / skills / derivedStats names.

## Equipment + bonuses

Items live in `state.sheet.inventory[]`, each shaped:

```json
{
  "id": "item-1234567890-abc",
  "name": "Daiklave of Conquering Wind",
  "slot": "Weapon",
  "bonuses": [
    { "target": "Melee", "value": 3, "kind": "dice", "tag": "accuracy" },
    { "target": "Melee", "value": 5, "kind": "dice", "tag": "damage" }
  ],
  "notes": "Orichalcum daiklave bequeathed by Sol himself."
}
```

`kind` enum:

- `"value"` (default) — flat numeric, used by derived display and d20 modifier
- `"dice"` — added to dice-pool size (Storyteller systems)
- `"successes"` — reserved for Charms granting auto-successes; not yet wired into roll math
- `"damage-pool"` — NEW in v0.4.2 — the bonus carries a dice-pool damage formula in a `formula` field (e.g. `"formula": "3D+2"`). The dice widget routes weapon damage through `dice-pool-sum` math (sum N six-siders, optional Wild Die). Use for D6-family weapons (OpenD6, WEG Star Wars, Mini Six). Formula regex: `^\d+D([+-]\d+)?$` — `2D-1` is allowed (light bludgeoning weapons).

Equipping is per-slot: `state.sheet.equipped[slot] = itemId`. The framework's `equippedBonuses(target)` function aggregates contributions from every equipped item.

## Validation gates

Before declaring done:

```bash
node tools/validate-ruleset.mjs rulesets/<your-system>/ruleset.json
node tools/validate-bundle.mjs rulesets/<your-system>/bundle.json     # if you've built a bundle
```

Both must pass. The validator prints exact JSON Pointers to offending fields.

## What's new in v0.4.2 — docs catch-up

### New resolution modes

- **`dice-pool-sum`** — N dice summed against a difficulty number with optional Wild Die. D6-family systems: OpenD6, WEG Star Wars, Mini Six, D6 System SRD, MEGS. Full docs in the `resolution` section above.
- **`narrative-handled`** — fallback for systems whose dice math doesn't fit a typed mode. Schema validates, dice widget renders a generic manual NdX widget, narrator does the math. Required field: `description` (plain-language explanation); optional: `noticeText` (banner above the widget).
- **`roll-under`** — Call of Cthulhu, BRP, Runequest, GURPS, Pendragon. Required: `diceFormula` (XdY pattern). Optional: `skillBonusFormula` (computes target from sheet), `criticalSuccessFormula` (token: `{target}`), `criticalFailureThreshold` (CoC 7e: 96) OR `criticalFailureFormula` (GURPS margin-based). Fields exist in the schema since the post-v0.4.1 commits; v0.4.1 docs missed them.
- **`stance-modal-pool`** — Lasers & Feelings family. Pool of dice compared against a single stat, with two stances (`under`/`over` direction) and discrete outcome tiers. Required: `diceType` (d4..d20), `poolFormula`, `stat`, `stances[2]` (one `under`, one `over`), `outcomeTiers[]`. Optional `exactMatch` for L&F's "Laser Feelings."

### New attribute/skill subfields

- **`pipGranularity`** (NEW v0.4.2) — declare `{ pipsPerDie: 3, pipsField: "pips" }` to enable ND+P stat ratings (OpenD6: rating stored as integer dice + integer pips; advancement loop converts 3 pips → 1 die). Pairs with `resolution.pipsField` on `dice-pool-sum` mode. When omitted, the attribute/skill renders as a plain integer (existing behavior).

### New `derivedStats.track[].penaltyKind`

- **`penaltyKind` enum: `"flat" | "dice"`** (NEW v0.4.2) — controls how the renderer and the context-fuser agent's state reminder section display `penalty`. Default `"flat"` (back-compat: Exalted Wound Levels, WoD health-state penalties). Set to `"dice"` for OpenD6 / WEG D6 / Mini Six Wound Levels — the renderer prefixes the cell text with `D` (e.g. `-1D` instead of `-1`) and the context-fuser emits "minus N dice from every pool" instead of "minus N to total."

### New `equipment.bonuses[].kind: "damage-pool"`

See the "Equipment + bonuses" section above. New `damage-pool` kind ships dice-pool damage formulas for D6-family weapons. Formula regex: `^\d+D([+-]\d+)?$`.

### Schema-level fields that landed pre-v0.4.2 but weren't documented

- **`commitmentModel`** (top-level) — enum `"attuned" | "invested" | "mote" | null`. Controls how the framework treats equipment commitment for the active ruleset. D&D-style attunement: `"attuned"`. Exalted-style mote commitment: `"mote"` (pairs with resource `commitmentPool` references). When unset, no commitment model is active.
- **`xpTable`** (top-level) — array of `{ level, xp }` pairs for d20-style level-up tables. Read by the renderXpCard sheet section in single-roll mode to compute the experience bar's denominator. PF2e / D&D 5e ship a full 1..20 ladder.

### Boundary: widget surfaces, narrator resolves

The widget reports honest dice-roll data — the Wild Die's face, the explode chain, the critFail flag, the totals — but does NOT auto-apply in-fiction effects. OpenD6 says the GM picks the consequence of a Wild-Die crit-fail (subtract highest other die OR add complication — GM-fiat). The narrator reads the chat tag and resolves. Same for `narrative-handled` mode: the widget rolls, the narrator does the math against the system the `description` field declared.

## Known schema limits

Honest boundaries — know these before you start authoring, so you don't discover them mid-session:

- **~~One `resolution.mode` per ruleset~~ — PARTIALLY LIFTED (B18, 2026-08-23; RESTRICTED round 9 — honesty fix).** A ruleset's primary `resolution.mode` still drives the default dice widget and any skill/derivedStat that doesn't say otherwise, but `resolution.additionalModes[]` now lets it declare NAMED, self-contained alternate mechanics — each `{id, label, mode, config, whenToUse}`. **`mode` is restricted to `dice-pool` and `roll-under` only** — the two modes whose roller both (a) tags its chat output starting with the literal string `"[dice: "` (the prefix the `mode=<id>` injection guards on) and (b) is actually parameterized by the additionalMode's own `config` in both its builder and roller. The other seven typed modes (`single-roll`, `d100-percentile`, `2d6-stat`, `fate-ladder`, `stance-modal-pool`, `dice-pool-sum`, `narrative-handled`) cannot be used in `additionalModes` yet — some tag under `"[d100: "`/`"[mrr-roll: "` instead of `"[dice: "`, some aren't config-parameterized, `narrative-handled` has no roller at all — more modes land here as they're converted, not claimed in advance. A `skills[]`/`derivedStats[]` item opts into an additionalMode via its own optional `resolutionId` (matching an `additionalModes[].id`, or the literal `"primary"`); its roll button then pre-selects that mechanic in the dice widget, which also gains a manual mechanic-selector control whenever `additionalModes` is non-empty. Every roll made under a non-primary mechanic tags its chat output `[dice: mode=<id> ...]` so the GM agent reads which mechanic fired instead of remembering which one should have. The GM agent itself is auto-taught a compact routing table (id, label, `whenToUse`, and which skills/derivedStats are bound) whenever `additionalModes` is non-empty — see `AUTHORING-PHASE-6.md` and `AUTHORING.md` for the authoring-facing writeup. Old School Essentials (`rulesets/ose/`) is the shipped example: `resolution.mode` stays `single-roll` (the d20 attack/save math) as primary, while its percentile Thief Skills now route through an `additionalModes` entry `thief-skills` (`roll-under`, `diceFormula: "1d100"`) and its d6-in-X checks (Open Doors, Listen, Surprise) route through `door-checks` (`roll-under`, `diceFormula: "1d6"`) — both now widget-automated, no longer prose-only. **Still a real limit:** the dice never leave deterministic code — a mechanic that doesn't reduce to `dice-pool` or `roll-under` today still has no automation path and still needs prose + a lorebook entry.
- **Single universal `xpTable`.** The top-level `xpTable` array is one ladder per ruleset. Systems where XP-to-level is class-specific (each class needs a different total to reach the next level — classic B/X-tradition retroclones are the common case) can only embed ONE class's progression as the sheet's XP-bar reference; there's no schema shape for "this array, but keyed per class." The documented workaround (see `rulesets/ose/ruleset.json` and its `INSTALL.md`) is to embed one class's table (commonly the simplest or most "baseline" class — OSE uses Fighter), clearly label it as that class's progression only in the ruleset `summary`, the derived-stat description referencing it, and the install docs, and instruct players of other classes to consult their own class's table externally. Do not invent numbers for classes you haven't embedded.
- **`modifierFormula` is arithmetic-only.** Both the per-attribute `modifierFormula` and the `derivedStats[].maxFormula` fields go through the same CSP-safe recursive-descent parser: `+ - * / ( )`, integer/decimal literals, and `{StatName}` placeholders. There is no conditional logic and no lookup-table support — you cannot express "if score is 13-15, modifier is +1; if 16-17, modifier is +2" (a piecewise step function) as a formula. This blocks a class of classic systems outright: B/X-tradition ability-modifier tables (the OSE reference ruleset's non-linear STR/DEX/CON/etc. step table) and Rolemaster Fantasy Role Playing's stat-bonus tables (e.g. RMFRP Table T-2.1) cannot be expressed as `modifierFormula` — only smooth linear formulas like D&D 5e's `({Score} - 10) / 2` fit. The documented workaround, used by the OSE reference ruleset: omit `modifierFormula` on the affected attributes, publish the step table as a constant lorebook entry (e.g. "Ability Modifiers (step table)"), and have the player read the modifier off the table by hand and enter it as a flat value wherever it's needed. This is a real authoring constraint, not an oversight to work around cleverly — don't try to fake a lookup table by chaining arithmetic tricks; it will misbehave at the table boundaries.

## Next

Read **04-LOREBOOK-FORMAT.md** for the rules-reference shape, then **05-AGENT-AUTHORING.md** for prompt-writing patterns.
