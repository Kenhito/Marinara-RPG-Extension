# V:TM V20 Install Guide (GM-Mode)

Install the V:TM V20 ruleset bundle into Marinara Engine. Same flow as the other rulesets in this extension; namespace is `mrr-vtmv20`.

## What this bundle ships

- **52 lorebook entries**: 13 mechanics rules + 13 V20 clans + 4 bloodlines + 9 common Disciplines + 3 clan-unique Disciplines (Necromancy, Thaumaturgy, Vicissitude) + 4 sects + Six Traditions + Humanity hierarchy + 4 Path hierarchies (Honorable Accord, Caine, Beast, Night) + sub-agent docs.
- **6 agents**: 1 main Storyteller (enabled by default) + 5 optional sub-agents (state-mutator, state-reminder, combat-adjudicator, lore-query, npc-bookkeeper) — all five sub-agents installed DISABLED; toggle on via Marinara → Settings → Agents.
- **Full V20 character sheet template**: 9 Attributes (Phys/Soc/Mental), 30 Abilities (10 Talents + 10 Skills + 10 Knowledges with category in tooltip), 9+3 Disciplines as derived stats, 3 Virtues, Humanity OR Path Rating, Willpower bar, Blood Pool bar (default 10 = 13th gen), Generation, V20 7-level Health Track with Bashing/Lethal/Aggravated damage types, Soak (B/L/A), Frenzy state, Hunger Tier, Morality Track selector.

## Install (single bundle import — recommended)

1. Open Marinara → **Settings → Extensions** → confirm `RPG-Extension-GM-Mode.js` is imported and enabled (this is the framework loader; the same file you use for D&D 5e / Exalted 3e / Fate Core).
2. In any Game Mode chat, open the ruleset dialog (`+` → `RPG Ruleset` if visible, or via the framework's chat-tools menu).
3. Choose **Paste bundle JSON** OR **Fetch from URL**.
4. Paste the contents of `rulesets/vtmv20/bundle.json` (or fetch from `https://github.com/Kenhito/Marinara-RPG-Extension/raw/main/rulesets/vtmv20/bundle.json` once the release lands).
5. The framework auto-installs:
   - Ruleset (sheet + dice tag format + V20 difficulties)
   - Lorebook (52 entries, keyword-triggered)
   - Main Storyteller agent (enabled, fires every turn)
   - 5 sub-agents (disabled; toggle individually)
6. Hard-reload Marinara (Ctrl+Shift+R / Cmd+Shift+R) to clear the cached old ruleset.
7. New chat -> ruleset selector -> pick **Vampire: The Masquerade 20th Anniversary**.

## Optional: enable sub-agents

The five sub-agents are installed disabled. Each adds one model call per turn while enabled, so enable only what your chronicle needs:

| Agent | Use it when |
|---|---|
| `state-mutator` | You want narration to drive `[mrr-state: ...]` sheet updates automatically. |
| `state-reminder` | Long sessions / complex sheets — the model is forgetting Blood Pool, Willpower, Humanity. |
| `combat-adjudicator` | You run heavy-mechanics combat encounters. Sleeps in social scenes. |
| `lore-query` | You frequently ask the model rules questions mid-RP. |
| `npc-bookkeeper` | Combat or court scenes with multiple named Kindred you want continuity on. |

**To enable**: Marinara → Settings → Agents → find `MRR: V:TM V20 — <Role>` → toggle on.

## Updating the ruleset later

If you edit any source file (`ruleset.json`, `lorebook.json`, `gm-agent.md`, `agents/*.md`), regenerate `agents.json` and `bundle.json`:

```sh
cd /path/to/Marinara-RPG-Extension
npm run build-agents      # rebuilds agents.json from .md files
npm run build-bundles     # rebuilds bundle.json from ruleset+lorebook+agents
npm run validate-rulesets # confirms ruleset.json shape
npm run validate-bundles  # confirms bundle.json shape
```

Re-import `bundle.json` in Marinara to pick up changes (the framework's idempotency keys overwrite the previous install in place).

## Cross-OS install paths

- **Linux / macOS**: `cp -R rulesets/vtmv20 ~/Marinara/extensions/rulesets/`
- **PowerShell**: `Copy-Item -Recurse rulesets/vtmv20 $HOME/Marinara/extensions/rulesets/`
- **Node**: `node -e "require('fs').cpSync('rulesets/vtmv20', require('os').homedir()+'/Marinara/extensions/rulesets/vtmv20', {recursive: true})"`

(For most users the bundle.json paste-import is enough; the cp commands are only needed if you're hand-editing Marinara's local extension store.)

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
  bundle.json            # The single-file install (76 KB; mrr-bundle envelope)
  ruleset.json           # Sheet + dice + difficulties + derived stats (mrr-vtmv20 ruleset id)
  lorebook.json          # 52 keyword-triggered reference entries (mrr-vtmv20 lorebook)
  agents.json            # Compiled agent metadata (mrr-agents envelope)
  gm-agent.md            # Main Storyteller agent prompt (source for agents.json + bundle.json)
  agents/
    state-mutator.md     # Sub-agent: emit [mrr-state: ...] tags
    state-reminder.md    # Sub-agent: bullet PC state every turn
    combat-adjudicator.md# Sub-agent: V20 combat rules
    lore-query.md        # Sub-agent: answer rules questions
    npc-bookkeeper.md    # Sub-agent: track NPCs across turns
  INSTALL.md             # This file
```

## Companion install — RP-Mode

If you also want to run V:TM V20 in Marinara's roleplay-mode chats (with the engine's default world-state / prose-guardian / continuity / expression agents), install the companion bundle from **Marinara-RPG-RP-Mode-Extension** repo at `rulesets/vtmv20/bundle.json`. Namespace is `mrrp-vtmv20`. The two bundles can coexist — they install into different Marinara namespaces and produce different agent display names (`MRR:` vs `MRRP:`).
