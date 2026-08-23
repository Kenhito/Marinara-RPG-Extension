# 04 — Lorebook Format

The lorebook is a keyword-triggered rules reference the AI Game Master pulls into context **only when relevant** to the current narration. This is keyword-RAG: small per-turn budget, very precise. It's where deep-dive system rules live — the GM agent prompt covers the high-level pitch, the lorebook covers the encyclopedia.

A complete lorebook is one JSON file at `rulesets/<your-system>/lorebook.json`. The build tools embed it into the bundle envelope.

## File shape

```json
{
  "name": "Your System Reference",
  "description": "Keyword-triggered reference for <System>: core resolution, conditions, key powers, named maneuvers.",
  "category": "world",
  "scanDepth": 4,
  "tokenBudget": 1500,
  "recursiveScanning": false,
  "entries": [
    { ... },
    { ... }
  ]
}
```

Top-level fields:

| Field | Purpose | Default |
|---|---|---|
| `name` | Display name in Marinara's Lorebooks list | required |
| `description` | One-paragraph summary for the user | empty |
| `category` | Marinara categorizes lorebooks for filtering | `"world"` |
| `scanDepth` | How many recent messages to scan for keyword matches | `4` |
| `tokenBudget` | Max tokens this lorebook can inject per turn | `1500` |
| `recursiveScanning` | Whether matched-entry content is itself scanned for further matches | `false` |
| `entries` | Array of lorebook entries (see below) | required |

## Entry shape

```json
{
  "id": "yoursys-rules-resolution",
  "name": "Rule: Dice resolution",
  "keys": ["roll", "rolls", "check", "test", "dice"],
  "content": "Roll <X>d<Y>... <details of resolution mechanic>",
  "selective": false,
  "constant": false,
  "position": 0
}
```

| Field | Purpose | Default |
|---|---|---|
| `id` | Stable ID (kebab-case). **Stripped during bundle build** — Marinara assigns its own server-side IDs. The id in your source file is for human readability only. | optional |
| `name` | Entry title. Surfaces in the Lorebooks UI. | required |
| `keys` | Array of trigger substrings. Case-insensitive match against recent chat context. | required |
| `content` | The rule text itself. Injected into the model's context when any key matches. | required |
| `selective` | If true, ALL keys must match (AND logic). If false, ANY key matching triggers. | `false` |
| `constant` | If true, the entry is always in context (ignores keys). | `false` |
| `position` | Where the entry injects: `0` = before character defs (system context), `1` = after, `2` = depth-injected | `0` |

## Authoring patterns that work

### One entry per discrete rule

Don't combine "stress and consequences" into one entry — separate them. Each entry is roughly 50–300 words of factual rule. The marginal cost of an extra entry is near zero (Marinara skips non-matching ones); accuracy goes up sharply with more relevant entries available.

### Keys are case-insensitive substrings

Pick keys that the user or model would naturally type when the rule is relevant. For Fate aspects: `["aspect", "high concept", "trouble", "concept"]`. Aim for 2–5 keys per entry.

### Constant entries — use sparingly

Set `constant: true` for the dice resolution itself, the difficulty ladder, and core resource rules. The constant entries always burn token budget every turn, so 3–5 of them max — the rest should be keyword-triggered.

### Don't paraphrase the GM prompt

The GM agent prompt covers the high-level system pitch. The lorebook covers deep-dive rules reference. The model gets both at once, so duplication wastes the context budget.

## Recommended entry inventory for a complete ruleset

A full lorebook is typically **14–25 entries**. Coverage:

### Core mechanics (5–7 entries)

