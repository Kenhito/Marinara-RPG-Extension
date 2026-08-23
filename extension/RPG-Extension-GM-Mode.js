/*
 * Marinara-RPG-Extension — RPG-Extension-GM-Mode.js
 * Client extension that overlays a custom RPG ruleset on Marinara Engine's
 * Game Mode UI. Reads ruleset.json (paste-blob or fetch-by-URL), renders a
 * replacement character sheet, and drives a dice-pool / single-roll widget.
 *
 * Pair with RPG-Extension-GM-Mode.css.
 *
 * License: MIT
 * Source:  https://github.com/Kenhito/Marinara-RPG-Extension
 *
 * Runtime contract: Marinara invokes this file as
 *     new Function("marinara", source)(marinara)
 * so the entire file is a Function body (no import / export / top-level
 * await). All statements run at extension load.
 */

"use strict";

/* ─────  constants  ───── */

var LS_RULESET       = "marinara-rpg-ruleset";
var LS_RULESET_URL   = "marinara-rpg-ruleset-url";
var LS_LIBRARY       = "marinara-rpg-ruleset-library";
var LS_SHEET_PFX     = "mrr-sheet-";
var LS_CHARACTER_PFX = "mrr-character-";  // chat-independent character library (post-v0.4.1)
var LS_SHEET_SIZE    = LS_SHEET_PFX + "size";
var LS_SHEET_COLLAPSED_PFX = LS_SHEET_PFX + "collapsed-";
var LS_SPELLBOOK_POS = "mrr-spellbook-pos";
var LS_INTIMACIES_POS = "mrr-intimacies-pos";
var LS_SPELLBOOK_LB_PFX = "mrr-spellbook-lb-";   // appended with chatId
var LS_PROCESSED_MSGS_PFX = "mrr-processed-msgs-"; // appended with chatId — set of message ids whose state-mutator tags have already applied; persisted so hard-refresh doesn't re-apply historic mutations
var LS_PROCESSED_RUNS_PFX = "mrr-processed-runs-"; // appended with chatId — set of custom-agent run ids whose [mrr-state:] tags have applied via the runs-endpoint transport (B1 replacement)
/* B1 replacement gate. The old console.log sniff of the State Mutator overlay
   is dead on every 2.0.x+ build (engine line is debug-gated console.warn,
   prod-stripped since v1.4.0). The sanctioned source is GET /agents/runs/
   :chatId/custom (exists since engine v1.5.7). Three-stage so a second live
   state-writer is NEVER activated blind:
     "off"   — inert. Narrator DOM path is the sole writer (today's behavior).
     "dump"  — poll + log ONE raw run row, apply NOTHING. Used at the live
               smoke to confirm a run row carries a messageId that matches the
               narrator's data-message-id BEFORE cross-transport dedup can work.
     "apply" — full second transport with shared cross-transport dedup.
   Default "off": nothing changes until the smoke session flips it. */
var MRR_RUNS_POLLER_MODE = "apply"; // "off" | "dump" | "apply" — A6.7 apply stage (2026-08-22: dump confirmed run shape resultData.text + messageId == narrator data-message-id)
var MRR_TAG_SPELLBOOK = "mrr-spellbook";
var MRR_TAG_CHAR_PFX  = "mrr-char-";
var MRR_TAG_CAT_PFX   = "mrr-cat-";
var EXT_VERSION      = "1.0.0";
var BUNDLE_SCHEMA_ID = "mrr-bundle";

/* Markers used by the bundle installer to recognize artifacts it created
   in the user's Marinara database. Single source of truth — install,
   uninstall, and search paths all read from here. */
var MRR_AGENT_TYPE   = "mrr-overlay-v1";
var MRR_TAG_MANAGED  = "mrr-managed";
var MRR_TAG_RS_PFX   = "mrr:";
var MRR_PROMPT_PFX   = "[mrr-v1:";
var MRR_REGEX_NAME_PFX = "MRR: "; /* Vector 9: prefix for engine-native regex scripts installed by bundles. Idempotency by name match — engine RegexScript has no tags field. */
var MRR_TOOL_NAME_PFX = "mrr_"; /* Vector 3: prefix for engine-native custom tools. Tool names enforced ^[a-z][a-z0-9_]*$ — full prefix is mrr_<rulesetIdSnake>_<tool>. Idempotency by name match — engine CustomTool has no tags field. */
var EMBED_STYLE_ID   = "mrr-embedded-style";

/* EMBEDDED_CSS_BEGIN */
var EMBEDDED_CSS = "/*\n * Marinara-RPG-Extension — RPG-Extension-GM-Mode.css\n * Companion stylesheet for RPG-Extension-GM-Mode.js. This file is bundled into\n * the loader automatically via tools/embed-css.mjs — you do not paste it by hand.\n * Install the extension by importing the folder/manifest (or the single .js file)\n * in Marinara Engine -> Settings -> Extensions.\n *\n * License: MIT\n * Source:  https://github.com/Kenhito/Marinara-RPG-Extension\n */\n\n:root {\n  /* Phase 4 — design-token migration: oklch palette + Geist font stack\n   * Ported from ~/projects/claude-design-updates/styles.css. Token NAMES preserved\n   * so existing rules resolve unchanged. New tokens (h/c/l, *-soft, *-line, *-app,\n   * *-input, hairline, hairline-strong, *-text-faint, *-sans) added per prototype.\n   * Tracked in tools/token-migration-map.json. */\n\n  /* tweakable accent (purple, port of prototype --accent-h/c/l) */\n  --mrr-accent-h: 280;\n  --mrr-accent-c: 0.12;\n  --mrr-accent-l: 0.78;\n\n  /* derived accent — original token names preserved */\n  --mrr-accent:       oklch(var(--mrr-accent-l) var(--mrr-accent-c) var(--mrr-accent-h));\n  --mrr-accent-soft:  oklch(var(--mrr-accent-l) var(--mrr-accent-c) var(--mrr-accent-h) / 0.18);\n  --mrr-accent-line:  oklch(var(--mrr-accent-l) var(--mrr-accent-c) var(--mrr-accent-h) / 0.32);\n  --mrr-accent-dim:   oklch(var(--mrr-accent-l) var(--mrr-accent-c) var(--mrr-accent-h) / 0.30);\n  --mrr-on-accent:    oklch(0.18 0.04 var(--mrr-accent-h));\n\n  /* surfaces — purple/dark mood per prototype --bg-app/--bg/--bg-elev/--bg-input */\n  --mrr-bg:           oklch(0.21 0.025 285 / 0.96);\n  --mrr-bg-elev:      oklch(0.26 0.03 285 / 0.92);\n  --mrr-bg-app:       oklch(0.16 0.02 285);\n  --mrr-bg-input:     oklch(0.18 0.02 285);\n\n  /* hairlines (NEW) and borders (NAMES retained) */\n  --mrr-hairline:        oklch(1 0 0 / 0.07);\n  --mrr-hairline-strong: oklch(1 0 0 / 0.14);\n  --mrr-border:          oklch(1 0 0 / 0.10);\n  --mrr-border-strong:   oklch(1 0 0 / 0.20);\n\n  /* tints — port of prototype --tint/--tint-2 (--tint-strong retained) */\n  --mrr-tint-1:       oklch(1 0 0 / 0.04);\n  --mrr-tint-2:       oklch(1 0 0 / 0.07);\n  --mrr-tint-strong:  oklch(1 0 0 / 0.20);\n\n  /* text — three tiers per prototype --text/--text-dim/--text-faint */\n  --mrr-text:        oklch(0.97 0.005 285);\n  --mrr-text-dim:    oklch(0.72 0.01 285);\n  --mrr-text-faint:  oklch(0.55 0.012 285);\n\n  /* status — port of prototype --ok/--warn/--bad */\n  --mrr-success:    oklch(0.82 0.13 155);\n  --mrr-warning:    oklch(0.84 0.14 85);\n  --mrr-fail:       oklch(0.72 0.16 25);\n  --mrr-on-fail:    oklch(0.18 0.02 25);\n\n  /* radii / spacing — preserved (density toggle deferred to step 4.4) */\n  --mrr-radius:     8px;\n  --mrr-radius-sm:  4px;\n  --mrr-pad:        10px;\n  --mrr-gap:        6px;\n\n  /* shadow — ported from prototype --shadow (richer drop) */\n  --mrr-shadow:     0 24px 60px -20px rgba(0, 0, 0, 0.6), 0 6px 16px -8px rgba(0, 0, 0, 0.5);\n\n  /* typography — ported from prototype --sans/--mono (Geist-first stack) */\n  --mrr-sans:       \"Geist\", \"Inter\", system-ui, -apple-system, \"Segoe UI\", sans-serif;\n  --mrr-mono:       \"Geist Mono\", ui-monospace, \"JetBrains Mono\", \"SF Mono\", Menlo, monospace;\n\n  /* layering — preserved */\n  --mrr-z-sheet:    9997;\n  --mrr-z-dice:     9998;\n  --mrr-z-dialog:   9999;\n\n  /* Phase 5 step 5.5 — density toggle (cozy preset defaults; branched per\n   * .mrr-sheet[data-density=\"…\"] at end of file). Drives padding, gap,\n   * row height, and body font-size across density-aware components. */\n  --mrr-density-pad-x: 12px;\n  --mrr-density-pad-y: 12px;\n  --mrr-density-gap:    6px;\n  --mrr-density-row-h: 28px;\n  --mrr-density-fs:    13px;\n}\n\n.mrr-hidden { display: none !important; }\n.mrr-msg--hidden,\n.mrr-dice__result--hidden { display: none; }\n\n/*  ─────  Sheet panel (replaces the hidden built-in attribute panel) ───── */\n\n.mrr-sheet {\n  display: flex;\n  flex-direction: column;\n  gap: var(--mrr-gap);\n  background: var(--mrr-bg);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius);\n  padding: var(--mrr-pad);\n  margin: var(--mrr-gap) 0;\n  color: var(--mrr-text);\n  font-family: var(--mrr-sans);\n  font-size: var(--mrr-density-fs);\n}\n\n.mrr-sheet--floating {\n  position: fixed;\n  left: 16px;\n  top: 80px;\n  width: 320px;\n  min-width: 280px;\n  max-width: calc(100vw - 32px);\n  min-height: 200px;\n  max-height: 70vh;\n  overflow: auto;\n  resize: both;\n  z-index: var(--mrr-z-sheet);\n}\n\n.mrr-sheet__header {\n  display: flex;\n  flex-direction: column;\n  gap: var(--mrr-density-gap);\n  border-bottom: 1px solid var(--mrr-border);\n  padding-bottom: 6px;\n  margin-bottom: 4px;\n}\n\n.mrr-sheet__title-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  width: 100%;\n}\n\n.mrr-sheet__title {\n  font-weight: 600;\n  letter-spacing: 0.02em;\n  color: var(--mrr-accent);\n}\n\n.mrr-sheet__meta {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n}\n\n.mrr-sheet__char-row {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n\n/* Phase 5 step 5.1 — Identity card (port of prototype's `.identity`).\n   Sits at the bottom of the sheet header, immediately above the body.\n   Wraps the existing renderIdentityField inputs so save/load behavior\n   is preserved verbatim. Ruleset-driven sub-row honors identityFields[]\n   when declared; otherwise falls back to header.raceLabel/classLabel.\n   Token names mirror the prototype: __avatar, __main, __name, __sub,\n   __sub-item, __sub-label, __sub-input. Type scale matches UI-build.md\n   §3.4 exactly: name 16px/600, sub-label 9px uppercase letter-spacing\n   0.1em, sub-input 12px borderless text-dim. */\n.mrr-identity {\n  background: linear-gradient(145deg, var(--mrr-accent-soft), transparent 70%), var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-hairline);\n  border-radius: var(--mrr-radius);\n  padding: var(--mrr-pad);\n  display: grid;\n  grid-template-columns: 44px 1fr;\n  gap: 10px;\n  align-items: center;\n  margin-top: var(--mrr-gap);\n}\n.mrr-identity__avatar {\n  width: 44px;\n  height: 44px;\n  border-radius: 10px;\n  background: repeating-linear-gradient(\n    45deg,\n    oklch(0.3 0.04 285) 0 6px,\n    oklch(0.26 0.04 285) 6px 12px\n  );\n  color: var(--mrr-text-dim);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  border: 1px dashed var(--mrr-hairline-strong);\n}\n.mrr-identity__main {\n  min-width: 0;\n}\n.mrr-identity__name {\n  background: transparent;\n  border: 0;\n  color: var(--mrr-text);\n  font-size: 16px;\n  font-weight: 600;\n  padding: 0;\n  width: 100%;\n  outline: none;\n  font-family: inherit;\n}\n.mrr-identity__name:focus {\n  color: var(--mrr-accent);\n}\n.mrr-identity__sub {\n  display: flex;\n  gap: 8px;\n  margin-top: 2px;\n  flex-wrap: wrap;\n}\n.mrr-identity__sub-item {\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n  min-width: 0;\n}\n.mrr-identity__sub-label {\n  font-size: 9px;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--mrr-text-faint);\n}\n.mrr-identity__sub-input {\n  background: transparent;\n  border: 0;\n  color: var(--mrr-text-dim);\n  font-size: 12px;\n  padding: 0;\n  width: 100px;\n  outline: none;\n  font-family: inherit;\n}\n.mrr-identity__sub-input:focus {\n  color: var(--mrr-accent);\n}\n\n.mrr-sheet__char-label {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-char-select {\n  flex: 1;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-family: inherit;\n  font-size: 12px;\n}\n\n.mrr-char-btn {\n  background: var(--mrr-tint-2);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-size: 11px;\n  cursor: pointer;\n  font-family: inherit;\n}\n\n.mrr-char-btn:hover { background: var(--mrr-accent-dim); }\n\n.mrr-char-btn--danger:hover {\n  background: rgba(251, 113, 133, 0.30);\n  border-color: var(--mrr-fail);\n}\n\n.mrr-char-btn--accent {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n}\n\n.mrr-char-btn--dashed {\n  border-style: dashed;\n  border-color: var(--mrr-accent-dim);\n}\n\n.mrr-draggable-handle { cursor: grab; user-select: none; touch-action: none; }\n.mrr-draggable-handle:active { cursor: grabbing; }\n\n.mrr-section {\n  display: flex;\n  flex-direction: column;\n  gap: var(--mrr-density-gap);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: var(--mrr-density-pad-y) var(--mrr-density-pad-x);\n  background: var(--mrr-bg-elev);\n}\n\n.mrr-section__title {\n  font-size: 11px;\n  font-weight: 700;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--mrr-text-dim);\n  margin-bottom: 2px;\n}\n\n.mrr-group {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  margin-bottom: 6px;\n}\n\n.mrr-group__label {\n  font-size: 10px;\n  letter-spacing: 0.10em;\n  text-transform: uppercase;\n  color: var(--mrr-accent);\n  margin-top: 4px;\n}\n\n.mrr-row {\n  display: grid;\n  grid-template-columns: 1fr auto auto auto;\n  align-items: center;\n  gap: var(--mrr-density-gap);\n  padding: 2px 4px;\n  border-radius: var(--mrr-radius-sm);\n}\n\n.mrr-row:hover {\n  background: var(--mrr-tint-1);\n}\n\n.mrr-row--compact {\n  grid-template-columns: 1fr auto auto;\n}\n\n.mrr-row__name {\n  font-weight: 500;\n}\n\n.mrr-row__abbr {\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-row__value {\n  min-width: 32px;\n  text-align: right;\n  font-family: var(--mrr-mono);\n}\n\n/* Editable numeric input — replaces the historical value <span> on every\n   numeric sheet row (attributes, skills, derived, backgrounds, custom\n   skills, bar current values). Visually flush with the surrounding row;\n   the user types directly. The browser's native number-input spinners\n   are suppressed because the +/- stepper next to the field already\n   provides the same affordance and double controls are visual noise. */\n.mrr-row__value--editable {\n  width: 48px;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 1px 4px;\n  font-family: var(--mrr-mono);\n  font-size: 12px;\n  text-align: right;\n  -moz-appearance: textfield;\n}\n.mrr-row__value--editable:focus {\n  outline: none;\n  border-color: var(--mrr-accent);\n  background: var(--mrr-bg);\n}\n.mrr-row__value--editable::-webkit-outer-spin-button,\n.mrr-row__value--editable::-webkit-inner-spin-button {\n  -webkit-appearance: none;\n  margin: 0;\n}\n\n/* Condition row inline effect summary — small, dim, italic so it\n   reads as metadata next to the condition name without competing for\n   the row's primary attention. */\n.mrr-condition-effect {\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  font-style: italic;\n  flex: 1;\n  margin-left: 6px;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n/* Advantage / disadvantage toggle row in the d20 dice widget. */\n.mrr-dice__adv-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  margin: 4px 0;\n}\n.mrr-dice__adv-row label {\n  flex: 0 0 80px;\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n.mrr-adv-btn {\n  flex: 1;\n  padding: 4px 8px;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  font-family: inherit;\n  font-size: 11px;\n  cursor: pointer;\n}\n.mrr-adv-btn:hover { background: var(--mrr-accent-dim); }\n.mrr-adv-btn--active {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-accent);\n}\n\n/* \"/\" separator that sits between the editable current and editable\n   max inputs on bars without an engine-declared cap (D&D HP, etc.).\n   Dimmed because it's a visual cue, not a control. */\n.mrr-bar__sep {\n  font-family: var(--mrr-mono);\n  font-size: 12px;\n  color: var(--mrr-text-dim);\n  padding: 0 2px;\n}\n\n/* Auto-calculated derived stat — value computed from `valueFormula` every\n   time the stat context changes. Read-only by design; the formula IS the\n   override path. Subtle accent stripe on the left distinguishes it from\n   manually-entered values without screaming for attention. */\n.mrr-row__value--autocalc {\n  min-width: 32px;\n  text-align: right;\n  font-family: var(--mrr-mono);\n  color: var(--mrr-accent);\n  border-left: 2px solid var(--mrr-accent-dim);\n  padding-left: 6px;\n}\n\n.mrr-row__roll {\n  font-size: 11px;\n  padding: 2px 6px;\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-accent-dim);\n  border: 1px solid var(--mrr-accent-dim);\n  color: var(--mrr-text);\n  cursor: pointer;\n  font-family: inherit;\n}\n\n.mrr-row__roll:hover { background: var(--mrr-accent); color: var(--mrr-on-accent); }\n\n/*  ─────  Skill proficiency tier button + specialty sub-row  ───── */\n\n/* Shared base for the small letter buttons that sit inside the stepper\n   group on each skill row. Kept separate from `.mrr-stepper button` so\n   the stepper can be 18×18 (numeric +/-) while these are 22×18 (single\n   uppercase letter or \"+S\") without re-spec'ing every property. */\n.mrr-skill-tier-btn,\n.mrr-skill-spec-btn {\n  width: 22px;\n  height: 18px;\n  padding: 0;\n  background: var(--mrr-tint-2);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  font-weight: 700;\n  line-height: 1;\n}\n\n.mrr-skill-tier-btn { letter-spacing: 0.04em; }\n.mrr-skill-spec-btn { border-style: dashed; border-color: var(--mrr-accent-dim); }\n\n.mrr-skill-tier-btn:hover,\n.mrr-skill-spec-btn:hover { background: var(--mrr-accent-dim); }\n\n/* Tier modifier classes — visual cue for the active tier. The renderer\n   adds `--<code>` for the active tier; codes are ruleset-defined so\n   these mappings cover the common cases (PF2e U/T/E/M/L, Exalted U/C/F,\n   D&D U/T/E). Untrained-equivalent stays at the default tint. */\n.mrr-skill-tier-btn--T,\n.mrr-skill-tier-btn--C { background: var(--mrr-tint-strong); }\n.mrr-skill-tier-btn--E,\n.mrr-skill-tier-btn--F { background: var(--mrr-accent-dim); border-color: var(--mrr-accent-dim); }\n.mrr-skill-tier-btn--M { background: var(--mrr-accent); color: var(--mrr-on-accent); border-color: var(--mrr-accent); }\n.mrr-skill-tier-btn--L {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-accent);\n  box-shadow: 0 0 0 1px var(--mrr-accent-dim);\n}\n\n.mrr-skill-spec-row {\n  display: grid;\n  grid-template-columns: 1fr auto auto auto auto;\n  align-items: center;\n  gap: 6px;\n  padding: 2px 4px 2px 18px;\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n  margin-top: 2px;\n}\n\n.mrr-skill-spec-name {\n  width: 100%;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-family: inherit;\n  font-size: 11px;\n}\n\n/* Custom skill / lore row — inherits the specialty layout but adds an\n   attribute selector between the name and the value so user-added skills\n   can declare which attribute they roll under. The select stays compact\n   so the row's grid columns line up with the existing specialty rows. */\n.mrr-custom-skill-row { grid-template-columns: 1fr auto auto auto auto auto; }\n.mrr-custom-skill-attr {\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 1px 4px;\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n}\n\n.mrr-skill-spec-label {\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n}\n\n/*  ─────  Dice widget specialty pane  ───── */\n\n.mrr-dice__specs {\n  margin-top: 8px;\n  padding: 6px 8px;\n  border: 1px dashed var(--mrr-accent-dim);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n}\n\n.mrr-dice__specs-title {\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: 0.10em;\n  text-transform: uppercase;\n  color: var(--mrr-accent);\n  margin-bottom: 4px;\n}\n\n.mrr-dice__spec-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 2px 0;\n  cursor: pointer;\n}\n\n.mrr-dice__spec-checkbox {\n  margin: 0;\n  cursor: pointer;\n}\n\n.mrr-stepper {\n  display: inline-flex;\n  gap: 2px;\n}\n\n.mrr-stepper button {\n  width: 18px;\n  height: 18px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--mrr-tint-2);\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text);\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  padding: 0;\n  line-height: 1;\n}\n\n.mrr-stepper button:hover { background: var(--mrr-accent-dim); }\n.mrr-stepper button:disabled { opacity: 0.4; cursor: not-allowed; }\n\n/*  ─────  Derived stats  ───── */\n\n.mrr-derived {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.mrr-derived__formula {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-bar {\n  position: relative;\n  height: 14px;\n  background: var(--mrr-tint-2);\n  border-radius: var(--mrr-radius-sm);\n  overflow: hidden;\n}\n\n.mrr-bar__fill {\n  position: absolute;\n  inset: 0;\n  background: linear-gradient(90deg, var(--mrr-accent-dim), var(--mrr-accent));\n  width: 0;\n  transition: width 0.18s ease-out;\n}\n\n.mrr-bar__label {\n  position: relative;\n  z-index: 1;\n  font-size: 10px;\n  font-family: var(--mrr-mono);\n  text-align: center;\n  line-height: 14px;\n  color: var(--mrr-text);\n  text-shadow: 0 0 2px rgba(0,0,0,0.6);\n}\n\n.mrr-track {\n  display: flex;\n  gap: 3px;\n  flex-wrap: wrap;\n}\n\n.mrr-track__cell {\n  min-width: 38px;\n  padding: 2px 6px;\n  font-size: 10px;\n  font-family: var(--mrr-mono);\n  text-align: center;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n  cursor: pointer;\n  user-select: none;\n}\n\n.mrr-track__cell--filled {\n  background: var(--mrr-fail);\n  color: var(--mrr-on-fail);\n  border-color: var(--mrr-fail);\n}\n\n.mrr-track__cell--active {\n  outline: 2px solid var(--mrr-warning);\n}\n\n.mrr-track__cell--extra {\n  border-style: dashed;\n  border-color: var(--mrr-accent-dim);\n}\n\n/*  ─────  Damage-type tones  ─────\n    Used by rulesets that declare damageTypes on a track-renderAs derived\n    stat (Exalted, WoD, anything Storyteller-flavored). Bashing is mild\n    (warning yellow), Lethal is severe (fail red, same hue as legacy\n    single-fill), Aggravated is dire (deep maroon — meant to read as\n    'something supernatural just hit you'). The renderer overlays the\n    damage-type label (B/L/A) on the cell when filled. */\n.mrr-track__cell--bashing {\n  background: var(--mrr-warning);\n  color: #1a0f0f;\n  border-color: var(--mrr-warning);\n}\n.mrr-track__cell--lethal {\n  background: var(--mrr-fail);\n  color: var(--mrr-on-fail);\n  border-color: var(--mrr-fail);\n}\n.mrr-track__cell--aggravated {\n  background: #5a1a1a;\n  color: #f5f0ff;\n  border-color: #7a2a2a;\n  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);\n}\n\n.mrr-track-ctrl {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 4px;\n  margin-top: 4px;\n}\n\n.mrr-track-ctrl__label {\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  margin-right: 2px;\n}\n\n.mrr-track-add-btn {\n  background: var(--mrr-tint-2);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 1px 6px;\n  font-size: 10px;\n  font-family: var(--mrr-mono);\n  cursor: pointer;\n}\n\n.mrr-track-add-btn:hover { background: var(--mrr-accent-dim); }\n\n.mrr-track-add-btn--danger:hover {\n  background: rgba(251, 113, 133, 0.30);\n  border-color: var(--mrr-fail);\n}\n\n.mrr-saved-indicator {\n  font-size: 10px;\n  color: var(--mrr-success);\n  font-family: var(--mrr-mono);\n  margin-left: 6px;\n  white-space: nowrap;\n}\n\n/*  ─────  States (anima banner / stunt tier / D&D conditions)  ───── */\n\n.mrr-state {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 6px;\n  padding: 4px 0;\n}\n\n.mrr-state__name { font-weight: 500; }\n\n.mrr-state__select {\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-family: inherit;\n  font-size: 12px;\n}\n\n/*  ─────  Floating dice widget  ───── */\n\n.mrr-dice {\n  position: fixed;\n  top: 80px;\n  right: 16px;\n  width: 280px;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border-strong);\n  border-radius: var(--mrr-radius);\n  padding: var(--mrr-pad);\n  box-shadow: var(--mrr-shadow);\n  z-index: var(--mrr-z-dice);\n  font-size: var(--mrr-density-fs);\n  display: none;\n}\n\n.mrr-dice--open { display: block; }\n\n.mrr-dice__header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 6px;\n  padding-bottom: 6px;\n  border-bottom: 1px solid var(--mrr-border);\n}\n\n.mrr-dice__title {\n  font-weight: 600;\n  color: var(--mrr-accent);\n}\n\n.mrr-dice__close {\n  background: transparent;\n  border: 0;\n  color: var(--mrr-text-dim);\n  font-size: 18px;\n  cursor: pointer;\n  line-height: 1;\n}\n\n.mrr-dice__row {\n  display: flex;\n  gap: 6px;\n  align-items: center;\n  margin: 4px 0;\n}\n\n.mrr-dice__row label {\n  flex: 0 0 80px;\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-dice__input {\n  flex: 1;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 4px 6px;\n  font-family: var(--mrr-mono);\n  font-size: var(--mrr-density-fs);\n  width: 100%;\n}\n\n.mrr-dice__btn {\n  width: 100%;\n  margin-top: 6px;\n  padding: 6px 10px;\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border: 0;\n  border-radius: var(--mrr-radius-sm);\n  font-weight: 600;\n  cursor: pointer;\n  font-family: inherit;\n}\n\n.mrr-dice__btn:hover { filter: brightness(1.1); }\n\n.mrr-dice__btn--secondary {\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n}\n\n.mrr-dice__btn--row-spaced { margin-top: 4px; }\n\n.mrr-dice__result {\n  margin-top: 8px;\n  padding: 8px;\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  font-family: var(--mrr-mono);\n  font-size: 12px;\n  white-space: pre-wrap;\n}\n\n.mrr-dice__result--success { border-color: var(--mrr-success); }\n.mrr-dice__result--fail    { border-color: var(--mrr-fail); }\n.mrr-dice__result--botch   { border-color: var(--mrr-warning); background: rgba(251, 191, 36, 0.10); }\n.mrr-dice__result--tie     { border-color: var(--mrr-warning); }\n\n.mrr-dice__faces {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 3px;\n  margin-top: 6px;\n}\n\n.mrr-dice__face {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-width: 22px;\n  height: 22px;\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n}\n\n.mrr-dice__face--success { background: var(--mrr-accent-dim); border-color: var(--mrr-accent); }\n.mrr-dice__face--double  { background: var(--mrr-accent); color: var(--mrr-on-accent); }\n.mrr-dice__face--one     { background: rgba(251, 113, 133, 0.20); border-color: var(--mrr-fail); }\n\n/*  ─────  Header gear button + dialog  ───── */\n\n.mrr-gear-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  margin-left: 8px;\n  padding: 4px 8px;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  font-family: inherit;\n  font-size: 12px;\n}\n\n.mrr-gear-btn:hover { background: var(--mrr-accent-dim); }\n\n/*  ─────  Header sheet-toggle button (scroll icon)  ───── */\n\n.mrr-sheet-toggle-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 32px;\n  height: 32px;\n  margin-left: 8px;\n  padding: 0;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: 50%;\n  cursor: pointer;\n  font-family: inherit;\n  vertical-align: middle;\n}\n\n.mrr-sheet-toggle-btn:hover { background: var(--mrr-accent-dim); }\n\n.mrr-sheet-toggle-btn--active {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-accent);\n}\n\n.mrr-sheet-toggle-btn svg {\n  width: 18px;\n  height: 18px;\n  display: block;\n}\n\n.mrr-dialog-backdrop {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.55);\n  z-index: var(--mrr-z-dialog);\n  display: none;\n  align-items: center;\n  justify-content: center;\n}\n\n.mrr-dialog-backdrop--open { display: flex; }\n\n.mrr-dialog {\n  width: min(560px, 92vw);\n  max-height: 80vh;\n  overflow: auto;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border-strong);\n  border-radius: var(--mrr-radius);\n  padding: 16px;\n  box-shadow: var(--mrr-shadow);\n}\n\n.mrr-dialog h3 {\n  margin: 0 0 8px;\n  color: var(--mrr-accent);\n  font-size: 16px;\n}\n\n.mrr-dialog p {\n  color: var(--mrr-text-dim);\n  font-size: 12px;\n  margin: 4px 0 8px;\n}\n\n.mrr-dialog textarea {\n  width: 100%;\n  min-height: 220px;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 8px;\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  resize: vertical;\n}\n\n.mrr-dialog__row {\n  display: flex;\n  gap: 6px;\n  align-items: center;\n  margin: 8px 0;\n}\n\n.mrr-dialog__label {\n  flex: 0 0 50px;\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-dialog__buttons {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  justify-content: flex-end;\n  margin-top: 12px;\n}\n\n.mrr-dialog__lib-title {\n  margin-top: 18px;\n  border-top: 1px solid var(--mrr-border);\n  padding-top: 14px;\n}\n.mrr-dialog__lib-help {\n  font-size: 12px;\n  opacity: 0.8;\n  margin-top: 4px;\n}\n.mrr-dialog__lib {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  margin-top: 8px;\n}\n.mrr-dialog__lib-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 6px 8px;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: rgba(0, 0, 0, 0.15);\n}\n.mrr-dialog__lib-name {\n  flex: 1;\n  font-family: var(--mrr-mono);\n  font-size: var(--mrr-density-fs);\n}\n\n.mrr-msg {\n  margin-top: 6px;\n  padding: 6px 8px;\n  border-radius: var(--mrr-radius-sm);\n  font-size: 12px;\n  font-family: var(--mrr-mono);\n}\n\n.mrr-msg--ok    { background: rgba(110, 231, 183, 0.12); border: 1px solid var(--mrr-success); }\n.mrr-msg--err   { background: rgba(251, 113, 133, 0.12); border: 1px solid var(--mrr-fail); }\n.mrr-msg--info  { background: rgba(212, 168, 255, 0.10); border: 1px solid var(--mrr-accent-dim); }\n\n/*  ─────  Inventory section + item editor  ───── */\n\n.mrr-inv-list {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.mrr-inv-item {\n  display: grid;\n  grid-template-columns: 1fr auto auto auto auto;\n  align-items: center;\n  gap: 6px;\n  padding: 4px 6px;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n}\n\n.mrr-inv-item--equipped {\n  border-color: var(--mrr-accent);\n  background: var(--mrr-tint-2);\n}\n\n.mrr-inv-item__name {\n  font-weight: 500;\n}\n\n.mrr-inv-item__slot {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n}\n\n/* Damage cell on a weapon row — visually distinct from the slot tag so a\n   skim of the inventory tells the player at a glance which items hit\n   and how much. Color picks up the warning hue (the cue for \"this is\n   the violent thing\"). */\n.mrr-inv-item__damage {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-warning);\n  white-space: nowrap;\n}\n\n.mrr-inv-item__bonus-summary {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-accent);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.mrr-inv-empty {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n  font-style: italic;\n}\n\n.mrr-item-form__row {\n  display: grid;\n  grid-template-columns: 70px 1fr;\n  align-items: center;\n  gap: 12px;\n  margin: 6px 0;\n}\n\n.mrr-item-form__row label {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n  text-align: right;\n}\n\n.mrr-item-form__input,\n.mrr-item-form__select {\n  width: 100%;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 4px 6px;\n  font-family: inherit;\n  font-size: 12px;\n}\n\n.mrr-item-form__textarea {\n  width: 100%;\n  min-height: 50px;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 4px 6px;\n  font-family: inherit;\n  font-size: 12px;\n  resize: vertical;\n}\n\n.mrr-bonus-list {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  margin-top: 4px;\n  padding: 6px;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: rgba(0, 0, 0, 0.10);\n}\n\n.mrr-bonus-list__title {\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: 0.10em;\n  text-transform: uppercase;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-bonus-row {\n  display: grid;\n  grid-template-columns: 2fr 50px 70px 1.2fr auto;\n  align-items: center;\n  gap: 4px;\n}\n\n.mrr-bonus-row__input {\n  width: 100%;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border-strong);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 4px;\n  font-family: inherit;\n  font-size: 11px;\n}\n\n/* <option> elements ignore most parent styling on Linux/Chromium and fall back\n   to OS-default (often white bg + inherited near-white text => invisible until\n   highlighted). Explicit colors here force a readable dark dropdown panel. */\n.mrr-bonus-row__input option,\n.mrr-item-form__select option,\n.mrr-item-form__input option {\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n}\n\n/*  ─────  Derived / skill row equipment-bonus suffix  ───── */\n\n.mrr-row__bonus {\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  color: var(--mrr-success);\n  margin-left: 2px;\n}\n\n.mrr-row__bonus--neg { color: var(--mrr-fail); }\n\n/*  ─────  Derived value cap suffix (\"/ max\")  ───── */\n\n.mrr-row__cap {\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n  margin-left: 2px;\n  white-space: nowrap;\n}\n\n\n/*  ─────  state-mutator tag visual hiding  ───── */\n/* The state-mutator agent instructs the main model to emit\n   [mrr-state: ...] tags inline at paragraph ends. The extension's\n   chat observer parses + applies them, then wraps each tag in a\n   span.mrr-state-tag for this CSS rule to hide visually. The state\n   change itself has already been applied to localStorage; the tag\n   is purely a wire-format artifact and should not appear in chat. */\n.mrr-state-tag { display: none; }\n\n/*  ─────  state mutation confirmation toast  ───── */\n/* Top-right floating stack of brief notifications shown when the\n   state-mutator agent's tags fire. Each toast confirms one mutation:\n   prefix (HP / Condition / Inventory), change (signed delta or +/- name),\n   and the agent-reported reason. Stacks vertically; auto-dismisses. */\n.mrr-toast-container {\n  position: fixed;\n  top: 16px;\n  right: 16px;\n  z-index: 10000;\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  pointer-events: none;\n}\n\n.mrr-toast {\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-left: 3px solid var(--mrr-accent);\n  border-radius: var(--mrr-radius-sm);\n  padding: 8px 12px;\n  font-family: inherit;\n  font-size: 12px;\n  box-shadow: var(--mrr-shadow);\n  opacity: 0;\n  transform: translateX(20px);\n  transition: opacity 0.25s ease-out, transform 0.25s ease-out;\n  pointer-events: auto;\n  display: flex;\n  gap: 8px;\n  align-items: baseline;\n  max-width: 320px;\n}\n\n.mrr-toast--visible {\n  opacity: 1;\n  transform: translateX(0);\n}\n\n.mrr-toast__prefix {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  text-transform: uppercase;\n  letter-spacing: 0.08em;\n  color: var(--mrr-text-dim);\n  flex-shrink: 0;\n}\n\n.mrr-toast__change {\n  font-family: var(--mrr-mono);\n  font-weight: 700;\n  color: var(--mrr-accent);\n  flex-shrink: 0;\n}\n\n.mrr-toast__reason {\n  color: var(--mrr-text-dim);\n  font-size: 11px;\n  font-style: italic;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n/*  ─────  Spellbook flyout (third floating panel, system-labeled)  ───── */\n/* Per-ruleset abilities/charms/stunts panel. Toggled from the main sheet's\n   spellbook row; renders one collapsible category section per\n   ruleset.abilities.categories[]. Position persists to mrr-spellbook-pos\n   (per-extension, not per-chat). Z-index sits between sheet and dice so\n   the dice widget can overlap it on roll. */\n\n.mrr-spellbook {\n  position: fixed;\n  top: 80px;\n  left: 360px;\n  width: 320px;\n  max-height: 70vh;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border-strong);\n  border-radius: var(--mrr-radius);\n  padding: var(--mrr-pad);\n  box-shadow: var(--mrr-shadow);\n  z-index: 9996;\n  font-size: var(--mrr-density-fs);\n  display: none;\n  flex-direction: column;\n  overflow: hidden;\n}\n\n.mrr-spellbook--open { display: flex; }\n\n.mrr-spellbook__header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 6px;\n  padding-bottom: 6px;\n  border-bottom: 1px solid var(--mrr-border);\n  cursor: grab;\n  user-select: none;\n}\n\n.mrr-spellbook__header:active { cursor: grabbing; }\n\n.mrr-spellbook__title {\n  font-weight: 600;\n  color: var(--mrr-accent);\n}\n\n.mrr-spellbook__body {\n  flex: 1;\n  overflow-y: auto;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.mrr-spellbook-row {\n  cursor: default;\n}\n\n.mrr-spellbook-row__btn {\n  width: 100%;\n  text-align: left;\n}\n\n.mrr-spellbook-cat {\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n  padding: 4px 6px;\n}\n\n.mrr-spellbook-cat__head {\n  width: 100%;\n  background: transparent;\n  color: var(--mrr-text);\n  border: 0;\n  padding: 4px 2px;\n  font-family: inherit;\n  font-size: 12px;\n  font-weight: 600;\n  text-align: left;\n  cursor: pointer;\n  letter-spacing: 0.04em;\n}\n\n.mrr-spellbook-cat__head:hover { color: var(--mrr-accent); }\n\n.mrr-spellbook-cat__list {\n  display: flex;\n  flex-direction: column;\n  gap: 3px;\n  margin-top: 4px;\n}\n\n.mrr-spellbook-cat--collapsed .mrr-spellbook-cat__list,\n.mrr-spellbook-cat--collapsed .mrr-spellbook-cat__add {\n  display: none;\n}\n\n.mrr-spellbook-cat__add {\n  margin-top: 4px;\n}\n\n.mrr-spellbook-ab {\n  display: grid;\n  grid-template-columns: 1fr auto auto auto;\n  align-items: center;\n  gap: 4px;\n  padding: 2px 4px;\n  background: var(--mrr-bg-elev);\n  border-radius: var(--mrr-radius-sm);\n  border: 1px solid var(--mrr-border);\n}\n\n.mrr-spellbook-ab__name {\n  font-weight: 500;\n  font-size: 12px;\n}\n\n.mrr-spellbook-ab__cost {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  white-space: nowrap;\n}\n\n/*  ─────  Chip primitive  ─────────────────────────────────────────────────\n    Small inline pill used for status-flavored item details: Hardness,\n    Overwhelming, intimacy kind. Tints lean on existing CSS variables so\n    the palette stays consistent. */\n.mrr-chip {\n  display: inline-flex;\n  align-items: center;\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  line-height: 1;\n  padding: 2px 6px;\n  border-radius: 999px;\n  border: 1px solid var(--mrr-border);\n  background: var(--mrr-tint-1);\n  color: var(--mrr-text-dim);\n  white-space: nowrap;\n}\n\n.mrr-chip--hardness {\n  color: #b9d8ff;\n  border-color: rgba(133, 173, 220, 0.45);\n  background: rgba(80, 120, 180, 0.18);\n}\n\n.mrr-chip--overwhelming {\n  color: #ffd0a8;\n  border-color: rgba(220, 140, 80, 0.45);\n  background: rgba(180, 90, 40, 0.20);\n}\n\n/* Commitment chips — surface per-item magic-binding state on the inventory\n   row. Attuned and Invested share the accent palette (the system's \"magic\n   is active\" cue). Mote uses the warning hue since Exalted essence reads\n   as \"energy held in reserve\" rather than a passive enchantment. */\n.mrr-chip--attuned {\n  color: var(--mrr-on-accent);\n  background: var(--mrr-accent);\n  border-color: var(--mrr-accent);\n  font-weight: 600;\n  letter-spacing: 0.04em;\n}\n\n.mrr-chip--invested {\n  color: var(--mrr-on-accent);\n  background: var(--mrr-accent);\n  border-color: var(--mrr-accent);\n  font-weight: 600;\n  letter-spacing: 0.04em;\n}\n\n.mrr-chip--mote {\n  color: #1a0f0f;\n  background: var(--mrr-warning);\n  border-color: var(--mrr-warning);\n  font-weight: 600;\n  letter-spacing: 0.04em;\n}\n\n.mrr-chip--intimacy-kind {\n  cursor: pointer;\n  background: var(--mrr-tint-2);\n  border-color: var(--mrr-border-strong);\n  color: var(--mrr-text);\n  font-weight: 600;\n  letter-spacing: 0.04em;\n}\n\n.mrr-chip--intimacy-kind-tie {\n  color: var(--mrr-accent);\n  border-color: var(--mrr-accent-dim);\n}\n\n.mrr-chip--intimacy-kind-principle {\n  color: var(--mrr-success);\n  border-color: rgba(110, 231, 183, 0.45);\n  background: rgba(110, 231, 183, 0.10);\n}\n\n/*  ─────  Intimacies flyout panel  ────────────────────────────────────────\n    Shares the .mrr-spellbook structural classes so position, header,\n    body scroll, and category collapse all \"just work.\" Only the layout\n    of an individual intimacy row is custom: a two-line grid with the\n    kind chip + degree dropdown + delete on the first line and the text\n    input on the second so the field is wide enough to read. */\n.mrr-intimacies { /* inherits .mrr-spellbook positioning + open class */ }\n\n.mrr-intimacy-group {\n  /* inherits .mrr-spellbook-cat */\n}\n\n.mrr-intimacy-group--defining .mrr-spellbook-cat__head {\n  color: var(--mrr-accent);\n}\n\n.mrr-intimacy-row {\n  display: grid;\n  grid-template-columns: auto 1fr auto auto;\n  align-items: center;\n  gap: 4px;\n  padding: 4px;\n  background: var(--mrr-bg-elev);\n  border-radius: var(--mrr-radius-sm);\n  border: 1px solid var(--mrr-border);\n}\n\n.mrr-intimacy-row__text {\n  grid-column: 1 / -1;\n  width: 100%;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 4px 6px;\n  font-family: inherit;\n  font-size: 12px;\n  order: 2;\n}\n\n.mrr-intimacy-row > .mrr-chip--intimacy-kind { order: 1; }\n\n.mrr-intimacy-row__degree {\n  order: 3;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 4px;\n  font-family: inherit;\n  font-size: 11px;\n}\n\n.mrr-intimacy-row__target {\n  order: 4;\n  grid-column: 1 / -1;\n  width: 100%;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 3px 6px;\n  font-family: inherit;\n  font-size: 11px;\n  font-style: italic;\n}\n\n.mrr-intimacy-row > .mrr-char-btn--danger { order: 5; }\n\n.mrr-intimacies__top-add {\n  width: 100%;\n  margin-bottom: 4px;\n}\n\n/*  ─────  XP card  ─────────────────────────────────────────────────────────\n    Sits between identity row and the section list in the main sheet. Two\n    layouts driven by ruleset.resolution.mode:\n      \"single-roll\" (D&D, PF2e) — level + current/next + 4px progress bar\n                                  fed by ruleset.xpTable\n      \"dice-pool\"   (Exalted)   — current + total earned + +1 XP button\n                                  (a pure int accumulator)\n    Hidden entirely for rulesets whose mode isn't one of the two above\n    (Fate Core uses Fate Points, not XP). */\n\n.mrr-xp-card {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding: 8px 10px;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  margin-top: 4px;\n}\n\n.mrr-xp-card__label {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--mrr-accent);\n}\n\n.mrr-xp-card__row {\n  display: flex;\n  align-items: flex-end;\n  gap: 8px;\n  flex-wrap: wrap;\n}\n\n.mrr-xp-card__group {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  min-width: 60px;\n}\n\n.mrr-xp-card__sub {\n  font-size: 9px;\n  letter-spacing: 0.10em;\n  text-transform: uppercase;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-xp-card__input {\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-family: var(--mrr-mono);\n  font-size: 14px;\n  font-weight: 600;\n  text-align: right;\n  width: 80px;\n  font-variant-numeric: tabular-nums;\n  -moz-appearance: textfield;\n}\n\n.mrr-xp-card__input:focus {\n  outline: none;\n  border-color: var(--mrr-accent);\n  background: var(--mrr-bg-elev);\n}\n\n.mrr-xp-card__input::-webkit-outer-spin-button,\n.mrr-xp-card__input::-webkit-inner-spin-button {\n  -webkit-appearance: none;\n  margin: 0;\n}\n\n.mrr-xp-card__input--lvl {\n  width: 50px;\n  font-size: 16px;\n  text-align: center;\n}\n\n.mrr-xp-card__sep {\n  font-family: var(--mrr-mono);\n  font-size: 16px;\n  color: var(--mrr-text-dim);\n  align-self: flex-end;\n  padding-bottom: 2px;\n}\n\n.mrr-xp-card__next {\n  font-family: var(--mrr-mono);\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--mrr-text);\n  padding: 2px 6px;\n  font-variant-numeric: tabular-nums;\n  align-self: flex-end;\n}\n\n.mrr-xp-card__bar {\n  height: 4px;\n  background: var(--mrr-tint-2);\n  border-radius: 2px;\n  overflow: hidden;\n}\n\n.mrr-xp-card__bar-fill {\n  height: 100%;\n  background: var(--mrr-accent);\n  width: 0;\n  transition: width 0.18s ease-out;\n}\n\n.mrr-xp-card__add {\n  align-self: flex-start;\n  background: var(--mrr-accent-dim);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-accent);\n  border-radius: var(--mrr-radius-sm);\n  padding: 4px 10px;\n  font-family: inherit;\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.05em;\n  cursor: pointer;\n}\n\n.mrr-xp-card__add:hover {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n}\n\n/* ═══════════════════════════════════════════════════════════════\n * Phase 3.1 — row-primitive CSS (mrr-p3-* namespace)\n * ═══════════════════════════════════════════════════════════════\n * Sibling to the existing .mrr-section / .mrr-row / .mrr-stepper /\n * .mrr-bar rules used by the running renderer. Phase-3 namespace\n * prevents collision; cutover in a future session renames or\n * removes the -p3 infix when the new renderer is the only path.\n *\n * Density values inlined as cozy defaults (12/8/30/13). Token\n * migration will swap these for --density-* later.\n * ═══════════════════════════════════════════════════════════════ */\n\n.mrr-p3-section {\n  /* display:flex + column makes the card a flex container AND fixes\n     the flex-item height collapse: when this card is itself a flex\n     item of .mrr-sheet (which is column flex), Chrome computes its\n     intrinsic min-height as 0 if the card isn't a flex container,\n     which causes head + body to render outside the card's painted\n     bounds. Matching the existing .mrr-section pattern (also column\n     flex) keeps the card sized to its children. overflow:hidden\n     dropped — children have padding so they don't bleed past the\n     rounded corners. */\n  display: flex;\n  flex-direction: column;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius);\n  margin-bottom: 8px;\n}\n.mrr-p3-section__head {\n  padding: var(--mrr-density-pad-y) var(--mrr-density-pad-x);\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  user-select: none;\n  border-bottom: 1px solid transparent;\n}\n.mrr-p3-section--open .mrr-p3-section__head { border-bottom-color: var(--mrr-border); }\n.mrr-p3-section__head:hover { background: var(--mrr-tint-1); }\n.mrr-p3-section__title {\n  font-size: 11px;\n  font-weight: 700;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--mrr-text);\n}\n.mrr-p3-section__count {\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n}\n.mrr-p3-section__actions {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n}\n.mrr-p3-section__right { margin-left: auto; }\n.mrr-p3-section__chev {\n  margin-left: auto;\n  color: var(--mrr-text-dim);\n  transition: transform 150ms ease;\n  display: inline-block;\n}\n.mrr-p3-section--open .mrr-p3-section__chev { transform: rotate(90deg); }\n.mrr-p3-section__body {\n  display: none;\n  padding: 8px var(--mrr-density-pad-x) var(--mrr-density-pad-y);\n  flex-direction: column;\n  gap: 8px;\n}\n.mrr-p3-section--open .mrr-p3-section__body { display: flex; }\n\n/* Stepper */\n.mrr-p3-stepper {\n  display: inline-flex;\n  gap: 2px;\n}\n.mrr-p3-stepper button {\n  width: 22px;\n  height: 22px;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  cursor: pointer;\n  font-size: 13px;\n  border-radius: var(--mrr-radius-sm);\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0;\n}\n.mrr-p3-stepper button:hover {\n  background: var(--mrr-accent-dim);\n  color: var(--mrr-text);\n  border-color: var(--mrr-border-strong);\n}\n\n/* Row base + variants */\n.mrr-p3-row {\n  display: grid;\n  align-items: center;\n  gap: 8px;\n  padding: 4px 8px;\n  height: var(--mrr-density-row-h);\n  border-radius: var(--mrr-radius-sm);\n}\n.mrr-p3-row:hover { background: var(--mrr-tint-1); }\n.mrr-p3-row--attr { grid-template-columns: 1fr auto auto auto auto; }\n.mrr-p3-row--skill {\n  grid-template-columns: 1fr auto auto auto;\n  align-items: start;\n  height: auto;\n  min-height: var(--mrr-density-row-h);\n}\n.mrr-p3-row--save { grid-template-columns: 1fr auto auto auto; }\n.mrr-p3-row__name {\n  font-size: var(--mrr-density-fs);\n  color: var(--mrr-text);\n  display: inline-flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 4px;\n}\n.mrr-p3-row__abbr {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  margin-left: 4px;\n}\n.mrr-p3-row__kind {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  text-transform: uppercase;\n  letter-spacing: 0.08em;\n  margin-left: 6px;\n}\n.mrr-p3-row__gear {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-accent);\n  margin-left: 6px;\n  padding: 1px 5px;\n  border: 1px solid var(--mrr-accent-dim);\n  border-radius: 6px;\n  background: var(--mrr-tint-1);\n}\n.mrr-p3-row__mod {\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n  min-width: 22px;\n  text-align: right;\n}\n.mrr-p3-row__main {\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.mrr-p3-row__del {\n  background: transparent;\n  border: 0;\n  color: var(--mrr-text-dim);\n  font-size: 14px;\n  cursor: pointer;\n  padding: 0 4px;\n  margin-left: auto;\n  line-height: 1;\n}\n.mrr-p3-row__del:hover { color: var(--mrr-warning); }\n.mrr-p3-row__val {\n  width: 64px;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text);\n  font-family: var(--mrr-mono);\n  font-size: 12px;\n  padding: 4px 6px;\n  border-radius: var(--mrr-radius-sm);\n  text-align: center;\n}\n.mrr-p3-row__val::-webkit-outer-spin-button,\n.mrr-p3-row__val::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }\n.mrr-p3-row__val:focus { outline: 0; border-color: var(--mrr-accent); }\n.mrr-p3-row__val--auto {\n  background: transparent;\n  border: 0;\n  font-size: var(--mrr-density-fs);\n  font-weight: 600;\n  font-feature-settings: \"tnum\";\n  font-variant-numeric: tabular-nums;\n  color: var(--mrr-text);\n}\n.mrr-p3-row__roll {\n  background: transparent;\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  padding: 4px 10px;\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  min-width: 48px;\n}\n.mrr-p3-row__roll:hover {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-accent);\n}\n.mrr-p3-row__roll--sm {\n  padding: 2px 6px;\n  font-size: 10px;\n  min-width: 0;\n}\n\n/* Tier pill */\n.mrr-p3-tier {\n  width: 36px;\n  height: 22px;\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  font-weight: 700;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  padding: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n}\n.mrr-p3-tier:hover { background: var(--mrr-accent-dim); }\n.mrr-p3-tier--T {\n  background: var(--mrr-tint-2);\n  color: var(--mrr-text);\n  border-color: var(--mrr-border-strong);\n}\n.mrr-p3-tier--E {\n  background: var(--mrr-accent-dim);\n  border-color: var(--mrr-border-strong);\n  color: var(--mrr-text);\n}\n.mrr-p3-tier--M {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-accent);\n}\n\n/* Specialty chips + editor */\n.mrr-p3-row__spec-toggle {\n  background: transparent;\n  border: 1px dashed var(--mrr-border);\n  color: var(--mrr-text-dim);\n  font-size: 10px;\n  padding: 1px 6px;\n  border-radius: 6px;\n  cursor: pointer;\n  margin-left: 6px;\n}\n.mrr-p3-row__spec-toggle:hover {\n  border-style: solid;\n  border-color: var(--mrr-border-strong);\n  color: var(--mrr-accent);\n}\n.mrr-p3-row__specs {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px;\n  margin-top: 2px;\n}\n.mrr-p3-spec-chip {\n  background: var(--mrr-tint-1);\n  border: 1px solid var(--mrr-border);\n  border-radius: 6px;\n  padding: 2px 6px;\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  cursor: pointer;\n  font-size: 11px;\n  color: var(--mrr-text);\n}\n.mrr-p3-spec-chip:hover {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n}\n.mrr-p3-spec-chip__name { font-weight: 500; }\n.mrr-p3-spec-chip__dice {\n  font-family: var(--mrr-mono);\n  font-size: 9.5px;\n  opacity: 0.85;\n}\n.mrr-p3-spec-chip__x {\n  margin-left: 2px;\n  opacity: 0.7;\n  cursor: pointer;\n  padding: 0 2px;\n}\n.mrr-p3-spec-chip__x:hover { opacity: 1; color: var(--mrr-warning); }\n.mrr-p3-row__spec-editor {\n  display: flex;\n  gap: 4px;\n  align-items: center;\n  margin-top: 4px;\n}\n.mrr-p3-row__spec-input {\n  flex: 1;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text);\n  font-size: 12px;\n  padding: 4px 6px;\n  border-radius: var(--mrr-radius-sm);\n}\n.mrr-p3-row__spec-input:focus { outline: 0; border-color: var(--mrr-accent); }\n.mrr-p3-row__spec-add,\n.mrr-p3-row__spec-done {\n  background: transparent;\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  font-size: 11px;\n  padding: 4px 8px;\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n}\n.mrr-p3-row__spec-add:hover { border-color: var(--mrr-accent); color: var(--mrr-accent); }\n.mrr-p3-row__spec-done:hover { border-color: var(--mrr-border-strong); color: var(--mrr-text); }\n\n/* Auto-calc bonus pill (skill + save rows) */\n.mrr-p3-save__bonus {\n  font-feature-settings: \"tnum\";\n  font-variant-numeric: tabular-nums;\n  font-size: 13px;\n  font-weight: 600;\n  color: var(--mrr-accent);\n}\n.mrr-p3-row--save .mrr-p3-save__bonus { color: var(--mrr-accent); }\n\n/* Bar */\n.mrr-p3-bar {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  padding: 6px 8px;\n}\n.mrr-p3-bar__top {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 8px;\n}\n.mrr-p3-bar__name {\n  font-size: 12px;\n  font-weight: 500;\n  color: var(--mrr-text);\n}\n.mrr-p3-bar__values {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  font-family: var(--mrr-mono);\n  font-size: 12px;\n  color: var(--mrr-text-dim);\n}\n.mrr-p3-bar__val-input {\n  width: 40px;\n  background: transparent;\n  border: 0;\n  border-bottom: 1px dotted var(--mrr-border);\n  color: var(--mrr-text);\n  font-family: var(--mrr-mono);\n  font-size: 12px;\n  text-align: center;\n  padding: 1px 0;\n}\n.mrr-p3-bar__val-input::-webkit-outer-spin-button,\n.mrr-p3-bar__val-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }\n.mrr-p3-bar__val-input:hover,\n.mrr-p3-bar__val-input:focus {\n  outline: 0;\n  border-bottom-color: var(--mrr-border-strong);\n}\n.mrr-p3-bar__sep { color: var(--mrr-text-dim); }\n.mrr-p3-bar__track {\n  height: 4px;\n  border-radius: 2px;\n  background: var(--mrr-tint-2);\n  overflow: hidden;\n}\n.mrr-p3-bar__fill {\n  height: 100%;\n  transition: width 200ms ease, background 200ms ease;\n}\n.mrr-p3-bar__fill--ok { background: var(--mrr-success); }\n.mrr-p3-bar__fill--warn { background: var(--mrr-warning); }\n.mrr-p3-bar__fill--bad { background: var(--mrr-fail); }\n.mrr-p3-bar__quick {\n  display: flex;\n  gap: 4px;\n  margin-top: 2px;\n}\n.mrr-p3-bar__quick button {\n  background: transparent;\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  padding: 2px 6px;\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n}\n.mrr-p3-bar__quick button:hover {\n  background: var(--mrr-accent-dim);\n  color: var(--mrr-text);\n  border-color: var(--mrr-border-strong);\n}\n\n/* Damage track (Exalted) */\n.mrr-p3-bar--damage .mrr-p3-bar__values--track {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n}\n.mrr-p3-track {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px;\n  margin-top: 4px;\n}\n.mrr-p3-cell {\n  width: 36px;\n  height: 22px;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  padding: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n}\n.mrr-p3-cell:hover {\n  border-color: var(--mrr-border-strong);\n  color: var(--mrr-text);\n}\n.mrr-p3-cell--B {\n  background: var(--mrr-warning);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-warning);\n}\n.mrr-p3-cell--L {\n  background: var(--mrr-fail);\n  color: var(--mrr-text);\n  border-color: var(--mrr-fail);\n}\n.mrr-p3-cell--A {\n  background: var(--mrr-on-fail);\n  color: var(--mrr-text);\n  border-color: var(--mrr-fail);\n}\n.mrr-p3-track-tools {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 8px;\n  margin-top: 4px;\n  flex-wrap: wrap;\n}\n.mrr-p3-track-tools__group {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n.mrr-p3-track-tools__label {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  text-transform: uppercase;\n  letter-spacing: 0.04em;\n  opacity: 0.7;\n  margin-right: 2px;\n  color: var(--mrr-text-dim);\n}\n.mrr-p3-track-tools__add,\n.mrr-p3-track-tools__heal {\n  background: transparent;\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  padding: 2px 6px;\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n}\n.mrr-p3-track-tools__add:hover,\n.mrr-p3-track-tools__heal:hover:not(:disabled) {\n  background: var(--mrr-accent-dim);\n  color: var(--mrr-text);\n  border-color: var(--mrr-border-strong);\n}\n.mrr-p3-track-tools__heal:disabled {\n  opacity: 0.4;\n  cursor: not-allowed;\n}\n\n/* ═══════════════════════════════════════════════════════════════\n * Phase 3.2 — panel-frame chrome (port of panel-frame.jsx)\n * ═══════════════════════════════════════════════════════════════\n * Standalone floating panel: drag head + 8 resize handles + body.\n * Used by future Session 3.4+ flyouts (Inv / Spell / Gear edit forms,\n * BackpackFlyout, SpellbookFlyout). The current Phase 3.3 sheet body\n * REUSES the existing .mrr-sheet shell so toggling renderers doesn't\n * disturb the saved sheet position.\n * ═══════════════════════════════════════════════════════════════ */\n\n.mrr-p3-panel {\n  position: fixed;\n  background: var(--mrr-bg);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius);\n  box-shadow: var(--mrr-shadow);\n  color: var(--mrr-text);\n  z-index: var(--mrr-z-sheet);\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n.mrr-p3-panel__head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 10px var(--mrr-density-pad-x);\n  cursor: move;\n  user-select: none;\n  border-bottom: 1px solid var(--mrr-border);\n  background: var(--mrr-bg-elev);\n}\n.mrr-p3-panel__title {\n  font-size: 12px;\n  font-weight: 600;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n  color: var(--mrr-accent);\n}\n.mrr-p3-panel__title-meta {\n  font-size: 11px;\n  font-weight: 500;\n  color: var(--mrr-text-dim);\n  letter-spacing: 0;\n  text-transform: none;\n  margin-left: 4px;\n}\n.mrr-p3-panel__close {\n  margin-left: auto;\n  background: transparent;\n  border: 0;\n  color: var(--mrr-text-dim);\n  font-size: 16px;\n  line-height: 1;\n  cursor: pointer;\n  padding: 0 6px;\n  border-radius: var(--mrr-radius-sm);\n}\n.mrr-p3-panel__close:hover {\n  background: var(--mrr-tint-1);\n  color: var(--mrr-text);\n}\n.mrr-p3-panel__body {\n  flex: 1;\n  overflow: auto;\n  padding: var(--mrr-density-pad-y) var(--mrr-density-pad-x);\n}\n\n/* Resize handles — 4 edges (8px wide along the edge) + 4 corners\n * (12px square at the corner). Cursor hints encode the drag axis. */\n.mrr-p3-panel__resize {\n  position: absolute;\n  background: transparent;\n  z-index: 1;\n}\n.mrr-p3-panel__resize--n  { top: 0;     left: 8px;   right: 8px;   height: 6px; cursor: ns-resize; }\n.mrr-p3-panel__resize--s  { bottom: 0;  left: 8px;   right: 8px;   height: 6px; cursor: ns-resize; }\n.mrr-p3-panel__resize--e  { top: 8px;   right: 0;    bottom: 8px;  width: 6px;  cursor: ew-resize; }\n.mrr-p3-panel__resize--w  { top: 8px;   left: 0;     bottom: 8px;  width: 6px;  cursor: ew-resize; }\n.mrr-p3-panel__resize--ne { top: 0;     right: 0;                              width: 12px; height: 12px; cursor: nesw-resize; }\n.mrr-p3-panel__resize--nw { top: 0;     left: 0;                               width: 12px; height: 12px; cursor: nwse-resize; }\n.mrr-p3-panel__resize--se {\n  bottom: 0; right: 0;\n  width: 14px; height: 14px;\n  cursor: nwse-resize;\n  display: flex;\n  align-items: flex-end;\n  justify-content: flex-end;\n  color: var(--mrr-text-dim);\n}\n.mrr-p3-panel__resize--se:hover { color: var(--mrr-accent); }\n.mrr-p3-panel__resize--sw { bottom: 0;  left: 0;                               width: 12px; height: 12px; cursor: nesw-resize; }\n\n/* Phase 3 attribute-group sub-label (used by mrrP3RenderAttributesSection\n * to label Exalted's Physical / Social / Mental groups). */\n.mrr-p3-section__subgroup-label {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  text-transform: uppercase;\n  letter-spacing: 0.08em;\n  color: var(--mrr-text-dim);\n  margin: 8px 0 4px;\n  padding-left: 4px;\n}\n\n/* Phase 3 derived-stat row wrapper (used by mrrP3RenderDerivedSection's\n * value branch — bars and tracks display their name inside the primitive,\n * but renderValue does not, so the wrapper supplies a name + formula\n * label outside the value primitive). */\n.mrr-p3-derived {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  margin-bottom: 8px;\n}\n\n.mrr-p3-derived__label {\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  letter-spacing: 0.04em;\n  color: var(--mrr-text-dim);\n  padding-left: 4px;\n}\n\n/* ── Phase 5 step 5.5: density toggle ──────────────────────────────────\n * 3-way data-density attribute on .mrr-sheet swaps the five\n * --mrr-density-* variables. UI: pill button group in the actions row\n * with aria-pressed indicating selection. Per-character (state.sheet.density),\n * defaults to \"cozy\". Source: ~/projects/claude-design-updates/UI-build.md §2.3.\n * ────────────────────────────────────────────────────────────────────── */\n.mrr-sheet[data-density=\"compact\"] {\n  --mrr-density-pad-x: 8px;\n  --mrr-density-pad-y: 8px;\n  --mrr-density-gap:   4px;\n  --mrr-density-row-h: 24px;\n  --mrr-density-fs:   12px;\n}\n.mrr-sheet[data-density=\"cozy\"] {\n  --mrr-density-pad-x: 12px;\n  --mrr-density-pad-y: 12px;\n  --mrr-density-gap:    6px;\n  --mrr-density-row-h: 28px;\n  --mrr-density-fs:    13px;\n}\n.mrr-sheet[data-density=\"roomy\"] {\n  --mrr-density-pad-x: 16px;\n  --mrr-density-pad-y: 16px;\n  --mrr-density-gap:   10px;\n  --mrr-density-row-h: 34px;\n  --mrr-density-fs:   14px;\n}\n\n/* density toggle pill button group (rendered inside the actions row) */\n.mrr-density-toggle {\n  display: inline-flex;\n  align-items: center;\n  gap: 0;\n  padding: 2px;\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 999px;\n  background: var(--mrr-tint-1);\n}\n.mrr-density-toggle__label {\n  font-family: var(--mrr-mono);\n  font-size: 9px;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--mrr-text-faint);\n  padding: 0 8px 0 6px;\n}\n.mrr-density-toggle__btn {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--mrr-text-dim);\n  background: transparent;\n  border: 0;\n  border-radius: 999px;\n  padding: 4px 10px;\n  cursor: pointer;\n  transition: background-color 120ms ease, color 120ms ease;\n}\n.mrr-density-toggle__btn:hover {\n  color: var(--mrr-text);\n  background: var(--mrr-tint-2);\n}\n.mrr-density-toggle__btn:focus-visible {\n  outline: 1px solid var(--mrr-accent-line);\n  outline-offset: 1px;\n}\n.mrr-density-toggle__btn[aria-pressed=\"true\"] {\n  background: var(--mrr-accent-soft);\n  color: var(--mrr-text);\n  box-shadow: inset 0 0 0 1px var(--mrr-accent-line);\n}\n\n/* ── Phase 5 step 5.4: derived tooltip math ──────────────────────────\n * Cursor + underline affordance on derived value cells whose ruleset\n * declares a tooltipFormula. The browser's native title-attr tooltip\n * carries the breakdown (\"Soak (Bashing): 7 = Stamina (4) + Bashing\n * Soak (3)\"). Affordance is intentionally subtle — dotted underline\n * + help cursor is the long-established \"this has hover info\" pattern\n * (matches the prototype's skill-bonus pill UX). Scoped to autocalc\n * value cells with a non-empty title so static-rendered derived stats\n * without a tooltipFormula keep their default cursor + no underline. */\n.mrr-row__value--autocalc[title]:not([title=\"\"]) {\n  cursor: help;\n  text-decoration: underline dotted var(--mrr-text-faint);\n  text-underline-offset: 3px;\n  text-decoration-thickness: 1px;\n}\n.mrr-row__value--autocalc[title]:not([title=\"\"]):hover {\n  text-decoration-color: var(--mrr-accent-line);\n}\n\n/* ── Phase 5 step 5.2: XP card ───────────────────────────────────────\n * Visual restructure to prototype parity (sheet.jsx XpCard, UI-build.md\n * §3.4 + §4.7). The baseline rules at the .mrr-xp-card section above\n * already supply structure (flex column, row, group). This section\n * tightens the type scale + spacing to match the prototype:\n *   - card-level label: 10px / 600 / 0.12em uppercase (already)\n *   - sub-labels:       9px  / 0.10em uppercase (already)\n *   - numeric value:    14px → 16px / 600  (PROTOTYPE TARGET)\n *   - level input:      16px → 18px / 600 / 56px wide (PROTOTYPE)\n *   - + button placed inline at row end via flex-end self-align.\n * Selector specificity matches the baseline rule (single-class) so the\n * cascade resolves the override by source order — appended last wins.\n * Pool-mode (Exalted) and formula-mode (D&D, PF2e) both consume the\n * same primitives; the only mode difference is which primitives\n * appear (pool: current/sep/total/+1; formula: level/current/sep/next/bar).\n * Mode dispatch lives in renderXpCard() which keys off\n * ruleset.resolution.mode. */\n.mrr-xp-card__input {\n  font-size: 16px;\n}\n.mrr-xp-card__input--lvl {\n  font-size: 18px;\n  width: 56px;\n}\n.mrr-xp-card__sep {\n  font-size: 18px;\n  padding-bottom: 6px;\n}\n.mrr-xp-card__next {\n  font-size: 16px;\n  font-weight: 600;\n  padding-bottom: 4px;\n}\n/* Pool-mode +1 button now lives inside the row (see renderXpCard pool\n   branch). Anchor it to flex-end so it baselines with the inputs and\n   doesn't stretch the row vertically. The baseline alignment already\n   says align-self: flex-start at the .mrr-xp-card__add base rule;\n   this overrides for the inline placement. */\n.mrr-xp-card__row .mrr-xp-card__add {\n  align-self: flex-end;\n  margin-left: auto;\n}\n\n/* ── Phase 5 step 5.6: state badges + anima banner ──\n * Visual treatments for state rows whose active value carries narrative\n * weight: Initiative=Crashed (distress) and Anima=Suppressed (muted).\n * Uses a data-active-value attribute on .mrr-state plus paired modifier\n * classes so the row + select restyle without changing the underlying\n * select-based render (which already handles N values natively, including\n * the 6-value Anima Banner with Suppressed prepended in Plan B step B.2).\n *\n * Crashed token: scoped to this section, no global :root pollution beyond\n * the three new --mrr-state-crashed-* tokens.\n * Suppressed: leans on existing --mrr-text-faint for the \"no anima\" feel.\n */\n\n:root {\n  --mrr-state-crashed-color: oklch(0.62 0.18 28);\n  --mrr-state-crashed-soft:  oklch(0.62 0.18 28 / 0.18);\n  --mrr-state-crashed-line:  oklch(0.62 0.18 28 / 0.42);\n}\n\n/* Initiative=Crashed — red distress treatment on row + select.\n * Subtle pulse on the name to draw the eye without being jarring; respects\n * prefers-reduced-motion below. (!)-glyph appended via ::after pseudo. */\n.mrr-state--initiative-crashed .mrr-state__name {\n  color: var(--mrr-state-crashed-color);\n  font-weight: 600;\n  animation: mrr-state-crashed-pulse 2.4s ease-in-out infinite;\n}\n\n.mrr-state--initiative-crashed .mrr-state__name::after {\n  content: \" (!)\";\n  color: var(--mrr-state-crashed-color);\n  font-weight: 700;\n  letter-spacing: 0.02em;\n}\n\n.mrr-state--initiative-crashed .mrr-state__select {\n  color: var(--mrr-state-crashed-color);\n  border-color: var(--mrr-state-crashed-line);\n  background: var(--mrr-state-crashed-soft);\n}\n\n@keyframes mrr-state-crashed-pulse {\n  0%, 100% { opacity: 1; }\n  50%      { opacity: 0.72; }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .mrr-state--initiative-crashed .mrr-state__name { animation: none; }\n}\n\n/* Anima=Suppressed — muted \"no anima visible\" treatment.\n * Suppressed renders at the top of the Anima Banner select because Plan B\n * step B.2 prepended it as the first value in ruleset.json — option order\n * follows ruleset value order. */\n.mrr-state--anima-suppressed .mrr-state__name {\n  color: var(--mrr-text-faint);\n  font-style: italic;\n}\n\n.mrr-state--anima-suppressed .mrr-state__select {\n  color: var(--mrr-text-faint);\n}\n\n/* Defensive overflow guard for state rows on narrow panels (≥320px).\n * The row is flex-row name+select; if a future ruleset adds a long state\n * name, the select should compress rather than spill. Anima Banner with 6\n * values (Suppressed/Dim/Glowing/Burning/Bonfire/Iconic) renders inside\n * the native <select>, so option count never affects row width. */\n.mrr-state {\n  flex-wrap: wrap;\n  min-width: 0;\n}\n.mrr-state__select {\n  max-width: 100%;\n  min-width: 0;\n}\n\n/* ── Phase 5 step 5.3: Resources cluster ──────────────────────────────\n * Horizontal \"charbar\" cluster of resource readouts rendered above\n * Attributes when the active ruleset declares resources[] (Plan B v1\n * schema add). Driven by mrrP3RenderResourcesSection — sub-renderers\n * dispatch by resource.type (bar / dice / counter / pool / custom).\n *\n * Layout: flex-wrap with min 120px per resource so 4+ pools at the top\n * of a 280-320px panel collapse to a 2x2 grid rather than spilling\n * horizontally. Adjacent resources sharing a `group` value render under\n * a shared subheader (D&D Spell Slots case).\n *\n * Auto-color thresholds match prototype <Bar> in sheet.jsx:151\n *   pct < 30%  → bad\n *   pct < 65%  → warn\n *   pct >= 65% → ok\n * Override via resource.color ∈ {ok|warn|bad|accent}.\n *\n * Tokens: reuses --mrr-success/-warning/-fail and --mrr-accent. No\n * global :root pollution. Local section-scoped tokens for the dice\n * glyph treatment only.\n */\n\n:root {\n  --mrr-resources-pad: 10px;\n  --mrr-resources-gap: 10px;\n  --mrr-resource-min-w: 120px;\n  --mrr-resource-bar-h: 6px;\n  --mrr-resource-die-size: 22px;\n}\n\n.mrr-resources {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--mrr-resources-gap);\n  padding: var(--mrr-resources-pad);\n  margin: 0 0 8px 0;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-hairline);\n  border-radius: 8px;\n}\n\n/* Sub-group subheader (D&D Spell Slots). Forces a wrap break so all\n * resources sharing a group cluster under their label. */\n.mrr-resources__group-break {\n  flex-basis: 100%;\n  height: 0;\n  margin: 0;\n  border: 0;\n}\n.mrr-resources__group-label {\n  flex-basis: 100%;\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--mrr-text-faint);\n  margin: 4px 0 -2px 0;\n}\n\n.mrr-resource {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  flex: 1 1 var(--mrr-resource-min-w);\n  min-width: var(--mrr-resource-min-w);\n  padding: 6px 8px;\n  background: var(--mrr-bg-input);\n  border: 1px solid var(--mrr-hairline);\n  border-radius: 6px;\n}\n/* Full-width resource (used by exalted-health-track so the track has room\n   to grow with extra HL added via Ox-Body, Mutations, etc.). Wraps onto\n   its own row regardless of cluster width. */\n.mrr-resource--full-width {\n  flex-basis: 100%;\n}\n\n.mrr-resource__label {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--mrr-text-faint);\n  line-height: 1.1;\n}\n\n.mrr-resource__values {\n  display: flex;\n  align-items: baseline;\n  gap: 4px;\n  font-family: var(--mrr-mono, ui-monospace, SFMono-Regular, Menlo, monospace);\n  font-size: 13px;\n  color: var(--mrr-text);\n}\n.mrr-resource__val {\n  font-weight: 600;\n}\n.mrr-resource__val-input {\n  min-width: 3ch;\n  width: auto;\n  max-width: 5ch;\n  padding: 2px 4px;\n  background: var(--mrr-bg-app);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 3px;\n  color: inherit;\n  font: inherit;\n  text-align: right;\n  box-sizing: content-box;\n}\n.mrr-resource__val-input:focus {\n  outline: none;\n  border-color: var(--mrr-accent-line);\n}\n.mrr-resource__sep {\n  color: var(--mrr-text-faint);\n  opacity: 0.7;\n}\n\n/* Bar render (type=bar) — fill bar with auto-color. */\n.mrr-resource__bar {\n  position: relative;\n  height: var(--mrr-resource-bar-h);\n  width: 100%;\n  background: var(--mrr-bg-app);\n  border-radius: 999px;\n  overflow: hidden;\n}\n.mrr-resource__bar-fill {\n  height: 100%;\n  width: 0%;\n  border-radius: inherit;\n  transition: width 120ms ease-out, background-color 120ms ease-out;\n}\n.mrr-resource__bar-fill--ok     { background: var(--mrr-success, oklch(0.78 0.14 145)); }\n.mrr-resource__bar-fill--warn   { background: var(--mrr-warning, oklch(0.82 0.14 85)); }\n.mrr-resource__bar-fill--bad    { background: var(--mrr-fail, oklch(0.65 0.18 28)); }\n.mrr-resource__bar-fill--accent { background: var(--mrr-accent); }\n\n/* Dice render (type=dice) — pool of clickable dice glyphs. Spent dice\n * dim. Reuses --mrr-resource-die-size for sizing. */\n.mrr-resource__dice {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 3px;\n  margin-top: 2px;\n}\n.mrr-resource__die {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: var(--mrr-resource-die-size);\n  height: var(--mrr-resource-die-size);\n  padding: 0;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  border-radius: 4px;\n  color: var(--mrr-text);\n  font-size: 9px;\n  font-weight: 600;\n  letter-spacing: 0;\n  cursor: pointer;\n  user-select: none;\n  transition: background-color 100ms ease-out, opacity 100ms ease-out;\n}\n.mrr-resource__die:hover { background: var(--mrr-accent-soft); }\n.mrr-resource__die--spent {\n  opacity: 0.32;\n  cursor: default;\n}\n.mrr-resource__die--spent:hover { background: var(--mrr-bg-elev); }\n\n/* Counter render (type=counter) — numeric stepper. */\n.mrr-resource__counter {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n.mrr-resource__step {\n  width: 22px;\n  height: 22px;\n  padding: 0;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  border-radius: 4px;\n  color: var(--mrr-text);\n  font-size: 14px;\n  font-weight: 600;\n  line-height: 1;\n  cursor: pointer;\n}\n.mrr-resource__step:hover { background: var(--mrr-accent-soft); }\n.mrr-resource__step:disabled { opacity: 0.3; cursor: not-allowed; }\n\n/* Pool render (type=pool) — current/max display, no bar (matches\n * Exalted motes/willpower pattern; the prominent type-scale recalls the\n * XP card values). */\n.mrr-resource--pool .mrr-resource__values {\n  font-size: 15px;\n}\n\n/* Custom placeholder — renders when a resource declares\n * type=custom with a rendererConfig.component name that has not been\n * registered in the custom-component registry yet. Distinct visual\n * marker so missing components are obvious during integration. */\n.mrr-resource__placeholder {\n  font-size: 11px;\n  color: var(--mrr-text-faint);\n  font-style: italic;\n  padding: 4px 6px;\n  background: var(--mrr-bg-app);\n  border: 1px dashed var(--mrr-hairline-strong);\n  border-radius: 4px;\n}\n.mrr-resource__placeholder code {\n  font-family: var(--mrr-mono, ui-monospace, SFMono-Regular, Menlo, monospace);\n  font-size: 10px;\n  color: var(--mrr-text);\n}\n\n/* Quick-button row — pill-style, matches XpCard +1 XP affordance. */\n.mrr-resource__quick {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px;\n  margin-top: 2px;\n}\n.mrr-resource__quick-btn {\n  padding: 2px 8px;\n  background: var(--mrr-accent-soft);\n  border: 1px solid var(--mrr-accent-line);\n  border-radius: 999px;\n  color: var(--mrr-text);\n  font-size: 10px;\n  font-weight: 500;\n  letter-spacing: 0.02em;\n  cursor: pointer;\n  transition: background-color 100ms ease-out;\n}\n.mrr-resource__quick-btn:hover {\n  background: var(--mrr-accent-dim);\n}\n\n/* Narrow-panel guard (≥320px). Below ~280px the cluster collapses to a\n * single column; above that the resources wrap as a 2-up grid via\n * flex-wrap + min-width. */\n@media (max-width: 320px) {\n  .mrr-resource {\n    flex-basis: 100%;\n    min-width: 0;\n  }\n}\n\n/* ── Phase 5 step 5.6: V20 morality + paths + virtues + health-track ─────\n * V20 visual treatment. Owns the .mrr-morality cluster (Path Rating,\n * path picker + description, virtue rows with paired-choice toggle) and\n * the .mrr-health-track grid (7 boxes cycling through B / L / A damage\n * types per V20 RAW). All rules namespaced under .mrr-morality* and\n * .mrr-health-track* so they don't collide with the Phase 5 step 5.3\n * resources cluster above. */\n\n.mrr-morality {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  padding: 8px 10px;\n  margin: 6px 0;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-hairline);\n  border-radius: 6px;\n}\n.mrr-morality__header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  flex-wrap: wrap;\n}\n.mrr-morality__title {\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--mrr-text-faint);\n}\n.mrr-morality__rating {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n}\n.mrr-morality__rating-label {\n  font-size: 11px;\n  color: var(--mrr-text-faint);\n}\n.mrr-morality__rating-step {\n  width: 22px;\n  height: 22px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--mrr-bg-input);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 4px;\n  color: var(--mrr-text);\n  font-size: 14px;\n  line-height: 1;\n  cursor: pointer;\n}\n.mrr-morality__rating-step:hover:not([disabled]) {\n  background: var(--mrr-accent-soft);\n}\n.mrr-morality__rating-step[disabled] {\n  opacity: 0.4;\n  cursor: not-allowed;\n}\n.mrr-morality__rating-value {\n  min-width: 1.5em;\n  text-align: center;\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--mrr-text);\n}\n.mrr-morality__path-row {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.mrr-morality__path-select {\n  background: var(--mrr-bg-input);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 4px;\n  color: var(--mrr-text);\n  padding: 4px 6px;\n  font-size: 12px;\n  font-family: inherit;\n}\n.mrr-morality__path-desc {\n  font-size: 11px;\n  color: var(--mrr-text-faint);\n  line-height: 1.4;\n  padding: 4px 6px;\n  background: var(--mrr-bg-app);\n  border-left: 2px solid var(--mrr-accent-line);\n  border-radius: 2px;\n}\n.mrr-morality__virtues {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.mrr-morality__virtue {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  flex-wrap: wrap;\n}\n.mrr-morality__virtue-label {\n  flex: 1 1 auto;\n  font-size: 12px;\n  color: var(--mrr-text);\n}\n.mrr-morality__virtue-toggle {\n  display: inline-flex;\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 4px;\n  overflow: hidden;\n}\n.mrr-morality__virtue-toggle-btn {\n  padding: 2px 8px;\n  background: var(--mrr-bg-input);\n  border: 0;\n  color: var(--mrr-text-faint);\n  font-size: 11px;\n  cursor: pointer;\n  transition: background-color 100ms ease-out, color 100ms ease-out;\n}\n.mrr-morality__virtue-toggle-btn[aria-pressed=\"true\"] {\n  background: var(--mrr-accent-soft);\n  color: var(--mrr-text);\n  font-weight: 600;\n}\n.mrr-morality__virtue-stepper {\n  display: inline-flex;\n  align-items: center;\n  gap: 2px;\n}\n.mrr-morality__virtue-step {\n  width: 20px;\n  height: 20px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--mrr-bg-input);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 3px;\n  color: var(--mrr-text);\n  font-size: 12px;\n  line-height: 1;\n  cursor: pointer;\n}\n.mrr-morality__virtue-step:hover:not([disabled]) {\n  background: var(--mrr-accent-soft);\n}\n.mrr-morality__virtue-step[disabled] {\n  opacity: 0.4;\n  cursor: not-allowed;\n}\n.mrr-morality__virtue-value {\n  min-width: 1.25em;\n  text-align: center;\n  font-size: 12px;\n  font-weight: 600;\n  color: var(--mrr-text);\n}\n\n/* v20-health-track — 7-level V20 health grid. Each box cycles\n * empty → B (bashing) → L (lethal) → A (aggravated) → empty on click.\n * Color tier matches damage severity (B = faint, L = warn, A = bad). */\n.mrr-health-track {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  width: 100%;\n}\n.mrr-health-track__levels {\n  display: grid;\n  grid-template-columns: repeat(7, minmax(0, 1fr));\n  gap: 3px;\n}\n.mrr-health-track__level {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 2px;\n}\n.mrr-health-track__box {\n  width: 100%;\n  min-height: 22px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--mrr-bg-input);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 3px;\n  color: var(--mrr-text);\n  font-size: 12px;\n  font-weight: 700;\n  font-family: var(--mrr-mono, ui-monospace, SFMono-Regular, Menlo, monospace);\n  cursor: pointer;\n  transition: background-color 100ms ease-out, border-color 100ms ease-out;\n}\n.mrr-health-track__box[data-damage=\"B\"] {\n  background: var(--mrr-accent-soft);\n  border-color: var(--mrr-accent-line);\n}\n.mrr-health-track__box[data-damage=\"L\"] {\n  background: oklch(0.55 0.16 60 / 0.32);\n  border-color: oklch(0.65 0.18 60 / 0.55);\n  color: oklch(0.94 0.04 60);\n}\n.mrr-health-track__box[data-damage=\"A\"] {\n  background: oklch(0.50 0.20 25 / 0.42);\n  border-color: oklch(0.62 0.22 25 / 0.65);\n  color: oklch(0.96 0.05 25);\n}\n.mrr-health-track__label {\n  font-size: 9px;\n  letter-spacing: 0.04em;\n  color: var(--mrr-text-faint);\n  text-align: center;\n  line-height: 1.1;\n}\n.mrr-health-track__penalty {\n  font-size: 9px;\n  color: var(--mrr-text-faint);\n  font-variant-numeric: tabular-nums;\n}\n.mrr-health-track__summary {\n  display: flex;\n  justify-content: space-between;\n  gap: 6px;\n  font-size: 10px;\n  color: var(--mrr-text-faint);\n}\n.mrr-health-track__legend {\n  display: inline-flex;\n  gap: 6px;\n}\n.mrr-health-track__legend code {\n  font-family: var(--mrr-mono, ui-monospace, SFMono-Regular, Menlo, monospace);\n  font-size: 10px;\n}\n\n@media (max-width: 320px) {\n  .mrr-health-track__levels {\n    grid-template-columns: repeat(4, minmax(0, 1fr));\n  }\n  .mrr-morality__virtue {\n    flex-direction: column;\n    align-items: flex-start;\n  }\n}\n\n/* ── Round 6: roll-under mechanic ── */\n/* Visual states for roll-under outcomes. The dice tray's existing success/fail\n   modifiers cover plain pass/fail; these two add crit-success and fumble bands\n   the roll-under widget emits. accent ring for crit, warning fill for fumble —\n   same vocabulary as the dice-pool botch state. */\n.mrr-dice__result--crit {\n  border-color: var(--mrr-accent);\n  background: var(--mrr-accent-soft);\n}\n.mrr-dice__result--fumble {\n  border-color: var(--mrr-warning);\n  background: rgba(251, 191, 36, 0.10);\n}\n\n/* ── Round 7: stance-modal-pool ── */\n/* Segmented stance toggle for stance-modal-pool resolution mode (Lasers &\n   Feelings). Two pill buttons render in a single row above the pool size\n   input. Active stance is filled with accent; inactive is the standard\n   hairline-button look so the choice reads at a glance. Per-die \"exact\"\n   highlight class lights the LASER FEELINGS dice in the result row, and\n   outcome tier classes give the dice tray's result strip a per-tier\n   gradient so miss / barely / good / critical are distinguishable without\n   reading text. */\n.mrr-dice__stance-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 6px 8px 4px;\n}\n.mrr-dice__stance-row > label {\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n  color: var(--mrr-text-faint, oklch(0.7 0.02 285));\n  min-width: 48px;\n}\n.mrr-dice__stance-group {\n  display: inline-flex;\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 999px;\n  overflow: hidden;\n  background: var(--mrr-bg-input);\n}\n.mrr-stance-btn {\n  appearance: none;\n  border: 0;\n  background: transparent;\n  color: var(--mrr-text, inherit);\n  font: inherit;\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  padding: 4px 12px;\n  cursor: pointer;\n  transition: background 120ms ease, color 120ms ease;\n}\n.mrr-stance-btn + .mrr-stance-btn {\n  border-left: 1px solid var(--mrr-hairline);\n}\n.mrr-stance-btn:hover {\n  background: var(--mrr-accent-soft);\n}\n.mrr-stance-btn--active {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n}\n.mrr-stance-btn--active:hover {\n  background: var(--mrr-accent);\n}\n\n/* Pool-formula hint label under the pool input. Pure cosmetic — exposes\n   the rules-text formula for pool composition to the player without\n   forcing them into a parser. */\n.mrr-dice__hint {\n  font-size: 10px;\n  color: var(--mrr-text-faint, oklch(0.65 0.02 285));\n  padding: 0 8px 4px;\n  font-style: italic;\n}\n\n/* LASER FEELINGS / exact-match die highlight. Stronger accent ring than a\n   plain stance-success so the exact-match dice pop on the result strip. */\n.mrr-dice__face--exact {\n  outline: 2px solid var(--mrr-accent);\n  outline-offset: -2px;\n  background: var(--mrr-accent-soft);\n  position: relative;\n}\n\n/* Stance-modal-pool result strip — per-tier visual states. Outcome tiers\n   are open-ended labels (the spec doesn't enumerate them) so we map by\n   the canonical L&F label set: miss / barely / good / critical. Any other\n   tier label falls through to the default --success / --fail kind chosen\n   by rollStanceModalPool. */\n.mrr-dice__result--tier-miss {\n  border-color: var(--mrr-warning);\n  background: rgba(251, 191, 36, 0.08);\n}\n.mrr-dice__result--tier-barely {\n  border-color: var(--mrr-hairline-strong);\n  background: rgba(255, 255, 255, 0.04);\n}\n.mrr-dice__result--tier-good {\n  border-color: var(--mrr-accent-line);\n  background: var(--mrr-accent-soft);\n}\n.mrr-dice__result--tier-critical {\n  border-color: var(--mrr-accent);\n  background: var(--mrr-accent-soft);\n  box-shadow: 0 0 0 1px var(--mrr-accent-dim) inset;\n}\n\n/* ── Phase 6: DERIVED POOLS card grid ────────────────────────────────────\n * 2-column grid of compact stat cards replacing the legacy row layout.\n * Card anatomy: name top-left, big value top-right, faint formula\n * tokens below the head. Auto-calc cards show the computed value with\n * no edit input; manual cards keep an inline stepper.\n * Grid wraps to one column at narrow widths so the cards never crowd.\n * Source: ~/projects/claude-design-updates intent + image 7 (2026-05-08).\n * ────────────────────────────────────────────────────────────────────── */\n.mrr-derived-pools__subtitle {\n  font-size: 11px;\n  color: var(--mrr-text-faint, var(--mrr-text-dim));\n  margin: 2px 0 8px;\n  padding-left: 4px;\n  font-style: italic;\n  letter-spacing: 0.01em;\n}\n\n.mrr-derived-pools {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 8px;\n  width: 100%;\n}\n\n@media (max-width: 320px) {\n  .mrr-derived-pools {\n    grid-template-columns: 1fr;\n  }\n}\n\n.mrr-derived-pool-card {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  padding: 8px 10px;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-hairline);\n  border-radius: 6px;\n  min-width: 0;\n}\n\n.mrr-derived-pool-card:hover {\n  border-color: var(--mrr-hairline-strong);\n}\n\n.mrr-derived-pool-card__head {\n  display: flex;\n  flex-direction: row;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: 8px;\n  min-width: 0;\n}\n\n.mrr-derived-pool-card__name {\n  font-family: var(--mrr-sans, inherit);\n  font-size: 13px;\n  font-weight: 500;\n  color: var(--mrr-text);\n  letter-spacing: 0.01em;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  min-width: 0;\n  flex: 1 1 auto;\n}\n\n.mrr-derived-pool-card__value-wrap {\n  display: inline-flex;\n  align-items: baseline;\n  gap: 4px;\n  flex-shrink: 0;\n}\n\n.mrr-derived-pool-card__value {\n  font-family: var(--mrr-mono, monospace);\n  font-size: 20px;\n  font-weight: 600;\n  color: var(--mrr-text);\n  line-height: 1;\n  min-width: 1.5ch;\n  text-align: right;\n}\n\n.mrr-derived-pool-card__value--autocalc {\n  color: var(--mrr-accent);\n}\n\n.mrr-derived-pool-card__value-input {\n  font-family: var(--mrr-mono, monospace);\n  font-size: 18px;\n  font-weight: 600;\n  width: auto;\n  min-width: 3ch;\n  max-width: 5ch;\n  padding: 2px 4px;\n  background: var(--mrr-bg-app);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 4px;\n  color: var(--mrr-text);\n  text-align: right;\n  box-sizing: content-box;\n}\n\n.mrr-derived-pool-card__max {\n  font-family: var(--mrr-mono, monospace);\n  font-size: 12px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-derived-pool-card__bonus {\n  font-family: var(--mrr-mono, monospace);\n  font-size: 12px;\n  color: var(--mrr-success, var(--mrr-accent));\n  white-space: nowrap;\n}\n\n.mrr-derived-pool-card__bonus--neg {\n  color: var(--mrr-fail);\n}\n\n.mrr-derived-pool-card__formula {\n  font-family: var(--mrr-mono, monospace);\n  font-size: 10px;\n  color: var(--mrr-text-faint, var(--mrr-text-dim));\n  letter-spacing: 0.02em;\n  line-height: 1.3;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.mrr-derived-pool-card__roll {\n  margin-top: 4px;\n  padding: 3px 8px;\n  font-size: 11px;\n  background: var(--mrr-bg-app);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 4px;\n  color: var(--mrr-text);\n  cursor: pointer;\n  align-self: flex-start;\n}\n\n.mrr-derived-pool-card__roll:hover {\n  background: var(--mrr-accent-soft);\n  border-color: var(--mrr-accent-line);\n}\n\n/* ── Phase 6: state-banner resource (Anima Banner inline) ────────────────\n * Cycle-button pill that lives inline in the Resources cluster. Per-tier\n * color tints communicate the banner's intensity at a glance.\n * Hidden dropdown stays in DOM (sr-only-ish) so keyboard users can pick\n * a value directly rather than clicking through the cycle.\n * ────────────────────────────────────────────────────────────────────── */\n.mrr-resource--state-banner {\n  /* Allow the banner to use a contrasting background so it reads as a\n     status pill rather than another stepper. */\n  background: transparent;\n  border: 1px dashed var(--mrr-hairline);\n}\n\n.mrr-state-banner {\n  display: flex;\n  flex-direction: row;\n  align-items: center;\n  gap: 6px;\n}\n\n.mrr-state-banner__pill {\n  font-family: var(--mrr-sans, inherit);\n  font-size: 13px;\n  font-weight: 600;\n  letter-spacing: 0.02em;\n  padding: 4px 12px;\n  border-radius: 999px;\n  background: var(--mrr-bg-app);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-hairline-strong);\n  cursor: pointer;\n  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;\n}\n\n.mrr-state-banner__pill:hover {\n  border-color: var(--mrr-accent-line);\n}\n\n/* Anima Banner tiers — dim → bonfire follows intensity gradient. */\n.mrr-state-banner__pill--suppressed,\n.mrr-state-banner__pill--none {\n  background: var(--mrr-bg-app);\n  color: var(--mrr-text-dim);\n  border-color: var(--mrr-hairline);\n}\n.mrr-state-banner__pill--dim {\n  background: oklch(0.25 0.04 60 / 0.30);\n  color: oklch(0.85 0.06 60);\n  border-color: oklch(0.6 0.10 60 / 0.5);\n}\n.mrr-state-banner__pill--glowing {\n  background: oklch(0.30 0.08 60 / 0.45);\n  color: oklch(0.92 0.10 60);\n  border-color: oklch(0.7 0.14 60 / 0.7);\n}\n.mrr-state-banner__pill--burning {\n  background: oklch(0.36 0.13 50 / 0.55);\n  color: oklch(0.95 0.14 50);\n  border-color: oklch(0.75 0.18 50 / 0.8);\n  box-shadow: 0 0 8px oklch(0.7 0.20 50 / 0.35);\n}\n.mrr-state-banner__pill--bonfire {\n  background: oklch(0.42 0.18 45 / 0.65);\n  color: oklch(0.97 0.15 50);\n  border-color: oklch(0.80 0.20 45 / 0.9);\n  box-shadow: 0 0 12px oklch(0.75 0.22 45 / 0.50);\n}\n.mrr-state-banner__pill--iconic {\n  background: oklch(0.48 0.22 40 / 0.75);\n  color: oklch(0.98 0.18 45);\n  border-color: oklch(0.85 0.22 40);\n  box-shadow: 0 0 16px oklch(0.80 0.24 40 / 0.65);\n  text-transform: uppercase;\n  letter-spacing: 0.06em;\n}\n\n/* Visually hide the redundant keyboard-accessible <select> — it's still in\n   the DOM for keyboard users and screen readers (assistive tech can focus\n   the hidden element and pick a value), but it doesn't overlap the pill.\n   The click-to-cycle pill is the primary affordance for mouse users. */\n.mrr-state-banner__select {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border: 0;\n}\n";
/* EMBEDDED_CSS_END */

var BUNDLE_SCHEMA  = "mrr-character-bundle";
/* Accept-on-read (D2/D3): load both the canonical mrr- bundle and legacy
   mrrp- bundles exported by the retired RP-mode extension. We always SAVE
   the canonical BUNDLE_SCHEMA; only loading tolerates the legacy id. */
var BUNDLE_SCHEMA_ACCEPT = ["mrr-character-bundle", "mrrp-character-bundle"];
/* Legacy RP-mode extension localStorage prefixes — read-only, used by the
   raw "import from installed RP-mode extension" migration path (D3). We
   never WRITE these keys. */
var RP_LEGACY_CHARACTER_PFX = "mrrp-character-";
var RP_LEGACY_CHARS_PFX     = "mrrp-chars-";
var RP_LEGACY_ACTIVE_RULESET = "mrrp-active-ruleset";
var BUNDLE_VERSION = 1;

var ROUTE_POLL_MS    = 1500;
var RELOAD_DELAY_MS  = 600;
var DEFAULT_BAR_MAX  = 10;
var DEFAULT_SKILL_MAX = 99;

var REQUIRED_FIELDS = ["id", "name", "version", "dice", "resolution", "attributes", "skills"];

var MODES = {
  SINGLE:    "single-roll",
  POOL:      "dice-pool",
  SUM:       "dice-pool-sum",
  D100:      "d100-percentile",
  PBTA:      "2d6-stat",
  FATE:      "fate-ladder",
  UNDER:     "roll-under",
  STANCE:    "stance-modal-pool",
  NARRATIVE: "narrative-handled"
};

var BOTCH_TRIGGER = {
  ZERO:     "any-on-zero-successes",
  MAJORITY: "majority",
  ALWAYS:   "always-on-face"
};

var BONUS_KIND = {
  VALUE:       "value",
  DICE:        "dice",
  SUCCESSES:   "successes",
  DAMAGE_POOL: "damage-pool"
};

var state = {
  ruleset:           null,
  sheet:             null,
  chatId:            null,
  characters:        [],
  activeCharacterId: null,
  mountEl:           null,
  diceEl:            null,
  dialogEl:          null,
  itemDialogEl:      null,
  abilityDialogEl:   null,
  gearEl:            null,
  toggleEl:          null,
  spellbookEl:       null,
  spellbookOpen:     false,
  spellbookLbId:     null,         // cached chat-scoped spellbook lorebook id
  collapsed:         true,
  sheetResizeObserver: null,
  installing:        false
};

/* In-place refresh closures for renderAs=bar elements. Populated during
   renderSheet, drained by refreshAllBars. Lets us update bar maxes/fills
   when a referenced stat (e.g. Essence) changes without rebuilding the
   DOM — which would lose scroll position on the floating sheet. */
var barRefreshers = [];

var derivedBonusRefreshers = [];

// ── 2.4.3 full-page compat shim (see COUPLINGS.md row 1) ─────────────
// Pre-2.3.4 engines pass the legacy API (has addElement) → use it unchanged.
// 2.4.0+ full-page hosts pass FullPageExtensionApi v1 → wrap it.
// Fill-in bodies recovered 2026-08-22 from engine git history:
//   v2.3.3 packages/client/src/components/layout/CustomThemeInjector.tsx
//   (addElement / wrapCallback / apiFetch — the extensionAPI object).
marinara = (function (host) {
  if (host && typeof host.addElement === "function") return host; // legacy engine
  var trackedNodes = [];
  var trackedListeners = [];
  function addElement(parent, tag, attrs) {
    var target = typeof parent === "string" ? document.querySelector(parent) : parent;
    if (!target) return null;
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (k === "innerHTML") el.innerHTML = v;
        else if (k === "textContent") el.textContent = v;
        else el.setAttribute(k, v);
      });
    }
    target.appendChild(el);
    trackedNodes.push(el);
    return el;
  }
  // Opus + Anvil review (2026-08-22): don't trust host.log's shape blindly —
  // FullPageExtensionApi types it as Pick<Console,...>, but a defensive
  // guard costs nothing and keeps log-and-continue from throwing inside
  // its own catch block if that contract is ever violated.
  var errLog = (host && host.log && typeof host.log.error === "function") ? host.log : console;
  function wrapHandler(fn) {
    // v2.3.3 wrapCallback: log-and-continue on throw — 190 existing `on`
    // sites depend on a handler error never killing the event loop.
    return function () {
      try {
        return fn.apply(this, arguments);
      } catch (e) {
        errLog.error("[MRR] event handler error:", e);
      }
    };
  }
  function on(target, evt, fn) {
    var wrapped =
      typeof fn === "function"
        ? wrapHandler(fn)
        : { handleEvent: wrapHandler(function (e) { return fn.handleEvent(e); }) };
    target.addEventListener(evt, wrapped);
    trackedListeners.push([target, evt, wrapped]);
    // v2.3.3 `on` returns undefined; zero loader sites use the return value (audited) — return nothing.
  }
  function apiFetch(path, opts) {
    // Replicates v2.3.3 :132-153 semantics deliberately: /api prefix, DEFAULT
    // Content-Type: application/json header (MRR's write sites pass bodies with no
    // headers and depend on it), no status check, unconditional res.json().
    // The loader's own wrapper (function apiFetch, :341) and apiPostRaw/apiDeleteRaw
    // compensate for the quirks — do NOT "improve" this here.
    // 2.4.x addition: the engine's CSRF hook gates unsafe methods — always send the header.
    var normalized = path.charAt(0) === "/" ? path : "/" + path;
    var init = Object.assign({ headers: { "Content-Type": "application/json" } }, opts || {});
    var method = String(init.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      init.headers = Object.assign({}, init.headers, { "x-marinara-csrf": "1" });
    }
    return mrrFetch("/api" + normalized, init).then(function (r) { return r.json(); });
  }
  // Opus + Anvil review (2026-08-22): extracting host.fetch/setTimeout/etc as
  // bare function references and calling them later off the SHIM object
  // (not `host`) rebinds `this` to the shim at call time under strict mode —
  // wrong if the host's real implementation relies on internal `this` state.
  // Bind every extracted host method back to `host` explicitly; cost is
  // negligible and it removes the ambiguity entirely.
  var shim = {
    extensionId: host && host.extension ? host.extension.id : "mrr-legacy",
    extensionName: host && host.extension ? host.extension.name : "Marinara-RPG-Extension",
    extension: host ? host.extension : null,
    log: (host && host.log) || console,
    fetch: host ? host.fetch.bind(host) : window.fetch.bind(window),
    storage: host ? host.storage : null,          // unused today; P1-A consumes it
    addElement: addElement,
    on: on,
    apiFetch: apiFetch,
    setTimeout: host ? host.setTimeout.bind(host) : window.setTimeout.bind(window),
    clearTimeout: host ? host.clearTimeout.bind(host) : window.clearTimeout.bind(window),
    setInterval: host ? host.setInterval.bind(host) : window.setInterval.bind(window),
    clearInterval: host ? host.clearInterval.bind(host) : window.clearInterval.bind(window),
    onCleanup: host && host.onCleanup ? host.onCleanup.bind(host) : function () {}
  };
  if (host && host.onCleanup) host.onCleanup(function () {
    trackedListeners.forEach(function (l) { try { l[0].removeEventListener(l[1], l[2]); } catch (e) {} });
    trackedNodes.forEach(function (n) { try { n.remove(); } catch (e) {} });
  });
  return shim;
})(marinara);

// Module-level fetch accessor — A3 depends on this. The legacy passthrough
// host (pre-2.3.4) has NO `.fetch` member, so `marinara.fetch` alone would
// TypeError there; this accessor is the ONLY fetch reference call sites use.
// Bound to `marinara` (Opus + Anvil review, 2026-08-22) — `marinara` here IS
// already the post-shim wrapper (itself bound to host, see above), so this
// keeps `this` stable if the underlying implementation ever depends on it.
var mrrFetch = (typeof marinara.fetch === "function") ? marinara.fetch.bind(marinara) : window.fetch.bind(window);

function refreshAllBars() {
  for (var i = 0; i < barRefreshers.length; i++) {
    try { barRefreshers[i](); } catch (e) {}
  }
}

function refreshAllEquipmentBonuses() {
  for (var i = 0; i < derivedBonusRefreshers.length; i++) {
    try { derivedBonusRefreshers[i](); } catch (e) {}
  }
}

/* ─────  utilities  ───── */

function log(msg, payload) {
  if (payload === undefined) console.log("[mrr]", msg);
  else                       console.log("[mrr]", msg, payload);
}

function warn(msg, payload) {
  if (payload === undefined) console.warn("[mrr]", msg);
  else                       console.warn("[mrr]", msg, payload);
}

function safeParse(text) {
  try { return JSON.parse(text); }
  catch (e) { return null; }
}

/* local-storage wrappers — private-mode and quota-safe. RAW variants talk to
   the physical browser store unconditionally; the public lsGet/lsSet/lsDel
   below wrap them with the B1 server-storage adapter. Every existing call
   site in the file (~66) keeps calling lsGet/lsSet/lsDel unchanged. */
function lsGetRaw(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function lsSetRaw(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } }
function lsDelRaw(key) { try { localStorage.removeItem(key); } catch (e) {} }

/* ═══════════════════════════════════════════════════════════════════════
   B1 — server-backed character/pref state via marinara.storage
   Design authority: Plans/2026-07-15_engine-2.3-compliance-plan.md §4.1
   2.4.3 deltas: Plans/2026-08-22_engine-2.4.3-upgrade-and-rolemaster-plan.md B1
   Coupling: COUPLINGS.md row 1 (marinara.storage)

   Engine ground truth (verified against engine source 2026-08-22):
     marinara.storage.get()/.patch(obj)/.delete() — async, Promise-returning.
     patch is a server-side shallow merge {...current, ...patch}, then
     re-validated as z.record(z.string(), z.unknown()) with a 1,000,000-byte
     UTF-8 cap on the MERGED record. patch({k: null}) STORES null (does not
     delete) — treated here as a tombstone (present-but-absent on read).
     .delete() nukes the ENTIRE extension record — NEVER called from here.

   Storage layout: ONE record, ONE TOP-LEVEL KEY PER LS KEY, mirroring
   today's localStorage key strings exactly. Never a nested sub-object.

   TIMESTAMPED ENVELOPES + NEWEST-WINS MERGE (Corey override, 2026-08-22,
   coordinator validation round 4 — SUPERSEDES the original "deterministic,
   no timestamps" precedence below wherever the two conflict): crash
   recovery must never resurrect older character data. Every synced-key
   VALUE stored server-side is now an envelope {"t": <epoch ms>, "v": <raw
   string value>}; a tombstone is {"t": <epoch ms>, "v": null} — deletions
   are timestamped too. Defensive read: a server value that is present but
   NOT shaped like an envelope (not an object with a numeric `t`) is
   treated as {t: 0, v: <that raw value>} — degrade, don't crash (see
   mrrNormalizeEnvelope). There was no legacy unwrapped server data to
   migrate — B1 had never been pushed or live-imported when this landed —
   so the write/read paths change outright, no back-compat shim needed.

   localStorage stays untouched — every LS value is still the raw string it
   is today (zero compat risk for the ~66 existing call sites). The LS-side
   timestamp for a synced key lives in ONE local-only sidecar map,
   MRR_TS_MAP_KEY = "mrr-ts-map" (a JSON object {<syncedKey>: <epoch ms>}),
   written via lsSetRaw every time lsSet/lsDel touches a synced key. This
   sidecar is deliberately NOT itself a synced key (NOT in mrrIsSyncedKey):
   it is per-browser device state, not portable user data — if it were
   synced, the engine's SHALLOW patch merge would let one browser's
   ts-map (keyed by chatId/characterId) silently whole-map-clobber every
   other browser's independently-touched keys the next time either side
   flushed, corrupting the very mechanism meant to prevent data loss.

   Hydrate merge (mrrHydrateMerge, replaces the old "server always wins
   once present" precedence): runs on EVERY hydrate, not gated by the
   one-time migration flag — this is what makes crash recovery work every
   session, not just on first activation. For every synced key found in
   EITHER store (the just-fetched server record, or the local ts-map):
   serverTs = the envelope's `t` (0 if malformed, and effectively "lower
   than anything" if the server has no entry for the key at all — that
   case unconditionally adopts the LS side, same outcome migration already
   gave a never-before-synced key); lsTs = tsMap[key] || 0 (an LS value
   with no ts-map entry is legacy/unstamped = 0, which is exactly the old
   server-wins behavior preserved as the degenerate case). If lsTs is
   STRICTLY greater than serverTs: adopt the current LS value into the
   cache and mark it dirty so it re-flushes — with its ORIGINAL lsTs as
   the envelope's `t`, never a fresh now() (preserves true edit time, so a
   third browser comparing later still sees the real history). Otherwise
   the server envelope wins as-is, including tombstones: a newer server
   tombstone keeps a key deleted even if an older LS copy still physically
   exists (LS is intentionally left alone — see "localStorage stays
   untouched" above; lsGet already resolves to the cache first for synced
   keys, so the stale LS bytes are just inert until the next lsSet); a
   strictly-newer LS value beats an older server tombstone (recreate
   survives). mrrRunMigration (the one-time, flag-gated scan for
   never-before-touched LS-only keys — still necessary because it is the
   only mechanism that discovers a key by raw-scanning localStorage
   rather than by already having a ts-map/server footprint) now stamps
   each migrated value with its ts-map entry when one exists, else 0 —
   0 is correct here, not a bug: it means any future real edit on any
   device will always outrank an unstamped migrated value. now() source
   is plain Date.now(); clock skew across one user's browsers is accepted
   (no monotonic counter — decided).

   Key classification (allowlist — everything else stays LOCAL, i.e. the
   original localStorage-only behavior is preserved unchanged):
     SYNCED:
       - LS_CHARACTER_PFX  "mrr-character-<id>"        character sheets
       - LS_RULESET        "marinara-rpg-ruleset"      active ruleset id
       - LS_SPELLBOOK_LB_PFX "mrr-spellbook-lb-<chatId>" spellbook lorebook-id cache
       - MRR_CHARS_PFX     "mrr-chars-<chatId>"        per-chat character roster
       - MRR_ACTIVE_CHAR_PFX "mrr-active-char-<chatId>" per-chat active-character pointer
         (RULING 1, coordinator validation round 1: without these two the
         design's own verify criterion — "sheet edited in one browser
         appears in the other after reload" — is unreachable, since a
         second browser couldn't see the chat's roster or which character
         is active even with the sheets themselves synced.)
     LOCAL (explicit per spec):
       - LS_PROCESSED_MSGS_PFX / LS_PROCESSED_RUNS_PFX  per-browser dedup sets
       - LS_LIBRARY         "marinara-rpg-ruleset-library"  bulky, re-importable
       - LS_RULESET_URL     "marinara-rpg-ruleset-url"
       - LS_SHEET_SIZE, LS_SPELLBOOK_POS, LS_INTIMACIES_POS  panel size/position
         geometry (mrrP3CreatePanel's OWN geometry store at ~4338/4354 is a
         second, already-physical-LS mechanism — untouched either way)
       - LS_SHEET_COLLAPSED_PFX  panel show/hide chrome — JUDGMENT CALL, not
         explicitly enumerated in either bucket of the design spec; treated
         as geometry-adjacent device-local UI chrome. Flagged for review.
       - LS_SHEET_PFX legacy chat-scoped sheet key ("mrr-sheet-<chatId>-<id>")
         — distinct prefix from LS_CHARACTER_PFX; write-once migration
         source only, never the modern home for sheet data.
       - MRR_MIGRATED_FLAG "mrr-migrated-v1" — must be per-device by
         definition (the migration gate itself).
       - MRR_TS_MAP_KEY "mrr-ts-map" — per-device by definition (see the
         "Corey override" section above for why syncing it would corrupt
         the merge it exists to drive).
       - RP_LEGACY_* ("mrrp-*") — read-only, owned by the retired RP
         extension, never written from here.
       - "marinara-active-chat-id" — the ENGINE's own key, not ours.
     "Per-chat ruleset stamps" named in the design spec's allowlist are NOT
     a localStorage key at all — they live in the engine's own
     chat.metadata (mrrChatRulesetId, PATCHed via /chats/:id/metadata; see
     reconcileActiveAgents ~12679). Nothing to migrate/sync here for that
     bullet; noted for the record. */

var hasServerStorage = !!(marinara && marinara.storage && typeof marinara.storage.get === "function");

var MRR_MIGRATED_FLAG = "mrr-migrated-v1";
var MRR_TS_MAP_KEY = "mrr-ts-map"; /* local-only sidecar: {<syncedKey>: <epoch ms>} — see "Corey override" header note. NOT a synced key. */
var MRR_STORAGE_SIZE_GUARD_BYTES = 900000;
var MRR_FLUSH_DEBOUNCE_MS = 1000;
var MRR_RETRY_DELAYS_MS = [2000, 8000, 30000];

var mrrServerCache = null;          /* becomes {} once hydrated. Cache internals choice (round 4): stores ENVELOPES {t, v} per key, mirroring the wire format exactly — hasOwnProperty(key) => "server has an entry" (v === null => tombstone). Chosen over a parallel raw-value/ts-object split because mrrProjectedMergedRecord/mrrBuildPatchFromCache already need to measure the envelope record; with envelopes in the cache those two functions need ZERO shape-specific changes. */
var mrrHydratePromise = null;       /* memoized hydrateStore() promise */
var mrrPendingPatchKeys = {};       /* keys mutated since the last flush */
var mrrFlushTimer = null;
var mrrQuarantinedKeys = {};        /* keys forced LS-only for the session after repeated patch failure or a size-guard trip */

/* RULING 1 (coordinator, validation round 1): the roster ("mrr-chars-
   <chatId>") and active-character pointer ("mrr-active-char-<chatId>")
   are SYNCED, not LOCAL — the design's own verify criterion ("sheet
   edited in one browser appears in the other after reload") is
   unreachable if the second browser can't see the chat's roster or which
   character is active. Small, non-derivable user data, same class as
   per-chat stamps. Named here (they're inline string literals at their
   original call sites, not LS_ constants) so the classifier and the
   migration scan share one spelling. */
var MRR_CHARS_PFX = "mrr-chars-";
var MRR_ACTIVE_CHAR_PFX = "mrr-active-char-";

function mrrIsSyncedKey(key) {
  if (typeof key !== "string") return false;
  if (key.indexOf(LS_CHARACTER_PFX) === 0) return true;
  if (key === LS_RULESET) return true;
  if (key.indexOf(LS_SPELLBOOK_LB_PFX) === 0) return true;
  if (key.indexOf(MRR_CHARS_PFX) === 0) return true;
  if (key.indexOf(MRR_ACTIVE_CHAR_PFX) === 0) return true;
  return false;
}

/* "Character family" = sheets + roster + active pointer — the set that
   dominates record size and gets quarantined (rather than left to fail
   the size guard forever) when a patch batch trips the budget. */
function mrrIsCharacterFamilyKey(key) {
  return key.indexOf(LS_CHARACTER_PFX) === 0
    || key.indexOf(MRR_CHARS_PFX) === 0
    || key.indexOf(MRR_ACTIVE_CHAR_PFX) === 0;
}

/* Single choke point for iterating the raw local-storage keyspace by
   prefix. Keeps the "new direct localStorage call site" budget from
   growing: the mrrp import scan (originally an inline loop here) and this
   adapter's migration scan both route through the same two physical
   length/key(i) reads below instead of each keeping their own. */
function forEachLocalStorageKey(prefix, cb) {
  var total = (typeof localStorage !== "undefined" && localStorage.length) || 0;
  for (var i = 0; i < total; i++) {
    var key = localStorage.key(i);
    if (key && key.indexOf(prefix) === 0) cb(key);
  }
}

function mrrByteLength(str) {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str).length;
  return unescape(encodeURIComponent(str)).length; /* fallback for hosts without TextEncoder */
}

function mrrProjectedMergedRecord(patch) {
  var merged = {}, k;
  for (k in mrrServerCache) { if (Object.prototype.hasOwnProperty.call(mrrServerCache, k)) merged[k] = mrrServerCache[k]; }
  for (k in patch) { if (Object.prototype.hasOwnProperty.call(patch, k)) merged[k] = patch[k]; }
  return merged;
}

/* Defensive read (Corey override, round 4): a server value that isn't
   shaped like an envelope (not an object with a numeric `t`) — including
   a genuinely absent/undefined value — is treated as {t: 0, v: <that raw
   value>}, degrading instead of throwing. In normal operation every
   in-cache value is already a real envelope (written by lsSet/lsDel/
   migration/merge below); this only actually fires for whatever comes
   back raw from marinara.storage.get() before this file has ever written
   through it, or if the server record is ever hand-edited. */
function mrrNormalizeEnvelope(raw) {
  if (raw && typeof raw === "object" && typeof raw.t === "number") return raw;
  return { t: 0, v: raw };
}

/* Local-only sidecar map — see MRR_TS_MAP_KEY / "Corey override" header
   note for why this is never itself a synced key. Always reads/writes via
   the RAW helpers (never lsGet/lsSet) so it can never accidentally be
   routed through the synced-key path. */
function mrrLoadTsMap() {
  var parsed = safeParse(lsGetRaw(MRR_TS_MAP_KEY));
  return (parsed && typeof parsed === "object" && !Array.isArray(parsed)) ? parsed : {};
}
function mrrStampTsMap(key, ts) {
  var map = mrrLoadTsMap();
  map[key] = ts;
  lsSetRaw(MRR_TS_MAP_KEY, JSON.stringify(map));
}

/* Hydrate merge — replaces the old "server always wins once present"
   precedence. Runs on EVERY hydrate (unlike mrrRunMigration, which is
   one-time/flag-gated) — this is what makes crash recovery work every
   session. See the "Corey override" header section for the full
   algorithm; this is the implementation of it verbatim. */
function mrrHydrateMerge() {
  if (!hasServerStorage) return;
  var tsMap = mrrLoadTsMap();
  var candidateKeys = {}, k;
  for (k in mrrServerCache) { if (Object.prototype.hasOwnProperty.call(mrrServerCache, k)) candidateKeys[k] = true; }
  for (k in tsMap) { if (Object.prototype.hasOwnProperty.call(tsMap, k)) candidateKeys[k] = true; }
  Object.keys(candidateKeys).forEach(function (key) {
    if (!mrrIsSyncedKey(key)) return; /* defensive — both sources should only ever hold synced keys */
    var hasServerEntry = Object.prototype.hasOwnProperty.call(mrrServerCache, key);
    var serverTs = hasServerEntry ? mrrNormalizeEnvelope(mrrServerCache[key]).t : null;
    var lsTs = tsMap[key] || 0;
    var adoptLs = !hasServerEntry || lsTs > serverTs;
    if (!adoptLs) return; /* server envelope wins as-is — already in mrrServerCache from the fetch */
    var lsRaw = lsGetRaw(key); /* current physical LS value; null if locally deleted */
    mrrServerCache[key] = { t: lsTs, v: lsRaw }; /* ORIGINAL lsTs, never a fresh now() — preserves true edit time */
    mrrMarkDirty(key);
  });
}

/* hydrateStore(): memoized, TOTAL (never rejects). On success, caches the
   server record in memory and runs the one-time migration. On ANY failure
   (get() rejects, or a migration key permanently fails — see
   mrrMigrateOneKey, which swallows its own failures so they never reach
   here), logs one warning, disables server storage for the session, and
   resolves so callers can always proceed. */
function hydrateStore() {
  if (mrrHydratePromise) return mrrHydratePromise;
  if (!hasServerStorage) {
    mrrServerCache = {};
    mrrHydratePromise = Promise.resolve();
    return mrrHydratePromise;
  }
  mrrHydratePromise = marinara.storage.get().then(function (record) {
    mrrServerCache = (record && typeof record === "object") ? record : {};
    mrrHydrateMerge(); /* every session — crash recovery, see header note. Runs BEFORE migration so a key the merge just adopted is correctly no-clobber-skipped by migration rather than reconsidered. */
    return mrrRunMigration();
  }).catch(function (e) {
    warn("marinara.storage hydrate failed — falling back to local storage for this session: " + (e && e.message ? e.message : e));
    hasServerStorage = false;
    mrrServerCache = {};
  });
  return mrrHydratePromise;
}

/* One-time migration, gated on BOTH the per-device MRR_MIGRATED_FLAG (never
   re-run once present) and per-key no-clobber (server already has an entry,
   including a null tombstone => "present" => skip). Copy-not-move: LS
   values are retained. Order: characters -> roster/active-char pointers
   (RULING 1) -> ruleset id (per-chat ruleset stamps are not an LS key, see
   header note; nothing to do for that sub-bullet) -> prefs (none
   classified as synced beyond ruleset id — see classification table above;
   intentionally empty) -> spellbook caches. Per-key patches so it is
   resumable/idempotent across sessions: a key that fails to patch is
   logged and left for next session (does not block the other keys this
   session); the flag is only set once every attempted key this session
   reported success (patched, no-clobber-skipped, or deliberately
   size-guard-skipped). Round 4 (Corey override): each migrated value is
   now written as an envelope stamped with its mrr-ts-map entry when one
   exists, else 0 — see mrrMigrateOneKey and the header note on why 0 is
   correct (not a bug) for a never-locally-stamped legacy value. */
function mrrRunMigration() {
  if (!hasServerStorage) return Promise.resolve();
  if (lsGetRaw(MRR_MIGRATED_FLAG)) return Promise.resolve();

  var tasks = [];
  forEachLocalStorageKey(LS_CHARACTER_PFX, function (key) { tasks.push(key); });
  forEachLocalStorageKey(MRR_CHARS_PFX, function (key) { tasks.push(key); });
  forEachLocalStorageKey(MRR_ACTIVE_CHAR_PFX, function (key) { tasks.push(key); });
  if (lsGetRaw(LS_RULESET) !== null) tasks.push(LS_RULESET);
  forEachLocalStorageKey(LS_SPELLBOOK_LB_PFX, function (key) { tasks.push(key); });

  return mrrMigrateKeysSequential(tasks, 0, true).then(function (allOk) {
    if (allOk) lsSetRaw(MRR_MIGRATED_FLAG, "1");
  });
}

function mrrMigrateKeysSequential(keys, idx, allOk) {
  if (idx >= keys.length) return Promise.resolve(allOk);
  return mrrMigrateOneKey(keys[idx]).then(function (ok) {
    return mrrMigrateKeysSequential(keys, idx + 1, allOk && ok);
  });
}

function mrrMigrateOneKey(key) {
  /* No-clobber: a tombstone (null) counts as present. */
  if (Object.prototype.hasOwnProperty.call(mrrServerCache, key)) return Promise.resolve(true);
  var raw = lsGetRaw(key);
  if (raw === null || raw === undefined) return Promise.resolve(true);
  var tsMap = mrrLoadTsMap();
  var ts = (typeof tsMap[key] === "number") ? tsMap[key] : 0; /* lsTs when present, else 0 (see header note) */
  var envelope = { t: ts, v: raw };
  var patch = {}; patch[key] = envelope;
  if (mrrByteLength(JSON.stringify(mrrProjectedMergedRecord(patch))) > MRR_STORAGE_SIZE_GUARD_BYTES) {
    warn("migration: skipped \"" + key + "\" — would exceed the server-sync size budget; left local-only.");
    if (mrrIsCharacterFamilyKey(key)) mrrQuarantinedKeys[key] = true;
    return Promise.resolve(true); /* deliberate skip — does not block the migrated flag */
  }
  return marinara.storage.patch(patch).then(function () {
    mrrServerCache[key] = envelope;
    return true;
  }).catch(function (e) {
    warn("migration: failed to sync \"" + key + "\" this session (" + (e && e.message ? e.message : e) + ") — will retry next session.");
    return false;
  });
}

function mrrMarkDirty(key) {
  mrrPendingPatchKeys[key] = true;
  if (!mrrFlushTimer) {
    mrrFlushTimer = marinara.setTimeout(function () {
      mrrFlushTimer = null;
      mrrFlushPendingPatch();
    }, MRR_FLUSH_DEBOUNCE_MS);
  }
}

/* Forces the debounced background patch immediately — called from
   flushSave() (visibilitychange/beforeunload/pagehide already route
   through it) and from the onCleanup disposer. */
function mrrFlushPendingPatch() {
  if (mrrFlushTimer) { marinara.clearTimeout(mrrFlushTimer); mrrFlushTimer = null; }
  if (!hasServerStorage || !mrrServerCache) return;
  var keys = Object.keys(mrrPendingPatchKeys);
  if (!keys.length) return;
  mrrPendingPatchKeys = {};
  mrrPatchKeys(keys, 0);
}

/* Size guard (900,000-byte soft margin under the engine's 1,000,000-byte
   cap): JSON.stringify the PROJECTED merged record (cached record + this
   patch) before every send — the cache already holds envelopes (round 4),
   so this measures the real envelope record with no extra transform.
   Over budget: any character-family keys (sheets, roster, active pointer
   — see mrrIsCharacterFamilyKey) in this batch are quarantined to
   LS-only for the session (character sheets are the dominant contributor
   to record size), one panel warning fires, and null is returned so the
   caller sends nothing. */
function mrrBuildPatchFromCache(keys) {
  var patch = {};
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    /* Defensive fallback only — every key reaching here came through
       mrrMarkDirty, which is only ever called right after the cache was
       written, so hasOwnProperty should always be true in practice. If it
       somehow isn't, send a freshly-stamped tombstone envelope rather than
       a bare null (round 4: the server now always expects {t, v}). */
    patch[k] = Object.prototype.hasOwnProperty.call(mrrServerCache, k) ? mrrServerCache[k] : { t: Date.now(), v: null };
  }
  if (mrrByteLength(JSON.stringify(mrrProjectedMergedRecord(patch))) > MRR_STORAGE_SIZE_GUARD_BYTES) {
    keys.forEach(function (k) { if (mrrIsCharacterFamilyKey(k)) mrrQuarantinedKeys[k] = true; });
    mrrPanelWarn("character library exceeds server-sync budget — sheets stored locally");
    return null;
  }
  return patch;
}

/* Backoff-retried background patch for a batch of dirty keys. On
   exhaustion (after MRR_RETRY_DELAYS_MS run out): a single-key batch is
   quarantined directly; a multi-key batch is split so each key gets its
   own independent retry-then-quarantine cycle (isolates the offender
   instead of quarantining innocent keys alongside it). */
function mrrPatchKeys(keys, attempt) {
  keys = keys.filter(function (k) { return !mrrQuarantinedKeys[k]; });
  if (!keys.length) return;
  var patch = mrrBuildPatchFromCache(keys);
  if (!patch) return; /* size guard already handled/warned */
  marinara.storage.patch(patch).catch(function () {
    if (attempt < MRR_RETRY_DELAYS_MS.length) {
      marinara.setTimeout(function () { mrrPatchKeys(keys, attempt + 1); }, MRR_RETRY_DELAYS_MS[attempt]);
      return;
    }
    if (keys.length > 1) {
      keys.forEach(function (k) { mrrPatchOneKey(k, 0); });
    } else {
      mrrQuarantinedKeys[keys[0]] = true;
      mrrPanelWarn("storage sync failed repeatedly for \"" + keys[0] + "\" — quarantined to local storage for this session");
    }
  });
}

function mrrPatchOneKey(key, attempt) {
  if (mrrQuarantinedKeys[key]) return;
  var patch = mrrBuildPatchFromCache([key]);
  if (!patch) return;
  marinara.storage.patch(patch).catch(function () {
    if (attempt < MRR_RETRY_DELAYS_MS.length) {
      marinara.setTimeout(function () { mrrPatchOneKey(key, attempt + 1); }, MRR_RETRY_DELAYS_MS[attempt]);
    } else {
      mrrQuarantinedKeys[key] = true;
      mrrPanelWarn("storage sync failed repeatedly for \"" + key + "\" — quarantined to local storage for this session");
    }
  });
}

/* Fire-and-forget best-effort flush for the onCleanup disposer — the page
   is unloading, so no retry/backoff, just one attempt. */
function mrrBestEffortFlushOnCleanup() {
  if (!hasServerStorage || !mrrServerCache) return;
  var keys = Object.keys(mrrPendingPatchKeys);
  if (!keys.length) return;
  mrrPendingPatchKeys = {};
  var patch = mrrBuildPatchFromCache(keys);
  if (patch) { try { marinara.storage.patch(patch); } catch (e) {} }
}

/* RULING 2 (coordinator, validation round 1): a visible degradation-warning
   strip, not console-only. No pre-existing persistent "MRR panel status
   area" was found anywhere in this codebase (the runs-poller's own
   degradation path ~13987-area also only ever called warn(); the only
   visible-message primitives were dialog-scoped .mrr-msg/setMsg(),
   requiring an open dialog). Built here instead:
     - a lazily-created div.mrr-warn-strip, mounted at the TOP of the
       extension's real main sheet panel content area. NOTE: the ruling's
       phrasing ("the panel root mrrP3CreatePanel creates") pointed at the
       wrong symbol — mrrP3CreatePanel (~4676) builds the three AUXILIARY
       floating flyouts (Intimacies/Items/Spellbook), never the main
       sheet. The actual main sheet content root is state.mountEl, built
       exactly once per render inside mrrP3RenderSheet (~4879, the sole
       place that creates it — renderSheet ~6833 unconditionally
       delegates to it). Hooked there, right after state.mountEl exists
       and before any other content is added, so a fresh strip always
       lands as the first child — "hook the panel-creation path once,
       don't poll" satisfied against the correct symbol. See final report.
     - messages queue (mrrWarnMessages) so a warning fired before the
       sheet has ever rendered (e.g. during migration inside
       hydrateStore(), which runs before init()) is not lost — it shows on
       the next render automatically.
     - live update: mrrPanelWarn also pushes straight into an
       already-mounted strip (via mrrRenderWarnStrip) so a background
       failure mid-session doesn't need to wait for an unrelated full
       sheet re-render to become visible.
     - identical-consecutive dedupe, most-recent-message + "(+N more)"
       display, session-local × dismiss that a NEW distinct warning
       un-dismisses.
     - created via marinara.addElement (the file's own element-creation
       idiom, same as every other panel element) so it lives inside
       state.mountEl's subtree and is torn down/recreated with it exactly
       like the rest of the sheet — no separate cleanup bookkeeping
       needed. Styling reuses the existing --mrr-warning design token
       (already used at ~4025 as `errEl.style.color`) with the file's own
       oklch-alpha "soft" idiom (see --mrr-accent-soft in the embedded
       CSS) rather than inventing a new color or a color-mix() technique
       not used anywhere else in this file. No embed-css/CSS pipeline
       touched — inline styles only. */
var mrrWarnMessages = [];      /* distinct-consecutive queue, most recent last */
var mrrWarnDismissed = false;  /* session-local; a new distinct message clears this */
var mrrWarnStripEl = null;     /* the currently-mounted strip node, if any */

function mrrRenderWarnStrip() {
  if (mrrWarnStripEl && !mrrWarnStripEl.isConnected) mrrWarnStripEl = null; /* orphaned by a prior full re-render */

  if (!mrrWarnMessages.length || mrrWarnDismissed) {
    if (mrrWarnStripEl && mrrWarnStripEl.parentNode) mrrWarnStripEl.parentNode.removeChild(mrrWarnStripEl);
    mrrWarnStripEl = null;
    return;
  }
  if (!state.mountEl) return; /* nothing to mount into yet — stays queued for the next render */

  if (!mrrWarnStripEl || !mrrWarnStripEl.parentNode) {
    var before = state.mountEl.firstChild; /* captured BEFORE the append below so the strip can be moved to the top */
    mrrWarnStripEl = marinara.addElement(state.mountEl, "div", { "class": "mrr-warn-strip" });
    if (!mrrWarnStripEl) return;
    if (before) state.mountEl.insertBefore(mrrWarnStripEl, before);
    mrrWarnStripEl.style.display = "flex";
    mrrWarnStripEl.style.alignItems = "center";
    mrrWarnStripEl.style.gap = "8px";
    mrrWarnStripEl.style.width = "100%";
    mrrWarnStripEl.style.boxSizing = "border-box";
    mrrWarnStripEl.style.padding = "6px 10px";
    mrrWarnStripEl.style.marginBottom = "6px";
    mrrWarnStripEl.style.fontSize = "12px";
    mrrWarnStripEl.style.lineHeight = "1.3";
    mrrWarnStripEl.style.background = "oklch(0.84 0.14 85 / 0.16)";  /* --mrr-warning L/C/H, file's own soft-alpha idiom */
    mrrWarnStripEl.style.border = "1px solid oklch(0.84 0.14 85 / 0.4)";
    mrrWarnStripEl.style.borderRadius = "6px";
    mrrWarnStripEl.style.color = "var(--mrr-warning)";

    var textEl = marinara.addElement(mrrWarnStripEl, "span", { "class": "mrr-warn-strip__text" });
    if (textEl) {
      textEl.style.flex = "1 1 auto";
      textEl.style.minWidth = "0";
      textEl.style.overflowWrap = "break-word";
    }

    var dismissBtn = marinara.addElement(mrrWarnStripEl, "button", {
      "class": "mrr-warn-strip__dismiss",
      type: "button",
      textContent: "×",
      title: "Dismiss"
    });
    if (dismissBtn) {
      dismissBtn.style.flex = "0 0 auto";
      dismissBtn.style.background = "transparent";
      dismissBtn.style.border = "none";
      dismissBtn.style.cursor = "pointer";
      dismissBtn.style.fontSize = "14px";
      dismissBtn.style.lineHeight = "1";
      dismissBtn.style.padding = "0 2px";
      dismissBtn.style.color = "inherit";
      marinara.on(dismissBtn, "click", function () {
        mrrWarnDismissed = true;
        mrrRenderWarnStrip();
      });
    }
  }

  var textNode = mrrWarnStripEl.querySelector(".mrr-warn-strip__text");
  if (textNode) {
    var latest = mrrWarnMessages[mrrWarnMessages.length - 1];
    var extra = mrrWarnMessages.length - 1;
    textNode.textContent = latest + (extra > 0 ? " (+" + extra + " more)" : "");
  }
}

function mrrPanelWarn(msg) {
  warn(msg);
  if (mrrWarnMessages[mrrWarnMessages.length - 1] !== msg) mrrWarnMessages.push(msg); /* identical-consecutive dedupe */
  mrrWarnDismissed = false; /* a new distinct warning re-shows a dismissed strip */
  mrrRenderWarnStrip();
}

function mrrIsQuarantined(key) { return !!mrrQuarantinedKeys[key]; }

/* Public wrappers — EVERY existing call site (~66) keeps calling these
   three names with the same signatures; server-storage awareness is
   entirely internal. Round 4 (Corey override — SUPERSEDES the original
   "deterministic, no timestamps" precedence): reads are served straight
   from the cache, whose contents are decided once, at hydrate time, by
   mrrHydrateMerge's newest-wins timestamp comparison — lsGet itself no
   longer picks a winner, it just unwraps whichever envelope the merge
   already settled on. Writes stamp both the ts-map (mrrStampTsMap, via
   RAW localStorage — never a synced key) and the in-memory envelope
   (cache stores {t, v} — see the cache-internals note above mrrServerCache)
   with the SAME now() value, so a value and its timestamp can never
   disagree. */
function lsGet(key) {
  if (hasServerStorage && mrrServerCache && mrrIsSyncedKey(key) && !mrrIsQuarantined(key)) {
    if (Object.prototype.hasOwnProperty.call(mrrServerCache, key)) {
      var v = mrrNormalizeEnvelope(mrrServerCache[key]).v;
      return (v === null || v === undefined) ? null : v;
    }
  }
  return lsGetRaw(key);
}

function lsSet(key, val) {
  var ok = lsSetRaw(key, val); /* LS remains a current local mirror this release — never removed; always the raw string, envelopes are a server/cache-only concept */
  if (hasServerStorage && mrrServerCache && mrrIsSyncedKey(key) && !mrrIsQuarantined(key)) {
    var ts = Date.now();
    mrrStampTsMap(key, ts);
    mrrServerCache[key] = { t: ts, v: val };
    mrrMarkDirty(key);
  }
  return ok;
}

function lsDel(key) {
  lsDelRaw(key);
  if (hasServerStorage && mrrServerCache && mrrIsSyncedKey(key) && !mrrIsQuarantined(key)) {
    var ts = Date.now();
    mrrStampTsMap(key, ts);
    mrrServerCache[key] = { t: ts, v: null }; /* tombstone, now timestamped — a strictly-newer LS write can still recreate it later (see mrrHydrateMerge) */
    mrrMarkDirty(key);
  }
}
/* ═══════════════════════════════════════════════════════════════════════ */

function validateRuleset(rs) {
  if (!rs || typeof rs !== "object") return "ruleset is not an object";
  for (var i = 0; i < REQUIRED_FIELDS.length; i++) {
    var f = REQUIRED_FIELDS[i];
    if (!(f in rs)) return "missing required field: " + f;
  }
  if (!rs.dice || typeof rs.dice.type !== "string") return "missing dice.type";
  if (!rs.resolution || typeof rs.resolution.mode !== "string") return "missing resolution.mode";
  if (!Array.isArray(rs.attributes) || rs.attributes.length < 1) return "attributes must be non-empty array";
  if (!Array.isArray(rs.skills) || rs.skills.length < 1) return "skills must be non-empty array";
  return null;
}

function loadRuleset() {
  var blob = lsGet(LS_RULESET);
  if (blob) {
    var rs = safeParse(blob);
    var err = validateRuleset(rs);
    if (err) { warn("ruleset blob invalid: " + err); return null; }
    return rs;
  }
  if (lsGet(LS_RULESET_URL)) {
    log("ruleset URL configured but synchronous load not available; using cached blob if any");
  }
  return null;
}

function fetchRulesetFromUrl(url) {
  return mrrFetch(url).then(function (r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.text();
  }).then(function (text) {
    var parsed = safeParse(text);
    if (parsed && parsed.schema === BUNDLE_SCHEMA_ID) {
      var bErrs = validateInstallBundle(parsed);
      if (bErrs) throw new Error("invalid bundle:\n" + formatBundleErrors(bErrs));
      return parsed;
    }
    var err = validateRuleset(parsed);
    if (err) throw new Error("invalid ruleset: " + err);
    lsSet(LS_RULESET, JSON.stringify(parsed));
    return parsed;
  });
}

/* ─────  ruleset library (multi-ruleset cache, chatId-independent)  ───── */

function loadLibrary() {
  var raw = lsGet(LS_LIBRARY);
  if (!raw) return {};
  var parsed = safeParse(raw);
  return (parsed && typeof parsed === "object") ? parsed : {};
}

function saveLibrary(lib) {
  lsSet(LS_LIBRARY, JSON.stringify(lib));
}

/* Add or update a ruleset in the library, keyed by its id. The library is
   how a user keeps multiple rulesets ready-to-swap (D&D for one campaign,
   Fate for another) without re-fetching or re-pasting. Skips the write
   when the existing entry already matches — prevents a wasted lsSet on
   every extension load when init() seeds the active ruleset. */
function addToLibrary(rs) {
  if (!rs || !rs.id) return;
  var lib = loadLibrary();
  var existing = lib[rs.id];
  if (existing && existing.name === rs.name && existing.version === rs.version) return;
  lib[rs.id] = { name: rs.name, version: rs.version, ruleset: rs };
  saveLibrary(lib);
}

function removeFromLibrary(id) {
  var lib = loadLibrary();
  delete lib[id];
  saveLibrary(lib);
}

function activateFromLibrary(id) {
  var lib = loadLibrary();
  var entry = lib[id];
  if (!entry || !entry.ruleset) return false;
  lsSet(LS_RULESET, JSON.stringify(entry.ruleset));
  return true;
}

/* ─────  bundle install  ───── */

/* Hand-rolled validator for install bundles (distinct from validateBundle
   below which validates the character save/load bundle). Produces
   { path, expected, got, hint } records that callers can format into a
   vibecoder-friendly error. We avoid Ajv in the shipped JS; the schema
   lives at schema/bundle.schema.json for reference but is not loaded at
   runtime. */
function validateInstallBundle(b) {
  if (!b || typeof b !== "object") return [{ path: "(root)", expected: "object", got: typeof b, hint: "Bundle must be a JSON object." }];
  var errs = [];
  function need(obj, path, key, type) {
    var v = obj[key];
    var actual = Array.isArray(v) ? "array" : typeof v;
    if (type === "array" ? !Array.isArray(v) : actual !== type) {
      errs.push({ path: path + "." + key, expected: type, got: actual === "undefined" ? "missing" : actual, hint: "" });
    }
  }
  if (b.schema !== BUNDLE_SCHEMA_ID) {
    errs.push({ path: "schema", expected: '"' + BUNDLE_SCHEMA_ID + '"', got: JSON.stringify(b.schema), hint: "Set top-level field schema to \"" + BUNDLE_SCHEMA_ID + "\"." });
  }
  if (b.version !== 1) {
    errs.push({ path: "version", expected: "1", got: JSON.stringify(b.version), hint: "Set top-level field version to integer 1." });
  }
  if (b.ruleset && typeof b.ruleset === "object") {
    var rsErr = validateRuleset(b.ruleset);
    if (rsErr) errs.push({ path: "ruleset", expected: "valid ruleset.json", got: "invalid", hint: rsErr });
  } else {
    errs.push({ path: "ruleset", expected: "object", got: typeof b.ruleset, hint: "Embed the full ruleset.json under the \"ruleset\" key." });
  }
  /* gmAgent is OPTIONAL as of v0.4 — bundles may ship ruleset+lorebook only
     and let the user install agents separately via the agent-import flow.
     Validate shape ONLY if the field is present. */
  if (b.gmAgent !== undefined) {
    if (typeof b.gmAgent !== "object") {
      errs.push({ path: "gmAgent", expected: "object (or omitted)", got: typeof b.gmAgent, hint: "Either remove gmAgent entirely or supply a full object with name + promptTemplate." });
    } else {
      need(b.gmAgent, "gmAgent", "name", "string");
      need(b.gmAgent, "gmAgent", "promptTemplate", "string");
      if (typeof b.gmAgent.promptTemplate === "string" && b.gmAgent.promptTemplate.length < 50) {
        errs.push({ path: "gmAgent.promptTemplate", expected: "at least 50 characters", got: b.gmAgent.promptTemplate.length + " chars", hint: "Prompt templates this short usually mean the prompt was truncated." });
      }
    }
  }
  if (!b.lorebook || typeof b.lorebook !== "object") {
    errs.push({ path: "lorebook", expected: "object", got: typeof b.lorebook, hint: "Add a lorebook object with name + entries array." });
  } else {
    need(b.lorebook, "lorebook", "name", "string");
    need(b.lorebook, "lorebook", "entries", "array");
    if (Array.isArray(b.lorebook.entries)) {
      for (var i = 0; i < b.lorebook.entries.length; i++) {
        var e = b.lorebook.entries[i];
        var p = "lorebook.entries[" + i + "]";
        if (!e || typeof e !== "object") { errs.push({ path: p, expected: "object", got: typeof e, hint: "" }); continue; }
        if (typeof e.name !== "string" || e.name.length === 0) errs.push({ path: p + ".name", expected: "non-empty string", got: typeof e.name, hint: "Each entry needs a display name." });
        if (typeof e.content !== "string") errs.push({ path: p + ".content", expected: "string", got: typeof e.content, hint: "Set content to the entry's reference text." });
        if ("position" in e && (typeof e.position !== "number" || e.position < 0 || e.position > 2)) {
          errs.push({ path: p + ".position", expected: "integer 0, 1, or 2", got: JSON.stringify(e.position), hint: "0 = before character defs (system context), 1 = after, 2 = depth-injected." });
        }
      }
    }
  }
  return errs.length === 0 ? null : errs;
}

function formatBundleErrors(errs) {
  var lines = ["Bundle install failed. " + errs.length + " issue" + (errs.length === 1 ? "" : "s") + " found:\n"];
  for (var i = 0; i < errs.length; i++) {
    var e = errs[i];
    lines.push("• " + e.path);
    lines.push("    expected: " + e.expected);
    lines.push("    got:      " + e.got);
    if (e.hint) lines.push("    hint:     " + e.hint);
  }
  lines.push("\nHand this whole error back to your AI and ask it to produce a corrected bundle.");
  return lines.join("\n");
}

/* apiFetch wrapper that preserves error context (HTTP status, body, cause)
   so install errors surface useful diagnostics rather than just "failed". */
function apiFetch(path, opts) {
  return marinara.apiFetch(path, opts).catch(function (e) {
    var msg = "apiFetch " + path + ": " + (e && e.message ? e.message : String(e));
    var wrapped = new Error(msg);
    wrapped.cause = e;
    if (e && typeof e.status === "number") wrapped.status = e.status;
    throw wrapped;
  });
}

/* Find a managed agent for this ruleset by settings flags. We previously
   matched by promptTemplate prefix too; settings is more robust because
   users editing the prompt body don't break idempotency. The prefix is
   still stamped on the prompt as a visual marker but is not load-bearing. */

/* The engine stores agent.settings as a TEXT column and returns it as a
   raw JSON string from GET /agents (db/schema/agents.ts:16,
   storage/agents.storage.ts list()). Parse before checking flags —
   indexing a string by property name yields undefined and silently
   misses every managed agent. This was the root cause of pre-v0.4
   duplicate-agent accumulation: the idempotency check looked correct
   but always returned null. */
function parseAgentSettings(a) {
  if (!a) return {};
  var s = a.settings;
  if (typeof s === "string") {
    try { return JSON.parse(s); } catch (e) { return {}; }
  }
  return (s && typeof s === "object") ? s : {};
}

function findManagedAgent(agents, rulesetId, authorId, role) {
  /* role: undefined/null = the main gmAgent (no mrrAgentRole on settings, or
     mrrAgentRole === "main"). A string = an additionalAgent with that role. */
  if (!Array.isArray(agents)) return null;
  for (var i = 0; i < agents.length; i++) {
    var a = agents[i];
    if (!a || typeof a !== "object") continue;
    var s = parseAgentSettings(a);
    if (s.mrrManaged !== true || s.mrrRulesetId !== rulesetId || s.mrrAuthorId !== authorId) continue;
    var agentRole = s.mrrAgentRole;
    if (role) {
      if (agentRole === role) return a;
    } else {
      if (!agentRole || agentRole === "main") return a;
    }
  }
  return null;
}

function findManagedLorebook(lorebooks, rulesetId) {
  if (!Array.isArray(lorebooks)) return null;
  for (var i = 0; i < lorebooks.length; i++) {
    var lb = lorebooks[i];
    if (!lb || typeof lb !== "object") continue;
    var tags = Array.isArray(lb.tags) ? lb.tags : [];
    if (tags.indexOf(MRR_TAG_MANAGED) !== -1 && tags.indexOf(MRR_TAG_RS_PFX + rulesetId) !== -1) return lb;
  }
  return null;
}

/* Pick a default connectionId for the GM agent if exactly one connection
   exists. Returns null when 0 or >1 — the user must wire it themselves.
   HTTP errors propagate (we don't want to silently set null when the
   server is broken or unreachable). */
function pickDefaultConnection() {
  return apiFetch("/connections", {}).then(function (list) {
    if (!Array.isArray(list) || list.length !== 1) return null;
    return list[0] && list[0].id ? list[0].id : null;
  });
}

/* Compare two semver-shaped version strings. Returns -1 if a<b, 0 if =, 1 if a>b.
   Tolerates missing minor/patch by treating them as 0. */
function cmpVersion(a, b) {
  function parts(v) { return String(v || "0").split(".").map(function (n) { return parseInt(n, 10) || 0; }); }
  var pa = parts(a), pb = parts(b);
  for (var i = 0; i < 3; i++) {
    var av = pa[i] || 0, bv = pb[i] || 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

/* Idempotent install pipeline. Bundles re-pasted overwrite (PATCH) the
   managed lorebook and agent, and re-POST all entries (bulk replace —
   user-edited entries on a managed lorebook get overwritten on re-install).
   Order: kick off the 3 independent GETs in parallel, then ruleset (free,
   client-side) + lorebook + entries + agent in sequence. */
function installBundle(bundle, progressCb) {
  var errs = validateInstallBundle(bundle);
  if (errs) return Promise.reject(new Error(formatBundleErrors(errs)));

  if (bundle.minExtensionVersion && cmpVersion(EXT_VERSION, bundle.minExtensionVersion) < 0) {
    return Promise.reject(new Error(
      "This bundle requires extension version " + bundle.minExtensionVersion +
      " or newer; this build is " + EXT_VERSION + ". Update the framework JS first."
    ));
  }

  var rulesetId = bundle.ruleset.id;
  var authorId = bundle.authorId || "local";
  var prefix = MRR_PROMPT_PFX + authorId + "/" + rulesetId + "]";
  function progress(msg) { if (progressCb) progressCb(msg); }

  progress("Loading existing server state...");
  return Promise.all([
    apiFetch("/lorebooks", {}),
    apiFetch("/agents", {}),
    pickDefaultConnection()
  ]).then(function (results) {
    var lorebooks = results[0];
    var agents = results[1];
    var connectionId = results[2];

    progress("Installing ruleset...");
    lsSet(LS_RULESET, JSON.stringify(bundle.ruleset));
    addToLibrary(bundle.ruleset);

    var existingLb = findManagedLorebook(lorebooks, rulesetId);
    var lbBody = {
      name: bundle.lorebook.name,
      description: bundle.lorebook.description || "",
      category: bundle.lorebook.category || "world",
      scanDepth: bundle.lorebook.scanDepth != null ? bundle.lorebook.scanDepth : 4,
      tokenBudget: bundle.lorebook.tokenBudget != null ? bundle.lorebook.tokenBudget : 1500,
      recursiveScanning: !!bundle.lorebook.recursiveScanning,
      tags: [MRR_TAG_MANAGED, MRR_TAG_RS_PFX + rulesetId]
    };

    var lbStep = existingLb
      ? (progress("Updating lorebook..."), apiFetch("/lorebooks/" + existingLb.id, { method: "PATCH", body: JSON.stringify(lbBody) }).then(function () { return existingLb.id; }))
      : (progress("Creating lorebook..."), apiFetch("/lorebooks", { method: "POST", body: JSON.stringify(lbBody) }).then(function (lb) { return lb && lb.id; }));

    return lbStep.then(function (lbId) {
      if (!lbId) throw new Error("Lorebook id missing after create/update.");
      /* On re-install, wipe the lorebook's existing entries before re-adding.
         Two reasons: (1) the bulk endpoint historically replaced contents,
         but per-entry POST appends, so without the wipe we'd accumulate
         duplicates on every re-install; (2) the managed-lorebook contract
         (see header comment) is that user edits get overwritten on
         re-install. The GET /lorebooks/:id returns { entries: [...] }
         where each entry has an id; we delete each one then post fresh. */
      progress("Clearing managed lorebook entries...");
      /* Entries live at /lorebooks/:id/entries — GET /lorebooks/:id only returns the lorebook row, not its entries. Earlier code fetched the wrong endpoint, found nothing to delete, and every re-install silently appended on top of prior install's entries. */
      return apiFetch("/lorebooks/" + lbId + "/entries").then(function (existingEntries) {
        if (!Array.isArray(existingEntries)) existingEntries = [];
        var deleteChain = Promise.resolve();
        existingEntries.forEach(function (e) {
          if (!e || !e.id) return;
          deleteChain = deleteChain.then(function () {
            return apiDeleteRaw("/lorebooks/" + lbId + "/entries/" + e.id).catch(function () {});
          });
        });
        return deleteChain;
      }).then(function () { return lbId; });
    }).then(function (lbId) {
      progress("Installing " + bundle.lorebook.entries.length + " lorebook entries...");
      /* Per-entry POST mirrors the spellbook write path (upsertAbilityLorebookEntry)
         which is known to work end-to-end. The bulk endpoint was returning
         200 but landing zero entries — switching to single-entry POSTs and
         using `tags: [MRR_TAG_MANAGED]` (plural array) instead of
         `tag: "..."` (singular string) restored the install. */
      var entries = bundle.lorebook.entries;
      var addChain = Promise.resolve();
      entries.forEach(function (e, i) {
        addChain = addChain.then(function () {
          var copy = {};
          for (var k in e) if (Object.prototype.hasOwnProperty.call(e, k)) copy[k] = e[k];
          var existingTags = Array.isArray(copy.tags) ? copy.tags.slice() : [];
          if (existingTags.indexOf(MRR_TAG_MANAGED) === -1) existingTags.push(MRR_TAG_MANAGED);
          copy.tags = existingTags;
          delete copy.tag; /* defensive: drop legacy singular field if any */
          if ((i % 5) === 0) progress("Entry " + (i + 1) + "/" + entries.length + "...");
          return apiFetch("/lorebooks/" + lbId + "/entries", { method: "POST", body: JSON.stringify(copy) });
        });
      });
      return addChain;
    }).then(function () {
      /* gmAgent OPTIONAL as of v0.4. If absent, skip the GM-agent install
         entirely and proceed to additionalAgents (also optional) and the
         done step. The recommended flow is now to ship agents separately
         via the agent-import dialog; bundles need only the ruleset and
         lorebook. */
      if (!bundle.gmAgent || typeof bundle.gmAgent !== "object") {
        progress("Skipping GM agent (not bundled).");
        return;
      }
      progress("Installing GM agent...");
      var existingAgent = findManagedAgent(agents, rulesetId, authorId);
      var ag = bundle.gmAgent;
      var promptTemplate = prefix + " " + (ag.promptTemplate || "");
      var body = {
        type: MRR_AGENT_TYPE,
        name: "MRR: " + (ag.name || rulesetId),
        description: ag.description || "",
        phase: ag.phase || "pre_generation",
        enabled: true,
        connectionId: connectionId,
        promptTemplate: promptTemplate,
        settings: Object.assign({}, ag.settings || {}, {
          mrrManaged: true,
          mrrBundleSchema: BUNDLE_SCHEMA_ID,
          mrrRulesetId: rulesetId,
          mrrAuthorId: authorId
        })
      };
      return existingAgent
        ? apiFetch("/agents/" + existingAgent.id, { method: "PATCH", body: JSON.stringify(body) })
        : apiFetch("/agents", { method: "POST", body: JSON.stringify(body) });
    }).then(function () {
      /* Install optional additionalAgents (state-reminder, combat-adjudicator,
         lore-query, npc-bookkeeper, etc). Each gets its own settings.mrrAgentRole
         so re-install matches by (rulesetId, role) and updates in place rather
         than duplicating. Sub-agents installed sequentially to keep server
         load predictable and order-deterministic. */
      var subAgents = Array.isArray(bundle.additionalAgents) ? bundle.additionalAgents : [];
      if (subAgents.length === 0) return;
      progress("Installing " + subAgents.length + " additional agent(s)...");
      return subAgents.reduce(function (chain, ag) {
        return chain.then(function () {
          var role = ag.role;
          var existingSub = findManagedAgent(agents, rulesetId, authorId, role);
          var subPrefix = "[mrr-v1:" + authorId + "/" + rulesetId + ":" + role + "]";
          var subPromptTemplate = subPrefix + " " + (ag.promptTemplate || "");
          /* Sub-agents install DISABLED by default. Bundle authors can opt
             a specific agent into enabled-on-install by setting
             "enabled": true on the additionalAgents item. Rationale:
             every pre_generation agent costs a model call per turn; users
             should explicitly enable only the ones they want. README +
             system lorebook document each agent's purpose and how to flip
             the toggle in Settings -> Agents. */
          var subBody = {
            type: MRR_AGENT_TYPE,
            name: "MRR: " + (ag.name || (rulesetId + " " + role)),
            description: ag.description || "",
            phase: ag.phase || "pre_generation",
            enabled: ag.enabled === true,
            connectionId: connectionId,
            promptTemplate: subPromptTemplate,
            settings: Object.assign({}, ag.settings || {}, {
              mrrManaged: true,
              mrrBundleSchema: BUNDLE_SCHEMA_ID,
              mrrRulesetId: rulesetId,
              mrrAuthorId: authorId,
              mrrAgentRole: role
            })
          };
          /* On re-install (PATCH), preserve the user's enabled-toggle —
             the user may have flipped this sub-agent on/off in Settings →
             Agents and we don't want to clobber that. enabled is only
             carried on the initial CREATE (POST). */
          var subBodyForUpdate = Object.assign({}, subBody);
          delete subBodyForUpdate.enabled;
          return existingSub
            ? apiFetch("/agents/" + existingSub.id, { method: "PATCH", body: JSON.stringify(subBodyForUpdate) })
            : apiFetch("/agents", { method: "POST", body: JSON.stringify(subBody) });
        });
      }, Promise.resolve());
    }).then(function () {
      /* Vector 9 (Phase 1): install bundle-shipped engine-native regex
         scripts. Engine RegexScript has no `tags` field, so idempotency
         lives in the name: every script installed by this bundle is
         prefixed with `MRR: <rulesetId>: <authorName>`. On re-install we
         GET /regex-scripts, filter by that prefix, DELETE each match,
         then POST the fresh set. Matches the lorebook re-install
         contract (user edits get overwritten on re-install). Optional
         field; absent/empty array = skip entire step.

         Known limitation: DELETE-then-POST is NOT atomic. If a POST
         fails mid-batch (network blip, engine validator change), prior
         managed scripts are already wiped and only a partial set is
         installed. Recovery is to re-run the bundle install, which
         repeats the wipe-then-POST cycle. Documented; Phase 1
         acceptable trade-off vs the complexity of a temp-name swap. */
      var scripts = Array.isArray(bundle.regexScripts) ? bundle.regexScripts : [];
      if (scripts.length === 0) return Promise.resolve();
      var rulesetPrefix = MRR_REGEX_NAME_PFX + rulesetId + ": ";
      progress("Loading existing regex scripts...");
      return apiFetch("/regex-scripts", {}).then(function (existing) {
        var prior = Array.isArray(existing)
          ? existing.filter(function (s) { return s && typeof s.name === "string" && s.name.indexOf(rulesetPrefix) === 0; })
          : [];
        var deleteChain = Promise.resolve();
        if (prior.length > 0) progress("Removing " + prior.length + " prior managed regex script(s)...");
        prior.forEach(function (s) {
          if (!s || !s.id) return;
          deleteChain = deleteChain.then(function () {
            return apiDeleteRaw("/regex-scripts/" + s.id).catch(function () {});
          });
        });
        return deleteChain;
      }).then(function () {
        progress("Installing " + scripts.length + " regex script(s)...");
        var addChain = Promise.resolve();
        scripts.forEach(function (s, i) {
          addChain = addChain.then(function () {
            if ((i % 5) === 0) progress("Regex script " + (i + 1) + "/" + scripts.length + "...");
            var body = {
              name: rulesetPrefix + (s.name || ("script-" + i)),
              enabled: s.enabled !== false,
              findRegex: s.findRegex || "",
              replaceString: s.replaceString != null ? s.replaceString : "",
              trimStrings: Array.isArray(s.trimStrings) ? s.trimStrings : [],
              placement: Array.isArray(s.placement) && s.placement.length > 0 ? s.placement : ["ai_output"],
              flags: typeof s.flags === "string" ? s.flags : "gi",
              promptOnly: !!s.promptOnly,
              order: typeof s.order === "number" ? s.order : 100,
              minDepth: s.minDepth != null ? s.minDepth : null,
              maxDepth: s.maxDepth != null ? s.maxDepth : null
            };
            return apiPostRaw("/regex-scripts", body);
          });
        });
        return addChain;
      });
    }).then(function () {
      /* Vector 3 (Phase 1): install bundle-shipped engine-native custom
         tools. Static-type tools only as of v0.4.x — script-type tools
         require CUSTOM_TOOL_SCRIPT_ENABLED on the engine and are not
         shipped by the auto-derived generator (script payload is
         Vector 3.1 future work; bundle authors can still ship explicit
         script-type tools via `customTools:` override if they accept
         the env-var requirement).

         Idempotency: engine CustomTool name regex is ^[a-z][a-z0-9_]*$
         and enforces uniqueness via 409 — we use a `mrr_<rulesetIdSnake>_`
         prefix and DELETE-then-POST. The ruleset id may contain
         dashes (kebab-case) so we convert to snake before prefixing.

         Known limitation: same non-atomic DELETE-then-POST trade-off
         as the regex-script installer. Re-run the bundle install to
         recover from a mid-batch failure.

         Privileged-access caveat: engine POST/PATCH/DELETE on
         /custom-tools requires the privileged-gate middleware to
         allow the caller. On a self-hosted single-user Marinara
         install this is typically allowed; if not, the install
         surfaces a 403 from apiPostRaw and the user re-runs after
         flipping the gate. */
      var tools = Array.isArray(bundle.customTools) ? bundle.customTools : [];
      if (tools.length === 0) return Promise.resolve();
      var rulesetIdSnake = String(rulesetId || "").toLowerCase().replace(/-/g, "_").replace(/[^a-z0-9_]/g, "_");
      var rulesetToolPrefix = MRR_TOOL_NAME_PFX + rulesetIdSnake + "_";
      progress("Loading existing custom tools...");
      return apiFetch("/custom-tools", {}).then(function (existing) {
        var prior = Array.isArray(existing)
          ? existing.filter(function (t) { return t && typeof t.name === "string" && t.name.indexOf(rulesetToolPrefix) === 0; })
          : [];
        var deleteChain = Promise.resolve();
        if (prior.length > 0) progress("Removing " + prior.length + " prior managed custom tool(s)...");
        prior.forEach(function (t) {
          if (!t || !t.id) return;
          deleteChain = deleteChain.then(function () {
            return apiDeleteRaw("/custom-tools/" + t.id).catch(function () {});
          });
        });
        return deleteChain;
      }).then(function () {
        progress("Installing " + tools.length + " custom tool(s)...");
        var addChain = Promise.resolve();
        tools.forEach(function (t, i) {
          addChain = addChain.then(function () {
            if ((i % 3) === 0) progress("Custom tool " + (i + 1) + "/" + tools.length + "...");
            /* Prefix the tool name with mrr_<rulesetIdSnake>_; the
               author-shipped name is appended (or just an index if
               name was missing). */
            var rawName = (t.name && /^[a-z][a-z0-9_]*$/.test(t.name)) ? t.name : ("tool_" + i);
            var fullName = rulesetToolPrefix + rawName;
            if (fullName.length > 100) fullName = fullName.slice(0, 100);
            var body = {
              name: fullName,
              description: typeof t.description === "string" ? t.description.slice(0, 500) : "MRR-managed tool for " + rulesetId,
              parametersSchema: t.parametersSchema && typeof t.parametersSchema === "object" ? t.parametersSchema : {},
              executionType: t.executionType === "webhook" || t.executionType === "script" ? t.executionType : "static",
              webhookUrl: t.webhookUrl != null ? t.webhookUrl : null,
              staticResult: t.staticResult != null ? t.staticResult : null,
              scriptBody: t.scriptBody != null ? t.scriptBody : null,
              enabled: t.enabled !== false
            };
            return apiPostRaw("/custom-tools", body);
          });
        });
        return addChain;
      });
    }).then(function () {
      progress("Done. Reloading...");
      return { rulesetId: rulesetId, authorId: authorId };
    });
  });
}

/* Remove every server-side artifact this extension installed for the given
   ruleset id. The local ruleset cache is left in place — Clear handles that
   separately. Same match strategy as install: settings flags on the agent,
   tag array on the lorebook. */
/* The engine's DELETE endpoints (/agents/:id, /lorebooks/:id,
   /lorebooks/:lbId/entries/:entryId, etc.) all return 204 No Content with
   an empty body. marinara.apiFetch always calls res.json() unconditionally
   (CustomThemeInjector.tsx:109), which throws on the empty body and
   surfaces as a generic error — even though the server-side delete
   succeeded. Use raw fetch directly so we can inspect the status and
   tolerate empty responses. 2xx, 204, and 404 all count as success. */
function apiDeleteRaw(path) {
  /* No Content-Type header: the engine's Fastify config rejects requests
     with `content-type: application/json` and an empty body (400 "Body
     cannot be empty"). DELETE has no body, so omit the header entirely.
     x-marinara-csrf IS required (2.4.x CSRF hook gates unsafe methods —
     see COUPLINGS.md row 14). */
  return mrrFetch("/api" + path, { method: "DELETE", headers: { "x-marinara-csrf": "1" } }).then(function (res) {
    if (res.status === 204 || res.ok || res.status === 404) return;
    return res.text().then(function (body) {
      var err = new Error("DELETE " + path + " failed: " + res.status + " " + (body || ""));
      err.status = res.status;
      throw err;
    });
  });
}

/* POST helper that verifies res.ok before parsing JSON. marinara.apiFetch
   does NOT check status — it parses every response with res.json()
   (CustomThemeInjector.tsx:109), which means Zod validation failures
   (400 with a JSON error body) parse successfully and look like creates
   to our caller. */
function apiPostRaw(path, body) {
  return mrrFetch("/api" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-marinara-csrf": "1" },
    body: JSON.stringify(body)
  }).then(function (res) {
    if (res.ok) return res.json().catch(function () { return null; });
    return res.text().then(function (txt) {
      var err = new Error("POST " + path + " failed: " + res.status + " " + (txt || ""));
      err.status = res.status;
      throw err;
    });
  });
}

function uninstallBundleArtifacts(rulesetId, authorId, progressCb) {
  function progress(msg) { if (progressCb) progressCb(msg); }
  authorId = authorId || "local";
  return Promise.all([
    apiFetch("/lorebooks", {}),
    apiFetch("/agents", {}),
    apiFetch("/regex-scripts", {}).catch(function () { return []; }),
    apiFetch("/custom-tools", {}).catch(function () { return []; })
  ]).then(function (results) {
    var lorebooks = results[0];
    var agents = results[1];
    var regexScripts = results[2];
    var customTools = results[3];
    var lb = findManagedLorebook(lorebooks, rulesetId);
    var matches = Array.isArray(agents) ? agents.filter(function (a) {
      var s = parseAgentSettings(a);
      return s.mrrManaged === true && s.mrrRulesetId === rulesetId;
    }) : [];
    var rulesetRegexPrefix = MRR_REGEX_NAME_PFX + rulesetId + ": ";
    var regexMatches = Array.isArray(regexScripts) ? regexScripts.filter(function (s) {
      return s && typeof s.name === "string" && s.name.indexOf(rulesetRegexPrefix) === 0;
    }) : [];
    var rulesetIdSnake = String(rulesetId || "").toLowerCase().replace(/-/g, "_").replace(/[^a-z0-9_]/g, "_");
    var rulesetToolPrefix = MRR_TOOL_NAME_PFX + rulesetIdSnake + "_";
    var toolMatches = Array.isArray(customTools) ? customTools.filter(function (t) {
      return t && typeof t.name === "string" && t.name.indexOf(rulesetToolPrefix) === 0;
    }) : [];

    var jobs = [];
    if (lb) {
      progress("Removing lorebook...");
      jobs.push(apiDeleteRaw("/lorebooks/" + lb.id));
    }
    if (matches.length > 0) {
      progress("Removing " + matches.length + " managed agent(s)...");
      for (var i = 0; i < matches.length; i++) {
        jobs.push(apiDeleteRaw("/agents/" + matches[i].id));
      }
    }
    if (regexMatches.length > 0) {
      progress("Removing " + regexMatches.length + " managed regex script(s)...");
      for (var j = 0; j < regexMatches.length; j++) {
        jobs.push(apiDeleteRaw("/regex-scripts/" + regexMatches[j].id));
      }
    }
    if (toolMatches.length > 0) {
      progress("Removing " + toolMatches.length + " managed custom tool(s)...");
      for (var k = 0; k < toolMatches.length; k++) {
        jobs.push(apiDeleteRaw("/custom-tools/" + toolMatches[k].id));
      }
    }
    if (jobs.length === 0) progress("Nothing to remove.");
    return Promise.all(jobs);
  }).then(function () {
    progress("Uninstalled.");
  });
}

function getChatId() {
  /* Marinara is a single-page app; the URL doesn't change between chats.
     The active chat id lives in localStorage under "marinara-active-chat-id"
     (see packages/client/src/stores/chat.store.ts STORAGE_KEY). Read that
     directly rather than guessing from the URL. */
  var stored = lsGet("marinara-active-chat-id");
  if (stored) return stored;
  /* URL fallback in case a future Marinara version adds a router. */
  var m = window.location.pathname.match(/\/(chat|game)\/([^/?#]+)/);
  if (m) return m[2];
  return null;
}

/* Legacy chat-scoped sheet key (pre-character-library). Retained as the
   migration source — loadSheet auto-copies into characterKey() on first
   load, then never reads from here again. */
function sheetKey(chatId, characterId) {
  return LS_SHEET_PFX + chatId + "-" + characterId;
}

/* Character-library key — the post-v0.4.1 home for sheet data. Decoupled
   from chatId so the same character can be loaded into any chat. */
function characterKey(characterId) {
  return LS_CHARACTER_PFX + characterId;
}

function loadSheet(chatId, ruleset) {
  if (!state.activeCharacterId) {
    log("loadSheet -> blank: no activeCharacterId");
    return blankSheet(ruleset);
  }
  /* Try the character-library key first. */
  var key = characterKey(state.activeCharacterId);
  var raw = lsGet(key);
  if (raw) {
    var parsed = safeParse(raw);
    if (parsed) {
      log("loadSheet hydrated key=" + key + " bytes=" + raw.length);
      return mergeSheet(blankSheet(ruleset), parsed);
    }
    warn("loadSheet -> blank: parse failed for " + key);
  }
  /* Legacy fallback: chat-scoped sheet from pre-v0.4.1 sessions. Copy it
     forward to the character-library key on first hit so subsequent loads
     bypass this branch. The legacy key is left in place for safety until
     a future cleanup pass removes it. */
  if (chatId) {
    var legacyKey = sheetKey(chatId, state.activeCharacterId);
    var legacyRaw = lsGet(legacyKey);
    if (legacyRaw) {
      lsSet(key, legacyRaw);
      log("loadSheet auto-migrated " + legacyKey + " -> " + key + " bytes=" + legacyRaw.length);
      var legacyParsed = safeParse(legacyRaw);
      if (legacyParsed) return mergeSheet(blankSheet(ruleset), legacyParsed);
      warn("loadSheet: migrated bytes but parse failed for " + legacyKey);
    }
  }
  log("loadSheet -> blank: no data for " + key);
  return blankSheet(ruleset);
}

function saveSheet(chatId, sheet) {
  /* chatId arg retained for interface stability; the character-library
     key is independent of chat now. */
  if (!state.activeCharacterId) { warn("saveSheet skipped: no activeCharacterId"); return; }
  if (!sheet) { warn("saveSheet skipped: no sheet object"); return; }
  var key = characterKey(state.activeCharacterId);
  var payload = JSON.stringify(sheet);
  var ok = lsSet(key, payload);
  if (!ok) { warn("saveSheet: lsSet failed for " + key + " (quota or private mode?)"); return; }
  log("saved key=" + key + " bytes=" + payload.length);
  updateSavedIndicator();
  /* Push fresh sheet state to the chat's customTrackerFields so overlay
     agents see what the player sees on the next generation. Debounced so
     a burst of stepper clicks collapses into a single PATCH. */
  if (typeof scheduleAutoSync === "function") scheduleAutoSync();
}

function updateSavedIndicator() {
  if (!state.mountEl) return;
  var ind = state.mountEl.querySelector(".mrr-saved-indicator");
  if (!ind) return;
  var now = new Date();
  var hh = String(now.getHours()).padStart(2, "0");
  var mm = String(now.getMinutes()).padStart(2, "0");
  var ss = String(now.getSeconds()).padStart(2, "0");
  ind.textContent = "Saved " + hh + ":" + mm + ":" + ss;
}

/* Defensive: if state.sheet has data, persist before any switch. The
   stepper handlers already save on each click, but this catches any path
   that might mutate state.sheet without going through a stepper (e.g.
   bulk operations, future features). Cheap insurance.
   B1: this is also the existing chokepoint wired to visibilitychange
   (hidden), beforeunload, and pagehide (see watchLifecycleSaves ~14211+
   its own line count), so forcing the debounced background storage patch
   here covers all three flush triggers for free — no new listeners. */
function flushSave() {
  if (state.chatId && state.activeCharacterId && state.sheet) {
    saveSheet(state.chatId, state.sheet);
  }
  if (hasServerStorage) mrrFlushPendingPatch();
}

/* Generate a chat-independent character id. Used both for new characters
   and for migrating legacy bare "player" ids so the post-v0.4.1
   character-library doesn't collide across chats that all defaulted to
   the same id. */
function newCharacterId() {
  return "char-" + Date.now() + "-" + Math.random().toString(36).slice(2, 11);
}

function loadCharacters(chatId) {
  if (!chatId) return [{ id: newCharacterId(), name: "Player" }];
  var raw = lsGet("mrr-chars-" + chatId);
  if (raw) {
    var parsed = safeParse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      /* Migrate any legacy bare "player" ids to fresh uuids and copy
         the legacy chat-scoped sheet data into the new character-library
         key. Each historical chat keeps its sheet under a distinct id;
         no cross-chat collision when two chats both had id="player". */
      var migrated = false;
      parsed.forEach(function (c) {
        if (!c || c.id !== "player") return;
        var newId = newCharacterId();
        var legacyKey = sheetKey(chatId, "player");
        var legacyRaw = lsGet(legacyKey);
        if (legacyRaw) {
          lsSet(characterKey(newId), legacyRaw);
          log("migrated character: " + chatId + "/player -> " + newId + " bytes=" + legacyRaw.length);
        }
        c.id = newId;
        migrated = true;
      });
      if (migrated) {
        lsSet("mrr-chars-" + chatId, JSON.stringify(parsed));
        /* Fix the active-char pointer too if it was the legacy "player". */
        var activePtr = lsGet("mrr-active-char-" + chatId);
        if (activePtr === "player" && parsed[0]) {
          lsSet("mrr-active-char-" + chatId, parsed[0].id);
        }
      }
      return parsed;
    }
  }
  /* No mrr-chars-<chatId> in localStorage → first-time character bootstrap.
     PRIOR BUG: a fresh array was returned WITHOUT persisting it, so the
     next refresh generated a DIFFERENT random ID and lookups missed the
     previously-saved sheet (every refresh produced a new orphaned save
     keyed to a new character ID). Now: persist the fresh array AND the
     active-char pointer immediately so subsequent refreshes find stable
     IDs and hydrate properly. Affects EVERY ruleset, not just V20. */
  var fresh = [{ id: newCharacterId(), name: "Player" }];
  lsSet("mrr-chars-" + chatId, JSON.stringify(fresh));
  lsSet("mrr-active-char-" + chatId, fresh[0].id);
  log("bootstrapped fresh character " + fresh[0].id + " for chat " + chatId + " (persisted to localStorage immediately)");
  return fresh;
}

function saveCharacters() {
  if (!state.chatId) return;
  lsSet("mrr-chars-" + state.chatId, JSON.stringify(state.characters));
}

function loadActiveCharacterId(chatId, fallback) {
  if (!chatId) return fallback;
  return lsGet("mrr-active-char-" + chatId) || fallback;
}

function saveActiveCharacterId() {
  if (!state.chatId || !state.activeCharacterId) return;
  lsSet("mrr-active-char-" + state.chatId, state.activeCharacterId);
}

function migrateLegacySheet(chatId) {
  /* One-time migration: pre-character sheet key "mrr-sheet-{chatId}" becomes
     "mrr-sheet-{chatId}-player" so legacy data survives the per-character split. */
  if (!chatId) return;
  var oldKey = LS_SHEET_PFX + chatId;
  var newKey = LS_SHEET_PFX + chatId + "-player";
  var oldData = lsGet(oldKey);
  if (oldData && !lsGet(newKey)) {
    lsSet(newKey, oldData);
    lsDel(oldKey);
  }
}

function slugify(name) {
  var s = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || ("char-" + Date.now());
}

/* ─────  portable character bundle (chatId-independent save/load)  ───── */

/* Shape of an exported bundle:
   { schema: "mrr-character-bundle", version: 1,
     savedAt: ISO8601, ruleset: { id, version },
     activeCharacterId: "...",
     characters: [{ id, name }, ...],
     sheets: { "<characterId>": { attributes, skills, ... }, ... } } */

function collectBundle() {
  flushSave();
  var sheets = {};
  state.characters.forEach(function (c) {
    /* v0.2.1 migrated sheet storage from the chat-scoped sheetKey
       (chatId, charId) to the chat-independent characterKey(charId).
       saveSheet writes to characterKey; loadSheet reads characterKey
       first and auto-migrates any remaining legacy chat-scoped data.
       collectBundle was missed in that migration — it kept reading
       the legacy chat-scoped key, which is empty for any character
       whose sheet has been touched since v0.2.1. Result: exported
       bundles silently shipped with sheets: {} for every character.
       Try the modern key first; fall back to the legacy chat-scoped
       key so a user with one unmigrated character (never loaded
       since v0.2.1) still exports cleanly. */
    var raw = lsGet(characterKey(c.id));
    if (!raw && state.chatId) raw = lsGet(sheetKey(state.chatId, c.id));
    if (raw) {
      var parsed = safeParse(raw);
      if (parsed) sheets[c.id] = parsed;
    }
  });
  return {
    schema: BUNDLE_SCHEMA,
    version: BUNDLE_VERSION,
    savedAt: new Date().toISOString(),
    ruleset: { id: state.ruleset.id, version: state.ruleset.version },
    activeCharacterId: state.activeCharacterId,
    characters: state.characters.map(function (c) { return { id: c.id, name: c.name }; }),
    sheets: sheets
  };
}

function validateBundle(b) {
  if (!b || typeof b !== "object") return "bundle is not an object";
  if (BUNDLE_SCHEMA_ACCEPT.indexOf(b.schema) === -1) return "schema mismatch: expected \"" + BUNDLE_SCHEMA + "\" (legacy \"mrrp-character-bundle\" also accepted)";
  if (typeof b.version !== "number") return "missing version";
  if (b.version > BUNDLE_VERSION) return "bundle version " + b.version + " is newer than this extension supports";
  if (!b.ruleset || !b.ruleset.id) return "missing ruleset.id";
  if (!Array.isArray(b.characters) || !b.characters.length) return "characters must be a non-empty array";
  if (!b.sheets || typeof b.sheets !== "object") return "sheets must be an object";
  for (var i = 0; i < b.characters.length; i++) {
    var c = b.characters[i];
    if (!c || !c.id || !c.name) return "character " + i + " missing id or name";
  }
  return null;
}

function applyBundle(b) {
  if (!state.chatId) { window.alert("No active chat. Open a chat in Marinara first, then import."); return false; }
  var err = validateBundle(b);
  if (err) { window.alert("Import failed: " + err); return false; }
  if (b.ruleset.id !== state.ruleset.id) {
    window.alert("Import failed: bundle was saved for ruleset \"" + b.ruleset.id +
                 "\" but the active ruleset is \"" + state.ruleset.id +
                 "\". Switch ruleset first, then import again.");
    return false;
  }

  /* Wipe existing per-character sheets (overwrite mode) so characters
     present in the prior state but absent from the bundle don't linger
     in localStorage. Symmetrically clear both the modern character-
     library key (post-v0.2.1) and the legacy chat-scoped key, in case
     a never-loaded legacy entry would otherwise resurface on next
     loadSheet via its auto-migration fallback. */
  state.characters.forEach(function (c) {
    lsDel(characterKey(c.id));
    if (state.chatId) lsDel(sheetKey(state.chatId, c.id));
  });

  /* Write the bundle into the modern character-library localStorage key.
     v0.2.1 made sheet storage chatId-independent so the same character
     can move between chats; writing to characterKey is what saveSheet /
     loadSheet operate on. (Previously written to the legacy chat-scoped
     key, which loadSheet would never find unless the legacy fallback
     kicked in — most users saw "Import succeeded" then a blank sheet.) */
  state.characters = b.characters.map(function (c) { return { id: c.id, name: c.name }; });
  saveCharacters();

  /* Iterate the bundle's character list (not Object.keys(sheets)) so a
     character without a stored sheet still gets a valid blank entry on
     next load and we avoid an O(n*m) lookup. */
  b.characters.forEach(function (c) {
    var sheet = b.sheets && b.sheets[c.id];
    if (sheet) lsSet(characterKey(c.id), JSON.stringify(sheet));
  });

  var nextActive = b.activeCharacterId;
  if (!nextActive || !state.characters.some(function (c) { return c.id === nextActive; })) {
    nextActive = state.characters[0].id;
  }
  state.activeCharacterId = nextActive;
  saveActiveCharacterId();

  state.sheet = loadSheet(state.chatId, state.ruleset);
  renderSheet();
  log("imported bundle: " + state.characters.length + " character(s), active=" + state.activeCharacterId);
  return true;
}

/* D3 raw migration: import character sheets directly from the installed,
   retired RP-mode (mrrp-) extension's localStorage. Pre-fix mrrp exports
   shipped empty sheets:{} (the same characterKey bug fixed in this repo),
   so a bundle round-trip can't always recover them — we read the raw mrrp-
   keys. READ-ONLY on mrrp- keys; everything written uses the mrr- namespace. */
function importFromRpExtension() {
  if (!state.chatId) { window.alert("No active chat. Open a chat in Marinara first, then import."); return false; }
  if (!state.ruleset || !state.ruleset.id) { window.alert("Select a ruleset first, then import."); return false; }

  /* Optional ruleset guard: the RP extension stored its active ruleset at
     mrrp-active-ruleset. If it names a different ruleset, warn but allow —
     a mismatch only means some fields won't render. */
  var rpRulesetRaw = lsGet(RP_LEGACY_ACTIVE_RULESET);
  if (rpRulesetRaw) {
    var rpRs = safeParse(rpRulesetRaw);
    var rpId = rpRs && (rpRs.id || (rpRs.ruleset && rpRs.ruleset.id));
    if (rpId && rpId !== state.ruleset.id) {
      var go = window.confirm("The RP-mode extension's active ruleset was \"" + rpId +
        "\" but the current ruleset is \"" + state.ruleset.id +
        "\". Import anyway? Sheet fields that don't match this ruleset may not display.");
      if (!go) return false;
    }
  }

  /* Collect names from any mrrp-chars-<chatId> rosters and sheets from
     mrrp-character-<id> keys. Scan the whole keyspace — we don't know the
     RP extension's chat ids. B1: routed through the shared
     forEachLocalStorageKey scanner (see the adapter block ~line 273) so
     this READ side stays on physical localStorage exactly as before,
     without adding a second raw scan of its own. */
  var names = Object.create(null);
  var sheets = Object.create(null);
  forEachLocalStorageKey(RP_LEGACY_CHARS_PFX, function (key) {
    var roster = safeParse(lsGet(key));
    if (Array.isArray(roster)) roster.forEach(function (c) { if (c && c.id) names[c.id] = c.name || names[c.id]; });
  });
  forEachLocalStorageKey(RP_LEGACY_CHARACTER_PFX, function (key) {
    var id = key.slice(RP_LEGACY_CHARACTER_PFX.length);
    var sheet = safeParse(lsGet(key));
    if (id && sheet) sheets[id] = sheet;
  });

  var ids = Object.keys(sheets);
  if (!ids.length) { window.alert("No RP-mode (mrrp-) character sheets found in this browser's storage."); return false; }

  /* Merge additively into the current chat's MRR roster (don't wipe existing
     mrr- characters). Each sheet is written to the modern mrr- characterKey.
     NO-CLOBBER: if an mrr-character-<id> sheet already exists (same character
     id already in this browser), skip it rather than overwrite — a re-run or
     an id collision must never destroy an existing mrr sheet. */
  var existing = Object.create(null);
  state.characters.forEach(function (c) { existing[c.id] = true; });
  var imported = 0, skipped = 0;
  ids.forEach(function (cid) {
    if (lsGet(characterKey(cid))) { skipped++; return; }  /* preserve existing mrr sheet */
    var nm = names[cid] || (sheets[cid] && (sheets[cid].name || sheets[cid].characterName)) || ("Imported " + cid.slice(0, 8));
    if (!existing[cid]) { state.characters.push({ id: cid, name: nm }); existing[cid] = true; }
    lsSet(characterKey(cid), JSON.stringify(sheets[cid]));  /* mrr-character-<id>, never mrrp- */
    imported++;
  });
  if (imported) saveCharacters();
  if (!state.activeCharacterId || !state.characters.some(function (c) { return c.id === state.activeCharacterId; })) {
    if (state.characters.length) { state.activeCharacterId = state.characters[0].id; saveActiveCharacterId(); }
  }
  state.sheet = loadSheet(state.chatId, state.ruleset);
  renderSheet();
  var summary = "Imported " + imported + " character sheet(s) from the RP-mode extension" + (skipped ? " (" + skipped + " skipped — already present)" : "") + ".";
  log(summary);
  window.alert(summary);
  return true;
}

/* List every agent the extension previously installed, grouped by
   mrrRulesetId. Used by both the cleanup-tool dialog and the agent-import
   flow's delete-then-replace pass. */
function listManagedAgentsByRuleset() {
  return apiFetch("/agents").then(function (agents) {
    var groups = {};
    if (!Array.isArray(agents)) return groups;
    agents.forEach(function (a) {
      var s = parseAgentSettings(a);
      if (s.mrrManaged !== true) return;
      var rid = s.mrrRulesetId || "(unknown)";
      if (!groups[rid]) groups[rid] = [];
      groups[rid].push({
        id: a.id,
        name: a.name,
        role: s.mrrAgentRole || null,
        authorId: s.mrrAuthorId || null,
        enabled: a.enabled === true || a.enabled === "true"
      });
    });
    return groups;
  });
}

function deleteManagedAgents(ids, progressCb) {
  function progress(msg) { if (progressCb) progressCb(msg); }
  if (!Array.isArray(ids) || !ids.length) return Promise.resolve(0);
  progress("Deleting " + ids.length + " agent(s)...");
  return ids.reduce(function (chain, id) {
    return chain.then(function () { return apiDeleteRaw("/agents/" + id); });
  }, Promise.resolve()).then(function () { return ids.length; });
}

function openAgentManagerDialog() {
  if (state.agentMgrDialogEl && state.agentMgrDialogEl.parentNode) {
    state.agentMgrDialogEl.parentNode.removeChild(state.agentMgrDialogEl);
    state.agentMgrDialogEl = null;
  }
  var backdrop = marinara.addElement(document.body, "div", { "class": "mrr-dialog-backdrop mrr-dialog-backdrop--open" });
  if (!backdrop) return;
  state.agentMgrDialogEl = backdrop;
  var dialog = marinara.addElement(backdrop, "div", { "class": "mrr-dialog" });
  if (!dialog) { document.body.removeChild(backdrop); state.agentMgrDialogEl = null; return; }

  marinara.addElement(dialog, "h3", { textContent: "Manage MRR Agents" });
  marinara.addElement(dialog, "p", {
    textContent: "Every agent the extension created is listed below, grouped by ruleset. Use this to clean up duplicate agents accumulated from prior installs."
  });
  var msg = marinara.addElement(dialog, "div", { "class": "mrr-msg mrr-msg--info", textContent: "Loading..." });
  var list = marinara.addElement(dialog, "div", { "class": "mrr-dialog__lib" });
  var buttons = marinara.addElement(dialog, "div", { "class": "mrr-dialog__buttons" });
  var refreshBtn = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Refresh" });
  var closeBtn = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn", textContent: "Close" });

  function close() {
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    if (state.agentMgrDialogEl === backdrop) state.agentMgrDialogEl = null;
  }
  marinara.on(backdrop, "click", function (e) { if (e.target === backdrop) close(); });
  if (closeBtn) marinara.on(closeBtn, "click", close);

  function refresh() {
    if (msg) { msg.textContent = "Loading..."; msg.className = "mrr-msg mrr-msg--info"; }
    if (list) list.textContent = "";
    listManagedAgentsByRuleset().then(function (groups) {
      var rids = Object.keys(groups).sort();
      if (!rids.length) {
        if (msg) { msg.textContent = "No managed agents found. You're clean."; msg.className = "mrr-msg mrr-msg--ok"; }
        return;
      }
      if (msg) { msg.textContent = rids.length + " ruleset group(s) found."; msg.className = "mrr-msg mrr-msg--info"; }
      rids.forEach(function (rid) {
        var members = groups[rid];
        var row = marinara.addElement(list, "div", { "class": "mrr-dialog__lib-row" });
        if (!row) return;
        var label = rid + " — " + members.length + " agent" + (members.length === 1 ? "" : "s");
        marinara.addElement(row, "span", { "class": "mrr-dialog__lib-name", textContent: label });
        var detailBtn = marinara.addElement(row, "button", { "class": "mrr-char-btn", type: "button", textContent: "Show" });
        var delBtn = marinara.addElement(row, "button", { "class": "mrr-char-btn mrr-char-btn--danger", type: "button", textContent: "Delete all" });

        if (detailBtn) marinara.on(detailBtn, "click", function () {
          var lines = members.map(function (m) {
            var roleLabel = m.role ? "[" + m.role + "]" : "[main]";
            var statusLabel = m.enabled ? " (enabled)" : " (disabled)";
            return roleLabel + " " + (m.name || "(unnamed)") + statusLabel + "  id=" + m.id;
          });
          window.alert(rid + ":\n\n" + lines.join("\n"));
        });

        if (delBtn) marinara.on(delBtn, "click", function () {
          if (!window.confirm("Delete ALL " + members.length + " agent(s) under \"" + rid + "\"?\n\nThis cannot be undone. The local ruleset cache is NOT affected.")) return;
          delBtn.disabled = true;
          if (msg) { msg.textContent = "Deleting " + rid + "..."; msg.className = "mrr-msg mrr-msg--info"; }
          var ids = members.map(function (m) { return m.id; });
          deleteManagedAgents(ids, function (s) { if (msg) msg.textContent = s; })
            .then(function (n) {
              if (msg) { msg.textContent = "Deleted " + n + " agent(s) under " + rid + "."; msg.className = "mrr-msg mrr-msg--ok"; }
              refresh();
            })
            .catch(function (e) {
              if (msg) { msg.textContent = "Delete failed: " + (e && e.message || e); msg.className = "mrr-msg mrr-msg--err"; }
              delBtn.disabled = false;
            });
        });
      });
    }).catch(function (e) {
      if (msg) { msg.textContent = "Load failed: " + (e && e.message || e); msg.className = "mrr-msg mrr-msg--err"; }
    });
  }

  if (refreshBtn) marinara.on(refreshBtn, "click", refresh);
  refresh();
}

/* ─────  agent import  ────────────────────────────────────────────────────
   Decoupled agents.json import — separate from the bundle install path.
   The agent file format is { schema: "mrr-agents", version: 1,
   rulesetId, rulesetName?, authorId?, agents: [{role, name, ...}, ...] }.
   Import is delete-then-replace: existing managed agents tagged with the
   same rulesetId are deleted before the new agents are POSTed. This
   prevents the duplicate-accumulation pattern that motivated the
   decoupling. We WRITE only the mrr-agents schema, but READ tolerates the
   legacy mrrp-agents id so files exported from the retired RP-mode
   extension still import cleanly. */

var MRR_AGENTS_SCHEMA_ID = "mrr-agents";

function validateAgentImport(b) {
  var errs = [];
  function need(o, p, k, t) {
    if (!o || typeof o !== "object") return;
    var v = o[k];
    var actual = Array.isArray(v) ? "array" : typeof v;
    if (t === "array" && !Array.isArray(v)) errs.push({ path: p + "." + k, expected: t, got: actual });
    else if (t !== "array" && typeof v !== t) errs.push({ path: p + "." + k, expected: t, got: actual });
  }
  if (!b || typeof b !== "object") { errs.push({ path: "(root)", expected: "object", got: typeof b }); return errs; }
  var AGENTS_SCHEMA_ACCEPT = ["mrr-agents", "mrrp-agents"];
  if (AGENTS_SCHEMA_ACCEPT.indexOf(b.schema) === -1) errs.push({ path: "schema", expected: '"' + MRR_AGENTS_SCHEMA_ID + '" (legacy "mrrp-agents" also accepted)', got: JSON.stringify(b.schema) });
  if (b.version !== 1) errs.push({ path: "version", expected: 1, got: b.version });
  need(b, "(root)", "rulesetId", "string");
  need(b, "(root)", "agents", "array");
  if (Array.isArray(b.agents)) {
    if (!b.agents.length) errs.push({ path: "agents", expected: "non-empty array", got: "0 entries" });
    b.agents.forEach(function (ag, i) {
      var p = "agents[" + i + "]";
      need(ag, p, "role", "string");
      need(ag, p, "name", "string");
      need(ag, p, "promptTemplate", "string");
      if (typeof ag.promptTemplate === "string" && ag.promptTemplate.length < 50) {
        errs.push({ path: p + ".promptTemplate", expected: "at least 50 characters", got: ag.promptTemplate.length + " chars" });
      }
    });
  }
  return errs;
}

function importAgents(payload, progressCb) {
  function progress(m) { if (progressCb) progressCb(m); }
  return Promise.resolve().then(function () {
    var errs = validateAgentImport(payload);
    if (errs.length) {
      var lines = ["Agent import failed. " + errs.length + " issue(s):\n"];
      errs.forEach(function (e) { lines.push("• " + e.path + ": expected " + e.expected + ", got " + e.got); });
      throw new Error(lines.join("\n"));
    }
    var rulesetId = payload.rulesetId;
    var authorId  = payload.authorId || "local";

    progress("Loading existing agents...");
    return Promise.all([
      apiFetch("/agents"),
      apiFetch("/connections")
    ]).then(function (results) {
      var agents = results[0];
      var connections = results[1];
      /* pickDefaultConnection() ignores its argument and returns a Promise
         (it fetches /connections itself). Inline the actual selection
         against the list we already fetched, returning a string id (or
         null) so the agent body's connectionId field passes Zod's
         z.string().nullable() check. */
      var connectionId = (Array.isArray(connections) && connections.length === 1 && connections[0] && connections[0].id)
        ? connections[0].id
        : null;

      var existing = (Array.isArray(agents) ? agents : []).filter(function (a) {
        var s = parseAgentSettings(a);
        return s.mrrManaged === true && s.mrrRulesetId === rulesetId;
      });
      var existingIds = existing.map(function (a) { return a.id; });

      var deletePhase = existingIds.length
        ? (progress("Deleting " + existingIds.length + " existing agent(s)..."), deleteManagedAgents(existingIds, progressCb))
        : Promise.resolve(0);

      return deletePhase.then(function () {
        progress("Creating " + payload.agents.length + " agent(s)...");
        var created = 0;
        return payload.agents.reduce(function (chain, ag) {
          return chain.then(function () {
            var role = ag.role;
            var prefix = MRR_PROMPT_PFX + authorId + "/" + rulesetId + (role && role !== "main" ? ":" + role : "") + "]";
            var promptTemplate = prefix + " " + (ag.promptTemplate || "");
            var body = {
              type: MRR_AGENT_TYPE,
              name: "MRR: " + (ag.name || rulesetId + " " + role),
              description: ag.description || "",
              phase: ag.phase || "pre_generation",
              enabled: ag.enabled === true,
              connectionId: connectionId,
              promptTemplate: promptTemplate,
              settings: Object.assign({}, ag.settings || {}, {
                mrrManaged: true,
                mrrBundleSchema: MRR_AGENTS_SCHEMA_ID,
                mrrRulesetId: rulesetId,
                mrrAuthorId: authorId,
                mrrAgentRole: role
              })
            };
            return apiPostRaw("/agents", body).then(function () { created++; });
          });
        }, Promise.resolve()).then(function () {
          return { deleted: existingIds.length, created: created, rulesetId: rulesetId };
        });
      });
    });
  });
}

function openAgentImportDialog() {
  if (state.agentImportDialogEl && state.agentImportDialogEl.parentNode) {
    state.agentImportDialogEl.parentNode.removeChild(state.agentImportDialogEl);
    state.agentImportDialogEl = null;
  }
  var backdrop = marinara.addElement(document.body, "div", { "class": "mrr-dialog-backdrop mrr-dialog-backdrop--open" });
  if (!backdrop) return;
  state.agentImportDialogEl = backdrop;
  var dialog = marinara.addElement(backdrop, "div", { "class": "mrr-dialog" });
  if (!dialog) { document.body.removeChild(backdrop); state.agentImportDialogEl = null; return; }

  marinara.addElement(dialog, "h3", { textContent: "Import Agents" });
  marinara.addElement(dialog, "p", {
    textContent: "Paste an mrr-agents JSON or import a file. Existing agents tagged with the same rulesetId will be DELETED and replaced — no duplicates."
  });

  var ta = marinara.addElement(dialog, "textarea", {
    placeholder: "Paste agents.json content here, or use Import file."
  });

  var msg = marinara.addElement(dialog, "div", { "class": "mrr-msg mrr-msg--info mrr-msg--hidden" });

  var buttons = marinara.addElement(dialog, "div", { "class": "mrr-dialog__buttons" });
  var fileBtn   = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", type: "button", textContent: "Import file..." });
  var cancelBtn = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", type: "button", textContent: "Cancel" });
  var applyBtn  = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn", type: "button", textContent: "Apply (replace agents)" });

  var fileInput = marinara.addElement(dialog, "input", { type: "file", accept: ".json,application/json" });
  if (fileInput) fileInput.style.display = "none";

  function setMsg(text, kind) {
    if (!msg) return;
    msg.classList.remove("mrr-msg--hidden", "mrr-msg--ok", "mrr-msg--err", "mrr-msg--info");
    msg.classList.add("mrr-msg--" + (kind || "info"));
    msg.textContent = text;
  }

  function close() {
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    if (state.agentImportDialogEl === backdrop) state.agentImportDialogEl = null;
  }
  marinara.on(backdrop, "click", function (e) { if (e.target === backdrop) close(); });
  if (cancelBtn) marinara.on(cancelBtn, "click", close);

  if (fileBtn) marinara.on(fileBtn, "click", function () { if (fileInput) fileInput.click(); });
  if (fileInput) marinara.on(fileInput, "change", function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      ta.value = String(reader.result || "");
      setMsg("Loaded " + f.name + " — click Apply to import.", "ok");
    };
    reader.onerror = function () { setMsg("File read failed.", "err"); };
    reader.readAsText(f);
  });

  if (applyBtn) marinara.on(applyBtn, "click", function () {
    var text = (ta && ta.value || "").trim();
    if (!text) { setMsg("Paste agents.json or import a file first.", "err"); return; }
    var parsed;
    try { parsed = JSON.parse(text); }
    catch (e) { setMsg("Invalid JSON: " + e.message, "err"); return; }
    if (!window.confirm("Replace agents for ruleset \"" + (parsed && parsed.rulesetId) + "\"?\n\nExisting matching agents will be DELETED and recreated from this import.")) return;
    applyBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    setMsg("Importing...", "info");
    importAgents(parsed, function (s) { setMsg(s, "info"); })
      .then(function (r) {
        setMsg("Done. " + r.deleted + " deleted, " + r.created + " created under " + r.rulesetId + ".", "ok");
        applyBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
      })
      .catch(function (e) {
        setMsg(e && e.message ? e.message : String(e), "err");
        applyBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
      });
  });
}

function bundleFilename() {
  var d = new Date();
  var stamp = d.getFullYear() +
              String(d.getMonth() + 1).padStart(2, "0") +
              String(d.getDate()).padStart(2, "0");
  return "mrr-" + state.ruleset.id + "-" + stamp + ".json";
}

function triggerDownload(filename, jsonString) {
  var blob = new Blob([jsonString], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  /* Defer revoke a tick so the browser has time to start the download —
     same-task revocation cancels the download in some browsers. */
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function triggerUpload(onText) {
  /* Detached input: clicking a file input that is not in the DOM still
     opens the picker in all current browsers, and the closure keeps it
     alive until the user picks (or cancels and GC reclaims it). Avoiding
     append/removeChild prevents the race where the input is removed
     before the async change event fires. */
  var input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", function () {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () { onText(String(reader.result || "")); };
    reader.onerror = function () {
      var msg = reader.error ? reader.error.message : "unknown error";
      window.alert("Could not read file: " + msg);
    };
    reader.readAsText(file);
  });
  input.click();
}

function exportBundle() {
  if (!state.ruleset || !state.chatId) { window.alert("Activate a ruleset and open a chat first."); return; }
  var bundle = collectBundle();
  triggerDownload(bundleFilename(), JSON.stringify(bundle, null, 2));
}

function importBundle() {
  if (!state.ruleset) { window.alert("Activate a ruleset first."); return; }
  triggerUpload(function (text) {
    var parsed = safeParse(text);
    if (!parsed) { window.alert("Import failed: file is not valid JSON."); return; }
    applyBundle(parsed);
  });
}

function switchCharacter(id) {
  if (!id) return;
  log("switchCharacter " + state.activeCharacterId + " -> " + id);
  /* Persist current character's sheet BEFORE moving the activeCharacterId
     pointer — saveSheet derives its key from state.activeCharacterId, so
     the order matters. */
  flushSave();
  state.activeCharacterId = id;
  saveActiveCharacterId();
  state.sheet = loadSheet(state.chatId, state.ruleset);
  renderSheet();
}

function addCharacter() {
  var name = (window.prompt("New character name:") || "").trim();
  if (!name) return;
  var id = slugify(name);
  if (state.characters.some(function (c) { return c.id === id; })) id = id + "-" + Date.now();
  state.characters.push({ id: id, name: name });
  saveCharacters();
  switchCharacter(id);
}

function renameActiveCharacter() {
  var current = state.characters.find(function (c) { return c.id === state.activeCharacterId; });
  if (!current) return;
  var newName = (window.prompt("Rename character:", current.name) || "").trim();
  if (!newName || newName === current.name) return;
  current.name = newName;
  saveCharacters();
  renderSheet();
}

function removeActiveCharacter() {
  if (state.characters.length <= 1) {
    window.alert("Cannot remove the last character. Add another first, then remove this one.");
    return;
  }
  var current = state.characters.find(function (c) { return c.id === state.activeCharacterId; });
  if (!current) return;
  if (!window.confirm("Remove " + current.name + "? Their sheet will be deleted.")) return;
  /* Best-effort lorebook cleanup before deleting the sheet. We re-load the
     departing character's sheet (state.sheet may be a different one if
     they're the active char today this is fine; but the deletion target
     could also be a different character — re-load to be safe) and DELETE
     each ability's lorebook entry. Failures are swallowed; orphan entries
     in the spellbook lorebook are recoverable through the native UI. */
  try {
    /* P0-4: sheets live at characterKey(id) since v0.2.1; the legacy
       sheetKey(chatId,id) home is read only as a fallback for un-migrated
       saves. Reading the wrong key silently skipped ability-lorebook
       cleanup and orphaned the real sheet in localStorage. */
    var raw = lsGet(characterKey(current.id)) || lsGet(sheetKey(state.chatId, current.id));
    if (raw) {
      var saved = JSON.parse(raw);
      if (saved && saved.abilities && typeof saved.abilities === "object") {
        Object.keys(saved.abilities).forEach(function (catId) {
          var arr = saved.abilities[catId];
          if (!Array.isArray(arr)) return;
          arr.forEach(function (ab) {
            if (ab && ab.lorebookEntryId) deleteAbilityLorebookEntry(ab).catch(function () {});
          });
        });
      }
    }
  } catch (e) { /* malformed save — skip cleanup but proceed with delete */ }
  /* P0-4: delete BOTH the real (characterKey) and legacy (sheetKey) homes so
     the sheet can't survive removal and resurrect for a future same-id char. */
  lsDel(characterKey(current.id));
  lsDel(sheetKey(state.chatId, current.id));
  state.characters = state.characters.filter(function (c) { return c.id !== current.id; });
  saveCharacters();
  switchCharacter(state.characters[0].id);
}

function blankSheet(rs) {
  var s = {
    attributes: {}, skills: {}, derived: {}, states: {},
    track: {}, extraTrack: {},
    /* Plan B v1 resources cluster state. Resources with `stateName`
       persist via state.sheet.derived[stateName] for legacy state-mutator
       compat; this map stores resources without a legacy counterpart. */
    resources: {},
    inventory: [],
    equipped: {},
    skillProficiency: {},
    skillSpecialties: {},
    backgrounds: [],
    abilities: {},
    abilityCollapse: {},
    /* Intimacies — Exalted's narrative-driven tie/principle list. Stored as
       array of { id, kind: "tie"|"principle", text, degree: "minor"|"major"|"defining", target }.
       Collapse map mirrors abilityCollapse: per-degree boolean, default true (collapsed). */
    intimacies: [],
    intimacyCollapse: {},
    identity: { race: "", "class": "" },
    customSkills: [],
    /* User-entered max for derived bar stats whose ruleset declares no
       static `max` and no `maxFormula`. Persists separately so taking
       the bar to zero doesn't lose the high-water mark — without this
       D&D HP showed "0 / 10" after damage instead of "0 / 15". */
    derivedMax: {},
    /* Experience progression. The XP card chooses its layout from
       ruleset.resolution.mode: "single-roll" rulesets (D&D, PF2e) show
       level + current + next + progress bar driven by ruleset.xpTable;
       "dice-pool" rulesets (Exalted) show current + total earned + a
       +1 button that increments both. Shape is one struct with all
       fields present; consumers read what their layout needs and the
       other half is harmless dead data. */
    xp: { current: 0, level: 1, next: 0, total: 0 },
    /* Cached commitment counters, kept in sync with inventory item
       toggles. Read by the item editor for cap enforcement (D&D
       attuned ≤ 3, PF2e invested ≤ 10) and surfaced in the snapshot
       so GM agents can see the budget at a glance. */
    attunedCount: 0,
    investedCount: 0,
    /* Phase 5 step 5.5 — density toggle. Per-character UI density preset
       written by the actions-row toggle, read on sheet render to set
       data-density on .mrr-sheet. CSS branches the --mrr-density-*
       variables. One of "compact" | "cozy" | "roomy"; default cozy
       matches the prototype TWEAK_DEFAULTS.density. */
    density: "cozy"
  };
  rs.attributes.forEach(function (a) { s.attributes[a.name] = (a["default"] != null ? a["default"] : a.min); });
  rs.skills.forEach(function (k) { s.skills[k.name] = (k["default"] != null ? k["default"] : (k.min != null ? k.min : 0)); });
  if (Array.isArray(rs.derivedStats)) {
    rs.derivedStats.forEach(function (d) {
      if (d.renderAs === "track") {
        s.track[d.name] = 0;
        s.extraTrack[d.name] = [];
      } else {
        s.derived[d.name] = (typeof d["default"] === "number") ? d["default"] : 0;
      }
    });
  }
  /* Phase 6 — seed state.sheet.derived for stateName-bound resources.
     Resources that moved out of derivedStats[] in Phase 6 (Exalted's
     Essence) still persist via state.sheet.derived[stateName] to share
     the same legacy state-mutator store the LLM writes to. mergeSheet's
     `derived` whitelist (`name in base[k]`) only copies keys that exist
     in the blank sheet — without this seed, saved Essence (and any other
     stateName-bound resource not declared in derivedStats) gets dropped
     on every reload, which then cascades into the motes' max formulas
     reading Essence=0 and clamping the persisted mote totals down. */
  if (Array.isArray(rs.resources)) {
    rs.resources.forEach(function (r) {
      if (!r || typeof r.stateName !== "string" || !r.stateName) return;
      if (r.stateName in s.derived) return;
      if (typeof r.current === "number") {
        s.derived[r.stateName] = r.current;
      } else {
        s.derived[r.stateName] = 0;
      }
    });
  }
  if (Array.isArray(rs.states)) {
    rs.states.forEach(function (st) { s.states[st.name] = (st.values && st.values[0] && st.values[0].label) || ""; });
  }
  return s;
}

/* Normalize an inventory item to the full v0.4.x dialog shape.
   Mutates and returns the input. Used by mergeSheet (load-time heal of
   legacy / state-mutator-added items that lack dialog fields) and by
   applyStateMutation (so a newly-added or quantity-bumped item is
   safe to open in the Edit dialog without throwing on undefined
   bonuses / damage / category). Idempotent — re-running on an
   already-normalized item is a no-op. */
/* Apply optional inventory-tag attributes to an item. The state-mutator
   parser extracts every `key="value"` pair from the tag, so the agent
   can enrich an inventory.add with the full dialog field set. Snake-case
   keys are LLM-friendly (`attack_attr` reads better in a tag than
   `attackAttribute`). Empty strings are ignored — the agent OMITS a
   field to leave it alone, sends it explicitly to set it. Booleans
   only land on truthy values; once true, can't be unset via tag (use
   the dialog). Category accepts only the two valid values. */
function applyItemAttrs(it, attrs) {
  if (!it || !attrs) return it;
  if (typeof attrs.slot === "string" && attrs.slot) it.slot = attrs.slot;
  if (typeof attrs.damage === "string" && attrs.damage) it.damage = attrs.damage;
  if (typeof attrs.attack_attr === "string" && attrs.attack_attr) it.attackAttribute = attrs.attack_attr;
  if (attrs.attack_proficient === "true" || attrs.attack_proficient === true) it.attackProficient = true;
  if (typeof attrs.use_effect === "string" && attrs.use_effect) it.useEffect = attrs.use_effect;
  if (attrs.consumable === "true" || attrs.consumable === true) it.consumable = true;
  if (typeof attrs.notes === "string" && attrs.notes) it.notes = attrs.notes;
  if (attrs.category === "equipment" || attrs.category === "item") it.category = attrs.category;
  /* Hardness / Overwhelming (Exalted-driven, ruleset-agnostic data shape).
     Hardness gates Overwhelming: when an attack's post-soak raw damage is
     less than the defender's Hardness, the damage is reduced to the
     attacker's Overwhelming value. Both are non-negative integers; a 0
     value means "no special handling" and is hidden in the UI. */
  if (attrs.hardness != null) {
    var h = parseInt(attrs.hardness, 10);
    if (!isNaN(h) && h >= 0) it.hardness = h;
  }
  if (attrs.overwhelming != null) {
    var o = parseInt(attrs.overwhelming, 10);
    if (!isNaN(o) && o >= 0) it.overwhelming = o;
  }
  return it;
}

function normalizeInventoryItem(it, idx) {
  if (!it || typeof it !== "object") return it;
  if (typeof it.name !== "string") it.name = "";
  if (typeof it.id !== "string" || !it.id) {
    /* Deterministic id for healed items so re-merging the same
       localStorage payload produces stable ids across reloads —
       keeps state.sheet.equipped[slot] references valid even if the
       user reloads before the next user-initiated saveSheet fires. */
    var slug = (it.name || "unnamed").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    it.id = "item-heal-" + (slug || "x") + "-" + (typeof idx === "number" ? idx : 0);
  }
  if (it.category !== "equipment" && it.category !== "item") {
    it.category = it.slot ? "equipment" : "item";
  }
  if (typeof it.slot !== "string") it.slot = "";
  if (typeof it.damage !== "string") it.damage = "";
  if (typeof it.attackAttribute !== "string") it.attackAttribute = "";
  if (typeof it.attackProficient !== "boolean") it.attackProficient = false;
  if (!Array.isArray(it.bonuses)) it.bonuses = [];
  if (typeof it.useEffect !== "string") it.useEffect = "";
  if (typeof it.consumable !== "boolean") it.consumable = false;
  if (typeof it.notes !== "string") it.notes = "";
  /* Hardness / Overwhelming default to 0 (= "not applicable / hidden in UI").
     Coerce numeric strings ("3") to numbers; reject NaN, infinity, and
     negative values. Both are integers — fractional Hardness/Overwhelming
     has no canon meaning. */
  if (typeof it.hardness === "string" && it.hardness) {
    var ph = parseInt(it.hardness, 10);
    it.hardness = (!isNaN(ph) && ph >= 0) ? ph : 0;
  }
  if (typeof it.hardness !== "number" || it.hardness < 0 || !isFinite(it.hardness) || isNaN(it.hardness)) {
    it.hardness = 0;
  } else {
    it.hardness = Math.floor(it.hardness);
  }
  if (typeof it.overwhelming === "string" && it.overwhelming) {
    var po = parseInt(it.overwhelming, 10);
    it.overwhelming = (!isNaN(po) && po >= 0) ? po : 0;
  }
  if (typeof it.overwhelming !== "number" || it.overwhelming < 0 || !isFinite(it.overwhelming) || isNaN(it.overwhelming)) {
    it.overwhelming = 0;
  } else {
    it.overwhelming = Math.floor(it.overwhelming);
  }
  /* Commitment state — driven by ruleset.commitmentModel. Three mutually
     exclusive shapes:
       "attuned"  → boolean attuned flag (D&D 5e; cap 3 enforced in editor)
       "invested" → boolean invested flag (PF2e; cap 10 enforced in editor)
       "mote"     → integer moteCommitment + Personal/Peripheral motePool
                    (Exalted; commitment subtracts from the named pool's
                    current value while set, restored when cleared)
     All three fields persist on every item regardless of which model the
     active ruleset uses, so toggling between rulesets at the character
     level doesn't drop user-entered state. The renderer hides what the
     active ruleset doesn't expose. */
  if (typeof it.attuned !== "boolean") it.attuned = false;
  if (typeof it.invested !== "boolean") it.invested = false;
  if (typeof it.moteCommitment === "string" && it.moteCommitment) {
    var pm = parseInt(it.moteCommitment, 10);
    it.moteCommitment = (!isNaN(pm) && pm >= 0) ? pm : 0;
  }
  if (typeof it.moteCommitment !== "number" || it.moteCommitment < 0 || !isFinite(it.moteCommitment) || isNaN(it.moteCommitment)) {
    it.moteCommitment = 0;
  } else {
    it.moteCommitment = Math.floor(it.moteCommitment);
  }
  if (it.motePool !== "Personal" && it.motePool !== "Peripheral") it.motePool = "Personal";
  /* Phase 4 — quantity (item stacking). Lets a single item entry
     represent a stack (e.g. 5 healing potions) instead of forcing the
     player to add five separate inventory rows. Defaults to 1 for
     legacy items without the field; coerce numeric strings; floor to
     non-negative integer. Quantity 0 keeps the row but renders as
     depleted; the player can refill by editing the value. */
  if (typeof it.quantity === "string" && it.quantity) {
    var pq = parseInt(it.quantity, 10);
    it.quantity = (!isNaN(pq) && pq >= 0) ? pq : 1;
  }
  if (typeof it.quantity !== "number" || it.quantity < 0 || !isFinite(it.quantity) || isNaN(it.quantity)) {
    it.quantity = 1;
  } else {
    it.quantity = Math.floor(it.quantity);
  }
  return it;
}

/* Normalize an intimacy entry to the standard shape. Used by mergeSheet
   (load-time heal of legacy / state-mutator-added entries) and by the
   intimacy add helper so a freshly created intimacy is safe to render
   immediately. Idempotent — re-running on an already-normalized entry
   is a no-op except for filling in a missing id. */
function normalizeIntimacy(it, idx) {
  if (!it || typeof it !== "object") return it;
  if (typeof it.text !== "string") it.text = "";
  if (it.kind !== "tie" && it.kind !== "principle") it.kind = "tie";
  if (it.degree !== "minor" && it.degree !== "major" && it.degree !== "defining") it.degree = "minor";
  if (typeof it.target !== "string") it.target = "";
  if (typeof it.id !== "string" || !it.id) {
    /* Deterministic id matching the inventory pattern so re-merging the
       same payload yields stable ids across reloads. */
    var slug = (it.text || "unnamed").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    it.id = "intimacy-heal-" + (slug || "x") + "-" + (typeof idx === "number" ? idx : 0);
  }
  return it;
}

function mergeSheet(base, override) {
  ["attributes", "skills", "derived", "states", "track"].forEach(function (k) {
    if (override[k] && typeof override[k] === "object") {
      Object.keys(override[k]).forEach(function (name) {
        if (name in base[k]) base[k][name] = override[k][name];
      });
    }
  });
  /* extraTrack accepts any track name the saved sheet carried, since users
     append new health levels at runtime — no schema entry to compare to. */
  if (override.extraTrack && typeof override.extraTrack === "object") {
    if (!base.extraTrack) base.extraTrack = {};
    Object.keys(override.extraTrack).forEach(function (name) {
      if (Array.isArray(override.extraTrack[name])) {
        base.extraTrack[name] = override.extraTrack[name];
      }
    });
  }
  /* Plan B v1 resources state. Resources with `stateName` actually
     persist via state.sheet.derived[stateName] (handled by 'derived'
     merge above). This block preserves resources without a legacy
     counterpart. */
  if (override.resources && typeof override.resources === "object") {
    if (!base.resources) base.resources = {};
    Object.keys(override.resources).forEach(function (id) {
      var v = override.resources[id];
      if (v && typeof v === "object") base.resources[id] = v;
    });
  }
  /* Phase 6 — committed-motes side-table. The render-time reconciler
     records the last live committed count per pool; preserving it across
     reloads keeps delta math sensible (without it, the first post-reload
     render would see "no prior" and skip its adjustment, leaving the
     spendable out of sync). */
  if (override.committedMotes && typeof override.committedMotes === "object") {
    base.committedMotes = {};
    Object.keys(override.committedMotes).forEach(function (poolName) {
      var v = override.committedMotes[poolName];
      if (typeof v === "number" && isFinite(v)) base.committedMotes[poolName] = v;
    });
  }
  /* inventory + equipped accept any items / slots the saved sheet carried,
     since item ids and slot names are user-authored at runtime.
     Two-tier categorization (v0.4.x): each item carries `category` —
     "equipment" (lives in the on-sheet Inventory section, equippable to
     a slot) or "item" (lives in the Items flyout, usable / consumable).
     Legacy items without a category are migrated by inferring from
     slot presence: an item with a slot was implicitly equipment; one
     without was implicitly a stored item. */
  if (Array.isArray(override.inventory)) {
    base.inventory = override.inventory
      .filter(function (it) { return it && typeof it === "object" && typeof it.name === "string" && it.name; })
      .map(function (it, idx) { return normalizeInventoryItem(it, idx); });
  }
  if (override.equipped && typeof override.equipped === "object") {
    base.equipped = {};
    Object.keys(override.equipped).forEach(function (slot) {
      var v = override.equipped[slot];
      if (typeof v === "string" || v === null) base.equipped[slot] = v;
    });
  }
  /* skillProficiency / skillSpecialties accept any skill names the saved
     sheet carried — these maps are sparse and the renderer falls back to
     the ruleset's default tier / empty list when a key is absent. */
  if (override.skillProficiency && typeof override.skillProficiency === "object") {
    base.skillProficiency = {};
    Object.keys(override.skillProficiency).forEach(function (skillName) {
      var v = override.skillProficiency[skillName];
      if (typeof v === "string") base.skillProficiency[skillName] = v;
    });
  }
  if (override.skillSpecialties && typeof override.skillSpecialties === "object") {
    base.skillSpecialties = {};
    Object.keys(override.skillSpecialties).forEach(function (skillName) {
      var arr = override.skillSpecialties[skillName];
      if (!Array.isArray(arr)) return;
      base.skillSpecialties[skillName] = arr
        .filter(function (sp) { return sp && typeof sp === "object" && typeof sp.name === "string"; })
        .map(function (sp) {
          return {
            name: sp.name,
            value: (typeof sp.value === "number" && isFinite(sp.value)) ? sp.value : 0
          };
        });
    });
  }
  /* Backgrounds are user-authored at runtime — name + dot value, free-text.
     Old saves predating this field default to []; entries with non-string
     names or non-finite values are dropped. */
  if (Array.isArray(override.backgrounds)) {
    base.backgrounds = override.backgrounds
      .filter(function (b) { return b && typeof b === "object" && typeof b.name === "string"; })
      .map(function (b) {
        return {
          name: b.name,
          value: (typeof b.value === "number" && isFinite(b.value)) ? b.value : 0
        };
      });
  }
  /* Abilities accept any categoryId / shape the saved sheet carried, since
     ruleset authors define category ids at runtime and player abilities are
     user-authored. Drop anything malformed; preserve everything else verbatim
     so future fields (like a v2 castConfig) survive a load/save round-trip. */
  if (override.abilities && typeof override.abilities === "object" && !Array.isArray(override.abilities)) {
    base.abilities = {};
    Object.keys(override.abilities).forEach(function (catId) {
      var arr = override.abilities[catId];
      if (!Array.isArray(arr)) return;
      base.abilities[catId] = arr.filter(function (a) {
        return a && typeof a === "object" && typeof a.id === "string" && typeof a.name === "string";
      }).map(function (a) {
        /* v0.5 migration: convert legacy structured cost {resource,amount}
           into free-text costText. The structured shape was inadequate
           for multi-component costs (motes + willpower) and non-numeric
           costs (V/S/M, focus). New saves drop `cost` entirely. */
        if (!a.costText && a.cost && typeof a.cost === "object") {
          var migrated = formatAbilityCost(a.cost);
          if (migrated) a.costText = migrated;
          delete a.cost;
        }
        return a;
      });
    });
  }
  if (override.abilityCollapse && typeof override.abilityCollapse === "object" && !Array.isArray(override.abilityCollapse)) {
    base.abilityCollapse = {};
    Object.keys(override.abilityCollapse).forEach(function (catId) {
      var v = override.abilityCollapse[catId];
      if (typeof v === "boolean") base.abilityCollapse[catId] = v;
    });
  }
  /* Intimacies — Exalted-system list of ties/principles at minor/major/
     defining intensity. Heal legacy / agent-added entries through the
     normalizer so id, kind, text, degree, and target all have safe
     defaults. Drop entries that aren't plain objects. Old saves
     predating this field default to []. */
  if (Array.isArray(override.intimacies)) {
    base.intimacies = override.intimacies
      .filter(function (it) { return it && typeof it === "object"; })
      .map(function (it, idx) { return normalizeIntimacy(it, idx); });
  }
  if (override.intimacyCollapse && typeof override.intimacyCollapse === "object" && !Array.isArray(override.intimacyCollapse)) {
    base.intimacyCollapse = {};
    Object.keys(override.intimacyCollapse).forEach(function (degree) {
      var v = override.intimacyCollapse[degree];
      if (typeof v === "boolean") base.intimacyCollapse[degree] = v;
    });
  }
  /* Identity (race/species/ancestry/exalt-type + class/caste) — free text.
     Old saves predating this field default to empty strings. The label that
     drives the UI lives in `state.ruleset.header`, NOT here, so renaming a
     ruleset's identity vocabulary doesn't migrate stored data. */
  if (override.identity && typeof override.identity === "object" && !Array.isArray(override.identity)) {
    base.identity = {
      race: typeof override.identity.race === "string" ? override.identity.race : "",
      "class": typeof override.identity["class"] === "string" ? override.identity["class"] : ""
    };
  }
  /* Custom user-added skills/lores. Same shape as the ruleset's declared
     skills (name + value + optional linkedAttribute) plus an authored-at
     marker so a future migration can distinguish runtime-added rows from
     ruleset rows. Old saves predating this field default to []. */
  if (Array.isArray(override.customSkills)) {
    base.customSkills = override.customSkills
      .filter(function (k) { return k && typeof k === "object" && typeof k.name === "string"; })
      .map(function (k) {
        return {
          name: k.name,
          linkedAttribute: typeof k.linkedAttribute === "string" ? k.linkedAttribute : "",
          value: (typeof k.value === "number" && isFinite(k.value)) ? k.value : 0
        };
      });
  }
  /* User-entered max for derived bars without engine-declared caps. */
  if (override.derivedMax && typeof override.derivedMax === "object" && !Array.isArray(override.derivedMax)) {
    base.derivedMax = {};
    Object.keys(override.derivedMax).forEach(function (n) {
      var v = override.derivedMax[n];
      if (typeof v === "number" && isFinite(v)) base.derivedMax[n] = v;
    });
  }
  /* Phase 3.1 section open/closed map — persists across sessions so
     the Attributes section (and any future Phase-3 sections) remember
     their collapsed state. */
  if (override.sectionCollapse && typeof override.sectionCollapse === "object" && !Array.isArray(override.sectionCollapse)) {
    base.sectionCollapse = {};
    Object.keys(override.sectionCollapse).forEach(function (k) {
      base.sectionCollapse[k] = !!override.sectionCollapse[k];
    });
  }
  /* Phase 4 — XP persistence. Preserve the entire xp struct (current,
     level, next, total) so XP earned across sessions doesn't reset on
     reload. Critical precondition for the upcoming leveling/XP-spending
     system. Drop fields that aren't finite numbers; default missing
     fields to the blankSheet values so legacy saves heal on load. */
  if (override.xp && typeof override.xp === "object" && !Array.isArray(override.xp)) {
    if (!base.xp) base.xp = { current: 0, level: 1, next: 0, total: 0 };
    if (typeof override.xp.current === "number" && isFinite(override.xp.current)) base.xp.current = override.xp.current;
    if (typeof override.xp.level   === "number" && isFinite(override.xp.level))   base.xp.level   = override.xp.level;
    if (typeof override.xp.next    === "number" && isFinite(override.xp.next))    base.xp.next    = override.xp.next;
    if (typeof override.xp.total   === "number" && isFinite(override.xp.total))   base.xp.total   = override.xp.total;
  }
  /* Phase 4 — commitment counter persistence. Snapshot reads these
     caches; without preservation, attunedCount / investedCount reset
     to 0 on every reload until the next item save fires the recompute. */
  /* ──────────────────────────────────────────────────────────────────────
     PERSISTENCE WHITELIST — SYSTEMIC RULE FOR ALL CURRENT AND FUTURE RULESETS
     ──────────────────────────────────────────────────────────────────────
     mergeSheet is "deny by default": any top-level field on the saved
     sheet that is not explicitly handled below is SILENTLY DROPPED on
     refresh. This was the root cause of "Courage resets to 3 every
     reload" (V20 morality), "PF2e ability category scores forget on
     refresh" (abilityCategoryScores), "custom ability categories vanish"
     (customAbilityCategories), "conditions reset" (conditions), "typed
     damage on Exalted Health Track resets" (trackCells), "UI density
     resets to cozy" (density), and "collapsed sections re-open" (sectionCollapse).

     RULE for adding a NEW top-level sheet field in any ruleset's renderer
     or extension code: pair every write to `state.sheet.<newField>` with
     a corresponding whitelist entry below. The blockers below are the
     accepted shape templates; pick the one closest to your field and
     mirror it. For per-ruleset custom state with no obvious shape, use
     the generic `customState` namespace at the bottom — anything written
     to `state.sheet.customState.<rulesetId>` is preserved verbatim with
     a one-level object validation.

     The full list of CURRENTLY WHITELISTED top-level sheet fields is the
     definitive answer to "does my new ruleset's data persist?": if your
     ruleset writes to a key not in this list, it doesn't persist.
     ────────────────────────────────────────────────────────────────────── */

  /* Morality bag (V20 path/rating/virtues — and any future system that
     stores per-path morality state under state.sheet.morality). */
  if (override.morality && typeof override.morality === "object" && !Array.isArray(override.morality)) {
    if (!base.morality || typeof base.morality !== "object") base.morality = {};
    if (typeof override.morality.rating === "number" && isFinite(override.morality.rating)) {
      base.morality.rating = Math.max(0, Math.floor(override.morality.rating));
    }
    if (typeof override.morality.path === "string") {
      base.morality.path = override.morality.path;
    }
    if (override.morality.virtues && typeof override.morality.virtues === "object" && !Array.isArray(override.morality.virtues)) {
      base.morality.virtues = {};
      Object.keys(override.morality.virtues).forEach(function (vid) {
        var v = override.morality.virtues[vid];
        if (!v || typeof v !== "object") return;
        base.morality.virtues[vid] = {};
        if (typeof v.value === "number" && isFinite(v.value)) {
          base.morality.virtues[vid].value = Math.max(0, Math.floor(v.value));
        }
        if (typeof v.active === "string") {
          base.morality.virtues[vid].active = v.active;
        }
      });
    }
  }
  /* Conditions array — D&D/PF2e-style condition names (poisoned, blessed,
     etc.). Used by every system that tracks status conditions. Array of
     short strings. */
  if (Array.isArray(override.conditions)) {
    base.conditions = override.conditions.filter(function (c) {
      return typeof c === "string" && c.length > 0 && c.length < 64;
    });
  }
  /* PF2e/d20 ability category scores — per-category rating (e.g. cantrips:0,
     1st-level:3). Shape: { <categoryId>: number }. */
  if (override.abilityCategoryScores && typeof override.abilityCategoryScores === "object" && !Array.isArray(override.abilityCategoryScores)) {
    base.abilityCategoryScores = {};
    Object.keys(override.abilityCategoryScores).forEach(function (catId) {
      var v = override.abilityCategoryScores[catId];
      if (typeof v === "number" && isFinite(v)) {
        base.abilityCategoryScores[catId] = Math.max(0, Math.floor(v));
      }
    });
  }
  /* User-added custom ability categories (player-defined buckets beyond
     ruleset.abilities.categories). Array of {id, label} entries. */
  if (Array.isArray(override.customAbilityCategories)) {
    base.customAbilityCategories = override.customAbilityCategories
      .filter(function (cat) {
        return cat && typeof cat === "object" && typeof cat.id === "string" && typeof cat.label === "string";
      })
      .map(function (cat) {
        return { id: cat.id, label: cat.label };
      });
  }
  /* Typed-damage track cells. Used by Exalted Health Track, V20 Health
     Track, any track with damage-type stacking. Shape: { <trackName>: [cell, ...] }.
     Each cell is either a string (legacy single-type) or an object with
     `type` (one of declared damage type IDs) or null for unmarked. */
  if (override.trackCells && typeof override.trackCells === "object" && !Array.isArray(override.trackCells)) {
    base.trackCells = {};
    Object.keys(override.trackCells).forEach(function (trackName) {
      var cells = override.trackCells[trackName];
      if (Array.isArray(cells)) {
        base.trackCells[trackName] = cells.filter(function (c) {
          return c === null || typeof c === "string" || (c && typeof c === "object");
        });
      }
    });
  }
  /* Per-section collapse state. { <sectionId>: boolean } — true means
     collapsed. Persistence keeps the user's UI configuration across
     reload (closed Spellbook stays closed). */
  if (override.sectionCollapse && typeof override.sectionCollapse === "object" && !Array.isArray(override.sectionCollapse)) {
    base.sectionCollapse = {};
    Object.keys(override.sectionCollapse).forEach(function (sid) {
      if (typeof override.sectionCollapse[sid] === "boolean") {
        base.sectionCollapse[sid] = override.sectionCollapse[sid];
      }
    });
  }
  /* UI density preference (compact / cozy / roomy). String enum. */
  if (typeof override.density === "string" && ["compact", "cozy", "roomy"].indexOf(override.density) !== -1) {
    base.density = override.density;
  }
  /* Merits & Flaws (V20-anchored, available to any ruleset that declares
     the meritsFlaws section). Array of { id, kind, name, type, points }.
     Drops malformed entries; clamps points to 1-7 (V20 canon range). */
  if (Array.isArray(override.meritsFlaws)) {
    base.meritsFlaws = override.meritsFlaws
      .filter(function (e) { return e && typeof e === "object" && typeof e.name === "string"; })
      .map(function (e) {
        var pts = (typeof e.points === "number" && isFinite(e.points)) ? Math.floor(e.points) : 1;
        if (pts < 1) pts = 1;
        if (pts > 7) pts = 7;
        return {
          id: typeof e.id === "string" && e.id ? e.id : ("mf-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36)),
          kind: (e.kind === "flaw") ? "flaw" : "merit",
          name: e.name,
          type: (typeof e.type === "string" && ["physical","mental","social","supernatural"].indexOf(e.type) !== -1) ? e.type : "physical",
          points: pts
        };
      });
  }
  /* Generic custom-state namespace for FUTURE rulesets that add their
     own data bags. Authors should write to `state.sheet.customState
     [<rulesetId>] = { ... }` rather than `state.sheet.<myField>`. This
     bucket is preserved verbatim per-ruleset, with one-level shape
     validation. Existing rulesets with explicit whitelist entries above
     do NOT need to migrate — their explicit entries remain authoritative.
     The customState namespace is a safety net for rapid ruleset
     development: a new author can ship data persistence without touching
     mergeSheet. */
  if (override.customState && typeof override.customState === "object" && !Array.isArray(override.customState)) {
    base.customState = {};
    Object.keys(override.customState).forEach(function (rulesetId) {
      var bag = override.customState[rulesetId];
      if (bag && typeof bag === "object" && !Array.isArray(bag)) {
        base.customState[rulesetId] = bag;
      }
    });
  }
  if (typeof override.attunedCount === "number" && isFinite(override.attunedCount)) {
    base.attunedCount = Math.max(0, Math.floor(override.attunedCount));
  }
  if (typeof override.investedCount === "number" && isFinite(override.investedCount)) {
    base.investedCount = Math.max(0, Math.floor(override.investedCount));
  }
  /* Phase 4 — conditions persistence. Active D&D-style condition list
     (Blinded, Restrained, etc.) — without this, every reload clears
     the user's active conditions. */
  if (Array.isArray(override.conditions)) {
    base.conditions = override.conditions.filter(function (c) {
      return typeof c === "string" && c;
    });
  }
  /* Phase 4 — per-cell damage track persistence. */
  if (override.trackCells && typeof override.trackCells === "object" && !Array.isArray(override.trackCells)) {
    base.trackCells = {};
    Object.keys(override.trackCells).forEach(function (name) {
      var arr = override.trackCells[name];
      if (!Array.isArray(arr)) return;
      base.trackCells[name] = arr.map(function (v) {
        return (typeof v === "string" && v) ? v : null;
      });
    });
  }
  /* Phase 5 — V20 disciplines plumbing. Per-category score (1-10
     rating per discipline) and user-added custom categories (bloodline
     disciplines like Daimoinon). Both keyed by category id so they
     survive ruleset switches gracefully. */
  if (override.abilityCategoryScores && typeof override.abilityCategoryScores === "object"
      && !Array.isArray(override.abilityCategoryScores)) {
    base.abilityCategoryScores = {};
    Object.keys(override.abilityCategoryScores).forEach(function (catId) {
      var v = override.abilityCategoryScores[catId];
      if (typeof v === "number" && isFinite(v)) {
        base.abilityCategoryScores[catId] = Math.max(0, Math.min(10, Math.floor(v)));
      }
    });
  }
  if (Array.isArray(override.customAbilityCategories)) {
    base.customAbilityCategories = override.customAbilityCategories.filter(function (c) {
      return c && typeof c === "object" && typeof c.id === "string" && typeof c.label === "string";
    }).map(function (c) {
      return { id: c.id, label: c.label };
    });
  }
  return base;
}

function clamp(v, lo, hi) {
  if (typeof v !== "number" || isNaN(v)) return lo;
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

/* Build a flat lookup of all current stat values for formula evaluation.
   Attribute / skill / derived all share the same name-space at lookup time,
   so a maxFormula like "{Essence} * 7 + 26" works regardless of which
   bucket Essence lives in. */
function statContext() {
  var ctx = {};
  if (!state.sheet) return ctx;
  Object.keys(state.sheet.attributes || {}).forEach(function (k) { ctx[k] = state.sheet.attributes[k]; });
  Object.keys(state.sheet.skills     || {}).forEach(function (k) { ctx[k] = state.sheet.skills[k]; });
  Object.keys(state.sheet.derived    || {}).forEach(function (k) { ctx[k] = state.sheet.derived[k]; });
  /* Custom user-added skills participate in formula evaluation by name,
     so a derived `valueFormula` of "{Lore: Architecture} * 2" works the
     moment the user adds a custom skill called "Lore: Architecture". */
  if (Array.isArray(state.sheet.customSkills)) {
    state.sheet.customSkills.forEach(function (k) {
      if (k && typeof k.name === "string" && k.name) ctx[k.name] = (typeof k.value === "number") ? k.value : 0;
    });
  }
  /* Auto-computed attribute modifiers. When an attribute declares
     `modifierFormula` (e.g. D&D's `({Score} - 10) / 2`), substitute the
     raw score into `{Score}`, evaluate via the same arithmetic engine,
     floor the result, and expose under both the long name and the
     abbreviation so formulas can reference either ("Dexterity_mod" or
     "DEX_mod"). The substitution is local to this attribute — `{Score}`
     is a magic token resolved here, not a real stat. */
  if (state.ruleset && Array.isArray(state.ruleset.attributes)) {
    state.ruleset.attributes.forEach(function (a) {
      if (!a || typeof a.modifierFormula !== "string" || !a.modifierFormula) return;
      var raw = (typeof ctx[a.name] === "number") ? ctx[a.name] : 0;
      var subbed = a.modifierFormula.replace(/\{Score\}/g, String(raw));
      var v = evalFormula(subbed, ctx);
      var mod = (typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0;
      ctx[a.name + "_mod"] = mod;
      if (a.abbreviation) ctx[a.abbreviation + "_mod"] = mod;
      if (a.modifierName) ctx[a.modifierName] = mod;
    });
  }
  return ctx;
}

/* Sum bonuses contributed by every equipped item that targets `target`.
   Returns { dice, value, contributors[] } where:
     - dice  = sum of bonuses with kind === "dice"
     - value = sum of bonuses with kind === "value" (or unset / "successes")
     - contributors = [{name, value, kind, tag}] for tooltip / UI display
   Null-safe: if state.sheet or its inventory/equipped fields are missing
   (legacy saved sheets, mid-load), returns the zero shape. */
/* Phase 6 — commitment reconciler helpers.

   computeCommittedMotes(poolName) returns the live sum of moteCommitment
   from inventory items currently equipped to a slot AND declaring motePool
   === poolName. This is the authoritative "currently locked" count; the
   stored side-table only exists to detect deltas between renders.

   reconcileCommittedMotes(poolName, stateName) compares live committed to
   the stored value from the previous render. When the live count changes
   (item equipped, unequipped, displaced by slot-replacement, or edited),
   the delta is subtracted from the player's spendable pool so the visible
   "available motes" tracks commitment correctly without the equip handler
   having to know about pool math. First-render (no stored value) takes
   `saved current` as ground truth and just remembers the live count —
   protects existing characters from double-deduction during the migration
   from the old toggleEquip-based deduct path. */
function computeCommittedMotes(poolName) {
  if (!state.sheet || !poolName) return 0;
  var inv = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
  var equipped = (state.sheet.equipped && typeof state.sheet.equipped === "object") ? state.sheet.equipped : {};
  var equippedIds = {};
  Object.keys(equipped).forEach(function (slot) {
    if (typeof equipped[slot] === "string") equippedIds[equipped[slot]] = true;
  });
  var total = 0;
  inv.forEach(function (item) {
    if (!item || !equippedIds[item.id]) return;
    if (typeof item.moteCommitment !== "number" || item.moteCommitment <= 0) return;
    var itemPool = (item.motePool === "Peripheral") ? "Peripheral" : "Personal";
    if (itemPool === poolName) total += item.moteCommitment;
  });
  return total;
}

function reconcileCommittedMotes(poolName, stateName) {
  if (!state.sheet || !poolName) return 0;
  if (!state.sheet.committedMotes || typeof state.sheet.committedMotes !== "object") {
    state.sheet.committedMotes = {};
  }
  var liveCommitted = computeCommittedMotes(poolName);
  var oldCommitted = state.sheet.committedMotes[poolName];
  if (typeof oldCommitted !== "number") {
    /* First time we see this pool — assume saved current already reflects
       any pre-existing commitment (legacy characters from the deduct-on-
       equip path). Record live as the baseline; no adjustment to saved. */
    state.sheet.committedMotes[poolName] = liveCommitted;
    saveSheet(state.chatId, state.sheet);
    return liveCommitted;
  }
  if (liveCommitted === oldCommitted) return liveCommitted;
  /* Adjust saved spendable by the delta: more committed → less spendable;
     less committed → more spendable. Floor at zero so commit-on-credit
     pinches the deficit instead of going negative. */
  var delta = liveCommitted - oldCommitted;
  if (stateName && state.sheet.derived) {
    var cur = (typeof state.sheet.derived[stateName] === "number") ? state.sheet.derived[stateName] : 0;
    state.sheet.derived[stateName] = Math.max(0, cur - delta);
  }
  state.sheet.committedMotes[poolName] = liveCommitted;
  saveSheet(state.chatId, state.sheet);
  return liveCommitted;
}

function equippedBonuses(target) {
  var out = { dice: 0, value: 0, contributors: [] };
  if (!state.sheet || !target) return out;
  var inv = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
  var equipped = (state.sheet.equipped && typeof state.sheet.equipped === "object") ? state.sheet.equipped : {};
  var equippedIds = {};
  Object.keys(equipped).forEach(function (slot) {
    if (typeof equipped[slot] === "string") equippedIds[equipped[slot]] = true;
  });
  inv.forEach(function (item) {
    if (!item || !equippedIds[item.id]) return;
    /* Phase 6 — Hardness inheritance. Items carry a top-level
       `item.hardness` integer separate from the bonuses[] array (it
       drives the Overwhelming check at attack time too). Surface it as
       a synthetic value-bonus when the caller is asking for "Hardness"
       so the Hardness derived card and the snapshot both pick up
       equipped armor's natural rating without the player having to add
       a redundant explicit bonus entry. */
    if (target === "Hardness" && typeof item.hardness === "number" && item.hardness > 0) {
      out.value += item.hardness;
      out.contributors.push({
        name: item.name || item.id,
        value: item.hardness,
        kind: BONUS_KIND.VALUE,
        tag: "natural"
      });
    }
    if (!Array.isArray(item.bonuses)) return;
    item.bonuses.forEach(function (b) {
      if (!b || b.target !== target) return;
      var v = (typeof b.value === "number" && isFinite(b.value)) ? b.value : 0;
      if (v === 0) return;
      if (b.kind === BONUS_KIND.DICE) out.dice += v;
      else                            out.value += v;
      out.contributors.push({ name: item.name || item.id, value: v, kind: b.kind || BONUS_KIND.VALUE, tag: b.tag || "" });
    });
  });
  return out;
}

/* ─────  skill proficiency tier + specialty helpers  ───── */

/* Look up the active tier definition for a skill. Falls back to the
   ruleset's `default` tier code when the character has none stored, then
   to the first tier in the array if `default` isn't set either. Returns
   null when the ruleset has no skillProficiency block at all (Fate Core).
*/
function tierForSkill(skillName) {
  var prof = state.ruleset && state.ruleset.skillProficiency;
  if (!prof || !Array.isArray(prof.tiers) || !prof.tiers.length) return null;
  var saved = (state.sheet && state.sheet.skillProficiency)
    ? state.sheet.skillProficiency[skillName]
    : null;
  var code = saved || prof["default"] || prof.tiers[0].code;
  for (var i = 0; i < prof.tiers.length; i++) {
    if (prof.tiers[i].code === code) return prof.tiers[i];
  }
  return prof.tiers[0];
}

/* Resolve the active tier's rollBonusFormula for a skill. Returns 0 if
   there is no formula or no tier. The existing evalFormula evaluator
   handles the arithmetic-only whitelist + {StatName} substitution. */
function resolveTierBonus(skillName) {
  var tier = tierForSkill(skillName);
  if (!tier || !tier.rollBonusFormula) return 0;
  var v = evalFormula(tier.rollBonusFormula, statContext());
  return (typeof v === "number" && isFinite(v)) ? v : 0;
}

/* Advance a skill's tier code to the next entry in the ruleset's tiers
   array, wrapping at the end. Updates the existing button in place rather
   than rebuilding the whole sheet — a tier cycle is a 1-button visual
   change and a full re-render would lose any focus the user has elsewhere
   on the sheet (specialty name input, attribute stepper). */
function cycleTier(skillName, btnEl) {
  var prof = state.ruleset && state.ruleset.skillProficiency;
  if (!prof || !Array.isArray(prof.tiers) || !prof.tiers.length) return;
  var current = tierForSkill(skillName);
  var idx = 0;
  for (var i = 0; i < prof.tiers.length; i++) {
    if (prof.tiers[i].code === (current && current.code)) { idx = i; break; }
  }
  var next = prof.tiers[(idx + 1) % prof.tiers.length];
  if (!state.sheet.skillProficiency) state.sheet.skillProficiency = {};
  state.sheet.skillProficiency[skillName] = next.code;
  saveSheet(state.chatId, state.sheet);

  if (btnEl) {
    if (current && current.code) {
      btnEl.classList.remove("mrr-skill-tier-btn--" + current.code);
    }
    btnEl.classList.add("mrr-skill-tier-btn--" + next.code);
    btnEl.textContent = next.code;
    btnEl.setAttribute("title", next.label + (next.rollBonusFormula ? " — " + next.rollBonusFormula : ""));
  }

  /* Tier change shifts the proficiency bonus, which propagates into
     autocalc skill bonuses (D&D, PF2e) and into save bonuses. Refresh
     all bound refreshers in-place so the displayed `+5` etc. update
     without rebuilding the sheet (which would lose focus on any other
     active input). */
  refreshAllBars();
}

/* Append a new specialty to a skill, then re-render. The new specialty
   takes the ruleset's defaultValue (Exalted: 1; safe fallback 0 for any
   ruleset that enables specialties without specifying a default — 0
   contributes nothing to dice math, which is the only universally safe
   "absent" semantics). */
function addSpecialty(skillName) {
  if (!state.sheet.skillSpecialties) state.sheet.skillSpecialties = {};
  if (!Array.isArray(state.sheet.skillSpecialties[skillName])) {
    state.sheet.skillSpecialties[skillName] = [];
  }
  var def = (state.ruleset.skillSpecialties && state.ruleset.skillSpecialties.defaultValue);
  state.sheet.skillSpecialties[skillName].push({
    name: "",
    value: (typeof def === "number") ? def : 0
  });
  saveSheet(state.chatId, state.sheet);
  renderSheet();
}

function removeSpecialty(skillName, idx) {
  var arr = state.sheet.skillSpecialties && state.sheet.skillSpecialties[skillName];
  if (!Array.isArray(arr) || idx < 0 || idx >= arr.length) return;
  arr.splice(idx, 1);
  saveSheet(state.chatId, state.sheet);
  renderSheet();
}

/* Append a blank background entry, then re-render. Initial dot value comes
   from ruleset.backgrounds.default when set; otherwise 0. Re-render is
   intentional (matches Specialty add) so the new row's name input renders
   immediately rather than requiring a full sheet rebuild on next event. */
function addBackground() {
  if (!Array.isArray(state.sheet.backgrounds)) state.sheet.backgrounds = [];
  var cfg = state.ruleset.backgrounds || {};
  var def = (typeof cfg["default"] === "number") ? cfg["default"] : 0;
  state.sheet.backgrounds.push({ name: "", value: def });
  saveSheet(state.chatId, state.sheet);
  renderSheet();
}

function removeBackground(idx) {
  var arr = state.sheet.backgrounds;
  if (!Array.isArray(arr) || idx < 0 || idx >= arr.length) return;
  arr.splice(idx, 1);
  saveSheet(state.chatId, state.sheet);
  renderSheet();
}

/* ─────  intimacies (Exalted ties + principles)  ─────────────────────────
   Mirrors the spellbook (charms) flyout pattern: a compact button on the
   sheet that opens its own floating panel, which groups entries into
   collapsible Minor / Major / Defining sections. Each entry edits in
   place with debounce-save so typing doesn't lose focus. The panel is
   distinct from the spellbook so both can be open simultaneously. */

var INTIMACY_DEGREES = [
  { id: "minor",    label: "Minor"    },
  { id: "major",    label: "Major"    },
  { id: "defining", label: "Defining" }
];

function generateIntimacyId() {
  return "intimacy-" + Date.now() + "-" + Math.random().toString(36).slice(2, 11);
}

function totalIntimacyCount() {
  if (!state.sheet || !Array.isArray(state.sheet.intimacies)) return 0;
  return state.sheet.intimacies.length;
}

function intimaciesByDegree(degreeId) {
  if (!state.sheet || !Array.isArray(state.sheet.intimacies)) return [];
  return state.sheet.intimacies.filter(function (it) { return it && it.degree === degreeId; });
}

function addIntimacy(degreeId, kindId, focusAfterRender) {
  if (!state.sheet) return null;
  if (!Array.isArray(state.sheet.intimacies)) state.sheet.intimacies = [];
  var degree = (degreeId === "minor" || degreeId === "major" || degreeId === "defining")
    ? degreeId : "minor";
  var kind = (kindId === "tie" || kindId === "principle") ? kindId : "tie";
  var entry = normalizeIntimacy({
    id: generateIntimacyId(),
    kind: kind,
    text: "",
    degree: degree,
    target: ""
  }, state.sheet.intimacies.length);
  state.sheet.intimacies.push(entry);
  saveSheet(state.chatId, state.sheet);
  /* Re-render panel + main sheet (the latter to bump the count badge). */
  renderIntimaciesPanelContents();
  renderSheet();
  if (state.intimaciesOpen) showIntimacies(true); /* re-add open class after sheet rerender swap */
  if (focusAfterRender) {
    /* Focus the text input on the newly-created row, end-of-frame so the
       DOM is committed. Identifier match keyed on entry.id so a re-render
       still finds the right input. */
    setTimeout(function () {
      if (!state.intimaciesEl) return;
      var input = state.intimaciesEl.querySelector('input[data-intimacy-id="' + entry.id + '"]');
      if (input && typeof input.focus === "function") input.focus();
    }, 0);
  }
  return entry;
}

function removeIntimacy(id) {
  if (!state.sheet || !Array.isArray(state.sheet.intimacies)) return;
  var idx = -1;
  for (var i = 0; i < state.sheet.intimacies.length; i++) {
    if (state.sheet.intimacies[i] && state.sheet.intimacies[i].id === id) { idx = i; break; }
  }
  if (idx === -1) return;
  state.sheet.intimacies.splice(idx, 1);
  saveSheet(state.chatId, state.sheet);
  renderIntimaciesPanelContents();
  renderSheet();
  if (state.intimaciesOpen) showIntimacies(true);
}

/* Sheet section row: a single button that opens / toggles the flyout. */
function renderIntimaciesSection(parent) {
  var sec = marinara.addElement(parent, "div", { "class": "mrr-section mrr-spellbook-row" });
  if (!sec) return;
  var btn = marinara.addElement(sec, "button", {
    "class": "mrr-char-btn mrr-char-btn--dashed mrr-spellbook-row__btn",
    type: "button",
    textContent: "Intimacies (" + totalIntimacyCount() + ")"
  });
  if (btn) marinara.on(btn, "click", function () { showIntimacies(!state.intimaciesOpen); });
}

/* Phase 3.7 — Phase-3 intimacies flyout via mrrP3CreatePanel. */
function mrrP3BuildIntimaciesPanel() {
  if (state.intimaciesEl) return state.intimaciesEl;
  if (typeof mrrP3CreatePanel !== "function") return null;
  var p = mrrP3CreatePanel(document.body, {
    storageKey: "mrr-p3-intimacies-pos",
    title: "Intimacies — " + state.ruleset.name,
    defaultPos: { x: 360, y: 80 },
    defaultSize: { w: 460, h: 600 },
    className: "mrr-intimacies",
    onClose: function () { showIntimacies(false); }
  });
  if (!p || !p.panel || !p.body) return null;
  if (p.body.classList) p.body.classList.add("mrr-spellbook__body");
  p.panel.style.display = "none";
  state.intimaciesEl = p.panel;
  return state.intimaciesEl;
}

function buildIntimaciesPanel() {
  if (state.intimaciesEl) return state.intimaciesEl;
  state.intimaciesEl = marinara.addElement(document.body, "div", { "class": "mrr-spellbook mrr-intimacies" });
  if (!state.intimaciesEl) return null;

  var header = marinara.addElement(state.intimaciesEl, "div", { "class": "mrr-spellbook__header" });
  if (header) {
    marinara.addElement(header, "span", { "class": "mrr-spellbook__title", textContent: "Intimacies — " + state.ruleset.name });
    var close = marinara.addElement(header, "button", { "class": "mrr-dice__close", innerHTML: "&times;" });
    if (close) marinara.on(close, "click", function () { showIntimacies(false); });
    makeDraggable(state.intimaciesEl, header, LS_INTIMACIES_POS);
  }

  marinara.addElement(state.intimaciesEl, "div", { "class": "mrr-spellbook__body" });
  return state.intimaciesEl;
}

function showIntimacies(open) {
  if (open) {
    if (!state.intimaciesEl) {
      if (typeof mrrP3BuildIntimaciesPanel === "function") mrrP3BuildIntimaciesPanel();
      else buildIntimaciesPanel();
    }
    if (state.intimaciesEl) {
      state.intimaciesEl.classList.add("mrr-spellbook--open");
      state.intimaciesEl.style.display = "flex";
      state.intimaciesOpen = true;
      renderIntimaciesPanelContents();
    }
  } else {
    if (state.intimaciesEl) {
      state.intimaciesEl.classList.remove("mrr-spellbook--open");
      state.intimaciesEl.style.display = "none";
    }
    state.intimaciesOpen = false;
  }
}

function renderIntimaciesPanelContents() {
  if (!state.intimaciesEl) return;
  var body = state.intimaciesEl.querySelector(".mrr-spellbook__body");
  if (!body) return;
  body.textContent = "";

  if (!state.sheet) return;
  if (!Array.isArray(state.sheet.intimacies)) state.sheet.intimacies = [];
  if (!state.sheet.intimacyCollapse || typeof state.sheet.intimacyCollapse !== "object") {
    state.sheet.intimacyCollapse = {};
  }

  /* Top "+ Add Intimacy" creates a Minor tie by default — same shape the
     state-mutator add path produces when `degree` and `kind` are omitted,
     so on-screen and agent-driven adds match. */
  var topAdd = marinara.addElement(body, "button", {
    "class": "mrr-char-btn mrr-char-btn--dashed mrr-intimacies__top-add",
    type: "button",
    textContent: "+ Add Intimacy"
  });
  if (topAdd) marinara.on(topAdd, "click", function () { addIntimacy("minor", "tie", true); });

  INTIMACY_DEGREES.forEach(function (deg) {
    renderIntimacyDegreeGroup(body, deg);
  });
}

function renderIntimacyDegreeGroup(body, degree) {
  var sec = marinara.addElement(body, "div", { "class": "mrr-spellbook-cat mrr-intimacy-group mrr-intimacy-group--" + degree.id });
  if (!sec) return;

  var entries = intimaciesByDegree(degree.id);
  var collapsed = (degree.id in state.sheet.intimacyCollapse)
    ? !!state.sheet.intimacyCollapse[degree.id]
    : true;
  if (collapsed) sec.classList.add("mrr-spellbook-cat--collapsed");

  var head = marinara.addElement(sec, "button", {
    "class": "mrr-spellbook-cat__head",
    type: "button",
    textContent: degree.label + " " + entries.length
  });
  if (head) marinara.on(head, "click", function () {
    var nowCollapsed = sec.classList.toggle("mrr-spellbook-cat--collapsed");
    state.sheet.intimacyCollapse[degree.id] = nowCollapsed;
    saveSheet(state.chatId, state.sheet);
  });

  var list = marinara.addElement(sec, "div", { "class": "mrr-spellbook-cat__list" });
  if (!list) return;
  entries.forEach(function (it) { renderIntimacyRow(list, it); });

  var addBtn = marinara.addElement(sec, "button", {
    "class": "mrr-char-btn mrr-char-btn--dashed mrr-spellbook-cat__add",
    type: "button",
    textContent: "+ Add " + degree.label
  });
  if (addBtn) marinara.on(addBtn, "click", function () { addIntimacy(degree.id, "tie", true); });
}

function renderIntimacyRow(list, entry) {
  var row = marinara.addElement(list, "div", { "class": "mrr-intimacy-row" });
  if (!row) return;

  /* Kind chip — click to toggle tie <-> principle. Visual styling
     differs by kind (handled in CSS) so a glance distinguishes them. */
  var kindBtn = marinara.addElement(row, "button", {
    "class": "mrr-chip mrr-chip--intimacy-kind mrr-chip--intimacy-kind-" + (entry.kind || "tie"),
    type: "button",
    textContent: entry.kind === "principle" ? "Principle" : "Tie",
    title: "Click to toggle Tie / Principle"
  });
  if (kindBtn) marinara.on(kindBtn, "click", function () {
    entry.kind = (entry.kind === "tie") ? "principle" : "tie";
    saveSheet(state.chatId, state.sheet);
    renderIntimaciesPanelContents();
  });

  /* Text input — full width on its own line within the row. Debounce-save
     250ms identical to renderBackgroundRow so typing stays focused. */
  var textInput = marinara.addElement(row, "input", {
    "class": "mrr-intimacy-row__text",
    type: "text",
    placeholder: entry.kind === "principle"
      ? "principle (e.g. 'Justice protects the powerless')"
      : "tie (e.g. 'Loyalty to the Sword Lord')",
    value: entry.text || ""
  });
  if (textInput) {
    textInput.setAttribute("data-intimacy-id", entry.id);
    var saveTimer = null;
    marinara.on(textInput, "input", function () {
      entry.text = textInput.value;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { saveSheet(state.chatId, state.sheet); }, 250);
    });
    marinara.on(textInput, "blur", function () {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      saveSheet(state.chatId, state.sheet);
    });
    marinara.on(textInput, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
  }

  /* Degree dropdown — moving an entry between degrees re-renders the
     panel so it lands in the right group visually. */
  var degSel = marinara.addElement(row, "select", { "class": "mrr-intimacy-row__degree" });
  if (degSel) {
    INTIMACY_DEGREES.forEach(function (d) {
      var opt = document.createElement("option");
      opt.value = d.id; opt.textContent = d.label;
      if (d.id === (entry.degree || "minor")) opt.selected = true;
      degSel.appendChild(opt);
    });
    marinara.on(degSel, "change", function () {
      var v = degSel.value;
      if (v !== "minor" && v !== "major" && v !== "defining") return;
      entry.degree = v;
      saveSheet(state.chatId, state.sheet);
      renderIntimaciesPanelContents();
    });
  }

  /* Target — only meaningful for ties (a principle has no external
     subject). Hidden for principles to avoid implying it should be
     filled. Debounce-save 250ms like the text input. */
  if (entry.kind === "tie") {
    var targetInput = marinara.addElement(row, "input", {
      "class": "mrr-intimacy-row__target",
      type: "text",
      placeholder: "target name",
      value: entry.target || ""
    });
    if (targetInput) {
      var tSaveTimer = null;
      marinara.on(targetInput, "input", function () {
        entry.target = targetInput.value;
        if (tSaveTimer) clearTimeout(tSaveTimer);
        tSaveTimer = setTimeout(function () { saveSheet(state.chatId, state.sheet); }, 250);
      });
      marinara.on(targetInput, "blur", function () {
        if (tSaveTimer) { clearTimeout(tSaveTimer); tSaveTimer = null; }
        saveSheet(state.chatId, state.sheet);
      });
      marinara.on(targetInput, "click", function (e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      });
    }
  }

  var delBtn = marinara.addElement(row, "button", {
    "class": "mrr-char-btn mrr-char-btn--danger",
    type: "button",
    textContent: "x",
    title: "Remove this intimacy"
  });
  if (delBtn) marinara.on(delBtn, "click", function () { removeIntimacy(entry.id); });
}

/* CSP-safe arithmetic evaluator. Recursive-descent parser for + - * / ( ),
   unary +/-, integer and decimal literals. Used in place of `new Function`
   because Marinara's page CSP blocks 'unsafe-eval' — every formula was
   throwing silently and bar maxes were falling back to DEFAULT_BAR_MAX = 10. */
function safeEvalArithmetic(s) {
  var i = 0;
  function skip() { while (i < s.length && (s[i] === " " || s[i] === "\t" || s[i] === "\n")) i++; }
  function parseNumber() {
    skip();
    var start = i;
    while (i < s.length && ((s[i] >= "0" && s[i] <= "9") || s[i] === ".")) i++;
    if (i === start) throw new Error("expected number at " + i);
    return parseFloat(s.slice(start, i));
  }
  function parsePrimary() {
    skip();
    if (s[i] === "(") { i++; var v = parseExpr(); skip(); if (s[i] !== ")") throw new Error("expected )"); i++; return v; }
    if (s[i] === "-") { i++; return -parsePrimary(); }
    if (s[i] === "+") { i++; return parsePrimary(); }
    return parseNumber();
  }
  function parseTerm() {
    var left = parsePrimary();
    while (true) {
      skip();
      if (s[i] === "*") { i++; left = left * parsePrimary(); }
      else if (s[i] === "/") { i++; var r = parsePrimary(); if (r === 0) throw new Error("divide by zero"); left = left / r; }
      else break;
    }
    return left;
  }
  function parseExpr() {
    var left = parseTerm();
    while (true) {
      skip();
      if (s[i] === "+") { i++; left = left + parseTerm(); }
      else if (s[i] === "-") { i++; left = left - parseTerm(); }
      else break;
    }
    return left;
  }
  var result = parseExpr();
  skip();
  if (i !== s.length) throw new Error("unexpected char at " + i);
  return result;
}

/* Tiny safe formula evaluator. Supports {Name} substitution (resolved against
   statContext) and arithmetic with + - * / ( ). Anything else is rejected by
   the whitelist regex; the actual math goes through safeEvalArithmetic so
   we don't trip the page's CSP 'unsafe-eval' guard. */
function evalFormula(formula, ctx) {
  if (!formula) return null;
  var subbed = String(formula).replace(/\{([^}]+)\}/g, function (_, key) {
    var v = ctx[key];
    return typeof v === "number" ? String(v) : "0";
  });
  if (!/^[\s0-9+\-*/().]*$/.test(subbed)) return null;
  try {
    var result = safeEvalArithmetic(subbed);
    return (typeof result === "number" && isFinite(result)) ? result : null;
  } catch (e) {
    return null;
  }
}

function findChatInputTextarea() {
  /* Positive anchors FIRST (live GM-mode failure, 2026-08-22: generic
     selectors + bottom-most picked the Extensions panel's JS source
     editor while the settings surface was open). Every composer shell —
     conversation, game, roleplay — carries `marinara-chat-input-shell`
     (chat-input-styles.ts, present since at least v2.0.9: the engine's
     own QuickSwitchers anchor to it), and the chat composer's textarea
     itself carries `mari-chat-input-textarea`. The generic fallbacks
     stay for unknown engines but EXCLUDE dialog-contained textareas —
     no composer lives in a dialog, and the settings/extension editors
     do; a null return degrades to the clipboard path, which is the
     correct behavior when no real composer is on screen. */
  var sels = [
    ".marinara-chat-input-shell textarea",
    ".mari-chat-input-box textarea",
    "textarea.mari-chat-input-textarea",
    "textarea.chat-input",
    "textarea[placeholder*='message' i]",
    "textarea[placeholder*='type' i]",
    "textarea"
  ];
  for (var i = 0; i < sels.length; i++) {
    var els = document.querySelectorAll(sels[i]);
    if (!els.length) continue;
    var bare = (sels[i] === "textarea");
    var visible = Array.prototype.filter.call(els, function (el) {
      if (el.offsetParent === null || el.disabled) return false;
      if (bare && el.closest && el.closest("[role='dialog'], [aria-modal='true']")) return false;
      return true;
    });
    if (!visible.length) continue;
    /* Multiple visible matches (e.g. mobile + desktop shells): prefer
       the bottom-most — composers live at the viewport bottom. */
    var best = visible[0];
    var bestBottom = -Infinity;
    for (var v = 0; v < visible.length; v++) {
      var r = visible[v].getBoundingClientRect();
      if (r.bottom > bestBottom) { bestBottom = r.bottom; best = visible[v]; }
    }
    return best;
  }
  return null;
}

/* Write a value into a React-controlled input so React actually SEES it.
   Direct `.value =` assignment also updates React's internal value
   tracker, so the subsequent input event diffs as "no change" and React
   silently discards the text on its next render — observed live
   2026-08-22 in GM mode, whose composer (GameInput.tsx) is strictly
   controlled (value={state}); RP mode's composer tolerated the naive
   path, masking the bug. Calling the PROTOTYPE's native value setter
   bypasses the instance-level tracker so the event diffs correctly. */
function setNativeInputValue(el, value) {
  var proto = (typeof HTMLTextAreaElement !== "undefined" && el instanceof HTMLTextAreaElement) ? HTMLTextAreaElement.prototype
            : (typeof HTMLInputElement !== "undefined" && el instanceof HTMLInputElement) ? HTMLInputElement.prototype
            : null;
  var desc = proto ? Object.getOwnPropertyDescriptor(proto, "value") : null;
  if (desc && desc.set) desc.set.call(el, value);
  else el.value = value;
}

function insertIntoChatInput(text) {
  var ta = findChatInputTextarea();
  if (!ta) {
    /* Visible degradation per COUPLINGS.md row 9: clipboard fallback so
       the roll is never lost, plus the console warn. */
    warn("chat input not found; tag copied to clipboard: " + text);
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      try { navigator.clipboard.writeText(text); } catch (e) {}
    }
    return false;
  }
  var prev = ta.value || "";
  var sep = (prev && !prev.endsWith(" ") && !prev.endsWith("\n")) ? " " : "";
  setNativeInputValue(ta, prev + sep + text);
  ta.dispatchEvent(new Event("input",  { bubbles: true }));
  ta.dispatchEvent(new Event("change", { bubbles: true }));
  ta.focus();
  return true;
}

function findSheetContainer() {
  var headings = document.querySelectorAll("h1, h2, h3, h4, h5, [role='heading']");
  for (var i = 0; i < headings.length; i++) {
    var h = headings[i];
    var t = (h.textContent || "").trim().toLowerCase();
    if (t === "edit sheet" || t === "character sheet" || t === "attributes") {
      var c = h.closest("section, article, aside, [role='dialog'], div");
      if (c) return c;
    }
  }
  return null;
}

function hideBuiltInAttributesPanel(container) {
  if (!container) return;
  var headings = container.querySelectorAll("h1, h2, h3, h4, h5, [role='heading'], legend, label");
  headings.forEach(function (h) {
    var t = (h.textContent || "").trim().toLowerCase();
    if (t === "attributes") {
      var box = h.closest("section, fieldset, div");
      if (box && box !== container) box.classList.add("mrr-hidden");
    }
  });
}

/* ─────  shared UI helpers  ───── */

/* Pointer-event drag for floating panels. `el` is the panel; `handle` is the
   region the user grabs. Position persists in localStorage under posKey so
   the panel returns to the user's chosen spot after reload / chat switch.
   Drags from inside interactive controls (button/input/select) are ignored. */
function makeDraggable(el, handle, posKey) {
  if (!el || !handle) return;
  var saved = lsGet(posKey);
  if (saved) {
    var pos = safeParse(saved);
    if (pos && typeof pos.left === "number" && typeof pos.top === "number") {
      /* Clamp the restored position to the current viewport so a panel
         saved on a wider monitor / external display doesn't end up
         off-screen on a smaller one. Mirrors the clamp inside the
         pointermove handler (innerWidth - 80, innerHeight - 30) so the
         load-time and drag-time bounds match. */
      var safeLeft = Math.max(0, Math.min(window.innerWidth  - 80, pos.left));
      var safeTop  = Math.max(0, Math.min(window.innerHeight - 30, pos.top));
      el.style.left = safeLeft + "px";
      el.style.top  = safeTop + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
    }
  }
  handle.classList.add("mrr-draggable-handle");

  var dragging = false;
  var startX = 0, startY = 0;
  var startLeft = 0, startTop = 0;
  var pid = null;

  marinara.on(handle, "pointerdown", function (e) {
    if (e.target.closest("button, input, select, textarea, a")) return;
    var rect = el.getBoundingClientRect();
    dragging = true;
    pid = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    try { handle.setPointerCapture(pid); } catch (err) {}
    e.preventDefault();
  });

  marinara.on(handle, "pointermove", function (e) {
    if (!dragging || e.pointerId !== pid) return;
    var nx = startLeft + (e.clientX - startX);
    var ny = startTop  + (e.clientY - startY);
    nx = Math.max(0, Math.min(window.innerWidth  - 80, nx));
    ny = Math.max(0, Math.min(window.innerHeight - 30, ny));
    el.style.left = nx + "px";
    el.style.top  = ny + "px";
    el.style.right  = "auto";
    el.style.bottom = "auto";
  });

  function endDrag(e) {
    if (!dragging) return;
    if (e && e.pointerId !== pid) return;
    dragging = false;
    try { handle.releasePointerCapture(pid); } catch (err) {}
    var rect = el.getBoundingClientRect();
    lsSet(posKey, JSON.stringify({ left: rect.left, top: rect.top }));
  }
  marinara.on(handle, "pointerup",     endDrag);
  marinara.on(handle, "pointercancel", endDrag);
}

/* User-resize for floating panels via native CSS `resize: both`. Persists the
   chosen width/height to localStorage under sizeKey, mirroring makeDraggable.
   The inline `maxHeight` override is load-bearing — the CSS default
   `max-height: 70vh` would otherwise clamp the user's chosen height. Returns
   the ResizeObserver so callers can disconnect it on re-render. */
function makeResizable(el, sizeKey) {
  if (!el || typeof ResizeObserver === "undefined") return null;
  el.style.maxHeight = "calc(100vh - 32px)";

  var saved = safeParse(lsGet(sizeKey));
  if (saved && typeof saved.width === "number" && typeof saved.height === "number") {
    var maxW = window.innerWidth  - 32;
    var maxH = window.innerHeight - 32;
    el.style.width  = Math.min(saved.width,  maxW) + "px";
    el.style.height = Math.min(saved.height, maxH) + "px";
  }

  var firstFire = true;
  var saveTimer = null;
  var ro = new ResizeObserver(function (entries) {
    if (firstFire) { firstFire = false; return; }
    var rect = entries[0].contentRect;
    var w = Math.round(rect.width);
    var h = Math.round(rect.height);
    /* While the sheet is collapsed (display:none), the observer fires with
       zero dims. Persisting that would shrink the user's saved size to 0. */
    if (!w || !h) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      lsSet(sizeKey, JSON.stringify({ width: w, height: h }));
    }, 150);
  });
  ro.observe(el);
  return ro;
}

/* Stepper used by attributes, skills, derived values, derived bars.
   opts: { get(), set(v), min, max, onChange?(v) }. min and max may be
   numbers OR functions returning a number (used by renderBar so the cap
   recomputes from a maxFormula every click instead of being frozen at
   stepper-creation time). */
/* Editable numeric value display. Renders <input type="number"> in place of
   the historical mrr-row__value <span>; clamps to lo/hi (which may be
   functions for live-recomputed bounds like bar maxFormula); commits to the
   model on `change` (Enter or blur) without re-rendering, so the user's
   focus survives a stepper nudge in a sibling row. Returns the input
   element so callers can wire stepper.onChange to update the displayed
   number. afterChange is called after every commit so refreshAllBars can
   pick up cascading changes (typed-damage tracks, autocalc derived). */
function makeEditableValue(parent, getCur, setCur, loF, hiF, afterChange) {
  var input = marinara.addElement(parent, "input", {
    "class": "mrr-row__value mrr-row__value--editable",
    type: "number",
    value: String(getCur()),
    inputMode: "numeric"
  });
  if (!input) return null;
  marinara.on(input, "click", function (e) { if (e && typeof e.stopPropagation === "function") e.stopPropagation(); });
  marinara.on(input, "change", function () {
    var n = parseInt(input.value, 10);
    if (!isFinite(n)) { input.value = String(getCur()); return; }
    var lo = (typeof loF === "function") ? loF() : loF;
    var hi = (typeof hiF === "function") ? hiF() : hiF;
    if (typeof lo === "number" && n < lo) n = lo;
    if (typeof hi === "number" && n > hi) n = hi;
    setCur(n);
    input.value = String(n);
    if (afterChange) afterChange(n);
  });
  return input;
}

/* Append a blank custom skill, then re-render. New rows mirror the
   ruleset-defined skill shape (name + linkedAttribute + value) so they
   participate in dice rolls / autocalc the same way. The renderSheet
   re-render is intentional — the new row's name input must mount before
   the next event so the user can type into it immediately. */
function addCustomSkill() {
  if (!Array.isArray(state.sheet.customSkills)) state.sheet.customSkills = [];
  state.sheet.customSkills.push({ name: "", linkedAttribute: "", value: 0 });
  saveSheet(state.chatId, state.sheet);
  renderSheet();
}

function removeCustomSkill(idx) {
  var arr = state.sheet.customSkills;
  if (!Array.isArray(arr) || idx < 0 || idx >= arr.length) return;
  arr.splice(idx, 1);
  saveSheet(state.chatId, state.sheet);
  renderSheet();
}

function addStepper(parent, opts) {
  var stp = marinara.addElement(parent, "span", { "class": "mrr-stepper" });
  if (!stp) return null;
  var minus = marinara.addElement(stp, "button", { textContent: "-" });
  var plus  = marinara.addElement(stp, "button", { textContent: "+" });
  function resolve(bound, fallback) {
    var v = (typeof bound === "function") ? bound() : bound;
    return (v != null) ? v : fallback;
  }
  function step(delta) {
    var current = opts.get();
    if (typeof current !== "number") current = 0;
    var lo = resolve(opts.min, 0);
    var hi = resolve(opts.max, DEFAULT_SKILL_MAX);
    var next = clamp(current + delta, lo, hi);
    opts.set(next);
    if (opts.onChange) opts.onChange(next);
  }
  if (minus) marinara.on(minus, "click", function () { step(-1); });
  if (plus)  marinara.on(plus,  "click", function () { step( 1); });
  return stp;
}

/* One row in the dice widget. data-mrr-input="key" is what numFromInput reads. */
function diceRow(parent, label, key, def) {
  var r = marinara.addElement(parent, "div", { "class": "mrr-dice__row" });
  if (!r) return null;
  marinara.addElement(r, "label", { textContent: label });
  return marinara.addElement(r, "input", { "class": "mrr-dice__input", type: "number", value: String(def), "data-mrr-input": key });
}

/* "Roll" + "Send to chat" footer for every widget. */
function diceFooter(parent, rollLabel, rollFn) {
  var btnRoll = marinara.addElement(parent, "button", { "class": "mrr-dice__btn", textContent: rollLabel });
  var btnSend = marinara.addElement(parent, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary mrr-dice__btn--row-spaced", textContent: "Send to chat" });
  if (btnRoll) marinara.on(btnRoll, "click", rollFn);
  if (btnSend) marinara.on(btnSend, "click", sendLastRoll);
}

function fillTagTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, function (_m, key) {
    if (values[key] === undefined || values[key] === null) return "";
    return String(values[key]);
  }).replace(/\s+/g, " ").trim();
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ─────  rendering  ───── */

/* Render the XP card between the identity row and the main section
   list. Two layouts driven by ruleset.resolution.mode:
     "single-roll" (D&D, PF2e) — level + current/next + 4px progress bar.
       Next-level threshold and current-level threshold are looked up
       from ruleset.xpTable; if the table is missing or the level is at
       the top, the bar reads as full and the next display falls back
       to sheet.xp.next. The level input is editable so a level-up
       still works without an XP table — the player just types the
       new level.
     "dice-pool" (Exalted, other Storyteller) — current + total earned
       + a "+1 XP" button. Both fields are editable; the button
       increments BOTH fields atomically (current AND total) so a
       session reward shows up in both displays without the player
       having to update each separately. Pool XP is purely an int
       accumulator — no thresholds, no level math.
   Skipped silently when ruleset.resolution.mode is anything else
   (Fate Core uses Fate Points, not XP). */
function renderXpCard(parent) {
  if (!state.sheet || !state.ruleset) return;
  if (!state.sheet.xp || typeof state.sheet.xp !== "object") {
    state.sheet.xp = { current: 0, level: 1, next: 0, total: 0 };
  }
  /* Heal missing fields in case a saved sheet predates Phase 1.B —
     mergeSheet hasn't been taught about xp yet so the load path may
     leave fields undefined. Defaulting in-place here is the
     no-migration alternative. */
  if (typeof state.sheet.xp.current !== "number") state.sheet.xp.current = 0;
  if (typeof state.sheet.xp.level   !== "number") state.sheet.xp.level   = 1;
  if (typeof state.sheet.xp.next    !== "number") state.sheet.xp.next    = 0;
  if (typeof state.sheet.xp.total   !== "number") state.sheet.xp.total   = 0;

  var resMode = state.ruleset.resolution && state.ruleset.resolution.mode;
  if (resMode !== "single-roll" && resMode !== "dice-pool") return;

  var card = marinara.addElement(parent, "div", { "class": "mrr-xp-card" });
  if (!card) return;
  marinara.addElement(card, "div", { "class": "mrr-xp-card__label", textContent: "EXPERIENCE" });

  if (resMode === "single-roll") {
    /* Look up level thresholds from the ruleset's xpTable. Returns 0
       for unknown levels and falls back to sheet.xp.next when the
       table doesn't reach the requested level (homebrew rulesets
       without a table still get a working next-display via the
       editable next field stored on the sheet). */
    function getLevelXp(lvl) {
      var table = state.ruleset.xpTable;
      if (!Array.isArray(table) || !table.length) return 0;
      for (var i = 0; i < table.length; i++) {
        if (table[i] && table[i].level === lvl) {
          return (typeof table[i].xp === "number") ? table[i].xp : 0;
        }
      }
      return 0;
    }
    function getNextXp() {
      var lvl = state.sheet.xp.level || 1;
      var nx = getLevelXp(lvl + 1);
      if (nx > 0) return nx;
      /* Top of the table — use the current level's threshold so the
         bar reads "100%" against itself rather than zero. */
      var cur = getLevelXp(lvl);
      if (cur > 0) return cur;
      return state.sheet.xp.next || 0;
    }
    function computeBarPct() {
      var cur = state.sheet.xp.current || 0;
      var nx  = getNextXp();
      var lo  = getLevelXp(state.sheet.xp.level || 1);
      if (nx <= lo) return 100;
      var pct = ((cur - lo) / (nx - lo)) * 100;
      if (pct < 0) return 0;
      if (pct > 100) return 100;
      return pct;
    }

    var row = marinara.addElement(card, "div", { "class": "mrr-xp-card__row" });

    var lvlGroup = marinara.addElement(row, "div", { "class": "mrr-xp-card__group" });
    marinara.addElement(lvlGroup, "div", { "class": "mrr-xp-card__sub", textContent: "LEVEL" });
    var lvlInput = marinara.addElement(lvlGroup, "input", {
      "class": "mrr-xp-card__input mrr-xp-card__input--lvl",
      type: "number", min: "1", max: "20", step: "1",
      value: String(state.sheet.xp.level)
    });

    var curGroup = marinara.addElement(row, "div", { "class": "mrr-xp-card__group" });
    marinara.addElement(curGroup, "div", { "class": "mrr-xp-card__sub", textContent: "CURRENT" });
    var curInput = marinara.addElement(curGroup, "input", {
      "class": "mrr-xp-card__input",
      type: "number", min: "0", step: "1",
      value: String(state.sheet.xp.current)
    });

    marinara.addElement(row, "span", { "class": "mrr-xp-card__sep", textContent: "/" });

    var nextGroup = marinara.addElement(row, "div", { "class": "mrr-xp-card__group" });
    marinara.addElement(nextGroup, "div", { "class": "mrr-xp-card__sub", textContent: "NEXT" });
    var nextDisplay = marinara.addElement(nextGroup, "div", { "class": "mrr-xp-card__next" });
    if (nextDisplay) nextDisplay.textContent = String(getNextXp());

    var bar = marinara.addElement(card, "div", { "class": "mrr-xp-card__bar" });
    var barFill = marinara.addElement(bar, "div", { "class": "mrr-xp-card__bar-fill" });
    if (barFill) barFill.style.width = computeBarPct() + "%";

    /* Live updates: editing level or current XP refreshes the
       next-display and the bar fill in place — no full sheet
       rebuild — so the user's focus stays on the input they're
       editing. saveSheet uses the existing debounce. */
    if (lvlInput) marinara.on(lvlInput, "input", function () {
      var n = parseInt(lvlInput.value, 10);
      state.sheet.xp.level = (!isNaN(n) && n >= 1) ? n : 1;
      saveSheet(state.chatId, state.sheet);
      if (nextDisplay) nextDisplay.textContent = String(getNextXp());
      if (barFill) barFill.style.width = computeBarPct() + "%";
    });
    if (curInput) marinara.on(curInput, "input", function () {
      var n = parseInt(curInput.value, 10);
      state.sheet.xp.current = (!isNaN(n) && n >= 0) ? n : 0;
      saveSheet(state.chatId, state.sheet);
      if (barFill) barFill.style.width = computeBarPct() + "%";
    });
  } else {
    /* Pool layout — pure int accumulator. Both fields editable; the
       +1 button is the convenient session-reward affordance. The
       button increments BOTH current AND total so a player can fire
       it once per session-reward and the total earned tracks
       independently from how many they've spent. */
    var poolRow = marinara.addElement(card, "div", { "class": "mrr-xp-card__row" });

    var curGroupP = marinara.addElement(poolRow, "div", { "class": "mrr-xp-card__group" });
    marinara.addElement(curGroupP, "div", { "class": "mrr-xp-card__sub", textContent: "CURRENT" });
    var curInputP = marinara.addElement(curGroupP, "input", {
      "class": "mrr-xp-card__input",
      type: "number", min: "0", step: "1",
      value: String(state.sheet.xp.current)
    });

    marinara.addElement(poolRow, "span", { "class": "mrr-xp-card__sep", textContent: "/" });

    var totGroup = marinara.addElement(poolRow, "div", { "class": "mrr-xp-card__group" });
    marinara.addElement(totGroup, "div", { "class": "mrr-xp-card__sub", textContent: "TOTAL EARNED" });
    var totInput = marinara.addElement(totGroup, "input", {
      "class": "mrr-xp-card__input",
      type: "number", min: "0", step: "1",
      value: String(state.sheet.xp.total)
    });

    /* Phase 5 step 5.2: button now sits inside the row alongside the
       fields (prototype anatomy — XpCard component places +1 XP at the
       end of xp-card__row with align-self: flex-end). The previous
       sibling-of-card placement broke off into its own line which
       disagreed with the prototype's compact pool layout. */
    var addBtn = marinara.addElement(poolRow, "button", {
      "class": "mrr-xp-card__add",
      type: "button",
      textContent: "+1 XP"
    });

    if (curInputP) marinara.on(curInputP, "input", function () {
      var n = parseInt(curInputP.value, 10);
      state.sheet.xp.current = (!isNaN(n) && n >= 0) ? n : 0;
      saveSheet(state.chatId, state.sheet);
    });
    if (totInput) marinara.on(totInput, "input", function () {
      var n = parseInt(totInput.value, 10);
      state.sheet.xp.total = (!isNaN(n) && n >= 0) ? n : 0;
      saveSheet(state.chatId, state.sheet);
    });
    if (addBtn) marinara.on(addBtn, "click", function () {
      state.sheet.xp.current = (state.sheet.xp.current || 0) + 1;
      state.sheet.xp.total   = (state.sheet.xp.total   || 0) + 1;
      if (curInputP) curInputP.value = String(state.sheet.xp.current);
      if (totInput)  totInput.value  = String(state.sheet.xp.total);
      saveSheet(state.chatId, state.sheet);
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   Phase 3.1 — row primitives (extracted from sheet.jsx)
   ═══════════════════════════════════════════════════════════════
   Foundation for the renderSheet rewrite. Each primitive translates
   one JSX function from `~/projects/claude-design-updates/sheet.jsx`
   into vanilla-JS DOM-builder form. Signatures match the JSX prop
   contracts in UI-build.md §4 so a Session 3.3 cutover can compose
   them mechanically.

   Naming: `mrr-p3-*` namespace prevents collision with the running
   renderer's existing `.mrr-section` / `.mrr-row` / `.mrr-stepper`
   / `.mrr-bar` classes. A future cutover renames or removes the
   `-p3` infix when this is the only path.

   Caller owns state. Each primitive takes data + callbacks.
   Persistence happens in the caller via saveSheet(). Section's
   open/closed flag is the only on-sheet state the primitive
   touches directly (natural per-section identity).

   Token map (existing → JSX-prototype intent):
     --mrr-accent      → JSX --accent
     --mrr-accent-dim  → JSX --accent-soft
     --mrr-on-accent   → JSX --accent-on
     --mrr-bg-elev     → JSX --bg-input / --bg-elev
     --mrr-text        → JSX --text
     --mrr-text-dim    → JSX --text-dim / --text-faint
     --mrr-success     → JSX --ok
     --mrr-warning     → JSX --warn
     --mrr-fail        → JSX --bad
     --mrr-mono        → JSX --mono
   Density values inlined as cozy defaults (12/8/30/13) since
   --density-* tokens don't exist on the extension yet. The token
   migration phase will swap these.
   ═══════════════════════════════════════════════════════════════ */

function mrrP3Clamp(v, min, max) {
  if (typeof min === "number" && v < min) v = min;
  if (typeof max === "number" && v > max) v = max;
  return v;
}

/* renderSection — collapsible card matching sheet.jsx:17.
   opts: { id?, title, count?, defaultOpen?, actions?, right? }
     id          — string used to key open/closed state in
                   state.sheet.sectionCollapse[id]; omit for stateless.
     title       — section header text (e.g. "SKILLS").
     count       — optional integer badge after title.
     defaultOpen — defaults to true.
     actions     — optional HTMLElement appended into header
                   (clicks on actions don't toggle the section).
     right       — optional HTMLElement at far right of header.
   bodyFn(bodyEl) — called once with the body container so the
                    caller can populate rows without holding a ref.
   Returns { card, head, body } so callers can attach refs. */
function mrrP3RenderSection(parent, opts, bodyFn) {
  if (!parent) return null;
  opts = opts || {};
  var id = opts.id || "";
  var collapseMap = state.sheet && state.sheet.sectionCollapse;
  var defaultOpen = (opts.defaultOpen !== false);
  var open = defaultOpen;
  if (id && collapseMap && typeof collapseMap[id] === "boolean") {
    open = !collapseMap[id]; /* stored flag is "collapsed" — invert */
  }
  var card = marinara.addElement(parent, "div", {
    "class": "mrr-p3-section" + (open ? " mrr-p3-section--open" : "")
  });
  if (!card) return null;
  var head = marinara.addElement(card, "div", { "class": "mrr-p3-section__head" });
  if (!head) return null;
  if (opts.title != null) {
    marinara.addElement(head, "span", {
      "class": "mrr-p3-section__title",
      textContent: String(opts.title)
    });
  }
  if (opts.count != null) {
    marinara.addElement(head, "span", {
      "class": "mrr-p3-section__count",
      textContent: String(opts.count)
    });
  }
  if (opts.actions instanceof HTMLElement) {
    var actSpan = marinara.addElement(head, "span", { "class": "mrr-p3-section__actions" });
    if (actSpan) {
      actSpan.appendChild(opts.actions);
      actSpan.addEventListener("click", function (e) { e.stopPropagation(); });
    }
  }
  if (opts.right instanceof HTMLElement) {
    var rt = marinara.addElement(head, "span", { "class": "mrr-p3-section__right" });
    if (rt) {
      rt.appendChild(opts.right);
      rt.addEventListener("click", function (e) { e.stopPropagation(); });
    }
  }
  marinara.addElement(head, "span", {
    "class": "mrr-p3-section__chev",
    textContent: "›" /* › */
  });
  var body = marinara.addElement(card, "div", { "class": "mrr-p3-section__body" });
  if (!body) return null;
  /* Defensive inline display: belt + suspenders against the embedded
     CSS string and the live host stylesheet ever disagreeing during a
     hot-reload. The class-based rule still applies; this just
     guarantees the body shows when `open` is true regardless of which
     stylesheet wins specificity. */
  body.style.display = open ? "flex" : "none";
  body.style.flexDirection = "column";
  body.style.gap = "8px";
  /* Click handler attached BEFORE bodyFn so a bodyFn exception
     doesn't strand the user on a section they can't toggle. Toggle
     in-place via class + inline display rather than calling
     renderSheet — full DOM rebuild loses scroll position (the user-
     reported "page jumps to top" issue) AND fires the agent-prompt
     sync pipeline on every click. CSS-only toggle keeps the user's
     scroll position and the section state persists via saveSheet
     for the sectionCollapse map. */
  head.addEventListener("click", function () {
    if (!id) return;
    if (!state.sheet.sectionCollapse) state.sheet.sectionCollapse = {};
    open = !open;
    state.sheet.sectionCollapse[id] = !open; /* stored flag is "collapsed" */
    if (card.classList) {
      if (open) card.classList.add("mrr-p3-section--open");
      else card.classList.remove("mrr-p3-section--open");
    }
    body.style.display = open ? "flex" : "none";
    saveSheet(state.chatId, state.sheet);
  });
  if (typeof bodyFn === "function") {
    try {
      bodyFn(body);
    } catch (e) {
      var errMsg = (e && e.message) ? e.message : String(e);
      warn("mrrP3 renderSection bodyFn failed for id='" + id + "':", errMsg, e && e.stack);
      /* Surface the error visibly so a silent body becomes a visible
         "render error" rather than a missing section. Phase 3 is
         experimental — make failures observable. */
      var errEl = marinara.addElement(body, "div", { "class": "mrr-p3-section__error" });
      if (errEl) {
        errEl.textContent = "⚠ " + errMsg;
        errEl.style.color = "var(--mrr-warning)";
        errEl.style.fontFamily = "var(--mrr-mono)";
        errEl.style.fontSize = "11px";
        errEl.style.padding = "8px 12px";
      }
    }
  }
  return { card: card, head: head, body: body };
}

/* renderStepper — −/+ buttons matching sheet.jsx:34.
   opts: { value, min?, max?, onChange }
   Stateless — caller supplies value, primitive calls onChange with
   the clamped result on each press. */
function mrrP3RenderStepper(parent, opts) {
  if (!parent || !opts) return null;
  var span = marinara.addElement(parent, "span", { "class": "mrr-p3-stepper" });
  if (!span) return null;
  var minus = marinara.addElement(span, "button", {
    type: "button",
    textContent: "−" /* − */
  });
  var plus = marinara.addElement(span, "button", {
    type: "button",
    textContent: "+"
  });
  if (minus) {
    minus.addEventListener("click", function (e) {
      e.preventDefault();
      var v = (typeof opts.value === "number" ? opts.value : 0) - 1;
      if (typeof opts.onChange === "function") opts.onChange(mrrP3Clamp(v, opts.min, opts.max));
    });
  }
  if (plus) {
    plus.addEventListener("click", function (e) {
      e.preventDefault();
      var v = (typeof opts.value === "number" ? opts.value : 0) + 1;
      if (typeof opts.onChange === "function") opts.onChange(mrrP3Clamp(v, opts.min, opts.max));
    });
  }
  return { el: span, minus: minus, plus: plus };
}

/* renderAttrRow — attribute row (STR 14, DEX 16) matching sheet.jsx:44.
   opts: { name, abbr, value, modifier?, min?, max?, onChange, onRoll? }
   Grid: 1fr auto auto auto auto (5 cols — `mrr-p3-row--attr` modifier).
   Slots: name+abbr · numeric input · modifier (e.g. "+2") · stepper · Roll.
   The modifier slot collapses (no element) when undefined/null. */
function mrrP3RenderAttrRow(parent, opts) {
  if (!parent || !opts) return null;
  var row = marinara.addElement(parent, "div", { "class": "mrr-p3-row mrr-p3-row--attr" });
  if (!row) return null;
  var nameSlot = marinara.addElement(row, "div", { "class": "mrr-p3-row__name" });
  if (nameSlot) {
    nameSlot.textContent = String(opts.name || "");
    if (opts.abbr) {
      marinara.addElement(nameSlot, "span", {
        "class": "mrr-p3-row__abbr",
        textContent: String(opts.abbr)
      });
    }
  }
  var input = marinara.addElement(row, "input", {
    "class": "mrr-p3-row__val",
    type: "number"
  });
  if (input) {
    input.value = (typeof opts.value === "number") ? String(opts.value) : "";
    input.addEventListener("change", function () {
      var n = parseInt(input.value, 10);
      if (isNaN(n)) n = 0;
      if (typeof opts.onChange === "function") opts.onChange(mrrP3Clamp(n, opts.min, opts.max));
    });
  }
  if (opts.modifier !== undefined && opts.modifier !== null) {
    marinara.addElement(row, "div", {
      "class": "mrr-p3-row__mod",
      textContent: (opts.modifier >= 0 ? "+" : "") + String(opts.modifier)
    });
  }
  mrrP3RenderStepper(row, {
    value: opts.value,
    min: opts.min, max: opts.max,
    onChange: opts.onChange
  });
  var roll = marinara.addElement(row, "button", {
    type: "button",
    "class": "mrr-p3-row__roll mrr-p3-row__roll--sm",
    textContent: "Roll"
  });
  if (roll && typeof opts.onRoll === "function") {
    roll.addEventListener("click", function (e) {
      e.preventDefault();
      opts.onRoll(opts.name, opts.value, opts.modifier);
    });
  }
  return { row: row, input: input, roll: roll };
}

/* renderSkillRow — skill row matching sheet.jsx:60.
   opts: {
     skill: { name, attr? },
     tier, tiers, tierLabel?,
     value, attrMod?, gearBonus?, tierBonus?,
     autoCalc?, kindLabel?,
     specialties?, allowSpecialties?, specialtyBonus?,
     onTier, onValue, onRoll,
     onAddSpecialty?, onRemoveSpecialty?, onDelete?
   }
   AutoCalc: total = attrMod + tierBonus + gearBonus + value (manual extra)
   When autoCalc is off, the manual value column is editable and
   total = attrMod + value + gearBonus. */
function mrrP3RenderSkillRow(parent, opts) {
  if (!parent || !opts || !opts.skill) return null;
  var sign = function (n) { return (n >= 0 ? "+" : "") + n; };
  var attrMod = (typeof opts.attrMod === "number") ? opts.attrMod : 0;
  var gearBonus = (typeof opts.gearBonus === "number") ? opts.gearBonus : 0;
  var tierBonus = (typeof opts.tierBonus === "number") ? opts.tierBonus : 0;
  var value = (typeof opts.value === "number") ? opts.value : 0;
  var totalBonus = opts.autoCalc
    ? attrMod + tierBonus + gearBonus + value
    : attrMod + value + gearBonus;

  var row = marinara.addElement(parent, "div", { "class": "mrr-p3-row mrr-p3-row--skill" });
  if (!row) return null;
  var main = marinara.addElement(row, "div", { "class": "mrr-p3-row__main" });
  if (!main) return null;

  /* Top line: name + attr abbr + kind label + gear pill + spec toggle + delete. */
  var nameSlot = marinara.addElement(main, "div", { "class": "mrr-p3-row__name" });
  if (nameSlot) {
    nameSlot.textContent = String(opts.skill.name || "");
    if (opts.skill.attr) {
      marinara.addElement(nameSlot, "span", {
        "class": "mrr-p3-row__abbr",
        textContent: String(opts.skill.attr)
      });
    }
    if (opts.kindLabel) {
      marinara.addElement(nameSlot, "span", {
        "class": "mrr-p3-row__kind",
        textContent: String(opts.kindLabel)
      });
    }
    if (gearBonus !== 0) {
      marinara.addElement(nameSlot, "span", {
        "class": "mrr-p3-row__gear",
        title: "Gear bonus " + sign(gearBonus),
        textContent: sign(gearBonus)
      });
    }
  }

  /* Specialty editor — hidden by default; spec-toggle reveals it.
     Declared here (before the toggle button) so the toggle's
     handler can reference it via closure. */
  var editor = null;
  var specToggle = null;
  if (opts.allowSpecialties && typeof opts.onAddSpecialty === "function") {
    specToggle = marinara.addElement(nameSlot, "button", {
      type: "button",
      "class": "mrr-p3-row__spec-toggle",
      title: "Add a specialty"
    });
    if (specToggle) {
      var specCount = Array.isArray(opts.specialties) ? opts.specialties.length : 0;
      specToggle.textContent = specCount > 0 ? ("★ " + specCount) : "+ spec";
    }
  }
  if (typeof opts.onDelete === "function") {
    var del = marinara.addElement(nameSlot, "button", {
      type: "button",
      "class": "mrr-p3-row__del",
      title: "Remove this entry",
      textContent: "×" /* × */
    });
    if (del) {
      del.addEventListener("click", function (e) {
        e.stopPropagation();
        opts.onDelete();
      });
    }
  }

  /* Specialty chips row — Exalted-style; click rolls with the
     specialty bonus folded into the dice pool. */
  if (Array.isArray(opts.specialties) && opts.specialties.length > 0) {
    var specsRow = marinara.addElement(main, "div", { "class": "mrr-p3-row__specs" });
    if (specsRow) {
      opts.specialties.forEach(function (sp, i) {
        if (!sp) return;
        var dice = (typeof sp.dice === "number") ? sp.dice : (typeof opts.specialtyBonus === "number" ? opts.specialtyBonus : 1);
        var chip = marinara.addElement(specsRow, "button", {
          type: "button",
          "class": "mrr-p3-spec-chip",
          title: "Roll with " + String(sp.name || "") + " (+" + dice + ")"
        });
        if (!chip) return;
        marinara.addElement(chip, "span", {
          "class": "mrr-p3-spec-chip__name",
          textContent: String(sp.name || "")
        });
        marinara.addElement(chip, "span", {
          "class": "mrr-p3-spec-chip__dice",
          textContent: "+" + dice
        });
        chip.addEventListener("click", function () {
          if (typeof opts.onRoll === "function") {
            opts.onRoll(opts.skill.name + " (" + String(sp.name || "") + ")", value + gearBonus + dice, attrMod);
          }
        });
        if (typeof opts.onRemoveSpecialty === "function") {
          var x = marinara.addElement(chip, "span", {
            "class": "mrr-p3-spec-chip__x",
            textContent: "×"
          });
          if (x) {
            x.addEventListener("click", function (e) {
              e.stopPropagation();
              opts.onRemoveSpecialty(i);
            });
          }
        }
      });
    }
  }

  /* Inline editor for adding new specialties — display:none unless
     toggled open via the spec-toggle button. */
  if (opts.allowSpecialties && typeof opts.onAddSpecialty === "function") {
    editor = marinara.addElement(main, "div", {
      "class": "mrr-p3-row__spec-editor",
      style: "display: none"
    });
    if (editor) {
      var specInput = marinara.addElement(editor, "input", {
        "class": "mrr-p3-row__spec-input",
        type: "text",
        placeholder: "Specialty name (e.g. Daiklaves, Thrones, Crowds)"
      });
      var addBtn = marinara.addElement(editor, "button", {
        type: "button",
        "class": "mrr-p3-row__spec-add",
        textContent: "Add"
      });
      var doneBtn = marinara.addElement(editor, "button", {
        type: "button",
        "class": "mrr-p3-row__spec-done",
        textContent: "Done"
      });
      var commitSpec = function () {
        var v = (specInput && typeof specInput.value === "string") ? specInput.value.trim() : "";
        if (!v) return;
        opts.onAddSpecialty({
          name: v,
          dice: (typeof opts.specialtyBonus === "number") ? opts.specialtyBonus : 1
        });
        if (specInput) specInput.value = "";
      };
      if (specInput) {
        specInput.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            commitSpec();
          }
        });
      }
      if (addBtn) {
        addBtn.addEventListener("click", function (e) {
          e.preventDefault();
          commitSpec();
        });
      }
      if (doneBtn) {
        doneBtn.addEventListener("click", function (e) {
          e.preventDefault();
          editor.style.display = "none";
        });
      }
    }
    if (specToggle) {
      specToggle.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!editor) return;
        editor.style.display = (editor.style.display === "none") ? "" : "none";
      });
    }
  }

  /* Tier pill — clickable to cycle through opts.tiers. */
  var tier = opts.tier || (Array.isArray(opts.tiers) && opts.tiers[0]) || "";
  var tiers = Array.isArray(opts.tiers) ? opts.tiers : [];
  var tierTitle = ((opts.tierLabel && opts.tierLabel[tier]) || String(tier)) + " — click to cycle proficiency";
  var tierPill = marinara.addElement(row, "button", {
    type: "button",
    "class": "mrr-p3-tier mrr-p3-tier--" + String(tier),
    textContent: String(tier),
    title: tierTitle
  });
  if (tierPill && typeof opts.onTier === "function" && tiers.length > 0) {
    tierPill.addEventListener("click", function (e) {
      e.preventDefault();
      var idx = tiers.indexOf(tier);
      var nextTier = tiers[(idx + 1) % tiers.length];
      opts.onTier(nextTier);
    });
  }

  /* Bonus / value column — auto-calc pill OR editable manual input. */
  if (opts.autoCalc) {
    var pill = marinara.addElement(row, "span", {
      "class": "mrr-p3-row__val mrr-p3-row__val--auto mrr-p3-save__bonus",
      textContent: sign(totalBonus)
    });
    if (pill) {
      var tipParts = [];
      if (opts.skill.attr) tipParts.push(opts.skill.attr + " mod " + sign(attrMod));
      tipParts.push("tier " + sign(tierBonus));
      if (gearBonus) tipParts.push("gear " + sign(gearBonus));
      if (value) tipParts.push("extra " + sign(value));
      pill.title = tipParts.join(" + ");
    }
  } else {
    var manual = marinara.addElement(row, "input", {
      "class": "mrr-p3-row__val",
      type: "number"
    });
    if (manual) {
      manual.value = String(value);
      manual.addEventListener("change", function () {
        var n = parseInt(manual.value, 10);
        if (isNaN(n)) n = 0;
        if (typeof opts.onValue === "function") opts.onValue(n);
      });
    }
  }

  /* Roll button. AutoCalc rolls the computed total; manual mode
     rolls value + gearBonus with attrMod as a separate kicker per
     the existing engine convention. */
  var rollBtn = marinara.addElement(row, "button", {
    type: "button",
    "class": "mrr-p3-row__roll",
    textContent: "Roll"
  });
  if (rollBtn && typeof opts.onRoll === "function") {
    rollBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (opts.autoCalc) opts.onRoll(opts.skill.name, totalBonus, 0);
      else                opts.onRoll(opts.skill.name, value + gearBonus, attrMod);
    });
  }
  return { row: row };
}

/* renderSaveRow — saving throw row matching sheet.jsx:132.
   opts: { save: {name, attr?}, tier, tiers, tierLabel?, attrMod, totalBonus, onTier, onRoll }
   Always auto-calc; total bonus is computed by caller (so the same
   primitive serves D&D ability_mod+prof and PF2e tier+stat). */
function mrrP3RenderSaveRow(parent, opts) {
  if (!parent || !opts || !opts.save) return null;
  var row = marinara.addElement(parent, "div", { "class": "mrr-p3-row mrr-p3-row--save" });
  if (!row) return null;
  var totalBonus = (typeof opts.totalBonus === "number") ? opts.totalBonus : 0;
  var attrMod = (typeof opts.attrMod === "number") ? opts.attrMod : 0;
  var sign = (totalBonus >= 0) ? "+" : "";
  var nameSlot = marinara.addElement(row, "div", { "class": "mrr-p3-row__name" });
  if (nameSlot) {
    nameSlot.textContent = String(opts.save.name || "");
    if (opts.save.attr) {
      marinara.addElement(nameSlot, "span", {
        "class": "mrr-p3-row__abbr",
        textContent: String(opts.save.attr)
      });
    }
  }
  var tier = opts.tier || "";
  var tiers = Array.isArray(opts.tiers) ? opts.tiers : [];
  var tierTitle = ((opts.tierLabel && opts.tierLabel[tier]) || String(tier)) + " — click to cycle";
  var tierPill = marinara.addElement(row, "button", {
    type: "button",
    "class": "mrr-p3-tier mrr-p3-tier--" + String(tier),
    textContent: String(tier),
    title: tierTitle
  });
  if (tierPill && typeof opts.onTier === "function" && tiers.length > 0) {
    tierPill.addEventListener("click", function (e) {
      e.preventDefault();
      var idx = tiers.indexOf(tier);
      var nextTier = tiers[(idx + 1) % tiers.length];
      opts.onTier(nextTier);
    });
  }
  var pill = marinara.addElement(row, "span", {
    "class": "mrr-p3-row__val mrr-p3-row__val--auto mrr-p3-save__bonus",
    textContent: sign + String(totalBonus)
  });
  if (pill && opts.save.attr) {
    pill.title = opts.save.attr + " mod " + (attrMod >= 0 ? "+" : "") + attrMod + " + proficiency";
  }
  var rollBtn = marinara.addElement(row, "button", {
    type: "button",
    "class": "mrr-p3-row__roll",
    textContent: "Save"
  });
  if (rollBtn && typeof opts.onRoll === "function") {
    rollBtn.addEventListener("click", function (e) {
      e.preventDefault();
      opts.onRoll(String(opts.save.name || "Save") + " save", totalBonus, 0);
    });
  }
  return { row: row };
}

/* renderBar — resource bar (HP / Motes / Willpower) matching sheet.jsx:149.
   opts: { name, current, max, fillVariant?, onCurrent, onMax, quick? }
   Auto-color: ratio < 0.3 → bad, < 0.65 → warn, else ok.
   `fillVariant` overrides the auto-color choice.
   `quick` is an array of `{ label, delta }` quick-button definitions. */
function mrrP3RenderBar(parent, opts) {
  if (!parent || !opts) return null;
  var current = (typeof opts.current === "number") ? opts.current : 0;
  var max = (typeof opts.max === "number") ? opts.max : 0;
  var pct = (max > 0) ? mrrP3Clamp((current / max) * 100, 0, 100) : 0;
  var ratio = (max > 0) ? (current / max) : 0;
  var auto = (ratio < 0.3) ? "bad" : ((ratio < 0.65) ? "warn" : "ok");
  var fill = opts.fillVariant || auto;
  var bar = marinara.addElement(parent, "div", { "class": "mrr-p3-bar" });
  if (!bar) return null;
  var top = marinara.addElement(bar, "div", { "class": "mrr-p3-bar__top" });
  if (top) {
    marinara.addElement(top, "span", {
      "class": "mrr-p3-bar__name",
      textContent: String(opts.name || "")
    });
    var values = marinara.addElement(top, "span", { "class": "mrr-p3-bar__values" });
    if (values) {
      var curIn = marinara.addElement(values, "input", {
        "class": "mrr-p3-bar__val-input",
        type: "number"
      });
      if (curIn) {
        curIn.value = String(current);
        curIn.addEventListener("change", function () {
          var n = parseInt(curIn.value, 10);
          if (isNaN(n)) n = 0;
          if (typeof opts.onCurrent === "function") opts.onCurrent(mrrP3Clamp(n, 0, max));
        });
      }
      marinara.addElement(values, "span", {
        "class": "mrr-p3-bar__sep",
        textContent: "/"
      });
      var maxIn = marinara.addElement(values, "input", {
        "class": "mrr-p3-bar__val-input",
        type: "number"
      });
      if (maxIn) {
        maxIn.value = String(max);
        maxIn.addEventListener("change", function () {
          var n = parseInt(maxIn.value, 10);
          if (isNaN(n)) n = 0;
          if (typeof opts.onMax === "function") opts.onMax(n);
        });
      }
    }
  }
  var trackEl = marinara.addElement(bar, "div", { "class": "mrr-p3-bar__track" });
  if (trackEl) {
    var fillEl = marinara.addElement(trackEl, "div", {
      "class": "mrr-p3-bar__fill mrr-p3-bar__fill--" + fill
    });
    if (fillEl) fillEl.style.width = pct + "%";
  }
  if (Array.isArray(opts.quick) && opts.quick.length > 0) {
    var quickRow = marinara.addElement(bar, "div", { "class": "mrr-p3-bar__quick" });
    if (quickRow) {
      opts.quick.forEach(function (q) {
        if (!q || typeof q.delta !== "number") return;
        var btn = marinara.addElement(quickRow, "button", {
          type: "button",
          textContent: String(q.label != null ? q.label : "")
        });
        if (btn) {
          btn.addEventListener("click", function (e) {
            e.preventDefault();
            if (typeof opts.onCurrent === "function") {
              opts.onCurrent(mrrP3Clamp(current + q.delta, 0, max));
            }
          });
        }
      });
    }
  }
  return { bar: bar };
}

/* renderDamageTrack — Exalted damage track matching sheet.jsx:180.
   opts: { track: {name, levels[], filled[]}, onCellClick, onAddBox, onRemoveBox, onHeal }
   Counts B/L/A from track.filled and renders a summary chip.
   Each level cell click cycles B → L → A → clear (caller owns
   the cycle logic; primitive just emits the index). */
function mrrP3RenderDamageTrack(parent, opts) {
  if (!parent || !opts || !opts.track) return null;
  var track = opts.track;
  var levels = Array.isArray(track.levels) ? track.levels : [];
  var filled = Array.isArray(track.filled) ? track.filled : [];
  var counts = { B: 0, L: 0, A: 0 };
  filled.forEach(function (f) {
    if (f && f.type && counts[f.type] != null) counts[f.type] += 1;
  });
  var bar = marinara.addElement(parent, "div", { "class": "mrr-p3-bar mrr-p3-bar--damage" });
  if (!bar) return null;
  var top = marinara.addElement(bar, "div", { "class": "mrr-p3-bar__top" });
  if (top) {
    marinara.addElement(top, "span", {
      "class": "mrr-p3-bar__name",
      textContent: String(track.name || "")
    });
    var summary = "";
    if (counts.B) summary += counts.B + "B ";
    if (counts.L) summary += counts.L + "L ";
    if (counts.A) summary += counts.A + "A";
    if (!counts.B && !counts.L && !counts.A) summary = "B · L · A";
    marinara.addElement(top, "span", {
      "class": "mrr-p3-bar__values mrr-p3-bar__values--track",
      textContent: summary
    });
  }
  var trackEl = marinara.addElement(bar, "div", { "class": "mrr-p3-track" });
  if (trackEl) {
    levels.forEach(function (penalty, i) {
      var f = filled[i];
      var cls = "mrr-p3-cell" + (f && f.type ? (" mrr-p3-cell--" + f.type) : "");
      var cell = marinara.addElement(trackEl, "button", {
        type: "button",
        "class": cls,
        title: String(penalty) + " — click cycles B→L→A→clear",
        textContent: (f && f.type) ? f.type : String(penalty)
      });
      if (cell && typeof opts.onCellClick === "function") {
        cell.addEventListener("click", function (e) {
          e.preventDefault();
          opts.onCellClick(i);
        });
      }
    });
  }
  var tools = marinara.addElement(bar, "div", { "class": "mrr-p3-track-tools" });
  if (tools) {
    var addGroup = marinara.addElement(tools, "div", { "class": "mrr-p3-track-tools__group" });
    if (addGroup) {
      marinara.addElement(addGroup, "span", {
        "class": "mrr-p3-track-tools__label",
        textContent: "add"
      });
      ["-0", "-1", "-2"].forEach(function (label) {
        var b = marinara.addElement(addGroup, "button", {
          type: "button",
          "class": "mrr-p3-track-tools__add",
          title: "Add a " + label + " box",
          textContent: label
        });
        if (b && typeof opts.onAddBox === "function") {
          b.addEventListener("click", function (e) {
            e.preventDefault();
            opts.onAddBox(label);
          });
        }
      });
      var minusBtn = marinara.addElement(addGroup, "button", {
        type: "button",
        "class": "mrr-p3-track-tools__add",
        title: "Remove last (non-Inc) box",
        textContent: "−"
      });
      if (minusBtn && typeof opts.onRemoveBox === "function") {
        minusBtn.addEventListener("click", function (e) {
          e.preventDefault();
          opts.onRemoveBox();
        });
      }
    }
    var healGroup = marinara.addElement(tools, "div", { "class": "mrr-p3-track-tools__group" });
    if (healGroup) {
      var anyDamage = !!(counts.B || counts.L || counts.A);
      var healWorst = marinara.addElement(healGroup, "button", {
        type: "button",
        "class": "mrr-p3-track-tools__heal",
        title: "Heal worst-severity wound",
        textContent: "Heal worst"
      });
      if (healWorst) {
        healWorst.disabled = !anyDamage;
        if (typeof opts.onHeal === "function") {
          healWorst.addEventListener("click", function (e) {
            e.preventDefault();
            opts.onHeal("worst");
          });
        }
      }
      var healAll = marinara.addElement(healGroup, "button", {
        type: "button",
        "class": "mrr-p3-track-tools__heal",
        title: "Clear all damage",
        textContent: "Heal all"
      });
      if (healAll) {
        healAll.disabled = !anyDamage;
        if (typeof opts.onHeal === "function") {
          healAll.addEventListener("click", function (e) {
            e.preventDefault();
            opts.onHeal("all");
          });
        }
      }
    }
  }
  return { bar: bar };
}

/* End Phase 3.1 row primitives. */

/* ═══════════════════════════════════════════════════════════════
   Phase 3.2 — panel-frame factory (port of panel-frame.jsx)
   ═══════════════════════════════════════════════════════════════
   Standalone vanilla-JS port of the JSX prototype's DraggablePanel
   component. Creates a floating panel with drag-from-head, 8 resize
   handles (4 edges + 4 corners), localStorage position/size
   persistence, and viewport re-clamp on window resize.

   Phase 3.3's mrrP3RenderSheet currently REUSES the existing
   .mrr-sheet shell + makeDraggable/makeResizable mechanism so toggling
   the renderer doesn't disturb the user's saved sheet position. This
   factory is here for future Session 3.4+ work — alternate dialog
   chrome (InvEditForm flyout, BackpackFlyout, SpellbookFlyout) where
   spawning a fresh draggable panel is appropriate.

   opts:
     storageKey?  — localStorage key for {x, y, w, h}; omit for ephemeral
     defaultPos?  — { x, y } (default 16/64)
     defaultSize? — { w, h } (default 360/640)
     minSize?     — { w, h } (default 280/240)
     className?   — extra class on the panel root
     title?       — string for the .mrr-p3-panel__title slot
     titleMeta?   — secondary text in .mrr-p3-panel__title-meta
     onClose?     — callback when × button clicked

   Returns { panel, head, body, dispose } so callers can populate body
   and clean up event listeners on close.
   ═══════════════════════════════════════════════════════════════ */
function mrrP3CreatePanel(parent, opts) {
  if (!parent) return null;
  opts = opts || {};
  var defPos  = opts.defaultPos  || { x: 16, y: 64 };
  var defSize = opts.defaultSize || { w: 360, h: 640 };
  var minSize = opts.minSize     || { w: 280, h: 240 };
  var storageKey = opts.storageKey || "";

  /* Initial box: try persisted state, else clamp default to viewport
     so the panel never spawns offscreen even on small displays. */
  var box = null;
  if (storageKey) {
    try {
      var raw = localStorage.getItem(storageKey);
      if (raw) box = JSON.parse(raw);
    } catch (e) {}
  }
  if (!box || typeof box.x !== "number") {
    var ivw = window.innerWidth, ivh = window.innerHeight;
    box = {
      x: Math.min(defPos.x, ivw - defSize.w - 16),
      y: Math.min(defPos.y, ivh - 80),
      w: Math.min(defSize.w, ivw - 32),
      h: Math.min(defSize.h, ivh - 96)
    };
  }

  function persist() {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(box)); } catch (e) {}
  }
  function applyBox() {
    if (!panel) return;
    panel.style.left   = box.x + "px";
    panel.style.top    = box.y + "px";
    panel.style.width  = box.w + "px";
    panel.style.height = box.h + "px";
  }

  var className = "mrr-p3-panel" + (opts.className ? " " + opts.className : "");
  var panel = marinara.addElement(parent, "div", { "class": className });
  if (!panel) return null;

  /* Head (title + meta + close) — drag handle */
  var head = marinara.addElement(panel, "div", { "class": "mrr-p3-panel__head" });
  if (head) {
    if (opts.title) {
      marinara.addElement(head, "span", {
        "class": "mrr-p3-panel__title",
        textContent: String(opts.title)
      });
    }
    if (opts.titleMeta) {
      marinara.addElement(head, "span", {
        "class": "mrr-p3-panel__title-meta",
        textContent: String(opts.titleMeta)
      });
    }
    if (typeof opts.onClose === "function") {
      var close = marinara.addElement(head, "button", {
        type: "button",
        "class": "mrr-p3-panel__close",
        title: "Close",
        textContent: "×"
      });
      if (close) {
        close.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          opts.onClose();
        });
      }
    }
  }

  /* Body slot — caller populates this */
  var body = marinara.addElement(panel, "div", { "class": "mrr-p3-panel__body" });

  /* Resize handles: 4 edges + 4 corners. The SE handle gets a small
     SVG glyph so the affordance is visible at the corner. */
  var dirs = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
  for (var di = 0; di < dirs.length; di++) {
    (function (d) {
      var rh = marinara.addElement(panel, "div", {
        "class": "mrr-p3-panel__resize mrr-p3-panel__resize--" + d
      });
      if (!rh) return;
      if (d === "se") {
        rh.innerHTML = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M11 1 L1 11 M11 5 L5 11 M11 9 L9 11" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round"/></svg>';
      }
      rh.addEventListener("pointerdown", makeResizeHandler(d));
    })(dirs[di]);
  }

  /* Drag from head — ignore drags from buttons / inputs / selects /
     textareas inside the head (so the close button still clicks). */
  var dragStart = null;
  function onDragDown(e) {
    var t = e.target;
    if (t && t.closest && t.closest("button, input, select, textarea")) return;
    dragStart = { px: e.clientX, py: e.clientY, x: box.x, y: box.y };
    e.preventDefault();
    window.addEventListener("pointermove", onDragMove);
    window.addEventListener("pointerup", onDragUp);
  }
  function onDragMove(e) {
    if (!dragStart) return;
    var dx = e.clientX - dragStart.px;
    var dy = e.clientY - dragStart.py;
    var vw = window.innerWidth, vh = window.innerHeight;
    box.x = Math.max(0, Math.min(dragStart.x + dx, vw - 80));
    box.y = Math.max(0, Math.min(dragStart.y + dy, vh - 50));
    applyBox();
  }
  function onDragUp() {
    dragStart = null;
    persist();
    window.removeEventListener("pointermove", onDragMove);
    window.removeEventListener("pointerup", onDragUp);
  }
  if (head) head.addEventListener("pointerdown", onDragDown);

  /* Resize handler factory — captures direction + initial box on
     pointerdown, then mutates box during pointermove. Persists once
     on pointerup so partial drags don't litter localStorage. */
  function makeResizeHandler(dir) {
    return function (e) {
      e.preventDefault();
      e.stopPropagation();
      var startBox = { px: e.clientX, py: e.clientY, x: box.x, y: box.y, w: box.w, h: box.h };
      function onMove(ev) {
        var dx = ev.clientX - startBox.px;
        var dy = ev.clientY - startBox.py;
        var x = startBox.x, y = startBox.y, w = startBox.w, h = startBox.h;
        if (dir.indexOf("e") >= 0) w = Math.max(minSize.w, startBox.w + dx);
        if (dir.indexOf("s") >= 0) h = Math.max(minSize.h, startBox.h + dy);
        if (dir.indexOf("w") >= 0) {
          var newW = Math.max(minSize.w, startBox.w - dx);
          x = startBox.x + (startBox.w - newW);
          w = newW;
        }
        if (dir.indexOf("n") >= 0) {
          var newH = Math.max(minSize.h, startBox.h - dy);
          y = startBox.y + (startBox.h - newH);
          h = newH;
        }
        var vw = window.innerWidth, vh = window.innerHeight;
        w = Math.min(w, vw - x);
        h = Math.min(h, vh - y);
        box.x = x; box.y = y; box.w = w; box.h = h;
        applyBox();
      }
      function onUp() {
        persist();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
  }

  /* Re-clamp on window resize so the panel stays visible. */
  function onWindowResize() {
    var vw = window.innerWidth, vh = window.innerHeight;
    box.w = Math.min(box.w, vw - 16);
    box.h = Math.min(box.h, vh - 16);
    box.x = Math.max(0, Math.min(box.x, vw - 80));
    box.y = Math.max(0, Math.min(box.y, vh - 60));
    applyBox();
    persist();
  }
  window.addEventListener("resize", onWindowResize);

  /* Cleanup so callers can dispose without leaking listeners. */
  function dispose() {
    window.removeEventListener("resize", onWindowResize);
    if (head) head.removeEventListener("pointerdown", onDragDown);
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
  }

  applyBox();

  return { panel: panel, head: head, body: body, dispose: dispose };
}

/* ═══════════════════════════════════════════════════════════════
   Phase 3.3 — body cutover (parallel mrrP3RenderSheet behind a flag)
   ═══════════════════════════════════════════════════════════════
   The classic renderSheet's entry point dispatches to mrrP3RenderSheet
   when state.sheet.useNewRenderer is true. The new path REUSES the
   existing .mrr-sheet shell + makeDraggable/makeResizable so toggling
   doesn't disturb the saved panel position; it only swaps section
   bodies that have been migrated. Un-migrated sections still render
   via the classic renderXxx so the sheet stays fully functional
   throughout the multi-session cutover.

   This session's slice migrates ONLY the Attributes section to the
   new primitives. Every other section (Skills, Saves, Derived,
   Conditions, Intimacies, Backgrounds, Inventory, Abilities) still
   renders via the classic helpers. Future sessions migrate one
   section at a time so each step ships small and reviewable.
   ═══════════════════════════════════════════════════════════════ */
function mrrP3RenderSheet() {
  if (!state.ruleset) return;

  /* Reset registries — same lifecycle as the classic renderer so other
     refresh callers (bar refreshers, derived-bonus refreshers) stay in
     a clean state across re-renders. */
  barRefreshers.length = 0;
  derivedBonusRefreshers.length = 0;

  if (state.sheetResizeObserver) {
    try { state.sheetResizeObserver.disconnect(); } catch (e) {}
    state.sheetResizeObserver = null;
  }
  if (state.mountEl && state.mountEl.parentNode) state.mountEl.parentNode.removeChild(state.mountEl);

  var host = findSheetContainer();
  var floating = false;
  if (!host) {
    state.mountEl = marinara.addElement(document.body, "div", { "class": "mrr-sheet mrr-sheet--floating" });
    floating = true;
  } else {
    hideBuiltInAttributesPanel(host);
    state.mountEl = marinara.addElement(host, "div", { "class": "mrr-sheet" });
  }
  if (!state.mountEl) return;

  /* B1/RULING 2: state.mountEl was just (re)created — it is the ONLY
     place the real main sheet panel content root comes into existence.
     Re-mount the warning strip (if any queued/undismissed warnings exist)
     as the very first child, before anything else below adds content. */
  mrrRenderWarnStrip();

  /* Phase 5 step 5.5 — apply per-character density preset on render. CSS
     in RPG-Extension-GM-Mode.css branches the --mrr-density-* variables
     off this attribute. Default cozy matches prototype TWEAK_DEFAULTS. */
  var densityPref = (state.sheet && state.sheet.density) || "cozy";
  state.mountEl.setAttribute("data-density", densityPref);

  /* Header + XP card — reuse Phase 1's renderSheetHeader and renderXpCard.
     They already produce the correct DOM under the existing .mrr-sheet
     classes; no rewrite needed for this slice. */
  renderSheetHeader(state.mountEl);

  if (floating) {
    var sheetHeader = state.mountEl.querySelector(".mrr-sheet__header");
    if (sheetHeader) makeDraggable(state.mountEl, sheetHeader, "mrr-sheet-pos");
    state.sheetResizeObserver = makeResizable(state.mountEl, LS_SHEET_SIZE);
  }

  renderXpCard(state.mountEl);

  /* Section dispatch — Attributes goes through the new primitives;
     everything else falls through to the classic renderers.

     Section list resolution. Legacy rulesets declare `sheetSections[]`;
     Plan B v1 rulesets declare `sections.order[]` (wider vocabulary
     including identity / xp / resources / morality / spellbook). When
     both are present, sheetSections wins for back-compat. The hardcoded
     fallback is the original four-section default. The "identity" and
     "xp" entries in sections.order are NO-OPs at the dispatcher level
     because renderSheetHeader (identity) and renderXpCard (xp) already
     fired above this loop — listing them here is purely declarative. */
  /* Plan B v1's `sections.order[]` is canonical when present; falls back
     to legacy `sheetSections[]` for pre-Plan-B rulesets; hardcoded default
     for rulesets with neither. */
  var sections;
  if (state.ruleset.sections && Array.isArray(state.ruleset.sections.order) && state.ruleset.sections.order.length) {
    sections = state.ruleset.sections.order;
  } else if (state.ruleset.sheetSections && state.ruleset.sheetSections.length) {
    sections = state.ruleset.sheetSections;
  } else {
    sections = ["attributes", "skills", "derived", "states"];
  }

  /* Honor sections.hidden[] section-level hides. Bare entries (e.g.
     "disciplines") drop the whole section; prefixed entries (e.g.
     "derived:Sorcery Circle") are honored inside the respective section
     renderer (see mrrP3RenderDerivedSection). */
  if (state.ruleset.sections && Array.isArray(state.ruleset.sections.hidden) && state.ruleset.sections.hidden.length) {
    var hiddenSet = {};
    state.ruleset.sections.hidden.forEach(function (h) {
      if (typeof h === "string" && h.indexOf(":") === -1) hiddenSet[h] = true;
    });
    sections = sections.filter(function (sec) { return !hiddenSet[sec]; });
  }

  /* If the ruleset declares attributes but doesn't list them, render
     anyway — the classic path does this implicitly via the explicit
     "attributes" branch in its forEach. */
  var attrsRendered = false;
  sections.forEach(function (sec) {
    if (sec === "attributes") {
      mrrP3RenderAttributesSection(state.mountEl);
      attrsRendered = true;
    }
    else if (sec === "resources") mrrP3RenderResourcesSection(state.mountEl);
    else if (sec === "morality") mrrP3RenderMoralitySection(state.mountEl);
    else if (sec === "skills") mrrP3RenderSkillsSection(state.mountEl);
    else if (sec === "saves") mrrP3RenderSavesSection(state.mountEl);
    else if (sec === "derived") mrrP3RenderDerivedSection(state.mountEl);
    else if (sec === "states") mrrP3RenderStatesSection(state.mountEl);
    else if (sec === "conditions") mrrP3RenderConditionsSection(state.mountEl);
    else if (sec === "intimacies") mrrP3RenderIntimaciesSection(state.mountEl);
    else if (sec === "backgrounds") mrrP3RenderBackgroundsSection(state.mountEl);
    else if (sec === "meritsFlaws") mrrP3RenderMeritsFlawsSection(state.mountEl);
    else if (sec === "inventory") mrrP3RenderInventorySection(state.mountEl);
    else if (sec === "abilities") mrrP3RenderAbilitiesSection(state.mountEl);
    /* "identity" and "xp" intentionally not handled — already rendered
       above the section loop. Unknown section names ignored silently. */
  });
  if (!attrsRendered && Array.isArray(state.ruleset.attributes) && state.ruleset.attributes.length) {
    mrrP3RenderAttributesSection(state.mountEl);
  }

  /* Auto-append abilities + conditions when ruleset declares them but
     didn't list — same as classic renderSheet. */
  if (state.ruleset.abilities && Array.isArray(state.ruleset.abilities.categories) && sections.indexOf("abilities") === -1) {
    renderAbilitiesSection(state.mountEl);
  }
  if (Array.isArray(state.ruleset.conditions) && state.ruleset.conditions.length
      && sections.indexOf("conditions") === -1) {
    renderConditions(state.mountEl);
  }

  /* Action row — dice + sync buttons. */
  var actions = marinara.addElement(state.mountEl, "div", { "class": "mrr-section" });
  if (actions) {
    var btnRoll = marinara.addElement(actions, "button", { "class": "mrr-dice__btn", textContent: "Open dice widget" });
    var btnSync = marinara.addElement(actions, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary mrr-dice__btn--row-spaced", textContent: "Sync sheet to chat fields" });
    if (btnRoll) marinara.on(btnRoll, "click", function () { showDice(true); });
    if (btnSync) marinara.on(btnSync, "click", syncSheetToChat);

    /* Phase 5 step 5.5 — density toggle (compact | cozy | roomy). Writes
       state.sheet.density, sets data-density on .mrr-sheet, saves via
       the standard saveSheet path, and re-renders so density-aware
       components pick up the new --mrr-density-* values. Per-character
       preference; default "cozy" matches prototype. */
    var currentDensity = (state.sheet && state.sheet.density) || "cozy";
    var densityGroup = marinara.addElement(actions, "div", {
      "class": "mrr-density-toggle",
      role: "group",
      "aria-label": "Sheet density"
    });
    if (densityGroup) {
      marinara.addElement(densityGroup, "span", {
        "class": "mrr-density-toggle__label",
        textContent: "Density"
      });
      ["compact", "cozy", "roomy"].forEach(function (mode) {
        var btn = marinara.addElement(densityGroup, "button", {
          type: "button",
          "class": "mrr-density-toggle__btn",
          "aria-pressed": (mode === currentDensity) ? "true" : "false",
          "data-density-mode": mode,
          textContent: mode
        });
        if (!btn) return;
        marinara.on(btn, "click", function () {
          if (!state.sheet) return;
          if (state.sheet.density === mode) return;
          state.sheet.density = mode;
          if (state.mountEl) state.mountEl.setAttribute("data-density", mode);
          saveSheet(state.chatId, state.sheet);
          renderSheet();
        });
      });
    }
  }

  applyCollapsed(state.collapsed);
}

/* ═══════════════════════════════════════════════════════════════
   Phase 5 step 5.3 — Resources cluster ("charbar")
   ═══════════════════════════════════════════════════════════════
   Horizontal stack of resource readouts rendered above Attributes,
   driven by ruleset.resources[] (Plan B v1 schema add). Sub-renderers
   dispatch by resource.type:
     bar     → fill bar with current/max + auto-color + quickButtons
     dice    → pool of clickable dice glyphs (D&D Hit Dice style)
     counter → -/+ stepper with current/max
     pool    → current/max display + quickButtons (Exalted motes/will)
     custom  → look up rendererConfig.component in registry; fall back
               to a placeholder pill when not registered

   Auto-color matches prototype <Bar> sheet.jsx:151:
     pct < 30%  → bad ;  < 65% → warn ;  >= 65% → ok
   resource.color overrides the auto-color when present.

   State persistence: state.sheet.resources[id] = { current: number }.
   Initialized lazily from resource.current (default in ruleset). The
   `max` value can be a token-substituted formula (evalFormula) or an
   integer. quickButtons honor delta=integer or delta="max" (refill).

   Custom-component registry is an open object on the global namespace
   so Round 5's V20 visual treatment can register "v20-health-track"
   without touching the dispatcher.
   ═══════════════════════════════════════════════════════════════ */

/* Custom-component registry. Round 5 will populate this with
   "v20-health-track" (and any future named custom renderers). When the
   dispatcher hits a type=custom resource, it looks up the
   rendererConfig.component name here. Missing entries fall back to the
   placeholder so the missing component is visible during integration.

   Registration shape (Round 5):
     mrr_resourceRenderers["v20-health-track"] = function (resource, parent, ctx) {
       // resource: the full resources[] entry
       // parent: the .mrr-resource container (already created)
       // ctx: { state, statContext, evalFormula, saveSheet, renderSheet,
       //        getCurrent, setCurrent, resolveMax, resolveCurrentDefault }
       // Renderer mutates parent. Return value ignored.
     };
*/
var mrr_resourceRenderers = {};

function mrrResolveResourceMax(resource, ctx) {
  if (!resource) return 0;
  if (typeof resource.max === "number") return resource.max;
  if (typeof resource.max === "string" && resource.max) {
    var v = evalFormula(resource.max, ctx);
    return (typeof v === "number" && isFinite(v)) ? Math.max(0, Math.floor(v)) : 0;
  }
  return 0;
}

function mrrResolveResourceDefaultCurrent(resource, ctx, max) {
  if (!resource) return 0;
  if (typeof resource.current === "number") return resource.current;
  if (typeof resource.current === "string" && resource.current) {
    var v = evalFormula(resource.current, ctx);
    return (typeof v === "number" && isFinite(v)) ? Math.max(0, Math.floor(v)) : 0;
  }
  return (typeof max === "number") ? max : 0;
}

function mrrGetResourceCurrent(resource, ctx) {
  if (!state.sheet) return 0;
  if (!state.sheet.resources || typeof state.sheet.resources !== "object") {
    state.sheet.resources = {};
  }
  var id = resource && resource.id;
  if (!id) return 0;
  /* Legacy-state binding (Plan B v1.x): when a resource declares
     `stateName`, the canonical store is state.sheet.derived[stateName] —
     the same key the state-mutator chat-tag parser writes to. Reading
     from there makes LLM-driven mutations flow into the Resources
     cluster automatically, and writes via mrrSetResourceCurrent also
     persist there so mergeSheet's existing 'derived' whitelist preserves
     the value across sessions. */
  if (typeof resource.stateName === "string" && resource.stateName) {
    if (!state.sheet.derived || typeof state.sheet.derived !== "object") {
      state.sheet.derived = {};
    }
    var dv = state.sheet.derived[resource.stateName];
    if (typeof dv === "number" && isFinite(dv)) return dv;
    var maxL = mrrResolveResourceMax(resource, ctx);
    var defL = mrrResolveResourceDefaultCurrent(resource, ctx, maxL);
    state.sheet.derived[resource.stateName] = defL;
    return defL;
  }
  var entry = state.sheet.resources[id];
  if (!entry || typeof entry.current !== "number") {
    var max = mrrResolveResourceMax(resource, ctx);
    var def = mrrResolveResourceDefaultCurrent(resource, ctx, max);
    if (!entry) entry = state.sheet.resources[id] = {};
    entry.current = def;
    return def;
  }
  return entry.current;
}

function mrrSetResourceCurrent(resource, value) {
  if (!state.sheet || !resource || !resource.id) return;
  if (!state.sheet.resources || typeof state.sheet.resources !== "object") {
    state.sheet.resources = {};
  }
  if (typeof resource.stateName === "string" && resource.stateName) {
    if (!state.sheet.derived || typeof state.sheet.derived !== "object") {
      state.sheet.derived = {};
    }
    state.sheet.derived[resource.stateName] = value;
    saveSheet(state.chatId, state.sheet);
    return;
  }
  var prev = state.sheet.resources[resource.id];
  if (!prev || typeof prev !== "object") prev = state.sheet.resources[resource.id] = {};
  prev.current = value;
  saveSheet(state.chatId, state.sheet);
}

function mrrResourceClamp(v, lo, hi) {
  if (typeof lo === "number" && v < lo) v = lo;
  if (typeof hi === "number" && v > hi) v = hi;
  return v;
}

function mrrResourceAutoColor(current, max) {
  if (!max || max <= 0) return "ok";
  var pct = current / max;
  if (pct < 0.30) return "bad";
  if (pct < 0.65) return "warn";
  return "ok";
}

function mrrRenderResourceQuickButtons(parent, resource, current, max) {
  if (!parent || !resource || !Array.isArray(resource.quickButtons) || !resource.quickButtons.length) return;
  var row = marinara.addElement(parent, "div", { "class": "mrr-resource__quick" });
  if (!row) return;
  resource.quickButtons.forEach(function (qb) {
    if (!qb || typeof qb.label !== "string") return;
    var btn = marinara.addElement(row, "button", {
      type: "button",
      "class": "mrr-resource__quick-btn",
      textContent: qb.label
    });
    if (!btn) return;
    marinara.on(btn, "click", function () {
      var next;
      if (qb.delta === "max") {
        next = max;
      } else if (typeof qb.delta === "number") {
        next = mrrResourceClamp(current + qb.delta, 0, max);
      } else {
        return;
      }
      mrrSetResourceCurrent(resource, next);
      renderSheet();
    });
  });
}

function mrrRenderResourceBar(parent, resource, current, max) {
  if (!parent) return;
  var color = resource.color || mrrResourceAutoColor(current, max);
  var pct = (max > 0) ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;

  var values = marinara.addElement(parent, "div", { "class": "mrr-resource__values" });
  if (values) {
    var curInput = marinara.addElement(values, "input", {
      "class": "mrr-resource__val-input",
      type: "number", min: "0",
      value: String(current)
    });
    marinara.addElement(values, "span", { "class": "mrr-resource__sep", textContent: "/" });
    marinara.addElement(values, "span", { "class": "mrr-resource__val", textContent: String(max) });

    if (curInput) marinara.on(curInput, "change", function () {
      var n = parseInt(curInput.value, 10);
      if (isNaN(n)) n = 0;
      mrrSetResourceCurrent(resource, mrrResourceClamp(n, 0, max));
      renderSheet();
    });
  }

  var bar = marinara.addElement(parent, "div", { "class": "mrr-resource__bar" });
  if (bar) {
    var fill = marinara.addElement(bar, "div", {
      "class": "mrr-resource__bar-fill mrr-resource__bar-fill--" + color
    });
    if (fill) fill.style.width = pct + "%";
  }

  mrrRenderResourceQuickButtons(parent, resource, current, max);
}

/* Resolve a dice resource's die size, honoring dieFromClass binding
   when the ruleset declares classOptions[] and the player has selected
   a class on the sheet. Static `die` is the fallback (no class
   selected, or selected class missing from classOptions). */
function mrrResolveResourceDie(resource) {
  var fallback = (typeof resource.die === "string" && resource.die) ? resource.die : "d6";
  if (resource.dieFromClass !== true) return fallback;
  if (!state.ruleset || !Array.isArray(state.ruleset.classOptions)) return fallback;
  var selectedClass = state.sheet && state.sheet.identity && state.sheet.identity["class"];
  if (!selectedClass) return fallback;
  for (var i = 0; i < state.ruleset.classOptions.length; i++) {
    var co = state.ruleset.classOptions[i];
    if (co && co.name === selectedClass && typeof co.hitDie === "string" && co.hitDie) {
      return co.hitDie;
    }
  }
  return fallback;
}

function mrrRenderResourceDice(parent, resource, current, max) {
  if (!parent) return;
  var dieLabel = mrrResolveResourceDie(resource);

  var values = marinara.addElement(parent, "div", { "class": "mrr-resource__values" });
  if (values) {
    marinara.addElement(values, "span", { "class": "mrr-resource__val", textContent: String(current) });
    marinara.addElement(values, "span", { "class": "mrr-resource__sep", textContent: "/" });
    marinara.addElement(values, "span", { "class": "mrr-resource__val", textContent: String(max) });
    marinara.addElement(values, "span", { "class": "mrr-resource__sep", textContent: dieLabel });
  }

  var dice = marinara.addElement(parent, "div", { "class": "mrr-resource__dice" });
  if (dice) {
    for (var i = 0; i < max; i++) {
      var spent = (i >= current);
      var die = marinara.addElement(dice, "button", {
        type: "button",
        "class": "mrr-resource__die" + (spent ? " mrr-resource__die--spent" : ""),
        textContent: dieLabel
      });
      if (!die || spent) continue;
      marinara.on(die, "click", function () {
        var cur = mrrGetResourceCurrent(resource, mrrResourceContext());
        if (cur > 0) {
          mrrSetResourceCurrent(resource, cur - 1);
          renderSheet();
        }
      });
    }
  }

  mrrRenderResourceQuickButtons(parent, resource, current, max);
}

function mrrRenderResourceCounter(parent, resource, current, max) {
  if (!parent) return;

  var counter = marinara.addElement(parent, "div", { "class": "mrr-resource__counter" });
  if (counter) {
    var dec = marinara.addElement(counter, "button", {
      type: "button",
      "class": "mrr-resource__step",
      textContent: "−"
    });
    if (dec && current <= 0) dec.disabled = true;

    var curInput = marinara.addElement(counter, "input", {
      "class": "mrr-resource__val-input",
      type: "number", min: "0",
      value: String(current)
    });
    marinara.addElement(counter, "span", { "class": "mrr-resource__sep", textContent: "/" });
    marinara.addElement(counter, "span", { "class": "mrr-resource__val", textContent: String(max) });

    var inc = marinara.addElement(counter, "button", {
      type: "button",
      "class": "mrr-resource__step",
      textContent: "+"
    });
    if (inc && current >= max) inc.disabled = true;

    if (dec) marinara.on(dec, "click", function () {
      mrrSetResourceCurrent(resource, mrrResourceClamp(current - 1, 0, max));
      renderSheet();
    });
    if (inc) marinara.on(inc, "click", function () {
      mrrSetResourceCurrent(resource, mrrResourceClamp(current + 1, 0, max));
      renderSheet();
    });
    if (curInput) marinara.on(curInput, "change", function () {
      var n = parseInt(curInput.value, 10);
      if (isNaN(n)) n = 0;
      mrrSetResourceCurrent(resource, mrrResourceClamp(n, 0, max));
      renderSheet();
    });
  }

  mrrRenderResourceQuickButtons(parent, resource, current, max);
}

function mrrRenderResourcePool(parent, resource, current, max) {
  if (!parent) return;

  var values = marinara.addElement(parent, "div", { "class": "mrr-resource__values" });
  if (values) {
    var curInput = marinara.addElement(values, "input", {
      "class": "mrr-resource__val-input",
      type: "number", min: "0",
      value: String(current)
    });
    marinara.addElement(values, "span", { "class": "mrr-resource__sep", textContent: "/" });
    marinara.addElement(values, "span", { "class": "mrr-resource__val", textContent: String(max) });

    if (curInput) marinara.on(curInput, "change", function () {
      var n = parseInt(curInput.value, 10);
      if (isNaN(n)) n = 0;
      mrrSetResourceCurrent(resource, mrrResourceClamp(n, 0, max));
      renderSheet();
    });
  }

  mrrRenderResourceQuickButtons(parent, resource, current, max);
}

/* Phase 6 — state-banner resource renderer. Surfaces a ruleset-declared
   state inline in the Resources cluster (Anima Banner the canonical
   example). The state's source-of-truth still lives in state.sheet.states
   [stateRef]; this renderer just gives it a Resources-cluster home so
   players (and the GM) see status side-by-side with the spent-pool
   readouts that drive the same fiction. Click cycles values; the existing
   STATES section can be hidden via `sections.hidden: ["state:<Name>"]`. */
function mrrRenderResourceStateBanner(parent, resource) {
  var stateRef = (typeof resource.stateRef === "string") ? resource.stateRef : null;
  if (!stateRef) {
    mrrRenderResourcePlaceholder(parent, resource, "(missing stateRef)");
    return;
  }
  var stateDef = null;
  if (Array.isArray(state.ruleset.states)) {
    for (var i = 0; i < state.ruleset.states.length; i++) {
      var s = state.ruleset.states[i];
      if (s && s.name === stateRef) { stateDef = s; break; }
    }
  }
  if (!stateDef || !Array.isArray(stateDef.values) || !stateDef.values.length) {
    mrrRenderResourcePlaceholder(parent, resource, "(state '" + stateRef + "' not found)");
    return;
  }
  if (!state.sheet.states || typeof state.sheet.states !== "object") {
    state.sheet.states = {};
  }
  var current = state.sheet.states[stateRef];
  if (!current) {
    current = stateDef.values[0].label;
    state.sheet.states[stateRef] = current;
  }
  /* Slug-form for class targeting so per-tier visual styling can attach
     (e.g. `.mrr-state-banner__pill--bonfire`). Lowercase, non-alphanumeric
     → dash, trimmed of leading/trailing dashes. */
  function slug(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  var wrap = marinara.addElement(parent, "div", { "class": "mrr-state-banner" });
  if (!wrap) return;
  var pill = marinara.addElement(wrap, "button", {
    "class": "mrr-state-banner__pill mrr-state-banner__pill--" + slug(current),
    "type": "button",
    title: "Click to cycle " + stateRef,
    textContent: current
  });
  if (!pill) return;
  var sel = marinara.addElement(wrap, "select", { "class": "mrr-state-banner__select" });
  if (sel) {
    stateDef.values.forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = v.label;
      opt.textContent = v.label;
      if (v.label === current) opt.selected = true;
      sel.appendChild(opt);
    });
    marinara.on(sel, "change", function () {
      state.sheet.states[stateRef] = sel.value;
      saveSheet(state.chatId, state.sheet);
      pill.textContent = sel.value;
      pill.className = "mrr-state-banner__pill mrr-state-banner__pill--" + slug(sel.value);
    });
  }
  marinara.on(pill, "click", function (e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    var labels = stateDef.values.map(function (v) { return v.label; });
    var idx = labels.indexOf(state.sheet.states[stateRef]);
    var nextIdx = (idx + 1) % labels.length;
    var nextLabel = labels[nextIdx];
    state.sheet.states[stateRef] = nextLabel;
    saveSheet(state.chatId, state.sheet);
    pill.textContent = nextLabel;
    pill.className = "mrr-state-banner__pill mrr-state-banner__pill--" + slug(nextLabel);
    if (sel) sel.value = nextLabel;
  });
}

function mrrRenderResourcePlaceholder(parent, resource, componentName) {
  if (!parent) return;
  var box = marinara.addElement(parent, "div", { "class": "mrr-resource__placeholder" });
  if (!box) return;
  marinara.addElement(box, "span", { textContent: "Custom component " });
  marinara.addElement(box, "code", { textContent: componentName || "(unnamed)" });
  marinara.addElement(box, "span", { textContent: " not registered" });
}

function mrrRenderResourceCustom(parent, resource) {
  if (!parent || !resource) return;
  var componentName = (resource.rendererConfig && resource.rendererConfig.component) || null;
  var renderer = componentName ? mrr_resourceRenderers[componentName] : null;
  if (typeof renderer === "function") {
    var ctx = {
      state: state,
      statContext: statContext,
      evalFormula: evalFormula,
      saveSheet: saveSheet,
      renderSheet: renderSheet,
      getCurrent: function () { return mrrGetResourceCurrent(resource, mrrResourceContext()); },
      setCurrent: function (v) { mrrSetResourceCurrent(resource, v); },
      resolveMax: function () { return mrrResolveResourceMax(resource, mrrResourceContext()); },
      resolveCurrentDefault: function (max) { return mrrResolveResourceDefaultCurrent(resource, mrrResourceContext(), max); }
    };
    try {
      renderer(resource, parent, ctx);
    } catch (e) {
      warn("mrrP3 custom resource renderer '" + componentName + "' threw:", e && e.message);
      mrrRenderResourcePlaceholder(parent, resource, componentName);
    }
    return;
  }
  mrrRenderResourcePlaceholder(parent, resource, componentName);
}

function mrrResourceContext() {
  /* Augment statContext with the {Level} and {tierBonus} flat-lookup
     tokens documented at mrrSubstituteTokens. statContext doesn't
     populate them by default; resource max formulas (D&D hit-dice =
     "{Level}") need them. */
  var ctx = statContext();
  if (state.sheet && state.sheet.xp && typeof state.sheet.xp.level === "number") {
    ctx.Level = state.sheet.xp.level;
  } else if (typeof ctx.Level !== "number") {
    ctx.Level = 1;
  }
  if (typeof ctx.tierBonus !== "number") ctx.tierBonus = 0;
  return ctx;
}

function mrrP3RenderResourcesSection(parent) {
  if (!parent || !state.ruleset || !state.sheet) return;
  var resources = state.ruleset.resources;
  if (!Array.isArray(resources) || !resources.length) return;

  /* Initialize the per-character resources bag once so saveSheet picks
     it up on first interaction. Don't overwrite existing entries. */
  if (!state.sheet.resources || typeof state.sheet.resources !== "object") {
    state.sheet.resources = {};
  }

  var cluster = marinara.addElement(parent, "div", { "class": "mrr-resources" });
  if (!cluster) return;

  var lastGroup = null;
  resources.forEach(function (resource, idx) {
    if (!resource || typeof resource.type !== "string") return;

    /* Group subheader. Adjacent resources sharing a `group` value
       cluster under one label (D&D Spell Slots case). A different
       group value resets; absent group resets to null. */
    var grp = (typeof resource.group === "string" && resource.group) ? resource.group : null;
    if (grp && grp !== lastGroup) {
      marinara.addElement(cluster, "div", {
        "class": "mrr-resources__group-label",
        textContent: grp
      });
      lastGroup = grp;
    } else if (!grp) {
      lastGroup = null;
    }

    /* Phase 6 — rebuild ctx PER iteration so cascading formulas resolve
       correctly even when a stateName-bound resource initializes its
       value on first render. Without this, Personal Motes' max formula
       "{Essence} * 3 + 10" reads ctx[Essence]=0 on a fresh load where
       Essence renders AFTER motes, clamping the motes' current down to
       max=10 and persisting that wrong value. statContext() is cheap
       (small object construction), so the recompute is free. */
    var ctx = mrrResourceContext();

    var formulaMax = mrrResolveResourceMax(resource, ctx);
    /* Phase 6 — commitment-aware effective max. Resources declaring a
       `commitmentPool` (Exalted motes-personal / motes-peripheral) have
       their visible max reduced by the live sum of moteCommitment from
       equipped items whose `motePool` matches. The reconciler call also
       adjusts the saved spendable on any delta since the prior render,
       so commit / uncommit / slot-displacement all flow through the
       same well-defined math instead of being entangled in toggleEquip's
       click handler. */
    var committedForPool = 0;
    if (typeof resource.commitmentPool === "string" && resource.commitmentPool) {
      committedForPool = reconcileCommittedMotes(resource.commitmentPool, resource.stateName || null);
    }
    var max = Math.max(0, formulaMax - committedForPool);
    var current = mrrGetResourceCurrent(resource, ctx);
    /* Clamp persisted current against the dynamic max — formulas may
       reduce max below the saved value (e.g. losing an Essence dot in
       Exalted shrinks the mote pool). */
    if (current > max) {
      current = max;
      mrrSetResourceCurrent(resource, current);
    }

    var card = marinara.addElement(cluster, "div", {
      "class": "mrr-resource mrr-resource--" + resource.type
    });
    if (!card) return;

    marinara.addElement(card, "div", {
      "class": "mrr-resource__label",
      textContent: resource.label || resource.id || "Resource"
    });

    if (resource.type === "bar") {
      mrrRenderResourceBar(card, resource, current, max);
    } else if (resource.type === "dice") {
      mrrRenderResourceDice(card, resource, current, max);
    } else if (resource.type === "counter") {
      mrrRenderResourceCounter(card, resource, current, max);
    } else if (resource.type === "pool") {
      mrrRenderResourcePool(card, resource, current, max);
    } else if (resource.type === "custom") {
      mrrRenderResourceCustom(card, resource);
    } else if (resource.type === "state-banner") {
      mrrRenderResourceStateBanner(card, resource);
    } else {
      /* Unknown type — render label only so the user can see the
         resource exists but the renderer doesn't recognize the type. */
      mrrRenderResourcePlaceholder(card, resource, "(type=" + resource.type + ")");
    }
  });
}

/* Phase 3 Attributes section — uses mrrP3RenderSection +
   mrrP3RenderAttrRow primitives. Wires through the same
   state.sheet.attributes / saveSheet path the classic renderer uses,
   so toggling between renderers preserves data. Modifier shown in the
   row's .mrr-p3-row__mod slot when ruleset declares attribute
   modifierFormula (D&D family); pool systems pass undefined and the
   modifier slot collapses. */
function mrrP3RenderAttributesSection(parent) {
  if (!parent || !state.ruleset) return;
  var attrs = state.ruleset.attributes || [];
  if (!attrs.length) return;

  /* Group by attribute.group (Exalted Physical/Social/Mental). D&D
     attributes typically have no group — all six render in a single
     ungrouped block. */
  var groups = {};
  var groupOrder = [];
  attrs.forEach(function (a) {
    var g = a.group || "";
    if (!(g in groups)) { groups[g] = []; groupOrder.push(g); }
    groups[g].push(a);
  });

  mrrP3RenderSection(parent, {
    id: "attributes-p3",
    title: "ATTRIBUTES",
    defaultOpen: true
  }, function (body) {
    groupOrder.forEach(function (g) {
      if (g) {
        marinara.addElement(body, "div", {
          "class": "mrr-p3-section__subgroup-label",
          textContent: g
        });
      }
      groups[g].forEach(function (a) {
        var ctx = statContext();
        var modKey = a.name + "_mod";
        var hasMod = (typeof ctx[modKey] === "number");
        mrrP3RenderAttrRow(body, {
          name: a.name,
          abbr: a.abbreviation || "",
          value: state.sheet.attributes[a.name],
          modifier: hasMod ? ctx[modKey] : undefined,
          min: a.min,
          max: a.max,
          onChange: function (v) {
            state.sheet.attributes[a.name] = v;
            saveSheet(state.chatId, state.sheet);
            renderSheet();
          },
          onRoll: function (name, value, mod) {
            /* Defer to the classic dice path. The classic renderAttrRow
               doesn't expose a roll button; this is additive. Future
               sessions wire stage-roll integration per UI-build.md §4.10. */
            log("Phase 3 attr roll requested:", name, value, mod);
            showDice(true);
          }
        });
      });
    });
  });
}

/* Phase 3.4 — DerivedSection wrapper. Iterates state.ruleset.derivedStats
   and dispatches per renderAs onto the Phase-3.1 mrrP3RenderBar /
   mrrP3RenderDamageTrack primitives. Non-bar/non-track derived stats
   fall through to classic renderValue (parent-agnostic — uses derived.*
   and state.sheet.derived[name], no closure dependency on the classic
   renderDerived caller). State contracts preserved verbatim:
   state.sheet.derived[name], state.sheet.derivedMax[name], typed-damage
   state.sheet.track[name] (number-or-typed-object), state.sheet.extraTrack.
   Mutations trigger full renderSheet — Phase-3 path resets barRefreshers
   AND derivedBonusRefreshers (mrrP3RenderSheet head) so re-render cleanup
   is automatic. v1 retreats: bar bonus pill (.mrr-row__bonus) and roll
   button for derived stats with rollFormula are NOT migrated — primitive
   doesn't expose them; revisit Phase 3.5+. */
function mrrP3RenderDerivedSection(parent) {
  if (!parent || !state.ruleset) return;
  if (!Array.isArray(state.ruleset.derivedStats) || !state.ruleset.derivedStats.length) return;
  /* Per-item hides: sections.hidden[] entries prefixed `derived:` filter
     individual derived stats out of this section (Plan B v1). */
  var derivedHidden = {};
  if (state.ruleset.sections && Array.isArray(state.ruleset.sections.hidden)) {
    state.ruleset.sections.hidden.forEach(function (h) {
      if (typeof h === "string" && h.indexOf("derived:") === 0) {
        derivedHidden[h.slice(8)] = true;
      }
    });
  }
  /* Phase 6 — Derived Pools card grid. Value-typed derived stats now land
     in a 2-column compact card grid below any full-width bars/tracks.
     Card anatomy: name top-left, large value top-right, formula tokens
     in a small faint line below the head. Auto-calc derived (valueFormula
     or tooltipFormula-only) show no edit input — the formula IS the value.
     Manually-stepped derived (Hardness, D&D Speed, etc.) keep an inline
     stepper. Bars (HP, Blood Pool, motes) and tracks (Health Track, Fate
     stress) render above the grid in their existing full-width layouts. */
  var bars = [];
  var tracks = [];
  var cards = [];
  state.ruleset.derivedStats.forEach(function (d) {
    if (!d || !d.name) return;
    if (derivedHidden[d.name]) return;
    if (d.renderAs === "bar") bars.push(d);
    else if (d.renderAs === "track" && Array.isArray(d.track)) tracks.push(d);
    else cards.push(d);
  });
  if (!bars.length && !tracks.length && !cards.length) return;
  mrrP3RenderSection(parent, {
    id: "derived-p3",
    title: "DERIVED POOLS",
    defaultOpen: true
  }, function (body) {
    marinara.addElement(body, "div", {
      "class": "mrr-derived-pools__subtitle",
      textContent: "Auto-calculated from your stats + equipped gear. GM can read these directly."
    });
    bars.forEach(function (d) { mrrP3RenderDerivedBar(body, d); });
    tracks.forEach(function (d) { mrrP3RenderDerivedTrack(body, d); });
    if (cards.length) {
      var grid = marinara.addElement(body, "div", { "class": "mrr-derived-pools" });
      if (grid) {
        cards.forEach(function (d) { mrrP3RenderDerivedPoolCard(grid, d); });
      } else {
        cards.forEach(function (d) { mrrP3RenderDerivedPoolCard(body, d); });
      }
    }
  });
}

/* Phase 6 — Single value-card renderer. Replaces the old row-based
   derived value layout. Each card contains:
     - .__head: name on left, value (+optional bonus) on right
     - .__formula: small/faint formula text below the head
     - .__roll (optional): roll button when rollFormula is declared
   Auto-calc cards (valueFormula present, OR tooltipFormula-only) install
   a barRefresher so the value updates whenever an upstream stat changes;
   manual-stepper cards use makeEditableValue and persist via state.sheet
   .derived[d.name]. */
function mrrP3RenderDerivedPoolCard(parent, d) {
  if (!parent || !d) return;
  var card = marinara.addElement(parent, "div", { "class": "mrr-derived-pool-card" });
  if (!card) return;
  var head = marinara.addElement(card, "div", { "class": "mrr-derived-pool-card__head" });
  if (!head) return;
  marinara.addElement(head, "div", {
    "class": "mrr-derived-pool-card__name",
    textContent: d.name
  });
  var valueWrap = marinara.addElement(head, "div", { "class": "mrr-derived-pool-card__value-wrap" });
  if (!valueWrap) return;

  var hasValueFormula = typeof d.valueFormula === "string" && !!d.valueFormula;
  var hasTooltipFormula = typeof d.tooltipFormula === "string" && !!d.tooltipFormula;
  var isAutoCalc = hasValueFormula || hasTooltipFormula;

  var bonusSpan;

  if (isAutoCalc) {
    var valSpan = marinara.addElement(valueWrap, "span", {
      "class": "mrr-derived-pool-card__value mrr-derived-pool-card__value--autocalc",
      title: hasValueFormula
        ? ("Auto-calculated from formula: " + d.valueFormula)
        : ("Auto-calculated from formula: " + d.tooltipFormula)
    });
    bonusSpan = marinara.addElement(valueWrap, "span", { "class": "mrr-derived-pool-card__bonus" });
    if (bonusSpan) {
      refreshDerivedBonus(bonusSpan, d.name);
      derivedBonusRefreshers.push(function () { refreshDerivedBonus(bonusSpan, d.name); });
    }
    function refreshAutocalcCard() {
      if (!valSpan || !valSpan.parentNode) return;
      var ctx = statContext();
      var num;
      if (hasValueFormula) {
        var v = evalFormula(d.valueFormula, ctx);
        /* Floor (not round) matches renderValue's autocalc path — keeps
           D&D ability-mod math and Exalted (a+b+1)/2 ceiling formulas
           rounding the same way across surfaces. */
        num = (typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0;
      } else {
        var brk0 = mrrComputeTooltipBreakdown(d, ctx);
        num = (brk0 && typeof brk0.value === "number") ? brk0.value : 0;
      }
      valSpan.textContent = String(num);
      if (hasTooltipFormula) {
        var brk = mrrComputeTooltipBreakdown(d, ctx);
        if (brk && brk.tooltip) {
          valSpan.title = brk.tooltip;
          valSpan.setAttribute("title", brk.tooltip);
        }
      }
      /* Persist the computed value so chat-sync, dice math, and agent
         state-mutators see the same number the user sees. Match the
         renderValue path so a render-time write only fires when the
         value actually changes. */
      if (state.sheet.derived[d.name] !== num) {
        state.sheet.derived[d.name] = num;
        saveSheet(state.chatId, state.sheet);
      }
    }
    refreshAutocalcCard();
    barRefreshers.push(refreshAutocalcCard);
  } else {
    /* Manual stepper — Hardness in Exalted, Fate Points, Speed, Level,
       etc. Reuses makeEditableValue so the stepper / bounds / persist
       contract matches the rest of the sheet. */
    function computeCardValueMax() {
      if (typeof d.maxFormula === "string" && d.maxFormula) {
        var v = evalFormula(d.maxFormula, statContext());
        if (v != null && v > 0) return Math.floor(v);
      }
      if (typeof d.max === "number" && d.max > 0) return d.max;
      return null;
    }
    var declaredMax = computeCardValueMax();
    var input = makeEditableValue(valueWrap,
      function () {
        var stored = state.sheet.derived ? state.sheet.derived[d.name] : null;
        if (stored != null && stored !== "") return stored;
        return (typeof d.default === "number") ? d.default : 0;
      },
      function (n) {
        if (!state.sheet.derived) state.sheet.derived = {};
        state.sheet.derived[d.name] = n;
        saveSheet(state.chatId, state.sheet);
        refreshAllBars();
        /* When a derived value backs a resource formula (e.g. V20 Blood
           Pool max = "23 - {Generation}", Willpower current = "{Courage}"),
           the resources cluster must re-render so the new max / formula-
           derived current values are visible. refreshAllBars() only
           refreshes registered bar refreshers — not the resources section.
           renderSheet() is the safe full-refresh; cost is one render per
           stepper-change which is negligible. */
        renderSheet();
      },
      function () { return (typeof d.min === "number") ? d.min : -999; },
      function () { return (declaredMax != null) ? declaredMax : 999; }
    );
    if (input) {
      input.classList.add("mrr-derived-pool-card__value-input");
    }
    if (declaredMax != null) {
      marinara.addElement(valueWrap, "span", {
        "class": "mrr-derived-pool-card__max",
        textContent: " / " + declaredMax
      });
    }
    bonusSpan = marinara.addElement(valueWrap, "span", { "class": "mrr-derived-pool-card__bonus" });
    if (bonusSpan) {
      refreshDerivedBonus(bonusSpan, d.name);
      derivedBonusRefreshers.push(function () { refreshDerivedBonus(bonusSpan, d.name); });
    }
  }

  /* Formula tokens line. Prefer formulaShort when authors provide a
     compact token form ("DEX + Dodge"); otherwise fall back to the
     verbose plain-language `formula` field; if neither is present and
     a valueFormula exists, surface that. The line is hidden entirely
     when no formula text is available so manual derived stats with no
     formula (Speed, Level) don't show an empty sliver. */
  var formulaText = d.formulaShort || d.formula || (isAutoCalc ? (d.valueFormula || d.tooltipFormula || "") : "");
  if (formulaText) {
    marinara.addElement(card, "div", {
      "class": "mrr-derived-pool-card__formula",
      textContent: formulaText
    });
  }

  /* Roll button — only for single-roll resolution mode where d20-style
     rolls happen against the derived value (D&D Initiative). Pool / fate
     / under modes use their own roll widgets and don't surface a per-
     derived roll here. */
  if (typeof d.rollFormula === "string" && d.rollFormula
      && state.ruleset.resolution && derivedRollSupported(state.ruleset.resolution.mode)) {
    var rollBtn = marinara.addElement(card, "button", {
      "class": "mrr-derived-pool-card__roll",
      textContent: "roll"
    });
    if (rollBtn) {
      marinara.on(rollBtn, "click", function (e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        quickRollForDerived(d);
      });
    }
  }
}

/* Bridge classic bar state onto mrrP3RenderBar. Max precedence mirrors
   classic renderBar: derivedMax override > maxFormula > literal max >
   Math.max(DEFAULT_BAR_MAX, current) for fresh sheets.
   Phase 4 — registers a barRefresher that re-computes max + current
   in-place when refreshAllBars fires (classic renderValue commits +
   any other dependency change). Without this, Exalted's Personal /
   Peripheral Motes maxes stay stale when Essence is changed via the
   Derived section's classic renderValue path. */
function mrrP3RenderDerivedBar(parent, d) {
  var current = state.sheet.derived[d.name] || 0;
  var max = mrrP3ComputeBarMax(d);
  var result = mrrP3RenderBar(parent, {
    name: d.name,
    current: current,
    max: max,
    onCurrent: function (v) {
      state.sheet.derived[d.name] = v;
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    },
    onMax: function (v) {
      if (!state.sheet.derivedMax) state.sheet.derivedMax = {};
      state.sheet.derivedMax[d.name] = v;
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    }
  });
  if (result && result.bar) {
    var barRef = result.bar;
    barRefreshers.push(function () {
      if (!barRef || !barRef.parentNode) return;
      var newMax = mrrP3ComputeBarMax(d);
      var newCurrent = state.sheet.derived[d.name] || 0;
      var pct = (newMax > 0) ? Math.max(0, Math.min(100, (newCurrent / newMax) * 100)) : 0;
      var fillEl = barRef.querySelector(".mrr-p3-bar__fill");
      if (fillEl) fillEl.style.width = pct + "%";
      var inputs = barRef.querySelectorAll(".mrr-p3-bar__val-input");
      if (inputs && inputs.length >= 1 && inputs[0]) inputs[0].value = String(newCurrent);
      if (inputs && inputs.length >= 2 && inputs[1]) inputs[1].value = String(newMax);
    });
  }
}

function mrrP3ComputeBarMax(d) {
  if (state.sheet.derivedMax && typeof state.sheet.derivedMax[d.name] === "number"
      && state.sheet.derivedMax[d.name] > 0) {
    return state.sheet.derivedMax[d.name];
  }
  if (d.maxFormula) {
    var v = evalFormula(d.maxFormula, statContext());
    if (v != null && v > 0) return Math.floor(v);
  }
  if (d.max != null) return d.max;
  var current = state.sheet.derived[d.name] || 0;
  return Math.max(DEFAULT_BAR_MAX, current);
}

/* Bridge classic typed-damage state onto mrrP3RenderDamageTrack. Severity-
   descending fill: types is sorted A,L,B (high→low) so the leftmost cells
   carry the worst damage. Cell click semantic: filled cell heals that
   type, empty cell takes lightest type — matches classic renderTrack
   single-cell-click fallback (line ~4882). Take-per-type buttons (classic
   Exalted Take-B/L/A) NOT migrated — primitive doesn't expose them, this
   is a JSX-prototype UX choice not a regression. */
function mrrP3RenderDerivedTrack(parent, d) {
  /* Phase 4 — health-track ordering fix. Cells sorted by penalty desc
     so Ox-Body extras slot in by penalty rather than tacking on at end. */
  var ruleEntries = (d.track || []).map(function (c) { return { cell: c, extra: false }; });
  var extraEntries = (state.sheet.extraTrack && state.sheet.extraTrack[d.name])
    ? state.sheet.extraTrack[d.name].map(function (c) { return { cell: c, extra: true }; })
    : [];
  var tagged = ruleEntries.concat(extraEntries);
  tagged.sort(function (a, b) { return (b.cell.penalty || 0) - (a.cell.penalty || 0); });
  var allCells = tagged.map(function (e) { return e.cell; });
  /* Phase 4 — Incapacitated label overflow fix. Long labels truncated
     to first 3 chars so "Incapacitated" → "Inc". Short labels (-0/-1/-2)
     unchanged. */
  var levels = allCells.map(function (c) {
    var lbl = String(c.label || "");
    return lbl.length > 4 ? lbl.slice(0, 3) : lbl;
  });
  var types = damageTypesFor(d);

  /* Phase 4 — per-cell state. Each cell has its own type independently.
     Click escalates the SPECIFIC cell in place (B → L → A → empty).
     Total damage from severity changes stays the same across an
     escalation, so 1B click → 1L (not 1B + 1L). */
  var cells = ensureTrackCells(d, allCells.length);
  var filled = cells.map(function (typeLabel) {
    return typeLabel ? { type: typeLabel } : null;
  });

  mrrP3RenderDamageTrack(parent, {
    track: { name: d.name, levels: levels, filled: filled },
    onCellClick: function (idx) {
      if (!types || !cells || idx < 0 || idx >= cells.length) return;
      var current = cells[idx]; /* null or "B"/"L"/"A" */
      var nextLabel;
      if (!current) {
        /* Empty → take lightest (B). */
        var lightest = types[types.length - 1];
        nextLabel = lightest ? lightest.label : null;
      } else {
        var curIdx = -1;
        for (var i = 0; i < types.length; i++) {
          if (types[i].label === current) { curIdx = i; break; }
        }
        if (curIdx <= 0) {
          /* At most-severe (Aggravated) → clear. */
          nextLabel = null;
        } else {
          /* Escalate this cell to next-more-severe. */
          nextLabel = types[curIdx - 1].label;
        }
      }
      cells[idx] = nextLabel;
      syncTrackCellsToTyped(d);
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    },
    onAddBox: function (label) {
      var penalty = parseInt(String(label), 10);
      if (isNaN(penalty)) penalty = 0;
      if (!state.sheet.extraTrack) state.sheet.extraTrack = {};
      if (!state.sheet.extraTrack[d.name]) state.sheet.extraTrack[d.name] = [];
      state.sheet.extraTrack[d.name].push({ label: String(label), penalty: penalty });
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    },
    onRemoveBox: function () {
      if (!state.sheet.extraTrack || !state.sheet.extraTrack[d.name]
          || !state.sheet.extraTrack[d.name].length) return;
      state.sheet.extraTrack[d.name].pop();
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    },
    onHeal: function (mode) {
      if (!types || !cells) return;
      if (mode === "all") {
        for (var i = 0; i < cells.length; i++) cells[i] = null;
      } else {
        /* Heal worst — find leftmost cell with the most-severe damage
           (types sorted severity-desc, so check A first, then L, then B). */
        for (var ti = 0; ti < types.length; ti++) {
          var targetLabel = types[ti].label;
          for (var ci = 0; ci < cells.length; ci++) {
            if (cells[ci] === targetLabel) {
              cells[ci] = null;
              syncTrackCellsToTyped(d);
              saveSheet(state.chatId, state.sheet);
              renderSheet();
              return;
            }
          }
        }
        return; /* Nothing filled */
      }
      syncTrackCellsToTyped(d);
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    }
  });
}

/* Phase 3.4 — SavesSection wrapper. Iterates state.ruleset.saves and
   builds Phase-3 SaveRows. Tier state shared with skill-proficiency map
   (state.sheet.skillProficiency[save.name] — same key cycleTier mutates
   at line ~1539). Total bonus computed via the same math classic
   refreshSaveBonus uses (skillBonusFormula substitution OR attrMod +
   tierBonus fallback). Roll callback delegates to existing
   quickRollForSave; primitive's onRoll args ignored since
   quickRollForSave self-computes from the save object. */
function mrrP3RenderSavesSection(parent) {
  if (!parent || !state.ruleset) return;
  var saves = Array.isArray(state.ruleset.saves) ? state.ruleset.saves : [];
  if (!saves.length) return;

  var prof = state.ruleset.skillProficiency;
  var tiersList = (prof && Array.isArray(prof.tiers)) ? prof.tiers : [];
  var tiers = tiersList.map(function (t) { return t.code; });
  var tierLabel = {};
  tiersList.forEach(function (t) { tierLabel[t.code] = t.label; });
  var skillFormula = state.ruleset.resolution && state.ruleset.resolution.skillBonusFormula;

  mrrP3RenderSection(parent, {
    id: "saves-p3",
    title: "SAVING THROWS",
    defaultOpen: true
  }, function (body) {
    saves.forEach(function (sv) {
      var ctx = statContext();
      var t = tierForSkill(sv.name);
      var tierBonus = (t && t.rollBonusFormula) ? evalFormula(t.rollBonusFormula, ctx) : 0;
      if (tierBonus == null) tierBonus = 0;
      var attrMod = 0;
      if (sv.linkedAttribute) {
        var modKey = sv.linkedAttribute + "_mod";
        if (typeof ctx[modKey] === "number") attrMod = ctx[modKey];
      }
      var totalBonus;
      if (skillFormula) {
        var subbed = String(skillFormula)
          .replace(/\{linkedAttribute_mod\}/g, String(attrMod))
          .replace(/\{tierBonus\}/g, String(tierBonus));
        var v = evalFormula(subbed, ctx);
        totalBonus = (typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0;
      } else {
        totalBonus = attrMod + tierBonus;
      }

      mrrP3RenderSaveRow(body, {
        save: { name: sv.name, attr: sv.linkedAttribute },
        tier: t ? t.code : "",
        tiers: tiers,
        tierLabel: tierLabel,
        attrMod: attrMod,
        totalBonus: totalBonus,
        onTier: function (nextCode) {
          if (!state.sheet.skillProficiency) state.sheet.skillProficiency = {};
          state.sheet.skillProficiency[sv.name] = nextCode;
          saveSheet(state.chatId, state.sheet);
          renderSheet();
        },
        onRoll: function () {
          quickRollForSave(sv);
        }
      });
    });
  });
}

/* Phase 3.5 — SkillsSection wrapper. Uses mrrP3RenderSkillRow primitive
   for ruleset skills, an inline custom-skill row (primitive doesn't
   support editable name), and a "+ Add Skill" button. State contracts
   preserved: state.sheet.skills[name] (manual mode value), state.sheet
   .skillProficiency[name] (tier code), state.sheet.skillSpecialties
   [name] (array of {name, value}), state.sheet.customSkills (array of
   {name, linkedAttribute, value}). Autocalc-vs-manual driven by ruleset
   resolution.skillBonusFormula presence — same gate classic uses. */
function mrrP3RenderSkillsSection(parent) {
  if (!parent || !state.ruleset || !Array.isArray(state.ruleset.skills)) return;
  var title = (state.ruleset.id === "exalted3e") ? "ABILITIES" : "SKILLS";
  var skillFormula = state.ruleset.resolution && state.ruleset.resolution.skillBonusFormula;
  var prof = state.ruleset.skillProficiency;
  var tiersList = (prof && Array.isArray(prof.tiers)) ? prof.tiers : [];
  var tiers = tiersList.map(function (t) { return t.code; });
  var tierLabel = {};
  tiersList.forEach(function (t) { tierLabel[t.code] = t.label; });
  var specsCfg = state.ruleset.skillSpecialties || {};
  var allowSpecs = !!specsCfg.enabled;
  var specBonus = (typeof specsCfg.value === "number") ? specsCfg.value : 1;

  /* Plan B v1 trinity grouping — when the ruleset declares
     abilities.groups[], bucket skills under each group's label
     (V20 Talents/Skills/Knowledges). Rulesets without abilities.groups
     fall through to the legacy flat list. Skills not listed in any
     declared group render under an "Other" subheader at the end. */
  var groups = (state.ruleset.abilities && Array.isArray(state.ruleset.abilities.groups))
    ? state.ruleset.abilities.groups : null;
  var skillsByName = {};
  state.ruleset.skills.forEach(function (sk) { if (sk && sk.name) skillsByName[sk.name] = sk; });

  function renderOneSkill(body, sk) {
    var ctx = statContext();
    var t = tierForSkill(sk.name);
    var tierBonus = (t && t.rollBonusFormula) ? evalFormula(t.rollBonusFormula, ctx) : 0;
    if (tierBonus == null) tierBonus = 0;
    var attrMod = 0;
    if (sk.linkedAttribute) {
      var modKey = sk.linkedAttribute + "_mod";
      if (typeof ctx[modKey] === "number") attrMod = ctx[modKey];
    }
    var gearBonus = 0;
    try { gearBonus = (equippedBonuses(sk.name) || {}).value || 0; } catch (e) {}
    var rawValue = state.sheet.skills[sk.name] || 0;
    var specs = (state.sheet.skillSpecialties && state.sheet.skillSpecialties[sk.name]) || [];
    var primitiveSpecs = specs.map(function (sp) {
      return { name: sp.name || "", dice: (typeof sp.value === "number" ? sp.value : specBonus) };
    });

    mrrP3RenderSkillRow(body, {
      skill: { name: sk.name, attr: sk.linkedAttribute },
      tier: t ? t.code : "",
      tiers: tiers,
      tierLabel: tierLabel,
      value: rawValue,
      attrMod: attrMod,
      gearBonus: gearBonus,
      tierBonus: tierBonus,
      autoCalc: !!skillFormula,
      specialties: primitiveSpecs,
      allowSpecialties: allowSpecs,
      specialtyBonus: specBonus,
      onTier: function (nextCode) {
        if (!state.sheet.skillProficiency) state.sheet.skillProficiency = {};
        state.sheet.skillProficiency[sk.name] = nextCode;
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      },
      onValue: function (v) {
        state.sheet.skills[sk.name] = v;
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      },
      onRoll: function () {
        quickRollForSkill(sk);
      },
      onAddSpecialty: function (newSp) {
        if (!state.sheet.skillSpecialties) state.sheet.skillSpecialties = {};
        if (!Array.isArray(state.sheet.skillSpecialties[sk.name])) state.sheet.skillSpecialties[sk.name] = [];
        state.sheet.skillSpecialties[sk.name].push({
          name: newSp.name || "",
          value: (typeof newSp.dice === "number") ? newSp.dice : specBonus
        });
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      },
      onRemoveSpecialty: function (idx) {
        if (!state.sheet.skillSpecialties || !Array.isArray(state.sheet.skillSpecialties[sk.name])) return;
        state.sheet.skillSpecialties[sk.name].splice(idx, 1);
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      }
    });
  }

  mrrP3RenderSection(parent, {
    id: "skills-p3",
    title: title,
    defaultOpen: true
  }, function (body) {
    if (groups && groups.length) {
      /* Trinity / grouped rendering path. */
      var rendered = {};
      groups.forEach(function (g) {
        if (!g || !Array.isArray(g.members) || !g.members.length) return;
        var header = marinara.addElement(body, "div", {
          "class": "mrr-skill-group-head",
          textContent: g.label || g.id
        });
        if (header) {
          header.style.fontSize = "0.85em";
          header.style.fontWeight = "600";
          header.style.opacity = "0.78";
          header.style.margin = "10px 0 4px 0";
          header.style.letterSpacing = "0.04em";
          header.style.textTransform = "uppercase";
        }
        g.members.forEach(function (name) {
          var sk = skillsByName[name];
          if (!sk) return;
          rendered[name] = true;
          renderOneSkill(body, sk);
        });
      });
      var others = state.ruleset.skills.filter(function (sk) {
        return sk && sk.name && !rendered[sk.name];
      });
      if (others.length) {
        var otherHeader = marinara.addElement(body, "div", {
          "class": "mrr-skill-group-head",
          textContent: "Other"
        });
        if (otherHeader) {
          otherHeader.style.fontSize = "0.85em";
          otherHeader.style.fontWeight = "600";
          otherHeader.style.opacity = "0.78";
          otherHeader.style.margin = "10px 0 4px 0";
          otherHeader.style.letterSpacing = "0.04em";
          otherHeader.style.textTransform = "uppercase";
        }
        others.forEach(function (sk) { renderOneSkill(body, sk); });
      }
    } else {
      /* Flat / legacy rendering path. */
      state.ruleset.skills.forEach(function (sk) { renderOneSkill(body, sk); });
    }

    /* Custom user-added skills/lores. Inline Phase-3 row with editable
       name + linked-attribute select + value input + remove button.
       Primitive doesn't support editable names (skill.name is fixed
       text), so this row is hand-authored. */
    var customs = Array.isArray(state.sheet.customSkills) ? state.sheet.customSkills : [];
    customs.forEach(function (sk, idx) { mrrP3RenderCustomSkillRow(body, sk, idx); });

    var addBtn = marinara.addElement(body, "button", {
      type: "button",
      "class": "mrr-track-add-btn mrr-char-btn--dashed",
      textContent: "+ Add Skill"
    });
    if (addBtn) marinara.on(addBtn, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      addCustomSkill();
    });
  });
}

function mrrP3RenderCustomSkillRow(parent, sk, idx) {
  /* Use classic .mrr-skill-spec-row.mrr-custom-skill-row for layout —
     .mrr-p3-row is a CSS grid with no template defined for custom-skill
     variant, so children stack vertically. Classic classes are flex-row
     and already styled for this exact shape (name + attr select + value
     + remove). */
  var row = marinara.addElement(parent, "div", { "class": "mrr-skill-spec-row mrr-custom-skill-row" });
  if (!row) return;
  var nameInput = marinara.addElement(row, "input", {
    "class": "mrr-skill-spec-name",
    type: "text",
    placeholder: "skill or lore name",
    value: sk.name || ""
  });
  if (nameInput) {
    var saveTimer = null;
    marinara.on(nameInput, "input", function () {
      sk.name = nameInput.value;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { saveSheet(state.chatId, state.sheet); }, 250);
    });
    marinara.on(nameInput, "blur", function () {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      saveSheet(state.chatId, state.sheet);
    });
    marinara.on(nameInput, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
  }
  var attrSel = marinara.addElement(row, "select", { "class": "mrr-custom-skill-attr" });
  if (attrSel) {
    var blank = document.createElement("option");
    blank.value = ""; blank.textContent = "—";
    attrSel.appendChild(blank);
    (state.ruleset.attributes || []).forEach(function (a) {
      var opt = document.createElement("option");
      opt.value = a.abbreviation || a.name;
      opt.textContent = a.abbreviation || a.name;
      if ((sk.linkedAttribute || "") === opt.value) opt.selected = true;
      attrSel.appendChild(opt);
    });
    marinara.on(attrSel, "change", function () {
      sk.linkedAttribute = attrSel.value;
      saveSheet(state.chatId, state.sheet);
    });
    marinara.on(attrSel, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
  }
  var valInput = marinara.addElement(row, "input", {
    "class": "mrr-p3-row__val",
    type: "number"
  });
  if (valInput) {
    valInput.value = String(sk.value || 0);
    marinara.on(valInput, "change", function () {
      var n = parseInt(valInput.value, 10);
      if (isNaN(n)) n = 0;
      sk.value = n;
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    });
  }
  var removeBtn = marinara.addElement(row, "button", {
    type: "button",
    "class": "mrr-p3-row__del",
    textContent: "×",
    title: "Remove skill"
  });
  if (removeBtn) marinara.on(removeBtn, "click", function (e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    removeCustomSkill(idx);
  });
}

/* Phase 5 step 5.6 — apply visual modifier classes to a state row based
   on its active value. Currently honors:
     - Initiative=Crashed → .mrr-state--initiative-crashed (distress)
     - Anima Banner=Suppressed → .mrr-state--anima-suppressed (muted)
   Idempotent: strips any prior --initiative-* / --anima-* modifier before
   adding the current one. Also writes a data-active-value attribute so
   future CSS can branch on the value without growing this list. */
function mrrStateRowApplyMods(row, stateName, activeValue) {
  if (!row || !row.classList) return;
  var classes = [];
  for (var i = 0; i < row.classList.length; i++) {
    var c = row.classList.item(i);
    if (c && c.indexOf("mrr-state--") === 0) classes.push(c);
  }
  classes.forEach(function (c) { row.classList.remove(c); });
  var name = String(stateName || "");
  var val = String(activeValue || "");
  if (name === "Initiative" && val === "Crashed") {
    row.classList.add("mrr-state--initiative-crashed");
  } else if (name === "Anima Banner" && val === "Suppressed") {
    row.classList.add("mrr-state--anima-suppressed");
  }
  try { row.setAttribute("data-active-value", val); } catch (e) {}
}

/* Phase 3.5 — StatesSection wrapper. Per-state name + select; persists
   to state.sheet.states[name]. Inline Phase-3 row (no primitive). */
function mrrP3RenderStatesSection(parent) {
  if (!parent || !state.ruleset) return;
  if (!Array.isArray(state.ruleset.states) || !state.ruleset.states.length) return;
  /* Phase 6 — per-state hides. sections.hidden entries prefixed `state:`
     filter individual states out of this section. Used to avoid double-
     rendering when a state is also surfaced inline as a Resources
     state-banner (Exalted's Anima Banner is the canonical case). */
  var stateHidden = {};
  if (state.ruleset.sections && Array.isArray(state.ruleset.sections.hidden)) {
    state.ruleset.sections.hidden.forEach(function (h) {
      if (typeof h === "string" && h.indexOf("state:") === 0) {
        stateHidden[h.slice(6)] = true;
      }
    });
  }
  var visibleStates = state.ruleset.states.filter(function (st) {
    return st && st.name && !stateHidden[st.name];
  });
  if (!visibleStates.length) return;
  mrrP3RenderSection(parent, {
    id: "states-p3",
    title: "STATES",
    defaultOpen: true
  }, function (body) {
    var stateValues = state.sheet.states || {};
    visibleStates.forEach(function (st) {
      /* Classic .mrr-state row class is flex-row; .mrr-p3-row would be
         grid with no template, stacking name + select vertically. */
      var row = marinara.addElement(body, "div", { "class": "mrr-state" });
      if (!row) return;
      marinara.addElement(row, "span", { "class": "mrr-state__name", textContent: st.name });
      var sel = marinara.addElement(row, "select", { "class": "mrr-state__select" });
      if (!sel) return;
      st.values.forEach(function (v) {
        var opt = document.createElement("option");
        opt.value = v.label;
        opt.textContent = v.label;
        if (v.label === stateValues[st.name]) opt.selected = true;
        sel.appendChild(opt);
      });
      /* Phase 5 step 5.6 — paint initial modifier class from current value. */
      mrrStateRowApplyMods(row, st.name, stateValues[st.name]);
      marinara.on(sel, "change", function () {
        if (!state.sheet.states) state.sheet.states = {};
        state.sheet.states[st.name] = sel.value;
        /* Phase 5 step 5.6 — repaint modifier class on change (no rebuild). */
        mrrStateRowApplyMods(row, st.name, sel.value);
        saveSheet(state.chatId, state.sheet);
      });
    });
  });
}

/* Phase 3.5 — ConditionsSection wrapper. Active conditions list with
   effect chips (disadv/adv from ruleset definitions); add-condition
   select with custom-name fallback. Delegates to existing addCondition
   / removeCondition for state mutations. */
function mrrP3RenderConditionsSection(parent) {
  if (!parent || !state.ruleset) return;
  mrrP3RenderSection(parent, {
    id: "conditions-p3",
    title: "CONDITIONS",
    defaultOpen: true
  }, function (body) {
    var defs = Array.isArray(state.ruleset.conditions) ? state.ruleset.conditions : [];
    var defByName = {};
    defs.forEach(function (d) { if (d && d.name) defByName[d.name.toLowerCase()] = d; });

    var active = Array.isArray(state.sheet.conditions) ? state.sheet.conditions : [];
    if (!active.length) {
      marinara.addElement(body, "div", { "class": "mrr-inv-empty", textContent: "None active." });
    }
    active.forEach(function (name) {
      var row = marinara.addElement(body, "div", { "class": "mrr-skill-spec-row mrr-condition-row" });
      if (!row) return;
      marinara.addElement(row, "span", { "class": "mrr-skill-spec-name", textContent: name });
      var def = defByName[String(name).toLowerCase()];
      if (def) {
        var effects = [];
        var dis = Array.isArray(def.imposesDisadvantageOn) ? def.imposesDisadvantageOn : [];
        var adv = Array.isArray(def.grantsAdvantageOn) ? def.grantsAdvantageOn : [];
        if (dis.length) effects.push("disadvantage on " + dis.join(", "));
        if (adv.length) effects.push("advantage on " + adv.join(", "));
        if (effects.length) {
          var effSpan = marinara.addElement(row, "span", { "class": "mrr-condition-effect", textContent: effects.join("; ") });
          if (effSpan && def.description) effSpan.title = def.description;
        } else if (def.description) {
          var descSpan = marinara.addElement(row, "span", { "class": "mrr-condition-effect", textContent: "(narrative)" });
          if (descSpan) descSpan.title = def.description;
        }
      }
      var rm = marinara.addElement(row, "button", {
        type: "button",
        "class": "mrr-track-add-btn mrr-track-add-btn--danger",
        textContent: "×",
        title: "Remove condition"
      });
      if (rm) marinara.on(rm, "click", function (e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        removeCondition(name);
      });
    });

    var addRow = marinara.addElement(body, "div", { "class": "mrr-skill-spec-row" });
    if (addRow) {
      var sel = marinara.addElement(addRow, "select", { "class": "mrr-item-form__select" });
      if (sel) {
        var blank = document.createElement("option");
        blank.value = ""; blank.textContent = "— add condition —";
        sel.appendChild(blank);
        defs.forEach(function (d) {
          if (!d || !d.name) return;
          if (active.indexOf(d.name) !== -1) return;
          var opt = document.createElement("option");
          opt.value = d.name; opt.textContent = d.name;
          if (d.description) opt.title = d.description;
          sel.appendChild(opt);
        });
        var customOpt = document.createElement("option");
        customOpt.value = "__custom__"; customOpt.textContent = "(other — type a name)";
        sel.appendChild(customOpt);
        marinara.on(sel, "change", function () {
          var v = sel.value;
          if (!v) return;
          /* Reset before addCondition; addCondition triggers renderSheet which
             detaches `sel`, so any post-addCondition assignment lands on a
             dead node. */
          sel.value = "";
          if (v === "__custom__") {
            var typed = window.prompt("Condition name:");
            if (typed && typed.trim()) addCondition(typed.trim());
          } else {
            addCondition(v);
          }
        });
      }
    }
  });
}

/* Phase 3.5 — BackgroundsSection wrapper. Iterates state.sheet.backgrounds,
   per-entry inline row with debounced editable name + value+stepper
   (unless cfg.textOnly — D&D feats). Delegates to addBackground /
   removeBackground for list mutations. */
function mrrP3RenderBackgroundsSection(parent) {
  if (!parent || !state.ruleset) return;
  var cfg = state.ruleset.backgrounds;
  if (!cfg || cfg.enabled !== true) return;
  var label = (cfg.label || "BACKGROUNDS").toUpperCase();
  var lo = (typeof cfg.min === "number") ? cfg.min : 0;
  var hi = (typeof cfg.max === "number") ? cfg.max : 5;
  var textOnly = !!cfg.textOnly;

  mrrP3RenderSection(parent, {
    id: "backgrounds-p3",
    title: label,
    defaultOpen: true
  }, function (body) {
    var entries = Array.isArray(state.sheet.backgrounds) ? state.sheet.backgrounds : [];
    entries.forEach(function (entry, idx) {
      var row = marinara.addElement(body, "div", { "class": "mrr-skill-spec-row" });
      if (!row) return;
      var nameInput = marinara.addElement(row, "input", {
        "class": "mrr-skill-spec-name",
        type: "text",
        placeholder: textOnly ? "feat (e.g. Sharpshooter, Lucky)" : "background (e.g. Resources, Allies)",
        value: entry.name || ""
      });
      if (nameInput) {
        var saveTimer = null;
        marinara.on(nameInput, "input", function () {
          entry.name = nameInput.value;
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(function () { saveSheet(state.chatId, state.sheet); }, 250);
        });
        marinara.on(nameInput, "blur", function () {
          if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
          saveSheet(state.chatId, state.sheet);
        });
        marinara.on(nameInput, "click", function (e) {
          if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        });
      }
      if (!textOnly) {
        var valInput = marinara.addElement(row, "input", {
          "class": "mrr-p3-row__val",
          type: "number"
        });
        if (valInput) {
          valInput.value = String(entry.value || 0);
          marinara.on(valInput, "change", function () {
            var n = parseInt(valInput.value, 10);
            if (isNaN(n)) n = lo;
            if (n < lo) n = lo;
            if (n > hi) n = hi;
            entry.value = n;
            saveSheet(state.chatId, state.sheet);
            renderSheet();
          });
        }
      }
      var removeBtn = marinara.addElement(row, "button", {
        type: "button",
        "class": "mrr-track-add-btn mrr-track-add-btn--danger",
        textContent: "×",
        title: "Remove " + (textOnly ? "feat" : "background")
      });
      if (removeBtn) marinara.on(removeBtn, "click", function (e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        removeBackground(idx);
      });
    });

    var addBtn = marinara.addElement(body, "button", {
      type: "button",
      "class": "mrr-track-add-btn mrr-char-btn--dashed",
      textContent: "+ Add " + (textOnly ? "Feat" : "Background")
    });
    if (addBtn) marinara.on(addBtn, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      addBackground();
    });
  });
}

/* Merits & Flaws — V20-anchored section with two add-rows-as-needed
   subgroups (Merits and Flaws). Each entry: { id, kind, name, type, points }
   where kind ∈ {"merit","flaw"} and type ∈ {"physical","mental","social","supernatural"}.
   Points: 1-7 (V20 canon). Saved in state.sheet.meritsFlaws[]. Section
   positioned between backgrounds and inventory in V20 sections.order. */
var MERIT_FLAW_TYPES = [
  { id: "physical", label: "Physical" },
  { id: "mental", label: "Mental" },
  { id: "social", label: "Social" },
  { id: "supernatural", label: "Supernatural" }
];

function newMeritFlawId() {
  return "mf-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);
}

function addMeritFlaw(kind) {
  if (!state.sheet) return;
  if (!Array.isArray(state.sheet.meritsFlaws)) state.sheet.meritsFlaws = [];
  var entry = {
    id: newMeritFlawId(),
    kind: (kind === "flaw") ? "flaw" : "merit",
    name: "",
    type: "physical",
    points: 1
  };
  state.sheet.meritsFlaws.push(entry);
  saveSheet(state.chatId, state.sheet);
  renderSheet();
}

function removeMeritFlaw(id) {
  if (!state.sheet || !Array.isArray(state.sheet.meritsFlaws)) return;
  for (var i = 0; i < state.sheet.meritsFlaws.length; i++) {
    if (state.sheet.meritsFlaws[i] && state.sheet.meritsFlaws[i].id === id) {
      state.sheet.meritsFlaws.splice(i, 1);
      saveSheet(state.chatId, state.sheet);
      renderSheet();
      return;
    }
  }
}

function mrrP3RenderMeritsFlawsSection(parent) {
  if (!parent || !state.ruleset) return;
  if (!Array.isArray(state.sheet.meritsFlaws)) state.sheet.meritsFlaws = [];
  var entries = state.sheet.meritsFlaws;

  mrrP3RenderSection(parent, {
    id: "merits-flaws-p3",
    title: "MERITS & FLAWS",
    defaultOpen: true
  }, function (body) {
    ["merit", "flaw"].forEach(function (kind) {
      var head = marinara.addElement(body, "div", {
        "class": "mrr-skill-group-head",
        textContent: kind === "merit" ? "Merits" : "Flaws"
      });
      if (head) {
        head.style.fontSize = "0.85em";
        head.style.fontWeight = "600";
        head.style.opacity = "0.78";
        head.style.margin = "10px 0 4px 0";
        head.style.letterSpacing = "0.04em";
        head.style.textTransform = "uppercase";
      }

      entries.forEach(function (entry) {
        if (!entry || entry.kind !== kind) return;
        var row = marinara.addElement(body, "div", { "class": "mrr-skill-spec-row" });
        if (!row) return;

        var nameInput = marinara.addElement(row, "input", {
          "class": "mrr-skill-spec-name",
          type: "text",
          placeholder: kind === "merit" ? "merit (e.g. Eat Food, Iron Will)" : "flaw (e.g. Lunatic, Repulsed by Garlic)",
          value: entry.name || ""
        });
        if (nameInput) {
          var saveTimer = null;
          marinara.on(nameInput, "input", function () {
            entry.name = nameInput.value;
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(function () { saveSheet(state.chatId, state.sheet); }, 250);
          });
          marinara.on(nameInput, "blur", function () {
            if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
            saveSheet(state.chatId, state.sheet);
          });
          marinara.on(nameInput, "click", function (e) {
            if (e && typeof e.stopPropagation === "function") e.stopPropagation();
          });
        }

        var typeSel = marinara.addElement(row, "select", { "class": "mrr-custom-skill-attr" });
        if (typeSel) {
          MERIT_FLAW_TYPES.forEach(function (t) {
            var opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = t.label;
            if ((entry.type || "physical") === t.id) opt.selected = true;
            typeSel.appendChild(opt);
          });
          marinara.on(typeSel, "change", function () {
            entry.type = typeSel.value;
            saveSheet(state.chatId, state.sheet);
          });
          marinara.on(typeSel, "click", function (e) {
            if (e && typeof e.stopPropagation === "function") e.stopPropagation();
          });
        }

        var ptsInput = marinara.addElement(row, "input", {
          "class": "mrr-p3-row__val",
          type: "number"
        });
        if (ptsInput) {
          ptsInput.value = String(entry.points || 1);
          ptsInput.min = "1";
          ptsInput.max = "7";
          ptsInput.title = kind === "merit" ? "Merit cost (1-7)" : "Flaw bonus points returned (1-7)";
          marinara.on(ptsInput, "change", function () {
            var n = parseInt(ptsInput.value, 10);
            if (isNaN(n)) n = 1;
            if (n < 1) n = 1;
            if (n > 7) n = 7;
            entry.points = n;
            ptsInput.value = String(n);
            saveSheet(state.chatId, state.sheet);
          });
        }

        var removeBtn = marinara.addElement(row, "button", {
          type: "button",
          "class": "mrr-track-add-btn mrr-track-add-btn--danger",
          textContent: "×",
          title: "Remove " + (kind === "merit" ? "merit" : "flaw")
        });
        if (removeBtn) marinara.on(removeBtn, "click", function (e) {
          if (e && typeof e.stopPropagation === "function") e.stopPropagation();
          removeMeritFlaw(entry.id);
        });
      });

      var addBtn = marinara.addElement(body, "button", {
        type: "button",
        "class": "mrr-track-add-btn mrr-char-btn--dashed",
        textContent: kind === "merit" ? "+ Add Merit" : "+ Add Flaw"
      });
      if (addBtn) marinara.on(addBtn, "click", function (e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        addMeritFlaw(kind);
      });
    });
  });
}

/* Phase 3.5 — IntimaciesSection wrapper. Button-only — clicking opens
   the existing classic flyout panel (renderIntimaciesPanelContents et
   al.). Full flyout migration deferred to Phase 3.6+. */
function mrrP3RenderIntimaciesSection(parent) {
  /* Phase 4 — diagnostic logging to surface why the section may not be
     rendering for the user. */
  log("mrrP3RenderIntimaciesSection ENTRY: parent=" + (!!parent) +
      " ruleset=" + (!!state.ruleset) +
      " totalIntimacyCount=" + (typeof totalIntimacyCount) +
      " showIntimacies=" + (typeof showIntimacies));
  if (!parent || !state.ruleset) {
    warn("mrrP3RenderIntimaciesSection: early-return on parent/ruleset guard");
    return;
  }
  if (typeof totalIntimacyCount !== "function" || typeof showIntimacies !== "function") {
    warn("mrrP3RenderIntimaciesSection: early-return on helper-function guard");
    return;
  }
  mrrP3RenderSection(parent, {
    id: "intimacies-p3",
    title: "INTIMACIES",
    defaultOpen: true
  }, function (body) {
    log("mrrP3RenderIntimaciesSection BODY: rendering button, count=" + totalIntimacyCount());
    var btn = marinara.addElement(body, "button", {
      type: "button",
      "class": "mrr-char-btn mrr-char-btn--dashed",
      textContent: "Intimacies (" + totalIntimacyCount() + ")"
    });
    if (btn) marinara.on(btn, "click", function () { showIntimacies(!state.intimaciesOpen); });
  });
}

/* Phase 3.6 — InventorySection wrapper. Calls the renderInventoryList
   helper extracted from classic renderInventory (so the produced DOM
   is byte-identical to the classic body without double-framing it
   inside a Phase-3 section). All inventory functionality preserved:
   add equipment dialog, edit dialog, equip toggle, atk/dmg buttons,
   delete confirmation, Open Items flyout. */
function mrrP3RenderInventorySection(parent) {
  if (!parent) return;
  mrrP3RenderSection(parent, {
    id: "inventory-p3",
    title: "EQUIPMENT",
    defaultOpen: true
  }, function (body) {
    renderInventoryList(body);
  });
}

/* Phase 3.6 — AbilitiesSection wrapper. Same pattern as Intimacies:
   Phase-3 section frame containing a single button that opens the
   classic spellbook flyout. Ruleset config (getAbilitiesConfig)
   provides the section label — Charms for Exalted, Spells for D&D
   etc. Section omitted when ruleset declares no abilities. */
function mrrP3RenderAbilitiesSection(parent) {
  if (!parent || !state.ruleset) return;
  if (typeof getAbilitiesConfig !== "function") return;
  var cfg = getAbilitiesConfig();
  if (!cfg) return;
  if (typeof showSpellbook !== "function" || typeof totalAbilityCount !== "function") return;
  var label = String(cfg.label || "ABILITIES").toUpperCase();
  mrrP3RenderSection(parent, {
    id: "abilities-p3",
    title: label,
    defaultOpen: true
  }, function (body) {
    var btn = marinara.addElement(body, "button", {
      type: "button",
      "class": "mrr-char-btn mrr-char-btn--dashed",
      textContent: cfg.label + " (" + totalAbilityCount() + ")"
    });
    if (btn) marinara.on(btn, "click", function () { showSpellbook(!state.spellbookOpen); });
  });
}

/* End Phase 3.2 + 3.3 + 3.4 + 3.5 + 3.6 cutover plumbing. */

function renderSheet() {
  if (!state.ruleset) return;

  /* Phase 4 — preserve internal scroll across rebuild. addBackground /
     addCustomSkill / addCondition / addSpecialty / addIntimacy / addItem
     all call renderSheet, which removes the old mountEl and creates a
     fresh one. Without this, the user sees the sheet jump to the top of
     attributes after every add — the bouncing-to-top complaint that's
     persisted across multiple iterations. Capture before, restore after
     via rAF so the new DOM has had a chance to lay out. */
  var savedScrollTop = (state.mountEl && typeof state.mountEl.scrollTop === "number")
    ? state.mountEl.scrollTop : 0;
  function restoreScroll() {
    if (!state.mountEl || !savedScrollTop) return;
    var el = state.mountEl;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () { try { el.scrollTop = savedScrollTop; } catch (e) {} });
    } else {
      try { el.scrollTop = savedScrollTop; } catch (e) {}
    }
  }

  /* Cutover step 1 (Phase 3.8): Phase 3 renderer is now the only path.
     Classic renderSheet body below is unreachable dead code — kept
     temporarily as an emergency rollback hatch during the cutover
     verification window, deleted in step 2 once live testing confirms
     no Phase-3 path regressions. The useNewRenderer flag, toggle
     buttons, and mergeSheet wiring all become no-ops here and get
     swept away in the same step-2 commit. */
  if (typeof mrrP3RenderSheet === "function") {
    mrrP3RenderSheet();
    restoreScroll();
    return;
  }
  /* Defensive only — mrrP3RenderSheet is defined unconditionally in
     this file; this function should always early-return above. */
}

function renderSheetHeader(parent) {
  var header = marinara.addElement(parent, "div", { "class": "mrr-sheet__header" });
  if (!header) return;

  var titleRow = marinara.addElement(header, "div", { "class": "mrr-sheet__title-row" });
  if (titleRow) {
    marinara.addElement(titleRow, "span", {
      "class": "mrr-sheet__title",
      textContent: state.ruleset.name
    });
    marinara.addElement(titleRow, "span", {
      "class": "mrr-sheet__meta",
      textContent: "v" + state.ruleset.version + " · " + state.ruleset.dice.type
    });
  }

  var charRow = marinara.addElement(header, "div", { "class": "mrr-sheet__char-row" });
  if (!charRow) return;

  marinara.addElement(charRow, "label", {
    "class": "mrr-sheet__char-label",
    textContent: "Character:"
  });

  var sel = marinara.addElement(charRow, "select", { "class": "mrr-char-select" });
  if (sel) {
    state.characters.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      if (c.id === state.activeCharacterId) opt.selected = true;
      sel.appendChild(opt);
    });
    marinara.on(sel, "change", function () { switchCharacter(sel.value); });
  }

  var btnAdd = marinara.addElement(charRow, "button", {
    "class": "mrr-char-btn",
    textContent: "+",
    title: "Add a new character sheet"
  });
  if (btnAdd) marinara.on(btnAdd, "click", addCharacter);

  var btnRename = marinara.addElement(charRow, "button", {
    "class": "mrr-char-btn",
    textContent: "rename"
  });
  if (btnRename) marinara.on(btnRename, "click", renameActiveCharacter);

  var btnRemove = marinara.addElement(charRow, "button", {
    "class": "mrr-char-btn mrr-char-btn--danger",
    textContent: "x",
    title: "Remove this character"
  });
  if (btnRemove) marinara.on(btnRemove, "click", removeActiveCharacter);

  var btnSave = marinara.addElement(charRow, "button", {
    "class": "mrr-char-btn",
    textContent: "save",
    title: "Download all characters in this chat as a JSON file"
  });
  if (btnSave) marinara.on(btnSave, "click", exportBundle);

  var btnLoad = marinara.addElement(charRow, "button", {
    "class": "mrr-char-btn",
    textContent: "load",
    title: "Replace this chat's characters with a previously-saved JSON file"
  });
  if (btnLoad) marinara.on(btnLoad, "click", importBundle);

  marinara.addElement(charRow, "span", { "class": "mrr-saved-indicator", textContent: "" });

  /* Phase 5 step 5.1 — Identity card. Wraps the existing identity inputs
     in a compact card matching the prototype's `.identity` anatomy
     (UI-build.md §3.4). Sub-row is ruleset-driven: when
     state.ruleset.identityFields[] is declared (Plan B schema add) we
     iterate it; otherwise we fall back to the legacy two-field pattern
     using header.raceLabel/classLabel so existing rulesets keep working.

     The avatar slot is a placeholder for now (Phase 5 doesn't ship
     portrait upload). The name input edits the active character's name
     in place (live), mirroring the rename button's effect without the
     prompt round-trip. */
  var hcfg = (state.ruleset && state.ruleset.header) || {};
  var raceLbl = hcfg.raceLabel || "Race";
  var classLbl = hcfg.classLabel || "Class";
  if (!state.sheet.identity) state.sheet.identity = { race: "", "class": "" };

  var idFields = (state.ruleset && Array.isArray(state.ruleset.identityFields))
    ? state.ruleset.identityFields
    : [{ label: raceLbl, key: "race" }, { label: classLbl, key: "class" }];

  var idCard = marinara.addElement(header, "div", { "class": "mrr-identity" });
  if (!idCard) return;
  marinara.addElement(idCard, "div", {
    "class": "mrr-identity__avatar",
    textContent: "PORTRAIT"
  });
  var idMain = marinara.addElement(idCard, "div", { "class": "mrr-identity__main" });
  if (!idMain) return;

  var activeChar = null;
  for (var ci = 0; ci < state.characters.length; ci++) {
    if (state.characters[ci].id === state.activeCharacterId) {
      activeChar = state.characters[ci];
      break;
    }
  }
  var nameInput = marinara.addElement(idMain, "input", {
    "class": "mrr-identity__name",
    type: "text",
    value: (activeChar && activeChar.name) || "",
    placeholder: "Character name"
  });
  if (nameInput) {
    var nameSaveTimer = null;
    marinara.on(nameInput, "input", function () {
      if (!activeChar) return;
      activeChar.name = nameInput.value;
      if (nameSaveTimer) clearTimeout(nameSaveTimer);
      nameSaveTimer = setTimeout(function () { saveCharacters(); renderSheet(); }, 250);
    });
    marinara.on(nameInput, "blur", function () {
      if (nameSaveTimer) { clearTimeout(nameSaveTimer); nameSaveTimer = null; }
      if (!activeChar) return;
      saveCharacters();
      renderSheet();
    });
    marinara.on(nameInput, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
  }

  var idSub = marinara.addElement(idMain, "div", { "class": "mrr-identity__sub" });
  if (idSub) {
    idFields.forEach(function (f) {
      if (!f || !f.key) return;
      mrrRenderIdentitySubField(idSub, f.label || f.key, f.key, f.placeholder);
    });
  }
}

/* One label+input sub-item for the identity card's sub-row. Mirrors
   renderIdentityField's debounced-save shape (250ms) and click-stop
   propagation, but emits the prototype-shaped .mrr-identity__sub-*
   class names so the type scale and borderless styling apply.

   Class-dropdown special case: when key === "class" AND the ruleset
   declares classOptions[], the field renders as a <select> driven by
   that array. Selection persists in state.sheet.identity.class (same
   storage as the free-text path), so save / load / character-card
   migration paths stay unchanged. On change, the sheet re-renders so
   any dice resources with dieFromClass:true pick up the new hitDie. */
function mrrRenderIdentitySubField(parent, labelText, key, placeholder) {
  var item = marinara.addElement(parent, "div", { "class": "mrr-identity__sub-item" });
  if (!item) return;
  marinara.addElement(item, "span", {
    "class": "mrr-identity__sub-label",
    textContent: labelText
  });

  var classOptions = (key === "class" && state.ruleset && Array.isArray(state.ruleset.classOptions))
    ? state.ruleset.classOptions
    : null;

  if (classOptions && classOptions.length > 0) {
    var currentClass = (state.sheet.identity && state.sheet.identity[key]) || "";
    var select = marinara.addElement(item, "select", { "class": "mrr-identity__sub-input" });
    if (!select) return;
    /* Empty placeholder option — used when the player hasn't picked yet
       (so dice resources with dieFromClass fall back to their static
       die). Disabled so the user can't re-select it after picking. */
    var placeholderOpt = marinara.addElement(select, "option", {
      value: "",
      textContent: "(choose " + (typeof labelText === "string" ? labelText.toLowerCase() : "class") + ")"
    });
    if (placeholderOpt && !currentClass) placeholderOpt.selected = true;
    classOptions.forEach(function (opt) {
      if (!opt || !opt.name) return;
      var label = opt.name + (opt.hitDie ? " (" + opt.hitDie + ")" : "");
      var optionEl = marinara.addElement(select, "option", {
        value: opt.name,
        textContent: label
      });
      if (optionEl && opt.name === currentClass) optionEl.selected = true;
    });
    marinara.on(select, "change", function () {
      if (!state.sheet.identity) state.sheet.identity = {};
      state.sheet.identity[key] = select.value;
      saveSheet(state.chatId, state.sheet);
      /* Re-render so dieFromClass resources pick up the new hitDie. */
      renderSheet();
    });
    marinara.on(select, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
    return;
  }

  var input = marinara.addElement(item, "input", {
    "class": "mrr-identity__sub-input",
    type: "text",
    value: (state.sheet.identity && state.sheet.identity[key]) || "",
    placeholder: placeholder || (typeof labelText === "string" ? labelText.toLowerCase() : "")
  });
  if (!input) return;
  var saveTimer = null;
  marinara.on(input, "input", function () {
    if (!state.sheet.identity) state.sheet.identity = {};
    state.sheet.identity[key] = input.value;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveSheet(state.chatId, state.sheet); }, 250);
  });
  marinara.on(input, "blur", function () {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    saveSheet(state.chatId, state.sheet);
  });
  marinara.on(input, "click", function (e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  });
}

function renderAttributes(parent) {
  var sec = marinara.addElement(parent, "div", { "class": "mrr-section" });
  if (!sec) return;
  marinara.addElement(sec, "div", { "class": "mrr-section__title", textContent: "Attributes" });

  var groups = {};
  var groupOrder = [];
  state.ruleset.attributes.forEach(function (a) {
    var g = a.group || "";
    if (!(g in groups)) { groups[g] = []; groupOrder.push(g); }
    groups[g].push(a);
  });

  groupOrder.forEach(function (g) {
    var grpEl = marinara.addElement(sec, "div", { "class": "mrr-group" });
    if (!grpEl) return;
    if (g) marinara.addElement(grpEl, "div", { "class": "mrr-group__label", textContent: g });
    groups[g].forEach(function (a) { renderAttrRow(grpEl, a); });
  });
}

function renderAttrRow(parent, attr) {
  var row = marinara.addElement(parent, "div", { "class": "mrr-row" });
  if (!row) return;
  marinara.addElement(row, "span", { "class": "mrr-row__name", textContent: attr.name });
  marinara.addElement(row, "span", { "class": "mrr-row__abbr", textContent: attr.abbreviation || "" });
  var val = makeEditableValue(
    row,
    function () { return state.sheet.attributes[attr.name]; },
    function (v) { state.sheet.attributes[attr.name] = v; saveSheet(state.chatId, state.sheet); },
    attr.min, attr.max,
    refreshAllBars
  );

  addStepper(row, {
    get: function () { return state.sheet.attributes[attr.name]; },
    set: function (v) { state.sheet.attributes[attr.name] = v; saveSheet(state.chatId, state.sheet); },
    min: attr.min,
    max: attr.max,
    onChange: function (v) {
      if (val) val.value = String(v);
      /* Defensive: a future ruleset's maxFormula may reference an
         attribute. Cheap to refresh; no DOM rebuild. */
      refreshAllBars();
    }
  });
}

function renderSkills(parent) {
  var sec = marinara.addElement(parent, "div", { "class": "mrr-section" });
  if (!sec) return;
  var title = (state.ruleset.id === "exalted3e") ? "Abilities" : "Skills";
  marinara.addElement(sec, "div", { "class": "mrr-section__title", textContent: title });

  state.ruleset.skills.forEach(function (sk) { renderSkillRow(sec, sk); });

  /* Custom user-added skills/lores. Render after the ruleset's declared
     skills so the system's canonical list reads first; custom rows mirror
     the specialty/background row layout (free-text name + value + stepper
     + remove). The "+ Add Skill" button at the section foot adds a fresh
     blank row; users can add as many as they want. */
  var customs = Array.isArray(state.sheet.customSkills) ? state.sheet.customSkills : [];
  customs.forEach(function (sk, idx) { renderCustomSkillRow(sec, sk, idx); });

  var addBtn = marinara.addElement(sec, "button", {
    "class": "mrr-track-add-btn mrr-char-btn--dashed",
    textContent: "+ Add Skill"
  });
  if (addBtn) marinara.on(addBtn, "click", function (e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    addCustomSkill();
  });
}

/* Saving throws — D&D, PF2e, and any system whose resolution rolls a
   save against a fixed DC. Each entry: { name, linkedAttribute }. The
   row mirrors a skill row visually but with no specialty / "+S" / Add-
   Skill button — saves are a fixed canonical list per ruleset (D&D 5e:
   six, one per ability; PF2e: three, Fortitude/Reflex/Will). The
   computed bonus uses the same skillBonusFormula as skills if declared,
   otherwise falls back to attribute mod alone. Proficiency tier per save
   reuses the existing skillProficiency machinery (saves and skills share
   the tier vocabulary in D&D 5e). */
function renderSaves(parent) {
  var saves = (state.ruleset && Array.isArray(state.ruleset.saves)) ? state.ruleset.saves : [];
  if (!saves.length) return;
  var sec = marinara.addElement(parent, "div", { "class": "mrr-section" });
  if (!sec) return;
  marinara.addElement(sec, "div", { "class": "mrr-section__title", textContent: "Saving Throws" });
  saves.forEach(function (sv) { renderSaveRow(sec, sv); });
}

function renderSaveRow(parent, save) {
  var row = marinara.addElement(parent, "div", { "class": "mrr-row" });
  if (!row) return;
  marinara.addElement(row, "span", { "class": "mrr-row__name", textContent: save.name });
  marinara.addElement(row, "span", { "class": "mrr-row__abbr", textContent: save.linkedAttribute ? "(" + save.linkedAttribute + ")" : "" });

  var skillFormula = state.ruleset && state.ruleset.resolution && state.ruleset.resolution.skillBonusFormula;
  var calc = marinara.addElement(row, "span", {
    "class": "mrr-row__value mrr-row__value--autocalc",
    title: skillFormula ? ("Auto-calculated: " + skillFormula) : "Auto-calculated from attribute modifier"
  });
  function refreshSaveBonus() {
    if (!calc || !calc.parentNode) return;
    var ctx = statContext();
    var t = tierForSkill(save.name);
    var tierBonus = (t && t.rollBonusFormula) ? evalFormula(t.rollBonusFormula, ctx) : 0;
    if (tierBonus == null) tierBonus = 0;
    var attrMod = 0;
    if (save.linkedAttribute) {
      var modKey = save.linkedAttribute + "_mod";
      if (typeof ctx[modKey] === "number") attrMod = ctx[modKey];
    }
    var num;
    if (skillFormula) {
      var subbed = String(skillFormula)
        .replace(/\{linkedAttribute_mod\}/g, String(attrMod))
        .replace(/\{tierBonus\}/g, String(tierBonus));
      var v = evalFormula(subbed, ctx);
      num = (typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0;
    } else {
      num = attrMod + tierBonus;
    }
    var sign = num >= 0 ? "+" : "";
    calc.textContent = sign + String(num);
  }
  refreshSaveBonus();
  barRefreshers.push(refreshSaveBonus);

  /* Tier button mirrors the skill tier UX so the user can mark a save
     proficient with a single click. Cycle through the tier list; the
     button uses the same renderer/handler so styling stays consistent. */
  var stp = marinara.addElement(row, "span", { "class": "mrr-stepper mrr-stepper--autocalc" });
  if (!stp) return;
  var tier = tierForSkill(save.name);
  if (tier) {
    var tierBtn = marinara.addElement(stp, "button", {
      "class": "mrr-skill-tier-btn mrr-skill-tier-btn--" + tier.code,
      textContent: tier.code,
      title: tier.label + (tier.rollBonusFormula ? " — " + tier.rollBonusFormula : "")
    });
    if (tierBtn) marinara.on(tierBtn, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      cycleTier(save.name, tierBtn);
    });
  }

  /* Roll button — opens the dice widget pre-filled with this save's
     attribute mod and proficiency bonus. The player drops the DC the GM
     called and rolls; the chat-tag pipeline handles the result. */
  if (state.ruleset.resolution && state.ruleset.resolution.mode === MODES.SINGLE) {
    var rollBtn = marinara.addElement(stp, "button", { textContent: "roll", "class": "mrr-row__roll" });
    if (rollBtn) marinara.on(rollBtn, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      quickRollForSave(save);
    });
  }
}

/* One custom skill row. Mirrors renderBackgroundRow's debounced-name +
   editable-value-with-stepper + remove button, plus an optional linked
   attribute select drawn from the ruleset's attributes (so custom skills
   can participate in dice math like ruleset skills). */
function renderCustomSkillRow(parent, sk, idx) {
  var row = marinara.addElement(parent, "div", { "class": "mrr-skill-spec-row mrr-custom-skill-row" });
  if (!row) return;

  var nameInput = marinara.addElement(row, "input", {
    "class": "mrr-skill-spec-name",
    type: "text",
    placeholder: "skill or lore name",
    value: sk.name || ""
  });
  if (nameInput) {
    var saveTimer = null;
    marinara.on(nameInput, "input", function () {
      sk.name = nameInput.value;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { saveSheet(state.chatId, state.sheet); }, 250);
    });
    marinara.on(nameInput, "blur", function () {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      saveSheet(state.chatId, state.sheet);
    });
    marinara.on(nameInput, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
  }

  /* Linked-attribute picker. Optional — blank means "no linked attribute"
     (Lore-style skills in some systems don't link to a single attribute
     because the attribute depends on the action). The ruleset's attribute
     list drives the choices. */
  var attrSel = marinara.addElement(row, "select", { "class": "mrr-custom-skill-attr" });
  if (attrSel) {
    var blank = document.createElement("option");
    blank.value = ""; blank.textContent = "—";
    attrSel.appendChild(blank);
    (state.ruleset.attributes || []).forEach(function (a) {
      var opt = document.createElement("option");
      opt.value = a.abbreviation || a.name;
      opt.textContent = a.abbreviation || a.name;
      if ((sk.linkedAttribute || "") === opt.value) opt.selected = true;
      attrSel.appendChild(opt);
    });
    marinara.on(attrSel, "change", function () {
      sk.linkedAttribute = attrSel.value;
      saveSheet(state.chatId, state.sheet);
    });
    marinara.on(attrSel, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
  }

  var val = makeEditableValue(
    row,
    function () { return sk.value || 0; },
    function (v) { sk.value = v; saveSheet(state.chatId, state.sheet); },
    0, DEFAULT_SKILL_MAX,
    refreshAllBars
  );
  addStepper(row, {
    get: function () { return sk.value || 0; },
    set: function (v) { sk.value = v; saveSheet(state.chatId, state.sheet); },
    min: 0,
    max: DEFAULT_SKILL_MAX,
    onChange: function (v) { if (val) val.value = String(v); refreshAllBars(); }
  });

  var removeBtn = marinara.addElement(row, "button", {
    "class": "mrr-track-add-btn mrr-track-add-btn--danger",
    textContent: "×",
    title: "Remove skill"
  });
  if (removeBtn) marinara.on(removeBtn, "click", function (e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    removeCustomSkill(idx);
  });
}

function renderSkillRow(parent, skill) {
  var row = marinara.addElement(parent, "div", { "class": "mrr-row" });
  if (!row) return;
  marinara.addElement(row, "span", { "class": "mrr-row__name", textContent: skill.name });
  marinara.addElement(row, "span", { "class": "mrr-row__abbr", textContent: skill.linkedAttribute ? "(" + skill.linkedAttribute + ")" : "" });

  /* Autocalc skill bonus: when the ruleset declares
     `resolution.skillBonusFormula` (D&D, PF2e — systems where the skill
     "value" the player cares about is the *roll bonus*, not a dot
     investment), display the computed bonus in place of the raw stepper.
     The formula has access to {linkedAttribute_mod} (substituted with the
     skill's specific attribute mod) and {tierBonus} (the active
     proficiency tier's rollBonusFormula evaluated). For Exalted / WoD
     style skills the formula is absent and we fall through to the
     historical raw-value stepper. */
  var skillFormula = state.ruleset && state.ruleset.resolution && state.ruleset.resolution.skillBonusFormula;
  var stp;
  if (skillFormula && typeof skillFormula === "string" && skillFormula) {
    var calc = marinara.addElement(row, "span", {
      "class": "mrr-row__value mrr-row__value--autocalc",
      title: "Auto-calculated: " + skillFormula
    });
    function refreshSkillBonus() {
      if (!calc || !calc.parentNode) return;
      var ctx = statContext();
      var t = tierForSkill(skill.name);
      var tierBonus = (t && t.rollBonusFormula) ? evalFormula(t.rollBonusFormula, ctx) : 0;
      if (tierBonus == null) tierBonus = 0;
      var attrMod = 0;
      if (skill.linkedAttribute) {
        var modKey = skill.linkedAttribute + "_mod";
        if (typeof ctx[modKey] === "number") attrMod = ctx[modKey];
      }
      /* Local substitution: {linkedAttribute_mod} and {tierBonus} are
         skill-specific tokens, not real stats. evalFormula's whitelist
         only accepts arithmetic + {Stat} placeholders, so we pre-
         substitute these two tokens with their numeric values before
         evaluating the rest of the formula against the broader context. */
      var subbed = String(skillFormula)
        .replace(/\{linkedAttribute_mod\}/g, String(attrMod))
        .replace(/\{tierBonus\}/g, String(tierBonus));
      var v = evalFormula(subbed, ctx);
      var num = (typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0;
      var sign = num >= 0 ? "+" : "";
      calc.textContent = sign + String(num);
    }
    refreshSkillBonus();
    barRefreshers.push(refreshSkillBonus);
    /* Empty stepper container so tier + roll buttons still have a parent.
       The stepper element itself is suppressed in the autocalc branch —
       the formula is the source of truth, and a +/- "raw skill value"
       has no meaning in the systems that use this. */
    stp = marinara.addElement(row, "span", { "class": "mrr-stepper mrr-stepper--autocalc" });
  } else {
    var val = makeEditableValue(
      row,
      function () { return state.sheet.skills[skill.name]; },
      function (v) { state.sheet.skills[skill.name] = v; saveSheet(state.chatId, state.sheet); },
      skill.min != null ? skill.min : 0,
      skill.max != null ? skill.max : DEFAULT_SKILL_MAX,
      refreshAllBars
    );

    stp = addStepper(row, {
      get: function () { return state.sheet.skills[skill.name]; },
      set: function (v) { state.sheet.skills[skill.name] = v; saveSheet(state.chatId, state.sheet); },
      min: skill.min != null ? skill.min : 0,
      max: skill.max != null ? skill.max : DEFAULT_SKILL_MAX,
      onChange: function (v) {
        if (val) val.value = String(v);
        refreshAllBars();
      }
    });
  }
  if (!stp) return;

  var tier = tierForSkill(skill.name);
  if (tier) {
    var tierBtn = marinara.addElement(stp, "button", {
      "class": "mrr-skill-tier-btn mrr-skill-tier-btn--" + tier.code,
      textContent: tier.code,
      title: tier.label + (tier.rollBonusFormula ? " — " + tier.rollBonusFormula : "")
    });
    if (tierBtn) marinara.on(tierBtn, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      cycleTier(skill.name, tierBtn);
    });
  }

  var specsCfg = state.ruleset.skillSpecialties;
  if (specsCfg && specsCfg.enabled) {
    var addBtn = marinara.addElement(stp, "button", {
      "class": "mrr-skill-spec-btn",
      textContent: "+S",
      title: "Add specialty"
    });
    if (addBtn) marinara.on(addBtn, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      addSpecialty(skill.name);
    });
  }

  var roll = marinara.addElement(stp, "button", { textContent: "roll", "class": "mrr-row__roll" });
  if (roll) marinara.on(roll, "click", function () { quickRollForSkill(skill); });

  /* Specialties render as siblings of the skill row in the same section
     so the row's stepper / button grid stays aligned — putting them
     inside the skill row would force every column to widen. */
  var specs = (state.sheet.skillSpecialties && state.sheet.skillSpecialties[skill.name]) || [];
  if (specs.length && specsCfg && specsCfg.enabled) {
    specs.forEach(function (sp, idx) { renderSpecialtyRow(parent, skill, sp, idx); });
  }
}

function renderSpecialtyRow(parent, skill, spec, idx) {
  var row = marinara.addElement(parent, "div", { "class": "mrr-skill-spec-row" });
  if (!row) return;

  var nameInput = marinara.addElement(row, "input", {
    "class": "mrr-skill-spec-name",
    type: "text",
    placeholder: "specialty (e.g. Daiklaves)",
    value: spec.name || ""
  });
  if (nameInput) {
    /* Save on input via debounce; do NOT re-render mid-typing or focus is
       lost on every keystroke. The DOM input value already reflects what
       the user typed; only state needs to keep up. */
    var saveTimer = null;
    marinara.on(nameInput, "input", function () {
      spec.name = nameInput.value;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        saveSheet(state.chatId, state.sheet);
      }, 250);
    });
    marinara.on(nameInput, "blur", function () {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      saveSheet(state.chatId, state.sheet);
    });
    /* Defensive against any future parent click handler — the input must
       receive its own clicks for cursor placement, not bubble up. */
    marinara.on(nameInput, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
  }

  var valueLabel = (state.ruleset.skillSpecialties && state.ruleset.skillSpecialties.valueLabel) || "";
  if (valueLabel) {
    marinara.addElement(row, "span", { "class": "mrr-skill-spec-label", textContent: valueLabel });
  }

  var valSpan = marinara.addElement(row, "span", { "class": "mrr-row__value", textContent: String(spec.value || 0) });
  addStepper(row, {
    get: function () { return spec.value || 0; },
    set: function (v) { spec.value = v; saveSheet(state.chatId, state.sheet); },
    min: 0,
    max: 9,
    onChange: function (v) { if (valSpan) valSpan.textContent = String(v); }
  });

  var removeBtn = marinara.addElement(row, "button", {
    "class": "mrr-track-add-btn mrr-track-add-btn--danger",
    textContent: "×",
    title: "Remove specialty"
  });
  if (removeBtn) marinara.on(removeBtn, "click", function (e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    removeSpecialty(skill.name, idx);
  });
}

/* Quick-roll a save: opens the dice widget pre-filled with the save's
   computed bonus, split into mod (attribute modifier) + prof (proficiency
   tier bonus) so the user sees both terms separately and can edit the DC
   to whatever the GM called. */
function quickRollForSave(save) {
  if (!state.ruleset) return;
  var mode = state.ruleset.resolution.mode;
  if (mode !== MODES.SINGLE && mode !== MODES.UNDER && mode !== MODES.STANCE) return;
  /* Pre-set advantage / disadvantage from active conditions. (SINGLE only —
     UNDER and STANCE have no advantage/disadvantage concept by default.) */
  if (mode === MODES.SINGLE) {
    var condMode = conditionRollMode("save");
    if (condMode !== "normal") state.diceAdvantage = condMode;
  }
  if (mode === MODES.STANCE) {
    /* Stance-modal-pool saves (L&F-style "make a Number roll" prompts).
       The widget exposes a single-stat input (e.g. L&F's "Number") and a
       pool size; the stat name comes from resolution.stat. We pre-fill
       the stat with the character's stored value (falling back to
       resolution.statDefault or 4), seed pool at 1, and let the player
       pick LASERS or FEELINGS each roll — the stance is in-fiction and
       must not be auto-selected. */
    var statNameSv = (state.ruleset.resolution && state.ruleset.resolution.stat) || "Stat";
    var statDefaultSv = (state.ruleset.resolution && typeof state.ruleset.resolution.statDefault === "number")
      ? state.ruleset.resolution.statDefault
      : 4;
    var statValSv = (state.sheet.attributes && typeof state.sheet.attributes[statNameSv] === "number")
      ? state.sheet.attributes[statNameSv]
      : statDefaultSv;
    showDice(true);
    state.diceContext = { saveName: save.name, base: { stat: statValSv, pool: 1 } };
    setDiceInput("stat", statValSv);
    setDiceInput("pool", 1);
    return;
  }
  var ctx = statContext();
  var t = tierForSkill(save.name);
  var tierBonus = (t && t.rollBonusFormula) ? evalFormula(t.rollBonusFormula, ctx) : 0;
  if (tierBonus == null) tierBonus = 0;
  var bonuses = equippedBonuses(save.name);
  showDice(true);
  if (mode === MODES.UNDER) {
    /* Roll-under saves (GURPS HT/DX/IQ rolls, CoC sanity, etc.). Target =
       the save's stored value when present, falling back to the linked
       attribute's raw value. Bonuses RAISE the target in roll-under, so
       equipped + tier bonuses go into the widget's Bonus input (mental-
       model flip from SINGLE where bonuses lift the roll). */
    var underTarget = 0;
    if (typeof state.sheet.skills[save.name] === "number") {
      underTarget = state.sheet.skills[save.name];
    } else if (save.linkedAttribute && state.sheet.attributes
               && typeof state.sheet.attributes[save.linkedAttribute] === "number") {
      underTarget = state.sheet.attributes[save.linkedAttribute];
    }
    state.diceContext = { saveName: save.name, base: { target: underTarget, bonus: bonuses.value + tierBonus } };
    setDiceInput("target", underTarget);
    setDiceInput("bonus",  bonuses.value + tierBonus);
    return;
  }
  var attrMod = 0;
  if (save.linkedAttribute) {
    var modKey = save.linkedAttribute + "_mod";
    if (typeof ctx[modKey] === "number") attrMod = ctx[modKey];
  }
  state.diceContext = { saveName: save.name, base: { mod: attrMod, prof: tierBonus } };
  setDiceInput("mod",   attrMod);
  setDiceInput("prof",  tierBonus);
  setDiceInput("equip", bonuses.value);
}

/* Resolution modes that support rolling a derived stat via `rollFormula`.
   Centralized so the render-side button gate and the click-side handler
   gate stay in sync. Adding a new mode here requires a matching branch
   in `quickRollForDerived` below. */
function derivedRollSupported(mode) {
  return mode === MODES.SINGLE
      || mode === MODES.UNDER
      || mode === MODES.STANCE
      || mode === MODES.POOL;
}

/* Quick-roll a derived stat (Initiative, Perception, etc.) when its
   `rollFormula` is declared. Evaluates the formula against the current
   stat context to produce the bonus, then opens the dice widget. */
function quickRollForDerived(derived) {
  if (!state.ruleset) return;
  var mode = state.ruleset.resolution.mode;
  if (mode !== MODES.SINGLE && mode !== MODES.UNDER && mode !== MODES.STANCE && mode !== MODES.POOL) return;
  if (!derived || typeof derived.rollFormula !== "string" || !derived.rollFormula) return;
  if (mode === MODES.POOL) {
    /* Dice-pool derived rolls (Exalted Initiative as Wits + Awareness +
       Sphere, VtM Soak as Stamina + Fortitude, etc.). The rollFormula
       evaluates to an integer pool size; we seed the widget's `pool`
       input and let the player roll. Equipped pool-bonuses from items
       targeting this derived stat are folded in via the `equip` field
       the existing dice-pool widget already exposes. */
    var ctxP = statContext();
    var derivedBonuses = equippedBonuses(derived.name);
    var poolVal = evalFormula(derived.rollFormula, ctxP);
    var poolSize = (typeof poolVal === "number" && isFinite(poolVal)) ? Math.max(0, Math.floor(poolVal)) : 0;
    showDice(true);
    state.diceContext = { derivedName: derived.name, base: { pool: poolSize } };
    setDiceInput("pool",  poolSize);
    setDiceInput("equip", derivedBonuses.dice);
    return;
  }
  if (mode === MODES.STANCE) {
    /* Stance-modal-pool derived rolls. The rollFormula is irrelevant — in
       L&F-style systems every roll resolves against the single stat with
       a player-set pool. Pre-fill stat from resolution.stat against the
       character's attributes; seed pool at 1. Player picks the stance
       per roll (in-fiction choice, never auto-set). */
    var statNameDv = (state.ruleset.resolution && state.ruleset.resolution.stat) || "Stat";
    var statDefaultDv = (state.ruleset.resolution && typeof state.ruleset.resolution.statDefault === "number")
      ? state.ruleset.resolution.statDefault
      : 4;
    var statValDv = (state.sheet.attributes && typeof state.sheet.attributes[statNameDv] === "number")
      ? state.sheet.attributes[statNameDv]
      : statDefaultDv;
    showDice(true);
    state.diceContext = { derivedName: derived.name, base: { stat: statValDv, pool: 1 } };
    setDiceInput("stat", statValDv);
    setDiceInput("pool", 1);
    return;
  }
  var ctx = statContext();
  if (mode === MODES.UNDER) {
    /* Roll-under derived (CoC Dodge from DEX×2, GURPS Will rolls, etc.).
       Target = the derived stat's computed VALUE (derived.formula), not
       its rollFormula — under roll-under the displayed stat IS the cap.
       Bonuses RAISE the target. */
    var underTarget = 0;
    if (typeof derived.formula === "string" && derived.formula) {
      var dv = evalFormula(derived.formula, ctx);
      if (typeof dv === "number" && isFinite(dv)) underTarget = Math.floor(dv);
    }
    var dBonuses = equippedBonuses(derived.name);
    showDice(true);
    state.diceContext = { derivedName: derived.name, base: { target: underTarget, bonus: dBonuses.value } };
    setDiceInput("target", underTarget);
    setDiceInput("bonus",  dBonuses.value);
    return;
  }
  var v = evalFormula(derived.rollFormula, ctx);
  var bonus = (typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0;
  showDice(true);
  state.diceContext = { derivedName: derived.name, base: { mod: bonus } };
  setDiceInput("mod",   bonus);
  setDiceInput("prof",  0);
  setDiceInput("equip", 0);
  setDiceInput("dc",    0);
}

/* Quick-roll a weapon attack: 1d20 + attribute modifier + (proficiency
   tier bonus when item.attackProficient) + equipped item value bonuses.
   The item declares which attribute drives the attack via
   `item.attackAttribute` (Strength for melee, Dexterity for finesse/
   ranged in D&D). When attackAttribute is unset we fall through to mod=0
   and let the player edit. */
function quickRollAttack(item) {
  if (!state.ruleset || state.ruleset.resolution.mode !== MODES.SINGLE) return;
  /* Conditions imposing disadvantage on attack rolls auto-arm the widget. */
  var condMode = conditionRollMode("attack");
  if (condMode !== "normal") state.diceAdvantage = condMode;
  var ctx = statContext();
  var attrMod = 0;
  if (item.attackAttribute) {
    var modKey = item.attackAttribute + "_mod";
    if (typeof ctx[modKey] === "number") attrMod = ctx[modKey];
  }
  var prof = 0;
  if (item.attackProficient) {
    /* Proficiency contribution is ruleset-defined via
       `resolution.attackProficiencyFormula`. D&D 5e bundle declares
       "{Proficiency Bonus}". PF2e could declare "{Level} + 2" for
       trained tier, etc. When the ruleset doesn't declare the formula
       we contribute zero — the player can still type a value into the
       Prof field on the dice widget if their system needs it. The core
       extension knows no system's proficiency convention by default. */
    var profFormula = state.ruleset.resolution && state.ruleset.resolution.attackProficiencyFormula;
    if (profFormula) {
      var pv = evalFormula(profFormula, ctx);
      if (typeof pv === "number" && isFinite(pv)) prof = Math.floor(pv);
    }
  }
  var bonuses = equippedBonuses("attack");
  showDice(true);
  state.diceContext = { itemAttack: item.id, base: { mod: attrMod, prof: prof } };
  setDiceInput("mod",   attrMod);
  setDiceInput("prof",  prof);
  setDiceInput("equip", bonuses.value);
}

/* Roll a weapon's damage expression directly — no dice-widget detour
   because damage rolls don't have a target DC, they're just "X plus
   attribute mod". Supports the common D&D / PF2e shape: leading dice
   notation followed by an optional damage type ("1d8 slashing", "2d6
   fire", "1d4+1 piercing"). The optional +N constant is honored; a
   trailing damage-type word is preserved verbatim in the chat tag.
   Posts a [damage: ...] tag for the state-mutator agent to consume. */
/* D&D / generic dice-and-sum: "NdM", "NdM+K", "NdM-K", optional " type words". */
var DAMAGE_RE = /^\s*(\d+)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+))?(?:\s+(.+?))?\s*$/i;
/* Exalted-style: "12L", "12B", "12A", "12dL", "12dB", "12dA", optional "+K"
   bonus dice. Single-letter type = Bashing / Lethal / Aggravated. */
var EXALTED_DAMAGE_LETTER_RE = /^\s*(\d+)\s*d?\s*([BLA])\s*(?:([+-])\s*(\d+))?\s*$/i;
/* Flat-with-type-word: "12 Lethal", "12 Bashing", "5 fire", "10 piercing".
   When the type word matches Exalted (Bashing|Lethal|Aggravated) we treat
   the number as a dice pool (Exalted convention); otherwise flat damage. */
var FLAT_DAMAGE_RE = /^\s*(\d+)\s+(.+?)\s*$/;
var EXALTED_TYPE_WORDS = { bashing: "Bashing", lethal: "Lethal", aggravated: "Aggravated" };
var EXALTED_TYPE_LETTERS = { b: "Bashing", l: "Lethal", a: "Aggravated" };

/* Single entry point for damage-expression parsing. Returns one of:
   - { kind: "dnd", count, size, sign, bonus, type }   — sum N dM dice + bonus
   - { kind: "exalted", count, type }                  — roll N d10, count 7+ successes
   - { kind: "flat", total, type }                     — no roll, just post the value
   - null                                              — unparseable
   Centralizes the format vocabulary so rollWeaponDamage, useItem, and the
   ability-cast damage roller all accept the same expressions. */
function parseDamageExpression(s) {
  if (typeof s !== "string" || !s) return null;
  var em = EXALTED_DAMAGE_LETTER_RE.exec(s);
  if (em) {
    var base = parseInt(em[1], 10);
    var bonusDice = em[4] ? parseInt(em[4], 10) : 0;
    if (em[3] === "-") bonusDice = -bonusDice;
    var letter = em[2].toLowerCase();
    return { kind: "exalted", count: Math.max(0, base + bonusDice), type: EXALTED_TYPE_LETTERS[letter] };
  }
  var dm = DAMAGE_RE.exec(s);
  if (dm) {
    return {
      kind: "dnd",
      count: parseInt(dm[1], 10),
      size: parseInt(dm[2], 10),
      sign: dm[3] || "+",
      bonus: dm[4] ? parseInt(dm[4], 10) : 0,
      type: dm[5] ? dm[5].trim() : ""
    };
  }
  var fm = FLAT_DAMAGE_RE.exec(s);
  if (fm) {
    var n = parseInt(fm[1], 10);
    var typeText = fm[2].trim();
    var lower = typeText.toLowerCase();
    if (EXALTED_TYPE_WORDS[lower]) {
      return { kind: "exalted", count: n, type: EXALTED_TYPE_WORDS[lower] };
    }
    return { kind: "flat", total: n, type: typeText };
  }
  return null;
}

/* Roll a parsed damage expression and return {text, faces, kind}. The
   caller decides whether to finalize via the dice widget. */
function rollParsedDamage(parsed, opts) {
  opts = opts || {};
  var label = opts.label || "damage";
  if (parsed.kind === "exalted") {
    var n = Math.max(0, Math.min(40, parsed.count));
    var faces = [];
    var successes = 0;
    for (var i = 0; i < n; i++) {
      var f = 1 + Math.floor(Math.random() * 10);
      var cls = "mrr-dice__face";
      if (f >= 7) { successes++; cls += " mrr-dice__face--success"; }
      faces.push({ face: f, cls: cls });
    }
    var text = "[damage: " + n + "d10 = " + successes + " " + parsed.type + " (" + label + ")]";
    return { text: text, faces: faces, kind: "exalted" };
  }
  if (parsed.kind === "dnd") {
    var count = Math.max(0, Math.min(20, parsed.count));
    var size  = Math.max(2, Math.min(100, parsed.size));
    var bonus = parsed.bonus || 0;
    if (parsed.sign === "-") bonus = -bonus;
    var attrMod = (typeof opts.attrMod === "number") ? opts.attrMod : 0;
    var dndFaces = [];
    var sum = 0;
    for (var j = 0; j < count; j++) {
      var face = 1 + Math.floor(Math.random() * size);
      dndFaces.push({ face: face, cls: "mrr-dice__face" });
      sum += face;
    }
    var total = sum + bonus + attrMod;
    var modPart = "";
    if (bonus) modPart += (bonus > 0 ? "+" : "") + bonus;
    if (attrMod) modPart += (attrMod > 0 ? "+" : "") + attrMod;
    var typePart = parsed.type ? " " + parsed.type : "";
    var dndText = "[damage: " + count + "d" + size + modPart + " = " + total + typePart + " (" + label + ")]";
    return { text: dndText, faces: dndFaces, kind: "dnd" };
  }
  /* flat */
  var flatText = "[damage: " + parsed.total + (parsed.type ? " " + parsed.type : "") + " (" + label + ")]";
  return { text: flatText, faces: [], kind: "flat" };
}

function rollWeaponDamage(item) {
  if (!item || typeof item.damage !== "string" || !item.damage) return;
  var parsed = parseDamageExpression(item.damage);
  if (!parsed) {
    warn("rollWeaponDamage: cannot parse '" + item.damage + "' (expected NdM[+K] [type], Exalted N[B|L|A], or N type)");
    return;
  }
  var ctx = statContext();
  var attrMod = 0;
  if (item.attackAttribute) {
    var modKey = item.attackAttribute + "_mod";
    if (typeof ctx[modKey] === "number") attrMod = ctx[modKey];
  }
  var label = (item.name || "weapon") + " damage";
  var rolled = rollParsedDamage(parsed, { label: label, attrMod: attrMod });
  showDice(true);
  finalizeRoll(rolled.text, "success", rolled.faces);
}

function quickRollForSkill(skill) {
  var mode = state.ruleset.resolution.mode;
  /* Skill checks pick up disadvantage from Poisoned, Frightened, etc. */
  if (mode === MODES.SINGLE) {
    var condMode = conditionRollMode("skill");
    if (condMode !== "normal") state.diceAdvantage = condMode;
  }
  var bonuses = equippedBonuses(skill.name);
  var tierBonus = resolveTierBonus(skill.name);
  showDice(true);
  /* state.diceContext tracks the base values for the active quick-roll so
     specialty-checkbox toggles can recompute inputs as base + checkedSum
     without losing the user's manual edits to unrelated inputs. */
  state.diceContext = { skillName: skill.name, base: {} };
  if (mode === MODES.POOL) {
    var ability = state.sheet.skills[skill.name] || 0;
    var attr = 0;
    if (skill.linkedAttribute && state.sheet.attributes[skill.linkedAttribute] != null) {
      attr = state.sheet.attributes[skill.linkedAttribute];
    } else {
      var firstAttr = state.ruleset.attributes[0];
      attr = state.sheet.attributes[firstAttr.name] || 0;
    }
    state.diceContext.base.pool = attr + ability + tierBonus;
    setDiceInput("pool",  state.diceContext.base.pool);
    setDiceInput("equip", bonuses.dice);
  } else if (mode === MODES.SINGLE) {
    /* When the ruleset has a skillBonusFormula (D&D, PF2e), the player-
       facing skill value IS the computed bonus and the raw `skills[name]`
       integer is unused. The roll's `mod` should be the linked
       attribute's modifier (e.g. Dexterity_mod) so a Sleight of Hand
       roll for Dex 16, Trained, Level 4 fills 1d20 + 3 (mod) + 2 (prof).
       Without this branch, mod stayed at 0 because `skills[name]` is
       never written in the autocalc path. */
    var ctxS = statContext();
    var modVal;
    var skillFormula = state.ruleset.resolution && state.ruleset.resolution.skillBonusFormula;
    if (skillFormula && skill.linkedAttribute) {
      var mk = skill.linkedAttribute + "_mod";
      modVal = (typeof ctxS[mk] === "number") ? ctxS[mk] : 0;
    } else {
      modVal = state.sheet.skills[skill.name] || 0;
    }
    state.diceContext.base.mod  = modVal;
    state.diceContext.base.prof = tierBonus;
    setDiceInput("mod",   state.diceContext.base.mod);
    setDiceInput("prof",  state.diceContext.base.prof);
    setDiceInput("equip", bonuses.value);
  } else if (mode === MODES.FATE) {
    state.diceContext.base.skill = (state.sheet.skills[skill.name] || 0) + bonuses.value + tierBonus;
    setDiceInput("skill", state.diceContext.base.skill);
  } else if (mode === MODES.UNDER) {
    /* Roll-under skill checks (CoC %, GURPS skill rolls, BRP). Target IS
       the skill's stored value (e.g. 65 for a 65% Spot Hidden, 12 for a
       GURPS skill at level 12). Bonuses RAISE the target — opposite of
       SINGLE mode — so equipped + tier bonuses go into the widget's
       Bonus input, summed into the effective target by rollRollUnder(). */
    var underTarget = state.sheet.skills[skill.name] || 0;
    var underBonus  = bonuses.value + tierBonus;
    state.diceContext.base.target = underTarget;
    state.diceContext.base.bonus  = underBonus;
    setDiceInput("target", underTarget);
    setDiceInput("bonus",  underBonus);
  } else if (mode === MODES.STANCE) {
    /* Stance-modal-pool skill rolls (L&F). The roll resolves against the
       single stat declared by resolution.stat (e.g. "Number"), NOT the
       skill's stored value — skills in L&F-style rulesets exist for
       schema compliance, not as roll targets. We pre-fill `stat` from
       the character's attributes and seed `pool` at 1; the player adjusts
       pool up based on prep / expert / help and picks LASERS or FEELINGS
       per roll. We do not pre-evaluate poolFormula (conditional syntax,
       not parseable as math) — it is surfaced as a hint inside the
       widget instead. */
    var statNameSk = (state.ruleset.resolution && state.ruleset.resolution.stat) || "Stat";
    var statDefaultSk = (state.ruleset.resolution && typeof state.ruleset.resolution.statDefault === "number")
      ? state.ruleset.resolution.statDefault
      : 4;
    var statValSk = (state.sheet.attributes && typeof state.sheet.attributes[statNameSk] === "number")
      ? state.sheet.attributes[statNameSk]
      : statDefaultSk;
    state.diceContext.base.stat = statValSk;
    state.diceContext.base.pool = 1;
    setDiceInput("stat", statValSk);
    setDiceInput("pool", 1);
  } else if (mode === MODES.SUM) {
    /* Dice-pool-sum (OpenD6 family). Pool size = linked attribute dice +
       skill dice + tierBonus (when a proficiency tier is active). Pips
       default to 0 here; equipment / stunt-equivalent bonuses translate
       to pool dice via the existing dice/value BONUS_KIND mapping in
       applyDiceContextSpecialties below. Difficulty is per-roll-edit and
       defaults to resolution.difficultyHint (set by buildSumWidget). */
    var abilitySum = state.sheet.skills[skill.name] || 0;
    var attrSum = 0;
    if (skill.linkedAttribute && state.sheet.attributes[skill.linkedAttribute] != null) {
      attrSum = state.sheet.attributes[skill.linkedAttribute];
    } else {
      var firstAttrSum = state.ruleset.attributes[0];
      attrSum = state.sheet.attributes[firstAttrSum.name] || 0;
    }
    state.diceContext.base.pool = attrSum + abilitySum + tierBonus;
    state.diceContext.base.pips = 0;
    setDiceInput("pool", state.diceContext.base.pool);
    setDiceInput("pips", state.diceContext.base.pips);
  }
  renderSpecialtiesPane(skill);
}

/* Render (or replace) the specialties checkbox pane inside the dice widget
   for the currently quick-rolled skill. Each checkbox toggle recomputes
   the affected input as `base + sum(checked specialties)`. The pane is a
   no-op when the ruleset has no specialties enabled or the skill has none. */
function renderSpecialtiesPane(skill) {
  if (!state.diceEl) return;
  var old = state.diceEl.querySelector(".mrr-dice__specs");
  if (old && old.parentNode) old.parentNode.removeChild(old);

  var cfg = state.ruleset.skillSpecialties;
  if (!cfg || !cfg.enabled) return;
  var specs = (state.sheet.skillSpecialties && state.sheet.skillSpecialties[skill.name]) || [];
  if (!specs.length) return;

  /* Build the pane detached from the widget, then insert it before the
     result element so it appears between the inputs and the result line. */
  var pane = marinara.addElement(state.diceEl, "div", { "class": "mrr-dice__specs" });
  if (!pane) return;
  marinara.addElement(pane, "div", {
    "class": "mrr-dice__specs-title",
    textContent: skill.name + " specialties"
  });

  var unit = (cfg.valueKind === BONUS_KIND.DICE) ? " dice"
           : (cfg.valueKind === BONUS_KIND.SUCCESSES) ? " succ"
           : "";

  specs.forEach(function (sp, idx) {
    var row = marinara.addElement(pane, "label", { "class": "mrr-dice__spec-row" });
    if (!row) return;
    var cb = marinara.addElement(row, "input", {
      "class": "mrr-dice__spec-checkbox",
      type: "checkbox",
      "data-idx": String(idx)
    });
    var sign = sp.value >= 0 ? "+" : "";
    marinara.addElement(row, "span", {
      "class": "mrr-dice__spec-label",
      textContent: (sp.name || "(unnamed)") + " (" + sign + sp.value + unit + ")"
    });
    if (cb) marinara.on(cb, "change", applyDiceContextSpecialties);
  });

  /* Reposition: `marinara.addElement` appended `pane` at the end of the
     widget; move it above the result element so the checkbox row reads
     between the inputs and the roll output. */
  var result = state.diceEl.querySelector("#mrr-dice-result");
  if (result && result.parentNode === state.diceEl && pane.parentNode === state.diceEl) {
    state.diceEl.insertBefore(pane, result);
  }
}

/* Recompute the affected dice input as base + sum-of-checked-specialty
   values. Mapping kind→input depends on resolution mode. The specialty's
   valueKind decides where it lands; a future POOL ruleset could use
   "successes" to add auto-successes (currently surfaced as additional
   pool dice, which is the closest existing widget shape). */
function applyDiceContextSpecialties() {
  var ctx = state.diceContext;
  if (!ctx || !state.diceEl) return;
  var cfg = state.ruleset.skillSpecialties;
  if (!cfg || !cfg.enabled) return;
  var specs = (state.sheet.skillSpecialties && state.sheet.skillSpecialties[ctx.skillName]) || [];

  var sum = 0;
  var cbs = state.diceEl.querySelectorAll(".mrr-dice__spec-checkbox");
  Array.prototype.forEach.call(cbs, function (cb) {
    if (!cb.checked) return;
    var idx = parseInt(cb.getAttribute("data-idx"), 10);
    var sp = specs[idx];
    if (sp && typeof sp.value === "number" && isFinite(sp.value)) sum += sp.value;
  });

  var mode = state.ruleset.resolution.mode;
  var kind = cfg.valueKind || BONUS_KIND.VALUE;
  if (mode === MODES.POOL) {
    var poolAdd = (kind === BONUS_KIND.DICE || kind === BONUS_KIND.SUCCESSES) ? sum : 0;
    setDiceInput("pool", (ctx.base.pool || 0) + poolAdd);
  } else if (mode === MODES.SINGLE) {
    var modAdd = (kind === BONUS_KIND.VALUE) ? sum : 0;
    setDiceInput("mod", (ctx.base.mod || 0) + modAdd);
  } else if (mode === MODES.FATE) {
    var skillAdd = (kind === BONUS_KIND.VALUE) ? sum : 0;
    setDiceInput("skill", (ctx.base.skill || 0) + skillAdd);
  } else if (mode === MODES.UNDER) {
    /* Roll-under: specialty values RAISE the target, opposite of SINGLE
       where they lift the roll. Mental-model flip is the same one
       quickRollFor* makes — bonuses go into the widget's Bonus input,
       and rollRollUnder() sums baseTarget + bonus before comparing to
       the d100. So a specialty-checkbox tick adds its VALUE-kind sum
       to ctx.base.bonus and re-writes the bonus input. DICE / SUCCESSES
       specialty kinds are meaningless under roll-under (no dice pool to
       grow, no success-counting) and are ignored here. */
    var bonusAdd = (kind === BONUS_KIND.VALUE) ? sum : 0;
    setDiceInput("bonus", (ctx.base.bonus || 0) + bonusAdd);
  } else if (mode === MODES.STANCE) {
    /* Stance-modal-pool: no natural specialty hook yet. L&F has only one
       Help skill (schema-compliance only) with no specialties, and the
       widget surfaces pool/stat/stance — none of which map cleanly to a
       skill specialty. Future stance rulesets that declare specialties
       can extend this branch (e.g. specialty.value → pool size adjust);
       for now we no-op so the function explicitly handles the mode
       without crashing when a hypothetical specialty checkbox fires. */
    return;
  } else if (mode === MODES.SUM) {
    /* Dice-pool-sum: DICE-kind specialty adds to pool size (more dice
       rolled). VALUE-kind specialty adds to pips (flat add to total).
       SUCCESSES-kind doesn't have a natural sum-pool semantic — ignored
       here. Mirrors the POOL branch's intuition but routes flat
       modifiers to the pips input instead of inventing auto-successes. */
    var sumPoolAdd = (kind === BONUS_KIND.DICE) ? sum : 0;
    var sumPipsAdd = (kind === BONUS_KIND.VALUE) ? sum : 0;
    setDiceInput("pool", (ctx.base.pool || 0) + sumPoolAdd);
    setDiceInput("pips", (ctx.base.pips || 0) + sumPipsAdd);
  }
}

function renderDerived(parent) {
  if (!Array.isArray(state.ruleset.derivedStats) || !state.ruleset.derivedStats.length) return;
  var sec = marinara.addElement(parent, "div", { "class": "mrr-section" });
  if (!sec) return;
  marinara.addElement(sec, "div", { "class": "mrr-section__title", textContent: "Derived" });

  state.ruleset.derivedStats.forEach(function (d) {
    var wrap = marinara.addElement(sec, "div", { "class": "mrr-derived" });
    if (!wrap) return;
    marinara.addElement(wrap, "div", { "class": "mrr-derived__formula", textContent: d.name + " — " + d.formula });
    if (d.renderAs === "track" && Array.isArray(d.track)) {
      renderTrack(wrap, d);
    } else if (d.renderAs === "bar") {
      renderBar(wrap, d);
    } else {
      renderValue(wrap, d);
    }
  });
}

/* ── Phase 5 step 5.4 — derived tooltip math ──────────────────────────
   Tokenized formula substitution that returns both the arithmetic-ready
   substituted string AND a per-token breakdown for tooltip rendering.

   Supported token forms (mirrors existing skillBonusFormula / valueFormula
   conventions; spec source: ~/cc-wiki/Roadmap/marinara-character-sheet-
   implementation.md §B.1.3):
     {StatName}         — flat lookup in statContext (attribute, skill,
                          derived value, custom skill name)
     {StatName_mod}     — D&D-style attribute modifier; populated by
                          statContext() when the attribute declares a
                          modifierFormula
     {bonuses:Key}      — equippedBonuses(Key).value — sum of bonuses
                          from currently-equipped inventory items targeting
                          the named key (e.g. {bonuses:Armor Class} sums
                          all equipped item bonuses whose target === "Armor
                          Class"). Resolves the long-standing gap where
                          evalFormula silently zeroed this token.
     {Level}, {tierBonus} — flat lookup; already populated by callers that
                            care (skills/saves) via .replace before calling
                            evalFormula; for derived tooltips, fall back to
                            ctx[key] if present, else 0.

   The breakdown is the list of [{label, value}] in source order, which the
   tooltip composer formats as e.g. "Soak (Bashing): 7 = Stamina (4) +
   Bashing Soak (3)". */
function mrrSubstituteTokens(formula, ctx) {
  var breakdown = [];
  var subbed = String(formula || "").replace(/\{([^}]+)\}/g, function (_, key) {
    var v, label;
    if (key.indexOf("bonuses:") === 0) {
      var bonusKey = key.slice("bonuses:".length).trim();
      var b = equippedBonuses(bonusKey);
      v = (b && typeof b.value === "number") ? b.value : 0;
      label = bonusKey;
    } else {
      v = (ctx && typeof ctx[key] === "number") ? ctx[key] : 0;
      label = key;
    }
    breakdown.push({ label: label, value: v });
    return String(v);
  });
  return { substituted: subbed, breakdown: breakdown };
}

/* Compute the displayed value and tooltip string from a derived stat's
   tooltipFormula. Returns null when the formula is missing, contains
   unsafe characters after substitution, or produces a non-finite result.
   Caller falls back to legacy rendering on null. */
function mrrComputeTooltipBreakdown(derived, ctx) {
  if (!derived || typeof derived.tooltipFormula !== "string" || !derived.tooltipFormula) return null;
  var sub = mrrSubstituteTokens(derived.tooltipFormula, ctx);
  if (!/^[\s0-9+\-*/().]*$/.test(sub.substituted)) return null;
  var num;
  try { num = safeEvalArithmetic(sub.substituted); } catch (e) { return null; }
  if (typeof num !== "number" || !isFinite(num)) return null;
  /* Floor to match valueFormula handling — keeps D&D ability-mod math
     and Exalted ceiling formulas (a+b+1)/2 consistent across surfaces. */
  num = Math.floor(num);
  /* Tooltip render: "<Name>: <total> = <substituted arithmetic>" on the
     first line, then one "  <label> = <value>" line per token. The literal
     constants in the formula (e.g. the "10" in D&D Armor Class) survive in
     the substituted line so the arithmetic always reconciles to the total,
     even when the formula isn't purely a sum of tokens. */
  var arithLine = sub.substituted.replace(/\s+/g, " ").trim();
  var tipLines = [derived.name + ": " + num + " = " + arithLine];
  sub.breakdown.forEach(function (b) {
    tipLines.push("  " + b.label + " = " + b.value);
  });
  var tip = tipLines.join("\n");
  return { value: num, tooltip: tip };
}

function renderValue(parent, derived) {
  var row = marinara.addElement(parent, "div", { "class": "mrr-row mrr-row--compact" });
  if (!row) return;

  /* Phase 5 step 5.4 — when only tooltipFormula is declared (no
     valueFormula), promote tooltipFormula to drive the value AND the
     tooltip. valueFormula winning over tooltipFormula on conflict is
     intentional: valueFormula is the existing autocalc contract; this
     branch only fires when valueFormula is absent. */
  var hasValueFormula = derived && typeof derived.valueFormula === "string" && !!derived.valueFormula;
  var hasTooltipFormula = derived && typeof derived.tooltipFormula === "string" && !!derived.tooltipFormula;
  var tooltipOnlyAutocalc = !hasValueFormula && hasTooltipFormula;

  /* Autocalc: derived stats with `valueFormula` (parallel to `maxFormula`)
     compute their displayed value from the current stat context every
     time refreshAllBars fires. The stepper is suppressed because the
     formula IS the override — typing into a computed value would either
     desync from the formula or require a "reset to formula" affordance
     that adds UX surface area for negligible gain. */
  if (hasValueFormula || tooltipOnlyAutocalc) {
    var calc = marinara.addElement(row, "span", {
      "class": "mrr-row__value mrr-row__value--autocalc",
      title: hasValueFormula
        ? ("Auto-calculated from formula: " + derived.valueFormula)
        : ("Auto-calculated from formula: " + derived.tooltipFormula)
    });
    var bonusSpanA = marinara.addElement(row, "span", { "class": "mrr-row__bonus" });
    refreshDerivedBonus(bonusSpanA, derived.name);
    derivedBonusRefreshers.push(function () { refreshDerivedBonus(bonusSpanA, derived.name); });
    function refreshAutocalc() {
      if (!calc || !calc.parentNode) return;
      var ctx = statContext();
      var num;
      if (hasValueFormula) {
        var v = evalFormula(derived.valueFormula, ctx);
        /* Floor (not round) so D&D ability mods like (9-10)/2=-0.5 land on -1
           not 0, AND Exalted ceiling formulas of the form (a+b+1)/2 stay
           correct (already pre-add +1, so floor produces the intended ceil). */
        num = (typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0;
      } else {
        /* tooltipOnlyAutocalc path — value comes from tooltipFormula via
           the same {bonuses:Key}-aware substitution helper used for the
           breakdown below. */
        var brk0 = mrrComputeTooltipBreakdown(derived, ctx);
        num = (brk0 && typeof brk0.value === "number") ? brk0.value : 0;
      }
      calc.textContent = String(num);
      /* Phase 5 step 5.4 — when the derived stat declares a tooltipFormula,
         overwrite the autocalc title with the breakdown string. valueFormula
         continues to drive the visible number; tooltipFormula only drives
         the tooltip text. */
      if (hasTooltipFormula) {
        var brk = mrrComputeTooltipBreakdown(derived, ctx);
        if (brk && brk.tooltip) {
          calc.title = brk.tooltip;
          calc.setAttribute("title", brk.tooltip);
        }
      }
      /* Persist the computed value to state so other consumers — chat sync,
         dice math, agent state mutators — see the same number the user
         sees, even though the user can't override it directly. Save only
         when the value actually changes so render-time refreshes don't
         re-touch localStorage on every renderSheet call. */
      if (state.sheet.derived[derived.name] !== num) {
        state.sheet.derived[derived.name] = num;
        saveSheet(state.chatId, state.sheet);
      }
    }
    refreshAutocalc();
    barRefreshers.push(refreshAutocalc);
    /* Roll button on autocalc'd derived stats that declare a rollFormula
       (Initiative = {Dexterity_mod} for D&D). Opens the dice widget pre-
       filled with the formula's value so the player rolls 1d20 + bonus.
       Skipped on derived without a rollFormula because there's nothing
       to roll — Hit Points, Armor Class, Speed are values, not checks. */
    if (typeof derived.rollFormula === "string" && derived.rollFormula
        && state.ruleset.resolution && derivedRollSupported(state.ruleset.resolution.mode)) {
      var rollD = marinara.addElement(row, "button", { textContent: "roll", "class": "mrr-row__roll" });
      if (rollD) marinara.on(rollD, "click", function (e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        quickRollForDerived(derived);
      });
    }
    return;
  }

  /* Compute the upper bound for editing + display from either an engine-
     declared `max` literal or a `maxFormula`. Used both as the input clamp
     and as the "/N" cap shown next to the value (Essence reads "5 / 10"
     instead of bare "5"). When neither is declared, no cap shown and the
     value range is the legacy ±999. */
  function computeValueMax() {
    if (typeof derived.maxFormula === "string" && derived.maxFormula) {
      var v = evalFormula(derived.maxFormula, statContext());
      if (v != null && v > 0) return Math.floor(v);
    }
    if (typeof derived.max === "number" && derived.max > 0) return derived.max;
    return null;
  }
  var declaredMax = computeValueMax();
  var hasDeclaredMax = (declaredMax != null);

  var val = makeEditableValue(
    row,
    function () { return state.sheet.derived[derived.name] || 0; },
    function (v) { state.sheet.derived[derived.name] = v; saveSheet(state.chatId, state.sheet); },
    hasDeclaredMax ? 0 : -999,
    hasDeclaredMax ? function () { return computeValueMax(); } : 999,
    function () { if (capLabel) capLabel.textContent = " / " + computeValueMax(); refreshAllBars(); }
  );
  /* Inline "/ max" cap label next to the value when the ruleset declared a
     cap. Lets a value-rendered derived stat (Essence, Willpower-as-value)
     visibly carry its limit without changing renderAs to "bar". */
  var capLabel = null;
  if (hasDeclaredMax) {
    capLabel = marinara.addElement(row, "span", {
      "class": "mrr-row__cap",
      textContent: " / " + declaredMax,
      title: "Maximum " + derived.name + (derived.maxFormula ? " (computed: " + derived.maxFormula + ")" : "")
    });
  }
  var bonusSpan = marinara.addElement(row, "span", { "class": "mrr-row__bonus" });
  refreshDerivedBonus(bonusSpan, derived.name);
  derivedBonusRefreshers.push(function () { refreshDerivedBonus(bonusSpan, derived.name); });
  /* Refresh the cap label whenever any bar refreshes — picks up changes to
     {Essence} flowing through Personal Motes' maxFormula, etc. */
  if (capLabel) {
    barRefreshers.push(function () {
      if (!capLabel || !capLabel.parentNode) return;
      capLabel.textContent = " / " + computeValueMax();
    });
  }
  addStepper(row, {
    get: function () { return state.sheet.derived[derived.name] || 0; },
    set: function (v) { state.sheet.derived[derived.name] = v; saveSheet(state.chatId, state.sheet); },
    min: hasDeclaredMax ? 0 : -999,
    max: hasDeclaredMax ? function () { return computeValueMax(); } : 999,
    onChange: function (v) {
      if (val) val.value = String(v);
      /* A derived value (e.g. Essence) may be referenced by another stat's
         maxFormula (e.g. Personal Motes = {Essence}*3+10). Refresh the bars
         in-place so dependents pick up the new max — DOM is not rebuilt,
         so the user's scroll position survives. */
      refreshAllBars();
    }
  });

  /* Roll button on manual derived stats that declare a rollFormula.
     Lets a player click to roll Initiative or any other "1d20 + bonus"
     check pinned to a derived stat without going through skills. */
  if (typeof derived.rollFormula === "string" && derived.rollFormula
      && state.ruleset.resolution && state.ruleset.resolution.mode === MODES.SINGLE) {
    var rollD2 = marinara.addElement(row, "button", { textContent: "roll", "class": "mrr-row__roll" });
    if (rollD2) marinara.on(rollD2, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      quickRollForDerived(derived);
    });
  }
}

function renderBar(parent, derived) {
  var bar = marinara.addElement(parent, "div", { "class": "mrr-bar" });
  if (!bar) return;
  var fill = marinara.addElement(bar, "div", { "class": "mrr-bar__fill" });
  var label = marinara.addElement(bar, "div", { "class": "mrr-bar__label" });

  function computeMax() {
    /* User-set override wins over ruleset formula/literal so a manual
       adjustment via the max input always sticks. Gives the GM agent
       and the player a single authoritative source of truth: whatever
       is in derivedMax[name] is the cap. Formula seeds it; user can
       override (Anima boosts, temporary Willpower modifiers, per-
       character Willpower caps that aren't a flat 10). */
    if (state.sheet.derivedMax && typeof state.sheet.derivedMax[derived.name] === "number"
        && state.sheet.derivedMax[derived.name] > 0) {
      return state.sheet.derivedMax[derived.name];
    }
    if (derived.maxFormula) {
      var v = evalFormula(derived.maxFormula, statContext());
      if (v != null && v > 0) return Math.floor(v);
    }
    if (derived.max != null) return derived.max;
    /* Last-resort fallback for fresh sheets where the user hasn't typed
       a max yet — auto-grow with the current value so the visual fill
       still shows partial progress instead of saturating against the
       phantom 10. Once the user types a max, this branch never fires. */
    var current = state.sheet.derived[derived.name] || 0;
    return Math.max(DEFAULT_BAR_MAX, current);
  }

  function refresh() {
    if (!fill || !fill.parentNode) return;
    var max = computeMax();
    var v = state.sheet.derived[derived.name] || 0;
    fill.style.width = Math.max(0, Math.min(100, (v / max) * 100)) + "%";
    if (label) label.textContent = v + " / " + max;
    /* Re-sync both editable inputs to current sheet state. Without this,
       a state-mutator delta (e.g., `[mrr-state: field="Personal Motes"
       delta="+5"]` from a refresh) updates the underlying value but the
       inputs keep showing stale numbers — the player and the GM agent
       end up reading different values from the same field, producing
       math errors on the next refresh attempt. */
    if (inputEl) inputEl.value = String(v);
    if (maxEl) maxEl.value = String(max);
  }

  var ctrl = marinara.addElement(parent, "div", { "class": "mrr-state" });
  if (!ctrl) return;
  /* Editable current value. Clamps to the computed max on commit so a
     user can't type a value that exceeds the cap. */
  var inputEl = makeEditableValue(
    ctrl,
    function () { return state.sheet.derived[derived.name] || 0; },
    function (v) { state.sheet.derived[derived.name] = v; saveSheet(state.chatId, state.sheet); },
    0, computeMax,
    function () { refresh(); refreshAllBars(); }
  );

  /* Editable max input — always shown so the user has a single visible
     "current / max" surface for every bar. For ruleset-capped bars
     (Exalted Motes via maxFormula, anything with a literal max) the
     input default-displays the formula/literal value; typing a value
     persists to state.sheet.derivedMax and overrides the ruleset. For
     uncapped bars (D&D HP, Willpower under per-character caps) it's
     the only source of truth. */
  marinara.addElement(ctrl, "span", { "class": "mrr-bar__sep", textContent: "/" });
  var maxEl = makeEditableValue(
    ctrl,
    function () { return computeMax(); },
    function (v) {
      if (!state.sheet.derivedMax) state.sheet.derivedMax = {};
      state.sheet.derivedMax[derived.name] = v;
      saveSheet(state.chatId, state.sheet);
    },
    0, 9999,
    function () { refresh(); refreshAllBars(); }
  );
  if (maxEl) {
    var hint = derived.maxFormula
      ? " (default: " + derived.maxFormula + " — type to override)"
      : (derived.max != null ? " (ruleset default " + derived.max + " — type to override)" : " (user-set)");
    maxEl.title = "Max " + derived.name + hint;
  }

  addStepper(ctrl, {
    get: function () { return state.sheet.derived[derived.name] || 0; },
    set: function (v) { state.sheet.derived[derived.name] = v; saveSheet(state.chatId, state.sheet); },
    min: 0,
    max: computeMax,
    onChange: function (v) {
      if (inputEl) inputEl.value = String(v);
      refreshAllBars();
    }
  });

  /* Initial paint after both inputs are mounted so refresh() can sync
     them to the current state value. */
  refresh();
  barRefreshers.push(refresh);
}

/* Resolve the damage-types declaration on a track-renderAs derived stat,
   sorted by severity descending so the highest-severity type fills the
   leftmost cells. Returns null when the ruleset declared no typed damage,
   in which case the track falls back to single-fill (legacy) behavior. */
function damageTypesFor(derived) {
  if (!derived || !Array.isArray(derived.damageTypes) || !derived.damageTypes.length) return null;
  return derived.damageTypes.slice().sort(function (a, b) {
    return (b.severity || 0) - (a.severity || 0);
  });
}

/* Phase 4 — per-cell damage state. Each cell is independently typed
   ("B" / "L" / "A" / null). Phase-3 wrapper uses this exclusively so a
   click escalates a SPECIFIC cell in place (B → L → A → empty) without
   re-flowing the visual layout from typed counters. The classic typed-
   counter `state.sheet.track[name]` stays in sync (re-derived after
   every mutation) so classic renderTrack, snapshot, and state-mutator
   parser all see the same damage totals. */
function ensureTrackCells(d, totalLen) {
  if (!state.sheet.trackCells || typeof state.sheet.trackCells !== "object") {
    state.sheet.trackCells = {};
  }
  if (!d || !d.name) return [];
  var name = d.name;
  var cells = state.sheet.trackCells[name];
  if (!Array.isArray(cells)) {
    /* Initialize from the existing typed-counter via severity-desc fill
       so a player who already has 2 Bashing damage sees the same 2 cells
       filled (leftmost) after migration. */
    cells = [];
    var types = damageTypesFor(d);
    var classic = state.sheet.track && state.sheet.track[name];
    if (types && classic && typeof classic === "object" && !Array.isArray(classic)) {
      for (var i = 0; i < types.length; i++) {
        var t = types[i];
        var n = classic[t.id] || 0;
        for (var k = 0; k < n; k++) cells.push(t.label);
      }
    } else if (types && typeof classic === "number" && classic > 0) {
      /* Legacy single-counter: seed N Bashing cells. */
      var lightest = types[types.length - 1];
      for (var lc = 0; lc < classic; lc++) cells.push(lightest ? lightest.label : null);
    }
    state.sheet.trackCells[name] = cells;
  }
  /* Pad up to the visible cell count. */
  while (cells.length < totalLen) cells.push(null);
  /* P0-2: truncate ONLY trailing empty cells. The old code sliced to
     totalLen unconditionally; because syncTrackCellsToTyped re-derives the
     typed counter FROM this array, dropping a filled overflow cell silently
     destroyed that damage. Never cut below the last filled cell — trim empties
     only, so removing a box can never reduce the recorded damage total. */
  if (cells.length > totalLen) {
    var lastFilled = -1;
    for (var fi = 0; fi < cells.length; fi++) { if (cells[fi]) lastFilled = fi; }
    var cut = Math.max(totalLen, lastFilled + 1);
    if (cut < cells.length) {
      cells = cells.slice(0, cut);
      state.sheet.trackCells[name] = cells;
    }
  }
  return cells;
}

/* After mutating a per-cell array, re-derive the typed counter so
   classic renderTrack, the snapshot, and state-mutator stay aligned. */
function syncTrackCellsToTyped(d) {
  if (!d || !d.name) return;
  var name = d.name;
  var cells = state.sheet.trackCells && state.sheet.trackCells[name];
  if (!Array.isArray(cells)) return;
  var types = damageTypesFor(d);
  if (!types) return;
  if (!state.sheet.track) state.sheet.track = {};
  var typedObj = {};
  for (var i = 0; i < types.length; i++) typedObj[types[i].id] = 0;
  cells.forEach(function (label) {
    if (!label) return;
    for (var j = 0; j < types.length; j++) {
      if (types[j].label === label) { typedObj[types[j].id] += 1; return; }
    }
  });
  state.sheet.track[name] = typedObj;
}

/* Get-or-create the typed damage object for a track. Migrates a legacy
   numeric value into the lightest type (bashing) since the meaning of
   the old single counter was "damage taken" with type unspecified. */
function ensureTypedTrack(trackName, types) {
  if (!state.sheet.track) state.sheet.track = {};
  var current = state.sheet.track[trackName];
  if (current && typeof current === "object" && !Array.isArray(current)) {
    /* Already typed. Make sure every declared type has a slot, default 0. */
    for (var i = 0; i < types.length; i++) {
      if (typeof current[types[i].id] !== "number") current[types[i].id] = 0;
    }
    return current;
  }
  /* Build fresh, seeding the lightest type with any legacy number. */
  var legacy = (typeof current === "number") ? current : 0;
  var lightest = types[types.length - 1];
  var fresh = {};
  for (var j = 0; j < types.length; j++) fresh[types[j].id] = 0;
  if (lightest) fresh[lightest.id] = legacy;
  state.sheet.track[trackName] = fresh;
  return fresh;
}

function renderTrack(parent, derived) {
  var track = marinara.addElement(parent, "div", { "class": "mrr-track" });
  if (!track) return;

  function rulesetCells() { return derived.track || []; }
  function extraCells() {
    if (!state.sheet.extraTrack) state.sheet.extraTrack = {};
    if (!state.sheet.extraTrack[derived.name]) state.sheet.extraTrack[derived.name] = [];
    return state.sheet.extraTrack[derived.name];
  }
  function totalLen() { return rulesetCells().length + extraCells().length; }

  /* The types list (severity-descending) and a per-cell type lookup keyed
     on rendered position. Computed fresh on each rebuild so any data
     mutation — manual click, button, AI mutator — produces a coherent
     re-render without stale closures. */
  var types = damageTypesFor(derived);

  function buildCellTypeMap() {
    if (!types) return null;
    var damage = ensureTypedTrack(derived.name, types);
    /* Severity-descending fill: e.g., for Exalted [A, L, B], cells 0..a-1
       get aggravated, a..a+l-1 get lethal, a+l..a+l+b-1 get bashing.
       Damage that overflows the cell count is preserved in counters but
       only the visible cells render; over-fill = on-the-edge / dying. */
    var cellType = [];
    for (var i = 0; i < types.length; i++) {
      var t = types[i];
      var n = damage[t.id] || 0;
      for (var k = 0; k < n; k++) cellType.push(t);
    }
    return cellType;
  }

  function rebuild() {
    track.textContent = "";
    /* Tag each cell with its origin so a stable sort by penalty can group
       like-with-like without losing the "extra" flag used for the dashed
       border. Sort is descending — best (0) first, Incapacitated (-99)
       always last — and stable, so multiple cells of the same penalty
       keep insertion order. Damage progression still fills left-to-right. */
    var tagged = rulesetCells().map(function (c) { return { cell: c, extra: false }; })
      .concat(extraCells().map(function (c) { return { cell: c, extra: true }; }));
    tagged.sort(function (a, b) { return b.cell.penalty - a.cell.penalty; });

    var cellType = buildCellTypeMap();
    var legacyFilled = (typeof state.sheet.track[derived.name] === "number")
      ? state.sheet.track[derived.name]
      : 0;
    var filled = cellType ? cellType.length : legacyFilled;

    tagged.forEach(function (entry, idx) {
      var cell = entry.cell;
      var typeAtIdx = (cellType && idx < cellType.length) ? cellType[idx] : null;
      var titleParts = ["penalty " + cell.penalty];
      if (entry.extra) titleParts.push("(added)");
      if (typeAtIdx) titleParts.push("damage: " + typeAtIdx.id);
      var c = marinara.addElement(track, "div", {
        title: titleParts.join(" "),
        textContent: typeAtIdx ? typeAtIdx.label : cell.label
      });
      if (!c) return;
      var cls = "mrr-track__cell";
      if (idx < filled) cls += " mrr-track__cell--filled";
      if (idx === filled - 1 && filled > 0) cls += " mrr-track__cell--active";
      if (entry.extra) cls += " mrr-track__cell--extra";
      if (typeAtIdx) cls += " mrr-track__cell--" + typeAtIdx.id;
      c.className = cls;
      marinara.on(c, "click", function () {
        if (types) {
          var damage = ensureTypedTrack(derived.name, types);
          if (typeAtIdx) {
            /* Heal one of the type at this cell — direct fixup. */
            damage[typeAtIdx.id] = Math.max(0, (damage[typeAtIdx.id] || 0) - 1);
          } else {
            /* Empty cell click takes one bashing — the lightest type. */
            var lightest = types[types.length - 1];
            damage[lightest.id] = (damage[lightest.id] || 0) + 1;
          }
        } else {
          /* Legacy single-counter behavior. */
          var current = state.sheet.track[derived.name] || 0;
          state.sheet.track[derived.name] = (current === idx + 1) ? idx : idx + 1;
        }
        saveSheet(state.chatId, state.sheet);
        rebuild();
      });
    });
  }
  rebuild();

  /* Damage-type controls (Exalted/WoD-style typed damage). One "Take" per
     declared type plus a "Heal worst" that drops the highest-severity
     damage in the stack — the canonical "ease your wounds" action. */
  if (types) {
    var dmgCtrl = marinara.addElement(parent, "div", { "class": "mrr-track-ctrl" });
    if (dmgCtrl) {
      marinara.addElement(dmgCtrl, "span", { "class": "mrr-track-ctrl__label", textContent: "Take damage:" });
      types.slice().reverse().forEach(function (t) {
        /* Reversed to render lightest-first (B, L, A) for left-to-right
           severity reading, while the data-side `types` stays severity-desc. */
        var btn = marinara.addElement(dmgCtrl, "button", {
          "class": "mrr-track-add-btn",
          textContent: t.label,
          title: "Take 1 " + t.id + " damage"
        });
        if (!btn) return;
        marinara.on(btn, "click", function () {
          var damage = ensureTypedTrack(derived.name, types);
          damage[t.id] = (damage[t.id] || 0) + 1;
          saveSheet(state.chatId, state.sheet);
          rebuild();
        });
      });
      var healBtn = marinara.addElement(dmgCtrl, "button", {
        "class": "mrr-track-add-btn mrr-track-add-btn--danger",
        textContent: "heal worst",
        title: "Remove one level of the highest-severity damage taken"
      });
      if (healBtn) marinara.on(healBtn, "click", function () {
        var damage = ensureTypedTrack(derived.name, types);
        for (var i = 0; i < types.length; i++) {
          if ((damage[types[i].id] || 0) > 0) {
            damage[types[i].id] -= 1;
            saveSheet(state.chatId, state.sheet);
            rebuild();
            return;
          }
        }
      });
    }
  }

  /* Ox-Body and similar Charms add health levels at runtime. Three buttons
     for the canonical penalty values plus a remove-last for mistakes. */
  var ctrl = marinara.addElement(parent, "div", { "class": "mrr-track-ctrl" });
  if (!ctrl) return;
  marinara.addElement(ctrl, "span", { "class": "mrr-track-ctrl__label", textContent: "Add level:" });

  [{ label: "-0", penalty: 0 }, { label: "-1", penalty: -1 }, { label: "-2", penalty: -2 }].forEach(function (def) {
    var btn = marinara.addElement(ctrl, "button", {
      "class": "mrr-track-add-btn",
      textContent: def.label
    });
    if (!btn) return;
    marinara.on(btn, "click", function () {
      extraCells().push({ label: def.label, penalty: def.penalty });
      saveSheet(state.chatId, state.sheet);
      rebuild();
    });
  });

  var rmBtn = marinara.addElement(ctrl, "button", {
    "class": "mrr-track-add-btn mrr-track-add-btn--danger",
    textContent: "remove last",
    title: "Remove the most-recently added level"
  });
  if (rmBtn) marinara.on(rmBtn, "click", function () {
    var extras = extraCells();
    if (!extras.length) return;
    extras.pop();
    /* Clamp legacy filled count if the user removed a filled level. The
       typed-damage path doesn't need clamping here — overflow damage is
       preserved in counters and just doesn't render past the last cell. */
    var len = totalLen();
    if (typeof state.sheet.track[derived.name] === "number" && state.sheet.track[derived.name] > len) {
      state.sheet.track[derived.name] = len;
    }
    saveSheet(state.chatId, state.sheet);
    rebuild();
  });
}

function renderStates(parent) {
  if (!Array.isArray(state.ruleset.states) || !state.ruleset.states.length) return;
  var sec = marinara.addElement(parent, "div", { "class": "mrr-section" });
  if (!sec) return;
  marinara.addElement(sec, "div", { "class": "mrr-section__title", textContent: "States" });

  state.ruleset.states.forEach(function (st) {
    var row = marinara.addElement(sec, "div", { "class": "mrr-state" });
    if (!row) return;
    marinara.addElement(row, "span", { "class": "mrr-state__name", textContent: st.name });
    var sel = marinara.addElement(row, "select", { "class": "mrr-state__select" });
    if (!sel) return;
    st.values.forEach(function (v) {
      var opt = document.createElement("option");
      opt.value = v.label;
      opt.textContent = v.label;
      if (v.label === state.sheet.states[st.name]) opt.selected = true;
      sel.appendChild(opt);
    });
    marinara.on(sel, "change", function () {
      state.sheet.states[st.name] = sel.value;
      saveSheet(state.chatId, state.sheet);
    });
  });
}

/* ─────  derived equipment-bonus suffix  ───── */

function refreshDerivedBonus(spanEl, derivedName) {
  if (!spanEl) return;
  var b = equippedBonuses(derivedName);
  var total = b.value;
  if (!total) {
    spanEl.textContent = "";
    spanEl.title = "";
    spanEl.classList.remove("mrr-row__bonus--neg");
    return;
  }
  spanEl.textContent = (total > 0 ? " +" : " ") + total;
  spanEl.title = b.contributors.map(function (c) {
    return c.name + ": " + (c.value > 0 ? "+" : "") + c.value + (c.tag ? " " + c.tag : "");
  }).join("\n");
  spanEl.classList.toggle("mrr-row__bonus--neg", total < 0);
}

/* ─────  conditions section  ───── */

/* Status conditions (D&D Blinded/Poisoned/Prone, Exalted Crashed, etc.).
   `state.sheet.conditions` is an array of strings — the existing state-
   mutator pipeline already adds/removes via [mrr-state: field="conditions"
   add="poisoned"] tags. This section draws the active list with an x
   button per row plus a "+ Add" dropdown of ruleset-declared condition
   defs. The defs also drive roll-mode automation: each declares which
   roll categories it imposes disadvantage / grants advantage on, and
   the quickRoll* helpers consult them before opening the dice widget. */
function renderConditions(parent) {
  var sec = marinara.addElement(parent, "div", { "class": "mrr-section" });
  if (!sec) return;
  marinara.addElement(sec, "div", { "class": "mrr-section__title", textContent: "Conditions" });

  var defs = (state.ruleset && Array.isArray(state.ruleset.conditions)) ? state.ruleset.conditions : [];
  var defByName = {};
  defs.forEach(function (d) { if (d && d.name) defByName[d.name.toLowerCase()] = d; });

  var active = Array.isArray(state.sheet.conditions) ? state.sheet.conditions : [];
  if (!active.length) {
    marinara.addElement(sec, "div", { "class": "mrr-inv-empty", textContent: "None active." });
  }
  active.forEach(function (name, idx) {
    var row = marinara.addElement(sec, "div", { "class": "mrr-skill-spec-row mrr-condition-row" });
    if (!row) return;
    marinara.addElement(row, "span", { "class": "mrr-skill-spec-name", textContent: name });

    var def = defByName[String(name).toLowerCase()];
    if (def) {
      var effects = [];
      var dis = Array.isArray(def.imposesDisadvantageOn) ? def.imposesDisadvantageOn : [];
      var adv = Array.isArray(def.grantsAdvantageOn) ? def.grantsAdvantageOn : [];
      if (dis.length) effects.push("disadvantage on " + dis.join(", "));
      if (adv.length) effects.push("advantage on " + adv.join(", "));
      if (effects.length) {
        var effSpan = marinara.addElement(row, "span", { "class": "mrr-condition-effect", textContent: effects.join("; ") });
        if (effSpan && def.description) effSpan.title = def.description;
      } else if (def.description) {
        var descSpan = marinara.addElement(row, "span", { "class": "mrr-condition-effect", textContent: "(narrative)" });
        if (descSpan) descSpan.title = def.description;
      }
    }

    var rm = marinara.addElement(row, "button", {
      "class": "mrr-track-add-btn mrr-track-add-btn--danger",
      textContent: "×",
      title: "Remove condition"
    });
    if (rm) marinara.on(rm, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      removeCondition(name);
    });
  });

  var addRow = marinara.addElement(sec, "div", { "class": "mrr-skill-spec-row" });
  if (addRow) {
    var sel = marinara.addElement(addRow, "select", { "class": "mrr-item-form__select" });
    if (sel) {
      var blank = document.createElement("option");
      blank.value = ""; blank.textContent = "— add condition —";
      sel.appendChild(blank);
      defs.forEach(function (d) {
        if (!d || !d.name) return;
        if (active.indexOf(d.name) !== -1) return;
        var opt = document.createElement("option");
        opt.value = d.name; opt.textContent = d.name;
        if (d.description) opt.title = d.description;
        sel.appendChild(opt);
      });
      var customOpt = document.createElement("option");
      customOpt.value = "__custom__"; customOpt.textContent = "(other — type a name)";
      sel.appendChild(customOpt);
      marinara.on(sel, "change", function () {
        var v = sel.value;
        if (!v) return;
        if (v === "__custom__") {
          var typed = window.prompt("Condition name:");
          sel.value = "";
          if (typed && typed.trim()) addCondition(typed.trim());
        } else {
          addCondition(v);
          sel.value = "";
        }
      });
    }
  }
}

function addCondition(name) {
  if (!name) return;
  if (!Array.isArray(state.sheet.conditions)) state.sheet.conditions = [];
  if (state.sheet.conditions.indexOf(name) !== -1) return;
  state.sheet.conditions.push(name);
  saveSheet(state.chatId, state.sheet);
  renderSheet();
}

function removeCondition(name) {
  if (!Array.isArray(state.sheet.conditions)) return;
  state.sheet.conditions = state.sheet.conditions.filter(function (c) { return c !== name; });
  saveSheet(state.chatId, state.sheet);
  renderSheet();
}

/* Aggregate roll-mode effect of all currently active conditions for the
   given category ("attack", "save", "skill"). Disadvantage wins ties. */
function conditionRollMode(category) {
  var defs = (state.ruleset && Array.isArray(state.ruleset.conditions)) ? state.ruleset.conditions : [];
  if (!defs.length) return "normal";
  var active = Array.isArray(state.sheet.conditions) ? state.sheet.conditions : [];
  if (!active.length) return "normal";
  var defByName = {};
  defs.forEach(function (d) { if (d && d.name) defByName[d.name.toLowerCase()] = d; });
  var hasDis = false;
  var hasAdv = false;
  for (var i = 0; i < active.length; i++) {
    var def = defByName[String(active[i]).toLowerCase()];
    if (!def) continue;
    if (Array.isArray(def.imposesDisadvantageOn) && def.imposesDisadvantageOn.indexOf(category) !== -1) hasDis = true;
    if (Array.isArray(def.grantsAdvantageOn)    && def.grantsAdvantageOn.indexOf(category)    !== -1) hasAdv = true;
  }
  if (hasDis) return "disadvantage";
  if (hasAdv) return "advantage";
  return "normal";
}

/* ─────  backgrounds / merits section  ───── */

/* Free-text dot-rated traits (Exalted Backgrounds & Merits, WoD Merits, etc.).
   Each entry is { name: string, value: int }. Modeled on the Specialty inline
   pattern: renderBackgroundRow draws name input + stepper + remove button,
   add button at the section footer pushes a fresh entry. */
function renderBackgrounds(parent) {
  var cfg = state.ruleset.backgrounds;
  if (!cfg || cfg.enabled !== true) return;

  var sec = marinara.addElement(parent, "div", { "class": "mrr-section" });
  if (!sec) return;
  marinara.addElement(sec, "div", {
    "class": "mrr-section__title",
    textContent: cfg.label || "Backgrounds"
  });

  var entries = Array.isArray(state.sheet.backgrounds) ? state.sheet.backgrounds : [];
  entries.forEach(function (entry, idx) { renderBackgroundRow(sec, entry, idx); });

  var addBtn = marinara.addElement(sec, "button", {
    "class": "mrr-track-add-btn mrr-char-btn--dashed",
    textContent: "+ Add Background"
  });
  if (addBtn) marinara.on(addBtn, "click", function (e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    addBackground();
  });
}

function renderBackgroundRow(parent, entry, idx) {
  var cfg = state.ruleset.backgrounds || {};
  var lo = (typeof cfg.min === "number") ? cfg.min : 0;
  var hi = (typeof cfg.max === "number") ? cfg.max : 5;
  /* `textOnly` suppresses the value display + stepper (D&D Feats use it). */
  var textOnly = !!cfg.textOnly;

  var row = marinara.addElement(parent, "div", { "class": "mrr-skill-spec-row" });
  if (!row) return;

  var nameInput = marinara.addElement(row, "input", {
    "class": "mrr-skill-spec-name",
    type: "text",
    placeholder: textOnly
      ? "feat (e.g. Sharpshooter, Lucky)"
      : "background (e.g. Resources, Allies)",
    value: entry.name || ""
  });
  if (nameInput) {
    /* Debounced save; do NOT re-render mid-typing or focus is lost on every
       keystroke. Mirror the Specialty input handling exactly. */
    var saveTimer = null;
    marinara.on(nameInput, "input", function () {
      entry.name = nameInput.value;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { saveSheet(state.chatId, state.sheet); }, 250);
    });
    marinara.on(nameInput, "blur", function () {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      saveSheet(state.chatId, state.sheet);
    });
    marinara.on(nameInput, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
  }

  if (!textOnly) {
    var valEl = makeEditableValue(
      row,
      function () { return entry.value || 0; },
      function (v) { entry.value = v; saveSheet(state.chatId, state.sheet); },
      lo, hi,
      refreshAllBars
    );
    addStepper(row, {
      get: function () { return entry.value || 0; },
      set: function (v) { entry.value = v; saveSheet(state.chatId, state.sheet); },
      min: lo,
      max: hi,
      onChange: function (v) { if (valEl) valEl.value = String(v); }
    });
  }

  var removeBtn = marinara.addElement(row, "button", {
    "class": "mrr-track-add-btn mrr-track-add-btn--danger",
    textContent: "×",
    title: "Remove background"
  });
  if (removeBtn) marinara.on(removeBtn, "click", function (e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    removeBackground(idx);
  });
}

/* ─────  inventory section  ───── */

function renderInventory(parent) {
  var sec = marinara.addElement(parent, "div", { "class": "mrr-section" });
  if (!sec) return;
  marinara.addElement(sec, "div", { "class": "mrr-section__title", textContent: "Equipment" });
  renderInventoryList(sec);
}

/* Equipment list body — split from renderInventory so the Phase-3
   wrapper (mrrP3RenderInventorySection) can render the same content
   inside a Phase-3 section frame without producing a double-section
   header. Classic renderInventory still calls this with its own
   .mrr-section parent; the produced DOM is byte-identical. */
function renderInventoryList(parent) {
  var list = marinara.addElement(parent, "div", { "class": "mrr-inv-list" });
  if (!list) return;

  function rebuild() {
    list.textContent = "";
    var inv = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
    /* Equipment-only filter — stored / consumable items live in the
       Items flyout. Items without an explicit category are inferred
       from slot presence. */
    var equipment = inv.filter(function (it) { return (it.category || (it.slot ? "equipment" : "item")) === "equipment"; });
    if (!equipment.length) {
      marinara.addElement(list, "div", { "class": "mrr-inv-empty", textContent: "No equipment. Use the button below to add a piece." });
    }
    equipment.forEach(function (item) {
      var row = marinara.addElement(list, "div", { "class": "mrr-inv-item" });
      if (!row) return;
      var equippedHere = item.slot && state.sheet.equipped[item.slot] === item.id;
      if (equippedHere) row.classList.add("mrr-inv-item--equipped");

      marinara.addElement(row, "span", { "class": "mrr-inv-item__name", textContent: item.name || "(unnamed)" });
      /* Phase 4 — quantity badge. Shows "× N" next to the name when
         the item is stacked. Hidden for quantity 1 (the default) so
         single-instance items stay visually clean. */
      if (typeof item.quantity === "number" && item.quantity !== 1) {
        marinara.addElement(row, "span", {
          "class": "mrr-chip mrr-chip--quantity",
          textContent: "× " + item.quantity,
          title: item.quantity + " in stack — edit via the item dialog"
        });
      }
      marinara.addElement(row, "span", { "class": "mrr-inv-item__slot", textContent: item.slot ? "[" + item.slot + "]" : "" });

      /* Damage cell: weapons declare e.g. "1d8 slashing"; non-weapons leave
         it blank. Rendered next to the slot so a quick scan of the
         inventory tells the player what's going to hurt and how much. */
      if (item.damage) {
        marinara.addElement(row, "span", {
          "class": "mrr-inv-item__damage",
          textContent: String(item.damage),
          title: "Damage: " + item.damage
        });
      }

      /* Hardness / Overwhelming chips. Hidden when 0 (the "no special
         handling" sentinel) so they only appear on items where the
         numbers actually matter — typically armor (Hardness) and
         high-tier weapons / Charms (Overwhelming) in Exalted. */
      if (typeof item.hardness === "number" && item.hardness > 0) {
        marinara.addElement(row, "span", {
          "class": "mrr-chip mrr-chip--hardness",
          textContent: "Hardness " + item.hardness,
          title: "Hardness " + item.hardness + " — incoming damage below this floor reduces to the attacker's Overwhelming"
        });
      }
      if (typeof item.overwhelming === "number" && item.overwhelming > 0) {
        marinara.addElement(row, "span", {
          "class": "mrr-chip mrr-chip--overwhelming",
          textContent: "Overwhelming " + item.overwhelming,
          title: "Overwhelming " + item.overwhelming + " — minimum damage this weapon always lands, even against soak/Hardness"
        });
      }

      /* Commitment chip — surfaces the per-item magic-binding state on
         the inventory row so the player can see at a glance which items
         are currently active without opening the editor. Only the
         active ruleset's commitmentModel renders; other models stay
         hidden. The mote chip carries the cost + pool for an at-a-
         glance budget read. */
      var commitModelInv = state.ruleset && state.ruleset.commitmentModel;
      if (commitModelInv === "attuned" && item.attuned) {
        marinara.addElement(row, "span", {
          "class": "mrr-chip mrr-chip--attuned",
          textContent: "Attuned",
          title: "Attuned (D&D 5e) — magical effects from this item are currently active. 3-item attunement cap."
        });
      } else if (commitModelInv === "invested" && item.invested) {
        marinara.addElement(row, "span", {
          "class": "mrr-chip mrr-chip--invested",
          textContent: "Invested",
          title: "Invested (Pathfinder 2e) — magical effects from this item are currently active. 10-item investiture cap."
        });
      } else if (commitModelInv === "mote" && typeof item.moteCommitment === "number" && item.moteCommitment > 0) {
        var poolLabel = (item.motePool === "Peripheral") ? "Peripheral" : "Personal";
        marinara.addElement(row, "span", {
          "class": "mrr-chip mrr-chip--mote",
          textContent: "Committed " + item.moteCommitment + "m " + poolLabel.charAt(0),
          title: "Committed: " + item.moteCommitment + " mote" + (item.moteCommitment === 1 ? "" : "s") + " from the " + poolLabel + " pool while this item is active"
        });
      }

      var summarySpan = marinara.addElement(row, "span", { "class": "mrr-inv-item__bonus-summary", textContent: formatBonuses(item.bonuses, false) });
      if (summarySpan) summarySpan.title = formatBonuses(item.bonuses, true);

      var equipBtn = marinara.addElement(row, "button", {
        "class": "mrr-char-btn" + (equippedHere ? " mrr-char-btn--accent" : ""),
        textContent: equippedHere ? "Equipped" : "Equip",
        title: item.slot ? ("Toggle equip in slot \"" + item.slot + "\"") : "Set a slot on this item to equip it"
      });
      if (equipBtn) marinara.on(equipBtn, "click", function () { toggleEquip(item); rebuild(); refreshAllEquipmentBonuses(); });

      /* Weapon roll buttons. "atk" opens the dice widget pre-filled with
         1d20 + attack-attribute mod + (proficiency when item.attackProficient).
         "dmg" rolls the damage expression directly and posts a [damage:]
         tag. Both are only rendered when the item has the relevant data
         (attackAttribute for atk, damage string for dmg) so non-weapon
         items don't grow useless buttons. */
      var isSingleRoll = state.ruleset && state.ruleset.resolution && state.ruleset.resolution.mode === MODES.SINGLE;
      if (isSingleRoll && item.attackAttribute) {
        var atkBtn = marinara.addElement(row, "button", {
          "class": "mrr-char-btn",
          textContent: "atk",
          title: "Roll attack: 1d20 + " + item.attackAttribute + "_mod" + (item.attackProficient ? " + proficiency" : "")
        });
        if (atkBtn) marinara.on(atkBtn, "click", function () { quickRollAttack(item); });
      }
      if (item.damage) {
        var dmgBtn = marinara.addElement(row, "button", {
          "class": "mrr-char-btn",
          textContent: "dmg",
          title: "Roll damage: " + item.damage + (item.attackAttribute ? " + " + item.attackAttribute + "_mod" : "")
        });
        if (dmgBtn) marinara.on(dmgBtn, "click", function () { rollWeaponDamage(item); });
      }

      var editBtn = marinara.addElement(row, "button", { "class": "mrr-char-btn", textContent: "Edit" });
      if (editBtn) marinara.on(editBtn, "click", function () { openItemDialog(item.id, rebuild); });

      var delBtn = marinara.addElement(row, "button", { "class": "mrr-char-btn mrr-char-btn--danger", textContent: "x", title: "Delete this item" });
      if (delBtn) marinara.on(delBtn, "click", function () {
        if (!window.confirm("Delete \"" + (item.name || item.id) + "\"?")) return;
        deleteItem(item.id);
        rebuild();
        refreshAllEquipmentBonuses();
      });
    });

    var addBtn = marinara.addElement(list, "button", { "class": "mrr-char-btn mrr-char-btn--dashed", textContent: "+ Add equipment" });
    if (addBtn) marinara.on(addBtn, "click", function () { openItemDialog(null, rebuild, "equipment"); });

    /* Open-items button. Stored / consumable items live in the Items
       flyout (separate panel like the spellbook). */
    var openBagBtn = marinara.addElement(list, "button", {
      "class": "mrr-char-btn",
      textContent: "Open items",
      title: "Open the Items panel (potions, scrolls, mundane gear)"
    });
    if (openBagBtn) marinara.on(openBagBtn, "click", function () { showItemBag(!state.itemBagOpen); });
  }
  rebuild();
}

/* ─────  Items flyout (consumables, scrolls, mundane gear)  ───── */

/* Phase 3.7 — Phase-3 itembag flyout via mrrP3CreatePanel. */
function mrrP3BuildItemBag() {
  if (state.itemBagEl) return state.itemBagEl;
  if (typeof mrrP3CreatePanel !== "function") return null;
  var p = mrrP3CreatePanel(document.body, {
    storageKey: "mrr-p3-itembag-pos",
    title: "Items — " + state.ruleset.name,
    defaultPos: { x: 360, y: 80 },
    defaultSize: { w: 420, h: 600 },
    onClose: function () { showItemBag(false); }
  });
  if (!p || !p.panel || !p.body) return null;
  if (p.body.classList) p.body.classList.add("mrr-spellbook__body");
  p.panel.style.display = "none";
  state.itemBagEl = p.panel;
  return state.itemBagEl;
}

function buildItemBag() {
  if (state.itemBagEl) return state.itemBagEl;
  state.itemBagEl = marinara.addElement(document.body, "div", { "class": "mrr-spellbook" });
  if (!state.itemBagEl) return null;

  var header = marinara.addElement(state.itemBagEl, "div", { "class": "mrr-spellbook__header" });
  if (header) {
    marinara.addElement(header, "span", { "class": "mrr-spellbook__title", textContent: "Items — " + state.ruleset.name });
    var close = marinara.addElement(header, "button", { "class": "mrr-dice__close", innerHTML: "&times;" });
    if (close) marinara.on(close, "click", function () { showItemBag(false); });
    makeDraggable(state.itemBagEl, header, "mrr-itembag-pos");
  }

  marinara.addElement(state.itemBagEl, "div", { "class": "mrr-spellbook__body" });
  return state.itemBagEl;
}

function showItemBag(open) {
  if (open) {
    if (!state.itemBagEl) {
      if (typeof mrrP3BuildItemBag === "function") mrrP3BuildItemBag();
      else buildItemBag();
    }
    if (state.itemBagEl) {
      state.itemBagEl.classList.add("mrr-spellbook--open");
      state.itemBagEl.style.display = "flex";
      state.itemBagOpen = true;
      renderItemBagContents();
    }
  } else {
    if (state.itemBagEl) {
      state.itemBagEl.classList.remove("mrr-spellbook--open");
      state.itemBagEl.style.display = "none";
    }
    state.itemBagOpen = false;
  }
}

function renderItemBagContents() {
  if (!state.itemBagEl) return;
  var body = state.itemBagEl.querySelector(".mrr-spellbook__body");
  if (!body) return;
  body.textContent = "";

  var inv = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
  var items = inv.filter(function (it) { return (it.category || (it.slot ? "equipment" : "item")) === "item"; });

  if (!items.length) {
    marinara.addElement(body, "div", { "class": "mrr-inv-empty", textContent: "No items. Add a potion, scroll, or piece of mundane gear below." });
  }

  items.forEach(function (item) {
    var row = marinara.addElement(body, "div", { "class": "mrr-inv-item" });
    if (!row) return;
    marinara.addElement(row, "span", { "class": "mrr-inv-item__name", textContent: item.name || "(unnamed)" });
    if (typeof item.quantity === "number" && item.quantity > 1) {
      marinara.addElement(row, "span", { "class": "mrr-inv-item__slot", textContent: "x" + item.quantity });
    }
    if (item.useEffect) {
      var fx = marinara.addElement(row, "span", {
        "class": "mrr-inv-item__damage",
        textContent: item.useEffect,
        title: "Use effect: " + item.useEffect + (item.consumable ? " — consumed on use" : "")
      });
    }

    if (item.useEffect) {
      var useBtn = marinara.addElement(row, "button", {
        "class": "mrr-char-btn mrr-char-btn--accent",
        textContent: "Use",
        title: "Roll the effect dice and post a [mrr-use:] tag for the GM to apply"
      });
      if (useBtn) marinara.on(useBtn, "click", function () { useItem(item); });
    }

    var editBtn = marinara.addElement(row, "button", { "class": "mrr-char-btn", textContent: "Edit" });
    if (editBtn) marinara.on(editBtn, "click", function () { openItemDialog(item.id, renderItemBagContents); });

    var delBtn = marinara.addElement(row, "button", { "class": "mrr-char-btn mrr-char-btn--danger", textContent: "x", title: "Delete this item" });
    if (delBtn) marinara.on(delBtn, "click", function () {
      if (!window.confirm("Delete \"" + (item.name || item.id) + "\"?")) return;
      deleteItem(item.id);
      renderItemBagContents();
    });
  });

  var addBtn = marinara.addElement(body, "button", {
    "class": "mrr-char-btn mrr-char-btn--dashed",
    textContent: "+ Add item"
  });
  if (addBtn) marinara.on(addBtn, "click", function () { openItemDialog(null, renderItemBagContents, "item"); });
}

/* Use a stored item: parse useEffect via DAMAGE_RE, roll, post a use
   tag. Decrements quantity by 1 when the item is consumable. */
function useItem(item) {
  if (!item || !item.useEffect) return;
  var faces = [];
  var rolledText = "";
  /* Route through the unified parseDamageExpression so D&D-style
     ("2d4+2 healing"), Exalted-style ("12L", "12 Lethal", "12dB"), and
     flat ("5 healing") use-effect strings all work. Non-dice prose
     (e.g. "remove poisoned condition") still falls through and the agent
     interprets it. */
  var parsed = parseDamageExpression(item.useEffect);
  if (parsed) {
    var rolled = rollParsedDamage(parsed, { label: (item.name || "item") + " effect" });
    faces = rolled.faces;
    /* Strip the surrounding [damage: ...] wrapper so the use tag's
       `rolled="..."` attribute carries just the result expression. */
    rolledText = rolled.text.replace(/^\[damage:\s*/, "").replace(/\s*\]$/, "");
  } else {
    rolledText = item.useEffect;
  }

  var tagParts = ['[mrr-use: name="' + (item.name || "item") + '"'];
  tagParts.push('effect="' + String(item.useEffect).replace(/"/g, "'") + '"');
  if (rolledText) tagParts.push('rolled="' + rolledText.replace(/"/g, "'") + '"');
  if (item.consumable) tagParts.push('consumable="true"');
  var useTag = tagParts.join(" ") + "]";

  if (item.consumable) {
    var inv = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
    var idx = inv.findIndex(function (it) { return it.id === item.id; });
    if (idx >= 0) {
      var q = (typeof inv[idx].quantity === "number") ? inv[idx].quantity : 1;
      q = Math.max(0, q - 1);
      if (q <= 0) {
        inv.splice(idx, 1);
      } else {
        inv[idx].quantity = q;
      }
      saveSheet(state.chatId, state.sheet);
    }
  }

  showDice(true);
  finalizeRoll(useTag, "success", faces);
  if (state.itemBagOpen) renderItemBagContents();
}

function formatBonuses(bonuses, full) {
  if (!Array.isArray(bonuses) || !bonuses.length) return "";
  return bonuses.map(function (b) {
    var v = (b.value > 0 ? "+" : "") + (b.value || 0);
    if (full) {
      var t = b.tag ? " (" + b.tag + ")" : "";
      return v + " " + (b.kind || BONUS_KIND.VALUE) + " to " + (b.target || "?") + t;
    }
    return v + (b.kind === BONUS_KIND.DICE ? "d" : "") + " " + (b.target || "?");
  }).join(full ? "\n" : ", ");
}

function toggleEquip(item) {
  if (!item || !item.slot) {
    window.alert("This item has no slot. Edit it and set a slot before equipping.");
    return;
  }
  if (!state.sheet.equipped) state.sheet.equipped = {};
  var wasEquipped = (state.sheet.equipped[item.slot] === item.id);
  /* Phase 6 — commitment is reconciled on the resource render side, not
     here. toggleEquip just flips equipped state and saves; the next
     resource render reads inventory + equipped, computes total committed
     motes per pool, and adjusts the spendable saved value by the delta.
     This handles slot-replacement, multi-item commitment, mid-flight
     edits, and load-time reconciliation through one code path. */
  if (wasEquipped) {
    delete state.sheet.equipped[item.slot];
  } else {
    state.sheet.equipped[item.slot] = item.id;
  }
  saveSheet(state.chatId, state.sheet);
  if (typeof refreshAllBars === "function") refreshAllBars();
  if (typeof renderSheet === "function") renderSheet();
}

function deleteItem(id) {
  if (!Array.isArray(state.sheet.inventory)) return;
  /* Find the item BEFORE splicing so we can: (a) restore committed
     motes to the named Exalted pool when the item was equipped at
     deletion time, and (b) recompute attunedCount / investedCount
     caches for downstream consumers. The four canonical read sites
     (buildSyncFields + buildSheetForPrompt × attuned/invested) now
     recompute from inventory directly, but keeping the cache fields
     consistent on disk costs nothing. */
  var removed = null;
  for (var ri = 0; ri < state.sheet.inventory.length; ri++) {
    if (state.sheet.inventory[ri] && state.sheet.inventory[ri].id === id) {
      removed = state.sheet.inventory[ri];
      break;
    }
  }
  state.sheet.inventory = state.sheet.inventory.filter(function (it) { return it.id !== id; });
  if (state.sheet.equipped) {
    Object.keys(state.sheet.equipped).forEach(function (slot) {
      if (state.sheet.equipped[slot] === id) delete state.sheet.equipped[slot];
    });
  }
  /* Phase 6 — explicit mote-pool restore on delete REMOVED. The render-time
     commitment reconciler now handles all commit / uncommit / delete deltas
     through one code path: deleted item → no longer in equipped → next
     render's computeCommittedMotes returns a lower live count → reconciler
     adds the difference back to the spendable saved value. Keeping the old
     explicit restore here would double-credit motes. */
  /* Recompute counter caches from the updated inventory so any consumer
     still reading the cache (legacy code, not-yet-migrated branches)
     sees the post-delete truth. */
  var inv = state.sheet.inventory;
  var ac = 0, ic = 0;
  for (var ci = 0; ci < inv.length; ci++) {
    var it = inv[ci];
    if (!it) continue;
    if (it.attuned) ac += 1;
    if (it.invested) ic += 1;
  }
  state.sheet.attunedCount = ac;
  state.sheet.investedCount = ic;
  saveSheet(state.chatId, state.sheet);
}

function bonusTargetCandidates() {
  var rs = state.ruleset;
  var names = [];
  if (rs && Array.isArray(rs.attributes)) rs.attributes.forEach(function (a) { names.push(a.name); });
  if (rs && Array.isArray(rs.skills))     rs.skills.forEach(function (s) { names.push(s.name); });
  if (rs && Array.isArray(rs.derivedStats)) rs.derivedStats.forEach(function (d) { names.push(d.name); });
  /* Authors who declared an advisory list of bonus targets — surface
     them too in case they want extra labels (e.g. "Damage", "Hardness")
     that aren't first-class stats on the sheet. */
  if (rs && Array.isArray(rs.equipmentBonusTargets)) {
    rs.equipmentBonusTargets.forEach(function (t) {
      if (names.indexOf(t) === -1) names.push(t);
    });
  }
  return names;
}

function openItemDialog(itemId, onSaved, defaultCategory) {
  /* Singleton: reusing one node across opens prevents orphaned backdrops if
     the user re-opens before clean-up finishes (e.g. rapid Edit clicks). */
  if (state.itemDialogEl && state.itemDialogEl.parentNode) {
    state.itemDialogEl.parentNode.removeChild(state.itemDialogEl);
  }
  var backdrop = marinara.addElement(document.body, "div", { "class": "mrr-dialog-backdrop mrr-dialog-backdrop--open" });
  if (!backdrop) return;
  state.itemDialogEl = backdrop;
  var dialog = marinara.addElement(backdrop, "div", { "class": "mrr-dialog" });
  if (!dialog) { document.body.removeChild(backdrop); state.itemDialogEl = null; return; }

  var existing = null;
  if (itemId && Array.isArray(state.sheet.inventory)) {
    existing = state.sheet.inventory.find(function (it) { return it.id === itemId; }) || null;
  }
  /* Working copy — committed on Save, discarded on Cancel. */
  var draft = existing
    ? JSON.parse(JSON.stringify(existing))
    : {
        id: "item-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        name: "", slot: "", bonuses: [], notes: "",
        category: (defaultCategory === "item" || defaultCategory === "equipment") ? defaultCategory : "equipment",
        useEffect: "",
        consumable: false
      };

  marinara.addElement(dialog, "h3", { textContent: existing ? "Edit Item" : "New Item" });

  /* Category radio. Equipment lives in the on-sheet Inventory section
     and supports slot/Equip/atk/dmg buttons. Item lives in the Items
     flyout and supports the Use button + consumable flag. */
  var catRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(catRow, "label", { textContent: "Category" });
  var catSel = marinara.addElement(catRow, "select", { "class": "mrr-item-form__select" });
  if (catSel) {
    [
      { value: "equipment", label: "Equipment (slot, equip, atk/dmg)" },
      { value: "item",      label: "Item (stored, usable, consumable)" }
    ].forEach(function (o) {
      var opt = document.createElement("option");
      opt.value = o.value; opt.textContent = o.label;
      if ((draft.category || "equipment") === o.value) opt.selected = true;
      catSel.appendChild(opt);
    });
  }

  var nameRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(nameRow, "label", { textContent: "Name" });
  var nameInput = marinara.addElement(nameRow, "input", { "class": "mrr-item-form__input", type: "text", value: draft.name || "", placeholder: "Daiklave of Glory" });

  var slotRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(slotRow, "label", { textContent: "Slot" });
  var slotInput = marinara.addElement(slotRow, "input", {
    "class": "mrr-item-form__input",
    type: "text",
    value: draft.slot || "",
    placeholder: "weapon, armor, etc.",
    list: "mrr-slot-suggestions"
  });
  /* Optional autocomplete: ruleset can declare equipmentSlots to suggest
     values without forcing them. Slot stays freeform — users can type
     anything. */
  var slots = (state.ruleset && Array.isArray(state.ruleset.equipmentSlots)) ? state.ruleset.equipmentSlots : [];
  if (slots.length) {
    var dl = marinara.addElement(dialog, "datalist", { id: "mrr-slot-suggestions" });
    if (dl) slots.forEach(function (s) { marinara.addElement(dl, "option", { value: s }); });
  }

  /* Damage row: free-text. Weapons declare a damage expression
     ("1d8 slashing", "2d6 fire"); non-weapons leave it blank. The string
     stays human-readable so different systems (D&D's "1d8 slashing",
     PF2e's "1d8 P", Exalted's flat values) all express naturally without
     forcing a structured shape that would never accommodate every
     ruleset's vocabulary. */
  var damageRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(damageRow, "label", { textContent: "Damage" });
  var damageInput = marinara.addElement(damageRow, "input", {
    "class": "mrr-item-form__input",
    type: "text",
    value: draft.damage || "",
    placeholder: "1d8 slashing"
  });

  /* Attack-attribute picker — declares which ability mod the weapon's
     attack and damage rolls add. D&D melee = Strength, finesse/ranged =
     Dexterity, spells = Intelligence/Wisdom/Charisma per class. Blank
     means "no attribute mod" (rare for weapons; common for thrown items
     a player just wants to track). */
  var attrRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(attrRow, "label", { textContent: "Atk attr" });
  var attrSel = marinara.addElement(attrRow, "select", { "class": "mrr-item-form__select" });
  if (attrSel) {
    var blankOpt = document.createElement("option");
    blankOpt.value = ""; blankOpt.textContent = "—";
    attrSel.appendChild(blankOpt);
    (state.ruleset.attributes || []).forEach(function (a) {
      var opt = document.createElement("option");
      opt.value = a.name; opt.textContent = a.name;
      if (draft.attackAttribute === a.name) opt.selected = true;
      attrSel.appendChild(opt);
    });
  }

  /* Proficient-with-this-weapon checkbox. When checked, attack rolls add
     the proficiency bonus from the current Proficiency Bonus derived
     stat. Damage rolls do NOT auto-add proficiency (matches D&D 5e
     conventions where proficiency applies to-hit but not to damage). */
  var profRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(profRow, "label", { textContent: "Proficient" });
  var profInput = marinara.addElement(profRow, "input", { type: "checkbox" });
  if (profInput && draft.attackProficient) profInput.checked = true;

  /* Hardness / Overwhelming. Equipment-only — the fields stay hidden on
     plain (non-equipment) items because they have no meaning there.
     Hardness is the "armor / Charm shield" floor that gates incoming
     damage; Overwhelming is the floor a weapon always lands. Both are
     non-negative integers; 0 means "no special handling" and the chip
     is hidden on the inventory card. The category dropdown's change
     handler toggles visibility live so the user sees the right inputs
     as they switch the type. */
  var hardRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row mrr-item-form__row--equipment-only" });
  marinara.addElement(hardRow, "label", { textContent: "Hardness" });
  var hardInput = marinara.addElement(hardRow, "input", {
    "class": "mrr-item-form__input",
    type: "number",
    min: "0",
    step: "1",
    value: String(typeof draft.hardness === "number" ? draft.hardness : 0),
    placeholder: "0"
  });

  var overRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row mrr-item-form__row--equipment-only" });
  marinara.addElement(overRow, "label", { textContent: "Overwhelming" });
  var overInput = marinara.addElement(overRow, "input", {
    "class": "mrr-item-form__input",
    type: "number",
    min: "0",
    step: "1",
    value: String(typeof draft.overwhelming === "number" ? draft.overwhelming : 0),
    placeholder: "0"
  });

  function applyEquipmentVisibility() {
    var isEquipment = (catSel && catSel.value === "equipment");
    if (hardRow) hardRow.style.display = isEquipment ? "" : "none";
    if (overRow) overRow.style.display = isEquipment ? "" : "none";
  }
  applyEquipmentVisibility();
  if (catSel) marinara.on(catSel, "change", applyEquipmentVisibility);

  /* Commitment section — driven by ruleset.commitmentModel. Three mutually
     exclusive flavors:
       "attuned"  (D&D 5e) — checkbox; cap of 3 attuned items at once
       "invested" (PF2e)   — checkbox; cap of 10 invested items at once
       "mote"     (Exalted) — non-negative int + Personal/Peripheral pool
                              select; the int IS the cost the item commits
                              from the chosen pool while it's set
     Hidden entirely when the ruleset declares no commitmentModel
     (commitmentModel: null) so Fate Core and any other no-magic-item
     rulesets stay clean. Equipment-only — non-equipment items have no
     concept of being bound to a character to grant magical effects. */
  var commitmentModel = (state.ruleset && state.ruleset.commitmentModel) || null;
  var attuneInput = null;
  var investInput = null;
  var moteCommitInput = null;
  var motePoolSel = null;
  var commitmentRows = [];
  if (commitmentModel) {
    var commitTitle = marinara.addElement(dialog, "div", { "class": "mrr-bonus-list__title", textContent: "Magic / Commitment" });
    if (commitTitle) commitmentRows.push(commitTitle);

    if (commitmentModel === "attuned" || commitmentModel === "invested") {
      var labelText = commitmentModel === "attuned" ? "Attuned" : "Invested";
      var capN      = commitmentModel === "attuned" ? 3 : 10;
      var commitRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
      if (commitRow) {
        commitmentRows.push(commitRow);
        marinara.addElement(commitRow, "label", { textContent: labelText });
        var commitBox = marinara.addElement(commitRow, "input", { type: "checkbox" });
        if (commitBox) {
          var prevSet = !!(commitmentModel === "attuned" ? draft.attuned : draft.invested);
          if (prevSet) commitBox.checked = true;
          marinara.on(commitBox, "change", function () {
            /* Cap enforcement runs only when transitioning OFF→ON. Counts
               every other item already carrying the flag (excluding this
               draft), and rejects the toggle if the cap is already met.
               Inline error message reuses the dialog's shared msg div so
               the failure surfaces near the form instead of in a toast. */
            if (!commitBox.checked) {
              if (msg) msg.classList.add("mrr-msg--hidden");
              return;
            }
            var inv = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
            var inUse = 0;
            for (var i = 0; i < inv.length; i++) {
              var other = inv[i];
              if (!other || other.id === draft.id) continue;
              if (commitmentModel === "attuned" && other.attuned) inUse += 1;
              else if (commitmentModel === "invested" && other.invested) inUse += 1;
            }
            if (inUse >= capN) {
              commitBox.checked = false;
              setMsg(msg, labelText + " cap of " + capN + " reached. Remove another " + labelText.toLowerCase() + " item first.", "err");
            } else {
              if (msg) msg.classList.add("mrr-msg--hidden");
            }
          });
        }
        if (commitmentModel === "attuned") attuneInput = commitBox;
        else                                investInput = commitBox;
      }
    } else if (commitmentModel === "mote") {
      var moteRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
      if (moteRow) {
        commitmentRows.push(moteRow);
        marinara.addElement(moteRow, "label", { textContent: "Mote commit" });
        moteCommitInput = marinara.addElement(moteRow, "input", {
          "class": "mrr-item-form__input",
          type: "number",
          min: "0",
          step: "1",
          value: String(typeof draft.moteCommitment === "number" ? draft.moteCommitment : 0),
          placeholder: "0"
        });
      }
      var poolRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
      if (poolRow) {
        commitmentRows.push(poolRow);
        marinara.addElement(poolRow, "label", { textContent: "Pool" });
        motePoolSel = marinara.addElement(poolRow, "select", { "class": "mrr-item-form__select" });
        if (motePoolSel) {
          ["Personal", "Peripheral"].forEach(function (poolName) {
            var opt = document.createElement("option");
            opt.value = poolName; opt.textContent = poolName;
            if ((draft.motePool || "Personal") === poolName) opt.selected = true;
            motePoolSel.appendChild(opt);
          });
        }
      }
    }
  }
  /* Equipment-only visibility for the commitment section, kept in sync
     with the Hardness/Overwhelming rows. Non-equipment items hide the
     whole section since "Item-category" entries (consumables, scrolls,
     stored gear) don't bind to a character to grant magical effects in
     any of the three models above. */
  function applyCommitmentVisibility() {
    var isEquipment = (catSel && catSel.value === "equipment");
    for (var i = 0; i < commitmentRows.length; i++) {
      commitmentRows[i].style.display = isEquipment ? "" : "none";
    }
  }
  applyCommitmentVisibility();
  if (catSel) marinara.on(catSel, "change", applyCommitmentVisibility);

  marinara.addElement(dialog, "div", { "class": "mrr-bonus-list__title", textContent: "Bonuses" });
  var bonusList = marinara.addElement(dialog, "div", { "class": "mrr-bonus-list" });
  if (!bonusList) return;

  var targets = bonusTargetCandidates();

  function renderBonusRow(b, idx) {
    var row = marinara.addElement(bonusList, "div", { "class": "mrr-bonus-row" });
    if (!row) return;

    var targetSel = marinara.addElement(row, "select", { "class": "mrr-bonus-row__input" });
    if (targetSel) {
      var blank = document.createElement("option");
      blank.value = ""; blank.textContent = "(target)";
      targetSel.appendChild(blank);
      targets.forEach(function (t) {
        var opt = document.createElement("option");
        opt.value = t; opt.textContent = t;
        if (t === b.target) opt.selected = true;
        targetSel.appendChild(opt);
      });
      marinara.on(targetSel, "change", function () { draft.bonuses[idx].target = targetSel.value; });
    }

    var valInput = marinara.addElement(row, "input", { "class": "mrr-bonus-row__input", type: "number", value: String(b.value || 0) });
    if (valInput) marinara.on(valInput, "input", function () {
      var n = parseInt(valInput.value, 10);
      draft.bonuses[idx].value = isNaN(n) ? 0 : n;
    });

    var kindSel = marinara.addElement(row, "select", { "class": "mrr-bonus-row__input" });
    if (kindSel) {
      Object.keys(BONUS_KIND).forEach(function (k) {
        var v = BONUS_KIND[k];
        var opt = document.createElement("option");
        opt.value = v; opt.textContent = v;
        if (v === (b.kind || BONUS_KIND.VALUE)) opt.selected = true;
        kindSel.appendChild(opt);
      });
      marinara.on(kindSel, "change", function () { draft.bonuses[idx].kind = kindSel.value; });
    }

    var tagInput = marinara.addElement(row, "input", { "class": "mrr-bonus-row__input", type: "text", value: b.tag || "", placeholder: "tag (accuracy)" });
    if (tagInput) marinara.on(tagInput, "input", function () { draft.bonuses[idx].tag = tagInput.value; });

    var rmBtn = marinara.addElement(row, "button", { "class": "mrr-char-btn mrr-char-btn--danger", textContent: "x", title: "Remove this bonus" });
    if (rmBtn) marinara.on(rmBtn, "click", function () {
      draft.bonuses.splice(idx, 1);
      bonusList.textContent = "";
      draft.bonuses.forEach(renderBonusRow);
    });
  }

  draft.bonuses.forEach(renderBonusRow);

  var addBonusBtn = marinara.addElement(dialog, "button", { "class": "mrr-char-btn mrr-char-btn--dashed", textContent: "+ Add bonus" });
  if (addBonusBtn) marinara.on(addBonusBtn, "click", function () {
    var newBonus = { target: "", value: 0, kind: BONUS_KIND.VALUE, tag: "" };
    draft.bonuses.push(newBonus);
    renderBonusRow(newBonus, draft.bonuses.length - 1);
  });

  /* Use effect — only meaningful for Item-category entries. Free-text
     dice expression that the Use button parses. */
  var useRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(useRow, "label", { textContent: "Use effect" });
  var useInput = marinara.addElement(useRow, "input", {
    "class": "mrr-item-form__input",
    type: "text",
    value: draft.useEffect || "",
    placeholder: "2d4+2 healing  ·  remove poisoned  ·  1d6 fire"
  });

  /* Consumable flag — Use decrements quantity by 1; when quantity hits
     0 the item is removed. */
  var consRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(consRow, "label", { textContent: "Consumable" });
  var consInput = marinara.addElement(consRow, "input", { type: "checkbox" });
  if (consInput && draft.consumable) consInput.checked = true;

  /* Phase 4 — Quantity (item stacking). One entry can represent N copies
     of the same item (5 healing potions, 12 arrows, etc.). Default 1.
     For consumables the Use action decrements; manual edits here are
     for "I picked up a stack" / inventory-correction flows. */
  var qtyRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(qtyRow, "label", { textContent: "Quantity" });
  var qtyInput = marinara.addElement(qtyRow, "input", {
    type: "number",
    "class": "mrr-item-form__field",
    min: "0",
    step: "1"
  });
  if (qtyInput) qtyInput.value = String(typeof draft.quantity === "number" ? draft.quantity : 1);

  var notesRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(notesRow, "label", { textContent: "Notes" });
  var notesInput = marinara.addElement(notesRow, "textarea", { "class": "mrr-item-form__textarea" });
  if (notesInput) notesInput.value = draft.notes || "";

  var msg = marinara.addElement(dialog, "div", { "class": "mrr-msg mrr-msg--info mrr-msg--hidden" });

  var buttons = marinara.addElement(dialog, "div", { "class": "mrr-dialog__buttons" });
  if (buttons) {
    var btnCancel = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Cancel" });
    var btnSave = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn", textContent: "Save" });

    if (btnCancel) marinara.on(btnCancel, "click", function () { close(); });
    if (btnSave) marinara.on(btnSave, "click", function () {
      var name = (nameInput && nameInput.value || "").trim();
      if (!name) { setMsg(msg, "Name is required.", "err"); return; }
      draft.name = name;
      draft.slot = (slotInput && slotInput.value || "").trim();
      draft.damage = (damageInput && damageInput.value || "").trim();
      draft.attackAttribute = (attrSel && attrSel.value) || "";
      draft.attackProficient = !!(profInput && profInput.checked);
      draft.notes = (notesInput && notesInput.value || "").trim();
      draft.category = (catSel && catSel.value === "item") ? "item" : "equipment";
      draft.useEffect = (useInput && useInput.value || "").trim();
      draft.consumable = !!(consInput && consInput.checked);
      /* Phase 4 — quantity. parseInt with Math.max(0,...) clamp; bad
         input falls back to 1 (the default). */
      var qn = qtyInput ? parseInt(qtyInput.value, 10) : 1;
      draft.quantity = (!isNaN(qn) && qn >= 0) ? Math.floor(qn) : 1;
      /* Hardness / Overwhelming persist only on equipment. On a non-
         equipment item the fields are hidden in the dialog; we still
         clear them to 0 here so toggling category later doesn't leave
         stale numbers around. parseInt with || 0 covers blank, NaN,
         and negative-by-typo. */
      if (draft.category === "equipment") {
        var ph = parseInt(hardInput && hardInput.value, 10);
        draft.hardness = (!isNaN(ph) && ph >= 0) ? ph : 0;
        var po = parseInt(overInput && overInput.value, 10);
        draft.overwhelming = (!isNaN(po) && po >= 0) ? po : 0;
      } else {
        draft.hardness = 0;
        draft.overwhelming = 0;
      }
      /* Commitment fields — populate only the slot the active ruleset's
         commitmentModel uses; clear the other slots so a model swap at
         the ruleset level (or the user changing rulesets on this
         character) doesn't leave ghost commitments around. Non-equipment
         items zero everything because the section is hidden for them.

         SAVE-TIME CAP ENFORCEMENT (defense in depth, v2): boolean
         models recount the inventory at save time, EXCLUDING this
         draft, and refuse to set attuned/invested=true if doing so
         would exceed the cap. The change-handler already enforces at
         toggle time, but this catches: (a) an edit to an item that
         was already attuned in legacy state where the user never
         toggled, (b) a state-mutator-agent setting attuned=true via
         tag, (c) any browser quirk where the change event didn't
         fire. The error surfaces in the dialog message slot; the
         rest of the save proceeds with attuned=false. */
      if (draft.category === "equipment" && commitmentModel === "attuned") {
        var wantAttuned = !!(attuneInput && attuneInput.checked);
        if (wantAttuned) {
          var attunedInUse = 0;
          var invSafe = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
          for (var ai = 0; ai < invSafe.length; ai++) {
            var ao = invSafe[ai];
            if (!ao || ao.id === draft.id) continue;
            if (ao.attuned) attunedInUse += 1;
          }
          if (attunedInUse >= 3) {
            wantAttuned = false;
            if (attuneInput) attuneInput.checked = false;
            setMsg(msg, "Attuned cap of 3 reached. Saved with Attuned cleared — un-attune another item first.", "err");
          }
        }
        draft.attuned = wantAttuned;
        draft.invested = false;
        draft.moteCommitment = 0;
      } else if (draft.category === "equipment" && commitmentModel === "invested") {
        var wantInvested = !!(investInput && investInput.checked);
        if (wantInvested) {
          var investedInUse = 0;
          var invSafeI = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
          for (var ii = 0; ii < invSafeI.length; ii++) {
            var io = invSafeI[ii];
            if (!io || io.id === draft.id) continue;
            if (io.invested) investedInUse += 1;
          }
          if (investedInUse >= 10) {
            wantInvested = false;
            if (investInput) investInput.checked = false;
            setMsg(msg, "Invested cap of 10 reached. Saved with Invested cleared — un-invest another item first.", "err");
          }
        }
        draft.invested = wantInvested;
        draft.attuned = false;
        draft.moteCommitment = 0;
      } else if (draft.category === "equipment" && commitmentModel === "mote") {
        var pmc = parseInt(moteCommitInput && moteCommitInput.value, 10);
        var newMotes = (!isNaN(pmc) && pmc >= 0) ? pmc : 0;
        var newPool = (motePoolSel && motePoolSel.value === "Peripheral") ? "Peripheral" : "Personal";
        /* Mote-pool live decrement (Phase 2.C). When the user changes
           moteCommitment or motePool via the dialog, the change must
           propagate to state.sheet.derived[<pool> + " Motes"] — Phase 1
           stored the data field but didn't wire the pool delta. Math:
           restore the old commit to the old pool, then debit the new
           commit from the new pool. Compute both legs first, refuse if
           the result would deplete a pool below 0, and apply atomically
           only on success.

           IMPORTANT key naming: item.motePool stores the short form
           ("Personal" / "Peripheral") for cap math + UI labels, but the
           derived-stat key on state.sheet.derived is the FULL ruleset
           name ("Personal Motes" / "Peripheral Motes"). They MUST be
           translated; reads against the short form silently hit a
           phantom key starting at 0 and refuse every commit. */
        var oldMotes = (existing && typeof existing.moteCommitment === "number" && existing.moteCommitment > 0) ? existing.moteCommitment : 0;
        var oldPool = (existing && existing.motePool === "Peripheral") ? "Peripheral" : "Personal";
        var oldPoolKey = oldPool + " Motes";
        var newPoolKey = newPool + " Motes";
        if (!state.sheet.derived) state.sheet.derived = {};
        if (typeof state.sheet.derived[oldPoolKey] !== "number") state.sheet.derived[oldPoolKey] = 0;
        if (typeof state.sheet.derived[newPoolKey] !== "number") state.sheet.derived[newPoolKey] = 0;
        var simOldM = state.sheet.derived[oldPoolKey] + oldMotes;
        var simNewM = (oldPoolKey === newPoolKey ? simOldM : state.sheet.derived[newPoolKey]) - newMotes;
        if (simNewM < 0) {
          /* Refuse the commitment change. Revert draft.moteCommitment
             and motePool to the existing values so the rest of the
             save (notes, slot, bonuses) goes through but the pool
             stays in its prior consistent state. */
          setMsg(msg, "Cannot commit " + newMotes + " motes to " + newPool + " — would deplete the pool below 0. Save kept previous commitment.", "err");
          draft.moteCommitment = oldMotes;
          draft.motePool = oldPool;
        } else {
          if (oldPoolKey === newPoolKey) {
            state.sheet.derived[oldPoolKey] = simNewM;
          } else {
            state.sheet.derived[oldPoolKey] = simOldM;
            state.sheet.derived[newPoolKey] = simNewM;
          }
          draft.moteCommitment = newMotes;
          draft.motePool = newPool;
        }
        draft.attuned = false;
        draft.invested = false;
      } else {
        draft.attuned = false;
        draft.invested = false;
        draft.moteCommitment = 0;
      }
      /* Drop any in-progress bonus rows that the user never picked a
         target for. Saves the user from typo-by-omission. */
      draft.bonuses = (draft.bonuses || []).filter(function (b) { return b && b.target; });

      if (!Array.isArray(state.sheet.inventory)) state.sheet.inventory = [];
      var existingIdx = state.sheet.inventory.findIndex(function (it) { return it.id === draft.id; });
      if (existingIdx >= 0) state.sheet.inventory[existingIdx] = draft;
      else state.sheet.inventory.push(draft);

      /* Refresh commitment counters after the write — these are the
         truth source for the cap-enforcement check on the NEXT item
         opened, and they ride along in the snapshot to GM agents. */
      var invAfter = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
      var ac = 0, ic = 0;
      for (var k = 0; k < invAfter.length; k++) {
        var x = invAfter[k];
        if (!x) continue;
        if (x.attuned) ac += 1;
        if (x.invested) ic += 1;
      }
      state.sheet.attunedCount = ac;
      state.sheet.investedCount = ic;

      saveSheet(state.chatId, state.sheet);
      close();
      if (typeof onSaved === "function") onSaved();
      refreshAllEquipmentBonuses();
    });
  }

  function close() {
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    if (state.itemDialogEl === backdrop) state.itemDialogEl = null;
  }
  marinara.on(backdrop, "click", function (e) { if (e.target === backdrop) close(); });
}

/* ─────  abilities / spellbook  ───────────────────────────────────────────
   Optional per-ruleset powers vocabulary. When `ruleset.abilities` is
   present, the main sheet renders a clickable row labeled with
   `abilities.label` showing total count; clicking opens a third floating
   panel (separate from the sheet and dice widget) listing each category
   collapsed by default with its own count badge, exactly mirroring the
   shape `ruleset.abilities.categories[]` declared.

   Each ability is per-character (`state.sheet.abilities[categoryId][]`).
   On save, if a `lorebookKeyword` is set the extension upserts a
   chat-scoped lorebook entry (POST first, PATCH on edit) so the GM agent
   reads the player's description when the keyword fires in chat. The
   spellbook lorebook is distinct from the managed ruleset lorebook —
   ruleset bundle re-installs do NOT touch it. */

function getAbilitiesConfig() {
  var rs = state.ruleset;
  if (!rs || !rs.abilities) return null;
  if (!Array.isArray(rs.abilities.categories) || !rs.abilities.categories.length) return null;
  return rs.abilities;
}

function abilityCountForCategory(catId) {
  if (!state.sheet || !state.sheet.abilities) return 0;
  var arr = state.sheet.abilities[catId];
  return Array.isArray(arr) ? arr.length : 0;
}

function totalAbilityCount() {
  if (!state.sheet || !state.sheet.abilities) return 0;
  var n = 0;
  Object.keys(state.sheet.abilities).forEach(function (k) {
    var arr = state.sheet.abilities[k];
    if (Array.isArray(arr)) n += arr.length;
  });
  return n;
}

function renderAbilitiesSection(parent) {
  var cfg = getAbilitiesConfig();
  if (!cfg) return;
  var sec = marinara.addElement(parent, "div", { "class": "mrr-section mrr-spellbook-row" });
  if (!sec) return;
  var btn = marinara.addElement(sec, "button", {
    "class": "mrr-char-btn mrr-char-btn--dashed mrr-spellbook-row__btn",
    type: "button",
    textContent: cfg.label + " (" + totalAbilityCount() + ")"
  });
  if (btn) marinara.on(btn, "click", function () { showSpellbook(!state.spellbookOpen); });
}

function showSpellbook(open) {
  if (!getAbilitiesConfig()) {
    state.spellbookOpen = false;
    return;
  }
  if (open) {
    if (!state.spellbookEl) {
      if (typeof mrrP3BuildSpellbook === "function") mrrP3BuildSpellbook();
      else buildSpellbook();
    }
    if (state.spellbookEl) {
      /* Set both class (classic) AND inline display (Phase-3 panel)
         — inline wins where present, class drives the classic CSS
         visibility gate. */
      state.spellbookEl.classList.add("mrr-spellbook--open");
      state.spellbookEl.style.display = "flex";
      state.spellbookOpen = true;
      renderSpellbookContents();
    }
  } else {
    if (state.spellbookEl) {
      state.spellbookEl.classList.remove("mrr-spellbook--open");
      state.spellbookEl.style.display = "none";
    }
    state.spellbookOpen = false;
  }
}

/* Phase 3.7 — Phase-3 spellbook flyout build using mrrP3CreatePanel.
   Parallel to classic buildSpellbook; chosen by showSpellbook based
   on useNewRenderer. Reuses renderSpellbookContents by adding the
   .mrr-spellbook__body class to the factory's body so the existing
   querySelector still works. */
function mrrP3BuildSpellbook() {
  if (state.spellbookEl) return state.spellbookEl;
  if (typeof mrrP3CreatePanel !== "function") return null;
  var cfg = (typeof getAbilitiesConfig === "function") ? getAbilitiesConfig() : null;
  var titleText = (cfg && cfg.label ? cfg.label : "Spellbook") + " — " + state.ruleset.name;
  var p = mrrP3CreatePanel(document.body, {
    storageKey: "mrr-p3-spellbook-pos",
    title: titleText,
    defaultPos: { x: 360, y: 80 },
    defaultSize: { w: 420, h: 640 },
    onClose: function () { showSpellbook(false); }
  });
  if (!p || !p.panel || !p.body) return null;
  if (p.body.classList) p.body.classList.add("mrr-spellbook__body");
  /* Hide on build; show* toggles via inline display (works for both
     paths since inline overrides .mrr-p3-panel's display: flex default). */
  p.panel.style.display = "none";
  state.spellbookEl = p.panel;
  return state.spellbookEl;
}

function buildSpellbook() {
  if (state.spellbookEl) return state.spellbookEl;
  state.spellbookEl = marinara.addElement(document.body, "div", { "class": "mrr-spellbook" });
  if (!state.spellbookEl) return null;

  var header = marinara.addElement(state.spellbookEl, "div", { "class": "mrr-spellbook__header" });
  if (header) {
    var cfg = getAbilitiesConfig();
    var titleText = (cfg && cfg.label ? cfg.label : "Spellbook") + " — " + state.ruleset.name;
    marinara.addElement(header, "span", { "class": "mrr-spellbook__title", textContent: titleText });
    var close = marinara.addElement(header, "button", { "class": "mrr-dice__close", innerHTML: "&times;" });
    if (close) marinara.on(close, "click", function () { showSpellbook(false); });
    makeDraggable(state.spellbookEl, header, LS_SPELLBOOK_POS);
  }

  marinara.addElement(state.spellbookEl, "div", { "class": "mrr-spellbook__body" });
  return state.spellbookEl;
}

function renderSpellbookContents() {
  if (!state.spellbookEl) return;
  var body = state.spellbookEl.querySelector(".mrr-spellbook__body");
  if (!body) return;
  body.textContent = "";

  var cfg = getAbilitiesConfig();
  if (!cfg) {
    marinara.addElement(body, "div", { "class": "mrr-msg mrr-msg--info", textContent: "This ruleset has no abilities defined." });
    return;
  }

  if (!state.sheet.abilityCollapse || typeof state.sheet.abilityCollapse !== "object") {
    state.sheet.abilityCollapse = {};
  }
  if (!state.sheet.abilities || typeof state.sheet.abilities !== "object") {
    state.sheet.abilities = {};
  }

  var declaredIds = {};
  cfg.categories.forEach(function (cat) {
    declaredIds[cat.id] = true;
    renderSpellbookCategory(body, cat);
  });

  /* Phase 5 — custom user-added categories (V20 bloodline disciplines).
     state.sheet.customAbilityCategories = [{id, label}]. Render after
     ruleset categories with a delete button so users can remove a
     custom category they added in error. */
  if (Array.isArray(state.sheet.customAbilityCategories)) {
    state.sheet.customAbilityCategories.forEach(function (cat) {
      if (!cat || !cat.id) return;
      declaredIds[cat.id] = true;
      renderSpellbookCategory(body, cat, null, true /* isCustom */);
    });
  }

  /* Orphan abilities — categoryIds that were saved but no longer exist on
     the active ruleset (ruleset switch mid-chat). Render under a synthetic
     "Uncategorized" bucket so the data is recoverable rather than silently
     hidden. ISC-35 codifies. */
  var orphans = Object.keys(state.sheet.abilities).filter(function (k) {
    return !declaredIds[k] && Array.isArray(state.sheet.abilities[k]) && state.sheet.abilities[k].length > 0;
  });
  if (orphans.length) {
    var pseudoCat = { id: "__uncategorized", label: "Uncategorized" };
    orphans.forEach(function (catId) {
      var arr = state.sheet.abilities[catId];
      arr.forEach(function (ab) { ab.__orphanCategoryId = catId; });
    });
    renderSpellbookCategory(body, pseudoCat, orphans);
  }

  /* Phase 5 — "+ Add custom" button at the bottom of the panel.
     Prompts for a name (e.g. "Daimoinon" for a bloodline discipline)
     and pushes a new custom category. Re-renders. */
  var addCustomBtn = marinara.addElement(body, "button", {
    "class": "mrr-char-btn mrr-char-btn--dashed",
    type: "button",
    textContent: "+ Add " + (cfg.label || "Category")
  });
  if (addCustomBtn) marinara.on(addCustomBtn, "click", function () {
    var name = window.prompt("Name for the new " + (cfg.label || "category").toLowerCase() + ":");
    if (!name || !name.trim()) return;
    if (!Array.isArray(state.sheet.customAbilityCategories)) state.sheet.customAbilityCategories = {};
    var nameTrim = name.trim();
    var slug = nameTrim.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    var newId = "custom-" + (slug || "unnamed") + "-" + Date.now().toString(36);
    if (!Array.isArray(state.sheet.customAbilityCategories)) state.sheet.customAbilityCategories = [];
    state.sheet.customAbilityCategories.push({ id: newId, label: nameTrim });
    saveSheet(state.chatId, state.sheet);
    renderSpellbookContents();
  });
}

function renderSpellbookCategory(body, cat, orphanCategoryIds, isCustom) {
  var sec = marinara.addElement(body, "div", { "class": "mrr-spellbook-cat" });
  if (!sec) return;

  var count = orphanCategoryIds
    ? orphanCategoryIds.reduce(function (n, id) { return n + abilityCountForCategory(id); }, 0)
    : abilityCountForCategory(cat.id);

  var collapsed = (cat.id in state.sheet.abilityCollapse)
    ? !!state.sheet.abilityCollapse[cat.id]
    : true;
  if (collapsed) sec.classList.add("mrr-spellbook-cat--collapsed");

  /* Phase 5 — per-category score (V20 disciplines: 1-10 rating). Shown
     in the head row when the ruleset has dice-pool resolution mode AND
     this isn't an orphan bucket. Score range from cfg.scoreMin/Max if
     declared (default 0-10). State at state.sheet.abilityCategoryScores
     [cat.id]. */
  var headRow = marinara.addElement(sec, "div", { "class": "mrr-spellbook-cat__head-row" });
  if (!headRow) return;
  var head = marinara.addElement(headRow, "button", {
    "class": "mrr-spellbook-cat__head",
    type: "button",
    textContent: cat.label + " " + count
  });
  if (head) marinara.on(head, "click", function () {
    state.sheet.abilityCollapse[cat.id] = !state.sheet.abilityCollapse[cat.id]
      ? false
      : true;
    var nowCollapsed = sec.classList.toggle("mrr-spellbook-cat--collapsed");
    state.sheet.abilityCollapse[cat.id] = nowCollapsed;
    saveSheet(state.chatId, state.sheet);
  });

  var isPoolMode = state.ruleset && state.ruleset.resolution
      && state.ruleset.resolution.mode === "dice-pool";
  if (isPoolMode && !orphanCategoryIds) {
    if (!state.sheet.abilityCategoryScores || typeof state.sheet.abilityCategoryScores !== "object") {
      state.sheet.abilityCategoryScores = {};
    }
    var curScore = state.sheet.abilityCategoryScores[cat.id];
    if (typeof curScore !== "number") curScore = 0;
    var scoreInput = marinara.addElement(headRow, "input", {
      "class": "mrr-spellbook-cat__score",
      type: "number",
      min: "0",
      max: "10",
      step: "1",
      title: "Rating (0-10)"
    });
    if (scoreInput) {
      scoreInput.value = String(curScore);
      marinara.on(scoreInput, "click", function (e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      });
      marinara.on(scoreInput, "change", function () {
        var n = parseInt(scoreInput.value, 10);
        if (isNaN(n) || n < 0) n = 0;
        if (n > 10) n = 10;
        state.sheet.abilityCategoryScores[cat.id] = n;
        saveSheet(state.chatId, state.sheet);
      });
    }
  }

  /* Phase 5 — custom-category delete button. Only on user-added cats. */
  if (isCustom) {
    var delCatBtn = marinara.addElement(headRow, "button", {
      "class": "mrr-char-btn mrr-char-btn--danger",
      type: "button",
      textContent: "×",
      title: "Remove this custom " + (cat.label || "category")
    });
    if (delCatBtn) marinara.on(delCatBtn, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      if (!window.confirm("Remove " + (cat.label || "category") + " and all its abilities?")) return;
      if (Array.isArray(state.sheet.customAbilityCategories)) {
        state.sheet.customAbilityCategories = state.sheet.customAbilityCategories.filter(function (c) {
          return c && c.id !== cat.id;
        });
      }
      if (state.sheet.abilities) delete state.sheet.abilities[cat.id];
      if (state.sheet.abilityCategoryScores) delete state.sheet.abilityCategoryScores[cat.id];
      if (state.sheet.abilityCollapse) delete state.sheet.abilityCollapse[cat.id];
      saveSheet(state.chatId, state.sheet);
      renderSpellbookContents();
    });
  }

  var list = marinara.addElement(sec, "div", { "class": "mrr-spellbook-cat__list" });
  if (!list) return;

  var iterIds = orphanCategoryIds || [cat.id];
  iterIds.forEach(function (catId) {
    var abs = state.sheet.abilities[catId];
    if (!Array.isArray(abs)) return;
    abs.forEach(function (ab) {
      renderAbilityRow(list, ab, catId);
    });
  });

  /* + Add button only on real categories, not the orphan bucket. */
  if (!orphanCategoryIds) {
    var addBtn = marinara.addElement(sec, "button", {
      "class": "mrr-char-btn mrr-char-btn--dashed mrr-spellbook-cat__add",
      type: "button",
      textContent: "+ Add"
    });
    if (addBtn) marinara.on(addBtn, "click", function () {
      openAbilityDialog(null, cat.id);
    });
  }
}

function renderAbilityRow(list, ab, catId) {
  var row = marinara.addElement(list, "div", { "class": "mrr-spellbook-ab" });
  if (!row) return;
  marinara.addElement(row, "span", { "class": "mrr-spellbook-ab__name", textContent: ab.name || "(unnamed)" });
  marinara.addElement(row, "span", { "class": "mrr-spellbook-ab__cost", textContent: ab.costText || "" });

  /* Cast button — for single-roll mode appears with cast-time data
     (damageDice / saveAttribute / spellcastingAttribute). For dice-pool
     mode (V20 disciplines, Exalted charms) ALWAYS appears so the player
     can announce a discipline activation in chat with name + cost. */
  var hasCastData = !!(ab.damageDice || ab.saveAttribute || ab.spellcastingAttribute);
  var isPoolModeRow = state.ruleset && state.ruleset.resolution
      && state.ruleset.resolution.mode === "dice-pool";
  if (state.ruleset && state.ruleset.resolution &&
      ((state.ruleset.resolution.mode === MODES.SINGLE && hasCastData) || isPoolModeRow)) {
    var castBtn = marinara.addElement(row, "button", {
      "class": "mrr-char-btn mrr-char-btn--accent",
      type: "button",
      textContent: "Cast",
      title: isPoolModeRow
        ? "Announce activation in chat with name + cost"
        : "Compute DC, roll damage, post chat tag for the GM to resolve"
    });
    if (castBtn) marinara.on(castBtn, "click", function () {
      if (isPoolModeRow) castAbilityPool(ab, catId);
      else castSpell(ab);
    });
  }

  var editBtn = marinara.addElement(row, "button", { "class": "mrr-char-btn", type: "button", textContent: "Edit" });
  if (editBtn) marinara.on(editBtn, "click", function () { openAbilityDialog(ab.id, catId); });

  var delBtn = marinara.addElement(row, "button", { "class": "mrr-char-btn mrr-char-btn--danger", type: "button", textContent: "x", title: "Delete" });
  if (delBtn) marinara.on(delBtn, "click", function () {
    if (!window.confirm("Delete \"" + (ab.name || ab.id) + "\"?")) return;
    deleteAbility(catId, ab.id);
  });
}

/* Phase 5 — dice-pool cast. Used by V20 disciplines + Exalted charms.
   Posts a chat tag announcing the activation with name + cost so the
   GM can see the player invoked it. No DC, no damage roll — the
   discipline's effect is freeform-narrative and the cost (e.g. blood
   points for V20 disciplines, mote cost for Exalted charms) is the
   authoritative resource expenditure.

   Phase 6 — three concrete behaviors the player expects on click:
     1. parse the ability's costText, auto-deduct motes / willpower / blood
        from the sheet (Exalted mote model + V20 blood pool)
     2. inject the cast chat tag into the chat textarea directly via
        insertIntoChatInput — no more "click cast then click Send-to-chat
        in the dice widget" two-step shuffle
     3. open the dice widget so the player can immediately roll their
        activation pool; the discipline rating pre-fills as a hint
   The previous path called finalizeRoll which only stored the tag for
   later send — the cast button felt broken because nothing observable
   happened on click. */
function castAbilityPool(ability, catId) {
  if (!ability || !state.ruleset) return;
  var name = String(ability.name || "ability");
  var cost = String(ability.costText || "");
  var catLabel = "";
  if (catId) {
    var cfg = (typeof getAbilitiesConfig === "function") ? getAbilitiesConfig() : null;
    if (cfg && Array.isArray(cfg.categories)) {
      for (var i = 0; i < cfg.categories.length; i++) {
        if (cfg.categories[i].id === catId) { catLabel = cfg.categories[i].label; break; }
      }
    }
    if (!catLabel && Array.isArray(state.sheet.customAbilityCategories)) {
      for (var j = 0; j < state.sheet.customAbilityCategories.length; j++) {
        if (state.sheet.customAbilityCategories[j].id === catId) {
          catLabel = state.sheet.customAbilityCategories[j].label; break;
        }
      }
    }
  }
  /* Per-category score (V20 discipline rating). Included in the tag
     so the GM agent can read the player's discipline level without
     opening the sheet. */
  var rating = "";
  if (catId && state.sheet.abilityCategoryScores
      && typeof state.sheet.abilityCategoryScores[catId] === "number") {
    rating = String(state.sheet.abilityCategoryScores[catId]);
  }
  /* Phase 6 — auto-deduct from sheet. Only fires for known mote /
     blood-pool commitment models so non-Exalted/V20 rulesets that
     borrow this cast path don't get surprise sheet edits. */
  var commitModel = state.ruleset.commitmentModel || null;
  /* P0-6: affordability gate. Without this, spends clamp to 0 silently while
     the cast tag still claims full cost, and repeated clicks re-deduct every
     time. Compute what the cast needs vs. what the pools hold; if short,
     refuse the whole cast — no deduction, no full-cost tag. */
  if (cost && commitModel === "mote") {
    var _d = state.sheet.derived || {};
    var _mReq = 0, _wReq = 0;
    var _mM = cost.match(/(\d+)\s*m\b(?!p)/i); if (_mM) _mReq = parseInt(_mM[1], 10) || 0;
    var _wM = cost.match(/(\d+)\s*(?:wp\b|willpower)/i); if (_wM) _wReq = parseInt(_wM[1], 10) || 0;
    var _mAvail = ((typeof _d["Peripheral Motes"] === "number") ? _d["Peripheral Motes"] : 0)
                + ((typeof _d["Personal Motes"] === "number") ? _d["Personal Motes"] : 0);
    var _wAvail = (typeof _d["Willpower"] === "number") ? _d["Willpower"] : 0;
    if ((_mReq > 0 && _mAvail < _mReq) || (_wReq > 0 && _wAvail < _wReq)) {
      warn("cast refused: " + name + " needs " + cost + " but pools hold "
           + _mAvail + "m / " + _wAvail + "wp");
      if (typeof window !== "undefined" && window.alert) {
        window.alert("Not enough to cast " + name + " (" + cost + "). You have "
                     + _mAvail + " motes and " + _wAvail + " willpower.");
      }
      return;
    }
  } else if (cost && commitModel !== "attuned") {
    var _bReq = 0, _bM = cost.match(/(\d+)\s*(?:b\b|blood)/i);
    if (_bM) _bReq = parseInt(_bM[1], 10) || 0;
    if (_bReq > 0) {
      var _bAvail = (state.sheet.derived && typeof state.sheet.derived["Blood Pool"] === "number")
        ? state.sheet.derived["Blood Pool"] : 0;
      if (_bAvail < _bReq) {
        warn("cast refused: " + name + " needs " + cost + " but Blood Pool holds " + _bAvail);
        if (typeof window !== "undefined" && window.alert) {
          window.alert("Not enough blood to cast " + name + " (" + cost + "). Pool: " + _bAvail + ".");
        }
        return;
      }
    }
  }
  if (cost && commitModel === "mote") {
    if (!state.sheet.derived || typeof state.sheet.derived !== "object") {
      state.sheet.derived = {};
    }
    /* Motes: Exalted convention spends Peripheral first, overflow into
       Personal. costText is free-form ("5m, 1wp" / "3m" / "1wp"); regex
       finds the first integer immediately followed by 'm' (not 'mp' or
       'min'). Word boundary keeps "1m" from matching inside "1mp". */
    var moteMatch = cost.match(/(\d+)\s*m\b(?!p)/i);
    if (moteMatch) {
      var moteCost = parseInt(moteMatch[1], 10) || 0;
      var peri = (typeof state.sheet.derived["Peripheral Motes"] === "number")
        ? state.sheet.derived["Peripheral Motes"] : 0;
      if (peri >= moteCost) {
        state.sheet.derived["Peripheral Motes"] = peri - moteCost;
      } else {
        state.sheet.derived["Peripheral Motes"] = 0;
        var overflow = moteCost - peri;
        var pers = (typeof state.sheet.derived["Personal Motes"] === "number")
          ? state.sheet.derived["Personal Motes"] : 0;
        state.sheet.derived["Personal Motes"] = Math.max(0, pers - overflow);
      }
    }
    /* Willpower: matches "Xwp", "X wp", or "X willpower" — the second
       and third are common in custom costText entries. */
    var wpMatch = cost.match(/(\d+)\s*(?:wp\b|willpower)/i);
    if (wpMatch) {
      var wpCost = parseInt(wpMatch[1], 10) || 0;
      var wp = (typeof state.sheet.derived["Willpower"] === "number")
        ? state.sheet.derived["Willpower"] : 0;
      state.sheet.derived["Willpower"] = Math.max(0, wp - wpCost);
    }
    if (moteMatch || wpMatch) {
      saveSheet(state.chatId, state.sheet);
      if (typeof refreshAllBars === "function") refreshAllBars();
    }
  } else if (cost && commitModel === "attuned") {
    /* D&D commitment model has no spend cost on cast — attunement is
       binary. No auto-deduct. */
  } else if (cost) {
    /* V20 + other rulesets — blood pool spend pattern. */
    var bloodMatch = cost.match(/(\d+)\s*(?:b\b|blood)/i);
    if (bloodMatch && state.sheet.derived && typeof state.sheet.derived["Blood Pool"] === "number") {
      var bloodCost = parseInt(bloodMatch[1], 10) || 0;
      state.sheet.derived["Blood Pool"] = Math.max(0, state.sheet.derived["Blood Pool"] - bloodCost);
      saveSheet(state.chatId, state.sheet);
      if (typeof refreshAllBars === "function") refreshAllBars();
    }
  }

  var parts = ['[mrr-cast: name="' + name.replace(/"/g, '\\"') + '"'];
  if (catLabel) parts.push('discipline="' + catLabel.replace(/"/g, '\\"') + '"');
  if (rating)   parts.push('rating="' + rating + '"');
  if (cost)     parts.push('cost="' + cost.replace(/"/g, '\\"') + '"');
  parts[parts.length - 1] += ']';
  var tag = parts.join(" ");

  /* Post directly to the chat input so the cast tag appears immediately
     without the legacy preview-in-dice-widget two-step shuffle. */
  var injected = false;
  if (typeof insertIntoChatInput === "function") {
    injected = !!insertIntoChatInput(tag);
  }
  if (!injected) {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      try { navigator.clipboard.writeText(tag); } catch (e) {}
    }
    if (typeof finalizeRoll === "function") finalizeRoll(tag, "narrate", []);
    log("castAbilityPool: chat input not found; tag copied to clipboard: " + tag);
  }

  /* Open the dice widget so the player can immediately roll their
     activation pool. Pre-seed pool with the discipline rating as a hint. */
  if (state.ruleset.resolution && state.ruleset.resolution.mode === MODES.POOL) {
    showDice(true);
    if (rating && typeof setDiceInput === "function") {
      var pool = parseInt(rating, 10);
      if (isFinite(pool) && pool > 0) setDiceInput("pool", pool);
    }
  }

  /* Re-render the sheet so the deducted motes / WP are immediately
     visible in the Resources cluster. */
  if (typeof renderSheet === "function") renderSheet();
}

/* Compute the spell save DC and emit the cast + damage chat tags. */
function castSpell(ability) {
  if (!ability || !state.ruleset) return;
  var ctx = statContext();
  var castMod = 0;
  if (ability.spellcastingAttribute) {
    var modKey = ability.spellcastingAttribute + "_mod";
    if (typeof ctx[modKey] === "number") castMod = ctx[modKey];
  }
  /* DC is ruleset-defined. When the ruleset doesn't declare a formula
     we skip the DC entirely — the cast tag still posts with damage and
     save target, the agent picks a DC by rule context. The core knows
     no system's spell-save DC convention by default. */
  var dcFormula = state.ruleset.resolution && state.ruleset.resolution.spellSaveDcFormula;
  var dc = 0;
  if (dcFormula) {
    var subbed = String(dcFormula).replace(/\{spellcastingAttribute_mod\}/g, String(castMod));
    var v = evalFormula(subbed, ctx);
    dc = (typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0;
  }

  var damageText = "";
  var faces = [];
  if (ability.damageDice) {
    /* Same unified parser as weapons & items so D&D-style ("8d6 fire"),
       Exalted-style ("12L", "12dB"), and flat ("5 fire") all roll. */
    var parsed = parseDamageExpression(ability.damageDice);
    if (parsed) {
      var rolled = rollParsedDamage(parsed, { label: ability.name });
      faces = rolled.faces;
      damageText = rolled.text;
    }
  }

  var castParts = ['[mrr-cast: name="' + (ability.name || "spell") + '"'];
  if (dc > 0) castParts.push('dc="' + dc + '"');
  if (ability.saveAttribute) castParts.push('save="' + ability.saveAttribute + '"');
  if (ability.damageDice) castParts.push('damage="' + ability.damageDice + '"');
  if (ability.halfOnSave) castParts.push('half_on_save="true"');
  if (ability.costText) castParts.push('cost="' + ability.costText.replace(/"/g, "'") + '"');
  var castTag = castParts.join(" ") + "]";

  showDice(true);
  var combined = damageText ? (castTag + "\n" + damageText) : castTag;
  finalizeRoll(combined, "success", faces);
}

function formatAbilityCost(cost) {
  if (!cost || typeof cost !== "object") return "";
  var amt = (typeof cost.amount === "number") ? cost.amount : 0;
  var res = cost.resource || "";
  if (!res && !amt) return "";
  if (!res) return String(amt);
  return amt + " " + res;
}

function deleteAbility(catId, abId) {
  if (!state.sheet.abilities || !Array.isArray(state.sheet.abilities[catId])) return;
  var idx = -1;
  state.sheet.abilities[catId].forEach(function (a, i) { if (a.id === abId) idx = i; });
  if (idx === -1) return;
  var ab = state.sheet.abilities[catId][idx];
  state.sheet.abilities[catId].splice(idx, 1);
  saveSheet(state.chatId, state.sheet);
  /* Best-effort lorebook cleanup; does not block local delete. */
  if (ab && ab.lorebookEntryId) {
    deleteAbilityLorebookEntry(ab).catch(function () {});
  }
  renderSpellbookContents();
  /* Refresh main sheet count badge. */
  renderSheet();
  if (state.spellbookOpen) showSpellbook(true);   // re-add open class after re-render
}

function openAbilityDialog(abilityId, defaultCategoryId, onSaved) {
  if (state.abilityDialogEl && state.abilityDialogEl.parentNode) {
    state.abilityDialogEl.parentNode.removeChild(state.abilityDialogEl);
    state.abilityDialogEl = null;
  }
  var cfg = getAbilitiesConfig();
  if (!cfg) return;

  var backdrop = marinara.addElement(document.body, "div", { "class": "mrr-dialog-backdrop mrr-dialog-backdrop--open" });
  if (!backdrop) return;
  state.abilityDialogEl = backdrop;
  var dialog = marinara.addElement(backdrop, "div", { "class": "mrr-dialog" });
  if (!dialog) { document.body.removeChild(backdrop); state.abilityDialogEl = null; return; }

  /* Locate existing across all categories so Edit works regardless of where
     it lives. */
  var existing = null;
  var existingCatId = null;
  if (abilityId && state.sheet.abilities) {
    Object.keys(state.sheet.abilities).forEach(function (catId) {
      if (existing) return;
      var arr = state.sheet.abilities[catId];
      if (!Array.isArray(arr)) return;
      var hit = arr.find(function (a) { return a.id === abilityId; });
      if (hit) { existing = hit; existingCatId = catId; }
    });
  }
  var draft = existing
    ? JSON.parse(JSON.stringify(existing))
    : {
        id: "mrr-ability-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        name: "",
        cost: { resource: "", amount: 0 },
        type: "at-will",
        effectText: "",
        description: "",
        lorebookKeyword: "",
        lorebookEntryId: "",
        /* Cast-time fields. damageDice parses via the same NdM[+K type]
           regex the weapon roller uses. saveAttribute names the
           defender's saving-throw ability. spellcastingAttribute is the
           caster's mod that feeds the DC formula. halfOnSave covers the
           D&D 5e "save halves" damage rule. */
        damageDice: "",
        saveAttribute: "",
        spellcastingAttribute: "",
        halfOnSave: false
      };
  var startingCatId = existingCatId || defaultCategoryId || cfg.categories[0].id;

  marinara.addElement(dialog, "h3", { textContent: existing ? ("Edit " + cfg.label.replace(/s$/, "")) : ("New " + cfg.label.replace(/s$/, "")) });

  var nameRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(nameRow, "label", { textContent: "Name" });
  var nameInput = marinara.addElement(nameRow, "input", { "class": "mrr-item-form__input", type: "text", value: draft.name || "", placeholder: "Fireball" });

  var catRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(catRow, "label", { textContent: "Category" });
  var catSel = marinara.addElement(catRow, "select", { "class": "mrr-item-form__select" });
  if (catSel) {
    cfg.categories.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id; opt.textContent = c.label;
      if (c.id === startingCatId) opt.selected = true;
      catSel.appendChild(opt);
    });
  }

  /* Cost is free-text — no structured fields. Multi-component costs
     ("5m 1w", "1 lvl-3 slot, V/S/M") are written as the player types
     them. The string is pushed verbatim into the lorebook entry on
     save; the GM agent reads it on cast and emits one [mrr-state: ...]
     tag per numeric cost component. The single-field design handles
     every system without per-system editor logic. */
  var costRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(costRow, "label", { textContent: "Cost" });
  var costInput = marinara.addElement(costRow, "input", {
    "class": "mrr-item-form__input",
    type: "text",
    value: draft.costText || "",
    placeholder: "5m 1w · 1 lvl-3 slot · V/S/M · etc."
  });

  var typeRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(typeRow, "label", { textContent: "Type" });
  var typeSel = marinara.addElement(typeRow, "select", { "class": "mrr-item-form__select" });
  if (typeSel) {
    ["passive", "triggered", "at-will", "per-rest"].forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t; opt.textContent = t;
      if (t === draft.type) opt.selected = true;
      typeSel.appendChild(opt);
    });
  }

  var effectRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(effectRow, "label", { textContent: "Effect" });
  /* Spell-cast structured fields. Damage is parsed when the player hits
     Cast (uses the same regex as weapon damage). The two attribute
     pickers drive the DC computation: spellcasting attribute → caster's
     modifier added to the DC; save attribute → which ability the
     defender rolls. Half-on-save is the D&D 5e default for AOE damage. */
  var effectInput = marinara.addElement(effectRow, "input", {
    "class": "mrr-item-form__input",
    type: "text",
    value: draft.effectText || "",
    placeholder: "8d6 fire, 150ft, basic Reflex"
  });

  var dmgRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(dmgRow, "label", { textContent: "Damage" });
  var dmgInput = marinara.addElement(dmgRow, "input", {
    "class": "mrr-item-form__input",
    type: "text",
    value: draft.damageDice || "",
    placeholder: "8d6 fire — leave blank for non-damage spells"
  });

  var castAttrRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(castAttrRow, "label", { textContent: "Cast attr" });
  var castAttrSel = marinara.addElement(castAttrRow, "select", { "class": "mrr-item-form__select" });
  if (castAttrSel) {
    var blankCast = document.createElement("option");
    blankCast.value = ""; blankCast.textContent = "—";
    castAttrSel.appendChild(blankCast);
    (state.ruleset.attributes || []).forEach(function (a) {
      var opt = document.createElement("option");
      opt.value = a.name; opt.textContent = a.name;
      if (draft.spellcastingAttribute === a.name) opt.selected = true;
      castAttrSel.appendChild(opt);
    });
  }

  var saveAttrRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(saveAttrRow, "label", { textContent: "Save vs" });
  var saveAttrSel = marinara.addElement(saveAttrRow, "select", { "class": "mrr-item-form__select" });
  if (saveAttrSel) {
    var blankSave = document.createElement("option");
    blankSave.value = ""; blankSave.textContent = "—";
    saveAttrSel.appendChild(blankSave);
    (state.ruleset.attributes || []).forEach(function (a) {
      var opt = document.createElement("option");
      opt.value = a.name; opt.textContent = a.name;
      if (draft.saveAttribute === a.name) opt.selected = true;
      saveAttrSel.appendChild(opt);
    });
  }

  var halfRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(halfRow, "label", { textContent: "Half on save" });
  var halfInput = marinara.addElement(halfRow, "input", { type: "checkbox" });
  if (halfInput && draft.halfOnSave) halfInput.checked = true;

  var descRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(descRow, "label", { textContent: "Description" });
  var descInput = marinara.addElement(descRow, "textarea", {
    "class": "mrr-item-form__textarea",
    placeholder: "Full rules + flavor — this is what the GM agent will read when the keyword fires."
  });
  if (descInput) descInput.value = draft.description || "";

  var kwRow = marinara.addElement(dialog, "div", { "class": "mrr-item-form__row" });
  marinara.addElement(kwRow, "label", { textContent: "Keyword" });
  var kwInput = marinara.addElement(kwRow, "input", {
    "class": "mrr-item-form__input",
    type: "text",
    value: draft.lorebookKeyword || "",
    placeholder: "(auto-fills from name on save)"
  });

  var msg = marinara.addElement(dialog, "div", { "class": "mrr-msg mrr-msg--info mrr-msg--hidden" });
  /* Live keyword-collision check while user edits the keyword field. ISC-36
     surfaces this informationally — does not block save. */
  function refreshCollisionWarning() {
    if (!msg || !kwInput) return;
    var k = (kwInput.value || "").trim().toLowerCase();
    if (!k) { msg.classList.add("mrr-msg--hidden"); return; }
    var hits = [];
    Object.keys(state.sheet.abilities || {}).forEach(function (catId) {
      var arr = state.sheet.abilities[catId];
      if (!Array.isArray(arr)) return;
      arr.forEach(function (a) {
        if (a.id === draft.id) return;
        if ((a.lorebookKeyword || "").trim().toLowerCase() === k) hits.push(a.name || a.id);
      });
    });
    if (hits.length) {
      msg.classList.remove("mrr-msg--hidden");
      msg.textContent = "FYI: " + hits.join(", ") + " also use this keyword. The GM will see all matching descriptions when it triggers.";
    } else {
      msg.classList.add("mrr-msg--hidden");
    }
  }
  if (kwInput) marinara.on(kwInput, "input", refreshCollisionWarning);
  refreshCollisionWarning();

  var buttons = marinara.addElement(dialog, "div", { "class": "mrr-dialog__buttons" });
  var saveBtn = marinara.addElement(buttons, "button", { "class": "mrr-char-btn mrr-char-btn--accent", type: "button", textContent: "Save" });
  var cancelBtn = marinara.addElement(buttons, "button", { "class": "mrr-char-btn", type: "button", textContent: "Cancel" });

  function close() {
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    if (state.abilityDialogEl === backdrop) state.abilityDialogEl = null;
  }
  marinara.on(backdrop, "click", function (e) { if (e.target === backdrop) close(); });
  if (cancelBtn) marinara.on(cancelBtn, "click", close);

  if (saveBtn) marinara.on(saveBtn, "click", function () {
    var name = (nameInput && nameInput.value || "").trim();
    if (!name) { window.alert("Name is required."); return; }
    var newCatId = catSel ? catSel.value : startingCatId;
    var costText = (costInput && costInput.value || "").trim();
    var kw = (kwInput && kwInput.value || "").trim();
    if (!kw) kw = name;   // auto-fill from name when blank — Corey's directive

    draft.name = name;
    draft.costText = costText;
    delete draft.cost;   // drop legacy structured shape on edit
    draft.type = (typeSel && typeSel.value) || "at-will";
    draft.effectText = (effectInput && effectInput.value || "").trim();
    draft.description = (descInput && descInput.value || "").trim();
    draft.lorebookKeyword = kw;
    draft.damageDice = (dmgInput && dmgInput.value || "").trim();
    draft.spellcastingAttribute = (castAttrSel && castAttrSel.value) || "";
    draft.saveAttribute = (saveAttrSel && saveAttrSel.value) || "";
    draft.halfOnSave = !!(halfInput && halfInput.checked);

    /* Persist to localStorage atomically. Lorebook write follows as
       best-effort; failures do not block the save. */
    if (!state.sheet.abilities || typeof state.sheet.abilities !== "object") state.sheet.abilities = {};
    /* Remove from old category if changed. */
    if (existing && existingCatId && existingCatId !== newCatId) {
      state.sheet.abilities[existingCatId] = (state.sheet.abilities[existingCatId] || []).filter(function (a) { return a.id !== draft.id; });
    }
    if (!Array.isArray(state.sheet.abilities[newCatId])) state.sheet.abilities[newCatId] = [];
    var idx = state.sheet.abilities[newCatId].findIndex(function (a) { return a.id === draft.id; });
    if (idx >= 0) state.sheet.abilities[newCatId][idx] = draft;
    else state.sheet.abilities[newCatId].push(draft);
    saveSheet(state.chatId, state.sheet);

    /* Lorebook upsert — fire-and-forget. */
    upsertAbilityLorebookEntry(draft, state.activeCharacterId, newCatId).then(function (entryId) {
      if (entryId && entryId !== draft.lorebookEntryId) {
        draft.lorebookEntryId = entryId;
        /* Re-find and update the persisted ability with the new entry id. */
        var arr = state.sheet.abilities[newCatId];
        var hit = arr && arr.find(function (a) { return a.id === draft.id; });
        if (hit) { hit.lorebookEntryId = entryId; saveSheet(state.chatId, state.sheet); }
      }
    }).catch(function (e) { log("ability lorebook upsert failed", e && e.message); });

    close();
    renderSheet();
    if (state.spellbookOpen) showSpellbook(true);
    if (typeof onSaved === "function") onSaved();
  });
}

/* ─────  spellbook lorebook bootstrap + entry CRUD  ───── */

function getActiveChatTitle() {
  /* Best-effort title fetch from DOM; falls back to chatId. The chat
     title is cosmetic on the lorebook record and does not affect lookup. */
  try {
    var el = document.querySelector(".chat-title, [data-chat-title], h1, h2");
    if (el && el.textContent) return el.textContent.trim().slice(0, 80);
  } catch (e) {}
  return "Chat " + (state.chatId ? state.chatId.slice(0, 8) : "");
}

function findOrCreateSpellbookLorebook() {
  if (!state.chatId) return Promise.reject(new Error("no active chatId"));
  /* Cache hit — fast path. */
  if (state.spellbookLbId) return Promise.resolve(state.spellbookLbId);
  var cacheKey = LS_SPELLBOOK_LB_PFX + state.chatId;
  var cached = lsGet(cacheKey);
  if (cached) { state.spellbookLbId = cached; return Promise.resolve(cached); }

  /* Lazy-discover: search existing lorebooks for one tagged
     mrr-spellbook + matching chatId. Two browser tabs racing both hit
     this path, but at most one creates because the second lookup will
     find the first's record once it lands. */
  return apiFetch("/lorebooks").then(function (lbs) {
    var existing = Array.isArray(lbs) ? lbs.find(function (lb) {
      return lb && lb.chatId === state.chatId && Array.isArray(lb.tags) && lb.tags.indexOf(MRR_TAG_SPELLBOOK) >= 0;
    }) : null;
    if (existing && existing.id) {
      state.spellbookLbId = existing.id;
      lsSet(cacheKey, existing.id);
      return existing.id;
    }
    var body = {
      name: getActiveChatTitle() + " — Player Spellbook",
      description: "Player-authored abilities for this chat. Auto-managed by Marinara-RPG-Extension; safe to edit by hand.",
      category: "spellbook",
      chatId: state.chatId,
      tags: [MRR_TAG_SPELLBOOK],
      scanDepth: 4,
      tokenBudget: 8192,
      generatedBy: "user"
    };
    return apiFetch("/lorebooks", { method: "POST", body: JSON.stringify(body) }).then(function (lb) {
      if (!lb || !lb.id) throw new Error("lorebook create: no id returned");
      state.spellbookLbId = lb.id;
      lsSet(cacheKey, lb.id);
      return lb.id;
    });
  });
}

function invalidateSpellbookLorebookCache() {
  state.spellbookLbId = null;
  if (state.chatId) lsDel(LS_SPELLBOOK_LB_PFX + state.chatId);
}

function abilityEntryBody(ability, charId, catId) {
  var keyword = (ability.lorebookKeyword || ability.name || "").trim();
  var content = (ability.description || "").trim();
  var isSorcery = (catId === "sorcery");
  /* Sorcery flag goes FIRST. The state-mutator agent reads "Type: Sorcery"
     to choose the Shape Sorcery workflow (sorcerous-mote accumulation,
     up-front Willpower with refund-on-success) instead of the standard
     Charm cost flow that taps Personal/Peripheral pools. */
  if (isSorcery) {
    content = "Type: Sorcery" + (content ? "\n\n" + content : "");
  }
  /* Cost goes early in the entry content so the GM agent sees it
     immediately. The state-mutator agent reads "Cost: ..." from the
     active lorebook context on cast and emits one [mrr-state: ...] tag
     per numeric component. */
  var costText = (ability.costText || "").trim();
  if (costText) {
    content = (content ? content + "\n\n" : "") + "Cost: " + costText;
  }
  if (ability.effectText && content.indexOf(ability.effectText) === -1) {
    content = (content ? content + "\n\n" : "") + "Effect: " + ability.effectText;
  }
  /* Cast-time mechanics block — read by the GM/state-mutator on cast. */
  var castParts = [];
  if (ability.damageDice) castParts.push("Damage: " + ability.damageDice);
  if (ability.saveAttribute) castParts.push("Save vs: " + ability.saveAttribute);
  if (ability.spellcastingAttribute) castParts.push("Cast attribute: " + ability.spellcastingAttribute);
  if (ability.halfOnSave) castParts.push("Half on save: yes (target takes half damage on a successful save)");
  if (castParts.length) {
    content = (content ? content + "\n\n" : "") + "Cast Mechanics:\n" + castParts.join("\n");
  }
  /* Build the keyword list. Sorcery entries also pick up the generic
     "sorcery" keyword so a chat mention of "sorcery" pulls every spell
     into context, helpful for NPC sorcerers and rules questions. */
  var keys = keyword ? [keyword] : [];
  if (isSorcery && keys.indexOf("sorcery") === -1) keys.push("sorcery");
  return {
    name: ability.name || keyword || "Untitled",
    content: content,
    keys: keys,
    position: 0,
    matchWholeWords: true,
    enabled: true,
    role: "system",
    tags: [MRR_TAG_SPELLBOOK, MRR_TAG_CHAR_PFX + (charId || "unknown"), MRR_TAG_CAT_PFX + (catId || "unknown")]
  };
}

function upsertAbilityLorebookEntry(ability, charId, catId) {
  var keyword = (ability.lorebookKeyword || ability.name || "").trim();
  if (!keyword) {
    /* No keyword and no name — skip silently. Anti-criterion ISC-23. */
    return Promise.resolve(null);
  }
  return findOrCreateSpellbookLorebook().then(function (lbId) {
    var body = abilityEntryBody(ability, charId, catId);
    if (ability.lorebookEntryId) {
      return apiFetch("/lorebooks/" + lbId + "/entries/" + ability.lorebookEntryId, {
        method: "PATCH",
        body: JSON.stringify(body)
      }).then(function () { return ability.lorebookEntryId; }).catch(function (e) {
        /* 404 recovery: stale cached id (entry deleted out-of-band). Drop
           the stored id and POST fresh. ISC-37. */
        if (e && e.status === 404) {
          return apiFetch("/lorebooks/" + lbId + "/entries", {
            method: "POST",
            body: JSON.stringify(body)
          }).then(function (entry) { return entry && entry.id; });
        }
        throw e;
      });
    }
    return apiFetch("/lorebooks/" + lbId + "/entries", {
      method: "POST",
      body: JSON.stringify(body)
    }).then(function (entry) {
      return entry && entry.id;
    }).catch(function (e) {
      if (e && e.status === 404) {
        invalidateSpellbookLorebookCache();
        return findOrCreateSpellbookLorebook().then(function (newLbId) {
          return apiFetch("/lorebooks/" + newLbId + "/entries", {
            method: "POST",
            body: JSON.stringify(body)
          }).then(function (entry) { return entry && entry.id; });
        });
      }
      throw e;
    });
  });
}

function deleteAbilityLorebookEntry(ability) {
  if (!ability || !ability.lorebookEntryId) {
    return Promise.resolve();
  }
  /* P0-5: state.spellbookLbId is null on a fresh page load, so the old
     early-return silently no-op'd every delete-after-reload and orphaned
     the ability's lorebook entry (the GM kept seeing deleted abilities).
     Resolve the id first — findOrCreateSpellbookLorebook hits its cache /
     LS / tag-search before ever creating, so an existing book is reused. */
  var resolveLb = state.spellbookLbId
    ? Promise.resolve(state.spellbookLbId)
    : findOrCreateSpellbookLorebook();
  return resolveLb.then(function (lbId) {
    return apiDeleteRaw("/lorebooks/" + lbId + "/entries/" + ability.lorebookEntryId);
  });
}

/* ─────  dice widget  ───── */

function buildDice() {
  if (state.diceEl) return state.diceEl;
  /* D8: a ruleset missing its `resolution` block would TypeError on
     `state.ruleset.resolution.mode` below and take the dice UI down. */
  if (!state.ruleset || !state.ruleset.resolution) {
    warn("buildDice: ruleset has no resolution block; dice UI unavailable");
    return null;
  }
  state.diceEl = marinara.addElement(document.body, "div", { "class": "mrr-dice" });
  if (!state.diceEl) return null;

  var header = marinara.addElement(state.diceEl, "div", { "class": "mrr-dice__header" });
  if (header) {
    marinara.addElement(header, "span", { "class": "mrr-dice__title", textContent: "Dice — " + state.ruleset.name });
    var close = marinara.addElement(header, "button", { "class": "mrr-dice__close", innerHTML: "&times;" });
    if (close) marinara.on(close, "click", function () { showDice(false); });
    makeDraggable(state.diceEl, header, "mrr-dice-pos");
  }

  var mode = state.ruleset.resolution.mode;
  if      (mode === MODES.POOL)   buildPoolWidget();
  else if (mode === MODES.SINGLE) buildSingleRollWidget();
  else if (mode === MODES.SUM)    buildSumWidget();
  else if (mode === MODES.D100)   buildD100Widget();
  else if (mode === MODES.PBTA)   buildPbtaWidget();
  else if (mode === MODES.FATE)   buildFateWidget();
  else if (mode === MODES.UNDER)  buildRollUnderWidget();
  else if (mode === MODES.STANCE) buildStanceModalPoolWidget();
  else marinara.addElement(state.diceEl, "div", { "class": "mrr-msg mrr-msg--err", textContent: "Unsupported resolution mode: " + mode });

  marinara.addElement(state.diceEl, "div", { "class": "mrr-dice__result mrr-dice__result--hidden", id: "mrr-dice-result" });
  return state.diceEl;
}

function buildSingleRollWidget() {
  var d = state.diceEl;
  diceRow(d, "Modifier",    "mod",  "0");
  diceRow(d, "Proficiency", "prof", "0");
  diceRow(d, "Equipment",   "equip", "0");
  diceRow(d, "DC",          "dc",   "15");
  buildAdvantageRow(d);
  diceFooter(d, "Roll d20", rollSingleRoll);
}

/* Advantage / disadvantage toggle for d20-style systems. Three exclusive
   buttons render in a single row above the roll button: Normal (1d20),
   Advantage (2d20 keep highest), Disadvantage (2d20 keep lowest). The
   selection persists in `state.diceAdvantage` so a player who knows
   they're rolling the next two saves with advantage doesn't have to
   re-toggle every roll. Re-opening the dice widget keeps the last
   choice; closing the chat or reloading resets it (in-memory only). */
function buildAdvantageRow(parent) {
  if (!state.diceAdvantage) state.diceAdvantage = "normal";
  var row = marinara.addElement(parent, "div", { "class": "mrr-dice__adv-row" });
  if (!row) return;
  marinara.addElement(row, "label", { textContent: "Roll mode" });
  var modes = [
    { code: "normal",       label: "Normal",   title: "Roll 1d20" },
    { code: "advantage",    label: "Adv",      title: "Roll 2d20, keep the higher" },
    { code: "disadvantage", label: "Dis",      title: "Roll 2d20, keep the lower" }
  ];
  modes.forEach(function (m) {
    var btn = marinara.addElement(row, "button", {
      "class": "mrr-adv-btn" + (state.diceAdvantage === m.code ? " mrr-adv-btn--active" : ""),
      textContent: m.label,
      title: m.title,
      "data-mrr-adv": m.code
    });
    if (!btn) return;
    marinara.on(btn, "click", function (e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      state.diceAdvantage = m.code;
      var siblings = row.querySelectorAll("button[data-mrr-adv]");
      for (var i = 0; i < siblings.length; i++) {
        if (siblings[i].getAttribute("data-mrr-adv") === m.code) {
          siblings[i].classList.add("mrr-adv-btn--active");
        } else {
          siblings[i].classList.remove("mrr-adv-btn--active");
        }
      }
    });
  });
}

function buildPoolWidget() {
  var d = state.diceEl;
  /* Two labels in this widget are semantically distinct and the legacy
     naming inverted them relative to V20 / W20 / WoD / Shadowrun canon.
     Canonical Storyteller convention: "Difficulty 8 to climb the wall"
     means the per-die TARGET is 8 — NOT eight successes. Exalted's fixed
     target=7 is the minority dialect. Per advisor (2026-05-13): rename
     the legacy "Difficulty" label to "Successes" to match the V20 player's
     mental model. The new "Target Face" input takes over the V20 mental
     "Difficulty N" role and is editable per roll. JS input IDs are
     unchanged (`diff` stays for successes-required; `target` is the new
     per-die face threshold) so rollDicePool back-compat is preserved. */
  var res = state.ruleset.resolution || {};
  var defaultTarget = (typeof res.target === "number") ? res.target : 7;
  diceRow(d, "Pool",        "pool",   "5");
  diceRow(d, "Target Face", "target", String(defaultTarget));
  diceRow(d, "Successes",   "diff",   "1");
  diceRow(d, "Stunt",       "stunt",  "0");
  diceRow(d, "Equipment",   "equip",  "0");
  diceFooter(d, "Roll pool", rollDicePool);
}

/* Dice-pool-sum widget (OpenD6, WEG Star Wars, Mini Six, D6 System SRD).
   Pool = NDice (Attribute + Skill in dice). Pips = flat add (+P in NDX+P
   notation). Difficulty = static target the rolled sum must meet or beat.
   When wildDie.enabled, one die is designated the Wild Die — explodes on
   explodeFace, surfaces critFail flag on critFailFace when total < diff.
   The actual rolling logic + chat-tag emission live in rollDicePoolSum. */
function buildSumWidget() {
  var d = state.diceEl;
  var res = state.ruleset.resolution || {};
  var difficultyHint = (typeof res.difficultyHint === "number") ? res.difficultyHint : 15;
  var wd = res.wildDie || null;
  diceRow(d, "Pool (dice)", "pool",  "3");
  diceRow(d, "Pips",        "pips",  "0");
  diceRow(d, "Difficulty",  "diff",  String(difficultyHint));
  if (wd && wd.enabled) {
    marinara.addElement(d, "div", {
      "class": "mrr-dice__hint",
      textContent: "Wild Die ON — one die explodes on " + (typeof wd.explodeFace === "number" ? wd.explodeFace : 6) +
                   ", crit-fail flag on " + (typeof wd.critFailFace === "number" ? wd.critFailFace : 1) +
                   " when total falls short. Narrator resolves crit-fail effect."
    });
  }
  diceFooter(d, "Roll dice pool", rollDicePoolSum);
}

function buildD100Widget() {
  var d = state.diceEl;
  diceRow(d, "Skill %", "skill", "50");
  diceFooter(d, "Roll d100", rollD100);
}

function buildPbtaWidget() {
  var d = state.diceEl;
  diceRow(d, "Stat mod", "mod", "0");
  diceFooter(d, "Roll 2d6+stat", rollPbta);
}

function buildFateWidget() {
  var d = state.diceEl;
  diceRow(d, "Skill", "skill", "0");
  diceRow(d, "Target", "target", "2");
  diceFooter(d, "Roll 4dF + skill", rollFate);
}

/* Roll-under resolution mode. Covers two flavors with one widget:
   - Percentile roll-under (CoC, BRP, Runequest, Pendragon): diceFormula "1d100",
     target = skill % (0-99), success when total <= target.
   - Stat-vs-XdY roll-under (GURPS, traditional BRP): diceFormula "3d6",
     target = stat value (typically 8-18), success when total <= target.
   Bonuses RAISE the target in roll-under (a higher cap = better), opposite
   of single-roll where bonuses raise the roll. The "Bonus" input here is
   added to the base target — wire equipped bonuses through that input from
   quickRollFor* helpers in a future revision.

   Crit/fumble bands are OPTIONAL per RAW. Bundle authors set:
     criticalSuccessFormula   — total <= eval(formula) => crit (CoC: {target}/5; GURPS: literal 4)
     criticalFailureThreshold — total >= integer       => fumble (CoC: 96)
     criticalFailureFormula   — total >= eval(formula) => fumble (GURPS: margin <= -10) */
function buildRollUnderWidget() {
  var d = state.diceEl;
  var formula = (state.ruleset.resolution && state.ruleset.resolution.diceFormula) || "1d100";
  diceRow(d, "Target", "target", "50");
  diceRow(d, "Bonus",  "bonus",  "0");
  diceFooter(d, "Roll " + formula, rollRollUnder);
}

/* Parse "XdY" notation into {count, sides}. Returns null when malformed so
   the caller can fall back to a default. Schema enforces the pattern so this
   is defensive — runtime ruleset blobs may predate validation. */
function parseRollUnderFormula(formula) {
  if (typeof formula !== "string") return null;
  var m = formula.match(/^([1-9][0-9]*)d([1-9][0-9]*)$/);
  if (!m) return null;
  return { count: parseInt(m[1], 10), sides: parseInt(m[2], 10) };
}

/* Evaluate a crit-success/crit-failure formula against the effective target.
   Whitelist mirrors skillBonusFormula's arithmetic-only contract: digits,
   + - * / ( ) and the {target} / {margin} tokens. Returns null when the
   formula is missing or evaluation fails — caller treats that as "no band". */
function evalRollUnderFormula(formula, target, margin) {
  if (typeof formula !== "string" || !formula.trim()) return null;
  var substituted = formula
    .replace(/\{target\}/g, "(" + target + ")")
    .replace(/\{margin\}/g, "(" + margin + ")");
  if (!/^[\s0-9+\-*/().]+$/.test(substituted)) return null;
  try {
    /* eslint-disable no-new-func */
    var fn = new Function("return (" + substituted + ");");
    var n = fn();
    if (typeof n !== "number" || isNaN(n) || !isFinite(n)) return null;
    return Math.floor(n);
  } catch (e) {
    return null;
  }
}

function rollRollUnder() {
  var res = state.ruleset.resolution || {};
  var parsed = parseRollUnderFormula(res.diceFormula) || { count: 1, sides: 100 };
  var baseTarget = clamp(numFromInput("target", 50), 1, 9999);
  var bonus = numFromInput("bonus", 0);
  var target = baseTarget + bonus;
  var faces = [];
  var total = 0;
  for (var i = 0; i < parsed.count; i++) {
    var f = 1 + Math.floor(Math.random() * parsed.sides);
    faces.push(f);
    total += f;
  }
  var pass   = total <= target;
  var margin = target - total;

  /* Crit success: total <= evalled criticalSuccessFormula. Only check when
     the base roll passes — a failed roll cannot be a crit success. */
  var critThreshold = evalRollUnderFormula(res.criticalSuccessFormula, target, margin);
  var critSuccess = pass && critThreshold !== null && total <= critThreshold;

  /* Fumble: prefer integer threshold over formula when both are set; the
     schema doesn't forbid both but threshold wins for determinism. Only
     check when the base roll fails — a passing roll cannot fumble. */
  var fumble = false;
  if (!pass) {
    if (typeof res.criticalFailureThreshold === "number" && res.criticalFailureThreshold > 0) {
      fumble = total >= res.criticalFailureThreshold;
    } else if (typeof res.criticalFailureFormula === "string" && res.criticalFailureFormula.trim()) {
      var fumThreshold = evalRollUnderFormula(res.criticalFailureFormula, target, margin);
      if (fumThreshold !== null) fumble = total >= fumThreshold;
    }
  }

  var outcome, kind;
  if (critSuccess)  { outcome = "CRIT SUCCESS"; kind = "crit"; }
  else if (fumble)  { outcome = "FUMBLE";       kind = "fumble"; }
  else if (pass)    { outcome = "SUCCESS";      kind = "success"; }
  else              { outcome = "FAILURE";      kind = "fail"; }

  var formulaTag = parsed.count + "d" + parsed.sides;
  var facesTag = faces.length > 1 ? " (" + faces.join("+") + ")" : "";
  var bonusTag = bonus !== 0 ? " (target " + baseTarget + (bonus > 0 ? "+" : "") + bonus + ")" : "";
  var marginTag = pass ? ", margin " + margin : ", margin " + (-margin);
  var text = "[dice: " + formulaTag + " vs " + target + bonusTag + " -> " + total + facesTag + " " + outcome + marginTag + "]";

  finalizeRoll(text, kind, faces.map(function (face) {
    return { face: face, cls: "mrr-dice__face" };
  }));
}

/* ── Round 7: stance-modal-pool ──
   Resolution mode for hybrid roll-under/over pool systems where the success
   direction is chosen per-roll by stance, with an optional exact-match
   special outcome that bridges the two halves. Lasers & Feelings is the
   canonical case (1-4d6 vs single Number stat; LASERS under, FEELINGS over,
   exact match = LASER FEELINGS).

   Pool size and stat value are typed by the player each roll — poolFormula
   is plain-language guidance, not a parseable expression. Stance defaults
   to the first entry in resolution.stances (typically the "under" stance)
   and is sticky across rolls in the same widget session. */
function buildStanceModalPoolWidget() {
  var d = state.diceEl;
  var res = state.ruleset.resolution || {};
  var stances = Array.isArray(res.stances) ? res.stances : [];
  var statName = res.stat || "Stat";

  /* Initialize sticky stance selection. First stance wins until the player
     toggles. Stored on state so reopening the widget keeps the last pick. */
  if (!state.diceStanceId && stances.length > 0) {
    state.diceStanceId = stances[0].id;
  }

  /* Segmented control: one button per stance. Active stance gets the
     --active modifier class. Buttons live in a dedicated row above the
     pool input so the visual hierarchy reads stance → pool → stat → Roll. */
  var stanceRow = marinara.addElement(d, "div", { "class": "mrr-dice__stance-row" });
  if (stanceRow) {
    marinara.addElement(stanceRow, "label", { textContent: "Stance" });
    var stanceGroup = marinara.addElement(stanceRow, "div", { "class": "mrr-dice__stance-group" });
    if (stanceGroup) {
      stances.forEach(function (s) {
        var active = (state.diceStanceId === s.id);
        var btn = marinara.addElement(stanceGroup, "button", {
          "class": "mrr-stance-btn" + (active ? " mrr-stance-btn--active" : ""),
          textContent: s.label,
          title: s.description || (s.direction === "under" ? "Each die under " + statName + " is a success" : "Each die over " + statName + " is a success"),
          "data-mrr-stance": s.id
        });
        if (!btn) return;
        marinara.on(btn, "click", function (e) {
          if (e && typeof e.stopPropagation === "function") e.stopPropagation();
          state.diceStanceId = s.id;
          var siblings = stanceGroup.querySelectorAll("button[data-mrr-stance]");
          for (var i = 0; i < siblings.length; i++) {
            if (siblings[i].getAttribute("data-mrr-stance") === s.id) {
              siblings[i].classList.add("mrr-stance-btn--active");
            } else {
              siblings[i].classList.remove("mrr-stance-btn--active");
            }
          }
        });
      });
    }
  }

  /* Pool size input — plain integer. The poolFormula is shown as a hint
     label so the player can see how the source rules want pool size built
     (e.g. "1 + prepared + expert + assistance" for L&F). */
  diceRow(d, "Pool",  "pool",  "1");
  diceRow(d, statName, "stat", "4");

  /* If poolFormula is set, surface it as a tiny hint below the pool row.
     Pure cosmetic — the dice math reads "pool" verbatim. */
  if (res.poolFormula) {
    var hint = marinara.addElement(d, "div", {
      "class": "mrr-dice__hint",
      textContent: "Pool: " + res.poolFormula
    });
    if (!hint) { /* non-fatal */ }
  }

  var diceType = res.diceType || "d6";
  diceFooter(d, "Roll Nx" + diceType, rollStanceModalPool);
}

/* Stance-modal-pool roll handler. Procedure:
   1. Read pool size (clamped to 1..32), stat value, and active stance.
   2. Parse diceType ("d4".."d20") to side count.
   3. Roll N dice; for each face, classify as exact-match (face === stat),
      stance-success (face < stat for "under", face > stat for "over"), or
      neither. Strict comparisons mean exact-match never double-counts with
      stance direction — equality is exclusive to the exactMatch path.
   4. Sum successes = stance-successes + (exactMatch.countsAsSuccess
      ? exactMatches : 0).
   5. Walk outcomeTiers and pick the LAST tier whose minSuccesses <= total.
      maxSuccesses (when present) tightens the band but the "last matching
      tier" walk handles the open-ended top tier correctly because
      minSuccesses is monotonically non-decreasing.
   6. Emit chat tag with stance, statValue, pool, dice[], successes,
      exactMatches, tier, and narrationHook (when an exact-match was rolled
      AND the ruleset declares one). */
function rollStanceModalPool() {
  var res = state.ruleset.resolution || {};
  var stances = Array.isArray(res.stances) ? res.stances : [];
  var stanceId = state.diceStanceId || (stances[0] && stances[0].id) || "stance";
  var stance = null;
  for (var si = 0; si < stances.length; si++) {
    if (stances[si].id === stanceId) { stance = stances[si]; break; }
  }
  if (!stance) stance = stances[0] || { id: stanceId, label: stanceId, direction: "under" };

  var diceType = res.diceType || "d6";
  var sides = parseInt(diceType.replace(/^d/, ""), 10);
  if (!sides || sides < 2) sides = 6;

  var pool = clamp(numFromInput("pool", 1), 1, 32);
  var statValue = clamp(numFromInput("stat", 4), 1, sides);

  /* Roll each die independently. Classify per stance.direction with strict
     comparisons; equality is handled by the separate exact-match branch. */
  var faces = [];
  var stanceSuccesses = 0;
  var exactMatches = 0;
  var direction = stance.direction;
  for (var i = 0; i < pool; i++) {
    var f = 1 + Math.floor(Math.random() * sides);
    faces.push(f);
    if (f === statValue) {
      exactMatches++;
    } else if (direction === "under" && f < statValue) {
      stanceSuccesses++;
    } else if (direction === "over" && f > statValue) {
      stanceSuccesses++;
    }
  }

  var exactCountsAsSuccess = !!(res.exactMatch && res.exactMatch.countsAsSuccess);
  var totalSuccesses = stanceSuccesses + (exactCountsAsSuccess ? exactMatches : 0);

  /* Walk outcomeTiers to find the matching band. Tiers are sorted by
     minSuccesses ascending; the LAST tier whose minSuccesses <= total wins.
     Fallback to a synthesized "miss"/"success" tier when outcomeTiers is
     malformed or empty — schema enforces minItems: 2 but runtime blobs
     may predate validation. */
  var tiers = Array.isArray(res.outcomeTiers) ? res.outcomeTiers : [];
  var pickedTier = null;
  for (var ti = 0; ti < tiers.length; ti++) {
    var t = tiers[ti];
    if (typeof t.minSuccesses === "number" && totalSuccesses >= t.minSuccesses) {
      if (typeof t.maxSuccesses !== "number" || totalSuccesses <= t.maxSuccesses) {
        pickedTier = t;
      }
    }
  }
  if (!pickedTier) {
    pickedTier = { label: totalSuccesses > 0 ? "success" : "miss" };
  }

  /* Outcome kind drives result-row styling. Map common L&F-style tier
     labels to the existing kind palette (crit / success / fail). When a
     ruleset uses unfamiliar labels, default to success/fail by total. */
  var tierLabel = String(pickedTier.label || "");
  var kind;
  if (totalSuccesses === 0) kind = "fail";
  else if (/^crit/i.test(tierLabel) || totalSuccesses >= 3) kind = "crit";
  else kind = "success";

  /* Chat tag. Mirrors the structure suggested in the plan:
     [mrr-roll: ruleset=..., stance=..., stat=Number, statValue=4, pool=3,
                dice=[1,4,6], successes=2, exactMatches=1, tier=good,
                narrationHook=laser_feelings]
     narrationHook key is OMITTED when no exact-match was rolled OR when
     the ruleset declares no exactMatch.narrationHook — GM agent treats
     absence of the key as "no special beat owed". */
  var rulesetId = (state.ruleset && state.ruleset.id) || "unknown";
  var statKey = res.stat || "stat";
  var diceCsv = faces.join(",");
  var tagParts = [
    "ruleset=" + rulesetId,
    "stance=" + stance.id,
    "stat=" + statKey,
    "statValue=" + statValue,
    "pool=" + pool,
    "dice=[" + diceCsv + "]",
    "successes=" + totalSuccesses,
    "exactMatches=" + exactMatches,
    "tier=" + (pickedTier.label || "")
  ];
  if (exactMatches > 0 && res.exactMatch && res.exactMatch.narrationHook) {
    tagParts.push("narrationHook=" + res.exactMatch.narrationHook);
  }
  var text = "[mrr-roll: " + tagParts.join(", ") + "]";

  /* Per-face CSS hints so the result row can highlight exact-match dice
     (LASER FEELINGS) and stance-successes distinctly from misses. */
  var faceObjs = faces.map(function (face) {
    var cls = "mrr-dice__face";
    if (face === statValue) {
      cls += " mrr-dice__face--exact";
    } else if (direction === "under" && face < statValue) {
      cls += " mrr-dice__face--success";
    } else if (direction === "over" && face > statValue) {
      cls += " mrr-dice__face--success";
    }
    return { face: face, cls: cls };
  });

  finalizeRoll(text, kind, faceObjs);
}

var lastRollText = null;

function rollSingleRoll() {
  var mod   = numFromInput("mod",   0);
  var prof  = numFromInput("prof",  0);
  var equip = numFromInput("equip", 0);
  var dc    = numFromInput("dc",    15);
  var advMode = state.diceAdvantage || "normal";
  /* Advantage = roll 2d20, keep highest. Disadvantage = roll 2d20, keep
     lowest. Normal = roll 1d20. */
  var roll1 = 1 + Math.floor(Math.random() * 20);
  var face;
  var dropped = null;
  if (advMode === "advantage" || advMode === "disadvantage") {
    var roll2 = 1 + Math.floor(Math.random() * 20);
    if (advMode === "advantage") {
      face = Math.max(roll1, roll2);
      dropped = Math.min(roll1, roll2);
    } else {
      face = Math.min(roll1, roll2);
      dropped = Math.max(roll1, roll2);
    }
  } else {
    face = roll1;
  }
  var total = face + mod + prof + equip;
  var pass = total >= dc;
  var label = pass ? "success" : "failure";
  var equipPart = equip ? (equip > 0 ? "+" + equip : String(equip)) : "";
  var advTag, faceTag;
  if (advMode === "advantage") {
    advTag = "2d20kh1";
    faceTag = "kept " + face + ", dropped " + dropped + " — advantage";
  } else if (advMode === "disadvantage") {
    advTag = "2d20kl1";
    faceTag = "kept " + face + ", dropped " + dropped + " — disadvantage";
  } else {
    advTag = "1d20";
    faceTag = "face " + face;
  }
  var text = "[dice: " + advTag + "+" + mod + (prof ? "+" + prof : "") + equipPart + " vs DC" + dc + " = " + total + " " + label + " (" + faceTag + ")]";
  finalizeRoll(text, pass ? "success" : "fail", null);
}

function rollDicePool() {
  var pool  = Math.max(0, numFromInput("pool", 1));
  var diff  = Math.max(0, numFromInput("diff", 2));
  var stunt = clamp(numFromInput("stunt", 0), 0, 2);
  var equip = Math.max(0, numFromInput("equip", 0));
  var totalDice = pool + stunt + equip;
  var faces = [];
  var i;
  for (i = 0; i < totalDice; i++) faces.push(1 + Math.floor(Math.random() * 10));

  /* Target = per-die face threshold. Read from widget input first (V20 / W20:
     varies 6-9 per check); fall back to schema's resolution.target (Exalted's
     fixed 7); fall back to canonical 7 if neither set. This is what makes
     V20-style variable difficulty work without forcing a ruleset fork. */
  var schemaTarget = (state.ruleset.resolution && typeof state.ruleset.resolution.target === "number") ? state.ruleset.resolution.target : 7;
  var target = numFromInput("target", schemaTarget);
  var doubleFace = (state.ruleset.resolution.doubles && state.ruleset.resolution.doubles.face) || 10;
  var doubleSucc = (state.ruleset.resolution.doubles && state.ruleset.resolution.doubles.successes) || 2;
  var botchFace  = (state.ruleset.resolution.botches && state.ruleset.resolution.botches.onFace) || 1;
  var botchTrigger = (state.ruleset.resolution.botches && state.ruleset.resolution.botches.trigger) || BOTCH_TRIGGER.ZERO;

  var successes = 0;
  var doubled   = 0;
  var ones      = 0;
  faces.forEach(function (f) {
    if (f === botchFace) ones++;
    if (f >= target) {
      successes += 1;
      if (f >= doubleFace) { successes += (doubleSucc - 1); doubled++; }
    }
  });

  var botch = false;
  if      (botchTrigger === BOTCH_TRIGGER.ZERO)     botch = (successes === 0 && ones >= 1);
  else if (botchTrigger === BOTCH_TRIGGER.MAJORITY) botch = (ones > successes);
  else if (botchTrigger === BOTCH_TRIGGER.ALWAYS)   botch = (ones >= 1);

  var pass = !botch && successes >= diff;
  var bits = [];
  if (doubled) bits.push(doubled + " ten" + (doubled > 1 ? "s" : "") + " doubled");
  if (botch)   bits.push("BOTCH");
  var suffix = bits.length ? ", " + bits.join(", ") : "";

  var text = "[dice: " + totalDice + "d10 vs " + target + " -> " + successes + " success" + (successes === 1 ? "" : "es") + suffix + "]" +
             " (diff " + diff + ", " + (pass ? "pass" : "fail") + ")";

  var resultClass = botch ? "botch" : (pass ? "success" : "fail");
  finalizeRoll(text, resultClass, faces.map(function (f) {
    var cls = "mrr-dice__face";
    if (f >= doubleFace) cls += " mrr-dice__face--double";
    else if (f >= target) cls += " mrr-dice__face--success";
    else if (f === botchFace) cls += " mrr-dice__face--one";
    return { face: f, cls: cls };
  }));
}

/* Parse a structured dice-notation string of the form "ND[+P]" or "ND[-P]"
   (case-insensitive on D). Returns { dieCount, dieSize, modifier } or null
   for malformed input. STRUCTURED parser only — does NOT eval strings, stays
   CSP-safe. Used by dice-pool-sum and (Batch 2) the damage-pool bonus kind. */
function parseDiceNotation(s) {
  if (typeof s !== "string") return null;
  var m = s.trim().match(/^(\d+)[dD](?:([+-])(\d+))?$/);
  if (!m) return null;
  var dieCount = parseInt(m[1], 10);
  if (!isFinite(dieCount) || dieCount < 1) return null;
  var modifier = 0;
  if (m[2] && m[3]) {
    var n = parseInt(m[3], 10);
    modifier = (m[2] === "+") ? n : -n;
  }
  return { dieCount: dieCount, dieSize: 6, modifier: modifier };
}

/* Roll for dice-pool-sum mode: sum N six-siders against a difficulty number.
   One die may be the Wild Die — explode-on-explodeFace, crit-fail-on-critFailFace
   when the rolled total fell short. OpenD6 canon: explodeFace=6, critFailFace=1,
   explodeCap=0 (uncapped). A SAFETY_CAP=100 guards against malformed-RNG runaway.
   The widget surfaces the critFail flag; the narrator resolves the in-fiction
   effect (OpenD6 GM-fiat: subtract highest other die OR add complication). */
function rollDicePoolSum() {
  var pool  = Math.max(1, numFromInput("pool", 1));
  var pips  = numFromInput("pips", 0);
  var diff  = Math.max(1, numFromInput("diff", 15));
  var res   = state.ruleset.resolution || {};
  var dieSize = (typeof res.dieSize === "number") ? res.dieSize : 6;
  var wd    = res.wildDie || null;
  var wdOn  = !!(wd && wd.enabled);
  var explodeFace  = (wd && typeof wd.explodeFace  === "number") ? wd.explodeFace  : dieSize;
  var critFailFace = (wd && typeof wd.critFailFace === "number") ? wd.critFailFace : 1;
  var explodeCap   = (wd && typeof wd.explodeCap   === "number") ? wd.explodeCap   : 0;
  var SAFETY_CAP = 100;

  var regularCount = wdOn ? Math.max(0, pool - 1) : pool;
  var faces = [];
  var total = 0;
  var i;
  for (i = 0; i < regularCount; i++) {
    var f = 1 + Math.floor(Math.random() * dieSize);
    faces.push(f);
    total += f;
  }

  var wildFace = null;
  var wildExplodes = [];
  var critFailTentative = false;
  if (wdOn) {
    var wf = 1 + Math.floor(Math.random() * dieSize);
    wildFace = wf;
    total += wf;
    if (wf === critFailFace) critFailTentative = true;
    var explodes = 0;
    while (wf === explodeFace) {
      if (explodeCap > 0 && explodes >= explodeCap) break;
      if (explodes >= SAFETY_CAP) break;
      wf = 1 + Math.floor(Math.random() * dieSize);
      wildExplodes.push(wf);
      total += wf;
      explodes++;
    }
  }
  total += pips;

  var pass = total >= diff;
  var critFail = critFailTentative && !pass;

  var explodesText = wildExplodes.length ? " explodes=[" + wildExplodes.join(",") + "]" : "";
  var wildText  = wdOn ? " wild=" + wildFace + explodesText + (critFail ? " critFail=true" : "") : "";
  var pipsText  = pips ? (pips > 0 ? "+" + pips : String(pips)) : "";
  var text = "[mrr-roll: mode=dice-pool-sum pool=" + pool + " dieSize=" + dieSize +
             pipsText + wildText + " total=" + total + " vs " + diff +
             " => " + (pass ? "success" : "fail") + "]";

  var kind = critFail ? "botch" : (pass ? "success" : "fail");
  var renderFaces = faces.map(function (f) {
    return { face: f, cls: "mrr-dice__face" };
  });
  if (wdOn) {
    renderFaces.push({
      face: wildFace,
      cls: "mrr-dice__face mrr-dice__face--wild" + (critFail ? " mrr-dice__face--one" : "")
    });
    wildExplodes.forEach(function (xf) {
      renderFaces.push({ face: xf, cls: "mrr-dice__face mrr-dice__face--double" });
    });
  }
  finalizeRoll(text, kind, renderFaces);
}

function rollD100() {
  var skill = clamp(numFromInput("skill", 50), 1, 100);
  var face = 1 + Math.floor(Math.random() * 100);
  var pass = face <= skill;
  var text = "[d100: rolled " + face + " vs " + skill + " = " + (pass ? "success" : "failure") + "]";
  finalizeRoll(text, pass ? "success" : "fail", null);
}

function rollPbta() {
  var mod = numFromInput("mod", 0);
  var a = 1 + Math.floor(Math.random() * 6);
  var b = 1 + Math.floor(Math.random() * 6);
  var total = a + b + mod;
  var bands = (state.ruleset.resolution.bands || []).slice().sort(function (x, y) { return y.min - x.min; });
  var band = bands.find(function (z) { return total >= z.min; });
  var label = band ? band.label : "?";
  var text = "[2d6+" + mod + " = " + total + " (" + a + "+" + b + ") -> " + label + "]";
  finalizeRoll(text, "success", [
    { face: a, cls: "mrr-dice__face" },
    { face: b, cls: "mrr-dice__face" }
  ]);
}

function fateGlyph(v) { return v > 0 ? "+" : (v < 0 ? "-" : "0"); }

function rollFate() {
  var skill = numFromInput("skill", 0);
  var target = numFromInput("target", 2);
  var values = [];
  var faceLabels = [];
  var sum = 0;
  for (var i = 0; i < 4; i++) {
    var v = Math.floor(Math.random() * 3) - 1;
    values.push(v);
    sum += v;
    faceLabels.push(fateGlyph(v));
  }
  var total = sum + skill;
  var margin = total - target;
  var sws = state.ruleset.resolution.successWithStyle;

  /* Order matters: the >= sws branch must precede the generic success
     fallthrough so margins of [1, sws-1] resolve as plain success. */
  var outcome;
  var kind;
  if (margin <= -1) {
    outcome = "failure"; kind = "fail";
  } else if (margin === 0) {
    outcome = "tie"; kind = "tie";
  } else if (margin >= sws) {
    outcome = "success with style"; kind = "success";
  } else {
    outcome = "success"; kind = "success";
  }
  var shifts = (margin > 0 ? "+" : "") + margin + " shift" + (Math.abs(margin) === 1 ? "" : "s");
  var modPart = skill !== 0 ? (skill > 0 ? "+" + skill : String(skill)) : "";
  var text = "[fate: 4dF" + modPart + " = " + total + " (" + faceLabels.join(",") + ") vs " + target + " -> " + outcome + " (" + shifts + ")]";

  finalizeRoll(text, kind, values.map(function (v) {
    var cls = "mrr-dice__face";
    if (v > 0) cls += " mrr-dice__face--success";
    else if (v < 0) cls += " mrr-dice__face--one";
    return { face: fateGlyph(v), cls: cls };
  }));
}

function finalizeRoll(text, kind, faces) {
  lastRollText = text;
  showResult(text, kind, faces);
}

function numFromInput(key, fallback) {
  if (!state.diceEl) return fallback;
  var el = state.diceEl.querySelector("[data-mrr-input='" + key + "']");
  if (!el) return fallback;
  var n = parseFloat(el.value);
  if (isNaN(n)) return fallback;
  return n;
}

function setDiceInput(key, value) {
  if (!state.diceEl) return;
  var el = state.diceEl.querySelector("[data-mrr-input='" + key + "']");
  if (el) el.value = String(value);
}

function showResult(text, kind, faces) {
  if (!state.diceEl) return;
  var prev = state.diceEl.querySelector("#mrr-dice-result");
  if (prev) prev.parentNode.removeChild(prev);
  var box = marinara.addElement(state.diceEl, "div", { "class": "mrr-dice__result mrr-dice__result--" + kind, id: "mrr-dice-result" });
  if (!box) return;
  marinara.addElement(box, "div", { textContent: text });
  if (faces && faces.length) {
    var row = marinara.addElement(box, "div", { "class": "mrr-dice__faces" });
    if (row) faces.forEach(function (f) { marinara.addElement(row, "span", { "class": f.cls, textContent: String(f.face) }); });
  }
}

function sendLastRoll() {
  if (!lastRollText) return;
  insertIntoChatInput(lastRollText);
}

function showDice(open) {
  /* Phase 6 — defensive guard. If state.diceEl was never built (buildDice
     never ran at activation, or threw silently) OR was detached from the
     DOM (parent removed during a re-render), drop the stale reference and
     rebuild fresh. Previously, a missing state.diceEl made every roll
     button silently no-op with no console hint that the widget never
     mounted — the visible failure was "dice roller isn't loading". */
  if (state.diceEl && !state.diceEl.parentNode) {
    state.diceEl = null;
  }
  if (!state.diceEl) buildDice();
  if (!state.diceEl) {
    try { console.error("[mrr] showDice: buildDice failed; dice widget unavailable"); } catch (e) {}
    return;
  }
  if (open) {
    state.diceEl.classList.add("mrr-dice--open");
    /* Clamp the widget's persisted position against the current viewport
       so a position saved on a wider monitor / external display doesn't
       leave the widget off-screen on a smaller one. Mirrors makeDraggable's
       load-time clamp; runs every time the widget opens because the
       viewport may have changed since the last open. */
    if (state.diceEl.style) {
      var left = parseInt(state.diceEl.style.left, 10);
      var top  = parseInt(state.diceEl.style.top, 10);
      if (isFinite(left) || isFinite(top)) {
        if (!isFinite(left)) left = 16;
        if (!isFinite(top))  top  = 80;
        var safeLeft = Math.max(0, Math.min(window.innerWidth  - 80, left));
        var safeTop  = Math.max(0, Math.min(window.innerHeight - 30, top));
        state.diceEl.style.left = safeLeft + "px";
        state.diceEl.style.top  = safeTop + "px";
      }
    }
  } else {
    state.diceEl.classList.remove("mrr-dice--open");
    /* Closing the dice widget invalidates the active quick-roll context;
       the next reopen for a non-skill purpose shouldn't see a stale skill
       reference dangling around. The specialty pane DOM is left as-is
       since renderSpecialtiesPane replaces it on the next quick-roll. */
    state.diceContext = null;
  }
}

/* ─────  ruleset switcher dialog + header gear  ───── */

/* Resolve the visible app-shell header so we can append our own buttons
   beside Marinara's. Falls back to body so the controls still appear when
   the host page has no header (custom themes, dev harness). */
function findHeaderAnchor() {
  var headers = document.querySelectorAll("header, [role='banner']");
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].offsetParent !== null) return headers[i];
  }
  return document.body;
}

function buildHeaderGear() {
  if (state.gearEl && state.gearEl.parentNode) return;
  state.gearEl = marinara.addElement(findHeaderAnchor(), "button", {
    "class": "mrr-gear-btn",
    textContent: "Ruleset" + (state.ruleset ? ": " + state.ruleset.name : "")
  });
  if (state.gearEl) marinara.on(state.gearEl, "click", openDialog);
}

/* ─────  Sheet collapse/expand toggle (header scroll-icon button)  ───── */

/* Default to collapsed when no preference is stored — matches the design
   intent that the sheet is opt-in eye-real-estate, not always-on. Returns
   true (collapsed) when chatId is missing, since there's no per-chat key
   to read. */
function loadCollapsedPref(chatId) {
  if (!chatId) return true;
  var raw = lsGet(LS_SHEET_COLLAPSED_PFX + chatId);
  if (raw == null) return true;
  return raw === "true";
}

function saveCollapsedPref(chatId, collapsed) {
  if (!chatId) return;
  lsSet(LS_SHEET_COLLAPSED_PFX + chatId, collapsed ? "true" : "false");
}

function applyCollapsed(collapsed) {
  if (state.mountEl) {
    if (collapsed) state.mountEl.classList.add("mrr-hidden");
    else           state.mountEl.classList.remove("mrr-hidden");
  }
  if (state.toggleEl) {
    if (collapsed) state.toggleEl.classList.remove("mrr-sheet-toggle-btn--active");
    else           state.toggleEl.classList.add("mrr-sheet-toggle-btn--active");
    state.toggleEl.setAttribute("title", collapsed ? "Show character sheet" : "Hide character sheet");
    state.toggleEl.setAttribute("aria-pressed", collapsed ? "false" : "true");
  }
}

/* Inline scroll/parchment SVG. currentColor inherits the button's text color
   so the icon flips between dim and on-accent without extra CSS. Two curled
   end-caps + horizontal rolled body + a faint pair of inscription strokes. */
var SHEET_TOGGLE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M6 4h11a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H8"/>' +
    '<path d="M8 10v7a3 3 0 0 1-3 3v0a3 3 0 0 1-3-3v-1h9"/>' +
    '<path d="M6 4a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3"/>' +
    '<path d="M11 7h6"/>' +
    '<path d="M11 13h6"/>' +
  '</svg>';

function buildHeaderToggle() {
  if (state.toggleEl && state.toggleEl.parentNode) return;
  /* Anchor next to the gear button if it's already mounted (always true under
     init's call order); fall back to a fresh header lookup if init order ever
     changes and the gear button isn't there yet. */
  var anchor = (state.gearEl && state.gearEl.parentNode) || findHeaderAnchor();

  state.toggleEl = marinara.addElement(anchor, "button", {
    "class": "mrr-sheet-toggle-btn",
    "aria-label": "Toggle character sheet",
    "aria-pressed": "false",
    title: "Show character sheet"
  });
  if (!state.toggleEl) return;
  state.toggleEl.innerHTML = SHEET_TOGGLE_SVG;
  marinara.on(state.toggleEl, "click", function (e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    state.collapsed = !state.collapsed;
    saveCollapsedPref(state.chatId, state.collapsed);
    applyCollapsed(state.collapsed);
  });
}

function openDialog() {
  if (state.dialogEl) {
    state.dialogEl.classList.add("mrr-dialog-backdrop--open");
    return;
  }
  state.dialogEl = marinara.addElement(document.body, "div", { "class": "mrr-dialog-backdrop" });
  if (!state.dialogEl) return;
  state.dialogEl.classList.add("mrr-dialog-backdrop--open");

  var dialog = marinara.addElement(state.dialogEl, "div", { "class": "mrr-dialog" });
  if (!dialog) return;

  marinara.addElement(dialog, "h3", { textContent: "Marinara RPG Ruleset" });
  marinara.addElement(dialog, "p", {
    textContent: "Choose a local file, fetch from a URL, or paste a bundle.json (single-file install) or plain ruleset.json directly. All three flows support either format."
  });

  var urlRow = marinara.addElement(dialog, "div", { "class": "mrr-dialog__row" });
  var urlInput = null;
  if (urlRow) {
    marinara.addElement(urlRow, "label", { "class": "mrr-dialog__label", textContent: "URL" });
    urlInput = marinara.addElement(urlRow, "input", {
      "class": "mrr-dice__input",
      type: "text",
      value: lsGet(LS_RULESET_URL) || "",
      placeholder: "https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/exalted3e/ruleset.json"
    });
  }

  marinara.addElement(dialog, "p", { textContent: "Or paste the ruleset JSON directly:" });
  var ta = marinara.addElement(dialog, "textarea", {});
  if (ta) ta.value = lsGet(LS_RULESET) || "";

  var msg = marinara.addElement(dialog, "div", { "class": "mrr-msg mrr-msg--info mrr-msg--hidden" });

  var buttons = marinara.addElement(dialog, "div", { "class": "mrr-dialog__buttons" });
  if (buttons) {
    var btnFetch     = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Fetch URL" });
    var btnFile      = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Choose file..." });
    var btnClear     = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Clear" });
    var btnUninstall = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Uninstall server data" });
    var btnAgentMgr    = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Manage agents" });
    var btnAgentImport = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Import agents" });
    var btnRpImport    = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Import from RP-mode ext" });
    var btnSave      = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn", textContent: "Save and reload" });

    if (btnFile) marinara.on(btnFile, "click", function () {
      triggerUpload(function (text) {
        if (!text) { setMsg(msg, "File appears empty.", "err"); return; }
        var parsed = safeParse(text);
        if (!parsed) {
          if (ta) ta.value = text;
          setMsg(msg, "Loaded file is not valid JSON. Fix the contents and click Save.", "err");
          return;
        }
        if (ta) ta.value = JSON.stringify(parsed, null, 2);
        var label = parsed.schema === BUNDLE_SCHEMA_ID
          ? "bundle for " + (parsed.ruleset && parsed.ruleset.name ? parsed.ruleset.name : "?") + " v" + (parsed.ruleset && parsed.ruleset.version ? parsed.ruleset.version : "?")
          : "ruleset " + (parsed.name || "?") + " v" + (parsed.version || "?");
        setMsg(msg, "Loaded " + label + " from file — click Save to activate.", "ok");
      });
    });

    if (btnUninstall) marinara.on(btnUninstall, "click", function () {
      if (state.installing) { setMsg(msg, "An install or uninstall is already in progress.", "err"); return; }
      var rs = state.ruleset || loadRuleset();
      if (!rs || !rs.id) { setMsg(msg, "No active ruleset to uninstall.", "err"); return; }
      if (!window.confirm("Remove the lorebook and GM agent created for ruleset \"" + rs.id + "\" from your Marinara server? This will not touch the local ruleset cache.")) return;
      state.installing = true;
      btnUninstall.disabled = true;
      if (btnSave) btnSave.disabled = true;
      function done() { state.installing = false; btnUninstall.disabled = false; if (btnSave) btnSave.disabled = false; }
      setMsg(msg, "Uninstalling ...", "info");
      uninstallBundleArtifacts(rs.id, "local", function (status) { setMsg(msg, status, "info"); })
        .then(function () { setMsg(msg, "Server artifacts for " + rs.id + " removed.", "ok"); })
        .catch(function (e) { setMsg(msg, "Uninstall failed: " + e.message, "err"); })
        .then(done, done);
    });

    if (btnFetch) marinara.on(btnFetch, "click", function () {
      if (!urlInput || !urlInput.value) { setMsg(msg, "Enter a URL first.", "err"); return; }
      lsSet(LS_RULESET_URL, urlInput.value);
      setMsg(msg, "Fetching ...", "info");
      fetchRulesetFromUrl(urlInput.value).then(function (parsed) {
        if (ta) ta.value = JSON.stringify(parsed, null, 2);
        var label = parsed.schema === BUNDLE_SCHEMA_ID
          ? "bundle for " + parsed.ruleset.name + " v" + parsed.ruleset.version
          : "ruleset " + parsed.name + " v" + parsed.version;
        setMsg(msg, "Fetched " + label + " — click Save to activate.", "ok");
      }).catch(function (e) {
        setMsg(msg, "Fetch failed: " + e.message, "err");
      });
    });

    if (btnClear) marinara.on(btnClear, "click", function () {
      lsDel(LS_RULESET);
      lsDel(LS_RULESET_URL);
      if (ta) ta.value = "";
      if (urlInput) urlInput.value = "";
      setMsg(msg, "Cleared. Reload the page to return to default Marinara UI.", "ok");
    });

    if (btnAgentMgr) marinara.on(btnAgentMgr, "click", function () { openAgentManagerDialog(); });
    if (btnAgentImport) marinara.on(btnAgentImport, "click", function () { openAgentImportDialog(); });
    if (btnRpImport) marinara.on(btnRpImport, "click", function () { importFromRpExtension(); });

    if (btnSave) marinara.on(btnSave, "click", function () {
      var text = (ta && ta.value || "").trim();
      if (!text) { setMsg(msg, "Nothing to save. Use Clear to deactivate.", "err"); return; }
      var parsed = safeParse(text);
      if (!parsed) { setMsg(msg, "Invalid JSON. Check braces and quotes.", "err"); return; }

      /* Bundle path: schema discriminator triggers the multi-stage installer
         which creates the lorebook + entries + GM agent via apiFetch and then
         reloads. Plain ruleset.json paste falls through to the original path.
         Mutex prevents interleaved installs (double-click, programmatic
         re-trigger) from creating duplicate server artifacts. */
      if (parsed.schema === BUNDLE_SCHEMA_ID) {
        if (state.installing) { setMsg(msg, "An install is already in progress.", "err"); return; }
        state.installing = true;
        btnSave.disabled = true;
        if (btnUninstall) btnUninstall.disabled = true;
        setMsg(msg, "Validating bundle ...", "info");
        installBundle(parsed, function (status) { setMsg(msg, status, "info"); })
          .then(function () {
            if (urlInput && urlInput.value) lsSet(LS_RULESET_URL, urlInput.value);
            /* Vector 8 per-chat auto-install. The bundle ships scenarioDefault
               as a string; the helper prompts the user (window.confirm) and
               PATCHes the active chat's groupScenarioText if approved. The
               install is considered successful regardless of the helper's
               outcome — it never throws, only reports. */
            return applyScenarioDefaultToCurrentChat(parsed.scenarioDefault, function (status) { setMsg(msg, status, "info"); });
          })
          .then(function () {
            setMsg(msg, "Bundle installed. Reloading ...", "ok");
            marinara.setTimeout(function () { window.location.reload(); }, RELOAD_DELAY_MS);
          })
          .catch(function (e) {
            setMsg(msg, e.message, "err");
            state.installing = false;
            btnSave.disabled = false;
            if (btnUninstall) btnUninstall.disabled = false;
          });
        return;
      }

      var err = validateRuleset(parsed);
      if (err) { setMsg(msg, "Invalid: " + err, "err"); return; }
      lsSet(LS_RULESET, JSON.stringify(parsed));
      if (urlInput && urlInput.value) lsSet(LS_RULESET_URL, urlInput.value);
      addToLibrary(parsed);
      setMsg(msg, "Saved. Reloading ...", "ok");
      marinara.setTimeout(function () { window.location.reload(); }, RELOAD_DELAY_MS);
    });
  }

  renderLibrarySection(dialog, msg);

  marinara.on(state.dialogEl, "click", function (e) {
    if (e.target === state.dialogEl) state.dialogEl.classList.remove("mrr-dialog-backdrop--open");
  });
}

function setMsg(el, text, kind) {
  if (!el) return;
  el.classList.remove("mrr-msg--hidden");
  el.className = "mrr-msg mrr-msg--" + (kind || "info");
  el.textContent = text;
}

function renderLibrarySection(dialog, msg) {
  var lib = loadLibrary();
  var ids = Object.keys(lib);
  if (!ids.length) return;

  marinara.addElement(dialog, "h3", { textContent: "Library", "class": "mrr-dialog__lib-title" });
  marinara.addElement(dialog, "p", {
    "class": "mrr-dialog__lib-help",
    textContent: "Saved rulesets on this browser. Switch swaps the active ruleset and reloads."
  });

  var list = marinara.addElement(dialog, "div", { "class": "mrr-dialog__lib" });
  if (!list) return;

  var activeId = state.ruleset ? state.ruleset.id : null;
  ids.sort().forEach(function (id) {
    var entry = lib[id];
    var row = marinara.addElement(list, "div", { "class": "mrr-dialog__lib-row" });
    if (!row) return;
    var label = entry.name + " v" + entry.version + (id === activeId ? " (active)" : "");
    marinara.addElement(row, "span", { "class": "mrr-dialog__lib-name", textContent: label });

    if (id !== activeId) {
      var btnSwitch = marinara.addElement(row, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Switch" });
      if (btnSwitch) marinara.on(btnSwitch, "click", function () {
        if (activateFromLibrary(id)) {
          setMsg(msg, "Activated " + entry.name + ". Reloading ...", "ok");
          marinara.setTimeout(function () { window.location.reload(); }, RELOAD_DELAY_MS);
        }
      });
    }

    var btnRemove = marinara.addElement(row, "button", { "class": "mrr-char-btn mrr-char-btn--danger", textContent: "x", title: "Remove from library" });
    if (btnRemove) marinara.on(btnRemove, "click", function () {
      if (!window.confirm("Remove " + entry.name + " from library? The active ruleset is unaffected.")) return;
      removeFromLibrary(id);
      /* Full dialog re-render: library size is small, and rebuilding from
         scratch keeps the active-id highlight + button states consistent
         without per-row diffing. */
      if (state.dialogEl && state.dialogEl.parentNode) state.dialogEl.parentNode.removeChild(state.dialogEl);
      state.dialogEl = null;
      openDialog();
    });
  });
}

/* ─────  sync sheet to chat customTrackerFields  ───── */

/* Build the full set of customTrackerFields the agent prompts read from.
   This is what the LLM "sees" of the sheet at generation time — anything
   not pushed here is invisible to every overlay agent (state-mutator,
   state-reminder, lore-helper, NPC-bookkeeper, combat-adjudicator). The
   agents key off Marinara's standard customTrackerFields surface, which
   is the only structured per-chat data path the engine exposes to
   pre-generation context. Returned shape: array of {name, value}. */
function buildSyncFields(prefix) {
  var fresh = [];
  if (!state.sheet) return fresh;

  /* Identity (race + class). Empty values still emit so the agent sees the
     fields exist and can prompt the user to fill them. */
  if (state.sheet.identity) {
    var hcfg = (state.ruleset && state.ruleset.header) || {};
    fresh.push({ name: prefix + (hcfg.raceLabel || "Race"),  value: String(state.sheet.identity.race  || "") });
    fresh.push({ name: prefix + (hcfg.classLabel || "Class"), value: String(state.sheet.identity["class"] || "") });
  }

  /* Raw attributes (Strength=16, etc.) so the agent can reason about
     ability scores directly. */
  Object.keys(state.sheet.attributes || {}).forEach(function (n) {
    fresh.push({ name: prefix + n, value: String(state.sheet.attributes[n]) });
  });

  /* Computed attribute modifiers — exposed under both long name and
     abbreviation so the agent can reference either ("Dexterity_mod",
     "DEX_mod"). For Exalted etc. that don't declare modifierFormula,
     this loop is a no-op and the field set stays clean. */
  var ctx = statContext();
  if (state.ruleset && Array.isArray(state.ruleset.attributes)) {
    state.ruleset.attributes.forEach(function (a) {
      if (!a || typeof a.modifierFormula !== "string" || !a.modifierFormula) return;
      var modKey = a.name + "_mod";
      if (typeof ctx[modKey] === "number") {
        var sign = ctx[modKey] >= 0 ? "+" : "";
        fresh.push({ name: prefix + modKey, value: sign + String(ctx[modKey]) });
      }
    });
  }

  /* Skills — when the ruleset uses skillBonusFormula, write the COMPUTED
     bonus (the +5 the user sees) so the agent can roll without re-doing
     the math. When it doesn't, write the raw value (Exalted/WoD dot
     investment). */
  var skillFormula = state.ruleset && state.ruleset.resolution && state.ruleset.resolution.skillBonusFormula;
  Object.keys(state.sheet.skills || {}).forEach(function (n) {
    if (skillFormula) {
      var skillDef = (state.ruleset.skills || []).find(function (s) { return s.name === n; });
      var attrMod = 0;
      if (skillDef && skillDef.linkedAttribute) {
        var mk = skillDef.linkedAttribute + "_mod";
        if (typeof ctx[mk] === "number") attrMod = ctx[mk];
      }
      var t = tierForSkill(n);
      var tierBonus = (t && t.rollBonusFormula) ? evalFormula(t.rollBonusFormula, ctx) : 0;
      if (tierBonus == null) tierBonus = 0;
      var subbed = String(skillFormula)
        .replace(/\{linkedAttribute_mod\}/g, String(attrMod))
        .replace(/\{tierBonus\}/g, String(tierBonus));
      var v = evalFormula(subbed, ctx);
      var num = (typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0;
      /* P0-7: the dice widget adds equippedBonuses(name).value into the roll
         (see renderOneSkill), so the synced number must include it too — else
         the "do NOT invent stats" block shows a value that contradicts rolls. */
      num += (equippedBonuses(n) || {}).value || 0;
      var sign = num >= 0 ? "+" : "";
      fresh.push({ name: prefix + n, value: sign + String(num) });
    } else {
      fresh.push({ name: prefix + n, value: String(state.sheet.skills[n]) });
    }
  });

  /* Custom skills (player-added Lores, Professions). Same compute path as
     ruleset skills — if skillBonusFormula is set, write the bonus. */
  if (Array.isArray(state.sheet.customSkills)) {
    state.sheet.customSkills.forEach(function (sk) {
      if (!sk || !sk.name) return;
      if (skillFormula) {
        var attrMod = 0;
        if (sk.linkedAttribute) {
          var mk = sk.linkedAttribute + "_mod";
          if (typeof ctx[mk] === "number") attrMod = ctx[mk];
        }
        var t = tierForSkill(sk.name);
        var tierBonus = (t && t.rollBonusFormula) ? evalFormula(t.rollBonusFormula, ctx) : 0;
        if (tierBonus == null) tierBonus = 0;
        var subbed = String(skillFormula)
          .replace(/\{linkedAttribute_mod\}/g, String(attrMod))
          .replace(/\{tierBonus\}/g, String(tierBonus));
        var v = evalFormula(subbed, ctx);
        var num = (typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0;
        /* P0-7: include equipped gear bonus, mirroring the dice widget. */
        num += (equippedBonuses(sk.name) || {}).value || 0;
        var sign = num >= 0 ? "+" : "";
        fresh.push({ name: prefix + sk.name, value: sign + String(num) });
      } else {
        fresh.push({ name: prefix + sk.name, value: String(sk.value || 0) });
      }
    });
  }

  /* Saving throws — same compute path as skills, fallback to attr_mod
     alone when skillBonusFormula is absent (no proficiency tier system). */
  if (Array.isArray(state.ruleset && state.ruleset.saves)) {
    state.ruleset.saves.forEach(function (sv) {
      var attrMod = 0;
      if (sv.linkedAttribute) {
        var mk = sv.linkedAttribute + "_mod";
        if (typeof ctx[mk] === "number") attrMod = ctx[mk];
      }
      var t = tierForSkill(sv.name);
      var tierBonus = (t && t.rollBonusFormula) ? evalFormula(t.rollBonusFormula, ctx) : 0;
      if (tierBonus == null) tierBonus = 0;
      var num;
      if (skillFormula) {
        var subbed = String(skillFormula)
          .replace(/\{linkedAttribute_mod\}/g, String(attrMod))
          .replace(/\{tierBonus\}/g, String(tierBonus));
        var v = evalFormula(subbed, ctx);
        num = (typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0;
      } else {
        num = attrMod + tierBonus;
      }
      /* P0-7: saves pick up equipped gear bonus in the dice widget (line
         ~7012 uses bonuses.value + tierBonus); include it in the synced
         value so injected numbers match what rolls produce. */
      num += (equippedBonuses(sv.name) || {}).value || 0;
      var sign = num >= 0 ? "+" : "";
      fresh.push({ name: prefix + sv.name, value: sign + String(num) });
    });
  }

  /* Derived stats — write both the stored value AND, when a valueFormula
     is declared, the computed result. The stored value is what
     refreshAutocalc has already persisted, so they should match — but
     write the computed too in case localStorage is out of sync. */
  Object.keys(state.sheet.derived || {}).forEach(function (n) {
    fresh.push({ name: prefix + n, value: String(state.sheet.derived[n]) });
  });

  /* States (anima level, conditions). */
  Object.keys(state.sheet.states || {}).forEach(function (n) {
    fresh.push({ name: prefix + n, value: String(state.sheet.states[n]) });
  });

  /* Backgrounds / Feats / Merits — name+value pairs. */
  if (Array.isArray(state.sheet.backgrounds) && state.sheet.backgrounds.length) {
    var bgLabel = (state.ruleset && state.ruleset.backgrounds && state.ruleset.backgrounds.label) || "Background";
    state.sheet.backgrounds.forEach(function (bg) {
      if (!bg || !bg.name) return;
      fresh.push({ name: prefix + bgLabel + ": " + bg.name, value: String(bg.value || 0) });
    });
  }

  /* Experience progression — shape depends on resolution.mode. Both
     formula and pool variants land in the tracker so the GM agent
     can reference progression directly without re-deriving. */
  if (state.sheet.xp && typeof state.sheet.xp === "object") {
    var resModeXp = state.ruleset && state.ruleset.resolution && state.ruleset.resolution.mode;
    if (resModeXp === "single-roll") {
      fresh.push({ name: prefix + "XP Level",   value: String(state.sheet.xp.level   || 1) });
      fresh.push({ name: prefix + "XP Current", value: String(state.sheet.xp.current || 0) });
      if (typeof state.sheet.xp.next === "number" && state.sheet.xp.next > 0) {
        fresh.push({ name: prefix + "XP Next", value: String(state.sheet.xp.next) });
      }
    } else if (resModeXp === "dice-pool") {
      fresh.push({ name: prefix + "XP Current",      value: String(state.sheet.xp.current || 0) });
      fresh.push({ name: prefix + "XP Total Earned", value: String(state.sheet.xp.total   || 0) });
    }
  }

  /* Commitment summary — "in use / cap" for boolean models, total
     mote cost broken down by pool for the Exalted model. Single
     human-readable field per ruleset since a flat tracker doesn't
     have room for per-item detail; the GM agent gets the budget
     view it needs to know whether the player is over-committed. */
  var commitModelSync = state.ruleset && state.ruleset.commitmentModel;
  if (commitModelSync) {
    var invSync = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
    if (commitModelSync === "attuned") {
      /* Always recompute from inventory — the attunedCount cache is
         updated by openItemDialog + deleteItem but the agent state-
         mutator may write attunement fields without going through
         them, so a single source of truth (the inventory itself)
         keeps every consumer honest. */
      var ac = invSync.filter(function (it) { return it && it.attuned; }).length;
      fresh.push({ name: prefix + "Attuned", value: String(ac) + " / 3" });
    } else if (commitModelSync === "invested") {
      var ic = invSync.filter(function (it) { return it && it.invested; }).length;
      fresh.push({ name: prefix + "Invested", value: String(ic) + " / 10" });
    } else if (commitModelSync === "mote") {
      var personalSpent = 0, peripheralSpent = 0;
      invSync.forEach(function (it) {
        if (!it || !it.moteCommitment) return;
        if (it.motePool === "Peripheral") peripheralSpent += it.moteCommitment;
        else                              personalSpent   += it.moteCommitment;
      });
      var totalSpent = personalSpent + peripheralSpent;
      fresh.push({
        name: prefix + "Mote Commitment",
        value: String(totalSpent) + " motes (Personal: " + personalSpent + ", Peripheral: " + peripheralSpent + ")"
      });
    }
  }

  return fresh;
}

function syncSheetToChat() {
  if (!state.chatId) { warn("no chat id; cannot sync"); return; }
  var current = state.characters.find(function (c) { return c.id === state.activeCharacterId; });
  /* P0-1 guard: a stale/absent activeCharacterId yields prefix === "", and
     `indexOf("") === 0` matches EVERY field — the read-modify-write below
     would then strip and re-write every character's synced fields, wiping
     other characters' and any user-created customTrackerFields. Bail. */
  if (!current) { warn("sync skipped: no active character for id " + state.activeCharacterId); return; }
  var prefix = "[" + current.name + "] ";

  marinara.apiFetch("/chats/" + state.chatId).then(function (chat) {
    var existing = (chat && chat.customTrackerFields) || [];
    /* Read-modify-write so other characters' synced fields survive when we
       update this character's slice. Strip our own prefix, then re-add. */
    var kept = existing.filter(function (f) { return !f.name || f.name.indexOf(prefix) !== 0; });
    var fresh = buildSyncFields(prefix);
    var allFields = kept.concat(fresh);
    return marinara.apiFetch("/chats/" + state.chatId, {
      method: "PATCH",
      body: JSON.stringify({ customTrackerFields: allFields })
    }).then(function () { return fresh.length; });
  }).then(function (n) {
    log("synced " + n + " fields for " + (current ? current.name : "?") + " to chat " + state.chatId);
  }).catch(function (e) {
    warn("sync failed: " + (e && e.message ? e.message : e));
  });
}

/* Render the current sheet as a human-readable markdown block that gets
   injected directly into each overlay agent's promptTemplate. This is
   the LLM's only reliable view of mechanical state — chats.customTracker
   Fields does NOT reach our pre-generation context (Marinara only routes
   it through the stock `custom-tracker` agent, which the player does
   not have enabled in this chat), and the engine's other markers
   (character/persona/lorebook) carry narrative copy, not numbers.
   Putting the sheet inline in promptTemplate puts it where every agent
   we install reads, with no engine-side cooperation required. */
function buildSheetForPrompt() {
  if (!state.sheet || !state.ruleset) return "";
  var current = state.characters.find(function (c) { return c.id === state.activeCharacterId; });
  var charName = (current && current.name) || "Character";
  var ctx = statContext();
  var lines = [];
  lines.push("LIVE CHARACTER SHEET — " + charName + " (" + state.ruleset.name + " v" + state.ruleset.version + ")");
  lines.push("This block is auto-updated by the extension every time the player edits the sheet. The numbers below are the source of truth for resolution. When the narrative calls for a roll, use these values; do NOT invent stats.");
  lines.push("");

  if (state.sheet.identity) {
    var hcfg = state.ruleset.header || {};
    var raceLbl = hcfg.raceLabel || "Race";
    var classLbl = hcfg.classLabel || "Class";
    lines.push("Identity:");
    lines.push("- " + raceLbl + ": " + (state.sheet.identity.race  || "(unset)"));
    lines.push("- " + classLbl + ": " + (state.sheet.identity["class"] || "(unset)"));
    lines.push("");
  }

  if (Object.keys(state.sheet.attributes || {}).length) {
    lines.push("Attributes:");
    Object.keys(state.sheet.attributes).forEach(function (n) {
      var v = state.sheet.attributes[n];
      var modKey = n + "_mod";
      var mod = ctx[modKey];
      var modStr = (typeof mod === "number") ? "  (mod " + (mod >= 0 ? "+" : "") + mod + ")" : "";
      lines.push("- " + n + ": " + v + modStr);
    });
    lines.push("");
  }

  var skillFormula = state.ruleset.resolution && state.ruleset.resolution.skillBonusFormula;
  function computeSkillBonus(name, linkedAttribute) {
    var attrMod = 0;
    if (linkedAttribute) {
      var mk = linkedAttribute + "_mod";
      if (typeof ctx[mk] === "number") attrMod = ctx[mk];
    }
    var t = tierForSkill(name);
    var tierBonus = (t && t.rollBonusFormula) ? evalFormula(t.rollBonusFormula, ctx) : 0;
    if (tierBonus == null) tierBonus = 0;
    /* P0-7: gear bonus is part of the rolled total in the dice widget;
       fold it into the prompt-block number so the narrator's view of a
       skill/save matches what a roll actually produces. */
    var gearBonus = (equippedBonuses(name) || {}).value || 0;
    if (skillFormula) {
      var subbed = String(skillFormula)
        .replace(/\{linkedAttribute_mod\}/g, String(attrMod))
        .replace(/\{tierBonus\}/g, String(tierBonus));
      var v = evalFormula(subbed, ctx);
      return ((typeof v === "number" && isFinite(v)) ? Math.floor(v) : 0) + gearBonus;
    }
    return attrMod + tierBonus + gearBonus;
  }

  if (Array.isArray(state.ruleset.skills) && state.ruleset.skills.length) {
    lines.push("Skills:");
    state.ruleset.skills.forEach(function (sk) {
      if (skillFormula) {
        var b = computeSkillBonus(sk.name, sk.linkedAttribute);
        var t = tierForSkill(sk.name);
        var tCode = (t && t.code) ? " [" + t.code + "]" : "";
        var sign = b >= 0 ? "+" : "";
        var lk = sk.linkedAttribute ? " (" + sk.linkedAttribute + ")" : "";
        lines.push("- " + sk.name + lk + ": " + sign + b + tCode);
      } else {
        lines.push("- " + sk.name + ": " + (state.sheet.skills[sk.name] || 0));
      }
    });
    lines.push("");
  }

  if (Array.isArray(state.sheet.customSkills) && state.sheet.customSkills.length) {
    lines.push("Custom Skills / Lores:");
    state.sheet.customSkills.forEach(function (sk) {
      if (!sk.name) return;
      if (skillFormula) {
        var b = computeSkillBonus(sk.name, sk.linkedAttribute);
        var sign = b >= 0 ? "+" : "";
        var lk = sk.linkedAttribute ? " (" + sk.linkedAttribute + ")" : "";
        lines.push("- " + sk.name + lk + ": " + sign + b);
      } else {
        lines.push("- " + sk.name + ": " + (sk.value || 0));
      }
    });
    lines.push("");
  }

  if (Array.isArray(state.ruleset.saves) && state.ruleset.saves.length) {
    lines.push("Saving Throws:");
    state.ruleset.saves.forEach(function (sv) {
      var b = computeSkillBonus(sv.name, sv.linkedAttribute);
      var t = tierForSkill(sv.name);
      var tCode = (t && t.code) ? " [" + t.code + "]" : "";
      var sign = b >= 0 ? "+" : "";
      lines.push("- " + sv.name + " (" + (sv.linkedAttribute || "?") + "): " + sign + b + tCode);
    });
    lines.push("");
  }

  /* Phase 6 — Snapshot Derived Stats now enumerates state.ruleset.derivedStats
     (the schema, source of truth) and computes values inline. The prior path
     iterated state.sheet.derived keys, which only contains entries that have
     actually been written — auto-calc derived stats (Defense Parry/Evasion,
     Resolve, Guile, etc.) only land in state.sheet.derived after renderValue's
     autocalc side-effect fires, so the first snapshot after re-import (or any
     snapshot generated before render) was missing most of them. The agent
     then could not see them at all. Iterating the schema makes the snapshot
     deterministic and independent of render-time side effects. sections.hidden
     entries (`derived:<Name>`) are filtered so motes / willpower / Health Track
     don't double up — they're surfaced in the Resources snapshot block below. */
  var derivedDefsForSnap = (state.ruleset && Array.isArray(state.ruleset.derivedStats))
    ? state.ruleset.derivedStats : [];
  var derivedHiddenForSnap = {};
  if (state.ruleset && state.ruleset.sections && Array.isArray(state.ruleset.sections.hidden)) {
    state.ruleset.sections.hidden.forEach(function (h) {
      if (typeof h === "string" && h.indexOf("derived:") === 0) {
        derivedHiddenForSnap[h.slice(8)] = true;
      }
    });
  }
  var visibleDerivedForSnap = derivedDefsForSnap.filter(function (d) {
    return d && d.name && !derivedHiddenForSnap[d.name];
  });
  if (visibleDerivedForSnap.length) {
    lines.push("Derived Stats (totals include equipped-item bonuses; \"base\" = autocalc/manual value before armor/charm bonuses):");
    visibleDerivedForSnap.forEach(function (d) {
      var n = d.name;
      var base = null;
      if (typeof d.valueFormula === "string" && d.valueFormula) {
        var vf = evalFormula(d.valueFormula, ctx);
        base = (typeof vf === "number" && isFinite(vf)) ? Math.floor(vf) : null;
      } else if (typeof d.tooltipFormula === "string" && d.tooltipFormula
                 && typeof mrrComputeTooltipBreakdown === "function") {
        var brk = mrrComputeTooltipBreakdown(d, ctx);
        base = (brk && typeof brk.value === "number") ? brk.value : null;
      }
      if (base == null) {
        var stored = state.sheet.derived ? state.sheet.derived[n] : null;
        if (stored != null && stored !== "") {
          base = (typeof stored === "number") ? stored : (parseInt(stored, 10) || 0);
        } else if (typeof d.default === "number") {
          base = d.default;
        } else {
          base = 0;
        }
      }
      var b = equippedBonuses(n);
      var bonus = (b && typeof b.value === "number") ? b.value : 0;
      if (bonus !== 0) {
        var total = base + bonus;
        var sign = bonus > 0 ? "+" : "";
        var contribs = (b.contributors && b.contributors.length)
          ? " [" + b.contributors.map(function (c) { return c.name + " " + (c.value > 0 ? "+" : "") + c.value; }).join(", ") + "]"
          : "";
        lines.push("- " + n + ": " + total + " (base " + base + " " + sign + bonus + " from equipment" + contribs + ")");
      } else {
        lines.push("- " + n + ": " + base);
      }
    });
    lines.push("");
  }

  /* Phase 6 — Resources snapshot. Mirrors the player-facing Resources cluster
     (motes, willpower, sorcerous motes, etc.) so the LLM can reason about pool
     spending without scraping display labels. Custom-type resources (Health
     Track) are skipped here — their state is rendered by a registered custom
     component and the damage state appears via the existing Health Track
     snapshot path. stateName-bound resources prefer the legacy state.sheet
     .derived value (same store the LLM mutates) so the snapshot reflects
     mutations that haven't yet been mirrored to state.sheet.resources. */
  if (Array.isArray(state.ruleset.resources) && state.ruleset.resources.length) {
    var resourceLinesForSnap = [];
    state.ruleset.resources.forEach(function (r) {
      if (!r || !r.id) return;
      if (r.type === "custom") return;
      var maxVal = null;
      if (typeof r.max === "number") maxVal = r.max;
      else if (typeof r.max === "string" && r.max) {
        var mv = evalFormula(r.max, ctx);
        if (typeof mv === "number" && isFinite(mv)) maxVal = Math.floor(mv);
      }
      /* Phase 6 — apply commitment-aware effective max in the snapshot
         so the agent sees the same numbers the player sees. Committed
         motes are reported on a separate "Committed" line below the
         pool so the agent can reason about both the spendable AND the
         total locked. */
      var committedForSnap = 0;
      if (typeof r.commitmentPool === "string" && r.commitmentPool && typeof computeCommittedMotes === "function") {
        committedForSnap = computeCommittedMotes(r.commitmentPool);
        if (maxVal != null) maxVal = Math.max(0, maxVal - committedForSnap);
      }
      var stateRec = state.sheet.resources ? state.sheet.resources[r.id] : null;
      var stateNameVal = (r.stateName && state.sheet.derived) ? state.sheet.derived[r.stateName] : null;
      var current = null;
      if (stateNameVal != null && stateNameVal !== "") {
        current = (typeof stateNameVal === "number") ? stateNameVal : (parseInt(stateNameVal, 10) || 0);
      } else if (stateRec && stateRec.current != null && stateRec.current !== "") {
        current = (typeof stateRec.current === "number") ? stateRec.current : (parseInt(stateRec.current, 10) || 0);
      } else if (maxVal != null) {
        current = maxVal;
      } else {
        current = 0;
      }
      var label = r.label || r.id;
      var line = "- " + label + ": " + current;
      if (maxVal != null) line += " / " + maxVal;
      if (committedForSnap > 0) line += "  (" + committedForSnap + " committed)";
      resourceLinesForSnap.push(line);
    });
    if (resourceLinesForSnap.length) {
      lines.push("Resources:");
      Array.prototype.push.apply(lines, resourceLinesForSnap);
      lines.push("");
    }
  }

  if (Object.keys(state.sheet.states || {}).length) {
    lines.push("Active States:");
    Object.keys(state.sheet.states).forEach(function (n) {
      var v = state.sheet.states[n];
      if (v) lines.push("- " + n + ": " + v);
    });
    lines.push("");
  }

  /* Active status conditions with their declared mechanical effects. */
  if (Array.isArray(state.sheet.conditions) && state.sheet.conditions.length) {
    var condDefs = (state.ruleset && Array.isArray(state.ruleset.conditions)) ? state.ruleset.conditions : [];
    var condDefByName = {};
    condDefs.forEach(function (d) { if (d && d.name) condDefByName[d.name.toLowerCase()] = d; });
    lines.push("Active Conditions:");
    state.sheet.conditions.forEach(function (cn) {
      var def = condDefByName[String(cn).toLowerCase()];
      var line = "- " + cn;
      if (def) {
        var fx = [];
        if (Array.isArray(def.imposesDisadvantageOn) && def.imposesDisadvantageOn.length) {
          fx.push("disadvantage on " + def.imposesDisadvantageOn.join(", "));
        }
        if (Array.isArray(def.grantsAdvantageOn) && def.grantsAdvantageOn.length) {
          fx.push("advantage on " + def.grantsAdvantageOn.join(", "));
        }
        if (fx.length) line += " — " + fx.join("; ");
        if (def.description) line += " (" + def.description + ")";
      }
      lines.push(line);
    });
    lines.push("");
  }

  if (Array.isArray(state.sheet.backgrounds) && state.sheet.backgrounds.length) {
    var bgLabel = (state.ruleset.backgrounds && state.ruleset.backgrounds.label) || "Backgrounds";
    lines.push(bgLabel + ":");
    state.sheet.backgrounds.forEach(function (bg) {
      if (!bg.name) return;
      lines.push("- " + bg.name + ": " + (bg.value || 0));
    });
    lines.push("");
  }

  /* Experience progression. Both layouts emit a single readable line
     so the agent sees where the character sits without re-deriving
     from the xp object. Single-roll mode prints level + current/next
     (which the GM uses to gauge encounter difficulty); pool mode
     prints current + total earned (which Exalted/Storyteller GMs
     use to award session XP at appropriate scale). */
  if (state.sheet.xp && typeof state.sheet.xp === "object") {
    var resModePrompt = state.ruleset.resolution && state.ruleset.resolution.mode;
    if (resModePrompt === "single-roll") {
      var lvlP = state.sheet.xp.level   || 1;
      var curP = state.sheet.xp.current || 0;
      var nxtP = state.sheet.xp.next    || 0;
      lines.push("Experience:");
      lines.push("- Level: " + lvlP);
      if (nxtP > 0) {
        lines.push("- XP: " + curP + " / " + nxtP);
      } else {
        lines.push("- XP: " + curP);
      }
      lines.push("");
    } else if (resModePrompt === "dice-pool") {
      var curPP = state.sheet.xp.current || 0;
      var totPP = state.sheet.xp.total   || 0;
      lines.push("Experience:");
      lines.push("- XP available to spend: " + curPP);
      lines.push("- Total XP earned (lifetime): " + totPP);
      lines.push("");
    }
  }

  if (Array.isArray(state.sheet.inventory) && state.sheet.inventory.length) {
    /* Inventory rows now include commitment annotations when the
       active ruleset declares a commitmentModel. Boolean models
       (attuned/invested) emit a tag; the mote model emits the
       commitment cost and target pool. The agent uses these to
       reason about which magical effects are currently live and
       which sit dormant in the bag. */
    var commitModelPrompt = state.ruleset.commitmentModel || null;
    lines.push("Inventory:");
    state.sheet.inventory.forEach(function (it) {
      if (!it || !it.name) return;
      var parts = ["- " + it.name];
      if (it.slot) parts.push("[" + it.slot + "]");
      if (it.damage) parts.push("damage: " + it.damage);
      var equipped = state.sheet.equipped && it.slot && state.sheet.equipped[it.slot] === it.id;
      if (equipped) parts.push("EQUIPPED");
      if (commitModelPrompt === "attuned" && it.attuned)   parts.push("ATTUNED");
      if (commitModelPrompt === "invested" && it.invested) parts.push("INVESTED");
      if (commitModelPrompt === "mote" && it.moteCommitment > 0) {
        parts.push("committed: " + it.moteCommitment + " mote" + (it.moteCommitment === 1 ? "" : "s") + " (" + (it.motePool || "Personal") + ")");
      }
      lines.push(parts.join(" "));
    });
    lines.push("");
  }

  /* Commitment budget summary. Single rollup line for the agent so
     it can answer "is the player at the cap?" without scanning each
     inventory row. Boolean models show "in use / cap"; the mote
     model shows the per-pool spend so the agent can warn before a
     player commits motes they no longer have. */
  var commitModelSummary = state.ruleset.commitmentModel || null;
  if (commitModelSummary && Array.isArray(state.sheet.inventory)) {
    if (commitModelSummary === "attuned") {
      /* Always recompute from inventory so agents that wrote attuned via
         state-mutator without going through the cap-enforcing item dialog
         still see correct counts in the snapshot. */
      var acP = state.sheet.inventory.filter(function (it) { return it && it.attuned; }).length;
      lines.push("Magic / Commitment:");
      lines.push("- Items attuned: " + acP + " / 3 (D&D attunement cap)");
      lines.push("");
    } else if (commitModelSummary === "invested") {
      var icP = state.sheet.inventory.filter(function (it) { return it && it.invested; }).length;
      lines.push("Magic / Commitment:");
      lines.push("- Items invested: " + icP + " / 10 (PF2e investiture cap)");
      lines.push("");
    } else if (commitModelSummary === "mote") {
      var personalP = 0, peripheralP = 0;
      state.sheet.inventory.forEach(function (it) {
        if (!it || !it.moteCommitment) return;
        if (it.motePool === "Peripheral") peripheralP += it.moteCommitment;
        else                              personalP   += it.moteCommitment;
      });
      if (personalP > 0 || peripheralP > 0) {
        lines.push("Magic / Commitment:");
        lines.push("- Mote commitment (Exalted): " + (personalP + peripheralP) + " motes total");
        if (personalP > 0)   lines.push("  · Personal pool: " + personalP);
        if (peripheralP > 0) lines.push("  · Peripheral pool: " + peripheralP);
        lines.push("");
      }
    }
  }

  /* Phase 5 — Intimacies snapshot. Exalted-only narrative ties +
     principles. Agents read this to remember what the player cares
     about and weave it into scenes. State-mutator field="intimacies"
     already supports add/remove/update per Phase 2. */
  if (Array.isArray(state.sheet.intimacies) && state.sheet.intimacies.length) {
    lines.push("Intimacies:");
    var byDeg = { defining: [], major: [], minor: [] };
    state.sheet.intimacies.forEach(function (it) {
      if (!it || !it.text) return;
      var d = (it.degree === "major" || it.degree === "defining") ? it.degree : "minor";
      byDeg[d].push(it);
    });
    ["defining", "major", "minor"].forEach(function (deg) {
      var entries = byDeg[deg];
      if (!entries.length) return;
      var degLabel = deg.charAt(0).toUpperCase() + deg.slice(1);
      lines.push("- " + degLabel + ":");
      entries.forEach(function (it) {
        var kindLabel = (it.kind === "principle") ? "Principle" : "Tie";
        var lineParts = ["  · " + kindLabel + ": " + it.text];
        if (it.kind === "tie" && it.target) lineParts.push("(toward " + it.target + ")");
        lines.push(lineParts.join(" "));
      });
    });
    lines.push("");
  }

  /* Phase 5 — Disciplines / Abilities-with-rating snapshot. Dice-pool
     rulesets (V20, Exalted) use per-category rating to drive the dice
     pool; the agent needs the rating + per-discipline ability list to
     reason about what the player can do and at what tier. */
  var poolModeForAbilities = state.ruleset && state.ruleset.resolution
      && state.ruleset.resolution.mode === "dice-pool";
  var abilitiesCfgForSnap = (typeof getAbilitiesConfig === "function") ? getAbilitiesConfig() : null;
  if (poolModeForAbilities && abilitiesCfgForSnap && abilitiesCfgForSnap.categories) {
    var allCatsSnap = abilitiesCfgForSnap.categories.slice();
    if (Array.isArray(state.sheet.customAbilityCategories)) {
      allCatsSnap = allCatsSnap.concat(state.sheet.customAbilityCategories);
    }
    var anyDiscipline = false;
    var disciplineLines = [];
    allCatsSnap.forEach(function (cat) {
      var score = (state.sheet.abilityCategoryScores && typeof state.sheet.abilityCategoryScores[cat.id] === "number")
        ? state.sheet.abilityCategoryScores[cat.id] : 0;
      var abs = (state.sheet.abilities && Array.isArray(state.sheet.abilities[cat.id])) ? state.sheet.abilities[cat.id] : [];
      if (score === 0 && abs.length === 0) return;
      anyDiscipline = true;
      var catLine = "- " + cat.label + ": rating " + score;
      if (abs.length) catLine += " (" + abs.length + " " + (abs.length === 1 ? "ability" : "abilities") + ")";
      disciplineLines.push(catLine);
      abs.forEach(function (ab) {
        if (!ab || !ab.name) return;
        var abLine = "  · " + ab.name;
        if (ab.costText) abLine += " — cost: " + ab.costText;
        if (ab.notes && ab.notes !== ab.costText) abLine += " — " + ab.notes;
        disciplineLines.push(abLine);
      });
    });
    if (anyDiscipline) {
      lines.push((abilitiesCfgForSnap.label || "Abilities") + ":");
      disciplineLines.forEach(function (l) { lines.push(l); });
      lines.push("");
    }
  }

  /* State-mutator field reference. The state-mutator agent emits
     [mrr-state: target="player" field="..." delta="..."] tags; the
     extension applies them to the sheet. The `field` token must match
     a stat the sheet recognizes. List the canonical names AND the
     declared aliases here so the agent picks one that resolves. The
     extension also accepts case/punctuation variants and attribute
     abbreviations (DEX → Dexterity), but printing the canonical names
     keeps the agent's output predictable. */
  var refLines = [];
  function pushFieldRef(map, defs) {
    if (!Array.isArray(defs) || !defs.length) return;
    defs.forEach(function (def) {
      if (!def || typeof def.name !== "string") return;
      var label = def.name;
      var aliasParts = [];
      if (Array.isArray(def.aliases) && def.aliases.length) aliasParts = aliasParts.concat(def.aliases);
      if (map === "attributes" && typeof def.abbreviation === "string") aliasParts.push(def.abbreviation);
      if (aliasParts.length) label += " (aliases: " + aliasParts.join(", ") + ")";
      refLines.push("- " + label);
    });
  }
  pushFieldRef("derived",    state.ruleset.derivedStats);
  pushFieldRef("attributes", state.ruleset.attributes);
  pushFieldRef("skills",     state.ruleset.skills);
  /* Phase 5 — Special canonical field names. Without these in the
     reference, the agent guesses field names from snapshot display
     labels (e.g. "XP available to spend") and the parser stashes the
     write on sheet root. */
  refLines.push("- xp (use field=\"xp\" with delta=\"+50\" or absolute current/level/next/total — NOT the display label \"XP available to spend\")");
  if (Array.isArray(state.sheet.intimacies) || (state.ruleset.id === "exalted3e")) {
    refLines.push("- intimacies (use field=\"intimacies\" with add=\"text\" kind=\"tie|principle\" degree=\"minor|major|defining\" target=\"name\"; remove=\"text\"; or update via text=... + degree/kind)");
  }
  var commitMod = state.ruleset.commitmentModel;
  if (commitMod === "attuned") {
    refLines.push("- attunement (use field=\"attunement\" item=\"<item name>\" attuned=\"true|false\" — D&D cap 3)");
  } else if (commitMod === "invested") {
    refLines.push("- investiture (use field=\"investiture\" item=\"<item name>\" invested=\"true|false\" — PF2e cap 10)");
  } else if (commitMod === "mote") {
    refLines.push("- commitment (use field=\"commitment\" item=\"<item name>\" motes=\"N\" pool=\"Personal|Peripheral\" — Exalted mote commit)");
  }
  /* Live smoke 2026-08-22: agents guessed delta-form for label-valued
     states (warned + refused) and invented type-attribute forms for
     damage tracks (normalized, but teach the native form to cut the
     variance) — neither family was documented here. */
  if (Array.isArray(state.ruleset.states) && state.ruleset.states.length) {
    state.ruleset.states.forEach(function (st) {
      if (!st || typeof st.name !== "string") return;
      var stLabels = (Array.isArray(st.values) ? st.values : []).map(function (v) { return v && v.label; }).filter(Boolean);
      refLines.push("- " + st.name + " (label-valued STATE — set with field=\"" + st.name + "\" value=\"<label>\", NEVER delta; labels: " + stLabels.join(" | ") + ")");
    });
  }
  (state.ruleset.derivedStats || []).forEach(function (d) {
    if (!d || d.renderAs !== "track" || !Array.isArray(d.damageTypes) || !d.damageTypes.length) return;
    var typeIds = d.damageTypes.map(function (t) { return t.id; }).join(" | ");
    refLines.push("- " + d.name + " damage (use the damage TYPE as the field: field=\"" + d.damageTypes[0].id + "\" delta=\"+3\" — types: " + typeIds + "; do NOT use field=\"" + d.name + "\" with type attributes)");
  });
  if (refLines.length) {
    lines.push("State-mutator field reference (use these EXACT names — not display labels — in [mrr-state: field=\"...\"] tags):");
    Array.prototype.push.apply(lines, refLines);
    lines.push("");
  }

  return lines.join("\n").trim();
}

var SHEET_INJECT_BEGIN = "<!-- MRR_SHEET_BEGIN -->";
var SHEET_INJECT_END   = "<!-- MRR_SHEET_END -->";

/* Strip any prior sheet block from a promptTemplate and prepend a fresh
   one. Marker-based so multiple updates over the lifetime of an installed
   agent never accumulate stale sheets — each PATCH replaces the previous
   block in place. The original (pre-injection) template body is preserved
   intact below the END marker. */
function injectSheetIntoPromptTemplate(promptTemplate, sheetBlock) {
  var template = String(promptTemplate || "");
  /* Strip any existing block. RegExp escaping kept inline so we don't
     introduce a new helper for one call site. */
  var beginEsc = SHEET_INJECT_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var endEsc   = SHEET_INJECT_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  /* D7: `g` flag so a template that somehow accumulated more than one
     injected block gets ALL of them stripped, not just the first. */
  var stripRe  = new RegExp(beginEsc + "[\\s\\S]*?" + endEsc + "\\n*", "g");
  var stripped = template.replace(stripRe, "");
  if (!sheetBlock) return stripped.trim();
  return SHEET_INJECT_BEGIN + "\n" + sheetBlock + "\n" + SHEET_INJECT_END + "\n\n" + stripped.trim();
}

/* PATCH every managed overlay agent for the active ruleset to embed the
   current sheet. This is what actually makes the LLM see numbers. The
   chat's customTrackerFields surface is purely for the chat UI tracker
   panel; without the stock `custom-tracker` agent enabled, that data
   never reaches generation context. We bypass that whole path and put
   the sheet directly in the agents' system prompts. */
function syncSheetToAgents() {
  if (!state.ruleset) return;
  var sheetBlock = buildSheetForPrompt();
  if (!sheetBlock) return;
  apiFetch("/agents").then(function (agents) {
    if (!Array.isArray(agents)) return;
    var rulesetId = state.ruleset.id;
    var managed = agents.filter(function (a) {
      var s = parseAgentSettings(a);
      return s && s.mrrManaged === true && s.mrrRulesetId === rulesetId;
    });
    if (!managed.length) {
      log("syncSheetToAgents: no managed agents for ruleset " + rulesetId);
      return;
    }
    return Promise.all(managed.map(function (a) {
      var newPrompt = injectSheetIntoPromptTemplate(a.promptTemplate, sheetBlock);
      if (newPrompt === a.promptTemplate) return null;
      return apiFetch("/agents/" + a.id, {
        method: "PATCH",
        body: JSON.stringify({ promptTemplate: newPrompt })
      });
    })).then(function () {
      log("synced sheet into " + managed.length + " agent prompts for ruleset " + rulesetId);
    });
  }).catch(function (e) {
    warn("syncSheetToAgents failed: " + (e && e.message ? e.message : e));
  });
}

/* Build the lorebook field-reference content. Lists canonical stat
   names with their declared aliases so the MAIN narrator (which emits
   the [mrr-state: ...] tags but does NOT read overlay agents'
   promptTemplate) sees which field= tokens resolve. The narrator picks
   up this entry every turn via the lorebook's `constant: true` flag. */
function buildFieldReferenceContent() {
  if (!state.ruleset) return "";
  var lines = [];
  lines.push("STATE-MUTATOR FIELD REFERENCE for " + state.ruleset.name + " (auto-generated by extension)");
  lines.push("");
  lines.push("When you emit [mrr-state: target=\"player\" field=\"...\" delta=\"...\"] tags, the field token must match a stat the sheet recognizes. The extension auto-resolves case/punctuation variants and accepts these declared aliases. Use any name in the list and the mutation will land on the correct stat.");
  lines.push("");
  function pushDef(label, defs) {
    var rows = [];
    (defs || []).forEach(function (def) {
      if (!def || typeof def.name !== "string") return;
      var aliasParts = [];
      if (Array.isArray(def.aliases)) aliasParts = aliasParts.concat(def.aliases);
      if (label === "Attributes" && typeof def.abbreviation === "string") aliasParts.push(def.abbreviation);
      var line = "- " + def.name;
      if (aliasParts.length) line += "  (also: " + aliasParts.join(", ") + ")";
      rows.push(line);
    });
    if (rows.length) {
      lines.push(label + ":");
      Array.prototype.push.apply(lines, rows);
      lines.push("");
    }
  }
  pushDef("Derived Stats", state.ruleset.derivedStats);
  pushDef("Attributes",    state.ruleset.attributes);
  pushDef("Skills",        state.ruleset.skills);
  if (Array.isArray(state.ruleset.states) && state.ruleset.states.length) {
    lines.push("Label-valued States (SET BY LABEL — value=\"<label>\", never delta):");
    state.ruleset.states.forEach(function (st) {
      if (!st || typeof st.name !== "string") return;
      var stLabels = (Array.isArray(st.values) ? st.values : []).map(function (v) { return v && v.label; }).filter(Boolean);
      lines.push("- " + st.name + ": " + stLabels.join(" | "));
    });
    var st0 = state.ruleset.states[0];
    var st0Label = (Array.isArray(st0.values) && st0.values[1] && st0.values[1].label) ||
                   (Array.isArray(st0.values) && st0.values[0] && st0.values[0].label) || "";
    if (st0Label) lines.push("  Example: [mrr-state: target=\"player\" field=\"" + st0.name + "\" value=\"" + st0Label + "\"]");
    lines.push("");
  }
  lines.push("Common compound mutations the narrator may emit:");
  (state.ruleset.derivedStats || []).forEach(function (d) {
    if (!d || d.renderAs !== "track" || !Array.isArray(d.damageTypes) || !d.damageTypes.length) return;
    var typeIds = d.damageTypes.map(function (t) { return t.id; }).join(" | ");
    lines.push("- " + d.name + " damage: use the damage TYPE as the field — [mrr-state: target=\"player\" field=\"" + d.damageTypes[0].id + "\" delta=\"+3\" reason=\"...\"] (types: " + typeIds + "). Never field=\"" + d.name + "\" with type attributes.");
  });
  lines.push("- Damage: [mrr-state: target=\"player\" field=\"hp\" delta=\"-5\" reason=\"orc sword hit\"]");
  lines.push("- Healing: [mrr-state: target=\"player\" field=\"hp\" delta=\"+10\" reason=\"healing potion\"]");
  lines.push("- Add condition: [mrr-state: target=\"player\" field=\"conditions\" add=\"poisoned\" reason=\"failed CON save\"]");
  lines.push("- Remove condition: [mrr-state: target=\"player\" field=\"conditions\" remove=\"poisoned\"]");
  lines.push("- Inventory gain (bare): [mrr-state: target=\"player\" field=\"inventory\" add=\"Rope (50ft)\" qty=\"1\"]");
  lines.push("- Inventory gain (stored / consumable): [mrr-state: target=\"player\" field=\"inventory\" add=\"Healing Potion\" qty=\"2\" use_effect=\"2d4+2 healing\" consumable=\"true\" reason=\"purchased\"]");
  lines.push("- Inventory gain (weapon): [mrr-state: target=\"player\" field=\"inventory\" add=\"Longsword\" category=\"equipment\" slot=\"weapon\" damage=\"1d8 slashing\" attack_attr=\"Strength\" attack_proficient=\"true\"]");
  lines.push("- Inventory gain (armor): [mrr-state: target=\"player\" field=\"inventory\" add=\"Chain Mail\" category=\"equipment\" slot=\"armor\" notes=\"AC 16, Disadvantage on Stealth\"]");
  lines.push("- Inventory remove: [mrr-state: target=\"player\" field=\"inventory\" remove=\"Healing Potion\" qty=\"1\"]");
  lines.push("");
  lines.push("Optional attrs on inventory.add (all optional, all map to the item-edit dialog):");
  lines.push("  slot              — equipment slot name (\"weapon\", \"armor\", \"head\", etc.) — presence implies category=equipment when not specified");
  lines.push("  damage            — free-text damage expression (\"1d8 slashing\", \"2d6 fire\", flat numbers)");
  lines.push("  attack_attr       — attribute name whose modifier adds to attack/damage rolls (\"Strength\", \"Dexterity\")");
  lines.push("  attack_proficient — \"true\" to add the proficiency bonus on attack rolls");
  lines.push("  use_effect        — free-text effect that the player Use button parses and rolls (\"2d4+2 healing\")");
  lines.push("  consumable        — \"true\" to decrement quantity by 1 each Use; item is removed when quantity hits 0");
  lines.push("  notes             — free-text notes that show in the dialog");
  lines.push("  category          — \"equipment\" (lives in the on-sheet Inventory section, equippable to slot) or \"item\" (Items flyout, usable / consumable). Default: \"item\" when no slot, \"equipment\" when slot is set.");
  lines.push("");
  lines.push("Repeated inventory.add tags with the same name BUMP QUANTITY and ENRICH any blank fields on the existing item — populate fields once authoritatively on first add, omit them on subsequent qty bumps.");
  return lines.join("\n");
}

var FIELD_REF_TAG = "mrr-field-reference";

/* PATCH (or POST) the field-reference lorebook entry for the active
   ruleset. The entry uses `constant: true` so the engine includes it in
   the prompt context every turn regardless of keyword triggers — the
   narrator sees the canonical field names whether the player rolled a
   save, dealt damage, or just talked. We tag the entry so subsequent
   syncs find and update it in place rather than spawning duplicates. */
function syncFieldReferenceToLorebook() {
  if (!state.ruleset) return;
  var rulesetId = state.ruleset.id;
  var content = buildFieldReferenceContent();
  if (!content) return;
  var keys = [];
  function addKeys(defs) {
    (defs || []).forEach(function (def) {
      if (def && typeof def.name === "string") keys.push(def.name);
      if (def && Array.isArray(def.aliases)) Array.prototype.push.apply(keys, def.aliases);
      if (def && typeof def.abbreviation === "string") keys.push(def.abbreviation);
    });
  }
  addKeys(state.ruleset.derivedStats);
  addKeys(state.ruleset.attributes);
  addKeys(state.ruleset.skills);

  apiFetch("/lorebooks").then(function (lorebooks) {
    var lb = findManagedLorebook(lorebooks, rulesetId);
    if (!lb) {
      log("syncFieldReferenceToLorebook: no managed lorebook for " + rulesetId);
      return;
    }
    return apiFetch("/lorebooks/" + lb.id + "/entries").then(function (full) {
      /* GET /lorebooks/:id returns ONLY the lorebook row (no entries). Entries live at /lorebooks/:id/entries — full is the array directly. */
      var entries = Array.isArray(full) ? full : [];
      /* Dedup on entry name — lorebookEntries has no tags-array column; the prior tag-based check returned undefined every call and POSTed duplicates forever. */
      var matches = entries.filter(function (e) {
        return e.name === "Field Reference (extension-managed)";
      });
      var cleanupChain = Promise.resolve();
      if (matches.length > 1) {
        log("cleaning up " + (matches.length - 1) + " duplicate field-reference entries");
        var toDelete = matches.slice(1);
        cleanupChain = toDelete.reduce(function (chain, dup) {
          return chain.then(function () {
            /* apiDeleteRaw, not apiFetch — DELETE with Content-Type: application/json header and empty body trips the engine's Fastify JSON parser with a 400. */
            return apiDeleteRaw("/lorebooks/" + lb.id + "/entries/" + dup.id).catch(function () {});
          });
        }, Promise.resolve());
      }
      var existing = matches[0] || null;
      var body = {
        name: "Field Reference (extension-managed)",
        content: content,
        position: 0,
        constant: true,
        selective: false,
        keys: keys,
        tags: [MRR_TAG_MANAGED, MRR_TAG_RS_PFX + rulesetId, FIELD_REF_TAG]
      };
      return cleanupChain.then(function () {
        if (existing) {
          return apiFetch("/lorebooks/" + lb.id + "/entries/" + existing.id, {
            method: "PATCH",
            body: JSON.stringify(body)
          }).then(function () { log("synced field reference to lorebook entry " + existing.id); });
        }
        return apiFetch("/lorebooks/" + lb.id + "/entries", {
          method: "POST",
          body: JSON.stringify(body)
        }).then(function () { log("created field reference lorebook entry"); });
      });
    });
  }).catch(function (e) {
    warn("syncFieldReferenceToLorebook failed: " + (e && e.message ? e.message : e));
  });
}

/* Vector 8 — per-chat auto-install of bundle.scenarioDefault. Caller invokes
   this after installBundle resolves; the helper checks for an active chat,
   prompts the user once (window.confirm), and PATCHes /chats/:id/metadata
   with { groupScenarioText: scenarioDefault }. Endpoint, method, and body
   shape mirror reconcileActiveAgents below — same pass-through metadata
   merge contract documented in chats.routes.ts:349. "All my chats" is out
   of scope for the first pass; per-chat with explicit confirmation is the
   safer minimum-viable closure. Helper resolves on success, on user cancel,
   on missing-chat, and on PATCH failure — the install pipeline never throws
   from this step (scenario default is a UX nicety, not a correctness gate). */
function applyScenarioDefaultToCurrentChat(scenarioDefault, progressCb) {
  function report(s) { if (progressCb) progressCb(s); }
  if (!state.chatId) {
    report("No active chat — scenario default ships in the bundle but won't auto-apply.");
    return Promise.resolve();
  }
  if (!scenarioDefault || typeof scenarioDefault !== "string") {
    return Promise.resolve();
  }
  var prompt = "Apply the bundle's scenario default to this chat now?\n\n"
    + "This sets the chat's groupScenarioText override (the engine reads it during prompt assembly).\n\n"
    + "Click Cancel to leave the chat's scenario text alone — you can paste it manually later from the bundle's scenarioDefault field.";
  if (!window.confirm(prompt)) {
    report("Scenario default not applied — chat scenario text unchanged.");
    return Promise.resolve();
  }
  report("Applying scenario default to chat " + state.chatId + " ...");
  return apiFetch("/chats/" + state.chatId + "/metadata", {
    method: "PATCH",
    body: JSON.stringify({ groupScenarioText: scenarioDefault })
  }).then(function () {
    report("Scenario default applied to current chat.");
  }).catch(function (e) {
    report("Failed to apply scenario default: " + (e && e.message ? e.message : e));
  });
}

/* Ensure chat.metadata.activeAgentIds includes every overlay agent for the active ruleset — engine fires agents only on id-in-activeAgentIds, install doesn't auto-add, and game mode hides the per-agent toggle. Idempotent set-union; endpoint is /chats/:id/metadata (not /chats/:id). */
function reconcileActiveAgents() {
  if (!state.chatId) return;
  if (!state.ruleset) return;
  var chatId = state.chatId;
  var rulesetId = state.ruleset.id;

  Promise.all([
    apiFetch("/chats/" + chatId),
    apiFetch("/agents")
  ]).then(function (results) {
    var chat = results[0];
    var agents = results[1];
    /* chat.metadata is a JSON string from the engine route; parse before reading. */
    var meta = (chat && typeof chat.metadata === "string")
      ? (safeParse(chat.metadata) || {})
      : ((chat && chat.metadata) || {});
    var existing = Array.isArray(meta.activeAgentIds) ? meta.activeAgentIds : [];

    /* Chat-scoped ruleset stamp prevents cross-ruleset pollution: if the chat is bound to a different ruleset, skip with a warning instead of mixing agents from multiple rulesets into one chat's active list. Stamp round-trips via the engine's pass-through metadata merge (chats.routes.ts:349). */
    var stamp = meta.mrrChatRulesetId;
    if (stamp && stamp !== rulesetId) {
      log("reconcileActiveAgents: chat " + chatId + " is bound to ruleset " + stamp + "; current active is " + rulesetId + " — skipping (switch ruleset to update this chat)");
      return;
    }

    var managedIds = (Array.isArray(agents) ? agents : [])
      .filter(function (a) {
        var s = parseAgentSettings(a);
        return s && s.mrrManaged === true && s.mrrRulesetId === rulesetId;
      })
      .map(function (a) { return a.id; });

    if (managedIds.length === 0) {
      log("reconcileActiveAgents: no managed agents for " + rulesetId);
      return;
    }

    var union = existing.slice();
    var added = 0;
    managedIds.forEach(function (id) {
      if (union.indexOf(id) === -1) { union.push(id); added++; }
    });

    /* PATCH if we have new IDs to add OR we need to backfill the stamp on an existing chat that pre-dates Phase 1. */
    var needsPatch = added > 0 || !stamp;
    if (!needsPatch) {
      log("reconcileActiveAgents: " + managedIds.length + " managed agents already active in chat " + chatId);
      return;
    }

    var patchBody = { activeAgentIds: union, enableAgents: true };
    if (!stamp) patchBody.mrrChatRulesetId = rulesetId;

    return apiFetch("/chats/" + chatId + "/metadata", {
      method: "PATCH",
      body: JSON.stringify(patchBody)
    }).then(function () {
      var parts = [];
      if (added > 0) parts.push("added " + added + " agent id(s)");
      if (!stamp) parts.push("stamped ruleset " + rulesetId);
      log("reconcileActiveAgents: " + parts.join(", ") + " — chat " + chatId);
    });
  }).catch(function (e) {
    warn("reconcileActiveAgents failed: " + (e && e.message ? e.message : e));
  });
}

/* Auto-sync on save: fires a debounced sync 1.5s after the last
   saveSheet call so a burst of typing collapses into a single round of
   PATCHes. Three surfaces fire: the chat's customTrackerFields (UI
   tracker panel), each managed overlay agent's promptTemplate (the
   primary path that reaches our overlay agents), and the managed
   lorebook's field-reference entry (the path that reaches the MAIN
   narrator, which emits the [mrr-state: ...] tags). Triple coverage
   so the LLM sees canonical field names whichever surface its prompt
   builder samples from. */
var autoSyncTimer = null;
function scheduleAutoSync() {
  if (autoSyncTimer) clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(function () {
    autoSyncTimer = null;
    /* D7: don't sync mid-install/uninstall — a PATCH here can re-add managed
       agents or recreate the field-reference lorebook entry an in-flight
       uninstall is busy removing. */
    if (state.installing) { warn("auto-sync skipped: install/uninstall in progress"); return; }
    try { syncSheetToChat(); } catch (e) { warn("auto-sync chat threw: " + e); }
    try { syncSheetToAgents(); } catch (e) { warn("auto-sync agents threw: " + e); }
    try { syncFieldReferenceToLorebook(); } catch (e) { warn("auto-sync lorebook threw: " + e); }
  }, 1500);
}

/* ─────  init  ───── */

/* ─────  state mutation: parse tags from chat, apply to active sheet  ─────

   Architectural note: Marinara doesn't expose custom result types to
   extensions, so the only way to feed LLM-derived state changes back into
   our localStorage is to have the LLM emit them as inline tags in its
   own narration where we can see them in the rendered DOM. The
   state-mutator agent's prompt instructs the model to emit
       [mrr-state: target="player" field="hp" delta="-3" reason="..."]
   at the end of paragraphs that establish durable state changes. Same
   pattern Marinara itself uses for [reputation: ...] and [skill_check: ...].

   Idempotency: track processed message ids so re-renders don't double-apply
   state mutations. Visual hiding: wrap each tag in <span class="mrr-state-tag">
   so the embedded CSS rule `display:none` keeps the chat reading clean. */

var STATE_TAG_RE = /\[mrr-state:\s+([^\]]+)\]/g;
var STATE_KV_RE  = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
/* Per-chat processed-message-id set, persisted across reloads. Without
   persistence, every hard refresh would walk the chat DOM, replay every
   historic [mrr-state: ...] tag, and double-apply mutations to the
   sheet (60 → 40 instead of 60 → 50, ghost "Health Levels" entries
   re-stashing on the root, etc.). Loaded fresh whenever the chat id
   changes; saved after each successful per-message apply. */
var processedMessageIds = {};
var processedMessageIdsChatId = null;

/* Shared cross-transport mutation-dedup set (per chat, in-memory). A given
   sheet mutation can now arrive via TWO transports: the narrator DOM message
   (processChatMessage) and the custom-agent runs endpoint (pollCustomAgentRuns).
   Key = anchorId::contentSig::occIdx so that:
     - identical tags on DIFFERENT anchors (different turns) BOTH apply
       (different anchorId → different key), and
     - the SAME tag from two transports on ONE turn applies ONCE
       (same anchorId + same content → same key), and
     - legitimately-repeated identical tags within a SINGLE message/run
       ("take 1, take 1 more") BOTH apply (occIdx disambiguates).
   contentSig is built from the PARSED attrs, not raw text, so DOM-vs-JSON
   whitespace/encoding differences between transports never split a match.
   Reset on chat switch (loadProcessedMessageIds). When MRR_RUNS_POLLER_MODE
   is "off" only the narrator writes, and — because its outer per-msgId gate
   already prevents reprocessing — this set is populated but never suppresses,
   so narrator behavior is byte-identical to before B1. */
var appliedMutationKeys = Object.create(null);

function mutationContentSig(attrs) {
  if (!attrs || typeof attrs !== "object") return "";
  var keys = Object.keys(attrs).sort();
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    parts.push(keys[i] + "=" + String(attrs[keys[i]]).trim());
  }
  return parts.join("|");
}

/* Canonicalize equivalent [mrr-state:] surface forms BEFORE the dedup
   signature is computed, so the same intended mutation emitted by
   different agents in different shapes collides to ONE apply. Observed
   live 2026-08-22 — three agents reported one wound in two shapes:
     field="Health Track" bashing="3"                (Mutator + Helper)
     field="Health Track" damage="3" type="bashing"  (Combat Overseer)
   Both normalize to the pipeline-native field="bashing" delta="+3",
   which (a) the existing typed-damage branch already applies correctly
   and (b) gives both shapes the SAME contentSig, so the cross-transport
   dedup collapses them instead of double-applying the wound.
   Returns an ARRAY of attr objects: usually [attrs] untouched; a
   multi-type tag (bashing="1" lethal="2") splits into one canonical
   mutation per type. Only rewrites when field names a renderAs:"track"
   derived stat — everything else passes through byte-identical. */
function normalizeStateAttrs(attrs) {
  if (!attrs || typeof attrs !== "object") return [attrs];
  if (!state.ruleset || !Array.isArray(state.ruleset.derivedStats)) return [attrs];
  if (typeof attrs.field !== "string") return [attrs];
  var target = normalizeFieldKey(attrs.field);
  if (!target) return [attrs];
  var trackDef = null;
  for (var i = 0; i < state.ruleset.derivedStats.length; i++) {
    var d = state.ruleset.derivedStats[i];
    if (d.renderAs === "track" && Array.isArray(d.damageTypes) && normalizeFieldKey(d.name) === target) {
      trackDef = d;
      break;
    }
  }
  if (!trackDef) return [attrs];
  var types = damageTypesFor(trackDef) || [];
  var carry = {};
  if (attrs.target != null) carry.target = attrs.target;
  if (attrs.reason != null) carry.reason = attrs.reason;
  var out = [];
  /* Form A: a declared damage type as a bare attribute — bashing="3". */
  var attrKeys = Object.keys(attrs);
  for (var t = 0; t < types.length; t++) {
    var dt = types[t];
    for (var k = 0; k < attrKeys.length; k++) {
      var key = attrKeys[k];
      if (key === "field" || key === "target" || key === "reason" || key === "damage" || key === "type") continue;
      var nk = normalizeFieldKey(key);
      if (nk !== normalizeFieldKey(dt.id) && nk !== normalizeFieldKey(dt.label)) continue;
      var n = parseInt(attrs[key], 10);
      if (isNaN(n)) continue; /* non-numeric — leave for the warn path */
      out.push(Object.assign({ field: dt.id, delta: (n >= 0 ? "+" + n : String(n)) }, carry));
    }
  }
  /* Form B: damage="N" type="<type>". */
  if (attrs.damage != null && attrs.type != null) {
    var typeNorm = normalizeFieldKey(String(attrs.type));
    for (var t2 = 0; t2 < types.length; t2++) {
      var dt2 = types[t2];
      if (typeNorm === normalizeFieldKey(dt2.id) || typeNorm === normalizeFieldKey(dt2.label)) {
        var n2 = parseInt(attrs.damage, 10);
        if (!isNaN(n2)) out.push(Object.assign({ field: dt2.id, delta: (n2 >= 0 ? "+" + n2 : String(n2)) }, carry));
        break;
      }
    }
  }
  return out.length ? out : [attrs];
}

/* Apply a parsed [mrr-state:] tag list with cross-transport dedup. Returns
   the count applied. Both the narrator DOM path and the runs poller route
   through here so a tag present in BOTH sources applies exactly once. The key
   is recorded before applying (idempotent under re-entrancy). */
function applyStateTagsWithDedup(tags, anchorId) {
  if (!tags || !tags.length) return 0;
  var occ = Object.create(null);
  var applied = 0;
  for (var i = 0; i < tags.length; i++) {
    /* Normalize BEFORE the signature so equivalent surface forms from
       different agents collide (see normalizeStateAttrs). */
    var normalized = normalizeStateAttrs(tags[i].attrs);
    for (var n = 0; n < normalized.length; n++) {
      var sig = mutationContentSig(normalized[n]);
      var idx = (occ[sig] = (occ[sig] || 0) + 1) - 1;
      var key = String(anchorId) + "::" + sig + "::" + idx;
      if (appliedMutationKeys[key]) continue; /* other transport already applied this exact mutation for this turn */
      appliedMutationKeys[key] = true;
      if (applyStateMutation(normalized[n])) applied++;
    }
  }
  return applied;
}

function loadProcessedMessageIds(chatId) {
  if (!chatId) { processedMessageIds = {}; processedMessageIdsChatId = null; appliedMutationKeys = Object.create(null); return; }
  if (processedMessageIdsChatId === chatId) return; /* already loaded */
  appliedMutationKeys = Object.create(null); /* new chat — clear cross-transport dedup so old-chat keys can't suppress new applies */
  var raw = lsGet(LS_PROCESSED_MSGS_PFX + chatId);
  var parsed = raw ? safeParse(raw) : null;
  processedMessageIds = (parsed && typeof parsed === "object") ? parsed : {};
  processedMessageIdsChatId = chatId;
}

function saveProcessedMessageIds() {
  if (!processedMessageIdsChatId) return;
  lsSet(LS_PROCESSED_MSGS_PFX + processedMessageIdsChatId, JSON.stringify(processedMessageIds));
}

/* ─── B2: swipe-aware processed-message keying ────────────────────────────
   A swiped assistant reply keeps the SAME data-message-id — Marinara's
   schema stores the active variant as messages.activeSwipeIndex on the one
   message row (alternate swipe content lives in a separate messageSwipes
   table), it never mints a new message id per swipe (confirmed against
   engine schema packages/server/src/db/schema/chats.ts:52, notNull default
   0). Plain-msgId keying therefore treats every swipe of one message as
   "the same message" and swallows swipe 1+'s [mrr-state:] tags once
   swipe 0 has applied. Swipe indices are not present in the DOM (the
   engine stamps only data-message-id), so they are looked up via
   GET /chats/:chatId/messages?limit=N (COUPLINGS.md row 15) — fetched
   ONLY when a tag-bearing candidate needs one, batched per "scan cycle"
   via a shared in-flight promise: any candidate that asks while a fetch
   is already in flight rides that same request/response instead of
   issuing its own, and the map is discarded (not cached, not persisted,
   not polled) the moment that fetch settles — the next candidate starts a
   fresh cycle. (Design: 07-15 plan §4.2 / 08-22 plan B2.)

   Keying rule (legacy-entry honor — no historical re-apply):
     isMessageProcessed(msgId, idx) = set[msgId] || set[msgId + ":" + idx]
   A plain msgId entry written before this upgrade keeps suppressing EVERY
   swipe of that message (swipe 0 and any later swipe) — an accepted
   trade-off: those are pre-upgrade historic messages, a brand-new swipe
   appearing on one of them is vanishingly rare, and re-applying an entire
   chat's mutation history on every legacy entry would be the worse
   failure. New writes always use the composite key when an index was
   discoverable this cycle; plain msgId otherwise (fetch failure, or the
   candidate fell outside the fetched recent-window). */
var mrrSwipeIndexFetchPromise = null; // shared per-cycle fetch; null whenever no fetch is in flight
var mrrSwipeIndexWarned = false;      // console.warn once per session on fetch failure (soft degradation — not the visible warn-strip, which is reserved for storage degradation)

function mrrProcessedKey(msgId, idx) {
  return (idx === null || idx === undefined) ? msgId : (msgId + ":" + idx);
}

function isMessageProcessed(msgId, idx) {
  if (processedMessageIds[msgId]) return true; /* legacy plain entry — suppresses every swipe, see trade-off above */
  if (idx === null || idx === undefined) return false;
  return !!processedMessageIds[msgId + ":" + idx];
}

/* Batched swipe-index lookup for the active chat. Coalesces concurrent
   callers onto ONE GET /chats/:chatId/messages?limit=50 (recent-window —
   tag-bearing candidates are, by construction, recent messages) through
   the loader's attributed apiFetch wrapper. Resolves to a plain object
   (msgId -> activeSwipeIndex) on success, or null on ANY failure (thrown/
   rejected fetch, or a non-array response body — marinara.apiFetch never
   checks HTTP status, so an error body arrives as a non-array) so callers
   fall back to plain-messageId keying for that cycle. */
function fetchSwipeIndexMap(chatId) {
  if (mrrSwipeIndexFetchPromise) return mrrSwipeIndexFetchPromise;
  mrrSwipeIndexFetchPromise = apiFetch("/chats/" + encodeURIComponent(chatId) + "/messages?limit=50")
    .then(function (rows) {
      if (!Array.isArray(rows)) return null;
      var map = Object.create(null);
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r && typeof r.id === "string" && typeof r.activeSwipeIndex === "number") {
          map[r.id] = r.activeSwipeIndex;
        }
      }
      return map;
    })
    .catch(function (e) {
      if (!mrrSwipeIndexWarned) {
        mrrSwipeIndexWarned = true;
        warn("swipe-index fetch failed (" + (e && e.message ? e.message : e) + ") — falling back to plain-messageId keying");
      }
      return null;
    })
    .then(function (result) {
      mrrSwipeIndexFetchPromise = null; /* cycle over — next candidate starts a fresh fetch; never cached beyond this */
      return result;
    });
  return mrrSwipeIndexFetchPromise;
}

/* Resolves to a swipe index (number) for msgId, or null when not
   discoverable this cycle (fetch failed, or msgId fell outside the
   fetched recent-window) — callers treat null as "use plain msgId". */
function resolveSwipeIndexForMessage(chatId, msgId) {
  return fetchSwipeIndexMap(chatId).then(function (map) {
    if (!map || !Object.prototype.hasOwnProperty.call(map, msgId)) return null;
    return map[msgId];
  });
}

function parseStateAttrs(attrStr) {
  var attrs = {};
  STATE_KV_RE.lastIndex = 0;
  var m;
  while ((m = STATE_KV_RE.exec(attrStr)) !== null) {
    attrs[m[1]] = (m[2] !== undefined) ? m[2] : m[3];
  }
  return attrs;
}

function parseStateTags(text) {
  var tags = [];
  if (!text || text.indexOf("[mrr-state:") === -1) return tags;
  STATE_TAG_RE.lastIndex = 0;
  var m;
  while ((m = STATE_TAG_RE.exec(text)) !== null) {
    var attrs = parseStateAttrs(m[1]);
    if (!attrs.field) continue;
    tags.push({ raw: m[0], attrs: attrs });
  }
  return tags;
}

/* Format a mutation tag's attrs as a {prefix, change, reason} triple for the
   toast UI. Numeric deltas show signed integers; conditions and inventory
   use +/- glyphs against the item or condition name. */
function formatMutationLabel(attrs) {
  var prefix, change;
  if (attrs.field === "conditions") {
    prefix = "Condition";
    change = attrs.add ? "+ " + attrs.add : (attrs.remove ? "− " + attrs.remove : "?");
  } else if (attrs.field === "inventory") {
    var q = parseInt(attrs.qty, 10); if (!q || q < 1) q = 1;
    prefix = "Inventory";
    change = attrs.add ? "+ " + q + "× " + attrs.add : (attrs.remove ? "− " + q + "× " + attrs.remove : "?");
  } else if (attrs.field === "backgrounds") {
    prefix = "Background";
    if (attrs.add) {
      var addRating = parseInt(attrs.rating, 10);
      change = "+ " + attrs.add + (isNaN(addRating) ? "" : " (" + addRating + ")");
    } else if (attrs.remove) {
      change = "− " + attrs.remove;
    } else if (attrs.name && attrs.delta != null) {
      var dBg = parseInt(attrs.delta, 10);
      if (isNaN(dBg)) dBg = 0;
      change = attrs.name + " " + (dBg >= 0 ? "+" : "") + dBg;
    } else {
      change = "?";
    }
  } else if (attrs.field === "intimacies") {
    prefix = "Intimacy";
    if (attrs.add) {
      change = "+ " + attrs.add + (attrs.degree ? " [" + attrs.degree + "]" : "");
    } else if (attrs.remove) {
      change = "− " + attrs.remove;
    } else if (attrs.text) {
      var bits = [];
      if (attrs.degree) bits.push(attrs.degree);
      if (attrs.kind) bits.push(attrs.kind);
      change = attrs.text + (bits.length ? " → " + bits.join(", ") : "");
    } else {
      change = "?";
    }
  } else {
    prefix = (attrs.field || "stat").toUpperCase();
    var d = parseInt(attrs.delta, 10);
    if (isNaN(d)) d = 0;
    change = (d >= 0 ? "+" : "") + d;
  }
  return { prefix: prefix, change: change, reason: attrs.reason || "" };
}

/* Top-right floating toast that confirms a state mutation just landed.
   Container is created once and reused. Each toast fades in, holds ~3.5s,
   fades out, removes itself. Multiple toasts queue vertically — useful
   when one assistant turn establishes several state changes. */
function showMutationToast(attrs) {
  var label = formatMutationLabel(attrs);
  var container = document.getElementById("mrr-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "mrr-toast-container";
    container.className = "mrr-toast-container";
    document.body.appendChild(container);
  }
  var toast = document.createElement("div");
  toast.className = "mrr-toast";
  var p = document.createElement("span"); p.className = "mrr-toast__prefix"; p.textContent = label.prefix;
  var c = document.createElement("span"); c.className = "mrr-toast__change"; c.textContent = label.change;
  toast.appendChild(p);
  toast.appendChild(c);
  if (label.reason) {
    var r = document.createElement("span"); r.className = "mrr-toast__reason"; r.textContent = label.reason;
    toast.appendChild(r);
  }
  container.appendChild(toast);
  setTimeout(function () { toast.classList.add("mrr-toast--visible"); }, 10);
  setTimeout(function () {
    toast.classList.remove("mrr-toast--visible");
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 320);
  }, 3500);
}

/* Normalize a field name for fuzzy matching. Lowercases and strips
   whitespace, underscores, and hyphens so "Peripheral Motes",
   "peripheralMotes", "peripheral_motes", and "peripheral-motes" all
   resolve to one canonical key. Used at lookup time only — the
   ruleset's schema keeps its canonical Title-Case names. */
function normalizeFieldKey(s) {
  return String(s == null ? "" : s).toLowerCase().replace(/[\s_\-]+/g, "");
}

/* Look up the max value for a sheet field on the active ruleset. For
   derived stats this prefers maxFormula (evaluated against the live
   stat context) and falls back to the static max. For attributes/skills
   the def's `max` field is used. Returns null if no max is declared,
   in which case the resolver applies only the floor (≥ 0). Lets a
   refresh tag like delta="+999" cap to the formula max instead of
   overflowing the bar. */
function resolvedFieldMax(map, key) {
  if (!state.ruleset) return null;
  var defs;
  if (map === "derived")    defs = state.ruleset.derivedStats;
  else if (map === "attributes") defs = state.ruleset.attributes;
  else if (map === "skills")     defs = state.ruleset.skills;
  if (!Array.isArray(defs)) return null;
  var def = null;
  for (var i = 0; i < defs.length; i++) {
    if (defs[i] && defs[i].name === key) { def = defs[i]; break; }
  }
  if (!def) return null;
  if (def.maxFormula) {
    var v = evalFormula(def.maxFormula, statContext());
    if (typeof v === "number" && isFinite(v) && v > 0) return Math.floor(v);
  }
  if (typeof def.max === "number") return def.max;
  return null;
}

/* Resolve an AI-emitted field name to a damage-type slot on a track-rendered
   derived stat. Lets state-mutator tags like field="bashing" / "lethal" /
   "aggravated" route to the active ruleset's typed health track without
   falling through to the generic numeric resolver. Returns
   {trackName, typeId, types} or null. */
/* Resolve an AI-emitted field name against the ruleset's label-valued
   states (ruleset.states[].name), exact then case/punctuation-normalized.
   Returns the state definition or null. Companion to resolveSheetField,
   which deliberately keeps to the NUMERIC families. */
function resolveRulesetState(field) {
  if (!state.ruleset || !Array.isArray(state.ruleset.states)) return null;
  var target = normalizeFieldKey(field);
  if (!target) return null;
  for (var i = 0; i < state.ruleset.states.length; i++) {
    var st = state.ruleset.states[i];
    if (st && typeof st.name === "string" && normalizeFieldKey(st.name) === target) return st;
  }
  return null;
}

function resolveDamageType(field) {
  if (!state.ruleset || !Array.isArray(state.ruleset.derivedStats)) return null;
  var target = normalizeFieldKey(field);
  if (!target) return null;
  for (var i = 0; i < state.ruleset.derivedStats.length; i++) {
    var d = state.ruleset.derivedStats[i];
    if (d.renderAs !== "track" || !Array.isArray(d.damageTypes)) continue;
    var types = damageTypesFor(d);
    for (var j = 0; j < types.length; j++) {
      var dt = types[j];
      if (normalizeFieldKey(dt.id) === target || normalizeFieldKey(dt.label) === target) {
        return { trackName: d.name, typeId: dt.id, types: types, derived: d };
      }
    }
  }
  return null;
}

/* Resolve an AI-emitted field name to a real key inside one of the
   sheet's typed numeric maps (derived / attributes / skills). Tries an
   exact-name match first (cheap, common case), then a normalized scan
   so variants from the agent prompt still hit the schema's canonical
   Title-Case key. Returns {map, key} or null if no map contains it. */
function resolveSheetField(sheet, field) {
  var maps = ["derived", "attributes", "skills"];
  var defsByMap = {
    derived:    (state.ruleset && state.ruleset.derivedStats) || [],
    attributes: (state.ruleset && state.ruleset.attributes)   || [],
    skills:     (state.ruleset && state.ruleset.skills)       || []
  };
  var i, m, keys, k;
  /* Pass 1: exact key match. The cheapest and most common path. */
  for (i = 0; i < maps.length; i++) {
    m = sheet[maps[i]];
    if (m && typeof m === "object" && Object.prototype.hasOwnProperty.call(m, field)) {
      return { map: maps[i], key: field };
    }
  }
  var target = normalizeFieldKey(field);
  if (!target) return null;
  /* Pass 2: case/punctuation-insensitive match against existing sheet keys. */
  for (i = 0; i < maps.length; i++) {
    m = sheet[maps[i]];
    if (!m || typeof m !== "object") continue;
    keys = Object.keys(m);
    for (k = 0; k < keys.length; k++) {
      if (normalizeFieldKey(keys[k]) === target) {
        return { map: maps[i], key: keys[k] };
      }
    }
  }
  /* Pass 3: ruleset-declared aliases. The LLM naturally emits short
     forms ("hp", "ac", "init", "STR"); the ruleset says which canonical
     stat each maps to via `aliases: [...]` on derivedStats / skills /
     attributes. Also auto-checks attribute `abbreviation` so "DEX"
     resolves to "Dexterity" without needing an explicit alias. */
  for (i = 0; i < maps.length; i++) {
    var defs = defsByMap[maps[i]];
    if (!Array.isArray(defs)) continue;
    for (var d = 0; d < defs.length; d++) {
      var def = defs[d];
      if (!def || typeof def.name !== "string") continue;
      var aliasKeys = [];
      if (Array.isArray(def.aliases)) aliasKeys = aliasKeys.concat(def.aliases);
      if (maps[i] === "attributes" && typeof def.abbreviation === "string") aliasKeys.push(def.abbreviation);
      var hit = false;
      for (var a = 0; a < aliasKeys.length; a++) {
        if (normalizeFieldKey(aliasKeys[a]) === target) { hit = true; break; }
      }
      if (!hit) continue;
      m = sheet[maps[i]];
      if (m && typeof m === "object") return { map: maps[i], key: def.name };
    }
  }
  return null;
}

/* Single finalizer for every successful applyStateMutation path:
   persist sheet -> re-render UI -> push to in-memory log -> show toast.
   Keeps the data write, the visual update, and the user-visible
   confirmation co-located in one place so they cannot drift. */
function finalizeMutation(attrs) {
  saveSheet(state.chatId, state.sheet);
  renderSheet();
  if (!Array.isArray(state.mutationLog)) state.mutationLog = [];
  state.mutationLog.push({
    timestamp: Date.now(),
    field: attrs.field,
    delta: attrs.delta,
    add: attrs.add,
    remove: attrs.remove,
    qty: attrs.qty,
    reason: attrs.reason
  });
  if (state.mutationLog.length > 20) state.mutationLog.shift();
  showMutationToast(attrs);
  return true;
}

function applyStateMutation(attrs) {
  if (!state.sheet || !state.ruleset) return false;
  var sheet = state.sheet;
  /* Phase 5 — alias-resolve display labels back to canonical field
     names. Without this, agents that read the snapshot may emit field=
     using the label they saw (e.g. "XP available to spend") and the
     parser stashes the write on sheet root with no visible effect. */
  var rawField = attrs.field;
  var lcField = (typeof rawField === "string") ? rawField.trim().toLowerCase() : "";
  var fieldAliases = {
    "xp available to spend": "xp",
    "xp available": "xp",
    "xp": "xp",
    "experience": "xp",
    "experience points": "xp",
    "total xp earned (lifetime)": "xp",
    "total xp earned": "xp",
    "total xp": "xp",
    "intimacy": "intimacies",
    "intimacies": "intimacies",
    "attune": "attunement",
    "attunement": "attunement",
    "attuned": "attunement",
    "invest": "investiture",
    "invested": "investiture",
    "investiture": "investiture",
    "commit": "commitment",
    "commitment": "commitment",
    "mote commitment": "commitment",
    "mote commit": "commitment"
  };
  if (lcField && fieldAliases[lcField] && fieldAliases[lcField] !== rawField) {
    log("state-mutator: alias-resolved field '" + rawField + "' to canonical '" + fieldAliases[lcField] + "'");
    attrs.field = fieldAliases[lcField];
  }
  /* XP-write recovery: bare value=N → current=N (or total=N if the
     original alias was a "total" label). The xp absolute branch requires
     current/level/next/total, not value. */
  if (attrs.field === "xp" && attrs.value != null
      && attrs.current == null && attrs.level == null
      && attrs.next == null && attrs.total == null
      && attrs.delta == null) {
    if (lcField && lcField.indexOf("total") !== -1) {
      attrs.total = attrs.value;
    } else {
      attrs.current = attrs.value;
    }
    log("state-mutator: xp value=" + attrs.value + " mapped to " +
        (lcField.indexOf("total") !== -1 ? "total" : "current"));
  }
  var field = attrs.field;

  if (field === "conditions") {
    if (!Array.isArray(sheet.conditions)) sheet.conditions = [];
    if (attrs.add) {
      if (sheet.conditions.indexOf(attrs.add) === -1) sheet.conditions.push(attrs.add);
    } else if (attrs.remove) {
      sheet.conditions = sheet.conditions.filter(function (c) { return c !== attrs.remove; });
    } else { return false; }
    return finalizeMutation(attrs);
  }

  if (field === "inventory") {
    if (!Array.isArray(sheet.inventory)) sheet.inventory = [];
    var qty = parseInt(attrs.qty, 10);
    if (!qty || qty < 1) qty = 1;
    /* Round-19 diagnostic: dump every parsed attr the agent emitted so we
       can confirm whether the agent is sending the extended dialog fields
       (slot/damage/attack_attr/etc.) or just the original 5. If only
       add/qty/reason show, the agent's promptTemplate hasn't been
       refreshed via the Import Agents flow. */
    log("state-mutator inventory attrs:", attrs);
    /* Commitment-field note: this branch creates / removes inventory
       rows only. Setting attuned / invested / moteCommitment / motePool
       on a newly-added item is NOT done here — the agent must emit a
       follow-up [mrr-state: field="attunement|investiture|commitment"
       item="<name>" ...] tag after the add. Routing those through their
       own branches preserves cap + exclusivity + pool-budget enforcement
       at one site instead of duplicating the rules across every path. */
    if (attrs.add) {
      var existing = null;
      for (var i = 0; i < sheet.inventory.length; i++) {
        if (sheet.inventory[i] && sheet.inventory[i].name === attrs.add) { existing = sheet.inventory[i]; break; }
      }
      if (existing) {
        /* Backfill pre-fix partial fields on the existing item, then let
           the agent enrich blank dialog fields via the optional tag
           attrs (slot, damage, etc.) before bumping quantity. */
        normalizeInventoryItem(existing, sheet.inventory.indexOf(existing));
        applyItemAttrs(existing, attrs);
        existing.quantity = (existing.quantity || 1) + qty;
      } else {
        /* Build the fresh item, apply optional dialog-field attrs FIRST
           (so a `slot="weapon"` tag auto-infers `category="equipment"`
           via the normalizer's slot-presence rule), then normalize to
           assign id and fill any remaining defaults. */
        var fresh = {
          id: "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 11),
          name: attrs.add,
          quantity: qty,
          description: attrs.reason || "",
          location: "on_person"
        };
        applyItemAttrs(fresh, attrs);
        normalizeInventoryItem(fresh, sheet.inventory.length);
        sheet.inventory.push(fresh);
      }
    } else if (attrs.remove) {
      for (var j = 0; j < sheet.inventory.length; j++) {
        if (sheet.inventory[j] && sheet.inventory[j].name === attrs.remove) {
          sheet.inventory[j].quantity = (sheet.inventory[j].quantity || 1) - qty;
          if (sheet.inventory[j].quantity <= 0) sheet.inventory.splice(j, 1);
          break;
        }
      }
    } else { return false; }
    return finalizeMutation(attrs);
  }

  /* Backgrounds / merits / feats — same data shape as the on-sheet section.
     Three modes: add (or upsert when name already exists with rating),
     remove (first match by lowercased name), and delta-by-name (apply
     a signed integer to an existing entry's value, clamped to the
     ruleset's declared backgrounds.min / .max). Symmetric with how
     conditions and inventory work — agent never has to know whether an
     entry exists; tag attempts the right thing for both. */
  if (field === "backgrounds") {
    if (!Array.isArray(sheet.backgrounds)) sheet.backgrounds = [];
    if (attrs.add) {
      var existingBg = null;
      for (var bgix = 0; bgix < sheet.backgrounds.length; bgix++) {
        var bgEntry = sheet.backgrounds[bgix];
        if (bgEntry && typeof bgEntry.name === "string" && bgEntry.name.toLowerCase() === String(attrs.add).toLowerCase()) {
          existingBg = bgEntry; break;
        }
      }
      if (existingBg) {
        var ratingNum = parseInt(attrs.rating, 10);
        if (!isNaN(ratingNum)) existingBg.value = ratingNum;
      } else {
        var newRating = parseInt(attrs.rating, 10);
        sheet.backgrounds.push({ name: String(attrs.add), value: isNaN(newRating) ? 0 : newRating });
      }
    } else if (attrs.remove) {
      var rem = String(attrs.remove).toLowerCase();
      var idxBg = -1;
      for (var bgi = 0; bgi < sheet.backgrounds.length; bgi++) {
        var bg = sheet.backgrounds[bgi];
        if (bg && typeof bg.name === "string" && bg.name.toLowerCase() === rem) { idxBg = bgi; break; }
      }
      if (idxBg === -1) {
        warn("state-mutator backgrounds: no match for '" + attrs.remove + "'");
        return false;
      }
      sheet.backgrounds.splice(idxBg, 1);
    } else if (attrs.name && attrs.delta != null) {
      var deltaBg = parseInt(attrs.delta, 10);
      if (isNaN(deltaBg)) return false;
      var matchBg = null;
      for (var bgj = 0; bgj < sheet.backgrounds.length; bgj++) {
        var bgm = sheet.backgrounds[bgj];
        if (bgm && typeof bgm.name === "string" && bgm.name.toLowerCase() === String(attrs.name).toLowerCase()) {
          matchBg = bgm; break;
        }
      }
      if (!matchBg) {
        warn("state-mutator backgrounds delta: no match for '" + attrs.name + "'");
        return false;
      }
      var bgMin = (state.ruleset.backgrounds && typeof state.ruleset.backgrounds.min === "number") ? state.ruleset.backgrounds.min : 0;
      var bgMax = (state.ruleset.backgrounds && typeof state.ruleset.backgrounds.max === "number") ? state.ruleset.backgrounds.max : 99;
      matchBg.value = Math.max(bgMin, Math.min(bgMax, (matchBg.value || 0) + deltaBg));
    } else { return false; }
    return finalizeMutation(attrs);
  }

  /* Intimacies — Exalted's narrative tie/principle list. Five modes:
     add (push new entry), remove (first text-match, lowercased), update
     degree by text (find then set), update kind by text (find then
     toggle/set). Defaults match the on-screen + Add path: kind="tie",
     degree="minor". Optional target landed when kind === "tie". */
  if (field === "intimacies") {
    if (!Array.isArray(sheet.intimacies)) sheet.intimacies = [];

    function findIntimacyByText(t) {
      if (typeof t !== "string" || !t) return null;
      var lc = t.toLowerCase();
      for (var ii = 0; ii < sheet.intimacies.length; ii++) {
        var ie = sheet.intimacies[ii];
        if (ie && typeof ie.text === "string" && ie.text.toLowerCase() === lc) return ie;
      }
      return null;
    }

    if (attrs.add) {
      var addText = String(attrs.add);
      var inKind = (attrs.kind === "principle") ? "principle" : "tie";
      var inDeg = (attrs.degree === "major" || attrs.degree === "defining") ? attrs.degree : "minor";
      var inTarget = (inKind === "tie" && typeof attrs.target === "string") ? attrs.target : "";
      var newEntry = normalizeIntimacy({
        id: generateIntimacyId(),
        kind: inKind,
        text: addText,
        degree: inDeg,
        target: inTarget
      }, sheet.intimacies.length);
      sheet.intimacies.push(newEntry);
    } else if (attrs.remove) {
      var removeMatch = findIntimacyByText(String(attrs.remove));
      if (!removeMatch) {
        warn("state-mutator intimacies: no match for '" + attrs.remove + "'");
        return false;
      }
      var rmIdx = sheet.intimacies.indexOf(removeMatch);
      if (rmIdx === -1) return false;
      sheet.intimacies.splice(rmIdx, 1);
    } else if (attrs.text && (attrs.degree || attrs.kind)) {
      var hit = findIntimacyByText(String(attrs.text));
      if (!hit) {
        warn("state-mutator intimacies update: no match for text '" + attrs.text + "'");
        return false;
      }
      if (attrs.degree === "minor" || attrs.degree === "major" || attrs.degree === "defining") {
        hit.degree = attrs.degree;
      }
      if (attrs.kind === "tie" || attrs.kind === "principle") {
        hit.kind = attrs.kind;
        if (hit.kind !== "tie") hit.target = "";
      }
      if (typeof attrs.target === "string" && hit.kind === "tie") {
        hit.target = attrs.target;
      }
    } else { return false; }
    return finalizeMutation(attrs);
  }

  /* XP — agent-side write-back for the formula and pool models. Two sub-
     modes: delta="+50" / delta="-25" for incremental XP awards (the
     workhorse for session-end "you earn N XP" narration), or absolute
     current/level/next/total for direct sets after milestone narration.
     Pool-style rulesets (Exalted, dice-pool resolution mode) bump both
     .current AND .total on positive deltas to mirror the +1 XP button
     on the sheet — earned XP increments lifetime total. Mixed delta+
     absolute is ambiguous and rejected. */
  if (field === "xp") {
    if (!sheet.xp) sheet.xp = { current: 0, level: 1, next: 0, total: 0 };
    var hasDelta = (attrs.delta != null);
    var hasAbsolute = (attrs.current != null || attrs.level != null || attrs.next != null || attrs.total != null);
    if (hasDelta && hasAbsolute) {
      warn("state-mutator xp: cannot combine delta with absolute current/level/next/total");
      return false;
    }
    if (hasDelta) {
      var xpDelta = parseInt(attrs.delta, 10);
      if (isNaN(xpDelta)) {
        warn("state-mutator xp: delta '" + attrs.delta + "' is not an integer");
        return false;
      }
      sheet.xp.current = Math.max(0, (sheet.xp.current || 0) + xpDelta);
      var poolMode = state.ruleset && state.ruleset.resolution && state.ruleset.resolution.mode === "dice-pool";
      if (poolMode && xpDelta > 0) {
        sheet.xp.total = Math.max(0, (sheet.xp.total || 0) + xpDelta);
      }
      return finalizeMutation(attrs);
    }
    if (hasAbsolute) {
      /* Validate every provided field upfront so a half-update doesn't
         leave the sheet in a mixed state. Negative absolute values are
         rejected — XP is non-negative by ruleset definition. */
      var setKeys = ["current", "level", "next", "total"];
      var pending = {};
      for (var sk = 0; sk < setKeys.length; sk++) {
        var key = setKeys[sk];
        if (attrs[key] == null) continue;
        var n = parseInt(attrs[key], 10);
        if (isNaN(n) || n < 0) {
          warn("state-mutator xp: " + key + " '" + attrs[key] + "' is not a non-negative integer");
          return false;
        }
        pending[key] = n;
      }
      Object.keys(pending).forEach(function (k) { sheet.xp[k] = pending[k]; });
      return finalizeMutation(attrs);
    }
    warn("state-mutator xp: must provide delta=N or absolute current/level/next/total");
    return false;
  }

  /* Attunement — D&D 5e cap-3 attune flag on a named inventory item.
     Cap is enforced from a recount of the inventory (excluding the
     target item, since re-attuning an already-attuned item must not
     reject itself). Exclusivity: an attuned item cannot also be
     invested or hold a mote commitment — those are different magic
     models and combining them is a tag bug. */
  if (field === "attunement") {
    if (!Array.isArray(sheet.inventory)) {
      warn("state-mutator attunement: no inventory on sheet");
      return false;
    }
    if (typeof attrs.item !== "string" || !attrs.item) {
      warn("state-mutator attunement: item name required");
      return false;
    }
    if (attrs.attuned !== "true" && attrs.attuned !== "false") {
      warn("state-mutator attunement: attuned must be 'true' or 'false', got '" + attrs.attuned + "'");
      return false;
    }
    var attLc = String(attrs.item).toLowerCase();
    var attTarget = null;
    for (var aix = 0; aix < sheet.inventory.length; aix++) {
      var aitem = sheet.inventory[aix];
      if (aitem && typeof aitem.name === "string" && aitem.name.toLowerCase() === attLc) {
        attTarget = aitem;
        break;
      }
    }
    if (!attTarget) {
      warn("state-mutator attunement: no item matches '" + attrs.item + "'");
      return false;
    }
    var wantA = (attrs.attuned === "true");
    if (wantA) {
      if (attTarget.invested === true || (typeof attTarget.moteCommitment === "number" && attTarget.moteCommitment > 0)) {
        warn("state-mutator attunement: '" + attTarget.name + "' has invested/mote commitment — exclusive with attuned");
        return false;
      }
      var aInUse = 0;
      for (var aci = 0; aci < sheet.inventory.length; aci++) {
        var ao = sheet.inventory[aci];
        if (!ao || ao === attTarget) continue;
        if (ao.attuned) aInUse += 1;
      }
      if (aInUse >= 3) {
        warn("state-mutator attunement: cap of 3 reached, cannot attune '" + attTarget.name + "'");
        return false;
      }
    }
    attTarget.attuned = wantA;
    /* Recompute and store the cache for legacy consumers; the snapshot
       path now ignores this field but keeping it consistent costs nothing. */
    var newAc = 0;
    for (var aco = 0; aco < sheet.inventory.length; aco++) {
      if (sheet.inventory[aco] && sheet.inventory[aco].attuned) newAc += 1;
    }
    sheet.attunedCount = newAc;
    return finalizeMutation(attrs);
  }

  /* Investiture — PF2e cap-10 invested flag. Same shape as attunement
     with a higher cap and a different field name. Exclusivity: an
     invested item cannot also be attuned or hold a mote commitment. */
  if (field === "investiture") {
    if (!Array.isArray(sheet.inventory)) {
      warn("state-mutator investiture: no inventory on sheet");
      return false;
    }
    if (typeof attrs.item !== "string" || !attrs.item) {
      warn("state-mutator investiture: item name required");
      return false;
    }
    if (attrs.invested !== "true" && attrs.invested !== "false") {
      warn("state-mutator investiture: invested must be 'true' or 'false', got '" + attrs.invested + "'");
      return false;
    }
    var iLc = String(attrs.item).toLowerCase();
    var iTarget = null;
    for (var iix = 0; iix < sheet.inventory.length; iix++) {
      var iitem = sheet.inventory[iix];
      if (iitem && typeof iitem.name === "string" && iitem.name.toLowerCase() === iLc) {
        iTarget = iitem;
        break;
      }
    }
    if (!iTarget) {
      warn("state-mutator investiture: no item matches '" + attrs.item + "'");
      return false;
    }
    var wantI = (attrs.invested === "true");
    if (wantI) {
      if (iTarget.attuned === true || (typeof iTarget.moteCommitment === "number" && iTarget.moteCommitment > 0)) {
        warn("state-mutator investiture: '" + iTarget.name + "' has attuned/mote commitment — exclusive with invested");
        return false;
      }
      var iInUse = 0;
      for (var ici = 0; ici < sheet.inventory.length; ici++) {
        var io = sheet.inventory[ici];
        if (!io || io === iTarget) continue;
        if (io.invested) iInUse += 1;
      }
      if (iInUse >= 10) {
        warn("state-mutator investiture: cap of 10 reached, cannot invest '" + iTarget.name + "'");
        return false;
      }
    }
    iTarget.invested = wantI;
    var newIc = 0;
    for (var ico = 0; ico < sheet.inventory.length; ico++) {
      if (sheet.inventory[ico] && sheet.inventory[ico].invested) newIc += 1;
    }
    sheet.investedCount = newIc;
    return finalizeMutation(attrs);
  }

  /* Mote commitment — Exalted's "lock motes for the duration this item
     is active." Two operating modes: set (motes > 0) and uncommit
     (motes = 0). Pool change at non-zero motes restores the old commit
     to the old pool first, then debits the new commit from the new
     pool — atomic so a failed second leg leaves the sheet unchanged.
     Exclusivity: an item with moteCommitment > 0 cannot be attuned or
     invested. The pool-floor check refuses negative pools (i.e., would
     commit more motes than the player has). */
  if (field === "commitment") {
    if (!Array.isArray(sheet.inventory)) {
      warn("state-mutator commitment: no inventory on sheet");
      return false;
    }
    if (typeof attrs.item !== "string" || !attrs.item) {
      warn("state-mutator commitment: item name required");
      return false;
    }
    var mNew = parseInt(attrs.motes, 10);
    if (isNaN(mNew) || mNew < 0) {
      warn("state-mutator commitment: motes '" + attrs.motes + "' must be a non-negative integer");
      return false;
    }
    var mLc = String(attrs.item).toLowerCase();
    var mTarget = null;
    for (var mix = 0; mix < sheet.inventory.length; mix++) {
      var mitem = sheet.inventory[mix];
      if (mitem && typeof mitem.name === "string" && mitem.name.toLowerCase() === mLc) {
        mTarget = mitem;
        break;
      }
    }
    if (!mTarget) {
      warn("state-mutator commitment: no item matches '" + attrs.item + "'");
      return false;
    }
    if (mNew > 0) {
      if (mTarget.attuned === true || mTarget.invested === true) {
        warn("state-mutator commitment: '" + mTarget.name + "' has attuned/invested — exclusive with mote commitment");
        return false;
      }
    }
    /* Resolve target pool. Default to existing item.motePool, fall back
       to "Personal" if neither is supplied or valid. item.motePool stores
       the short form ("Personal" / "Peripheral"); the derived-stat key
       on sheet.derived is the full ruleset name with " Motes" suffix. */
    var newPool = attrs.pool;
    if (newPool !== "Personal" && newPool !== "Peripheral") {
      if (mTarget.motePool === "Personal" || mTarget.motePool === "Peripheral") newPool = mTarget.motePool;
      else newPool = "Personal";
    }
    var oldPool = (mTarget.motePool === "Peripheral") ? "Peripheral" : "Personal";
    var oldPoolKey = oldPool + " Motes";
    var newPoolKey = newPool + " Motes";
    var oldMotes = (typeof mTarget.moteCommitment === "number" && mTarget.moteCommitment > 0) ? mTarget.moteCommitment : 0;
    /* Defensive read of derived. If a pool key isn't on derived (ruleset
       config issue, not an agent bug), treat its current value as 0
       and proceed — the negative-floor check will catch nonsense
       commits, and a log line surfaces the config gap. */
    if (!sheet.derived) sheet.derived = {};
    if (typeof sheet.derived[oldPoolKey] !== "number") {
      log("state-mutator commitment: derived[" + oldPoolKey + "] missing — treating as 0");
      sheet.derived[oldPoolKey] = 0;
    }
    if (typeof sheet.derived[newPoolKey] !== "number") {
      log("state-mutator commitment: derived[" + newPoolKey + "] missing — treating as 0");
      sheet.derived[newPoolKey] = 0;
    }
    /* Compute the post-mutation pool values without mutating sheet yet,
       so a negative-floor check can roll back atomically — the
       restore-old-pool and debit-new-pool legs are linked. */
    var simOld = sheet.derived[oldPoolKey] + oldMotes;
    var simNew = (oldPoolKey === newPoolKey ? simOld : sheet.derived[newPoolKey]) - mNew;
    if (simNew < 0) {
      warn("state-mutator commitment: would deplete " + newPoolKey + " pool below 0 (need " + mNew + ", have " + (oldPoolKey === newPoolKey ? simOld : sheet.derived[newPoolKey]) + ")");
      return false;
    }
    if (oldPoolKey === newPoolKey) {
      sheet.derived[oldPoolKey] = simNew;
    } else {
      sheet.derived[oldPoolKey] = simOld;
      sheet.derived[newPoolKey] = simNew;
    }
    mTarget.moteCommitment = mNew;
    mTarget.motePool = newPool;
    return finalizeMutation(attrs);
  }

  /* Numeric path. Resolve the field against the sheet's typed numeric
     maps (derived / attributes / skills). Exact match first, normalized
     fallback so AI-emitted variants ("hp" / "HP", "peripheralMotes" /
     "Peripheral Motes") still hit the canonical Title-Case key the
     ruleset declared.
     Phase 5 — supports BOTH delta="+N" (incremental) AND absolute writes
     via current=N / value=N / set=N (e.g. agent doing a full pool
     refresh after a "rest" / "recover all motes" narration). Without
     the absolute path, the agent's pool-reset to max-values silently
     no-ops because the function used to require delta and rejected. */
  /* States path — label-valued enum stats declared in ruleset.states
     (Exalted's Anima Banner, V20's Frenzy, W20's forms). Found live
     2026-08-22: the resolver only searched derived/attributes/skills,
     so state writes warned "unmatched field" and stashed dead data on
     the sheet root. States are SET BY LABEL (value="Dim"), never by
     delta — the label must match one of the state's declared values
     (case-insensitive); anything else warns with the valid list so the
     model can self-correct on the next turn's context. */
  var stateDef = resolveRulesetState(field);
  if (stateDef) {
    var rawStateVal = (attrs.value != null) ? attrs.value
                    : (attrs.set   != null) ? attrs.set
                    : attrs.current;
    var stateLabels = (stateDef.values || []).map(function (v) { return v.label; });
    if (rawStateVal == null) {
      warn("state-mutator: state '" + stateDef.name + "' is set by label, not delta — use value=\"<label>\"; valid: " + stateLabels.join(", "));
      return false;
    }
    var canonicalLabel = null;
    var nsv = String(rawStateVal).trim().toLowerCase();
    for (var sl = 0; sl < stateLabels.length; sl++) {
      if (String(stateLabels[sl]).trim().toLowerCase() === nsv) { canonicalLabel = stateLabels[sl]; break; }
    }
    if (canonicalLabel == null) {
      warn("state-mutator: state '" + stateDef.name + "' has no label matching '" + rawStateVal + "' — valid: " + stateLabels.join(", "));
      return false;
    }
    if (!sheet.states || typeof sheet.states !== "object") sheet.states = {};
    sheet.states[stateDef.name] = canonicalLabel;
    return finalizeMutation(attrs);
  }

  var hasDelta = (attrs.delta != null);
  var hasAbsolute = (attrs.current != null || attrs.value != null || attrs.set != null);
  if (!hasDelta && !hasAbsolute) {
    /* Loud, not silent — observed live 2026-08-22: track-shaped tags
       with neither delta nor value were dropped with zero console
       evidence ("applied 0/3" and nothing else to go on). */
    warn("state-mutator: no delta/value/current/set in tag for field '" + field + "' — dropped: " + mutationContentSig(attrs));
    return false;
  }
  var delta = 0;
  var absoluteValue = null;
  if (hasDelta) {
    delta = parseInt(attrs.delta, 10);
    if (isNaN(delta)) {
      warn("state-mutator: delta '" + attrs.delta + "' for field '" + field + "' is not an integer — dropped");
      return false;
    }
  }
  if (hasAbsolute) {
    var rawAbs = (attrs.current != null) ? attrs.current
               : (attrs.value   != null) ? attrs.value
               : attrs.set;
    absoluteValue = parseInt(rawAbs, 10);
    if (isNaN(absoluteValue)) {
      warn("state-mutator: value '" + rawAbs + "' for field '" + field + "' is not an integer — dropped (label-valued stats must be declared in ruleset.states)");
      return false;
    }
  }

  /* Typed-damage path. If the field names a damage type declared on a
     track-renderAs derived stat (Exalted bashing/lethal/aggravated),
     mutate that type — but write to the Phase-4 per-cell state (cells
     array) rather than the legacy typed-counter, since the renderer
     reads cells. New entries fill empty cells from left; removals
     clear rightmost cells of that type first to preserve the user's
     most-escalated cells. syncTrackCellsToTyped keeps the legacy
     typed-counter in sync downstream. */
  var dmg = resolveDamageType(field);
  if (dmg) {
    var derivedObj = dmg.derived;
    var rulesetCellCount = Array.isArray(derivedObj.track) ? derivedObj.track.length : 0;
    var extraCellCount = (sheet.extraTrack && Array.isArray(sheet.extraTrack[dmg.trackName]))
      ? sheet.extraTrack[dmg.trackName].length : 0;
    var totalLen = rulesetCellCount + extraCellCount;
    if (totalLen <= 0) {
      log("state-mutator typed-damage: derived '" + dmg.trackName + "' has no cells declared");
      return false;
    }
    var cells = ensureTrackCells(derivedObj, totalLen);
    var typeForLabel = null;
    for (var ti = 0; ti < dmg.types.length; ti++) {
      if (dmg.types[ti].id === dmg.typeId) { typeForLabel = dmg.types[ti]; break; }
    }
    if (!typeForLabel) return false;
    var label = typeForLabel.label;
    /* Count current cells of this type. */
    var currentCount = 0;
    for (var cci = 0; cci < cells.length; cci++) {
      if (cells[cci] === label) currentCount += 1;
    }
    var targetCount = hasAbsolute ? absoluteValue : (currentCount + delta);
    if (targetCount < 0) targetCount = 0;
    var diff = targetCount - currentCount;
    if (diff > 0) {
      /* Add `diff` cells of this type, filling empty cells left-to-right. */
      for (var ai = 0; ai < cells.length && diff > 0; ai++) {
        if (cells[ai] == null) {
          cells[ai] = label;
          diff -= 1;
        }
      }
      /* If track is full, the overflow is silently dropped (matches the
         classic typed-counter overflow semantics — tracked but unrendered). */
    } else if (diff < 0) {
      /* Remove |diff| cells of this type, rightmost first. */
      var toRemove = -diff;
      for (var ri = cells.length - 1; ri >= 0 && toRemove > 0; ri--) {
        if (cells[ri] === label) {
          cells[ri] = null;
          toRemove -= 1;
        }
      }
    }
    /* Sync typed-counter from cells so the snapshot + classic renderer
       see the new totals on the post-mutation render. */
    syncTrackCellsToTyped(derivedObj);
    return finalizeMutation(attrs);
  }

  var resolved = resolveSheetField(sheet, field);
  if (resolved) {
    var bucket = sheet[resolved.map];
    var current = (typeof bucket[resolved.key] === "number") ? bucket[resolved.key] : 0;
    var max = resolvedFieldMax(resolved.map, resolved.key);
    var next = hasAbsolute ? absoluteValue : (current + delta);
    if (typeof max === "number") next = Math.min(max, next);
    bucket[resolved.key] = Math.max(0, next);
    return finalizeMutation(attrs);
  }
  /* Unknown field — stash on the sheet root as a generic numeric so
     ad-hoc ruleset stats still apply without prior schema awareness.
     Supports dotted paths ("deathSaves.failures") so the LLM can build
     out structured state (D&D death saves, exhaustion levels, custom
     trackers) that future schema updates can adopt formally. Warn so
     unmatched variants are visible during ruleset bring-up. */
  warn("state-mutator: unmatched field '" + field + "' — stashed on sheet" + (field.indexOf(".") !== -1 ? " (nested path)" : " root"));
  var pathParts = String(field).split(".").filter(function (p) { return p.length > 0; });
  if (!pathParts.length) return false;
  var node = sheet;
  for (var p = 0; p < pathParts.length - 1; p++) {
    var seg = pathParts[p];
    if (!node[seg] || typeof node[seg] !== "object" || Array.isArray(node[seg])) node[seg] = {};
    node = node[seg];
  }
  var leaf = pathParts[pathParts.length - 1];
  var rootCurrent = (typeof node[leaf] === "number") ? node[leaf] : 0;
  node[leaf] = hasAbsolute ? Math.max(0, absoluteValue) : Math.max(0, rootCurrent + delta);
  return finalizeMutation(attrs);
}

function hideStateTagsInElement(node) {
  if (!node || !node.innerHTML) return;
  var html = node.innerHTML;
  if (html.indexOf("[mrr-state:") === -1) return;
  if (html.indexOf("mrr-state-tag") !== -1) return; /* already wrapped */
  var wrapped = html.replace(/\[mrr-state:\s+[^\]]+\]/g, function (m) {
    var safe = m.replace(/[&<>"']/g, function (c) {
      return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c];
    });
    return '<span class="mrr-state-tag">' + safe + '</span>';
  });
  if (wrapped !== html) node.innerHTML = wrapped;
}

function processChatMessage(node) {
  if (!node || !node.getAttribute) return;
  var msgId = node.getAttribute("data-message-id");
  if (!msgId) return;
  /* Only assistant messages emit state tags. User messages and narrator
     messages can be skipped entirely. */
  if (!node.classList || !node.classList.contains("mari-message-assistant")) return;

  var text = node.textContent || "";
  if (text.indexOf("[mrr-state:") === -1) return;

  /* Fast path: a legacy plain-msgId entry already suppresses every swipe of
     this message (isMessageProcessed's trade-off) — skip the swipe-index
     fetch entirely when it already applies, so the batched lookup only
     ever fires for candidates that genuinely need it. */
  if (!isMessageProcessed(msgId, null)) {
    var scanChatId = state.chatId;
    resolveSwipeIndexForMessage(scanChatId, msgId).then(function (idx) {
      if (state.chatId !== scanChatId) return; /* chat switched mid-fetch — stale, ignore */
      if (isMessageProcessed(msgId, idx)) return; /* composite entry already applied (re-entrant observation) */
      var tags = parseStateTags(text);
      var key = mrrProcessedKey(msgId, idx);
      /* Route through the shared cross-transport dedup keyed by this
         message+swipe. The outer processedMessageIds gate still governs
         whole-message(+swipe) reprocessing; the helper additionally lets
         the runs poller skip any tag the narrator already applied for this
         same turn. Even if two observations of the same message+swipe race
         each other past the isMessageProcessed check above (e.g. a new DOM
         mutation re-schedules while a prior fetch is still in flight), the
         inner dedup below still applies each mutation exactly once. */
      var applied = applyStateTagsWithDedup(tags, key);
      processedMessageIds[key] = true;
      saveProcessedMessageIds();
      log("state-mutator: applied " + applied + "/" + tags.length + " mutation(s) from message " + key);
    });
  }
  /* Visual hiding runs every observation — Marinara may re-render the
     message and unwrap our spans; we re-wrap on next mutation. */
  hideStateTagsInElement(node);
}

/* ─── Custom-agent run capture (B1 replacement for the dead console sniff) ───
   The State Mutator overlay agent emits [mrr-state: ...] tags whose text is
   consumed only as next-turn prompt context for the narrator; it never lands
   in chat DOM, so processChatMessage above never sees it. The old approach
   monkey-patched console.log to sniff the engine's "[Agent] ... State Mutator"
   completion line — but that line is console.warn, debug-gated, and prod-
   stripped since engine v1.4.0, so it has never fired on any 2.0.x+ build
   (impact review B1). The sanctioned source is the REST endpoint
   GET /agents/runs/:chatId/custom — persisted successful custom-agent runs,
   present since engine v1.5.7 (no version floor). We poll it from the existing
   route-poll loop and route parsed tags through the SAME cross-transport dedup
   (applyStateTagsWithDedup) as the narrator path, so a tag arriving via BOTH
   the narrator DOM and an agent run applies exactly once.

   Gated by MRR_RUNS_POLLER_MODE (see top of file) so a second live state-
   writer is never activated blind: "off" is inert (today's narrator-only
   behavior); "dump" logs one raw run row and applies nothing (used at the
   smoke test to confirm a run row's messageId maps to the narrator's
   data-message-id); "apply" is the full transport. */

var processedRunIds = Object.create(null);
var processedRunIdsChatId = null;
var runsPollInFlight = false;
var runsPollDumpedOnce = false;
/* False until this chat has a persisted processed-runs record. Gates the
   first-activation baseline seed in pollCustomAgentRuns — without it, the
   first apply-mode poll on a pre-existing chat sweeps the ENTIRE run
   backlog in one pass (observed live 2026-08-22: 15 historical tags
   applied at once, Peripheral 47 → 7 instead of 47 → 42). */
var runsBaselineExists = false;

function loadProcessedRunIds(chatId) {
  if (!chatId) { processedRunIds = Object.create(null); processedRunIdsChatId = null; runsBaselineExists = false; return; }
  if (processedRunIdsChatId === chatId) return; /* already loaded */
  var raw = lsGet(LS_PROCESSED_RUNS_PFX + chatId);
  var parsed = raw ? safeParse(raw) : null;
  processedRunIds = (parsed && typeof parsed === "object") ? parsed : Object.create(null);
  processedRunIdsChatId = chatId;
  runsBaselineExists = (parsed !== null && typeof parsed === "object");
}

function saveProcessedRunIds() {
  if (!processedRunIdsChatId) return;
  lsSet(LS_PROCESSED_RUNS_PFX + processedRunIdsChatId, JSON.stringify(processedRunIds));
}

/* Defensive field extraction — the exact run-row shape is confirmed at the
   smoke's "dump" stage, so probe the likely output fields without throwing. */
function extractRunText(row) {
  if (!row || typeof row !== "object") return "";
  /* Live shape CONFIRMED at the 2026-08-22 dump stage (engine 2.4.3):
     run rows carry { resultType: "context_injection", resultData: { text } }.
     resultData.text leads; the original speculative candidates stay as
     fallbacks for older/newer engine shapes. */
  var candidates = [
    (row.resultData && row.resultData.text),
    row.output, row.text, row.result, row.data,
    (row.output && row.output.text), (row.result && row.result.text)
  ];
  for (var i = 0; i < candidates.length; i++) {
    if (typeof candidates[i] === "string" && candidates[i].indexOf("[mrr-state:") !== -1) return candidates[i];
  }
  try {
    var s = JSON.stringify(row);
    if (s.indexOf("[mrr-state:") !== -1) return s; /* fallback: scan whole row; dump stage reveals the real field */
  } catch (e) { /* circular / unstringifiable — ignore */ }
  return "";
}

function extractRunId(row) {
  return (row && (row.id || row.runId || row._id)) || null;
}

function extractRunAnchor(row, fallbackId) {
  /* The turn anchor must equal the narrator's data-message-id for cross-
     transport dedup to collide. Confirmed at the dump stage. Fall back to a
     run-unique id so a missing messageId can't collide across unrelated runs. */
  var mid = row && (row.messageId || row.message_id || (row.message && row.message.id));
  return mid || ("run:" + fallbackId);
}

function pollCustomAgentRuns(chatId) {
  if (MRR_RUNS_POLLER_MODE === "off") return;
  if (!chatId || runsPollInFlight) return;
  runsPollInFlight = true;
  loadProcessedRunIds(chatId);
  apiFetch("/agents/runs/" + encodeURIComponent(chatId) + "/custom?limit=50").then(function (rows) {
    /* marinara.apiFetch does not check status (returns res.json() always), so
       a 404/error body arrives as a non-array — degrade silently. */
    if (!Array.isArray(rows)) return;
    if (MRR_RUNS_POLLER_MODE === "dump") {
      if (!runsPollDumpedOnce && rows.length) {
        runsPollDumpedOnce = true;
        log("runs-poller DUMP — inspect this row's output + messageId fields, confirm messageId matches the narrator data-message-id, then set MRR_RUNS_POLLER_MODE='apply': " + JSON.stringify(rows[0]));
      }
      return; /* dump mode applies NOTHING */
    }
    if (!runsBaselineExists) {
      /* First poller activation on this chat: every run already visible
         predates the poller, so applying them would replay an entire
         session's mutations in one sweep. Seed them as processed and
         apply nothing — only runs created AFTER this baseline apply. */
      for (var s = 0; s < rows.length; s++) {
        var seedId = extractRunId(rows[s]);
        if (seedId != null) processedRunIds[seedId] = true;
      }
      runsBaselineExists = true;
      saveProcessedRunIds();
      log("runs-poller: baseline seeded — " + rows.length + " pre-existing run(s) marked processed, none applied");
      return;
    }
    var total = 0, applied = 0, sawNew = false;
    for (var i = 0; i < rows.length; i++) {
      var runId = extractRunId(rows[i]);
      if (runId != null && processedRunIds[runId]) continue;
      var text = extractRunText(rows[i]);
      var tags = text ? parseStateTags(text) : [];
      if (tags.length) {
        applied += applyStateTagsWithDedup(tags, extractRunAnchor(rows[i], runId));
        total += tags.length;
      }
      if (runId != null) { processedRunIds[runId] = true; sawNew = true; }
    }
    if (sawNew) saveProcessedRunIds();
    if (total) log("runs-poller: applied " + applied + "/" + total + " mutation(s) from custom-agent runs");
  }).catch(function (e) {
    warn("runs-poller: /agents/runs fetch failed (" + (e && e.message ? e.message : e) + ") — degrading; narrator path unaffected");
  }).then(function () { runsPollInFlight = false; }, function () { runsPollInFlight = false; });
}

function watchChatMessages() {
  /* Marinara streams tokens as the model generates, so the same message
     element keeps mutating. Debounce per-message-id by ~1.5s so we only
     parse tags once the message is stable, not mid-stream. Uses
     marinara.setTimeout (auto-cleans on extension disable) plus a
     monotonic-token cancel pattern instead of raw setTimeout/clearTimeout
     so pending parses cannot fire after the extension is disabled. */
  var pendingTokens = Object.create(null);
  var nextToken = 0;
  function findParentMessage(el) {
    while (el && el.nodeType === 1) {
      if (el.hasAttribute && el.hasAttribute("data-message-id")) return el;
      el = el.parentElement;
    }
    return null;
  }
  function schedule(msgEl) {
    if (!msgEl || !msgEl.getAttribute) return;
    var msgId = msgEl.getAttribute("data-message-id");
    if (!msgId) return;
    var myToken = ++nextToken;
    pendingTokens[msgId] = myToken;
    marinara.setTimeout(function () {
      if (pendingTokens[msgId] !== myToken) return; /* superseded by newer schedule */
      delete pendingTokens[msgId];
      processChatMessage(msgEl);
    }, 1500);
  }

  var obs = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var rec = records[i];
      var msg = findParentMessage(rec.target);
      if (msg) schedule(msg);
      for (var j = 0; j < rec.addedNodes.length; j++) {
        var n = rec.addedNodes[j];
        if (!n || n.nodeType !== 1) continue;
        if (n.hasAttribute && n.hasAttribute("data-message-id")) schedule(n);
        if (n.querySelectorAll) {
          var msgs = n.querySelectorAll("[data-message-id]");
          for (var k = 0; k < msgs.length; k++) schedule(msgs[k]);
        }
      }
    }
  });
  /* Observer scope: document.body kept for resilience to DOM restructure
     (Marinara's React tree re-mounts the chat pane on route change), but
     characterData=true dropped per the skill's "heavy observers" pitfall
     — was firing on every keystroke in any input field. New messages and
     streaming chunks arrive as childList mutations on the message
     container, which characterData isn't needed for. */
  obs.observe(document.body, { childList: true, subtree: true });
  marinara.onCleanup(function () { obs.disconnect(); });

  /* Initial DOM sweep at extension load. Two paths:
     (1) Messages whose ids ARE in the persisted processed set: silently
         re-wrap their tag spans for visual hiding; do NOT re-apply
         mutations (those have already landed on the sheet).
     (2) Messages whose ids are NOT in the persisted set: schedule them
         normally so any genuinely-new tags from a prior session that
         never finished processing still apply once.
     Without this gate, every hard refresh would replay the entire chat's
     mutation history and double-apply every historic delta. */
  loadProcessedMessageIds(state.chatId);
  var existing = document.querySelectorAll("[data-message-id]");
  for (var x = 0; x < existing.length; x++) {
    var el = existing[x];
    var mid = el.getAttribute("data-message-id");
    if (mid && processedMessageIds[mid]) {
      hideStateTagsInElement(el);
    } else {
      schedule(el);
    }
  }
}

function init() {
  /* Inject the embedded CSS once. init() can fire multiple times across
     a Marinara session (chat switches, route changes), so guard against
     duplicate <style> elements piling up in document.head. The marinara
     extension API's auto-cleanup runs on extension disable, not on each
     init pass — so we manage this <style> directly with a stable id. */
  if (EMBEDDED_CSS && !document.getElementById(EMBED_STYLE_ID)) {
    var s = document.createElement("style");
    s.id = EMBED_STYLE_ID;
    s.textContent = EMBEDDED_CSS;
    document.head.appendChild(s);
  } else if (!EMBEDDED_CSS) {
    warn("EMBEDDED_CSS is empty — run `npm run embed-css` to inline the stylesheet.");
  }

  var rs = loadRuleset();
  buildHeaderGear();
  if (!rs) {
    warn("no active ruleset; extension is dormant. Click the Ruleset button to configure.");
    return;
  }
  state.ruleset = rs;
  /* Seed the library with the currently active ruleset on first run after
     the library feature ships, so users who already had a ruleset configured
     see it in the Library list immediately. */
  addToLibrary(rs);
  state.chatId  = getChatId();
  migrateLegacySheet(state.chatId);
  state.characters = loadCharacters(state.chatId);
  state.activeCharacterId = loadActiveCharacterId(state.chatId, state.characters[0].id);
  if (!state.characters.some(function (c) { return c.id === state.activeCharacterId; })) {
    state.activeCharacterId = state.characters[0].id;
    saveActiveCharacterId();
  }
  state.sheet = loadSheet(state.chatId, rs);
  renderSheet();
  state.collapsed = loadCollapsedPref(state.chatId);
  buildHeaderToggle();
  applyCollapsed(state.collapsed);
  buildDice();
  watchRouteChanges();
  watchLifecycleSaves();
  watchChatMessages();
  exposeDebug();
  log("activated ruleset " + rs.id + " v" + rs.version + " on chat " + (state.chatId || "(none)") + " as " + state.activeCharacterId);
  /* Initial sync to chat customTrackerFields so the overlay agents see
     current sheet state on the very first generation after activation,
     not just after the user's first edit. Debounced via the same path
     as saveSheet so multiple activations on a fast SPA route change
     coalesce into one PATCH. */
  if (typeof scheduleAutoSync === "function") scheduleAutoSync();
  /* Add this ruleset's overlay agents to the current chat's active list so the engine actually fires them. No-op on subsequent loads once the chat has them. */
  if (typeof reconcileActiveAgents === "function") reconcileActiveAgents();
}

/* Console-callable diagnostics. Open DevTools and run:
     mrrDebug.dump()        // list every mrr-* localStorage key with size
     mrrDebug.state()       // full state object
     mrrDebug.read("KEY")   // pretty-printed JSON for any mrr-* key
     mrrDebug.forceSave()   // explicit save trigger
   These bypass the extension's normal flow so you can verify what
   localStorage actually contains. Useful when "saves aren't working"
   to pinpoint whether saveSheet ran, ran with the wrong key, or ran
   correctly but loadSheet is reading the wrong key. */
function exposeDebug() {
  window.mrrDebug = {
    state: function () { return state; },
    dump: function () {
      var rows = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("mrr-") === 0) {
          var v = localStorage.getItem(k);
          rows.push({ key: k, bytes: v ? v.length : 0 });
        }
      }
      console.table(rows);
      return rows;
    },
    read: function (key) {
      var v = lsGet(key);
      if (!v) return null;
      try { return JSON.parse(v); } catch (e) { return v; }
    },
    forceSave: function () { flushSave(); return "saved"; }
  };
}

/* Marinara is a state-driven SPA — the URL doesn't change between chats.
   Poll Marinara's own active-chat localStorage key instead so we detect
   chat switches AND the case where the chat id wasn't yet set when our
   extension first ran (Marinara's init order vs ours). */
function watchRouteChanges() {
  var lastSeenChatId = state.chatId;
  marinara.setInterval(function () {
    /* B1 replacement: poll custom-agent runs for the ACTIVE chat every tick
       (not just on chat change) so new State Mutator output within a chat is
       caught. pollCustomAgentRuns returns immediately when the poller mode is
       "off" — zero fetch, zero localStorage, no side effects. */
    pollCustomAgentRuns(state.chatId);

    var newId = getChatId();
    if (newId === lastSeenChatId) return;
    lastSeenChatId = newId;

    log("chatId changed: " + state.chatId + " -> " + newId);

    /* Persist the outgoing chat's character before swapping any state. */
    flushSave();

    state.chatId = newId;
    if (!state.ruleset) return;
    if (!newId) return;  /* nothing to load until a chat is selected */

    /* Each chat has its own character list and active character. Reload
       fully — previously this only refreshed state.sheet, which left the
       active character pointing at someone who might not exist in the new
       chat and broke saves. */
    migrateLegacySheet(state.chatId);
    state.characters = loadCharacters(state.chatId);
    state.activeCharacterId = loadActiveCharacterId(state.chatId, state.characters[0].id);
    if (!state.characters.some(function (c) { return c.id === state.activeCharacterId; })) {
      state.activeCharacterId = state.characters[0].id;
      saveActiveCharacterId();
    }
    state.sheet = loadSheet(state.chatId, state.ruleset);
    renderSheet();
    state.collapsed = loadCollapsedPref(state.chatId);
    applyCollapsed(state.collapsed);
    /* Swap the processed-message-id set to the new chat's persisted set.
       Without this swap, mutations from the old chat's history would
       suppress new messages in this chat that happen to share an id, and
       — more importantly — historic mutations in this chat would replay
       on the next refresh. */
    loadProcessedMessageIds(state.chatId);
    /* New chat default activeAgentIds is empty or just ["spotify"]; reconcile so overlay agents fire without manual toggling per chat. */
    if (typeof reconcileActiveAgents === "function") reconcileActiveAgents();
  }, ROUTE_POLL_MS);
}

/* Browser lifecycle: persist on tab hide and page unload. visibilitychange
   fires reliably on tab switch / minimize / mobile-background; beforeunload
   covers full reloads and tab closes. Both call flushSave directly because
   the user may not have nudged a stepper since their last edit. */
function watchLifecycleSaves() {
  marinara.on(document, "visibilitychange", function () {
    if (document.visibilityState === "hidden") flushSave();
  });
  marinara.on(window, "beforeunload", flushSave);
  marinara.on(window, "pagehide",     flushSave);
}

/* ═══════════════════════════════════════════════════════════════
   Phase 5 step 5.6 — V20 morality + paths + virtues + health-track
   ═══════════════════════════════════════════════════════════════
   V20-specific visual treatment. Adds:
     - mrrP3RenderMoralitySection: section renderer for ruleset.morality
       (Path Rating + path picker + virtue rows). Dispatched from the
       sections.order forEach above when sec === "morality".
     - mrr_v20PathVirtueMap: canonical path→virtue mapping derived from
       the V20 lorebook "Path Lookup" entries. Lorebook content is
       Marinara-side and not loadable from inside the extension, so the
       mapping is mirrored here. Source: rulesets/vtmv20/lorebook.json
       Path-* entries (Virtues: X + Y + Z line).
     - mrr_resourceRenderers["v20-health-track"]: named renderer for
       resource.rendererConfig.component === "v20-health-track". Reads
       rendererConfig.levels[] (7 entries with label + penalty) and
       rendererConfig.damageTypes (B/L/A). Persists per-box damage at
       state.sheet.resources[id].track = [{type: "B"|"L"|"A"|null}, ...]
       and derives the resource current from undamaged boxes.

   State persistence shape:
     state.sheet.morality = {
       rating:  <number>,                 // current Path Rating
       path:    "<path-id>",              // selected path
       virtues: {
         "<virtue-id>": {
           value:  <number>,              // 1-5
           active: "<option-id>"|null     // for paired-choice virtues
         }, ...
       }
     }
     state.sheet.resources["health"] = {
       current: <undamaged-box-count>,    // derived, also auto-managed
       track:   [{type: "B"|"L"|"A"|null}, ...]
     }
   ═══════════════════════════════════════════════════════════════ */

/* Canonical V20 path → default virtue option mapping. Source of truth
   is rulesets/vtmv20/lorebook.json (each Path Lookup entry's "Virtues:"
   line). Mirrored here because the lorebook lives on the Marinara
   server, not in the extension bundle. */
var mrr_v20PathVirtueMap = {
  "humanity": {
    description: "HUMANITY (default morality track). Virtues: Conscience + Self-Control + Courage. The moral baseline borrowed from the mortal life left behind, and the only morality non-Sabbat Camarilla society broadly recognizes.",
    virtues: {
      "conscience-conviction": "conscience",
      "self-control-instinct": "self-control"
    }
  },
  "honorable-accord": {
    description: "PATH OF HONORABLE ACCORD. Virtues: Conviction + Self-Control + Courage. A code of chivalry and oath-keeping — loyalty, hospitality, oaths sworn and oaths kept, obedience to recognized authority. Common among Sabbat Lasombra and Tzimisce templars.",
    virtues: {
      "conscience-conviction": "conviction",
      "self-control-instinct": "self-control"
    }
  },
  "caine": {
    description: "PATH OF CAINE. Virtues: Conviction + Instinct + Courage. Noddists hold that Caine is the only legitimate model — humanity is delusion, mortal morality contemptible. The goal is to study Noddist scripture and transcend through diablerie if necessary.",
    virtues: {
      "conscience-conviction": "conviction",
      "self-control-instinct": "instinct"
    }
  },
  "beast": {
    description: "PATH OF THE BEAST. Virtues: Conviction + Instinct + Courage. The Beast is not the enemy — the Beast is the truth, and suppressing it is the lie. Hunt as predator, integrate rational mind with primal drive.",
    virtues: {
      "conscience-conviction": "conviction",
      "self-control-instinct": "instinct"
    }
  },
  "night": {
    description: "PATH OF NIGHT. Virtues: Conviction + Instinct + Courage. Vampires as God's appointed instruments of damnation — expose latent sin in mortals and force confrontation with it. Suffering is sacrament; pain is pedagogy.",
    virtues: {
      "conscience-conviction": "conviction",
      "self-control-instinct": "instinct"
    }
  }
};

/* Ensure state.sheet.morality bag exists with sensible defaults derived
   from ruleset.morality. Called lazily on first render and on path
   change. */
function mrrMoralityEnsureState() {
  if (!state.sheet || !state.ruleset || !state.ruleset.morality) return null;
  var m = state.ruleset.morality;
  if (!state.sheet.morality || typeof state.sheet.morality !== "object") {
    state.sheet.morality = {};
  }
  var bag = state.sheet.morality;

  /* Rating default. */
  if (typeof bag.rating !== "number") {
    bag.rating = (m.rating && typeof m.rating.default === "number") ? m.rating.default : 7;
  }

  /* Path default — first declared path. */
  var paths = Array.isArray(m.paths) ? m.paths : [];
  if (typeof bag.path !== "string" || !paths.some(function (p) { return p && p.id === bag.path; })) {
    bag.path = paths.length ? paths[0].id : "humanity";
  }

  /* Virtues bag. */
  if (!bag.virtues || typeof bag.virtues !== "object") bag.virtues = {};
  var virtues = Array.isArray(m.virtues) ? m.virtues : [];
  var pathMap = mrr_v20PathVirtueMap[bag.path] || mrr_v20PathVirtueMap["humanity"] || { virtues: {} };
  virtues.forEach(function (v) {
    if (!v || typeof v.id !== "string") return;
    if (!bag.virtues[v.id] || typeof bag.virtues[v.id] !== "object") bag.virtues[v.id] = {};
    var entry = bag.virtues[v.id];
    if (typeof entry.value !== "number") {
      entry.value = (typeof v.default === "number") ? v.default : 3;
    }
    if (Array.isArray(v.options) && v.options.length) {
      var pathActive = pathMap.virtues && pathMap.virtues[v.id];
      var validIds = v.options.map(function (o) { return o && o.id; });
      if (typeof entry.active !== "string" || validIds.indexOf(entry.active) === -1) {
        entry.active = pathActive && validIds.indexOf(pathActive) !== -1
          ? pathActive
          : (v.options[0] && v.options[0].id) || null;
      }
    }
  });

  /* Sync the morality virtue values into state.sheet.derived so formula
     tokens (`{Courage}`, `{Conscience}`, `{Self-Control}`, etc.) resolve
     against the canonical statContext. Without this, the morality UI
     writes only to state.sheet.morality.virtues[id].value and formulas
     reading state.sheet.derived[<name>] miss the update. For paired
     virtues, write under the ACTIVE option's label (so on a Path of
     Caine character, swapping Conscience→Conviction writes to
     state.sheet.derived["Conviction"] rather than "Conscience"). For
     single virtues, write under the virtue's label. */
  if (!state.sheet.derived || typeof state.sheet.derived !== "object") {
    state.sheet.derived = {};
  }
  virtues.forEach(function (v) {
    if (!v || typeof v.id !== "string") return;
    var entry = bag.virtues[v.id];
    if (!entry || typeof entry.value !== "number") return;
    if (Array.isArray(v.options) && v.options.length && entry.active) {
      var activeOpt = v.options.filter(function (o) { return o && o.id === entry.active; })[0];
      if (activeOpt && activeOpt.label) {
        state.sheet.derived[activeOpt.label] = entry.value;
      }
    } else if (v.label) {
      state.sheet.derived[v.label] = entry.value;
    }
  });

  return bag;
}

function mrrMoralityClamp(v, lo, hi) {
  if (typeof lo === "number" && v < lo) v = lo;
  if (typeof hi === "number" && v > hi) v = hi;
  return v;
}

/* Path picker — dropdown of morality.paths, plus a description block
   below it sourced from the canonical path→virtue map. */
function mrrRenderPathPicker(parent) {
  if (!parent || !state.ruleset || !state.ruleset.morality) return;
  var m = state.ruleset.morality;
  var paths = Array.isArray(m.paths) ? m.paths : [];
  if (!paths.length) return;

  var bag = mrrMoralityEnsureState();
  if (!bag) return;

  var row = marinara.addElement(parent, "div", { "class": "mrr-morality__path-row" });
  if (!row) return;

  var select = marinara.addElement(row, "select", {
    "class": "mrr-morality__path-select",
    "aria-label": "Path"
  });
  if (select) {
    paths.forEach(function (p) {
      if (!p || typeof p.id !== "string") return;
      var opt = marinara.addElement(select, "option", {
        value: p.id,
        textContent: p.label || p.id
      });
      if (opt && p.id === bag.path) opt.selected = true;
    });
    marinara.on(select, "change", function () {
      bag.path = select.value;
      /* Reset paired-choice virtue active options to the new path's
         canonical defaults so the UI reflects path-virtue alignment. */
      var pathMap = mrr_v20PathVirtueMap[bag.path];
      if (pathMap && pathMap.virtues) {
        Object.keys(pathMap.virtues).forEach(function (vid) {
          if (bag.virtues && bag.virtues[vid]) {
            bag.virtues[vid].active = pathMap.virtues[vid];
          }
        });
      }
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    });
  }

  var pathMap = mrr_v20PathVirtueMap[bag.path];
  var desc = (pathMap && pathMap.description) || "";
  if (desc) {
    marinara.addElement(row, "div", {
      "class": "mrr-morality__path-desc",
      textContent: desc
    });
  }
}

/* Single virtue row — handles both paired-choice (options[]) and plain
   virtues. Paired rows show a 2-state segmented toggle plus the active
   label; both kinds get a -/+ stepper. */
function mrrRenderVirtueRow(parent, virtue) {
  if (!parent || !virtue || typeof virtue.id !== "string") return;
  var bag = mrrMoralityEnsureState();
  if (!bag) return;
  var entry = bag.virtues && bag.virtues[virtue.id];
  if (!entry) return;

  var lo = (typeof virtue.min === "number") ? virtue.min : 1;
  var hi = (typeof virtue.max === "number") ? virtue.max : 5;

  var row = marinara.addElement(parent, "div", { "class": "mrr-morality__virtue" });
  if (!row) return;

  if (Array.isArray(virtue.options) && virtue.options.length) {
    var toggle = marinara.addElement(row, "div", {
      "class": "mrr-morality__virtue-toggle",
      role: "group",
      "aria-label": virtue.label || virtue.id
    });
    virtue.options.forEach(function (opt) {
      if (!opt || typeof opt.id !== "string") return;
      var btn = marinara.addElement(toggle, "button", {
        type: "button",
        "class": "mrr-morality__virtue-toggle-btn",
        "aria-pressed": (entry.active === opt.id) ? "true" : "false",
        textContent: opt.label || opt.id
      });
      if (!btn) return;
      marinara.on(btn, "click", function () {
        if (entry.active === opt.id) return;
        entry.active = opt.id;
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      });
    });
    /* The label after the toggle echoes the active option for clarity. */
    var activeOpt = virtue.options.filter(function (o) { return o && o.id === entry.active; })[0];
    marinara.addElement(row, "span", {
      "class": "mrr-morality__virtue-label",
      textContent: (activeOpt && activeOpt.label) || virtue.label || virtue.id
    });
  } else {
    marinara.addElement(row, "span", {
      "class": "mrr-morality__virtue-label",
      textContent: virtue.label || virtue.id
    });
  }

  var stepper = marinara.addElement(row, "div", { "class": "mrr-morality__virtue-stepper" });
  if (stepper) {
    var dec = marinara.addElement(stepper, "button", {
      type: "button",
      "class": "mrr-morality__virtue-step",
      textContent: "−"
    });
    if (dec && entry.value <= lo) dec.disabled = true;
    marinara.addElement(stepper, "span", {
      "class": "mrr-morality__virtue-value",
      textContent: String(entry.value)
    });
    var inc = marinara.addElement(stepper, "button", {
      type: "button",
      "class": "mrr-morality__virtue-step",
      textContent: "+"
    });
    if (inc && entry.value >= hi) inc.disabled = true;
    if (dec) marinara.on(dec, "click", function () {
      entry.value = mrrMoralityClamp(entry.value - 1, lo, hi);
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    });
    if (inc) marinara.on(inc, "click", function () {
      entry.value = mrrMoralityClamp(entry.value + 1, lo, hi);
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    });
  }
}

/* Section renderer — dispatched from the section forEach when
   sec === "morality". Renders the full V20 morality cluster: header
   with Path Rating stepper, path picker + description, virtue rows. */
function mrrP3RenderMoralitySection(parent) {
  if (!parent || !state.ruleset || !state.ruleset.morality || !state.sheet) return;
  var m = state.ruleset.morality;

  var bag = mrrMoralityEnsureState();
  if (!bag) return;

  var cluster = marinara.addElement(parent, "div", { "class": "mrr-morality" });
  if (!cluster) return;

  var header = marinara.addElement(cluster, "div", { "class": "mrr-morality__header" });
  if (header) {
    marinara.addElement(header, "div", {
      "class": "mrr-morality__title",
      textContent: "Morality"
    });
    var rating = marinara.addElement(header, "div", { "class": "mrr-morality__rating" });
    if (rating) {
      marinara.addElement(rating, "span", {
        "class": "mrr-morality__rating-label",
        textContent: (m.rating && m.rating.label) || "Path Rating"
      });
      var rLo = (m.rating && typeof m.rating.min === "number") ? m.rating.min : 0;
      var rHi = (m.rating && typeof m.rating.max === "number") ? m.rating.max : 10;
      var dec = marinara.addElement(rating, "button", {
        type: "button",
        "class": "mrr-morality__rating-step",
        textContent: "−"
      });
      if (dec && bag.rating <= rLo) dec.disabled = true;
      marinara.addElement(rating, "span", {
        "class": "mrr-morality__rating-value",
        textContent: String(bag.rating)
      });
      var inc = marinara.addElement(rating, "button", {
        type: "button",
        "class": "mrr-morality__rating-step",
        textContent: "+"
      });
      if (inc && bag.rating >= rHi) inc.disabled = true;
      if (dec) marinara.on(dec, "click", function () {
        bag.rating = mrrMoralityClamp(bag.rating - 1, rLo, rHi);
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      });
      if (inc) marinara.on(inc, "click", function () {
        bag.rating = mrrMoralityClamp(bag.rating + 1, rLo, rHi);
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      });
    }
  }

  mrrRenderPathPicker(cluster);

  var virtuesEl = marinara.addElement(cluster, "div", { "class": "mrr-morality__virtues" });
  if (virtuesEl && Array.isArray(m.virtues)) {
    m.virtues.forEach(function (v) {
      mrrRenderVirtueRow(virtuesEl, v);
    });
  }
}

/* v20-health-track named renderer. Wires into the resources cluster
   via mrr_resourceRenderers (registry created in Round 4 of
   Phase 5 step 5.3). When ruleset.resources[] has an entry with
   type=custom + rendererConfig.component=="v20-health-track", the
   resource dispatcher invokes this function with (resource, parent,
   ctx). The renderer mutates parent and persists damage state at
   state.sheet.resources[id].track. */
mrr_resourceRenderers["v20-health-track"] = function (resource, parent, ctx) {
  if (!parent || !resource) return;
  var cfg = resource.rendererConfig || {};
  var levels = Array.isArray(cfg.levels) ? cfg.levels : [];
  var damageTypes = Array.isArray(cfg.damageTypes) ? cfg.damageTypes : [];
  if (!levels.length) return;

  /* Damage type ids ordered by severity (B < L < A). Cycle order:
     empty → B → L → A → empty. */
  var typeIds = damageTypes
    .slice()
    .sort(function (a, b) { return (a.severity || 0) - (b.severity || 0); })
    .map(function (d) { return d && d.label; })
    .filter(function (x) { return typeof x === "string" && x.length; });
  if (!typeIds.length) typeIds = ["B", "L", "A"];

  if (!state.sheet) return;
  if (!state.sheet.resources || typeof state.sheet.resources !== "object") {
    state.sheet.resources = {};
  }
  var id = resource.id;
  if (!id) return;
  var entry = state.sheet.resources[id];
  if (!entry || typeof entry !== "object") {
    entry = state.sheet.resources[id] = {};
  }
  if (!Array.isArray(entry.track) || entry.track.length !== levels.length) {
    entry.track = [];
    for (var i = 0; i < levels.length; i++) entry.track.push({ type: null });
  }

  var damaged = entry.track.filter(function (b) { return b && b.type; }).length;
  /* Derived current = undamaged boxes. Persist so getCurrent reads sane
     values for token substitution downstream. */
  entry.current = levels.length - damaged;

  var track = marinara.addElement(parent, "div", { "class": "mrr-health-track" });
  if (!track) return;

  var grid = marinara.addElement(track, "div", { "class": "mrr-health-track__levels" });
  if (grid) {
    levels.forEach(function (lvl, idx) {
      var col = marinara.addElement(grid, "div", { "class": "mrr-health-track__level" });
      if (!col) return;
      var slot = entry.track[idx] || { type: null };
      var box = marinara.addElement(col, "button", {
        type: "button",
        "class": "mrr-health-track__box",
        textContent: slot.type || "·",
        "aria-label": (lvl.label || "Level " + (idx + 1)) + " — damage " + (slot.type || "none")
      });
      if (box) {
        if (slot.type) box.setAttribute("data-damage", slot.type);
        marinara.on(box, "click", function () {
          var cur = slot.type;
          var nextIdx = (cur === null || cur === undefined)
            ? 0
            : (typeIds.indexOf(cur) + 1);
          slot.type = (nextIdx >= typeIds.length) ? null : typeIds[nextIdx];
          entry.track[idx] = slot;
          ctx.saveSheet(state.chatId, state.sheet);
          ctx.renderSheet();
        });
      }
      marinara.addElement(col, "div", {
        "class": "mrr-health-track__label",
        textContent: lvl.label || ""
      });
      if (typeof lvl.penalty === "number" && lvl.penalty !== 0) {
        marinara.addElement(col, "div", {
          "class": "mrr-health-track__penalty",
          textContent: (lvl.penalty > 0 ? "+" : "") + lvl.penalty
        });
      }
    });
  }

  var summary = marinara.addElement(track, "div", { "class": "mrr-health-track__summary" });
  if (summary) {
    marinara.addElement(summary, "span", {
      textContent: (levels.length - damaged) + " / " + levels.length + " healthy"
    });
    var legend = marinara.addElement(summary, "span", { "class": "mrr-health-track__legend" });
    if (legend) {
      typeIds.forEach(function (t) {
        marinara.addElement(legend, "code", { textContent: t });
      });
    }
  }
};

/* Exalted 3e health track. Delegates to the legacy mrrP3RenderDerivedTrack
   renderer (which already handles add-extra-level via Ox-Body / Mutations,
   damage cycling via cell click, and the Heal worst / Heal all buttons).
   State persists at state.sheet.track["Health Track"] +
   state.sheet.extraTrack["Health Track"] — the legacy locations — so any
   existing characters' damage carries over. The renderer marks the parent
   .mrr-resource card as full-width so the track gets the whole cluster
   row instead of being squeezed into a column. */
mrr_resourceRenderers["exalted-health-track"] = function (resource, parent, ctx) {
  if (!parent || !resource) return;
  if (parent.classList) {
    parent.classList.add("mrr-resource--full-width");
    parent.classList.add("mrr-resource--health-track");
  }
  var cfg = resource.rendererConfig || {};
  var synthDerived = {
    name: "Health Track",
    renderAs: "track",
    track: Array.isArray(cfg.levels) ? cfg.levels : [],
    damageTypes: Array.isArray(cfg.damageTypes) ? cfg.damageTypes : []
  };
  mrrP3RenderDerivedTrack(parent, synthDerived);
};

/* B1: no top-level await anywhere in this file — hydrateStore() is async
   but init() itself stays fully synchronous once called. onCleanup is
   registered SYNCHRONOUSLY and FIRST, before any async gap, so a
   disable-during-hydrate still runs cleanup correctly. No pre-existing
   top-level marinara.onCleanup registration was found to unify with —
   the only other onCleanup call sites are the compat shim's own internal
   node/listener teardown (~line 229, scoped to the shim's IIFE closure)
   and watchChatMessages' observer teardown (registered only once init()
   itself runs) — neither conflicts with this one. See final report. */
var mrrDisposed = false;
var mrrInitStarted = false;

marinara.onCleanup(function () {
  mrrDisposed = true;
  mrrBestEffortFlushOnCleanup();
});

function mrrInitOnce() {
  if (mrrInitStarted) return;
  mrrInitStarted = true;
  init();
}

hydrateStore().then(function () {
  if (!mrrDisposed) mrrInitOnce();
});
