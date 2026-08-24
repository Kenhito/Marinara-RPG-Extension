# Install — Old School Essentials ruleset

> **Note on this file:** two different install flows appear across this project's own documentation — an older "paste the framework JS into Extensions, then paste bundle.json into the Ruleset dialog, then paste agents.json into an Import Agents dialog" flow (`AUTHORING-PROMPT.md`, `docs-for-ai/01-OVERVIEW.md`, `docs-for-ai/06-BUILD-PIPELINE.md`), and the flow actually used by the shipped `dnd5e` reference bundle's own `INSTALL.md`, which imports a `.extension.zip` through Marinara's External Extensions lane and never mentions `agents.json` at all. This file follows the `dnd5e` reference's flow, since it's the one the "match the reference bundles" instruction points at and it matches what the current `build-bundle.mjs` tool actually produces (agents embedded directly in `bundle.json` via `additionalAgents`, not a separate file). If your Marinara installation behaves differently, fall back to the older flow described in `AUTHORING-PROMPT.md`.

## Prerequisites

- **Marinara Engine 2.4.3+.**
- `ENABLE_EXTERNAL_EXTENSIONS=true` set in the engine host's `.env` (restart the engine after changing it).
- **Settings → Advanced → Danger Zone → Allow third-party extension imports** toggled on.

## 1. Install the framework extension (once per Marinara install)

Skip this step if the Marinara-RPG-Extension framework is already installed for another ruleset.

1. Go to **Settings → Addons → External Extensions → Import**.
2. Import `Marinara-RPG-Extension.extension.zip` from the project's `releases/<version>/` folder.
3. The import arrives **disabled and unapproved**. Open it and click **Review and Run** to approve its code hash and enable it.

Never import the loose `RPG-Extension-GM-Mode.js` file by itself — on 2.4.3+ that silently installs as a sandboxed Worker extension with no page access; it reports success and then does nothing.

A **Ruleset** button appears in the chat header once the extension is enabled.

## 2. Install the Old School Essentials bundle

