# Authoring Prompt — Build a Marinara-RPG-Extension Ruleset Bundle

> **This is the canonical entry point for authoring a new ruleset.** The prompt block below tells your chat AI to read the full current doc set itself — the system-agnostic architecture at [`releases/1.1.0/docs-for-ai/`](releases/1.1.0/docs-for-ai/) (agent architecture, ruleset schema, lorebook format, build pipeline) plus the newer schema surface at [`docs/AUTHORING-PHASE-6.md`](docs/AUTHORING-PHASE-6.md) — Resources cluster, sections.order / sections.hidden, autocalc derived stats with valueFormula / tooltipFormula / formulaShort, commitmentModel + commitmentPool, state-banner resource type, the **nine resolution modes** (single-roll, dice-pool, d100-percentile, 2d6-stat, fate-ladder, roll-under, stance-modal-pool, dice-pool-sum with Wild Die, narrative-handled — docs-for-ai only documents the first five), the item.hardness / item.moteCommitment + item.motePool auto-inheritance, **pipGranularity** (OpenD6 sub-die precision), **effects.onSpend** (Character-Points style spend-driven bonuses), **roundCounters[]** (per-round combat penalties), **penaltyKind** flat/dice on track cells, **abilities.groups[]** (V20 Talents/Skills/Knowledges trinity), and the **meritsFlaws** section type. You don't need to paste anything extra alongside the prompt block below — it names every file the AI needs to fetch (or, for file-upload-only AIs, the note further down lists exactly what to upload instead).

> ## ⚠️ Before authoring: does the schema support your system's dice mechanic?
>
> The schema supports **nine resolution modes** — single-roll, dice-pool, d100-percentile, 2d6-stat, fate-ladder, roll-under, stance-modal-pool, dice-pool-sum (with Wild Die), and narrative-handled. They cover the vast majority of shipping tabletop systems.
>
> **If your system's dice mechanic isn't one of the nine, STOP.** Don't try to encode it under the closest mode (that produces a sheet/widget that lies). Ask Kenhito in the **Marinara Extension community thread** (linked from the project README) or open an issue at the project's GitHub repo. Describe: system name + page reference for the resolution rule, shape of one full roll, any special mechanics (exploding dice, opposed rolls, multi-stat pulls, stance toggles), and what specifically breaks if you try to fit it under an existing mode. Schema additions are Kenhito's job, not yours.

---

This is a single-paste prompt for vibecoder authors. Copy everything between
the `=== PROMPT START ===` and `=== PROMPT END ===` markers below into your
favorite chat AI (claude.ai, ChatGPT, Gemini, Copilot, anything that can read
URLs and produce JSON). Replace `<<YOUR SYSTEM>>` with the RPG you want to
build. The AI will return a complete `bundle.json` you can paste into
Marinara-RPG-Extension's ruleset dialog.

---

## How this works

1. The AI reads the reference docs named in the prompt below:
   - [`releases/1.1.0/docs-for-ai/`](releases/1.1.0/docs-for-ai/) (01 through 07) — full schema, agent architecture, and authoring patterns
   - [`docs/AUTHORING-PHASE-6.md`](docs/AUTHORING-PHASE-6.md) — the newer schema fields docs-for-ai doesn't cover yet
   - [`schema/bundle.schema.json`](./schema/bundle.schema.json) — the bundle envelope
   - One or more reference bundles (D&D, Fate, Exalted) so it has worked examples
2. The AI produces a `bundle.json` matching the schema.
3. You copy that JSON into Marinara-RPG-Extension's "Ruleset" dialog.
4. The extension's installer creates the lorebook, the GM agent prompt, and
   activates the ruleset — all in one click.

If the JSON has issues, the install dialog shows a precise error pointing at
the broken field. **Copy that error back to your AI** and ask it to fix —
errors are written so the AI can act on them directly.

---

## The prompt

=== PROMPT START ===

I want a complete ruleset bundle for Marinara-RPG-Extension, a Marinara Engine
overlay that lets players run any tabletop RPG inside Marinara's Game Mode.

The system I want is: **<<YOUR SYSTEM>>**.

Read these files in the GitHub repo `Kenhito/Marinara-RPG-Extension`:

1. `releases/1.1.0/docs-for-ai/01-OVERVIEW.md` through
   `releases/1.1.0/docs-for-ai/07-EXAMPLE-PROMPTS.md` — read all seven, in
   numeric order. This is the primary authoring reference: the ruleset
   schema, the system-agnostic agent architecture, the lorebook format, and
   the build pipeline.
2. `docs/AUTHORING-PHASE-6.md` — the schema additions that shipped after the
   docs-for-ai set was written: the **nine resolution modes** (single-roll,
   dice-pool, d100-percentile, 2d6-stat, fate-ladder, roll-under,
   stance-modal-pool, dice-pool-sum with Wild Die, narrative-handled — the
   docs-for-ai set only documents the first five), the Resources cluster,
   autocalc derived stats, commitmentModel, and the other Phase 5/6/7
   fields. Section 1 has the full `resolution` block shape for each mode.
