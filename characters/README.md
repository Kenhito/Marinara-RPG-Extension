# Characters

Character cards bundled with this extension. Each card is shipped both
as raw JSON (for direct import via Marinara's character editor or as a
human-readable reference) and as a PNG with the `chara` tEXt chunk per
the SillyTavern V2 spec, which Marinara's character importer accepts
natively.

## Universal-RPG-GM

A setting-agnostic Game Master persona that bootstraps RP-mode chats
the way Marinara's built-in Game Mode bootstraps game chats. When the
chat starts, the card asks the user three opening questions:

1. **The setting** (genre, world, tone)
2. **The user's character** (name, role, personality)
3. **The opening situation** (where + what + what's about to happen)

Once answered, the card narrates as the GM, cooperating with:

- The engine's roleplay-mode default agents (world-state,
  prose-guardian, continuity, expression).
- This extension's overlay sub-agents (Ruleset Helper, Combat
  Adjudicator, Lore Query, State Reminder, NPC Bookkeeper, State
  Mutator).

The card's system prompt instructs the GM to emit `[mrr-state: ...]`
or `[mrrp-state: ...]` tags inline whenever narration establishes
durable character-sheet changes. The State Mutator agent reinforces
this protocol every turn; the extension's chat observer parses the
tags, applies the changes to localStorage, and hides the tag from the
visible chat.

### Files

- `Universal-RPG-GM.json` — V2-spec character card data.
- `Universal-RPG-GM.png` — same card embedded in a 320×180 placeholder
  PNG. Replace the avatar in Marinara's character editor after import
  for a system-specific look (e.g., a d20 / dice tray for D&D, a Caste
  mark for Exalted, a starship cockpit for sci-fi).

### How to use

1. Install the framework JS extension (this repo's
   `extension/*.js`) into Marinara via Settings → Extensions.
2. Install at least one ruleset bundle (D&D 5e, Exalted 3e, Fate Core,
   etc.) via the Ruleset dialog.
3. Import the GM card: Marinara → Characters → Import → select
   `characters/Universal-RPG-GM.png`.
4. Create a new roleplay-mode chat with the imported card as the
   character.
5. Answer the card's three opening questions in your first message.
6. Play.

### Alternate greetings

The card ships three opening-message variants you can swipe to:

- **Three-question setup** (default) — full interview before play.
- **In-media-res start** — one sentence and we begin mid-scene.
- **Slow-burn** — setting only, character emerges through play.
- **Returning campaign** — for resuming a saved session.

### Building / regenerating the PNG

If you edit the JSON, regenerate the PNG with:

```
node tools/build-character-card.mjs characters/Universal-RPG-GM.json
```

The script does a round-trip verification (decode the PNG back to JSON
and compare with the source) before writing the output. Any mismatch
exits non-zero.
