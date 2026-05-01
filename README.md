# Marinara RPG Rulesets

Custom RPG rulesets for [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine)'s Game Mode. Run a D10 dice-pool game (Exalted 3e), a d20 game (D&D 5e), a 4dF narrative game (Fate Core), or author your own ruleset — without forking Marinara, without writing TypeScript, without waiting for upstream feature requests.

## What this is

Marinara Engine ships a Game Mode where an AI Game Master runs the table. By default the engine's GM is biased toward d20 / D&D-style mechanics: six attributes (STR/DEX/CON/INT/WIS/CHA), single-roll resolution, DC ladder. This repo adds a thin overlay that lets you swap the GM's mechanical brain (and the player-facing character sheet) for a different RPG system entirely.

## How it works (in 60 seconds)

**End user install — one file import + one bundle install.**

1. Import the framework JS once into Marinara's Settings → Extensions
   (Marinara's Extensions screen is a file-upload UI). The CSS is
   embedded in the JS — there is no separate stylesheet to upload.
2. Click the **Ruleset** button in the chat header. The dialog accepts
   a `bundle.json` three ways: **Choose file…** (local upload),
   **Fetch URL** (paste a raw URL), or paste the JSON into the textarea.
   Click **Save and reload**. The extension validates the bundle, then auto-installs
   the lorebook, the GM agent prompt, and the ruleset via Marinara's
   API in one shot.

A `bundle.json` wraps the three per-ruleset files (ruleset, GM agent prompt, lorebook) into one envelope. The extension reads the embedded ruleset to drive the character sheet and dice widget; the GM agent prompt teaches the AI Game Master your system's mechanics; the lorebook fires keyword-triggered rules references during play. **Authors who can't run a CLI** (vibecoders on claude.ai or similar chat tools) write JSON, never JavaScript. See [`AUTHORING-PROMPT.md`](AUTHORING-PROMPT.md) for the one-paste prompt template that turns any chat AI into a bundle generator.

The extension also gives you a floating dice widget that rolls correctly for your system, a resizable character sheet, and a save/load pair of buttons that exports all characters in the active chat as a portable JSON file.

Four systems ship as reference rulesets: **D&D 5e**, **Exalted 3e**, **Fate Core**, and **Pathfinder 2e**. They cover the most common dice mechanics — d20-and-modifier (D&D, PF2e), d10 dice pool with successes (Exalted), and 4dF on a verbal ladder (Fate). Add a fifth system by copying one of the four folders and editing the data, GM prompt, and lorebook to match your system. About 2 hours for a rules-light system, a day for a mid-weight one. Or use the AI-authoring path in [`AUTHORING-PROMPT.md`](AUTHORING-PROMPT.md) to skip writing files by hand entirely — that's how the Pathfinder 2e bundle was authored.

If you want an AI to do the authoring for you, point it at [`AGENTS.md`](AGENTS.md) — a standalone reference dense enough that a coding agent can build a new ruleset (or extend the framework) without reading anything else first.

## What's in the box

| Path | What it is |
|------|------------|
| `schema/ruleset.schema.json` | JSON Schema (draft 2020-12) defining the canonical ruleset.json shape. Five resolution modes: single-roll, dice-pool, d100-percentile, 2d6-stat (PbtA), fate-ladder. |
| `rulesets/dnd5e/`            | D&D 5e (SRD 5.1, CC-BY-4.0). Mirrors Marinara's existing default flavor as a reference implementation. |
| `rulesets/exalted3e/`        | Exalted 3rd Edition (2016 Onyx Path core). D10 dice pools, target 7, tens double, botch on zero-successes-with-a-1, 9 attributes / 25 abilities, motes / Willpower / Anima Banner, sample charms. |
| `rulesets/fate-core/`        | Fate Core (Evil Hat). 4dF + skill on the Mediocre→Legendary ladder, Fate Points, stress / consequences, success-with-style at +3 shifts. |
| `rulesets/pathfinder2e/`     | Pathfinder Second Edition (Remaster). Single-roll d20 + proficiency, four degrees of success, three-action economy, MAP, level-based DCs, 6 attributes / 17 skills, 20 conditions. Bundle-only (no source files) — authored end-to-end via the vibecoder workflow as a proof of concept. |
| `extension/ruleset-loader.{css,js}` | The single client extension you import into Marinara's Settings → Extensions (CSS embedded in the JS). Hides the built-in attribute panel, renders a ruleset-driven sheet, drives the dice widget, manages a multi-ruleset library. |
| `schema/bundle.schema.json`  | JSON Schema for the install bundle envelope (ruleset + gmAgent + lorebook in one file). |
| `tools/validate-ruleset.mjs` | CLI: validates any `ruleset.json` against the schema. `npm run validate-rulesets` validates everything in `rulesets/`. |
| `tools/validate-bundle.mjs`  | CLI: validates `bundle.json` files. `npm run validate-bundles` checks all three reference bundles. |
| `tools/build-bundle.mjs`     | CLI: assembles `bundle.json` from a ruleset directory. `npm run build-bundles` rebuilds all three. |
| `tools/embed-css.mjs`        | CLI: re-embeds `extension/ruleset-loader.css` into `ruleset-loader.js` after CSS edits. |
| `AUTHORING-PROMPT.md`        | **One-paste prompt template for vibecoder authors.** Hand it to claude.ai/ChatGPT/Gemini with "<<YOUR SYSTEM>>" filled in; the AI returns a complete `bundle.json`. |
| `AGENTS.md`                  | **Self-contained reference for AI coding agents.** An LLM reading just this file has enough to author a new ruleset bundle from zero or extend the extension with a new resolution mode. Read this if you're an AI agent or if you want an AI to do the authoring. |
| `docs/AUTHORING.md`          | Original authoring reference (data file fields, design philosophy). |
| `docs/ADDING-RULESETS.md`    | **Step-by-step worked example** of adding a new ruleset using Fate Core as the case study. Read this first if you want to extend. |
| `docs/INSTALL.md`            | Top-level install walkthrough (also see each ruleset's own `INSTALL.md`). |
| `docs/ENGINE-CONSTRAINTS.md` | Honest doc on what this overlay can and cannot change about Marinara's built-in Game Mode. |

## Install (no developer tools required)

If you just want to use the extension and don't have Node, npm, or git installed, this is the path. You'll do two file imports total: one for the extension itself, one for the ruleset bundle. **Marinara Engine should already be running in a browser tab before you start** — if you don't have it set up yet, follow Marinara's own [installation guide](https://github.com/Pasta-Devs/Marinara-Engine#installation) first, then come back here.

**Step 1 — Download the release zip.** Open the [Releases page](https://github.com/Kenhito/Marinara-RPG-Extension/releases/latest), scroll to the **Assets** section, and click the file ending in `.zip` (named like `Marinara-RPG-Extension-<version>.zip`). It will save to your Downloads folder.

**Step 2 — Extract the zip.** Open your **Downloads** folder. Right-click the zip and choose *Extract All* (Windows), double-click it (macOS), or run `unzip Marinara-RPG-Extension-<version>.zip` (Linux). You'll get a folder named `Marinara-RPG-Extension-<version>/` containing `extension/`, `rulesets/`, `docs/`, and a few other files.

**Step 3 — Import the extension into Marinara.** Switch to your Marinara browser tab, click the **gear icon** in the top-right header to open Settings, switch to the **Extensions** tab on the left, then click **Import Extension (.json, .css, or .js)**. In the file picker, navigate to the folder you extracted in Step 2, open `extension/`, and select `ruleset-loader.js`. The CSS is embedded inside the JS — there is no separate stylesheet to upload.

![Marinara Engine Settings dialog opened to the Extensions tab. The General/Appearance/Themes/Extensions/Import/Advanced tab row sits below the Settings header. A large dashed Import Extension (.json, .css, or .js) button is the primary action; below it the Installed Extensions list shows ruleset-loader with a green on-toggle and a trash icon.](docs/screenshots/extension-menu.png)

After import you should see `ruleset-loader` listed under **Installed Extensions** with the toggle switched **on** (green). A new **Ruleset** button will appear in the top-right of the chat header next to a small round button with a parchment-scroll icon — that scroll button toggles the floating character sheet on and off.

> **If the Ruleset button doesn't show up,** hard-refresh the page (Ctrl + Shift + R on Windows/Linux, Cmd + Shift + R on macOS). If you picked the wrong file, the import will reject it — make sure you selected `ruleset-loader.js` and not the surrounding `extension/` folder or the `.css` file.

**Step 4 — Open the Ruleset dialog and import a bundle.** Click the **Ruleset** button in the chat header. The dialog accepts a `bundle.json` three ways:

![Marinara RPG Ruleset dialog. URL field at the top with a raw GitHub URL example, then a multi-line textarea showing a bundle.json paste. Bottom row of buttons left-to-right: Fetch URL, Choose file..., Clear, Uninstall server data, Save and reload (highlighted as the primary action). Below that a Library section listing previously installed rulesets with Switch buttons.](docs/screenshots/ruleset-ui.png)

- **Choose file…** — browse to the folder you extracted in Step 2, navigate to `rulesets/<system>/bundle.json` (one of `dnd5e`, `exalted3e`, `fate-core`, or `pathfinder2e`), and select it. Best for offline installs and the simplest path.
- **Fetch URL** — paste a raw GitHub URL like `https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/exalted3e/bundle.json` into the URL field, then click **Fetch URL**. To get a raw URL for any file on GitHub, open the file's page on github.com and click the **Raw** button at the top-right of the file viewer — that URL is what you paste here. Best when you'd rather not keep the extracted zip around.
- **Paste JSON** — open `rulesets/<system>/bundle.json` in any text editor (Notepad, TextEdit, VS Code), copy its entire contents, and paste into the textarea below the URL field. Best for one-off bundles you've received over chat or email.

**Step 5 — Save and reload.** Click **Save and reload**. The extension validates the bundle, then auto-installs the lorebook and the GM agent into your Marinara server (via `POST /api/agents` and `/api/lorebooks`) and caches the ruleset locally to drive the character sheet and dice widget. The page reloads; you're done.

> **If Fetch URL fails,** your Marinara server may be blocking outbound fetches — use **Choose file…** or paste the JSON instead. **If Save and reload errors,** check the browser console (F12 → Console) for the specific message; the most common cause is an old extension version not seeing a recent bundle field, which the v0.3 release does not have.

**Custom bundles.** If you authored your own `bundle.json` using [`AUTHORING-PROMPT.md`](AUTHORING-PROMPT.md) — paste the prompt into Claude/ChatGPT/Gemini, fill in your system's mechanics, save the AI's response as a `.json` file — the same dialog accepts it via any of the three paths above. The file lives wherever you saved it (typically your Downloads or Documents folder).

**Switching rulesets.** Saved rulesets show up in the **Library** section at the bottom of the Ruleset dialog with a *Switch* button next to each. Switching is a one-click reload-into-the-other-ruleset; both lorebooks and GM agents stay registered with your Marinara server, so swapping back is instant.

**Cleaning up.** Once the extension is imported and at least one bundle is installed via *Choose file…*, the extracted folder is no longer needed by Marinara — feel free to delete it. If you're using *Fetch URL* exclusively, you can skip extraction entirely and just paste the URL.

## Quick start (developer install)

If you have Node, git, and npm installed and you want to author or extend rulesets:

```bash
git clone https://github.com/Kenhito/Marinara-RPG-Extension.git
cd Marinara-RPG-Extension
npm install
npm run validate-rulesets
npm run validate-bundles
```

Then follow `rulesets/{dnd5e,exalted3e,fate-core,pathfinder2e}/INSTALL.md` to wire the ruleset of your choice into your Marinara install. ~10 minutes for a fresh install.

## How a ruleset bundle works

End users install **one file per ruleset** — a `bundle.json` containing all three pieces:

| Field in bundle | What it becomes in Marinara |
|---|---|
| `bundle.ruleset` | Cached locally, drives the character sheet + dice widget. |
| `bundle.gmAgent` | POSTed to `/api/agents` as a custom pre-generation agent that injects ruleset prose into the GM model's context each turn. |
| `bundle.lorebook` | POSTed to `/api/lorebooks` + `/:id/entries/bulk` so keyword-triggered rules references fire during play. |

For repo maintainability the three pieces also live as separate **source files** that authors edit directly:

1. **`rulesets/<id>/ruleset.json`** — declarative ruleset spec.
2. **`rulesets/<id>/gm-agent.md`** — GM agent prompt prose.
3. **`rulesets/<id>/lorebook.json`** — lorebook entries.

`tools/build-bundle.mjs` assembles the three into `bundle.json` (run `npm run build-bundles`). Vibecoder authors using a chat AI skip this step and produce `bundle.json` directly per [`AUTHORING-PROMPT.md`](AUTHORING-PROMPT.md).

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

v0.3 — four reference rulesets (D&D 5e, Exalted 3e, Fate Core, Pathfinder 2e), validating schema with five resolution modes, single-file `bundle.json` install, embedded-CSS framework JS, multi-ruleset library, JSON character save/load, inventory + equipment-bonus system, resizable + collapsible floating character sheet, and a no-developer-tools install path. Built and tested against Marinara Engine v1.5.6. Bug reports welcome; PRs more so. If you build a bundle for Blades in the Dark, Lancer, Mörk Borg, GURPS, Vampire 5e, Cyberpunk RED, or any other system, please open a PR — the framework is meant to support more.
