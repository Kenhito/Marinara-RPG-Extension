# 06 — Build Pipeline

This document explains how source files become user-installable artifacts. There are three CLI tools, each producing one output. Run them in order after editing source files.

## Tool 1 — `tools/validate-ruleset.mjs`

**Input:** `rulesets/<your-system>/ruleset.json`
**Output:** stdout (PASS / FAIL with field paths)
**When to run:** after editing `ruleset.json`, before building anything else.

```bash
node tools/validate-ruleset.mjs rulesets/<your-system>/ruleset.json
node tools/validate-ruleset.mjs --all                              # all rulesets
npm run validate-rulesets                                          # same as --all
```

The validator uses Ajv to check against `schema/ruleset.schema.json` (JSON Schema draft 2020-12). Errors print exact JSON Pointers to offending fields. The schema's `additionalProperties: false` at every level catches typos and stray fields.

## Tool 2 — `tools/build-bundle.mjs`

**Input:** `rulesets/<your-system>/{ruleset.json, lorebook.json, gm-agent.md}` plus the shared `agents/*.md` and any per-system `rulesets/<your-system>/agents/*.md` overrides
**Output:** `rulesets/<your-system>/bundle.json`
**When to run:** after `ruleset.json`, `lorebook.json`, `gm-agent.md`, or any agent prompt file changes.

```bash
node tools/build-bundle.mjs rulesets/<your-system>/
node tools/build-bundle.mjs --all                          # all rulesets
npm run build-bundles                                      # same as --all
```

What it does:

1. Reads `ruleset.json`, `lorebook.json`, and `gm-agent.md` from the ruleset directory.
2. Resolves the role-agent pool (`combat-overseer`, `context-fuser`, `state-mutator`, plus any optional per-system agents) the same way `build-agents.mjs` does: per-system override at `rulesets/<system>/agents/<role>.md` wins if present, otherwise the shared baseline at `agents/<role>.md` applies.
3. Derives additional lorebook entries from `ruleset.json` fields (attributes, skills, conditions, derivedStats, difficulties) and merges them with the hand-authored `lorebook.json` entries — hand-authored entries win on a name conflict. See `04-LOREBOOK-FORMAT.md` for what this typically adds.
4. Strips `id` fields from lorebook entries (Marinara assigns its own server-side IDs).
5. Wraps everything in the `mrr-bundle` envelope:
   ```json
   {
     "schema": "mrr-bundle",
     "version": 1,
     "minExtensionVersion": "0.4.0",
     "authorId": "kenhito",
     "generator": { "name": "build-bundle.mjs", "version": "..." },
     "ruleset": { /* ruleset.json content */ },
     "gmAgent": { "name": "...", "phase": "pre_generation", "promptTemplate": "...", "settings": {} },
     "lorebook": { /* merged lorebook.json content, id fields stripped from entries */ },
     "additionalAgents": [
       { "role": "combat-overseer", "name": "...", "phase": "pre_generation", "enabled": true, "promptTemplate": "...", "settings": {} },
       { "role": "context-fuser", "...": "..." },
       { "role": "state-mutator", "...": "..." }
       /* plus any optional pre-input-transformer or per-system parallel-phase agents */
     ]
     /* regexScripts, customTools, scenarioDefault appear only when the ruleset generates them */
   }
   ```
6. Writes `rulesets/<your-system>/bundle.json`.

**The bundle is the ONE file users import** — through the extension's **Ruleset** dialog (Choose file, Fetch URL, or paste-into-textarea), then **Save and reload**. This single import installs the sheet/dice config, the lorebook, the main GM agent, AND every role agent in `additionalAgents[]` (all forced `enabled: true` — GM-mode has no per-agent import toggle at install time; per-game enablement is separate, see "End-to-end install for a user" below). Re-installing an updated bundle updates the extension's managed agents/lorebook in place (keyed by `mrrAgentRole` / ruleset id) rather than duplicating.

