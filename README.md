# Marinara RPG Rulesets

Custom RPG rulesets for [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine)'s Game Mode. Run a D10 dice-pool game (Exalted 3e), a d20 game (D&D 5e), a 4dF narrative game (Fate Core), or **author your own ruleset for any tabletop RPG** — without forking Marinara, without writing TypeScript, without waiting for upstream feature requests.

**New here? Read [`docs/HOW-IT-WORKS.md`](docs/HOW-IT-WORKS.md) first** — the plain-language guide to what this extension does, how installing it works, and what to check when something looks wrong. This README is the index and the install pointer; the guide is where the explanations live.

> **⚠️ BREAKING — this release requires Marinara Engine 2.4.3+.** Marinara removed its old extension system in v2.3.4 and rebuilt it in v2.4.0. Any release older than v1.0.0 (and any paste-into-fields install) cannot load on a current engine. Remove any old install, then install fresh: enable `ENABLE_EXTERNAL_EXTENSIONS=true` on the engine host, toggle **Settings → Advanced → Danger Zone → Allow third-party extension imports**, then **Settings → Addons → External Extensions → Import** the zip and **Review and Run** to approve it. Full walkthrough: [`docs/INSTALL.md`](docs/INSTALL.md).

## Quick start (5 minutes)

Grab the self-contained release at [`releases/1.4.0/`](releases/1.4.0/), or download the latest zip from the [Releases page](https://github.com/Kenhito/Marinara-RPG-Extension/releases/latest). It includes the importable extension package, two complete reference rulesets (D&D 5e and Exalted 3e) pre-built and ready to import, and AI-feedable build documents for authoring any other system. Per-ruleset install walkthroughs live at `rulesets/dnd5e/INSTALL.md` and `rulesets/exalted3e/INSTALL.md`.

Install the extension, import a ruleset bundle, launch a game, attach the lorebook, enable the agents — see [`docs/HOW-IT-WORKS.md`](docs/HOW-IT-WORKS.md) for what each of those steps actually does, or [`docs/INSTALL.md`](docs/INSTALL.md) for the click-by-click version with screenshots.

## Available rulesets (grab-and-go)

Every ruleset ships as a single `bundle.json`, right here on GitHub — no build step, no downloads beyond the one file.

| System | Dice | Bundle |
|--------|------|--------|
| Blades in the Dark | d6 pool | [`rulesets/blades-in-the-dark/bundle.json`](rulesets/blades-in-the-dark/bundle.json) |
| Call of Cthulhu 7th Edition | d100 | [`rulesets/coc7e/bundle.json`](rulesets/coc7e/bundle.json) |
| Dungeons & Dragons 5th Edition | d20 | [`rulesets/dnd5e/bundle.json`](rulesets/dnd5e/bundle.json) |
| Exalted 3rd Edition | d10 pool | [`rulesets/exalted3e/bundle.json`](rulesets/exalted3e/bundle.json) |
| Exalted Versus World of Darkness | d10 pool | [`rulesets/exwod/bundle.json`](rulesets/exwod/bundle.json) |
| Fate Core | 4dF | [`rulesets/fate-core/bundle.json`](rulesets/fate-core/bundle.json) |
| Genesys | d6 | [`rulesets/genesys/bundle.json`](rulesets/genesys/bundle.json) |
| GURPS Lite | 3d6 | [`rulesets/gurps-lite/bundle.json`](rulesets/gurps-lite/bundle.json) |
| Lasers & Feelings | d6 | [`rulesets/lasers-and-feelings/bundle.json`](rulesets/lasers-and-feelings/bundle.json) |
| Old School Essentials | d20 | [`rulesets/ose/bundle.json`](rulesets/ose/bundle.json) |
| Pathfinder 2nd Edition | d20 | [`rulesets/pathfinder2e/bundle.json`](rulesets/pathfinder2e/bundle.json) |
| Rolemaster (RMFRP) | open-ended d100 | [`rulesets/rolemaster/bundle.json`](rulesets/rolemaster/bundle.json) |
| The Stewpot | d6 | [`rulesets/stewpot/bundle.json`](rulesets/stewpot/bundle.json) |
| Trophy Dark | d6 | [`rulesets/trophy-dark/bundle.json`](rulesets/trophy-dark/bundle.json) |
| Vampire: The Masquerade 20th Anniversary | d10 pool | [`rulesets/vtmv20/bundle.json`](rulesets/vtmv20/bundle.json) |
| Werewolf: The Apocalypse 20th Anniversary | d10 pool | [`rulesets/w20/bundle.json`](rulesets/w20/bundle.json) |

Import via **Fetch URL** in the Ruleset dialog (`https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/<id>/bundle.json`), by downloading the raw file from GitHub, or from `releases/1.4.0/install-files/` if you already have the release folder. After import, attach the ruleset's lorebook to your game and enable its agents — installing is not activating.

## Current feature set

- **Sixteen ready-to-play systems**, each a single-file `bundle.json` install: sheet, dice widget, GM doctrine, and rules lorebook in one shot.
- **A validating schema** with nine resolution modes (d20, dice-pool, d100 percentile including roll-high/open-ended, PbtA 2d6, Fate ladder, roll-under, stance-modal pool, dice-pool-sum, narrative-handled) plus multi-mechanic routing for systems that mix more than one.
- **Server-backed character sheets** — sheets, the per-chat roster, and ruleset selection sync through Marinara's own extension storage with local-storage mirroring, so characters survive a cleared browser and follow you to a second one.
- **Party writes** — sheet-mutation tags can target any roster member by name, not just the active character, with per-character swipe revert/redo.
- **Real dice, end to end** — the GM resolves random outcomes through Marinara's server-side `roll_dice` tool when tool use is enabled, with individual die faces carried in every tag for face-dependent abilities; a documented no-tool fallback keeps dice honest on connections that can't deliver the tool.
- **XP & leveling** — party-wide, single-fire awards from combat, social/mental challenges, and roleplay; a one-word lorebook switch flips any campaign between GM-driven XP and manual milestone leveling.
- **Combat encounter shells** — unnamed opposition gets a consistent, re-emitted statline instead of invented numbers; recurring villains graduate to a real card and sheet.
- **A self-healing agent/preset layer** — re-imports repair orphaned preset sections and re-stamp a chat's ruleset automatically.
- **Per-system equipment that does the math** — each ruleset declares its own item fields (AC bases and Dex caps that follow the book's own rules, soak, artifact ratings, shield HP/Hardness/Break Threshold), equipped bonuses flow to stats and to the dice widget's attack roll, and item descriptions reach the Game Master so distinctive gear gets treated distinctively.
- **One-click Long Rest + House Rules levers** (D&D 5e) — a single batched rest with a receipt naming every change, and a per-system House Rules lorebook whose machine-read levers (RAW vs house-ruled hit dice) are enforced, not just narrated.
- **Zip / folder / manifest packaging** for Marinara's External Extensions import lane, comment-stripped and hash-verifiable.

Full version-by-version detail lives in [`CHANGELOG.md`](CHANGELOG.md).

## Authoring your own ruleset

Copy the closest existing bundle (`rulesets/dnd5e/`, `exalted3e/`, `fate-core/`, or `pathfinder2e/`) and edit the data, GM prompt, and lorebook to match your system — about 2 hours for a rules-light system, a day for a mid-weight one. Full walkthrough: [`docs/AUTHORING.md`](docs/AUTHORING.md) and [`docs/ADDING-RULESETS.md`](docs/ADDING-RULESETS.md).

Or skip writing files by hand: hand [`AUTHORING-PROMPT.md`](AUTHORING-PROMPT.md) to a frontier chat AI (Claude, GPT-5, Gemini) as a system prompt and it produces a complete `bundle.json` from your description. [`AGENTS.md`](AGENTS.md) is the standalone reference for an AI coding agent to build a ruleset or extend the framework without reading anything else first. Validate any bundle with `node tools/validate-bundle.mjs rulesets/your-system/bundle.json`.

**Developer setup:** `git clone` the repo, `npm install`, then `npm run validate-rulesets && npm run validate-bundles` to confirm your toolchain works before editing anything.

## What this overlay cannot do

This repo deliberately does not fork Marinara. Its built-in combat-encounter modal stays d20-flavored under the hood regardless of active ruleset, and non-D&D rulesets keep their sheet in the extension's own storage rather than the engine's D&D-typed attribute field. Full honest accounting: [`docs/ENGINE-CONSTRAINTS.md`](docs/ENGINE-CONSTRAINTS.md).

## License

- **Repo / extension / schema / docs:** MIT (see `LICENSE`).
- **`rulesets/dnd5e/` content:** Wizards of the Coast SRD 5.1, CC-BY-4.0.
- **`rulesets/exalted3e/` content:** Original mechanics references; charm names belong to Onyx Path Publishing, no verbatim text reproduced.
- **`rulesets/fate-core/` content:** Compatible with the Fate Core SRD (CC-BY 3.0); no verbatim Evil Hat text reproduced.

Marinara Engine itself is AGPL-3.0 — this repo is an **overlay** (it does not modify or redistribute Marinara source), so MIT licensing for the overlay's own code is appropriate.

## Roadmap & status

Sixteen shipped rulesets on a validating schema, single-file bundle install, zip/folder/manifest extension packaging, server-backed character storage, swipe-aware party writes, real server-side dice, XP/leveling, combat encounter shells, per-system declared equipment, and one-click rests with enforced house-rule levers. Built and live-tested against Marinara Engine 2.4.3+.

Next up: interop with the community **RPG Inventory** graphical-sheet extension (optional two-way gear bridging, in cooperation with its author) and tag-driven sprite generation for items — plus whatever the next played session surfaces. Full version history in [`CHANGELOG.md`](CHANGELOG.md). Bug reports welcome; PRs adding a new system more so.
