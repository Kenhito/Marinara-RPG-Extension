# Install — Lasers & Feelings ruleset

One-page space-adventure RPG written by John Harper as a tribute to the Doubleclicks song *Lasers and Feelings*. Each character has a single stat — **Number** (2–5) — and rolls a small d6 pool against it.

## Quick install (recommended)

**One extension import + one bundle install.** Requires **Marinara Engine 2.4.3+**. Skip step 1 if the framework extension is already installed.

### 1. Install the framework extension (once per Marinara install)

MRR loads through Marinara's **External Extensions** import lane. Two gates must be on first:

- `ENABLE_EXTERNAL_EXTENSIONS=true` in the engine host's `.env` (restart the engine after).
- **Settings → Advanced → Danger Zone → Allow third-party extension imports** — toggle on.

Then go to **Settings → Addons → External Extensions → Import** and import `Marinara-RPG-Extension.extension.zip` from `releases/<version>/`. **Never import the loose `.js` file by itself** — on 2.4.3+ it silently installs as a sandboxed Worker extension and does nothing. The import arrives disabled and unapproved: open it and click **Review and Run** to approve and enable it.

A **Ruleset** button appears in the chat header.

> **Old installs:** anything pre-2.4.3 (pasted JS, v0.5.0 and earlier) can't be upgraded — remove the leftovers and install fresh.

### 2. Install the Lasers & Feelings bundle

Click the **Ruleset** button. The dialog has two ways to load a bundle:

- **Option A — Choose file:** click **Choose file…** and pick `rulesets/lasers-and-feelings/bundle.json` from disk. Click **Save and reload**.
- **Option B — Fetch URL:** point at this repo's raw `rulesets/lasers-and-feelings/bundle.json` on GitHub.

This one import installs the ruleset, the lorebook (11 entries — mechanics, Consortium, Raptor, Something, helping/prepared/expert), the main GM agent, and the sub-agents. Bundles are data — no extension re-approval is triggered. The page reloads with the ruleset active.

### 3. Attach the lorebook and enable the agents (per game)

Installing is not activating. After you create/launch your game:

1. **Attach the L&F lorebook to the game** (at setup or after launch). Required — without it the agents have no rules context and will not work correctly.
2. **Enable the MRR agents for the game** — after it launches, not mid-generation: **Settings → Agents** → find the agents named like `MRR: Lasers & Feelings — <Role>` → enable the ones your table wants. A good minimal set: **Ruleset Helper + State Mutator**. Each enabled agent costs one model call per turn — on a provider that allows only one call at a time they run one after another.

## How it plays at the table — `stance-modal-pool`

L&F uses the `stance-modal-pool` resolution mode. Each roll the player picks **one of two stances**:

- **LASERS** (`under`) — science, technology, cold rationality, calm precise action. Each die counts as a success when `face < Number`.
- **FEELINGS** (`over`) — diplomacy, intuition, seduction, wild passionate action. Each die counts as a success when `face > Number`.

Exactly one stance is `under` and exactly one is `over` — this is now schema-enforced. Equality is handled by the special LASER FEELINGS rule below.

### LASER FEELINGS (exact match)

When any die rolls **exactly Number**, it triggers **LASER FEELINGS**:

- The die **counts as a success** toward the outcome tier (same as a regular hit).
- The player gets to **ask the GM one question and the GM must answer honestly**, in-character or out — pick the one that fits the moment.

A pool that hits two or three LASER FEELINGS is rare, glorious, and answers two or three questions; the agent should treat each as a separate beat.

### Outcome tiers

| Successes | Tier | What it means |
|---|---|---|
| 0 | **miss** | It goes wrong. GM says how things get worse. |
| 1 | **barely** | You barely manage it. GM inflicts a complication, harm, or cost. |
| 2 | **good** | You do it well. |
| 3+ | **critical** | Critical success. GM tells you an extra effect you get. |

The dice widget walks tiers worst→best and picks the LAST one whose `minSuccesses` ≤ total successes, so a 3-success pool is `critical`, a 4-success pool is also `critical`, etc.

## Sample characters

`characters/sample-pilot.json` (Sparks McGee, Number 4) and `characters/sample-doctor.json` (Doc Counterpart, Number 3) are smoke-test rigs that demonstrate the sheet shape — Style, Role, Number, Goal — for someone hand-importing into Marinara's character library or filling the sheet manually. They are **not** bundle-imported; they are hand-fill references.

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
   roleplay chats hand placement to the preset. The State Mutator deliberately has **no** section: its
   output is `[mrr-state: ...]` tags meant for the extension, which reads them
   directly from the agent-run history, and feeding raw tag syntax to the narrator
   invites it to echo tags. If your chat has **no preset selected at all**, Marinara
   uses no preset sections whatsoever — pick one first, or the one-click assist will
   offer to attach your default.

4. **A note on the connection warning.** If Marinara warns that an MRR agent has
   no connection configured, that is a **billing/attribution notice, not an error**.
   Agents without an explicit connection resolve one at generation time and work
   normally. It is not the cause of missing agent output — that is the preset
   section step above.

## Sanity check

In a fresh Game Mode chat:

1. Click the dice widget icon. The widget renders the L&F form: Stance toggle (LASERS / FEELINGS) and Pool input.
2. Set Number = 4, Stance = LASERS, Pool = 2. Click **Roll**.
3. You should see a chat tag of the form `[mrr-roll: ruleset=lasers-and-feelings, stance=lasers, stat=Number, statValue=4, pool=2, dice=[2,5], successes=1, exactMatches=0, tier=barely]` (your dice will vary).
4. Send to chat. The agent reads the `tier` and narrates a barely-managed outcome with a complication.

## Updating / removing

Bundle update flow is the same as install — Choose file again or fetch the URL again with the new `bundle.json`. The installer detects the existing managed agents/lorebook by tag/setting and PATCHes rather than duplicating. The extension itself updates by re-importing the `.extension.zip` and re-approving via **Review and Run**. **Uninstall server data** in the Ruleset dialog removes the lorebook and agents created here.
