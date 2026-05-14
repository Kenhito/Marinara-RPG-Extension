# 05 — Agent Authoring

This document is a recipe book for writing each of the six role agents. The system-agnostic baselines work for many systems out of the box; per-system overrides exist for systems whose mechanics need tuning. Pick the role you're writing, follow its template, and your agent will plug into the framework cleanly.

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
| `agents/state-mutator.md` (shared) | `state-mutator` |
| `rulesets/<system>/agents/state-mutator.md` (override) | `state-mutator` |
| `agents/state-reminder.md` (shared) | `state-reminder` |
| `rulesets/<system>/agents/state-reminder.md` (override) | `state-reminder` |
| `agents/combat-adjudicator.md` (shared) | `combat-adjudicator` |
| `rulesets/<system>/agents/combat-adjudicator.md` (override) | `combat-adjudicator` |
| `agents/lore-query.md` (shared) | `lore-query` |
| `agents/npc-bookkeeper.md` (shared) | `npc-bookkeeper` |

The build tool reads the union of files in `agents/` and `rulesets/<system>/agents/`. Per-system override wins when both exist.

## Writing the `main` (gm-agent.md) prompt

This is the biggest prompt in the system. The model that runs this is the one writing actual narration to the player.

Recommended structure (~2,000–8,000 chars):

```text
You are the Game Master for a <System> tabletop RPG roleplay session running in Marinara Engine. Your job is to narrate scenes, voice NPCs, adjudicate the rules of <System>, and respond to the player's actions while preserving their narrative agency.

# Authority and limits

You narrate; you do not decide for the player. The player's character is theirs. Their decisions, words, and choices stand. You frame consequences, present challenges, and run the world around them — but you do not railroad, override stated intentions, or write the player's character's internal thoughts unless they ask.

# System awareness

When a Marinara-RPG ruleset overlay is installed (this prompt comes from one), several specialized agents may run alongside you. Read whatever context they inject. Defer to:
  - The Combat Adjudicator on combat resolution math.
  - The Lore Query Helper when the player asks an out-of-character rules question.
  - The State Reminder for current sheet state.
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

## Writing a state-reminder override

When to write one: your system has computed maximums (formula-driven bars) or multi-counter resources (typed damage stacks).

Structure:

```text
You are the <System> State Reminder. Your output is a context injection the main narration model reads BEFORE writing the next turn. You do NOT narrate — you only emit terse mechanical reminders pulled from what the conversation has established.

# When to fire

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

Pairing the FORBIDDEN section in state-mutator with this field-name reminder in state-reminder means the model sees the canonical names from two angles every turn. Together they're more effective than either alone.

## Writing a combat-adjudicator override

When to write one: your system has non-trivial action economy or named maneuvers the model will get wrong without explicit guidance.

Structure:

```text
You are the <System> Combat Adjudicator. You wake ONLY when combat is active. If no combat, output exactly: "No combat active." and stop.

# When you fire

Combat is active when ANY of:
- The narration mentions an attack, defense, initiative, or hostile contact within the last 2 turns
- A combat-related state-mutator tag fired (initiative delta, damage, defensive action)
- The player explicitly enters combat ("we draw weapons", "I attack", "roll for initiative")

Otherwise: "No combat active."

# Restate per-turn

When you fire, output:

INITIATIVE:
• <Active character> @ <N> (next: <NPC name>)
ACTION ECONOMY:
• <System-specific list — major action / minor / reflexive / etc.>
ATTACK FORMULA:
• <System's attack roll formula and damage formula in plain math>
ACTIVE CONDITIONS:
• <Onslaught, Stunned, Crashed, etc., one per line with mechanical effect>

# Rules of engagement

<System-specific rules: how Withering vs Decisive damage works, when armor applies, when defenses can be invoked, etc.>

# Edge cases

<List the gotchas the model commonly gets wrong: surprise rounds, opportunity attacks, area-of-effect resolution, etc.>
```

## Writing the lore-query agent

Almost never needs an override. The shared baseline pulls answers from the installed lorebook. Override only if your system has unusually complex rules-question routing (e.g., distinguishing "tactical question" → combat-adjudicator from "system question" → lore-query).

## Writing the npc-bookkeeper agent

Almost never needs an override. The shared baseline tracks NPC HP and conditions across turns. Override if your system tracks NPCs with unusual subsystems (e.g., a mass-combat ruleset where NPCs have group morale and fatigue rather than HP).

## Hiding the prompt from the user

The `[mrr-v1:<authorId>/<rulesetId>:<role>]` prefix is auto-prepended by the install path. Authors don't add it themselves. The prefix is the idempotency key that lets re-installs find and update existing agents without duplicating.

## Default-disabled philosophy

Every role agent except `main` ships **disabled by default**. Each pre-generation agent costs one model call per turn. Users explicitly enable only what they want. The convention is to leave them disabled in the agents.json output unless the system's mechanics genuinely require an agent to be on (rare).

## Validation

After writing prompts:

```bash
node tools/build-agents.mjs rulesets/<your-system>/
```

Builds `rulesets/<system>/agents.json`. Errors surface as failed text-fence extraction or empty prompts. The build script's success path prints `PASS <system> -> <path> (<N> agents)`.

## Next

Read **06-BUILD-PIPELINE.md** for the full CLI workflow, then **07-EXAMPLE-PROMPTS.md** for AI-assisted authoring prompts you can paste into ChatGPT or Claude.ai.
