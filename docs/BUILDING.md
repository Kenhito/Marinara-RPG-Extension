# BUILDING — the generic bundle-build contract

> **What this is:** the canonical, forward-looking reference for the generator pipeline that turns a `ruleset.json` spec into an installable `bundle.json`. Lists every generator currently in `tools/`, what each consumes, what each emits, what fields in `ruleset.json` drive it, and what author-override block lets you skip derivation when you need full control.
>
> **Who it's for:** ruleset authors (human or chatbot AI). Pair this doc with `ruleset.schema.json` and you have everything you need to build a complete bundle from spec alone — no codebase spelunking required.
>
> **Relationship to other docs:**
> - `AUTHORING-PROMPT.md` (repo root) — the single-paste chat-AI prompt template
> - `docs/AUTHORING.md` — step-by-step new-ruleset walkthrough
> - `docs/AUTHORING-PHASE-6.md` — Phase 5/6/7 schema deep dive (Resources cluster, derived stats, V20 trinity, etc.)
> - `docs/ADDING-RULESETS.md` — decision tree + new-resolution-mode procedure
> - `docs/ENGINE-CONSTRAINTS.md` — what overlay can vs cannot do
> - `releases/v0.4.0/docs-for-ai/` — pinned-to-v0.4.0 build-pipeline reference (this doc supersedes for v0.4.x+)
>
> **AUTHORING-PROMPT.md is still the entry point for chatbot-driven authoring.** This doc is the underlying contract; the prompt is the workflow. Both stay in sync.

---

## The philosophy in one paragraph

**`ruleset.json` is the system of record.** Everything in `bundle.json` is either copied verbatim from `ruleset.json` + `lorebook.json`, or DERIVED from `ruleset.json` by a generator under `tools/`. Authors edit the spec; the build emits the bundle. Re-runs are idempotent: same spec → same bundle. When a generator can't do what an author needs, the author drops an explicit override block into `ruleset.json` (e.g. `regexScripts:`) and the generator passes it through verbatim. **Author override > derivation, always.**

## Quick scaffold a new ruleset

```bash
# 1. Pick a starting directory (copy an existing reference)
cp -r rulesets/exalted3e rulesets/my-system
cd rulesets/my-system

# 2. Edit ruleset.json — change id, name, dice, resolution, attributes, skills, etc.
$EDITOR ruleset.json

# 3. Edit lorebook.json — add ruleset-specific reference entries
$EDITOR lorebook.json

# 4. Edit gm-agent.md (optional, only if shipping a GM prompt with the bundle)
$EDITOR gm-agent.md

# 5. Validate the spec
node tools/validate-ruleset.mjs rulesets/my-system/ruleset.json

# 6. Build the bundle (runs all derivation generators in order)
node tools/build-bundle.mjs rulesets/my-system/

# 7. Validate the resulting bundle
node tools/validate-bundle.mjs rulesets/my-system/bundle.json

# 8. (Optional) Build a separate agents.json for the agent-import dialog
node tools/build-agents.mjs rulesets/my-system/
```

That's the full pipeline. No JavaScript code to write; no engine knowledge required.

## ruleset.json field reference (semantic map)

Authoritative shape lives in `schema/ruleset.schema.json`. The table below names what each field semantically MEANS and which generator (if any) consumes it. Fields marked **R** are required.

