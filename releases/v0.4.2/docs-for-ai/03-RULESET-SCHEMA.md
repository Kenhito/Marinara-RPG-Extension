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

  "difficulties": { ... },
  "attributes": [ ... ],
  "skills": [ ... ],
  "skillProficiency": { ... },
  "skillSpecialties": { ... },
  "backgrounds": { ... },

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

Renders a `Backgrounds` section on the sheet for free-text named traits with numeric values.

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

- **`penaltyKind` enum: `"flat" | "dice"`** (NEW v0.4.2) — controls how the renderer and state-reminder agent display `penalty`. Default `"flat"` (back-compat: Exalted Wound Levels, WoD health-state penalties). Set to `"dice"` for OpenD6 / WEG D6 / Mini Six Wound Levels — the renderer prefixes the cell text with `D` (e.g. `-1D` instead of `-1`) and the state-reminder agent emits "minus N dice from every pool" instead of "minus N to total."

### New `equipment.bonuses[].kind: "damage-pool"`

See the "Equipment + bonuses" section above. New `damage-pool` kind ships dice-pool damage formulas for D6-family weapons. Formula regex: `^\d+D([+-]\d+)?$`.

### Schema-level fields that landed pre-v0.4.2 but weren't documented

- **`commitmentModel`** (top-level) — enum `"attuned" | "invested" | "mote" | null`. Controls how the framework treats equipment commitment for the active ruleset. D&D-style attunement: `"attuned"`. Exalted-style mote commitment: `"mote"` (pairs with resource `commitmentPool` references). When unset, no commitment model is active.
- **`xpTable`** (top-level) — array of `{ level, xp }` pairs for d20-style level-up tables. Read by the renderXpCard sheet section in single-roll mode to compute the experience bar's denominator. PF2e / D&D 5e ship a full 1..20 ladder.

### Boundary: widget surfaces, narrator resolves

The widget reports honest dice-roll data — the Wild Die's face, the explode chain, the critFail flag, the totals — but does NOT auto-apply in-fiction effects. OpenD6 says the GM picks the consequence of a Wild-Die crit-fail (subtract highest other die OR add complication — GM-fiat). The narrator reads the chat tag and resolves. Same for `narrative-handled` mode: the widget rolls, the narrator does the math against the system the `description` field declared.

## Next

Read **04-LOREBOOK-FORMAT.md** for the rules-reference shape, then **05-AGENT-AUTHORING.md** for prompt-writing patterns.