3. `schema/bundle.schema.json` — the JSON Schema for the file you'll produce.
4. `rulesets/dnd5e/bundle.json`, `rulesets/exalted3e/bundle.json`, and
   `rulesets/fate-core/bundle.json` — three complete worked examples in
   different resolution modes. **Pick whichever is closest to my system as
   your structural template.**

Then produce **one** valid `bundle.json` for `<<YOUR SYSTEM>>` that:

- Has top-level `schema: "mrr-bundle"` and `version: 1`.
- Embeds a complete `ruleset` matching `schema/ruleset.schema.json`. Pick the
  resolution mode that fits the system (d20 systems use `single-roll`; World
  of Darkness / Shadowrun use `dice-pool`; Call of Cthulhu / BRP use
  `d100-percentile`; PbtA games use `2d6-stat`; Fate-family uses
  `fate-ladder`). `d100-percentile` covers roll-HIGH percentile too
  (Rolemaster / RMSS-family): set `direction: "high"`, describe what the
  player adds in `bonusFormula` (descriptive only — the widget takes the
  bonus as a numeric input and does not parse the string), and add the
  optional `openEnded` block for exploding / imploding open-ended d100 —
  including `unusualFaces`, which flags `um=<face>` on the tag for
  unmodified first rolls and nothing more (the narrator decides what an UM
  means; the widget never picks a table row and never suppresses the roll).
  Field-by-field shape in `docs/AUTHORING-PHASE-6.md` §1.
- Has a `gmAgent` with a thorough `promptTemplate` (at least 800 words). The
  prompt must teach the LLM how to enforce the system's mechanics, what dice
  to call for, how to set difficulties, and what NOT to do. Mirror the
  structure of the reference bundles' prompts.
- Has a `lorebook` with at least 12 keyword-triggered entries covering core
  mechanics, common terminology, archetypes/classes/playbooks, and
  conditions/states. Each entry needs a `name`, `content`, `keys` array,
  and `position: 0`.
- Includes the **XP & Progression standard entries** (REQUIRED for any system
  with character advancement; see `docs/AUTHORING.md` Step 6a for the canonical
  text — mirror `rulesets/dnd5e/lorebook.json` for a leveled system or
  `rulesets/exalted3e/lorebook.json` for a pool-spend system):
  1. An always-on entry named exactly `XP Progression Mode` with
     `constant: true`, whose FIRST LINE is the bare switch `Progression: xp`,
     followed by the mode-neutral explainer (both modes described, "follow
     whichever mode the line above declares", the players-edit-one-line note,
     and the one-turn re-read latency note). This is how a table flips between
     GM-driven XP and manual milestone leveling without editing prompts.
  2. An `XP Awards` entry: the system's award guidelines (combat AND
     social/mental challenges AND good roleplay all earn awards — never
     combat-only), the party-wide clause (awards go to every player character,
     one award per PC, never NPCs), and for pool-spend systems the line "the
     player edits the sheet to spend XP; do not adjudicate spends".
  3. For leveled systems: a `Level-Up Procedure` entry carrying the system's
     FULL level/XP threshold ladder, framed as authoritative over model
     memory for all level math, plus the per-level procedure.
  4. Set the lorebook's top-level `tokenBudget` to at least 4096 so the large
     reference entries survive the engine's per-book assembly budget.
- Includes the engine compatibility paragraph from the reference bundles
  about the `[reputation: action="..."]` length cap (verified against current
  engine HEAD at 500 characters via `GAME_REPUTATION_ACTION_MAX_LENGTH` in
  `packages/server/src/routes/game.routes.ts` — some older reference text in
  this project describes a since-widened 50-character cap; regardless of
  which number an installation enforces, tell the model to keep `action` to
  a short verb phrase, not a sentence), adapted to the vocabulary of
  `<<YOUR SYSTEM>>`.

When you're done, output the bundle as a single fenced JSON code block. Do
not split it across multiple responses. Do not add commentary inside the JSON
— all explanation goes outside the code block.

=== PROMPT END ===

---

## If your AI can't browse the web (file-upload only)

Some chat AIs (the free ChatGPT tier, certain enterprise deployments) can't
fetch the GitHub repo but do accept uploaded files. In that case, before
pasting the prompt above, upload these files instead of pointing the AI at
the repo:

- This file, `AUTHORING-PROMPT.md`.
- All seven files in `releases/1.1.0/docs-for-ai/` (`01-OVERVIEW.md` through
  `07-EXAMPLE-PROMPTS.md`).
