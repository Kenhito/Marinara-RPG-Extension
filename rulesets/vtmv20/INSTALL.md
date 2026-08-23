# V:TM V20 Install Guide (GM-Mode)

Install the V:TM V20 ruleset bundle into Marinara Engine. Same flow as the other rulesets in this extension; namespace is `mrr-vtmv20`. Requires **Marinara Engine 2.4.3+**.

## What this bundle ships

- **52 lorebook entries**: 13 mechanics rules + 13 V20 clans + 4 bloodlines + 9 common Disciplines + 3 clan-unique Disciplines (Necromancy, Thaumaturgy, Vicissitude) + 4 sects + Six Traditions + Humanity hierarchy + 4 Path hierarchies (Honorable Accord, Caine, Beast, Night) + sub-agent docs.
- **The agents**: the main Storyteller (Ruleset Helper) plus the sub-agents — State Mutator (the sole sheet-writer), Combat Overseer, Context Fuser, and the V20-specific Blood Pool Tracker (runs in parallel). All install with the bundle; you enable them per game via Marinara → Settings → Agents.
- **Full V20 character sheet template**: 9 Attributes (Phys/Soc/Mental), 30 Abilities (10 Talents + 10 Skills + 10 Knowledges with category in tooltip), 9+3 Disciplines as derived stats, 3 Virtues, Humanity OR Path Rating, Willpower bar, Blood Pool bar (default 10 = 13th gen), Generation, V20 7-level Health Track with Bashing/Lethal/Aggravated damage types, Soak (B/L/A), Frenzy state, Hunger Tier, Morality Track selector.

## Install (single bundle import — recommended)

1. **Framework extension first** (once per Marinara install). Two gates must be on: `ENABLE_EXTERNAL_EXTENSIONS=true` in the engine host's `.env` (restart the engine after), and **Settings → Advanced → Danger Zone → Allow third-party extension imports**. Then **Settings → Addons → External Extensions → Import** → import `Marinara-RPG-Extension.extension.zip` from `releases/<version>/` (the same package you use for D&D 5e / Exalted 3e / Fate Core). **Never import the loose `.js` file** — on 2.4.3+ it silently installs as a sandboxed Worker extension and does nothing. The import arrives disabled and unapproved: open it and click **Review and Run** to approve and enable.
2. Click the **Ruleset** button in the chat header to open the Ruleset dialog.
3. Choose **Choose file…** and pick `rulesets/vtmv20/bundle.json` — or **Fetch URL** with the raw GitHub link `https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/vtmv20/bundle.json`.
4. Click **Save and reload**. The framework auto-installs from this single import:
   - Ruleset (sheet + dice tag format + V20 difficulties)
   - Lorebook (52 entries, keyword-triggered)
   - Main Storyteller agent
   - The sub-agents (State Mutator, Combat Overseer, Context Fuser, Blood Pool Tracker)
5. The page reloads with **Vampire: The Masquerade 20th Anniversary** active.

> **Old installs:** anything pre-2.4.3 (pasted JS, v0.5.0 and earlier) can't be upgraded — remove the leftovers and install fresh.

## Activate per game: lorebook + agents

Installing is not activating. After you create/launch your chronicle's game:

1. **Attach the V20 lorebook to the game** (at setup or after launch). Required — without it the agents have no rules context and will not work correctly.
2. **Enable the agents for the game** — after it launches, not mid-generation: Marinara → **Settings → Agents** → find `MRR: V:TM V20 — <Role>` → toggle on. Each enabled agent adds one model call per turn (on a provider that allows only one call at a time they run one after another), so enable only what your chronicle needs. A good minimal set: **Ruleset Helper + State Mutator**.

| Agent | Use it when |
|---|---|
| `state-mutator` | You want narration to drive `[mrr-state: ...]` sheet updates automatically. The sole sheet-writer. |
| `combat-overseer` | You run heavy-mechanics combat — combat-math framing plus NPC roster tracking while combat is active. Sleeps in social scenes. |
| `context-fuser` | You ask rules questions mid-RP, or the model keeps forgetting Blood Pool / Willpower / Humanity — it answers OOC questions and restates current stats each turn. |
| `blood-pool-tracker` | Long nights of heavy blood expenditure — a parallel tracker dedicated to the Blood Pool. |

## Updating the ruleset later

If you edit any source file (`ruleset.json`, `lorebook.json`, `gm-agent.md`, `agents/*.md`), regenerate `agents.json` and `bundle.json`:

```sh
cd /path/to/Marinara-RPG-Extension
npm run build-agents      # rebuilds agents.json from .md files
npm run build-bundles     # rebuilds bundle.json from ruleset+lorebook+agents
npm run validate-rulesets # confirms ruleset.json shape
npm run validate-bundles  # confirms bundle.json shape
```

Re-import `bundle.json` in Marinara to pick up changes (the framework's idempotency keys overwrite the previous install in place — bundles are data, so no extension re-approval is triggered). The extension itself updates by re-importing the `.extension.zip` and re-approving via **Review and Run**.

## Dark Pack compliance

This bundle is distributed under the **Dark Pack Agreement** (`worldofdarkness.com/dark-pack`):

- Strictly non-commercial.
- No verbatim V20 corebook text reproduced; all flavor is original-prose paraphrase or mechanical reference.
- Cite the V20 corebook when invoking specific rules. Page-citing your owned PDF is recommended for community submissions.
- Display the Dark Pack logo on the project README and any release page.
- The required copyright notice is included in the ruleset's `license` field and reproduced here:

> *Portions of the materials are the copyrights and trademarks of Paradox Interactive AB, and are used with permission. All rights reserved. For more information please visit worldofdarkness.com.*
>
> *This material is NOT official World of Darkness material.*

## What's in the box (file map)

```
rulesets/vtmv20/
  bundle.json            # The single-file install (mrr-bundle envelope)
  ruleset.json           # Sheet + dice + difficulties + derived stats (mrr-vtmv20 ruleset id)
  lorebook.json          # 52 keyword-triggered reference entries (mrr-vtmv20 lorebook)
  agents.json            # Compiled agent metadata (mrr-agents envelope)
  gm-agent.md            # Main Storyteller agent prompt (source for agents.json + bundle.json)
  agents/
    state-mutator.md     # Sub-agent override: emit [mrr-state: ...] tags
    blood-pool-tracker.md# Sub-agent: parallel Blood Pool tracking
  INSTALL.md             # This file
```

(The shared Combat Overseer and Context Fuser prompts compile in from the repo's root `agents/` directory at build time; the files under `rulesets/vtmv20/agents/` are the V20-specific ones.)

## Roleplay Mode

As of Marinara-RPG-Extension v1.0.0 this single extension works in **both** Game Mode and Roleplay Mode chats — Marinara made custom agents mode-agnostic, so the same `vtmv20` bundle serves both. There is no longer a separate RP-mode companion to install (the RP-mode extension is retired). Just install this bundle and use it in whichever chat type you prefer.
