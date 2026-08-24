# Install — D&D 5e ruleset

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

### 2. Install the D&D 5e bundle

Click the **Ruleset** button. The dialog has two ways to load a bundle:

- **Option A — Choose file:** click **Choose file…** and pick
  `rulesets/dnd5e/bundle.json` from disk. Click **Save and reload**.
- **Option B — Fetch URL:**
  `https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/dnd5e/bundle.json`

This one import installs the ruleset (sheet + dice widget), the lorebook ("MRR: D&D 5e Reference (SRD 5.1)") with 15 entries, the main GM agent, and the sub-agents. Bundles are data — no extension re-approval is triggered. The page reloads with the ruleset active.

### 3. Attach the lorebook and enable the agents (per game)

Installing is not activating. After you create/launch your game:

1. **Attach the ruleset's lorebook to the game** (at setup or after launch).
   This is required — without it the agents have no rules context and will not
   work correctly.
2. **Enable the MRR agents for the game** — after it launches, not
   mid-generation: **Settings → Agents** → find the agents named like
   `MRR: D&D 5e — <Role>` → enable the ones your table wants. A good minimal
   set: **Ruleset Helper + State Mutator** (the State Mutator is the one agent
   that writes to the sheet). Each enabled agent costs one model call per
   turn — on a provider that allows only one call at a time they run one after
   another.

3. **Add the MRR agent sections to your roleplay preset (engine 2.4.0+, roleplay mode).**
   **This step is not optional, and skipping it fails silently.** Since Marinara
   2.4.0 a roleplay preset *owns* agent placement: an agent's output is inserted
   only where a matching **Agent Data** marker section sits in the preset. With no
   matching section the engine **discards that agent's output entirely** — no
   warning, no fallback. The agents still run, still cost tokens, and still show
   healthy rows in their run history, while the narrator never sees a word of it.
   Two ways to add the sections:
   - **One click (recommended):** open the extension's **Manage MRR Agents**
     dialog → **Add agent sections to active preset**. It names the preset before
     changing anything, skips agents that already have a section, and never edits
     a preset without your confirmation.
   - **By hand:** **Preset Editor → Add Section → Agent Sections**, then pick each
     MRR agent in the list.

   Notes: this applies to **roleplay mode only**, and Game mode is genuinely fine
   without it — the preset assembler is skipped entirely for game and
   conversation chats, so those modes keep the older depth-0 injection
   fallback and their agent output is delivered as it always was. Only
   roleplay chats hand placement to the preset. The State Mutator deliberately has **no** section,
   and as of round 25 it cannot take one: it is a `post_processing` agent, so it runs
   after the narration and its output can never reach the narrator's prompt. It writes
   the sheet directly — the extension reads its `[mrr-state: ...]` tags out of the
   agent-run history. The one-click assist filters it out automatically. If your chat
   has **no preset selected at all**, Marinara uses no preset sections whatsoever —
   pick one first, or the one-click assist will offer to attach your default.

4. **A note on the connection warning.** If Marinara warns that an MRR agent has
   no connection configured, that is a **billing/attribution notice, not an error**.
   Agents without an explicit connection resolve one at generation time and work
   normally. It is not the cause of missing agent output — that is the preset
   section step above.

5. **Turn on tool use so the GM rolls real dice (recommended).**
   **Chat Settings → Function Calling → "Enable Tool Use"** — on.

   This hands the main GM model Marinara's server-side `roll_dice` tool, a true
   RNG. `roll_dice` is enabled by default once the chat toggle is on; there is no
   separate grant to make. Without it the narrating model *invents* every attack
   roll, damage total, and monster save by picking a plausible number; with it,
   the GM agent's dice doctrine routes those outcomes through the tool and the
   narration reports what was actually rolled.

   **You do not need to grant `roll_dice` to the MRR agents themselves.**
   Agent-attached tools need the same chat toggle *plus* a per-agent grant in the
   Agents UI, and the bundle cannot ship that grant (the agent-import route strips
   `settings.enabledTools`). It is also unnecessary: **the State Mutator needs no
   dice.** It reads the numbers out of the GM's finished narration and copies them
   verbatim — it never rolls, by design. Same toggle gates this ruleset's custom
   tools, if it ships any.

## Sanity check

In a fresh Game Mode chat:

1. Click the dice widget icon (or **Open dice widget** on the sheet).
2. Set Modifier = 3, Proficiency = 2, DC = 15. Click **Roll d20**.
3. You should see something like `[dice: 1d20+3+2 vs DC15 = 19 success (face 14)]`.
4. Click **Send to chat** to drop the tag into the input.
5. The GM agent picks it up next turn and narrates the d20 result accordingly.

## Updating

Bundle update flow is the same as install — Choose file again or fetch the URL again with the new `bundle.json`. The installer detects the existing managed agents/lorebook by tag/setting and PATCHes rather than duplicating. The extension itself updates by re-importing the `.extension.zip` and re-approving via **Review and Run** — every code change re-requires that step.

**Re-paste any hand-pasted GM prompt after upgrading.** The re-import updates the *managed* agents the bundle installed — it does **not** touch a copy of the GM prompt you pasted into a character card or a hand-made agent by hand. Those copies go stale silently and keep running the old instructions (a stale card still emits the old inline tags and lacks everything added since, including the reroll-on-regenerate dice doctrine). Re-paste from this folder's `gm-agent.md` — the block between the triple backticks — every time you update the bundle.

## Removing

Open the Ruleset dialog and click **Uninstall server data** to remove the lorebook and agents created by this install. Click **Clear** to wipe the local ruleset cache (returns Marinara's UI to default). Optionally remove the extension from **Settings → Addons → External Extensions**.
