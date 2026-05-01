# Authoring Prompt — Build a Marinara-RPG-Extension Ruleset Bundle

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
