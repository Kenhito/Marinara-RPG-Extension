# AGENTS.md — Reference for AI coding agents

You are an AI coding agent working on or with the **Marinara-RPG-Extension** repository. This file is your single source of truth. Read it end-to-end before making changes. It is intentionally dense and self-contained: you should not need to fetch other files in the repo to understand the architecture, the constraints, or the authoring contract.

If a human invokes you with a request like "add a Pathfinder 2e ruleset" or "extend the framework to support [system]," start here, then read the specific source files this document references.

---

## 1. Repo purpose, in one paragraph

This repo is a **client-side overlay** for [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine) — a self-hosted AI roleplay frontend. Marinara's Game Mode runs an AI Game Master that defaults to D&D-style mechanics (six attributes, d20 + DC, single-roll resolution). This overlay swaps the GM's mechanical brain and the player-facing character sheet for a different RPG system, **without modifying Marinara's source**. The substitution is achieved by (a) one client-side JavaScript extension that hides Marinara's built-in attribute panel and renders a replacement, (b) per-ruleset data files (`ruleset.json`, `gm-agent.md`, `lorebook.json`) the user installs through Marinara's normal Agent and Lorebook editors. Three reference rulesets ship: D&D 5e, Exalted 3e, Fate Core.

## 2. Hard scope boundaries (do not violate)

These constraints are non-negotiable. They were established with the user explicitly. Violating them is a critical failure.

