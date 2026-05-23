# Authoring — Phase 5 / 6 / 7 schema additions

> **Read this when building a new ruleset for Marinara-RPG-Extension** (or updating an existing one). Everything in this doc is **additive on top of** `docs/AUTHORING.md` — the older guide still covers attributes, skills, the four original resolution modes, the agent prompt, the lorebook, and the installer. This file documents everything Phase 5, Phase 6, and the 2026-05 OpenD6-build-remediation round (informally "Phase 7") added.
>
> AI-builder note: paste this file (or the relevant sections) into your chat AI session alongside `AUTHORING-PROMPT.md` when authoring a bundle, so it has the full current schema and not the pre-v0.4 surface.

---

## ⚠️ Before you start — does the schema even support your dice mechanic?

The schema supports the **nine resolution modes listed in section 1 below**. They cover the vast majority of shipping tabletop systems: d20, dice pools, percentile, PbtA, Fate, roll-under, stance-modal pools, OpenD6-family sum-and-compare, and prose-resolved (no dice).

**If your system's dice mechanic isn't one of the nine — don't author it.** Ask Kenhito to add it first. Post in the **Marinara Extension community thread** (linked from the project README; if you can't find the thread, open an issue at the project's GitHub repo) and describe:

1. The system name + the page reference for its core resolution rule
2. The shape of one full roll (dice expression → comparison/sum → outcome)
3. Any special mechanics (exploding dice, opposed rolls, multiple-stat pulls, stance toggles, etc.)
4. Whether existing modes come close (and what specifically breaks if you try to encode under one of them)

Authoring a ruleset that pretends to fit a mode it doesn't fit will produce a sheet/dice-widget that lies to the player and frustrates the GM model. The fix is a schema addition + framework JS work — Kenhito's job, not yours. Schema additions take a few days when scoped right.

---

## 1. Resolution modes — current full list

The `resolution.mode` enum now has **nine** modes. The four original modes still work as documented in `docs/AUTHORING.md`; five additional modes have been added across Phase 5, Phase 6, and the 2026-05 round.

| Mode | Used by | Required sub-fields | Notes |
|------|---------|---------------------|-------|
| `single-roll` | D&D, Pathfinder, Cypher | `modifierFormula` | d20 + mod vs DC |
| `dice-pool` | Exalted, oWoD, Shadowrun | `poolFormula`, `target`, `doubles`, `botches` | Count successes against target |
| `d100-percentile` | Call of Cthulhu, BRP | `skillFormula` | Percentile under skill |
| `2d6-stat` | PbtA games | `modifierFormula`, `bands` | 2d6 + stat with outcome bands |
| `fate-ladder` | Fate Core, Fate Accelerated | `modifierFormula`, `ladder`, `successWithStyle` | 4dF + skill on a verbal ladder |
| `roll-under` | GURPS, CoC 7e, Pendragon | `diceFormula`, `target` source, optional crit/fumble | Total under target = success |
| `stance-modal-pool` | Lasers & Feelings, Stewpot, Trophy Dark | `diceFormula`, `stances`, `target` source, `directionalInvariant` | Player declares a stance per roll; bridge value (LASER FEELINGS) grants both success AND a question |
| **`dice-pool-sum`** | OpenD6, WEG Star Wars, Mini Six | `poolFormula`, `dieSize`, `difficultyHint`, optional `pipsField` + `wildDie` | Roll N dice (typically d6), sum, compare to difficulty. Supports Wild Die explode-on-face cascade. |
| **`narrative-handled`** | Trophy Dark dark-dice (GM-overrules), prose-driven scenes | `description`, optional `noticeText` | No mechanical resolution — GM/narration adjudicates. The widget shows informational text only. |

### `roll-under` shape

```jsonc
"resolution": {
  "mode": "roll-under",
  "diceFormula": "3d6",          // or "1d100" for percentile
  "targetFromSkill": true,        // skill value IS the target (CoC 7e)
  "criticalSuccessFormula": "{target}/5",  // optional; total <= eval => crit
  "criticalFailureThreshold": 96, // optional; total >= int => fumble
  "criticalFailureFormula": null  // OR use a formula (GURPS: margin <= -10)
}
```