| Field | Type | R? | Consumed by | What it does |
|-------|------|----|----|----|
| `id` | string | R | all generators | Stable namespace identifier (e.g. `"exalted3e"`). Drives idempotency keys on every installed artifact. |
| `name` | string | R | bundle, regex generator | Display name (e.g. `"Exalted 3rd Edition"`). Appears in UI + generated artifact names. |
| `version` | string | R | bundle | Ruleset semver. Bump on every shipped change. |
| `edition` | string | — | (informational) | Edition string for the lorebook + UI. |
| `license` | string | — | (informational) | Attribution / rights notice. |
| `summary` | string | — | (informational) | One-sentence pitch. |
| `dice.type` | string | R | regex generator | Primary die: `"d20"`, `"d10"`, `"d6"`, `"d100"`, `"dF"`, etc. **The regex generator uses this (NOT `resolution.mode`) to detect d20-rulesets and short-circuit unnecessary rewrites.** |
| `dice.notation` | string | R | (informational) | Canonical roll notation (e.g. `"Xd10 vs 7"`). |
| `resolution.mode` | string | R | sheet renderer, regex generator | Resolution shape: `"single-roll"`, `"dice-pool"`, `"roll-under"`, `"fate-ladder"`, `"stance-modal-pool"`, `"dice-pool-sum"`, `"d100-percentile"`, `"2d6-stat"`, `"narrative-handled"`. Drives client UI + regex derivation. |
| `resolution.poolFormula` | string | — | (informational) | Free-text formula for the AI (e.g. `"Attribute + Ability + Charm dice"`). |
| `resolution.target` | int | — | (informational) | Default success target (e.g. 7 for Exalted). |
| `resolution.doubles` | object | — | dice widget | `{ face: 10, successes: 2 }` for systems where 10s count double. |
| `resolution.botches` | object | — | dice widget | Botch trigger config. |
| `difficulties` | object | — | regex generator (V9) | Map of difficulty-name → `{ threshold, description }`. When present + non-d20, the regex generator emits a DC-mention rewrite to "difficulty N". |
| `attributes` | array | R | sheet renderer | Per-attribute config (name, abbreviation, group, min/max, default, description). |
| `skills` | array | R | sheet renderer | Per-skill config (name, attribute, default, description). |
| `derivedStats` | array | — | sheet renderer | Derived stats with `valueFormula` (CSP-safe arithmetic). |
| `resources` | array | — | sheet renderer | Resources cluster (Phase 6) — motes, willpower, mana pools, etc. |
| `commitmentModel` | string | — | sheet renderer + state-mutator | `"mote"` for Exalted-style commitment; null for non-commitment systems. |
| `conditions` | array | — | sheet renderer | Status conditions (Stunned, Prone, etc.) |
| `states` | array | — | sheet renderer | Health-track / state-banner config. |
| `roundCounters` | array | — | sheet renderer | Per-round combat penalties + decrement schedule. |
| `xpTable` | array | — | sheet renderer | Level-up XP cost table. |
| `morality` | object | — | sheet renderer | Humanity/Path/Conviction tracks (V20-family systems). |
| `equipmentSlots` | array | — | sheet renderer | Equipment slot definitions. |
| `equipmentBonusTargets` | array | — | sheet renderer | Where equipment bonuses can target. |
| `header` | object | — | sheet renderer | Top-of-sheet display config. |
| `sections.order` | array | — | sheet renderer | Section render order. |
| `sections.hidden` | array | — | sheet renderer | Section visibility toggles. |
| `lorebookKeys` | array | — | (future: V2) | Optional extra trigger keys for lorebook entries. |
| `regexScripts` | array | — | regex generator override | **Vector 9 author override.** If present, generator returns this verbatim. |
| `diceTagFormat` | object | — | sheet + agents | Defines the `[skill_check: ...]` tag shape the GM agent emits. |
| `skillProficiency` | object | — | sheet renderer | Skill tier / proficiency system config. |
| `skillSpecialties` | object | — | sheet renderer | Specialty +1 dice config. |
| `abilities.groups` | array | — | sheet renderer | V20-style ability groupings (Talents/Skills/Knowledges). |
| `backgrounds` | array | — | sheet renderer | Background dots (V20-family). |
| `sheetSections` | array | — | sheet renderer (legacy) | Pre-`sections.order` config. Keep for backward compat. |

For full field details (types, validation rules, examples), see `schema/ruleset.schema.json` and `docs/AUTHORING-PHASE-6.md`.

## Generator catalog

Every script under `tools/` is a generator (produces an artifact) or a validator (checks an artifact). The build pipeline composes them.

### `tools/validate-ruleset.mjs`

**Input:** `ruleset.json` (path argument). **Output:** PASS/FAIL stdout + exit code. **Purpose:** structural validation against `schema/ruleset.schema.json` (Ajv 2020). Run before bundling to catch missing required fields. Always safe to run; no side effects.

