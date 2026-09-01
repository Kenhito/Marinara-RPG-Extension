# Authoring a new ruleset

> **THIS IS THE CANONICAL BUILD PATH.** To produce a new ruleset a user can import, follow Steps 1–8 below in order — every step names its exact command and what success looks like. The companion docs are references you'll be pointed into when a step needs them: [`docs/BUILDING.md`](BUILDING.md) (the generator-pipeline contract and full field semantic map), [`docs/AUTHORING-PHASE-6.md`](AUTHORING-PHASE-6.md) (deep dive on the Phase 5/6/7 schema additions — Resources cluster, autocalc derived stats, `commitmentModel`, the five later resolution modes), and [`docs/ADDING-RULESETS.md`](ADDING-RULESETS.md) (the decision tree, plus the new-resolution-mode recipe, which is maintainer work). Item fields (`hardness`, mote commitment, and every other per-system gear number) are declared through the `inventory` grammar in **Step 3b** below — the older "auto-inheritance" model AUTHORING-PHASE-6 §6 used to describe is superseded.
>
> **If you are an AI authoring a bundle:** this file plus `schema/ruleset.schema.json` plus one reference ruleset directory (`rulesets/dnd5e/` or `rulesets/exalted3e/`) is the complete required reading. Where this doc and the schema disagree, the schema wins. Do not invent fields — the schema rejects unknown keys (`additionalProperties: false`), so every key you write must already exist there.

This guide walks through adding a new ruleset to this repo (seventeen ship today). Time budget: ~2 hours for a rules-light system, ~1 day for a full mid-weight one.

## Anatomy of a ruleset bundle

```
rulesets/your-system/
├── ruleset.json     # SOURCE — the data spec; the system of record you edit
├── gm-agent.md      # SOURCE — the GM prompt (the FIRST fenced code block is what ships; see Step 5)
├── lorebook.json    # SOURCE — keyword-triggered rules reference
├── INSTALL.md       # SOURCE — user-facing install walkthrough
├── agents/          # SOURCE, optional — per-ruleset overrides of the shared agents/ prompts
├── bundle.json      # BUILT — what the user actually imports; generated, never hand-edited
└── agents.json      # BUILT — the agent set; generated, never hand-edited
```

**You edit the SOURCE files; the build generates the BUILT ones.** `bundle.json` is the single file a user imports through the Ruleset dialog — it embeds the ruleset, the lorebook, the GM prompt, and the agents in one artifact. Never edit `bundle.json` or `agents.json` by hand: the next build overwrites them, and `npm run check:freshness` fails any release where built artifacts don't match source. `ruleset.json` is the machine-validated file; the prompts and lorebook are validated structurally at bundle level.

## Step 1 — choose a resolution mode

The schema's `resolution.mode` enum has **nine** modes. The four first-class modes documented here cover the most common cases; the other five (added across Phases 5, 6, and the 2026-05 OpenD6-build-remediation round) are documented in **[`docs/AUTHORING-PHASE-6.md`](AUTHORING-PHASE-6.md)** section 1. That same section also covers `resolution.additionalModes[]` (B18, restricted round 9) — a ruleset is no longer limited to one mode FOR `dice-pool`/`roll-under` mechanics specifically (the only two modes wired so far); a game that mixes a primary mode with one of those two (a d20 combat game with a percentile roll-under skill subsystem, say) can declare named alternates and bind specific skills/derived stats to them via `resolutionId`.