**Key invariant:** in roll-under, **higher target = better**. Bonuses raise the target, not the roll.

### `stance-modal-pool` shape

```jsonc
"resolution": {
  "mode": "stance-modal-pool",
  "diceFormula": "Xd6",
  "stances": [
    { "label": "LASERS",   "direction": "under" },
    { "label": "FEELINGS", "direction": "over" }
  ],
  "targetSource": "preparedNumber",   // resolves at run time
  "bridge": { "value": 4, "label": "LASER FEELINGS" },
  "directionalInvariant": "exclusive"   // stances must be strictly directionally opposed
}
```

The widget surfaces the stance selector + the pool size + the prepared number; the player picks a stance per roll. Rolls equal to the bridge value count as both a success AND grant a question. The `directionalInvariant` field exists so the schema can reject malformed stance pairs that would collide.

### `dice-pool-sum` shape

```jsonc
"resolution": {
  "mode": "dice-pool-sum",
  "poolFormula": "{Attribute} + {Skill}",   // dice-count from sheet stats
  "dieSize": 6,                              // typically d6 for OpenD6
  "pipsField": "pips",                       // optional — adds +1/+2 pip granularity
  "difficultyHint": 15,                      // OpenD6 Adventure baseline; per-roll override at widget
  "wildDie": {
    "enabled": true,
    "explodeFace": 6,                        // explode on max face — re-roll and add
    "critFailFace": 1,                       // 1 on Wild Die = GM-fiat complication flag
    "explodeCap": 100                        // safety cap on cascade depth
  }
}
```

The widget shows Pool / Pips / Difficulty inputs and rolls Xd<dieSize>, sums, applies pips, compares to difficulty. When `wildDie.enabled`, one of the dice in the pool is designated the Wild Die and re-rolls on `explodeFace` (cascading until non-max). A Wild Die showing `critFailFace` flags the roll with a `wildFail=true` marker for the narrator to interpret as complication or partial success.

### `narrative-handled` shape

```jsonc
"resolution": {
  "mode": "narrative-handled",
  "description": "Trophy Dark dark dice — GM rules on whether the action succeeds based on fiction.",
  "noticeText": "No mechanical roll. Tell the GM what you're trying and let them adjudicate."
}
```

The widget renders the `noticeText` as informational copy. No dice are rolled. Use sparingly — narrative-handled mode is for systems whose canonical resolution is "the GM decides" (Trophy Dark dark dice, certain freeform scenes). If a system has dice that the schema doesn't yet model, do NOT use `narrative-handled` as an escape valve — that lies about how the system plays. Ask Kenhito to add the mode (see the callout at the top of this doc).

---

## 2. Section dispatcher — `sections.order[]` and `sections.hidden[]`

Plan B v1 added a canonical section dispatcher that wins over the legacy `sheetSections[]` whenever both are declared.

### `sections.order[]`

Ordered list of sections to render. Wider vocabulary than `sheetSections[]`. Recognized values:

`identity` · `xp` · `resources` · `attributes` · `skills` · `derived` · `abilities` · `states` · `intimacies` · `backgrounds` · `inventory` · `notes`

`identity` and `xp` render above the loop unconditionally; listing them in `order` is a no-op (they exist as section IDs for completeness). Unknown entries are silently ignored.

### `sections.hidden[]`

Bare entries hide whole sections. Prefixed entries hide individual items inside a section:

| Prefix | Hides | Example |
|--------|-------|---------|
| *(bare)* | the whole section | `"states"` hides the entire States section |
| `derived:<Name>` | one derived stat from the DERIVED POOLS section | `"derived:Personal Motes"` hides motes from derived (they appear in Resources instead) |
| `state:<Name>` | one state from the STATES section | `"state:Anima Banner"` hides Anima Banner from States (it appears in Resources via a `state-banner` type instead) |

