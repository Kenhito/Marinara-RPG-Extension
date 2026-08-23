# Marinara RPG Rulesets (v1.0.0)

Custom RPG rulesets for [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine)'s Game Mode. Run a D10 dice-pool game (Exalted 3e), a d20 game (D&D 5e), a 4dF narrative game (Fate Core), or **author your own ruleset for any tabletop RPG** — without forking Marinara, without writing TypeScript, without waiting for upstream feature requests.

> **⚠️ BREAKING — this release requires Marinara Engine 2.4.3+, and all previous releases are broken on it.**
> Marinara removed its old extension system in v2.3.4 and rebuilt it in v2.4.0. Every earlier release of this extension (v0.5.0 and older zips, and any paste-into-fields install) **cannot load on a current engine**, and this release **cannot load on engines older than 2.4.3**. There is no in-place upgrade: remove any old install, then install this version fresh — four steps:
>
> 1. Set `ENABLE_EXTERNAL_EXTENSIONS=true` in your Marinara Engine host's `.env`.
> 2. In Marinara: **Settings → Advanced → Danger Zone → Allow third-party extension imports** (toggle on).
> 3. **Settings → Addons → External Extensions → Import** → pick `Marinara-RPG-Extension.extension.zip` from the release.
> 4. The import arrives disabled — open it, inspect, and click **Review and Run** to approve and enable it. (Every future update repeats this approval step; that's the engine's trust model, not a bug.)
>
> Full walkthrough with screenshots and troubleshooting: [`docs/INSTALL.md`](docs/INSTALL.md).

## Quick start (5 minutes)

The fastest path: grab the self-contained release at [`releases/1.0.0/`](releases/1.0.0/) and follow [`releases/1.0.0/INSTALL-GUIDE.md`](releases/1.0.0/INSTALL-GUIDE.md). It includes:

- **The importable extension package** (`Marinara-RPG-Extension.extension.zip`) for Marinara's External Extensions import
- **Two complete reference rulesets** (D&D 5e and Exalted 3e) with bundle + agents pre-built, ready to import
- **AI-feedable build documents** so you can have ChatGPT, Claude.ai, or any chat AI author a ruleset for any other system (GURPS, Cyberpunk RED, Vampire, Mörk Borg — anything)
- **Step-by-step install + build guides** in plain language for non-technical users

If you just want to play D&D or Exalted, install the extension and import the ruleset bundle and you're on your way. Other systems are being added as requested and you can submit a PR to add one you've created to the repo.

If you want a system the framework doesn't ship, see [`releases/1.0.0/BUILD-YOUR-OWN-RULESET.md`](releases/1.0.0/BUILD-YOUR-OWN-RULESET.md) — options for AI-assisted or manual authoring.

## Available rulesets (grab-and-go)

Every ruleset ships as a single `bundle.json`, right here on GitHub — no build step, no downloads beyond the one file. With the extension installed, each is one import away:

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
| The Stewpot | d6 | [`rulesets/stewpot/bundle.json`](rulesets/stewpot/bundle.json) |
| Trophy Dark | d6 | [`rulesets/trophy-dark/bundle.json`](rulesets/trophy-dark/bundle.json) |
| Vampire: The Masquerade 20th Anniversary | d10 pool | [`rulesets/vtmv20/bundle.json`](rulesets/vtmv20/bundle.json) |
| Werewolf: The Apocalypse 20th Anniversary | d10 pool | [`rulesets/w20/bundle.json`](rulesets/w20/bundle.json) |

**Three ways to get one into Marinara** (extension installed first — see the notice above):

1. **Fetch URL — no download needed.** In the extension's **Ruleset** dialog, paste the bundle's raw GitHub URL and click **Fetch URL**, then **Save and reload**. The pattern is:

   ```
   https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/<id>/bundle.json
   ```

   e.g. `.../main/rulesets/exalted3e/bundle.json`. (If your Marinara server blocks outbound fetches, use one of the other two ways.)
