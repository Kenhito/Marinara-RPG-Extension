# Build Your Own Ruleset

Want to play GURPS, Cyberpunk RED, Mörk Borg, Vampire: The Masquerade, or any other tabletop RPG in Marinara? You can build a complete ruleset bundle yourself, with or without AI assistance, using the documentation in this download.

This guide walks you through three options. Pick whichever matches your tools and comfort level.

> **1.0.0 is self-contained.** This release ships `tools/`, `schema/`, `agents/`, and `package.json` inside the release zip. After extracting, run `bun install` (or `npm install`) once to pull Ajv and other build dependencies — then the validators and build tools run from inside this directory without cloning the repo. Cloning the repo is still encouraged for in-engine testing and contributing back, but offline validation works out of the box. These tools are a **1.0.0 snapshot**; the repo HEAD may have newer versions.

## Option A — AI-assisted (recommended for most users)

You'll have a chat AI like ChatGPT, Claude.ai, or Gemini author the ruleset for you. The AI reads the docs and examples in this download (or in the GitHub repo), then produces complete ruleset files you save to disk and run through the build tools.

This works because every modern chat AI can:

- Read documentation files you upload or paste
- Follow file-shape examples
- Produce structured output (JSON, Markdown) at length

You **don't need to know how to code** to make this work. You do need to know your target RPG system well enough to answer the AI's clarifying questions about its dice mechanic, attributes, damage model, and resource economy.

### A.1 — If your AI can browse the web (Claude.ai, ChatGPT with browsing, Gemini, Perplexity)

Open the AI's chat interface and paste this:

```
I want to build a Marinara-RPG-Extension ruleset for <YOUR SYSTEM HERE>.

The framework lives at: https://github.com/Kenhito/Marinara-RPG-Extension

The build documentation is in:
  releases/1.0.0/docs-for-ai/01-OVERVIEW.md through 07-EXAMPLE-PROMPTS.md
  (read all seven in order)

Two complete worked examples are in:
  releases/1.0.0/examples/exalted3e/  (complex: typed damage, multi-turn sorcery, three agent overrides)
  releases/1.0.0/examples/dnd5e/      (simpler: single-roll d20, one agent override)

Please read all seven docs, skim both example folders, then produce a complete ruleset folder for <YOUR SYSTEM>:

  rulesets/<system-id>/ruleset.json
  rulesets/<system-id>/gm-agent.md
  rulesets/<system-id>/lorebook.json
  rulesets/<system-id>/INSTALL.md
  rulesets/<system-id>/agents/<role>.md   (only for the role agents that need system-specific tuning;
                                            leave the rest as shared baseline inheritance)

Walk me through your choices about resolution mode, attribute model, damage system, named conditions, and which agents you chose to override.

Use only the five existing resolution modes: single-roll, dice-pool, d100-percentile, 2d6-stat, fate-ladder. If <YOUR SYSTEM>'s dice math doesn't fit any of these, tell me before producing files — adding a new resolution mode requires extending the framework JavaScript.

Match the JSON schema in 03-RULESET-SCHEMA.md exactly. Use the system's own vocabulary throughout. Mechanics references only — no verbatim text from published books. narrator prompt 2,000-8,000 chars. Lorebook 14-25 entries.
```

Replace `<YOUR SYSTEM HERE>` with the actual system name. The AI will read the repo, ask clarifying questions, and produce files for you to save.

### A.2 — If your AI can't browse but accepts file uploads

Some AIs (the free ChatGPT tier, certain enterprise deployments) can't reach the web but can accept uploaded files. In that case:

1. Extract this download zip onto your computer.
2. Upload these files to the AI:
   - All seven `.md` files in `docs-for-ai/`
   - The entire `examples/exalted3e/` folder
   - The entire `examples/dnd5e/` folder
3. Paste this prompt:

```
I've uploaded the documentation and two example rulesets for the Marinara-RPG-Extension framework. Read the seven numbered .md files in order. Skim both example folders.

Now build me a complete ruleset for <YOUR SYSTEM>. Produce:
  - ruleset.json
  - gm-agent.md
  - lorebook.json
  - INSTALL.md
  - agents/<role>.md per-system overrides for ONLY the roles that need system-specific tuning

Match the schema exactly. Use the system's own vocabulary. Mechanics references only. 2,000-8,000 char narrator prompt. 14-25 lorebook entries. Include the "Optional Sub-Agents" lorebook entry: **copy the structure** from one of the example bundles, **but use the chat-tag prefix your target extension actually emits** — RP-mode uses `mrr-` (e.g. `[mrr-state: …]`, agents named `MRR: <System> — <Role>`); GM-mode uses `mrr-` (e.g. `[mrr-state: …]`, `MRR: <System> — <Role>`). Do not copy verbatim across extension types — the agent-name reference inside the lorebook entry must match the prefix that ships with this release.

Walk me through your design decisions before producing the files. Ask clarifying questions if any system mechanics are ambiguous.
```

### A.3 — Multi-step controlled flow (for fine control over voice and flavor)

If you want the AI to author one piece at a time so you can review each before moving on, use the prompts in `docs-for-ai/07-EXAMPLE-PROMPTS.md` "Prompt C — Multi-step controlled authoring". Six prompts walk you through resolution mode → ruleset.json → gm-agent → lorebook → agent overrides → INSTALL.md.

This is slower but produces better files for complex systems where the AI's first pass tends to drift.

### A.4 — When the AI's done

You'll have files like:

```
rulesets/your-system/
├── ruleset.json
├── gm-agent.md
├── lorebook.json
├── INSTALL.md
└── agents/
    ├── state-mutator.md           (only if your system needed this override)
    └── combat-overseer.md          (etc. — overrides of the shared pool, or a per-system parallel tracker)
```

