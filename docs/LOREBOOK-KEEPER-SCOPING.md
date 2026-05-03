# Lorebook-Keeper Scoping

The Marinara engine ships a built-in `lorebook-keeper` agent that
auto-grows a lorebook from narrative as the campaign unfolds. It's a
useful agent — it captures NPC backstories, location details, faction
politics, and recurring items as they emerge in play.

**The problem for ruleset overlays:** by default, `lorebook-keeper`
writes its auto-grown entries into whichever lorebook the chat is
configured to target. If that's the lorebook this extension installed
(your D&D 5e / Exalted 3e / etc. reference book), the auto-grown
story-lore entries will pollute the curated rules reference and may
even contradict it.

## How to scope correctly

Marinara's chat metadata has a `lorebookKeeperTargetLorebookId` field
that pins where the lorebook-keeper writes. Set this on a per-chat
basis to a SEPARATE story-lore book.

### Step-by-step

1. Install your ruleset bundle as usual. This creates a lorebook tagged
   with `mrrp-managed` (RP-mode extension) or `mrr-managed` (GM-mode
   extension) plus `mrrp:<rulesetId>` / `mrr:<rulesetId>`. Treat this
   as a READ-ONLY rules reference.
2. Create a SECOND lorebook for story lore. Open Marinara's Lorebooks
   pane → New Lorebook. Name it something like `<Campaign Name> —
   Story Lore`. Tag it `story` (no `mrrp-managed` or `mrr-managed`
   tag — those are reserved for ruleset bundles).
3. Open the chat where the campaign is running. Open the Chat Settings
   drawer → Lorebooks tab. Find "Lorebook Keeper target". Set it to
   the new story-lore book you just created.
4. Enable the `lorebook-keeper` agent for the chat (it's not on by
   default in roleplay mode).

The keeper now writes story content into the story-lore book; your
ruleset bundle's reference entries stay clean and re-installable
without overwriting player-edited entries.

## Why this matters specifically for ruleset overlays

When you re-install or update a ruleset bundle (e.g., D&D 5e v1.0.0 →
v1.1.0), the installer's idempotent re-install does a bulk-replace on
the bundle's tagged lorebook entries. If lorebook-keeper has been
writing story entries to the same book, **those story entries get
wiped on re-install**.

Keeping the two books separate means:
- Re-installing ruleset bundles is safe (only the bundle entries change).
- Your campaign's accumulated lore survives ruleset updates.
- Both books inject into chat context independently — the LLM sees
  rules reference AND story lore on every turn.

## Why we don't ship a custom keeper agent (yet)

A ruleset-aware keeper variant — one that classifies entries as "rules"
vs "story" and writes them to different books automatically — is on the
v0.2+ roadmap. For v0.1, the engine's stock keeper is fine as long as
you scope its target book. The two-book pattern is the same pattern
Silly Tavern users have used for years; it's not new tech, just
documentation.

## Cleanup

If a previous campaign's keeper wrote into your ruleset's bundle book
by mistake, you can recover via the bundle's Uninstall flow:

1. Open the Ruleset dialog → Uninstall this ruleset → confirm.
2. Re-install the same bundle. The reference book is recreated fresh
   from the bundle's curated entries.
3. Set `lorebookKeeperTargetLorebookId` on the chat to a separate
   story-lore book (per the steps above) BEFORE resuming play.
