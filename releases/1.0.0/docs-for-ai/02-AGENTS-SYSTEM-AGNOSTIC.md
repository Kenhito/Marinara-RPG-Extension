# 02 — Agents (System-Agnostic)

This document defines every role agent the framework provides, the system-agnostic baseline behavior of each, and the override mechanism that tunes any role to a specific RPG system.

The architecture lets you build a working ruleset for any system with **zero** per-system agent files (you inherit the shared baselines), or with as many overrides as the system warrants. Exalted ships a state-mutator override plus two parallel-phase trackers because its damage model, sorcery rules, and anima economy don't fit a generic baseline cleanly. D&D ships with one override because its mechanics align well with the baseline.

## File-system contract

```
<repo-root>/
├── agents/                              # SHARED BASELINES — system-agnostic
│   ├── combat-overseer.md
│   ├── context-fuser.md
│   └── state-mutator.md
└── rulesets/
    └── <your-system>/
        ├── ruleset.json
        ├── gm-agent.md                  # the main GM agent (always per-system)
        ├── lorebook.json
        └── agents/                      # OVERRIDES + PARALLEL TRACKERS — system-specific
            ├── state-mutator.md         # only present if your system needs custom mutation rules
            └── <tracker>.md             # optional parallel-phase tracker (no shared baseline)
```

Both `tools/build-bundle.mjs` and `tools/build-agents.mjs` read these two directories with the same resolution rule. For each role, the per-system override at `rulesets/<system>/agents/<role>.md` wins if present; otherwise the shared baseline at `agents/<role>.md` applies. The `main` agent is always system-specific (no shared baseline) and lives at `rulesets/<system>/gm-agent.md`. Per-system `parallel` trackers likewise live only in the ruleset directory — the resources they track exist only in that system.

**The user-facing output is `rulesets/<system>/bundle.json`** (from `build-bundle.mjs`) — it embeds every resolved agent prompt directly in its `additionalAgents[]` array, forced `enabled: true`, alongside the ruleset, lorebook, and main `gmAgent`. One bundle import installs the whole agent pool; the user then enables the agents they want per game (see "Enablement" below). `build-agents.mjs` also writes `rulesets/<system>/agents.json`, the same agent prompts in a standalone `mrr-agents` envelope — this is a toolchain-parity artifact only (useful for inspecting/diffing agent prompts outside the bundle). GM-mode has no "Import Agents" dialog and never reads `agents.json`; users only ever import `bundle.json`.

## The state-mutator tag protocol

The state-mutator agent is the keystone of the entire feedback loop. It tells the GM to emit hidden inline tags whenever narration causes a durable mechanical change. The extension parses those tags and writes to the player's sheet in localStorage.

Every state-mutator implementation (shared or per-system) emits tags in this exact shape:

```
[mrr-state: target="player|<characterName>" field="<fieldName>" delta="<+/-N>" reason="<short narrative why>"]
[mrr-state: target="..." field="conditions" add="<condition name>" reason="..."]
[mrr-state: target="..." field="conditions" remove="<condition name>" reason="..."]
[mrr-state: target="..." field="inventory" add="<item name>" qty="<N>" reason="..."]
[mrr-state: target="..." field="inventory" remove="<item name>" qty="<N>" reason="..."]
```

The extension's resolver routes each tag in this order:

1. **`field="conditions"`** with add/remove → modifies `state.sheet.conditions[]`
2. **`field="inventory"`** with add/remove + qty → modifies `state.sheet.inventory[]`
3. **`field="<damage-type-id>"`** with delta → mutates `state.sheet.track[<trackName>][<typeId>]` if the active ruleset declared `damageTypes` on a track-rendered derived stat
4. **`field="<derived/attribute/skill name>"`** with delta → mutates the corresponding map. **Normalization** is fuzzy: `"hp"`, `"HP"`, `"Hp"`, and `"Health Points"` all resolve to a derived stat named `"Health Points"`. **Max clamping** is automatic: if the field has a `max` or `maxFormula` in the ruleset, `current + delta` clamps to that ceiling. So `delta="+999"` is a valid "refresh to full" pattern.
5. **Unknown field** → stashes on the sheet root as a generic numeric and logs a warning. Authors should treat warnings as bugs and fix the prompt or the resolver.

### Forbidden field-name patterns

These were past failures we now prevent in every override prompt. AI authors of new system overrides should explicitly list these in their FORBIDDEN section to keep the next AI from inventing them:

- ❌ Dotted paths like `healthLevels.minus1` — never parsed
- ❌ Display-text-as-field like `Health Levels` — not a real field
- ❌ Derived-from-state like `Wound Penalty` — those are computed, not stored
- ❌ Free invention like `peripheral_essence` — only declared field names work

The state-mutator's job is to map narrative to **canonical schema field names**. Anything else is dead weight.

## Role catalog

### main — the Game Master narrator

**Always system-specific.** Lives at `rulesets/<system>/gm-agent.md`. The `enabled: true` agent that runs every turn and writes the actual narration. Other agents inject context for it; it's the one writing prose to the player.

**What to cover in this prompt** (per-system, but every system needs all of these):

1. **Resolution mechanic** — exactly which dice, exactly which modifier, exactly which thresholds map to which outcomes. Use the system's own vocabulary (DC vs target number vs threshold; success vs hit vs strike).
2. **Difficulty ladder** — the named difficulty levels with their numeric thresholds. Models set DCs more consistently when they know the standard ladder.
3. **Resource economy** — every resource the player tracks (HP / Stamina / motes / Willpower / Stress / Aspect-Invocations / etc.). Describe how each is spent and how each is recovered. The model narrates scarcity correctly when the loop is closed.
4. **Action types** — named actions in the system (overcome / advantage / attack / defend in Fate, simple / supplemental / reflexive Charms in Exalted, action / bonus action / reaction in D&D). One line each.
5. **Negative space** — explicit "do NOT" rules. "Do not emit `[skill_check:]` tags — that's a different system." "Do not track HP — Fate uses stress and consequences." Kills cross-system hallucination.
6. **Engine compatibility note** — see "Engine compat" in 06-BUILD-PIPELINE.md.

