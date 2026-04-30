# Marinara RPG Rulesets

Custom RPG rulesets for [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine)'s Game Mode. Run a D10 dice-pool game (Exalted 3e), a d20 game (D&D 5e), a 4dF narrative game (Fate Core), or author your own ruleset — without forking Marinara, without writing TypeScript, without waiting for upstream feature requests.

## What this is

Marinara Engine ships a Game Mode where an AI Game Master runs the table. By default the engine's GM is biased toward d20 / D&D-style mechanics: six attributes (STR/DEX/CON/INT/WIS/CHA), single-roll resolution, DC ladder. This repo adds a thin overlay that lets you swap the GM's mechanical brain (and the player-facing character sheet) for a different RPG system entirely.

## What's in the box

| Path | What it is |
|------|------------|
| `schema/ruleset.schema.json` | JSON Schema (draft 2020-12) defining the canonical ruleset.json shape. Five resolution modes: single-roll, dice-pool, d100-percentile, 2d6-stat (PbtA), fate-ladder. |
| `rulesets/dnd5e/`            | D&D 5e (SRD 5.1, CC-BY-4.0). Mirrors Marinara's existing default flavor as a reference implementation. |
| `rulesets/exalted3e/`        | Exalted 3rd Edition (2016 Onyx Path core). D10 dice pools, target 7, tens double, botch on zero-successes-with-a-1, 9 attributes / 25 abilities, motes / Willpower / Anima Banner, sample charms. |
| `rulesets/fate-core/`        | Fate Core (Evil Hat). 4dF + skill on the Mediocre→Legendary ladder, Fate Points, stress / consequences, success-with-style at +3 shifts. |
| `extension/ruleset-loader.{css,js}` | The single client extension you paste into Marinara's Settings → Extensions. Hides the built-in attribute panel, renders a ruleset-driven sheet, drives the dice widget, manages a multi-ruleset library. |
| `tools/validate-ruleset.mjs` | CLI: validates any `ruleset.json` against the schema. `npm run validate-rulesets` validates everything in `rulesets/`. |
| `docs/AUTHORING.md`          | Original authoring reference (data file fields, design philosophy). |
| `docs/ADDING-RULESETS.md`    | **Step-by-step worked example** of adding a new ruleset using Fate Core as the case study. Read this first if you want to extend. |
| `docs/INSTALL.md`            | Top-level install walkthrough (also see each ruleset's own `INSTALL.md`). |
| `docs/ENGINE-CONSTRAINTS.md` | Honest doc on what this overlay can and cannot change about Marinara's built-in Game Mode. |

## Quick start

```bash
git clone https://github.com/Kenhito/Marinara-RPG-Rulesets.git
cd Marinara-RPG-Rulesets
npm install
npm run validate-rulesets
```

Then follow `rulesets/{dnd5e,exalted3e,fate-core}/INSTALL.md` to wire the ruleset of your choice into your Marinara install. ~10 minutes.

## How a ruleset bundle works

A ruleset is **four files** the user installs into Marinara:

1. **`ruleset.json`** — declarative spec the client extension reads. Defines dice, resolution, attributes, skills, derived stats, states, sheet sections.
2. **`gm-agent.md`** — a custom-agent prompt template the user pastes into Marinara's Agent Editor. Instructs the GM model on the ruleset's mechanics and the dice-tag format the client expects.
3. **`lorebook.json`** — keyword-triggered rules reference (charms, conditions, anima rules, stunt economy, aspects, fate points, etc.). Marinara's lorebook engine surfaces the relevant entries to the GM on relevant turns.
4. **`INSTALL.md`** — the user-facing installation walkthrough.

The client extension is shared across rulesets — install it once, switch rulesets via the **Ruleset** button in the chat header. The extension stores every ruleset you've activated in a local **Library** so you can swap between (say) Exalted for one campaign and Fate for another with one click.

## Character data persistence

Marinara's chat IDs rotate per session, and character sheets stored in localStorage are keyed to chat ID — so a fresh chat looks like a brand-new character. The extension adds **save** and **load** buttons to the character sheet header that download all characters in the active chat as a JSON file and re-import them into any other chat. Use save before ending a session and load when starting the next; your sheets, stress, fate points, etc. all carry over.

## The honest part — what this overlay cannot do

Marinara's GM prompt assembly and the combat-encounter modal live in server-side TypeScript and aren't user-replaceable without forking the engine. This overlay deliberately does NOT fork. Practical implications:

- **GM narration mechanics** — fully ruleset-driven via the custom agent + lorebook. Works.
- **Character sheet UI** — fully replaced by the extension. Works.
- **Dice widget + dice tags** — formatted per the ruleset, parsed by Marinara's existing tag parser. Works.
- **Multi-ruleset library** — saved rulesets, one-click switch. Works.
- **Save / load character data across chats** — save bundles to JSON, load them anywhere. Works.
- **Combat-encounter modal** — when Marinara's built-in combat UI fires, the encounter resolution is still d20-flavored under the hood. The narration around it is still ruleset-flavored, but the modal's stat blocks are not. Tradeoff documented in `docs/ENGINE-CONSTRAINTS.md`.
- **`RPGAttributes` writes back to chat state** — the engine's attribute storage is typed to D&D's six attrs. Non-D&D rulesets persist their sheet to localStorage per chat, with a "Sync to chat" button to copy values into Marinara's `customTrackerFields` so the GM agent sees them.

If you want true mechanic replacement (e.g. server-rendered Exalted combat with proper tick-based initiative), that requires either upstream PRs into Marinara or a fork. This repo's scope is "no fork".

## Authoring your own ruleset

Read **`docs/ADDING-RULESETS.md`** — it walks through the full process using Fate Core as a worked example. The short version:

1. Copy the closest existing bundle (`exalted3e`, `dnd5e`, or `fate-core`) to a new folder.
2. Edit `ruleset.json` — your dice, your attributes, your skills, your difficulty ladder, your dice-tag format.
3. Run `node tools/validate-ruleset.mjs rulesets/your-system/ruleset.json` to confirm.
4. Edit `gm-agent.md` to teach the GM your mechanics and dice-tag format.
5. Build a `lorebook.json` for your system's rules reference.
6. Write an `INSTALL.md`.

Five resolution modes are first-class today: `single-roll` (d20-style), `dice-pool` (Exalted, oWoD/nWoD), `d100-percentile` (BRP/CoC), `2d6-stat` (PbtA), `fate-ladder` (Fate Core/FAE). Adding a new mode is documented in `docs/ADDING-RULESETS.md`; opening a PR with a new mode is welcome.

## License

- **Repo / extension / schema / docs:** MIT (see `LICENSE`).
- **`rulesets/dnd5e/` content:** Wizards of the Coast SRD 5.1, CC-BY-4.0.
- **`rulesets/exalted3e/` content:** Original mechanics references and charm names belong to Onyx Path Publishing. No verbatim Onyx Path text is reproduced. The data file paraphrases mechanics for AI consumption only; if you want full rules and flavor, buy the book.
- **`rulesets/fate-core/` content:** Original mechanics references; Fate-family ladder labels and `4dF` notation are common to Fate-family games. No verbatim Evil Hat text reproduced. Compatible with the Fate Core SRD (CC-BY 3.0). Ladder labels and Fudge-dice mechanics originate with Steffan O'Sullivan's Fudge (1992) and Evil Hat's Fate Core (2013).

Marinara Engine itself is AGPL-3.0 — but this repo is an **overlay** (it does not modify or redistribute Marinara source), so the MIT licensing for the overlay's own code is appropriate.

## Status

v0.2 — three reference rulesets (D&D 5e, Exalted 3e, Fate Core), validating schema with five resolution modes, working extension with multi-ruleset library and JSON character save/load. Built and tested against Marinara Engine v1.5.6. Bug reports welcome; PRs more so. If you build a bundle for Pathfinder 2e, Blades in the Dark, Lancer, Mörk Borg, GURPS, or any other system, please open a PR — the framework is meant to support more.
