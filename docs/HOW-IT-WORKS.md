# How Marinara RPG Works

This is the plain-language guide to playing with the extension installed — what it does, how the pieces fit together, and what to check when something looks wrong. It assumes Marinara Engine is already running and you're about to install the extension, or you already have it installed and want to understand it better.

For click-by-click install screenshots, see [`docs/INSTALL.md`](INSTALL.md). To author a new ruleset, see [`AUTHORING.md`](AUTHORING.md). This page is about *using* one that's already built.

Examples below use two placeholder characters, **Mira** and **Vex**, and their Game Master, running whatever system you've installed. Nothing here is specific to one system — swap in your own attribute names, dice, and vocabulary as you read.

## What this extension does

Marinara Engine's built-in Game Mode ships with a Game Master biased toward D&D-style mechanics: six attributes, a single d20 roll, a difficulty class to beat. This extension replaces that mechanical brain with any tabletop system you want to run, without forking the engine or writing code.

Installing a ruleset gives you:

- **A character sheet** shaped like your system's, not D&D's — attributes, skills, derived stats (health, mana, motes, whatever your system tracks), inventory, and conditions, rendered as a floating panel over the chat.
- **A dice widget** that rolls the way your system rolls (a d10 pool, a d20 plus modifier, 4dF, a d100) and hands the result to the AI with the real die faces attached, not just a summary number.
- **Instructions for the AI** — how your system resolves actions, what the dice-tag format looks like, how combat math works, how experience and leveling work — so the Game Master narrates mechanically correct turns instead of drifting back to D&D habits.
- **A rules reference** that surfaces the relevant entry automatically when it's needed — a spell's cost, a condition's effect, a class's XP table — without you looking it up mid-scene.

Sixteen systems ship ready to use — D&D 5e, Exalted 3e, Vampire, Werewolf, Call of Cthulhu, Pathfinder 2e, and more — and the framework is built so a new one can be authored for anything it doesn't cover yet.

### The agents, in plain terms

Behind the scenes, a small set of specialist agents brief the Game Master before each of its turns, and one runs after:

| Agent | What it does | When it runs |
|---|---|---|
| **Ruleset Helper** | Injects your system's resolution rules, skill/attribute list, and your live character sheet | Before the turn |
| **Combat Overseer** | Frames combat math (dice formula, action economy, damage) and tracks NPC/enemy state, including `ENCOUNTER:` shells | Before the turn |
| **Context Fuser** | Answers rules questions when asked, and reminds the Game Master of current state (HP, conditions, gear) | Before the turn |
| **State Mutator** | Reads the finished narration and updates your sheet — the *only* agent that writes to it | After the turn |

