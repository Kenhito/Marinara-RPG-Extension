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
var LS_SHEET_SIZE    = LS_SHEET_PFX + "size";
var LS_SHEET_COLLAPSED_PFX = LS_SHEET_PFX + "collapsed-";
var LS_SPELLBOOK_POS = "mrr-spellbook-pos";
var LS_SPELLBOOK_LB_PFX = "mrr-spellbook-lb-";   // appended with chatId
var LS_PROCESSED_MSGS_PFX = "mrr-processed-msgs-"; // appended with chatId — set of message ids whose state-mutator tags have already applied; persisted so hard-refresh doesn't re-apply historic mutations
var MRR_TAG_SPELLBOOK = "mrr-spellbook";
var MRR_TAG_CHAR_PFX  = "mrr-char-";
var MRR_TAG_CAT_PFX   = "mrr-cat-";
var EXT_VERSION      = "0.4.0";
var BUNDLE_SCHEMA_ID = "mrr-bundle";

/* Markers used by the bundle installer to recognize artifacts it created
   in the user's Marinara database. Single source of truth — install,
   uninstall, and search paths all read from here. */
var MRR_AGENT_TYPE   = "mrr-overlay-v1";
var MRR_TAG_MANAGED  = "mrr-managed";
var MRR_TAG_RS_PFX   = "mrr:";
var MRR_PROMPT_PFX   = "[mrr-v1:";
var EMBED_STYLE_ID   = "mrr-embedded-style";

