# Install Guide — 5 minutes from zero to playing

This walks you through installing one of the example rulesets (D&D 5e or Exalted 3e) into Marinara Engine. If you want to install a system not in the examples, see `BUILD-YOUR-OWN-RULESET.md` first to author one, then come back here.

## Prerequisites

- **Marinara Engine running locally.** [Install instructions on the Marinara repo.](https://github.com/Pasta-Devs/Marinara-Engine) Default port is `7860`.
- **A Marinara connection configured** with an LLM (Anthropic Claude Sonnet/Opus, OpenAI GPT-4-class, local model via Ollama/LM Studio, etc.). Test that you can have a normal chat in Marinara before installing this overlay.
- **A modern browser.** Chrome, Firefox, Safari, or Edge (any current version).

## Step 1 — Install the framework JS (one time)

Open Marinara in your browser. Click **Settings** → **Extensions** → **Add Extension**.

In the **JS** field, paste the entire contents of:

```
install-files/RPG-Extension-GM-Mode.js
```

In the **CSS** field, leave it empty (the CSS is embedded in the JS — that's why this is one paste instead of two).

Click **Save**. Refresh the page.

You'll see a small scroll-icon button appear in the chat header. That's the character-sheet toggle. Click it once and the floating sheet opens (initially blank — we haven't activated a ruleset yet).

## Step 2 — Install your chosen ruleset bundle

Click the **gear icon** in the floating sheet's header → **Ruleset** dialog. You'll see a textarea labeled "Paste a bundle.json or ruleset.json".

Pick one of the example bundles:

- For **D&D 5e**: paste the entire contents of `install-files/dnd5e-bundle.json`
- For **Exalted 3e**: paste the entire contents of `install-files/exalted3e-bundle.json`

Click **Save**. The dialog will show progress messages:

```
Loading existing server state...
Installing ruleset...
Updating lorebook...        (or "Creating lorebook...")
Clearing managed lorebook entries...
Installing N lorebook entries...
Done. Reloading...
```

After reload, the sheet panel will populate with attributes, skills, derived stats, and a sheet header showing your chosen system's name. The bundle install also creates the lorebook as a side-effect; you can confirm it via Marinara → Settings → Lorebooks.

## Step 3 — Import the agents

Marinara → Settings → Agents → **Import** dialog. Paste the entire contents of:

- For **D&D 5e**: `install-files/dnd5e-agents.json`
- For **Exalted 3e**: `install-files/exalted3e-agents.json`

Click **Confirm**. The dialog does delete-then-replace, so re-importing later doesn't accumulate duplicates.

You'll see six new agents appear in the list:

- **<System> Ruleset Helper** — the main GM agent (enabled)
- **<System> — State Mutator** — disabled by default
- **<System> — State Reminder** — disabled by default
- **<System> — Combat Adjudicator** — disabled by default
- **<System> — Lore Query Helper** — disabled by default
- **<System> — NPC Stat Bookkeeper** — disabled by default

## Step 4 — Enable the agents you want active

Each pre-generation agent costs one model call per turn. Toggle on only what you want.

**Recommended for most play:**

- **State Mutator** — auto-updates the sheet from narration (HP loss, motes spent, etc.). Highly recommended.
- **State Reminder** — keeps the GM aware of your current HP/motes/conditions between turns. Highly recommended.

**Optional add-ons:**

- **Combat Adjudicator** — restates initiative, attack/damage formulas during combat. Toggle on if you run heavy-mechanics combat encounters.
- **Lore Query Helper** — answers out-of-character rules questions from the lorebook. Toggle on if your players frequently ask "how does X work?" mid-session.
- **NPC Stat Bookkeeper** — tracks NPC HP and conditions. Toggle on for combat-heavy or NPC-rich scenes.

## Step 5 — Build a character

Open the floating sheet (the scroll icon in the chat header). Click **+ Add character**, name them, fill in attributes / skills / derived values using the +/- steppers.

For Exalted: pick a Sorcery Circle from the states dropdown if you're playing a sorcerer. Add charms / spells via the spellbook flyout (the third floating panel).

For D&D: pick a class and fill in proficiencies. Add spells via the spellbook flyout.

The sheet auto-saves to localStorage on every change.

## Step 6 — Play

Start a chat in Marinara. The active GM agent will use your system's vocabulary and mechanics. The state-mutator (if enabled) will emit hidden tags whenever narration causes mechanical changes; the extension parses them and updates your sheet in real time.

When narration says "the orc's blade tears your shoulder", you'll see a damage tag fire and your health track update. When you say "I cast Fireball", the GM rolls the spell, the state-mutator deducts the spell slot, and you'll see a confirmation toast in the corner.

## Troubleshooting

### Sheet doesn't render after pasting JS

Check the browser console (F12 → Console). Errors will surface there. Common causes:

- **Connection error / 400 from Marinara:** check that your Marinara connection is configured correctly. Some models (Anthropic prefill-disabled models) need specific connection settings; check Marinara's docs.
- **Sheet exists but is offscreen:** if you previously had this extension on a wider monitor, the saved position might be stale. In console run:
  ```javascript
  localStorage.removeItem("mrr-sheet-pos");
  localStorage.removeItem("mrr-sheet-size");
  location.reload();
  ```

### Lorebook is empty after install

Try reinstalling the bundle (Ruleset dialog → paste again → Save). If still empty, check the browser console during install for failed requests to `/api/lorebooks/<id>/entries`.

### State mutations don't apply

Verify the **State Mutator** agent is enabled (Settings → Agents). It installs disabled by default. The sheet only updates from narration when this agent is on.

### "Health Levels" or "Wound Penalty" warnings in console

Those mean the GM agent emitted a field name the extension doesn't recognize. The shipped agent prompts have a FORBIDDEN section explicitly telling the model to avoid those, but if you've customized the prompt in Marinara → Agents, double-check the field vocabulary section is intact. Or just re-import the agents.json to reset to canonical prompts.

### Combat encounter modal looks wrong

Marinara's combat-encounter modal is server-coded with hardcoded D&D-style six-attribute stat blocks. The overlay can't replace it. Combat narration (chat-based) uses your system's vocabulary; the modal stays d20-shaped. Recommended workaround: play combat in narrative mode (don't trigger the modal) for non-d20 systems.

### Character sheets disappear when switching chats

Marinara's chat IDs rotate per chat. Sheets in localStorage are keyed by chat ID, so a fresh chat looks like a brand-new character. Use the sheet header's **Save** button to export all characters as a JSON file, and **Load** to import in the new chat. The save file contains all characters across all chats from the export source.

## Updating to a newer version

When v0.5.0 ships:

1. Replace the framework JS in your Extensions panel with the new file.
2. Reinstall the bundle (Ruleset dialog).
3. Re-import the agents (Import Agents dialog).

Your sheets, characters, conditions, etc. all persist in localStorage. The update path doesn't lose data.

## Done

You're playing your chosen system in Marinara. If you want to extend the system or build another one, see `BUILD-YOUR-OWN-RULESET.md`.
