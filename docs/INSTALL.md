# Install — top level

Each ruleset folder has its own step-by-step `INSTALL.md`. This page is the orientation: what gets installed where, in what order, and what to look for when it works.

## What you install, in order

1. **Client extension (once per Marinara install) — requires engine 2.4.3+**
   MRR loads through Marinara's **External Extensions** import lane (Full page access). Two gates must be on:
   - `ENABLE_EXTERNAL_EXTENSIONS=true` in the engine host's `.env`.
   - **Settings -> Advanced -> Danger Zone -> Allow third-party extension imports** (toggle on).
   - (Remote/non-localhost management additionally needs `ADMIN_SECRET` set + **Settings -> Advanced -> Admin Access**.)

   With both gates on, go to **Settings -> Addons -> External Extensions -> Import** and import the package. Use ONE of these forms (in order of preference):
   - `Marinara-RPG-Extension.extension.zip` (from `releases/<version>/`)
   - **Import Folder** pointed at `releases/<version>/Extensions/Marinara-RPG-Extension/`
   - The `manifest.json` alone from that folder

   **Do not import the loose `RPG-Extension-GM-Mode.js` file by itself.** At 2.4.3 a loose-`.js` import silently becomes a **sandboxed Worker extension** — no DOM, no same-origin API access — where MRR cannot function. It "succeeds" but does nothing. Only the zip/folder/manifest forms route into the Full-page review flow MRR needs.

   The import arrives **disabled and unapproved**. Open it, inspect the code, and click **Review and Run** to approve its exact SHA-256 hash and enable it. The extension starts in dormant mode (no ruleset selected) — it adds a "Ruleset" button to the chat header but otherwise leaves Marinara untouched.

   **Every subsequent update re-requires this approval step** — any edit to the extension's code or CSS invalidates the prior hash.

2. **Import a ruleset bundle**
   Click the **Ruleset** button. Use **Choose file…** to pick the ruleset's `bundle.json` (or **Fetch URL** with a raw GitHub link to one). Click **Save and reload**. This one import installs the ruleset (sheet + dice widget), the lorebook, the main GM agent, and the sub-agents — bundles are data, so no extension re-approval is triggered. The page reloads with the ruleset active.

3. **Attach the lorebook to your game**
   When you create/launch your game (or after it launches), attach the ruleset's lorebook to it — the bundle installed the lorebook, but each game must have it attached. **This is required:** without it the agents have no ruleset rules to follow and will not work correctly.

4. **Enable the agents for your game**
   On Marinara 2.4.3+ the MRR agents behave like any custom agents: installed by the bundle, but enabled per game — **after the game launches, not mid-generation**. Go to **Settings -> Agents** (or the game's agent selection), find the agents named like `MRR: <System> — <Role>`, and enable the ones your table wants. A good minimal set: **Ruleset Helper + State Mutator** (the State Mutator is what makes narration update the character sheet). Each enabled agent costs one model call per turn.

That's all four pieces. The per-ruleset INSTALL files (`rulesets/dnd5e/INSTALL.md`, `rulesets/exalted3e/INSTALL.md`) walk through this in detail with sanity-check rolls.

## Switching rulesets

To switch from D&D 5e to Exalted 3e (or vice versa) on the same Marinara install:

- Click the **Ruleset** button. Paste the new `ruleset.json` (or fetch by URL). Save and reload.
- Disable the previous ruleset's GM agent in **Settings -> Agents** and enable the new one.
- Detach the previous lorebook from the chat and attach the new one.

The character sheet state is per-chat (stored in browser `localStorage` keyed by chat ID), so different chats can run different rulesets concurrently as long as you remember to switch the ruleset selection when you change chats.

## Updates

If you used **Fetch URL** to install a ruleset, you can re-fetch it whenever the upstream version changes — Save-and-reload pulls the new `ruleset.json` into the active state.

The extension itself updates by re-importing the package (same form as install) and re-approving the new hash via **Review and Run** — every code/CSS change requires this, with no exceptions. Marinara doesn't have an extension marketplace, so updates are manual.

## Uninstall

Open the Ruleset dialog and click **Clear**. Reload. The default Marinara Game Mode UI returns. Optionally:

- Disable the custom GM agent in **Settings -> Agents**.
- Detach the lorebook from your chats.
- Remove the extension from **Settings -> Addons -> External Extensions** if you don't plan to use any ruleset.

Your chat history and Marinara state are unaffected by any of this — the overlay only adds; it never modifies engine data.