/* EMBEDDED_CSS_BEGIN */
var EMBEDDED_CSS = "/*\n * Marinara-RPG-Extension — RPG-Extension-GM-Mode.css\n * Companion stylesheet for RPG-Extension-GM-Mode.js. Paste this CSS into Marinara\n * Engine -> Settings -> Extensions -> Add Extension -> CSS field.\n *\n * License: MIT\n * Source:  https://github.com/Kenhito/Marinara-RPG-Extension\n */\n\n:root {\n  --mrr-bg:           rgba(20, 16, 28, 0.92);\n  --mrr-bg-elev:      rgba(40, 32, 56, 0.92);\n  --mrr-border:       rgba(255, 255, 255, 0.10);\n  --mrr-border-strong:rgba(255, 255, 255, 0.20);\n  --mrr-text:         #f5f0ff;\n  --mrr-text-dim:     rgba(245, 240, 255, 0.65);\n  --mrr-accent:       #d4a8ff;\n  --mrr-accent-dim:   rgba(212, 168, 255, 0.30);\n  --mrr-success:      #6ee7b7;\n  --mrr-fail:         #fb7185;\n  --mrr-warning:      #fbbf24;\n  --mrr-on-accent:    #1a0f2a;\n  --mrr-on-fail:      #1a0f0f;\n  --mrr-tint-1:       rgba(255, 255, 255, 0.04);\n  --mrr-tint-2:       rgba(255, 255, 255, 0.06);\n  --mrr-tint-strong:  rgba(255, 255, 255, 0.20);\n  --mrr-radius:       8px;\n  --mrr-radius-sm:    4px;\n  --mrr-pad:          10px;\n  --mrr-gap:          6px;\n  --mrr-shadow:       0 8px 24px rgba(0, 0, 0, 0.35);\n  --mrr-mono:         ui-monospace, \"Cascadia Code\", \"Fira Code\", Menlo, Monaco, monospace;\n  --mrr-z-sheet:      9997;\n  --mrr-z-dice:       9998;\n  --mrr-z-dialog:     9999;\n}\n\n.mrr-hidden { display: none !important; }\n.mrr-msg--hidden,\n.mrr-dice__result--hidden { display: none; }\n\n/*  ─────  Sheet panel (replaces the hidden built-in attribute panel) ───── */\n\n.mrr-sheet {\n  display: flex;\n  flex-direction: column;\n  gap: var(--mrr-gap);\n  background: var(--mrr-bg);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius);\n  padding: var(--mrr-pad);\n  margin: var(--mrr-gap) 0;\n  color: var(--mrr-text);\n  font-size: 13px;\n}\n\n.mrr-sheet--floating {\n  position: fixed;\n  left: 16px;\n  top: 80px;\n  width: 320px;\n  min-width: 280px;\n  max-width: calc(100vw - 32px);\n  min-height: 200px;\n  max-height: 70vh;\n  overflow: auto;\n  resize: both;\n  z-index: var(--mrr-z-sheet);\n}\n\n.mrr-sheet__header {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  border-bottom: 1px solid var(--mrr-border);\n  padding-bottom: 6px;\n  margin-bottom: 4px;\n}\n\n.mrr-sheet__title-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  width: 100%;\n}\n\n.mrr-sheet__title {\n  font-weight: 600;\n  letter-spacing: 0.02em;\n  color: var(--mrr-accent);\n}\n\n.mrr-sheet__meta {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n}\n\n.mrr-sheet__char-row {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n\n.mrr-sheet__char-label {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-char-select {\n  flex: 1;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-family: inherit;\n  font-size: 12px;\n}\n\n.mrr-char-btn {\n  background: var(--mrr-tint-2);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-size: 11px;\n  cursor: pointer;\n  font-family: inherit;\n}\n\n.mrr-char-btn:hover { background: var(--mrr-accent-dim); }\n\n.mrr-char-btn--danger:hover {\n  background: rgba(251, 113, 133, 0.30);\n  border-color: var(--mrr-fail);\n}\n\n.mrr-char-btn--accent {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n}\n\n.mrr-char-btn--dashed {\n  border-style: dashed;\n  border-color: var(--mrr-accent-dim);\n}\n\n.mrr-draggable-handle { cursor: grab; user-select: none; touch-action: none; }\n.mrr-draggable-handle:active { cursor: grabbing; }\n\n.mrr-section {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 8px;\n  background: var(--mrr-bg-elev);\n}\n\n.mrr-section__title {\n  font-size: 11px;\n  font-weight: 700;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--mrr-text-dim);\n  margin-bottom: 2px;\n}\n\n.mrr-group {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  margin-bottom: 6px;\n}\n\n.mrr-group__label {\n  font-size: 10px;\n  letter-spacing: 0.10em;\n  text-transform: uppercase;\n  color: var(--mrr-accent);\n  margin-top: 4px;\n}\n\n.mrr-row {\n  display: grid;\n  grid-template-columns: 1fr auto auto auto;\n  align-items: center;\n  gap: 6px;\n  padding: 2px 4px;\n  border-radius: var(--mrr-radius-sm);\n}\n\n.mrr-row:hover {\n  background: var(--mrr-tint-1);\n}\n\n.mrr-row--compact {\n  grid-template-columns: 1fr auto auto;\n}\n\n.mrr-row__name {\n  font-weight: 500;\n}\n\n.mrr-row__abbr {\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-row__value {\n  min-width: 32px;\n  text-align: right;\n  font-family: var(--mrr-mono);\n}\n\n.mrr-row__roll {\n  font-size: 11px;\n  padding: 2px 6px;\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-accent-dim);\n  border: 1px solid var(--mrr-accent-dim);\n  color: var(--mrr-text);\n  cursor: pointer;\n  font-family: inherit;\n}\n\n.mrr-row__roll:hover { background: var(--mrr-accent); color: var(--mrr-on-accent); }\n\n/*  ─────  Skill proficiency tier button + specialty sub-row  ───── */\n\n/* Shared base for the small letter buttons that sit inside the stepper\n   group on each skill row. Kept separate from `.mrr-stepper button` so\n   the stepper can be 18×18 (numeric +/-) while these are 22×18 (single\n   uppercase letter or \"+S\") without re-spec'ing every property. */\n.mrr-skill-tier-btn,\n.mrr-skill-spec-btn {\n  width: 22px;\n  height: 18px;\n  padding: 0;\n  background: var(--mrr-tint-2);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  font-weight: 700;\n  line-height: 1;\n}\n\n.mrr-skill-tier-btn { letter-spacing: 0.04em; }\n.mrr-skill-spec-btn { border-style: dashed; border-color: var(--mrr-accent-dim); }\n\n.mrr-skill-tier-btn:hover,\n.mrr-skill-spec-btn:hover { background: var(--mrr-accent-dim); }\n\n/* Tier modifier classes — visual cue for the active tier. The renderer\n   adds `--<code>` for the active tier; codes are ruleset-defined so\n   these mappings cover the common cases (PF2e U/T/E/M/L, Exalted U/C/F,\n   D&D U/T/E). Untrained-equivalent stays at the default tint. */\n.mrr-skill-tier-btn--T,\n.mrr-skill-tier-btn--C { background: var(--mrr-tint-strong); }\n.mrr-skill-tier-btn--E,\n.mrr-skill-tier-btn--F { background: var(--mrr-accent-dim); border-color: var(--mrr-accent-dim); }\n.mrr-skill-tier-btn--M { background: var(--mrr-accent); color: var(--mrr-on-accent); border-color: var(--mrr-accent); }\n.mrr-skill-tier-btn--L {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-accent);\n  box-shadow: 0 0 0 1px var(--mrr-accent-dim);\n}\n\n.mrr-skill-spec-row {\n  display: grid;\n  grid-template-columns: 1fr auto auto auto auto;\n  align-items: center;\n  gap: 6px;\n  padding: 2px 4px 2px 18px;\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n  margin-top: 2px;\n}\n\n.mrr-skill-spec-name {\n  width: 100%;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-family: inherit;\n  font-size: 11px;\n}\n\n.mrr-skill-spec-label {\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n}\n\n/*  ─────  Dice widget specialty pane  ───── */\n\n.mrr-dice__specs {\n  margin-top: 8px;\n  padding: 6px 8px;\n  border: 1px dashed var(--mrr-accent-dim);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n}\n\n.mrr-dice__specs-title {\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: 0.10em;\n  text-transform: uppercase;\n  color: var(--mrr-accent);\n  margin-bottom: 4px;\n}\n\n.mrr-dice__spec-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 2px 0;\n  cursor: pointer;\n}\n\n.mrr-dice__spec-checkbox {\n  margin: 0;\n  cursor: pointer;\n}\n\n.mrr-stepper {\n  display: inline-flex;\n  gap: 2px;\n}\n\n.mrr-stepper button {\n  width: 18px;\n  height: 18px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--mrr-tint-2);\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text);\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  padding: 0;\n  line-height: 1;\n}\n\n.mrr-stepper button:hover { background: var(--mrr-accent-dim); }\n.mrr-stepper button:disabled { opacity: 0.4; cursor: not-allowed; }\n\n/*  ─────  Derived stats  ───── */\n\n.mrr-derived {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.mrr-derived__formula {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-bar {\n  position: relative;\n  height: 14px;\n  background: var(--mrr-tint-2);\n  border-radius: var(--mrr-radius-sm);\n  overflow: hidden;\n}\n\n.mrr-bar__fill {\n  position: absolute;\n  inset: 0;\n  background: linear-gradient(90deg, var(--mrr-accent-dim), var(--mrr-accent));\n  width: 0;\n  transition: width 0.18s ease-out;\n}\n\n.mrr-bar__label {\n  position: relative;\n  z-index: 1;\n  font-size: 10px;\n  font-family: var(--mrr-mono);\n  text-align: center;\n  line-height: 14px;\n  color: var(--mrr-text);\n  text-shadow: 0 0 2px rgba(0,0,0,0.6);\n}\n\n.mrr-track {\n  display: flex;\n  gap: 3px;\n  flex-wrap: wrap;\n}\n\n.mrr-track__cell {\n  min-width: 38px;\n  padding: 2px 6px;\n  font-size: 10px;\n  font-family: var(--mrr-mono);\n  text-align: center;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n  cursor: pointer;\n  user-select: none;\n}\n\n.mrr-track__cell--filled {\n  background: var(--mrr-fail);\n  color: var(--mrr-on-fail);\n  border-color: var(--mrr-fail);\n}\n\n.mrr-track__cell--active {\n  outline: 2px solid var(--mrr-warning);\n}\n\n.mrr-track__cell--extra {\n  border-style: dashed;\n  border-color: var(--mrr-accent-dim);\n}\n\n/*  ─────  Damage-type tones  ─────\n    Used by rulesets that declare damageTypes on a track-renderAs derived\n    stat (Exalted, WoD, anything Storyteller-flavored). Bashing is mild\n    (warning yellow), Lethal is severe (fail red, same hue as legacy\n    single-fill), Aggravated is dire (deep maroon — meant to read as\n    'something supernatural just hit you'). The renderer overlays the\n    damage-type label (B/L/A) on the cell when filled. */\n.mrr-track__cell--bashing {\n  background: var(--mrr-warning);\n  color: #1a0f0f;\n  border-color: var(--mrr-warning);\n}\n.mrr-track__cell--lethal {\n  background: var(--mrr-fail);\n  color: var(--mrr-on-fail);\n  border-color: var(--mrr-fail);\n}\n.mrr-track__cell--aggravated {\n  background: #5a1a1a;\n  color: #f5f0ff;\n  border-color: #7a2a2a;\n  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);\n}\n\n.mrr-track-ctrl {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 4px;\n  margin-top: 4px;\n}\n\n.mrr-track-ctrl__label {\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  margin-right: 2px;\n}\n\n.mrr-track-add-btn {\n  background: var(--mrr-tint-2);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 1px 6px;\n  font-size: 10px;\n  font-family: var(--mrr-mono);\n  cursor: pointer;\n}\n\n.mrr-track-add-btn:hover { background: var(--mrr-accent-dim); }\n\n.mrr-track-add-btn--danger:hover {\n  background: rgba(251, 113, 133, 0.30);\n  border-color: var(--mrr-fail);\n}\n\n.mrr-saved-indicator {\n  font-size: 10px;\n  color: var(--mrr-success);\n  font-family: var(--mrr-mono);\n  margin-left: 6px;\n  white-space: nowrap;\n}\n\n/*  ─────  States (anima banner / stunt tier / D&D conditions)  ───── */\n\n.mrr-state {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 6px;\n  padding: 4px 0;\n}\n\n.mrr-state__name { font-weight: 500; }\n\n.mrr-state__select {\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-family: inherit;\n  font-size: 12px;\n}\n\n/*  ─────  Floating dice widget  ───── */\n\n.mrr-dice {\n  position: fixed;\n  top: 80px;\n  right: 16px;\n  width: 280px;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border-strong);\n  border-radius: var(--mrr-radius);\n  padding: var(--mrr-pad);\n  box-shadow: var(--mrr-shadow);\n  z-index: var(--mrr-z-dice);\n  font-size: 13px;\n  display: none;\n}\n\n.mrr-dice--open { display: block; }\n\n.mrr-dice__header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 6px;\n  padding-bottom: 6px;\n  border-bottom: 1px solid var(--mrr-border);\n}\n\n.mrr-dice__title {\n  font-weight: 600;\n  color: var(--mrr-accent);\n}\n\n.mrr-dice__close {\n  background: transparent;\n  border: 0;\n  color: var(--mrr-text-dim);\n  font-size: 18px;\n  cursor: pointer;\n  line-height: 1;\n}\n\n.mrr-dice__row {\n  display: flex;\n  gap: 6px;\n  align-items: center;\n  margin: 4px 0;\n}\n\n.mrr-dice__row label {\n  flex: 0 0 80px;\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-dice__input {\n  flex: 1;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 4px 6px;\n  font-family: var(--mrr-mono);\n  font-size: 13px;\n  width: 100%;\n}\n\n.mrr-dice__btn {\n  width: 100%;\n  margin-top: 6px;\n  padding: 6px 10px;\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border: 0;\n  border-radius: var(--mrr-radius-sm);\n  font-weight: 600;\n  cursor: pointer;\n  font-family: inherit;\n}\n\n.mrr-dice__btn:hover { filter: brightness(1.1); }\n\n.mrr-dice__btn--secondary {\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n}\n\n.mrr-dice__btn--row-spaced { margin-top: 4px; }\n\n.mrr-dice__result {\n  margin-top: 8px;\n  padding: 8px;\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  font-family: var(--mrr-mono);\n  font-size: 12px;\n  white-space: pre-wrap;\n}\n\n.mrr-dice__result--success { border-color: var(--mrr-success); }\n.mrr-dice__result--fail    { border-color: var(--mrr-fail); }\n.mrr-dice__result--botch   { border-color: var(--mrr-warning); background: rgba(251, 191, 36, 0.10); }\n.mrr-dice__result--tie     { border-color: var(--mrr-warning); }\n\n.mrr-dice__faces {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 3px;\n  margin-top: 6px;\n}\n\n.mrr-dice__face {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-width: 22px;\n  height: 22px;\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n}\n\n.mrr-dice__face--success { background: var(--mrr-accent-dim); border-color: var(--mrr-accent); }\n.mrr-dice__face--double  { background: var(--mrr-accent); color: var(--mrr-on-accent); }\n.mrr-dice__face--one     { background: rgba(251, 113, 133, 0.20); border-color: var(--mrr-fail); }\n\n/*  ─────  Header gear button + dialog  ───── */\n\n.mrr-gear-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  margin-left: 8px;\n  padding: 4px 8px;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  font-family: inherit;\n  font-size: 12px;\n}\n\n.mrr-gear-btn:hover { background: var(--mrr-accent-dim); }\n\n/*  ─────  Header sheet-toggle button (scroll icon)  ───── */\n\n.mrr-sheet-toggle-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 32px;\n  height: 32px;\n  margin-left: 8px;\n  padding: 0;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: 50%;\n  cursor: pointer;\n  font-family: inherit;\n  vertical-align: middle;\n}\n\n.mrr-sheet-toggle-btn:hover { background: var(--mrr-accent-dim); }\n\n.mrr-sheet-toggle-btn--active {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-accent);\n}\n\n.mrr-sheet-toggle-btn svg {\n  width: 18px;\n  height: 18px;\n  display: block;\n}\n\n.mrr-dialog-backdrop {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.55);\n  z-index: var(--mrr-z-dialog);\n  display: none;\n  align-items: center;\n  justify-content: center;\n}\n\n.mrr-dialog-backdrop--open { display: flex; }\n\n.mrr-dialog {\n  width: min(560px, 92vw);\n  max-height: 80vh;\n  overflow: auto;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border-strong);\n  border-radius: var(--mrr-radius);\n  padding: 16px;\n  box-shadow: var(--mrr-shadow);\n}\n\n.mrr-dialog h3 {\n  margin: 0 0 8px;\n  color: var(--mrr-accent);\n  font-size: 16px;\n}\n\n.mrr-dialog p {\n  color: var(--mrr-text-dim);\n  font-size: 12px;\n  margin: 4px 0 8px;\n}\n\n.mrr-dialog textarea {\n  width: 100%;\n  min-height: 220px;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 8px;\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  resize: vertical;\n}\n\n.mrr-dialog__row {\n  display: flex;\n  gap: 6px;\n  align-items: center;\n  margin: 8px 0;\n}\n\n.mrr-dialog__label {\n  flex: 0 0 50px;\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-dialog__buttons {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  justify-content: flex-end;\n  margin-top: 12px;\n}\n\n.mrr-dialog__lib-title {\n  margin-top: 18px;\n  border-top: 1px solid var(--mrr-border);\n  padding-top: 14px;\n}\n.mrr-dialog__lib-help {\n  font-size: 12px;\n  opacity: 0.8;\n  margin-top: 4px;\n}\n.mrr-dialog__lib {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  margin-top: 8px;\n}\n.mrr-dialog__lib-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 6px 8px;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: rgba(0, 0, 0, 0.15);\n}\n.mrr-dialog__lib-name {\n  flex: 1;\n  font-family: var(--mrr-mono);\n  font-size: 13px;\n}\n\n.mrr-msg {\n  margin-top: 6px;\n  padding: 6px 8px;\n  border-radius: var(--mrr-radius-sm);\n  font-size: 12px;\n  font-family: var(--mrr-mono);\n}\n\n.mrr-msg--ok    { background: rgba(110, 231, 183, 0.12); border: 1px solid var(--mrr-success); }\n.mrr-msg--err   { background: rgba(251, 113, 133, 0.12); border: 1px solid var(--mrr-fail); }\n.mrr-msg--info  { background: rgba(212, 168, 255, 0.10); border: 1px solid var(--mrr-accent-dim); }\n\n/*  ─────  Inventory section + item editor  ───── */\n\n.mrr-inv-list {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.mrr-inv-item {\n  display: grid;\n  grid-template-columns: 1fr auto auto auto auto;\n  align-items: center;\n  gap: 6px;\n  padding: 4px 6px;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n}\n\n.mrr-inv-item--equipped {\n  border-color: var(--mrr-accent);\n  background: var(--mrr-tint-2);\n}\n\n.mrr-inv-item__name {\n  font-weight: 500;\n}\n\n.mrr-inv-item__slot {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-inv-item__bonus-summary {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-accent);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.mrr-inv-empty {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n  font-style: italic;\n}\n\n.mrr-item-form__row {\n  display: grid;\n  grid-template-columns: 70px 1fr;\n  align-items: center;\n  gap: 12px;\n  margin: 6px 0;\n}\n\n.mrr-item-form__row label {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n  text-align: right;\n}\n\n.mrr-item-form__input,\n.mrr-item-form__select {\n  width: 100%;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 4px 6px;\n  font-family: inherit;\n  font-size: 12px;\n}\n\n.mrr-item-form__textarea {\n  width: 100%;\n  min-height: 50px;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 4px 6px;\n  font-family: inherit;\n  font-size: 12px;\n  resize: vertical;\n}\n\n.mrr-bonus-list {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  margin-top: 4px;\n  padding: 6px;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: rgba(0, 0, 0, 0.10);\n}\n\n.mrr-bonus-list__title {\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: 0.10em;\n  text-transform: uppercase;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-bonus-row {\n  display: grid;\n  grid-template-columns: 2fr 50px 70px 1.2fr auto;\n  align-items: center;\n  gap: 4px;\n}\n\n.mrr-bonus-row__input {\n  width: 100%;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border-strong);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 4px;\n  font-family: inherit;\n  font-size: 11px;\n}\n\n/* <option> elements ignore most parent styling on Linux/Chromium and fall back\n   to OS-default (often white bg + inherited near-white text => invisible until\n   highlighted). Explicit colors here force a readable dark dropdown panel. */\n.mrr-bonus-row__input option,\n.mrr-item-form__select option,\n.mrr-item-form__input option {\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n}\n\n/*  ─────  Derived / skill row equipment-bonus suffix  ───── */\n\n.mrr-row__bonus {\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  color: var(--mrr-success);\n  margin-left: 2px;\n}\n\n.mrr-row__bonus--neg { color: var(--mrr-fail); }\n\n\n/*  ─────  state-mutator tag visual hiding  ───── */\n/* The state-mutator agent instructs the main model to emit\n   [mrr-state: ...] tags inline at paragraph ends. The extension's\n   chat observer parses + applies them, then wraps each tag in a\n   span.mrr-state-tag for this CSS rule to hide visually. The state\n   change itself has already been applied to localStorage; the tag\n   is purely a wire-format artifact and should not appear in chat. */\n.mrr-state-tag { display: none; }\n\n/*  ─────  state mutation confirmation toast  ───── */\n/* Top-right floating stack of brief notifications shown when the\n   state-mutator agent's tags fire. Each toast confirms one mutation:\n   prefix (HP / Condition / Inventory), change (signed delta or +/- name),\n   and the agent-reported reason. Stacks vertically; auto-dismisses. */\n.mrr-toast-container {\n  position: fixed;\n  top: 16px;\n  right: 16px;\n  z-index: 10000;\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  pointer-events: none;\n}\n\n.mrr-toast {\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-left: 3px solid var(--mrr-accent);\n  border-radius: var(--mrr-radius-sm);\n  padding: 8px 12px;\n  font-family: inherit;\n  font-size: 12px;\n  box-shadow: var(--mrr-shadow);\n  opacity: 0;\n  transform: translateX(20px);\n  transition: opacity 0.25s ease-out, transform 0.25s ease-out;\n  pointer-events: auto;\n  display: flex;\n  gap: 8px;\n  align-items: baseline;\n  max-width: 320px;\n}\n\n.mrr-toast--visible {\n  opacity: 1;\n  transform: translateX(0);\n}\n\n.mrr-toast__prefix {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  text-transform: uppercase;\n  letter-spacing: 0.08em;\n  color: var(--mrr-text-dim);\n  flex-shrink: 0;\n}\n\n.mrr-toast__change {\n  font-family: var(--mrr-mono);\n  font-weight: 700;\n  color: var(--mrr-accent);\n  flex-shrink: 0;\n}\n\n.mrr-toast__reason {\n  color: var(--mrr-text-dim);\n  font-size: 11px;\n  font-style: italic;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n/*  ─────  Spellbook flyout (third floating panel, system-labeled)  ───── */\n/* Per-ruleset abilities/charms/stunts panel. Toggled from the main sheet's\n   spellbook row; renders one collapsible category section per\n   ruleset.abilities.categories[]. Position persists to mrr-spellbook-pos\n   (per-extension, not per-chat). Z-index sits between sheet and dice so\n   the dice widget can overlap it on roll. */\n\n.mrr-spellbook {\n  position: fixed;\n  top: 80px;\n  left: 360px;\n  width: 320px;\n  max-height: 70vh;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border-strong);\n  border-radius: var(--mrr-radius);\n  padding: var(--mrr-pad);\n  box-shadow: var(--mrr-shadow);\n  z-index: 9996;\n  font-size: 13px;\n  display: none;\n  flex-direction: column;\n  overflow: hidden;\n}\n\n.mrr-spellbook--open { display: flex; }\n\n.mrr-spellbook__header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 6px;\n  padding-bottom: 6px;\n  border-bottom: 1px solid var(--mrr-border);\n  cursor: grab;\n  user-select: none;\n}\n\n.mrr-spellbook__header:active { cursor: grabbing; }\n\n.mrr-spellbook__title {\n  font-weight: 600;\n  color: var(--mrr-accent);\n}\n\n.mrr-spellbook__body {\n  flex: 1;\n  overflow-y: auto;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.mrr-spellbook-row {\n  cursor: default;\n}\n\n.mrr-spellbook-row__btn {\n  width: 100%;\n  text-align: left;\n}\n\n.mrr-spellbook-cat {\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n  padding: 4px 6px;\n}\n\n.mrr-spellbook-cat__head {\n  width: 100%;\n  background: transparent;\n  color: var(--mrr-text);\n  border: 0;\n  padding: 4px 2px;\n  font-family: inherit;\n  font-size: 12px;\n  font-weight: 600;\n  text-align: left;\n  cursor: pointer;\n  letter-spacing: 0.04em;\n}\n\n.mrr-spellbook-cat__head:hover { color: var(--mrr-accent); }\n\n.mrr-spellbook-cat__list {\n  display: flex;\n  flex-direction: column;\n  gap: 3px;\n  margin-top: 4px;\n}\n\n.mrr-spellbook-cat--collapsed .mrr-spellbook-cat__list,\n.mrr-spellbook-cat--collapsed .mrr-spellbook-cat__add {\n  display: none;\n}\n\n.mrr-spellbook-cat__add {\n  margin-top: 4px;\n}\n\n.mrr-spellbook-ab {\n  display: grid;\n  grid-template-columns: 1fr auto auto auto;\n  align-items: center;\n  gap: 4px;\n  padding: 2px 4px;\n  background: var(--mrr-bg-elev);\n  border-radius: var(--mrr-radius-sm);\n  border: 1px solid var(--mrr-border);\n}\n\n.mrr-spellbook-ab__name {\n  font-weight: 500;\n  font-size: 12px;\n}\n\n.mrr-spellbook-ab__cost {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  white-space: nowrap;\n}\n";
/* EMBEDDED_CSS_END */