- `docs/AUTHORING-PHASE-6.md`.
- `schema/bundle.schema.json`.
- One or two reference bundles closest to your system, e.g.
  `rulesets/dnd5e/bundle.json` and `rulesets/exalted3e/bundle.json`.

Then tell the AI: *"I've uploaded the Marinara-RPG-Extension authoring docs
and reference bundles. Read the docs-for-ai files in order, then
AUTHORING-PHASE-6.md, then the schema and reference bundles. Now follow the
instructions in the prompt below."* — followed by the prompt block above
with the repo-reading step 1 replaced by "read the uploaded docs" and
`<<YOUR SYSTEM>>` filled in.

## Sub-agents (`additionalAgents[]`)

GM-mode bundles SHIP the canonical sub-agent pool in `additionalAgents[]`, all `enabled:true`:

- `combat-overseer` (pre_generation) — combat-math framing + NPC roster.
- `context-fuser` (pre_generation) — rules-query answers + player-state reminder.
- `state-mutator` (post_processing) — parses GM model output for `[mrr-state: ...]` tags and writes deltas to the sheet.

Optional additions when the ruleset needs them:

- `pre-input-transformer` (pre_generation) — auto-derived from `ruleset.vocabularyHints[]` (or a full author override at `ruleset.preInputTransformerAgent`). Translates D&D-flavored player input into ruleset vocabulary.
- Per-system parallel-phase overlays (e.g. `essence-manager` for `exalted3e`; `blood-pool-tracker` for `vtmv20`) — system-specific resource trackers that run alongside the narrator without blocking it.

Reference prompts for the three universal agents live at `agents/<role>.md`. Drop a per-system override at `rulesets/<your-system>/agents/<role>.md` to tune any of them; otherwise the shared baseline applies. Per-system parallel overlays live only at `rulesets/<your-system>/agents/<role>.md` — they're not shared because the resources they track are unique to that system. Each sub-agent has its own `role`-based idempotency key (`mrrAgentRole`) so the installer matches and updates in place on re-install instead of accumulating duplicates.

**Install posture (GM-mode, Marinara 2.4.3+):** the bundle **installs** the agents; the user **enables** them per game at load time, after the game launches (like any custom agents), and attaches the ruleset's lorebook to the game — without the lorebook the agents have no rules context and fail. The canonical pool above is the ONLY agent architecture — do not invent additional per-turn agents beyond it; a new mechanic should be a section of an existing agent's prompt unless it genuinely cannot be (and per-system `parallel` trackers are capped at one per ruleset).

**Document each sub-agent in the lorebook.** Conventionally, ship one lorebook entry titled "Sub-Agents — what they do and how to enable them" that lists each agent's purpose + the Settings → Agents flow. The dnd5e and exalted3e reference bundles in this repo show the canonical content.

---

## After you have the JSON

1. Open Marinara Engine (2.4.3+). Make sure the Marinara-RPG-Extension
   framework is installed once: **Settings → Addons → External Extensions →
   Import**, pick `Marinara-RPG-Extension.extension.zip` from the project's
   `releases/<version>/` folder, then open the import and click **Review and
   Run** to approve and enable it (it arrives disabled and unapproved). Never
   import the loose `RPG-Extension-GM-Mode.js` file by itself — on 2.4.3+
   that installs as a sandboxed Worker with no page access and silently does
   nothing.
2. Click the **Ruleset** button in the chat header.
3. In the dialog, load your `bundle.json` one of three ways: click
   **Choose file…** to upload it from disk, click **Fetch URL** with a raw
   URL, or paste the JSON into the textarea. Click **Save and reload**. The
   extension validates, then installs the lorebook, GM agent, and ruleset
   in one shot.

If validation fails, the dialog shows an error with the exact JSON path of
the problem, what was expected, and what was found. Copy that whole error
back to your AI. Tell it: *"The bundle install failed with this error:
\<paste\>. Produce a corrected bundle."* The AI fixes the field, hands you a
new JSON, you load it again (Choose file / Fetch URL / paste). Most issues
resolve in one iteration.

## After install

Your ruleset, GM agent, and lorebook are live. Open a Game Mode chat and the
sheet panel will reflect your system's attributes and skills. The dice button
in the chat header opens the resolution widget for whatever mode you chose.

To remove everything the install created (lorebook + GM agent), open the
Ruleset dialog and click **Uninstall server data**. The local ruleset cache
stays put — use the **Clear** button if you want to nuke that too.

## Sharing your bundle

Three options:

- **Direct file or copy-paste** — send the bundle.json file (or the JSON
  text) to your friends; they Choose file or paste into their dialog.
  Zero hosting.
- **Public Gist** — gist.github.com, paste, take the *Raw* URL, share that.
  The dialog's URL field auto-fetches.
- **Pastebin** — pastebin.com, set raw view. Same flow.

No GitHub account, no Node, no JavaScript. If your AI can produce JSON, you
can ship a ruleset.
