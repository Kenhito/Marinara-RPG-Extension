# Install — Pathfinder 2nd Edition ruleset

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

### 2. Install the Pathfinder 2e bundle

Click the **Ruleset** button. The dialog has two ways to load a bundle:

- **Option A — Choose file:** click **Choose file…** and pick
  `rulesets/pathfinder2e/bundle.json` from disk. Click **Save and reload**.
- **Option B — Fetch URL:**
  `https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/pathfinder2e/bundle.json`

This one import installs the ruleset (sheet + dice widget), the lorebook
("Pathfinder 2e Rules Reference", 51 entries), the main GM agent, four
sub-agents, and the `pathfinder2e_reference` custom tool. Bundles are data — no
extension re-approval is triggered. The page reloads with the ruleset active.

This bundle also ships a **scenario default**, so the install offers to write a
ready-made "this chat uses the Pathfinder 2nd Edition ruleset overlay" blurb into
the current chat's scenario text. Click **Cancel** at that prompt to leave your
scenario alone — nothing else in the install depends on it.

### 3. Attach the lorebook and enable the agents (per game)

Installing is not activating. After you create/launch your game:

1. **Attach the ruleset's lorebook to the game** (at setup or after launch).
   This is required — without it the agents have no rules context and will not
   work correctly.
2. **Enable the MRR agents for the game** — after it launches, not
   mid-generation: **Settings → Agents** → find the agents named
   `MRR: Pathfinder 2nd Edition Ruleset Helper` and
   `MRR: Pathfinder 2nd Edition — <Role>` (Combat Overseer, Context Fuser,
   Ruleset State Mutator, Pre-Input Transformer) → enable the ones your table
   wants. A good minimal set: **Ruleset Helper + Ruleset State Mutator** (the
   State Mutator is the one agent that writes to the sheet). Each enabled agent
   costs one model call per turn — on a provider that allows only one call at a
   time they run one after another.

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
   conversation chats, so those modes keep the older depth-0 injection fallback
   and their agent output is delivered as it always was. Only roleplay chats hand
   placement to the preset. The State Mutator deliberately has **no** section: it
   is a `post_processing` agent, so it runs after the narration and its output
   could never reach the narrator's prompt anyway — it writes the sheet directly,
   and the extension reads its `[mrr-state: ...]` tags out of the agent-run
   history. The one-click assist filters it out automatically. If your chat has
   **no preset selected at all**, Marinara uses no preset sections whatsoever —
   pick one first, or the one-click assist will offer to attach your default.

4. **A note on the connection warning.** If Marinara warns that an MRR agent has
   no connection configured, that is a **billing/attribution notice, not an error**.
   Agents without an explicit connection resolve one at generation time and work
   normally. It is not the cause of missing agent output — that is the preset
   section step above.

## Turn on tool use so the GM rolls real dice (recommended)

**Chat Settings → Function Calling → "Enable Tool Use"** — on.

This hands the main GM model Marinara's server-side `roll_dice` tool, a true RNG.
`roll_dice` is enabled by default once the chat toggle is on; there is no separate
grant to make. Without it the narrating model *invents* every strike, save, and
recall-knowledge check by picking a plausible number — and in a system this
tightly tuned around the DC-by-level table, invented numbers erase the math the
whole edition is built on. The same toggle gates this bundle's
`pathfinder2e_reference` custom tool.

**You do not need to grant `roll_dice` to the MRR agents themselves.**
Agent-attached tools need the same chat toggle *plus* a per-agent grant in the
Agents UI, and the bundle cannot ship that grant (the agent-import route strips
`settings.enabledTools`). It is also unnecessary: the State Mutator reads the
numbers out of the GM's finished narration and copies them verbatim — it never
rolls, by design.

## What the dice widget does (and doesn't do)

The widget is the single-roll d20 form: **Modifier**, **Proficiency**,
**Equipment**, **DC**, a **Normal / Adv / Dis** roll-mode row, and a
**Roll d20** button. The roll mode is sticky for the session, so a run of rolls
at advantage doesn't need re-toggling.

- **The widget reports success or failure, not the degree.** Pathfinder's four
  degrees — critical success at 10 or more over the DC, critical failure at 10 or
  more under, and the natural-20/natural-1 shift — are the GM's call from the
  numbers in the tag. The lorebook carries the rule; the widget does not apply it.
- **Proficiency is not derived.** Enter your trained/expert/master/legendary bonus
  (level + 2/4/6/8) in the Proficiency field yourself.
- **Three actions per turn, MAP, and the multiple-attack penalty** are narrative
  bookkeeping — put the penalty into the Modifier field for the second and third
  strike.
- **Hero Points, Focus Points, and spell slots (1st-3rd)** live on the sheet as
  tracked resources; the widget does not spend or restore them. The State Mutator
  does that from the narration.

## Sanity check

In a fresh Game Mode chat:

1. Click the dice widget icon. The widget renders the d20 form: Modifier,
   Proficiency, Equipment, DC, roll mode, **Roll d20**.
2. Set Modifier = 4, Proficiency = 5, Equipment = 0, DC = 20. Click **Roll d20**.
3. You should see a tag like `[dice: 1d20+4+5 vs DC20 = 24 success (face 15)]`
   (your dice will vary).
4. Send to chat. The GM agent picks up the outcome, applies the degree of success,
   and narrates accordingly.

## Updating

Bundle update flow is the same as install — Choose file again or fetch the URL again with the new `bundle.json`. The installer detects the existing managed agents/lorebook by tag/setting and PATCHes rather than duplicating. The extension itself updates by re-importing the `.extension.zip` and re-approving via **Review and Run**.

## Removing

Open the Ruleset dialog and click **Uninstall server data** to remove the lorebook and agents created by this install. Click **Clear** to wipe the local ruleset cache. Optionally remove the extension from **Settings → Addons → External Extensions**.