2. **Download from GitHub.** Click the bundle link in the table above, then the **Raw** button (top-right of the file view), then save the page (Ctrl+S / Cmd+S) as a `.json` file. In the **Ruleset** dialog use **Choose file…** to pick it, then **Save and reload**.
3. **From the release folder.** Every bundle is also in [`releases/1.0.0/install-files/`](releases/1.0.0/install-files/) as `<id>-bundle.json` — if you downloaded the release, they're already on your disk.

After the import: attach the ruleset's lorebook to your game and enable the MRR agents after the game launches (Step 6 below) — importing installs, but each game activates its own.

## What this is

Marinara Engine ships a Game Mode where an AI Game Master runs the table. By default the engine's GM is biased toward d20 / D&D-style mechanics: six attributes (STR/DEX/CON/INT/WIS/CHA), single-roll resolution, DC ladder. This repo adds a thin overlay that lets you swap the GM's mechanical brain (and the player-facing character sheet) for a different RPG system entirely.

The framework is **system-agnostic by design**. A GM Mode Prompt Injection helps insert ruleset instructions while a rules lore book will provide Marinara with instructions on how to run the selected system. This allows systems to be created based around existing dice mechanics. Build instructions are present to allow an AI Agent, chat or CLI, to create a ruleset featuring a character sheet, GM Agent Prompt, and Lore book with the core mechanics.

## What's new in v1.0.0

- **Marinara 2.4.3 compliance — live-tested.** The engine deleted its old extension system (v2.3.4) and rebuilt it (v2.4.0+); this release runs in the new **Full-page External Extension** lane via a compat layer, with the engine's CSRF requirements handled and the whole install + play loop smoke-tested on a live 2.4.3 engine: sheet, dice widget, and the full state-mutation chain (numeric stats, damage tracks, label-valued states) in both Game Mode and Roleplay Mode. **Engines older than 2.4.3 are not supported.**
- **One extension, one platform, both modes.** The GM-mode and RP-mode extensions are consolidated into this single extension (the `mrr-` namespace); one install works in both Game Mode and Roleplay Mode. The RP-mode extension is retired, and previous releases of BOTH extensions are broken on current engines (see the notice at the top).
- **State mutations ride a reliable transport.** Agent-emitted `[mrr-state:]` changes are now read from the engine's persisted custom-agent runs (with cross-transport dedup and first-activation baseline seeding), so sheet write-back works even though agent output never reaches the chat DOM on current engines.
- **Zip / folder / manifest install.** Ships in the engine's canonical package format (`Extensions/<name>/manifest.json` + a `marinara-extensions.json` envelope). **Do not import the loose `.js` file on 2.4.3+** — it silently installs as a sandboxed Worker where the extension cannot run.
- **Character import.** Imports both `mrr-` and legacy `mrrp-` character bundles; always saves `mrr-`. (Legacy-import paths remain in code but are untested against 2.4.3 — treat this release as a fresh start.)
- **Agent manager.** Manage / import / dedupe overlay agents from the Ruleset dialog (`mrr-agents`, accepts legacy `mrrp-agents` on read).
- **Reputation tags are free-form.** The old 50-character action cap is gone in Marinara 2.0+; ruleset prompts no longer carry the obsolete workaround.
- **State-tag fix.** Six rulesets (CoC 7e, Stewpot, GURPS Lite, Trophy Dark, Pathfinder 2e, Lasers & Feelings) emitted legacy `mrrp-state`/`mrrp-roll` tags the loader couldn't parse — their state changes now apply correctly.
- **Contributor rulesets.** Werewolf: The Apocalypse 20th (w20) and Exalted Versus World of Darkness (exwod), with thanks to @Alatheus1.

## What's new in v0.4.0

