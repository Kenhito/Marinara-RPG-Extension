# 01 — Overview

This is the **Marinara-RPG-Extension** for Marinara Engine's Game Mode. It overlays a custom RPG ruleset onto the engine's AI Game Master without modifying the engine source. You can build a ruleset for **any** tabletop RPG — D&D, Exalted, Pathfinder, GURPS, Call of Cthulhu, anything with dice and stats — and the extension runs it.

This document set is meant to be fed to an AI assistant (ChatGPT, Claude.ai, Gemini, any chat AI) so the AI can author a complete ruleset bundle for a new system. The system-agnostic design is the central contract: nothing in the framework hard-codes D&D or Exalted assumptions. Each system declares its own attributes, skills, dice mechanic, resources, damage types, and sorcery / charm / spell rules.

## What gets produced for a complete ruleset

A working ruleset is exactly **three source files** plus optional **per-ruleset agent overrides**:

| File | Purpose | System-specific? |
|---|---|---|
| `ruleset.json` | Schema-validated declaration: id, dice, resolution mode, attributes, skills, derived stats (HP / motes / Willpower), states, damage types, ability categories | Yes |
| `gm-agent.md` | The system prompt the main AI Game Master follows for this system | Yes |
| `lorebook.json` | Keyword-triggered rules reference the model pulls into context | Yes |
| `agents/<role>.md` (optional) | Per-system override of any role agent (combat-overseer, context-fuser, state-mutator), or a per-system `parallel`-phase tracker. Overrides fall back to the shared baseline at the repo root's `agents/<role>.md` when absent; parallel trackers have no shared baseline. | Optional |

From these source files, two CLI tools produce the user-facing artifacts:

- `bundle.json` — single-file envelope users paste into the extension (built by `tools/build-bundle.mjs`)
- `agents.json` — agent collection users import via the Import Agents dialog (built by `tools/build-agents.mjs`)

A user installs your ruleset by:

1. Pasting the framework JS into Marinara's Extensions panel (one-time, system-independent)
2. Pasting your `bundle.json` into Marinara's Ruleset dialog
3. Pasting your `agents.json` into Marinara's Import Agents dialog
4. Launching a game, attaching the ruleset lorebook to that game, and enabling the MRR agents for it — agents are enabled per game at load time (not during generation); without the attached lorebook the agents have no ruleset info to follow

## The system-agnostic agent architecture

The framework ships a consolidated pool: the `main` narrator (system-specific by design) plus three shared-baseline sub-agents that work for any system, with two optional per-system additions.

| Role | Purpose | Default scope |
|---|---|---|
| `main` (gm-agent) | The actual Game Master narrator. Rolls dice, narrates outcomes, manages encounters. | **System-specific** — every ruleset writes its own. |
| `combat-overseer` | Pre-generation. Wakes during combat to restate initiative, attack/damage formula, action economy in the active system's terms — AND tracks active NPC HP, conditions, and tactical state, both surfaces in one output. | Shared baseline; system-specific override common. |
| `context-fuser` | Pre-generation. Answers rules questions when the user asks one (from the lorebook + system RAW) AND surfaces current sheet state each turn so the GM doesn't forget HP / motes / conditions — both in one output. | Shared baseline; per-system override useful for systems with computed bars (e.g., Mote pool max = Essence × 7 + 26). |
| `state-mutator` | Pre-generation. Instructs the GM to emit hidden `[mrr-state: ...]` tags whenever narration changes a sheet (HP loss, motes spent, condition gained, item taken). The extension parses tags and updates the sheet — this is the only sheet writer. | Shared baseline; per-system override recommended for systems with typed damage or non-trivial resource economies. |
| `pre-input-transformer` *(optional)* | Pre-generation. Translates D&D-flavored player input ("I roll Strength") into the ruleset's own vocabulary before generation. | Derived from `ruleset.json` `vocabularyHints[]`; omitted from bundles that don't need it. |
| Per-system `parallel` tracker *(optional, at most one per ruleset)* | Parallel phase. Tracks a system-specific resource alongside the narrator without blocking it (e.g., Exalted anima banners, V20 blood pools). | Per-system only — no shared baseline; the tracked resource exists only in that system. |