var BUNDLE_SCHEMA  = "mrr-character-bundle";
var BUNDLE_VERSION = 1;

var ROUTE_POLL_MS    = 1500;
var RELOAD_DELAY_MS  = 600;
var DEFAULT_BAR_MAX  = 10;
var DEFAULT_SKILL_MAX = 99;

var REQUIRED_FIELDS = ["id", "name", "version", "dice", "resolution", "attributes", "skills"];

var MODES = {
  SINGLE: "single-roll",
  POOL:   "dice-pool",
  D100:   "d100-percentile",
  PBTA:   "2d6-stat",
  FATE:   "fate-ladder"
};

var BOTCH_TRIGGER = {
  ZERO:     "any-on-zero-successes",
  MAJORITY: "majority",
  ALWAYS:   "always-on-face"
};

var BONUS_KIND = {
  VALUE:     "value",
  DICE:      "dice",
  SUCCESSES: "successes"
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
  agentMgrDialogEl:  null,
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

/* localStorage wrappers — private-mode and quota-safe */
function lsGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function lsSet(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } }
function lsDel(key) { try { localStorage.removeItem(key); } catch (e) {} }

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
  return fetch(url).then(function (r) {
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
      return apiFetch("/lorebooks/" + lbId).then(function (lb) {
        var existingEntries = (lb && Array.isArray(lb.entries)) ? lb.entries : [];
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
      progress("Done. Reloading...");
      return { rulesetId: rulesetId, authorId: authorId };
    });
  });
}