- **Typed damage** on health-style tracks: declare `damageTypes` and the renderer color-codes each cell, severity-stacks the worst damage leftmost, and gives the state-mutator per-type field names (`field="bashing" delta="+3"`).
- **Sorcery / multi-turn casting category** in the spellbook. Spells filed under `"sorcery"` get auto-tagged in their lorebook entries, signaling the state-mutator to use multi-turn shape-sorcery flow (declare → accumulate sorcerous motes → unleash with Willpower refund).
- **Agents bundled and auto-installed.** GM-mode bundles ship the canonical agent pool — Ruleset Helper, `combat-overseer`, `context-fuser`, `state-mutator`, an optional pre-input-transformer, and any per-system parallel-phase overlays (e.g. Exalted's anima-banner-monitor + charm-cooldown-tracker, VTM's blood-pool-tracker). All `enabled:true` because GM-mode has no per-agent toggle UI; the bundle IS the install. Idempotent `mrrAgentRole` keying handles re-installs in place.
- **CSP-safe formula evaluator.** The `{StatName}*N+M` parser uses recursive descent instead of `new Function`. Marinara pages with strict CSP that blocks `'unsafe-eval'` now compute bar maxes correctly.
- **State-mutator field-name normalization** + max-clamp on numeric deltas + persisted dedupe across reloads.
- **Lorebook install path rewritten** to fix the silent-failure bulk endpoint. Per-entry POST with delete-then-add for clean re-installs.
- **Self-contained release folder** at `releases/1.0.0/` with seven AI-feedable build docs, two complete reference systems, and drop-in install files.