**The override pattern is a file-system fallback.** When the build-agents tool packages your ruleset's agents, it looks for `rulesets/<your-system>/agents/<role>.md` first. If that file exists, it's the prompt for that role in your system. If not, the shared baseline at `agents/<role>.md` (repo root) is used. This means:

- A small ruleset can ship with **zero** per-system agent overrides and still get the full agent pool working.
- A complex system (Exalted, with typed damage, sorcery, combat tempo) overrides the role agents that matter and inherits the rest.
- Adding a new override is just dropping a `.md` file at the right path.

## How a user builds their own system with AI assistance

The release zip you're reading exists so a user can hand all this to a chat AI and get a working ruleset back. Three usage patterns:

### Pattern A — AI reads the GitHub repo directly

If your AI platform supports browsing or repo ingestion (Claude.ai with the GitHub URL, ChatGPT with web browsing, Gemini, etc.), give it:

> Read the repo at `github.com/Kenhito/Marinara-RPG-Extension`. The directory `releases/v0.4.1/docs-for-ai/` contains the build documentation. The directory `releases/v0.4.1/examples/` contains two complete working examples (D&D 5e and Exalted 3e). Build me a ruleset bundle for **<your target system>**, including ruleset.json, gm-agent.md, lorebook.json, and any per-system agent overrides under `rulesets/<system>/agents/`. Match the file shapes shown in the examples exactly.

### Pattern B — AI can't browse but accepts file uploads

Extract the release zip locally. Upload the `docs-for-ai/` folder and the `examples/` folder to the AI. Ask it to build your system using those as reference.

### Pattern C — Manual authoring

Read the docs in numerical order:

1. **01-OVERVIEW.md** (this file) — orientation
2. **02-AGENTS-SYSTEM-AGNOSTIC.md** — the agent role catalog and override pattern
3. **03-RULESET-SCHEMA.md** — every field in `ruleset.json`, with examples
4. **04-LOREBOOK-FORMAT.md** — lorebook entry shape and keyword triggers
5. **05-AGENT-AUTHORING.md** — how to write each role's prompt
6. **06-BUILD-PIPELINE.md** — the CLI tools and what they produce
7. **07-EXAMPLE-PROMPTS.md** — copy-pasteable prompts for AI-assisted authoring

Then write your three source files plus any overrides, run the build tools, and import the result into Marinara.

## Versioning

Framework JS, bundle envelope schema, and the agents.json envelope schema each have their own version. The extension's `package.json` carries the framework version (currently `0.4.0`); the bundle declares its `minExtensionVersion` so older framework JS won't try to parse a newer bundle.

Per-ruleset `version` in `ruleset.json` is independent — that's the version of YOUR data file, not the framework. Bump it when you ship updates to your ruleset.

## What this overlay can NOT do

- **Replace Marinara's combat-encounter modal.** That modal is server-coded with hardcoded D&D-style six-attribute stat blocks. Combat narration (chat-based) uses your system's vocabulary; the modal stays d20-shaped. Recommend players use narrative combat for non-d20 systems.
- **Persist sheets server-side under arbitrary attribute names.** Marinara's `PlayerStats.attributes` is typed to STR/DEX/CON/INT/WIS/CHA. Sheets live in browser localStorage instead. The framework provides save/load JSON files for portability between devices.
- **Modify the engine source.** Everything is overlay: client JS extension, JSON ruleset specs, Markdown agent prompts. If a feature seems to require engine modification, it's out of scope.

## Next

Read **02-AGENTS-SYSTEM-AGNOSTIC.md** to understand the agent architecture, then **03-RULESET-SCHEMA.md** to learn the data contract.
