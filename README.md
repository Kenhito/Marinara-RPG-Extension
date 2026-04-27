# Marinara RPG Rulesets

Custom RPG rulesets for [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine)'s Game Mode. Run a D10 dice-pool game (Exalted 3e), a d20 game (D&D 5e), or author your own ruleset — without forking Marinara, without writing TypeScript, without waiting for upstream feature requests.

## What this is

Marinara Engine ships a Game Mode where an AI Game Master runs the table. By default the engine's GM is biased toward d20 / D&D-style mechanics: six attributes (STR/DEX/CON/INT/WIS/CHA), single-roll resolution, DC ladder. This repo adds a thin overlay that lets you swap the GM's mechanical brain (and the player-facing character sheet) for a different RPG system entirely.

## What's in the box

| Path | What it is |
|------|------------|
| `schema/ruleset.schema.json` | JSON Schema (draft 2020-12) defining the canonical ruleset.json shape. |
| `rulesets/dnd5e/`            | D&D 5e (SRD 5.1, CC-BY-4.0). Mirrors Marinara's existing default flavor as a reference implementation. |
| `rulesets/exalted3e/`        | Exalted 3rd Edition (2016 Onyx Path core). D10 dice pools, target 7, tens double, botch on zero-successes-with-a-1, 9 attributes / 25 abilities, motes / Willpower / Anima Banner, sample charms. |
| `extension/ruleset-loader.{css,js}` | The single client extension you paste into Marinara's Settings -> Extensions. Hides the built-in attribute panel, renders a ruleset-driven sheet, drives the dice widget. |
| `tools/validate-ruleset.mjs` | CLI: validates any `ruleset.json` against the schema. `npm run validate-rulesets` validates everything in `rulesets/`. |
| `docs/AUTHORING.md`          | How to write your own ruleset bundle. |
| `docs/INSTALL.md`            | Top-level install walkthrough (also see each ruleset's own `INSTALL.md`). |
| `docs/ENGINE-CONSTRAINTS.md` | Honest doc on what this overlay can and cannot change about Marinara's built-in Game Mode. |

## Quick start

```bash
git clone https://github.com/Kenhito/Marinara-RPG-Rulesets.git
cd Marinara-RPG-Rulesets
npm install
npm run validate-rulesets
```

Then follow `rulesets/exalted3e/INSTALL.md` (or `dnd5e/`) to wire the ruleset into your Marinara install. ~10 minutes.

## How a ruleset bundle works

A ruleset is **four files** the user installs into Marinara:

1. **`ruleset.json`** — declarative spec the client extension reads. Defines dice, resolution, attributes, skills, derived stats, states, sheet sections.
2. **`gm-agent.md`** — a custom-agent prompt template the user pastes into Marinara's Agent Editor. Instructs the GM model on the ruleset's mechanics and the dice-tag format the client expects.
3. **`lorebook.json`** — keyword-triggered rules reference (charms, conditions, anima rules, stunt economy, etc.). Marinara's lorebook engine surfaces the relevant entries to the GM on relevant turns.
4. **`INSTALL.md`** — the user-facing installation walkthrough.

The client extension is shared across rulesets — install it once, switch rulesets via the **Ruleset** button in the chat header.

## The honest part — what this overlay cannot do

Marinara's GM prompt assembly and the combat-encounter modal live in server-side TypeScript and aren't user-replaceable without forking the engine. This overlay deliberately does NOT fork. Practical implications:

- **GM narration mechanics** — fully ruleset-driven via the custom agent + lorebook. Works.
- **Character sheet UI** — fully replaced by the extension. Works.
- **Dice tags in narration** — formatted per the ruleset, parsed by Marinara's existing tag parser. Works.
- **Combat-encounter modal** — when Marinara's built-in combat UI fires, the encounter resolution is still d20-flavored under the hood. The narration around it is still ruleset-flavored, but the modal's stat blocks are not. Tradeoff documented in `docs/ENGINE-CONSTRAINTS.md`.
- **`RPGAttributes` writes back to chat state** — the engine's attribute storage is typed to D&D's six attrs. Non-D&D rulesets persist their sheet to `localStorage` per chat, with a "Sync to chat" button to copy values into Marinara's `customTrackerFields` so the GM agent sees them.

If you want true mechanic replacement (e.g. server-rendered Exalted combat with proper tick-based initiative), that requires either upstream PRs into Marinara or a fork. This repo's scope is "no fork".

## Authoring your own ruleset

Read `docs/AUTHORING.md`. The short version:

1. Copy `rulesets/exalted3e/` to a new folder.
2. Edit `ruleset.json` — your dice, your attributes, your skills, your difficulty ladder.
3. Run `node tools/validate-ruleset.mjs rulesets/your-system/ruleset.json` to confirm it conforms.
4. Edit `gm-agent.md` to teach the GM your mechanics and dice-tag format.
5. Build a `lorebook.json` for your system's rules reference.
6. Write an `INSTALL.md` for your future-self.

Three resolution modes are first-class today: `single-roll` (d20-style), `dice-pool` (Exalted, oWoD/nWoD), and `2d6-stat` (PbtA). A `d100-percentile` mode is in the schema and the extension renders for it. Extending the extension to a new mode means adding ~30 lines of widget code; opening a PR is welcome.

## License

- **Repo / extension / schema / docs:** MIT (see `LICENSE`).
- **`rulesets/dnd5e/` content:** Wizards of the Coast SRD 5.1, CC-BY-4.0.
- **`rulesets/exalted3e/` content:** Original mechanics references and charm names belong to Onyx Path Publishing. No verbatim Onyx Path text is reproduced. The data file paraphrases mechanics for AI consumption only; if you want full rules and flavor, buy the book.

Marinara Engine itself is AGPL-3.0 — but this repo is an **overlay** (it does not modify or redistribute Marinara source), so the MIT licensing for the overlay's own code is appropriate.

## Status

v0.1 — personal-first, share-ready-second. Two reference rulesets, validating schema, working extension. Built and tested against Marinara Engine v1.5.5. Bug reports welcome; PRs more so.