- **NEVER fork Marinara Engine.** This repo is an overlay. Modifications to the upstream Marinara-Engine source (wherever it's cloned on disk — typically `~/Marinara-Engine` or similar) are forbidden. If a feature seems to require engine modification, stop and tell the user — do not modify the engine on your own initiative.
- **NEVER submit a PR to Pasta-Devs/Marinara-Engine** without explicit user instruction. PRs are a public action with social cost; the user decides when one is appropriate.
- **NEVER push to `origin` without explicit user confirmation.** Local commits are fine; `git push` requires a green light. The user owns the public-facing surface.
- **NEVER claim something is "live" or "deployed" without verifying.** Use `curl` to hit the URL or check `git log` against `origin/main`. "I committed it" is not "it's live."
- **NEVER write engine-side TypeScript.** All work is in this repo's JavaScript extension, JSON ruleset specs, and Markdown agent prompts.
- **NEVER touch IP-encumbered text.** D&D content uses the SRD 5.1 (CC-BY-4.0). Exalted 3e and Fate Core paraphrase mechanics; verbatim Onyx Path or Evil Hat text must not be reproduced. Mechanics aren't copyrightable; flavor and prose are.

## 3. Repository layout

```
.
├── AGENTS.md                            # this file
├── README.md                            # human-facing intro
├── LICENSE                              # MIT for repo / extension / schema / docs
├── package.json                         # npm scripts (validate-rulesets) + ajv dep
├── package-lock.json
├── .gitignore
├── schema/
│   └── ruleset.schema.json              # JSON Schema (draft 2020-12) for ruleset.json
├── extension/
│   ├── ruleset-loader.js                # the entire client extension (~1660 lines)
│   └── ruleset-loader.css               # styling for the overlay UI
├── tools/
│   └── validate-ruleset.mjs             # CLI: validates a ruleset.json against the schema
├── rulesets/
│   ├── dnd5e/                           # reference: single-roll mode, SRD 5.1
│   │   ├── ruleset.json
│   │   ├── gm-agent.md
│   │   ├── lorebook.json
│   │   └── INSTALL.md
│   ├── exalted3e/                       # reference: dice-pool mode, paraphrased mechanics
│   │   └── (same four files)
│   └── fate-core/                       # reference: fate-ladder mode, Fate SRD compatible
│       └── (same four files)
└── docs/
    ├── AUTHORING.md                     # original human authoring guide
    ├── ADDING-RULESETS.md               # human worked-example using Fate Core
    ├── INSTALL.md                       # top-level install walkthrough
    └── ENGINE-CONSTRAINTS.md            # honest doc on what the overlay can/can't do
```

Every ruleset bundle is exactly **four files** with the same names. Add a new ruleset by creating `rulesets/your-system/` and populating those four files. No registry to update; the extension auto-discovers based on what the user activates.

## 4. The schema — `schema/ruleset.schema.json`

This is the contract between ruleset bundles and the extension. The validator rejects anything that doesn't conform. Run `npm run validate-rulesets` after any change.

### 4.1 Top-level required fields

```
id           string  kebab-case, ^[a-z0-9][a-z0-9-]{1,63}$  unique localStorage key
name         string  human-readable name
version      string  semver of the data file (NOT the underlying RPG edition)
dice         object  primary die config — see 4.2
resolution   object  resolution mode — see 4.3
attributes   array   minItems 1; see 4.4
skills       array   minItems 1; see 4.5
```

### 4.2 Top-level optional fields

```
edition        string  human-facing edition reference (e.g. "Fate Core (Evil Hat, 2013)")
license        string  license string for THIS data file's content
summary        string  one-paragraph flavor summary
difficulties   object  map of label -> { threshold: int, description?: string }; minProperties 2
derivedStats   array   computed stats; HP, motes, stress tracks — see 4.6
states         array   named UI state selectors — see 4.7
diceTagFormat  object  required: { template, example } — what GM emits, what extension parses
sheetSections  array   render order; enum: ["attributes", "skills", "derived", "states", "inventory", "charms", "notes"]
lorebookKeys   array   suggested trigger keywords for the bundled lorebook
```

`additionalProperties: false` at top level — unknown fields will be rejected. Do not add extra fields without first amending the schema.

### 4.3 Resolution mode (`resolution.oneOf`)

Five resolution modes. The `mode` field selects which branch's required sub-fields apply.

#### `single-roll` — used by D&D, Pathfinder, Cypher
```
{ "mode": "single-roll", "modifierFormula": "1d20 + ability_mod + proficiency_bonus" }
```

#### `dice-pool` — used by Exalted, oWoD/nWoD, Shadowrun
```
{
  "mode": "dice-pool",
  "poolFormula": "Attribute + Ability",
  "target": 7,
  "doubles": { "face": 10, "successes": 2 },
  "botches": { "onFace": 1, "trigger": "any-on-zero-successes" }  // or "majority" or "always-on-face"
}
```

#### `d100-percentile` — used by Call of Cthulhu, BRP-derived
```
{ "mode": "d100-percentile", "skillFormula": "Roll 1d100 under skill_value" }
```

#### `2d6-stat` — used by PbtA (Apocalypse, Dungeon, Monster of the Week)
```
{
  "mode": "2d6-stat",
  "modifierFormula": "2d6 + stat",
  "bands": [
    { "min": 10, "label": "10+: full success" },
    { "min": 7, "max": 9, "label": "7-9: success with cost" },
    { "min": 0, "max": 6, "label": "6-: miss" }
  ]
}
```

#### `fate-ladder` — used by Fate Core, Fate Accelerated, Fate-of-Cthulhu
```
{
  "mode": "fate-ladder",
  "modifierFormula": "Skill rating",
  "ladder": [
    { "label": "Legendary", "value": 8 },
    { "label": "Epic", "value": 7 },
    ...
    { "label": "Mediocre", "value": 0 },
    { "label": "Poor", "value": -1 },
    { "label": "Terrible", "value": -2 }
  ],
  "successWithStyle": 3
}
```

If your target system fits none of these, see Section 7 ("Adding a new resolution mode").

### 4.4 Attributes array

```
{
  "name": "Strength",                  // required
  "abbreviation": "STR",               // optional, max 4 chars
  "group": "Physical",                 // optional, used for sheet grouping
  "min": 1,                            // required
  "max": 20,                           // required
  "default": 10,                       // optional, used for new characters
  "description": "..."                 // optional
}
```

Schema requires at least one attribute. For systems where attributes don't naturally exist (e.g. some Fate variants), supply at least one synthetic attribute capturing a key resource (Fate Core uses `Refresh`).

### 4.5 Skills array

```
{
  "name": "Athletics",                 // required
  "linkedAttribute": "Strength",       // optional; if set, the "roll" button uses this attr
  "min": 0,
  "max": 5,
  "default": 0,
  "description": "..."
}
```

`linkedAttribute` should be set for systems where the skill always pairs with the same attribute (D&D). Omit it for systems where the GM picks the attribute per check (Exalted).

### 4.6 Derived stats

```
{
  "name": "Personal Motes",            // required
  "formula": "Essence × 7 + 26",       // required, plain language for GM/human reference
  "renderAs": "bar",                   // optional: "value" (default), "bar", or "track"
  "max": 100,                          // optional, for "bar"
  "maxFormula": "{Essence} * 7 + 26",  // optional, dynamic max for "bar" — see safe-eval below
  "track": [                           // required when renderAs === "track"
    { "label": "-0", "penalty": 0 },
    { "label": "-1", "penalty": -1 },
    ...
  ]
}
```

`maxFormula` is evaluated by a small whitelisted evaluator in the extension that supports `+ - * / ( )` and digits and `{StatName}` placeholders. Anything else is rejected. Used so that bars (Motes, HP, etc.) recompute their cap when their referenced stat changes — without rebuilding the DOM.

### 4.7 States

```
{
  "name": "Anima Banner",
  "values": [
    { "label": "Dim", "description": "...", "trigger": "..." },
    { "label": "Glowing", "description": "..." },
    ...
  ]
}
```

Renders as a dropdown selector on the sheet. Each value's `trigger` is for the GM agent prompt's reference; the extension does not auto-trigger.

### 4.8 Dice tag format

```
{
  "template": "[fate: 4dF{+modifier} = {total} ({faces}) vs {target} -> {outcome}{shifts}]",
  "example": "[fate: 4dF+3 = 5 (+,0,+,-) vs 2 -> success with style (+3 shifts)]"
}
```

Both fields required if you specify `diceTagFormat`. The `template` documents what the GM model is told to emit; the `example` is a concrete instance the GM model imitates. The extension's roller produces matching tags.

## 5. The extension — `extension/ruleset-loader.js`

### 5.1 Runtime contract

Marinara loads this file via `new Function("marinara", source)` (see `packages/client/src/components/layout/CustomThemeInjector.tsx` upstream). Therefore:

- **Use `var`, function declarations, no `import`/`export`, no top-level `await`.** ES2015+ features that don't compile down (e.g. `async function`, `class`, native modules) will break the runtime contract.
- Arrow functions inside callbacks are fine (the function body is parsed as ES2015+ source). Style convention in this file is `function () { ... }` callbacks for consistency, not arrow functions, but arrows in short callbacks are acceptable.
- `const`/`let` are tolerated by `new Function`, but stay with `var` for consistency with the existing file.

### 5.2 The `marinara` API surface

The extension receives a single `marinara` argument with these helpers (all auto-cleanup on extension disable):

```js
marinara.extensionId           // string, the extension's ID for namespacing
marinara.extensionName         // string, the extension's user-visible name
marinara.addStyle(css)         // injects a <style> element
marinara.addElement(parent, tag, attrs?)   // appends an element; attrs sets attrs/textContent/innerHTML
marinara.apiFetch(path, opts?) // fetch against /api/* with auto JSON parsing
marinara.on(target, event, fn) // addEventListener with cleanup tracked
marinara.setInterval(fn, ms)   // tracked
marinara.setTimeout(fn, ms)    // tracked
marinara.observe(target, fn, opts?)  // MutationObserver with cleanup tracked
marinara.onCleanup(fn)         // register an extra cleanup
```

Use these helpers for anything DOM-touching. The auto-cleanup means turning the extension off via Marinara's UI fully reverses all changes.

### 5.3 Key constants and storage keys

Defined at the top of the file:

```js
LS_RULESET      = "marinara-rpg-ruleset"          // the active ruleset JSON blob
LS_RULESET_URL  = "marinara-rpg-ruleset-url"      // last-used fetch URL (for re-fetch UX)
LS_LIBRARY      = "marinara-rpg-ruleset-library"  // multi-ruleset cache, keyed by ruleset id
LS_SHEET_PFX    = "mrr-sheet-"                    // per-character sheet prefix; full key: mrr-sheet-{chatId}-{characterId}
BUNDLE_SCHEMA   = "mrr-character-bundle"          // marker for save/load JSON files
BUNDLE_VERSION  = 1                                // version of the save/load bundle format
```

Sheet data is also keyed in localStorage:
```
mrr-chars-{chatId}        characters list for that chat (JSON array of { id, name })
mrr-active-char-{chatId}  the selected character id for that chat
mrr-sheet-{chatId}-{cid}  the sheet for character cid in that chat
```

Plus position memory: `mrr-sheet-pos`, `mrr-dice-pos` (drag positions for the floating panels).

### 5.4 Function inventory by responsibility

| Section | Functions |
|---------|-----------|
| Storage helpers | `lsGet`, `lsSet`, `lsDel`, `safeParse` |
| Ruleset persistence | `loadRuleset`, `fetchRulesetFromUrl`, `validateRuleset` |
| Library | `loadLibrary`, `saveLibrary`, `addToLibrary`, `removeFromLibrary`, `activateFromLibrary` |
| Chat / character data | `getChatId`, `sheetKey`, `loadSheet`, `saveSheet`, `loadCharacters`, `saveCharacters`, `loadActiveCharacterId`, `saveActiveCharacterId`, `flushSave`, `migrateLegacySheet` |
| Character bundle (save/load JSON) | `collectBundle`, `validateBundle`, `applyBundle`, `bundleFilename`, `triggerDownload`, `triggerUpload`, `exportBundle`, `importBundle` |
| Sheet rendering | `renderSheet`, `renderSheetHeader`, `renderAttributes`, `renderAttrRow`, `renderSkills`, `renderSkillRow`, `renderDerived`, `renderValue`, `renderBar`, `renderTrack`, `renderStates` |
| Stat / formula utilities | `clamp`, `statContext`, `evalFormula`, `refreshAllBars` |
| UI helpers | `addStepper`, `diceRow`, `diceFooter`, `makeDraggable`, `findSheetContainer`, `hideBuiltInAttributesPanel`, `findChatInputTextarea`, `insertIntoChatInput` |
| Dice widget | `buildDice`, `buildSingleRollWidget`, `buildPoolWidget`, `buildD100Widget`, `buildPbtaWidget`, `buildFateWidget`, `numFromInput`, `showResult`, `showDice`, `sendLastRoll` |
| Rollers (one per mode) | `rollSingleRoll`, `rollDicePool`, `rollD100`, `rollPbta`, `rollFate`, `quickRollForSkill`, `finalizeRoll` |
| Dialog | `buildHeaderGear`, `openDialog`, `setMsg`, `renderLibrarySection` |
| Sync | `syncSheetToChat` |
| Lifecycle | `init`, `watchRouteChanges`, `watchLifecycleSaves`, `exposeDebug` |

### 5.5 Reading the current state at runtime

```js
window.mrrDebug.dump()         // print every mrr-* localStorage key with byte size
window.mrrDebug.state()        // returns the live state object
window.mrrDebug.read("KEY")    // pretty-printed JSON for any localStorage key
window.mrrDebug.forceSave()    // explicit save trigger
```

These exist in production builds. Use them for diagnosis when debugging localStorage issues.

## 6. Authoring a new ruleset (recipe)

If your target system fits one of the five existing resolution modes (single-roll, dice-pool, d100-percentile, 2d6-stat, fate-ladder), you only edit data and prose. No JavaScript changes needed.

### Step 1 — pick the closest existing bundle and copy it

```bash
cp -R rulesets/dnd5e rulesets/your-system          # for single-roll
cp -R rulesets/exalted3e rulesets/your-system      # for dice-pool
cp -R rulesets/fate-core rulesets/your-system      # for fate-ladder
```

### Step 2 — edit `ruleset.json`

Update `id` (kebab-case, unique), `name`, `version`, `edition`, `license`, `summary`. Replace the dice block, resolution config, attributes, skills, derived stats, states, difficulties, dice tag format. Validate as you go:

```bash
node tools/validate-ruleset.mjs rulesets/your-system/ruleset.json
```

The validator prints exact JSON Pointers to offending fields. The schema's `additionalProperties: false` at every level catches typos and stray fields.

### Step 3 — edit `gm-agent.md`

This is the system prompt the user pastes into Marinara's Agent Editor. Cover at minimum:

1. **Resolution mechanic** in plain language, with a concrete `[tag: ...]` example matching the dice tag format.
2. **Vocabulary** — names of difficulty levels, success classes, key resources. The model writes much better narration when it has the system's own vocabulary.
3. **Resource economy** — Fate Points, motes, sorcery charges, ammo. Anything the player and GM track together.
4. **Negative space** — explicit "do NOT" rules. e.g., for Fate: "do not emit `[skill_check: ...]` (other system); do not track HP."
5. **Engine compatibility note** — the reputation 50-char gotcha (see Section 8). Always include this paragraph in any new GM prompt.
6. **Phase**: `pre_generation`. Result type: `context_injection`.

Length: 2,000-8,000 characters is typical. Aim for at least 800.

### Step 4 — edit `lorebook.json`

Each entry has `keys` (trigger keywords) and `content` (rule text injected when those keys appear in recent context). 14-25 entries is typical: core mechanics (~5), conditions/states (~5), example powers/charms/spells (~10).

Keep `content` factual and mechanical. The GM agent prompt sets tone; the lorebook grounds the model on rules.

### Step 5 — edit `INSTALL.md`

Mirror the structure of `rulesets/fate-core/INSTALL.md` (the most recent and most thorough example):

1. Prerequisites (Marinara version, model recommendation).
2. Install client extension (one-time, shared).
3. Activate ruleset (paste-or-fetch).
4. Install GM agent.
5. Install lorebook.
6. Build a character.
7. Play.
8. Troubleshooting (include the 50-char reputation gotcha).

### Step 6 — final validation

```bash
npm run validate-rulesets   # validates ALL bundles in rulesets/
node --check extension/ruleset-loader.js
```

Both must pass.

## 7. Adding a new resolution mode (when none of the five fit)

Required when your target system has dice math no existing mode captures. Roughly 100 lines of code change across two files.

### Step 1 — schema

In `schema/ruleset.schema.json`, find `resolution.oneOf` and append a new branch. Pattern:

```json
{
  "required": ["mode", "<your required fields>"],
  "properties": {
    "mode": { "const": "your-mode-name" },
    "<field>": { "type": "...", "description": "..." },
    ...
  },
  "additionalProperties": false
}
```

Every existing branch keeps `additionalProperties: false`; yours should too. Verify the existing rulesets still validate:

```bash
npm run validate-rulesets
```

### Step 2 — extension JavaScript

In `extension/ruleset-loader.js`:

1. **Add a `MODES` entry** — search for `var MODES = {` and add your mode constant. Example: `FATE: "fate-ladder"`.
2. **Add a dispatch branch in `buildDice`** — search for `if (mode === MODES.POOL)` and add an `else if` for your mode pointing to your builder.
3. **Write `buildXWidget()`** — uses existing `diceRow(parent, label, key, default)` and `diceFooter(parent, btnLabel, rollFn)` helpers. Declares the input fields the player edits before rolling.
4. **Write `rollX()`** — generates dice via `Math.random()`, computes outcome and shifts/successes, calls `finalizeRoll(text, kind, faces)`. `text` is the formatted `[your-mode: ...]` tag matching `diceTagFormat.template` from your bundle. `kind` is one of `"success"`, `"fail"`, `"botch"`, `"tie"` for CSS coloring.
5. **(Optional) `quickRollForSkill` branch** — pre-fills the widget when the player clicks a skill row's "roll" button.

### Step 3 — bundle that exercises the new mode

Author the four bundle files (Section 6) using your new mode in `resolution.mode`. Validate.

### Step 4 — verify

```bash
node --check extension/ruleset-loader.js
node -e "var fs=require('fs'); new Function('marinara', fs.readFileSync('extension/ruleset-loader.js','utf8'))"
npm run validate-rulesets
```

All three must pass. The Function-body parse check is critical: `node --check` alone won't catch ES2015+ features that break `new Function`.

## 8. Engine compatibility — known gotchas

### 8.1 Reputation tag 50-char limit (Marinara 1.5.6)

The engine's `/api/game/reputation/update` endpoint validates `action` strings at **max 50 characters** (`packages/server/src/routes/game.routes.ts:3940` upstream). The default GM prompt at `packages/server/src/services/game/gm-prompts.ts:604` instructs the LLM to emit `[reputation: npc="Name" action="..."]` tags without communicating the length limit. Verbose models (Opus, GPT-4-class) routinely emit 100+ character action descriptions and trigger 400 Validation Errors that surface to the user as "connection error" toasts.

**Mitigation in every GM prompt this repo ships:** include a paragraph telling the model the limit. Copy from any of the three reference rulesets' `gm-agent.md` (look for the section "Engine compatibility — reputation tags"). Always include this in any new GM prompt you author.

### 8.2 Combat encounter modal stays d20-shaped

Marinara's combat-encounter modal is server-coded and uses the engine's hardcoded D&D-style attribute model (`RPGAttributes { str, dex, con, int, wis, cha }` in `packages/shared/src/types/game-state.ts`). The overlay cannot replace it without forking. Practical effect: combat *narration* uses your ruleset's vocabulary (because it flows through the GM agent), but the modal's stat blocks remain d20-shaped.

**Mitigation:** the per-ruleset `INSTALL.md` should mention this, and recommend playing combat in narration mode (no modal trigger) for systems where the modal would be incorrect.

### 8.3 `RPGAttributes` is typed to D&D six attrs

The engine's `PlayerStats.attributes` field cannot store arbitrary attribute names. The overlay persists the sheet to browser `localStorage` instead. A "Sync to chat" button copies values into the chat's free-form `customTrackerFields[]` so the GM agent can see them.

### 8.4 Character sheets are keyed to chat ID

Marinara's chat IDs rotate per session. Sheets in localStorage are keyed by chat ID, so a fresh chat looks like a brand-new character. The save/load buttons in the sheet header export/import all characters as a JSON file to work around this. Never tell users their data is lost — point them at the save/load workflow.

## 9. GM prompt patterns that work

These are validated patterns from the three shipped rulesets. Copy or adapt.

**Resolution explanation:** tell the model exactly what dice, exactly what modifier, exactly what outcome thresholds mean. Use the same vocabulary in the prompt as the system uses in its own books. Then give a concrete `[tag: ...]` example with realistic values.

**Difficulty vocabulary:** list every difficulty level the system uses with its threshold integer. The model uses this to set DCs / target numbers consistently.

**Resource economy:** describe Fate Points / motes / spell slots / ammo / etc. as a closed loop (how they're spent, how they're recovered). The model will then narrate scarcity correctly.

**Action types:** if the system has named actions (Fate's overcome / advantage / attack / defend, PbtA's specific moves, Exalted's stunt / charm / mote spend), list them with one-line descriptions. The model will use them.

**Negative space:** explicitly tell the model what NOT to do. "Do not emit `[skill_check:]` tags — that's a different system." "Do not track HP — Fate uses stress and consequences." This kills hallucination of cross-system mechanics.

**Engine compat:** include the reputation 50-char paragraph. Always.

## 10. Lorebook patterns that work

Marinara's lorebook surfaces entries to the model only when their `keys` match recent context. This is keyword-triggered RAG — small budget per turn but very precise.

**One entry per discrete rule.** Don't combine "stress and consequences" into one entry; separate them. Each entry is roughly 50-300 words of factual mechanic. The marginal cost of an extra entry is near zero (Marinara skips non-matching ones); accuracy goes up sharply with relevant entries available.

**Keys are case-insensitive substrings.** Pick keys that the user or model would naturally type when the rule is relevant. For Fate aspects: `["aspect", "high concept", "trouble", "concept"]`. Aim for 2-5 keys per entry.

**Constant entries** (`constant: true` in the entry — though this is Marinara's lorebook editor flag, not necessarily in the JSON export) are always in context. Use sparingly — for the dice resolution itself, the difficulty ladder, and core resource rules. 3-5 constant entries max; the rest should be keyword-triggered.

**Don't paraphrase the GM prompt.** The GM prompt covers the high-level system pitch. The lorebook covers the deep-dive rules reference. Avoid duplication; the model gets both at once and duplication wastes the context budget.

## 11. Validation gates an AI must pass before declaring done

```bash
# All three of these MUST pass:
npm run validate-rulesets                                      # JSON schema
node --check extension/ruleset-loader.js                       # JS syntax
node -e "new Function('marinara', require('fs').readFileSync('extension/ruleset-loader.js','utf8'))"  # Function-body parse
```

If you added a new resolution mode, add a small test under `/tmp/` that exercises `rollX` with deterministic dice (override `Math.random`) across all outcome types your mode produces. The pattern is in `/tmp/mrr-fate-roll-test.js` from the most recent session — copy and adapt.

If you modified the bundle format (`save/load`), confirm the round-trip test in `/tmp/mrr-roundtrip-test.js` still passes.

## 12. Commit and push protocol

- **Commit locally** when work is done and gates pass. Use a concrete commit message describing what changed and why.
- **Never run `git push` without explicit user OK.** Even if the user has previously authorized pushes, treat each push as a separate authorization moment.
- **Never amend a published commit.** If a commit needs fixing, create a new commit on top.
- **Never run `git config`** to set user name/email globally. If git rejects a commit because no identity is set, use the per-command `-c` override matching prior commits in the repo's history (check `git log -1 --format='%an <%ae>'`), and tell the user.

## 13. When in doubt

- Read `docs/ENGINE-CONSTRAINTS.md` for the current truth on what the overlay can and cannot do.
- Read `docs/ADDING-RULESETS.md` for a human-style worked example.
- Read the existing rulesets — `rulesets/fate-core/` is the most recent and most complete.
- Run the validators before declaring done.
- Tell the user what you found, with citations to file:line, before changing anything non-trivial.
- If a change seems to require modifying Marinara-Engine source: STOP and ask the user. Do not modify the engine.
