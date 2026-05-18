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

(Author-override blocks for `customTools` and `lorebookExpansions` arrive with Vectors 3 + 2 — sections will be added here when those land.)

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

Last updated: 2026-05-17 (Vector 9 / regex-scripts pipeline shipped). Generators 3 + 2 sections pending Step 2 + Step 3 of this overnight session.
