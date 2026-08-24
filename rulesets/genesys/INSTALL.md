# Install — Genesys ruleset

Genesys is Fantasy Flight Games' generic narrative-dice system. This bundle ships the character-sheet schema, lorebook reference, and GM agent prompt for the core ruleset. Setting choice (sci-fi, fantasy, modern occult, etc.) is up to the GM — the bundle is setting-agnostic.

## Quick install (recommended)

**One extension import + one bundle install.** Requires **Marinara Engine 2.4.3+**. Skip step 1 if the framework extension is already installed.

### 1. Install the framework extension (once per Marinara install)

MRR loads through Marinara's **External Extensions** import lane. Two gates must be on first:

- `ENABLE_EXTERNAL_EXTENSIONS=true` in the engine host's `.env` (restart the engine after).
- **Settings → Advanced → Danger Zone → Allow third-party extension imports** — toggle on.

Then go to **Settings → Addons → External Extensions → Import** and import `Marinara-RPG-Extension.extension.zip` from `releases/<version>/`. **Never import the loose `.js` file by itself** — on 2.4.3+ it silently installs as a sandboxed Worker extension and does nothing. The import arrives disabled and unapproved: open it and click **Review and Run** to approve and enable it.

A **Ruleset** button appears in the chat header.

> **Old installs:** anything pre-2.4.3 (pasted JS, v0.5.0 and earlier) can't be upgraded — remove the leftovers and install fresh.

### 2. Install the Genesys bundle

Click the **Ruleset** button → **Choose file…** and pick `rulesets/genesys/bundle.json` (or **Fetch URL** with its raw GitHub link) → click **Save and reload**.

The bundle auto-installs:
- The Genesys ruleset (six characteristics, ~31 skills, narrative-dice resolution).
- The Genesys lorebook (~15 entries covering symbols, pool assembly, Story Points, Wounds vs Strain, initiative, maneuvers, range bands, critical injuries, talents, etc.).
- A custom tool that returns the canonical Genesys reference on demand.
- The main GM agent and the sub-agents, including a pre-input transformer that re-frames common verbs in Genesys terms.

### 3. Attach the lorebook and enable the agents (per game)

Installing is not activating. After you create/launch your game:

1. **Attach the Genesys lorebook to the game** (at setup or after launch). Required — without it the agents have no rules context and will not work correctly.
2. **Enable the MRR agents for the game** — after it launches, not mid-generation: **Settings → Agents** → find the agents named like `MRR: Genesys — <Role>` → enable the ones your table wants. A good minimal set: **Ruleset Helper + State Mutator**. Each enabled agent costs one model call per turn — on a provider that allows only one call at a time they run one after another.

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
preset. The State Mutator deliberately has **no** section: its
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

## Turn on tool use so the GM rolls real dice (recommended)

**Chat Settings → Function Calling → "Enable Tool Use"** — on.

This hands the main GM model Marinara's server-side `roll_dice` tool, a true RNG.
`roll_dice` is enabled by default once the chat toggle is on; there is no separate
grant to make. Genesys' six symbol dice are not something `roll_dice` can model —
that is exactly why the bundle runs `narrative-handled` and you report symbols
yourself — but every *numeric* roll the GM makes behind the screen still needs a
real one: the d100 Critical Injury result, initiative order, a random-table pick.
Without the toggle the narrating model picks a plausible-looking number for each of
those instead of rolling. The same toggle gates this bundle's `genesys_reference`
custom tool.

**You do not need to grant `roll_dice` to the MRR agents themselves.**
Agent-attached tools need the same chat toggle *plus* a per-agent grant in the
Agents UI, and the bundle cannot ship that grant (the agent-import route strips
`settings.enabledTools`). It is also unnecessary: the State Mutator reads the
numbers out of the GM's finished narration and copies them verbatim — it never
rolls, by design.

## What the dice widget does (and doesn't do)

Genesys uses **six custom symbol dice** that no native dice widget faithfully models. The bundle uses Marinara's `narrative-handled` resolution mode — the dice widget runs in **manual NdX mode** where you can roll any dice you like and report results to the AI.

**Recommended workflow:** roll Genesys dice physically OR via a dedicated Genesys roller (the FFG Star Wars Roleplay app, an online roller, or a Discord bot). Report results to the AI by symbol type: "2 Successes, 1 Threat, 1 Triumph." The GM agent is taught (in `gm-agent.md`) how to interpret the result.

The bundle's character sheet still tracks Wounds, Strain, Story Points, and the Wound/Strain Thresholds — those numbers ARE on the sheet, just not the dice resolution itself.

## Setting choice

Genesys is system-agnostic. The first session, the GM agent will ask you what setting you're playing in. Examples:
- Sci-fi (Android: Shadow of the Beanstalk, Star Wars Edge of the Empire flavor)
- Fantasy (Realms of Terrinoth, generic D&D-style fantasy)
- Modern occult (Conspiracy / Delta Green / Esoterrorists flavor)
- Pulp adventure (Indiana Jones / Hollow Earth Expedition flavor)
- Urban noir / crime

Magic systems, careers/specializations, talent trees, and equipment depend on the setting. The bundle ships the COMMON ruleset; setting-specific content is left to the GM + player to flesh out via play.

## Uninstall

In the **Ruleset** dialog, click **Uninstall current ruleset**. The bundle's lorebook, agents, regex scripts, and custom tools are removed. Your character sheet data is preserved in localStorage.

## What's NOT in the bundle

- Specific careers (Bounty Hunter, Smuggler, etc.) — those are setting-specific and added by the GM via prompt/hand-authored lorebook entries.
- A pre-baked setting. Choose one at session 1.
- Talent trees. Genesys talent trees are dense; this v0.1 bundle leaves them as GM-authored prose.
- Genesys-specific dice rolling. Use a dedicated tool; report results to the AI.

## Cross-references

- [`docs/BUILDING.md`](../../docs/BUILDING.md) — generator pipeline contract.
- [`docs/AUTHORING.md`](../../docs/AUTHORING.md) — step-by-step new-ruleset walkthrough (this bundle followed that recipe).
- [`docs/ENGINE-CONSTRAINTS.md`](../../docs/ENGINE-CONSTRAINTS.md) — what overlay can vs cannot do.