- Dice resolution itself
- Difficulty / target-number ladder
- Initiative / turn order
- Damage and healing model
- Resource economy (HP, Stamina, motes, Stress, Willpower, etc.)
- One entry per major *named subsystem* (e.g., Exalted's Anima Banner, Fate's Aspects, D&D's Concentration)

### Conditions and statuses (3–5 entries)

- The system's full named-condition list (Crashed, Onslaught, Prone, Stunned, Sealed, etc.)
- Saving throws / resists
- Healing rates and recovery rules

### Example powers / charms / spells (5–10 entries)

- The signature ability of each class / archetype
- A handful of representative spells / charms across the level range
- These let the model recognize names when the player invokes them

### Bestiary entries (2–3 entries)

- The system's mook / extra rules
- The system's elite / boss rules
- Faction-level groups if relevant (Shadowrun corps, Exalted Wyld Hunt)

### "Sub-Agents — what they do and how to enable them" entry

The framework convention. Surfaces all installed sub-agents to the user in-engine. The shipped bundles include this entry as the canonical exemplar — copy it verbatim from any reference bundle's `lorebook.json` (search for `"sub-agent"` in keys), only changing the system name in the surrounding text. Use this exact title — some older reference material in this project uses a slightly different wording ("Optional Sub-Agents — what they do and how to enable"); the dnd5e reference bundle's title is the canonical one.

## The bundle auto-derives additional entries — don't be surprised by the count

`tools/build-bundle.mjs` doesn't just copy your hand-authored `lorebook.json` entries into the bundle verbatim. It also runs `build-lorebook-expansions.mjs`, which derives one lorebook entry each from `ruleset.json`'s `attributes[]`, `skills[]`, `conditions[]`, and `derivedStats[]` (when they carry a description), plus a single difficulty-ladder reference entry — then merges the two entry sets. **Hand-authored entries win on a name collision**, so an entry you already wrote for, say, "Strength" simply overrides the auto-derived "Strength" entry rather than duplicating it.

This means the entry count in the built `bundle.json` is normally noticeably higher than what you wrote by hand — a **14–25 hand-authored** lorebook (this doc's recommended range, above) typically becomes **30–45 entries** in the final bundle once the derived attribute/skill/condition/derived-stat entries are added. That's expected, not a bug: it's how the framework closes keyword-coverage gaps (a player typing "wits" or "DC" gets a ruleset-accurate definition even if you never hand-wrote that specific entry) without requiring every author to hand-write 25+ mechanical-definition entries. You can see the hand-authored/derived split by running `node tools/build-bundle.mjs rulesets/<your-system>/` and reading its PASS line, which reports both counts (e.g. `43 entries [21 hand + 22 derived]`).

If you want to suppress or fully control the derived set for your ruleset, declare `ruleset.lorebookExpansions` as an explicit array — when present, the generator returns it verbatim instead of deriving anything.

## Sorcery-specific entries (when relevant)

If your system has a multi-turn casting subsystem (Exalted Shape Sorcery, Mage's Magic, Cypher's Cyphers), add **two** dedicated entries:

1. **Casting workflow rule** — the per-action mechanic the AI walks through. Keys like `["cast spell", "casting", "shape sorcery", "incantation"]`.
2. **Tiers / circles rule** — the system's progression tiers if any. Keys like `["spell tier", "circle", "level"]`.

These pair with the state-mutator override (see `05-AGENT-AUTHORING.md`) to make multi-turn casting actually work.

## Position semantics

`position: 0` (default) — entry text appears in the model's system-context block, before character definitions. Best for foundational rules (resolution, ladder).

`position: 1` — appears after character definitions. Best for entries that should reference the established characters (e.g., a faction entry that should color how the model narrates that faction once an active NPC has been introduced).

`position: 2` — depth-injected. The entry has an additional `depth` field declaring how many messages from the current turn it reaches into context.

Most entries use `0`. Use `1` and `2` only when you have a specific reason.

## Selective vs default match

`selective: false` (default) — any one key matching triggers. Good for keys that are clear topic signals.

`selective: true` — every key must match. Use for entries that should only fire in narrow contexts (e.g., a wound-recovery rule that should fire only when both `"wound"` and `"recover"` appear, not on either alone).

## ID stripping during build

The `tools/build-bundle.mjs` script **strips** the `id` field from every entry when packaging the bundle. Marinara assigns its own server-side IDs on install. Your source file's `id` is for your own organization (referencing entries from other docs, debugging).

## Validation

```bash
node tools/validate-bundle.mjs rulesets/<your-system>/bundle.json
```

The bundle validator catches lorebook entry shape errors (missing keys, missing content, wrong position type, etc.) and prints field paths to the offending entries.

## Next

Read **05-AGENT-AUTHORING.md** for prompt-writing patterns, then **06-BUILD-PIPELINE.md** to learn the CLI tools.
