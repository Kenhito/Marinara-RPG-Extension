# Authoring a new ruleset

This guide walks through adding a third ruleset to this repo. Time budget: ~2 hours for a rules-light system, ~1 day for a full mid-weight one.

## Anatomy of a ruleset bundle

```
rulesets/your-system/
├── ruleset.json     # the data — what the extension reads
├── gm-agent.md      # the GM agent prompt template — what the AI reads
├── lorebook.json    # keyword-triggered references — what the AI reads on relevant turns
└── INSTALL.md       # walks the user through pasting all of the above into Marinara
```

`ruleset.json` is the only file that's machine-validated. The other three are prose / structured prose that humans paste into Marinara's UI.

## Step 1 — choose a resolution mode

The schema's `resolution.mode` enum has four first-class modes:

| Mode | Used by | Required sub-fields |
|------|---------|---------------------|
| `single-roll`     | D&D, Pathfinder, Cypher System | `modifierFormula` |
| `dice-pool`       | Exalted, oWoD/nWoD, Shadowrun  | `poolFormula`, `target`, `doubles`, `botches` |
| `d100-percentile` | Call of Cthulhu, BRP-derived   | `skillFormula` |
| `2d6-stat`        | PbtA (Apocalypse, Dungeon, Monster of the Week) | `modifierFormula`, `bands` |

If your system doesn't fit any mode cleanly: pick the closest, encode it as best you can, and document the gap in your `INSTALL.md`. Feel free to open a PR proposing a fifth mode (and the corresponding widget in `extension/ruleset-loader.js`).

## Step 2 — copy a starting bundle

Pick the existing bundle whose mode matches.

Linux / macOS:

```bash
cp -R rulesets/dnd5e rulesets/your-system        # for single-roll
cp -R rulesets/exalted3e rulesets/your-system    # for dice-pool
cp -R rulesets/fate-core rulesets/your-system    # for fate-ladder
```

Windows (PowerShell):

```powershell
Copy-Item -Recurse rulesets/dnd5e rulesets/your-system        # for single-roll
Copy-Item -Recurse rulesets/exalted3e rulesets/your-system    # for dice-pool
Copy-Item -Recurse rulesets/fate-core rulesets/your-system    # for fate-ladder
```

Or cross-OS via Node:

```bash
node -e "require('fs').cpSync('rulesets/fate-core', 'rulesets/your-system', {recursive: true})"
```

Edit `id`, `name`, `version`, `edition`, `summary`. Make `id` kebab-case and unique.

## Step 3 — fill in the spec

### Attributes

Each attribute is `{ name, abbreviation?, group?, min, max, default? }`. The `group` field controls how the sheet groups them (e.g. "Physical" / "Social" / "Mental" for Storyteller systems, or you can leave it blank for a flat list).

### Skills

Each skill is `{ name, linkedAttribute?, min, max, default? }`. For systems where the skill always pairs with the same attribute (D&D), set `linkedAttribute`; the extension's "roll" button uses it. For systems where the GM picks the attribute per check (Exalted), omit it — the player is prompted at roll time.

### Derived stats

Each derived stat has `{ name, formula, renderAs, max?, track? }`.

- `renderAs: "value"` — plain number with +/- steppers.
- `renderAs: "bar"` — fillable bar from 0 to `max` (motes, willpower).
- `renderAs: "track"` — array of cells (Exalted health track). Each cell needs `{ label, penalty }`. The penalty in effect equals the highest filled cell.

The `formula` field is plain language for the GM to read, not executable code. The extension does not parse it.

### States

Stateful selectors (Anima Banner, Stunt Tier, D&D conditions). Each state has `{ name, values[] }` and each value has `{ label, description?, trigger? }`.

### Difficulties

Map of label -> `{ threshold, description? }`. For `single-roll` this is the DC; for `dice-pool` it's the success count needed.

### Dice tag format