Click the **Ruleset** button. Load `bundle.json` (built from this folder's `ruleset.json` + `lorebook.json` + `gm-agent.md` via `node tools/build-bundle.mjs rulesets/ose/`) one of three ways:

- **Choose file** — pick `bundle.json` from disk.
- **Fetch URL** — point at a raw URL if you've hosted the file (Gist, Pastebin, etc.).
- **Paste** — paste the JSON directly into the textarea.

Click **Save and reload**. This one import installs the ruleset (sheet + dice widget), the lorebook ("Old School Essentials Reference"), the main GM agent, and the three sub-agents (combat-overseer, context-fuser, state-mutator) — all bundled together as data, no extension re-approval needed.

## 3. Attach the lorebook and enable the agents (per game)

Installing is not activating. After you create or launch your game:

1. **Attach the ruleset's lorebook to the game** (at setup, or after launch). Required — without it the agents have no rules context and will misfire.
2. **Enable the MRR agents for the game**, after it launches (not mid-generation): **Settings → Agents** → find the agents named like `Old School Essentials — <Role>` → enable the ones your table wants. A reasonable minimal set: **Ruleset Helper + State Mutator** (State Mutator is the one agent that writes to the sheet). Each enabled agent costs one model call per turn.

## Add the MRR agent sections to your roleplay preset (engine 2.4.0+)

**This step is not optional, and skipping it fails silently.** Since Marinara
2.4.0 a roleplay preset *owns* agent placement: an agent's output is inserted
only where a matching **Agent Data** marker section sits in the preset. With no
matching section the engine **discards that agent's output entirely** — no
warning, no fallback. The agents still run, still cost tokens, and still show
healthy rows in their run history, while the narrator never sees a word of it.

Two ways to add the sections:

- **One click (recommended):** open the extension's **Manage MRR Agents** dialog
  → **Add agent sections to active preset**. It names the preset before changing
  anything, skips agents that already have a section, and never edits a preset
  without your confirmation.
- **By hand:** **Preset Editor → Add Section → Agent Sections**, then pick each
  MRR agent in the list.

Notes: this applies to **roleplay mode only**, and Game mode is genuinely fine
without it — the preset assembler is skipped entirely for game and conversation
chats, so those modes keep the older depth-0 injection fallback and their agent
output is delivered as it always was. Only roleplay chats hand placement to the
preset. The State Mutator deliberately has **no** section, and as of round 25 it
cannot take one: it is a `post_processing` agent, so it runs after the narration
and its output can never reach the narrator's prompt. It writes the sheet
directly — the extension reads its `[mrr-state: ...]` tags out of the agent-run
history. The one-click assist filters it out automatically. If your chat has **no
preset selected at all**, Marinara uses no preset sections whatsoever — pick one
first, or the one-click assist will offer to attach your default.

**A note on the connection warning.** If Marinara warns that an MRR agent has no
connection configured, that is a **billing/attribution notice, not an error**.
Agents without an explicit connection resolve one at generation time and work
normally. It is not the cause of missing agent output — that is the preset
section step above.

## Turn on tool use so the GM rolls real dice (recommended)

**Chat Settings → Function Calling → "Enable Tool Use"** — on.

This hands the main GM model Marinara's server-side `roll_dice` tool, a true RNG.
`roll_dice` is enabled by default once the chat toggle is on; there is no separate
grant to make. Without it the narrating model *invents* every attack roll, morale
check, reaction roll, and wandering-monster check by picking a plausible number.
In a system whose whole design assumes the dice are indifferent, that quietly
removes the game — with the toggle on, the GM agent's dice doctrine routes those
outcomes through the tool and the narration reports what was actually rolled.

**You do not need to grant `roll_dice` to the MRR agents themselves.**
Agent-attached tools need the same chat toggle *plus* a per-agent grant in the
Agents UI, and the bundle cannot ship that grant (the agent-import route strips
`settings.enabledTools`). It is also unnecessary: **the State Mutator needs no
dice.** It reads the numbers out of the GM's finished narration and copies them
verbatim — it never rolls, by design. Same toggle gates this ruleset's custom
tools, if it ships any.

## Build a character

1. Pick a class (Fighter, Cleric, Magic-User, Thief, or a demi-human race-as-class: Dwarf, Elf, Halfling) from the **Class Features & Restrictions** section — this bundle doesn't hard-code chargen, so record the choice as free text there.
2. Roll or assign the six ability scores (3-18), and look up each modifier on the step table in the "Ability Modifiers" lorebook entry — the sheet does NOT compute this for you. The framework's derived-stat formulas only support arithmetic, not a stepped lookup table, so this one has to be read off the table by hand.
3. Roll starting Hit Points (one Hit Die for the class, plus CON modifier, minimum 1).
4. Set Armor Class (10 + armor bonus + DEX modifier — ascending, see "Ascending AC — a house convention").
5. Fill in the five Saving Throw numbers from your class-and-level table (external reference — not shipped in this bundle).
6. Thieves only: set the six Thief Skill percentages for level 1.
7. **XP table note:** the bundle's XP table (and the sheet's XP bar) shows the **Fighter progression only**. Fighter progression shown; consult your class table for any other class — every class in this system has its own XP-to-level progression, and only Fighter's is embedded here.

## Play

- The dice widget rolls the 1d20 attack/save math only. For Thief Skills and Open Doors/Listen/Surprise, the GM calls for the roll in chat and resolves it by hand — there's no widget for those (see "Off-Widget Subsystems" in the lorebook).
- Watch HP closely at low level. This system does not pull punches.

## Troubleshooting

- **Agents not doing anything:** confirm both that they're enabled for THIS game and that the lorebook is attached to THIS game — both are required, and both are per-game settings that don't carry over from a different chat.
- **Sheet resets between sessions:** Marinara chat IDs rotate per session; sheets are keyed to chat ID in browser localStorage. Use the sheet's save/load buttons to export/import a character as a JSON file between chats or devices.
- **Reputation tag errors:** if `[reputation: npc="..." action="..."]` tags trigger a 400/connection toast, your installation is still enforcing the older 50-character cap on `action` — keep action text short regardless of which framework version note you find elsewhere in this project's docs.

## Updating

Reload the bundle the same way as install (Choose file / Fetch URL / paste with the new `bundle.json`). The installer detects existing managed agents/lorebook by tag and updates in place rather than duplicating.

**Re-paste any hand-pasted GM prompt after upgrading.** The re-import updates the *managed* agents the bundle installed — it does **not** touch a copy of the GM prompt you pasted into a character card or a hand-made agent by hand. Those copies go stale silently and keep running the old instructions (a stale card still emits the old inline tags and lacks everything added since, including the reroll-on-regenerate dice doctrine). Re-paste from this folder's `gm-agent.md` — the block between the triple backticks — every time you update the bundle.

## Removing

Open the Ruleset dialog and click **Uninstall server data** to remove the lorebook and agents this install created. Click **Clear** to wipe the local ruleset cache. Optionally remove the extension itself from **Settings → Addons → External Extensions**.