Save those files into a clone of the [Marinara-RPG-Extension](https://github.com/Kenhito/Marinara-RPG-Extension) repo (or a fork of it). Then run the build tools:

```bash
cd Marinara-RPG-Extension
node tools/validate-ruleset.mjs rulesets/your-system/ruleset.json
node tools/build-bundle.mjs rulesets/your-system/
node tools/build-agents.mjs rulesets/your-system/
```

Two artifacts matter for install:

- `rulesets/your-system/bundle.json` — import via the extension's Ruleset dialog (**Choose file…**). This one file installs the sheet config, lorebook, GM agent, and sub-agents.
- The extension package `Marinara-RPG-Extension.extension.zip` — imported ONCE via Marinara's **Settings → Addons → External Extensions** (system-independent — the same install serves every ruleset; requires engine 2.4.3+ with the import gates enabled).

(`agents.json` is also produced for toolchain parity; GM-mode users don't need it — the bundle carries the agents.)

Then follow `INSTALL-GUIDE.md` to load them into Marinara — including the per-game steps: attach the lorebook to your game and enable the agents after launch.

## Option B — Manual authoring (no AI)

You can write the files by hand. The seven docs in `docs-for-ai/` are the canonical reference.

Read them in order:

1. **01-OVERVIEW.md** — what the framework does and how the pieces fit together
2. **02-AGENTS-SYSTEM-AGNOSTIC.md** — the six-agent architecture and per-system override pattern
3. **03-RULESET-SCHEMA.md** — every field in `ruleset.json` with examples
4. **04-LOREBOOK-FORMAT.md** — lorebook entry shape and authoring patterns
5. **05-AGENT-AUTHORING.md** — how to write each role's prompt (skip if you're not overriding any)
6. **06-BUILD-PIPELINE.md** — the CLI tools (validate-ruleset, build-bundle, build-agents)
7. **07-EXAMPLE-PROMPTS.md** — skip this one (it's for AI authoring)

Then:

1. Copy one of the example folders as your starting point:
   - `cp -R examples/dnd5e rulesets/your-system` for a single-roll d20-style system
   - `cp -R examples/exalted3e rulesets/your-system` for a dice-pool / Storyteller-style system
2. Edit `ruleset.json` to declare your system's attributes, skills, derived stats, dice mechanic.
3. Edit `gm-agent.md` to describe your system's voice, mechanics, and resource economy.
4. Edit `lorebook.json` to add 14-25 rules-reference entries for your system.
5. Optionally write per-system agent overrides in `agents/<role>.md` if your system has typed damage, multi-turn casting, or unusual combat structure. For most systems, the shared baselines work.
6. Run the validation + build tools (see `06-BUILD-PIPELINE.md`).

## Option C — Modify an existing system

If your target system is similar to one of the examples (Pathfinder 2e ≈ D&D 5e structurally; Vampire ≈ Exalted as a Storyteller derivative), copy the closest example and tweak.

```bash
cp -R examples/dnd5e rulesets/pathfinder2e
cd rulesets/pathfinder2e
# edit ruleset.json: change id, name, attributes, skills, derived stats
# edit gm-agent.md: update vocabulary, action economy, magic system
# edit lorebook.json: replace D&D-specific entries with PF2e-specific ones
```

Then build the artifacts and install.

## Option D — Extend the framework

If your target system's dice math doesn't fit any of the five existing resolution modes (single-roll, dice-pool, d100-percentile, 2d6-stat, fate-ladder), you'll need to extend the framework JavaScript itself, not just write data files.

This is more work — about 100 lines of code change across two files. See `06-BUILD-PIPELINE.md` "Adding a new resolution mode" for the recipe. Best done by someone comfortable reading and editing JavaScript, ideally with an AI coding assistant pair-programming.

## Common gotchas

### "My AI hallucinated a field that doesn't exist"

State-mutator overrides are the easiest place for an AI to invent field names that aren't in the ruleset schema. Cross-reference every `field="..."` example in your state-mutator override against `derivedStats[].name`, `attributes[].name`, `skills[].name`, and `damageTypes[].id` in your `ruleset.json`. If a name doesn't appear in the schema, the AI made it up.

The validation prompt at the bottom of `docs-for-ai/07-EXAMPLE-PROMPTS.md` is designed to catch exactly this — paste your finished files back to the AI and ask it to verify field consistency.

### "The AI used D&D vocabulary in a non-d20 system"

Push back: "Use this system's own vocabulary, not D&D's. We don't have HP, we have <Stress / Vitality / Wounds / etc.>. We don't have AC, we have <Defense / Block / Soak / etc.>. We don't roll d20+mod vs DC, we roll <X>d<Y> vs <target>." Then ask it to rewrite the gm-agent prompt and lorebook entries.

### "How do I know if my system needs typed damage?"

If players track damage by **kind** (Bashing wood-bat hits stack with Lethal knife wounds and Aggravated fire damage), declare `damageTypes` on your Health Track and write a state-mutator override teaching the AI which `field` names route to which type. See the Exalted 3e example.

If players just track **HP** (one number going down), no typed damage needed. Inherit the shared state-mutator baseline.

### "How do I know if my system needs a sorcery / multi-turn casting category?"

If casting takes **multiple rounds** and accumulates a resource toward a threshold (Exalted Shape Sorcery: roll Int+Occult per round, accumulate sorcerous motes, unleash when ≥ spell cost), use the sorcery category and the multi-turn workflow in your state-mutator override.

If casting is **immediate** (D&D: pay a spell slot, cast the spell), no sorcery category needed. Use a regular ability category.

## When to ship vs. keep local

Local-only rulesets are first-class citizens. You don't need to upstream anything to use the framework.

If your ruleset is good enough that other people would benefit:

- Open a PR against [Marinara-RPG-Extension](https://github.com/Kenhito/Marinara-RPG-Extension) adding your `rulesets/your-system/` folder.
- Or just publish the `bundle.json` + `agents.json` somewhere (gist, your own repo, Discord) and tell people to grab those two files.

## Done

If your system installs and runs without console errors and the main narrator agent uses your system's vocabulary correctly, you've shipped a working ruleset. Welcome to system-agnostic Marinara.