You don't see any of these run directly — you see their effects: a mechanically-grounded turn, and your sheet moving to match what actually happened. If a story ever references an agent or role that isn't one of these four (or a system-specific variant of them), that's a sign something's out of date — see [When something looks wrong](#when-something-looks-wrong).

**A turn, end to end:** you describe what Mira does. The Ruleset Helper, and the Combat Overseer or Context Fuser if enabled, brief the Game Master on the relevant rules and current scene state. The Game Master narrates the outcome, rolling real dice if tool use is on. Only after that narration is finished does the State Mutator read it and update Mira's sheet to match. You never see the briefing or the sheet-write happen directly — you see the sheet move and the story stay honest about your numbers.

## Install: the three-artifact model

Everything you import falls into one of three buckets. Keeping them straight matters, because updating one does **not** update the others, and most "something's off" reports trace back to only one of the three having gotten the latest version.

| Artifact | What it is | Where it comes from | When you update it |
|---|---|---|---|
| **The extension zip** | The *code* — the loader that draws the sheet, runs the dice widget, and talks to Marinara's API | `Marinara-RPG-Extension.extension.zip`, imported once through **Settings → Addons → External Extensions → Import** | Whenever the extension itself changes. Requires re-approval every time (below) |
| **The ruleset bundle + its agents** | The *rules* — your system's sheet shape, dice math, and the doctrine telling the AI Game Master how your system works | A `bundle.json` per system, imported through the **Ruleset** dialog in the chat header | Whenever a ruleset's rules or doctrine change — a new mechanic, a fixed instruction, a new sheet field |
| **The GM character card** *(optional, roleplay mode)* | The *narrator's constitution* — personality and framing for a general-purpose Game Master persona | The `Universal RPG GM` character card, imported like any character card | Whenever the card's own instructions change — it needs to describe the current agent roster accurately |

Think of it this way: **the zip is what runs, the bundle is what it's told to enforce, and the card is who's telling the story.** All three can be current at once, and each can independently go stale.

### Step 1 — Import the zip

Settings → Addons → External Extensions → Import. Pick the `.zip` — never the loose `.js` file, which installs into a sandboxed mode where the extension has no page to draw on and can't function. It arrives disabled; open it, inspect it, and click **Review and Run** to approve its exact code and turn it on.

You'll repeat this for every future extension update. That re-approval requirement is Marinara's trust model for third-party code — not a bug in this extension.

### Step 2 — Import a ruleset bundle

Click the **Ruleset** button that appears in the chat header once the extension is enabled. The dialog takes a `bundle.json` three ways:

- **Choose file…** — a local download.
- **Fetch URL** — paste a raw link and fetch it live.
- **Paste JSON** — straight into the textarea.

**Save and reload** installs the sheet spec, the dice widget's rules, the Game Master's main prompt, the sub-agents, and the lorebook, all in one action. This does *not* require re-approving the extension itself — a bundle is data, not code, and can't touch what the extension is allowed to do.

### Step 3 — Launch your game, then activate what you installed

Installing a bundle is not the same as turning it on:

- **Attach the ruleset's lorebook to the game.** Without this, the AI has no rules reference to draw from when a keyword-triggered entry should fire.
- **Enable the agents for that specific game** (Settings → Agents, agents named like `MRR: <System> — <Role>`). A reasonable minimal set is the main Ruleset agent plus the sheet-writer, since the sheet-writer is what actually moves your numbers. Each enabled agent costs one AI call per turn, so enable only what your table wants running.
- **Roleplay mode only:** if your preset has no slot reserved for a given agent's output, that agent's work is silently discarded — it still runs, still costs tokens, and the narrator never sees a word of it. Use **Manage MRR Agents → Add agent sections to active preset** once per preset; later bundle updates repair this automatically after that first pass.
- If Marinara ever warns that an agent "has no connection configured," that's a billing/attribution notice, not an error — the agent resolves a connection at generation time and works normally. It is never the reason an agent's output goes missing.

### Step 4 (recommended) — Turn on real dice for the Game Master

Chat Settings → Function Calling → **Enable Tool Use**. This lets the AI roll actual dice for itself instead of guessing at outcomes — see [Dice](#dice) below for why this matters more than it sounds like it should.

### Step 5 (optional) — Import the GM character card

If you're playing in roleplay mode and want a ready-made narrator persona instead of writing your own, import the `Universal RPG GM` character card the way you'd import any character. It's written to work with whichever ruleset you have active, and its first message walks you through describing your setting, your character, and your opening scene.

## Your character sheet

The floating sheet panel is your system's character, not D&D's — whatever attributes, skills, derived stats, states, and inventory your ruleset defines. It's resizable, and the small scroll-icon button next to the Ruleset button toggles it open and closed.

A control bar at the top of the panel lets you:

- Switch between multiple characters in the same chat.
- Create a new character.
- Rename or remove the active one.
- Save or load characters as files (see below).

### It syncs automatically, two ways at once

Every edit saves to your browser instantly, keeping the panel responsive. In the background it also syncs to Marinara's own server, so your characters survive a cleared browser and follow you to a second device. Both copies carry a timestamp, and whichever one is newer wins when the sheet loads — so an edit that saved locally but never made it to the server (say, before a crash) is recovered on your next load instead of silently lost to a stale server copy. If storage ever degrades, a warning strip appears at the top of the sheet telling you so rather than failing quietly.

### The sheet is the truth

Every turn, the Game Master is handed a live copy of the sheet in its context — the block it's told is the LIVE CHARACTER SHEET. It's instructed, explicitly, that if its own running sense of your numbers ever disagrees with that block, the sheet wins, and it should reconcile toward it and say so briefly.

Practically: if the story seems to think Vex has taken more damage than the sheet shows, the sheet is the one that's actually right — not your memory of the last few turns, and not the narrator's.

### How the sheet actually moves

The State Mutator reads the Game Master's finished narration each turn — after it's written, never before — and copies the numbers it finds directly out of the prose:

- *"The blade lands for 7 damage"* moves Vex's health bar by 7.
- *"She's badly hurt"* moves nothing, because no number was ever stated.

This is deliberate, not a limitation. An omitted update is recoverable — you notice the sheet didn't move and ask for the number. An invented one silently corrupts your character with no way to tell it happened. If a turn goes by and a number you expected to change didn't, the fix is to ask the Game Master to state the resolved number explicitly next time, not to hand-edit the sheet around it.

### Party play

In a multi-character game, a state change can target any roster member by name, not only whoever's turn it currently is. If Mira's player is narrating and the scene establishes that Vex took damage off-screen, Vex's sheet moves — not Mira's, and not whichever character happens to be active in the panel.

Regenerating a message (a "swipe") correctly reverts or reapplies changes per character, for everyone that message actually touched — so backing out a bad turn doesn't leave one character's numbers stuck from a version of the story that no longer exists.

### Save and load — your real backup

The **save** button downloads every character in the current chat as a single JSON file. This is the copy nobody but you controls — keep it somewhere durable (a synced folder, version control, emailed to yourself), and get in the habit of saving after anything that matters: a level-up, a big haul of loot, the end of a session.

**load** replaces the current chat's characters with a previously-saved file. This is also how you carry a character into a brand-new chat, since a fresh chat always starts with no characters in it.

## Dice

There are two separate sources of randomness in play, and they're kept apart on purpose so neither can override the other.

### Your rolls come from the widget, and they're authoritative

You fill in the widget (the stat, the modifier, the target), roll it, and it produces a dice tag with the actual die faces printed in it. **Send to chat** drops that tag straight into your own message.

The Game Master reads that tag and narrates from it — it never re-rolls it, adjusts it, "corrects" its math, or re-adds a bonus the widget already folded in.

### The Game Master's own rolls come from the engine's dice tool

With **Enable Tool Use** on, the narrating AI has access to Marinara's server-side `roll_dice` tool — a genuine random number generator — for anything it needs to roll itself: an NPC's attack, a saving throw it calls for, a random encounter table.

Without that toggle on — or on a connection type that can't deliver tools at all (some can't; the extension shows a one-time notice when yours is one of them) — the doctrine is explicit: **never invent a face.** Instead, the Game Master names the pool or dice you need to roll, lays out what each realistic outcome would mean, and waits for you to roll it yourself in the widget and report the result back.

### A worked example

Say Mira attempts something risky and tool use is on. The Game Master calls the dice tool and narrates:

```
Mira vaults onto the railing, blade flashing for the guard's wrist.
[dice: 9d10 vs 7 -> 5 successes, 2 tens doubled, faces: 10,10,9,8,7,5,4,2,1]
— she lands the strike clean.
```

Every face rolled is right there in the tag, highest first, not just the "5 successes" summary. That matters because some abilities key off the *actual* dice, not the total — an ability that rerolls every 1 and 2 you rolled, or a bonus that triggers specifically on a particular face. The doctrine tells the Game Master to read those exact faces off the tag and adjudicate from them, never to reconstruct or guess at which faces must have come up.

If you ever see a face-dependent ability get resolved without anyone actually looking at the faces in the tag, that's worth flagging — it means the adjudication skipped a step it's supposed to take.

### Regenerating voids old rolls

If you swipe or regenerate a turn, every roll from the previous version of that turn is void — it belonged to a version of the story that no longer exists. New dice get rolled fresh for the new version; nothing carries over from the discarded attempt.

## Combat & enemies

If you've enabled the Combat Overseer, it briefs the Game Master before each turn on:

- Whose initiative is next.
- How many actions the acting character gets this turn.
- The dice formula and damage type for whatever's being attempted.
- The duration and recovery mechanic for any condition a hit inflicts.

It doesn't decide outcomes or roll dice itself — it frames the math so the narration gets it right, and the actual resolution still happens through the dice widget, the tool, or the table's own call.

### Unnamed opposition gets a "shell," not a sheet

Bandits, guards, beasts — anything without a card of its own — is tracked as a compact statline instead of a full character. At the start of a fight, and updated again every turn after, you'll see something like:

```
ENCOUNTER:
  4x Bandit — Init 7 · Attack pool 6 · DV 3 · Soak 4 · Health -0/-1/-1/-2/Incap
```

The exact fields depend on your system — a d20 game shows AC, HP, attack bonus, damage, and save DCs instead; a narrative-first system might show nothing more than a threat description and a condition track.

The Game Master treats these numbers as the truth for the fight and doesn't invent its own on top of them. The block re-emits in full, updated, every single turn, so whichever version you're looking at right now is the one to trust over an earlier round's memory. Once the scene ends, the shell goes away entirely — it was never a saved character, just bookkeeping scoped to that fight.

### Recurring villains get a real card and sheet, not a shell

The moment an enemy is going to matter beyond one encounter, treat them like you would a player character. A five-step walkthrough:

1. **Decide they matter.** A boss you'll meet again, a rival who escapes the fight, anyone the story is clearly going to return to.
2. **Give them a character sheet** the way you'd make one for a player, through the extension's character controls, with real numbers for your system rather than a shell's shorthand.
3. **Address them by that name in play from then on.** The Game Master is instructed to reference a sheeted character's actual numbers going forward, not to fold them back into a generic `ENCOUNTER:` line the next time they show up.
4. **If they were already fought once as an anonymous shell** — say, "the bandit captain" inside a mob of otherwise-shelled bandits — that shell still disappears once the scene ends, exactly like any other shell. The sheet you just made is the durable record from here on, not whatever the old statline said.
5. **Confirm it took.** Ask a rules or state question about them — "how much health does the captain have left?" — and the answer should come back from their sheet, not a freshly re-derived guess. If it doesn't, the card or sheet is probably out of sync; re-check step 2.

## Powers & the spellbook

Spells, Charms, powers — whatever your system calls them — live in the ruleset's **lorebook**: a set of entries that fire automatically when their trigger words show up in recent chat. Ask about a spell by name, or narrate casting it, and its entry surfaces in the Game Master's context on that turn without you needing to look it up yourself.

### Costs are deducted automatically when a lorebook entry states them

If a power's entry includes a line like `Cost: 5 motes, 1 willpower`, then narrating that it was cast or invoked causes the State Mutator to read that line and deduct the cost for you — no manual arithmetic.

For example, if Mira channels an ability whose entry reads `Cost: 5 motes, 1 willpower`, and the narration says she does, her Personal Motes and Willpower both drop by the stated amounts without you touching the sheet.

If a power's entry has no stated numeric cost, nothing is deducted automatically — a material component, a narrative condition, anything non-numeric stays something you and the Game Master track by hand in the story itself.

### Authoring your own enemy types — the bestiary pattern

If you're authoring a ruleset, or homebrewing content for one you're already playing, and you keep running into the *same kind* of enemy across different encounters — not a unique named villain (that's the card+sheet pattern above), but a recurring *type*, like "Fire-Aspect Soldier" or "Rot-touched Ghoul" — you can write it as its own keyword lorebook entry, the same way you'd write a spell or a Charm:

1. Name the entry after the enemy type.
2. Give it trigger words that match how you'll actually refer to it in play.
3. Put its baseline stats and one or two signature abilities in the content, the same shape a Combat Overseer shell already expects.

The next time that type shows up, its `ENCOUNTER:` line can be filled in consistently from that entry instead of being re-improvised from scratch each time. You get consistency for the *type* across many appearances without saving a full character for every mook that shares it. Full authoring detail, including where this pattern sits relative to a ruleset's other lorebook entries, is in [`AUTHORING.md`](AUTHORING.md).

## XP & progression

Character advancement runs the same way ordinary sheet state does: the Game Master narrates it, and the State Mutator copies the numbers into your sheet afterward.

### One switch controls whether XP happens at all

A lorebook entry called "XP Progression Mode" has a single line at the very top reading either:

```
Progression: xp
```

or

```
Progression: milestone
```

In `xp` mode, the Game Master awards experience per your system's own guidelines whenever it's earned. In `milestone` mode, it awards **no** XP at all, ever — you and your table level up entirely by discretion instead.

To switch a whole campaign's progression style, edit that one line and nothing else; no prompt or agent needs to change. The switch takes effect on the *next* turn, not the current one — the engine re-reads lorebook context with about a one-turn delay, so the turn immediately after a flip may still follow the old mode.

### Awards are party-wide and single-fire

When XP is earned — from a resolved fight, a resolved social or mental challenge, or a scene of genuinely good roleplay (never combat only, by design) — every character in the party receives the same award, not just whoever happened to be acting, and never an NPC.

It's narrated as one grant to the whole group at once — *"the party earns 150 XP for clearing the warren"* — and the State Mutator turns that single narrated grant into one award applied once per party member, not once per mention.

### Leveling up

Leveled systems keep their own threshold table in the lorebook, framed as the authority over the AI's own memory of the numbers — specifically so a request like "level me up to 12" can't accidentally land on 13 or 11 because the model half-remembered the wrong row of a table.

The actual level-up is always something you walk through and confirm step by step (hit points, features, spells known, whatever your system requires); nothing auto-advances your sheet without you.

### Pool-spend systems work a little differently

In systems that track a running experience pool instead of discrete levels (Exalted and the Storyteller family, for example), the Game Master awards XP into that pool exactly as above, but spending it — buying up a trait, raising an ability — stays entirely your own sheet edit. The Game Master narrates and awards; it does not adjudicate how you spend what you've earned.

## When something looks wrong

Come back to the three-artifact model from [Install](#install-the-three-artifact-model): **the zip is code, the bundle plus its agents are the rules the AI actually follows, and the GM card (if you're using one) is the narrator's constitution.** Nearly every "this is acting weird" report traces back to one of those three being out of date while the others updated around it.

| Symptom | Likely cause | Fix |
|---|---|---|
| The AI describes agents, roles, or systems that don't exist anymore | Your GM character card is out of date | Re-import the current card |
| A new or changed rule isn't being followed | You updated the zip, but not the ruleset | Re-import the ruleset's bundle **and** re-enable its agents for that game — the rules ride the bundle, not the extension code |
| The sheet's numbers look wrong, stuck, or from an earlier session | Your browser is showing a stale local copy | Refresh the page — the sheet re-syncs from the server, and the newer of the two timestamps always wins |
| An enabled agent seems to be doing nothing (roleplay mode) | Your preset has no matching section reserved for that agent's output | **Manage MRR Agents → Add agent sections to active preset** — one-time per preset; later bundle updates repair this automatically afterward |
| An agent seems to be doing nothing (any mode) | It isn't enabled for *this specific* game, or the lorebook isn't attached to it | Settings → Agents: enable it for this game (agents are per-game, not global); also confirm the ruleset's lorebook is attached to the game |
| Marinara shows a warning that an agent "has no connection configured" | Normal — it's a billing/attribution notice | No action needed; the agent resolves a connection at generation time and runs fine |
| The Game Master invents a dice result or a stat that was never established | Tool use is off, or your connection can't deliver tools at all | Chat Settings → Function Calling → Enable Tool Use; on a connection that structurally can't use tools, this is expected behavior — roll it yourself in the widget instead |
| A number you expected to change on the sheet didn't move | The narration never stated the number explicitly | Ask the Game Master to state the resolved number in prose on the next turn — an unstated number is deliberately never guessed at |
| An enemy's stats seem to keep changing or resetting between turns | It's an unnamed `ENCOUNTER:` shell, meant to be re-derived each turn, not a saved sheet | If it should stay consistent across the whole story, give it a real character sheet (see [Combat & enemies](#combat--enemies)) |
| A stray `[mrr-state: ...]`-looking tag shows up in the story text itself | A rare leak from a briefing agent echoing tag syntax | The State Mutator only ever reads its own output, so this shouldn't double-apply anything — but if it recurs often, it's worth reporting |

## FAQ

**Do I need to re-approve the extension every time it updates?** Yes — any change to its code invalidates the prior approval hash. That's Marinara's trust model for third-party extensions in general, not something specific to this one.

**Does installing a ruleset bundle turn its agents on?** No. Installing puts the sheet spec, the agents, and the lorebook on your server; you still enable the agents and attach the lorebook per game, after that game launches, not while it's mid-generation.

**Will switching rulesets, or updating a bundle, delete my characters?** No. Character sheets are stored separately from ruleset installs and are untouched by either action.

**What happens to a shelled enemy's stats after the fight ends?** They're not kept anywhere — a shell was never a saved character to begin with. If the enemy is going to matter again, give it a real sheet before the next scene it appears in.

**Can different chats run different rulesets at the same time?** Yes. The active ruleset is tracked per chat, so one chat can run D&D while another runs Exalted, as long as the right ruleset is active when you switch between them.

**Is the AI ever quietly guessing at dice?** By design, no — see [Dice](#dice) above. If tool use is off, or the connection can't deliver tools at all, the doctrine is to hand the roll to you rather than invent a result, not to fake one convincingly.

**Do I have to use the Universal RPG GM character card?** No. It's a ready-made narrator persona for roleplay mode, but Marinara's built-in Game Mode narrator, or a character card you write yourself, both work with an installed ruleset the same way — what matters is that whichever narrator you're using knows to read the sheet block and the sub-agents' briefings as authoritative.

**Should I worry about an agent's "no connection configured" warning?** No — it isn't an error. It's an informational billing/attribution notice, and the agent runs normally regardless (see the troubleshooting table above).
