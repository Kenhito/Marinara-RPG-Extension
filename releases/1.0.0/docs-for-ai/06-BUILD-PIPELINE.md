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

**Input:** `rulesets/<your-system>/{ruleset.json, lorebook.json}`
**Output:** `rulesets/<your-system>/bundle.json`
**When to run:** after `ruleset.json` or `lorebook.json` change.

```bash
node tools/build-bundle.mjs rulesets/<your-system>/
node tools/build-bundle.mjs --all                          # all rulesets
npm run build-bundles                                      # same as --all
```

What it does:

1. Reads `ruleset.json` and `lorebook.json` from the ruleset directory.
2. Wraps them in the `mrr-bundle` envelope:
   ```json
   {
     "schema": "mrr-bundle",
     "version": 1,
     "minExtensionVersion": "0.4.0",
     "authorId": "kenhito",
     "generator": { "name": "build-bundle.mjs", "version": "..." },
     "ruleset": { /* ruleset.json content */ },
     "lorebook": { /* lorebook.json content with id fields stripped from entries */ }
   }
   ```
3. Strips `id` fields from lorebook entries (Marinara assigns its own server-side IDs).
4. Writes `rulesets/<your-system>/bundle.json`.

The bundle is the file users paste into Marinara's Ruleset dialog (Choose file, Fetch URL, or paste-into-textarea).

**Note:** as of bundle schema v1, agents are **NOT** included in the bundle. They install through a separate path (Tool 3 below). This decoupling lets you ship prompt updates without forcing users to reinstall the entire ruleset.

## Tool 3 — `tools/build-agents.mjs`

**Input:** `rulesets/<your-system>/{gm-agent.md, agents/*.md}` plus the shared `agents/*.md`
**Output:** `rulesets/<your-system>/agents.json`
**When to run:** after any agent prompt edit (per-system or shared baseline).

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

The agents.json is what users paste into Marinara's Import Agents dialog. The dialog does **delete-then-replace** — re-importing after a prompt edit cleanly resyncs without leaving stale duplicates.

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

# 2. Build the bundle (ruleset + lorebook envelope)
node tools/build-bundle.mjs rulesets/<your-system>/

# 3. Build the agents collection
node tools/build-agents.mjs rulesets/<your-system>/

# 4. Validate the bundle
node tools/validate-bundle.mjs rulesets/<your-system>/bundle.json

# 5. Optional: rebuild all reference bundles to confirm nothing else broke
npm run validate-rulesets
npm run validate-bundles
npm run build-bundles
```

The two artifacts you ship to users are `rulesets/<your-system>/bundle.json` and `rulesets/<your-system>/agents.json`.

## End-to-end install for a user

A user installs your ruleset by:

1. **Paste the framework JS into Extensions** (one-time, system-independent). Marinara → Settings → Extensions → Add Extension → paste `extension/RPG-Extension-GM-Mode.js` (the version with embedded CSS) into the JS field. CSS field stays empty.
2. **Paste the bundle into the Ruleset dialog**. Click the gear icon on the floating sheet → Ruleset → paste `bundle.json` into the textarea → Save.
3. **Paste the agents into the Import Agents dialog.** Marinara → Settings → Agents → Import → paste `agents.json` → Confirm.
4. **Attach the lorebook and enable the agents per game.** After launching or creating a game, attach the ruleset's lorebook to that game, then enable the MRR agents for it (agents are enabled per game at load time, not during generation). Without the attached lorebook the agents have no ruleset info to follow.

## What changes when you edit which files

| Edited file | Run | Then |
|---|---|---|
| `ruleset.json` | `validate-ruleset.mjs`, then `build-bundle.mjs` | User reinstalls bundle |
| `lorebook.json` | `build-bundle.mjs` | User reinstalls bundle |
| `gm-agent.md` | `build-agents.mjs` | User re-imports agents |
| `agents/<role>.md` (shared) | `build-agents.mjs` for every ruleset that inherits | Each affected user re-imports agents |
| `rulesets/<sys>/agents/<role>.md` (override) | `build-agents.mjs <sys>` | User re-imports agents for that system |
| `extension/<file>.css` | `embed-css.mjs` | User pastes new framework JS |
| `extension/<file>.js` | nothing (already final) | User pastes new framework JS |

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

### Reputation tag 50-char limit

Marinara's `/api/game/reputation/update` endpoint validates `action` strings at max 50 characters. The default narrator prompt instructs models to emit `[reputation: npc="Name" action="..."]` tags without communicating this limit. Verbose models (Opus, GPT-4-class) routinely emit 100+ char actions and trigger 400 errors that surface as connection toasts.

Every `gm-agent.md` should include a paragraph telling the model the limit. Copy from any reference ruleset's prompt (search for "Engine compatibility — reputation tags").

### Combat encounter modal stays d20-shaped

Marinara's combat-encounter modal is server-coded with hardcoded D&D-style stat blocks. The overlay cannot replace it. Combat narration uses your system's vocabulary; the modal stays d20-shaped. Recommend players use narrative combat for non-d20 systems.

### `RPGAttributes` is typed to D&D's six attrs

The engine's `PlayerStats.attributes` field cannot store arbitrary attribute names. The overlay persists the sheet to browser localStorage instead. The "Sync to chat" button copies values into the chat's free-form `customTrackerFields[]` so the main narrator agent can see them.

### Character sheets are keyed to chat ID

Marinara's chat IDs rotate per session. Sheets in localStorage are keyed by chat ID, so a fresh chat looks like a brand-new character. The sheet's save/load buttons export/import all characters as a JSON file to work around this.

## Next

Read **07-EXAMPLE-PROMPTS.md** for ready-to-paste prompts that an AI assistant can use to author a complete ruleset for a new system.