Exalted's canonical use:

```jsonc
"sections": {
  "order": ["identity", "xp", "resources", "attributes", "skills", "derived",
            "abilities", "states", "intimacies", "backgrounds", "inventory", "notes"],
  "hidden": [
    "derived:Personal Motes",
    "derived:Peripheral Motes",
    "derived:Willpower",
    "derived:Health Track",
    "state:Anima Banner"
  ]
}
```

**Legacy `sheetSections[]` still validates** for pre-Plan-B rulesets. When `sections.order` is present, the renderer uses it; otherwise it falls back to `sheetSections`, then to a hardcoded default. Do not ship both unless you're testing a migration.

---

## 3. `derivedStats[]` — autocalc, tooltip math, card grid

Phase 5 added autocalc; Phase 6 added the DERIVED POOLS card grid that replaces the legacy row layout for `renderAs: "value"` entries. The shape of a derivedStat is now richer:

```jsonc
{
  "name": "Defense (Parry)",
  "renderAs": "value",                  // "value" | "bar" | "track"
  "formula": "(Dexterity + Melee) / 2, round up; armor and Charms apply",
  "valueFormula": "({Dexterity} + {Melee} + 1) / 2",   // Phase 5 — autocalc
  "tooltipFormula": "({Dexterity} + {Melee} + 1) / 2", // Phase 5 — breakdown
  "formulaShort": "(DEX + Melee) / 2",  // Phase 6 — compact token form for card
  "rollFormula": "{Initiative}",        // Phase 5 — single-roll mode only
  "max": 10,                            // optional cap
  "maxFormula": "{Essence} * 3 + 10",   // optional dynamic cap
  "default": 0,                         // initial value on a fresh sheet
  "aliases": ["parry", "parryDefense"]  // accepted in state-mutator tags
}
```

### Field semantics

- **`formula`** — plain-language description for the GM and players. Not parsed.
- **`valueFormula`** — token-substituted arithmetic expression evaluated against `statContext()`. When present, the card displays the computed value with no edit input (autocalc). Tokens: `{StatName}` for any attribute / skill / derived value, `{bonuses:Key}` for equipped-bonus aggregates targeting that key. Floored to integer.
- **`tooltipFormula`** — same syntax as `valueFormula`. When `valueFormula` is absent but `tooltipFormula` is present, tooltipFormula drives BOTH the displayed value and the hover-tooltip breakdown. When both are present, valueFormula drives the value and tooltipFormula drives the breakdown string.
- **`formulaShort`** — compact token form for the card's faint formula line. Preferred for display when the verbose `formula` would overflow the card. Example: `"(DEX + Dodge) / 2"` rather than `"(Dexterity + Dodge) / 2, round up; armor penalty applies"`.
- **`rollFormula`** — declares that the autocalc card should show a `roll` button (single-roll mode only). The formula evaluates to the modifier added to a d20 roll. Pool / fate / under modes ignore this field — those modes use their own widgets.
- **`max` / `maxFormula`** — cap for `bar`-type derived stats. The bar tops out here; the player's stored value is clamped on render if the formula reduces below it (e.g. Essence decreasing shrinks the motes max).
- **`default`** — initial value baked into a fresh sheet. Skipping it defaults to 0.
- **`aliases`** — extra names the state-mutator chat-tag parser accepts. The LLM can emit `[mrr-state: field="parry" delta=-1]` and it lands on `Defense (Parry)`.

### Rendering

- `renderAs: "value"` → 2-column DERIVED POOLS card grid (Phase 6). Auto-calc cards show the computed value in color-accent; manual cards show an inline stepper.
- `renderAs: "bar"` → full-width fillable bar above the card grid.
- `renderAs: "track"` → typed-damage cell row (Exalted Health Track style); each cell needs `{ label, penalty }` and the parent declares `damageTypes[]` for severity ordering.

### Bonuses contribution

Auto-calc cards display an additive bonus from equipped items targeting the derived stat's name. Items declare bonuses as:

