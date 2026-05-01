# Install — Fate Core ruleset

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

### 2. Install the Fate Core bundle

Click the **Ruleset** button. The dialog has three ways to load a bundle:

- **Option A — Choose file:** click **Choose file…** and pick
  `rulesets/fate-core/bundle.json` from disk. Click **Save and reload**.
- **Option B — Fetch URL:**
  `https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/fate-core/bundle.json`
- **Option C — Paste:** copy the contents of `bundle.json` into the
  textarea, click **Save and reload**.

The installer creates the lorebook ("MRR: Fate Core Rules Reference") with 14 entries, the custom GM agent ("MRR: Fate Core Ruleset Override"), and activates the ruleset. The page reloads.

## Sanity check

In a fresh Game Mode chat:

1. Click the dice widget icon. The widget renders the Fate form: Skill rating, Target on the ladder.
2. Set Skill = +3, Target = 2 (Fair). Click **Roll 4dF**.
3. You should see `[fate: 4dF+3 = 5 (+,0,+,-) vs 2 -> success with style (+3 shifts)]` (your dice will vary).
4. Send to chat. The GM agent picks up the outcome and narrates accordingly.

## Updating

Bundle update flow is the same as install — Choose file again, fetch the URL again, or paste the new `bundle.json`. The installer detects the existing managed agent/lorebook by tag/setting and PATCHes rather than duplicating.

## Removing

Open the Ruleset dialog and click **Uninstall server data** to remove the lorebook and GM agent created by this install. Click **Clear** to wipe the local ruleset cache.

## Manual install (legacy / source-of-truth path)

The four-file flow still works:

1. **Settings → Extensions** — import `extension/ruleset-loader.js` (CSS embedded).
2. **Ruleset button** — Choose file / fetch URL / paste `rulesets/fate-core/ruleset.json`.
3. **Settings → Agents → Create Custom Agent** — copy the prompt prose from `rulesets/fate-core/gm-agent.md` (everything after the `---` separator). Phase: pre_generation, Result type: context_injection.
4. **Lorebooks → Import** — import `rulesets/fate-core/lorebook.json`.

The bundle path automates all four steps from one file import.