See [`CHANGELOG.md`](CHANGELOG.md) for the full list.

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
| `extension/RPG-Extension-GM-Mode.{css,js}` | The single client extension you import into Marinara's Settings → Extensions (CSS embedded in the JS). Hides the built-in attribute panel, renders a ruleset-driven sheet, drives the dice widget, manages a multi-ruleset library. |
| `schema/bundle.schema.json`  | JSON Schema for the install bundle envelope (ruleset + gmAgent + lorebook in one file). |
| `tools/validate-ruleset.mjs` | CLI: validates any `ruleset.json` against the schema. `npm run validate-rulesets` validates everything in `rulesets/`. |
| `tools/validate-bundle.mjs`  | CLI: validates `bundle.json` files. `npm run validate-bundles` checks all three reference bundles. |
| `tools/build-bundle.mjs`     | CLI: assembles `bundle.json` from a ruleset directory. `npm run build-bundles` rebuilds all three. |
| `tools/embed-css.mjs`        | CLI: re-embeds `extension/RPG-Extension-GM-Mode.css` into `RPG-Extension-GM-Mode.js` after CSS edits. |
| `AUTHORING-PROMPT.md`        | **One-paste prompt template for vibecoder authors.** Hand it to claude.ai/ChatGPT/Gemini with "<<YOUR SYSTEM>>" filled in; the AI returns a complete `bundle.json`. |
| `AGENTS.md`                  | **Self-contained reference for AI coding agents.** An LLM reading just this file has enough to author a new ruleset bundle from zero or extend the extension with a new resolution mode. Read this if you're an AI agent or if you want an AI to do the authoring. |
| `docs/AUTHORING.md`          | Original authoring reference (data file fields, design philosophy). |
| `docs/ADDING-RULESETS.md`    | **Step-by-step worked example** of adding a new ruleset using Fate Core as the case study. Read this first if you want to extend. |
| `docs/INSTALL.md`            | Top-level install walkthrough (also see each ruleset's own `INSTALL.md`). |
| `docs/ENGINE-CONSTRAINTS.md` | Honest doc on what this overlay can and cannot change about Marinara's built-in Game Mode. |

## Install (no developer tools required)

If you just want to use the extension and don't have Node, npm, or git installed, this is the path. You'll do two file imports total: one for the extension itself, one for the ruleset bundle. **Marinara Engine should already be running in a browser tab before you start** — if you don't have it set up yet, follow Marinara's own [installation guide](https://github.com/Pasta-Devs/Marinara-Engine#installation) first, then come back here.

> **Requires Marinara Engine 2.4.3+ with External Extensions enabled.** Pre-2.3.4 engines may work but are untested (best-effort passthrough only); engines 2.3.4–2.3.x have no extension support at all and cannot load MRR. See `docs/INSTALL.md` for the two gates you need enabled before Step 3 below.

**Step 1 — Download the release zip.** Open the [Releases page](https://github.com/Kenhito/Marinara-RPG-Extension/releases/latest), scroll to the **Assets** section, and click the file ending in `.zip` (named like `Marinara-RPG-Extension-<version>.zip`). It will save to your Downloads folder.

**Step 2 — Extract the zip.** Open your **Downloads** folder. Right-click the zip and choose *Extract All* (Windows), double-click it (macOS), or run `unzip Marinara-RPG-Extension-<version>.zip` (Linux). You'll get a folder named `Marinara-RPG-Extension-<version>/` containing `extension/`, `rulesets/`, `docs/`, and a few other files.

**Step 3 — Import the extension into Marinara.** MRR loads through the **External Extensions** lane (Full page access). Before importing, confirm both gates are on: `ENABLE_EXTERNAL_EXTENSIONS=true` on the engine host, and **Settings -> Advanced -> Danger Zone -> Allow third-party extension imports**. Then go to **Settings -> Addons -> External Extensions -> Import** and use ONE of these forms:

- **Zip import (primary).** Import `releases/1.0.0/Marinara-RPG-Extension.extension.zip` directly — it's packaged in Marinara's own canonical export layout (`Extensions/<name>/manifest.json` + `extension.js` + a `marinara-extensions.json` envelope).
- **Folder import.** Point **Import Folder** at the extracted `releases/1.0.0/Extensions/Marinara-RPG-Extension/` folder.
- **Manifest-only import.** Import the `manifest.json` from that same folder.

**Do NOT use a loose single-file `.js` import.** At 2.4.3, importing `RPG-Extension-GM-Mode.js` by itself builds a **sandboxed Worker extension** with no DOM and no same-origin API access — it "succeeds" but MRR cannot run in that sandbox. Always use one of the three forms above.

Either way you end up with one installed extension that works in **both Game Mode and Roleplay Mode** chats — Marinara made custom agents mode-agnostic, so a single install serves both.

![Marinara Engine Settings dialog opened to the Extensions tab. The General/Appearance/Themes/Extensions/Import/Advanced tab row sits below the Settings header. A large dashed Import Extension (.json, .css, or .js) button is the primary action; below it the Installed Extensions list shows RPG-Extension-GM-Mode with a green on-toggle and a trash icon.](docs/screenshots/extension-menu.png)

After import the extension arrives **disabled and unapproved** — open it, inspect the code, and click **Review and Run** to approve its exact hash and enable it. **Every future update re-requires this approval step.** You should then see `RPG-Extension-GM-Mode` listed with the toggle switched **on** (green). A new **Ruleset** button will appear in the top-right of the chat header next to a small round button with a parchment-scroll icon — that scroll button toggles the floating character sheet on and off.

> **If the Ruleset button doesn't show up,** hard-refresh the page (Ctrl + Shift + R on Windows/Linux, Cmd + Shift + R on macOS) and confirm the extension shows enabled (approved) in Addons -> External Extensions.

**Step 4 — Open the Ruleset dialog and import a bundle.** Click the **Ruleset** button in the chat header. The dialog accepts a `bundle.json` three ways:

![Marinara RPG Ruleset dialog. URL field at the top with a raw GitHub URL example, then a multi-line textarea for the bundle or ruleset JSON. Buttons in order: Fetch URL, Choose file..., Clear, Uninstall server data, Save and reload (highlighted as the primary action). Below that a Library section listing previously installed rulesets.](docs/screenshots/ruleset-ui.png)

- **Choose file…** — browse to the folder you extracted in Step 2, navigate to `rulesets/<system>/bundle.json` (one of `dnd5e`, `exalted3e`, `fate-core`, or `pathfinder2e`), and select it. Best for offline installs and the simplest path.
- **Fetch URL** — paste a raw GitHub URL like `https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/exalted3e/bundle.json` into the URL field, then click **Fetch URL**. To get a raw URL for any file on GitHub, open the file's page on github.com and click the **Raw** button at the top-right of the file viewer — that URL is what you paste here. Best when you'd rather not keep the extracted zip around.
- **Paste JSON** — open `rulesets/<system>/bundle.json` in any text editor (Notepad, TextEdit, VS Code), copy its entire contents, and paste into the textarea below the URL field. Best for one-off bundles you've received over chat or email.

**Step 5 — Save and reload.** Click **Save and reload**. The extension validates the bundle, then installs the lorebook and the agents into your Marinara server (via `POST /api/agents` and `/api/lorebooks`) and caches the ruleset locally to drive the character sheet and dice widget. The page reloads.

**Step 6 — Launch your game, attach the lorebook, enable the agents.** Installing is not activating: on Marinara 2.4.3+ the MRR agents behave like any custom agents — after you create/launch your game, **attach the ruleset's lorebook to the game** (at setup or after launch; without it the agents have no rules to follow) and **enable the MRR agents for that game** (Settings → Agents, agents named like `MRR: <System> — <Role>`, enabled after the game launches — not mid-generation). A good minimal set is the Ruleset Helper + State Mutator; each enabled agent costs one model call per turn.

> **If Fetch URL fails,** your Marinara server may be blocking outbound fetches — use **Choose file…** or paste the JSON instead. **If Save and reload errors,** check the browser console (F12 → Console) for the specific message; the most common cause is an old extension version not seeing a recent bundle field, which the v0.3 release does not have.

**Custom bundles.** If you authored your own `bundle.json` using [`AUTHORING-PROMPT.md`](AUTHORING-PROMPT.md) — paste the prompt into Claude/ChatGPT/Gemini, fill in your system's mechanics, save the AI's response as a `.json` file — the same dialog accepts it via any of the three paths above. The file lives wherever you saved it (typically your Downloads or Documents folder).

**Switching rulesets.** Saved rulesets show up in the **Library** section at the bottom of the Ruleset dialog with a *Switch* button next to each. Switching is a one-click reload-into-the-other-ruleset; both lorebooks and GM agents stay registered with your Marinara server, so swapping back is instant.

**Cleaning up.** Once the extension is imported and at least one bundle is installed via *Choose file…*, the extracted folder is no longer needed by Marinara — feel free to delete it. If you're using *Fetch URL* exclusively, you can skip extraction entirely and just paste the URL.

## Migrating from the RP-mode extension

As of v1.0.0 this is the **single** Marinara RPG extension — it supersedes the separate RP-mode extension (`Marinara-RPG-RP-Mode-Extension`, the `mrrp-` namespace), which is now frozen. One install runs in both Game Mode and Roleplay Mode, so there's no reason to keep both. Your saved characters come across without losing anything:

- **Character bundles.** The Ruleset dialog's character import accepts **both** the new `mrr-character-bundle` files and legacy `mrrp-character-bundle` exports. Loaded sheets are silently re-saved in the `mrr-` format. Just import your old export the same way you'd import any character bundle.
- **Direct import from the installed RP-mode extension.** If you still have the RP-mode extension installed in the same browser, use **Import from RP-mode ext** in the Ruleset dialog. It reads the RP extension's character sheets straight out of browser storage (the `mrrp-character-*` keys) and re-saves them under the `mrr-` namespace — useful because some early RP-mode exports shipped empty sheets. It only ever **reads** the legacy keys; it never writes them.
- **Agents.** The **Import agents** dialog accepts both `mrr-agents` and legacy `mrrp-agents` JSON files (it always writes `mrr-agents`).

After migrating, you can uninstall the old RP-mode extension. Nothing in the RP-mode repo is deleted — its history stays intact — it simply receives no further updates.

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

![Character save controls](docs/screenshots/character-save-controls.png)

Character sheets are stored in your **browser's localStorage**, keyed to the chat ID + character ID. The bar at the top of every sheet (shown above) is how you manage characters and their saves. From left to right:

| Control | What it does |
|---------|--------------|
| **Character dropdown** | Switch between characters in the current chat |
| **+** | Create a new character in this chat |
| **rename** | Rename the active character |
| **x** | Remove the active character from this chat (irreversible — there's no trash) |
| **save** | **Download** all characters in the active chat as a JSON file you keep on your computer |
| **load** | **Replace** all characters in the active chat with a previously-downloaded JSON file |
| **Saved HH:MM:SS** | Timestamp of the most recent in-browser auto-save (every edit auto-saves to localStorage). **This is NOT a permanent save.** |

### ⚠️ localStorage is volatile — save your characters regularly

The auto-save indicator confirms your sheet is currently persisted in your browser's local storage, **but localStorage is NOT a long-term backup.** Your characters can disappear if any of the following happens:

- You **clear site data** for the Marinara host (browser settings → privacy → clear data)
- You **switch browsers** (Firefox character won't appear in Chrome, and vice versa)
- You **switch devices or computers** (localStorage doesn't sync)
- Your browser **hits its per-site storage quota** and evicts older entries
- You uninstall and reinstall the extension on a fresh profile
- Private / incognito browser sessions wipe their localStorage on close
- A browser update bug, OS reinstall, or disk failure wipes the profile

**To permanently save a character: hit the `save` button.** It downloads a JSON file containing every character in the current chat. Store these files in a folder you control — sync them to cloud storage, commit them to git, email them to yourself, whatever fits your workflow. Save after every meaningful session (XP gain, gear changes, story moments, end of session).

**To restore characters into a new chat: hit `load`** and pick the JSON file. The current chat's characters are replaced with the file's contents (every character in the saved file). Chat IDs rotate per Marinara session, so a fresh chat will look like a blank slate until you `load` your saved file. You can also `load` the same file into multiple chats — the characters will appear in each chat independently.

**Bottom line**: think of localStorage as "draft, in flight." The downloaded JSON is the master copy.

## The honest part — what this overlay cannot do

Marinara's GM prompt assembly and the combat-encounter modal live in server-side TypeScript and aren't user-replaceable without forking the engine. This overlay deliberately does NOT fork. Practical implications:

- **Combat-encounter modal** — when Marinara's built-in combat UI fires, the encounter resolution is still d20-flavored under the hood. The narration around it is still ruleset-flavored, but the modal's stat blocks are not. Tradeoff documented in `docs/ENGINE-CONSTRAINTS.md`.
- **`RPGAttributes` writes back to chat state** — the engine's attribute storage is typed to D&D's six attrs. Non-D&D rulesets persist their sheet to localStorage per chat, with a "Sync to chat" button to copy values into Marinara's `customTrackerFields` so the GM agent sees them.

If you want true mechanic replacement (e.g. server-rendered Exalted combat with proper tick-based initiative), that requires either upstream PRs into Marinara or a fork. This repo's scope is "no fork".

## Authoring your own ruleset

### The fast path — vibe-code with a chat AI

Open **`AUTHORING-PROMPT.md`**, copy it whole into a chat with a frontier model (Claude, GPT-5, Gemini Pro), and paste it as your system prompt. The prompt directs the AI to read this repo's authoritative source files, then produce a single `bundle.json` for your system. The AI knows what files it needs to consume:

| File | What the AI reads it for |
|---|---|
| `schema/bundle.schema.json` | The exact JSON shape required (discriminator `mrr-bundle`, integer `position`, required fields). |
| `schema/ruleset.schema.json` | Attribute, skill, derived-stat, and resolution-mode constraints. |
| `docs/ADDING-RULESETS.md` | Full walkthrough using Fate Core as a worked example. |
| `docs/AUTHORING.md` | Bundle anatomy, eight-step authoring process, common pitfalls. |
| `docs/ENGINE-CONSTRAINTS.md` | Honest list of what the overlay can and cannot do (combat-modal stays d20-shaped, server-side encounter routes hardcoded, 50-char reputation action cap). |
| `agents/*.md` | The three canonical sub-agent prompt sources (`combat-overseer`, `context-fuser`, `state-mutator`). Per-system overrides may live at `rulesets/<id>/agents/<role>.md`; per-system parallel-phase overlays live there too (no shared baseline). |
| One reference bundle (`rulesets/dnd5e/bundle.json` for d20, `exalted3e` for dice pool, `fate-core` for fate ladder, `pathfinder2e` for d20 with the three-action economy) | Concrete example of every field populated correctly. |

Hard requirements your AI's output MUST hit:

- **`gmAgent.promptTemplate` ≥ 50 characters** (schema minimum). Realistically aim for 800+ words covering: system identity, dice mechanic, skill list, derived stats, dice-tag format, what to emit each turn.
- **Integer `position` 0 | 1 | 2** on every lorebook entry (not strings like `"before_an"` — that was the v0.2 footgun, fixed in v0.3).
- **`schema: "mrr-bundle"`** discriminator literal.
- **Reputation tags are free-form in Marinara 2.0+.** Do NOT add a length-cap workaround paragraph to `gmAgent.promptTemplate` — the old 50-character `[reputation: …]` action cap is gone.
- **Sub-agents are installed by the bundle, enabled by the user per game.** On Marinara 2.4.3+ the MRR agents behave like any custom agents: after the game launches, enable the ones the table wants (Settings → Agents) and attach the ruleset's lorebook to the game — without the lorebook the agents have no rules context. There is no migration from any pre-2.4.3-era install; remove old artifacts and install fresh.
- **Character cards:** if you ship one, use the V2 spec (`spec: "chara_card_v2"`, `spec_version: "2.0"`, `data` envelope).

Run `node tools/validate-bundle.mjs rulesets/your-system/bundle.json` after the AI hands back the result to catch shape errors. The validator emits `path/expected/got/hint` records — paste any errors back to the AI for a corrected bundle.

### The developer path — assemble from sources

> **For the generator-pipeline reference** (every `tools/*.mjs` script, what each consumes, what each emits, and which `ruleset.json` fields drive each one), see **[`docs/BUILDING.md`](docs/BUILDING.md)**. It's the canonical contract for the spec-driven build pipeline; pair it with `schema/ruleset.schema.json` and you can scaffold a complete bundle from spec alone, no codebase spelunking required.

For a more deliberate authoring loop:

1. Copy the closest existing bundle directory (`rulesets/dnd5e/`, `exalted3e/`, `fate-core/`, or `pathfinder2e/`) to `rulesets/your-system/`.
2. Edit `ruleset.json` — your dice, attributes, skills, difficulty ladder, dice-tag format.
3. Run `node tools/validate-ruleset.mjs rulesets/your-system/ruleset.json` to confirm.
4. Edit `gm-agent.md` to teach the GM your mechanics and dice-tag format.
5. Build `lorebook.json` for your system's rules reference (keyword-triggered entries; integer positions; tune `tokenBudget` to ~1500–2000).
6. (Optional) Tune a sub-agent for your system by dropping `rulesets/your-system/agents/<role>.md` — the three universal baselines are at the repo root's `agents/` (`combat-overseer`, `context-fuser`, `state-mutator`). Per-system parallel-phase overlays live ONLY at `rulesets/your-system/agents/<role>.md` — no shared baseline, since they track system-specific resources.
7. Write `INSTALL.md` for the per-ruleset install instructions (audience: end users on Marinara).
8. Run `node tools/build-bundle.mjs rulesets/your-system/` to assemble the inputs into `bundle.json`.
9. Run `node tools/validate-bundle.mjs rulesets/your-system/bundle.json` to confirm shape.
10. Test in a real chat with a real model before declaring done.

### Resolution modes available today

The schema supports **nine resolution modes** covering the dominant tabletop families. Each entry below lists the schema mode name + a sample of the tabletop systems it fits.

- **d20 + modifier vs DC** (`single-roll`) — D&D 5e, Pathfinder 1e / 2e, Cypher System, D&D 3.x and OGL retroclones. Single d20 roll + modifier compared against a difficulty class.
- **Storyteller / d10 dice pool** (`dice-pool`) — Vampire: The Masquerade V20, Werewolf: The Apocalypse W20, Mage: The Ascension M20, Exalted (all editions), oWoD / nWoD / Chronicles of Darkness, Shadowrun. Roll Xd10, count successes against a target face (variable per-roll in V20/W20/M20; fixed 7 in Exalted 3e); doubled max-face; botches on 1s when zero successes.
- **Percentile under skill** (`d100-percentile`) — Call of Cthulhu (1e-6e), BRP, RuneQuest, Stormbringer, Mythras. 1d100 ≤ skill rating; lower is better.
- **PbtA 2d6 with bands** (`2d6-stat`) — Apocalypse World, Dungeon World, Monster of the Week, Masks, Blades-adjacent PbtA hacks. 2d6 + stat with 10+ / 7-9 / 6- outcome bands.
- **Fate ladder** (`fate-ladder`) — Fate Core, Fate Accelerated, Fate-of-Cthulhu, Fudge. 4dF (Fudge dice) + skill against a verbal ladder; Success-with-Style at +3 margin.
- **Roll-under sum** (`roll-under`) — GURPS (3d6), Call of Cthulhu 7e (1d100), Pendragon. Dice total ≤ target = success; higher target = better. Optional critical-success and fumble thresholds.
- **Stance-modal dice pool** (`stance-modal-pool`) — Lasers & Feelings, Stewpot, Trophy Dark. Xd6 pool with a per-roll stance toggle (one stat counts under, the other over); a designated "bridge" face value (e.g. LASER FEELINGS in L&F) grants both success AND triggers a player question.
- **OpenD6 / dice-pool sum** (`dice-pool-sum`) — OpenD6, WEG Star Wars d6 (1987-1999), Mini Six. Roll Xd6, sum, compare against difficulty. Supports the **Wild Die** mechanic (one die in the pool explodes on max face cascading, and flags a complication on 1). Supports **pip granularity** (1/3-of-a-die precision for OpenD6's NDX+P notation).
- **Narrative-handled** (`narrative-handled`) — Trophy Dark dark dice, prose-resolved scenes, GM-overrules resolution. No mechanical roll — the GM/narration adjudicates outcomes based on fiction.

**Don't see your favorite system's mechanic above?** Ask Kenhito in the **Marinara Extension community thread** (or open a GitHub issue at this repo) and describe the core resolution rule, the shape of one full roll, and any special mechanics (exploding dice, opposed rolls, multi-stat pulls). Schema additions take a few days when scoped right. Don't try to encode an unsupported mechanic under the closest existing mode — that produces a sheet/widget that lies to the player.

Full per-mode `resolution` block shapes are documented in `docs/AUTHORING-PHASE-6.md` section 1.

## License

- **Repo / extension / schema / docs:** MIT (see `LICENSE`).
- **`rulesets/dnd5e/` content:** Wizards of the Coast SRD 5.1, CC-BY-4.0.
- **`rulesets/exalted3e/` content:** Original mechanics references and charm names belong to Onyx Path Publishing. No verbatim Onyx Path text is reproduced. The data file paraphrases mechanics for AI consumption only; if you want full rules and flavor, buy the book.
- **`rulesets/fate-core/` content:** Original mechanics references; Fate-family ladder labels and `4dF` notation are common to Fate-family games. No verbatim Evil Hat text reproduced. Compatible with the Fate Core SRD (CC-BY 3.0). Ladder labels and Fudge-dice mechanics originate with Steffan O'Sullivan's Fudge (1992) and Evil Hat's Fate Core (2013).

Marinara Engine itself is AGPL-3.0 — but this repo is an **overlay** (it does not modify or redistribute Marinara source), so the MIT licensing for the overlay's own code is appropriate.

## Status

v0.3 — four reference rulesets (D&D 5e, Exalted 3e, Fate Core, Pathfinder 2e), validating schema with five resolution modes, single-file `bundle.json` install, embedded-CSS framework JS, multi-ruleset library, JSON character save/load, inventory + equipment-bonus system, resizable + collapsible floating character sheet, and a no-developer-tools install path. Built and tested against Marinara Engine v1.5.6. Bug reports welcome; PRs more so. If you build a bundle for Blades in the Dark, Lancer, Mörk Borg, GURPS, Vampire 5e, Cyberpunk RED, or any other system, please open a PR — the framework is meant to support more.