| Mode | Used by | Required sub-fields | Documented in |
|------|---------|---------------------|---------------|
| `single-roll`     | D&D, Pathfinder, Cypher System | `modifierFormula` | this doc |
| `dice-pool`       | Exalted, oWoD/nWoD, Shadowrun  | `poolFormula`, `target`, `doubles`, `botches` | this doc |
| `d100-percentile` | Call of Cthulhu, BRP-derived (roll-under); Rolemaster-family (roll-high, optional open-ended) | `skillFormula`; optional `direction`, `bonusFormula`, `openEnded` | this doc; open-ended shape in AUTHORING-PHASE-6 §1 |
| `2d6-stat`        | PbtA (Apocalypse, Dungeon, Monster of the Week) | `modifierFormula`, `bands` | this doc |
| `fate-ladder`     | Fate Core, Fate Accelerated | `modifierFormula`, `ladder`, `successWithStyle` | AUTHORING-PHASE-6 §1 |
| `roll-under`      | GURPS, CoC 7e, Pendragon | `diceFormula`, target source, optional crit/fumble | AUTHORING-PHASE-6 §1 |
| `stance-modal-pool` | Lasers & Feelings, Stewpot, Trophy Dark | `diceFormula`, `stances`, target source, `directionalInvariant` | AUTHORING-PHASE-6 §1 |
| `dice-pool-sum`   | OpenD6, WEG Star Wars, Mini Six | `poolFormula`, `dieSize`, `difficultyHint`, optional Wild Die | AUTHORING-PHASE-6 §1 |
| `narrative-handled` | Trophy Dark dark dice, prose-resolved scenes | `description`, optional `noticeText` | AUTHORING-PHASE-6 §1 |

