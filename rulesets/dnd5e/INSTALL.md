# Install — D&D 5e ruleset

Three pieces to install in Marinara Engine. Order matters: load the extension first so it's listening when you open a Game Mode chat.

## 1. Install the client extension (once per Marinara install)

In Marinara Engine, open **Settings → Extensions → Add Extension**.

- **CSS** — paste the contents of `extension/ruleset-loader.css` (top-level of this repo).
- **JS**  — paste the contents of `extension/ruleset-loader.js`.
- Enable the extension.

You'll see a "Ruleset" button appear in the chat header.

## 2. Activate the D&D 5e ruleset

Click the **Ruleset** button in the chat header. In the dialog:

- **Option A — paste:** copy `rulesets/dnd5e/ruleset.json` and paste it into the textarea. Click **Save and reload**.
- **Option B — fetch by URL:** paste the raw URL into the URL field, click **Fetch URL**, then **Save and reload**:
  `https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Rulesets/main/rulesets/dnd5e/ruleset.json`

After reload, the chat header button reads "Ruleset: Dungeons & Dragons 5th Edition" and your character sheet panel shows the D&D-flavored attributes / skills / states.

## 3. Install the GM agent prompt

In Marinara Engine: **Settings → Agents → Create Custom Agent**.

- **Name:** D&D 5e Ruleset Override
- **Phase:** `pre_generation`
- **Result type:** `context_injection`
- **Prompt template:** copy the prompt block from `rulesets/dnd5e/gm-agent.md`.
- **Connection:** any model with strong instruction-following; a small/fast model is fine.
- Toggle the agent **on** for your Game Mode chat.

## 4. Install the lorebook

In Marinara Engine: **Lorebooks → Import**.

- Import `rulesets/dnd5e/lorebook.json`.
- In your Game Mode chat's settings, attach this lorebook (per-character or per-chat).

## 5. Sanity check

In a fresh Game Mode chat:

1. Click the dice widget icon (or use the **Open dice widget** button on the sheet).
2. Set Modifier = 3, Proficiency = 2, DC = 15. Click **Roll d20**.
3. You should see something like `[dice: 1d20+3+2 vs DC15 = 19 success (face 14)]`.
4. Click **Send to chat**. The tag goes into the chat input, ready to send.
5. The GM agent should pick it up next turn and narrate accordingly.

## Updating

When this repo publishes a new ruleset version:

- If you used **Fetch URL**, just open the dialog again and click **Fetch URL → Save and reload**.
- If you pasted the JSON, copy the new version from the repo and paste over the old.
- Update the lorebook by re-importing it.
- The agent prompt rarely changes; check the changelog if in doubt.

## Uninstall / deactivate

Open the Ruleset dialog and click **Clear**. Reload the page. The default Marinara Game Mode UI returns. The custom agent and lorebook can be disabled in their respective panels.