**Agents are embedded, not separate.** Earlier bundle-schema revisions kept agents out of the bundle and installed them through a standalone `agents.json` + an "Import Agents" dialog. That path no longer exists for GM-mode — `additionalAgents[]` inside `bundle.json` is the only install mechanism. `tools/build-agents.mjs` (Tool 3, below) still produces a standalone `agents.json`, but purely as a toolchain-parity artifact; nothing in the current install flow reads it.

## Tool 3 — `tools/build-agents.mjs`

**Input:** `rulesets/<your-system>/{gm-agent.md, agents/*.md}` plus the shared `agents/*.md`
**Output:** `rulesets/<your-system>/agents.json`
**When to run:** optional. Not required for install — `build-bundle.mjs` (Tool 2) already embeds every resolved agent prompt into `bundle.json`, which is the file users actually import. Run this tool only if you want a standalone `agents.json` for inspection, diffing, or external toolchain parity.

```bash
node tools/build-agents.mjs rulesets/<your-system>/
node tools/build-agents.mjs --all                          # all rulesets
```

What it does:

1. Reads the union of role names from `agents/` (shared baselines) and `rulesets/<system>/agents/` (per-system overrides).
2. For each role, reads the per-system override if present, otherwise the shared baseline.
3. Reads `rulesets/<system>/gm-agent.md` as the `main` role.
4. Extracts each agent's `promptTemplate` from its Markdown text-fence block.
5. Wraps them in the `mrr-agents` envelope:
   ```json
   {
     "schema": "mrr-agents",
     "version": 1,
     "rulesetId": "<your-system-id>",
     "rulesetName": "<your-system-name>",
     "authorId": "kenhito",
     "generator": { "name": "build-agents.mjs", "version": "1.0.0" },
     "agents": [
       { "role": "main", "name": "...", "enabled": true, "promptTemplate": "...", ... },
       { "role": "combat-overseer", ... },
       { "role": "context-fuser", ... },
       { "role": "state-mutator", ... },
       ...
     ]
   }
   ```
6. Writes `rulesets/<your-system>/agents.json`.

**`agents.json` is a toolchain-parity artifact, not an install file.** GM-mode has no "Import Agents" dialog — there is nothing in the current install flow that reads `agents.json`. Users install and update agent prompts exclusively by (re-)importing `bundle.json` (Tool 2), whose `additionalAgents[]` array is built from the exact same resolved prompts. Keep running `build-bundle.mjs` after any agent prompt edit; running `build-agents.mjs` too is optional.

## Tool 4 (extension-side) — `tools/embed-css.mjs`

**Input:** `extension/RPG-Extension-GM-Mode.css`
**Output:** updates `extension/RPG-Extension-GM-Mode.js` between the `EMBEDDED_CSS_BEGIN`/`EMBEDDED_CSS_END` markers
**When to run:** only when you've edited the extension's CSS file.

```bash
node tools/embed-css.mjs
npm run embed-css
```

This collapses the framework's stylesheet into a JSON-stringified constant inside the JS file, so users only paste one file (the JS) instead of two. Don't hand-edit the embedded section — the script regenerates it idempotently.

## End-to-end build for a new system

Assuming you've already authored the source files:

```bash
cd <repo-root>

# 1. Validate the schema
node tools/validate-ruleset.mjs rulesets/<your-system>/ruleset.json

# 2. Build the bundle (ruleset + lorebook + gmAgent + additionalAgents envelope)
node tools/build-bundle.mjs rulesets/<your-system>/

# 3. Optional: build the standalone agents.json (toolchain parity only, not installed by users)
node tools/build-agents.mjs rulesets/<your-system>/

# 4. Validate the bundle
node tools/validate-bundle.mjs rulesets/<your-system>/bundle.json

# 5. Optional: rebuild all reference bundles to confirm nothing else broke
npm run validate-rulesets
npm run validate-bundles
npm run build-bundles
```

