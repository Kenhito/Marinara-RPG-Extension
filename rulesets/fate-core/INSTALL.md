# Installing Fate Core in Marinara Engine

Roughly 10 minutes start to finish. You'll do four things: install the client extension, point it at this ruleset, install the GM agent prompt, install the lorebook.

## Prerequisites

- Marinara Engine running locally (tested against v1.5.6).
- A Game Mode chat already created. The chat's connection should point at a model with strong narrative chops — Claude Sonnet/Opus, GPT-4-class, or a comparable open-weight model. Smaller models can run Fate but lean heavily on the GM agent prompt for structure.
- This repo cloned somewhere. If you don't have it: `git clone https://github.com/Kenhito/Marinara-RPG-Extension.git`.

## 1. Install the client extension (one-time, shared across all rulesets)

Skip this step if you already installed the extension for D&D 5e or Exalted 3e.

In Marinara, open **Settings → Extensions → New Extension**. Set:

- **Name:** `Marinara RPG Rulesets`
- **CSS:** paste the entire contents of `extension/ruleset-loader.css`
- **JavaScript:** paste the entire contents of `extension/ruleset-loader.js`
- **Enabled:** on

Save. Reload Marinara.

## 2. Activate the Fate Core ruleset

After the extension is enabled, you'll see a **Ruleset** button in Marinara's header. Click it.

Two options:

- **Paste:** copy the contents of `rulesets/fate-core/ruleset.json` and paste them into the JSON textarea. Click **Save and reload**.
- **Fetch by URL** (recommended for sharing): in the URL field, paste:
  ```
  https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/fate-core/ruleset.json
  ```
  Click **Fetch URL**, confirm the parsed name appears, then **Save and reload**.

After reload, the character sheet renders in Fate Core flavor: Refresh attribute, 18 standard Fate Core skills, Fate Points / Stress / Consequences as derived stats. The dice widget switches to **4dF + skill** mode.

## 3. Install the Fate Core GM agent

In your Game Mode chat, open the **Agents** panel (or **Custom Agents** in chat settings).

- Create a new custom agent named **Fate GM** (or override the existing GM agent — your call).
- **Phase:** pre_generation
- **Result Type:** context_injection
- **Prompt Template:** paste the entire contents of `rulesets/fate-core/gm-agent.md` into the system prompt field.
- **Enabled:** on

Save. The agent will inject Fate-Core-specific narration and dice-tag instructions before each turn.

## 4. Install the Fate Core lorebook

Open Marinara's **Lorebooks** tab. Create a new lorebook named **Fate Core Rules Reference**, or import the JSON directly:

- **Import:** click **Import Lorebook**, select `rulesets/fate-core/lorebook.json`. The 14 rules entries load with their keyword triggers.
- **Manual:** copy each entry's `keys` and `content` from the JSON file into Marinara's lorebook editor.

Attach the lorebook to your Fate Core chat. Marinara will surface only the relevant entries per turn based on what the players and GM are talking about.

## 5. Build a character

Click the character sheet, Add a character (`+` button in the sheet header), name them, then:

1. Set **Refresh** (default 3, lower if you're taking Stunts at character creation).
2. Set the **skill pyramid** — 1 at +4 (Great), 2 at +3 (Good), 3 at +2 (Fair), 4 at +1 (Average), the rest stay at 0 (Mediocre).
3. Stress and Consequences start empty; they fill during play.
4. Click **save** in the sheet header to download a JSON backup. Click **Sync sheet to chat fields** so the GM agent can see your stats.

## 6. Play

The dice widget rolls 4dF for you and emits the `[fate: ...]` tag into chat. The GM agent narrates outcomes. Aspects, Fate Points, and consequences are tracked in the sheet but the *meaning* of them lives in the fiction — you and the GM agent decide together when to invoke, compel, and absorb.

If a session is going to span multiple chats (Marinara's chat IDs rotate per game session), use **save** in the sheet header to download your character JSON and **load** it in the new chat to preserve your sheet state.

## Troubleshooting

- **"The GM is rolling d20s instead of Fate dice"** — the agent prompt didn't load. Verify the Fate GM agent is enabled and its template starts with "You are the Game Master for a Fate Core campaign."
- **"The dice widget shows attack/proficiency fields"** — the wrong ruleset is active. Click the **Ruleset** header button and confirm Fate Core appears under Library.
- **"My character vanished after starting a new session"** — Marinara's character sheets are keyed to chat ID, which rotates per session. Use the **save** button in the sheet header before ending a session and **load** in the next session's chat. See the top-level README for details.
- **"The GM keeps writing reputation tags that get rejected"** — known Marinara 1.5.6 issue. The reputation tracker schema caps `action` at 50 chars but the GM prompt doesn't tell the model that. Add a sentence to your Fate GM prompt: *"When emitting `[reputation: npc=... action=...]` tags, action MUST be 50 characters or fewer."*
