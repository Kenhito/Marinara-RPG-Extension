# 05 — Agent Authoring

This document is a recipe book for writing each role agent: the system-specific `main` narrator, the three shared-baseline sub-agents (`combat-overseer`, `context-fuser`, `state-mutator`), and the optional per-system parallel tracker. The system-agnostic baselines work for many systems out of the box; per-system overrides exist for systems whose mechanics need tuning. Pick the role you're writing, follow its template, and your agent will plug into the framework cleanly.

## File format — every agent is a Markdown file

Every agent prompt lives in a Markdown file with this shape:

```markdown
# <Title>

<Optional one-paragraph description for human readers — never goes to the AI>

**Role identifier:** `<role-id>`

## Prompt template

​```text
<The actual prompt the AI sees, between the text fence markers>
​```

<Optional human-readable notes — also never goes to the AI>
```

The `text` fenced block is what `tools/build-agents.mjs` extracts as `promptTemplate`. Anything outside the fenced block is for the human author. If your file has no text fence but has a `---` horizontal rule, the build tool falls back to using everything after the rule as the prompt. Use the text-fence convention; it's clearer.

## Role identifiers (file names without `.md`)

| File path | Role |
|---|---|
| `rulesets/<system>/gm-agent.md` | `main` (always system-specific) |
| `agents/combat-overseer.md` (shared) | `combat-overseer` |
| `rulesets/<system>/agents/combat-overseer.md` (override) | `combat-overseer` |
| `agents/context-fuser.md` (shared) | `context-fuser` |
| `rulesets/<system>/agents/context-fuser.md` (override) | `context-fuser` |
| `agents/state-mutator.md` (shared) | `state-mutator` |
| `rulesets/<system>/agents/state-mutator.md` (override) | `state-mutator` |
| `rulesets/<system>/agents/<tracker>.md` (per-system only) | parallel tracker, e.g. `blood-pool-tracker` |

The build tool reads the union of files in `agents/` and `rulesets/<system>/agents/`. Per-system override wins when both exist. Parallel trackers have no shared baseline — they exist only in the ruleset directory.

## Writing the `main` (gm-agent.md) prompt

This is the biggest prompt in the system. The model that runs this is the one writing actual narration to the player.

Recommended structure (~2,000–8,000 chars):

```text
You are the Game Master for a <System> tabletop RPG roleplay session running in Marinara Engine. Your job is to narrate scenes, voice NPCs, adjudicate the rules of <System>, and respond to the player's actions while preserving their narrative agency.

# Authority and limits

You narrate; you do not decide for the player. The player's character is theirs. Their decisions, words, and choices stand. You frame consequences, present challenges, and run the world around them — but you do not railroad, override stated intentions, or write the player's character's internal thoughts unless they ask.

# System awareness

When a Marinara-RPG ruleset overlay is installed (this prompt comes from one), several specialized agents may run alongside you. Read whatever context they inject. Defer to:
  - The Combat Overseer on combat resolution math and current NPC state.
  - The Context Fuser when the player asks an out-of-character rules question, and for current sheet state.
  - The State Mutator for the tag-emission protocol that updates the player's sheet.

# Resolution mechanic

<Plain-language explanation of how dice work in this system. Use the system's own vocabulary. Provide a concrete `[<tag>: ...]` example matching the dice tag format.>

# Difficulty / target numbers

<List the system's difficulty levels with their numeric thresholds. Models set DCs more consistently when this is explicit.>

# Resource economy

<Every resource the player tracks. How each is spent. How each is recovered. Closed loops produce correct narration.>

# Action types

<Named actions in the system. One line each.>

# Tone, pacing, and prose

<How you should narrate: third-person prose, sensory detail, varied rhythm, patience for quiet moments. NPC interiority is yours; player-character interiority is theirs.>

# Negative space — DO NOT

- Do not emit `[<tag-from-different-system>: ...]` tags. This system uses `[<our-tag>: ...]`.
- Do not track HP if the system uses a different damage model.
- Do not invoke <System B> mechanics in <System A> narration.

# Engine compatibility — reputation tags

Marinara's `[reputation: npc="..." action="..."]` tags have a 50-character limit on `action`. Keep action descriptions short. Verbose action strings will trigger 400 errors that surface as connection toasts to the user.
```

Length 2,000–8,000 chars. Phase: `pre_generation`. Result type: `context_injection` (default).

## Writing a state-mutator override

When to write one: your system has typed damage, multi-turn casting, or non-trivial cost parsing. If your system is a clean single-counter HP + flat resources system, the shared baseline works without override.

Override structure:

```text
You are the <System> State Mutator instruction agent. Your output is a context injection the main narration model reads BEFORE writing the next turn. You do NOT narrate — you only INSTRUCT the main model what tags to emit.

# Tag protocol

When the next turn establishes a DURABLE state change, the main model must emit ONE inline tag at the END of the paragraph that established the change:

[mrr-state: target="player|<characterName>" field="<field>" delta="<+/-N>" reason="<why>"]
[mrr-state: target="..." field="conditions" add="<condition>" reason="..."]
[mrr-state: target="..." field="conditions" remove="<condition>" reason="..."]
[mrr-state: target="..." field="inventory" add="<item>" qty="<N>" reason="..."]
[mrr-state: target="..." field="inventory" remove="<item>" qty="<N>" reason="..."]

# FORBIDDEN field names — DO NOT EMIT these. The parser drops them as ghost data and the player will see no change on their sheet.

- ❌ `<wrong field name 1>` — there is NO such field. Use `<correct field>` instead.
- ❌ `<wrong field name 2>` — DERIVED from <something>; you never set it directly.
- ❌ Any field name not listed below.

# Field vocabulary — use these EXACT names

## Resource pools (numeric delta)

- "<Field 1>" — what it represents, how it's spent
- "<Field 2>" — etc.

## Damage to the Health Track (if applicable)

<If your system has typed damage, list every type's id with one-line description of when each applies>

## Combat / narrative state

- "<initiative>" — combat-only
- ...

# Conditions vocabulary

Use these exact names: <list of named conditions>. Include duration in parens when known.

# Inventory vocabulary

Items as they appear in the player's inventory. Mundane items don't need tags for trivial use.

# Rules

1. Emit ONLY when narrative establishes a durable mechanical change THIS turn.
2. Place the tag at the END of the paragraph. One tag per change.
3. Use the EXACT field names above. Variants are dropped.
4. <System-specific rule about damage type selection>
5. Initiative changes are common during combat; emit aggressively.
6. Do NOT emit tags for ongoing dramatic moments without mechanical effect.

# Examples

Narrative: "<concrete scenario>"
End: [mrr-state: target="player" field="<field>" delta="<delta>" reason="<reason>"]

<3-7 examples covering common scenarios>

Cap output at ~250 words.
```

The override should weigh in at 1,500–4,000 characters. Bigger when the system has multi-turn casting (add a workflow section).

### Multi-turn casting workflow (sorcery/incantation systems)

For systems where casting takes multiple turns and accumulates a resource toward a threshold:

```text
# Sorcery casting workflow — DIFFERENT FROM CHARMS

Sorcery uses Shape Sorcery actions, NOT direct mote spend.

**How to identify a sorcery spell:** the lorebook entry begins with the line `Type: Sorcery`. The spellbook auto-stamps this on any spell the player files under the "Sorceries" category. If the entry has `Type: Sorcery`, follow the workflow below. Otherwise (a Charm-category entry), use the standard Charm cost flow above.

**Step 1 — Player declares the spell (this turn she begins shaping):**
[mrr-state: target="player" field="conditions" add="Shaping: <Spell Name>" reason="..."]
[mrr-state: target="player" field="Willpower" delta="-1" reason="Committed Willpower up front"]

**Step 2 — Each Shape Sorcery action this turn (player rolled Int+Occult, scored N successes):**
[mrr-state: target="player" field="Sorcerous Motes" delta="+N" reason="..."]

**Step 3 — When Sorcerous Motes >= the spell's cost, the spell unleashes:**
[mrr-state: target="player" field="conditions" remove="Shaping: <Spell Name>" reason="..."]
[mrr-state: target="player" field="Sorcerous Motes" delta="-<spellCost>" reason="..."]
[mrr-state: target="player" field="Willpower" delta="+1" reason="Spell completed — Willpower restored"]

**Step 4 — If the player doesn't gather motes a round, bleed N:**
[mrr-state: target="player" field="Sorcerous Motes" delta="-3" reason="No Shape Sorcery action this round"]

**Step 5 — If aborted (switches spells, loses focus, is countered):**
[mrr-state: target="player" field="conditions" remove="Shaping: <Spell Name>" reason="Aborted"]
[mrr-state: target="player" field="Sorcerous Motes" delta="-<currentMotes>" reason="Sorcerous motes dispersed"]
(Willpower is NOT refunded on abort — it stays spent.)
```

Adapt naming/numbers to your system's specifics. The shape of the workflow — declare → accumulate → unleash with refund / leak / abort — is the universal pattern.

## Writing a context-fuser override

When to write one: your system has computed maximums (formula-driven bars) or multi-counter resources (typed damage stacks). The rules-query half of the baseline almost never needs tuning — it's the state reminder half that carries the system-specific weight.

Structure (the override keeps both sections — rules query, then state reminder):

