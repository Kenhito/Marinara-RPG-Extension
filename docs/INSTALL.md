# Install — top level

Each ruleset folder has its own step-by-step `INSTALL.md`. This page is the orientation: what gets installed where, in what order, and what to look for when it works.

## What you install, in order

1. **Client extension (once per Marinara install) — requires engine 2.4.3+**
   MRR loads through Marinara's **External Extensions** import lane (Full page access). Two gates must be on:
   - `ENABLE_EXTERNAL_EXTENSIONS=true` in the engine host's `.env`.
   - **Settings -> Advanced -> Danger Zone -> Allow third-party extension imports** (toggle on).
   - (Remote/non-localhost management additionally needs `ADMIN_SECRET` set + **Settings -> Advanced -> Admin Access**.)

   With both gates on, go to **Settings -> Addons -> External Extensions -> Import** and import the package. Use ONE of these forms (in order of preference):
   - `Marinara-RPG-Extension.extension.zip` (from `releases/<version>/`)
   - **Import Folder** pointed at `releases/<version>/Extensions/Marinara-RPG-Extension/`
   - The `manifest.json` alone from that folder

   **Do not import the loose `RPG-Extension-GM-Mode.js` file by itself.** At 2.4.3 a loose-`.js` import silently becomes a **sandboxed Worker extension** — no DOM, no same-origin API access — where MRR cannot function. It "succeeds" but does nothing. Only the zip/folder/manifest forms route into the Full-page review flow MRR needs.

   ![Marinara Engine's Settings dialog open on the Extensions screen, showing where third-party extensions are installed and enabled. The External Extensions area carries the Import control used to bring in the packaged extension, with the surrounding settings navigation visible for context.](screenshots/enable_extensions.png)

   The import arrives **disabled and unapproved**. Open it, inspect the code, and click **Review and Run** to approve its exact SHA-256 hash and enable it. The extension starts in dormant mode (no ruleset selected) — it adds a "Ruleset" button to the chat header but otherwise leaves Marinara untouched.

   ![The installed-extensions list after a successful import, with Marinara-RPG-Extension present and its enable toggle switched on. This is the state to confirm before moving on — an extension that imported but was never approved and enabled shows here without the toggle lit.](screenshots/extensions_enabled_installed.png)

   **Every subsequent update re-requires this approval step** — any edit to the extension's code or CSS invalidates the prior hash.

   **Permissions — what it needs and why.** MRR runs in the **Full page access** lane, which is the permission shown at the bottom of the extension's own settings page, below the enable toggle at the top. Two capabilities, both inherent to that lane rather than separately-granted toggles. **Page access:** the character sheet, the floating dice widget, and the Ruleset dialog are DOM the extension draws onto the Marinara page. **Same-origin access to the engine API:** installing a bundle POSTs the lorebook and agents to your server, and the state write-back path reads the agent-run history back off it. That pairing is precisely what the loose-`.js` route does not get — at 2.4.3 it builds a Worker extension with `capabilities: []`, no DOM and no same-origin `/api`, which is why it imports "successfully" and then does nothing.

   ![The extension's own settings page inside Marinara. The enable toggle sits at the top of the page; the required permissions are listed at the bottom, showing the Full page access grant that lets the extension render its UI on the Marinara page and call the engine's API on the same origin.](screenshots/extension_installed_permissions.png)

2. **Import a ruleset bundle**
   Click the **Ruleset** button. Use **Choose file…** to pick the ruleset's `bundle.json` (or **Fetch URL** with a raw GitHub link to one). Click **Save and reload**. This one import installs the ruleset (sheet + dice widget), the lorebook, the main GM agent, and the sub-agents — bundles are data, so no extension re-approval is triggered. The page reloads with the ruleset active.

3. **Attach the lorebook to your game**
   When you create/launch your game (or after it launches), attach the ruleset's lorebook to it — the bundle installed the lorebook, but each game must have it attached. **This is required:** without it the agents have no ruleset rules to follow and will not work correctly.

4. **Enable the agents for your game**
   On Marinara 2.4.3+ the MRR agents behave like any custom agents: installed by the bundle, but enabled per game — **after the game launches, not mid-generation**. Go to **Settings -> Agents** (or the game's agent selection), find the agents named like `MRR: <System> — <Role>`, and enable the ones your table wants. A good minimal set: **Ruleset Helper + State Mutator** (the State Mutator is what makes narration update the character sheet). Each enabled agent costs one model call per turn.

5. **Add the MRR agent sections to your roleplay preset (roleplay chats, engine 2.4.0+)**
   **This step is not optional for roleplay chats, and skipping it fails silently.** Since Marinara 2.4.0 a roleplay preset *owns* agent placement: an agent's output is inserted only where a matching **Agent Data** marker section sits in the preset, and with no matching section the engine **discards that agent's output entirely** — no warning, no fallback. The agents still run, still cost tokens, and still show healthy rows in their run history, while the narrator never sees a word of it. If your agents seem to "do nothing", this is almost always why.

   - **One click (recommended):** open **Manage MRR Agents** → **Add agent sections to active preset**. It names the preset before changing anything, skips agents that already have a section, and never edits a preset without your confirmation.
   - **By hand:** **Preset Editor → Add Section → Agent Sections**, then pick each MRR agent.

   ![The preset dialog with the MRR Agent Data sections being added. Each MRR agent gets its own marker section in the preset's section list, which is what tells the engine where that agent's output belongs in the assembled prompt. The State Mutator is deliberately not among them.](screenshots/import_agents_preset.png)

   **You only have to do this once — reinstalls repair themselves now.** Marinara can never change an existing agent's `type`, so re-importing a bundle recreates the agents under *new* types, and the marker sections you added would be left pointing at agents that no longer exist (agents run, output is discarded, no warning). Since round 28 the extension reconciles that automatically: after every bundle import — and whenever a chat's ruleset is confirmed — it repoints your existing MRR agent sections at the live agents and logs one line per section it fixed (`reconciled N orphaned agent marker(s)` in the browser console). The same pass re-derives a chat's ruleset stamp from the chat's own enabled MRR agents when applying a chat-preset wiped it. Sections you added for non-MRR agents are never touched. **First-time setup still uses the button above** — only the re-run after a reinstall became automatic. The one case it cannot fix is the stock read-only **"Marinara Universal"** preset, which refuses every edit: save a copy, select the copy for the chat, and re-run the one-click assist.

   **Roleplay only — Game mode is genuinely fine without it.** The preset assembler is skipped entirely for game and conversation chats, so those modes keep the older depth-0 injection fallback and their agent output is delivered as it always was. Only roleplay chats hand placement to the preset.

   The **State Mutator** deliberately gets no section, and as of round 25 it cannot take one: it is a `post_processing` agent, so it runs after the narration and its output can never reach the narrator's prompt by any path. It writes the sheet directly — the extension reads its `[mrr-state: ...]` tags straight from the agent-run history. The one-click assist filters it out automatically. If your chat has **no preset selected at all**, Marinara uses no preset sections whatsoever — pick one first, or let the one-click assist attach your default.

   **The connection warning is harmless.** If Marinara warns that an MRR agent has no connection configured, that is a **billing/attribution notice, not an error**. Agents without an explicit connection resolve one at generation time and work normally. It is never the cause of missing agent output.

6. **Turn on tool use so the GM can roll real dice (recommended)**
   **Chat Settings → Function Calling → "Enable Tool Use"** — on.

   ![The chat's Settings panel open on the Function Calling section, with the "Enable Tool Use" switch turned on. This is the single toggle that hands the GM model Marinara's server-side roll_dice tool; it is set per chat, not per ruleset, and installing a bundle does not set it for you.](screenshots/enable_dice_tool.png)

   This gives the main GM model Marinara's server-side `roll_dice` tool, which is a true RNG. `roll_dice` is enabled by default once the chat toggle is on; you do not need to grant it separately.

   Why it matters: without a real roll, the narrating model *invents* every random outcome — damage, saves, monster attacks — by picking a plausible-looking number. With the toggle on, the GM agents (which now instruct the model to resolve every random outcome through the tool) narrate numbers that were actually rolled.

   **You do not need to grant `roll_dice` to the MRR agents themselves.** Agent-attached tools require the same chat toggle *plus* a per-agent grant in the Agents UI, and the bundle cannot ship that grant — the agent-import route strips `settings.enabledTools`. It is also unnecessary: the **State Mutator needs no dice at all.** It reads the numbers out of the GM's finished narration and copies them; it never rolls. Granting it dice would only give it a way to disagree with the story.

   Note this is the same chat toggle that gates a ruleset's own **custom tools** — installing a bundle does not turn it on for you.

   **Your dice are separate from the GM's, deliberately.** This toggle governs the *GM's* rolls only. Your own rolls come from the extension's floating dice widget: you roll it, it emits a dice tag carrying the actual faces, and **Send to chat** drops that tag into your message — where it is authoritative. The GM narrates from the number you sent and never re-rolls it. Widget for your dice, engine tool for the GM's.

   ![The extension's floating dice widget, configured for the active ruleset — inputs for the roll's stat, modifier, and target, a roll button, and the resulting dice tag with the individual die faces shown. A Send to chat control drops that tag into your message box.](screenshots/sheet_dice_widget.png)

That's all six pieces. The per-ruleset INSTALL files (`rulesets/dnd5e/INSTALL.md`, `rulesets/exalted3e/INSTALL.md`) walk through this in detail with sanity-check rolls.

## Switching rulesets

To switch systems (say, D&D 5e to Exalted 3e) on the same Marinara install:

- Click the **Ruleset** button. Use **Choose file…** to pick the new system's `bundle.json` (or **Fetch URL** with a raw GitHub link to one). Click **Save and reload**.
- Disable the previous system's `MRR: <System> — <Role>` agents in your game's agent selection and enable the new system's set.
- Detach the previous lorebook from the chat and attach the new one.

The character sheet state is per-chat — synced to your Marinara server via `marinara.storage` on engine 2.4.x+, with `localStorage` kept as a local mirror — so different chats can run different rulesets concurrently as long as you remember to switch the ruleset selection when you change chats.

## Updates

If you used **Fetch URL** to install a ruleset, you can re-fetch it whenever the upstream version changes — Save-and-reload pulls the new `bundle.json` into the active state.

The extension itself updates by re-importing the package (same form as install) and re-approving the new hash via **Review and Run** — every code/CSS change requires this, with no exceptions. Marinara doesn't have an extension marketplace, so updates are manual.

**Your preset's agent sections repair themselves — you don't re-run the button.** A bundle re-import recreates the MRR agents under new `type`s (Marinara can never change an existing agent's type), which used to orphan every **Agent Data** marker section you had added. Since round 28 the extension repoints them itself on every bundle import, logging `reconciled N orphaned agent marker(s)` to the browser console, and re-derives a wiped ruleset stamp from the chat's own enabled MRR agents. The only preset it cannot repair is the stock read-only "Marinara Universal" — save a copy, select the copy, and run the one-click assist against that.

**If you pasted the GM prompt anywhere by hand, re-paste it after every upgrade.** A bundle re-import updates the *managed* agents it installed (the Ruleset Helper and the sub-agents) — it does **not** touch a copy of the GM prompt you pasted into a character card or a hand-made agent. Those copies go stale silently and keep running the old instructions: a card carrying a pre-2.4.0 prompt still emits the old inline tags and is missing everything added since, including the reroll-on-regenerate dice doctrine. Re-paste from the ruleset's `gm-agent.md` (the block between the triple backticks) whenever you update a bundle.

## Uninstall

Open the Ruleset dialog and click **Clear**. Reload. The default Marinara Game Mode UI returns. Optionally:

- Disable the custom GM agent in **Settings -> Agents**.
- Detach the lorebook from your chats.
- Remove the extension from **Settings -> Addons -> External Extensions** if you don't plan to use any ruleset.

Your chat history and Marinara state are unaffected by any of this — the overlay only adds; it never modifies engine data.