```jsonc
"bonuses": [
  { "target": "Bashing Soak", "value": 3, "kind": "value", "tag": "armor" }
]
```

`kind: "value"` adds to the visible number; `kind: "dice"` adds to dice pools (only relevant where the system rolls the stat). The card's bonus span auto-updates whenever an item is equipped, unequipped, or edited.

---

## 4. `resources[]` — the Resources cluster (Plan B v1)

A new top-level array on the ruleset that drives the Resources cluster (rendered at the `resources` slot in `sections.order`). Use it for any pool / counter / state that the player needs to see ABOVE the attributes block: HP, motes, willpower, blood pool, hit dice, fate points, anima banner, etc.

```jsonc
"resources": [
  {
    "id": "motes-personal",          // kebab-case, stable identifier
    "label": "Motes Personal",        // display label
    "type": "bar",                    // see "Types" below
    "max": "{Essence} * 3 + 10",      // integer OR token formula
    "current": "{Essence} * 3 + 10",  // default starting value
    "color": "accent",                // "ok" | "warn" | "bad" | "accent"
    "stateName": "Personal Motes",    // optional — legacy state binding
    "commitmentPool": "Personal",     // optional — Phase 6 mote commit
    "group": "Spell Slots: Level 1",  // optional — adjacent same-group resources cluster
    "quickButtons": [
      { "label": "-1", "delta": -1 },
      { "label": "-5", "delta": -5 },
      { "label": "Full", "delta": "max" }   // "max" = refill to (formula_max - committed)
    ]
  }
]
```

### Types

| Type | Visual | When to use |
|------|--------|-------------|
| `bar` | horizontal fill bar, current/max, auto color by fill % | Motes, HP, willpower, blood pool |
| `dice` | row of clickable dice glyphs (uses `die` field) | D&D Hit Dice |
| `counter` | -/+ stepper with current/max | Essence rating, sorcerous motes |
| `pool` | current/max display with quick-buttons | Storyteller-style willpower / WP |
| `custom` | named renderer via `rendererConfig.component` | Exalted Health Track (component: `exalted-health-track`) |
| `state-banner` | cycle-button pill that surfaces a state inline | Anima Banner inline in Resources |

### `stateName` — legacy-state binding

When a resource declares `stateName`, the renderer reads and writes `state.sheet.derived[stateName]` instead of the new `state.sheet.resources[id].current` store. Required for resources whose values the state-mutator chat-tag parser must reach (`[mrr-state: field="Personal Motes" delta=-3]` writes there). It also inherits the `mergeSheet` `derived` whitelist for free persistence.

**Always set `stateName` for any resource the LLM is expected to spend from** — motes, willpower, blood pool, hit dice. Without it, the LLM's spend tags go to `state.sheet` root and have no effect.

### `stateRef` — for `type: "state-banner"`

Names the state in `states[]` that this banner mirrors. The renderer cycles through the state's `values[]` on click and reads/writes `state.sheet.states[stateRef]`. List the parent state in `sections.hidden` as `"state:<Name>"` to avoid double-rendering.

```jsonc
{
  "id": "anima-banner",
  "label": "Anima Banner",
  "type": "state-banner",
  "stateRef": "Anima Banner",
  "color": "accent"
}
```

### `commitmentPool` — Phase 6 mote commitment

