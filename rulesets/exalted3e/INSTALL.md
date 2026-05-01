# Install — Exalted 3rd Edition ruleset

## Quick install (recommended)

**One file import + one bundle install.** Skip step 1 if the framework extension is already installed.

### 1. Install the framework extension (once per Marinara install)

In Marinara Engine: **Settings → Extensions → Add Extension** — Marinara's
Extensions screen accepts file uploads, not pasted text.

- **Import** the file `extension/ruleset-loader.js` from this repo. The
  CSS is embedded — there is no separate stylesheet to upload.
- Name: `Marinara-RPG-Extension`. Description: anything.
- Enable.

A **Ruleset** button appears in the chat header.

### 2. Install the Exalted 3e bundle

Click the **Ruleset** button. The dialog has three ways to load a bundle:

- **Option A — Choose file:** click **Choose file…** and pick
  `rulesets/exalted3e/bundle.json` from disk. Click **Save and reload**.
- **Option B — Fetch URL:**
  `https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/exalted3e/bundle.json`
- **Option C — Paste:** copy the contents of `bundle.json` into the
  textarea, click **Save and reload**.

The installer creates the lorebook ("MRR: Exalted 3e Charms & Conditions") with 19 entries, the custom GM agent ("MRR: Exalted 3rd Edition Ruleset Override"), and activates the ruleset. The page reloads.

## Sanity check

In a fresh Game Mode chat:

1. Click the dice widget icon. The widget renders the dice-pool form: Pool size, Difficulty, optional Stunt and Excellency boosters.
2. Set Pool = 8, Difficulty = 3. Click **Roll d10s**.
3. You should see `[dice: 8d10 vs 3 → N successes (faces ...)]` — count successes from rolls of 7+, with 10s counting as two.
4. Send to chat. The GM agent picks up the result.

## Updating

Bundle update flow is the same as install — Choose file again, fetch the URL again, or paste the new `bundle.json`. The installer detects the existing managed agent/lorebook by tag/setting and PATCHes rather than duplicating.

## Equipment & bonuses (v1.1.0+)

The character sheet now includes an Inventory section. Click **+ Add item**, give the item a name, slot (e.g. `weapon`, `armor` — anything you want), and one or more bonuses such as `Melee +2 dice (accuracy)` or `Defense (Parry) +1`. Click **Equip** on a row to apply that item's bonuses to the slot.

When equipped:
- Derived stats whose name matches a bonus target show `base + N` with a hover tooltip listing the contributing items.
- Clicking **roll** on a skill row pre-fills the dice widget's new **Equipment** field with the equipped dice contribution; the rolled `[dice: ...]` tag includes that bonus so the GM sees the actual pool.

The exalted3e ruleset does not pre-declare `equipmentSlots` — pick whatever slot vocabulary fits your character (single-handed dual-wield, off-hand, two-handed, etc.). An attunement layer for Essence-mote commitment is planned in a later release; until then, equipped bonuses apply unconditionally.

## Removing

Open the Ruleset dialog and click **Uninstall server data** to remove the lorebook and GM agent created by this install. Click **Clear** to wipe the local ruleset cache.

## Manual install (legacy / source-of-truth path)

The four-file flow still works:

1. **Settings → Extensions** — import `extension/ruleset-loader.js` (CSS embedded).
2. **Ruleset button** — Choose file / fetch URL / paste `rulesets/exalted3e/ruleset.json`.
3. **Settings → Agents → Create Custom Agent** — copy the prompt block from `rulesets/exalted3e/gm-agent.md` (Phase: pre_generation, Result type: context_injection).
4. **Lorebooks → Import** — import `rulesets/exalted3e/lorebook.json`.

The bundle path automates all four steps from one file import.
