# Engine constraints — what this overlay can and cannot do

This page is the honest-tradeoff document. It exists because the alternative — confidently telling you the overlay does X when it actually does Y — wastes your time when you discover the gap mid-session.

Originally verified against Marinara Engine v1.5.6 (April 2026); individual sections re-verified since are marked inline with their date and engine version (the reputation section against v2.4.4, the storage and per-chat-ruleset sections against the v1.4.0 extension release, September 2026). If a future Marinara release changes any of these, this doc is wrong; please open a PR.

## What the overlay does

### GM narration mechanics — fully ruleset-driven

When the GM model composes a turn, your custom `pre_generation` agent injects a rules brief naming the relevant attribute / skill, suggesting a difficulty, and reminding the model of the dice-tag format. The lorebook adds rules reference (charms, conditions, anima rules) on the relevant turns. The combined effect: the GM model thinks in your ruleset's mechanics on every turn.

### Character sheet UI — fully replaced

The extension hides the built-in "Attributes" panel via CSS (it walks the DOM looking for an "Attributes" heading and hides its parent container) and renders a replacement that respects the ruleset's actual attribute count, groupings (Physical/Social/Mental for Storyteller systems), abbreviations, and min/max bounds. Skills, derived stats (bars, tracks, values), and stateful selectors (Anima Banner, Stunt Tier) all render from the ruleset spec.

### Dice tags in narration — formatted per ruleset

Marinara's existing `game-tag-parser.ts` already parses `[dice: ...]` tags from generated text and renders them in the chat UI. The overlay tells the GM model what format to use (via the agent prompt) and the extension's own dice widget produces matching tags when the player rolls. Both ends agree.

### Dice rolling — client-side, faithful to the ruleset

The extension's floating dice widget supports nine resolution modes:

- **single-roll** (d20 + modifier vs DC) — D&D, Pathfinder.
- **dice-pool** (Xd10 vs target, with doubles and botch detection) — Exalted, Storyteller.
- **d100-percentile** (1d100 under skill; or `direction: "high"` for roll + bonus vs a target, with an optional `openEnded` exploding/imploding chain and `unusualFaces` `um=` flagging) — Call of Cthulhu, Rolemaster.
- **2d6-stat with bands** (2d6+stat, 6-/7-9/10+ outcome bands) — PbtA.
- **fate-ladder** (4dF + skill vs ladder target, with Tie / Success / Success-with-style outcomes) — Fate Core, Fate Accelerated, Fate-of-Cthulhu.
- **roll-under** (3d6 or 1d100 ≤ target; optional crit / fumble) — GURPS, CoC 7e, Pendragon.
- **stance-modal-pool** (Xd6 pool with per-roll stance toggle, directional invariant, bridge value) — Lasers & Feelings, Stewpot, Trophy Dark.
- **dice-pool-sum** (Xd6 sum vs difficulty with optional Wild Die explode-on-face cascade and 1/3-of-a-die pip granularity) — OpenD6, WEG Star Wars, Mini Six.
- **narrative-handled** (no mechanical roll — GM / fiction adjudicates) — Trophy Dark dark dice, prose-resolved scenes.

Roll output is mathematically faithful to the ruleset's spec (target, doubles face/successes, botch trigger, success-with-style margin). The "Send to chat" button writes the formatted tag into the chat input, ready to send.

## What the overlay does NOT do

### Combat-encounter modal — still d20-flavored

When Marinara's built-in **combat encounter** UI fires (the modal with party HP, enemy HP, attacks, statuses), it's driven by `packages/server/src/routes/encounter.routes.ts` and `packages/server/src/services/game/` server-side TypeScript. The encounter init prompt and action-resolution prompt are baked into the engine binary; the resolution math doesn't honor your ruleset's dice/successes/difficulties.

**Practical effect:** the narration around a combat encounter still uses your ruleset's flavor (dice tags, charm names, anima banners) because that flows through the GM agent. The modal's stat blocks (party HP, enemy HP) and the per-turn action UI are d20-shaped. For Exalted specifically, this means combat *narration* is Exalted-correct but the *modal* doesn't know about tick-based initiative, Decisive vs Withering, or proper Onslaught.

**Workaround:** play out combat in narration mode rather than triggering the encounter modal. For Exalted, this is often the better fit anyway — the modal abstracts too much for Exalted's stunt-driven rhythm.

**Long-term fix:** an upstream PR adding `gmPromptOverride` and `encounterRulesetId` extension hooks would let the overlay register a server-side adapter. That PR isn't open yet; if/when it lands, this overlay can register itself as the active ruleset and the modal will follow.

### Character creation wizard — still D&D-shaped

Marinara's character creator wizard (the maker for new characters) uses the built-in 6-attribute model. The overlay can't intercept that flow without forking. **Workaround:** create the character with arbitrary D&D values (or all zeros), then edit the sheet in the chat using the overlay's panel. The extension's localStorage sheet is the source of truth once a chat is active.

