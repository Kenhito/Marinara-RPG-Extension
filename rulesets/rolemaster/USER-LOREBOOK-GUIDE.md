# Building your own Rolemaster lorebook

This bundle ships mechanics and terminology only — how to resolve a check, an attack, a resistance roll, a casting attempt. It deliberately does **not** ship professions, training packages, talents, flaws, spell lists, races, or any setting content. That's not a gap to be filled later; it's the design. Rolemaster has hundreds of pages of exactly that content, and it's under Iron Crown Enterprises' copyright — a fan-made data file can carry mechanics and terminology, but not the book's professions, spell descriptions, or races. **You bring that half in your own lorebook**, attached to the same game alongside this ruleset's `lorebook.json`.

The contract, stated once: our ruleset and agents supply *how to resolve anything*. Your lorebook supplies *what exists in your game*. Neither needs the other to be complete, and the GM agent is written to degrade gracefully when your half is thin or absent — it asks the player rather than inventing content.

## 1. Keyword conventions — avoid colliding with ours

Our entries claim the `rm-` id prefix and the mechanics vocabulary in the L01-L21 key lists documented inside `lorebook.json` (open-ended, result bands, difficulty, unmodified rolls, static/moving maneuvers, OB/DB, armor types, criticals, hits, bleeding, stun, exhaustion, resistance rolls, power points). **Your entries should not reuse those keys** — an entry you key on `critical` competes with our `rm-criticals` entry for the same scan and token budget. Use a different prefix and a more specific key set:

| Your content | Suggested id prefix | Key pattern |
|---|---|---|
| Professions / classes | `prof-` | the profession name + "profession", "class" |
| Spell lists | `list-` | the list name + "spell list" |
| Individual spells | `spell-` | the spell name only |
| Races | `race-` | the race name |
| Setting, factions, places | `world-` | proper nouns |
| House rules | `house-` | the mechanic name + "house rule" |

## 2. What the GM agent assumes exists — and skips gracefully when it doesn't

Our `gm-agent.md` is written to treat all of the following as *optional*, and to narrate around their absence rather than inventing them:

| Assumed-if-present | Agent behavior when absent |
|---|---|
| Profession data | Never asserts a profession's abilities; asks the player what their character can do. |
| Spell lists and spell effects | Resolves casting *procedurally* (PP cost = spell level, a casting static maneuver, an RR if the spell allows one) without claiming to know the spell's actual effect; asks the player to state it. |
| Race data | Uses the sheet's numbers as given; no racial modifiers asserted. |
| Attack / critical / fumble table data | Says it's estimating, states the estimate, and invites you to read the real result from your own copy of the book. |
| Setting, deities, geography | Improvises only what you've already established in play; never asserts canon. |

If none of your lorebook is attached, the game still runs — mechanically honest, narratively generic. The more you add, the more specific it gets.

## 3. What a lorebook entry needs to interoperate

**For a spell**, give the agent enough to resolve it procedurally and describe its effect: name, list, level, PP cost, range, duration, whether it allows a Resistance Roll and against which realm, and the effect in one or two sentences. Example shape:

```
Name: Fire Bolt
Content: Fire Law, Open list, level 3. PP cost 3. Range 100'. Attack spell —
resolve as a Directed Spells attack roll vs. the target's DB, no RR.
Effect: a bolt of flame; on a hit, deals fire damage per the attack table's
Fire Bolt critical.
```

**For a profession**, give name, prime stats, and which skill categories are cheap — nothing about development-point costs, which the agent never adjudicates (advancement is out of this bundle's scope entirely).

**For a critical table excerpt** you want the agent to apply directly, express it in the same vocabulary our state tags use (`gm-agent.md` §"State-tag vocabulary"): severity letter, effect in hits, bleeding per round, stun rounds, and any activity penalty. That lets the agent emit `[mrr-state: ...]` deltas straight from your entry instead of estimating.

## 4. House rules win

If a `house-` entry states a rule that contradicts one of ours, **your house rule wins**, and the GM agent is instructed to say which rule it applied when the two would have disagreed. This is the honest answer for a 25-year-old system where nearly every table has accumulated its own variants (the Hits-maximum ambiguity this bundle documents in its own `ruleset.json` — worked-example convention vs. the printed sheet's variant — is exactly the kind of thing a `house-` entry should settle for your table).

## 5. Budget hygiene

Our lorebook spends a modest token budget (1500) across 21 entries. If you're attaching several hundred spell or profession entries, raise `tokenBudget` on **your own** lorebook file rather than ours, keep `constant: false` on everything you add, and key each spell by the spell's name alone so ordinary narration doesn't drag your whole grimoire into context on every turn. A lorebook that fires every entry every turn defeats the point of keyword scanning — it was the mistake the original fan-made Rolemaster data file made by transcribing hundreds of skill and table entries verbatim; don't repeat it at spell-list scale.

## 6. Where the mechanics-only lorebook lives

This ruleset's own reference lorebook is `lorebook.json` in this folder — 21 entries, `rm-` prefixed, mechanics and terminology only. Attach both files to your game: ours for *how*, yours for *what*.
