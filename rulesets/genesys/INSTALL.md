# Install — Genesys ruleset

Genesys is Fantasy Flight Games' generic narrative-dice system. This bundle ships the character-sheet schema, lorebook reference, and GM agent prompt for the core ruleset. Setting choice (sci-fi, fantasy, modern occult, etc.) is up to the GM — the bundle is setting-agnostic.

## Quick install (recommended)

**One file import + one bundle install.** Skip step 1 if the framework extension is already installed.

### 1. Install the framework extension (once per Marinara install)

In Marinara Engine: **Settings → Extensions → Add Extension** — accepts file upload.

- Import `extension/RPG-Extension-GM-Mode.js` from this repo.
- Name: `Marinara-RPG-Extension`. Enable.

A **Ruleset** button appears in the chat header.

### 2. Install the Genesys bundle

Click the **Ruleset** button → paste the contents of `rulesets/genesys/bundle.json` into the dialog → click **Save and reload**.

The bundle auto-installs:
- The Genesys ruleset (six characteristics, ~31 skills, narrative-dice resolution).
- The Genesys lorebook (~15 entries covering symbols, pool assembly, Story Points, Wounds vs Strain, initiative, maneuvers, range bands, critical injuries, talents, etc.).
- A custom tool that returns the canonical Genesys reference on demand.
- A pre-input transformer agent (DISABLED by default — opt in via Settings → Agents) that re-frames common verbs in Genesys terms.

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
