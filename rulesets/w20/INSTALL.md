# Install — Werewolf: The Apocalypse 20th Anniversary ruleset

W20 is the canonical Storyteller-System d10 dice-pool game of wolf-and-human
shapeshifters fighting Wyrm corruption. This bundle is built on the same
chassis as `vtmv20` (V20 dice pool + Talents/Skills/Knowledges trinity +
7-level health track) and adds the W20-specific machinery: Rage, Gnosis,
Renown (Glory/Honour/Wisdom), Rank, the five forms (Homid/Glabro/Crinos/
Hispo/Lupus), Frenzy/Thrall/Harano/Delirium, the Litany, the Umbra and
the Gauntlet, Gifts, and Rites.

> Unofficial, non-commercial fan material. No verbatim W20 corebook text is
> reproduced — mechanics references only. Tribe/Auspice/Gift/Rite/totem
> names belong to Paradox Interactive AB. Distributed under the Dark Pack
> Agreement (worldofdarkness.com/dark-pack). This is NOT official World
> of Darkness material.

## Quick install (recommended)

Requires **Marinara Engine 2.4.3+**.

### 1. Install the framework extension (once per Marinara install)

MRR loads through Marinara's **External Extensions** import lane. Two
gates must be on first:

- `ENABLE_EXTERNAL_EXTENSIONS=true` in the engine host's `.env`
  (restart the engine after).
- **Settings → Advanced → Danger Zone → Allow third-party extension
  imports** — toggle on.

Then go to **Settings → Addons → External Extensions → Import** and
import `Marinara-RPG-Extension.extension.zip` from `releases/<version>/`.
**Never import the loose `.js` file by itself** — on 2.4.3+ it silently
installs as a sandboxed Worker extension and does nothing. The import
arrives disabled and unapproved: open it and click **Review and Run** to
approve and enable it. A **Ruleset** button appears in the chat header.

> **Old installs:** anything pre-2.4.3 (pasted JS, v0.5.0 and earlier)
> can't be upgraded — remove the leftovers and install fresh.

### 2. Install the W20 bundle

Click the **Ruleset** button. Load the bundle one of two ways:

- **Choose file:** pick `rulesets/w20/bundle.json` from disk → **Save and reload**.
- **Fetch URL:** the raw GitHub URL of `rulesets/w20/bundle.json`.

