# Install — Blades in the Dark ruleset

Blades in the Dark is John Harper's Forged in the Dark heist game. This bundle ships the character sheet, lorebook, and GM agent for the core ruleset.

## Quick install (recommended)

**One file import + one bundle install.** Skip step 1 if the framework extension is already installed.

### 1. Install the framework extension (once per Marinara install)

In Marinara Engine: **Settings → Extensions → Add Extension** — accepts file upload.

- Import `extension/RPG-Extension-GM-Mode.js` from this repo.
- Name: `Marinara-RPG-Extension`. Enable.

A **Ruleset** button appears in the chat header.

### 2. Install the Blades in the Dark bundle

Click **Ruleset** → paste `rulesets/blades-in-the-dark/bundle.json` into the dialog → **Save and reload**.

The bundle auto-installs:
- The Blades ruleset (Insight / Prowess / Resolve as Action categories, 12 Actions as skills, Position+Effect resolution).
- The Blades lorebook (~14 entries covering the action roll, Position, Effect, Stress/Trauma, Resistance, Harm levels, Playbooks, Score→Downtime loop, Load+Flashback, Crew+Heat, Ghosts/Occult, XP/advancement, Vice/Overindulgence).
- A custom tool that returns the canonical Blades reference on demand.
- A pre-input transformer agent (DISABLED by default — opt in via Settings → Agents) that recognizes attack, sneak, push, devil's bargain, resist, and indulge phrases.

## What the dice widget does (and doesn't do)

Blades' Nd6-take-highest mechanic is mechanically simple, but the dice widget runs in **manual NdX mode** because the game's resolution lives in the combination of dice + Position + Effect — not just dice. Roll 6-sided dice physically (or via any d6 roller), tell the AI your highest result, and the GM agent will narrate the outcome from there.

**Recommended workflow:**
1. The GM agent declares Position + Effect for the action.
2. You decide modifiers (push? devil's bargain? assist?) and announce final pool.
3. Roll Nd6 — anything that rolls d6 works.
4. Report the HIGHEST die to the AI (or "two 6s for a critical").
5. AI narrates outcome.

## Set the table BEFORE the score

Before the heist starts, the GM should ask:
- What's the target? (a vault, a ship, an NPC's secret, a ritual location)
- What kind of score? (Assault, Deception, Stealth, Occult, Social, Transport)
- Crew Plan archetype + Detail? (e.g. Stealth: enter via the rooftops)
- Engagement Roll to determine starting Position (Controlled / Risky / Desperate).
- Each PC declares Load (Light 3 / Normal 5 / Heavy 6).

Then play the heist. After: Downtime. Then Free Play.

## Setting

The bundle is faithful to John Harper's **Doskvol** setting flavor — gothic-industrial city, lightning barriers, electroplasm, ghosts, hauntings. A different Forged in the Dark hack (Scum & Villainy, Band of Blades, Beam Saber, etc.) can be played by:
- Adjusting the Playbook list (the lorebook describes Blades' 7 core; a hack has different ones).
- Adjusting the Crew playbook list (the lorebook describes the 6 Blades crew types).
- Adjusting the setting-specific occult lore in the lorebook.

The mechanics (Action Roll, Position, Effect, Stress, Resistance, Score+Downtime) are universal across Forged in the Dark hacks.

## Uninstall

In the **Ruleset** dialog, click **Uninstall current ruleset**. Bundle artifacts removed; character sheet data preserved in localStorage.

## What's NOT in the bundle

- Full Playbook special-ability lists. The 7 Playbooks are NAMED in the lorebook; their full ability trees are dense and left to GM/player to flesh out via play or hand-authored lorebook additions.
- Setting-specific NPC roster. Doskvol's factions, neighborhoods, and key NPCs are out of scope for the core ruleset bundle.
- Crew-mechanics deep details. The lorebook covers the basics (Heat, Rep, Crew playbook concept); specific crew advancement trees are left for the GM.
- Gear lists. Blades uses flashback-equipping; gear is named at use-time, not pre-listed.

## Cross-references

- [`docs/BUILDING.md`](../../docs/BUILDING.md) — generator pipeline contract.
- [`docs/AUTHORING.md`](../../docs/AUTHORING.md) — step-by-step new-ruleset walkthrough (this bundle followed that recipe).
- [`docs/ENGINE-CONSTRAINTS.md`](../../docs/ENGINE-CONSTRAINTS.md) — what overlay can vs cannot do.
