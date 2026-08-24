# Install Guide — 5 minutes from zero to playing

This walks you through installing one of the example rulesets (D&D 5e or Exalted 3e) into Marinara Engine. If you want to install a system not in the examples, see `BUILD-YOUR-OWN-RULESET.md` first to author one, then come back here.

> **⚠️ Requires Marinara Engine 2.4.3 or newer.** Marinara removed its old extension system in v2.3.4 and rebuilt it in v2.4.0 — older engines cannot load this extension, and older releases of this extension (v0.5.0 and earlier, or anything installed by pasting JS into a settings field) cannot load on a current engine. If you have an old install, remove its leftovers first (Marinara's Settings → Agents and Lorebooks can delete any strays) and start fresh here.

## Prerequisites

- **Marinara Engine 2.4.3+ running locally.** [Install instructions on the Marinara repo.](https://github.com/Pasta-Devs/Marinara-Engine) Default port is `7860`.
- **A Marinara connection configured** with an LLM (Anthropic Claude, OpenAI GPT-class, local model via Ollama/LM Studio, etc.). Test that you can have a normal chat in Marinara before installing this overlay.
- **A modern browser.** Chrome, Firefox, Safari, or Edge (any current version).

## Step 1 — Enable extension imports (one time, two switches)

Marinara gates third-party extensions behind two deliberate safety switches. Both must be on:

1. **On the machine running the engine:** open the Marinara Engine `.env` file and set

   ```
   ENABLE_EXTERNAL_EXTENSIONS=true
   ```

   then restart the engine. (If you access Marinara from another device — phone, tablet, second PC — you'll also need `ADMIN_SECRET` set and **Settings → Advanced → Admin Access** enabled.)

2. **In the Marinara UI:** **Settings → Advanced → Danger Zone → Allow third-party extension imports** — toggle it on.

## Step 1b — Verify your download (recommended)

You are about to hand a file to your own engine and approve it to run with full page access, so it is worth thirty seconds to confirm the file is the one that was published and not something altered in transit or swapped in a re-upload.

Check the importable package, and the loose loader too if you plan to read it:

```sh
sha256sum Marinara-RPG-Extension.extension.zip
sha256sum RPG-Extension-GM-Mode.js
```

On macOS use `shasum -a 256 <file>`; on Windows, `certutil -hashfile <file> SHA256`.

Expected values for this release:

- `Marinara-RPG-Extension.extension.zip` — `755655e2a57fd2d97b76fc14bf2b2a4948243313c7b620cbd02ce5745a9f9409`
- `RPG-Extension-GM-Mode.js` — `226024a40e4e241b8a83475297c493f074b863360c6d55cbb22acc8719d4d287`
- **After import**, open the extension's page and confirm it lists **Full page access** — Marinara's **Review and Run** dialog should show exactly `sha256:37da46ca8c45a1fe3fb78fbceda1d2f8f97301cfcc3d5a2a0f12539a6ec75717`. That is the engine's own hash of the code it is about to approve; if it reads anything else, you imported a different file.

If a hash does not match, stop and re-download rather than importing. (Marinara's own **Review and Run** step approves the code's hash separately, on the engine side — that pins what you approved, but only the two checks above tell you the file was the published one to begin with.)

## Step 2 — Import and approve the extension (one time)

1. Go to **Settings → Addons → External Extensions → Import** and pick `Marinara-RPG-Extension.extension.zip` from this release folder.

   > **Do not import the loose `.js` file.** On Marinara 2.4.3+ a single-file `.js` import silently installs as a sandboxed Worker extension with no page access — it will "succeed" and then do nothing. Always use the zip.

2. The import arrives **disabled and unapproved**. Open it, glance over the code if you like, and click **Review and Run**. This approves the extension's exact code hash and enables it.

3. Refresh the page. You'll see a small scroll-icon button appear in the chat header — that's the character-sheet toggle. Click it once and the floating sheet opens (initially blank — no ruleset activated yet).

**Every future update of the extension repeats the Review and Run step.** Marinara re-asks whenever the code changes — that's its trust model working, not an error.

## Step 3 — Install your chosen ruleset bundle

Click the **Ruleset** button in the chat header (or the gear icon in the floating sheet's header) to open the Ruleset dialog, then click **Choose file…** and pick one of the example bundles:

- For **D&D 5e**: `install-files/dnd5e-bundle.json`
- For **Exalted 3e**: `install-files/exalted3e-bundle.json`

(The same folder has a `<system>-bundle.json` for every ruleset in the repo — Fate Core, Call of Cthulhu 7e, GURPS Lite, Pathfinder 2e, and more.)

Click **Save and reload**. The dialog shows progress messages, then the page reloads with the ruleset active. Importing a bundle never re-triggers the extension approval — bundles are data, not code.

This one import installs the character sheet, the dice widget, the lorebook, the main GM agent, and the sub-agents. **Installing is not activating** — the next step wires them into your actual game.

## Step 4 — Launch your game, attach the lorebook, enable the agents

On Marinara 2.4.3+ the MRR agents work like any custom agents: the bundle **installs** them, but each game has to **enable** them. Same for the lorebook. After you create/launch your game:

1. **Attach the ruleset's lorebook to the game** (during game setup, or after launch via the game's lorebook selection). This is required — without it the agents have no ruleset rules to follow and will not work correctly.
2. **Enable the MRR agents for the game** — after the game launches, not mid-generation: **Settings → Agents** (or the game's agent selection) → find the agents named like `MRR: <System> — <Role>` → enable the ones you want.

The pool you're choosing from:

- **Ruleset Helper** — the main GM agent. Always enable this one.
- **State Mutator** — the one agent that writes to your sheet: it emits hidden `[mrr-state: ...]` tags that the extension applies (HP loss, motes spent, conditions, and so on). Enable it if you want narration to drive the sheet automatically.
- **Combat Overseer** — combat-math framing + NPC roster tracking when combat is active.
- **Context Fuser** — answers out-of-character rules questions AND reminds the GM of your current stats each turn.
- **Pre-Input Transformer** *(most systems)* — recasts your typed input in the system's vocabulary before the GM sees it.
- **Per-system trackers** *(some systems, run in parallel)* — e.g. Exalted's anima-banner and charm-cooldown trackers, V20's blood-pool tracker.

Each enabled agent costs one model call per turn — and on a provider that only allows one call at a time, they run one after another, so enable only what your table needs. A good minimal set: **Ruleset Helper + State Mutator**.

## Step 4b — Add the MRR agent sections to your roleplay preset (engine 2.4.0+)

**Roleplay mode only. This step is not optional, and skipping it fails silently.**

Since Marinara 2.4.0 a roleplay preset *owns* agent placement. An agent's output is
inserted only where a matching **Agent Data** marker section sits in the preset. With
no matching section the engine **discards that agent's output entirely** — no warning,
no fallback. The agents still run, still cost tokens, and still show healthy rows in
their run history, while the narrator never sees a word of it. If your agents seem to
"do nothing", this is almost always why.

- **One click (recommended):** **Manage MRR Agents** → **Add agent sections to active
  preset**. It names the preset before changing anything, skips agents that already
  have a section, and never edits a preset without your confirmation.
- **By hand:** **Preset Editor → Add Section → Agent Sections**, then pick each MRR
  agent.

The **State Mutator** deliberately gets no section: its `[mrr-state: ...]` output is
addressed to the extension, which reads it straight from the agent-run history, and
feeding raw tag syntax to the narrator invites it to echo tags. Game mode and conversation mode skip the
preset assembler entirely, so they keep the older depth-0 injection fallback and are
unaffected by this step. If your chat has **no preset
selected**, Marinara uses no sections whatsoever — pick one first, or let the
one-click assist attach your default.

**You only do this once — reinstalls repair themselves.** Marinara can never change an
existing agent's `type`, so re-importing a bundle recreates the MRR agents under *new*
types, and the marker sections you added would be left pointing at agents that no
longer exist (agents run, output is discarded, no warning). The extension now reconciles
that for you: after every bundle import — and whenever a chat's ruleset is confirmed —
it repoints your existing MRR agent sections at the live agents and logs one line per
section it fixed (`reconciled N orphaned agent marker(s)` in the browser console). It
also re-derives a chat's ruleset stamp from the chat's own enabled MRR agents if
applying a chat-preset wiped it. Sections you added for non-MRR agents are never
touched. **First-time setup still uses the button above** — only the re-run is
automatic. The one preset it cannot repair is the stock read-only **"Marinara
Universal"**, which refuses every edit: save a copy, select the copy for the chat, and
re-run the one-click assist.

**The connection warning is harmless.** If Marinara warns that an MRR agent has no
connection configured, that is a **billing/attribution notice, not an error**. Agents
without an explicit connection resolve one at generation time and work normally. It is
never the cause of missing agent output.

**Chat tools need the chat's own toggle.** If a ruleset ships custom tools, they only
become available when that chat's **enableTools** setting is on — installing a bundle
does not turn it on for you.

## Step 4c — Turn on tool use so the GM rolls real dice (recommended)

**Chat Settings → Function Calling → "Enable Tool Use"** — on.

This is what gets you proper dice probabilities. The toggle hands the main GM model
Marinara's server-side `roll_dice` tool, a true RNG; `roll_dice` is enabled by default
once the chat toggle is on, so there is no separate grant to make. Leave it off and the
narrating model *invents* every attack roll, save, and reaction check by picking a
plausible-looking number — a model guessing at dice is a biased die, and reliably a
kinder one than the real thing. With it on, the GM rolls real dice server-side and the
narration reports what actually came up. It is the same toggle that gates a ruleset's
own custom tools.

**You do not need to grant `roll_dice` to the MRR agents themselves.** Agent-attached
tools need this chat toggle *plus* a per-agent grant in the Agents UI, and the bundle
cannot ship that grant (the agent-import route strips `settings.enabledTools`). It is
also unnecessary: the State Mutator reads the numbers out of the GM's finished
narration and copies them verbatim — it never rolls, by design.

*(Screenshots of this and the other install steps are in the repo's `README.md` and
`docs/INSTALL.md` — they are not packaged into this release folder.)*

## Step 5 — Build a character

Open the floating sheet (the scroll icon in the chat header). Click **+ Add character**, name them, fill in attributes / skills / derived values using the +/- steppers.

For Exalted: pick a Sorcery Circle from the states dropdown if you're playing a sorcerer. Add charms / spells via the spellbook flyout (the third floating panel).

For D&D: pick a class and fill in proficiencies. Add spells via the spellbook flyout.

The sheet auto-saves on every change — to your browser's local storage and, on engine 2.4.x, to the Marinara server as well, so your characters survive a cleared browser and follow you to a second browser.

## Step 6 — Play

Start a chat in Marinara. The active GM agent will use your system's vocabulary and mechanics. The State Mutator will emit hidden tags whenever narration causes mechanical changes; the extension applies them and updates your sheet in real time.

When narration says "the orc's blade tears your shoulder", you'll see the damage land on your health track. When you say "I cast Fireball", the GM rolls the spell, the State Mutator deducts the spell slot, and you'll see a confirmation toast in the corner.

## Troubleshooting

### Extension imported but nothing appears

Confirm it's **approved and enabled** in Settings → Addons → External Extensions (imports always arrive disabled — Review and Run is the required step). Then hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R). If it's still dead, check the browser console (F12 → Console) for errors mentioning the extension name.

### Import is rejected or the Import button is missing

One of the two Step-1 switches is off. `ENABLE_EXTERNAL_EXTENSIONS=true` must be in the engine's `.env` (and the engine restarted), and the Danger Zone toggle must be on in Settings → Advanced.

### Sheet exists but is offscreen

If you previously had this extension on a wider monitor, the saved position might be stale. In console run:

```javascript
localStorage.removeItem("mrr-sheet-pos");
localStorage.removeItem("mrr-sheet-size");
location.reload();
```

### Lorebook is empty after install

Try reinstalling the bundle (Ruleset dialog → Choose file → Save and reload). If still empty, check the browser console during install for failed requests to `/api/lorebooks/<id>/entries`.

### State mutations don't apply

Verify the **State Mutator** agent is enabled *for this game* (Settings → Agents) — agents must be enabled per game after launch (Step 4), and with the State Mutator off the sheet only changes when you edit it by hand. Also confirm the ruleset's lorebook is attached to the game — agents without the lorebook have no rules context and misbehave.

### Agents seem enabled but act like they know nothing about the system

The ruleset's lorebook isn't attached to the game. Attach it (game setup or after launch) — it carries the rules reference the agents depend on.

### Field-name warnings in console

`state-mutator: unmatched field ...` or `no label matching ...` warnings mean an agent emitted a field or state label the sheet doesn't recognize. The shipped prompts teach the model the exact field vocabulary, but if you've customized an agent's prompt in Marinara → Settings → Agents, double-check the injected field-reference section is intact — or reinstall the bundle to reset the prompts to canonical.

### Combat encounter modal looks wrong

Marinara's combat-encounter modal is server-coded with hardcoded D&D-style six-attribute stat blocks. The overlay can't replace it. Combat narration (chat-based) uses your system's vocabulary at full power — sheets, dice, and state tracking all work normally in narrative combat; the modal alone stays d20-shaped. Recommended: play combat narratively (don't trigger the modal) for non-d20 systems.

### A new chat starts with no characters

Sheets are keyed to the chat they were made in, so a brand-new chat legitimately starts empty — that is not data loss. Use the sheet header's **Save** button to export all characters in the current chat as a JSON file, and **Load** to import them into the new one. (Returning to an *existing* chat does bring its characters and its ruleset back automatically; if it doesn't, that's a bug worth reporting.)

## Updating to a newer version

1. Import the new release's `Marinara-RPG-Extension.extension.zip` (Settings → Addons → External Extensions → Import) and **Review and Run** the new hash — every code update re-requires this approval.
2. Reinstall your ruleset's `bundle.json` via the Ruleset dialog (bundles are data — no approval prompt).

**Step 2 is required, not optional, for anyone coming from 1.0.0.** The compatibility fixes in this release are split across the extension and the ruleset bundles, so a bundle you downloaded with 1.0.0 will not behave correctly against the 1.1.0 extension: its state-writing agent still runs on the old pre-narration timing and will invent dice results rather than copy them out of the narration, it lacks the GM dice doctrine that routes rolls through the engine's real RNG, and it predates the self-repairing preset reconciliation. Re-download and re-import the current `bundle.json` for **every system you play** — fresh copies of all sixteen are in this release's `install-files/` folder. Once the new bundle is in, the extension repairs your preset's agent bindings by itself.

Your sheets, characters, conditions, etc. all persist — and as of 1.1.0 they persist on the Marinara server as well as in your browser, so the update path doesn't lose data even if you also clear site data along the way.

**Your preset's agent sections are repaired for you.** The bundle re-import recreates the MRR agents under new types, which used to orphan every **Agent Data** marker section you had added. The extension now repoints them on every import and logs `reconciled N orphaned agent marker(s)` to the browser console, so you do not re-run **Add agent sections to active preset** after an update. The stock read-only "Marinara Universal" preset is the one exception — save a copy, select the copy, and run the one-click assist against that.

**Re-paste any hand-pasted GM prompt after upgrading.** The re-import updates the *managed* agents the bundle installed — it does **not** touch a copy of the GM prompt you pasted into a character card or a hand-made agent by hand. Those copies go stale silently and keep running the old instructions (a stale card still emits the old inline tags and lacks everything added since, including the reroll-on-regenerate dice doctrine). Re-paste from the ruleset's `gm-agent.md` — the block between the triple backticks — every time you update the bundle.

## Done

You're playing your chosen system in Marinara. If you want to extend the system or build another one, see `BUILD-YOUR-OWN-RULESET.md`.