This one import installs the ruleset, the lorebook ("Werewolf 20
Reference"), the main **Werewolf 20 Ruleset Helper** agent, and the
sub-agents, then reloads with the ruleset active.

### 3. Attach the lorebook and enable the agents (per game)

Installing is not activating. After you create/launch your game:

1. **Attach the W20 lorebook to the game** (at setup or after launch).
   Required — without it the agents have no rules context and will not
   work correctly.
2. **Enable the MRR agents for this ruleset** — after the game launches,
   not mid-generation: **Settings → Agents** → find the agents named
   like `MRR: Werewolf 20 — <Role>` → enable the ones your table wants.
   A good minimal set: the **Ruleset Helper** plus the **State Mutator**
   (the agent that keeps the floating sheet in sync). Each enabled agent
   costs one extra model call per turn — on a provider that allows only
   one call at a time they run one after another.

## Add the MRR agent sections to your roleplay preset (engine 2.4.0+)

**This step is not optional, and skipping it fails silently.** Since
Marinara 2.4.0 a roleplay preset *owns* agent placement: an agent's
output is inserted only where a matching **Agent Data** marker section
sits in the preset. With no matching section the engine **discards that
agent's output entirely** — no warning, no fallback. The agents still
run, still cost tokens, and still show healthy rows in their run
history, while the narrator never sees a word of it. If your agents seem
to "do nothing", this is almost always why.

Two ways to add the sections:

- **One click (recommended):** open the extension's **Manage MRR
  Agents** dialog → **Add agent sections to active preset**. It names
  the preset before changing anything, skips agents that already have a
  section, and never edits a preset without your confirmation.
- **By hand:** **Preset Editor → Add Section → Agent Sections**, then
  pick each MRR agent in the list.

**You only do this once — reinstalls repair themselves.** Marinara can
never change an existing agent's `type`, so re-importing a bundle
recreates the agents under *new* types, which would leave the sections
you added pointing at agents that no longer exist. Since round 28 the
extension repoints them automatically after every bundle import and
whenever a chat's ruleset is confirmed, logging one line per section it
fixed (`reconciled N orphaned agent marker(s)` in the browser console),
and re-derives a chat's ruleset stamp if applying a chat-preset wiped
it. Sections you added for non-MRR agents are never touched. First-time
setup still uses the button above; only the re-run is automatic. The one
preset it cannot repair is the stock read-only **"Marinara Universal"**,
which refuses every edit: save a copy, select the copy for the chat, and
re-run the one-click assist.

Notes: this applies to **roleplay mode only**, and Game mode is
genuinely fine without it — the preset assembler is skipped entirely for
game and conversation chats, so those modes keep the older depth-0
injection fallback and their agent output is delivered as it always was.
Only roleplay chats hand placement to the preset. The State Mutator
deliberately has **no** section: its output is `[mrr-state: ...]` tags
meant for the extension, which reads them directly from the agent-run
history, and feeding raw tag syntax to the narrator invites it to echo
tags. The one-click assist filters it out automatically. If your chat
has **no preset selected at all**, Marinara uses no preset sections
whatsoever — pick one first, or the one-click assist will offer to
attach your default.

**A note on the connection warning.** If Marinara warns that an MRR
agent has no connection configured, that is a **billing/attribution
notice, not an error**. Agents without an explicit connection resolve
one at generation time and work normally. It is not the cause of missing
agent output — that is the preset section step above.

## Turn on tool use so the GM rolls real dice (recommended)

**Chat Settings → Function Calling → "Enable Tool Use"** — on.

This hands the main GM model Marinara's server-side `roll_dice`
tool, a true RNG. `roll_dice` is enabled by default once the chat
toggle is on; there is no separate grant to make. Without it the
narrating model *invents* every pool it rolls — soak, Rage and
Willpower checks, a frenzy roll, an antagonist's attack — by
picking a plausible number of successes. W20 is a d10 pool game
where one stray 1 turns a good roll into a botch, and a model
choosing the result quietly deletes that risk. The same toggle
gates this bundle's `w20_reference` custom tool.

**You do not need to grant `roll_dice` to the MRR agents
themselves.** Agent-attached tools need the same chat toggle *plus*
a per-agent grant in the Agents UI, and the bundle cannot ship that
grant (the agent-import route strips `settings.enabledTools`). It
is also unnecessary: the State Mutator reads the numbers out of the
GM's finished narration and copies them verbatim — it never rolls,
by design.

## First-character setup

1. **Header:** set *Tribe* (Black Furies, Bone Gnawers, Children of Gaia,
   Fianna, Get of Fenris, Glass Walkers, Red Talons, Shadow Lords, Silent
   Striders, Silver Fangs, Stargazers, Uktena, Wendigo — or Black Spiral
   Dancer for antagonist PCs) and *Auspice* (Ragabash, Theurge, Philodox,
   Galliard, Ahroun).
2. **Breed (DERIVED POOLS):** set the breed indicator (Homid 1 / Metis 2
   / Lupus 3 — this is a text label, not a numeric rating; the value just
   distinguishes the three).
3. **Permanent Rage (DERIVED POOLS):** set from Auspice — Ragabash 1,
   Theurge 2, Philodox 3, Galliard 4, Ahroun 5. The Rage pool in
   Resources is capped here.
4. **Permanent Gnosis (DERIVED POOLS):** set from Breed — Homid 1, Metis
   3, Lupus 5. Tribe may add bonuses. The Gnosis pool is capped here.
5. **Permanent Willpower (DERIVED POOLS):** set from Tribe — 3 for most;
   4 for Bone Gnawers, Children of Gaia, Stargazers, Wendigo. Tribe may
   modify further. The Willpower pool is capped here.
6. **Renown (DERIVED POOLS):** distribute 3 permanent dots by Auspice —
   Ragabash 3 in any; Theurge 3 Wisdom; Philodox 3 Honour; Galliard 2
   Glory + 1 Wisdom; Ahroun 2 Glory + 1 Honour.
7. **Rank:** all new characters begin at Rank 1 (Cliath) after the Rite
   of Passage.
8. **Form:** new characters typically start in their breed form (Homid
   or Lupus; Metis start in Crinos). Cycle the Anima-like Form banner in
   Resources.

## Adding Gifts (you bring your own)

W20 has hundreds of Gifts across Breeds, Auspices, Tribes, and totem
spirits, so the bundle ships *mechanics and per-Tribe/Auspice/Breed
overviews*, not a Gift catalogue. Add the Gifts you actually intend to
use in the sheet's **Gifts & Rites** flyout:

- The flyout has buckets: *Breed Gifts*, *Auspice Gifts*, *Tribal
  Gifts*, *General Gifts*, *Spirit Gifts (Lv 6+)*, *Rites*. **+ Add
  Gifts & Rites** creates a custom bucket if you prefer per-totem or
  per-list organisation.
- The small **0–10 box on each bucket header** is a generic per-line
  rating the framework attaches in all dice-pool rulesets (it's the
  Discipline rating in Vampire). W20 Gifts are individual powers, not a
  rated line, so leave it at 0 (or use it as a personal Gift-count
  marker — it doesn't affect any dice).
- Inside a bucket, **+ Add**: **Name**, **Level dots** (1-6 — the
  Gift's level; you must have Rank ≥ Gift level), and a **cost** /
  **system** in the notes field. The Cast button parses Vampire-style
  blood costs but does NOT auto-deduct Gnosis or Rage — the
  state-mutator sub-agent emits the matching `[mrr-state: ...]` tag
  during narration so the Gnosis / Rage / Willpower pool deducts
  correctly. Record cost, teaching spirit, and the system roll
  explicitly in notes (e.g. *"Cost: 1 Gnosis. Teacher: ancestor-spirit.
  System: Stamina + Primal-Urge vs 6; one success per turn of
  invisibility."*).
- **Rites** go in the Rites bucket. Record the required Rituals
  Knowledge level (your Rituals must equal or exceed the rite's level)
  and any chiminage / time / materials.

### Form-shifting

The **Form** banner in Resources cycles Homid → Glabro → Crinos → Hispo
→ Lupus (you can click backwards too if your client supports it).
Either roll Stamina + Primal-Urge (1 success per form crossed) or spend
1 Rage to shift instantly with no roll. The sub-agents will read the
current form to apply Attribute modifiers to attack pools and to flag
Delirium when Crinos meets humans.

### Combat reminders

- Rage in the declaration step buys extra actions (max half permanent
  Rage rating; over min(Dex, Wits) = +3 difficulty all pools).
- Garou regenerate 1 bashing/turn and 1 lethal/hour automatically.
- Silver damage is ALWAYS aggravated and bypasses regeneration.
- In your **breed form** you cannot soak aggravated.
- A Rage roll scoring 4+ successes triggers Frenzy; 6+ is Thrall of the
  Wyrm (unbreakable).

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

In a fresh chat with the ruleset active:

1. Open the dice widget; it renders the dice-pool form (Pool,
   Difficulty).
2. Pool 8, Difficulty 6, **Roll d10s** → `[dice: 8d10 vs 6 → N
   successes]` (successes = dice ≥ 6).
3. Confirm the Resources cluster shows: **Form** banner (cycle five
   forms), **Rage** pool (cap = Permanent Rage), **Gnosis** pool (cap =
   Permanent Gnosis), **Willpower** pool (cap = Permanent Willpower),
   **temporary Glory / Honour / Wisdom** counters, and a 7-level
   **Health Track** with B/L/A damage cycling (Bruised through
   Incapacitated, labelled with penalty pips).

## Updating / removing

Re-install is idempotent (Choose file or fetch the URL again; the
installer PATCHes the managed lorebook and agents rather than
duplicating). The extension itself updates by re-importing the
`.extension.zip` and re-approving via **Review and Run**. Use the
Ruleset dialog's **Uninstall server data** to remove the lorebook and
agents created by this install.
