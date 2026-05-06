# Authoring Prompt — Build a Marinara-RPG-Extension Ruleset Bundle

> **NEW IN v0.4:** the canonical AI-authoring documentation now lives at [`releases/v0.4.0/docs-for-ai/`](releases/v0.4.0/docs-for-ai/) — seven numbered Markdown files plus example prompts. Use those instead of this single-paste prompt for new ruleset authoring; they cover the system-agnostic agent architecture, typed damage, sorcery/multi-turn casting, the build pipeline, and copy-paste prompts for Claude.ai / ChatGPT / Gemini.
>
> This file remains as a pre-v0.4 single-paste template. It still produces a working v0.3-style bundle, but doesn't cover v0.4 features (typed damage, sorcery, agents.json separation). For the current state, start with [`releases/v0.4.0/BUILD-YOUR-OWN-RULESET.md`](releases/v0.4.0/BUILD-YOUR-OWN-RULESET.md).

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
   ruleset schema, the five resolution modes (single-roll, dice-pool,
   d100-percentile, 2d6-stat, fate-ladder), how the GM agent prompt is
   structured, how the lorebook fires, and what the engine does and does NOT
   support.
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

## Optional sub-agents (`additionalAgents[]`)

A bundle MAY include up to five focused `pre_generation` sub-agents in `additionalAgents[]`: `state-mutator`, `state-reminder`, `combat-adjudicator`, `lore-query`, `npc-bookkeeper`. Each is a distinct agent with its own promptTemplate and `role`-based idempotency key. The five reference prompts live at `agents/<role>.md` in this repo — copy their content into the bundle's `additionalAgents[].promptTemplate` for parity with what the existing reference bundles ship.

**Install posture (v0.3+):** sub-agents install **disabled by default**. The user opts in per-agent in Marinara → Settings → Agents. If a specific sub-agent is so essential to your bundle that it should fire on first install, set `"enabled": true` on that item in `additionalAgents[]` — the installer reads the field and creates the agent enabled. Use sparingly; every enabled sub-agent costs one model call per turn.

**On re-install (PATCH), the user's enabled-toggle is preserved.** The installer carries `enabled` only on the initial CREATE. So a user who toggled a sub-agent on after install still has it on after re-install of the bundle. Ship the bundle confidently; you're not clobbering user choice.

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