When set (and the ruleset's `commitmentModel` is `"mote"`), the resource's effective max is reduced live by the sum of `moteCommitment` from equipped items whose `motePool` matches this value. The render-time reconciler also adjusts the spendable saved value on every commit / uncommit / slot-replacement / item-delete through one code path — equipping a charm-bound artifact locks the motes and unequipping releases them, no double-deduct on re-render.

Typical values: `"Personal"` or `"Peripheral"` for Exalted.

```jsonc
{
  "id": "motes-personal",
  "label": "Motes Personal",
  "type": "bar",
  "max": "{Essence} * 3 + 10",
  "stateName": "Personal Motes",
  "commitmentPool": "Personal"
}
```

### `quickButtons[]`

Preset deltas rendered alongside the resource for one-click adjustments. Each is `{ label, delta }`.

- `delta` integer = additive (clamped to `[0, effectiveMax]`)
- `delta: "max"` = refill to effective max (formula_max minus committed motes if `commitmentPool` is set)

`"Full"` with `delta: "max"` is the canonical "rest / restore" button. It does NOT release committed motes — only spent ones are refilled.

### `rendererConfig` — for `type: "custom"`

Free-form blob consumed by a named renderer registered in the extension. Example for Exalted's extensible health track:

```jsonc
{
  "id": "health-track",
  "label": "Health Track",
  "type": "custom",
  "color": "bad",
  "rendererConfig": {
    "component": "exalted-health-track",
    "levels": [
      { "label": "-0", "penalty": 0 },
      { "label": "-1", "penalty": -1 },
      { "label": "-1", "penalty": -1 },
      { "label": "-2", "penalty": -2 },
      { "label": "-2", "penalty": -2 },
      { "label": "-4", "penalty": -4 },
      { "label": "Inc", "penalty": -99 }
    ],
    "damageTypes": [
      { "id": "bashing", "label": "B", "severity": 0 },
      { "id": "lethal", "label": "L", "severity": 1 },
      { "id": "aggravated", "label": "A", "severity": 2 }
    ]
  }
}
```

Component name MUST be one the extension has registered (`mrr_resourceRenderers[<name>]`). Unknown component names render a placeholder pill so the missing renderer is visible at install time.

---

## 5. `commitmentModel` — magic-binding mechanic

Top-level ruleset field declaring how items bind to characters. Three flavors plus null:

| Value | Used by | Mechanic |
|-------|---------|----------|
| `"attuned"` | D&D 5e | Boolean per item; cap of 3 attuned items at once |
| `"invested"` | Pathfinder 2e | Boolean per item; cap of 10 invested items at once |
| `"mote"` | Exalted | Integer `moteCommitment` per item + `motePool` selection (Personal or Peripheral); committed motes are locked from the named pool while the item is equipped |
| `null` *(default)* | Fate, narrative systems | No commitment mechanic; the inventory editor hides the commitment section |

The cast button (`Cast` on ability rows) auto-deducts cost from the sheet based on `commitmentModel`:

- `mote` → parses `"Xm"` / `"X mote"` and `"Xwp"` / `"X willpower"` from the ability's `costText`; deducts from Peripheral first (overflow → Personal) for motes; deducts from Willpower for wp.
- `attuned` → binary, no spend on cast (attunement IS the cost).
- *(no model)* → tries `"Xb"` / `"X blood"` against `Blood Pool` (V20 pattern), else no-op.

After deduction, the cast tag (`[mrr-cast: name="..." discipline="..." rating="..." cost="..."]`) is injected directly into the chat input via `insertIntoChatInput`. For pool-mode rulesets, the dice widget also opens pre-seeded with the discipline rating in the Pool input.

---

## 6. Items — natural ratings and equipped bonuses

Items in `state.sheet.inventory` are runtime-created via the in-extension dialog or via the state-mutator chat-tag parser. Authors don't ship inventory in the ruleset, but the **GM agent prompt** should know what fields the parser accepts and what they do.

Canonical item shape (only the Phase 5+6-relevant fields):

```jsonc
{
  "id": "item-123",
  "name": "Reinforced Buff Jacket",
  "slot": "armor",                  // slot name, controls equip target
  "category": "equipment",          // "equipment" (slot-equippable) | "item" (consumable / stored)
  "damage": "—",
  "hardness": 5,                    // Phase 6 — auto-flows into Hardness derived stat
  "overwhelming": 0,
  "moteCommitment": 3,              // mote-model: integer cost
  "motePool": "Personal",           // mote-model: "Personal" or "Peripheral"
  "attuned": false,                 // attuned-model
  "invested": false,                // invested-model
  "bonuses": [
    { "target": "Bashing Soak", "value": 3, "kind": "value", "tag": "armor" }
  ]
}
```

### `item.hardness` — auto-inheritance (Phase 6)

The top-level `item.hardness` integer flows automatically into the `Hardness` derived stat's bonus aggregate via `equippedBonuses("Hardness")`. The Hardness card shows it as a `+N` contribution with the item name in the tooltip, tagged `"natural"`. Authors do NOT need to add a redundant `bonuses[]` entry for hardness — `item.hardness` IS the source of truth.

If your ruleset has a similar Hardness-style stat under a different name, you can either:
- Use the same auto-inheritance by adding an explicit `bonuses[]` entry of `{ target: "<your stat>", value: <amount>, kind: "value" }` in the GM agent's item-creation tag format, OR
- Open a PR to extend `equippedBonuses()` with another auto-flow for a different per-item field.

### `item.moteCommitment` + `item.motePool` — commitment

When `commitmentModel === "mote"` and a player toggles an item equipped, the render-time reconciler:

1. Computes `liveCommitted = sum of moteCommitment from equipped items where motePool matches the pool`.
2. Compares against the side-table `state.sheet.committedMotes[pool]` (previous render's value).
3. Applies `delta = liveCommitted - oldCommitted` to the spendable pool current.

Result: equipping locks the motes; unequipping releases them; slot-replacement releases the displaced item's commit; `"Full"` quick-button refills only spent motes (committed stay committed); multi-item commitment accumulates correctly.

**GM agent guidance:** when emitting an inventory-add tag for a charm-bound artifact, set both `mote_commitment` and `mote_pool`:

```
[mrr-state: field="inventory" add="Wave-Cutter" slot="weapon" damage="3L"
             mote_commitment="3" mote_pool="Peripheral"
             notes="Five-metal shrike, Solar daiklave"]
```

### State-mutator field reference

The state-mutator agent's prompt is auto-generated by the extension and lists every recognized `field=` token (attributes, skills, derived, plus the special `xp`, `intimacies`, `attunement`, `investiture`, `commitment` tokens that match the ruleset's commitmentModel). The agent does NOT need to memorize these — the extension surfaces them in a lorebook entry titled `"Field Reference (extension-managed)"` that the narrator's lorebook resolver pulls in every turn via `constant: true`.

---

## 7. `states[]` — vocabulary unchanged; one new integration

The `states[]` shape from earlier docs still applies. Phase 6 adds **one integration**: a state can be surfaced inline in Resources via a `type: "state-banner"` entry. When you do this:

1. Declare the state normally in `states[]`.
2. Add a `state-banner` resource in `resources[]` with `stateRef: "<state name>"`.
3. Add `"state:<state name>"` to `sections.hidden` so it doesn't double-render in STATES.

Exalted's Anima Banner is the canonical case. The cycle pill in the Resources cluster reads/writes the same `state.sheet.states["Anima Banner"]` value the STATES section would have edited; the dropdown stays in DOM for keyboard accessibility but is visually hidden.

### Per-tier banner styling

If your state-banner uses values like Suppressed → Dim → Glowing → Burning → Bonfire → Iconic, the CSS has per-tier color hooks: `.mrr-state-banner__pill--<slug>` where the slug is lowercase non-alphanumeric-to-dash. Suppressed/None get a neutral dim look; Bonfire/Iconic get accent glow. Add custom CSS in your bundle's stylesheet path if you want different tiers.

---

## 8. `pipGranularity` — sub-die precision (OpenD6 family)

OpenD6 and its descendants (WEG Star Wars, Mini Six) use a `NDX+P` notation where each pip is 1/3 of a die. Two pips raise to the next die at character-creation, but at runtime pips are a flat additive bonus to the rolled sum (not converted to dice).

Per-attribute and per-skill, declare:

```jsonc
{
  "name": "Dexterity",
  "min": 1,
  "max": 10,
  "default": 2,
  "pipGranularity": {
    "pipsPerDie": 3,           // 3 pips = 1 die (OpenD6 canon)
    "pipsField": "dex_pips"    // sheet field name carrying the +pips integer
  }
}
```

The dice widget reads the `pipsField` value at roll-time and adds it to the rolled sum before the difficulty comparison. Pair with `resolution.pipsField` at the top level so the widget knows where to look.

---

## 9. `effects.onSpend` — derivedStat spend-driven bonuses

For systems with a spendable resource that buys a roll-time bonus (OpenD6 Character Points, GURPS Energy Reserve, etc.), declare on the derivedStat:

```jsonc
{
  "name": "Character Points",
  "renderAs": "value",
  "default": 5,
  "effects": {
    "onSpend": {
      "addDice": 1,        // each point spent adds 1 die to the pool
      "doubleDice": false, // OR set true to double the pool (Hero Point style)
      "addPip": 0          // OR add N pips instead of a full die
    }
  }
}
```

The widget surfaces a "Spend N?" prompt when the resource is non-zero and the roll opens. Picking a value deducts the resource and applies the bonus. (Widget UX wiring is currently Task #5 — schema declaration ships now; runtime prompt is deferred.)

---

## 10. `roundCounters[]` — ephemeral per-round counters

For systems with combat penalties that reset every round (OpenD6 multi-action `-(N-1) dice`, Mini Six rate-of-fire), declare:

```jsonc
"roundCounters": [
  {
    "id": "action-penalty",
    "name": "Action Penalty",
    "max": 5,
    "resetOn": "next-round",       // or "end-of-encounter"
    "penaltyFormula": "-(N - 1) dice"   // reference text for now
  }
]
```

The `combat-overseer` agent's "round ended" signal triggers the framework to zero `resetOn: "next-round"` counters. (Auto-apply of `penaltyFormula` to roll pools is Task #5 — currently the gm-agent.md should instruct the narrator to apply the penalty by hand.)

---

## 11. `derivedStats[].track[].penaltyKind` — flat vs dice penalties

Health/wound tracks can declare per-cell penalties as either flat numeric (D&D-style wound levels) or dice reductions (OpenD6-style):

```jsonc
"track": [
  { "label": "-0", "penalty": 0 },
  { "label": "-1D", "penalty": 1, "penaltyKind": "dice" },   // -1 die from rolled pool
  { "label": "-2D", "penalty": 2, "penaltyKind": "dice" },
  { "label": "Incapacitated", "penalty": 99, "penaltyKind": "flat" }
]
```

Default `penaltyKind` is `"flat"` (subtracts from the success count / sum). When `"dice"`, the dice widget subtracts dice from the pool before rolling. (Renderer support for `penaltyKind: "dice"` is currently Task #5 — schema ships now; visual differentiation deferred.)

---

## 12. `abilities.groups[]` — skill subgrouping (V20 trinity / W20 / D&D-by-attribute)

Some systems group their skills into named buckets for chargen, XP, and visual organization. V:TM V20 splits its 30 abilities into Talents / Skills / Knowledges (10 each). W20, M20, and other Storyteller systems inherit this trinity. D&D could group by linked attribute (Strength skills, Dexterity skills, etc.).

Declare under the `abilities` ruleset object — the `groups` field sits next to the existing `label` and `categories` fields (which still drive the abilities/charms/disciplines flyout — separate concern):

```jsonc
"abilities": {
  "label": "Disciplines",     // for the abilities flyout
  "groups": [
    {
      "id": "talents",
      "label": "Talents",
      "members": ["Alertness", "Athletics", "Awareness", "Brawl", "Empathy",
                  "Expression", "Intimidation", "Leadership", "Streetwise", "Subterfuge"]
    },
    {
      "id": "skills",
      "label": "Skills",
      "members": ["Animal Ken", "Crafts", "Drive", "Etiquette", "Firearms",
                  "Larceny", "Melee", "Performance", "Stealth", "Survival"]
    },
    {
      "id": "knowledges",
      "label": "Knowledges",
      "members": ["Academics", "Computer", "Finance", "Investigation", "Law",
                  "Medicine", "Occult", "Politics", "Science", "Technology"]
    }
  ],
  "categories": [ /* disciplines for the abilities flyout — separate from groups */ ]
}
```

`members[]` names must match `skills[].name` exactly. The framework renders each group's skills under a subheader with the group's `label`. Skills NOT listed in any group render under an implicit "Other" subheader at the end (safety net).

Rulesets that omit `abilities.groups` render their skills as a flat list (legacy behavior). No regression.

---

## 13. Merits & Flaws section (`meritsFlaws`)

For V20 / W20 / M20 and other systems with a Merits-and-Flaws block, add `"meritsFlaws"` to `sections.order[]` between `"backgrounds"` and `"inventory"`:

```jsonc
"sections": {
  "order": [..., "backgrounds", "meritsFlaws", "inventory", "notes"]
}
```

No top-level schema fields are needed — the section is rendered with a built-in renderer that uses the V20 canon vocabulary (type: Physical / Mental / Social / Supernatural; points: 1-7). Storage: `state.sheet.meritsFlaws[]` with `{id, kind: "merit"|"flaw", name, type, points}`. The section is generic in name (meritsFlaws), not V20-locked — any system using the same pattern can reuse it.

---

## 14. Quick checklist for a current-schema-aware bundle

When authoring a new ruleset, walk through this list:

- [ ] **Resolution mode** picked from the **nine-mode list** in section 1. **If your system doesn't fit any of the nine, stop — ask Kenhito first (see callout at top of this doc).**
- [ ] **`sections.order[]`** declared with the full section vocabulary, including `meritsFlaws` if applicable (not just `sheetSections`).
- [ ] **`resources[]`** populated for every pool / counter / status the player needs to see above attributes. Each `stateName`-bound for LLM compatibility where applicable.
- [ ] **Mote-commit systems** declare `commitmentModel: "mote"` AND tag each pool resource with `commitmentPool: "Personal"|"Peripheral"`.
- [ ] **State banners** (Anima Banner, similar) use `type: "state-banner"` + `sections.hidden: ["state:<Name>"]`.
- [ ] **Derived stats** use `valueFormula` for auto-calc, `formulaShort` for the card's compact token line, `rollFormula` for single-roll roll buttons.
- [ ] **OpenD6-family rulesets** declare `pipGranularity` on every attribute / skill, plus a top-level `resolution.pipsField`, plus a `wildDie` block on `resolution`.
- [ ] **Spend-driven bonuses** use `derivedStats[].effects.onSpend.{addDice|doubleDice|addPip}` on the resource stat.
- [ ] **Per-round combat penalties** (multi-action, RoF) use `roundCounters[]` with `resetOn: "next-round"`.
- [ ] **Wound tracks with dice penalties** (OpenD6) declare `penaltyKind: "dice"` on the relevant cells.
- [ ] **V20-style trinity grouping** declares `abilities.groups[]` with `id`, `label`, `members` per group.
- [ ] **Merits/Flaws section** added to `sections.order` between `backgrounds` and `inventory` where the system uses one.
- [ ] **Items** in the GM agent's inventory-tag examples include `hardness`, `mote_commitment`, `mote_pool` where the system uses them.
- [ ] **`validate-ruleset.mjs`** passes for the new bundle.
- [ ] **`build-bundle.mjs`** assembles the bundle.json successfully.

---

## 15. Pointers

- Live schema: `schema/ruleset.schema.json` — the JSON Schema is the source of truth; this doc is the prose explanation.
- Reference bundles: `rulesets/exalted3e/` uses every Phase 5+6 feature (mote commit, state-banner, sections.hidden, valueFormula derived, custom health-track renderer).
- Pre-v0.2 single-paste prompt: `AUTHORING-PROMPT.md` — still works for legacy authoring; reference this file for the Phase 5+6 additions.
- Engine constraints: `docs/ENGINE-CONSTRAINTS.md` — Marinara-side limits that bound what the overlay can do.