### `tools/build-bundle.mjs`

**Input:** ruleset directory containing `ruleset.json` + `lorebook.json` (+ optional `gm-agent.md`, per-ruleset `agents/`). **Output:** `bundle.json` in the same directory. **Purpose:** the orchestrator. Reads the source files, calls every other derivation generator in order, assembles the result into a single bundle envelope.

Composition order (as of v0.4.x+):
1. Read `ruleset.json` (validated separately by `validate-ruleset.mjs`)
2. Read `lorebook.json` and normalize entries (drop server-assigned `id`, default `position` to 0)
3. Call `buildRegexScripts(ruleset)` (Vector 9) — emit `bundle.regexScripts` if non-empty
4. Assemble bundle envelope: `{ schema, version, ruleset, lorebook, regexScripts? }`
5. Write to `bundle.json` (JSON.stringify, 2-space indent)

**Override surface:** none directly — `build-bundle.mjs` is the orchestrator. Per-vector overrides live in the individual generators.

### `tools/build-regex-scripts.mjs` *(Vector 9 — engine-native surface rewrites)*

**Input:** ruleset object. **Output:** `RegexScript[]` (engine `RegexScript` shape minus server-assigned `id` / `createdAt` / `updatedAt`).

**Purpose:** derive engine-native regex scripts that rewrite engine-emitted SURFACE text in AI output. Server-side d20 math runs regardless of any overlay; these scripts rewrite the player-facing prose so a dice-pool ruleset (Exalted, VtM) shows ruleset-flavored phrasing instead of d20 vocabulary.

**Fields consumed:**
- `dice.type` — d20-detection. If `"d20"` and no `initiativeTerminology`, generator returns `[]` (engine vocabulary already matches).
- `resolution.mode` — informational; reserved for future per-mode templates.
- `difficulties` — when present and non-d20, generator emits a DC-mention rewrite.
- `initiativeTerminology` (optional string) — when set, generator emits an initiative rewrite (`"initiative" → <term>`, e.g. `"Join Battle"`).

**Override block:** `ruleset.regexScripts` (array). When present, generator returns it verbatim.

**Output shape (one entry):**
```json
{
  "name": "skill_check tag → Exalted 3rd Edition surface",
  "enabled": true,
  "findRegex": "\\[skill_check:\\s*dc=\"(\\d+)\"...",
  "replaceString": "$5 — rolled against difficulty $1",
  "trimStrings": [],
  "placement": ["ai_output"],
  "flags": "gi",
  "promptOnly": false,
  "order": 100,
  "minDepth": null,
  "maxDepth": null
}
```

**Idempotency contract:** at install time, the extension prefixes each script's name with `MRR: <rulesetId>: ` (GM-mode) / `MRRP: <rulesetId>: ` (RP-mode). Re-install does GET → filter by prefix → DELETE matches → POST fresh. Hand-edited managed scripts get overwritten on re-install (matches the lorebook contract).

**Engine compatibility:** matches `~/Marinara-Engine/packages/shared/src/schemas/regex.schema.ts`'s `createRegexScriptSchema` 1:1.