/* Remove every server-side artifact this extension installed for the given
   ruleset id. The local ruleset cache is left in place — Clear handles that
   separately. Same match strategy as install: settings flags on the agent,
   tag array on the lorebook. */
/* List every agent the extension previously installed, grouped by
   mrrRulesetId. Returns a Promise resolving to a map
   { rulesetId: [{id, name, role, authorId, enabled}, ...] }
   so the manage-agents UI can display + bulk-delete. Includes both the
   main GM-style agent (no role) and any additionalAgents (with role).
   Pre-existing duplicates (whether from older install code or authorId
   drift) all show up and can be removed. */
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
     cannot be empty"). DELETE has no body, so omit the header entirely. */
  return fetch("/api" + path, { method: "DELETE" }).then(function (res) {
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
  return fetch("/api" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
            var roleLabel = m.role ? "[" + m.role + "]" : "[gm]";
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

function uninstallBundleArtifacts(rulesetId, authorId, progressCb) {
  function progress(msg) { if (progressCb) progressCb(msg); }
  authorId = authorId || "local";
  return Promise.all([
    apiFetch("/lorebooks", {}),
    apiFetch("/agents", {})
  ]).then(function (results) {
    var lorebooks = results[0];
    var agents = results[1];
    var lb = findManagedLorebook(lorebooks, rulesetId);
    var matches = Array.isArray(agents) ? agents.filter(function (a) {
      var s = parseAgentSettings(a);
      return s.mrrManaged === true && s.mrrRulesetId === rulesetId;
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

function sheetKey(chatId, characterId) {
  return LS_SHEET_PFX + chatId + "-" + characterId;
}

function loadSheet(chatId, ruleset) {
  if (!chatId || !state.activeCharacterId) {
    log("loadSheet -> blank: chatId=" + chatId + " active=" + state.activeCharacterId);
    return blankSheet(ruleset);
  }
  var key = sheetKey(chatId, state.activeCharacterId);
  var raw = lsGet(key);
  if (!raw) {
    log("loadSheet -> blank: no data for " + key);
    return blankSheet(ruleset);
  }
  var parsed = safeParse(raw);
  if (!parsed) {
    warn("loadSheet -> blank: parse failed for " + key);
    return blankSheet(ruleset);
  }
  log("loadSheet hydrated key=" + key + " bytes=" + raw.length);
  return mergeSheet(blankSheet(ruleset), parsed);
}

function saveSheet(chatId, sheet) {
  if (!chatId) { warn("saveSheet skipped: no chatId"); return; }
  if (!state.activeCharacterId) { warn("saveSheet skipped: no activeCharacterId"); return; }
  if (!sheet) { warn("saveSheet skipped: no sheet object"); return; }
  var key = sheetKey(chatId, state.activeCharacterId);
  var payload = JSON.stringify(sheet);
  var ok = lsSet(key, payload);
  if (!ok) { warn("saveSheet: lsSet failed for " + key + " (quota or private mode?)"); return; }
  log("saved key=" + key + " bytes=" + payload.length);
  updateSavedIndicator();
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
   bulk operations, future features). Cheap insurance. */
function flushSave() {
  if (state.chatId && state.activeCharacterId && state.sheet) {
    saveSheet(state.chatId, state.sheet);
  }
}

function loadCharacters(chatId) {
  if (!chatId) return [{ id: "player", name: "Player" }];
  var raw = lsGet("mrr-chars-" + chatId);
  if (raw) {
    var parsed = safeParse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  }
  return [{ id: "player", name: "Player" }];
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
    var raw = lsGet(sheetKey(state.chatId, c.id));
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
  if (b.schema !== BUNDLE_SCHEMA) return "schema mismatch: expected " + BUNDLE_SCHEMA;
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

  /* Wipe the current chat's per-character sheets (overwrite mode) so that
     characters present in the old chat but absent from the bundle don't
     linger in localStorage. */
  state.characters.forEach(function (c) { lsDel(sheetKey(state.chatId, c.id)); });

  /* Write the bundle back into chat-keyed localStorage. The persistence
     layer stays chatId-bound (Marinara's design); the bundle is a
     transport format that lets the user move data between chats. */
  state.characters = b.characters.map(function (c) { return { id: c.id, name: c.name }; });
  saveCharacters();

  /* Iterate the bundle's character list (not Object.keys(sheets)) so a
     character without a stored sheet still gets a valid blank entry on
     next load and we avoid an O(n*m) lookup. */
  b.characters.forEach(function (c) {
    var sheet = b.sheets && b.sheets[c.id];
    if (sheet) lsSet(sheetKey(state.chatId, c.id), JSON.stringify(sheet));
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
    var raw = lsGet(sheetKey(state.chatId, current.id));
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
  lsDel(sheetKey(state.chatId, current.id));
  state.characters = state.characters.filter(function (c) { return c.id !== current.id; });
  saveCharacters();
  switchCharacter(state.characters[0].id);
}

function blankSheet(rs) {
  var s = {
    attributes: {}, skills: {}, derived: {}, states: {},
    track: {}, extraTrack: {},
    inventory: [],
    equipped: {},
    skillProficiency: {},
    skillSpecialties: {},
    backgrounds: [],
    abilities: {},
    abilityCollapse: {}
  };
  rs.attributes.forEach(function (a) { s.attributes[a.name] = (a["default"] != null ? a["default"] : a.min); });
  rs.skills.forEach(function (k) { s.skills[k.name] = (k["default"] != null ? k["default"] : (k.min != null ? k.min : 0)); });
  if (Array.isArray(rs.derivedStats)) {
    rs.derivedStats.forEach(function (d) {
      if (d.renderAs === "track") {
        s.track[d.name] = 0;
        s.extraTrack[d.name] = [];
      } else {
        s.derived[d.name] = 0;
      }
    });
  }
  if (Array.isArray(rs.states)) {
    rs.states.forEach(function (st) { s.states[st.name] = (st.values && st.values[0] && st.values[0].label) || ""; });
  }
  return s;
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
  /* inventory + equipped accept any items / slots the saved sheet carried,
     since item ids and slot names are user-authored at runtime. */
  if (Array.isArray(override.inventory)) {
    base.inventory = override.inventory.filter(function (it) {
      return it && typeof it === "object" && typeof it.id === "string";
    });
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
  return ctx;
}

/* Sum bonuses contributed by every equipped item that targets `target`.
   Returns { dice, value, contributors[] } where:
     - dice  = sum of bonuses with kind === "dice"
     - value = sum of bonuses with kind === "value" (or unset / "successes")
     - contributors = [{name, value, kind, tag}] for tooltip / UI display
   Null-safe: if state.sheet or its inventory/equipped fields are missing
   (legacy saved sheets, mid-load), returns the zero shape. */
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
  var sels = ["textarea.chat-input", "textarea[placeholder*='message' i]", "textarea[placeholder*='type' i]", "textarea"];
  for (var i = 0; i < sels.length; i++) {
    var els = document.querySelectorAll(sels[i]);
    if (els.length) {
      var visible = Array.prototype.filter.call(els, function (el) { return el.offsetParent !== null; });
      if (visible.length) return visible[visible.length - 1];
    }
  }
  return null;
}

function insertIntoChatInput(text) {
  var ta = findChatInputTextarea();
  if (!ta) { warn("chat input not found; tag was: " + text); return false; }
  var prev = ta.value || "";
  var sep = (prev && !prev.endsWith(" ") && !prev.endsWith("\n")) ? " " : "";
  ta.value = prev + sep + text;
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

function renderSheet() {
  if (!state.ruleset) return;

  /* Reset refresh registries; render passes repopulate during this call. */
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

  renderSheetHeader(state.mountEl);

  if (floating) {
    var sheetHeader = state.mountEl.querySelector(".mrr-sheet__header");
    if (sheetHeader) makeDraggable(state.mountEl, sheetHeader, "mrr-sheet-pos");
    state.sheetResizeObserver = makeResizable(state.mountEl, LS_SHEET_SIZE);
  }

  var sections = (state.ruleset.sheetSections && state.ruleset.sheetSections.length)
    ? state.ruleset.sheetSections
    : ["attributes", "skills", "derived", "states"];

  sections.forEach(function (sec) {
    if (sec === "attributes") renderAttributes(state.mountEl);
    else if (sec === "skills") renderSkills(state.mountEl);
    else if (sec === "derived") renderDerived(state.mountEl);
    else if (sec === "states") renderStates(state.mountEl);
    else if (sec === "backgrounds") renderBackgrounds(state.mountEl);
    else if (sec === "inventory") renderInventory(state.mountEl);
    else if (sec === "abilities") renderAbilitiesSection(state.mountEl);
  });

  /* If the ruleset declares abilities and the section list does NOT include
     "abilities" explicitly, append it automatically — most authors will not
     remember to list it, and the row is meant to be ubiquitous when the
     vocabulary exists. Anti-regression: never auto-append on rulesets without
     an abilities block. */
  if (state.ruleset.abilities && Array.isArray(state.ruleset.abilities.categories) && sections.indexOf("abilities") === -1) {
    renderAbilitiesSection(state.mountEl);
  }

  var actions = marinara.addElement(state.mountEl, "div", { "class": "mrr-section" });
  if (actions) {
    var btnRoll = marinara.addElement(actions, "button", { "class": "mrr-dice__btn", textContent: "Open dice widget" });
    var btnSync = marinara.addElement(actions, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary mrr-dice__btn--row-spaced", textContent: "Sync sheet to chat fields" });
    if (btnRoll) marinara.on(btnRoll, "click", function () { showDice(true); });
    if (btnSync) marinara.on(btnSync, "click", syncSheetToChat);
  }

  /* renderSheet rebuilds state.mountEl from scratch every call; the new
     element has no mrr-hidden class regardless of the user's collapsed
     preference. Re-apply so character-switch / rename / bundle-import
     paths don't accidentally pop the sheet open. */
  applyCollapsed(state.collapsed);
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
  var val = marinara.addElement(row, "span", { "class": "mrr-row__value", textContent: String(state.sheet.attributes[attr.name]) });

  addStepper(row, {
    get: function () { return state.sheet.attributes[attr.name]; },
    set: function (v) { state.sheet.attributes[attr.name] = v; saveSheet(state.chatId, state.sheet); },
    min: attr.min,
    max: attr.max,
    onChange: function (v) {
      if (val) val.textContent = String(v);
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
}

function renderSkillRow(parent, skill) {
  var row = marinara.addElement(parent, "div", { "class": "mrr-row" });
  if (!row) return;
  marinara.addElement(row, "span", { "class": "mrr-row__name", textContent: skill.name });
  marinara.addElement(row, "span", { "class": "mrr-row__abbr", textContent: skill.linkedAttribute ? "(" + skill.linkedAttribute + ")" : "" });
  var val = marinara.addElement(row, "span", { "class": "mrr-row__value", textContent: String(state.sheet.skills[skill.name]) });

  var stp = addStepper(row, {
    get: function () { return state.sheet.skills[skill.name]; },
    set: function (v) { state.sheet.skills[skill.name] = v; saveSheet(state.chatId, state.sheet); },
    min: skill.min != null ? skill.min : 0,
    max: skill.max != null ? skill.max : DEFAULT_SKILL_MAX,
    onChange: function (v) {
      if (val) val.textContent = String(v);
      refreshAllBars();
    }
  });
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

function quickRollForSkill(skill) {
  var mode = state.ruleset.resolution.mode;
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
    state.diceContext.base.mod  = state.sheet.skills[skill.name] || 0;
    state.diceContext.base.prof = tierBonus;
    setDiceInput("mod",   state.diceContext.base.mod);
    setDiceInput("prof",  state.diceContext.base.prof);
    setDiceInput("equip", bonuses.value);
  } else if (mode === MODES.FATE) {
    state.diceContext.base.skill = (state.sheet.skills[skill.name] || 0) + bonuses.value + tierBonus;
    setDiceInput("skill", state.diceContext.base.skill);
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

function renderValue(parent, derived) {
  var row = marinara.addElement(parent, "div", { "class": "mrr-row mrr-row--compact" });
  if (!row) return;
  var val = marinara.addElement(row, "span", { "class": "mrr-row__value", textContent: String(state.sheet.derived[derived.name] || 0) });
  var bonusSpan = marinara.addElement(row, "span", { "class": "mrr-row__bonus" });
  refreshDerivedBonus(bonusSpan, derived.name);
  derivedBonusRefreshers.push(function () { refreshDerivedBonus(bonusSpan, derived.name); });
  addStepper(row, {
    get: function () { return state.sheet.derived[derived.name] || 0; },
    set: function (v) { state.sheet.derived[derived.name] = v; saveSheet(state.chatId, state.sheet); },
    min: -999,
    max: 999,
    onChange: function (v) {
      if (val) val.textContent = String(v);
      /* A derived value (e.g. Essence) may be referenced by another stat's
         maxFormula (e.g. Personal Motes = {Essence}*3+10). Refresh the bars
         in-place so dependents pick up the new max — DOM is not rebuilt,
         so the user's scroll position survives. */
      refreshAllBars();
    }
  });
}

function renderBar(parent, derived) {
  var bar = marinara.addElement(parent, "div", { "class": "mrr-bar" });
  if (!bar) return;
  var fill = marinara.addElement(bar, "div", { "class": "mrr-bar__fill" });
  var label = marinara.addElement(bar, "div", { "class": "mrr-bar__label" });

  function computeMax() {
    if (derived.maxFormula) {
      var v = evalFormula(derived.maxFormula, statContext());
      if (v != null && v > 0) return Math.floor(v);
    }
    return derived.max || DEFAULT_BAR_MAX;
  }

  function refresh() {
    if (!fill || !fill.parentNode) return;
    var max = computeMax();
    var v = state.sheet.derived[derived.name] || 0;
    fill.style.width = Math.max(0, Math.min(100, (v / max) * 100)) + "%";
    if (label) label.textContent = v + " / " + max;
  }
  refresh();
  barRefreshers.push(refresh);

  var ctrl = marinara.addElement(parent, "div", { "class": "mrr-state" });
  if (!ctrl) return;
  addStepper(ctrl, {
    get: function () { return state.sheet.derived[derived.name] || 0; },
    set: function (v) { state.sheet.derived[derived.name] = v; saveSheet(state.chatId, state.sheet); },
    min: 0,
    max: computeMax,
    onChange: refreshAllBars
  });
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

  var row = marinara.addElement(parent, "div", { "class": "mrr-skill-spec-row" });
  if (!row) return;

  var nameInput = marinara.addElement(row, "input", {
    "class": "mrr-skill-spec-name",
    type: "text",
    placeholder: "background (e.g. Resources, Allies)",
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

  var valSpan = marinara.addElement(row, "span", {
    "class": "mrr-row__value",
    textContent: String(entry.value || 0)
  });
  addStepper(row, {
    get: function () { return entry.value || 0; },
    set: function (v) { entry.value = v; saveSheet(state.chatId, state.sheet); },
    min: lo,
    max: hi,
    onChange: function (v) { if (valSpan) valSpan.textContent = String(v); }
  });

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
  marinara.addElement(sec, "div", { "class": "mrr-section__title", textContent: "Inventory" });

  var list = marinara.addElement(sec, "div", { "class": "mrr-inv-list" });
  if (!list) return;

  function rebuild() {
    list.textContent = "";
    var inv = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
    if (!inv.length) {
      marinara.addElement(list, "div", { "class": "mrr-inv-empty", textContent: "No items. Use the button below to add one." });
    }
    inv.forEach(function (item) {
      var row = marinara.addElement(list, "div", { "class": "mrr-inv-item" });
      if (!row) return;
      var equippedHere = item.slot && state.sheet.equipped[item.slot] === item.id;
      if (equippedHere) row.classList.add("mrr-inv-item--equipped");

      marinara.addElement(row, "span", { "class": "mrr-inv-item__name", textContent: item.name || "(unnamed)" });
      marinara.addElement(row, "span", { "class": "mrr-inv-item__slot", textContent: item.slot ? "[" + item.slot + "]" : "" });

      var summarySpan = marinara.addElement(row, "span", { "class": "mrr-inv-item__bonus-summary", textContent: formatBonuses(item.bonuses, false) });
      if (summarySpan) summarySpan.title = formatBonuses(item.bonuses, true);

      var equipBtn = marinara.addElement(row, "button", {
        "class": "mrr-char-btn" + (equippedHere ? " mrr-char-btn--accent" : ""),
        textContent: equippedHere ? "Equipped" : "Equip",
        title: item.slot ? ("Toggle equip in slot \"" + item.slot + "\"") : "Set a slot on this item to equip it"
      });
      if (equipBtn) marinara.on(equipBtn, "click", function () { toggleEquip(item); rebuild(); refreshAllEquipmentBonuses(); });

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

    var addBtn = marinara.addElement(list, "button", { "class": "mrr-char-btn mrr-char-btn--dashed", textContent: "+ Add item" });
    if (addBtn) marinara.on(addBtn, "click", function () { openItemDialog(null, rebuild); });
  }
  rebuild();
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
  if (state.sheet.equipped[item.slot] === item.id) {
    delete state.sheet.equipped[item.slot];
  } else {
    state.sheet.equipped[item.slot] = item.id;
  }
  saveSheet(state.chatId, state.sheet);
}

function deleteItem(id) {
  if (!Array.isArray(state.sheet.inventory)) return;
  state.sheet.inventory = state.sheet.inventory.filter(function (it) { return it.id !== id; });
  if (state.sheet.equipped) {
    Object.keys(state.sheet.equipped).forEach(function (slot) {
      if (state.sheet.equipped[slot] === id) delete state.sheet.equipped[slot];
    });
  }
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

function openItemDialog(itemId, onSaved) {
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
    : { id: "item-" + Date.now() + "-" + Math.floor(Math.random() * 1000), name: "", slot: "", bonuses: [], notes: "" };

  marinara.addElement(dialog, "h3", { textContent: existing ? "Edit Item" : "New Item" });

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
      draft.notes = (notesInput && notesInput.value || "").trim();
      /* Drop any in-progress bonus rows that the user never picked a
         target for. Saves the user from typo-by-omission. */
      draft.bonuses = (draft.bonuses || []).filter(function (b) { return b && b.target; });

      if (!Array.isArray(state.sheet.inventory)) state.sheet.inventory = [];
      var existingIdx = state.sheet.inventory.findIndex(function (it) { return it.id === draft.id; });
      if (existingIdx >= 0) state.sheet.inventory[existingIdx] = draft;
      else state.sheet.inventory.push(draft);

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
    if (!state.spellbookEl) buildSpellbook();
    if (state.spellbookEl) {
      state.spellbookEl.classList.add("mrr-spellbook--open");
      state.spellbookOpen = true;
      renderSpellbookContents();
    }
  } else {
    if (state.spellbookEl) state.spellbookEl.classList.remove("mrr-spellbook--open");
    state.spellbookOpen = false;
  }
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
}

function renderSpellbookCategory(body, cat, orphanCategoryIds) {
  var sec = marinara.addElement(body, "div", { "class": "mrr-spellbook-cat" });
  if (!sec) return;

  var count = orphanCategoryIds
    ? orphanCategoryIds.reduce(function (n, id) { return n + abilityCountForCategory(id); }, 0)
    : abilityCountForCategory(cat.id);

  var collapsed = (cat.id in state.sheet.abilityCollapse)
    ? !!state.sheet.abilityCollapse[cat.id]
    : true;
  if (collapsed) sec.classList.add("mrr-spellbook-cat--collapsed");

  var head = marinara.addElement(sec, "button", {
    "class": "mrr-spellbook-cat__head",
    type: "button",
    textContent: cat.label + " " + count
  });
  if (head) marinara.on(head, "click", function () {
    state.sheet.abilityCollapse[cat.id] = !state.sheet.abilityCollapse[cat.id]
      ? false
      : true;
    /* Toggle: read current effective state, flip, persist. The default-true
       fallback above means an unset key behaves as collapsed; flipping it
       sets it explicitly. */
    var nowCollapsed = sec.classList.toggle("mrr-spellbook-cat--collapsed");
    state.sheet.abilityCollapse[cat.id] = nowCollapsed;
    saveSheet(state.chatId, state.sheet);
  });

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

  var editBtn = marinara.addElement(row, "button", { "class": "mrr-char-btn", type: "button", textContent: "Edit" });
  if (editBtn) marinara.on(editBtn, "click", function () { openAbilityDialog(ab.id, catId); });

  var delBtn = marinara.addElement(row, "button", { "class": "mrr-char-btn mrr-char-btn--danger", type: "button", textContent: "x", title: "Delete" });
  if (delBtn) marinara.on(delBtn, "click", function () {
    if (!window.confirm("Delete \"" + (ab.name || ab.id) + "\"?")) return;
    deleteAbility(catId, ab.id);
  });
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
        lorebookEntryId: ""
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
  var effectInput = marinara.addElement(effectRow, "input", {
    "class": "mrr-item-form__input",
    type: "text",
    value: draft.effectText || "",
    placeholder: "8d6 fire, 150ft, basic Reflex"
  });

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
  if (!ability || !ability.lorebookEntryId || !state.spellbookLbId) {
    return Promise.resolve();
  }
  return apiDeleteRaw("/lorebooks/" + state.spellbookLbId + "/entries/" + ability.lorebookEntryId);
}

/* ─────  dice widget  ───── */

function buildDice() {
  if (state.diceEl) return state.diceEl;
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
  else if (mode === MODES.D100)   buildD100Widget();
  else if (mode === MODES.PBTA)   buildPbtaWidget();
  else if (mode === MODES.FATE)   buildFateWidget();
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
  diceFooter(d, "Roll d20", rollSingleRoll);
}

function buildPoolWidget() {
  var d = state.diceEl;
  diceRow(d, "Pool",       "pool",  "5");
  diceRow(d, "Difficulty", "diff",  "2");
  diceRow(d, "Stunt",      "stunt", "0");
  diceRow(d, "Equipment",  "equip", "0");
  diceFooter(d, "Roll pool", rollDicePool);
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

var lastRollText = null;

function rollSingleRoll() {
  var mod   = numFromInput("mod",   0);
  var prof  = numFromInput("prof",  0);
  var equip = numFromInput("equip", 0);
  var dc    = numFromInput("dc",    15);
  var face = 1 + Math.floor(Math.random() * 20);
  var total = face + mod + prof + equip;
  var pass = total >= dc;
  var label = pass ? "success" : "failure";
  var equipPart = equip ? (equip > 0 ? "+" + equip : String(equip)) : "";
  var text = "[dice: 1d20+" + mod + (prof ? "+" + prof : "") + equipPart + " vs DC" + dc + " = " + total + " " + label + " (face " + face + ")]";
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

  var target = state.ruleset.resolution.target || 7;
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
  if (!state.diceEl) buildDice();
  if (!state.diceEl) return;
  if (open) {
    state.diceEl.classList.add("mrr-dice--open");
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
    var btnAgentMgr  = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Manage agents" });
    var btnFetch     = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Fetch URL" });
    var btnFile      = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Choose file..." });
    var btnClear     = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Clear" });
    var btnUninstall = marinara.addElement(buttons, "button", { "class": "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Uninstall server data" });
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

    if (btnAgentMgr) marinara.on(btnAgentMgr, "click", function () {
      openAgentManagerDialog();
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

function syncSheetToChat() {
  if (!state.chatId) { warn("no chat id; cannot sync"); return; }
  var current = state.characters.find(function (c) { return c.id === state.activeCharacterId; });
  var prefix = current ? "[" + current.name + "] " : "";

  marinara.apiFetch("/chats/" + state.chatId).then(function (chat) {
    var existing = (chat && chat.customTrackerFields) || [];
    /* Read-modify-write so other characters' synced fields survive when we
       update this character's slice. Strip our own prefix, then re-add. */
    var kept = existing.filter(function (f) { return !f.name || f.name.indexOf(prefix) !== 0; });
    var fresh = [];
    Object.keys(state.sheet.attributes).forEach(function (n) { fresh.push({ name: prefix + n, value: String(state.sheet.attributes[n]) }); });
    Object.keys(state.sheet.skills    ).forEach(function (n) { fresh.push({ name: prefix + n, value: String(state.sheet.skills[n]) }); });
    Object.keys(state.sheet.derived   ).forEach(function (n) { fresh.push({ name: prefix + n, value: String(state.sheet.derived[n]) }); });
    Object.keys(state.sheet.states    ).forEach(function (n) { fresh.push({ name: prefix + n, value: String(state.sheet.states[n]) }); });
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

function loadProcessedMessageIds(chatId) {
  if (!chatId) { processedMessageIds = {}; processedMessageIdsChatId = null; return; }
  if (processedMessageIdsChatId === chatId) return; /* already loaded */
  var raw = lsGet(LS_PROCESSED_MSGS_PFX + chatId);
  var parsed = raw ? safeParse(raw) : null;
  processedMessageIds = (parsed && typeof parsed === "object") ? parsed : {};
  processedMessageIdsChatId = chatId;
}

function saveProcessedMessageIds() {
  if (!processedMessageIdsChatId) return;
  lsSet(LS_PROCESSED_MSGS_PFX + processedMessageIdsChatId, JSON.stringify(processedMessageIds));
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
        return { trackName: d.name, typeId: dt.id, types: types };
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
  var i, m, keys, k;
  for (i = 0; i < maps.length; i++) {
    m = sheet[maps[i]];
    if (m && typeof m === "object" && Object.prototype.hasOwnProperty.call(m, field)) {
      return { map: maps[i], key: field };
    }
  }
  var target = normalizeFieldKey(field);
  if (!target) return null;
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
    if (attrs.add) {
      var existing = null;
      for (var i = 0; i < sheet.inventory.length; i++) {
        if (sheet.inventory[i] && sheet.inventory[i].name === attrs.add) { existing = sheet.inventory[i]; break; }
      }
      if (existing) {
        existing.quantity = (existing.quantity || 1) + qty;
      } else {
        sheet.inventory.push({ name: attrs.add, quantity: qty, description: attrs.reason || "", location: "on_person" });
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

  /* Numeric delta path. Resolve the field against the sheet's typed
     numeric maps (derived / attributes / skills). Exact match first,
     normalized fallback so AI-emitted variants ("hp" / "HP",
     "peripheralMotes" / "Peripheral Motes") still hit the canonical
     Title-Case key the ruleset declared. */
  if (attrs.delta == null) return false;
  var delta = parseInt(attrs.delta, 10);
  if (isNaN(delta)) return false;

  /* Typed-damage path. If the field names a damage type declared on a
     track-renderAs derived stat (Exalted bashing/lethal/aggravated),
     mutate that type's counter. Migration: a legacy numeric track value
     gets folded into the lightest type before mutation lands. */
  var dmg = resolveDamageType(field);
  if (dmg) {
    var damage = ensureTypedTrack(dmg.trackName, dmg.types);
    var dCurrent = (typeof damage[dmg.typeId] === "number") ? damage[dmg.typeId] : 0;
    damage[dmg.typeId] = Math.max(0, dCurrent + delta);
    return finalizeMutation(attrs);
  }

  var resolved = resolveSheetField(sheet, field);
  if (resolved) {
    var bucket = sheet[resolved.map];
    var current = (typeof bucket[resolved.key] === "number") ? bucket[resolved.key] : 0;
    var max = resolvedFieldMax(resolved.map, resolved.key);
    var next = current + delta;
    if (typeof max === "number") next = Math.min(max, next);
    bucket[resolved.key] = Math.max(0, next);
    return finalizeMutation(attrs);
  }
  /* Unknown field — stash on the sheet root as a generic numeric so
     ad-hoc ruleset stats still apply without prior schema awareness.
     Warn so unmatched AI variants are visible during ruleset bring-up. */
  warn("state-mutator: unmatched field '" + field + "' — stashed on sheet root");
  var rootCurrent = (typeof sheet[field] === "number") ? sheet[field] : 0;
  sheet[field] = Math.max(0, rootCurrent + delta);
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

  if (!processedMessageIds[msgId]) {
    var tags = parseStateTags(text);
    var applied = 0;
    for (var i = 0; i < tags.length; i++) {
      if (applyStateMutation(tags[i].attrs)) applied++;
    }
    processedMessageIds[msgId] = true;
    saveProcessedMessageIds();
    log("state-mutator: applied " + applied + "/" + tags.length + " mutation(s) from message " + msgId);
  }
  /* Visual hiding runs every observation — Marinara may re-render the
     message and unwrap our spans; we re-wrap on next mutation. */
  hideStateTagsInElement(node);
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

init();