**The one artifact you ship to users is `rulesets/<your-system>/bundle.json`.** `agents.json` is produced for toolchain parity only; nothing in the install flow consumes it.

## End-to-end install for a user

A user installs your ruleset by:

1. **Import the framework extension once, per Marinara install** (system-independent, skip if already installed for another ruleset). Marinara → **Settings → Addons → External Extensions → Import** → pick `Marinara-RPG-Extension.extension.zip` from the project's `releases/<version>/` folder. It arrives disabled and unapproved — open it and click **Review and Run** to approve its code hash and enable it. Never import the loose `RPG-Extension-GM-Mode.js` file by itself: on Marinara 2.4.3+ that installs as a sandboxed Worker extension with no page access and silently does nothing.
2. **Load the bundle into the Ruleset dialog.** Click the **Ruleset** button in the chat header → load `bundle.json` (Choose file, Fetch URL, or paste into the textarea) → **Save and reload**. This one import installs the ruleset (sheet + dice widget), the lorebook, the main GM agent, and every role agent in `additionalAgents[]` — all bundled together as data, no extension re-approval needed.
3. **Attach the lorebook and enable the agents per game.** After launching or creating a game, attach the ruleset's lorebook to that game, then enable the MRR agents for it (agents are enabled per game at load time, not during generation). Without the attached lorebook the agents have no ruleset info to follow.

## What changes when you edit which files

| Edited file | Run | Then |
|---|---|---|
| `ruleset.json` | `validate-ruleset.mjs`, then `build-bundle.mjs` | User reinstalls bundle |
| `lorebook.json` | `build-bundle.mjs` | User reinstalls bundle |
| `gm-agent.md` | `build-bundle.mjs` (re-embeds the `gmAgent` prompt) | User reinstalls bundle |
| `agents/<role>.md` (shared) | `build-bundle.mjs` for every ruleset that inherits | Each affected user reinstalls that ruleset's bundle |
| `rulesets/<sys>/agents/<role>.md` (override) | `build-bundle.mjs <sys>` | User reinstalls that ruleset's bundle |
| `extension/<file>.css` | `embed-css.mjs` | User re-imports the extension zip |
| `extension/<file>.js` | nothing (already final) | User re-imports the extension zip |

`build-agents.mjs` reruns are optional in every row above — they refresh the toolchain-parity `agents.json` but nothing user-facing depends on it.

## CI gates

Before declaring a release ready, all of these must pass:

```bash
npm run validate-rulesets                                    # JSON schema gate
npm run validate-bundles                                     # bundle envelope gate
node --check extension/RPG-Extension-GM-Mode.js              # JS syntax gate
node -e "new Function('marinara', require('fs').readFileSync('extension/RPG-Extension-GM-Mode.js','utf8'))"
                                                              # Function-body parse gate (catches ES2015+ that breaks new Function)
```

### Validator-PASS is necessary, not sufficient

A green validator confirms **shape**, not **semantics**. The validator cannot detect that a `dice.notation` string like `"ND6 + pips vs Difficulty"` is semantically incompatible with `resolution.mode: "single-roll"` — both are free-text strings and both pass. Likewise: a ruleset declaring `dice-pool-sum` with a `wildDie` block but a `poolFormula` referencing the wrong attribute will validate green and silently mis-roll at runtime.