**Worked example (Exalted):** `node tools/build-regex-scripts.mjs rulesets/exalted3e/ruleset.json` emits two scripts — the skill_check tag rewrite + DC-mention rewrite. dnd5e + pf2e both emit zero (correctly — they're `dice.type: "d20"`).

### `tools/build-custom-tools.mjs` *(Vector 3 — static ruleset reference tools)*

**Input:** ruleset object. **Output:** `CustomTool[]` (engine `CustomTool` shape minus server-assigned `id` / `createdAt` / `updatedAt`).

**Purpose:** derive engine-native CustomTool entries the AI can call mid-generation. Tonight's slice (v0.4.x) ships only `executionType: "static"` tools — they don't require the `CUSTOM_TOOL_SCRIPT_ENABLED` env var and work out of the box on any self-hosted Marinara install where the caller has privileged access. One tool per ruleset: a comprehensive ruleset-reference lookup the AI can call when it needs authoritative dice / resolution / difficulty / attribute / skill detail.

**Fields consumed:**
- `id` (required) — kebab-case ruleset id is converted to `snake_case` for the tool-name prefix.
- `name` (required) — appears in the tool description.
- `summary`, `dice.*`, `resolution.*`, `difficulties`, `attributes`, `skills`, `commitmentModel` — all stitched into the structured Markdown `staticResult`. Missing fields are simply skipped (no error).

**Override block:** `ruleset.customTools` (array). When present, generator returns it verbatim. Authors who want to ship script-type tools (math via `scriptBody`, requires `CUSTOM_TOOL_SCRIPT_ENABLED`) supply them here directly.

**Output shape (one entry):**
```json
{
  "name": "exalted3e_reference",
  "description": "Returns canonical Exalted 3rd Edition reference: dice, resolution, difficulty ladder, attributes, skills. Call when the GM needs authoritative ruleset detail mid-narration.",
  "parametersSchema": {},
  "executionType": "static",
  "webhookUrl": null,
  "staticResult": "# Exalted 3rd Edition — canonical reference\n\n... structured Markdown ...",
  "scriptBody": null,
  "enabled": true
}
```

**Engine constraints honored:**
- Tool name must match `^[a-z][a-z0-9_]*$` (lowercase snake_case, ≤100 chars). The generator emits compliant names; the installer prefixes with `mrr_<rulesetIdSnake>_` (GM-mode) / `mrrp_<rulesetIdSnake>_` (RP-mode) preserving the regex.
- Description ≤500 chars.
- Engine POST/PATCH/DELETE on `/custom-tools` requires the privileged-gate middleware to allow the caller. On a self-hosted single-user Marinara install this is typically allowed; if not, the install surfaces a 403 from `apiPostRaw` and the user retries after flipping the gate.

**Idempotency contract:** at install time, the extension prefixes each tool's name with `mrr_<rulesetIdSnake>_`. Re-install does GET → filter by prefix → DELETE matches → POST fresh. Same DELETE-then-POST trade-off as the regex installer (non-atomic; retry recovers).

**Worked example (Exalted):** `node tools/build-custom-tools.mjs rulesets/exalted3e/ruleset.json` emits one static tool, `exalted3e_reference`, containing the full canonical reference (dice, resolution, difficulty ladder, all 9 attributes, all 25 skills, commitment model). The AI calls it once per chat when it needs to ground a mechanic decision.

**Deferred — Vector 3.1 (math via script tools):** the engine supports `executionType: "script"` tools whose `scriptBody` runs server-side and returns parameter-driven results — exactly what's needed for deterministic ruleset math (`roll_<id>_check(pool, target)` → `{ successes, ones, tens, botched }`). Two blockers keep this out of v0.4.x default generation: (1) script tools require the engine to be started with `CUSTOM_TOOL_SCRIPT_ENABLED=true` in its env, which the auto-generator can't guarantee for end users; (2) generic dice-pool / single-roll / roll-under JS implementations need careful per-resolution-mode authoring. Bundle authors who run with the flag enabled can ship explicit script tools today via the `customTools:` override block in `ruleset.json`.

### `tools/build-lorebook-expansions.mjs` *(Vector 2 — derived lorebook entries)*

**Input:** ruleset object. **Output:** `LorebookEntry[]` matching the existing lorebook entry shape (`{ name, keys, content, position, selective, constant }`).

**Purpose:** auto-derive ruleset-aware lorebook entries from `ruleset.json` so the engine surfaces ruleset-specific definitions whenever common terms appear in conversation. Closes a coverage gap: hand-authored lorebooks typically include classes / spells / world-flavor but rarely include one entry per attribute or skill. The generator fills those routinely.

**Fields consumed (all optional — generator no-ops on absence):**
- `attributes[]` — emits one entry per attribute, keyed on the attribute name + abbreviation.
- `skills[]` — emits one entry per skill, keyed on the skill name; mentions the associated attribute when present.
- `conditions[]` — emits one entry per condition, keyed on the condition name.
- `derivedStats[]` — emits one entry per derived stat that has either a description or a `valueFormula`, keyed on the stat name.
- `difficulties{}` — when present, emits a single "Difficulty ladder reference" entry keyed on `"DC"`, `"difficulty"`, `"target number"`, `"TN"`, `"threshold"`. Lists every difficulty band with its threshold value.

**Override block:** `ruleset.lorebookExpansions` (array). When present, generator returns it verbatim.

**Output shape (one attribute entry):**
```json
{
  "name": "Attribute: Strength (STR)",
  "keys": ["Strength", "STR"],
  "content": "Exalted 3rd Edition attribute. Strength (STR) [Physical] — Raw muscle. Lifting, melee damage.",
  "position": 0,
  "selective": false,
  "constant": false
}
```

**Merge contract:** `build-bundle.mjs` merges derived entries into the hand-authored `lorebook.json` entries during build. **Hand-authored entries win on name conflict** — if you ship an explicit `"Attribute: Strength (STR)"` entry in `lorebook.json` with richer content, the derived entry is dropped. This is the right precedence — hand-authored is always more specific than auto-derived.

**Idempotency:** the existing bundle install path does delete-then-add for the entire managed lorebook (see `installBundle` in the extension JS). Re-builds change the bundle.json contents; re-installs replace all entries. No install-time tracking field needed; no accumulation across re-installs.

**Worked example (Exalted):** Exalted3e ships 85 hand-authored lorebook entries. The generator derives 48 more (9 attributes + 25 skills + 13 derived/conditions + 1 difficulty ladder). Final bundle: 133 entries. The AI now gets ruleset-aware context whenever any attribute / skill / condition name appears in the chat, even if the hand-authored lorebook didn't cover it.

**Per-ruleset derived counts (10/10 shipping rulesets, 2026-05-17):**
- coc7e: 61 derived | dnd5e: 42 derived | exalted3e: 48 derived | fate-core: 26 derived | gurps-lite: 36 derived
- lasers-and-feelings: 2 derived | pathfinder2e: 43 derived | stewpot: 7 derived | trophy-dark: 12 derived | vtmv20: 63 derived

### `tools/build-pre-input-transformer.mjs` *(Vector 5 — pre-input ruleset re-framing)*

**Input:** ruleset object. **Output:** a single agent object shaped to fit `bundle.additionalAgents[]`, or `null` if no hints are declared.

**Purpose:** derive a `pre_generation` agent that recognizes common player-input phrases ("I parry", "I attack", "I spend essence") and annotates them with ruleset-flavored framing BEFORE the main narration model writes the next turn. Distinct from Vector 9 (regex scripts only rewrite AI output) — Vector 5 shapes how the AI THINKS about an action.

**Fields consumed:**
- `ruleset.vocabularyHints[]` (optional) — array of `{ pattern, hint }` pairs. Each `pattern` is a natural-language match (verb/phrase/mechanic name); each `hint` is one-sentence guidance the agent uses to annotate matching input.

**Override block:** `ruleset.preInputTransformerAgent` (full agent object). When present, generator returns it verbatim — useful when authors want richer prompt content than the hint-table format.

**No-op behavior:** when both `vocabularyHints` is absent/empty AND `preInputTransformerAgent` is absent, generator returns `null` and the bundle ships no transformer.

**Output shape:**

```jsonc
{
  "role": "pre-input-transformer",
  "name": "<Ruleset Name> — Pre-Input Transformer",
  "description": "Re-frames common player-input phrases in <Ruleset Name>-native vocabulary...",
  "phase": "pre_generation",
  "enabled": false,
  "promptTemplate": "/* Generated prompt with a recognition table from vocabularyHints */",
  "settings": {}
}
```

The agent is pushed into `bundle.additionalAgents[]` at build time, so the existing additionalAgents install path handles it — no separate installer code needed. `enabled: false` keeps the install lean; user opts in via Marinara Settings → Agents.

**Worked example — Exalted vocabularyHints:**

```jsonc
{
  "id": "exalted3e",
  "vocabularyHints": [
    { "pattern": "I parry / I block (an attack)",
      "hint": "In Exalted, parry uses Parry DV (Static value; no roll needed unless adding charms). Note the character's stored Parry DV and any active charm modifiers." },
    { "pattern": "I dodge / I evade (an attack)",
      "hint": "In Exalted, dodge uses Evasion DV (Static value; no roll). Note Evasion DV; subtract -1 onslaught penalty for each successive attack this round." },
    { "pattern": "I attack with my weapon",
      "hint": "In Exalted, an attack rolls Attribute + Ability + accuracy bonus + Charm dice..." }
  ]
}
```

The generated agent recognizes those patterns and annotates each matching turn with `[exalted3e annotation] <re-frame guidance>`, which the main narration model reads before writing the scene.

### `tools/build-agents.mjs`

**Input:** ruleset directory (uses `agents/*.md` + optional per-ruleset overrides). **Output:** `agents.json` in the same directory.

**Purpose:** assemble the five overlay agents (`combat-adjudicator`, `lore-query`, `npc-bookkeeper`, `state-mutator`, `state-reminder`) into a single import payload. Bundles can OPTIONALLY embed these via `bundle.additionalAgents`; the preferred v0.4.x+ flow is the standalone `agents.json` + agent-import dialog.

**Override surface:** drop `agents/<role>.md` into a per-ruleset directory to override the shared baseline for that ruleset. Roles can also be introduced per-ruleset (no shared baseline required).

See `docs/AUTHORING.md` Step 5 for the agent-prompt authoring guide.

### `tools/build-character-card.mjs`

**Input:** ruleset object. **Output:** ruleset-specific character sheet HTML/structure for the engine's character-card UI.

**Purpose:** generate the character-sheet shell from `ruleset.attributes` + `skills` + `derivedStats` + `sections.*`. Runs as part of the broader build pipeline but emits to a different artifact path.

### `tools/embed-css.mjs`

**Input:** extension JS + CSS file(s). **Output:** single JS file with CSS embedded as a `style` injection. Build-tooling-only — no ruleset author touches this.

### `tools/validate-bundle.mjs`

**Input:** `bundle.json` path. **Output:** PASS/FAIL. **Purpose:** validates the full bundle envelope against `schema/bundle.schema.json` AND validates the embedded ruleset against `ruleset.schema.json`. Always run after build before publishing.

## Author override blocks

If a generator can't produce what your ruleset needs, drop one of these blocks into `ruleset.json` and the generator passes it through verbatim:

| Block | Owned by | Effect |
|-------|----------|--------|
| `regexScripts: [...]` | build-regex-scripts.mjs | Generator returns the array as-is. Use when you need a specific surface rewrite the auto-derivation doesn't capture. |
| `customTools: [...]` | build-custom-tools.mjs | Generator returns the array as-is. Use to ship script-type math tools (requires `CUSTOM_TOOL_SCRIPT_ENABLED=true` on the engine), additional static reference tools, or webhook tools pointing at your own service. |
| `lorebookExpansions: [...]` | build-lorebook-expansions.mjs | Generator returns the array as-is. Use when you want custom auto-derived entries (e.g. one entry per class, per spell school, per condition group) that the default attribute/skill/condition derivations don't cover. Hand-authored entries in `lorebook.json` still win on name conflict at merge time. |

## Class-driven hit dice (D&D / PF2e / class-based systems)

For class-based systems where the hit-die size depends on the chosen class, the schema provides two coordinated fields:

- **`ruleset.classOptions[]`** — list of class/playbook choices the sheet header picks from. Each entry is `{ name, hitDie, description? }`.
- **`resources[].dieFromClass: true`** — opt-in flag on any `type: "dice"` resource that signals "use the selected class's `hitDie` instead of my static `die` field".

**Spec layer (shipped today):** `classOptions[]` populates and validates. Resources can declare `dieFromClass: true`. The static `die` continues to be applied as the current behavior — see "Renderer wiring deferred" below.

**Worked example — D&D 5e:**

```jsonc
{
  "id": "dnd5e",
  "name": "D&D 5th Edition",
  "classOptions": [
    { "name": "Artificer", "hitDie": "d8",  "description": "Magical inventor — half-caster, item-creation focus." },
    { "name": "Barbarian", "hitDie": "d12", "description": "Rage-fueled martial; highest base HP per level." },
    { "name": "Fighter",   "hitDie": "d10", "description": "Martial specialist, Action Surge." },
    { "name": "Sorcerer",  "hitDie": "d6",  "description": "Innate full caster, Metamagic." },
    /* ...9 more classes... */
  ],
  "resources": [
    {
      "id": "hit-dice",
      "label": "Hit Dice",
      "type": "dice",
      "die": "d8",
      "dieFromClass": true,
      "max": "{Level}",
      "current": "{Level}"
    }
  ]
}
```

The `hit-dice` resource's count is wired to `{Level}` — so as the player levels up, the resource's max increases automatically. The die size will switch to match the selected class once renderer wiring lands.

**Renderer wiring deferred (handoff for next session):**
- The Class header field is currently free-text (`raceLabel` / `classLabel` from `header`). To honor `classOptions[]`, the renderer needs to detect the field's presence and replace the text input with a `<select>` driven by the array.
- The selected class needs to write into a state slot (e.g. `state.sheet.derived.__selectedClass`).
- `type: "dice"` resources with `dieFromClass: true` need to read that state and substitute `die` at render time.
- Estimated scope: ~50-100 lines in `RPG-Extension-GM-Mode.js`. Tracked as a next-session deliverable.

**Why ship the spec without the renderer tonight:** the dual-layer split lets ruleset authors declare class-driven hit dice TODAY (the data lands in `bundle.json`, validates against schema, persists across re-builds). When the renderer ships, every existing class-driven ruleset activates without further author work. The alternative — wait until the renderer is also done — would leave the spec under-tested and delay value.

## Custom renderers (open extensibility)

Some sheet UI components are pluggable per-ruleset via the `resources[]` array with `type: "custom"` and a `rendererConfig` object. The extension JS registers named renderer components (e.g. `v20-health-track`); a ruleset declares which renderer to use and supplies the config the renderer reads.

**The `rendererConfig` field is intentionally open** (`additionalProperties: true` on the schema). Renderers iterate over arrays and read configured shapes — they don't hardcode counts or specific entries. That means a ruleset author can extend the configured data without touching extension code, as long as the renderer's iteration logic accommodates the variation.

### Worked example: V20 → W20 wound-penalty ladder

The `v20-health-track` renderer reads `rendererConfig.levels[]` and renders one box per entry, applying each entry's `penalty` when wound severity reaches that row. **The array length is not capped** — the renderer iterates `levels.forEach(...)` (see `RPG-Extension-GM-Mode.js` line 13526).

V20 ships seven levels (Bruised 0 / Hurt -1 / Injured -1 / Wounded -2 / Mauled -2 / Crippled -5 / Incapacitated -99). A W20-flavored bundle that wants additional intermediate rows or a different penalty curve simply declares its own ladder:

```jsonc
{
  "id": "w20-werewolf",
  "name": "Werewolf: The Apocalypse 20th",
  /* ... rest of ruleset.json ... */
  "resources": [
    {
      "id": "health",
      "label": "Health",
      "type": "custom",
      "rendererConfig": {
        "component": "v20-health-track",
        "levels": [
          { "label": "Bruised",       "penalty":  0 },
          { "label": "Hurt",          "penalty": -1 },
          { "label": "Injured",       "penalty": -1 },
          { "label": "Wounded",       "penalty": -2 },
          { "label": "Mauled",        "penalty": -2 },
          { "label": "Crippled",      "penalty": -5 },
          { "label": "Crippled (W20)", "penalty": -5 },
          { "label": "Incapacitated", "penalty": -99 }
        ],
        "damageTypes": [
          { "id": "bashing",    "label": "B", "severity": 0 },
          { "id": "lethal",     "label": "L", "severity": 1 },
          { "id": "aggravated", "label": "A", "severity": 2 }
        ]
      }
    }
  ]
}
```

The extra `Crippled (W20)` row renders as its own box with its own −5 penalty. Each box's tooltip uses its `label`; the wound-summary line aggregates the highest active penalty.

**What you can change per ruleset without touching extension code:**
- Number of levels (array length is unconstrained)
- Label of each level
- Penalty value of each level (positive penalty values are also accepted — useful for systems with bonus tiers)
- Damage type list (the renderer iterates `damageTypes[]` the same way)
- Severity ordering of damage types

**What you can't change without extension code:**
- The visual layout (boxes in a row with severity-stacked icons)
- The chat-tag protocol for damage application (state-mutator parses `[mrr-state: field="bashing" delta="+3"]` with fixed field names)
- The renderer's `component` name itself

For systems whose health-track shape is fundamentally different (e.g. exhaustion levels with non-uniform effects), a new renderer component would need to be registered in extension JS — out of scope for spec-only bundle authoring.

## Bundle schema versioning + backward compat

- `bundle.schema` is `"mrr-bundle"` (GM-mode) / `"mrrp-bundle"` (RP-mode). Discriminator the extension uses to route bundle vs plain ruleset paste.
- `bundle.version` is `1` (integer). Bump on breaking schema changes; readers refuse unknown versions.
- `bundle.minExtensionVersion` (optional string) — installer refuses if framework version < this.
- New OPTIONAL fields (like `regexScripts`) are added freely without bumping `version`. Older extensions that don't know the field simply ignore it.
- New REQUIRED fields require a major-version bump and a coordinated extension release.

**Backward compat contract:** any bundle.json that validates against v0.4.x schema MUST continue to validate against future schemas. The current schema additions for Vector 9 (`regexScripts`) follow this rule — the field is optional, no existing bundle is invalidated.

## AI scaffolding workflow

To have a chatbot AI scaffold a new ruleset for system X:

1. **Open the chatbot** (claude.ai, ChatGPT, Gemini, anything that reads URLs + emits JSON).
2. **Paste the prompt template** from `AUTHORING-PROMPT.md`.
3. **Replace `<<YOUR SYSTEM>>`** with the actual system name (e.g. "Cyberpunk RED").
4. **Also paste** these files into the chat context:
   - `docs/AUTHORING-PHASE-6.md` (live schema, all 9 resolution modes)
   - `docs/BUILDING.md` (this doc, for generator pipeline + overrides)
   - `schema/ruleset.schema.json` (authoritative spec shape)
5. The AI returns a complete `ruleset.json`. Drop it into `rulesets/<id>/`.
6. The AI also returns a `lorebook.json`. Drop it alongside.
7. (Optional) AI also returns a `gm-agent.md`. Drop it alongside.
8. Run the build:
   ```bash
   node tools/validate-ruleset.mjs rulesets/<id>/ruleset.json
   node tools/build-bundle.mjs rulesets/<id>/
   node tools/validate-bundle.mjs rulesets/<id>/bundle.json
   ```
9. Install the bundle via the extension's Ruleset dialog.

**Why this works:** every generator under `tools/` is purely deterministic + schema-driven. The AI never needs to write JavaScript or know how the extension installs things — it only needs to fill in `ruleset.json` correctly. Schema validation + bundle build + bundle validation catch errors before install.

## Anti-goals (what the build pipeline does NOT do)

- **Does NOT modify engine source.** Overlay-only by construction. See `docs/ENGINE-CONSTRAINTS.md` for the full list of engine walls.
- **Does NOT do per-ruleset hand-craft inside the generators.** Every conditional in a generator branches on a `ruleset.json` field, never on a hardcoded `id === "exalted3e"`.
- **Does NOT skip schema validation.** Every artifact runs through Ajv. The chatbot-AI scaffolding flow exists precisely BECAUSE the validator catches the AI's mistakes.
- **Does NOT install partial bundles.** The extension's `installBundle()` flow either lands everything (ruleset + lorebook + agents + regex scripts) or surfaces an error.

## Versioning this doc

This doc is the **system of record for the build contract**, equal in standing to the JSON schemas. When a new generator lands, this doc gains a section in the same session that ships the generator. When a generator changes its input/output shape, this doc updates with it. Stale build docs are a system bug.

Last updated: 2026-05-20 (Vectors 9 + 3 + 2 + 5 shipped; Vector 8 next; Phase 1 of the feasibility doc nearly complete).