### `RPGAttributes` server storage *(re-verified September 2026 — storage model superseded since the original pass)*

The engine's `PlayerStats.attributes` type is hard-coded to `{ str, dex, con, int, wis, cha }`. The overlay does not write into this field for non-D&D rulesets — the attribute names don't match, and forcing them creates lossy data. Instead, the extension keeps sheets in **its own server-backed extension storage** (`marinara.storage`), mirrored to browser storage for responsiveness; both copies carry timestamps and the newer wins on load. Characters therefore survive a cleared browser and follow you across devices. The GM reads current values from the live sheet block the extension injects each turn — the old "Sync sheet to chat fields" button is gone (the server discarded that write path), and no manual sync habit is needed anymore.

### Lorebook attachment + agent enablement are per-game manual steps

There's no marketplace for lorebooks or agents in Marinara. The ruleset bundle installs the lorebook and agents in one import, but each game must have the lorebook manually attached and the agents manually enabled after launch (they behave like any custom agents on 2.4.3+). The per-ruleset `INSTALL.md` walks through it; ~5 minutes per ruleset.

### Dice widget doesn't auto-fill from sheet

When you click a skill's "roll" button on the sheet, the dice widget pre-fills the pool size with `attribute + ability` (for dice-pool) or the modifier (for single-roll), but you still confirm and click **Roll**. This is intentional — making the click a single step would mean the extension is rolling for you without you seeing it, and the failure mode (wrong attribute selected automatically) is annoying enough to be worse than the extra click.

### Per-chat ruleset context *(re-verified September 2026 — shipped since the original pass)*

Ruleset selection is tracked **per chat**: each chat is stamped with its ruleset, the extension re-binds automatically when you switch chats, and a deliberate in-chat ruleset switch re-stamps that chat rather than being fought. Two simultaneous chats can run two different systems with no manual switching. (This section previously described a global-selection limitation; that shipped away.)

### Reputation tracker schema mismatch (re-verified against current engine HEAD — supersedes the 1.5.6 figure below)

**Re-verified 2026-08-22 against `~/Marinara-Engine` HEAD (`b1ec60409`, engine v2.4.4) — this item only; the rest of this page is still the original v1.5.6 pass.** The 50-character figure below was accurate for v1.5.6 but is now stale: the engine's `/reputation/update` route validates `action` strings against `GAME_REPUTATION_ACTION_MAX_LENGTH`, a named constant now set to **500 characters** (`packages/server/src/routes/game.routes.ts:1714`, consumed at `packages/server/src/routes/game.routes.ts:9913` as `action: z.string().min(1).max(GAME_REPUTATION_ACTION_MAX_LENGTH)`). The GM prompt's own reminder line lives at `packages/server/src/services/game/gm-prompts.ts:781` and — like before — does not state the numeric limit. The 400/connection-toast failure mode this section describes no longer reproduces at normal narration lengths now that the cap is 500 chars instead of 50; it would take an unusually long `action` string to trip it today.

**Current guidance:** ruleset `gm-agent.md` prompts should still keep `action` short (a few words, not a sentence) as defensive practice — a short action string is safe on any engine version, old or new — but do not encode a hard 50-character rule as fact; the verified current ceiling is 500 characters. If you're validating against an older self-hosted engine build, check that build's own `GAME_REPUTATION_ACTION_MAX_LENGTH` value rather than assuming either number.

*(Original 1.5.6-era finding, kept for history: the engine's `/api/game/reputation/update` endpoint validated `action` strings at max 50 characters (`packages/server/src/routes/game.routes.ts:3940` at the time), and the GM prompt at `packages/server/src/services/game/gm-prompts.ts:604` at the time instructed the LLM to emit `[reputation: npc="Name" action="..."]` tags without communicating the length limit. Verbose models (Opus, GPT-4-class) routinely emitted 100+ character action descriptions and triggered 400 Validation Errors.)*

**Long-term fix:** upstream PR communicating the schema constraint in the engine's GM prompt. Open issue suggested.

## What you can fix, today, without forking

Most of the above is a single design decision per gap. If something here matters enough to you that you want it changed:

1. **Server-side GM prompt override** would lift the combat-encounter constraint. Feature request for Pasta-Devs: a custom-agent phase that gets to mutate `gmPromptContext` before `gm-prompts.ts` builds the system prompt. Roughly 50 lines in the server; fits the engine's "small composable seams" design.

2. **Extension API hook for the character creator** would let the overlay show a ruleset-aware creator. Feature request: `marinara.registerCharacterMaker(fn)`. Roughly 100 lines.

3. **Per-chat ruleset selection** is fully overlay-side — can be added in a `RPG-Extension-GM-Mode.js` patch that reads `customTrackerFields["__mrr_ruleset"]` first, then falls back to localStorage. ~20 lines.

The repo is open to PRs for any of these.
