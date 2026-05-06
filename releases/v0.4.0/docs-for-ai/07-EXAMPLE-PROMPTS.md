# 07 — Example Prompts for AI-Assisted Authoring

Copy-paste these prompts into ChatGPT, Claude.ai, Gemini, or any chat AI to have it author a complete ruleset for your target system. The prompts assume the AI has access to the documentation in this release (either via the GitHub repo, an uploaded zip, or a paste of the docs).

The prompts are progressive: start with **Prompt A** if your AI can read the GitHub repo. Fall back to **Prompt B** if it can't browse but accepts file uploads. Use **Prompt C** for a multi-step, more-controlled flow.

## Prompt A — Repo-aware AI (Claude.ai with URL, ChatGPT with browsing, Gemini)

```
I want to build a Marinara-RPG-Extension ruleset for <YOUR SYSTEM HERE — e.g., GURPS 4e, Cyberpunk RED, Mörk Borg, etc.>.

The framework lives at: https://github.com/Kenhito/Marinara-RPG-Extension

The build documentation is in:
- releases/v0.4.0/docs-for-ai/01-OVERVIEW.md through 07-EXAMPLE-PROMPTS.md (read all seven in order)

Two complete worked examples are in:
- releases/v0.4.0/examples/exalted3e/ (a complex system with typed damage, multi-turn sorcery casting, and per-system agent overrides)
- releases/v0.4.0/examples/dnd5e/ (a simpler single-roll system that mostly inherits the shared agent baselines)

Please:

1. Read all seven docs first.
2. Skim both example folders to see the file shapes.
3. Produce a complete ruleset folder for <YOUR SYSTEM>:
   - rulesets/<system-id>/ruleset.json
   - rulesets/<system-id>/gm-agent.md
   - rulesets/<system-id>/lorebook.json
   - rulesets/<system-id>/INSTALL.md
   - rulesets/<system-id>/agents/<role>.md for any role agents that need system-specific tuning (only the ones the system actually needs — leave the rest as shared baseline inheritance)
4. Walk me through what you generated and any choices you made about resolution mode, attribute model, damage system, named conditions, and which agent roles you chose to override.

Important constraints:
- Use only the five existing resolution modes: single-roll, dice-pool, d100-percentile, 2d6-stat, fate-ladder. If <YOUR SYSTEM> doesn't fit any of these, tell me before producing files — adding a new resolution mode requires extending the framework JavaScript, which is out of scope for a chat-AI authoring session.
- Match the JSON schema exactly. Validate against the field list in 03-RULESET-SCHEMA.md.
- Use the system's own vocabulary throughout the GM agent prompt and lorebook entries. Don't import D&D vocabulary into a non-d20 system.
- Mechanics-only references — don't reproduce verbatim text from the system's published books. Paraphrase rules; flavor text is the publisher's IP.
- Keep the gm-agent prompt between 2,000 and 8,000 characters. Include the engine compatibility paragraph about the 50-char reputation tag limit.
- Lorebook entry count: 14-25 typical. One entry per discrete rule, 50-300 words each.
- Include the "Optional Sub-Agents — what they do and how to enable" lorebook entry (copy verbatim from one of the example bundles, only changing the system name).

Ask me clarifying questions if any system mechanics are ambiguous. Otherwise produce the files in code blocks I can save directly.
```

## Prompt B — File-upload-only AI

This works when your AI accepts file uploads but can't browse. Extract the release zip locally and upload these to the AI:

- The seven `.md` files in `releases/v0.4.0/docs-for-ai/`
- The `examples/exalted3e/` folder (or just its `ruleset.json`, `gm-agent.md`, `lorebook.json`, and `agents/` contents)
- The `examples/dnd5e/` folder

Then paste:

```
I've uploaded the documentation and two example rulesets for the Marinara-RPG-Extension framework. Read the seven numbered .md files in order to understand the architecture, schema, and authoring patterns. Skim both example folders.

Build me a complete ruleset for <YOUR SYSTEM HERE>. Produce:
- ruleset.json (system declaration)
- gm-agent.md (the main GM narrator's prompt)
- lorebook.json (keyword-triggered rules reference, 14-25 entries)
- INSTALL.md (user-facing install walkthrough modeled on the example INSTALL.md files)
- agents/<role>.md per-system overrides for ONLY the roles that need system-specific tuning. The shared baselines work for systems with a clean single-counter HP model. Override state-mutator if your system has typed damage; override state-reminder if your system has formula-driven max bars; override combat-adjudicator if combat resolution is non-trivial.

Constraints:
- Use one of the five existing resolution modes. Tell me first if none fit.
- Match the schema in 03-RULESET-SCHEMA.md exactly.
- Use the system's own vocabulary; no cross-system contamination.
- Mechanics references only; no verbatim flavor text from the original books.
- 2,000-8,000 character GM prompt with the reputation-tag-50-char paragraph.
- 14-25 lorebook entries, one per discrete rule.
- Include the "Optional Sub-Agents" lorebook entry verbatim.

Walk me through your design decisions before producing the files. Ask clarifying questions if any system mechanics are ambiguous.
```

## Prompt C — Multi-step controlled authoring

When you want the AI to author one piece at a time and get your approval before moving on. Useful for complex systems or when you want fine control over voice and flavor.

### Step 1: Resolution mode and core mechanics

