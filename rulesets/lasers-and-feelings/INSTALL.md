# Install — Lasers & Feelings ruleset

One-page space-adventure RPG written by John Harper as a tribute to the Doubleclicks song *Lasers and Feelings*. Each character has a single stat — **Number** (2–5) — and rolls a small d6 pool against it.

## Quick install (recommended)

**One file import + one bundle install.** Skip step 1 if the framework extension is already installed.

### 1. Install the framework extension (once per Marinara install)

In Marinara Engine: **Settings → Extensions → Add Extension** — Marinara's Extensions screen accepts file uploads, not pasted text.

- **Import** the framework extension `.js` file from this repo's `extension/` directory. The CSS is embedded — there is no separate stylesheet to upload.
- Enable.

A **Ruleset** button appears in the chat header.

### 2. Install the Lasers & Feelings bundle

Click the **Ruleset** button. The dialog has three ways to load a bundle:

- **Option A — Choose file:** click **Choose file…** and pick `rulesets/lasers-and-feelings/bundle.json` from disk. Click **Save and reload**.
- **Option B — Fetch URL:** point at this repo's raw `rulesets/lasers-and-feelings/bundle.json` on GitHub.
- **Option C — Paste:** copy the contents of `bundle.json` into the textarea, click **Save and reload**.

The installer creates the lorebook (11 entries — mechanics, Consortium, Raptor, Something, helping/prepared/expert), the custom agent ("Lasers & Feelings"), and activates the ruleset. The page reloads.

## How it plays at the table — `stance-modal-pool`

L&F uses the `stance-modal-pool` resolution mode. Each roll the player picks **one of two stances**:

- **LASERS** (`under`) — science, technology, cold rationality, calm precise action. Each die counts as a success when `face < Number`.
- **FEELINGS** (`over`) — diplomacy, intuition, seduction, wild passionate action. Each die counts as a success when `face > Number`.

Exactly one stance is `under` and exactly one is `over` — this is now schema-enforced. Equality is handled by the special LASER FEELINGS rule below.

### LASER FEELINGS (exact match)

When any die rolls **exactly Number**, it triggers **LASER FEELINGS**:

- The die **counts as a success** toward the outcome tier (same as a regular hit).
- The player gets to **ask the GM one question and the GM must answer honestly**, in-character or out — pick the one that fits the moment.

A pool that hits two or three LASER FEELINGS is rare, glorious, and answers two or three questions; the agent should treat each as a separate beat.

### Outcome tiers

| Successes | Tier | What it means |
|---|---|---|
| 0 | **miss** | It goes wrong. GM says how things get worse. |
| 1 | **barely** | You barely manage it. GM inflicts a complication, harm, or cost. |
| 2 | **good** | You do it well. |
| 3+ | **critical** | Critical success. GM tells you an extra effect you get. |

The dice widget walks tiers worst→best and picks the LAST one whose `minSuccesses` ≤ total successes, so a 3-success pool is `critical`, a 4-success pool is also `critical`, etc.

## Sample characters

`characters/sample-pilot.json` (Sparks McGee, Number 4) and `characters/sample-doctor.json` (Doc Counterpart, Number 3) are smoke-test rigs that demonstrate the sheet shape — Style, Role, Number, Goal — for someone hand-importing into Marinara's character library or filling the sheet manually. They are **not** bundle-imported; they are hand-fill references.

## Sanity check

In a fresh Game Mode chat:

1. Click the dice widget icon. The widget renders the L&F form: Stance toggle (LASERS / FEELINGS) and Pool input.
2. Set Number = 4, Stance = LASERS, Pool = 2. Click **Roll**.
3. You should see a chat tag of the form `[<repo-roll-prefix>: ruleset=lasers-and-feelings, stance=lasers, stat=Number, statValue=4, pool=2, dice=[2,5], successes=1, exactMatches=0, tier=barely]` (your dice will vary; the roll-tag prefix differs by repo — GM-mode uses `mrr-roll`, RP-mode uses `mrrp-roll`).
4. Send to chat. The agent reads the `tier` and narrates a barely-managed outcome with a complication.

## Updating / removing

Bundle update flow is the same as install — Choose file again, fetch the URL again, or paste the new `bundle.json`. The installer detects the existing managed agent/lorebook by tag/setting and PATCHes rather than duplicating. **Uninstall server data** in the Ruleset dialog removes the lorebook and GM agent created here.
