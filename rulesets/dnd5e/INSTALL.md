# Install — D&D 5e ruleset

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

### 2. Install the D&D 5e bundle

Click the **Ruleset** button. The dialog has three ways to load a bundle:

- **Option A — Choose file:** click **Choose file…** and pick
  `rulesets/dnd5e/bundle.json` from disk. Click **Save and reload**.
- **Option B — Fetch URL:**
  `https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/dnd5e/bundle.json`
- **Option C — Paste:** copy the contents of `bundle.json` into the
  textarea, click **Save and reload**.

The installer creates the lorebook ("MRR: D&D 5e Reference (SRD 5.1)") with 15 entries, the custom GM agent ("MRR: D&D 5e Ruleset Override"), and activates the ruleset. The page reloads.

## Sanity check

In a fresh Game Mode chat:

1. Click the dice widget icon (or **Open dice widget** on the sheet).
2. Set Modifier = 3, Proficiency = 2, DC = 15. Click **Roll d20**.
3. You should see something like `[dice: 1d20+3+2 vs DC15 = 19 success (face 14)]`.
4. Click **Send to chat** to drop the tag into the input.
5. The GM agent picks it up next turn and narrates the d20 result accordingly.

## Updating

Bundle update flow is the same as install — Choose file again, fetch the URL again, or paste the new `bundle.json`. The installer detects the existing managed agent/lorebook by tag/setting and PATCHes rather than duplicating.

## Removing

Open the Ruleset dialog and click **Uninstall server data** to remove the lorebook and GM agent created by this install. Click **Clear** to wipe the local ruleset cache (returns Marinara's UI to default).

## Manual install (legacy / source-of-truth path)

If you'd rather install from source files (e.g., to author your own ruleset against this scaffold), the four-file flow still works:

1. **Settings → Extensions** — import `extension/ruleset-loader.js` (CSS embedded; no separate stylesheet upload).
2. **Ruleset button** — Choose file / fetch URL / paste `rulesets/dnd5e/ruleset.json`.
3. **Settings → Agents → Create Custom Agent** — copy the prompt block from `rulesets/dnd5e/gm-agent.md` (Phase: pre_generation, Result type: context_injection).
4. **Lorebooks → Import** — import `rulesets/dnd5e/lorebook.json`.

The bundle path automates all four steps from one file import.
