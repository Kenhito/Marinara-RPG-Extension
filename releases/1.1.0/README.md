# Marinara RPG Rulesets — v1.1.0

This folder is the whole release. It contains an importable extension for [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine) that replaces the built-in Game Master's d20-flavored mechanics — and the player-facing character sheet — with the tabletop system of your choice. Sixteen systems ship ready to import, from D&D 5e and Pathfinder 2e through Exalted 3e, Call of Cthulhu 7e, Fate Core, Vampire and Werewolf 20th, Old School Essentials, and Rolemaster. If yours isn't one of them, the authoring docs in here walk a chat AI through building it, and you never write JavaScript.

**Requires Marinara Engine 2.4.3 or newer.** Import `Marinara-RPG-Extension.extension.zip`, never the loose `.js` file — on a current engine a single-file `.js` import quietly installs as a sandboxed worker that cannot do anything. `INSTALL-GUIDE.md` in this folder is the step-by-step.

## What's new in v1.1.0

- **The 1.0 compatibility problems are fixed, and they now fix themselves.** Engine 2.4.x lets a roleplay preset own where an agent's output goes, and 1.0 predated that: agents ran, cost tokens, and had their output silently discarded. Reinstalling a bundle made it worse by recreating the agents under new types and orphaning the preset sections you'd added, and applying a chat preset could wipe the chat's ruleset stamp entirely. The extension now repairs all three on its own after every bundle import.
- **Character sheets save to the server, not just your browser.** Sheets, your per-chat character roster, and the active ruleset sync through Marinara's own extension storage, with the local browser copy kept as a mirror. Every value is timestamped and the newer side wins, so a browser that saved and then crashed reclaims its edit instead of losing it. Clearing site data no longer wipes your characters, and they show up in a second browser.
- **Chats remember their character sheets and their ruleset.** Entering a chat activates that chat's ruleset automatically; the sheet and dice widget follow. Sheets are held per character, with protection against one system's values bleeding into another's game.
- **A ruleset can offer more than one dice mechanic.** Systems can declare named alternate mechanics and bind individual skills to them — Old School Essentials ships as the pilot, with percentile Thief skills and X-in-6 door checks alongside its d20 attacks and saves. Dice-pool and roll-under are the two modes wired end to end so far; this is the foundation, and more follow.
- **Real dice, end to end.** With the chat's **Enable Tool Use** toggle on, the GM resolves random outcomes through Marinara's server-side `roll_dice` tool and narrates what it returned. The piece that writes to your sheet now runs *after* the narration, so it copies numbers out of the story instead of inventing ones that didn't exist yet — and it cites where each came from, so you can audit anything that looks wrong.
- **Full swipe support.** Each swipe carries its own state: swipe away and its changes revert, swipe back and they reapply, regenerate and the dice roll fresh instead of reusing the last version's numbers.
- **The turn-editing buttons work again.** Regenerate, the swipe arrows, and edit had been dead in every chat with the extension installed. Long-standing; fixed.
- **Two more systems** — Old School Essentials and Rolemaster (RMFRP) — taking the count from 14 to 16.
- **A smaller download.** The shipped loader is comment-stripped at build time: 623 KB packaged, down from 760 KB in 1.0.0.
- **Better docs.** Five systems that shipped without an install guide have one; all sixteen now cover the dice-tool toggle and the preset agent-sections step; and the repo's install walkthrough has screenshots.

Known notes, stated plainly: multi-mechanic dice is wiring and preview rather than a finished feature (two of nine resolution modes, one pilot ruleset). Game mode is expected to work but nobody played a session in it before shipping — the live testing behind these fixes ran in roleplay mode. And **Vampire 20th, Werewolf 20th, and Exalted Versus World of Darkness still run the previous-generation state flow**, which means their sheet-writing agent can still guess at dice results and their transcripts still show raw `[mrr-state: ...]` tags. Each needs its own pass; none has had one.

Full detail is in the repo's `CHANGELOG.md`.

## Upgrading from 1.0.0 — the new bundles are required

**Re-import the ruleset bundle for every system you play.** The compatibility fixes in this release are split across the extension and the ruleset bundles, so a bundle you downloaded with 1.0.0 will not behave correctly against the 1.1.0 extension: its state-writing agent still runs on the old pre-narration timing and will invent dice results, it lacks the GM dice doctrine that makes rolls real, and it predates the self-repairing preset reconciliation. Fresh copies of all sixteen are in `install-files/` in this folder. Import the new extension zip, click **Review and Run** on the new code hash, then open the **Ruleset** dialog and re-import your system's `bundle.json`. Your characters and sheets are not touched by any of this. Once the new bundle is in, the extension repoints your preset's agent sections by itself — you do not re-run **Add agent sections to active preset**.

## Verify your download

You are about to hand a file to your own engine and approve it to run with full page access, so it is worth thirty seconds to confirm it is the file that was published.

```sh
sha256sum Marinara-RPG-Extension.extension.zip
sha256sum RPG-Extension-GM-Mode.js
```

On macOS use `shasum -a 256 <file>`; on Windows, `certutil -hashfile <file> SHA256`.

- `Marinara-RPG-Extension.extension.zip` — `<ZIP_SHA256>`
- `RPG-Extension-GM-Mode.js` — `<LOADER_SHA256>`
- **After import**, open the extension's page and confirm it lists **Full page access** — Marinara's **Review and Run** dialog should show exactly `sha256:<ENGINE_HASH>`. That is the engine's own hash of the code it is about to approve; if it reads anything else, you imported a different file.

If a hash does not match, stop and re-download rather than importing.

## Where to go next

- **Full install guide:** [`INSTALL-GUIDE.md`](INSTALL-GUIDE.md) — the canonical step-by-step, from the two engine switches through your first roll.
- **Building a system that isn't here:** [`BUILD-YOUR-OWN-RULESET.md`](BUILD-YOUR-OWN-RULESET.md), with the AI-authoring reference set in [`docs-for-ai/`](docs-for-ai/) and the one-paste template in [`AUTHORING-PROMPT.md`](AUTHORING-PROMPT.md).
- **Full docs, screenshots, and the changelog:** the [GitHub repo](https://github.com/Kenhito/Marinara-RPG-Extension).

## License

MIT for the extension, schema, tools, and docs (see the repo's `LICENSE`). Ruleset content carries its own attribution — D&D 5e content is WotC SRD 5.1 under CC-BY-4.0; the rest paraphrase mechanics for AI consumption and reproduce no publisher text. If you want the full rules and flavor for a system, buy the book.
