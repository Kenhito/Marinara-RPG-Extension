# Authoring Prompt — Build a Marinara-RPG-Extension Ruleset Bundle

> **CURRENT (Phase 5 / 6 / 7):** for the live schema — Resources cluster, sections.order / sections.hidden, autocalc derived stats with valueFormula / tooltipFormula / formulaShort, commitmentModel + commitmentPool, state-banner resource type, the **nine resolution modes** (single-roll, dice-pool, d100-percentile, 2d6-stat, fate-ladder, roll-under, stance-modal-pool, dice-pool-sum with Wild Die, narrative-handled), the item.hardness / item.moteCommitment + item.motePool auto-inheritance, **pipGranularity** (OpenD6 sub-die precision), **effects.onSpend** (Character-Points style spend-driven bonuses), **roundCounters[]** (per-round combat penalties), **penaltyKind** flat/dice on track cells, **abilities.groups[]** (V20 Talents/Skills/Knowledges trinity), and the **meritsFlaws** section type — see **[`docs/AUTHORING-PHASE-6.md`](docs/AUTHORING-PHASE-6.md)**. Paste that file into your chat AI's context alongside the prompt block below when authoring a new bundle.
>
> **v0.4 reference:** the AI-authoring documentation at [`releases/v0.4.0/docs-for-ai/`](releases/v0.4.0/docs-for-ai/) covers the pre-Phase-5 surface (system-agnostic agent architecture, typed damage, sorcery/multi-turn casting, the build pipeline). Read it AFTER `docs/AUTHORING-PHASE-6.md` if you want the deeper agent and pipeline context.
>
> This file remains as a pre-v0.4 single-paste template. It still produces a working v0.3-style bundle but doesn't cover v0.4 features (typed damage, sorcery, agents.json separation) or Phase 5/6/7 features (Resources cluster, commitment reconciler, card grid, OpenD6 pip granularity, V20 trinity, meritsFlaws). For a fully-current schema-aware bundle, paste the prompt block below PLUS `docs/AUTHORING-PHASE-6.md` into your chat AI; both fit comfortably in a single context window.

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

1. The AI reads three reference docs in this repo:
   - [`AGENTS.md`](./AGENTS.md) — full schema, mechanics, and authoring patterns
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

Read these three files in the GitHub repo `Kenhito/Marinara-RPG-Extension`:

1. `AGENTS.md` — the full authoring reference. Read all of it. It explains the
   ruleset schema, the nine resolution modes (single-roll, dice-pool,
   d100-percentile, 2d6-stat, fate-ladder, roll-under, stance-modal-pool,
   dice-pool-sum with Wild Die, narrative-handled), how the GM agent prompt is
   structured, how the lorebook fires, and what the engine does and does NOT
   support. See `docs/AUTHORING-PHASE-6.md` section 1 for the shape of each
   mode's full `resolution` block (especially the four added after Phase 5).
2. `schema/bundle.schema.json` — the JSON Schema for the file you'll produce.
3. `rulesets/dnd5e/bundle.json`, `rulesets/exalted3e/bundle.json`, and
   `rulesets/fate-core/bundle.json` — three complete worked examples in
   different resolution modes. **Pick whichever is closest to my system as
   your structural template.**

Then produce **one** valid `bundle.json` for `<<YOUR SYSTEM>>` that:

- Has top-level `schema: "mrr-bundle"` and `version: 1`.
- Embeds a complete `ruleset` matching `schema/ruleset.schema.json`. Pick the
  resolution mode that fits the system (d20 systems use `single-roll`; World
  of Darkness / Shadowrun use `dice-pool`; Call of Cthulhu / BRP use
  `d100-percentile`; PbtA games use `2d6-stat`; Fate-family uses
  `fate-ladder`).
- Has a `gmAgent` with a thorough `promptTemplate` (at least 800 words). The
  prompt must teach the LLM how to enforce the system's mechanics, what dice
  to call for, how to set difficulties, and what NOT to do. Mirror the
  structure of the reference bundles' prompts.
- Has a `lorebook` with at least 12 keyword-triggered entries covering core
  mechanics, common terminology, archetypes/classes/playbooks, and
  conditions/states. Each entry needs a `name`, `content`, `keys` array,
  and `position: 0`.
- Includes the engine compatibility paragraph from the reference bundles
  about the 50-character `[reputation: action="..."]` cap, adapted to the
  vocabulary of `<<YOUR SYSTEM>>`.

When you're done, output the bundle as a single fenced JSON code block. Do
not split it across multiple responses. Do not add commentary inside the JSON
— all explanation goes outside the code block.

=== PROMPT END ===

---

## Sub-agents (`additionalAgents[]`)

GM-mode bundles SHIP the canonical sub-agent pool in `additionalAgents[]`, all `enabled:true`:

- `combat-overseer` (pre_generation) — combat-math framing + NPC roster.
- `context-fuser` (pre_generation) — rules-query answers + player-state reminder.
- `state-mutator` (post_processing) — parses GM model output for `[mrr-state: ...]` tags and writes deltas to the sheet.

Optional additions when the ruleset needs them:

- `pre-input-transformer` (pre_generation) — auto-derived from `ruleset.vocabularyHints[]` (or a full author override at `ruleset.preInputTransformerAgent`). Translates D&D-flavored player input into ruleset vocabulary.
- Per-system parallel-phase overlays (e.g. `anima-banner-monitor` and `charm-cooldown-tracker` for `exalted3e`; `blood-pool-tracker` for `vtmv20`) — system-specific resource trackers that run alongside the narrator without blocking it.

Reference prompts for the three universal agents live at `agents/<role>.md`. Drop a per-system override at `rulesets/<your-system>/agents/<role>.md` to tune any of them; otherwise the shared baseline applies. Per-system parallel overlays live only at `rulesets/<your-system>/agents/<role>.md` — they're not shared because the resources they track are unique to that system. Each sub-agent has its own `role`-based idempotency key (`mrrAgentRole`) so the installer matches and updates in place on re-install instead of accumulating duplicates.

**Install posture (GM-mode):** sub-agents install **enabled by default**. GM-mode has no per-agent toggle UI in Marinara, so the bundle IS the install — users do not pick and choose. Users who want to opt out must remove the agent from Marinara directly. Migration from v0.4.x legacy installs (the old `combat-adjudicator` / `npc-bookkeeper` / `lore-query` / `state-reminder` set) requires uninstalling the ruleset and reinstalling from the current bundle; the legacy four no longer exist in this repo and the new build pipeline never re-creates them.

**Document each sub-agent in the lorebook.** Conventionally, ship one lorebook entry titled "Optional Sub-Agents — what they do and how to enable" that lists each agent's purpose + the Settings → Agents flow. The dnd5e and exalted3e reference bundles in this repo show the canonical content.

---

## After you have the JSON

1. Open Marinara Engine. Make sure the Marinara-RPG-Extension is installed
   (import the framework JS file into Settings → Extensions → Add Extension,
   enable it — Marinara's Extensions screen accepts file uploads, not pasted
   text).
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
