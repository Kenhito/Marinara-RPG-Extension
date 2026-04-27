# Install — top level

Each ruleset folder has its own step-by-step `INSTALL.md`. This page is the orientation: what gets installed where, in what order, and what to look for when it works.

## What you install, in order

1. **Client extension (once per Marinara install)**
   `extension/ruleset-loader.css` and `extension/ruleset-loader.js` go into Marinara's **Settings -> Extensions -> Add Extension** as the CSS and JS fields of a single extension. Enable it. The extension starts in dormant mode (no ruleset selected) — it adds a "Ruleset" button to the chat header but otherwise leaves Marinara untouched.

2. **Pick a ruleset and activate it**
   Click the **Ruleset** button. Either paste a `ruleset.json` blob into the textarea, or paste a raw URL (e.g. a GitHub `raw.githubusercontent.com` link to one of the rulesets in this repo) and click **Fetch URL**. Click **Save and reload**. The page reloads with the ruleset active.

3. **Install the GM agent prompt for the same ruleset**
   In **Settings -> Agents -> Create Custom Agent**, paste the agent's prompt template from that ruleset's `gm-agent.md`. Set phase = `pre_generation`, result type = `context_injection`. Enable the agent.

4. **Install the lorebook for the same ruleset**
   In **Lorebooks**, import that ruleset's `lorebook.json`. Attach it to your Game Mode chat (per-character or per-chat).

That's all four pieces. The per-ruleset INSTALL files (`rulesets/dnd5e/INSTALL.md`, `rulesets/exalted3e/INSTALL.md`) walk through this in detail with sanity-check rolls.

## Switching rulesets

To switch from D&D 5e to Exalted 3e (or vice versa) on the same Marinara install:

- Click the **Ruleset** button. Paste the new `ruleset.json` (or fetch by URL). Save and reload.
- Disable the previous ruleset's GM agent in **Settings -> Agents** and enable the new one.
- Detach the previous lorebook from the chat and attach the new one.

The character sheet state is per-chat (stored in browser `localStorage` keyed by chat ID), so different chats can run different rulesets concurrently as long as you remember to switch the ruleset selection when you change chats.

## Updates

If you used **Fetch URL** to install a ruleset, you can re-fetch it whenever the upstream version changes — Save-and-reload pulls the new `ruleset.json` into the active state.

The extension itself updates require pasting the new CSS/JS into the same Extensions entry. Marinara doesn't have an extension marketplace yet (as of v1.5.5), so updates are manual.

## Uninstall

Open the Ruleset dialog and click **Clear**. Reload. The default Marinara Game Mode UI returns. Optionally:

- Disable the custom GM agent in **Settings -> Agents**.
- Detach the lorebook from your chats.
- Delete the extension from **Settings -> Extensions** if you don't plan to use any ruleset.

Your chat history and Marinara state are unaffected by any of this — the overlay only adds; it never modifies engine data.