`diceTagFormat.template` is the string the GM model is told to emit. It uses `{name}` placeholders. The extension's roller reproduces this format when the user clicks **Send to chat**.

`diceTagFormat.example` is the concrete example shown in the GM agent prompt.

### Sheet sections

`sheetSections` is an ordered array of section keys. Recognized values: `attributes`, `skills`, `derived`, `states`, `inventory`, `charms`, `notes`. Sections you don't list won't render. Sections the extension doesn't yet implement (`inventory`, `charms`, `notes`) silently no-op for now — extending the extension to render them is straightforward (~30 lines per section).

## Step 4 — validate

```bash
node tools/validate-ruleset.mjs rulesets/your-system/ruleset.json
```

If it fails, the validator prints the JSON Pointer to the offending field and the JSON Schema rule that rejected it. Fix and repeat.

## Step 5 — write the GM agent prompt

`gm-agent.md` is markdown for human readers, but the bit between the triple-backticks is the prompt template the user pastes into Marinara's Agent Editor.

Cover at minimum:

1. The resolution mechanic in plain language.
2. The difficulty ladder.
3. Critical / botch / advantage / disadvantage rules (whatever your system has).
4. The exact dice-tag format the GM model must emit (mirrors `diceTagFormat.template`).
5. What the agent itself emits each turn (a rules brief — stats relevant to the action, suggested DC / difficulty, conditions in effect).
6. The agent's phase: almost always `pre_generation`. Result type: `context_injection`.

Keep the template under ~2000 words; offload deep reference into the lorebook.

## Step 6 — build the lorebook

`lorebook.json` is a Marinara-format lorebook (you can also build it in Marinara's Lorebook Editor and export). Each entry has:

- `keys` — trigger words (the entry fires when one matches the recent chat).
- `content` — the text injected into the GM prompt when triggered.
- `constant: true` for entries that must always be in context (resolution rules, anima banner, stunts in Exalted).
- `position: "before_an"` — inject before the most-recent user/assistant message.

Aim for 15-25 entries: core mechanics (always-on, ~5), conditions / states (~5), example powers / charms / spells (~10).

## Step 7 — write INSTALL.md

Mirror the structure of `rulesets/dnd5e/INSTALL.md` or `rulesets/exalted3e/INSTALL.md`:

1. Install the extension (note "if already installed, skip").
2. Activate the ruleset (paste or fetch URL).
3. Install the agent prompt.
4. Install the lorebook.
5. (Optional) GM-screen difficulty / setup notes.
6. Sanity check (a known dice example with expected output).
7. What this ruleset does NOT do (be honest — overlay tradeoffs).
8. Update / uninstall instructions.

## Step 8 — open a PR

The repo is MIT and accepts PRs adding rulesets. Include:

- The four bundle files.
- Schema validation passing (`npm run validate-rulesets`).
- A line in the top-level `README.md` table.
- A `CHANGELOG.md` entry if there is one (there isn't yet — feel free to start one).

## Common authoring pitfalls

**You wrote a "field" that isn't in the schema.** The schema has `additionalProperties: false`. The validator will tell you exactly which extra field is rejected.

**Your `oneOf` resolution disagrees.** The `resolution` field uses `oneOf` over the four modes — extra fields from another mode (e.g. `target` on a single-roll) make the validator reject under all four branches. Trim to the fields your mode actually requires.

**You used emojis in the JSON.** They're valid JSON, but the project convention is no emojis in committed source files (engine convention; we follow it). Save them for narration.

**You included verbatim text from an IP-owning publisher.** Don't. Mechanics are not copyrightable; descriptive flavor text usually is. Paraphrase. The Exalted bundle paraphrases everything; the D&D bundle uses SRD 5.1 (CC-BY-4.0) and is safe.

**Your prompt template invents rules.** The user's failure mode is "AI confidently makes up D&D rules." Tell the GM in the prompt: "Where the system is silent, label the call as a GM ruling." That single line saves a lot of hallucination.
