# Install — Exalted Versus World of Darkness ruleset

ExvWoD is a fan crossover: Exalted-style Chosen running on the World of
Darkness 20th-anniversary Storyteller chassis. This bundle is a hybrid of
the repo's `vtmv20` WoD chassis and `exalted3e` Essence/Charm machinery,
tuned to the *Exalted vs World of Darkness (Revised)* rules.

> Unofficial, non-commercial fan material. No verbatim corebook or ExvWoD
> document text is reproduced — mechanics references only. Exalted names
> belong to Onyx Path Publishing; World of Darkness names to Paradox
> Interactive AB. Distributed in the spirit of the Dark Pack Agreement.

## Quick install (recommended)

### 1. Install the framework extension (once per Marinara install)

Marinara Engine: **Settings → Extensions → Add Extension** (file upload,
not pasted text).

- **Import** `extension/RPG-Extension-GM-Mode.js` from this repo. CSS is
  embedded — no separate stylesheet.
- Enable it. A **Ruleset** button appears in the chat header.

### 2. Install the ExvWoD bundle

Click the **Ruleset** button. Load the bundle one of three ways:

- **Choose file:** pick `rulesets/exwod/bundle.json` from disk → **Save and reload**.
- **Fetch URL:** the raw GitHub URL of `rulesets/exwod/bundle.json`.
- **Paste:** copy the contents of `bundle.json` into the textarea → **Save and reload**.

The installer creates the lorebook ("Exalted vs World of Darkness
Reference"), activates the ruleset, and reloads.

### 3. Install the agents

Open the extension's **Import Agents** dialog and import
`rulesets/exwod/agents.json`. It installs the main **Exalted vs WoD
Ruleset Helper** (enabled) plus five focused sub-agents
(state-mutator, state-reminder, combat-adjudicator, lore-query,
npc-bookkeeper) that are **disabled by default**. Enable any you want in
**Settings → Agents** — each enabled agent costs one extra model call per
turn. If you want the floating sheet to stay in sync, enable
*state-reminder* and *state-mutator* first.

## First-character setup

The sheet is type-agnostic so it serves all nine Exalt types. After
creating a character:

1. **Header:** set *Exalt Type* (Solar, Lunar, Dragon-Blooded, Sidereal,
   Abyssal, Infernal, Alchemical, Liminal, or Dragon Kings) and
   *Caste / Aspect*.
2. **Essence (rating):** set 1–5 (most start at 1).
3. **Mote Pool (DERIVED POOLS).** ExvWoD uses one fungible mote/Essence
   pool whose size depends on type *and* Essence rating; there is no
   single formula. Set the **Mote Pool** stepper from the lorebook entry
   **"Rule: Essence Pools (per Exalt type)"**; the Motes bar in Resources
   uses it as its cap. Examples at Essence 1: Solar/Abyssal/Infernal =
   10, Lunar/Sidereal/Alchemical = 8, Dragon-Blooded = 5, Liminal = 6
   (highest is 20, a Solar/Abyssal/Infernal at Essence 5). Raise it when
   Essence rating goes up.
4. **Permanent Willpower (DERIVED POOLS):** set it to the permanent
   rating (Exalts start at 5); the Willpower pool uses it as its cap.
5. **Intimacies:** add ~3 (Lunars and Liminals get a mandatory 4th —
   see their lorebook entries).
6. **Skill proficiency tier:** mark each Ability that belongs to your
   Caste/Aspect/Key list as *Caste/Aspect* — those rolls ignore 1s.

## Adding Charms (you bring your own)

ExvWoD has hundreds of Charms across nine Exalt types, so the bundle
ships *mechanics and per-type overviews*, not a Charm catalogue. Add the
Charms you actually intend to use in the sheet's **Charms** flyout:

- The flyout has generic buckets (*Caste / Aspect Charms*, *Favoured /
  Key Charms*, *Other Charms*, *Shapeshifting (Lunar)*, *Anima / Caste
  Power*, *Ancient Sorcery*) plus **+ Add Charms** to create your own
  bucket — e.g. one per Ability (`Melee`, `Occult`…) or per Caste if you
  want the book's exact organisation.
- The small **0–10 box on each bucket header** is a generic per-line
  rating the framework attaches in *all* dice-pool rulesets (it's the
  Discipline rating in Vampire). ExvWoD Charms are individual powers, not
  a rated line, so leave it at 0 (or use it as a personal Charm-count /
  favoured marker — it does not affect any dice).
- Inside a bucket, **+ Add**: give the Charm a **Name**, optional
  **rating dots**, and a **cost** in the syntax the Cast button parses:
  motes as `5m` (or `5 mote`), Willpower as `1wp` (or `1 willpower`),
  combined as `5m, 1wp`. Put Reflexive / Scene / Once-per-story /
  keyword notes in the notes field.
- Clicking **Cast** deducts the cost from the single Motes pool (and
  Willpower) and injects a cast tag for the narrator.
- **Committed-mote Charms / attuned artifacts:** add them instead as an
  **Inventory** item with `mote_commitment=N` and `mote_pool="Personal"`.
  Equipping locks those motes out of the Motes bar; unequipping returns
  them. (`commitmentModel` is `"mote"`; ExvWoD has one pool, so always
  use `"Personal"`.)
- Copy the real Charm text (cost, mins, type, keywords, duration,
  effect) from the relevant Exalted vs WoD Charm list into the notes so
  the narrator adjudicates it correctly. Don't rely on the AI to
  remember a Charm it was never given.

### Charms that add Health levels (Ox-Body etc.)

Ox-Body Technique, Lunar/Liminal Flesh-aspect bonus levels, and
Mutations permanently add health levels. The Health Track widget has
**"Add level"** buttons (`-0 / -1 / -2`) and **"remove last"** — click to
add the granted levels; they persist with the sheet separately from the
base 7. **Caveat:** the buttons only emit `-0/-1/-2`. For a rare
Crippled (`-5`) grant (e.g. the Infernal Ox-Body's one Crippled level),
add a `-2` cell and note the true `-5` in the character notes, or have
the Storyteller apply it by hand. This is a player action on the
widget — it is NOT a `[mrr-state:]` damage delta.

## Sanity check

In a fresh chat with the ruleset active:

1. Open the dice widget; it renders the dice-pool form (Pool,
   Difficulty).
2. Pool 8, Difficulty 6, **Roll d10s** → `[dice: 8d10 vs 6 → N
   successes]` (successes = dice ≥ 6).
3. Confirm the Resources cluster shows: Anima Banner (cycles
   Dormant→Glimmering→Bonfire→Iconic), Essence counter, Motes bar
   (cap driven by the Mote Pool stat), Willpower pool (cap driven by
   Permanent Willpower), and a 7-level Health Track with B/L/A damage
   cycling and `-0/-1/-2` Add-level buttons for Ox-Body grants.

## Updating / removing

Re-install is idempotent (Choose file / fetch / paste again; the
installer PATCHes the managed lorebook and agents rather than
duplicating). Use the Ruleset dialog's **Uninstall server data** to
remove the lorebook, and the Agents dialog to remove the agents.

## Manual install (source-of-truth path)

1. **Settings → Extensions** — import `extension/RPG-Extension-GM-Mode.js`.
2. **Ruleset button** — load `rulesets/exwod/ruleset.json`.
3. **Lorebooks → Import** — import `rulesets/exwod/lorebook.json`.
4. **Agents → Import Agents** — import `rulesets/exwod/agents.json`.

The bundle path automates steps 2–4 from one file.