**`d100-percentile` optional fields.** `direction` defaults to `"under"` (success when the roll is at or under the target); `direction: "high"` switches the widget to roll d100 + bonus vs a target and report a **total** rather than a pass/fail, which is what Rolemaster / RMSS-family systems need. `bonusFormula` is a plain-language description of what the player adds to a `"high"` roll — **descriptive only; the widget takes the bonus as a numeric input and does not parse the string.** `openEnded` is the optional exploding / imploding chain (absent = off): `high.threshold` (default 96) re-rolls and ADDS, `low.threshold` (default 5) triggers the low chain with `low.subtract` (default `true`) and `low.continueOn` (default `"high"` — RMSS's low chain is asymmetric and extends while each new roll is at or **above** `high.threshold`), each chain capped independently by `cascadeCap` (default `0` = uncapped). `openEnded.unusualFaces` is an optional list of UNMODIFIED-first-roll faces (RMSS: `[66, 100]`) that flags `um=<face>` on the dice tag — no default, so omitting it means no `um=` is ever emitted; the widget only **surfaces** the flag, never picks a table row and never suppresses the roll, and **the narrator decides what an UM means.** Full shape and a worked example: [`AUTHORING-PHASE-6.md`](AUTHORING-PHASE-6.md) §1.

**If your system's dice mechanic doesn't fit any of the nine modes — STOP.** Don't encode it under the closest one (that produces a sheet/widget that lies to the player). Ask Kenhito in the **Marinara Extension community thread** (linked from the project README) or open an issue at the project's GitHub repo so the mode (or schema extension) can be added properly. Schema additions are Kenhito's job, not yours.

## Step 2 — copy a starting bundle

Pick the existing bundle whose mode matches.

Linux / macOS:

```bash
cp -R rulesets/dnd5e rulesets/your-system        # for single-roll
cp -R rulesets/exalted3e rulesets/your-system    # for dice-pool
cp -R rulesets/fate-core rulesets/your-system    # for fate-ladder
```

Windows (PowerShell):

```powershell
Copy-Item -Recurse rulesets/dnd5e rulesets/your-system        # for single-roll
Copy-Item -Recurse rulesets/exalted3e rulesets/your-system    # for dice-pool
Copy-Item -Recurse rulesets/fate-core rulesets/your-system    # for fate-ladder
```

Or cross-OS via Node:

```bash
node -e "require('fs').cpSync('rulesets/fate-core', 'rulesets/your-system', {recursive: true})"
```

Edit `id`, `name`, `version`, `edition`, `summary`. Make `id` kebab-case and unique.

## Step 3 — fill in the spec

### Attributes

Each attribute is `{ name, abbreviation?, group?, min, max, default? }`. The `group` field controls how the sheet groups them (e.g. "Physical" / "Social" / "Mental" for Storyteller systems, or you can leave it blank for a flat list).

### Skills

Each skill is `{ name, linkedAttribute?, min, max, default? }`. For systems where the skill always pairs with the same attribute (D&D), set `linkedAttribute`; the extension's "roll" button uses it. For systems where the GM picks the attribute per check (Exalted), omit it — the player is prompted at roll time.

### Derived stats

Each derived stat has `{ name, formula, renderAs, max?, track? }`.

- `renderAs: "value"` — plain number with +/- steppers.
- `renderAs: "bar"` — fillable bar from 0 to `max` (motes, willpower).
- `renderAs: "track"` — array of cells (Exalted health track). Each cell needs `{ label, penalty }`. The penalty in effect equals the highest filled cell.

The `formula` field is plain language for the GM to read, not executable code. The extension does not parse it.

### States

Stateful selectors (Anima Banner, Stunt Tier, D&D conditions). Each state has `{ name, values[] }` and each value has `{ label, description?, trigger? }`.

### Difficulties

Map of label -> `{ threshold, description? }`. For `single-roll` this is the DC; for `dice-pool` it's the success count needed.

### Dice tag format

`diceTagFormat.template` is the string the GM model is told to emit. It uses `{name}` placeholders. The extension's roller reproduces this format when the user clicks **Send to chat**.

`diceTagFormat.example` is the concrete example shown in the GM agent prompt.

### Sheet sections

`sheetSections` is an ordered array of section keys. Recognized values: `attributes`, `skills`, `derived`, `states`, `inventory`, `charms`, `notes`. Sections you don't list won't render. `inventory` is fully implemented — the extension renders an item dialog and (per Step 3b below) an optional declaration grammar for ruleset-specific item fields; `charms` and `notes` remain simple free-text/keyword sections.

### Step 3a — rests & house-rule levers (systems with recovery mechanics)

Declaring `rests[]` is opt-in: a system with no meaningful "rest" verb (or one where refills are rate-based or fiction-gated — sanity, blood pools, mote respiration) should simply omit it, and no rest button renders. Do **not** shoehorn a Long Rest into a system whose recovery isn't a one-click event.

```json
"rests": [
  {
    "id": "long-rest",
    "label": "Long Rest",
    "tier": "long",
    "restore": [
      { "resource": "hit-points", "amount": "all" },
      { "resource": "hit-dice", "amount": "half-down-min-1",
        "lever": {
          "name": "HitDiceRefresh",
          "label": "Hit Dice on Long Rest",
          "doc": "RAW (half): regain hit dice up to half your maximum, round down, minimum 1. House rule (full): regain all hit dice.",
          "values": { "half": "half-down-min-1", "full": "all" },
          "default": "half"
        } }
    ],
    "reset": [
      { "derivedKeys": ["Temp HP", "Temporary Hit Points"], "value": 0, "label": "Temp HP" }
    ]
  }
]
```

Rules that keep this safe: `amount` is a **closed enum** (`all`, `half-down-min-1`, or a non-negative integer) — an unknown name is a validation error, never a silent skip. `restore` is "up to", never "set to": a current value above max is never reduced. `reset` keys match against `sheet.derived` with if-present semantics — a rest never *creates* state the narration didn't. A `long`-tier rest also applies every `short`-tier rest's restores (the superset rule — this is how warlock-style short-rest slots come back on a long rest); on a shared resource the clicked rest's own rule wins. **Every consumable resource in your system should be claimed by exactly one recovery rule or deliberately left unclaimed with a comment** — an unclaimed consumable silently never recharges.

Declaring a `lever` makes it appear in the extension's Ruleset dialog under House Rules. `default` names the RAW behavior; the entry that stores departures is created lazily, per system, and follows this **normative v1 grammar** (hand-authored entries matching it are adopted as-is):

```
House Rules for <System Name> - apply only when running <System Name>.
MRR-HOUSERULES v1 system=<ruleset-id>
--- LEVERS (machine-read - mechanical) ---
HitDiceRefresh: full
--- END LEVERS - table notes below change narration, never numbers ---
TABLE NOTES (GM-read - narrative only; notes here change narration, never numbers):
<free prose>
```

Grammar rules, all fail-closed: the `MRR-HOUSERULES v1 system=<id>` header line is mandatory and matched exactly — `<id>` is the lowercase `[a-z0-9-]` ruleset id, never fuzzy- or prefix-matched, one system per entry (want a rule in two systems? duplicate the entry). Lever lines are `Name: value`, one per line, between the two sentinel lines verbatim; anything outside the sentinels is never parsed as config. An absent entry, an unknown lever value, a mismatched system stamp, or an unparseable entry all resolve to the declared `default` — and readers ignore unknown lever *names* (forward compatibility). Because the header carries the id, **ruleset ids must be unique across bundles you ship together**; a fork that reuses an id will read the original's house rules as its own.

Also append the House Rules doctrine section to your `gm-agent.md` (copy it from any shipped system, swapping the id) so your GM knows the enforcement boundary and the signpost behavior.

### Step 3b — equipment & item field declarations

Declaring `inventory` is opt-in, same posture as `rests[]` above: a system whose gear doesn't carry ruleset-specific numbers should simply omit it, and the item dialog falls back to its generic fields only (name, category, quantity, notes, bonuses[], equipped, description — see COMMON CORE below). Two shipped systems, `stewpot` and `lasers-and-feelings`, deliberately declare nothing for exactly this reason — don't invent a Dex-cap field for a system that has no armor-class concept.

```json
"inventory": {
  "version": 1,
  "namePlaceholder": "Longsword +1",
  "fields": [
    {
      "id": "acBase",
      "label": "Base AC",
      "type": "number",
      "appliesTo": ["Armor"],
      "min": 0,
      "bonusKind": "replace-base",
      "bonusTarget": "Armor Class",
      "promptVisible": true,
      "help": "The AC this armour sets before Dexterity — leather 11, chain shirt 13, plate 18."
    },
    {
      "id": "acDexCap",
      "label": "Dex Cap",
      "type": "number",
      "appliesTo": ["Armor"],
      "min": 0,
      "capsToken": "Dexterity_mod",
      "promptVisible": true,
      "help": "Maximum Dexterity bonus this armour allows. Light armour: leave blank. Medium: 2. Heavy: 0."
    }
  ]
}
```

`inventory` is a container object, `version: 1` (const, required) plus an ordered `fields[]` array (required). Two optional container-level fields: `label` — the on-sheet section title, defaults to "EQUIPMENT" when absent — and `namePlaceholder` — per-ruleset placeholder text for the item-name input in the dialog (Exalted's `"Daiklave of Glory"` vs D&D's system-neutral default), following the same pattern as `backgrounds.label`.

Each entry in `fields[]` is one declared item field, rendered in the item dialog and, where `promptVisible`, emitted into the injected agent sheet block for equipped items. The full grammar (source of truth: `schema/ruleset.schema.json`'s `properties.inventory`):

- **`id`** (required) — stable storage key on the item object, pattern `^[a-z][a-zA-Z0-9]*$` (camelCase). **NEVER rename** — stored item field values orphan if the id changes, the same NEVER-rename contract every other stable id in this schema carries. Need to rename for clarity? Add the old name to `aliases[]` instead (see below) — the new `id` becomes the write target, the old name still reads.
- **`label`** (required) — dialog label / sheet chip label.
- **`type`** (required) — one of `number`, `text`, `boolean`, `enum`, `dice`. Closed set; drives both the dialog's renderer and the state-mutator's parser dispatch.
- **`appliesTo`** — array of equipment slot names this field shows for in the item dialog (e.g. `["Armor"]`, `["Weapon", "Off-hand"]`). Absent = shown for every item. Advisory against `equipmentSlots`, not enforced — the loader doesn't check membership, so a typo'd slot name just means the field never shows rather than a validation error.
- **`default`** — value applied when a new item is created. No schema-level type restriction; match it to `type`.
- **`min` / `max` / `step`** — for `type: "number"` only: numeric-input bounds and increment.
- **`options`** — array of selectable values. Required by convention (not schema enforcement) when `type: "enum"` — an enum field with no `options` renders no choices.
- **`multi`** — for `type: "enum"` only, `true` allows selecting several values instead of one (Exalted's Armor Tags, Weapon Tags).
- **`bonusTarget`** — the stat name (attribute / skill / derivedStat) this field's value contributes to while the item is equipped. Advisory, exact-string matched, same convention as `equipmentBonusTargets`.
- **`bonusKind`** — how the value combines with `bonusTarget` while equipped. Default `"value"` — added as a flat numeric modifier. `"dice"` / `"successes"` / `"damage-pool"` — contributed to the matching dice-pool-style bonus category. **`"replace-base"`** — see the dedicated paragraph below.
- **`capsToken`** / **`capMode`** — see the dedicated warning box below.
- **`promptVisible`** — boolean, default `false`. Whether this field's value is emitted into the injected agent sheet block for equipped items. Set it `true` for anything the GM needs to see to adjudicate (AC math, damage type, weapon range); leave it `false` for bookkeeping-only fields (price, rarity) nobody needs narrated.
- **`placeholder`** — placeholder text for the field's input in the item dialog, per-ruleset vocabulary (PF2e's `"2 gp"` for Price).
- **`help`** — optional help text / tooltip shown next to the field in the item dialog, per-ruleset vocabulary. Use it for anything a player would otherwise have to look up (PF2e's Dex Cap: "Absent = uncapped. A cap of 0 still lets a negative Dexterity modifier through").
- **`aliases`** — array of legacy key names read on load for backward compatibility. Never written — new saves always use `id`. This is the migration path for a rename: add the retired name here rather than actually renaming `id`.

**COMMON CORE fields — never declare these.** Every item, in every ruleset, already carries `name`, `category` ("equipment" | "item"), `quantity`, `notes`, `bonuses[]` (the generic target/value/kind/tag rows), `equipped` (boolean), and `description` (free text — promoted to common core so every ruleset gets it without 15 separate declarations, see the extension source's "COMMON CORE" comment on the description field). These render for every ruleset regardless of what `inventory.fields[]` declares. **Do not declare a field with `id: "description"`** (or any of the other common-core names) — it would collide with the built-in one.

**`bonusKind: "replace-base"` — highest-wins, never summed.** Use this when a field sets a stat's base value outright rather than adding to it — armor setting the AC base is the canonical case (leather 11, plate 18 — these aren't +11/+18 modifiers, they're the number Dexterity gets added to). When more than one equipped item declares `replace-base` against the same `bonusTarget` (two armors worn at once, say), the HIGHEST declared value among them wins. The values are never summed, unlike every other `bonusKind`.

> **Cap-of-zero asymmetry — read this before declaring `capsToken`.** `capsToken` names a formula-context token (e.g. `"Dexterity_mod"`) this field caps while the item is equipped; across multiple equipped items, the TIGHTEST (lowest) declared cap wins. What a tightest cap of exactly 0 (or less) means depends on `capMode`, and the two systems' RAW genuinely disagree here — pick the wrong one and you'll silently misapply a Dex penalty in one direction or the other:
> - **`capMode: "omit"`** (default) — the capped term is OMITTED entirely, not clamped, so a NEGATIVE modifier does not apply either. This is D&D 5e heavy armor: at Dex cap 0, Dexterity contributes nothing at all to AC, penalty included. Do NOT "fix" this into a `min()` clamp — that's PF2e's rule, not 5e's.
> - **`capMode: "clamp"`** — `min(token, cap)` at every value, including 0, so a negative modifier still applies. This is PF2e heavy armor: a Dex cap of 0 still lets a Dex penalty through.
>
> When several equipped items declare caps on the same token, the tightest cap wins and the `capMode` of the field supplying THAT cap governs — so get this right on every field that declares `capsToken`, not just the tightest one you expect to see in play.

**Weapon damage lives in the damage string, not in a declared field.** A weapon's `damage` (the free-text expression the state-mutator writes, e.g. `"1d8+2 slashing"`) is where its enchantment bonus belongs — the "+2" is baked into the string a player reads at the table. Declared fields carry the item's OTHER magic contributions: an `attackMagicBonus`-style field (`bonusTarget: "Attack Bonus"`) reaches the dice widget's attack roll, and an armor's `armorMagicBonus` reaches AC. **Never route a weapon's magic bonus into both** — a +2 sword that also declares `attackMagicBonus: 2` targeting a stat the damage string already accounts for double-counts the enchantment. Keep the split ruleset-clean: damage-string bonuses affect the roll a player types by hand; declared-field bonuses affect the roll the widget computes.

## Step 4 — the validate → build → re-validate loop

This is the loop you'll run after every meaningful edit, and it is the same loop CI-minded contributors run before a PR. Commands assume the repo root (`npm run` and `bun run` both work; the scripts live in `package.json`).

```bash
# 1. Validate your spec (fast; run constantly while editing)
node tools/validate-ruleset.mjs rulesets/your-system/ruleset.json
#    Success: "PASS rulesets/your-system/ruleset.json  (your-system vX.Y.Z)", exit 0.
#    Failure: "FAIL" + the JSON Pointer to the offending field + the schema rule
#    that rejected it. WARN lines (e.g. a bonusTarget that resolves to no stat,
#    an appliesTo naming an undeclared slot) do NOT fail the run — read them
#    anyway; they are usually typos.

# 2. Build the importable artifacts from source
node tools/build-bundle.mjs rulesets/your-system/
node tools/build-agents.mjs rulesets/your-system/
#    Success: "PASS your-system -> .../bundle.json (...)" and
#    "PASS your-system -> .../agents.json (N agents: ...)".

# 3. Validate the built bundle
node tools/validate-bundle.mjs rulesets/your-system/bundle.json
#    Success: PASS, exit 0.

# 4. Confirm you broke nothing repo-wide (all seventeen must stay green)
npm run validate-rulesets    # → 17/17 PASS expected... plus yours = 18
npm run validate-bundles
```

**What the validator does and does not catch.** It catches structure: missing required fields, unknown keys (`additionalProperties: false`), wrong types, closed-enum violations, duplicate inventory field ids, `capMode` without `capsToken`. It can NOT catch game-rules wrongness — a Dex cap of 3 on plate armor validates fine and is still wrong. Rules correctness is the author's job; the checklist in Step 8 tells you how to spot-check it.

## Step 5 — write the GM agent prompt

`gm-agent.md` is markdown for human readers, but the part that actually ships is extracted by the build: **`build-bundle.mjs` and `build-agents.mjs` take ONLY the first fenced code block in the file** (a ` ```text ` fence, or the first plain fence). Everything after that fence closes — headings, notes, more fences — is documentation for humans and is silently dropped from the shipped prompt.

> ⚠️ **The first-fence rule has silently eaten doctrine before.** If you add GM instructions, they go INSIDE the first fence. Verify by grepping the rebuilt `bundle.json` for a distinctive phrase from your addition — never by re-reading the source markdown, which will happily show you text the build discarded.

Cover at minimum:

1. The resolution mechanic in plain language.
2. The difficulty ladder.
3. Critical / botch / advantage / disadvantage rules (whatever your system has).
4. The exact dice-tag format the GM model must emit (mirrors `diceTagFormat.template`).
5. What the agent itself emits each turn (a rules brief — stats relevant to the action, suggested DC / difficulty, conditions in effect).
6. The agent's phase: almost always `pre_generation`. Result type: `context_injection`.

Keep the template under ~2000 words; offload deep reference into the lorebook.

## Step 5a — encounter shell fields (combat systems)

If your system has combat, give the shared Combat Overseer's ENCOUNTER-shell contract a per-system field list: add a `## <ruleset-id> shell fields` subsection to `agents/combat-overseer.md` naming the minimum stats a random-encounter combatant needs to stay consistent (the pattern: armor/defense, soak or equivalent, health track, attack, damage, initiative, casting resource if the system has one, plus 1-3 key abilities as name + one-line effect). Source it from the system's own simplified-NPC rules where they exist (Exalted's Extras/QC rules; 5e's small stat block). Then add the narrator addendum to your `gm-agent.md` (honor ENCOUNTER numbers; recurring villains get a real card + sheet) and — **if your ruleset overrides `agents/state-mutator.md`** — copy the "Encounter shells are not sheet targets" section into your override so shelled names never become write targets. See the exalted3e and dnd5e pilots for the working shape of all three pieces.

**Bestiary-entry pattern (optional, recommended for systems with recurring mook types).** If your setting has enemy *types* that show up repeatedly (not unique villains — those get a real card, see below — but a type like "Fire-Aspect Soldier" or "Rot-touched Ghoul" the table will fight more than once), author each as its own lorebook entry rather than re-improvising its stats every time it appears: name the entry after the type, give it trigger words matching how the table will actually name it in play (`keys`), and put its baseline shell stats plus 1-3 signature abilities in `content`, shaped like the `## <ruleset-id> shell fields` list above. The Combat Overseer's `ENCOUNTER:` line for that type can then be filled in consistently from the entry instead of drifting between appearances. This is data, not a new mechanism — it's the same keyword-triggered lorebook pattern you're already using for spells and Charms, just naming a monster type instead of a power. It's subject to the same lorebook `tokenBudget` as everything else (Step 6), so keep entries tight. `rulesets/ose/lorebook.json`'s "Bestiary: Hit Dice as Threat Shorthand" entry shows the general shape (system-wide shorthand rather than a per-type stat block, but the same keyword-entry mechanism).

**Recurring villains (T2).** A bestiary entry is for a *type*, not an individual who matters. The moment a specific combatant is going to recur as themselves — a named rival, a boss — stop shelling them: give them a real character card and sheet the way you would a player character, and from then on your `gm-agent.md`'s narrator addendum should have them tracked like any other sheeted character rather than an `ENCOUNTER:` line. Player-facing walkthrough of this pattern (the "T2" villain-to-sheet flow) is in [`docs/HOW-IT-WORKS.md`](HOW-IT-WORKS.md#combat--enemies) — point your own ruleset's players there rather than re-explaining it per system.

## Step 6 — build the lorebook

`lorebook.json` is a Marinara-format lorebook (you can also build it in Marinara's Lorebook Editor and export). Each entry has:

- `keys` — trigger words (the entry fires when one matches the recent chat).
- `content` — the text injected into the GM prompt when triggered.
- `constant: true` for entries that must always be in context (resolution rules, anima banner, stunts in Exalted).
- `position: "before_an"` — inject before the most-recent user/assistant message.

Aim for 15-25 entries: core mechanics (always-on, ~5), conditions / states (~5), example powers / charms / spells (~10).

Set the lorebook's top-level `tokenBudget` to **at least 4096**. The engine applies this budget per book across every entry activated in a turn; the shipped default of 2048 (and older bundles' 1500) silently drops large entries — such as an XP award table — from context while smaller ones still surface. There is no error when this happens; the entry is simply invisible to the GM.

Also know the engine's **100-entry ceiling per lorebook**: entries beyond the first 100 in a book are never read at all. The shipped rules lorebooks sit well under it, but if you (or your users) author large spell/bestiary collections, split them across multiple books rather than growing one past 100.

### Step 6a — XP & Progression standard entries (required if the system has advancement)

Every ruleset whose system has character advancement ships these entries. They exist so a table can flip between GM-driven XP and manual milestone leveling by editing ONE word — without touching prompts or agents — and so the GM always reads authored numbers instead of guessing from model memory.

**1. `XP Progression Mode` — the switch (always-on).** `constant: true`, keys `["xp","progression","milestone","level"]`. The FIRST LINE is the bare switch and nothing else; the explainer below it must be mode-neutral (it describes both modes and says "follow whichever mode the line above declares" — never fuse mode-specific prose onto the switch line itself, or a one-word flip produces a self-contradicting entry the model resolves unpredictably). Canonical content:

> Progression: xp
>
> (The line above is the campaign's progression switch — follow whichever mode it declares. 'Progression: xp' = the GM awards XP per the XP Awards entry's guidelines. 'Progression: milestone' = the GM awards NO XP, ever; the player triggers level-ups manually at the table's discretion. Players: edit only the first line to change modes. NOTE: mode changes take effect on the NEXT turn — the engine re-reads lorebook context with about a one-turn delay, so the first response after a flip may follow the previous mode.)

**2. `XP Awards` — the system's award guidelines.** Keyword-triggered (`keys` should include `xp`, `experience`, `award`). Must contain: the system's award values or formulas (encounter tables, session/interval awards — whatever the system uses); the **parity clause** — mental and social challenges and good roleplay earn award equivalents, never combat-only ("not just grind rats to level"); the **party clause** — every award goes to every player character in the party (one award per PC, uniform value; never award NPCs); and, for pool-spend systems (World of Darkness family, Exalted), the line **"the player edits the sheet to spend XP; do not adjudicate spends"**. Open with a pointer to the Progression Mode entry.

**3. `Level-Up Procedure` — leveled systems only.** Carries the system's FULL level/XP threshold ladder (every level, exact numbers) framed as **authoritative over model memory for all level math** — this is what keeps "level me to 12" from landing on 13 — plus the per-level procedure (HP raise rule, feature/feat levels *mentioned, not automated*, anything the player confirms by hand). See `rulesets/dnd5e/lorebook.json` for the worked example; `rulesets/exalted3e/lorebook.json` shows the pool-system shape.

The GM prompt's award doctrine (Step 5) references these entries — award triggers and the milestone gate check belong in the prompt; the *numbers* belong here, editable by the user.

## Step 7 — write INSTALL.md

Mirror the structure of `rulesets/dnd5e/INSTALL.md` or `rulesets/exalted3e/INSTALL.md`. The modern install is **one bundle import** (the Ruleset dialog takes `bundle.json` by file, URL, or paste — agents and lorebook ride inside it), so the walkthrough is mostly about what comes after:

1. Install the extension zip (note "if already installed, skip").
2. Import the ruleset's `bundle.json` (choose-file / fetch-URL / paste).
3. Launch a game, then **attach the ruleset's lorebook** and **enable its agents for that game** — installing is not activating.
4. (Optional) GM-screen difficulty / setup notes.
5. Sanity check (a known dice example with expected output).
6. What this ruleset does NOT do (be honest — overlay tradeoffs).
7. Update / uninstall instructions.

## Step 8 — Definition of Done, then open a PR

Before you call the ruleset finished, every box below checks. This list is the difference between "validates" and "done":

- [ ] `node tools/validate-ruleset.mjs rulesets/your-system/ruleset.json` → PASS, **zero WARN lines** (or each WARN understood and deliberate).
- [ ] `bundle.json` + `agents.json` **rebuilt from current source** (`build-bundle.mjs` + `build-agents.mjs`) and `validate-bundle.mjs` → PASS.
- [ ] Repo-wide: `npm run validate-rulesets` and `npm run validate-bundles` both fully green.
- [ ] Any GM-doctrine addition verified **in the rebuilt `bundle.json`**, not the source markdown (the first-fence rule, Step 5).
- [ ] `npm run check:freshness` → clean (built artifacts match source).
- [ ] Rules spot-check by a human who knows the system: dice math on one worked example, one item's declared fields against the book, the XP table's numbers.
- [ ] No verbatim publisher text; no emojis in committed JSON; compact one-line style preserved for `inventory.fields[]` entries (see pitfalls below).

The repo is MIT and accepts PRs adding rulesets. Include:

- The source files AND the rebuilt `bundle.json` / `agents.json`.
- The Definition of Done above, passing.
- A line in the top-level `README.md` table.
- A `CHANGELOG.md` entry under `[Unreleased]`.

## Common authoring pitfalls

**You wrote a "field" that isn't in the schema.** The schema has `additionalProperties: false`. The validator will tell you exactly which extra field is rejected.

**Your `oneOf` resolution disagrees.** The `resolution` field uses `oneOf` over the nine modes — extra fields from another mode (e.g. `target` on a single-roll) make the validator reject under all nine branches. Trim to the fields your mode actually requires.

**You used emojis in the JSON.** They're valid JSON, but the project convention is no emojis in committed source files (engine convention; we follow it). Save them for narration.

**You ran a JSON formatter over a ruleset file.** Don't. The convention is compact hand-formatting — `inventory.fields[]` entries and similar declaration rows are single lines on purpose, so a diff shows one changed line per changed fact. A pretty-printer turns a 3-line change into an 800-line diff and will get your PR bounced. Edit surgically; match the surrounding style.

**You renamed a stable id.** Attribute names, ability ids, `inventory.fields[].id`, lever names — anything documented as NEVER-rename — orphans users' saved data when renamed. The escape hatch is always `aliases[]`: the old name keeps reading, the new one becomes the write target.

**You included verbatim text from an IP-owning publisher.** Don't. Mechanics are not copyrightable; descriptive flavor text usually is. Paraphrase. The Exalted bundle paraphrases everything; the D&D bundle uses SRD 5.1 (CC-BY-4.0) and is safe.

**Your prompt template invents rules.** The user's failure mode is "AI confidently makes up D&D rules." Tell the GM in the prompt: "Where the system is silent, label the call as a GM ruling." That single line saves a lot of hallucination.