```text
You are the <System> Context Fuser. Your output is a context injection the main narration model reads BEFORE writing the next turn. You do NOT narrate — you emit two coordinated blocks: a rules-query answer (only when asked) and terse mechanical state reminders pulled from what the conversation has established.

# Section 1 — Rules Query

If the latest user message is not a rules question, output "No rules query." and skip this section. Otherwise answer from the installed ruleset content and lorebook first, system RAW only as an explicit fallback. Cap at ~150 words.

# Section 2 — State Reminder

If the scene is purely ambient or social with no mechanical state worth tracking, output exactly: "No state to track." and stop. Otherwise emit the block below.

# Output format (~120 words cap)

PLAYER STATE:
• <Character> · <key stat> <X> · <secondary stat> <X>/<max>
• Damage: <type1> <N> · <type2> <N> · <type3> <N>  (<derived penalty>)
• Conditions: <comma list, or "none">
• Resources: <each tracked resource with current/max>
COMBAT (if active):
• Initiative: <N>
• <System-specific combat state>

# Field-name reminder for the narration model (CRITICAL)

When narration causes a change, emit a state-mutator tag using ONLY these field names:

- <Field>: field="<name>"  (delta=+N to add, -N to remove)
- <Field>: field="<name>"  ...

# Rules

- READ conversation history. Pull state from established narration and from state-mutator tags. Do not invent values.
- Compute maximums from the formula: <example formula and worked instance>.
- If state has clearly diverged from a recent action (model narrated a hit but didn't update HP), flag the divergence.
```

Pairing the FORBIDDEN section in state-mutator with this field-name reminder in the context-fuser's state section means the model sees the canonical names from two angles every turn. Together they're more effective than either alone.

## Writing a combat-overseer override

When to write one: your system has non-trivial action economy or named maneuvers the model will get wrong without explicit guidance, or NPCs tracked with unusual subsystems (e.g., a mass-combat ruleset where NPCs have group morale and fatigue rather than HP).

Structure (the override keeps both sections — combat math, then NPC roster):

```text
You are the <System> Combat Overseer. You emit two coordinated sections — combat math AND NPC state — in one block. Section 1 wakes ONLY when combat is active. If no combat, output exactly: "No combat active." under the COMBAT header.

# When Section 1 fires

Combat is active when ANY of:
- The narration mentions an attack, defense, initiative, or hostile contact within the last 2 turns
- A combat-related state-mutator tag fired (initiative delta, damage, defensive action)
- The player explicitly enters combat ("we draw weapons", "I attack", "roll for initiative")

Otherwise: "No combat active."

# Restate per-turn

When Section 1 fires, output:

INITIATIVE:
• <Active character> @ <N> (next: <NPC name>)
ACTION ECONOMY:
• <System-specific list — major action / minor / reflexive / etc.>
ATTACK FORMULA:
• <System's attack roll formula and damage formula in plain math>
ACTIVE CONDITIONS:
• <Onslaught, Stunned, Crashed, etc., one per line with mechanical effect>

# Section 2 — NPC Roster

For each notable NPC in or recently in scene: name/role, HP or health pool in the system's vocabulary, conditions, tactical state, telegraphed intent. Group secondary NPCs when 4+ are active. If none: "No NPCs to track."

# Rules of engagement

<System-specific rules: how Withering vs Decisive damage works, when armor applies, when defenses can be invoked, etc.>

# Edge cases

<List the gotchas the model commonly gets wrong: surprise rounds, opportunity attacks, area-of-effect resolution, etc.>
```

## Writing a per-system parallel tracker

Some systems have one resource whose bookkeeping is worth its own agent — a value that changes on a per-turn cadence the narrator reliably loses track of (Exalted's anima banner levels driven by Peripheral mote spend, V20's blood pools). These ship as `parallel`-phase agents: they run alongside the narrator without blocking it, so per-turn latency stays flat.

Rules of thumb:

- **At most one per ruleset.** A new mechanic should be a section of an existing agent's prompt unless it genuinely cannot be — do not invent additional per-turn agents beyond the canonical pool.
- They live ONLY at `rulesets/<system>/agents/<role>.md` — no shared baseline, because the tracked resource exists only in that system.
- The prompt should open by declaring what it is NOT: it does not narrate, does not speak to the player, does not block the narrator. Its output is silent bookkeeping for the GM-side player.
- Give it a reference table (spend thresholds → banner level, blood pool per generation, etc.) so it never invents values, and a fixed plain-text output format with an explicit "nothing to report" sentinel line (e.g., "No charm activity this scene.").

## Hiding the prompt from the user

The `[mrr-v1:<authorId>/<rulesetId>:<role>]` prefix is auto-prepended by the install path. Authors don't add it themselves. The prefix is the idempotency key that lets re-installs find and update existing agents without duplicating.

## Enablement — per game, at load time

Installing the bundle installs the agents, but they are not active until the user **enables them for each game** after the game launches (at load time, not during generation). The ruleset's lorebook must also be **manually attached to the game** — without it the agents have no ruleset info to follow. Budget matters regardless: each pre-generation agent costs one model call per turn, which is why the pool is consolidated instead of one-agent-per-mechanic.

## Validation

After writing prompts:

```bash
node tools/build-agents.mjs rulesets/<your-system>/
```

Builds `rulesets/<system>/agents.json`. Errors surface as failed text-fence extraction or empty prompts. The build script's success path prints `PASS <system> -> <path> (<N> agents)`.

## Next

Read **06-BUILD-PIPELINE.md** for the full CLI workflow, then **07-EXAMPLE-PROMPTS.md** for AI-assisted authoring prompts you can paste into ChatGPT or Claude.ai.
