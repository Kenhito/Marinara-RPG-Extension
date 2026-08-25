# Install — Exalted 3rd Edition ruleset

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

### 2. Install the Exalted 3e bundle

Click the **Ruleset** button. The dialog has two ways to load a bundle:

- **Option A — Choose file:** click **Choose file…** and pick
  `rulesets/exalted3e/bundle.json` from disk. Click **Save and reload**.
- **Option B — Fetch URL:**
  `https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/exalted3e/bundle.json`

This one import installs the ruleset (sheet + dice widget), the lorebook ("MRR: Exalted 3e Charms & Conditions") with 19 entries, the main GM agent, and the sub-agents. Bundles are data — no extension re-approval is triggered. The page reloads with the ruleset active.

### 3. Attach the lorebook and enable the agents (per game)

Installing is not activating. After you create/launch your game:

1. **Attach the ruleset's lorebook to the game** (at setup or after launch).
   This is required — without it the agents have no rules context and will not
   work correctly.
2. **Enable the MRR agents for the game** — after it launches, not
   mid-generation: **Settings → Agents** → find the agents named like
   `MRR: Exalted 3e — <Role>` → enable the ones your table wants. A good
   minimal set: **Ruleset Helper + State Mutator** (the State Mutator is the
   one agent that writes to the sheet). Exalted also ships two parallel
   trackers — the **anima-banner monitor** and the **charm-cooldown
   tracker** — worth enabling for Essence-heavy games. Each enabled agent
   costs one model call per turn — on a provider that allows only one call at
   a time they run one after another.

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
   separate grant to make. Without it the narrating model *invents* every opposed
   pool, NPC attack, and success count by picking a plausible number; with it, the
   GM agent's dice doctrine routes those outcomes through the tool and the
   narration reports what was actually rolled.

   **You do not need to grant `roll_dice` to the MRR agents themselves.**
   Agent-attached tools need the same chat toggle *plus* a per-agent grant in the
   Agents UI, and the bundle cannot ship that grant (the agent-import route strips
   `settings.enabledTools`). It is also unnecessary: **the State Mutator needs no
   dice.** It reads motes, Willpower, Initiative shifts, and health levels out of
   the GM's finished narration and copies them verbatim — it never rolls, by
   design. Same toggle gates this ruleset's custom tools, if it ships any.

## Sanity check

In a fresh Game Mode chat:

1. Click the dice widget icon. The widget renders the dice-pool form: Pool size, Difficulty, optional Stunt and Excellency boosters.
2. Set Pool = 8, Difficulty = 3. Click **Roll d10s**.
3. You should see `[dice: 8d10 vs 3 → N successes (faces ...)]` — count successes from rolls of 7+, with 10s counting as two.
4. Send to chat. The GM agent picks up the result.

## Updating

Bundle update flow is the same as install — Choose file again or fetch the URL again with the new `bundle.json`. The installer detects the existing managed agents/lorebook by tag/setting and PATCHes rather than duplicating. The extension itself updates by re-importing the `.extension.zip` and re-approving via **Review and Run**.

**Your preset's agent sections repair themselves.** Marinara can never change an existing agent's `type`, so a re-import recreates the MRR agents under *new* types — which would leave the **Agent Data** marker sections you added pointing at agents that no longer exist (the agents run, the output is discarded, no warning). Since round 28 the extension repoints them for you after every bundle import and whenever a chat's ruleset is confirmed, logging one line per section it fixed (`reconciled N orphaned agent marker(s)` in the browser console). It also re-derives a chat's ruleset stamp from the chat's own enabled MRR agents if applying a chat-preset wiped it. Sections you added for non-MRR agents are never touched. **First-time setup still uses the "Add agent sections to active preset" button** — only the re-run after a reinstall is automatic. The one case it cannot repair is the stock read-only **"Marinara Universal"** preset, which refuses every edit: save a copy, select the copy for the chat, and re-run the one-click assist.

**Re-paste any hand-pasted GM prompt after upgrading.** The re-import updates the *managed* agents the bundle installed — it does **not** touch a copy of the GM prompt you pasted into a character card or a hand-made agent by hand. Those copies go stale silently and keep running the old instructions (a stale card still emits the old inline tags and lacks everything added since, including the reroll-on-regenerate dice doctrine). Re-paste from this folder's `gm-agent.md` — the block between the triple backticks — every time you update the bundle.

## Equipment & bonuses (v1.1.0+)

The character sheet now includes an Inventory section. Click **+ Add item**, give the item a name, slot (e.g. `weapon`, `armor` — anything you want), and one or more bonuses such as `Melee +2 dice (accuracy)` or `Defense (Parry) +1`. Click **Equip** on a row to apply that item's bonuses to the slot.

When equipped:
- Derived stats whose name matches a bonus target show `base + N` with a hover tooltip listing the contributing items.
- Clicking **roll** on a skill row pre-fills the dice widget's new **Equipment** field with the equipped dice contribution; the rolled `[dice: ...]` tag includes that bonus so the GM sees the actual pool.

The exalted3e ruleset does not pre-declare `equipmentSlots` — pick whatever slot vocabulary fits your character (single-handed dual-wield, off-hand, two-handed, etc.). An attunement layer for Essence-mote commitment is planned in a later release; until then, equipped bonuses apply unconditionally.

## Removing

Open the Ruleset dialog and click **Uninstall server data** to remove the lorebook and agents created by this install. Click **Clear** to wipe the local ruleset cache. Optionally remove the extension from **Settings → Addons → External Extensions**.
