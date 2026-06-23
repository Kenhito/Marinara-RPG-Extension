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

### 1. Install the framework extension (once per Marinara install)

Marinara Engine: **Settings → Extensions → Add Extension** (file upload,
not pasted text).

- **Import** `extension/RPG-Extension-GM-Mode.js` from this repo. CSS is
  embedded — no separate stylesheet.
- Enable it. A **Ruleset** button appears in the chat header.

### 2. Install the W20 bundle

Click the **Ruleset** button. Load the bundle one of three ways:

- **Choose file:** pick `rulesets/w20/bundle.json` from disk → **Save and reload**.
- **Fetch URL:** the raw GitHub URL of `rulesets/w20/bundle.json`.
- **Paste:** copy the contents of `bundle.json` into the textarea → **Save and reload**.

The installer creates the lorebook ("Werewolf 20 Reference"), activates
the ruleset, and reloads.

### 3. Install the agents

Open the extension's **Import Agents** dialog and import
`rulesets/w20/agents.json`. It installs the main **Werewolf 20 Ruleset
Helper** (enabled) plus five focused sub-agents (state-mutator,
state-reminder, combat-adjudicator, lore-query, npc-bookkeeper) that are
**disabled by default**. Enable any you want in **Settings → Agents** —
each enabled agent costs one extra model call per turn. Enable
*state-reminder* and *state-mutator* first if you want the floating
sheet to stay in sync.

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

Re-install is idempotent (Choose file / fetch / paste again; the
installer PATCHes the managed lorebook and agents rather than
duplicating). Use the Ruleset dialog's **Uninstall server data** to
remove the lorebook, and the Agents dialog to remove the agents.

## Manual install (source-of-truth path)

1. **Settings → Extensions** — import `extension/RPG-Extension-GM-Mode.js`.
2. **Ruleset button** — load `rulesets/w20/ruleset.json`.
3. **Lorebooks → Import** — import `rulesets/w20/lorebook.json`.
4. **Agents → Import Agents** — import `rulesets/w20/agents.json`.

The bundle path automates steps 2–4 from one file.
