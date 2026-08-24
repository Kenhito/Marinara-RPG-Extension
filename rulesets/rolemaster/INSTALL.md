# Install — Rolemaster Fantasy Role Playing ruleset

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

## 2. Install the Rolemaster bundle

Click the **Ruleset** button. Load `bundle.json` (built from this folder's `ruleset.json` + `lorebook.json` + `gm-agent.md` via `node tools/build-bundle.mjs rulesets/rolemaster/`) one of three ways:

- **Choose file** — pick `bundle.json` from disk.
- **Fetch URL** — point at a raw URL if you've hosted the file (Gist, Pastebin, etc.).
- **Paste** — paste the JSON directly into the textarea.

Click **Save and reload**. This one import installs the ruleset (sheet + open-ended-high dice widget), the lorebook ("Rolemaster Fantasy Role Playing Rules Reference"), the main GM agent, and the sub-agents (combat-overseer, context-fuser, state-mutator) — all bundled together as data, no extension re-approval needed.

## 3. Attach the lorebook(s) and enable the agents (per game)

Installing is not activating. After you create or launch your game:

1. **Attach this ruleset's lorebook to the game** (at setup, or after launch). Required — without it the agents have no rules context and will misfire.
2. **Attach your own lorebook, if you have one**, for professions, spell lists, races, and setting content — see `USER-LOREBOOK-GUIDE.md` in this folder for how to build one that interoperates cleanly with this bundle. Optional; the game runs without it, just more generically.
3. **Enable the MRR agents for the game**, after it launches (not mid-generation): **Settings → Agents** → find the agents named like `Rolemaster Fantasy Role Playing — <Role>` → enable the ones your table wants. A reasonable minimal set: **Ruleset Helper + State Mutator** (State Mutator is the one agent that writes to the sheet). Add **Combat Overseer** for tactical, multi-combatant fights where the OB/parry/DB bookkeeping matters. Each enabled agent costs one model call per turn.

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

Notes: this applies to **roleplay mode only** — Game mode and conversation mode
don't use preset sections. The State Mutator deliberately has **no** section: its
output is `[mrr-state: ...]` tags meant for the extension, which reads them
directly from the agent-run history, and feeding raw tag syntax to the narrator
invites it to echo tags. If your chat has **no preset selected at all**, Marinara
uses no preset sections whatsoever — pick one first, or the one-click assist will
offer to attach your default.

**A note on the connection warning.** If Marinara warns that an MRR agent has no
connection configured, that is a **billing/attribution notice, not an error**.
Agents without an explicit connection resolve one at generation time and work
normally. It is not the cause of missing agent output — that is the preset
section step above.

## Build a character

1. Set your ten stats (1-102, temporary value) and, for each, compute and enter its stat bonus by hand from the Basic Stat Bonus Table (T-2.1) — this bundle can't compute that step table automatically. See the "Stats and stat bonuses" lorebook entry.
2. Fill in your 26 skill rows with each skill's TOTAL bonus (ranks + category bonus + stat bonuses + item/special bonuses) — the same single number your printed Character Record Sheet's Skill Bonus column shows. Rename the two `Weapon (...)` rows to your actual weapons, and add one `Spells (by list)` row per spell list you know.
3. Set Hits max from your Body Development skill bonus, Power Points max from your Power Point Development skill bonus, and Exhaustion Points max from 40 + 3x your Constitution bonus — the sheet auto-computes all three once those two skills and that one stat bonus are entered.
4. Enter DB, OB, Armor Type (AT), and the six Resistance Roll bonuses by hand — see the "OB, DB, and the parry split", "Armor Types", and "Resistance rolls" lorebook entries for the formulas.
5. If you're playing a spellcaster or want profession/race color on the sheet, attach your own lorebook now (see `USER-LOREBOOK-GUIDE.md`) — this bundle does not ship that content.

## Play

- The dice widget rolls open-ended d100 + your entered bonus and reports `first=`, any `chain=`, the `total=`, and a `um=` flag on unmodified 66/100. **Whether that flag suppresses modifications is a GM call, not the widget's** — the gm-agent prompt explains exactly when.
- Combat runs entirely through narration (there's no dedicated combat-encounter modal for this ruleset) — the GM agent and, if enabled, Combat Overseer carry the OB/DB/AT math.
- Attack, critical, and fumble table *contents* are not shipped in this bundle — the GM narrates from the procedure and estimates honestly when it doesn't have your book's exact numbers in front of it. Keep your own copy of the RMFRP core book handy for exact lookups.

## Troubleshooting

- **Agents not doing anything:** confirm both that they're enabled for THIS game and that this ruleset's lorebook is attached to THIS game — both are required, and both are per-game settings that don't carry over from a different chat.
- **Sheet resets between sessions:** Marinara chat IDs rotate per session; sheets are keyed to chat ID in browser localStorage. Use the sheet's save/load buttons to export/import a character as a JSON file between chats or devices.
- **A UM 66/100 didn't suppress the cascade:** that's expected widget behavior, not a bug — the widget always rolls the general open-ended rule (§ "Open-ended d100" lorebook entry) and flags `um=`; the GM (or the main agent, per its prompt) decides whether to discard the extra dice.

## Updating

Reload the bundle the same way as install (Choose file / Fetch URL / paste with the new `bundle.json`). The installer detects existing managed agents/lorebook by tag and updates in place rather than duplicating.

## Removing

Open the Ruleset dialog and click **Uninstall server data** to remove the lorebook and agents this install created. Click **Clear** to wipe the local ruleset cache. Optionally remove the extension itself from **Settings → Addons → External Extensions**.
