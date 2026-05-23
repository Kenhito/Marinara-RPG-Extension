# 02 — Agents (System-Agnostic)

This document defines every role agent the framework provides, the system-agnostic baseline behavior of each, and the override mechanism that tunes any role to a specific RPG system.

The architecture lets you build a working ruleset for any system with **zero** per-system agent files (you inherit the shared baselines), or with as many overrides as the system warrants. Exalted ships with three overrides because its damage model and sorcery rules don't fit a generic baseline cleanly. D&D ships with one override because its mechanics align well with the baseline.

## File-system contract

```
<repo-root>/
├── agents/                              # SHARED BASELINES — system-agnostic
│   ├── state-mutator.md
│   ├── state-reminder.md
│   ├── combat-adjudicator.md
│   ├── lore-query.md
│   └── npc-bookkeeper.md
└── rulesets/
    └── <your-system>/
        ├── ruleset.json
        ├── gm-agent.md                  # the main GM agent (always per-system)
        ├── lorebook.json
        └── agents/                      # OVERRIDES — system-specific
            ├── state-mutator.md         # only present if your system needs custom mutation rules
            └── combat-adjudicator.md    # only present if combat resolution differs from baseline
```

`tools/build-agents.mjs` reads both directories. For each role, the per-system override at `rulesets/<system>/agents/<role>.md` wins if present; otherwise the shared baseline at `agents/<role>.md` applies. The `main` agent is always system-specific (no shared baseline) and lives at `rulesets/<system>/gm-agent.md`.

The output is `rulesets/<system>/agents.json` — a single envelope holding all six agent prompts that the user imports through Marinara's Import Agents dialog.

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

### state-mutator

Shared baseline at `agents/state-mutator.md`. Override at `rulesets/<system>/agents/state-mutator.md` when:

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

### state-reminder

Shared baseline at `agents/state-reminder.md`. Surfaces current PC state every turn so the GM doesn't drift. Override when:

- Your system has **computed maximums** the AI needs to see live (Exalted: `Personal Motes max = Essence × 3 + 10`). The override computes those formulas in its output.
- Your system has **multi-counter resources** to summarize (Exalted's typed damage display: `bashing 3 · lethal 2 · aggravated 0 (wound penalty -2)`).

A good override also includes a **field-name reminder** at the bottom — listing the canonical `field=` names the state-mutator accepts. Pairing this with the state-mutator's FORBIDDEN section means the model sees the right names from two angles every turn.

### combat-adjudicator

Shared baseline. Wakes only during combat (the prompt itself short-circuits with "No combat active." in social/ambient scenes). Override when:

- Your system has **non-trivial action economy** (Exalted's Withering / Decisive split, PbtA's "tell me how you want it" framing, Forged-in-the-Dark's position/effect interplay).
- Your system has **named maneuvers / stunts** (Pathfinder 2e's three-action economy, Mythic Bastionland's complications).

### lore-query

Shared baseline. Rarely overridden. Wakes only when the latest user message is a rules question (`"How does grappling work?"`, `"What's the DC for picking a lock?"`). Pulls answers from the installed lorebook + system RAW.

### npc-bookkeeper

Shared baseline. Rarely overridden. Tracks active NPC HP, conditions, tactical state across turns. Stays silent (`"No NPCs to track."`) outside combat or NPC-rich scenes.

## Default-disabled philosophy

All agents except `main` install **disabled by default**. Every additional pre-generation agent costs one model call per turn. The user explicitly enables only the ones they want. Bundle authors can opt a specific agent into enabled-on-install by setting `"enabled": true` in the agents.json entry — but the convention is leave it disabled unless the agent is truly load-bearing for the system.

The lorebook entry "Optional Sub-Agents — what they do and how to enable" exists in every shipped bundle so users can ask the in-engine chat about them.

## Building a new system's agents

The minimum:

1. Write `rulesets/<system>/gm-agent.md` (the main agent — always required).
2. Optionally drop overrides in `rulesets/<system>/agents/<role>.md` for any role that needs system-specific tuning.
3. Run `node tools/build-agents.mjs rulesets/<system>/` — produces `rulesets/<system>/agents.json`.

The user imports that `agents.json` via the Import Agents dialog. The dialog does delete-then-replace, so re-import after you edit the prompt files re-syncs cleanly without duplicates.

## Next

Read **03-RULESET-SCHEMA.md** for the data contract, then **05-AGENT-AUTHORING.md** for prompt-writing patterns specific to each role.
