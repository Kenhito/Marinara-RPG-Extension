# Engine constraints — what this overlay can and cannot do

This page is the honest-tradeoff document. It exists because the alternative — confidently telling you the overlay does X when it actually does Y — wastes your time when you discover the gap mid-session.

Verified against Marinara Engine v1.5.5 (April 2026). If a future Marinara release changes any of these, this doc is wrong; please open a PR.

## What the overlay does

### GM narration mechanics — fully ruleset-driven

When the GM model composes a turn, your custom `pre_generation` agent injects a rules brief naming the relevant attribute / skill, suggesting a difficulty, and reminding the model of the dice-tag format. The lorebook adds rules reference (charms, conditions, anima rules) on the relevant turns. The combined effect: the GM model thinks in your ruleset's mechanics on every turn.

### Character sheet UI — fully replaced

The extension hides the built-in "Attributes" panel via CSS (it walks the DOM looking for an "Attributes" heading and hides its parent container) and renders a replacement that respects the ruleset's actual attribute count, groupings (Physical/Social/Mental for Storyteller systems), abbreviations, and min/max bounds. Skills, derived stats (bars, tracks, values), and stateful selectors (Anima Banner, Stunt Tier) all render from the ruleset spec.

### Dice tags in narration — formatted per ruleset

Marinara's existing `game-tag-parser.ts` already parses `[dice: ...]` tags from generated text and renders them in the chat UI. The overlay tells the GM model what format to use (via the agent prompt) and the extension's own dice widget produces matching tags when the player rolls. Both ends agree.

### Dice rolling — client-side, faithful to the ruleset

The extension's floating dice widget supports four resolution modes:

- **single-roll** (d20 + modifier vs DC) — D&D, Pathfinder.
- **dice-pool** (Xd10 vs target, with doubles and botch detection) — Exalted, Storyteller.
- **d100-percentile** (1d100 under skill) — Call of Cthulhu.
- **2d6-stat with bands** (2d6+stat, 6-/7-9/10+ outcome bands) — PbtA.

Roll output is mathematically faithful to the ruleset's spec (target, doubles face/successes, botch trigger). The "Send to chat" button writes the formatted tag into the chat input, ready to send.

## What the overlay does NOT do

### Combat-encounter modal — still d20-flavored

When Marinara's built-in **combat encounter** UI fires (the modal with party HP, enemy HP, attacks, statuses), it's driven by `packages/server/src/routes/encounter.routes.ts` and `packages/server/src/services/game/` server-side TypeScript. The encounter init prompt and action-resolution prompt are baked into the engine binary; the resolution math doesn't honor your ruleset's dice/successes/difficulties.

**Practical effect:** the narration around a combat encounter still uses your ruleset's flavor (dice tags, charm names, anima banners) because that flows through the GM agent. The modal's stat blocks (party HP, enemy HP) and the per-turn action UI are d20-shaped. For Exalted specifically, this means combat *narration* is Exalted-correct but the *modal* doesn't know about tick-based initiative, Decisive vs Withering, or proper Onslaught.

**Workaround:** play out combat in narration mode rather than triggering the encounter modal. For Exalted, this is often the better fit anyway — the modal abstracts too much for Exalted's stunt-driven rhythm.

**Long-term fix:** an upstream PR adding `gmPromptOverride` and `encounterRulesetId` extension hooks would let the overlay register a server-side adapter. That PR isn't open yet; if/when it lands, this overlay can register itself as the active ruleset and the modal will follow.

### Character creation wizard — still D&D-shaped

Marinara's character creator wizard (the maker for new characters) uses the built-in 6-attribute model. The overlay can't intercept that flow without forking. **Workaround:** create the character with arbitrary D&D values (or all zeros), then edit the sheet in the chat using the overlay's panel. The extension's localStorage sheet is the source of truth once a chat is active.

### `RPGAttributes` server storage

The engine's `PlayerStats.attributes` type is hard-coded to `{ str, dex, con, int, wis, cha }`. The overlay does not write into this field for non-D&D rulesets — the attribute names don't match, and forcing them creates lossy data. Instead, the extension stores the sheet in browser `localStorage` keyed by chat ID. A "Sync sheet to chat fields" button writes the sheet into the chat's `customTrackerFields[]` array (free-form key/value strings, which the engine does support), so the GM agent reads them on subsequent turns.

**Practical effect:** if you switch browsers or clear `localStorage`, you lose the sheet unless you've synced to chat fields recently. Hit the Sync button after every significant sheet update — a sane habit anyway, since the GM agent benefits from seeing current values.

### Lorebook + agent prompt are paste-only

There's no marketplace for lorebooks or agents in Marinara as of v1.5.5. Each install requires manual paste of the agent prompt and import of the lorebook JSON. The per-ruleset `INSTALL.md` walks through it; ~5 minutes per ruleset.

### Dice widget doesn't auto-fill from sheet

When you click a skill's "roll" button on the sheet, the dice widget pre-fills the pool size with `attribute + ability` (for dice-pool) or the modifier (for single-roll), but you still confirm and click **Roll**. This is intentional — making the click a single step would mean the extension is rolling for you without you seeing it, and the failure mode (wrong attribute selected automatically) is annoying enough to be worse than the extra click.

### Per-character ruleset context

The overlay treats ruleset selection as a global setting (one ruleset active at a time across all chats). Two simultaneous chats running different rulesets is technically possible — each chat has its own sheet in `localStorage` — but you must remember to switch the active ruleset when you switch chats. A future version could read ruleset selection from a per-chat custom field; PR welcome.

## What you can fix, today, without forking

Most of the above is a single design decision per gap. If something here matters enough to you that you want it changed:

1. **Server-side GM prompt override** would lift the combat-encounter constraint. Feature request for Pasta-Devs: a custom-agent phase that gets to mutate `gmPromptContext` before `gm-prompts.ts` builds the system prompt. Roughly 50 lines in the server; fits the engine's "small composable seams" design.

2. **Extension API hook for the character creator** would let the overlay show a ruleset-aware creator. Feature request: `marinara.registerCharacterMaker(fn)`. Roughly 100 lines.

3. **Per-chat ruleset selection** is fully overlay-side — can be added in a `ruleset-loader.js` patch that reads `customTrackerFields["__mrr_ruleset"]` first, then falls back to localStorage. ~20 lines.

The repo is open to PRs for any of these.
