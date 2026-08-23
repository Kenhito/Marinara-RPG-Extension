# Install — Fate Core ruleset

## Quick install (recommended)

**One extension import + one bundle install.** Requires **Marinara Engine 2.4.3+**. Skip step 1 if the framework extension is already installed.

### 1. Install the framework extension (once per Marinara install)

MRR loads through Marinara's **External Extensions** import lane. Two gates must be on first:

- `ENABLE_EXTERNAL_EXTENSIONS=true` in the engine host's `.env` (restart the engine after).
- **Settings → Advanced → Danger Zone → Allow third-party extension imports** — toggle on.

Then go to **Settings → Addons → External Extensions → Import** and import
`Marinara-RPG-Extension.extension.zip` from `releases/<version>/`.

- **Never import the loose `RPG-Extension-GM-Mode.js` by itself** — on 2.4.3+ a
  loose-`.js` import silently installs as a sandboxed Worker extension with no
  page access; it "succeeds" and then does nothing. Always use the zip.
- The import arrives **disabled and unapproved**. Open it and click
  **Review and Run** to approve its code hash and enable it.

A **Ruleset** button appears in the chat header.

> **Old installs:** anything pre-2.4.3 (pasted JS, v0.5.0 and earlier) can't be
> upgraded — remove the leftovers and install fresh.

### 2. Install the Fate Core bundle

Click the **Ruleset** button. The dialog has two ways to load a bundle:

- **Option A — Choose file:** click **Choose file…** and pick
  `rulesets/fate-core/bundle.json` from disk. Click **Save and reload**.
- **Option B — Fetch URL:**
  `https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/fate-core/bundle.json`

This one import installs the ruleset (sheet + dice widget), the lorebook ("MRR: Fate Core Rules Reference") with 14 entries, the main GM agent, and the sub-agents. Bundles are data — no extension re-approval is triggered. The page reloads with the ruleset active.

### 3. Attach the lorebook and enable the agents (per game)

Installing is not activating. After you create/launch your game:

1. **Attach the ruleset's lorebook to the game** (at setup or after launch).
   This is required — without it the agents have no rules context and will not
   work correctly.
2. **Enable the MRR agents for the game** — after it launches, not
   mid-generation: **Settings → Agents** → find the agents named like
   `MRR: Fate Core — <Role>` → enable the ones your table wants. A good minimal
   set: **Ruleset Helper + State Mutator** (the State Mutator is the one agent
   that writes to the sheet). Each enabled agent costs one model call per
   turn — on a provider that allows only one call at a time they run one after
   another.

## Sanity check

In a fresh Game Mode chat:

1. Click the dice widget icon. The widget renders the Fate form: Skill rating, Target on the ladder.
2. Set Skill = +3, Target = 2 (Fair). Click **Roll 4dF**.
3. You should see `[fate: 4dF+3 = 5 (+,0,+,-) vs 2 -> success with style (+3 shifts)]` (your dice will vary).
4. Send to chat. The GM agent picks up the outcome and narrates accordingly.

## Updating

Bundle update flow is the same as install — Choose file again or fetch the URL again with the new `bundle.json`. The installer detects the existing managed agents/lorebook by tag/setting and PATCHes rather than duplicating. The extension itself updates by re-importing the `.extension.zip` and re-approving via **Review and Run**.

## Removing

Open the Ruleset dialog and click **Uninstall server data** to remove the lorebook and agents created by this install. Click **Clear** to wipe the local ruleset cache. Optionally remove the extension from **Settings → Addons → External Extensions**.