```
I'm authoring a Marinara-RPG-Extension ruleset for <YOUR SYSTEM>. Before producing any files, walk me through:

1. Which of the five resolution modes fits best (single-roll / dice-pool / d100-percentile / 2d6-stat / fate-ladder)?
2. The system's attributes — list them with abbreviations and typical ranges.
3. The system's skills (or equivalent — moves / disciplines / approaches / etc.).
4. The system's resource economy — what does the player track on their sheet (HP, Stress, motes, ammo, mana, fate points, etc.)?
5. Damage model — single counter? Typed (severities)? Track-based (penalty boxes)?
6. Named conditions / statuses.
7. Combat structure — initiative, action economy, special action types.
8. Magic / supernatural — does this system have a multi-turn casting system, or just immediate-cost spells?

Wait for me to confirm or adjust each before continuing.
```

### Step 2: Produce ruleset.json

```
Now produce the complete ruleset.json based on what we agreed. Match the schema in 03-RULESET-SCHEMA.md exactly. Include difficulty ladder, attributes, skills, derived stats, states, dice tag format, sheet sections, ability categories.
```

### Step 3: Produce gm-agent.md

```
Now produce gm-agent.md following the structure in 05-AGENT-AUTHORING.md "Writing the main (gm-agent.md) prompt". Cover resolution mechanic, difficulty ladder, resource economy, action types, tone/pacing, negative-space DO-NOT rules, and the engine-compat reputation paragraph. 2,000-8,000 chars.
```

### Step 4: Produce lorebook.json

```
Now produce lorebook.json with 14-25 entries. One per discrete rule. Cover: core mechanics (resolution, ladder, initiative, damage, resources), conditions, example powers / spells / charms, the bestiary entries (mooks vs elites), and the canonical "Optional Sub-Agents — what they do and how to enable" entry (copy from the exalted3e example, only changing the system name).
```

### Step 5: Produce per-system agent overrides

```
Now produce per-system agent overrides ONLY for the roles that need system-specific tuning. For each override you write, justify why the shared baseline isn't sufficient.

If the system has typed damage → override state-mutator with a FORBIDDEN section listing field-name traps and a Field vocabulary section listing the exact damage type ids.

If the system has formula-driven max bars → override state-reminder to compute and display the maximums.

If the system has multi-turn casting → extend the state-mutator override with a casting workflow section (declare → accumulate → unleash with refund / leak / abort).

If combat is non-trivial → override combat-adjudicator with the action economy and named maneuvers.

Skip overrides for roles that don't need them — the framework falls back to the shared baseline and that's fine.
```

### Step 6: Produce INSTALL.md

```
Now produce INSTALL.md following the structure in the example INSTALL.md files. Sections: prerequisites, install client extension (one-time), activate ruleset (paste bundle), import agents (paste agents.json), build a character, play, troubleshooting (include the 50-char reputation gotcha and the chat-id sheet-keyed quirk).
```

## Validation prompt — paste output back to AI for review

After you've taken the files into your local repo:

```
Here are the files I produced for <YOUR SYSTEM>. Please double-check:

[paste ruleset.json, gm-agent.md, lorebook.json, agents/*.md, INSTALL.md]

1. Does ruleset.json match the schema in 03-RULESET-SCHEMA.md? Flag any field with the wrong type or missing-when-required.
2. Does gm-agent.md include all the structural sections (resolution, ladder, economy, action types, negative space, reputation paragraph)?
3. Are the lorebook entries sized appropriately (50-300 words each)? Are keys substring-matchable to natural user phrases?
4. Do the per-system agent overrides reference field names that actually exist in ruleset.json? (Compare every `field="..."` example in state-mutator examples against derivedStats, attributes, skills, and damageTypes ids.)
5. Are there any cross-system terms leaking in (e.g., "DC" in a dice-pool system, "HP" in a stress-based system)?
6. Is the engine-compat reputation paragraph present in gm-agent.md?

Return a numbered list of issues with specific line references and proposed fixes. If everything checks out, say so explicitly.
```

## Tips for working with an AI on this

- **Iterate one file at a time.** Producing all five files in one prompt is too much context and the AI tends to drift. Step C is slower but produces better files.
- **Validate as you go.** After the AI produces ruleset.json, run it through `node tools/validate-ruleset.mjs <path>` and paste the validator output back to the AI for fixes.
- **Don't trust agent prompts blindly.** State-mutator overrides are the easiest place for the AI to hallucinate field names. Cross-reference every `field="..."` against your `ruleset.json` before installing.
- **Test in Marinara before declaring done.** Install the bundle and agents, fire up a session, run a few turns of combat and one casting scenario. Watch the browser console for `[mrr] state-mutator: unmatched field '<name>'` warnings — those mean the agent is emitting a name your schema doesn't recognize. Fix the prompt and re-import.
- **Keep the system's own vocabulary.** If the AI leans on D&D vocabulary in a non-d20 system, push back: "Use this system's own vocabulary, not D&D's."

## What success looks like

When you've finished:

```bash
node tools/validate-ruleset.mjs rulesets/<your-system>/ruleset.json     # PASS
node tools/build-bundle.mjs rulesets/<your-system>/                     # PASS
node tools/build-agents.mjs rulesets/<your-system>/                     # PASS (N agents)
node tools/validate-bundle.mjs rulesets/<your-system>/bundle.json       # PASS
```

Then in Marinara:

1. Reinstall the framework JS.
2. Reinstall the bundle (Ruleset dialog).
3. Re-import the agents (Import Agents dialog).
4. Toggle on state-mutator and state-reminder.
5. Start a chat, build a character, play a few turns.

If the sheet updates correctly when narration causes mechanical changes, and the GM model uses your system's vocabulary instead of D&D-isms, you've shipped a working ruleset.

## Done. What now?

Share your `bundle.json` and `agents.json` with anyone who runs Marinara and they can install your system in three clicks. If you want to upstream it as a reference ruleset alongside the four shipped (D&D, Exalted, Pathfinder, Fate), open a PR — but the framework doesn't require that. Local-only rulesets are first-class citizens.