**After validation passes, run the cross-check pass:** paste the bundle back to your AI assistant with the prompt template at the bottom of `07-EXAMPLE-PROMPTS.md` (the "Validation prompt — paste output back to AI for review" section). The prompt includes a dice-mechanic / resolution-mode coherence check (item #7) that catches semantic mismatches the schema cannot.

The full gate ladder is: schema validation → bundle validation → JS syntax → AI cross-check pass → in-engine smoke test. Schema validation alone catches malformed JSON; nothing automated catches "the dice widget is rolling the wrong dice for this ruleset's stated mechanics."

## Adding a new resolution mode

If your target system's dice math doesn't fit any of the supported modes (single-roll / dice-pool / dice-pool-sum / d100-percentile / 2d6-stat / roll-under / fate-ladder / stance-modal-pool / narrative-handled), you're extending the framework, not just adding data files. Pre-v0.4.2 docs only mentioned five modes; v0.4.2 catches the docs up to the live schema.

The simplest escape hatch is `narrative-handled` mode (NEW in v0.4.2) — a documented "lossy but functional" path: declare `mode: narrative-handled` + `description`, and the dice widget renders a generic manual NdX widget the player drives. The narrator does the math. No framework JS change required. Use this when your system's mechanics are described in prose and you don't need automated dice resolution.

For full framework integration of an unsupported mode:

The work spans two files:

1. **`schema/ruleset.schema.json`** — append a new branch to `resolution.oneOf` declaring your mode's required fields. Keep `additionalProperties: false`.
2. **`extension/RPG-Extension-GM-Mode.js`** — add a `MODES` constant entry, a dispatch branch in `buildDice()`, a `buildXWidget()` for the input UI, a `rollX()` for the dice math + outcome computation, and optionally a `quickRollForSkill` branch.

Roughly 100 lines of code change. The `rollX()` should generate dice via `Math.random()`, compute outcome and shifts/successes, and call `finalizeRoll(text, kind, faces)` where `text` is the formatted `[your-mode: ...]` tag matching your `diceTagFormat.template` and `kind` is one of `"success"`, `"fail"`, `"botch"`, `"tie"` for CSS coloring.

This is a framework change. Users running an older framework JS won't see the new mode until they paste the new JS. Bump the bundle's `minExtensionVersion` so older installations refuse the new bundle and prompt for a framework update.

## Engine compatibility — gotchas to call out in your gm-agent

### Reputation tag length limit

Marinara's `/reputation/update` endpoint validates `action` strings against a max-length constant, `GAME_REPUTATION_ACTION_MAX_LENGTH` in `packages/server/src/routes/game.routes.ts`. **Verified against current engine HEAD (v2.4.4, commit `b1ec60409`) on 2026-08-22: that constant is 500 characters** (defined at line 1714, consumed at line 9913 as `action: z.string().min(1).max(GAME_REPUTATION_ACTION_MAX_LENGTH)`). Older project documentation describes a 50-character cap — that was accurate for engine v1.5.6 but the limit has since been widened; don't encode 50 as a hard fact. The default narrator prompt instructs models to emit `[reputation: npc="Name" action="..."]` tags without stating either number. Verbose models (Opus, GPT-4-class) can still trip a 400 error on an unusually long `action` string even at 500 characters.

Every `gm-agent.md` should include a paragraph telling the model to keep `action` short (a few words, not a sentence) — that's safe regardless of which numeric cap a given engine build enforces. Copy from any reference ruleset's prompt (search for "Engine compatibility — reputation tags"). If you need the exact number for a specific self-hosted engine, check that build's own `GAME_REPUTATION_ACTION_MAX_LENGTH` value rather than assuming 50 or 500.

### Combat encounter modal stays d20-shaped

Marinara's combat-encounter modal is server-coded with hardcoded D&D-style stat blocks. The overlay cannot replace it. Combat narration uses your system's vocabulary; the modal stays d20-shaped. Recommend players use narrative combat for non-d20 systems.

### `RPGAttributes` is typed to D&D's six attrs

The engine's `PlayerStats.attributes` field cannot store arbitrary attribute names. The overlay persists the sheet to browser localStorage instead. The "Sync to chat" button copies values into the chat's free-form `customTrackerFields[]` so the main narrator agent can see them.

### Character sheets are keyed to chat ID

Marinara's chat IDs rotate per session. Sheets in localStorage are keyed by chat ID, so a fresh chat looks like a brand-new character. The sheet's save/load buttons export/import all characters as a JSON file to work around this.

## Next

Read **07-EXAMPLE-PROMPTS.md** for ready-to-paste prompts that an AI assistant can use to author a complete ruleset for a new system.