Length: 2,000–8,000 characters. Phase: `pre_generation`. Result type: `context_injection` (default fallback).

### combat-overseer

Shared baseline at `agents/combat-overseer.md`. Pre-generation. Two coordinated surfaces in one output:

- **Combat math** — wakes only during combat (the prompt itself short-circuits with "No combat active." in social/ambient scenes). Restates initiative, action economy, attack/damage formulas, conditions, range, and defensive options in the active system's terms.
- **NPC roster** — tracks active NPC HP, conditions, tactical state, and telegraphed intent across turns. Stays silent (`"No NPCs to track."`) outside combat or NPC-rich scenes.

Override when:

- Your system has **non-trivial action economy** (Exalted's Withering / Decisive split, PbtA's "tell me how you want it" framing, Forged-in-the-Dark's position/effect interplay).
- Your system has **named maneuvers / stunts** (Pathfinder 2e's three-action economy, Mythic Bastionland's complications).

### context-fuser

Shared baseline at `agents/context-fuser.md`. Pre-generation. Two coordinated surfaces in one output:

- **Rules query** — fires only when the latest user message is a rules question (`"How does grappling work?"`, `"What's the DC for picking a lock?"`). Pulls answers from the installed ruleset content and lorebook first, system RAW only as fallback.
- **State reminder** — surfaces current PC state every turn so the GM doesn't drift.

Override when:

- Your system has **computed maximums** the AI needs to see live (Exalted: `Personal Motes max = Essence × 3 + 10`). The override computes those formulas in its output.
- Your system has **multi-counter resources** to summarize (Exalted's typed damage display: `bashing 3 · lethal 2 · aggravated 0 (wound penalty -2)`).

A good override also includes a **field-name reminder** at the bottom of the state section — listing the canonical `field=` names the state-mutator accepts. Pairing this with the state-mutator's FORBIDDEN section means the model sees the right names from two angles every turn.

### state-mutator

Shared baseline at `agents/state-mutator.md`. Pre-generation; the only agent whose output leads to sheet writes. Override at `rulesets/<system>/agents/state-mutator.md` when:

- Your system has **typed damage** (Bashing/Lethal/Aggravated like Exalted, or Slashing/Bludgeoning/Piercing like D&D 5e tracked separately). Override teaches the AI which `field` names route to typed damage.
- Your system has **non-trivial resource costs** the model must parse (Exalted Charm cost lines like `Cost: 5m 1wp` get auto-converted into mote and Willpower deltas; D&D spell slots).
- Your system has **multi-turn casting** like Exalted's Shape Sorcery action — the override walks the AI through declaring → accumulating sorcerous motes → unleashing → refunding Willpower.

Override structure (recommended):

1. **Header** — what this override is tuned for
2. **Tag protocol** — restate the canonical tag shape
3. **FORBIDDEN field names** — the field-name traps to avoid (see above)
4. **Field vocabulary** — every valid `field=` value with one-line description
5. **System-specific workflows** — multi-turn casting, damage stacking, etc.
6. **Conditions vocabulary** — system's named conditions
7. **Examples** — concrete narrative → tag pairings, ideally one per common scenario

### pre-input-transformer (optional)

Pre-generation. Translates D&D-flavored player input ("I roll Strength") into the ruleset's own vocabulary before generation. Auto-derived from `ruleset.json` `vocabularyHints[]` (or a full author-supplied prompt); omitted from bundles that don't need it.

### Per-system parallel trackers (optional, at most one per ruleset)

`parallel`-phase agents that track a system-specific resource alongside the narrator without blocking it — e.g., Exalted 3e's anima-banner / charm-cooldown tracking, V20's `blood-pool-tracker`. They live only at `rulesets/<system>/agents/<role>.md` — no shared baseline, because the tracked resource exists only in that system. A new mechanic should be a section of an existing agent's prompt unless it genuinely cannot be.

## Enablement — per game, at load time

The bundle installs the agents, but they are not active until the user **enables them for each game** after the game launches (at load time, not during generation). The ruleset's lorebook must also be **manually attached to the game** — without it the agents have no ruleset info to follow and will misfire.

The lorebook entry "Sub-Agents — what they do and how to enable them" exists in every shipped bundle so users can ask the in-engine chat about them.

## Building a new system's agents

The minimum:

1. Write `rulesets/<system>/gm-agent.md` (the main agent — always required).
2. Optionally drop overrides in `rulesets/<system>/agents/<role>.md` for any role that needs system-specific tuning.
3. Run `node tools/build-bundle.mjs rulesets/<system>/` — produces `rulesets/<system>/bundle.json`, embedding every resolved agent prompt in `additionalAgents[]`. This is the file the user imports through the extension's **Ruleset** dialog — one import installs the ruleset, lorebook, main GM agent, and every role agent together.
4. Optionally also run `node tools/build-agents.mjs rulesets/<system>/` — produces `rulesets/<system>/agents.json` for toolchain parity. Users never import this file directly; GM-mode has no separate "Import Agents" dialog.

Re-running `build-bundle.mjs` after editing any agent prompt file re-syncs the bundle; re-installing the bundle updates the extension's managed agents in place (keyed by `mrrAgentRole`) rather than accumulating duplicates.

## Next

Read **03-RULESET-SCHEMA.md** for the data contract, then **05-AGENT-AUTHORING.md** for prompt-writing patterns specific to each role.
