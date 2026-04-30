# Install — Exalted 3rd Edition ruleset

Four pieces to install in Marinara Engine. Order matters: load the extension first so it's listening when you open a Game Mode chat.

## 1. Install the client extension (once per Marinara install)

If you've already installed the extension for another ruleset, skip this step — the same extension drives all rulesets.

Otherwise: **Settings → Extensions → Add Extension**.

- **CSS** — paste the contents of `extension/ruleset-loader.css` (top-level of this repo).
- **JS**  — paste the contents of `extension/ruleset-loader.js`.
- Enable the extension.

A "Ruleset" button appears in the chat header.

## 2. Activate the Exalted 3e ruleset

Click the **Ruleset** button. In the dialog:

- **Option A — paste:** copy `rulesets/exalted3e/ruleset.json`, paste it in, click **Save and reload**.
- **Option B — fetch by URL:**
  `https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/exalted3e/ruleset.json`

After reload, the sheet shows the 9-attribute (Physical / Social / Mental) layout, the 25 abilities, Essence / Motes / Willpower bars, the Health track, and Anima Banner / Stunt Tier selectors.

## 3. Install the GM agent prompt

**Settings → Agents → Create Custom Agent**.

- **Name:** Exalted 3e Ruleset Override
- **Phase:** `pre_generation`
- **Result type:** `context_injection`
- **Prompt template:** copy the prompt block from `rulesets/exalted3e/gm-agent.md`.
- **Connection:** any model with strong instruction-following.
- Enable the agent for your Game Mode chat.

## 4. Install the lorebook

**Lorebooks → Import** → `rulesets/exalted3e/lorebook.json`.

Attach it to your Exalted Game Mode chat. The lorebook entries trigger on words like `charm`, `mote`, `anima`, `stunt`, `intimacy`, `caste`, etc., so the GM model gets the right rules brief on the relevant turns.

## 5. Set the GM-screen difficulty

In Marinara's Game Mode setup, set the screen-level difficulty to **Demanding** or **Legendary** for an Exalted feel. The agent's per-roll difficulties override per check, but the screen difficulty colors random encounters and overall pacing.

## 6. Sanity check

In a fresh Game Mode chat with this ruleset active:

1. Open the dice widget. Set Pool = 9, Difficulty = 3, Stunt = 1. Click **Roll pool**.
2. You should see something like:
   `[dice: 10d10 vs 7 -> 6 successes, 2 tens doubled] (diff 3, pass)`
3. Click **Send to chat**. The tag goes into the chat input.
4. The GM agent should narrate the action with appropriate Exalted flavor and update mote / Willpower / anima state in the next turn's brief.
5. Try a botch: roll Pool = 2, Difficulty = 5. Often you'll get zero successes with a 1 — `BOTCH` shows in the result.

## What this ruleset does NOT do (be honest)

- **Combat-encounter modal:** when Marinara's built-in combat encounter UI fires, it's still d20-flavored under the hood. The dice tags in narration follow the Exalted ruleset; the encounter modal does not. See `docs/ENGINE-CONSTRAINTS.md`.
- **Charm tree DSL:** charms are reference entries in the lorebook, not structured data. The GM model interprets them, the player picks them by name. A future v2 might encode charm trees structurally.
- **Combat tick / Initiative-based momentum:** the v1 ruleset.json focuses on resolution mechanics. Initiative-based Decisive/Withering is left to GM narration. If you want it explicit, customize the agent prompt.

## Updating

If you used **Fetch URL**, the dialog's **Fetch URL → Save and reload** path keeps you current. If you pasted the JSON, paste the new version over.

## Uninstall / deactivate

Open the Ruleset dialog and click **Clear**. Reload. Marinara's default Game Mode UI returns. Disable the custom agent and detach the lorebook to fully revert.
