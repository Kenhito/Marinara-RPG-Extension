# Marinara-RPG-Extension v0.4.1 — Game Mode

A client-side overlay for [Marinara Engine](https://github.com/Pasta-Devs/Marinara-Engine) that swaps the engine's default D&D-style AI Game Master for a system of your choice. Ships with two complete worked examples (D&D 5e and Exalted 3e), a six-agent system that runs alongside your GM, and full documentation for building your own ruleset for any tabletop RPG.

## What's in this download

```
v0.4.1/
├── README.md                       (you are here)
├── INSTALL-GUIDE.md                5-minute install — paste two files into Marinara
├── BUILD-YOUR-OWN-RULESET.md       Three paths: AI-with-repo, AI-with-zip, manual
├── docs-for-ai/                    Seven .md files to feed an AI assistant
├── examples/                       Two complete reference rulesets
│   ├── exalted3e/                    Storyteller dice-pool, typed damage, multi-turn sorcery
│   └── dnd5e/                        Single-roll d20, SRD-compatible
└── install-files/                  Drop-in ready
    ├── RPG-Extension-GM-Mode.js      The framework JS (paste into Extensions panel)
    ├── exalted3e-bundle.json         Paste into Ruleset dialog
    ├── exalted3e-agents.json         Import via Import Agents dialog
    ├── dnd5e-bundle.json
    └── dnd5e-agents.json
```

## Three things you can do with this

### 1. Install one of the example systems and play

If you want D&D 5e or Exalted 3e working in Marinara today, you don't need to author anything. Open `INSTALL-GUIDE.md` and follow it. Five minutes from zero to playing.

### 2. Build a ruleset for any other system, with AI assistance

Want GURPS, Cyberpunk RED, Pathfinder 2e, Mörk Borg, Vampire: The Masquerade, Fate Core, anything? Open `BUILD-YOUR-OWN-RULESET.md`. It walks you through three options for getting an AI assistant (ChatGPT / Claude.ai / Gemini) to author a complete ruleset bundle for your target system. The seven docs in `docs-for-ai/` are the inputs you feed to the AI.

### 3. Build a ruleset by hand

If you'd rather author it yourself without AI assistance, the same `docs-for-ai/` set is the canonical reference for the schema, agent system, and build pipeline. Read them in numerical order:

1. `01-OVERVIEW.md`
2. `02-AGENTS-SYSTEM-AGNOSTIC.md`
3. `03-RULESET-SCHEMA.md`
4. `04-LOREBOOK-FORMAT.md`
5. `05-AGENT-AUTHORING.md`
6. `06-BUILD-PIPELINE.md`
7. `07-EXAMPLE-PROMPTS.md` (skip this one if not using AI)

## Why "system-agnostic"

The framework was designed so the same six-agent architecture (main GM + state-mutator + state-reminder + combat-adjudicator + lore-query + npc-bookkeeper) works for any RPG system. Five of the six agents have shared system-agnostic baselines. Your ruleset only needs to write per-system overrides for the agents whose mechanics genuinely differ from the baseline. Most simple systems can ship with **zero** agent overrides and still get the full agent stack working. Complex systems (typed damage, multi-turn casting, non-trivial action economy) override the agents that matter and inherit the rest.

D&D 5e ships with one agent override (combat-adjudicator). Exalted 3e ships with three (state-mutator, state-reminder, combat-adjudicator). Both work end-to-end.

## Versioning

This is **v0.4.1** of the Game Mode framework. The bundle envelope's `minExtensionVersion` is 0.4.0 — older framework JS won't accept this bundle's features (typed damage, sorcery category, build-agents separation). Always update the framework JS first, then the bundle, then the agents.

The Roleplay Mode framework is a sibling project at [Marinara-RPG-RP-Mode-Extension](https://github.com/Kenhito/Marinara-RPG-RP-Mode-Extension), currently at v0.2.0.

## What's new in v0.4.1

- **Typed damage on tracks.** Health-style tracks can declare damage types (Bashing/Lethal/Aggravated, Slashing/Piercing/Bludgeoning) with per-type colors and severity-stacking display. The state-mutator can mutate `field="bashing" delta="+3"` and the bar re-stacks correctly.
- **Sorcery / multi-turn casting category.** Spellbook supports a "sorcery" category that auto-tags lorebook entries with `Type: Sorcery`. The state-mutator override workflow handles declare → accumulate → unleash with Willpower refund-on-success.
- **Agents decoupled from bundle.** Bundle now carries ruleset + lorebook only. Agents install via the separate Import Agents dialog. Decoupling lets you ship prompt updates without forcing users to reinstall the entire ruleset.
- **CSP-safe formula evaluator.** The framework's `{StatName}*N+M` parser uses recursive descent instead of `new Function` — works on Marinara pages with strict CSP that blocks `'unsafe-eval'`.
- **Field-name normalization.** State-mutator field matching is case-and-separator-insensitive. The AI emitting `peripheralMotes` resolves to schema's `Peripheral Motes` automatically.
- **Max-clamp on resource refresh.** `delta="+999"` caps at the bar's formula-computed maximum. Refresh-to-full works correctly without overflow.
- **Persisted message dedupe.** State-mutator no longer replays historic mutations on hard refresh. Per-chat dedupe set survives reloads.
- **Position clamp on load.** Floating panels saved on a wider monitor / second display no longer end up offscreen on reload — clamped into current viewport.
- **Spellbook adds sorcery category** that ships sorcery-tagged lorebook entries on push.
- **Per-entry lorebook install** instead of broken bulk endpoint. Re-installs cleanly delete-then-add.

For complete history, see `CHANGELOG.md` in the source repo.

## License

MIT for the framework, schema, examples, and documentation. System-specific rulesets paraphrase mechanics references; flavor text remains the property of the original publisher.

## Source

[github.com/Kenhito/Marinara-RPG-Extension](https://github.com/Kenhito/Marinara-RPG-Extension)
