"use strict";

var LS_RULESET = "marinara-rpg-ruleset";

var LS_RULESET_URL = "marinara-rpg-ruleset-url";

var LS_LIBRARY = "marinara-rpg-ruleset-library";

var LS_SHEET_PFX = "mrr-sheet-";

var LS_CHARACTER_PFX = "mrr-character-";

var LS_SHEET_SIZE = LS_SHEET_PFX + "size";

var LS_SHEET_COLLAPSED_PFX = LS_SHEET_PFX + "collapsed-";

var LS_SPELLBOOK_POS = "mrr-spellbook-pos";

var LS_INTIMACIES_POS = "mrr-intimacies-pos";

var LS_SPELLBOOK_LB_PFX = "mrr-spellbook-lb-";

var LS_PROCESSED_MSGS_PFX = "mrr-processed-msgs-";

var LS_PROCESSED_RUNS_PFX = "mrr-processed-runs-";

var LS_MUTATION_JOURNAL_PFX = "mrr-mutation-journal-";

var LS_AUTOSWITCH_GUARD = "mrr-autoswitch-guard";

var LS_SWITCH_INTENT = "mrr-ruleset-switch-intent";

var MRR_RUNS_POLLER_MODE = "apply";

var MRR_TAG_SPELLBOOK = "mrr-spellbook";

var MRR_TAG_CHAR_PFX = "mrr-char-";

var MRR_TAG_CAT_PFX = "mrr-cat-";

var EXT_VERSION = "1.1.0";

var BUNDLE_SCHEMA_ID = "mrr-bundle";

var MRR_AGENT_TYPE = "mrr-overlay-v1";

function mrrManagedAgentTypes(agents, rulesetId) {
  var out = [];
  var list = Array.isArray(agents) ? agents : [];
  for (var i = 0; i < list.length; i++) {
    var a = list[i];
    var s = parseAgentSettings(a);
    if (!s || s.mrrManaged !== true || s.mrrRulesetId !== rulesetId) continue;
    if (typeof a.type === "string" && a.type && out.indexOf(a.type) === -1) out.push(a.type);
  }
  return out;
}

function mrrAgentTypeForRole(role) {
  if (!role || role === "main") return MRR_AGENT_TYPE;
  var slug = String(role).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? MRR_AGENT_TYPE + "-" + slug : MRR_AGENT_TYPE;
}

var MRR_TAG_MANAGED = "mrr-managed";

var MRR_TAG_RS_PFX = "mrr:";

var MRR_PROMPT_PFX = "[mrr-v1:";

var MRR_REGEX_NAME_PFX = "MRR: ";

var MRR_TOOL_NAME_PFX = "mrr_";

var EMBED_STYLE_ID = "mrr-embedded-style";

var EMBEDDED_CSS = '/*\n * Marinara-RPG-Extension — RPG-Extension-GM-Mode.css\n * Companion stylesheet for RPG-Extension-GM-Mode.js. This file is bundled into\n * the loader automatically via tools/embed-css.mjs — you do not paste it by hand.\n * Install the extension by importing the folder/manifest (or the single .js file)\n * in Marinara Engine -> Settings -> Extensions.\n *\n * License: MIT\n * Source:  https://github.com/Kenhito/Marinara-RPG-Extension\n */\n\n:root {\n  /* Phase 4 — design-token migration: oklch palette + Geist font stack\n   * Ported from ~/projects/claude-design-updates/styles.css. Token NAMES preserved\n   * so existing rules resolve unchanged. New tokens (h/c/l, *-soft, *-line, *-app,\n   * *-input, hairline, hairline-strong, *-text-faint, *-sans) added per prototype.\n   * The old-value/new-value mapping lived in tools/token-migration-map.json,\n   * a one-off migration record deleted in round 27 once the migration closed;\n   * the CHANGELOG entry for the Phase-4 token pass retains its summary. */\n\n  /* tweakable accent (purple, port of prototype --accent-h/c/l) */\n  --mrr-accent-h: 280;\n  --mrr-accent-c: 0.12;\n  --mrr-accent-l: 0.78;\n\n  /* derived accent — original token names preserved */\n  --mrr-accent:       oklch(var(--mrr-accent-l) var(--mrr-accent-c) var(--mrr-accent-h));\n  --mrr-accent-soft:  oklch(var(--mrr-accent-l) var(--mrr-accent-c) var(--mrr-accent-h) / 0.18);\n  --mrr-accent-line:  oklch(var(--mrr-accent-l) var(--mrr-accent-c) var(--mrr-accent-h) / 0.32);\n  --mrr-accent-dim:   oklch(var(--mrr-accent-l) var(--mrr-accent-c) var(--mrr-accent-h) / 0.30);\n  --mrr-on-accent:    oklch(0.18 0.04 var(--mrr-accent-h));\n\n  /* surfaces — purple/dark mood per prototype --bg-app/--bg/--bg-elev/--bg-input */\n  --mrr-bg:           oklch(0.21 0.025 285 / 0.96);\n  --mrr-bg-elev:      oklch(0.26 0.03 285 / 0.92);\n  --mrr-bg-app:       oklch(0.16 0.02 285);\n  --mrr-bg-input:     oklch(0.18 0.02 285);\n\n  /* hairlines (NEW) and borders (NAMES retained) */\n  --mrr-hairline:        oklch(1 0 0 / 0.07);\n  --mrr-hairline-strong: oklch(1 0 0 / 0.14);\n  --mrr-border:          oklch(1 0 0 / 0.10);\n  --mrr-border-strong:   oklch(1 0 0 / 0.20);\n\n  /* tints — port of prototype --tint/--tint-2 (--tint-strong retained) */\n  --mrr-tint-1:       oklch(1 0 0 / 0.04);\n  --mrr-tint-2:       oklch(1 0 0 / 0.07);\n  --mrr-tint-strong:  oklch(1 0 0 / 0.20);\n\n  /* text — three tiers per prototype --text/--text-dim/--text-faint */\n  --mrr-text:        oklch(0.97 0.005 285);\n  --mrr-text-dim:    oklch(0.72 0.01 285);\n  --mrr-text-faint:  oklch(0.55 0.012 285);\n\n  /* status — port of prototype --ok/--warn/--bad */\n  --mrr-success:    oklch(0.82 0.13 155);\n  --mrr-warning:    oklch(0.84 0.14 85);\n  --mrr-fail:       oklch(0.72 0.16 25);\n  --mrr-on-fail:    oklch(0.18 0.02 25);\n\n  /* radii / spacing — preserved (density toggle deferred to step 4.4) */\n  --mrr-radius:     8px;\n  --mrr-radius-sm:  4px;\n  --mrr-pad:        10px;\n  --mrr-gap:        6px;\n\n  /* shadow — ported from prototype --shadow (richer drop) */\n  --mrr-shadow:     0 24px 60px -20px rgba(0, 0, 0, 0.6), 0 6px 16px -8px rgba(0, 0, 0, 0.5);\n\n  /* typography — ported from prototype --sans/--mono (Geist-first stack) */\n  --mrr-sans:       "Geist", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;\n  --mrr-mono:       "Geist Mono", ui-monospace, "JetBrains Mono", "SF Mono", Menlo, monospace;\n\n  /* layering — preserved */\n  --mrr-z-sheet:    9997;\n  --mrr-z-dice:     9998;\n  --mrr-z-dialog:   9999;\n\n  /* Phase 5 step 5.5 — density toggle (cozy preset defaults; branched per\n   * .mrr-sheet[data-density="…"] at end of file). Drives padding, gap,\n   * row height, and body font-size across density-aware components. */\n  --mrr-density-pad-x: 12px;\n  --mrr-density-pad-y: 12px;\n  --mrr-density-gap:    6px;\n  --mrr-density-row-h: 28px;\n  --mrr-density-fs:    13px;\n}\n\n.mrr-hidden { display: none !important; }\n.mrr-msg--hidden,\n.mrr-dice__result--hidden { display: none; }\n\n/*  ─────  Sheet panel (replaces the hidden built-in attribute panel) ───── */\n\n.mrr-sheet {\n  display: flex;\n  flex-direction: column;\n  gap: var(--mrr-gap);\n  background: var(--mrr-bg);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius);\n  padding: var(--mrr-pad);\n  margin: var(--mrr-gap) 0;\n  color: var(--mrr-text);\n  font-family: var(--mrr-sans);\n  font-size: var(--mrr-density-fs);\n}\n\n.mrr-sheet--floating {\n  position: fixed;\n  left: 16px;\n  top: 80px;\n  width: 320px;\n  min-width: 280px;\n  max-width: calc(100vw - 32px);\n  min-height: 200px;\n  max-height: 70vh;\n  overflow: auto;\n  resize: both;\n  z-index: var(--mrr-z-sheet);\n}\n\n.mrr-sheet__header {\n  display: flex;\n  flex-direction: column;\n  gap: var(--mrr-density-gap);\n  border-bottom: 1px solid var(--mrr-border);\n  padding-bottom: 6px;\n  margin-bottom: 4px;\n}\n\n.mrr-sheet__title-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  width: 100%;\n}\n\n.mrr-sheet__title {\n  font-weight: 600;\n  letter-spacing: 0.02em;\n  color: var(--mrr-accent);\n}\n\n.mrr-sheet__meta {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n}\n\n.mrr-sheet__char-row {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n\n/* Phase 5 step 5.1 — Identity card (port of prototype\'s `.identity`).\n   Sits at the bottom of the sheet header, immediately above the body.\n   Wraps the existing renderIdentityField inputs so save/load behavior\n   is preserved verbatim. Ruleset-driven sub-row honors identityFields[]\n   when declared; otherwise falls back to header.raceLabel/classLabel.\n   Token names mirror the prototype: __avatar, __main, __name, __sub,\n   __sub-item, __sub-label, __sub-input. Type scale matches UI-build.md\n   §3.4 exactly: name 16px/600, sub-label 9px uppercase letter-spacing\n   0.1em, sub-input 12px borderless text-dim. */\n.mrr-identity {\n  background: linear-gradient(145deg, var(--mrr-accent-soft), transparent 70%), var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-hairline);\n  border-radius: var(--mrr-radius);\n  padding: var(--mrr-pad);\n  display: grid;\n  grid-template-columns: 44px 1fr;\n  gap: 10px;\n  align-items: center;\n  margin-top: var(--mrr-gap);\n}\n.mrr-identity__avatar {\n  width: 44px;\n  height: 44px;\n  border-radius: 10px;\n  background: repeating-linear-gradient(\n    45deg,\n    oklch(0.3 0.04 285) 0 6px,\n    oklch(0.26 0.04 285) 6px 12px\n  );\n  color: var(--mrr-text-dim);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  border: 1px dashed var(--mrr-hairline-strong);\n}\n.mrr-identity__main {\n  min-width: 0;\n}\n.mrr-identity__name {\n  background: transparent;\n  border: 0;\n  color: var(--mrr-text);\n  font-size: 16px;\n  font-weight: 600;\n  padding: 0;\n  width: 100%;\n  outline: none;\n  font-family: inherit;\n}\n.mrr-identity__name:focus {\n  color: var(--mrr-accent);\n}\n.mrr-identity__sub {\n  display: flex;\n  gap: 8px;\n  margin-top: 2px;\n  flex-wrap: wrap;\n}\n.mrr-identity__sub-item {\n  display: flex;\n  flex-direction: column;\n  gap: 0;\n  min-width: 0;\n}\n.mrr-identity__sub-label {\n  font-size: 9px;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--mrr-text-faint);\n}\n.mrr-identity__sub-input {\n  background: transparent;\n  border: 0;\n  color: var(--mrr-text-dim);\n  font-size: 12px;\n  padding: 0;\n  width: 100px;\n  outline: none;\n  font-family: inherit;\n}\n.mrr-identity__sub-input:focus {\n  color: var(--mrr-accent);\n}\n\n.mrr-sheet__char-label {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-char-select {\n  flex: 1;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-family: inherit;\n  font-size: 12px;\n}\n\n.mrr-char-btn {\n  background: var(--mrr-tint-2);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-size: 11px;\n  cursor: pointer;\n  font-family: inherit;\n}\n\n.mrr-char-btn:hover { background: var(--mrr-accent-dim); }\n\n.mrr-char-btn--danger:hover {\n  background: rgba(251, 113, 133, 0.30);\n  border-color: var(--mrr-fail);\n}\n\n.mrr-char-btn--accent {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n}\n\n.mrr-char-btn--dashed {\n  border-style: dashed;\n  border-color: var(--mrr-accent-dim);\n}\n\n.mrr-draggable-handle { cursor: grab; user-select: none; touch-action: none; }\n.mrr-draggable-handle:active { cursor: grabbing; }\n\n.mrr-section {\n  display: flex;\n  flex-direction: column;\n  gap: var(--mrr-density-gap);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: var(--mrr-density-pad-y) var(--mrr-density-pad-x);\n  background: var(--mrr-bg-elev);\n}\n\n.mrr-section__title {\n  font-size: 11px;\n  font-weight: 700;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--mrr-text-dim);\n  margin-bottom: 2px;\n}\n\n.mrr-group {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  margin-bottom: 6px;\n}\n\n.mrr-group__label {\n  font-size: 10px;\n  letter-spacing: 0.10em;\n  text-transform: uppercase;\n  color: var(--mrr-accent);\n  margin-top: 4px;\n}\n\n.mrr-row {\n  display: grid;\n  grid-template-columns: 1fr auto auto auto;\n  align-items: center;\n  gap: var(--mrr-density-gap);\n  padding: 2px 4px;\n  border-radius: var(--mrr-radius-sm);\n}\n\n.mrr-row:hover {\n  background: var(--mrr-tint-1);\n}\n\n.mrr-row--compact {\n  grid-template-columns: 1fr auto auto;\n}\n\n.mrr-row__name {\n  font-weight: 500;\n}\n\n.mrr-row__abbr {\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-row__value {\n  min-width: 32px;\n  text-align: right;\n  font-family: var(--mrr-mono);\n}\n\n/* Editable numeric input — replaces the historical value <span> on every\n   numeric sheet row (attributes, skills, derived, backgrounds, custom\n   skills, bar current values). Visually flush with the surrounding row;\n   the user types directly. The browser\'s native number-input spinners\n   are suppressed because the +/- stepper next to the field already\n   provides the same affordance and double controls are visual noise. */\n.mrr-row__value--editable {\n  width: 48px;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 1px 4px;\n  font-family: var(--mrr-mono);\n  font-size: 12px;\n  text-align: right;\n  -moz-appearance: textfield;\n}\n.mrr-row__value--editable:focus {\n  outline: none;\n  border-color: var(--mrr-accent);\n  background: var(--mrr-bg);\n}\n.mrr-row__value--editable::-webkit-outer-spin-button,\n.mrr-row__value--editable::-webkit-inner-spin-button {\n  -webkit-appearance: none;\n  margin: 0;\n}\n\n/* Condition row inline effect summary — small, dim, italic so it\n   reads as metadata next to the condition name without competing for\n   the row\'s primary attention. */\n.mrr-condition-effect {\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  font-style: italic;\n  flex: 1;\n  margin-left: 6px;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n/* Advantage / disadvantage toggle row in the d20 dice widget. */\n.mrr-dice__adv-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  margin: 4px 0;\n}\n.mrr-dice__adv-row label {\n  flex: 0 0 80px;\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n.mrr-adv-btn {\n  flex: 1;\n  padding: 4px 8px;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  font-family: inherit;\n  font-size: 11px;\n  cursor: pointer;\n}\n.mrr-adv-btn:hover { background: var(--mrr-accent-dim); }\n.mrr-adv-btn--active {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-accent);\n}\n\n/* "/" separator that sits between the editable current and editable\n   max inputs on bars without an engine-declared cap (D&D HP, etc.).\n   Dimmed because it\'s a visual cue, not a control. */\n.mrr-bar__sep {\n  font-family: var(--mrr-mono);\n  font-size: 12px;\n  color: var(--mrr-text-dim);\n  padding: 0 2px;\n}\n\n/* Auto-calculated derived stat — value computed from `valueFormula` every\n   time the stat context changes. Read-only by design; the formula IS the\n   override path. Subtle accent stripe on the left distinguishes it from\n   manually-entered values without screaming for attention. */\n.mrr-row__value--autocalc {\n  min-width: 32px;\n  text-align: right;\n  font-family: var(--mrr-mono);\n  color: var(--mrr-accent);\n  border-left: 2px solid var(--mrr-accent-dim);\n  padding-left: 6px;\n}\n\n.mrr-row__roll {\n  font-size: 11px;\n  padding: 2px 6px;\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-accent-dim);\n  border: 1px solid var(--mrr-accent-dim);\n  color: var(--mrr-text);\n  cursor: pointer;\n  font-family: inherit;\n}\n\n.mrr-row__roll:hover { background: var(--mrr-accent); color: var(--mrr-on-accent); }\n\n/*  ─────  Skill proficiency tier button + specialty sub-row  ───── */\n\n/* Shared base for the small letter buttons that sit inside the stepper\n   group on each skill row. Kept separate from `.mrr-stepper button` so\n   the stepper can be 18×18 (numeric +/-) while these are 22×18 (single\n   uppercase letter or "+S") without re-spec\'ing every property. */\n.mrr-skill-tier-btn,\n.mrr-skill-spec-btn {\n  width: 22px;\n  height: 18px;\n  padding: 0;\n  background: var(--mrr-tint-2);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  font-weight: 700;\n  line-height: 1;\n}\n\n.mrr-skill-tier-btn { letter-spacing: 0.04em; }\n.mrr-skill-spec-btn { border-style: dashed; border-color: var(--mrr-accent-dim); }\n\n.mrr-skill-tier-btn:hover,\n.mrr-skill-spec-btn:hover { background: var(--mrr-accent-dim); }\n\n/* Tier modifier classes — visual cue for the active tier. The renderer\n   adds `--<code>` for the active tier; codes are ruleset-defined so\n   these mappings cover the common cases (PF2e U/T/E/M/L, Exalted U/C/F,\n   D&D U/T/E). Untrained-equivalent stays at the default tint. */\n.mrr-skill-tier-btn--T,\n.mrr-skill-tier-btn--C { background: var(--mrr-tint-strong); }\n.mrr-skill-tier-btn--E,\n.mrr-skill-tier-btn--F { background: var(--mrr-accent-dim); border-color: var(--mrr-accent-dim); }\n.mrr-skill-tier-btn--M { background: var(--mrr-accent); color: var(--mrr-on-accent); border-color: var(--mrr-accent); }\n.mrr-skill-tier-btn--L {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-accent);\n  box-shadow: 0 0 0 1px var(--mrr-accent-dim);\n}\n\n.mrr-skill-spec-row {\n  display: grid;\n  grid-template-columns: 1fr auto auto auto auto;\n  align-items: center;\n  gap: 6px;\n  padding: 2px 4px 2px 18px;\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n  margin-top: 2px;\n}\n\n.mrr-skill-spec-name {\n  width: 100%;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-family: inherit;\n  font-size: 11px;\n}\n\n/* Custom skill / lore row — inherits the specialty layout but adds an\n   attribute selector between the name and the value so user-added skills\n   can declare which attribute they roll under. The select stays compact\n   so the row\'s grid columns line up with the existing specialty rows. */\n.mrr-custom-skill-row { grid-template-columns: 1fr auto auto auto auto auto; }\n.mrr-custom-skill-attr {\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 1px 4px;\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n}\n\n.mrr-skill-spec-label {\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n}\n\n/*  ─────  Dice widget specialty pane  ───── */\n\n.mrr-dice__specs {\n  margin-top: 8px;\n  padding: 6px 8px;\n  border: 1px dashed var(--mrr-accent-dim);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n}\n\n.mrr-dice__specs-title {\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: 0.10em;\n  text-transform: uppercase;\n  color: var(--mrr-accent);\n  margin-bottom: 4px;\n}\n\n.mrr-dice__spec-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 2px 0;\n  cursor: pointer;\n}\n\n.mrr-dice__spec-checkbox {\n  margin: 0;\n  cursor: pointer;\n}\n\n.mrr-stepper {\n  display: inline-flex;\n  gap: 2px;\n}\n\n.mrr-stepper button {\n  width: 18px;\n  height: 18px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--mrr-tint-2);\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text);\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  padding: 0;\n  line-height: 1;\n}\n\n.mrr-stepper button:hover { background: var(--mrr-accent-dim); }\n.mrr-stepper button:disabled { opacity: 0.4; cursor: not-allowed; }\n\n/*  ─────  Derived stats  ───── */\n\n.mrr-derived {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.mrr-derived__formula {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-bar {\n  position: relative;\n  height: 14px;\n  background: var(--mrr-tint-2);\n  border-radius: var(--mrr-radius-sm);\n  overflow: hidden;\n}\n\n.mrr-bar__fill {\n  position: absolute;\n  inset: 0;\n  background: linear-gradient(90deg, var(--mrr-accent-dim), var(--mrr-accent));\n  width: 0;\n  transition: width 0.18s ease-out;\n}\n\n.mrr-bar__label {\n  position: relative;\n  z-index: 1;\n  font-size: 10px;\n  font-family: var(--mrr-mono);\n  text-align: center;\n  line-height: 14px;\n  color: var(--mrr-text);\n  text-shadow: 0 0 2px rgba(0,0,0,0.6);\n}\n\n.mrr-track {\n  display: flex;\n  gap: 3px;\n  flex-wrap: wrap;\n}\n\n.mrr-track__cell {\n  min-width: 38px;\n  padding: 2px 6px;\n  font-size: 10px;\n  font-family: var(--mrr-mono);\n  text-align: center;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n  cursor: pointer;\n  user-select: none;\n}\n\n.mrr-track__cell--filled {\n  background: var(--mrr-fail);\n  color: var(--mrr-on-fail);\n  border-color: var(--mrr-fail);\n}\n\n.mrr-track__cell--active {\n  outline: 2px solid var(--mrr-warning);\n}\n\n.mrr-track__cell--extra {\n  border-style: dashed;\n  border-color: var(--mrr-accent-dim);\n}\n\n/*  ─────  Damage-type tones  ─────\n    Used by rulesets that declare damageTypes on a track-renderAs derived\n    stat (Exalted, WoD, anything Storyteller-flavored). Bashing is mild\n    (warning yellow), Lethal is severe (fail red, same hue as legacy\n    single-fill), Aggravated is dire (deep maroon — meant to read as\n    \'something supernatural just hit you\'). The renderer overlays the\n    damage-type label (B/L/A) on the cell when filled. */\n.mrr-track__cell--bashing {\n  background: var(--mrr-warning);\n  color: #1a0f0f;\n  border-color: var(--mrr-warning);\n}\n.mrr-track__cell--lethal {\n  background: var(--mrr-fail);\n  color: var(--mrr-on-fail);\n  border-color: var(--mrr-fail);\n}\n.mrr-track__cell--aggravated {\n  background: #5a1a1a;\n  color: #f5f0ff;\n  border-color: #7a2a2a;\n  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);\n}\n\n.mrr-track-ctrl {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 4px;\n  margin-top: 4px;\n}\n\n.mrr-track-ctrl__label {\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  margin-right: 2px;\n}\n\n.mrr-track-add-btn {\n  background: var(--mrr-tint-2);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 1px 6px;\n  font-size: 10px;\n  font-family: var(--mrr-mono);\n  cursor: pointer;\n}\n\n.mrr-track-add-btn:hover { background: var(--mrr-accent-dim); }\n\n.mrr-track-add-btn--danger:hover {\n  background: rgba(251, 113, 133, 0.30);\n  border-color: var(--mrr-fail);\n}\n\n.mrr-saved-indicator {\n  font-size: 10px;\n  color: var(--mrr-success);\n  font-family: var(--mrr-mono);\n  margin-left: 6px;\n  white-space: nowrap;\n}\n\n/*  ─────  States (anima banner / stunt tier / D&D conditions)  ───── */\n\n.mrr-state {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 6px;\n  padding: 4px 0;\n}\n\n.mrr-state__name { font-weight: 500; }\n\n.mrr-state__select {\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-family: inherit;\n  font-size: 12px;\n}\n\n/*  ─────  Floating dice widget  ───── */\n\n.mrr-dice {\n  position: fixed;\n  top: 80px;\n  right: 16px;\n  width: 280px;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border-strong);\n  border-radius: var(--mrr-radius);\n  padding: var(--mrr-pad);\n  box-shadow: var(--mrr-shadow);\n  z-index: var(--mrr-z-dice);\n  font-size: var(--mrr-density-fs);\n  display: none;\n}\n\n.mrr-dice--open { display: block; }\n\n.mrr-dice__header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 6px;\n  padding-bottom: 6px;\n  border-bottom: 1px solid var(--mrr-border);\n}\n\n.mrr-dice__title {\n  font-weight: 600;\n  color: var(--mrr-accent);\n}\n\n.mrr-dice__close {\n  background: transparent;\n  border: 0;\n  color: var(--mrr-text-dim);\n  font-size: 18px;\n  cursor: pointer;\n  line-height: 1;\n}\n\n.mrr-dice__row {\n  display: flex;\n  gap: 6px;\n  align-items: center;\n  margin: 4px 0;\n}\n\n.mrr-dice__row label {\n  flex: 0 0 80px;\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-dice__input {\n  flex: 1;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 4px 6px;\n  font-family: var(--mrr-mono);\n  font-size: var(--mrr-density-fs);\n  width: 100%;\n}\n\n.mrr-dice__btn {\n  width: 100%;\n  margin-top: 6px;\n  padding: 6px 10px;\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border: 0;\n  border-radius: var(--mrr-radius-sm);\n  font-weight: 600;\n  cursor: pointer;\n  font-family: inherit;\n}\n\n.mrr-dice__btn:hover { filter: brightness(1.1); }\n\n.mrr-dice__btn--secondary {\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n}\n\n.mrr-dice__btn--row-spaced { margin-top: 4px; }\n\n.mrr-dice__result {\n  margin-top: 8px;\n  padding: 8px;\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  font-family: var(--mrr-mono);\n  font-size: 12px;\n  white-space: pre-wrap;\n}\n\n.mrr-dice__result--success { border-color: var(--mrr-success); }\n.mrr-dice__result--fail    { border-color: var(--mrr-fail); }\n.mrr-dice__result--botch   { border-color: var(--mrr-warning); background: rgba(251, 191, 36, 0.10); }\n.mrr-dice__result--tie     { border-color: var(--mrr-warning); }\n\n.mrr-dice__faces {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 3px;\n  margin-top: 6px;\n}\n\n.mrr-dice__face {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-width: 22px;\n  height: 22px;\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n}\n\n.mrr-dice__face--success { background: var(--mrr-accent-dim); border-color: var(--mrr-accent); }\n.mrr-dice__face--double  { background: var(--mrr-accent); color: var(--mrr-on-accent); }\n.mrr-dice__face--one     { background: rgba(251, 113, 133, 0.20); border-color: var(--mrr-fail); }\n\n/*  ─────  Header gear button + dialog  ───── */\n\n.mrr-gear-btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  margin-left: 8px;\n  padding: 4px 8px;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  font-family: inherit;\n  font-size: 12px;\n}\n\n.mrr-gear-btn:hover { background: var(--mrr-accent-dim); }\n\n/*  ─────  Header sheet-toggle button (scroll icon)  ───── */\n\n.mrr-sheet-toggle-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 32px;\n  height: 32px;\n  margin-left: 8px;\n  padding: 0;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: 50%;\n  cursor: pointer;\n  font-family: inherit;\n  vertical-align: middle;\n}\n\n.mrr-sheet-toggle-btn:hover { background: var(--mrr-accent-dim); }\n\n.mrr-sheet-toggle-btn--active {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-accent);\n}\n\n.mrr-sheet-toggle-btn svg {\n  width: 18px;\n  height: 18px;\n  display: block;\n}\n\n.mrr-dialog-backdrop {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.55);\n  z-index: var(--mrr-z-dialog);\n  display: none;\n  align-items: center;\n  justify-content: center;\n}\n\n.mrr-dialog-backdrop--open { display: flex; }\n\n.mrr-dialog {\n  width: min(560px, 92vw);\n  max-height: 80vh;\n  overflow: auto;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border-strong);\n  border-radius: var(--mrr-radius);\n  padding: 16px;\n  box-shadow: var(--mrr-shadow);\n}\n\n.mrr-dialog h3 {\n  margin: 0 0 8px;\n  color: var(--mrr-accent);\n  font-size: 16px;\n}\n\n.mrr-dialog p {\n  color: var(--mrr-text-dim);\n  font-size: 12px;\n  margin: 4px 0 8px;\n}\n\n.mrr-dialog textarea {\n  width: 100%;\n  min-height: 220px;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 8px;\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  resize: vertical;\n}\n\n.mrr-dialog__row {\n  display: flex;\n  gap: 6px;\n  align-items: center;\n  margin: 8px 0;\n}\n\n.mrr-dialog__label {\n  flex: 0 0 50px;\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-dialog__buttons {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  justify-content: flex-end;\n  margin-top: 12px;\n}\n\n.mrr-dialog__lib-title {\n  margin-top: 18px;\n  border-top: 1px solid var(--mrr-border);\n  padding-top: 14px;\n}\n.mrr-dialog__lib-help {\n  font-size: 12px;\n  opacity: 0.8;\n  margin-top: 4px;\n}\n.mrr-dialog__lib {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  margin-top: 8px;\n}\n.mrr-dialog__lib-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 6px 8px;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: rgba(0, 0, 0, 0.15);\n}\n.mrr-dialog__lib-name {\n  flex: 1;\n  font-family: var(--mrr-mono);\n  font-size: var(--mrr-density-fs);\n}\n\n.mrr-msg {\n  margin-top: 6px;\n  padding: 6px 8px;\n  border-radius: var(--mrr-radius-sm);\n  font-size: 12px;\n  font-family: var(--mrr-mono);\n}\n\n.mrr-msg--ok    { background: rgba(110, 231, 183, 0.12); border: 1px solid var(--mrr-success); }\n.mrr-msg--err   { background: rgba(251, 113, 133, 0.12); border: 1px solid var(--mrr-fail); }\n.mrr-msg--info  { background: rgba(212, 168, 255, 0.10); border: 1px solid var(--mrr-accent-dim); }\n\n/*  ─────  Inventory section + item editor  ───── */\n\n.mrr-inv-list {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.mrr-inv-item {\n  display: grid;\n  grid-template-columns: 1fr auto auto auto auto;\n  align-items: center;\n  gap: 6px;\n  padding: 4px 6px;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n}\n\n.mrr-inv-item--equipped {\n  border-color: var(--mrr-accent);\n  background: var(--mrr-tint-2);\n}\n\n.mrr-inv-item__name {\n  font-weight: 500;\n}\n\n.mrr-inv-item__slot {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n}\n\n/* Damage cell on a weapon row — visually distinct from the slot tag so a\n   skim of the inventory tells the player at a glance which items hit\n   and how much. Color picks up the warning hue (the cue for "this is\n   the violent thing"). */\n.mrr-inv-item__damage {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-warning);\n  white-space: nowrap;\n}\n\n.mrr-inv-item__bonus-summary {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-accent);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.mrr-inv-empty {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n  font-style: italic;\n}\n\n.mrr-item-form__row {\n  display: grid;\n  grid-template-columns: 70px 1fr;\n  align-items: center;\n  gap: 12px;\n  margin: 6px 0;\n}\n\n.mrr-item-form__row label {\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n  text-align: right;\n}\n\n.mrr-item-form__input,\n.mrr-item-form__select {\n  width: 100%;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 4px 6px;\n  font-family: inherit;\n  font-size: 12px;\n}\n\n.mrr-item-form__textarea {\n  width: 100%;\n  min-height: 50px;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 4px 6px;\n  font-family: inherit;\n  font-size: 12px;\n  resize: vertical;\n}\n\n.mrr-bonus-list {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  margin-top: 4px;\n  padding: 6px;\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: rgba(0, 0, 0, 0.10);\n}\n\n.mrr-bonus-list__title {\n  font-size: 10px;\n  font-weight: 700;\n  letter-spacing: 0.10em;\n  text-transform: uppercase;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-bonus-row {\n  display: grid;\n  grid-template-columns: 2fr 50px 70px 1.2fr auto;\n  align-items: center;\n  gap: 4px;\n}\n\n.mrr-bonus-row__input {\n  width: 100%;\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border-strong);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 4px;\n  font-family: inherit;\n  font-size: 11px;\n}\n\n/* <option> elements ignore most parent styling on Linux/Chromium and fall back\n   to OS-default (often white bg + inherited near-white text => invisible until\n   highlighted). Explicit colors here force a readable dark dropdown panel. */\n.mrr-bonus-row__input option,\n.mrr-item-form__select option,\n.mrr-item-form__input option {\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n}\n\n/*  ─────  Derived / skill row equipment-bonus suffix  ───── */\n\n.mrr-row__bonus {\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  color: var(--mrr-success);\n  margin-left: 2px;\n}\n\n.mrr-row__bonus--neg { color: var(--mrr-fail); }\n\n/*  ─────  Derived value cap suffix ("/ max")  ───── */\n\n.mrr-row__cap {\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n  margin-left: 2px;\n  white-space: nowrap;\n}\n\n\n/*  ─────  state mutation confirmation toast  ───── */\n/* Top-right floating stack of brief notifications shown when the\n   state-mutator agent\'s tags fire. Each toast confirms one mutation:\n   prefix (HP / Condition / Inventory), change (signed delta or +/- name),\n   and the agent-reported reason. Stacks vertically; auto-dismisses. */\n.mrr-toast-container {\n  position: fixed;\n  top: 16px;\n  right: 16px;\n  z-index: 10000;\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  pointer-events: none;\n}\n\n.mrr-toast {\n  background: var(--mrr-bg-elev);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-left: 3px solid var(--mrr-accent);\n  border-radius: var(--mrr-radius-sm);\n  padding: 8px 12px;\n  font-family: inherit;\n  font-size: 12px;\n  box-shadow: var(--mrr-shadow);\n  opacity: 0;\n  transform: translateX(20px);\n  transition: opacity 0.25s ease-out, transform 0.25s ease-out;\n  pointer-events: auto;\n  display: flex;\n  gap: 8px;\n  align-items: baseline;\n  max-width: 320px;\n}\n\n.mrr-toast--visible {\n  opacity: 1;\n  transform: translateX(0);\n}\n\n.mrr-toast__prefix {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  text-transform: uppercase;\n  letter-spacing: 0.08em;\n  color: var(--mrr-text-dim);\n  flex-shrink: 0;\n}\n\n.mrr-toast__change {\n  font-family: var(--mrr-mono);\n  font-weight: 700;\n  color: var(--mrr-accent);\n  flex-shrink: 0;\n}\n\n.mrr-toast__reason {\n  color: var(--mrr-text-dim);\n  font-size: 11px;\n  font-style: italic;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n/*  ─────  Spellbook flyout (third floating panel, system-labeled)  ───── */\n/* Per-ruleset abilities/charms/stunts panel. Toggled from the main sheet\'s\n   spellbook row; renders one collapsible category section per\n   ruleset.abilities.categories[]. Position persists to mrr-spellbook-pos\n   (per-extension, not per-chat). Z-index sits between sheet and dice so\n   the dice widget can overlap it on roll. */\n\n.mrr-spellbook {\n  position: fixed;\n  top: 80px;\n  left: 360px;\n  width: 320px;\n  max-height: 70vh;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border-strong);\n  border-radius: var(--mrr-radius);\n  padding: var(--mrr-pad);\n  box-shadow: var(--mrr-shadow);\n  z-index: 9996;\n  font-size: var(--mrr-density-fs);\n  display: none;\n  flex-direction: column;\n  overflow: hidden;\n}\n\n.mrr-spellbook--open { display: flex; }\n\n.mrr-spellbook__header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 6px;\n  padding-bottom: 6px;\n  border-bottom: 1px solid var(--mrr-border);\n  cursor: grab;\n  user-select: none;\n}\n\n.mrr-spellbook__header:active { cursor: grabbing; }\n\n.mrr-spellbook__title {\n  font-weight: 600;\n  color: var(--mrr-accent);\n}\n\n.mrr-spellbook__body {\n  flex: 1;\n  overflow-y: auto;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.mrr-spellbook-row {\n  cursor: default;\n}\n\n.mrr-spellbook-row__btn {\n  width: 100%;\n  text-align: left;\n}\n\n.mrr-spellbook-cat {\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  background: var(--mrr-tint-1);\n  padding: 4px 6px;\n}\n\n.mrr-spellbook-cat__head {\n  width: 100%;\n  background: transparent;\n  color: var(--mrr-text);\n  border: 0;\n  padding: 4px 2px;\n  font-family: inherit;\n  font-size: 12px;\n  font-weight: 600;\n  text-align: left;\n  cursor: pointer;\n  letter-spacing: 0.04em;\n}\n\n.mrr-spellbook-cat__head:hover { color: var(--mrr-accent); }\n\n.mrr-spellbook-cat__list {\n  display: flex;\n  flex-direction: column;\n  gap: 3px;\n  margin-top: 4px;\n}\n\n.mrr-spellbook-cat--collapsed .mrr-spellbook-cat__list,\n.mrr-spellbook-cat--collapsed .mrr-spellbook-cat__add {\n  display: none;\n}\n\n.mrr-spellbook-cat__add {\n  margin-top: 4px;\n}\n\n.mrr-spellbook-ab {\n  display: grid;\n  grid-template-columns: 1fr auto auto auto;\n  align-items: center;\n  gap: 4px;\n  padding: 2px 4px;\n  background: var(--mrr-bg-elev);\n  border-radius: var(--mrr-radius-sm);\n  border: 1px solid var(--mrr-border);\n}\n\n.mrr-spellbook-ab__name {\n  font-weight: 500;\n  font-size: 12px;\n}\n\n.mrr-spellbook-ab__cost {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  white-space: nowrap;\n}\n\n/*  ─────  Chip primitive  ─────────────────────────────────────────────────\n    Small inline pill used for status-flavored item details: Hardness,\n    Overwhelming, intimacy kind. Tints lean on existing CSS variables so\n    the palette stays consistent. */\n.mrr-chip {\n  display: inline-flex;\n  align-items: center;\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  line-height: 1;\n  padding: 2px 6px;\n  border-radius: 999px;\n  border: 1px solid var(--mrr-border);\n  background: var(--mrr-tint-1);\n  color: var(--mrr-text-dim);\n  white-space: nowrap;\n}\n\n.mrr-chip--hardness {\n  color: #b9d8ff;\n  border-color: rgba(133, 173, 220, 0.45);\n  background: rgba(80, 120, 180, 0.18);\n}\n\n.mrr-chip--overwhelming {\n  color: #ffd0a8;\n  border-color: rgba(220, 140, 80, 0.45);\n  background: rgba(180, 90, 40, 0.20);\n}\n\n/* Commitment chips — surface per-item magic-binding state on the inventory\n   row. Attuned and Invested share the accent palette (the system\'s "magic\n   is active" cue). Mote uses the warning hue since Exalted essence reads\n   as "energy held in reserve" rather than a passive enchantment. */\n.mrr-chip--attuned {\n  color: var(--mrr-on-accent);\n  background: var(--mrr-accent);\n  border-color: var(--mrr-accent);\n  font-weight: 600;\n  letter-spacing: 0.04em;\n}\n\n.mrr-chip--invested {\n  color: var(--mrr-on-accent);\n  background: var(--mrr-accent);\n  border-color: var(--mrr-accent);\n  font-weight: 600;\n  letter-spacing: 0.04em;\n}\n\n.mrr-chip--mote {\n  color: #1a0f0f;\n  background: var(--mrr-warning);\n  border-color: var(--mrr-warning);\n  font-weight: 600;\n  letter-spacing: 0.04em;\n}\n\n.mrr-chip--intimacy-kind {\n  cursor: pointer;\n  background: var(--mrr-tint-2);\n  border-color: var(--mrr-border-strong);\n  color: var(--mrr-text);\n  font-weight: 600;\n  letter-spacing: 0.04em;\n}\n\n.mrr-chip--intimacy-kind-tie {\n  color: var(--mrr-accent);\n  border-color: var(--mrr-accent-dim);\n}\n\n.mrr-chip--intimacy-kind-principle {\n  color: var(--mrr-success);\n  border-color: rgba(110, 231, 183, 0.45);\n  background: rgba(110, 231, 183, 0.10);\n}\n\n/*  ─────  Intimacies flyout panel  ────────────────────────────────────────\n    Shares the .mrr-spellbook structural classes so position, header,\n    body scroll, and category collapse all "just work." Only the layout\n    of an individual intimacy row is custom: a two-line grid with the\n    kind chip + degree dropdown + delete on the first line and the text\n    input on the second so the field is wide enough to read. */\n.mrr-intimacies { /* inherits .mrr-spellbook positioning + open class */ }\n\n.mrr-intimacy-group {\n  /* inherits .mrr-spellbook-cat */\n}\n\n.mrr-intimacy-group--defining .mrr-spellbook-cat__head {\n  color: var(--mrr-accent);\n}\n\n.mrr-intimacy-row {\n  display: grid;\n  grid-template-columns: auto 1fr auto auto;\n  align-items: center;\n  gap: 4px;\n  padding: 4px;\n  background: var(--mrr-bg-elev);\n  border-radius: var(--mrr-radius-sm);\n  border: 1px solid var(--mrr-border);\n}\n\n.mrr-intimacy-row__text {\n  grid-column: 1 / -1;\n  width: 100%;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 4px 6px;\n  font-family: inherit;\n  font-size: 12px;\n  order: 2;\n}\n\n.mrr-intimacy-row > .mrr-chip--intimacy-kind { order: 1; }\n\n.mrr-intimacy-row__degree {\n  order: 3;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 4px;\n  font-family: inherit;\n  font-size: 11px;\n}\n\n.mrr-intimacy-row__target {\n  order: 4;\n  grid-column: 1 / -1;\n  width: 100%;\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 3px 6px;\n  font-family: inherit;\n  font-size: 11px;\n  font-style: italic;\n}\n\n.mrr-intimacy-row > .mrr-char-btn--danger { order: 5; }\n\n.mrr-intimacies__top-add {\n  width: 100%;\n  margin-bottom: 4px;\n}\n\n/*  ─────  XP card  ─────────────────────────────────────────────────────────\n    Sits between identity row and the section list in the main sheet. Two\n    layouts driven by ruleset.resolution.mode:\n      "single-roll" (D&D, PF2e) — level + current/next + 4px progress bar\n                                  fed by ruleset.xpTable\n      "dice-pool"   (Exalted)   — current + total earned + +1 XP button\n                                  (a pure int accumulator)\n    Hidden entirely for rulesets whose mode isn\'t one of the two above\n    (Fate Core uses Fate Points, not XP). */\n\n.mrr-xp-card {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding: 8px 10px;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  margin-top: 4px;\n}\n\n.mrr-xp-card__label {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.12em;\n  text-transform: uppercase;\n  color: var(--mrr-accent);\n}\n\n.mrr-xp-card__row {\n  display: flex;\n  align-items: flex-end;\n  gap: 8px;\n  flex-wrap: wrap;\n}\n\n.mrr-xp-card__group {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  min-width: 60px;\n}\n\n.mrr-xp-card__sub {\n  font-size: 9px;\n  letter-spacing: 0.10em;\n  text-transform: uppercase;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-xp-card__input {\n  background: var(--mrr-bg);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius-sm);\n  padding: 2px 6px;\n  font-family: var(--mrr-mono);\n  font-size: 14px;\n  font-weight: 600;\n  text-align: right;\n  width: 80px;\n  font-variant-numeric: tabular-nums;\n  -moz-appearance: textfield;\n}\n\n.mrr-xp-card__input:focus {\n  outline: none;\n  border-color: var(--mrr-accent);\n  background: var(--mrr-bg-elev);\n}\n\n.mrr-xp-card__input::-webkit-outer-spin-button,\n.mrr-xp-card__input::-webkit-inner-spin-button {\n  -webkit-appearance: none;\n  margin: 0;\n}\n\n.mrr-xp-card__input--lvl {\n  width: 50px;\n  font-size: 16px;\n  text-align: center;\n}\n\n.mrr-xp-card__sep {\n  font-family: var(--mrr-mono);\n  font-size: 16px;\n  color: var(--mrr-text-dim);\n  align-self: flex-end;\n  padding-bottom: 2px;\n}\n\n.mrr-xp-card__next {\n  font-family: var(--mrr-mono);\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--mrr-text);\n  padding: 2px 6px;\n  font-variant-numeric: tabular-nums;\n  align-self: flex-end;\n}\n\n.mrr-xp-card__bar {\n  height: 4px;\n  background: var(--mrr-tint-2);\n  border-radius: 2px;\n  overflow: hidden;\n}\n\n.mrr-xp-card__bar-fill {\n  height: 100%;\n  background: var(--mrr-accent);\n  width: 0;\n  transition: width 0.18s ease-out;\n}\n\n.mrr-xp-card__add {\n  align-self: flex-start;\n  background: var(--mrr-accent-dim);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-accent);\n  border-radius: var(--mrr-radius-sm);\n  padding: 4px 10px;\n  font-family: inherit;\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.05em;\n  cursor: pointer;\n}\n\n.mrr-xp-card__add:hover {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n}\n\n/* ═══════════════════════════════════════════════════════════════\n * Phase 3.1 — row-primitive CSS (mrr-p3-* namespace)\n * ═══════════════════════════════════════════════════════════════\n * Sibling to the existing .mrr-section / .mrr-row / .mrr-stepper /\n * .mrr-bar rules used by the running renderer. Phase-3 namespace\n * prevents collision; cutover in a future session renames or\n * removes the -p3 infix when the new renderer is the only path.\n *\n * Density values inlined as cozy defaults (12/8/30/13). Token\n * migration will swap these for --density-* later.\n * ═══════════════════════════════════════════════════════════════ */\n\n.mrr-p3-section {\n  /* display:flex + column makes the card a flex container AND fixes\n     the flex-item height collapse: when this card is itself a flex\n     item of .mrr-sheet (which is column flex), Chrome computes its\n     intrinsic min-height as 0 if the card isn\'t a flex container,\n     which causes head + body to render outside the card\'s painted\n     bounds. Matching the existing .mrr-section pattern (also column\n     flex) keeps the card sized to its children. overflow:hidden\n     dropped — children have padding so they don\'t bleed past the\n     rounded corners. */\n  display: flex;\n  flex-direction: column;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius);\n  margin-bottom: 8px;\n}\n.mrr-p3-section__head {\n  padding: var(--mrr-density-pad-y) var(--mrr-density-pad-x);\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  user-select: none;\n  border-bottom: 1px solid transparent;\n}\n.mrr-p3-section--open .mrr-p3-section__head { border-bottom-color: var(--mrr-border); }\n.mrr-p3-section__head:hover { background: var(--mrr-tint-1); }\n.mrr-p3-section__title {\n  font-size: 11px;\n  font-weight: 700;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--mrr-text);\n}\n.mrr-p3-section__count {\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n}\n.mrr-p3-section__actions {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n}\n.mrr-p3-section__right { margin-left: auto; }\n.mrr-p3-section__chev {\n  margin-left: auto;\n  color: var(--mrr-text-dim);\n  transition: transform 150ms ease;\n  display: inline-block;\n}\n.mrr-p3-section--open .mrr-p3-section__chev { transform: rotate(90deg); }\n.mrr-p3-section__body {\n  display: none;\n  padding: 8px var(--mrr-density-pad-x) var(--mrr-density-pad-y);\n  flex-direction: column;\n  gap: 8px;\n}\n.mrr-p3-section--open .mrr-p3-section__body { display: flex; }\n\n/* Stepper */\n.mrr-p3-stepper {\n  display: inline-flex;\n  gap: 2px;\n}\n.mrr-p3-stepper button {\n  width: 22px;\n  height: 22px;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  cursor: pointer;\n  font-size: 13px;\n  border-radius: var(--mrr-radius-sm);\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0;\n}\n.mrr-p3-stepper button:hover {\n  background: var(--mrr-accent-dim);\n  color: var(--mrr-text);\n  border-color: var(--mrr-border-strong);\n}\n\n/* Row base + variants */\n.mrr-p3-row {\n  display: grid;\n  align-items: center;\n  gap: 8px;\n  padding: 4px 8px;\n  height: var(--mrr-density-row-h);\n  border-radius: var(--mrr-radius-sm);\n}\n.mrr-p3-row:hover { background: var(--mrr-tint-1); }\n.mrr-p3-row--attr { grid-template-columns: 1fr auto auto auto auto; }\n.mrr-p3-row--skill {\n  grid-template-columns: 1fr auto auto auto;\n  align-items: start;\n  height: auto;\n  min-height: var(--mrr-density-row-h);\n}\n.mrr-p3-row--save { grid-template-columns: 1fr auto auto auto; }\n.mrr-p3-row__name {\n  font-size: var(--mrr-density-fs);\n  color: var(--mrr-text);\n  display: inline-flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 4px;\n}\n.mrr-p3-row__abbr {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  margin-left: 4px;\n}\n.mrr-p3-row__kind {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n  text-transform: uppercase;\n  letter-spacing: 0.08em;\n  margin-left: 6px;\n}\n.mrr-p3-row__gear {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-accent);\n  margin-left: 6px;\n  padding: 1px 5px;\n  border: 1px solid var(--mrr-accent-dim);\n  border-radius: 6px;\n  background: var(--mrr-tint-1);\n}\n.mrr-p3-row__mod {\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  color: var(--mrr-text-dim);\n  min-width: 22px;\n  text-align: right;\n}\n.mrr-p3-row__main {\n  min-width: 0;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.mrr-p3-row__del {\n  background: transparent;\n  border: 0;\n  color: var(--mrr-text-dim);\n  font-size: 14px;\n  cursor: pointer;\n  padding: 0 4px;\n  margin-left: auto;\n  line-height: 1;\n}\n.mrr-p3-row__del:hover { color: var(--mrr-warning); }\n.mrr-p3-row__val {\n  width: 64px;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text);\n  font-family: var(--mrr-mono);\n  font-size: 12px;\n  padding: 4px 6px;\n  border-radius: var(--mrr-radius-sm);\n  text-align: center;\n}\n.mrr-p3-row__val::-webkit-outer-spin-button,\n.mrr-p3-row__val::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }\n.mrr-p3-row__val:focus { outline: 0; border-color: var(--mrr-accent); }\n.mrr-p3-row__val--auto {\n  background: transparent;\n  border: 0;\n  font-size: var(--mrr-density-fs);\n  font-weight: 600;\n  font-feature-settings: "tnum";\n  font-variant-numeric: tabular-nums;\n  color: var(--mrr-text);\n}\n.mrr-p3-row__roll {\n  background: transparent;\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  padding: 4px 10px;\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  min-width: 48px;\n}\n.mrr-p3-row__roll:hover {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-accent);\n}\n.mrr-p3-row__roll--sm {\n  padding: 2px 6px;\n  font-size: 10px;\n  min-width: 0;\n}\n\n/* Tier pill */\n.mrr-p3-tier {\n  width: 36px;\n  height: 22px;\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  font-weight: 700;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  padding: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n}\n.mrr-p3-tier:hover { background: var(--mrr-accent-dim); }\n.mrr-p3-tier--T {\n  background: var(--mrr-tint-2);\n  color: var(--mrr-text);\n  border-color: var(--mrr-border-strong);\n}\n.mrr-p3-tier--E {\n  background: var(--mrr-accent-dim);\n  border-color: var(--mrr-border-strong);\n  color: var(--mrr-text);\n}\n.mrr-p3-tier--M {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-accent);\n}\n\n/* Specialty chips + editor */\n.mrr-p3-row__spec-toggle {\n  background: transparent;\n  border: 1px dashed var(--mrr-border);\n  color: var(--mrr-text-dim);\n  font-size: 10px;\n  padding: 1px 6px;\n  border-radius: 6px;\n  cursor: pointer;\n  margin-left: 6px;\n}\n.mrr-p3-row__spec-toggle:hover {\n  border-style: solid;\n  border-color: var(--mrr-border-strong);\n  color: var(--mrr-accent);\n}\n.mrr-p3-row__specs {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px;\n  margin-top: 2px;\n}\n.mrr-p3-spec-chip {\n  background: var(--mrr-tint-1);\n  border: 1px solid var(--mrr-border);\n  border-radius: 6px;\n  padding: 2px 6px;\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  cursor: pointer;\n  font-size: 11px;\n  color: var(--mrr-text);\n}\n.mrr-p3-spec-chip:hover {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n}\n.mrr-p3-spec-chip__name { font-weight: 500; }\n.mrr-p3-spec-chip__dice {\n  font-family: var(--mrr-mono);\n  font-size: 9.5px;\n  opacity: 0.85;\n}\n.mrr-p3-spec-chip__x {\n  margin-left: 2px;\n  opacity: 0.7;\n  cursor: pointer;\n  padding: 0 2px;\n}\n.mrr-p3-spec-chip__x:hover { opacity: 1; color: var(--mrr-warning); }\n.mrr-p3-row__spec-editor {\n  display: flex;\n  gap: 4px;\n  align-items: center;\n  margin-top: 4px;\n}\n.mrr-p3-row__spec-input {\n  flex: 1;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text);\n  font-size: 12px;\n  padding: 4px 6px;\n  border-radius: var(--mrr-radius-sm);\n}\n.mrr-p3-row__spec-input:focus { outline: 0; border-color: var(--mrr-accent); }\n.mrr-p3-row__spec-add,\n.mrr-p3-row__spec-done {\n  background: transparent;\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  font-size: 11px;\n  padding: 4px 8px;\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n}\n.mrr-p3-row__spec-add:hover { border-color: var(--mrr-accent); color: var(--mrr-accent); }\n.mrr-p3-row__spec-done:hover { border-color: var(--mrr-border-strong); color: var(--mrr-text); }\n\n/* Auto-calc bonus pill (skill + save rows) */\n.mrr-p3-save__bonus {\n  font-feature-settings: "tnum";\n  font-variant-numeric: tabular-nums;\n  font-size: 13px;\n  font-weight: 600;\n  color: var(--mrr-accent);\n}\n.mrr-p3-row--save .mrr-p3-save__bonus { color: var(--mrr-accent); }\n\n/* Bar */\n.mrr-p3-bar {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  padding: 6px 8px;\n}\n.mrr-p3-bar__top {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 8px;\n}\n.mrr-p3-bar__name {\n  font-size: 12px;\n  font-weight: 500;\n  color: var(--mrr-text);\n}\n.mrr-p3-bar__values {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  font-family: var(--mrr-mono);\n  font-size: 12px;\n  color: var(--mrr-text-dim);\n}\n.mrr-p3-bar__val-input {\n  width: 40px;\n  background: transparent;\n  border: 0;\n  border-bottom: 1px dotted var(--mrr-border);\n  color: var(--mrr-text);\n  font-family: var(--mrr-mono);\n  font-size: 12px;\n  text-align: center;\n  padding: 1px 0;\n}\n.mrr-p3-bar__val-input::-webkit-outer-spin-button,\n.mrr-p3-bar__val-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }\n.mrr-p3-bar__val-input:hover,\n.mrr-p3-bar__val-input:focus {\n  outline: 0;\n  border-bottom-color: var(--mrr-border-strong);\n}\n.mrr-p3-bar__sep { color: var(--mrr-text-dim); }\n.mrr-p3-bar__track {\n  height: 4px;\n  border-radius: 2px;\n  background: var(--mrr-tint-2);\n  overflow: hidden;\n}\n.mrr-p3-bar__fill {\n  height: 100%;\n  transition: width 200ms ease, background 200ms ease;\n}\n.mrr-p3-bar__fill--ok { background: var(--mrr-success); }\n.mrr-p3-bar__fill--warn { background: var(--mrr-warning); }\n.mrr-p3-bar__fill--bad { background: var(--mrr-fail); }\n.mrr-p3-bar__quick {\n  display: flex;\n  gap: 4px;\n  margin-top: 2px;\n}\n.mrr-p3-bar__quick button {\n  background: transparent;\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  padding: 2px 6px;\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n}\n.mrr-p3-bar__quick button:hover {\n  background: var(--mrr-accent-dim);\n  color: var(--mrr-text);\n  border-color: var(--mrr-border-strong);\n}\n\n/* Damage track (Exalted) */\n.mrr-p3-bar--damage .mrr-p3-bar__values--track {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  color: var(--mrr-text-dim);\n}\n.mrr-p3-track {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px;\n  margin-top: 4px;\n}\n.mrr-p3-cell {\n  width: 36px;\n  height: 22px;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n  padding: 0;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n}\n.mrr-p3-cell:hover {\n  border-color: var(--mrr-border-strong);\n  color: var(--mrr-text);\n}\n.mrr-p3-cell--B {\n  background: var(--mrr-warning);\n  color: var(--mrr-on-accent);\n  border-color: var(--mrr-warning);\n}\n.mrr-p3-cell--L {\n  background: var(--mrr-fail);\n  color: var(--mrr-text);\n  border-color: var(--mrr-fail);\n}\n.mrr-p3-cell--A {\n  background: var(--mrr-on-fail);\n  color: var(--mrr-text);\n  border-color: var(--mrr-fail);\n}\n.mrr-p3-track-tools {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 8px;\n  margin-top: 4px;\n  flex-wrap: wrap;\n}\n.mrr-p3-track-tools__group {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n.mrr-p3-track-tools__label {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  text-transform: uppercase;\n  letter-spacing: 0.04em;\n  opacity: 0.7;\n  margin-right: 2px;\n  color: var(--mrr-text-dim);\n}\n.mrr-p3-track-tools__add,\n.mrr-p3-track-tools__heal {\n  background: transparent;\n  border: 1px solid var(--mrr-border);\n  color: var(--mrr-text-dim);\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  padding: 2px 6px;\n  border-radius: var(--mrr-radius-sm);\n  cursor: pointer;\n}\n.mrr-p3-track-tools__add:hover,\n.mrr-p3-track-tools__heal:hover:not(:disabled) {\n  background: var(--mrr-accent-dim);\n  color: var(--mrr-text);\n  border-color: var(--mrr-border-strong);\n}\n.mrr-p3-track-tools__heal:disabled {\n  opacity: 0.4;\n  cursor: not-allowed;\n}\n\n/* ═══════════════════════════════════════════════════════════════\n * Phase 3.2 — panel-frame chrome (port of panel-frame.jsx)\n * ═══════════════════════════════════════════════════════════════\n * Standalone floating panel: drag head + 8 resize handles + body.\n * Used by future Session 3.4+ flyouts (Inv / Spell / Gear edit forms,\n * BackpackFlyout, SpellbookFlyout). The current Phase 3.3 sheet body\n * REUSES the existing .mrr-sheet shell so toggling renderers doesn\'t\n * disturb the saved sheet position.\n * ═══════════════════════════════════════════════════════════════ */\n\n.mrr-p3-panel {\n  position: fixed;\n  background: var(--mrr-bg);\n  border: 1px solid var(--mrr-border);\n  border-radius: var(--mrr-radius);\n  box-shadow: var(--mrr-shadow);\n  color: var(--mrr-text);\n  z-index: var(--mrr-z-sheet);\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n.mrr-p3-panel__head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 10px var(--mrr-density-pad-x);\n  cursor: move;\n  user-select: none;\n  border-bottom: 1px solid var(--mrr-border);\n  background: var(--mrr-bg-elev);\n}\n.mrr-p3-panel__title {\n  font-size: 12px;\n  font-weight: 600;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n  color: var(--mrr-accent);\n}\n.mrr-p3-panel__title-meta {\n  font-size: 11px;\n  font-weight: 500;\n  color: var(--mrr-text-dim);\n  letter-spacing: 0;\n  text-transform: none;\n  margin-left: 4px;\n}\n.mrr-p3-panel__close {\n  margin-left: auto;\n  background: transparent;\n  border: 0;\n  color: var(--mrr-text-dim);\n  font-size: 16px;\n  line-height: 1;\n  cursor: pointer;\n  padding: 0 6px;\n  border-radius: var(--mrr-radius-sm);\n}\n.mrr-p3-panel__close:hover {\n  background: var(--mrr-tint-1);\n  color: var(--mrr-text);\n}\n.mrr-p3-panel__body {\n  flex: 1;\n  overflow: auto;\n  padding: var(--mrr-density-pad-y) var(--mrr-density-pad-x);\n}\n\n/* Resize handles — 4 edges (8px wide along the edge) + 4 corners\n * (12px square at the corner). Cursor hints encode the drag axis. */\n.mrr-p3-panel__resize {\n  position: absolute;\n  background: transparent;\n  z-index: 1;\n}\n.mrr-p3-panel__resize--n  { top: 0;     left: 8px;   right: 8px;   height: 6px; cursor: ns-resize; }\n.mrr-p3-panel__resize--s  { bottom: 0;  left: 8px;   right: 8px;   height: 6px; cursor: ns-resize; }\n.mrr-p3-panel__resize--e  { top: 8px;   right: 0;    bottom: 8px;  width: 6px;  cursor: ew-resize; }\n.mrr-p3-panel__resize--w  { top: 8px;   left: 0;     bottom: 8px;  width: 6px;  cursor: ew-resize; }\n.mrr-p3-panel__resize--ne { top: 0;     right: 0;                              width: 12px; height: 12px; cursor: nesw-resize; }\n.mrr-p3-panel__resize--nw { top: 0;     left: 0;                               width: 12px; height: 12px; cursor: nwse-resize; }\n.mrr-p3-panel__resize--se {\n  bottom: 0; right: 0;\n  width: 14px; height: 14px;\n  cursor: nwse-resize;\n  display: flex;\n  align-items: flex-end;\n  justify-content: flex-end;\n  color: var(--mrr-text-dim);\n}\n.mrr-p3-panel__resize--se:hover { color: var(--mrr-accent); }\n.mrr-p3-panel__resize--sw { bottom: 0;  left: 0;                               width: 12px; height: 12px; cursor: nesw-resize; }\n\n/* Phase 3 attribute-group sub-label (used by mrrP3RenderAttributesSection\n * to label Exalted\'s Physical / Social / Mental groups). */\n.mrr-p3-section__subgroup-label {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  text-transform: uppercase;\n  letter-spacing: 0.08em;\n  color: var(--mrr-text-dim);\n  margin: 8px 0 4px;\n  padding-left: 4px;\n}\n\n/* Phase 3 derived-stat row wrapper (used by mrrP3RenderDerivedSection\'s\n * value branch — bars and tracks display their name inside the primitive,\n * but renderValue does not, so the wrapper supplies a name + formula\n * label outside the value primitive). */\n.mrr-p3-derived {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  margin-bottom: 8px;\n}\n\n.mrr-p3-derived__label {\n  font-family: var(--mrr-mono);\n  font-size: 11px;\n  letter-spacing: 0.04em;\n  color: var(--mrr-text-dim);\n  padding-left: 4px;\n}\n\n/* ── Phase 5 step 5.5: density toggle ──────────────────────────────────\n * 3-way data-density attribute on .mrr-sheet swaps the five\n * --mrr-density-* variables. UI: pill button group in the actions row\n * with aria-pressed indicating selection. Per-character (state.sheet.density),\n * defaults to "cozy". Source: ~/projects/claude-design-updates/UI-build.md §2.3.\n * ────────────────────────────────────────────────────────────────────── */\n.mrr-sheet[data-density="compact"] {\n  --mrr-density-pad-x: 8px;\n  --mrr-density-pad-y: 8px;\n  --mrr-density-gap:   4px;\n  --mrr-density-row-h: 24px;\n  --mrr-density-fs:   12px;\n}\n.mrr-sheet[data-density="cozy"] {\n  --mrr-density-pad-x: 12px;\n  --mrr-density-pad-y: 12px;\n  --mrr-density-gap:    6px;\n  --mrr-density-row-h: 28px;\n  --mrr-density-fs:    13px;\n}\n.mrr-sheet[data-density="roomy"] {\n  --mrr-density-pad-x: 16px;\n  --mrr-density-pad-y: 16px;\n  --mrr-density-gap:   10px;\n  --mrr-density-row-h: 34px;\n  --mrr-density-fs:   14px;\n}\n\n/* density toggle pill button group (rendered inside the actions row) */\n.mrr-density-toggle {\n  display: inline-flex;\n  align-items: center;\n  gap: 0;\n  padding: 2px;\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 999px;\n  background: var(--mrr-tint-1);\n}\n.mrr-density-toggle__label {\n  font-family: var(--mrr-mono);\n  font-size: 9px;\n  letter-spacing: 0.1em;\n  text-transform: uppercase;\n  color: var(--mrr-text-faint);\n  padding: 0 8px 0 6px;\n}\n.mrr-density-toggle__btn {\n  font-family: var(--mrr-mono);\n  font-size: 10px;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--mrr-text-dim);\n  background: transparent;\n  border: 0;\n  border-radius: 999px;\n  padding: 4px 10px;\n  cursor: pointer;\n  transition: background-color 120ms ease, color 120ms ease;\n}\n.mrr-density-toggle__btn:hover {\n  color: var(--mrr-text);\n  background: var(--mrr-tint-2);\n}\n.mrr-density-toggle__btn:focus-visible {\n  outline: 1px solid var(--mrr-accent-line);\n  outline-offset: 1px;\n}\n.mrr-density-toggle__btn[aria-pressed="true"] {\n  background: var(--mrr-accent-soft);\n  color: var(--mrr-text);\n  box-shadow: inset 0 0 0 1px var(--mrr-accent-line);\n}\n\n/* ── Phase 5 step 5.4: derived tooltip math ──────────────────────────\n * Cursor + underline affordance on derived value cells whose ruleset\n * declares a tooltipFormula. The browser\'s native title-attr tooltip\n * carries the breakdown ("Soak (Bashing): 7 = Stamina (4) + Bashing\n * Soak (3)"). Affordance is intentionally subtle — dotted underline\n * + help cursor is the long-established "this has hover info" pattern\n * (matches the prototype\'s skill-bonus pill UX). Scoped to autocalc\n * value cells with a non-empty title so static-rendered derived stats\n * without a tooltipFormula keep their default cursor + no underline. */\n.mrr-row__value--autocalc[title]:not([title=""]) {\n  cursor: help;\n  text-decoration: underline dotted var(--mrr-text-faint);\n  text-underline-offset: 3px;\n  text-decoration-thickness: 1px;\n}\n.mrr-row__value--autocalc[title]:not([title=""]):hover {\n  text-decoration-color: var(--mrr-accent-line);\n}\n\n/* ── Phase 5 step 5.2: XP card ───────────────────────────────────────\n * Visual restructure to prototype parity (sheet.jsx XpCard, UI-build.md\n * §3.4 + §4.7). The baseline rules at the .mrr-xp-card section above\n * already supply structure (flex column, row, group). This section\n * tightens the type scale + spacing to match the prototype:\n *   - card-level label: 10px / 600 / 0.12em uppercase (already)\n *   - sub-labels:       9px  / 0.10em uppercase (already)\n *   - numeric value:    14px → 16px / 600  (PROTOTYPE TARGET)\n *   - level input:      16px → 18px / 600 / 56px wide (PROTOTYPE)\n *   - + button placed inline at row end via flex-end self-align.\n * Selector specificity matches the baseline rule (single-class) so the\n * cascade resolves the override by source order — appended last wins.\n * Pool-mode (Exalted) and formula-mode (D&D, PF2e) both consume the\n * same primitives; the only mode difference is which primitives\n * appear (pool: current/sep/total/+1; formula: level/current/sep/next/bar).\n * Mode dispatch lives in renderXpCard() which keys off\n * ruleset.resolution.mode. */\n.mrr-xp-card__input {\n  font-size: 16px;\n}\n.mrr-xp-card__input--lvl {\n  font-size: 18px;\n  width: 56px;\n}\n.mrr-xp-card__sep {\n  font-size: 18px;\n  padding-bottom: 6px;\n}\n.mrr-xp-card__next {\n  font-size: 16px;\n  font-weight: 600;\n  padding-bottom: 4px;\n}\n/* Pool-mode +1 button now lives inside the row (see renderXpCard pool\n   branch). Anchor it to flex-end so it baselines with the inputs and\n   doesn\'t stretch the row vertically. The baseline alignment already\n   says align-self: flex-start at the .mrr-xp-card__add base rule;\n   this overrides for the inline placement. */\n.mrr-xp-card__row .mrr-xp-card__add {\n  align-self: flex-end;\n  margin-left: auto;\n}\n\n/* ── Phase 5 step 5.6: state badges + anima banner ──\n * Visual treatments for state rows whose active value carries narrative\n * weight: Initiative=Crashed (distress) and Anima=Suppressed (muted).\n * Uses a data-active-value attribute on .mrr-state plus paired modifier\n * classes so the row + select restyle without changing the underlying\n * select-based render (which already handles N values natively, including\n * the 6-value Anima Banner with Suppressed prepended in Plan B step B.2).\n *\n * Crashed token: scoped to this section, no global :root pollution beyond\n * the three new --mrr-state-crashed-* tokens.\n * Suppressed: leans on existing --mrr-text-faint for the "no anima" feel.\n */\n\n:root {\n  --mrr-state-crashed-color: oklch(0.62 0.18 28);\n  --mrr-state-crashed-soft:  oklch(0.62 0.18 28 / 0.18);\n  --mrr-state-crashed-line:  oklch(0.62 0.18 28 / 0.42);\n}\n\n/* Initiative=Crashed — red distress treatment on row + select.\n * Subtle pulse on the name to draw the eye without being jarring; respects\n * prefers-reduced-motion below. (!)-glyph appended via ::after pseudo. */\n.mrr-state--initiative-crashed .mrr-state__name {\n  color: var(--mrr-state-crashed-color);\n  font-weight: 600;\n  animation: mrr-state-crashed-pulse 2.4s ease-in-out infinite;\n}\n\n.mrr-state--initiative-crashed .mrr-state__name::after {\n  content: " (!)";\n  color: var(--mrr-state-crashed-color);\n  font-weight: 700;\n  letter-spacing: 0.02em;\n}\n\n.mrr-state--initiative-crashed .mrr-state__select {\n  color: var(--mrr-state-crashed-color);\n  border-color: var(--mrr-state-crashed-line);\n  background: var(--mrr-state-crashed-soft);\n}\n\n@keyframes mrr-state-crashed-pulse {\n  0%, 100% { opacity: 1; }\n  50%      { opacity: 0.72; }\n}\n\n@media (prefers-reduced-motion: reduce) {\n  .mrr-state--initiative-crashed .mrr-state__name { animation: none; }\n}\n\n/* Anima=Suppressed — muted "no anima visible" treatment.\n * Suppressed renders at the top of the Anima Banner select because Plan B\n * step B.2 prepended it as the first value in ruleset.json — option order\n * follows ruleset value order. */\n.mrr-state--anima-suppressed .mrr-state__name {\n  color: var(--mrr-text-faint);\n  font-style: italic;\n}\n\n.mrr-state--anima-suppressed .mrr-state__select {\n  color: var(--mrr-text-faint);\n}\n\n/* Defensive overflow guard for state rows on narrow panels (≥320px).\n * The row is flex-row name+select; if a future ruleset adds a long state\n * name, the select should compress rather than spill. Anima Banner with 6\n * values (Suppressed/Dim/Glowing/Burning/Bonfire/Iconic) renders inside\n * the native <select>, so option count never affects row width. */\n.mrr-state {\n  flex-wrap: wrap;\n  min-width: 0;\n}\n.mrr-state__select {\n  max-width: 100%;\n  min-width: 0;\n}\n\n/* ── Phase 5 step 5.3: Resources cluster ──────────────────────────────\n * Horizontal "charbar" cluster of resource readouts rendered above\n * Attributes when the active ruleset declares resources[] (Plan B v1\n * schema add). Driven by mrrP3RenderResourcesSection — sub-renderers\n * dispatch by resource.type (bar / dice / counter / pool / custom).\n *\n * Layout: flex-wrap with min 120px per resource so 4+ pools at the top\n * of a 280-320px panel collapse to a 2x2 grid rather than spilling\n * horizontally. Adjacent resources sharing a `group` value render under\n * a shared subheader (D&D Spell Slots case).\n *\n * Auto-color thresholds match prototype <Bar> in sheet.jsx:151\n *   pct < 30%  → bad\n *   pct < 65%  → warn\n *   pct >= 65% → ok\n * Override via resource.color ∈ {ok|warn|bad|accent}.\n *\n * Tokens: reuses --mrr-success/-warning/-fail and --mrr-accent. No\n * global :root pollution. Local section-scoped tokens for the dice\n * glyph treatment only.\n */\n\n:root {\n  --mrr-resources-pad: 10px;\n  --mrr-resources-gap: 10px;\n  --mrr-resource-min-w: 120px;\n  --mrr-resource-bar-h: 6px;\n  --mrr-resource-die-size: 22px;\n}\n\n.mrr-resources {\n  display: flex;\n  flex-wrap: wrap;\n  gap: var(--mrr-resources-gap);\n  padding: var(--mrr-resources-pad);\n  margin: 0 0 8px 0;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-hairline);\n  border-radius: 8px;\n}\n\n/* Sub-group subheader (D&D Spell Slots). Forces a wrap break so all\n * resources sharing a group cluster under their label. */\n.mrr-resources__group-break {\n  flex-basis: 100%;\n  height: 0;\n  margin: 0;\n  border: 0;\n}\n.mrr-resources__group-label {\n  flex-basis: 100%;\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--mrr-text-faint);\n  margin: 4px 0 -2px 0;\n}\n\n.mrr-resource {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  flex: 1 1 var(--mrr-resource-min-w);\n  min-width: var(--mrr-resource-min-w);\n  padding: 6px 8px;\n  background: var(--mrr-bg-input);\n  border: 1px solid var(--mrr-hairline);\n  border-radius: 6px;\n}\n/* Full-width resource (used by exalted-health-track so the track has room\n   to grow with extra HL added via Ox-Body, Mutations, etc.). Wraps onto\n   its own row regardless of cluster width. */\n.mrr-resource--full-width {\n  flex-basis: 100%;\n}\n\n.mrr-resource__label {\n  font-size: 10px;\n  font-weight: 600;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  color: var(--mrr-text-faint);\n  line-height: 1.1;\n}\n\n.mrr-resource__values {\n  display: flex;\n  align-items: baseline;\n  gap: 4px;\n  font-family: var(--mrr-mono, ui-monospace, SFMono-Regular, Menlo, monospace);\n  font-size: 13px;\n  color: var(--mrr-text);\n}\n.mrr-resource__val {\n  font-weight: 600;\n}\n.mrr-resource__val-input {\n  min-width: 3ch;\n  width: auto;\n  max-width: 5ch;\n  padding: 2px 4px;\n  background: var(--mrr-bg-app);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 3px;\n  color: inherit;\n  font: inherit;\n  text-align: right;\n  box-sizing: content-box;\n}\n.mrr-resource__val-input:focus {\n  outline: none;\n  border-color: var(--mrr-accent-line);\n}\n.mrr-resource__sep {\n  color: var(--mrr-text-faint);\n  opacity: 0.7;\n}\n\n/* Bar render (type=bar) — fill bar with auto-color. */\n.mrr-resource__bar {\n  position: relative;\n  height: var(--mrr-resource-bar-h);\n  width: 100%;\n  background: var(--mrr-bg-app);\n  border-radius: 999px;\n  overflow: hidden;\n}\n.mrr-resource__bar-fill {\n  height: 100%;\n  width: 0%;\n  border-radius: inherit;\n  transition: width 120ms ease-out, background-color 120ms ease-out;\n}\n.mrr-resource__bar-fill--ok     { background: var(--mrr-success, oklch(0.78 0.14 145)); }\n.mrr-resource__bar-fill--warn   { background: var(--mrr-warning, oklch(0.82 0.14 85)); }\n.mrr-resource__bar-fill--bad    { background: var(--mrr-fail, oklch(0.65 0.18 28)); }\n.mrr-resource__bar-fill--accent { background: var(--mrr-accent); }\n\n/* Dice render (type=dice) — pool of clickable dice glyphs. Spent dice\n * dim. Reuses --mrr-resource-die-size for sizing. */\n.mrr-resource__dice {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 3px;\n  margin-top: 2px;\n}\n.mrr-resource__die {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: var(--mrr-resource-die-size);\n  height: var(--mrr-resource-die-size);\n  padding: 0;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  border-radius: 4px;\n  color: var(--mrr-text);\n  font-size: 9px;\n  font-weight: 600;\n  letter-spacing: 0;\n  cursor: pointer;\n  user-select: none;\n  transition: background-color 100ms ease-out, opacity 100ms ease-out;\n}\n.mrr-resource__die:hover { background: var(--mrr-accent-soft); }\n.mrr-resource__die--spent {\n  opacity: 0.32;\n  cursor: default;\n}\n.mrr-resource__die--spent:hover { background: var(--mrr-bg-elev); }\n\n/* Counter render (type=counter) — numeric stepper. */\n.mrr-resource__counter {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n.mrr-resource__step {\n  width: 22px;\n  height: 22px;\n  padding: 0;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-border);\n  border-radius: 4px;\n  color: var(--mrr-text);\n  font-size: 14px;\n  font-weight: 600;\n  line-height: 1;\n  cursor: pointer;\n}\n.mrr-resource__step:hover { background: var(--mrr-accent-soft); }\n.mrr-resource__step:disabled { opacity: 0.3; cursor: not-allowed; }\n\n/* Pool render (type=pool) — current/max display, no bar (matches\n * Exalted motes/willpower pattern; the prominent type-scale recalls the\n * XP card values). */\n.mrr-resource--pool .mrr-resource__values {\n  font-size: 15px;\n}\n\n/* Custom placeholder — renders when a resource declares\n * type=custom with a rendererConfig.component name that has not been\n * registered in the custom-component registry yet. Distinct visual\n * marker so missing components are obvious during integration. */\n.mrr-resource__placeholder {\n  font-size: 11px;\n  color: var(--mrr-text-faint);\n  font-style: italic;\n  padding: 4px 6px;\n  background: var(--mrr-bg-app);\n  border: 1px dashed var(--mrr-hairline-strong);\n  border-radius: 4px;\n}\n.mrr-resource__placeholder code {\n  font-family: var(--mrr-mono, ui-monospace, SFMono-Regular, Menlo, monospace);\n  font-size: 10px;\n  color: var(--mrr-text);\n}\n\n/* Quick-button row — pill-style, matches XpCard +1 XP affordance. */\n.mrr-resource__quick {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 4px;\n  margin-top: 2px;\n}\n.mrr-resource__quick-btn {\n  padding: 2px 8px;\n  background: var(--mrr-accent-soft);\n  border: 1px solid var(--mrr-accent-line);\n  border-radius: 999px;\n  color: var(--mrr-text);\n  font-size: 10px;\n  font-weight: 500;\n  letter-spacing: 0.02em;\n  cursor: pointer;\n  transition: background-color 100ms ease-out;\n}\n.mrr-resource__quick-btn:hover {\n  background: var(--mrr-accent-dim);\n}\n\n/* Narrow-panel guard (≥320px). Below ~280px the cluster collapses to a\n * single column; above that the resources wrap as a 2-up grid via\n * flex-wrap + min-width. */\n@media (max-width: 320px) {\n  .mrr-resource {\n    flex-basis: 100%;\n    min-width: 0;\n  }\n}\n\n/* ── Phase 5 step 5.6: V20 morality + paths + virtues + health-track ─────\n * V20 visual treatment. Owns the .mrr-morality cluster (Path Rating,\n * path picker + description, virtue rows with paired-choice toggle) and\n * the .mrr-health-track grid (7 boxes cycling through B / L / A damage\n * types per V20 RAW). All rules namespaced under .mrr-morality* and\n * .mrr-health-track* so they don\'t collide with the Phase 5 step 5.3\n * resources cluster above. */\n\n.mrr-morality {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  padding: 8px 10px;\n  margin: 6px 0;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-hairline);\n  border-radius: 6px;\n}\n.mrr-morality__header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  flex-wrap: wrap;\n}\n.mrr-morality__title {\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  color: var(--mrr-text-faint);\n}\n.mrr-morality__rating {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n}\n.mrr-morality__rating-label {\n  font-size: 11px;\n  color: var(--mrr-text-faint);\n}\n.mrr-morality__rating-step {\n  width: 22px;\n  height: 22px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--mrr-bg-input);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 4px;\n  color: var(--mrr-text);\n  font-size: 14px;\n  line-height: 1;\n  cursor: pointer;\n}\n.mrr-morality__rating-step:hover:not([disabled]) {\n  background: var(--mrr-accent-soft);\n}\n.mrr-morality__rating-step[disabled] {\n  opacity: 0.4;\n  cursor: not-allowed;\n}\n.mrr-morality__rating-value {\n  min-width: 1.5em;\n  text-align: center;\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--mrr-text);\n}\n.mrr-morality__path-row {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.mrr-morality__path-select {\n  background: var(--mrr-bg-input);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 4px;\n  color: var(--mrr-text);\n  padding: 4px 6px;\n  font-size: 12px;\n  font-family: inherit;\n}\n.mrr-morality__path-desc {\n  font-size: 11px;\n  color: var(--mrr-text-faint);\n  line-height: 1.4;\n  padding: 4px 6px;\n  background: var(--mrr-bg-app);\n  border-left: 2px solid var(--mrr-accent-line);\n  border-radius: 2px;\n}\n.mrr-morality__virtues {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.mrr-morality__virtue {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  flex-wrap: wrap;\n}\n.mrr-morality__virtue-label {\n  flex: 1 1 auto;\n  font-size: 12px;\n  color: var(--mrr-text);\n}\n.mrr-morality__virtue-toggle {\n  display: inline-flex;\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 4px;\n  overflow: hidden;\n}\n.mrr-morality__virtue-toggle-btn {\n  padding: 2px 8px;\n  background: var(--mrr-bg-input);\n  border: 0;\n  color: var(--mrr-text-faint);\n  font-size: 11px;\n  cursor: pointer;\n  transition: background-color 100ms ease-out, color 100ms ease-out;\n}\n.mrr-morality__virtue-toggle-btn[aria-pressed="true"] {\n  background: var(--mrr-accent-soft);\n  color: var(--mrr-text);\n  font-weight: 600;\n}\n.mrr-morality__virtue-stepper {\n  display: inline-flex;\n  align-items: center;\n  gap: 2px;\n}\n.mrr-morality__virtue-step {\n  width: 20px;\n  height: 20px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--mrr-bg-input);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 3px;\n  color: var(--mrr-text);\n  font-size: 12px;\n  line-height: 1;\n  cursor: pointer;\n}\n.mrr-morality__virtue-step:hover:not([disabled]) {\n  background: var(--mrr-accent-soft);\n}\n.mrr-morality__virtue-step[disabled] {\n  opacity: 0.4;\n  cursor: not-allowed;\n}\n.mrr-morality__virtue-value {\n  min-width: 1.25em;\n  text-align: center;\n  font-size: 12px;\n  font-weight: 600;\n  color: var(--mrr-text);\n}\n\n/* v20-health-track — 7-level V20 health grid. Each box cycles\n * empty → B (bashing) → L (lethal) → A (aggravated) → empty on click.\n * Color tier matches damage severity (B = faint, L = warn, A = bad). */\n.mrr-health-track {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  width: 100%;\n}\n.mrr-health-track__levels {\n  display: grid;\n  grid-template-columns: repeat(7, minmax(0, 1fr));\n  gap: 3px;\n}\n.mrr-health-track__level {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 2px;\n}\n.mrr-health-track__box {\n  width: 100%;\n  min-height: 22px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  background: var(--mrr-bg-input);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 3px;\n  color: var(--mrr-text);\n  font-size: 12px;\n  font-weight: 700;\n  font-family: var(--mrr-mono, ui-monospace, SFMono-Regular, Menlo, monospace);\n  cursor: pointer;\n  transition: background-color 100ms ease-out, border-color 100ms ease-out;\n}\n.mrr-health-track__box[data-damage="B"] {\n  background: var(--mrr-accent-soft);\n  border-color: var(--mrr-accent-line);\n}\n.mrr-health-track__box[data-damage="L"] {\n  background: oklch(0.55 0.16 60 / 0.32);\n  border-color: oklch(0.65 0.18 60 / 0.55);\n  color: oklch(0.94 0.04 60);\n}\n.mrr-health-track__box[data-damage="A"] {\n  background: oklch(0.50 0.20 25 / 0.42);\n  border-color: oklch(0.62 0.22 25 / 0.65);\n  color: oklch(0.96 0.05 25);\n}\n.mrr-health-track__label {\n  font-size: 9px;\n  letter-spacing: 0.04em;\n  color: var(--mrr-text-faint);\n  text-align: center;\n  line-height: 1.1;\n}\n.mrr-health-track__penalty {\n  font-size: 9px;\n  color: var(--mrr-text-faint);\n  font-variant-numeric: tabular-nums;\n}\n.mrr-health-track__summary {\n  display: flex;\n  justify-content: space-between;\n  gap: 6px;\n  font-size: 10px;\n  color: var(--mrr-text-faint);\n}\n.mrr-health-track__legend {\n  display: inline-flex;\n  gap: 6px;\n}\n.mrr-health-track__legend code {\n  font-family: var(--mrr-mono, ui-monospace, SFMono-Regular, Menlo, monospace);\n  font-size: 10px;\n}\n\n@media (max-width: 320px) {\n  .mrr-health-track__levels {\n    grid-template-columns: repeat(4, minmax(0, 1fr));\n  }\n  .mrr-morality__virtue {\n    flex-direction: column;\n    align-items: flex-start;\n  }\n}\n\n/* ── Round 6: roll-under mechanic ── */\n/* Visual states for roll-under outcomes. The dice tray\'s existing success/fail\n   modifiers cover plain pass/fail; these two add crit-success and fumble bands\n   the roll-under widget emits. accent ring for crit, warning fill for fumble —\n   same vocabulary as the dice-pool botch state. */\n.mrr-dice__result--crit {\n  border-color: var(--mrr-accent);\n  background: var(--mrr-accent-soft);\n}\n.mrr-dice__result--fumble {\n  border-color: var(--mrr-warning);\n  background: rgba(251, 191, 36, 0.10);\n}\n\n/* ── Round 7: stance-modal-pool ── */\n/* Segmented stance toggle for stance-modal-pool resolution mode (Lasers &\n   Feelings). Two pill buttons render in a single row above the pool size\n   input. Active stance is filled with accent; inactive is the standard\n   hairline-button look so the choice reads at a glance. Per-die "exact"\n   highlight class lights the LASER FEELINGS dice in the result row, and\n   outcome tier classes give the dice tray\'s result strip a per-tier\n   gradient so miss / barely / good / critical are distinguishable without\n   reading text. */\n.mrr-dice__stance-row {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 6px 8px 4px;\n}\n.mrr-dice__stance-row > label {\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n  color: var(--mrr-text-faint, oklch(0.7 0.02 285));\n  min-width: 48px;\n}\n.mrr-dice__stance-group {\n  display: inline-flex;\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 999px;\n  overflow: hidden;\n  background: var(--mrr-bg-input);\n}\n.mrr-stance-btn {\n  appearance: none;\n  border: 0;\n  background: transparent;\n  color: var(--mrr-text, inherit);\n  font: inherit;\n  font-size: 11px;\n  font-weight: 600;\n  letter-spacing: 0.06em;\n  padding: 4px 12px;\n  cursor: pointer;\n  transition: background 120ms ease, color 120ms ease;\n}\n.mrr-stance-btn + .mrr-stance-btn {\n  border-left: 1px solid var(--mrr-hairline);\n}\n.mrr-stance-btn:hover {\n  background: var(--mrr-accent-soft);\n}\n.mrr-stance-btn--active {\n  background: var(--mrr-accent);\n  color: var(--mrr-on-accent);\n}\n.mrr-stance-btn--active:hover {\n  background: var(--mrr-accent);\n}\n\n/* Pool-formula hint label under the pool input. Pure cosmetic — exposes\n   the rules-text formula for pool composition to the player without\n   forcing them into a parser. */\n.mrr-dice__hint {\n  font-size: 10px;\n  color: var(--mrr-text-faint, oklch(0.65 0.02 285));\n  padding: 0 8px 4px;\n  font-style: italic;\n}\n\n/* LASER FEELINGS / exact-match die highlight. Stronger accent ring than a\n   plain stance-success so the exact-match dice pop on the result strip. */\n.mrr-dice__face--exact {\n  outline: 2px solid var(--mrr-accent);\n  outline-offset: -2px;\n  background: var(--mrr-accent-soft);\n  position: relative;\n}\n\n/* Stance-modal-pool result strip — per-tier visual states. Outcome tiers\n   are open-ended labels (the spec doesn\'t enumerate them) so we map by\n   the canonical L&F label set: miss / barely / good / critical. Any other\n   tier label falls through to the default --success / --fail kind chosen\n   by rollStanceModalPool. */\n.mrr-dice__result--tier-miss {\n  border-color: var(--mrr-warning);\n  background: rgba(251, 191, 36, 0.08);\n}\n.mrr-dice__result--tier-barely {\n  border-color: var(--mrr-hairline-strong);\n  background: rgba(255, 255, 255, 0.04);\n}\n.mrr-dice__result--tier-good {\n  border-color: var(--mrr-accent-line);\n  background: var(--mrr-accent-soft);\n}\n.mrr-dice__result--tier-critical {\n  border-color: var(--mrr-accent);\n  background: var(--mrr-accent-soft);\n  box-shadow: 0 0 0 1px var(--mrr-accent-dim) inset;\n}\n\n/* ── Phase 6: DERIVED POOLS card grid ────────────────────────────────────\n * 2-column grid of compact stat cards replacing the legacy row layout.\n * Card anatomy: name top-left, big value top-right, faint formula\n * tokens below the head. Auto-calc cards show the computed value with\n * no edit input; manual cards keep an inline stepper.\n * Grid wraps to one column at narrow widths so the cards never crowd.\n * Source: ~/projects/claude-design-updates intent + image 7 (2026-05-08).\n * ────────────────────────────────────────────────────────────────────── */\n.mrr-derived-pools__subtitle {\n  font-size: 11px;\n  color: var(--mrr-text-faint, var(--mrr-text-dim));\n  margin: 2px 0 8px;\n  padding-left: 4px;\n  font-style: italic;\n  letter-spacing: 0.01em;\n}\n\n.mrr-derived-pools {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 8px;\n  width: 100%;\n}\n\n@media (max-width: 320px) {\n  .mrr-derived-pools {\n    grid-template-columns: 1fr;\n  }\n}\n\n.mrr-derived-pool-card {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  padding: 8px 10px;\n  background: var(--mrr-bg-elev);\n  border: 1px solid var(--mrr-hairline);\n  border-radius: 6px;\n  min-width: 0;\n}\n\n.mrr-derived-pool-card:hover {\n  border-color: var(--mrr-hairline-strong);\n}\n\n.mrr-derived-pool-card__head {\n  display: flex;\n  flex-direction: row;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: 8px;\n  min-width: 0;\n}\n\n.mrr-derived-pool-card__name {\n  font-family: var(--mrr-sans, inherit);\n  font-size: 13px;\n  font-weight: 500;\n  color: var(--mrr-text);\n  letter-spacing: 0.01em;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  min-width: 0;\n  flex: 1 1 auto;\n}\n\n.mrr-derived-pool-card__value-wrap {\n  display: inline-flex;\n  align-items: baseline;\n  gap: 4px;\n  flex-shrink: 0;\n}\n\n.mrr-derived-pool-card__value {\n  font-family: var(--mrr-mono, monospace);\n  font-size: 20px;\n  font-weight: 600;\n  color: var(--mrr-text);\n  line-height: 1;\n  min-width: 1.5ch;\n  text-align: right;\n}\n\n.mrr-derived-pool-card__value--autocalc {\n  color: var(--mrr-accent);\n}\n\n.mrr-derived-pool-card__value-input {\n  font-family: var(--mrr-mono, monospace);\n  font-size: 18px;\n  font-weight: 600;\n  width: auto;\n  min-width: 3ch;\n  max-width: 5ch;\n  padding: 2px 4px;\n  background: var(--mrr-bg-app);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 4px;\n  color: var(--mrr-text);\n  text-align: right;\n  box-sizing: content-box;\n}\n\n.mrr-derived-pool-card__max {\n  font-family: var(--mrr-mono, monospace);\n  font-size: 12px;\n  color: var(--mrr-text-dim);\n}\n\n.mrr-derived-pool-card__bonus {\n  font-family: var(--mrr-mono, monospace);\n  font-size: 12px;\n  color: var(--mrr-success, var(--mrr-accent));\n  white-space: nowrap;\n}\n\n.mrr-derived-pool-card__bonus--neg {\n  color: var(--mrr-fail);\n}\n\n.mrr-derived-pool-card__formula {\n  font-family: var(--mrr-mono, monospace);\n  font-size: 10px;\n  color: var(--mrr-text-faint, var(--mrr-text-dim));\n  letter-spacing: 0.02em;\n  line-height: 1.3;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.mrr-derived-pool-card__roll {\n  margin-top: 4px;\n  padding: 3px 8px;\n  font-size: 11px;\n  background: var(--mrr-bg-app);\n  border: 1px solid var(--mrr-hairline-strong);\n  border-radius: 4px;\n  color: var(--mrr-text);\n  cursor: pointer;\n  align-self: flex-start;\n}\n\n.mrr-derived-pool-card__roll:hover {\n  background: var(--mrr-accent-soft);\n  border-color: var(--mrr-accent-line);\n}\n\n/* ── Phase 6: state-banner resource (Anima Banner inline) ────────────────\n * Cycle-button pill that lives inline in the Resources cluster. Per-tier\n * color tints communicate the banner\'s intensity at a glance.\n * Hidden dropdown stays in DOM (sr-only-ish) so keyboard users can pick\n * a value directly rather than clicking through the cycle.\n * ────────────────────────────────────────────────────────────────────── */\n.mrr-resource--state-banner {\n  /* Allow the banner to use a contrasting background so it reads as a\n     status pill rather than another stepper. */\n  background: transparent;\n  border: 1px dashed var(--mrr-hairline);\n}\n\n.mrr-state-banner {\n  display: flex;\n  flex-direction: row;\n  align-items: center;\n  gap: 6px;\n}\n\n.mrr-state-banner__pill {\n  font-family: var(--mrr-sans, inherit);\n  font-size: 13px;\n  font-weight: 600;\n  letter-spacing: 0.02em;\n  padding: 4px 12px;\n  border-radius: 999px;\n  background: var(--mrr-bg-app);\n  color: var(--mrr-text);\n  border: 1px solid var(--mrr-hairline-strong);\n  cursor: pointer;\n  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;\n}\n\n.mrr-state-banner__pill:hover {\n  border-color: var(--mrr-accent-line);\n}\n\n/* Anima Banner tiers — dim → bonfire follows intensity gradient. */\n.mrr-state-banner__pill--suppressed,\n.mrr-state-banner__pill--none {\n  background: var(--mrr-bg-app);\n  color: var(--mrr-text-dim);\n  border-color: var(--mrr-hairline);\n}\n.mrr-state-banner__pill--dim {\n  background: oklch(0.25 0.04 60 / 0.30);\n  color: oklch(0.85 0.06 60);\n  border-color: oklch(0.6 0.10 60 / 0.5);\n}\n.mrr-state-banner__pill--glowing {\n  background: oklch(0.30 0.08 60 / 0.45);\n  color: oklch(0.92 0.10 60);\n  border-color: oklch(0.7 0.14 60 / 0.7);\n}\n.mrr-state-banner__pill--burning {\n  background: oklch(0.36 0.13 50 / 0.55);\n  color: oklch(0.95 0.14 50);\n  border-color: oklch(0.75 0.18 50 / 0.8);\n  box-shadow: 0 0 8px oklch(0.7 0.20 50 / 0.35);\n}\n.mrr-state-banner__pill--bonfire {\n  background: oklch(0.42 0.18 45 / 0.65);\n  color: oklch(0.97 0.15 50);\n  border-color: oklch(0.80 0.20 45 / 0.9);\n  box-shadow: 0 0 12px oklch(0.75 0.22 45 / 0.50);\n}\n.mrr-state-banner__pill--iconic {\n  background: oklch(0.48 0.22 40 / 0.75);\n  color: oklch(0.98 0.18 45);\n  border-color: oklch(0.85 0.22 40);\n  box-shadow: 0 0 16px oklch(0.80 0.24 40 / 0.65);\n  text-transform: uppercase;\n  letter-spacing: 0.06em;\n}\n\n/* Visually hide the redundant keyboard-accessible <select> — it\'s still in\n   the DOM for keyboard users and screen readers (assistive tech can focus\n   the hidden element and pick a value), but it doesn\'t overlap the pill.\n   The click-to-cycle pill is the primary affordance for mouse users. */\n.mrr-state-banner__select {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border: 0;\n}\n';

var BUNDLE_SCHEMA = "mrr-character-bundle";

var BUNDLE_SCHEMA_ACCEPT = [ "mrr-character-bundle", "mrrp-character-bundle" ];

var RP_LEGACY_CHARACTER_PFX = "mrrp-character-";

var RP_LEGACY_CHARS_PFX = "mrrp-chars-";

var RP_LEGACY_ACTIVE_RULESET = "mrrp-active-ruleset";

var BUNDLE_VERSION = 1;

var ROUTE_POLL_MS = 1500;

var RELOAD_DELAY_MS = 600;

var DEFAULT_BAR_MAX = 10;

var DEFAULT_SKILL_MAX = 99;

var REQUIRED_FIELDS = [ "id", "name", "version", "dice", "resolution", "attributes", "skills" ];

var MODES = {
  SINGLE: "single-roll",
  POOL: "dice-pool",
  SUM: "dice-pool-sum",
  D100: "d100-percentile",
  PBTA: "2d6-stat",
  FATE: "fate-ladder",
  UNDER: "roll-under",
  STANCE: "stance-modal-pool",
  NARRATIVE: "narrative-handled"
};

var BOTCH_TRIGGER = {
  ZERO: "any-on-zero-successes",
  MAJORITY: "majority",
  ALWAYS: "always-on-face"
};

var BONUS_KIND = {
  VALUE: "value",
  DICE: "dice",
  SUCCESSES: "successes",
  DAMAGE_POOL: "damage-pool"
};

var state = {
  ruleset: null,
  sheet: null,
  chatId: null,
  characters: [],
  activeCharacterId: null,
  mountEl: null,
  diceEl: null,
  dialogEl: null,
  itemDialogEl: null,
  abilityDialogEl: null,
  gearEl: null,
  toggleEl: null,
  spellbookEl: null,
  spellbookOpen: false,
  spellbookLbId: null,
  collapsed: true,
  sheetResizeObserver: null,
  installing: false
};

var barRefreshers = [];

var derivedBonusRefreshers = [];

marinara = function(host) {
  if (host && typeof host.addElement === "function") return host;
  var trackedNodes = [];
  var trackedListeners = [];
  function addElement(parent, tag, attrs) {
    var target = typeof parent === "string" ? document.querySelector(parent) : parent;
    if (!target) return null;
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function(k) {
        var v = attrs[k];
        if (k === "innerHTML") el.innerHTML = v; else if (k === "textContent") el.textContent = v; else el.setAttribute(k, v);
      });
    }
    target.appendChild(el);
    trackedNodes.push(el);
    return el;
  }
  var errLog = host && host.log && typeof host.log.error === "function" ? host.log : console;
  function wrapHandler(fn) {
    return function() {
      try {
        return fn.apply(this, arguments);
      } catch (e) {
        errLog.error("[MRR] event handler error:", e);
      }
    };
  }
  function on(target, evt, fn) {
    var wrapped = typeof fn === "function" ? wrapHandler(fn) : {
      handleEvent: wrapHandler(function(e) {
        return fn.handleEvent(e);
      })
    };
    target.addEventListener(evt, wrapped);
    trackedListeners.push([ target, evt, wrapped ]);
  }
  function apiFetch(path, opts) {
    var normalized = path.charAt(0) === "/" ? path : "/" + path;
    var init = Object.assign({
      headers: {
        "Content-Type": "application/json"
      }
    }, opts || {});
    var method = String(init.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      init.headers = Object.assign({}, init.headers, {
        "x-marinara-csrf": "1"
      });
    }
    return mrrFetch("/api" + normalized, init).then(function(r) {
      return r.json();
    });
  }
  var shim = {
    extensionId: host && host.extension ? host.extension.id : "mrr-legacy",
    extensionName: host && host.extension ? host.extension.name : "Marinara-RPG-Extension",
    extension: host ? host.extension : null,
    log: host && host.log || console,
    fetch: host ? host.fetch.bind(host) : window.fetch.bind(window),
    storage: host ? host.storage : null,
    addElement,
    on,
    apiFetch,
    setTimeout: host ? host.setTimeout.bind(host) : window.setTimeout.bind(window),
    clearTimeout: host ? host.clearTimeout.bind(host) : window.clearTimeout.bind(window),
    setInterval: host ? host.setInterval.bind(host) : window.setInterval.bind(window),
    clearInterval: host ? host.clearInterval.bind(host) : window.clearInterval.bind(window),
    onCleanup: host && host.onCleanup ? host.onCleanup.bind(host) : function() {}
  };
  if (host && host.onCleanup) host.onCleanup(function() {
    trackedListeners.forEach(function(l) {
      try {
        l[0].removeEventListener(l[1], l[2]);
      } catch (e) {}
    });
    trackedNodes.forEach(function(n) {
      try {
        n.remove();
      } catch (e) {}
    });
  });
  return shim;
}(marinara);

var mrrFetch = typeof marinara.fetch === "function" ? marinara.fetch.bind(marinara) : window.fetch.bind(window);

function refreshAllBars() {
  for (var i = 0; i < barRefreshers.length; i++) {
    try {
      barRefreshers[i]();
    } catch (e) {}
  }
}

function refreshAllEquipmentBonuses() {
  for (var i = 0; i < derivedBonusRefreshers.length; i++) {
    try {
      derivedBonusRefreshers[i]();
    } catch (e) {}
  }
}

function log(msg, payload) {
  if (payload === undefined) console.log("[mrr]", msg); else console.log("[mrr]", msg, payload);
}

function warn(msg, payload) {
  if (payload === undefined) console.warn("[mrr]", msg); else console.warn("[mrr]", msg, payload);
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function lsGetRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function lsSetRaw(key, val) {
  try {
    localStorage.setItem(key, val);
    return true;
  } catch (e) {
    return false;
  }
}

function lsDelRaw(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
}

var hasServerStorage = !!(marinara && marinara.storage && typeof marinara.storage.get === "function");

var MRR_MIGRATED_FLAG = "mrr-migrated-v1";

var MRR_TS_MAP_KEY = "mrr-ts-map";

var MRR_STORAGE_SIZE_GUARD_BYTES = 9e5;

var MRR_FLUSH_DEBOUNCE_MS = 1e3;

var MRR_RETRY_DELAYS_MS = [ 2e3, 8e3, 3e4 ];

var MRR_HYDRATE_TIMEOUT_MS = 8e3;

var mrrServerCache = null;

var mrrHydratePromise = null;

var mrrPendingPatchKeys = {};

var mrrFlushTimer = null;

var mrrQuarantinedKeys = {};

var MRR_CHARS_PFX = "mrr-chars-";

var MRR_ACTIVE_CHAR_PFX = "mrr-active-char-";

var MRR_LAST_CHAR_PFX = "mrr-last-char-";

var MRR_BINDINGS_KEY = "mrr-card-bindings";

function mrrIsSyncedKey(key) {
  if (typeof key !== "string") return false;
  if (key.indexOf(LS_CHARACTER_PFX) === 0) return true;
  if (key === LS_RULESET) return true;
  if (key === MRR_BINDINGS_KEY) return true;
  if (key.indexOf(LS_SPELLBOOK_LB_PFX) === 0) return true;
  if (key.indexOf(MRR_CHARS_PFX) === 0) return true;
  if (key.indexOf(MRR_ACTIVE_CHAR_PFX) === 0) return true;
  if (key.indexOf(MRR_LAST_CHAR_PFX) === 0) return true;
  return false;
}

function mrrIsCharacterFamilyKey(key) {
  return key.indexOf(LS_CHARACTER_PFX) === 0 || key.indexOf(MRR_CHARS_PFX) === 0 || key.indexOf(MRR_ACTIVE_CHAR_PFX) === 0;
}

function forEachLocalStorageKey(prefix, cb) {
  var total = typeof localStorage !== "undefined" && localStorage.length || 0;
  for (var i = 0; i < total; i++) {
    var key = localStorage.key(i);
    if (key && key.indexOf(prefix) === 0) cb(key);
  }
}

function mrrByteLength(str) {
  if (typeof TextEncoder !== "undefined") return (new TextEncoder).encode(str).length;
  return unescape(encodeURIComponent(str)).length;
}

function mrrProjectedMergedRecord(patch) {
  var merged = {}, k;
  for (k in mrrServerCache) {
    if (!Object.prototype.hasOwnProperty.call(mrrServerCache, k)) continue;
    if (mrrQuarantinedKeys[k]) continue;
    merged[k] = mrrServerCache[k];
  }
  for (k in patch) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) merged[k] = patch[k];
  }
  return merged;
}

function mrrNormalizeEnvelope(raw) {
  if (raw && typeof raw === "object" && typeof raw.t === "number" && isFinite(raw.t) && (typeof raw.v === "string" || raw.v === null)) {
    return raw;
  }
  if (typeof raw === "string") return {
    t: 0,
    v: raw
  };
  return {
    t: 0,
    v: null
  };
}

function mrrLoadTsMap() {
  var parsed = safeParse(lsGetRaw(MRR_TS_MAP_KEY));
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function mrrStampTsMap(key, ts) {
  var map = mrrLoadTsMap();
  map[key] = ts;
  lsSetRaw(MRR_TS_MAP_KEY, JSON.stringify(map));
}

function mrrAdoptLsIfNewer(key, lsTs, markDirtyOnAdopt) {
  var hasServerEntry = Object.prototype.hasOwnProperty.call(mrrServerCache, key);
  var serverTs = hasServerEntry ? mrrNormalizeEnvelope(mrrServerCache[key]).t : null;
  var adopt = !hasServerEntry || lsTs > serverTs;
  if (!adopt) return false;
  var lsRaw = lsGetRaw(key);
  mrrServerCache[key] = {
    t: lsTs,
    v: lsRaw
  };
  if (markDirtyOnAdopt) mrrMarkDirty(key);
  return true;
}

function mrrHydrateMerge() {
  if (!hasServerStorage) return;
  var tsMap = mrrLoadTsMap();
  var candidateKeys = {}, k;
  for (k in mrrServerCache) {
    if (Object.prototype.hasOwnProperty.call(mrrServerCache, k)) candidateKeys[k] = true;
  }
  for (k in tsMap) {
    if (Object.prototype.hasOwnProperty.call(tsMap, k)) candidateKeys[k] = true;
  }
  Object.keys(candidateKeys).forEach(function(key) {
    if (!mrrIsSyncedKey(key)) return;
    mrrAdoptLsIfNewer(key, tsMap[key] || 0, true);
  });
}

function mrrReconcileFromOtherTabs() {
  if (!hasServerStorage || !mrrServerCache) return;
  var tsMap = mrrLoadTsMap();
  var activeSheetKey = state.activeCharacterId ? mrrWriteRecordKey(state.activeCharacterId) : null;
  var legacySheetKey = state.activeCharacterId ? characterKey(state.activeCharacterId) : null;
  var rosterKey = state.chatId ? "mrr-chars-" + state.chatId : null;
  var activeCharPtrKey = state.chatId ? "mrr-active-char-" + state.chatId : null;
  var adoptedActiveSheet = false, adoptedRoster = false, adoptedActiveCharPtr = false;
  Object.keys(tsMap).forEach(function(key) {
    if (!mrrIsSyncedKey(key)) return;
    var adopted = mrrAdoptLsIfNewer(key, tsMap[key] || 0, false);
    if (!adopted) return;
    if (activeSheetKey && key === activeSheetKey) adoptedActiveSheet = true; else if (legacySheetKey && key === legacySheetKey) adoptedActiveSheet = true;
    if (rosterKey && key === rosterKey) adoptedRoster = true;
    if (activeCharPtrKey && key === activeCharPtrKey) adoptedActiveCharPtr = true;
  });
  if (!adoptedActiveSheet && !adoptedRoster && !adoptedActiveCharPtr) return;
  if (adoptedActiveCharPtr) {
    state.activeCharacterId = loadActiveCharacterId(state.chatId, state.activeCharacterId);
  }
  if (adoptedRoster) {
    state.characters = loadCharacters(state.chatId);
  }
  if (adoptedActiveSheet || adoptedActiveCharPtr) {
    state.sheet = loadSheet(state.chatId, state.ruleset);
  }
  log("mrrReconcileFromOtherTabs: reloaded in-memory state for another tab's newer edit (sheet=" + adoptedActiveSheet + " roster=" + adoptedRoster + " activeChar=" + adoptedActiveCharPtr + ")");
  if (typeof renderSheet === "function") renderSheet();
}

function hydrateStore() {
  if (mrrHydratePromise) return mrrHydratePromise;
  if (!hasServerStorage) {
    mrrServerCache = {};
    mrrHydratePromise = Promise.resolve();
    return mrrHydratePromise;
  }
  var timeoutPromise = new Promise(function(resolve, reject) {
    marinara.setTimeout(function() {
      reject(new Error("marinara.storage.get() timed out after " + MRR_HYDRATE_TIMEOUT_MS + "ms"));
    }, MRR_HYDRATE_TIMEOUT_MS);
  });
  mrrHydratePromise = Promise.race([ marinara.storage.get(), timeoutPromise ]).then(function(record) {
    mrrServerCache = record && typeof record === "object" ? record : {};
    mrrHydrateMerge();
    return mrrRunMigration();
  }).catch(function(e) {
    warn("marinara.storage hydrate failed — falling back to local storage for this session: " + (e && e.message ? e.message : e));
    hasServerStorage = false;
    mrrServerCache = {};
  });
  return mrrHydratePromise;
}

function mrrRunMigration() {
  if (!hasServerStorage) return Promise.resolve();
  if (lsGetRaw(MRR_MIGRATED_FLAG)) return Promise.resolve();
  var tasks = [];
  forEachLocalStorageKey(LS_CHARACTER_PFX, function(key) {
    tasks.push(key);
  });
  forEachLocalStorageKey(MRR_CHARS_PFX, function(key) {
    tasks.push(key);
  });
  forEachLocalStorageKey(MRR_ACTIVE_CHAR_PFX, function(key) {
    tasks.push(key);
  });
  if (lsGetRaw(LS_RULESET) !== null) tasks.push(LS_RULESET);
  forEachLocalStorageKey(LS_SPELLBOOK_LB_PFX, function(key) {
    tasks.push(key);
  });
  return mrrMigrateKeysSequential(tasks, 0, true).then(function(allOk) {
    if (allOk) lsSetRaw(MRR_MIGRATED_FLAG, "1");
  });
}

function mrrMigrateKeysSequential(keys, idx, allOk) {
  if (idx >= keys.length) return Promise.resolve(allOk);
  return mrrMigrateOneKey(keys[idx]).then(function(ok) {
    return mrrMigrateKeysSequential(keys, idx + 1, allOk && ok);
  });
}

function mrrMigrateOneKey(key) {
  if (Object.prototype.hasOwnProperty.call(mrrServerCache, key)) return Promise.resolve(true);
  var raw = lsGetRaw(key);
  if (raw === null || raw === undefined) return Promise.resolve(true);
  var tsMap = mrrLoadTsMap();
  var ts = typeof tsMap[key] === "number" ? tsMap[key] : 0;
  var envelope = {
    t: ts,
    v: raw
  };
  var patch = {};
  patch[key] = envelope;
  if (mrrByteLength(JSON.stringify(mrrProjectedMergedRecord(patch))) > MRR_STORAGE_SIZE_GUARD_BYTES) {
    warn('migration: skipped "' + key + '" — would exceed the server-sync size budget; left local-only.');
    if (mrrIsCharacterFamilyKey(key)) mrrQuarantinedKeys[key] = true;
    return Promise.resolve(true);
  }
  return marinara.storage.patch(patch).then(function() {
    mrrServerCache[key] = envelope;
    return true;
  }).catch(function(e) {
    warn('migration: failed to sync "' + key + '" this session (' + (e && e.message ? e.message : e) + ") — will retry next session.");
    return false;
  });
}

function mrrMarkDirty(key) {
  mrrPendingPatchKeys[key] = true;
  if (!mrrFlushTimer) {
    mrrFlushTimer = marinara.setTimeout(function() {
      mrrFlushTimer = null;
      mrrFlushPendingPatch();
    }, MRR_FLUSH_DEBOUNCE_MS);
  }
}

function mrrFlushPendingPatch() {
  if (mrrFlushTimer) {
    marinara.clearTimeout(mrrFlushTimer);
    mrrFlushTimer = null;
  }
  if (!hasServerStorage || !mrrServerCache) return;
  var keys = Object.keys(mrrPendingPatchKeys);
  if (!keys.length) return;
  mrrPendingPatchKeys = {};
  mrrPatchKeys(keys, 0);
}

function mrrBuildEnvelopePatch(keys) {
  var patch = {};
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    patch[k] = Object.prototype.hasOwnProperty.call(mrrServerCache, k) ? mrrServerCache[k] : {
      t: Date.now(),
      v: null
    };
  }
  return patch;
}

function mrrBuildPatchFromCache(keys) {
  var patch = mrrBuildEnvelopePatch(keys);
  if (mrrByteLength(JSON.stringify(mrrProjectedMergedRecord(patch))) <= MRR_STORAGE_SIZE_GUARD_BYTES) {
    return patch;
  }
  var characterKeys = [], smallKeys = [];
  keys.forEach(function(k) {
    (mrrIsCharacterFamilyKey(k) ? characterKeys : smallKeys).push(k);
  });
  characterKeys.forEach(function(k) {
    mrrQuarantinedKeys[k] = true;
    mrrPendingPatchKeys[k] = true;
  });
  mrrPanelWarn("character library exceeds server-sync budget — sheets stored locally");
  if (!smallKeys.length) return null;
  var retryPatch = mrrBuildEnvelopePatch(smallKeys);
  if (mrrByteLength(JSON.stringify(mrrProjectedMergedRecord(retryPatch))) > MRR_STORAGE_SIZE_GUARD_BYTES) {
    smallKeys.forEach(function(k) {
      mrrPendingPatchKeys[k] = true;
    });
    return null;
  }
  return retryPatch;
}

function mrrPatchKeys(keys, attempt) {
  keys = keys.filter(function(k) {
    return !mrrQuarantinedKeys[k];
  });
  if (!keys.length) return;
  var patch = mrrBuildPatchFromCache(keys);
  if (!patch) return;
  marinara.storage.patch(patch).catch(function() {
    if (attempt < MRR_RETRY_DELAYS_MS.length) {
      marinara.setTimeout(function() {
        mrrPatchKeys(keys, attempt + 1);
      }, MRR_RETRY_DELAYS_MS[attempt]);
      return;
    }
    if (keys.length > 1) {
      keys.forEach(function(k) {
        mrrPatchOneKey(k, 0);
      });
    } else {
      mrrQuarantinedKeys[keys[0]] = true;
      mrrPanelWarn('storage sync failed repeatedly for "' + keys[0] + '" — quarantined to local storage for this session');
    }
  });
}

function mrrPatchOneKey(key, attempt) {
  if (mrrQuarantinedKeys[key]) return;
  var patch = mrrBuildPatchFromCache([ key ]);
  if (!patch) return;
  marinara.storage.patch(patch).catch(function() {
    if (attempt < MRR_RETRY_DELAYS_MS.length) {
      marinara.setTimeout(function() {
        mrrPatchOneKey(key, attempt + 1);
      }, MRR_RETRY_DELAYS_MS[attempt]);
    } else {
      mrrQuarantinedKeys[key] = true;
      mrrPanelWarn('storage sync failed repeatedly for "' + key + '" — quarantined to local storage for this session');
    }
  });
}

function mrrBestEffortFlushOnCleanup() {
  if (!hasServerStorage || !mrrServerCache) return;
  var keys = Object.keys(mrrPendingPatchKeys).filter(function(k) {
    return !mrrQuarantinedKeys[k];
  });
  if (!keys.length) return;
  mrrPendingPatchKeys = {};
  var patch = mrrBuildPatchFromCache(keys);
  if (patch) {
    try {
      marinara.storage.patch(patch);
    } catch (e) {}
  }
}

var mrrWarnMessages = [];

var mrrWarnDismissed = false;

var mrrWarnStripEl = null;

function mrrRenderWarnStrip() {
  if (mrrWarnStripEl && !mrrWarnStripEl.isConnected) mrrWarnStripEl = null;
  if (!mrrWarnMessages.length || mrrWarnDismissed) {
    if (mrrWarnStripEl && mrrWarnStripEl.parentNode) mrrWarnStripEl.parentNode.removeChild(mrrWarnStripEl);
    mrrWarnStripEl = null;
    return;
  }
  if (!state.mountEl) return;
  if (!mrrWarnStripEl || !mrrWarnStripEl.parentNode) {
    var before = state.mountEl.firstChild;
    mrrWarnStripEl = marinara.addElement(state.mountEl, "div", {
      class: "mrr-warn-strip"
    });
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
    mrrWarnStripEl.style.background = "oklch(0.84 0.14 85 / 0.16)";
    mrrWarnStripEl.style.border = "1px solid oklch(0.84 0.14 85 / 0.4)";
    mrrWarnStripEl.style.borderRadius = "6px";
    mrrWarnStripEl.style.color = "var(--mrr-warning)";
    var textEl = marinara.addElement(mrrWarnStripEl, "span", {
      class: "mrr-warn-strip__text"
    });
    if (textEl) {
      textEl.style.flex = "1 1 auto";
      textEl.style.minWidth = "0";
      textEl.style.overflowWrap = "break-word";
    }
    var dismissBtn = marinara.addElement(mrrWarnStripEl, "button", {
      class: "mrr-warn-strip__dismiss",
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
      marinara.on(dismissBtn, "click", function() {
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
  if (mrrWarnMessages[mrrWarnMessages.length - 1] !== msg) mrrWarnMessages.push(msg);
  mrrWarnDismissed = false;
  mrrRenderWarnStrip();
}

function mrrIsQuarantined(key) {
  return !!mrrQuarantinedKeys[key];
}

function lsGet(key) {
  if (hasServerStorage && mrrServerCache && mrrIsSyncedKey(key) && !mrrIsQuarantined(key)) {
    if (Object.prototype.hasOwnProperty.call(mrrServerCache, key)) {
      var v = mrrNormalizeEnvelope(mrrServerCache[key]).v;
      return v === null || v === undefined ? null : v;
    }
  }
  return lsGetRaw(key);
}

var mrrLsWriteFailWarned = Object.create(null);

function lsSet(key, val) {
  var ok = lsSetRaw(key, val);
  if (!ok && !mrrLsWriteFailWarned["set:" + key]) {
    mrrLsWriteFailWarned["set:" + key] = true;
    warn("lsSet: localStorage write failed for '" + key + "' (quota exceeded or private mode?) — ts-map NOT stamped for this write");
  }
  if (hasServerStorage && mrrServerCache && mrrIsSyncedKey(key)) {
    var ts = Date.now();
    if (ok) mrrStampTsMap(key, ts);
    if (!mrrIsQuarantined(key)) {
      mrrServerCache[key] = {
        t: ts,
        v: val
      };
      mrrMarkDirty(key);
    }
  }
  return ok;
}

function lsDel(key) {
  var ok = lsDelRaw(key);
  if (!ok && !mrrLsWriteFailWarned["del:" + key]) {
    mrrLsWriteFailWarned["del:" + key] = true;
    warn("lsDel: localStorage removeItem failed for '" + key + "' — ts-map NOT stamped for this delete");
  }
  if (hasServerStorage && mrrServerCache && mrrIsSyncedKey(key)) {
    var ts = Date.now();
    if (ok) mrrStampTsMap(key, ts);
    if (!mrrIsQuarantined(key)) {
      mrrServerCache[key] = {
        t: ts,
        v: null
      };
      mrrMarkDirty(key);
    }
  }
}

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
    if (err) {
      warn("ruleset blob invalid: " + err);
      return null;
    }
    return rs;
  }
  if (lsGet(LS_RULESET_URL)) {
    log("ruleset URL configured but synchronous load not available; using cached blob if any");
  }
  return null;
}

function fetchRulesetFromUrl(url) {
  return mrrFetch(url).then(function(r) {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.text();
  }).then(function(text) {
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

function loadLibrary() {
  var raw = lsGet(LS_LIBRARY);
  if (!raw) return {};
  var parsed = safeParse(raw);
  return parsed && typeof parsed === "object" ? parsed : {};
}

function saveLibrary(lib) {
  lsSet(LS_LIBRARY, JSON.stringify(lib));
}

function addToLibrary(rs) {
  if (!rs || !rs.id) return;
  var lib = loadLibrary();
  var existing = lib[rs.id];
  if (existing && existing.name === rs.name && existing.version === rs.version) return;
  lib[rs.id] = {
    name: rs.name,
    version: rs.version,
    ruleset: rs
  };
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

function validateInstallBundle(b) {
  if (!b || typeof b !== "object") return [ {
    path: "(root)",
    expected: "object",
    got: typeof b,
    hint: "Bundle must be a JSON object."
  } ];
  var errs = [];
  function need(obj, path, key, type) {
    var v = obj[key];
    var actual = Array.isArray(v) ? "array" : typeof v;
    if (type === "array" ? !Array.isArray(v) : actual !== type) {
      errs.push({
        path: path + "." + key,
        expected: type,
        got: actual === "undefined" ? "missing" : actual,
        hint: ""
      });
    }
  }
  if (b.schema !== BUNDLE_SCHEMA_ID) {
    errs.push({
      path: "schema",
      expected: '"' + BUNDLE_SCHEMA_ID + '"',
      got: JSON.stringify(b.schema),
      hint: 'Set top-level field schema to "' + BUNDLE_SCHEMA_ID + '".'
    });
  }
  if (b.version !== 1) {
    errs.push({
      path: "version",
      expected: "1",
      got: JSON.stringify(b.version),
      hint: "Set top-level field version to integer 1."
    });
  }
  if (b.ruleset && typeof b.ruleset === "object") {
    var rsErr = validateRuleset(b.ruleset);
    if (rsErr) errs.push({
      path: "ruleset",
      expected: "valid ruleset.json",
      got: "invalid",
      hint: rsErr
    });
  } else {
    errs.push({
      path: "ruleset",
      expected: "object",
      got: typeof b.ruleset,
      hint: 'Embed the full ruleset.json under the "ruleset" key.'
    });
  }
  if (b.gmAgent !== undefined) {
    if (typeof b.gmAgent !== "object") {
      errs.push({
        path: "gmAgent",
        expected: "object (or omitted)",
        got: typeof b.gmAgent,
        hint: "Either remove gmAgent entirely or supply a full object with name + promptTemplate."
      });
    } else {
      need(b.gmAgent, "gmAgent", "name", "string");
      need(b.gmAgent, "gmAgent", "promptTemplate", "string");
      if (typeof b.gmAgent.promptTemplate === "string" && b.gmAgent.promptTemplate.length < 50) {
        errs.push({
          path: "gmAgent.promptTemplate",
          expected: "at least 50 characters",
          got: b.gmAgent.promptTemplate.length + " chars",
          hint: "Prompt templates this short usually mean the prompt was truncated."
        });
      }
    }
  }
  if (!b.lorebook || typeof b.lorebook !== "object") {
    errs.push({
      path: "lorebook",
      expected: "object",
      got: typeof b.lorebook,
      hint: "Add a lorebook object with name + entries array."
    });
  } else {
    need(b.lorebook, "lorebook", "name", "string");
    need(b.lorebook, "lorebook", "entries", "array");
    if (Array.isArray(b.lorebook.entries)) {
      for (var i = 0; i < b.lorebook.entries.length; i++) {
        var e = b.lorebook.entries[i];
        var p = "lorebook.entries[" + i + "]";
        if (!e || typeof e !== "object") {
          errs.push({
            path: p,
            expected: "object",
            got: typeof e,
            hint: ""
          });
          continue;
        }
        if (typeof e.name !== "string" || e.name.length === 0) errs.push({
          path: p + ".name",
          expected: "non-empty string",
          got: typeof e.name,
          hint: "Each entry needs a display name."
        });
        if (typeof e.content !== "string") errs.push({
          path: p + ".content",
          expected: "string",
          got: typeof e.content,
          hint: "Set content to the entry's reference text."
        });
        if ("position" in e && (typeof e.position !== "number" || e.position < 0 || e.position > 2)) {
          errs.push({
            path: p + ".position",
            expected: "integer 0, 1, or 2",
            got: JSON.stringify(e.position),
            hint: "0 = before character defs (system context), 1 = after, 2 = depth-injected."
          });
        }
      }
    }
  }
  return errs.length === 0 ? null : errs;
}

function formatBundleErrors(errs) {
  var lines = [ "Bundle install failed. " + errs.length + " issue" + (errs.length === 1 ? "" : "s") + " found:\n" ];
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

function apiFetch(path, opts) {
  return marinara.apiFetch(path, opts).catch(function(e) {
    var msg = "apiFetch " + path + ": " + (e && e.message ? e.message : String(e));
    var wrapped = new Error(msg);
    wrapped.cause = e;
    if (e && typeof e.status === "number") wrapped.status = e.status;
    throw wrapped;
  });
}

function parseAgentSettings(a) {
  if (!a) return {};
  var s = a.settings;
  if (typeof s === "string") {
    try {
      return JSON.parse(s);
    } catch (e) {
      return {};
    }
  }
  return s && typeof s === "object" ? s : {};
}

function findManagedAgent(agents, rulesetId, authorId, role) {
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

function mrrFindReplaceableAgent(agents, rulesetId, authorId, role) {
  var managed = findManagedAgent(agents, rulesetId, authorId, role);
  if (managed) return managed;
  var wanted = role || "main";
  var list = Array.isArray(agents) ? agents : [];
  for (var i = 0; i < list.length; i++) {
    var hit = mrrStrippedManagedRow(list[i], rulesetId);
    if (hit && hit.role === wanted && hit.authorId === authorId) return list[i];
  }
  return null;
}

function mrrPreservedAgentSettings(outgoing, bundleSettings, mrrKeys) {
  var merged = {};
  var b = bundleSettings && typeof bundleSettings === "object" ? bundleSettings : {};
  for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) merged[k] = b[k];
  var cur = outgoing ? parseAgentSettings(outgoing) : null;
  if (cur) {
    for (var c in cur) {
      if (!Object.prototype.hasOwnProperty.call(cur, c)) continue;
      if (c.indexOf("mrr") === 0) continue;
      merged[c] = cur[c];
    }
  }
  var m = mrrKeys && typeof mrrKeys === "object" ? mrrKeys : {};
  for (var q in m) if (Object.prototype.hasOwnProperty.call(m, q)) merged[q] = m[q];
  return merged;
}

function mrrPreservedConnectionId(outgoing, fallbackConnectionId) {
  if (outgoing && typeof outgoing.connectionId === "string" && outgoing.connectionId) return outgoing.connectionId;
  return fallbackConnectionId;
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

function mrrLorebookEntryLimit(entries) {
  var n = Array.isArray(entries) ? entries.length : 0;
  return Math.min(1e3, Math.max(150, n + 20));
}

function mrrCustomToolDescription(desc, rulesetLabel) {
  if (typeof desc === "string" && desc.trim()) return desc.slice(0, 500);
  return (rulesetLabel || "MRR") + " custom tool";
}

function pickDefaultConnection() {
  return apiFetch("/connections", {}).then(function(list) {
    if (!Array.isArray(list)) return null;
    var forAgents = list.find(function(c) {
      return c && (c.defaultForAgents === true || c.defaultForAgents === "true");
    });
    if (forAgents && forAgents.id) return forAgents.id;
    if (list.length !== 1) return null;
    return list[0] && list[0].id ? list[0].id : null;
  });
}

var MRR_TOOLLESS_PROVIDERS = [ "claude-subscription", "grok-subscription" ];

var mrrChatConnectionIds = Object.create(null);

var mrrDiceToolCheckedChats = Object.create(null);

function mrrNormalizeProviderId(p) {
  return String(p == null ? "" : p).trim().toLowerCase().replace(/_/g, "-");
}

function mrrProviderIsToolless(p) {
  var id = mrrNormalizeProviderId(p);
  if (!id) return false;
  return MRR_TOOLLESS_PROVIDERS.indexOf(id) !== -1;
}

function mrrPickNarratorConnection(list, chatConnectionId) {
  if (!Array.isArray(list) || !list.length) return null;
  function byId(id) {
    if (!id) return null;
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
    return null;
  }
  var chosen = byId(chatConnectionId);
  if (chosen) return {
    conn: chosen,
    source: "chat"
  };
  var dflt = list.find(function(c) {
    return c && (c.isDefault === true || c.isDefault === "true");
  });
  if (dflt) return {
    conn: dflt,
    source: "default"
  };
  if (list.length === 1 && list[0] && list[0].id) return {
    conn: list[0],
    source: "only"
  };
  return null;
}

function mrrPickMainFallbackConnection(list) {
  if (!Array.isArray(list)) return null;
  return list.find(function(c) {
    return c && (c.fallbackForMain === true || c.fallbackForMain === "true");
  }) || null;
}

function mrrDiceIntegrityNoticeText(picked, fallbackConn) {
  if (!picked || !picked.conn) return null;
  if (!mrrProviderIsToolless(picked.conn.provider)) return null;
  var provider = mrrNormalizeProviderId(picked.conn.provider);
  var msg = "Narrator dice tool unavailable on this connection (provider: " + provider + ")" + " — player-widget rolls are the RNG source. The GM is instructed to delegate rolls to you.";
  if (fallbackConn && !mrrProviderIsToolless(fallbackConn.provider)) {
    msg += " This describes the PRIMARY connection; a failover connection is configured and is tool-capable," + " but which one serves any given turn is the engine's call, not ours.";
  }
  return msg;
}

function mrrCheckDiceToolCapability(chatId, why) {
  if (!chatId) return Promise.resolve(null);
  if (mrrDiceToolCheckedChats[chatId]) return Promise.resolve(null);
  mrrDiceToolCheckedChats[chatId] = true;
  return apiFetch("/connections", {}).then(function(list) {
    var picked = mrrPickNarratorConnection(list, mrrChatConnectionIds[chatId]);
    var msg = mrrDiceIntegrityNoticeText(picked, mrrPickMainFallbackConnection(list));
    if (!msg) return null;
    mrrPanelWarn(msg + " [" + (why || "chat ruleset confirmed") + "; connection resolved from: " + picked.source + "]");
    return msg;
  }).catch(function(e) {
    log("dice-integrity guard: could not read /connections (" + (e && e.message ? e.message : e) + ") — staying silent (fail-open)");
    return null;
  });
}

function cmpVersion(a, b) {
  function parts(v) {
    return String(v || "0").split(".").map(function(n) {
      return parseInt(n, 10) || 0;
    });
  }
  var pa = parts(a), pb = parts(b);
  for (var i = 0; i < 3; i++) {
    var av = pa[i] || 0, bv = pb[i] || 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

function installBundle(bundle, progressCb) {
  var errs = validateInstallBundle(bundle);
  if (errs) return Promise.reject(new Error(formatBundleErrors(errs)));
  if (bundle.minExtensionVersion && cmpVersion(EXT_VERSION, bundle.minExtensionVersion) < 0) {
    return Promise.reject(new Error("This bundle requires extension version " + bundle.minExtensionVersion + " or newer; this build is " + EXT_VERSION + ". Update the framework JS first."));
  }
  var rulesetId = bundle.ruleset.id;
  var authorId = bundle.authorId || "local";
  var prefix = MRR_PROMPT_PFX + authorId + "/" + rulesetId + "]";
  function progress(msg) {
    if (progressCb) progressCb(msg);
  }
  progress("Loading existing server state...");
  return Promise.all([ apiFetch("/lorebooks", {}), apiFetch("/agents", {}), pickDefaultConnection() ]).then(function(results) {
    var lorebooks = results[0];
    var agents = results[1];
    var connectionId = results[2];
    progress("Installing ruleset...");
    lsSet(LS_RULESET, JSON.stringify(bundle.ruleset));
    mrrMarkDeliberateRulesetSwitch(bundle.ruleset.id);
    addToLibrary(bundle.ruleset);
    var existingLb = findManagedLorebook(lorebooks, rulesetId);
    var lbBody = {
      name: bundle.lorebook.name,
      description: bundle.lorebook.description || "",
      category: bundle.lorebook.category || "world",
      scanDepth: bundle.lorebook.scanDepth != null ? bundle.lorebook.scanDepth : 4,
      tokenBudget: bundle.lorebook.tokenBudget != null ? bundle.lorebook.tokenBudget : 1500,
      recursiveScanning: !!bundle.lorebook.recursiveScanning,
      entryLimit: mrrLorebookEntryLimit(bundle.lorebook.entries),
      tags: [ MRR_TAG_MANAGED, MRR_TAG_RS_PFX + rulesetId ]
    };
    var lbStep = existingLb ? (progress("Updating lorebook..."), apiFetch("/lorebooks/" + existingLb.id, {
      method: "PATCH",
      body: JSON.stringify(lbBody)
    }).then(function() {
      return existingLb.id;
    })) : (progress("Creating lorebook..."), apiFetch("/lorebooks", {
      method: "POST",
      body: JSON.stringify(lbBody)
    }).then(function(lb) {
      return lb && lb.id;
    }));
    return lbStep.then(function(lbId) {
      if (!lbId) throw new Error("Lorebook id missing after create/update.");
      progress("Clearing managed lorebook entries...");
      return apiFetch("/lorebooks/" + lbId + "/entries").then(function(existingEntries) {
        if (!Array.isArray(existingEntries)) existingEntries = [];
        var deleteChain = Promise.resolve();
        existingEntries.forEach(function(e) {
          if (!e || !e.id) return;
          deleteChain = deleteChain.then(function() {
            return apiDeleteRaw("/lorebooks/" + lbId + "/entries/" + e.id).catch(function() {});
          });
        });
        return deleteChain;
      }).then(function() {
        return lbId;
      });
    }).then(function(lbId) {
      progress("Installing " + bundle.lorebook.entries.length + " lorebook entries...");
      var entries = bundle.lorebook.entries;
      var addChain = Promise.resolve();
      entries.forEach(function(e, i) {
        addChain = addChain.then(function() {
          var copy = {};
          for (var k in e) if (Object.prototype.hasOwnProperty.call(e, k)) copy[k] = e[k];
          delete copy.tags;
          delete copy.tag;
          if (i % 5 === 0) progress("Entry " + (i + 1) + "/" + entries.length + "...");
          return apiFetch("/lorebooks/" + lbId + "/entries", {
            method: "POST",
            body: JSON.stringify(copy)
          });
        });
      });
      return addChain;
    }).then(function() {
      if (!bundle.gmAgent || typeof bundle.gmAgent !== "object") {
        progress("Skipping GM agent (not bundled).");
        return;
      }
      progress("Installing GM agent...");
      var existingAgent = mrrFindReplaceableAgent(agents, rulesetId, authorId, null);
      var ag = bundle.gmAgent;
      var promptTemplate = prefix + " " + (ag.promptTemplate || "");
      var body = {
        type: MRR_AGENT_TYPE,
        name: "MRR: " + (ag.name || rulesetId),
        description: ag.description || "",
        phase: ag.phase || "pre_generation",
        enabled: true,
        connectionId: mrrPreservedConnectionId(existingAgent, connectionId),
        promptTemplate,
        settings: mrrPreservedAgentSettings(existingAgent, ag.settings, {
          mrrManaged: true,
          mrrBundleSchema: BUNDLE_SCHEMA_ID,
          mrrRulesetId: rulesetId,
          mrrAuthorId: authorId
        })
      };
      var bodyForUpdate = Object.assign({}, body);
      delete bodyForUpdate.type;
      return existingAgent ? apiFetch("/agents/" + existingAgent.id, {
        method: "PATCH",
        body: JSON.stringify(bodyForUpdate)
      }) : apiFetch("/agents", {
        method: "POST",
        body: JSON.stringify(body)
      });
    }).then(function() {
      var subAgents = Array.isArray(bundle.additionalAgents) ? bundle.additionalAgents : [];
      if (subAgents.length === 0) return;
      progress("Installing " + subAgents.length + " additional agent(s)...");
      return subAgents.reduce(function(chain, ag) {
        return chain.then(function() {
          var role = ag.role;
          var existingSub = mrrFindReplaceableAgent(agents, rulesetId, authorId, role);
          var subPrefix = "[mrr-v1:" + authorId + "/" + rulesetId + ":" + role + "]";
          var subPromptTemplate = subPrefix + " " + (ag.promptTemplate || "");
          var subBody = {
            type: mrrAgentTypeForRole(role),
            name: "MRR: " + (ag.name || rulesetId + " " + role),
            description: ag.description || "",
            phase: ag.phase || "pre_generation",
            enabled: ag.enabled === true,
            connectionId: mrrPreservedConnectionId(existingSub, connectionId),
            promptTemplate: subPromptTemplate,
            settings: mrrPreservedAgentSettings(existingSub, ag.settings, {
              mrrManaged: true,
              mrrBundleSchema: BUNDLE_SCHEMA_ID,
              mrrRulesetId: rulesetId,
              mrrAuthorId: authorId,
              mrrAgentRole: role
            })
          };
          var subBodyForUpdate = Object.assign({}, subBody);
          delete subBodyForUpdate.enabled;
          delete subBodyForUpdate.type;
          return existingSub ? apiFetch("/agents/" + existingSub.id, {
            method: "PATCH",
            body: JSON.stringify(subBodyForUpdate)
          }) : apiFetch("/agents", {
            method: "POST",
            body: JSON.stringify(subBody)
          });
        });
      }, Promise.resolve());
    }).then(function() {
      var scripts = Array.isArray(bundle.regexScripts) ? bundle.regexScripts : [];
      if (scripts.length === 0) return Promise.resolve();
      var rulesetPrefix = MRR_REGEX_NAME_PFX + rulesetId + ": ";
      progress("Loading existing regex scripts...");
      return apiFetch("/regex-scripts", {}).then(function(existing) {
        var prior = Array.isArray(existing) ? existing.filter(function(s) {
          return s && typeof s.name === "string" && s.name.indexOf(rulesetPrefix) === 0;
        }) : [];
        var deleteChain = Promise.resolve();
        if (prior.length > 0) progress("Removing " + prior.length + " prior managed regex script(s)...");
        prior.forEach(function(s) {
          if (!s || !s.id) return;
          deleteChain = deleteChain.then(function() {
            return apiDeleteRaw("/regex-scripts/" + s.id).catch(function() {});
          });
        });
        return deleteChain;
      }).then(function() {
        progress("Installing " + scripts.length + " regex script(s)...");
        var addChain = Promise.resolve();
        scripts.forEach(function(s, i) {
          addChain = addChain.then(function() {
            if (i % 5 === 0) progress("Regex script " + (i + 1) + "/" + scripts.length + "...");
            var body = {
              name: rulesetPrefix + (s.name || "script-" + i),
              enabled: s.enabled !== false,
              findRegex: s.findRegex || "",
              replaceString: s.replaceString != null ? s.replaceString : "",
              trimStrings: Array.isArray(s.trimStrings) ? s.trimStrings : [],
              placement: Array.isArray(s.placement) && s.placement.length > 0 ? s.placement : [ "ai_output" ],
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
    }).then(function() {
      var tools = Array.isArray(bundle.customTools) ? bundle.customTools : [];
      if (tools.length === 0) return Promise.resolve();
      var rulesetIdSnake = String(rulesetId || "").toLowerCase().replace(/-/g, "_").replace(/[^a-z0-9_]/g, "_");
      var rulesetToolPrefix = MRR_TOOL_NAME_PFX + rulesetIdSnake + "_";
      progress("Loading existing custom tools...");
      return apiFetch("/custom-tools", {}).then(function(existing) {
        var prior = Array.isArray(existing) ? existing.filter(function(t) {
          return t && typeof t.name === "string" && t.name.indexOf(rulesetToolPrefix) === 0;
        }) : [];
        var deleteChain = Promise.resolve();
        if (prior.length > 0) progress("Removing " + prior.length + " prior managed custom tool(s)...");
        prior.forEach(function(t) {
          if (!t || !t.id) return;
          deleteChain = deleteChain.then(function() {
            return apiDeleteRaw("/custom-tools/" + t.id).catch(function() {});
          });
        });
        return deleteChain;
      }).then(function() {
        progress("Installing " + tools.length + " custom tool(s)...");
        var addChain = Promise.resolve();
        tools.forEach(function(t, i) {
          addChain = addChain.then(function() {
            if (i % 3 === 0) progress("Custom tool " + (i + 1) + "/" + tools.length + "...");
            var rawName = t.name && /^[a-z][a-z0-9_]*$/.test(t.name) ? t.name : "tool_" + i;
            var fullName = rulesetToolPrefix + rawName;
            if (fullName.length > 100) fullName = fullName.slice(0, 100);
            var body = {
              name: fullName,
              description: mrrCustomToolDescription(t.description, state.ruleset && state.ruleset.name ? state.ruleset.name : rulesetId),
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
    }).then(function() {
      var bundleRoles = (Array.isArray(bundle.additionalAgents) ? bundle.additionalAgents : []).map(function(a) {
        return a && a.role;
      }).filter(function(r) {
        return typeof r === "string" && r;
      });
      progress("Reconciling agent bindings...");
      return mrrReconcileAgentBindings({
        rulesetId,
        reason: "bundle install",
        force: true,
        bundleRoles,
        progressCb
      }).catch(function() {
        return null;
      });
    }).then(function() {
      progress("Done. Reloading...");
      return {
        rulesetId,
        authorId
      };
    });
  });
}

function apiDeleteRaw(path) {
  return mrrFetch("/api" + path, {
    method: "DELETE",
    headers: {
      "x-marinara-csrf": "1"
    }
  }).then(function(res) {
    if (res.status === 204 || res.ok || res.status === 404) return;
    return res.text().then(function(body) {
      var err = new Error("DELETE " + path + " failed: " + res.status + " " + (body || ""));
      err.status = res.status;
      throw err;
    });
  });
}

function apiPostRaw(path, body) {
  return mrrFetch("/api" + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-marinara-csrf": "1"
    },
    body: JSON.stringify(body)
  }).then(function(res) {
    if (res.ok) return res.json().catch(function() {
      return null;
    });
    return res.text().then(function(txt) {
      var err = new Error("POST " + path + " failed: " + res.status + " " + (txt || ""));
      err.status = res.status;
      throw err;
    });
  });
}

function uninstallBundleArtifacts(rulesetId, authorId, progressCb) {
  function progress(msg) {
    if (progressCb) progressCb(msg);
  }
  authorId = authorId || "local";
  return Promise.all([ apiFetch("/lorebooks", {}), apiFetch("/agents", {}), apiFetch("/regex-scripts", {}).catch(function() {
    return [];
  }), apiFetch("/custom-tools", {}).catch(function() {
    return [];
  }) ]).then(function(results) {
    var lorebooks = results[0];
    var agents = results[1];
    var regexScripts = results[2];
    var customTools = results[3];
    var lb = findManagedLorebook(lorebooks, rulesetId);
    var matches = Array.isArray(agents) ? agents.filter(function(a) {
      var s = parseAgentSettings(a);
      return s.mrrManaged === true && s.mrrRulesetId === rulesetId;
    }) : [];
    var rulesetRegexPrefix = MRR_REGEX_NAME_PFX + rulesetId + ": ";
    var regexMatches = Array.isArray(regexScripts) ? regexScripts.filter(function(s) {
      return s && typeof s.name === "string" && s.name.indexOf(rulesetRegexPrefix) === 0;
    }) : [];
    var rulesetIdSnake = String(rulesetId || "").toLowerCase().replace(/-/g, "_").replace(/[^a-z0-9_]/g, "_");
    var rulesetToolPrefix = MRR_TOOL_NAME_PFX + rulesetIdSnake + "_";
    var toolMatches = Array.isArray(customTools) ? customTools.filter(function(t) {
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
  }).then(function() {
    progress("Uninstalled.");
  });
}

function getChatId() {
  var stored = lsGet("marinara-active-chat-id");
  if (stored) return stored;
  var m = window.location.pathname.match(/\/(chat|game)\/([^/?#]+)/);
  if (m) return m[2];
  return null;
}

function sheetKey(chatId, characterId) {
  return LS_SHEET_PFX + chatId + "-" + characterId;
}

function characterKey(characterId) {
  return LS_CHARACTER_PFX + characterId;
}

var MRR_RECORD_RULESET_SEP = "@";

function mrrRecordKey(characterId, rulesetId) {
  return LS_CHARACTER_PFX + characterId + MRR_RECORD_RULESET_SEP + rulesetId;
}

function mrrActiveRulesetId() {
  return state.ruleset && typeof state.ruleset.id === "string" && state.ruleset.id ? state.ruleset.id : null;
}

function mrrResolveRecordRaw(characterId, rulesetId) {
  var rid = rulesetId || mrrActiveRulesetId();
  var out = {
    characterId: characterId || null,
    rulesetId: rid || null,
    key: null,
    raw: null,
    legacy: false
  };
  if (!characterId) return out;
  if (rid) {
    out.key = mrrRecordKey(characterId, rid);
    out.raw = lsGet(out.key);
    if (out.raw) return out;
  }
  var lk = characterKey(characterId);
  var lraw = lsGet(lk);
  if (lraw) {
    out.key = lk;
    out.raw = lraw;
    out.legacy = true;
    return out;
  }
  if (!out.key) out.key = lk;
  return out;
}

function mrrReadRecordRaw(characterId, rulesetId) {
  return mrrResolveRecordRaw(characterId, rulesetId).raw;
}

function mrrRecordExists(characterId, rulesetId) {
  return !!mrrReadRecordRaw(characterId, rulesetId);
}

function mrrWriteRecordKey(characterId, rulesetId) {
  var rid = rulesetId || mrrActiveRulesetId();
  return rid ? mrrRecordKey(characterId, rid) : characterKey(characterId);
}

function mrrCharacterLabel(characterId) {
  var list = state.characters;
  if (Array.isArray(list)) {
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === characterId && list[i].name) return list[i].name;
    }
  }
  return characterId;
}

var mrrRecordMigrationWarned = Object.create(null);

function mrrMigrateOneRecord(characterId, activeRulesetId) {
  if (!characterId || !activeRulesetId) return null;
  var legacyKey = characterKey(characterId);
  var legacyRaw = lsGet(legacyKey);
  if (!legacyRaw) return null;
  var parsed = safeParse(legacyRaw);
  var stamped = parsed && typeof parsed._rulesetId === "string" && parsed._rulesetId ? parsed._rulesetId : null;
  var destRulesetId = stamped || activeRulesetId;
  var destKey = mrrRecordKey(characterId, destRulesetId);
  if (lsGet(destKey)) {
    if (!mrrRecordMigrationWarned[destKey]) {
      mrrRecordMigrationWarned[destKey] = true;
      var amsg = "character " + mrrCharacterLabel(characterId) + " has BOTH a per-system record (" + destKey + ") and an older shared record (" + legacyKey + "). The per-system one is being used; the shared one is " + "left untouched rather than guessed at — export the character if you need to recover it.";
      if (typeof mrrPanelWarn === "function") mrrPanelWarn(amsg); else warn(amsg);
    }
    return null;
  }
  if (!lsSet(destKey, legacyRaw)) {
    warn("record migration: write failed for " + destKey + " (quota or private mode?) — legacy record left in place, nothing lost");
    return null;
  }
  if (lsGet(destKey) !== legacyRaw) {
    warn("record migration: read-back verification FAILED for " + destKey + " — legacy record left in place, nothing lost");
    return null;
  }
  lsDel(legacyKey);
  mrrClearSheetHold(characterId);
  log("record migration: " + legacyKey + " -> " + destKey + " (" + (stamped ? "record's own stamp '" + stamped + "'" : "unstamped, filed under the confirmed ruleset '" + activeRulesetId + "'") + ") bytes=" + legacyRaw.length + " — legacy key tombstoned through the storage adapter");
  return {
    id: characterId,
    rulesetId: destRulesetId,
    key: destKey,
    stamped: !!stamped
  };
}

function mrrMigrateRecordsForChat(activeRulesetId, why) {
  if (!activeRulesetId) return 0;
  if (!state.chatId || mrrRulesetConfirmedChatId !== state.chatId) return 0;
  var ids = [], seen = Object.create(null);
  if (Array.isArray(state.characters)) {
    state.characters.forEach(function(c) {
      if (c && c.id && !seen[c.id]) {
        seen[c.id] = true;
        ids.push(c.id);
      }
    });
  }
  if (state.activeCharacterId && !seen[state.activeCharacterId]) {
    seen[state.activeCharacterId] = true;
    ids.push(state.activeCharacterId);
  }
  if (!ids.length) return 0;
  var moved = [];
  ids.forEach(function(id) {
    var r = mrrMigrateOneRecord(id, activeRulesetId);
    if (r) moved.push(r);
  });
  if (!moved.length) return 0;
  var labels = moved.map(function(m) {
    return mrrCharacterLabel(m.id) + " → " + m.rulesetId;
  });
  var msg = "Migrated " + moved.length + " character record" + (moved.length === 1 ? "" : "s") + " to per-system storage — " + labels.join(", ");
  if (typeof mrrPanelWarn === "function") mrrPanelWarn(msg); else warn(msg);
  log("record migration: " + moved.length + " record(s) moved to per-ruleset keys (" + (why || "load") + ")");
  return moved.length;
}

function mrrNewBindingKey() {
  try {
    if (typeof crypto !== "undefined" && crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch (e) {}
  return "bind-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function mrrIsBindingKind(kind) {
  return kind === "character" || kind === "persona";
}

function mrrLoadBindings() {
  var raw = lsGet(MRR_BINDINGS_KEY);
  if (!raw) return [];
  var parsed = safeParse(raw);
  var list = parsed && Array.isArray(parsed.bindings) ? parsed.bindings : null;
  if (!list) return [];
  var out = [];
  list.forEach(function(b) {
    if (!b || typeof b !== "object") return;
    if (typeof b.engineId !== "string" || !b.engineId) return;
    if (typeof b.charId !== "string" || !b.charId) return;
    if (!mrrIsBindingKind(b.kind)) return;
    out.push({
      key: typeof b.key === "string" && b.key ? b.key : mrrNewBindingKey(),
      kind: b.kind,
      engineId: b.engineId,
      charId: b.charId,
      nameHint: typeof b.nameHint === "string" ? b.nameHint : ""
    });
  });
  return out;
}

function mrrSaveBindings(list) {
  return lsSet(MRR_BINDINGS_KEY, JSON.stringify({
    bindings: Array.isArray(list) ? list : []
  }));
}

function mrrBindingForCharId(charId) {
  if (!charId) return null;
  var list = mrrLoadBindings();
  for (var i = 0; i < list.length; i++) if (list[i].charId === charId) return list[i];
  return null;
}

function mrrBindingForEngineId(engineId) {
  if (!engineId) return null;
  var list = mrrLoadBindings();
  for (var i = 0; i < list.length; i++) if (list[i].engineId === engineId) return list[i];
  return null;
}

function mrrSetBinding(charId, kind, engineId, nameHint) {
  if (!charId || !engineId || !mrrIsBindingKind(kind)) return null;
  var list = mrrLoadBindings();
  var existingKey = null;
  var displaced = [];
  var kept = [];
  list.forEach(function(b) {
    if (b.charId === charId) {
      existingKey = b.key;
      if (b.engineId !== engineId) displaced.push(b);
      return;
    }
    if (b.engineId === engineId) {
      displaced.push(b);
      return;
    }
    kept.push(b);
  });
  var rec = {
    key: existingKey || mrrNewBindingKey(),
    kind,
    engineId,
    charId,
    nameHint: typeof nameHint === "string" && nameHint ? nameHint : mrrCharacterLabel(charId)
  };
  kept.push(rec);
  if (!mrrSaveBindings(kept)) {
    warn("binding: could not persist the binding registry (quota or private mode?) — " + mrrCharacterLabel(charId) + " is NOT bound; nothing else was changed");
    return null;
  }
  displaced.forEach(function(b) {
    if (b.charId === charId) {
      log("binding: re-bound " + rec.nameHint + " (" + charId + ") from " + b.kind + " " + b.engineId + " to " + kind + " " + engineId);
    } else {
      log("binding: " + kind + " " + engineId + " was already bound to " + (b.nameHint || b.charId) + " (" + b.charId + ") — one card carries one sheet, so the newest claim (" + rec.nameHint + ") wins and the older binding is dropped");
    }
  });
  if (!displaced.length) {
    log("binding: bound " + rec.nameHint + " (" + charId + ") to " + kind + " " + engineId);
  }
  return rec;
}

function mrrUnbindCharacter(charId) {
  if (!charId) return false;
  var list = mrrLoadBindings();
  var kept = list.filter(function(b) {
    return b.charId !== charId;
  });
  if (kept.length === list.length) return false;
  if (!mrrSaveBindings(kept)) {
    warn("binding: could not persist the binding registry while unbinding " + mrrCharacterLabel(charId) + " — the binding is still in place");
    return false;
  }
  log("binding: unbound " + mrrCharacterLabel(charId) + " (" + charId + ")");
  return true;
}

var MRR_PRESENT_CACHE_MAX = 8;

var mrrPresentSets = Object.create(null);

var mrrPresentSetOrder = [];

function mrrIsCardId(id) {
  return typeof id === "string" && !!id && id.indexOf("npc:") !== 0;
}

function mrrPresentSetSignature(e) {
  if (!e) return "";
  var ids = (Array.isArray(e.characterIds) ? e.characterIds.slice() : []).sort();
  return ids.join(",") + "|" + (e.gameGmCharacterId || "") + "|" + (e.personaId || "");
}

function mrrNoteChatRow(chatId, chat, source) {
  if (!chatId || !chat || typeof chat !== "object") return null;
  var hasCards = Array.isArray(chat.characterIds);
  var meta = mrrChatMeta(chat);
  var prev = mrrPresentSets[chatId] || null;
  if (Object.prototype.hasOwnProperty.call(chat, "connectionId")) {
    mrrChatConnectionIds[chatId] = typeof chat.connectionId === "string" && chat.connectionId ? chat.connectionId : null;
  }
  var entry = {
    characterIds: hasCards ? chat.characterIds.filter(mrrIsCardId) : prev ? prev.characterIds : [],
    gameGmCharacterId: mrrIsCardId(meta.gameGmCharacterId) ? meta.gameGmCharacterId : Object.prototype.hasOwnProperty.call(meta, "gameGmCharacterId") ? null : prev ? prev.gameGmCharacterId : null,
    personaId: typeof chat.personaId === "string" && chat.personaId ? chat.personaId : Object.prototype.hasOwnProperty.call(chat, "personaId") ? null : prev ? prev.personaId : null,
    complete: hasCards || !!(prev && prev.complete)
  };
  if (!prev) {
    mrrPresentSetOrder.push(chatId);
    while (mrrPresentSetOrder.length > MRR_PRESENT_CACHE_MAX) {
      var evict = mrrPresentSetOrder.shift();
      if (evict !== chatId) delete mrrPresentSets[evict];
    }
  }
  var changed = !!prev && mrrPresentSetSignature(prev) !== mrrPresentSetSignature(entry);
  mrrPresentSets[chatId] = entry;
  if (!prev || changed) {
    log("binding: present set for chat " + chatId + " — " + entry.characterIds.length + " card(s)" + (entry.gameGmCharacterId ? " + GM card " + entry.gameGmCharacterId : "") + (entry.personaId ? " + persona " + entry.personaId : "") + " (" + (source || "harvest") + ")");
  }
  if (changed) {
    log("binding: present set CHANGED for chat " + chatId + " — re-resolving and re-rendering (" + (source || "unspecified") + ")");
    if (mrrBindingResolveDoneChatId === chatId) mrrBindingResolveDoneChatId = null;
    mrrBindingLivenessDone[chatId] = false;
    if (mrrBindingResolveInFlightChatId === chatId) mrrBindingResolveDirtyChatId = chatId;
    if (state.chatId === chatId && state.mountEl && typeof renderSheet === "function") renderSheet();
  }
  mrrResolveBindings(chatId, changed ? "present set changed (" + (source || "unspecified") + ")" : "chat row harvested (" + (source || "unspecified") + ")");
  return entry;
}

function mrrPresentSetFor(chatId) {
  var e = chatId ? mrrPresentSets[chatId] : null;
  return e && e.complete ? e : null;
}

function mrrPresentCardIds(chatId) {
  var e = mrrPresentSetFor(chatId);
  if (!e) return [];
  var out = [], seen = Object.create(null);
  e.characterIds.forEach(function(id) {
    if (mrrIsCardId(id) && !seen[id]) {
      seen[id] = true;
      out.push(id);
    }
  });
  if (mrrIsCardId(e.gameGmCharacterId) && !seen[e.gameGmCharacterId]) out.push(e.gameGmCharacterId);
  return out;
}

var mrrBindingResolveDoneChatId = null;

var mrrBindingResolveInFlightChatId = null;

var mrrBindingResolveDirtyChatId = null;

var mrrBindingPresentFetchedChatId = null;

var mrrBindingLivenessDone = Object.create(null);

var mrrBindingLivenessWarned = false;

var mrrCardNames = Object.create(null);

var mrrCardDangling = Object.create(null);

function mrrResetBindingResolution() {
  mrrBindingResolveDoneChatId = null;
  mrrBindingResolveInFlightChatId = null;
  mrrBindingResolveDirtyChatId = null;
  mrrBindingPresentFetchedChatId = null;
  mrrBindPrompt = null;
  mrrBindPromptDismissed = false;
}

function mrrBindingRestorePending(chatId) {
  return !!chatId && mrrBindingResolveInFlightChatId === chatId;
}

function mrrBindingResolveRerunIfDirty(chatId) {
  if (!chatId || mrrBindingResolveDirtyChatId !== chatId) return;
  mrrBindingResolveDirtyChatId = null;
  mrrBindingResolveDoneChatId = null;
  mrrBindingLivenessDone[chatId] = false;
  log("binding: a present-set change for chat " + chatId + " landed while resolution was in flight — re-resolving now");
  mrrResolveBindings(chatId, "present set changed while resolution was in flight");
}

function mrrBindingRestoreCandidates(chatId) {
  var out = [];
  var e = mrrPresentSetFor(chatId);
  if (!e) return out;
  var roster = Array.isArray(state.characters) ? state.characters : [];
  function inRoster(id) {
    return roster.some(function(c) {
      return c && c.id === id;
    });
  }
  function consider(engineId, kind) {
    if (!engineId) return;
    var b = mrrBindingForEngineId(engineId);
    if (!b || b.kind !== kind) return;
    if (inRoster(b.charId)) return;
    if (!mrrRecordExists(b.charId)) return;
    out.push({
      engineId,
      kind,
      charId: b.charId,
      nameHint: b.nameHint
    });
  }
  mrrPresentCardIds(chatId).forEach(function(id) {
    consider(id, "character");
  });
  consider(e.personaId, "persona");
  return out;
}

function mrrBindingAlreadyPresentCount(chatId) {
  var e = mrrPresentSetFor(chatId);
  if (!e) return 0;
  var roster = Array.isArray(state.characters) ? state.characters : [];
  var n = 0, seen = Object.create(null);
  function consider(engineId, kind) {
    if (!engineId || seen[kind + ":" + engineId]) return;
    seen[kind + ":" + engineId] = true;
    var b = mrrBindingForEngineId(engineId);
    if (!b || b.kind !== kind) return;
    if (!roster.some(function(c) {
      return c && c.id === b.charId;
    })) return;
    n++;
  }
  mrrPresentCardIds(chatId).forEach(function(id) {
    consider(id, "character");
  });
  consider(e.personaId, "persona");
  return n;
}

function mrrResolveBindings(chatId, why) {
  if (!chatId) return;
  if (state.chatId !== chatId) return;
  if (!state.ruleset || !state.ruleset.id) return;
  if (mrrRulesetConfirmedChatId !== chatId) return;
  if (mrrChatUnboundVirginId === chatId) return;
  if (mrrBindingResolveDoneChatId === chatId) return;
  if (mrrBindingResolveInFlightChatId === chatId) return;
  var present = mrrPresentSetFor(chatId);
  if (!present) {
    if (mrrBindingPresentFetchedChatId === chatId) return;
    mrrBindingPresentFetchedChatId = chatId;
    log("binding: resolution for chat " + chatId + " is waiting on a chat row — issuing the one explicit read (" + (why || "unspecified") + ")");
    apiFetch("/chats/" + encodeURIComponent(chatId)).then(function(chat) {
      if (state.chatId !== chatId) return;
      mrrNoteChatRow(chatId, chat, "explicit read for binding resolution");
    }).catch(function(e) {
      warn("binding: could not read chat " + chatId + " to learn which cards are present (" + (e && e.message ? e.message : e) + ") — bound sheets are not restored for this visit");
    });
    return;
  }
  var cands = mrrBindingRestoreCandidates(chatId);
  var cardIds = mrrPresentCardIds(chatId);
  var needIdentity = !mrrBindingLivenessDone[chatId] && !!(cardIds.length || present.personaId);
  if (!cands.length && !needIdentity) {
    mrrBindingResolveDoneChatId = chatId;
    mrrApplyBindingRestores(chatId, [], why, false);
    return;
  }
  mrrBindingResolveInFlightChatId = chatId;
  var jobs = [];
  if (cardIds.length && !mrrBindingLivenessDone[chatId]) {
    jobs.push(apiFetch("/characters/summaries", {
      method: "POST",
      body: JSON.stringify({
        ids: cardIds
      })
    }).then(function(rows) {
      if (!Array.isArray(rows)) {
        if (!mrrBindingLivenessWarned) {
          mrrBindingLivenessWarned = true;
          warn("binding: the card-liveness check answered with something that is not a list — treating every present card " + "as live for this chat (a deleted card would show up as a sheet whose card is missing, which is recoverable)");
        }
        return;
      }
      var seen = Object.create(null);
      rows.forEach(function(r) {
        if (!r || typeof r.id !== "string") return;
        seen[r.id] = true;
        if (typeof r.name === "string" && r.name) mrrCardNames[r.id] = r.name;
      });
      cardIds.forEach(function(id) {
        if (!seen[id]) mrrCardDangling[id] = true;
      });
    }).catch(function(e) {
      if (!mrrBindingLivenessWarned) {
        mrrBindingLivenessWarned = true;
        warn("binding: the card-liveness check failed (" + (e && e.message ? e.message : e) + ") — treating every present card as live for this chat");
      }
    }));
  }
  if (present.personaId && !mrrBindingLivenessDone[chatId]) {
    jobs.push(apiFetch("/characters/personas/" + encodeURIComponent(present.personaId)).then(function(p) {
      if (p && typeof p.id === "string") {
        if (typeof p.name === "string" && p.name) mrrCardNames[p.id] = p.name;
      } else {
        mrrCardDangling[present.personaId] = true;
      }
    }).catch(function() {}));
  }
  Promise.all(jobs).then(function() {
    mrrBindingResolveInFlightChatId = null;
    mrrBindingLivenessDone[chatId] = true;
    if (state.chatId !== chatId) return;
    mrrBindingResolveDoneChatId = chatId;
    mrrApplyBindingRestores(chatId, cands, why, needIdentity);
    mrrBindingResolveRerunIfDirty(chatId);
  }).catch(function(e) {
    mrrBindingResolveInFlightChatId = null;
    mrrBindingResolveDoneChatId = chatId;
    warn("binding: resolution failed for chat " + chatId + " (" + (e && e.message ? e.message : e) + ")");
    if (typeof mrrRenderContinueOffer === "function") mrrRenderContinueOffer();
    mrrBindingResolveRerunIfDirty(chatId);
  });
}

function mrrApplyBindingRestores(chatId, cands, why, relabel) {
  var live = [], dangling = [];
  cands.forEach(function(c) {
    (mrrCardDangling[c.engineId] ? dangling : live).push(c);
  });
  dangling.forEach(function(c) {
    log("binding: NOT restoring " + (c.nameHint || c.charId) + " (" + c.charId + ") — the " + c.kind + " " + c.engineId + " it is bound to no longer exists on this server. The binding and the sheet are both KEPT; re-bind from the " + 'sheet\'s "Bound to" field, or accept the prompt if a replacement card is already in this chat.');
  });
  mrrArmRebindPrompt(chatId, dangling);
  var alreadyPresent = mrrBindingAlreadyPresentCount(chatId);
  var placeholder = typeof mrrRosterIsEmpty === "function" && mrrRosterIsEmpty();
  var adopted = live.length ? live[0] : null;
  if (!placeholder) adopted = null;
  if (live.length !== 1) adopted = null;
  if (adopted) {
    log("binding: restored " + (adopted.nameHint || adopted.charId) + " (" + adopted.charId + ") via " + adopted.kind + " " + adopted.engineId + " — activating it in place of this chat's untouched placeholder");
    mrrAdoptLastCharacter({
      id: adopted.charId,
      name: mrrBindingDisplayName(adopted)
    });
  }
  var appended = 0;
  if (!Array.isArray(state.characters)) state.characters = [];
  live.forEach(function(c) {
    if (adopted && c === adopted) return;
    if (state.characters.some(function(x) {
      return x && x.id === c.charId;
    })) return;
    state.characters.push({
      id: c.charId,
      name: mrrBindingDisplayName(c)
    });
    appended++;
    log("binding: restored " + (c.nameHint || c.charId) + " (" + c.charId + ") via " + c.kind + " " + c.engineId);
  });
  if (appended) saveCharacters();
  if (adopted && appended) {
    warn("binding: a restore batch both activated a character and appended " + appended + " more — the lone-restore rule has been weakened and this chat's panel may be showing a stale roster");
  }
  var restored = appended + (adopted && state.characters.some(function(x) {
    return x && x.id === adopted.charId;
  }) ? 1 : 0);
  if (live.length > 1 && placeholder) {
    log("binding: this chat's roster is still the untouched placeholder and " + live.length + " characters were restored — the placeholder stays active and untouched, because which of the " + live.length + " should be yours is not a judgement this extension gets to make. Pick one from the " + "character select.");
  }
  log("binding: resolution for chat " + chatId + " restored " + restored + " character(s), skipped " + dangling.length + " dangling, " + alreadyPresent + " already present (" + (why || "unspecified") + ")");
  if (typeof mrrRenderContinueOffer === "function") mrrRenderContinueOffer();
  if (!adopted && (appended || relabel) && typeof renderSheet === "function") renderSheet();
  mrrRenderBindPrompt();
}

function mrrBindingDisplayName(c) {
  var label = mrrCharacterLabel(c.charId);
  if (label && label !== c.charId) return label;
  return c.nameHint || mrrCardNames[c.engineId] || c.charId;
}

var mrrBindPrompt = null;

var mrrBindPromptEl = null;

var mrrBindPromptDismissed = false;

function mrrUnboundPresentCandidates(chatId) {
  var e = mrrPresentSetFor(chatId);
  if (!e) return [];
  var out = [];
  mrrPresentCardIds(chatId).forEach(function(id) {
    if (mrrCardDangling[id]) return;
    if (mrrBindingForEngineId(id)) return;
    out.push({
      engineId: id,
      kind: "character"
    });
  });
  if (e.personaId && !mrrCardDangling[e.personaId] && !mrrBindingForEngineId(e.personaId)) {
    out.push({
      engineId: e.personaId,
      kind: "persona"
    });
  }
  return out;
}

function mrrArmRebindPrompt(chatId, dangling) {
  if (mrrBindPrompt || !dangling || !dangling.length) return;
  var candidates = mrrUnboundPresentCandidates(chatId);
  if (!candidates.length) return;
  for (var i = 0; i < dangling.length; i++) {
    var d = dangling[i];
    if (!d.nameHint) continue;
    for (var j = 0; j < candidates.length; j++) {
      var name = mrrCardNames[candidates[j].engineId];
      if (!name || name !== d.nameHint) continue;
      mrrBindPrompt = {
        mode: "rebind",
        chatId,
        charId: d.charId,
        charName: d.nameHint,
        engineId: candidates[j].engineId,
        kind: candidates[j].kind,
        engineName: name
      };
      return;
    }
  }
}

function mrrArmAdoptBindPrompt(charId, charName) {
  if (!state.chatId || !charId) return;
  if (mrrBindingForCharId(charId)) return;
  var candidates = mrrUnboundPresentCandidates(state.chatId);
  if (candidates.length !== 1) return;
  var c = candidates[0];
  mrrBindPrompt = {
    mode: "adopt",
    chatId: state.chatId,
    charId,
    charName: charName || mrrCharacterLabel(charId),
    engineId: c.engineId,
    kind: c.kind,
    engineName: mrrCardNames[c.engineId] || c.engineId
  };
  mrrBindPromptDismissed = false;
  mrrRenderBindPrompt();
}

function mrrRenderBindPrompt() {
  if (mrrBindPromptEl && !mrrBindPromptEl.isConnected) mrrBindPromptEl = null;
  var p = mrrBindPrompt;
  var show = !!p && !mrrBindPromptDismissed && p.chatId === state.chatId;
  if (!show) {
    if (mrrBindPromptEl && mrrBindPromptEl.parentNode) mrrBindPromptEl.parentNode.removeChild(mrrBindPromptEl);
    mrrBindPromptEl = null;
    return;
  }
  if (!state.mountEl) return;
  if (mrrBindPromptEl && mrrBindPromptEl.parentNode) {
    if (mrrBindPromptEl.getAttribute("data-mrr-bind-engine-id") === p.engineId && mrrBindPromptEl.getAttribute("data-mrr-bind-char-id") === p.charId) return;
    mrrBindPromptEl.parentNode.removeChild(mrrBindPromptEl);
    mrrBindPromptEl = null;
  }
  var before = mrrWarnStripEl && mrrWarnStripEl.parentNode === state.mountEl ? mrrWarnStripEl.nextSibling : state.mountEl.firstChild;
  mrrBindPromptEl = marinara.addElement(state.mountEl, "div", {
    class: "mrr-bind-prompt",
    "data-mrr-bind-engine-id": p.engineId,
    "data-mrr-bind-char-id": p.charId
  });
  if (!mrrBindPromptEl) return;
  if (before) state.mountEl.insertBefore(mrrBindPromptEl, before);
  mrrBindPromptEl.style.display = "flex";
  mrrBindPromptEl.style.alignItems = "center";
  mrrBindPromptEl.style.gap = "8px";
  mrrBindPromptEl.style.width = "100%";
  mrrBindPromptEl.style.boxSizing = "border-box";
  mrrBindPromptEl.style.padding = "6px 10px";
  mrrBindPromptEl.style.marginBottom = "6px";
  mrrBindPromptEl.style.fontSize = "12px";
  mrrBindPromptEl.style.lineHeight = "1.3";
  mrrBindPromptEl.style.background = "var(--mrr-accent-soft)";
  mrrBindPromptEl.style.border = "1px solid var(--mrr-accent)";
  mrrBindPromptEl.style.borderRadius = "6px";
  var cardLabel = p.engineName || p.engineId;
  var text = p.mode === "rebind" ? "Re-bind " + p.charName + "'s sheet to the " + cardLabel + " " + p.kind + " in this chat?" : "Bind " + p.charName + "'s sheet to the " + cardLabel + " " + p.kind + " in this chat?";
  var textEl = marinara.addElement(mrrBindPromptEl, "span", {
    class: "mrr-bind-prompt__text",
    textContent: text
  });
  if (textEl) {
    textEl.style.flex = "1 1 auto";
    textEl.style.minWidth = "0";
    textEl.style.overflowWrap = "break-word";
  }
  var yes = marinara.addElement(mrrBindPromptEl, "button", {
    class: "mrr-char-btn mrr-bind-prompt__yes",
    type: "button",
    textContent: "Bind",
    title: "Bind this sheet to " + cardLabel + " so it follows that " + p.kind + " into every chat"
  });
  if (yes) marinara.on(yes, "click", function() {
    mrrSetBinding(p.charId, p.kind, p.engineId, p.charName);
    mrrBindPrompt = null;
    mrrRenderBindPrompt();
    mrrBindingResolveDoneChatId = null;
    mrrResolveBindings(state.chatId, "binding confirmed from the re-bind prompt");
    if (typeof renderSheet === "function") renderSheet();
  });
  var no = marinara.addElement(mrrBindPromptEl, "button", {
    class: "mrr-char-btn mrr-bind-prompt__no",
    type: "button",
    textContent: "Not now",
    title: "Dismiss for this session — nothing is saved"
  });
  if (no) marinara.on(no, "click", function() {
    mrrBindPromptDismissed = true;
    mrrRenderBindPrompt();
  });
  log("binding: " + p.mode + " prompt shown for " + p.charName + " -> " + p.kind + " " + p.engineId + " on chat " + state.chatId);
}

function mrrRenderBindingField(parent) {
  if (!parent || !state.activeCharacterId) return null;
  var chatId = state.chatId;
  var present = mrrPresentSetFor(chatId);
  var current = mrrBindingForCharId(state.activeCharacterId);
  if (!present && !current) return null;
  var item = marinara.addElement(parent, "div", {
    class: "mrr-identity__sub-item mrr-bind-field"
  });
  if (!item) return null;
  marinara.addElement(item, "span", {
    class: "mrr-identity__sub-label",
    textContent: "Bound to"
  });
  var select = marinara.addElement(item, "select", {
    class: "mrr-identity__sub-input mrr-bind-select"
  });
  if (!select) return null;
  var options = [ {
    value: "",
    label: "(unbound)"
  } ];
  var seen = Object.create(null);
  function addOpt(engineId, kind) {
    if (!engineId || seen[kind + ":" + engineId]) return;
    seen[kind + ":" + engineId] = true;
    var name = mrrCardNames[engineId] || engineId;
    options.push({
      value: kind + ":" + engineId,
      label: name + (kind === "persona" ? " (persona)" : " (card)") + (mrrCardDangling[engineId] ? " — missing" : "")
    });
  }
  mrrPresentCardIds(chatId).forEach(function(id) {
    addOpt(id, "character");
  });
  if (present && present.personaId) addOpt(present.personaId, "persona");
  if (current && !seen[current.kind + ":" + current.engineId]) {
    seen[current.kind + ":" + current.engineId] = true;
    options.push({
      value: current.kind + ":" + current.engineId,
      label: (mrrCardNames[current.engineId] || current.nameHint || current.engineId) + " (" + (current.kind === "persona" ? "persona" : "card") + ", not in this chat)"
    });
  }
  var currentValue = current ? current.kind + ":" + current.engineId : "";
  options.forEach(function(o) {
    var el = marinara.addElement(select, "option", {
      value: o.value,
      textContent: o.label
    });
    if (el && o.value === currentValue) el.selected = true;
  });
  marinara.on(select, "change", function() {
    var v = String(select.value || "");
    if (v === currentValue) return;
    if (!v) {
      mrrUnbindCharacter(state.activeCharacterId);
    } else {
      var sep = v.indexOf(":");
      var kind = v.slice(0, sep);
      var engineId = v.slice(sep + 1);
      var label = mrrCardNames[engineId] || mrrCharacterLabel(state.activeCharacterId);
      mrrSetBinding(state.activeCharacterId, kind, engineId, label);
    }
    mrrBindingResolveDoneChatId = null;
    mrrResolveBindings(state.chatId, "binding changed from the sheet's Bound-to field");
    if (typeof renderSheet === "function") renderSheet();
  });
  marinara.on(select, "click", function(e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  });
  return select;
}

var MRR_SHEET_SCHEMA_VERSION = 3;

var MRR_STATE_LABEL_ALIASES = {
  exalted3e: {
    "Anima Banner": {
      suppressed: "Dim",
      bonfire: "Bonfire/Iconic",
      iconic: "Bonfire/Iconic"
    }
  }
};

function mrrResolveStateLabel(rulesetId, stateDef, rawLabel) {
  if (rawLabel == null) return null;
  var raw = String(rawLabel).trim();
  if (!raw) return null;
  var declared = stateDef && Array.isArray(stateDef.values) ? stateDef.values : [];
  var norm = raw.toLowerCase();
  for (var i = 0; i < declared.length; i++) {
    var lbl = declared[i] && declared[i].label;
    if (typeof lbl === "string" && lbl.trim().toLowerCase() === norm) return lbl;
  }
  var byRuleset = rulesetId ? MRR_STATE_LABEL_ALIASES[rulesetId] : null;
  var byState = byRuleset && stateDef && typeof stateDef.name === "string" ? byRuleset[stateDef.name] : null;
  if (byState && Object.prototype.hasOwnProperty.call(byState, norm)) return byState[norm];
  return raw;
}

function mrrMigrateSheet(parsed, ruleset) {
  if (!parsed || typeof parsed !== "object" || !ruleset) return parsed;
  var stamp = typeof parsed._schemaVersion === "number" ? parsed._schemaVersion : 0;
  if (stamp < 2) {
    var hasLevelAttr = Array.isArray(ruleset.attributes) && ruleset.attributes.some(function(a) {
      return a && a.name === "Level";
    });
    var levelDerivedDef = (Array.isArray(ruleset.derivedStats) ? ruleset.derivedStats : []).filter(function(d) {
      return d && d.name === "Level";
    })[0];
    if (!hasLevelAttr && levelDerivedDef && parsed.attributes && typeof parsed.attributes === "object" && typeof parsed.attributes.Level === "number") {
      var levelDefault = typeof levelDerivedDef["default"] === "number" ? levelDerivedDef["default"] : 0;
      var hasExistingDerivedLevel = parsed.derived && typeof parsed.derived === "object" && typeof parsed.derived.Level === "number" && parsed.derived.Level !== levelDefault;
      if (!hasExistingDerivedLevel) {
        if (!parsed.derived || typeof parsed.derived !== "object") parsed.derived = {};
        parsed.derived.Level = parsed.attributes.Level;
      }
    }
    if (Array.isArray(ruleset.resources) && parsed.resources && typeof parsed.resources === "object") {
      ruleset.resources.forEach(function(r) {
        if (!r || typeof r.stateName !== "string" || !r.stateName) return;
        var stored = parsed.resources[r.id];
        if (!stored || typeof stored !== "object" || typeof stored.current !== "number") return;
        var derivedHasIt = parsed.derived && typeof parsed.derived === "object" && Object.prototype.hasOwnProperty.call(parsed.derived, r.stateName) && typeof parsed.derived[r.stateName] === "number";
        if (!derivedHasIt) {
          if (!parsed.derived || typeof parsed.derived !== "object") parsed.derived = {};
          parsed.derived[r.stateName] = stored.current;
        }
      });
    }
  }
  if (stamp < 3 && Array.isArray(ruleset.states) && parsed.states && typeof parsed.states === "object") {
    var rulesetIdForAlias = typeof ruleset.id === "string" ? ruleset.id : null;
    ruleset.states.forEach(function(st) {
      if (!st || typeof st.name !== "string") return;
      if (!Object.prototype.hasOwnProperty.call(parsed.states, st.name)) return;
      var stored = parsed.states[st.name];
      if (typeof stored !== "string" || !stored.trim()) return;
      var resolved = mrrResolveStateLabel(rulesetIdForAlias, st, stored);
      if (resolved != null && resolved !== stored) {
        log('sheet migration v3: state "' + st.name + '" label "' + stored + '" -> "' + resolved + '"');
        parsed.states[st.name] = resolved;
      }
    });
  }
  parsed._schemaVersion = MRR_SHEET_SCHEMA_VERSION;
  return parsed;
}

function mrrMigrateIfNeeded(parsed, ruleset) {
  if (!parsed || typeof parsed !== "object") return parsed;
  var stamp = parsed._schemaVersion;
  if (typeof stamp === "number" && stamp >= MRR_SHEET_SCHEMA_VERSION) return parsed;
  return mrrMigrateSheet(parsed, ruleset);
}

var MRR_AUTOSWITCH_GUARD_TTL_MS = 3e4;

var MRR_SWITCH_INTENT_TTL_MS = 3e4;

var mrrRulesetConfirmedChatId = null;

var mrrDeferredSaveWanted = false;

var mrrLatchWarnedReason = null;

var mrrStampCheckInFlightChatId = null;

var mrrStampHeldChatId = null;

var mrrStampWarnedChatId = null;

var mrrStampFetchWarnedChatId = null;

var mrrChatUnboundVirginId = null;

var mrrSheetHold = Object.create(null);

var mrrSheetHoldWarned = Object.create(null);

function mrrSheetWriteBlockReason() {
  if (state.chatId && mrrRulesetConfirmedChatId !== state.chatId) {
    if (mrrChatUnboundVirginId === state.chatId) {
      return {
        code: "unbound",
        msg: "chat " + state.chatId + " carries no ruleset stamp and none could be derived — it belongs to no ruleset, so nothing is written to it. " + "Activate a ruleset for this chat (Ruleset > Library) to bind it; edits made in the meantime are held in memory and replayed at that moment"
      };
    }
    return {
      code: "latch",
      msg: "chat " + state.chatId + " has not confirmed its ruleset yet (the chat-metadata check is in flight or failed) — refusing to write until it does"
    };
  }
  var held = state.activeCharacterId ? mrrSheetHold[state.activeCharacterId] : null;
  if (held) {
    return {
      code: "hold",
      msg: "character " + state.activeCharacterId + "'s stored sheet belongs to ruleset '" + held + "' but the active ruleset is '" + (state.ruleset && state.ruleset.id ? state.ruleset.id : "(none)") + "' — refusing to write (switch to '" + held + "' to edit this character)"
    };
  }
  return null;
}

function mrrConfirmChatRuleset(chatId, why) {
  if (!chatId) return;
  if (mrrRulesetConfirmedChatId === chatId) return;
  mrrRulesetConfirmedChatId = chatId;
  mrrStampHeldChatId = null;
  mrrChatUnboundVirginId = null;
  mrrLatchWarnedReason = null;
  mrrClearAutoswitchGuard();
  log("ruleset latch: chat " + chatId + " confirmed for ruleset " + (state.ruleset && state.ruleset.id ? state.ruleset.id : "(none)") + " — " + why);
  mrrMigrateRecordsForChat(state.ruleset && state.ruleset.id, "chat ruleset confirmed");
  mrrStampLastCharacter();
  if (mrrDeferredSaveWanted) {
    mrrDeferredSaveWanted = false;
    log("ruleset latch: replaying the save that was deferred while chat " + chatId + " was unconfirmed");
    flushSave();
  }
  if (typeof reconcileActiveAgents === "function") reconcileActiveAgents(true);
  if (typeof mrrReconcileAgentBindings === "function") mrrReconcileAgentBindings({
    reason: "chat ruleset confirmed"
  });
  if (typeof mrrResolveBindings === "function") mrrResolveBindings(chatId, "chat ruleset confirmed");
  if (typeof mrrRenderContinueOffer === "function") mrrRenderContinueOffer();
  if (typeof mrrCheckDiceToolCapability === "function") mrrCheckDiceToolCapability(chatId, "chat ruleset confirmed");
}

function mrrResetRulesetLatch() {
  mrrRulesetConfirmedChatId = null;
  mrrDeferredSaveWanted = false;
  mrrLatchWarnedReason = null;
  mrrStampCheckInFlightChatId = null;
  mrrStampHeldChatId = null;
  mrrStampWarnedChatId = null;
  mrrStampFetchWarnedChatId = null;
  mrrChatUnboundVirginId = null;
  mrrStampDeriveTriedChatId = null;
  mrrPresetWatchTs = 0;
  if (typeof mrrResetBindingResolution === "function") mrrResetBindingResolution();
}

function mrrReadAutoswitchGuard() {
  var raw = lsGet(LS_AUTOSWITCH_GUARD);
  if (!raw) return null;
  var g = safeParse(raw);
  if (!g || typeof g !== "object") return null;
  if (typeof g.ts !== "number" || Date.now() - g.ts > MRR_AUTOSWITCH_GUARD_TTL_MS) return null;
  return g;
}

function mrrWriteAutoswitchGuard(chatId, stamp) {
  lsSet(LS_AUTOSWITCH_GUARD, JSON.stringify({
    chatId,
    stamp,
    ts: Date.now()
  }));
}

function mrrClearAutoswitchGuard() {
  if (lsGet(LS_AUTOSWITCH_GUARD)) lsDel(LS_AUTOSWITCH_GUARD);
}

function mrrMarkDeliberateRulesetSwitch(rulesetId) {
  if (!rulesetId) return;
  lsSet(LS_SWITCH_INTENT, JSON.stringify({
    rulesetId,
    ts: Date.now()
  }));
}

function mrrConsumeDeliberateSwitchIntent(rulesetId) {
  var raw = lsGet(LS_SWITCH_INTENT);
  if (!raw) return false;
  lsDel(LS_SWITCH_INTENT);
  var it = safeParse(raw);
  if (!it || typeof it !== "object") return false;
  if (typeof it.ts !== "number" || Date.now() - it.ts > MRR_SWITCH_INTENT_TTL_MS) return false;
  return it.rulesetId === rulesetId;
}

function mrrStoredSheetForeignRuleset(parsed, ruleset) {
  var stored = parsed && parsed._rulesetId;
  if (typeof stored !== "string" || !stored) return null;
  var activeId = ruleset && ruleset.id;
  if (!activeId || stored === activeId) return null;
  return stored;
}

function mrrSheetRulesetHoldCheck(parsed, ruleset, characterId, migrationPending) {
  var stored = mrrStoredSheetForeignRuleset(parsed, ruleset);
  if (!stored) return null;
  var activeId = ruleset && ruleset.id;
  mrrSheetHold[characterId] = stored;
  if (mrrSheetHoldWarned[characterId] !== stored) {
    mrrSheetHoldWarned[characterId] = stored;
    if (migrationPending) {
      log("sheet for character " + characterId + " is a pre-per-system shared record saved under ruleset '" + stored + "', active is '" + activeId + "' — held untouched (no merge, no write) until this chat confirms its ruleset, " + "at which point it migrates to its own per-system key and this ruleset gets a fresh sheet");
    } else {
      warn("sheet for character " + characterId + " was saved under ruleset '" + stored + "', active is '" + activeId + "' — holding the stored sheet untouched to prevent cross-ruleset bleed " + "(no merge, no write; activate '" + stored + "' to edit this character)");
    }
  }
  return stored;
}

function mrrClearSheetHold(characterId) {
  if (!characterId) return;
  if (mrrSheetHold[characterId]) delete mrrSheetHold[characterId];
  if (mrrSheetHoldWarned[characterId]) delete mrrSheetHoldWarned[characterId];
}

function mrrHydrateSheetRecord(parsed, ruleset, characterId, migrationPending) {
  var held = mrrSheetRulesetHoldCheck(parsed, ruleset, characterId, migrationPending);
  if (held) return {
    held,
    sheet: blankSheet(ruleset)
  };
  mrrClearSheetHold(characterId);
  return {
    held: null,
    sheet: mergeSheet(blankSheet(ruleset), mrrMigrateIfNeeded(parsed, ruleset))
  };
}

function mrrLoadSheetRecordFor(characterId) {
  if (!characterId || !state.ruleset) return null;
  var res = mrrResolveRecordRaw(characterId, mrrActiveRulesetId());
  if (!res.raw) return null;
  var parsed = safeParse(res.raw);
  if (!parsed) {
    warn("party writes: the stored record for character " + characterId + " (" + res.key + ") did not parse — no write is routed to it");
    return null;
  }
  var hyd = mrrHydrateSheetRecord(parsed, state.ruleset, characterId, res.legacy);
  return hyd.held ? null : hyd.sheet;
}

function loadSheet(chatId, ruleset) {
  if (!state.activeCharacterId) {
    log("loadSheet -> blank: no activeCharacterId");
    return blankSheet(ruleset);
  }
  var rulesetId = ruleset && typeof ruleset.id === "string" && ruleset.id ? ruleset.id : null;
  if (rulesetId && state.chatId && mrrRulesetConfirmedChatId === state.chatId) {
    mrrMigrateRecordsForChat(rulesetId, "sheet load in chat " + state.chatId);
  }
  var res = mrrResolveRecordRaw(state.activeCharacterId, rulesetId);
  var key = res.key;
  var raw = res.raw;
  if (raw) {
    var parsed = safeParse(raw);
    if (parsed) {
      var hyd = mrrHydrateSheetRecord(parsed, ruleset, state.activeCharacterId, res.legacy);
      if (hyd.held) return hyd.sheet;
      log("loadSheet hydrated key=" + key + " bytes=" + raw.length + (res.legacy ? " (legacy shared record, read-only fallback)" : ""));
      return hyd.sheet;
    }
    warn("loadSheet -> blank: parse failed for " + key);
  }
  if (chatId) {
    var legacyKey = sheetKey(chatId, state.activeCharacterId);
    var legacyRaw = lsGet(legacyKey);
    if (legacyRaw) {
      var fwdKey = rulesetId && state.chatId && mrrRulesetConfirmedChatId === state.chatId ? mrrRecordKey(state.activeCharacterId, rulesetId) : characterKey(state.activeCharacterId);
      lsSet(fwdKey, legacyRaw);
      key = fwdKey;
      log("loadSheet auto-migrated " + legacyKey + " -> " + fwdKey + " bytes=" + legacyRaw.length);
      var legacyParsed = safeParse(legacyRaw);
      if (legacyParsed) {
        return mrrHydrateSheetRecord(legacyParsed, ruleset, state.activeCharacterId).sheet;
      }
      warn("loadSheet: migrated bytes but parse failed for " + legacyKey);
    }
  }
  log("loadSheet -> blank: no data for " + key);
  return blankSheet(ruleset);
}

function mrrDeepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!mrrDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  var aKeys = Object.keys(a);
  var bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (var k = 0; k < aKeys.length; k++) {
    var key = aKeys[k];
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!mrrDeepEqual(a[key], b[key])) return false;
  }
  return true;
}

var mrrSaveSheetGuardWarned = Object.create(null);

function mrrIsPristineBlankSheet(sheet, ruleset) {
  if (!sheet || typeof sheet !== "object" || !ruleset) return false;
  var candidate = Object.assign({}, sheet);
  delete candidate._schemaVersion;
  delete candidate._rulesetId;
  return mrrDeepEqual(candidate, blankSheet(ruleset));
}

function saveSheet(chatId, sheet) {
  if (!state.activeCharacterId) {
    warn("saveSheet skipped: no activeCharacterId");
    return;
  }
  if (!sheet) {
    warn("saveSheet skipped: no sheet object");
    return;
  }
  var writeBlock = mrrSheetWriteBlockReason();
  if (writeBlock) {
    if (writeBlock.code === "latch" || writeBlock.code === "unbound") {
      if (mrrBoundApplyCharId) {
        warn("saveSheet: a party-routed write for " + mrrCharacterLabel(mrrBoundApplyCharId) + " (" + mrrBoundApplyCharId + ") hit the '" + writeBlock.code + "' gate — DROPPED, not deferred. The deferred-replay flag is global and would " + "later fire under whoever is active then, writing this character's change onto someone else's sheet.");
      } else {
        mrrDeferredSaveWanted = true;
      }
    }
    var warnKey = (state.chatId || "-") + "|" + (state.activeCharacterId || "-") + "|" + writeBlock.code;
    if (mrrLatchWarnedReason !== warnKey) {
      mrrLatchWarnedReason = warnKey;
      warn("saveSheet deferred (" + writeBlock.code + "): " + writeBlock.msg);
    }
    return;
  }
  var key = mrrWriteRecordKey(state.activeCharacterId, mrrActiveRulesetId());
  if (state.ruleset && mrrIsPristineBlankSheet(sheet, state.ruleset)) {
    var existingRaw = mrrReadRecordRaw(state.activeCharacterId, mrrActiveRulesetId());
    if (existingRaw) {
      var existingParsed = safeParse(existingRaw);
      if (existingParsed && !mrrIsPristineBlankSheet(existingParsed, state.ruleset)) {
        if (!mrrSaveSheetGuardWarned[key]) {
          mrrSaveSheetGuardWarned[key] = true;
          warn("saveSheet: refusing to overwrite substantive stored sheet with a blank one — load may have failed (key=" + key + ")");
        }
        return;
      }
    }
  }
  sheet._schemaVersion = MRR_SHEET_SCHEMA_VERSION;
  if (state.ruleset && state.ruleset.id) sheet._rulesetId = state.ruleset.id;
  var payload = JSON.stringify(sheet);
  if (lsGet(key) !== payload) {
    var ok = lsSet(key, payload);
    if (!ok) {
      warn("saveSheet: lsSet failed for " + key + " (quota or private mode?)");
      return;
    }
    log("saved key=" + key + " bytes=" + payload.length);
  }
  updateSavedIndicator();
  if (typeof scheduleAutoSync === "function") scheduleAutoSync();
}

function updateSavedIndicator() {
  if (!state.mountEl) return;
  var ind = state.mountEl.querySelector(".mrr-saved-indicator");
  if (!ind) return;
  var now = new Date;
  var hh = String(now.getHours()).padStart(2, "0");
  var mm = String(now.getMinutes()).padStart(2, "0");
  var ss = String(now.getSeconds()).padStart(2, "0");
  ind.textContent = "Saved " + hh + ":" + mm + ":" + ss;
}

function flushSave() {
  if (state.chatId && state.activeCharacterId && state.sheet) {
    saveSheet(state.chatId, state.sheet);
  }
  if (hasServerStorage) mrrFlushPendingPatch();
}

function newCharacterId() {
  return "char-" + Date.now() + "-" + Math.random().toString(36).slice(2, 11);
}

var MRR_BOOTSTRAP_PLACEHOLDER_NAME = "Player";

function loadCharacters(chatId) {
  if (!chatId) return [ {
    id: newCharacterId(),
    name: MRR_BOOTSTRAP_PLACEHOLDER_NAME
  } ];
  var raw = lsGet("mrr-chars-" + chatId);
  if (raw) {
    var parsed = safeParse(raw);
    if (Array.isArray(parsed) && parsed.length) {
      var migrated = false;
      parsed.forEach(function(c) {
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
        var activePtr = lsGet("mrr-active-char-" + chatId);
        if (activePtr === "player" && parsed[0]) {
          lsSet("mrr-active-char-" + chatId, parsed[0].id);
        }
      }
      return parsed;
    }
  }
  var fresh = [ {
    id: newCharacterId(),
    name: MRR_BOOTSTRAP_PLACEHOLDER_NAME,
    _bootstrap: true
  } ];
  lsSet("mrr-chars-" + chatId, JSON.stringify(fresh));
  lsSet("mrr-active-char-" + chatId, fresh[0].id);
  log("bootstrapped fresh character " + fresh[0].id + " for chat " + chatId + " (persisted to localStorage immediately, flagged _bootstrap)");
  return fresh;
}

function saveCharacters() {
  if (!state.chatId) return;
  var key = "mrr-chars-" + state.chatId;
  var payload = JSON.stringify(state.characters);
  if (lsGet(key) === payload) return;
  lsSet(key, payload);
}

function mrrClearBootstrapFlag(why) {
  if (!state.chatId || !state.activeCharacterId) return;
  var list = state.characters;
  if (!Array.isArray(list)) return;
  var entry = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].id === state.activeCharacterId) {
      entry = list[i];
      break;
    }
  }
  if (!entry || entry._bootstrap !== true) return;
  delete entry._bootstrap;
  saveCharacters();
  log("B19: bootstrap flag cleared on " + entry.id + " — deliberate use (" + (why || "unspecified") + ")");
}

var MRR_SHEET_USE_ROOT_SELECTOR = ".mrr-sheet, .mrr-spellbook";

function mrrIsSheetUseTarget(node) {
  if (!node || typeof node.closest !== "function") return false;
  if (!node.closest(MRR_SHEET_USE_ROOT_SELECTOR)) return false;
  if (mrrContinueOfferEl && typeof mrrContinueOfferEl.contains === "function" && mrrContinueOfferEl.contains(node)) return false;
  if (mrrWarnStripEl && typeof mrrWarnStripEl.contains === "function" && mrrWarnStripEl.contains(node)) return false;
  if (typeof mrrBindPromptEl !== "undefined" && mrrBindPromptEl && typeof mrrBindPromptEl.contains === "function" && mrrBindPromptEl.contains(node)) return false;
  return true;
}

function mrrNoteSheetPanelUse(node, evt) {
  if (!mrrIsSheetUseTarget(node)) return;
  mrrClearBootstrapFlag((evt || "interaction") + " inside the sheet panel");
}

var mrrSheetUseWatchInstalled = false;

function mrrWatchSheetPanelUse() {
  if (mrrSheetUseWatchInstalled) return;
  if (typeof document === "undefined" || typeof document.addEventListener !== "function") return;
  mrrSheetUseWatchInstalled = true;
  [ "input", "change", "click" ].forEach(function(evt) {
    document.addEventListener(evt, function(e) {
      try {
        mrrNoteSheetPanelUse(e && e.target, evt);
      } catch (err) {}
    }, true);
  });
}

function loadActiveCharacterId(chatId, fallback) {
  if (!chatId) return fallback;
  return lsGet("mrr-active-char-" + chatId) || fallback;
}

function saveActiveCharacterId() {
  if (!state.chatId || !state.activeCharacterId) return;
  lsSet("mrr-active-char-" + state.chatId, state.activeCharacterId);
  mrrStampLastCharacter();
}

var mrrContinueOfferDismissed = false;

var mrrContinueOfferEl = null;

var mrrChatStampSeen = Object.create(null);

function mrrNoteChatStamp(chatId, rulesetId, source) {
  if (!chatId) return;
  if (typeof rulesetId !== "string" || !rulesetId) return;
  var changed = mrrChatStampSeen[chatId] !== rulesetId;
  mrrChatStampSeen[chatId] = rulesetId;
  if (changed) log("B19: chat " + chatId + " now known bound to " + rulesetId + " (" + (source || "unspecified") + ")");
  mrrRenderContinueOffer();
}

function mrrLastCharKey(rulesetId) {
  return MRR_LAST_CHAR_PFX + rulesetId;
}

function mrrStampBlockedByForeignSheet(characterId) {
  if (!characterId || !state.ruleset || !state.ruleset.id) return false;
  var raw = mrrReadRecordRaw(characterId);
  if (!raw) return false;
  var parsed = safeParse(raw);
  if (!parsed) return false;
  var other = mrrStoredSheetForeignRuleset(parsed, state.ruleset);
  if (!other) return false;
  log("B19: not stamping " + characterId + " for " + state.ruleset.id + " — its sheet belongs to " + other);
  return true;
}

function mrrStampBlockedByLegacyPlaceholder(characterId) {
  var list = state.characters;
  if (!Array.isArray(list) || list.length !== 1) return false;
  var entry = list[0];
  if (!entry || entry.id !== characterId) return false;
  if (entry._bootstrap === true) return false;
  if (entry.name !== MRR_BOOTSTRAP_PLACEHOLDER_NAME) return false;
  log("B19: not stamping " + characterId + " — roster is an unflagged bootstrap-shaped placeholder (legacy chat)");
  return true;
}

function mrrStampLastCharacter() {
  if (!state.ruleset || !state.ruleset.id || !state.activeCharacterId) return;
  if (state.chatId && mrrRulesetConfirmedChatId !== state.chatId) return;
  if (mrrRosterIsEmpty()) return;
  var activeId = state.activeCharacterId;
  if (mrrStampBlockedByForeignSheet(activeId)) return;
  if (mrrStampBlockedByLegacyPlaceholder(activeId)) return;
  var entry = state.characters.find(function(c) {
    return c && c.id === activeId;
  });
  var name = entry && entry.name ? entry.name : activeId;
  lsSet(mrrLastCharKey(state.ruleset.id), JSON.stringify({
    id: activeId,
    name
  }));
  log("B19: last-character pointer stamped -> " + name + " (" + activeId + ") for ruleset " + state.ruleset.id);
}

function mrrReadLastCharacter(rulesetId) {
  if (!rulesetId) return null;
  var raw = lsGet(mrrLastCharKey(rulesetId));
  if (!raw) return null;
  var rec = safeParse(raw);
  if (!rec || typeof rec !== "object" || typeof rec.id !== "string" || !rec.id) return null;
  return {
    id: rec.id,
    name: typeof rec.name === "string" && rec.name ? rec.name : rec.id
  };
}

function mrrRosterIsEmpty() {
  var list = state.characters;
  if (!Array.isArray(list) || !list.length) return true;
  if (list.length !== 1 || !list[0] || !list[0].id) return false;
  if (list[0]._bootstrap === true) return true;
  return !mrrRecordExists(list[0].id);
}

function mrrContinueOfferCandidate() {
  if (mrrContinueOfferDismissed) return null;
  if (!state.chatId) return null;
  if (!state.ruleset || !state.ruleset.id) return null;
  if (mrrChatStampSeen[state.chatId] !== state.ruleset.id) return null;
  if (typeof mrrBindingRestorePending === "function" && mrrBindingRestorePending(state.chatId)) return null;
  if (!mrrRosterIsEmpty()) return null;
  var rec = mrrReadLastCharacter(state.ruleset.id);
  if (!rec) return null;
  if (state.characters.some(function(c) {
    return c && c.id === rec.id;
  })) return null;
  if (!mrrRecordExists(rec.id)) return null;
  return rec;
}

function mrrRenderContinueOffer() {
  if (mrrContinueOfferEl && !mrrContinueOfferEl.isConnected) mrrContinueOfferEl = null;
  var rec = mrrContinueOfferCandidate();
  if (!rec) {
    if (mrrContinueOfferEl && mrrContinueOfferEl.parentNode) mrrContinueOfferEl.parentNode.removeChild(mrrContinueOfferEl);
    mrrContinueOfferEl = null;
    return;
  }
  if (!state.mountEl) return;
  if (mrrContinueOfferEl && mrrContinueOfferEl.parentNode) {
    if (mrrContinueOfferEl.getAttribute("data-mrr-char-id") === rec.id) return;
    mrrContinueOfferEl.parentNode.removeChild(mrrContinueOfferEl);
    mrrContinueOfferEl = null;
  }
  var before = mrrWarnStripEl && mrrWarnStripEl.parentNode === state.mountEl ? mrrWarnStripEl.nextSibling : state.mountEl.firstChild;
  mrrContinueOfferEl = marinara.addElement(state.mountEl, "div", {
    class: "mrr-continue-offer",
    "data-mrr-char-id": rec.id
  });
  if (!mrrContinueOfferEl) return;
  if (before) state.mountEl.insertBefore(mrrContinueOfferEl, before);
  mrrContinueOfferEl.style.display = "flex";
  mrrContinueOfferEl.style.alignItems = "center";
  mrrContinueOfferEl.style.gap = "8px";
  mrrContinueOfferEl.style.width = "100%";
  mrrContinueOfferEl.style.boxSizing = "border-box";
  mrrContinueOfferEl.style.padding = "6px 10px";
  mrrContinueOfferEl.style.marginBottom = "6px";
  mrrContinueOfferEl.style.fontSize = "12px";
  mrrContinueOfferEl.style.lineHeight = "1.3";
  mrrContinueOfferEl.style.background = "var(--mrr-accent-soft)";
  mrrContinueOfferEl.style.border = "1px solid var(--mrr-accent)";
  mrrContinueOfferEl.style.borderRadius = "6px";
  var textEl = marinara.addElement(mrrContinueOfferEl, "span", {
    class: "mrr-continue-offer__text",
    textContent: "No character in this chat yet."
  });
  if (textEl) {
    textEl.style.flex = "1 1 auto";
    textEl.style.minWidth = "0";
    textEl.style.overflowWrap = "break-word";
  }
  var yes = marinara.addElement(mrrContinueOfferEl, "button", {
    class: "mrr-char-btn mrr-continue-offer__yes",
    type: "button",
    textContent: "Continue as " + rec.name,
    title: "Add " + rec.name + " to this chat and make them the active character"
  });
  if (yes) marinara.on(yes, "click", function() {
    mrrAdoptLastCharacter(rec);
  });
  var no = marinara.addElement(mrrContinueOfferEl, "button", {
    class: "mrr-char-btn mrr-continue-offer__no",
    type: "button",
    textContent: "Not now",
    title: "Dismiss for this session — nothing is saved"
  });
  if (no) {
    marinara.on(no, "click", function() {
      mrrContinueOfferDismissed = true;
      mrrRenderContinueOffer();
    });
  }
  log("B19: continue-as offer shown for " + rec.name + " (" + rec.id + ") on chat " + state.chatId);
}

function mrrAdoptLastCharacter(rec) {
  if (!rec || !rec.id || !state.chatId) return;
  if (!mrrRecordExists(rec.id)) {
    mrrRenderContinueOffer();
    return;
  }
  if (!state.characters.some(function(c) {
    return c && c.id === rec.id;
  })) {
    if (mrrRosterIsEmpty()) {
      state.characters.forEach(function(c) {
        if (!c || !c.id) return;
        var phRes = mrrResolveRecordRaw(c.id);
        var phRaw = phRes.raw;
        if (!phRaw) return;
        var phParsed = safeParse(phRaw);
        if (!phParsed || !state.ruleset || !mrrIsPristineBlankSheet(phParsed, state.ruleset)) {
          log("B19 continuity: LEFT placeholder " + c.id + "'s sheet record in the library — it is no longer a " + "pristine blank sheet (a ruleset normalizer touched it), so deleting it is not safe on the " + "_bootstrap flag alone; only the roster entry is dropped");
          return;
        }
        lsDel(phRes.key);
        log("B19 continuity: deleted the pristine bootstrap sheet record for placeholder " + c.id + " at " + phRes.key + " (tombstoned through the storage adapter) — adopting must not leave an orphan in the library");
      });
      state.characters = [];
    }
    state.characters.push({
      id: rec.id,
      name: rec.name
    });
  }
  saveCharacters();
  mrrContinueOfferDismissed = true;
  state.sheet = null;
  switchCharacter(rec.id);
  log("B19 continuity: adopted '" + rec.name + "' (" + rec.id + ") into chat " + state.chatId + " for ruleset " + (state.ruleset && state.ruleset.id ? state.ruleset.id : "(none)"));
  if (typeof mrrArmAdoptBindPrompt === "function") mrrArmAdoptBindPrompt(rec.id, rec.name);
}

function migrateLegacySheet(chatId) {
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
  return s || "char-" + Date.now();
}

function collectBundle() {
  flushSave();
  var sheets = {};
  state.characters.forEach(function(c) {
    var raw = mrrReadRecordRaw(c.id);
    if (!raw && state.chatId) raw = lsGet(sheetKey(state.chatId, c.id));
    if (raw) {
      var parsed = safeParse(raw);
      if (parsed) sheets[c.id] = parsed;
    }
  });
  return {
    schema: BUNDLE_SCHEMA,
    version: BUNDLE_VERSION,
    savedAt: (new Date).toISOString(),
    ruleset: {
      id: state.ruleset.id,
      version: state.ruleset.version
    },
    activeCharacterId: state.activeCharacterId,
    characters: state.characters.map(function(c) {
      return {
        id: c.id,
        name: c.name
      };
    }),
    sheets
  };
}

function validateBundle(b) {
  if (!b || typeof b !== "object") return "bundle is not an object";
  if (BUNDLE_SCHEMA_ACCEPT.indexOf(b.schema) === -1) return 'schema mismatch: expected "' + BUNDLE_SCHEMA + '" (legacy "mrrp-character-bundle" also accepted)';
  if (typeof b.version !== "number") return "missing version";
  if (b.version > BUNDLE_VERSION) return "bundle version " + b.version + " is newer than this extension supports";
  if (!b.ruleset || !b.ruleset.id) return "missing ruleset.id";
  if (!Array.isArray(b.characters) || !b.characters.length) return "characters must be a non-empty array";
  if (!b.sheets || typeof b.sheets !== "object") return "sheets must be an object";
  for (var i = 0; i < b.characters.length; i++) {
    var c = b.characters[i];
    if (!c || !c.id || !c.name) return "character " + i + " missing id or name";
    if (String(c.id).indexOf(MRR_RECORD_RULESET_SEP) !== -1) {
      return "character " + i + ' has an id containing "' + MRR_RECORD_RULESET_SEP + '" (' + c.id + "), which is reserved as the per-system record separator";
    }
  }
  return null;
}

function applyBundle(b) {
  if (!state.chatId) {
    window.alert("No active chat. Open a chat in Marinara first, then import.");
    return false;
  }
  var err = validateBundle(b);
  if (err) {
    window.alert("Import failed: " + err);
    return false;
  }
  if (b.ruleset.id !== state.ruleset.id) {
    window.alert('Import failed: bundle was saved for ruleset "' + b.ruleset.id + '" but the active ruleset is "' + state.ruleset.id + '". Switch ruleset first, then import again.');
    return false;
  }
  state.characters.forEach(function(c) {
    lsDel(mrrWriteRecordKey(c.id));
    lsDel(characterKey(c.id));
    if (state.chatId) lsDel(sheetKey(state.chatId, c.id));
  });
  state.characters = b.characters.map(function(c) {
    return {
      id: c.id,
      name: c.name
    };
  });
  saveCharacters();
  b.characters.forEach(function(c) {
    var sheet = b.sheets && b.sheets[c.id];
    if (sheet) lsSet(mrrWriteRecordKey(c.id), JSON.stringify(sheet));
  });
  var nextActive = b.activeCharacterId;
  if (!nextActive || !state.characters.some(function(c) {
    return c.id === nextActive;
  })) {
    nextActive = state.characters[0].id;
  }
  state.activeCharacterId = nextActive;
  mrrClearBootstrapFlag("character bundle imported");
  saveActiveCharacterId();
  state.sheet = loadSheet(state.chatId, state.ruleset);
  renderSheet();
  log("imported bundle: " + state.characters.length + " character(s), active=" + state.activeCharacterId);
  return true;
}

function importFromRpExtension() {
  if (!state.chatId) {
    window.alert("No active chat. Open a chat in Marinara first, then import.");
    return false;
  }
  if (!state.ruleset || !state.ruleset.id) {
    window.alert("Select a ruleset first, then import.");
    return false;
  }
  var rpRulesetRaw = lsGet(RP_LEGACY_ACTIVE_RULESET);
  if (rpRulesetRaw) {
    var rpRs = safeParse(rpRulesetRaw);
    var rpId = rpRs && (rpRs.id || rpRs.ruleset && rpRs.ruleset.id);
    if (rpId && rpId !== state.ruleset.id) {
      var go = window.confirm("The RP-mode extension's active ruleset was \"" + rpId + '" but the current ruleset is "' + state.ruleset.id + "\". Import anyway? Sheet fields that don't match this ruleset may not display.");
      if (!go) return false;
    }
  }
  var names = Object.create(null);
  var sheets = Object.create(null);
  forEachLocalStorageKey(RP_LEGACY_CHARS_PFX, function(key) {
    var roster = safeParse(lsGet(key));
    if (Array.isArray(roster)) roster.forEach(function(c) {
      if (c && c.id) names[c.id] = c.name || names[c.id];
    });
  });
  forEachLocalStorageKey(RP_LEGACY_CHARACTER_PFX, function(key) {
    var id = key.slice(RP_LEGACY_CHARACTER_PFX.length);
    var sheet = safeParse(lsGet(key));
    if (id && sheet) sheets[id] = sheet;
  });
  var ids = Object.keys(sheets);
  if (!ids.length) {
    window.alert("No RP-mode (mrrp-) character sheets found in this browser's storage.");
    return false;
  }
  var existing = Object.create(null);
  state.characters.forEach(function(c) {
    existing[c.id] = true;
  });
  var imported = 0, skipped = 0;
  ids.forEach(function(cid) {
    if (mrrRecordExists(cid)) {
      skipped++;
      return;
    }
    var nm = names[cid] || sheets[cid] && (sheets[cid].name || sheets[cid].characterName) || "Imported " + cid.slice(0, 8);
    if (!existing[cid]) {
      state.characters.push({
        id: cid,
        name: nm
      });
      existing[cid] = true;
    }
    lsSet(mrrWriteRecordKey(cid), JSON.stringify(sheets[cid]));
    imported++;
  });
  if (imported) saveCharacters();
  if (!state.activeCharacterId || !state.characters.some(function(c) {
    return c.id === state.activeCharacterId;
  })) {
    if (state.characters.length) {
      state.activeCharacterId = state.characters[0].id;
      saveActiveCharacterId();
    }
  }
  state.sheet = loadSheet(state.chatId, state.ruleset);
  renderSheet();
  var summary = "Imported " + imported + " character sheet(s) from the RP-mode extension" + (skipped ? " (" + skipped + " skipped — already present)" : "") + ".";
  log(summary);
  window.alert(summary);
  return true;
}

function listManagedAgentsByRuleset() {
  return apiFetch("/agents").then(function(agents) {
    var groups = {};
    if (!Array.isArray(agents)) return groups;
    agents.forEach(function(a) {
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
  function progress(msg) {
    if (progressCb) progressCb(msg);
  }
  if (!Array.isArray(ids) || !ids.length) return Promise.resolve(0);
  progress("Deleting " + ids.length + " agent(s)...");
  return ids.reduce(function(chain, id) {
    return chain.then(function() {
      return apiDeleteRaw("/agents/" + id);
    });
  }, Promise.resolve()).then(function() {
    if (typeof mrrInvalidateSheetSyncMemo === "function") mrrInvalidateSheetSyncMemo("managed agents deleted");
    return ids.length;
  });
}

function mrrInjectableManagedAgents(agents, rulesetId) {
  var out = [];
  var list = Array.isArray(agents) ? agents : [];
  for (var i = 0; i < list.length; i++) {
    var a = list[i];
    var s = parseAgentSettings(a);
    if (!s || s.mrrManaged !== true || s.mrrRulesetId !== rulesetId) continue;
    if (s.injectAsSection !== true) continue;
    if (s.resultType !== "context_injection") continue;
    if (a.phase !== "pre_generation") continue;
    if (typeof a.type !== "string" || !a.type) continue;
    out.push({
      type: a.type,
      name: a.name || a.type
    });
  }
  var seen = Object.create(null);
  return out.filter(function(x) {
    if (seen[x.type]) return false;
    seen[x.type] = true;
    return true;
  });
}

function mrrExistingAgentSectionTypes(sections) {
  var types = Object.create(null);
  var list = Array.isArray(sections) ? sections : [];
  for (var i = 0; i < list.length; i++) {
    var sec = list[i];
    if (!sec || !sec.markerConfig) continue;
    var mc = sec.markerConfig;
    if (typeof mc === "string") mc = safeParse(mc);
    if (!mc || typeof mc !== "object") continue;
    if (mc.type !== "agent_data") continue;
    if (typeof mc.agentType === "string" && mc.agentType) types[mc.agentType] = true;
  }
  return types;
}

function mrrBuildAgentSectionBody(agentType, agentName) {
  return {
    identifier: "agent_" + agentType,
    name: (agentName || agentType) + " (Agent)",
    content: "{{agent::" + agentType + "}}",
    role: "system",
    isMarker: true,
    markerConfig: {
      type: "agent_data",
      agentType
    }
  };
}

function mrrResolveActivePreset(chatId) {
  return apiFetch("/chats/" + encodeURIComponent(chatId)).then(function(chat) {
    var presetId = chat && chat.promptPresetId;
    if (presetId) return {
      presetId,
      boundNow: false
    };
    return apiFetch("/prompts/default").then(function(def) {
      if (!def || !def.id) {
        throw new Error("This chat has no prompt preset and no default preset exists. Open the chat's settings and pick a preset first — without one, Marinara uses no preset sections at all and agent output cannot be placed.");
      }
      return {
        presetId: def.id,
        boundNow: true
      };
    });
  });
}

function mrrAddAgentSectionsToActivePreset(confirmFn, progressCb) {
  function progress(m) {
    if (progressCb) progressCb(m);
  }
  var chatId = state.chatId;
  if (!chatId) return Promise.reject(new Error("No active chat — open a chat first."));
  if (!state.ruleset || !state.ruleset.id) return Promise.reject(new Error("No active ruleset — activate a ruleset first."));
  var rulesetId = state.ruleset.id;
  progress("Resolving the active preset...");
  return Promise.all([ mrrResolveActivePreset(chatId), apiFetch("/agents") ]).then(function(r) {
    var resolved = r[0];
    var injectable = mrrInjectableManagedAgents(r[1], rulesetId);
    if (!injectable.length) {
      throw new Error("No injectable agents found for ruleset '" + rulesetId + "'. Re-install the ruleset bundle so its agents carry the injection settings this needs.");
    }
    progress("Reading preset...");
    return apiFetch("/prompts/" + encodeURIComponent(resolved.presetId) + "/full").then(function(full) {
      var preset = full && full.preset || {};
      var presetName = preset.name || resolved.presetId;
      var have = mrrExistingAgentSectionTypes(full && full.sections);
      var missing = injectable.filter(function(a) {
        return !have[a.type];
      });
      if (!missing.length) {
        return 'Preset "' + presetName + '" already has agent sections for all ' + injectable.length + " injectable agent(s). Nothing to do.";
      }
      var names = missing.map(function(m) {
        return "  • " + m.name + "  (" + m.type + ")";
      }).join("\n");
      var prompt = 'This will modify preset "' + presetName + '".\n\n' + "Adding " + missing.length + " agent section(s):\n" + names + "\n\n" + (resolved.boundNow ? "This chat has no preset selected, so the DEFAULT preset will also be attached to it.\n\n" : "") + "Without these sections Marinara silently discards these agents' output on engine 2.4.0+. Continue?";
      var ok = confirmFn ? confirmFn(prompt) : window.confirm(prompt);
      if (!ok) return "Cancelled — no changes made.";
      var chain = Promise.resolve();
      if (resolved.boundNow) {
        chain = chain.then(function() {
          progress("Attaching the default preset to this chat...");
          return apiFetch("/chats/" + encodeURIComponent(chatId), {
            method: "PATCH",
            body: JSON.stringify({
              promptPresetId: resolved.presetId
            })
          });
        });
      }
      var added = 0;
      return missing.reduce(function(c, m) {
        return c.then(function() {
          progress("Adding section for " + m.name + "...");
          return apiPostRaw("/prompts/" + encodeURIComponent(resolved.presetId) + "/sections", mrrBuildAgentSectionBody(m.type, m.name)).then(function() {
            added++;
          });
        });
      }, chain).then(function() {
        return "Added " + added + ' agent section(s) to preset "' + presetName + '"' + (resolved.boundNow ? " and attached it to this chat" : "") + ".";
      });
    });
  }).catch(function(e) {
    if (e && e.status === 409) {
      throw new Error('Preset is read-only. The stock "Marinara Universal" preset cannot be modified — open it in the Preset Editor and use "Save as copy" to create an editable preset, select that for this chat, then run this again.');
    }
    throw e;
  });
}

function mrrStaleAgentSectionsInPreset(sections, agents) {
  var live = mrrLiveAgentTypes(agents);
  var out = [];
  var list = Array.isArray(sections) ? sections : [];
  for (var i = 0; i < list.length; i++) {
    var sec = list[i];
    if (!sec || !sec.id) continue;
    if (!sec.markerConfig) continue;
    var mc = sec.markerConfig;
    if (typeof mc === "string") mc = safeParse(mc);
    if (!mc || typeof mc !== "object" || mc.type !== "agent_data") continue;
    var t = mc.agentType;
    if (typeof t !== "string" || !t) continue;
    if (t.indexOf(MRR_AGENT_TYPE) !== 0) continue;
    if (live[t]) continue;
    out.push({
      id: sec.id,
      name: sec.name || sec.id,
      type: t
    });
  }
  return out;
}

function mrrRemoveStaleAgentSectionsFromActivePreset(confirmFn, progressCb) {
  function progress(m) {
    if (progressCb) progressCb(m);
  }
  var chatId = state.chatId;
  if (!chatId) return Promise.reject(new Error("No active chat — open a chat first."));
  progress("Resolving the active preset...");
  return apiFetch("/chats/" + encodeURIComponent(chatId)).then(function(chat) {
    var presetId = chat && chat.promptPresetId;
    if (!presetId) {
      return "This chat has no prompt preset, so there are no agent marker sections to clean up.";
    }
    progress("Reading preset...");
    return Promise.all([ apiFetch("/prompts/" + encodeURIComponent(presetId) + "/full"), apiFetch("/agents") ]).then(function(r) {
      var full = r[0];
      var sections = full && Array.isArray(full.sections) ? full.sections : [];
      var presetName = full && full.preset && full.preset.name || presetId;
      var stale = mrrStaleAgentSectionsInPreset(sections, r[1]);
      if (!stale.length) {
        return 'Preset "' + presetName + '" has no stale MRR agent sections. Nothing to do.';
      }
      var names = stale.map(function(s) {
        return "  • " + s.name + "  (" + s.type + ")";
      }).join("\n");
      var prompt = "This will DELETE " + stale.length + ' section(s) from preset "' + presetName + '".\n\n' + "Deleting:\n" + names + "\n\n" + "Each one is an MRR agent marker whose agent no longer exists, so it injects nothing. " + "Deletion is permanent — there is no undo. Continue?";
      var ok = confirmFn ? confirmFn(prompt) : window.confirm(prompt);
      if (!ok) return "Cancelled — no changes made.";
      var removed = 0;
      return stale.reduce(function(c, s) {
        return c.then(function() {
          progress("Deleting " + s.name + "...");
          return apiDeleteRaw("/prompts/" + encodeURIComponent(presetId) + "/sections/" + encodeURIComponent(s.id)).then(function() {
            removed++;
          }).catch(function(e) {
            warn('preset cleanup: DELETE failed on section "' + s.name + '" (' + s.type + ") — aborted after " + removed + " of " + stale.length + " removal(s); the remaining sections are untouched: " + (e && e.message ? e.message : e));
            var err = new Error("Stopped after " + removed + " of " + stale.length + ' deletion(s): section "' + s.name + '" (' + s.type + ") could not be deleted (" + (e && e.message ? e.message : e) + "). The remaining sections were left untouched — fix the cause and run this again.");
            if (e && typeof e.status === "number") err.status = e.status;
            throw err;
          });
        });
      }, Promise.resolve()).then(function() {
        log("preset cleanup: removed " + removed + ' stale agent marker section(s) from preset "' + presetName + '"');
        return "Removed " + removed + ' stale agent section(s) from preset "' + presetName + '".';
      });
    });
  }).catch(function(e) {
    if (e && e.status === 409) {
      throw new Error('Preset is read-only. The stock "Marinara Universal" preset cannot be modified — open it in the Preset Editor and use "Save as copy" to create an editable preset, select that for this chat, then run this again.');
    }
    throw e;
  });
}

function openAgentManagerDialog() {
  if (state.agentMgrDialogEl && state.agentMgrDialogEl.parentNode) {
    state.agentMgrDialogEl.parentNode.removeChild(state.agentMgrDialogEl);
    state.agentMgrDialogEl = null;
  }
  var backdrop = marinara.addElement(document.body, "div", {
    class: "mrr-dialog-backdrop mrr-dialog-backdrop--open"
  });
  if (!backdrop) return;
  state.agentMgrDialogEl = backdrop;
  var dialog = marinara.addElement(backdrop, "div", {
    class: "mrr-dialog"
  });
  if (!dialog) {
    document.body.removeChild(backdrop);
    state.agentMgrDialogEl = null;
    return;
  }
  marinara.addElement(dialog, "h3", {
    textContent: "Manage MRR Agents"
  });
  marinara.addElement(dialog, "p", {
    textContent: "Every agent the extension created is listed below, grouped by ruleset. Use this to clean up duplicate agents accumulated from prior installs."
  });
  var msg = marinara.addElement(dialog, "div", {
    class: "mrr-msg mrr-msg--info",
    textContent: "Loading..."
  });
  var list = marinara.addElement(dialog, "div", {
    class: "mrr-dialog__lib"
  });
  var buttons = marinara.addElement(dialog, "div", {
    class: "mrr-dialog__buttons"
  });
  var sectionsBtn = marinara.addElement(buttons, "button", {
    class: "mrr-dice__btn mrr-dice__btn--secondary",
    textContent: "Add agent sections to active preset"
  });
  var cleanupBtn = marinara.addElement(buttons, "button", {
    class: "mrr-dice__btn mrr-dice__btn--secondary",
    textContent: "Remove stale agent sections"
  });
  var refreshBtn = marinara.addElement(buttons, "button", {
    class: "mrr-dice__btn mrr-dice__btn--secondary",
    textContent: "Refresh"
  });
  var closeBtn = marinara.addElement(buttons, "button", {
    class: "mrr-dice__btn",
    textContent: "Close"
  });
  function close() {
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    if (state.agentMgrDialogEl === backdrop) state.agentMgrDialogEl = null;
  }
  marinara.on(backdrop, "click", function(e) {
    if (e.target === backdrop) close();
  });
  if (closeBtn) marinara.on(closeBtn, "click", close);
  if (sectionsBtn) marinara.on(sectionsBtn, "click", function() {
    sectionsBtn.disabled = true;
    if (msg) {
      msg.textContent = "Working...";
      msg.className = "mrr-msg mrr-msg--info";
    }
    mrrAddAgentSectionsToActivePreset(null, function(s) {
      if (msg) msg.textContent = s;
    }).then(function(summary) {
      if (msg) {
        msg.textContent = summary;
        msg.className = "mrr-msg mrr-msg--ok";
      }
      sectionsBtn.disabled = false;
    }).catch(function(e) {
      if (msg) {
        msg.textContent = e && e.message || String(e);
        msg.className = "mrr-msg mrr-msg--err";
      }
      sectionsBtn.disabled = false;
    });
  });
  if (cleanupBtn) marinara.on(cleanupBtn, "click", function() {
    cleanupBtn.disabled = true;
    if (msg) {
      msg.textContent = "Working...";
      msg.className = "mrr-msg mrr-msg--info";
    }
    mrrRemoveStaleAgentSectionsFromActivePreset(null, function(s) {
      if (msg) msg.textContent = s;
    }).then(function(summary) {
      if (msg) {
        msg.textContent = summary;
        msg.className = "mrr-msg mrr-msg--ok";
      }
      cleanupBtn.disabled = false;
    }).catch(function(e) {
      if (msg) {
        msg.textContent = e && e.message || String(e);
        msg.className = "mrr-msg mrr-msg--err";
      }
      cleanupBtn.disabled = false;
    });
  });
  function refresh() {
    if (msg) {
      msg.textContent = "Loading...";
      msg.className = "mrr-msg mrr-msg--info";
    }
    if (list) list.textContent = "";
    listManagedAgentsByRuleset().then(function(groups) {
      var rids = Object.keys(groups).sort();
      if (!rids.length) {
        if (msg) {
          msg.textContent = "No managed agents found. You're clean.";
          msg.className = "mrr-msg mrr-msg--ok";
        }
        return;
      }
      if (msg) {
        msg.textContent = rids.length + " ruleset group(s) found.";
        msg.className = "mrr-msg mrr-msg--info";
      }
      rids.forEach(function(rid) {
        var members = groups[rid];
        var row = marinara.addElement(list, "div", {
          class: "mrr-dialog__lib-row"
        });
        if (!row) return;
        var label = rid + " — " + members.length + " agent" + (members.length === 1 ? "" : "s");
        marinara.addElement(row, "span", {
          class: "mrr-dialog__lib-name",
          textContent: label
        });
        var detailBtn = marinara.addElement(row, "button", {
          class: "mrr-char-btn",
          type: "button",
          textContent: "Show"
        });
        var delBtn = marinara.addElement(row, "button", {
          class: "mrr-char-btn mrr-char-btn--danger",
          type: "button",
          textContent: "Delete all"
        });
        if (detailBtn) marinara.on(detailBtn, "click", function() {
          var lines = members.map(function(m) {
            var roleLabel = m.role ? "[" + m.role + "]" : "[main]";
            var statusLabel = m.enabled ? " (enabled)" : " (disabled)";
            return roleLabel + " " + (m.name || "(unnamed)") + statusLabel + "  id=" + m.id;
          });
          window.alert(rid + ":\n\n" + lines.join("\n"));
        });
        if (delBtn) marinara.on(delBtn, "click", function() {
          if (!window.confirm("Delete ALL " + members.length + ' agent(s) under "' + rid + '"?\n\nThis cannot be undone. The local ruleset cache is NOT affected.')) return;
          delBtn.disabled = true;
          if (msg) {
            msg.textContent = "Deleting " + rid + "...";
            msg.className = "mrr-msg mrr-msg--info";
          }
          var ids = members.map(function(m) {
            return m.id;
          });
          deleteManagedAgents(ids, function(s) {
            if (msg) msg.textContent = s;
          }).then(function(n) {
            if (msg) {
              msg.textContent = "Deleted " + n + " agent(s) under " + rid + ".";
              msg.className = "mrr-msg mrr-msg--ok";
            }
            refresh();
          }).catch(function(e) {
            if (msg) {
              msg.textContent = "Delete failed: " + (e && e.message || e);
              msg.className = "mrr-msg mrr-msg--err";
            }
            delBtn.disabled = false;
          });
        });
      });
    }).catch(function(e) {
      if (msg) {
        msg.textContent = "Load failed: " + (e && e.message || e);
        msg.className = "mrr-msg mrr-msg--err";
      }
    });
  }
  if (refreshBtn) marinara.on(refreshBtn, "click", refresh);
  refresh();
}

var MRR_AGENTS_SCHEMA_ID = "mrr-agents";

function validateAgentImport(b) {
  var errs = [];
  function need(o, p, k, t) {
    if (!o || typeof o !== "object") return;
    var v = o[k];
    var actual = Array.isArray(v) ? "array" : typeof v;
    if (t === "array" && !Array.isArray(v)) errs.push({
      path: p + "." + k,
      expected: t,
      got: actual
    }); else if (t !== "array" && typeof v !== t) errs.push({
      path: p + "." + k,
      expected: t,
      got: actual
    });
  }
  if (!b || typeof b !== "object") {
    errs.push({
      path: "(root)",
      expected: "object",
      got: typeof b
    });
    return errs;
  }
  var AGENTS_SCHEMA_ACCEPT = [ "mrr-agents", "mrrp-agents" ];
  if (AGENTS_SCHEMA_ACCEPT.indexOf(b.schema) === -1) errs.push({
    path: "schema",
    expected: '"' + MRR_AGENTS_SCHEMA_ID + '" (legacy "mrrp-agents" also accepted)',
    got: JSON.stringify(b.schema)
  });
  if (b.version !== 1) errs.push({
    path: "version",
    expected: 1,
    got: b.version
  });
  need(b, "(root)", "rulesetId", "string");
  need(b, "(root)", "agents", "array");
  if (Array.isArray(b.agents)) {
    if (!b.agents.length) errs.push({
      path: "agents",
      expected: "non-empty array",
      got: "0 entries"
    });
    b.agents.forEach(function(ag, i) {
      var p = "agents[" + i + "]";
      need(ag, p, "role", "string");
      need(ag, p, "name", "string");
      need(ag, p, "promptTemplate", "string");
      if (typeof ag.promptTemplate === "string" && ag.promptTemplate.length < 50) {
        errs.push({
          path: p + ".promptTemplate",
          expected: "at least 50 characters",
          got: ag.promptTemplate.length + " chars"
        });
      }
    });
  }
  return errs;
}

function importAgents(payload, progressCb) {
  function progress(m) {
    if (progressCb) progressCb(m);
  }
  return Promise.resolve().then(function() {
    var errs = validateAgentImport(payload);
    if (errs.length) {
      var lines = [ "Agent import failed. " + errs.length + " issue(s):\n" ];
      errs.forEach(function(e) {
        lines.push("• " + e.path + ": expected " + e.expected + ", got " + e.got);
      });
      throw new Error(lines.join("\n"));
    }
    var rulesetId = payload.rulesetId;
    var authorId = payload.authorId || "local";
    progress("Loading existing agents...");
    return Promise.all([ apiFetch("/agents"), apiFetch("/connections") ]).then(function(results) {
      var agents = results[0];
      var connections = results[1];
      var connectionId = Array.isArray(connections) && connections.length === 1 && connections[0] && connections[0].id ? connections[0].id : null;
      var existing = (Array.isArray(agents) ? agents : []).filter(function(a) {
        var s = parseAgentSettings(a);
        if (s.mrrManaged === true && s.mrrRulesetId === rulesetId) return true;
        return !!mrrStrippedManagedRow(a, rulesetId);
      });
      var existingIds = existing.map(function(a) {
        return a.id;
      });
      var outgoingByRole = Object.create(null);
      existing.forEach(function(a) {
        var s = parseAgentSettings(a);
        var r;
        if (s && s.mrrManaged === true) {
          r = typeof s.mrrAgentRole === "string" && s.mrrAgentRole ? s.mrrAgentRole : "main";
        } else {
          var hit = mrrStrippedManagedRow(a, rulesetId);
          r = hit ? hit.role : null;
        }
        if (r && !outgoingByRole[r]) outgoingByRole[r] = a;
      });
      var deletePhase = existingIds.length ? (progress("Deleting " + existingIds.length + " existing agent(s)..."), 
      deleteManagedAgents(existingIds, progressCb)) : Promise.resolve(0);
      return deletePhase.then(function() {
        progress("Creating " + payload.agents.length + " agent(s)...");
        var created = 0;
        return payload.agents.reduce(function(chain, ag) {
          return chain.then(function() {
            var role = ag.role;
            var prefix = MRR_PROMPT_PFX + authorId + "/" + rulesetId + (role && role !== "main" ? ":" + role : "") + "]";
            var promptTemplate = prefix + " " + (ag.promptTemplate || "");
            var outgoing = outgoingByRole[role || "main"] || null;
            var body = {
              type: mrrAgentTypeForRole(role),
              name: "MRR: " + (ag.name || rulesetId + " " + role),
              description: ag.description || "",
              phase: ag.phase || "pre_generation",
              enabled: ag.enabled === true,
              connectionId: mrrPreservedConnectionId(outgoing, connectionId),
              promptTemplate,
              settings: mrrPreservedAgentSettings(outgoing, ag.settings, {
                mrrManaged: true,
                mrrBundleSchema: MRR_AGENTS_SCHEMA_ID,
                mrrRulesetId: rulesetId,
                mrrAuthorId: authorId,
                mrrAgentRole: role
              })
            };
            return apiPostRaw("/agents", body).then(function() {
              created++;
            });
          });
        }, Promise.resolve()).then(function() {
          if (typeof mrrInvalidateSheetSyncMemo === "function") mrrInvalidateSheetSyncMemo("managed agents re-imported");
          return {
            deleted: existingIds.length,
            created,
            rulesetId
          };
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
  var backdrop = marinara.addElement(document.body, "div", {
    class: "mrr-dialog-backdrop mrr-dialog-backdrop--open"
  });
  if (!backdrop) return;
  state.agentImportDialogEl = backdrop;
  var dialog = marinara.addElement(backdrop, "div", {
    class: "mrr-dialog"
  });
  if (!dialog) {
    document.body.removeChild(backdrop);
    state.agentImportDialogEl = null;
    return;
  }
  marinara.addElement(dialog, "h3", {
    textContent: "Import Agents"
  });
  marinara.addElement(dialog, "p", {
    textContent: "Paste an mrr-agents JSON or import a file. Existing agents tagged with the same rulesetId will be DELETED and replaced — no duplicates."
  });
  var ta = marinara.addElement(dialog, "textarea", {
    placeholder: "Paste agents.json content here, or use Import file."
  });
  var msg = marinara.addElement(dialog, "div", {
    class: "mrr-msg mrr-msg--info mrr-msg--hidden"
  });
  var buttons = marinara.addElement(dialog, "div", {
    class: "mrr-dialog__buttons"
  });
  var fileBtn = marinara.addElement(buttons, "button", {
    class: "mrr-dice__btn mrr-dice__btn--secondary",
    type: "button",
    textContent: "Import file..."
  });
  var cancelBtn = marinara.addElement(buttons, "button", {
    class: "mrr-dice__btn mrr-dice__btn--secondary",
    type: "button",
    textContent: "Cancel"
  });
  var applyBtn = marinara.addElement(buttons, "button", {
    class: "mrr-dice__btn",
    type: "button",
    textContent: "Apply (replace agents)"
  });
  var fileInput = marinara.addElement(dialog, "input", {
    type: "file",
    accept: ".json,application/json"
  });
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
  marinara.on(backdrop, "click", function(e) {
    if (e.target === backdrop) close();
  });
  if (cancelBtn) marinara.on(cancelBtn, "click", close);
  if (fileBtn) marinara.on(fileBtn, "click", function() {
    if (fileInput) fileInput.click();
  });
  if (fileInput) marinara.on(fileInput, "change", function() {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    var reader = new FileReader;
    reader.onload = function() {
      ta.value = String(reader.result || "");
      setMsg("Loaded " + f.name + " — click Apply to import.", "ok");
    };
    reader.onerror = function() {
      setMsg("File read failed.", "err");
    };
    reader.readAsText(f);
  });
  if (applyBtn) marinara.on(applyBtn, "click", function() {
    var text = (ta && ta.value || "").trim();
    if (!text) {
      setMsg("Paste agents.json or import a file first.", "err");
      return;
    }
    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setMsg("Invalid JSON: " + e.message, "err");
      return;
    }
    if (!window.confirm('Replace agents for ruleset "' + (parsed && parsed.rulesetId) + '"?\n\nExisting matching agents will be DELETED and recreated from this import.')) return;
    applyBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    setMsg("Importing...", "info");
    importAgents(parsed, function(s) {
      setMsg(s, "info");
    }).then(function(r) {
      setMsg("Done. " + r.deleted + " deleted, " + r.created + " created under " + r.rulesetId + ".", "ok");
      applyBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
    }).catch(function(e) {
      setMsg(e && e.message ? e.message : String(e), "err");
      applyBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
    });
  });
}

function bundleFilename() {
  var d = new Date;
  var stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  return "mrr-" + state.ruleset.id + "-" + stamp + ".json";
}

function triggerDownload(filename, jsonString) {
  var blob = new Blob([ jsonString ], {
    type: "application/json"
  });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() {
    URL.revokeObjectURL(url);
  }, 1e3);
}

function triggerUpload(onText) {
  var input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", function() {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader;
    reader.onload = function() {
      onText(String(reader.result || ""));
    };
    reader.onerror = function() {
      var msg = reader.error ? reader.error.message : "unknown error";
      window.alert("Could not read file: " + msg);
    };
    reader.readAsText(file);
  });
  input.click();
}

function exportBundle() {
  if (!state.ruleset || !state.chatId) {
    window.alert("Activate a ruleset and open a chat first.");
    return;
  }
  var bundle = collectBundle();
  triggerDownload(bundleFilename(), JSON.stringify(bundle, null, 2));
}

function importBundle() {
  if (!state.ruleset) {
    window.alert("Activate a ruleset first.");
    return;
  }
  triggerUpload(function(text) {
    var parsed = safeParse(text);
    if (!parsed) {
      window.alert("Import failed: file is not valid JSON.");
      return;
    }
    applyBundle(parsed);
  });
}

function switchCharacter(id) {
  if (!id) return;
  log("switchCharacter " + state.activeCharacterId + " -> " + id);
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
  if (state.characters.some(function(c) {
    return c.id === id;
  })) id = id + "-" + Date.now();
  state.characters.push({
    id,
    name
  });
  saveCharacters();
  switchCharacter(id);
}

function renameActiveCharacter() {
  var current = state.characters.find(function(c) {
    return c.id === state.activeCharacterId;
  });
  if (!current) return;
  var newName = (window.prompt("Rename character:", current.name) || "").trim();
  if (!newName || newName === current.name) return;
  current.name = newName;
  mrrClearBootstrapFlag("character renamed");
  saveCharacters();
  renderSheet();
}

function removeActiveCharacter() {
  if (state.characters.length <= 1) {
    window.alert("Cannot remove the last character. Add another first, then remove this one.");
    return;
  }
  var current = state.characters.find(function(c) {
    return c.id === state.activeCharacterId;
  });
  if (!current) return;
  if (!window.confirm("Remove " + current.name + "? Their sheet will be deleted.")) return;
  try {
    var raw = mrrReadRecordRaw(current.id) || lsGet(sheetKey(state.chatId, current.id));
    if (raw) {
      var saved = JSON.parse(raw);
      if (saved && saved.abilities && typeof saved.abilities === "object") {
        Object.keys(saved.abilities).forEach(function(catId) {
          var arr = saved.abilities[catId];
          if (!Array.isArray(arr)) return;
          arr.forEach(function(ab) {
            if (ab && ab.lorebookEntryId) deleteAbilityLorebookEntry(ab).catch(function() {});
          });
        });
      }
    }
  } catch (e) {}
  lsDel(mrrWriteRecordKey(current.id));
  lsDel(characterKey(current.id));
  lsDel(sheetKey(state.chatId, current.id));
  state.characters = state.characters.filter(function(c) {
    return c.id !== current.id;
  });
  saveCharacters();
  switchCharacter(state.characters[0].id);
}

function blankSheet(rs) {
  var s = {
    attributes: {},
    skills: {},
    derived: {},
    states: {},
    track: {},
    extraTrack: {},
    resources: {},
    inventory: [],
    equipped: {},
    skillProficiency: {},
    skillSpecialties: {},
    backgrounds: [],
    abilities: {},
    abilityCollapse: {},
    intimacies: [],
    intimacyCollapse: {},
    identity: {
      race: "",
      class: ""
    },
    customSkills: [],
    derivedMax: {},
    xp: {
      current: 0,
      level: 1,
      next: 0,
      total: 0
    },
    attunedCount: 0,
    investedCount: 0,
    density: "cozy"
  };
  rs.attributes.forEach(function(a) {
    s.attributes[a.name] = a["default"] != null ? a["default"] : a.min;
  });
  rs.skills.forEach(function(k) {
    s.skills[k.name] = k["default"] != null ? k["default"] : k.min != null ? k.min : 0;
  });
  if (Array.isArray(rs.derivedStats)) {
    rs.derivedStats.forEach(function(d) {
      if (d.renderAs === "track") {
        s.track[d.name] = 0;
        s.extraTrack[d.name] = [];
      } else {
        s.derived[d.name] = typeof d["default"] === "number" ? d["default"] : 0;
      }
    });
  }
  if (Array.isArray(rs.resources)) {
    rs.resources.forEach(function(r) {
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
    rs.states.forEach(function(st) {
      s.states[st.name] = st.values && st.values[0] && st.values[0].label || "";
    });
  }
  return s;
}

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
  if (typeof it.hardness === "string" && it.hardness) {
    var ph = parseInt(it.hardness, 10);
    it.hardness = !isNaN(ph) && ph >= 0 ? ph : 0;
  }
  if (typeof it.hardness !== "number" || it.hardness < 0 || !isFinite(it.hardness) || isNaN(it.hardness)) {
    it.hardness = 0;
  } else {
    it.hardness = Math.floor(it.hardness);
  }
  if (typeof it.overwhelming === "string" && it.overwhelming) {
    var po = parseInt(it.overwhelming, 10);
    it.overwhelming = !isNaN(po) && po >= 0 ? po : 0;
  }
  if (typeof it.overwhelming !== "number" || it.overwhelming < 0 || !isFinite(it.overwhelming) || isNaN(it.overwhelming)) {
    it.overwhelming = 0;
  } else {
    it.overwhelming = Math.floor(it.overwhelming);
  }
  if (typeof it.attuned !== "boolean") it.attuned = false;
  if (typeof it.invested !== "boolean") it.invested = false;
  if (typeof it.moteCommitment === "string" && it.moteCommitment) {
    var pm = parseInt(it.moteCommitment, 10);
    it.moteCommitment = !isNaN(pm) && pm >= 0 ? pm : 0;
  }
  if (typeof it.moteCommitment !== "number" || it.moteCommitment < 0 || !isFinite(it.moteCommitment) || isNaN(it.moteCommitment)) {
    it.moteCommitment = 0;
  } else {
    it.moteCommitment = Math.floor(it.moteCommitment);
  }
  if (it.motePool !== "Personal" && it.motePool !== "Peripheral") it.motePool = "Personal";
  if (typeof it.quantity === "string" && it.quantity) {
    var pq = parseInt(it.quantity, 10);
    it.quantity = !isNaN(pq) && pq >= 0 ? pq : 1;
  }
  if (typeof it.quantity !== "number" || it.quantity < 0 || !isFinite(it.quantity) || isNaN(it.quantity)) {
    it.quantity = 1;
  } else {
    it.quantity = Math.floor(it.quantity);
  }
  return it;
}

function normalizeIntimacy(it, idx) {
  if (!it || typeof it !== "object") return it;
  if (typeof it.text !== "string") it.text = "";
  if (it.kind !== "tie" && it.kind !== "principle") it.kind = "tie";
  if (it.degree !== "minor" && it.degree !== "major" && it.degree !== "defining") it.degree = "minor";
  if (typeof it.target !== "string") it.target = "";
  if (typeof it.id !== "string" || !it.id) {
    var slug = (it.text || "unnamed").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    it.id = "intimacy-heal-" + (slug || "x") + "-" + (typeof idx === "number" ? idx : 0);
  }
  return it;
}

function mergeSheet(base, override) {
  [ "attributes", "skills", "derived", "states", "track" ].forEach(function(k) {
    if (override[k] && typeof override[k] === "object") {
      Object.keys(override[k]).forEach(function(name) {
        if (name in base[k]) base[k][name] = override[k][name];
      });
    }
  });
  if (override.extraTrack && typeof override.extraTrack === "object") {
    if (!base.extraTrack) base.extraTrack = {};
    Object.keys(override.extraTrack).forEach(function(name) {
      if (Array.isArray(override.extraTrack[name])) {
        base.extraTrack[name] = override.extraTrack[name];
      }
    });
  }
  if (override.resources && typeof override.resources === "object") {
    if (!base.resources) base.resources = {};
    Object.keys(override.resources).forEach(function(id) {
      var v = override.resources[id];
      if (v && typeof v === "object") base.resources[id] = v;
    });
  }
  if (override.committedMotes && typeof override.committedMotes === "object") {
    base.committedMotes = {};
    Object.keys(override.committedMotes).forEach(function(poolName) {
      var v = override.committedMotes[poolName];
      if (typeof v === "number" && isFinite(v)) base.committedMotes[poolName] = v;
    });
  }
  if (Array.isArray(override.inventory)) {
    base.inventory = override.inventory.filter(function(it) {
      return it && typeof it === "object" && typeof it.name === "string" && it.name;
    }).map(function(it, idx) {
      return normalizeInventoryItem(it, idx);
    });
  }
  if (override.equipped && typeof override.equipped === "object") {
    base.equipped = {};
    Object.keys(override.equipped).forEach(function(slot) {
      var v = override.equipped[slot];
      if (typeof v === "string" || v === null) base.equipped[slot] = v;
    });
  }
  if (override.skillProficiency && typeof override.skillProficiency === "object") {
    base.skillProficiency = {};
    Object.keys(override.skillProficiency).forEach(function(skillName) {
      var v = override.skillProficiency[skillName];
      if (typeof v === "string") base.skillProficiency[skillName] = v;
    });
  }
  if (override.skillSpecialties && typeof override.skillSpecialties === "object") {
    base.skillSpecialties = {};
    Object.keys(override.skillSpecialties).forEach(function(skillName) {
      var arr = override.skillSpecialties[skillName];
      if (!Array.isArray(arr)) return;
      base.skillSpecialties[skillName] = arr.filter(function(sp) {
        return sp && typeof sp === "object" && typeof sp.name === "string";
      }).map(function(sp) {
        return {
          name: sp.name,
          value: typeof sp.value === "number" && isFinite(sp.value) ? sp.value : 0
        };
      });
    });
  }
  if (Array.isArray(override.backgrounds)) {
    base.backgrounds = override.backgrounds.filter(function(b) {
      return b && typeof b === "object" && typeof b.name === "string";
    }).map(function(b) {
      return {
        name: b.name,
        value: typeof b.value === "number" && isFinite(b.value) ? b.value : 0
      };
    });
  }
  if (override.abilities && typeof override.abilities === "object" && !Array.isArray(override.abilities)) {
    base.abilities = {};
    Object.keys(override.abilities).forEach(function(catId) {
      var arr = override.abilities[catId];
      if (!Array.isArray(arr)) return;
      base.abilities[catId] = arr.filter(function(a) {
        return a && typeof a === "object" && typeof a.id === "string" && typeof a.name === "string";
      }).map(function(a) {
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
    Object.keys(override.abilityCollapse).forEach(function(catId) {
      var v = override.abilityCollapse[catId];
      if (typeof v === "boolean") base.abilityCollapse[catId] = v;
    });
  }
  if (Array.isArray(override.intimacies)) {
    base.intimacies = override.intimacies.filter(function(it) {
      return it && typeof it === "object";
    }).map(function(it, idx) {
      return normalizeIntimacy(it, idx);
    });
  }
  if (override.intimacyCollapse && typeof override.intimacyCollapse === "object" && !Array.isArray(override.intimacyCollapse)) {
    base.intimacyCollapse = {};
    Object.keys(override.intimacyCollapse).forEach(function(degree) {
      var v = override.intimacyCollapse[degree];
      if (typeof v === "boolean") base.intimacyCollapse[degree] = v;
    });
  }
  if (override.identity && typeof override.identity === "object" && !Array.isArray(override.identity)) {
    base.identity = {
      race: typeof override.identity.race === "string" ? override.identity.race : "",
      class: typeof override.identity["class"] === "string" ? override.identity["class"] : ""
    };
  }
  if (Array.isArray(override.customSkills)) {
    base.customSkills = override.customSkills.filter(function(k) {
      return k && typeof k === "object" && typeof k.name === "string";
    }).map(function(k) {
      return {
        name: k.name,
        linkedAttribute: typeof k.linkedAttribute === "string" ? k.linkedAttribute : "",
        value: typeof k.value === "number" && isFinite(k.value) ? k.value : 0
      };
    });
  }
  if (override.derivedMax && typeof override.derivedMax === "object" && !Array.isArray(override.derivedMax)) {
    base.derivedMax = {};
    Object.keys(override.derivedMax).forEach(function(n) {
      var v = override.derivedMax[n];
      if (typeof v === "number" && isFinite(v)) base.derivedMax[n] = v;
    });
  }
  if (override.sectionCollapse && typeof override.sectionCollapse === "object" && !Array.isArray(override.sectionCollapse)) {
    base.sectionCollapse = {};
    Object.keys(override.sectionCollapse).forEach(function(k) {
      base.sectionCollapse[k] = !!override.sectionCollapse[k];
    });
  }
  if (override.xp && typeof override.xp === "object" && !Array.isArray(override.xp)) {
    if (!base.xp) base.xp = {
      current: 0,
      level: 1,
      next: 0,
      total: 0
    };
    if (typeof override.xp.current === "number" && isFinite(override.xp.current)) base.xp.current = override.xp.current;
    if (typeof override.xp.level === "number" && isFinite(override.xp.level)) base.xp.level = override.xp.level;
    if (typeof override.xp.next === "number" && isFinite(override.xp.next)) base.xp.next = override.xp.next;
    if (typeof override.xp.total === "number" && isFinite(override.xp.total)) base.xp.total = override.xp.total;
  }
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
      Object.keys(override.morality.virtues).forEach(function(vid) {
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
  if (Array.isArray(override.conditions)) {
    base.conditions = override.conditions.filter(function(c) {
      return typeof c === "string" && c;
    });
  }
  if (override.abilityCategoryScores && typeof override.abilityCategoryScores === "object" && !Array.isArray(override.abilityCategoryScores)) {
    base.abilityCategoryScores = {};
    Object.keys(override.abilityCategoryScores).forEach(function(catId) {
      var v = override.abilityCategoryScores[catId];
      if (typeof v === "number" && isFinite(v)) {
        base.abilityCategoryScores[catId] = Math.max(0, Math.floor(v));
      }
    });
  }
  if (Array.isArray(override.customAbilityCategories)) {
    base.customAbilityCategories = override.customAbilityCategories.filter(function(cat) {
      return cat && typeof cat === "object" && typeof cat.id === "string" && typeof cat.label === "string";
    }).map(function(cat) {
      return {
        id: cat.id,
        label: cat.label
      };
    });
  }
  if (override.trackCells && typeof override.trackCells === "object" && !Array.isArray(override.trackCells)) {
    base.trackCells = {};
    Object.keys(override.trackCells).forEach(function(trackName) {
      var cells = override.trackCells[trackName];
      if (Array.isArray(cells)) {
        base.trackCells[trackName] = cells.filter(function(c) {
          return c === null || typeof c === "string" || c && typeof c === "object";
        });
      }
    });
  }
  if (typeof override.density === "string" && [ "compact", "cozy", "roomy" ].indexOf(override.density) !== -1) {
    base.density = override.density;
  }
  if (Array.isArray(override.meritsFlaws)) {
    base.meritsFlaws = override.meritsFlaws.filter(function(e) {
      return e && typeof e === "object" && typeof e.name === "string";
    }).map(function(e) {
      var pts = typeof e.points === "number" && isFinite(e.points) ? Math.floor(e.points) : 1;
      if (pts < 1) pts = 1;
      if (pts > 7) pts = 7;
      return {
        id: typeof e.id === "string" && e.id ? e.id : "mf-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36),
        kind: e.kind === "flaw" ? "flaw" : "merit",
        name: e.name,
        type: typeof e.type === "string" && [ "physical", "mental", "social", "supernatural" ].indexOf(e.type) !== -1 ? e.type : "physical",
        points: pts
      };
    });
  }
  if (override.customState && typeof override.customState === "object" && !Array.isArray(override.customState)) {
    base.customState = {};
    Object.keys(override.customState).forEach(function(rulesetId) {
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
  return base;
}

function clamp(v, lo, hi) {
  if (typeof v !== "number" || isNaN(v)) return lo;
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function statContext() {
  var ctx = {};
  if (!state.sheet) return ctx;
  Object.keys(state.sheet.attributes || {}).forEach(function(k) {
    ctx[k] = state.sheet.attributes[k];
  });
  Object.keys(state.sheet.skills || {}).forEach(function(k) {
    ctx[k] = state.sheet.skills[k];
  });
  Object.keys(state.sheet.derived || {}).forEach(function(k) {
    ctx[k] = state.sheet.derived[k];
  });
  if (Array.isArray(state.sheet.customSkills)) {
    state.sheet.customSkills.forEach(function(k) {
      if (k && typeof k.name === "string" && k.name) ctx[k.name] = typeof k.value === "number" ? k.value : 0;
    });
  }
  if (state.ruleset && Array.isArray(state.ruleset.attributes)) {
    state.ruleset.attributes.forEach(function(a) {
      if (!a || typeof a.modifierFormula !== "string" || !a.modifierFormula) return;
      var raw = typeof ctx[a.name] === "number" ? ctx[a.name] : 0;
      var subbed = a.modifierFormula.replace(/\{Score\}/g, String(raw));
      var v = evalFormula(subbed, ctx);
      var mod = typeof v === "number" && isFinite(v) ? Math.floor(v) : 0;
      ctx[a.name + "_mod"] = mod;
      if (a.abbreviation) ctx[a.abbreviation + "_mod"] = mod;
      if (a.modifierName) ctx[a.modifierName] = mod;
    });
  }
  return ctx;
}

function computeCommittedMotes(poolName) {
  if (!state.sheet || !poolName) return 0;
  var inv = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
  var equipped = state.sheet.equipped && typeof state.sheet.equipped === "object" ? state.sheet.equipped : {};
  var equippedIds = {};
  Object.keys(equipped).forEach(function(slot) {
    if (typeof equipped[slot] === "string") equippedIds[equipped[slot]] = true;
  });
  var total = 0;
  inv.forEach(function(item) {
    if (!item || !equippedIds[item.id]) return;
    if (typeof item.moteCommitment !== "number" || item.moteCommitment <= 0) return;
    var itemPool = item.motePool === "Peripheral" ? "Peripheral" : "Personal";
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
    state.sheet.committedMotes[poolName] = liveCommitted;
    saveSheet(state.chatId, state.sheet);
    return liveCommitted;
  }
  if (liveCommitted === oldCommitted) return liveCommitted;
  var delta = liveCommitted - oldCommitted;
  if (stateName && state.sheet.derived) {
    var cur = typeof state.sheet.derived[stateName] === "number" ? state.sheet.derived[stateName] : 0;
    state.sheet.derived[stateName] = Math.max(0, cur - delta);
  }
  state.sheet.committedMotes[poolName] = liveCommitted;
  saveSheet(state.chatId, state.sheet);
  return liveCommitted;
}

function equippedBonuses(target) {
  var out = {
    dice: 0,
    value: 0,
    contributors: []
  };
  if (!state.sheet || !target) return out;
  var inv = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
  var equipped = state.sheet.equipped && typeof state.sheet.equipped === "object" ? state.sheet.equipped : {};
  var equippedIds = {};
  Object.keys(equipped).forEach(function(slot) {
    if (typeof equipped[slot] === "string") equippedIds[equipped[slot]] = true;
  });
  inv.forEach(function(item) {
    if (!item || !equippedIds[item.id]) return;
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
    item.bonuses.forEach(function(b) {
      if (!b || b.target !== target) return;
      var v = typeof b.value === "number" && isFinite(b.value) ? b.value : 0;
      if (v === 0) return;
      if (b.kind === BONUS_KIND.DICE) out.dice += v; else out.value += v;
      out.contributors.push({
        name: item.name || item.id,
        value: v,
        kind: b.kind || BONUS_KIND.VALUE,
        tag: b.tag || ""
      });
    });
  });
  return out;
}

function tierForSkill(skillName) {
  var prof = state.ruleset && state.ruleset.skillProficiency;
  if (!prof || !Array.isArray(prof.tiers) || !prof.tiers.length) return null;
  var saved = state.sheet && state.sheet.skillProficiency ? state.sheet.skillProficiency[skillName] : null;
  var code = saved || prof["default"] || prof.tiers[0].code;
  for (var i = 0; i < prof.tiers.length; i++) {
    if (prof.tiers[i].code === code) return prof.tiers[i];
  }
  return prof.tiers[0];
}

function resolveTierBonus(skillName) {
  var tier = tierForSkill(skillName);
  if (!tier || !tier.rollBonusFormula) return 0;
  var v = evalFormula(tier.rollBonusFormula, statContext());
  return typeof v === "number" && isFinite(v) ? v : 0;
}

function cycleTier(skillName, btnEl) {
  var prof = state.ruleset && state.ruleset.skillProficiency;
  if (!prof || !Array.isArray(prof.tiers) || !prof.tiers.length) return;
  var current = tierForSkill(skillName);
  var idx = 0;
  for (var i = 0; i < prof.tiers.length; i++) {
    if (prof.tiers[i].code === (current && current.code)) {
      idx = i;
      break;
    }
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
  refreshAllBars();
}

function addSpecialty(skillName) {
  if (!state.sheet.skillSpecialties) state.sheet.skillSpecialties = {};
  if (!Array.isArray(state.sheet.skillSpecialties[skillName])) {
    state.sheet.skillSpecialties[skillName] = [];
  }
  var def = state.ruleset.skillSpecialties && state.ruleset.skillSpecialties.defaultValue;
  state.sheet.skillSpecialties[skillName].push({
    name: "",
    value: typeof def === "number" ? def : 0
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

function addBackground() {
  if (!Array.isArray(state.sheet.backgrounds)) state.sheet.backgrounds = [];
  var cfg = state.ruleset.backgrounds || {};
  var def = typeof cfg["default"] === "number" ? cfg["default"] : 0;
  state.sheet.backgrounds.push({
    name: "",
    value: def
  });
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

var INTIMACY_DEGREES = [ {
  id: "minor",
  label: "Minor"
}, {
  id: "major",
  label: "Major"
}, {
  id: "defining",
  label: "Defining"
} ];

function generateIntimacyId() {
  return "intimacy-" + Date.now() + "-" + Math.random().toString(36).slice(2, 11);
}

function totalIntimacyCount() {
  if (!state.sheet || !Array.isArray(state.sheet.intimacies)) return 0;
  return state.sheet.intimacies.length;
}

function intimaciesByDegree(degreeId) {
  if (!state.sheet || !Array.isArray(state.sheet.intimacies)) return [];
  return state.sheet.intimacies.filter(function(it) {
    return it && it.degree === degreeId;
  });
}

function addIntimacy(degreeId, kindId, focusAfterRender) {
  if (!state.sheet) return null;
  if (!Array.isArray(state.sheet.intimacies)) state.sheet.intimacies = [];
  var degree = degreeId === "minor" || degreeId === "major" || degreeId === "defining" ? degreeId : "minor";
  var kind = kindId === "tie" || kindId === "principle" ? kindId : "tie";
  var entry = normalizeIntimacy({
    id: generateIntimacyId(),
    kind,
    text: "",
    degree,
    target: ""
  }, state.sheet.intimacies.length);
  state.sheet.intimacies.push(entry);
  saveSheet(state.chatId, state.sheet);
  renderIntimaciesPanelContents();
  renderSheet();
  if (state.intimaciesOpen) showIntimacies(true);
  if (focusAfterRender) {
    setTimeout(function() {
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
    if (state.sheet.intimacies[i] && state.sheet.intimacies[i].id === id) {
      idx = i;
      break;
    }
  }
  if (idx === -1) return;
  state.sheet.intimacies.splice(idx, 1);
  saveSheet(state.chatId, state.sheet);
  renderIntimaciesPanelContents();
  renderSheet();
  if (state.intimaciesOpen) showIntimacies(true);
}

function mrrP3BuildIntimaciesPanel() {
  if (state.intimaciesEl) return state.intimaciesEl;
  if (typeof mrrP3CreatePanel !== "function") return null;
  var p = mrrP3CreatePanel(document.body, {
    storageKey: "mrr-p3-intimacies-pos",
    title: "Intimacies — " + state.ruleset.name,
    defaultPos: {
      x: 360,
      y: 80
    },
    defaultSize: {
      w: 460,
      h: 600
    },
    className: "mrr-intimacies",
    onClose: function() {
      showIntimacies(false);
    }
  });
  if (!p || !p.panel || !p.body) return null;
  if (p.body.classList) p.body.classList.add("mrr-spellbook__body");
  p.panel.style.display = "none";
  state.intimaciesEl = p.panel;
  return state.intimaciesEl;
}

function buildIntimaciesPanel() {
  if (state.intimaciesEl) return state.intimaciesEl;
  state.intimaciesEl = marinara.addElement(document.body, "div", {
    class: "mrr-spellbook mrr-intimacies"
  });
  if (!state.intimaciesEl) return null;
  var header = marinara.addElement(state.intimaciesEl, "div", {
    class: "mrr-spellbook__header"
  });
  if (header) {
    marinara.addElement(header, "span", {
      class: "mrr-spellbook__title",
      textContent: "Intimacies — " + state.ruleset.name
    });
    var close = marinara.addElement(header, "button", {
      class: "mrr-dice__close",
      innerHTML: "&times;"
    });
    if (close) marinara.on(close, "click", function() {
      showIntimacies(false);
    });
    makeDraggable(state.intimaciesEl, header, LS_INTIMACIES_POS);
  }
  marinara.addElement(state.intimaciesEl, "div", {
    class: "mrr-spellbook__body"
  });
  return state.intimaciesEl;
}

function showIntimacies(open) {
  if (open) {
    if (!state.intimaciesEl) {
      if (typeof mrrP3BuildIntimaciesPanel === "function") mrrP3BuildIntimaciesPanel(); else buildIntimaciesPanel();
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
  var topAdd = marinara.addElement(body, "button", {
    class: "mrr-char-btn mrr-char-btn--dashed mrr-intimacies__top-add",
    type: "button",
    textContent: "+ Add Intimacy"
  });
  if (topAdd) marinara.on(topAdd, "click", function() {
    addIntimacy("minor", "tie", true);
  });
  INTIMACY_DEGREES.forEach(function(deg) {
    renderIntimacyDegreeGroup(body, deg);
  });
}

function renderIntimacyDegreeGroup(body, degree) {
  var sec = marinara.addElement(body, "div", {
    class: "mrr-spellbook-cat mrr-intimacy-group mrr-intimacy-group--" + degree.id
  });
  if (!sec) return;
  var entries = intimaciesByDegree(degree.id);
  var collapsed = degree.id in state.sheet.intimacyCollapse ? !!state.sheet.intimacyCollapse[degree.id] : true;
  if (collapsed) sec.classList.add("mrr-spellbook-cat--collapsed");
  var head = marinara.addElement(sec, "button", {
    class: "mrr-spellbook-cat__head",
    type: "button",
    textContent: degree.label + " " + entries.length
  });
  if (head) marinara.on(head, "click", function() {
    var nowCollapsed = sec.classList.toggle("mrr-spellbook-cat--collapsed");
    state.sheet.intimacyCollapse[degree.id] = nowCollapsed;
    saveSheet(state.chatId, state.sheet);
  });
  var list = marinara.addElement(sec, "div", {
    class: "mrr-spellbook-cat__list"
  });
  if (!list) return;
  entries.forEach(function(it) {
    renderIntimacyRow(list, it);
  });
  var addBtn = marinara.addElement(sec, "button", {
    class: "mrr-char-btn mrr-char-btn--dashed mrr-spellbook-cat__add",
    type: "button",
    textContent: "+ Add " + degree.label
  });
  if (addBtn) marinara.on(addBtn, "click", function() {
    addIntimacy(degree.id, "tie", true);
  });
}

function renderIntimacyRow(list, entry) {
  var row = marinara.addElement(list, "div", {
    class: "mrr-intimacy-row"
  });
  if (!row) return;
  var kindBtn = marinara.addElement(row, "button", {
    class: "mrr-chip mrr-chip--intimacy-kind mrr-chip--intimacy-kind-" + (entry.kind || "tie"),
    type: "button",
    textContent: entry.kind === "principle" ? "Principle" : "Tie",
    title: "Click to toggle Tie / Principle"
  });
  if (kindBtn) marinara.on(kindBtn, "click", function() {
    entry.kind = entry.kind === "tie" ? "principle" : "tie";
    saveSheet(state.chatId, state.sheet);
    renderIntimaciesPanelContents();
  });
  var textInput = marinara.addElement(row, "input", {
    class: "mrr-intimacy-row__text",
    type: "text",
    placeholder: entry.kind === "principle" ? "principle (e.g. 'Justice protects the powerless')" : "tie (e.g. 'Loyalty to the Sword Lord')",
    value: entry.text || ""
  });
  if (textInput) {
    textInput.setAttribute("data-intimacy-id", entry.id);
    var saveTimer = null;
    marinara.on(textInput, "input", function() {
      entry.text = textInput.value;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function() {
        saveSheet(state.chatId, state.sheet);
      }, 250);
    });
    marinara.on(textInput, "blur", function() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      saveSheet(state.chatId, state.sheet);
    });
    marinara.on(textInput, "click", function(e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
  }
  var degSel = marinara.addElement(row, "select", {
    class: "mrr-intimacy-row__degree"
  });
  if (degSel) {
    INTIMACY_DEGREES.forEach(function(d) {
      var opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.label;
      if (d.id === (entry.degree || "minor")) opt.selected = true;
      degSel.appendChild(opt);
    });
    marinara.on(degSel, "change", function() {
      var v = degSel.value;
      if (v !== "minor" && v !== "major" && v !== "defining") return;
      entry.degree = v;
      saveSheet(state.chatId, state.sheet);
      renderIntimaciesPanelContents();
    });
  }
  if (entry.kind === "tie") {
    var targetInput = marinara.addElement(row, "input", {
      class: "mrr-intimacy-row__target",
      type: "text",
      placeholder: "target name",
      value: entry.target || ""
    });
    if (targetInput) {
      var tSaveTimer = null;
      marinara.on(targetInput, "input", function() {
        entry.target = targetInput.value;
        if (tSaveTimer) clearTimeout(tSaveTimer);
        tSaveTimer = setTimeout(function() {
          saveSheet(state.chatId, state.sheet);
        }, 250);
      });
      marinara.on(targetInput, "blur", function() {
        if (tSaveTimer) {
          clearTimeout(tSaveTimer);
          tSaveTimer = null;
        }
        saveSheet(state.chatId, state.sheet);
      });
      marinara.on(targetInput, "click", function(e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      });
    }
  }
  var delBtn = marinara.addElement(row, "button", {
    class: "mrr-char-btn mrr-char-btn--danger",
    type: "button",
    textContent: "x",
    title: "Remove this intimacy"
  });
  if (delBtn) marinara.on(delBtn, "click", function() {
    removeIntimacy(entry.id);
  });
}

function safeEvalArithmetic(s) {
  var i = 0;
  function skip() {
    while (i < s.length && (s[i] === " " || s[i] === "\t" || s[i] === "\n")) i++;
  }
  function parseNumber() {
    skip();
    var start = i;
    while (i < s.length && (s[i] >= "0" && s[i] <= "9" || s[i] === ".")) i++;
    if (i === start) throw new Error("expected number at " + i);
    return parseFloat(s.slice(start, i));
  }
  function parsePrimary() {
    skip();
    if (s[i] === "(") {
      i++;
      var v = parseExpr();
      skip();
      if (s[i] !== ")") throw new Error("expected )");
      i++;
      return v;
    }
    if (s[i] === "-") {
      i++;
      return -parsePrimary();
    }
    if (s[i] === "+") {
      i++;
      return parsePrimary();
    }
    return parseNumber();
  }
  function parseTerm() {
    var left = parsePrimary();
    while (true) {
      skip();
      if (s[i] === "*") {
        i++;
        left = left * parsePrimary();
      } else if (s[i] === "/") {
        i++;
        var r = parsePrimary();
        if (r === 0) throw new Error("divide by zero");
        left = left / r;
      } else break;
    }
    return left;
  }
  function parseExpr() {
    var left = parseTerm();
    while (true) {
      skip();
      if (s[i] === "+") {
        i++;
        left = left + parseTerm();
      } else if (s[i] === "-") {
        i++;
        left = left - parseTerm();
      } else break;
    }
    return left;
  }
  var result = parseExpr();
  skip();
  if (i !== s.length) throw new Error("unexpected char at " + i);
  return result;
}

function evalFormula(formula, ctx) {
  if (!formula) return null;
  var subbed = String(formula).replace(/\{([^}]+)\}/g, function(_, key) {
    var v = ctx[key];
    return typeof v === "number" ? String(v) : "0";
  });
  if (!/^[\s0-9+\-*/().]*$/.test(subbed)) return null;
  try {
    var result = safeEvalArithmetic(subbed);
    return typeof result === "number" && isFinite(result) ? result : null;
  } catch (e) {
    return null;
  }
}

function findChatInputTextarea() {
  var sels = [ ".marinara-chat-input-shell textarea", ".mari-chat-input-box textarea", "textarea.mari-chat-input-textarea", "textarea.chat-input", "textarea[placeholder*='message' i]", "textarea[placeholder*='type' i]", "textarea" ];
  for (var i = 0; i < sels.length; i++) {
    var els = document.querySelectorAll(sels[i]);
    if (!els.length) continue;
    var bare = sels[i] === "textarea";
    var visible = Array.prototype.filter.call(els, function(el) {
      if (el.offsetParent === null || el.disabled) return false;
      if (bare && el.closest && el.closest("[role='dialog'], [aria-modal='true']")) return false;
      return true;
    });
    if (!visible.length) continue;
    var best = visible[0];
    var bestBottom = -Infinity;
    for (var v = 0; v < visible.length; v++) {
      var r = visible[v].getBoundingClientRect();
      if (r.bottom > bestBottom) {
        bestBottom = r.bottom;
        best = visible[v];
      }
    }
    return best;
  }
  return null;
}

function setNativeInputValue(el, value) {
  var proto = typeof HTMLTextAreaElement !== "undefined" && el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : typeof HTMLInputElement !== "undefined" && el instanceof HTMLInputElement ? HTMLInputElement.prototype : null;
  var desc = proto ? Object.getOwnPropertyDescriptor(proto, "value") : null;
  if (desc && desc.set) desc.set.call(el, value); else el.value = value;
}

function insertIntoChatInput(text) {
  var ta = findChatInputTextarea();
  if (!ta) {
    warn("chat input not found; tag copied to clipboard: " + text);
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        navigator.clipboard.writeText(text);
      } catch (e) {}
    }
    return false;
  }
  var prev = ta.value || "";
  var sep = prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
  setNativeInputValue(ta, prev + sep + text);
  ta.dispatchEvent(new Event("input", {
    bubbles: true
  }));
  ta.dispatchEvent(new Event("change", {
    bubbles: true
  }));
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
  headings.forEach(function(h) {
    var t = (h.textContent || "").trim().toLowerCase();
    if (t === "attributes") {
      var box = h.closest("section, fieldset, div");
      if (box && box !== container) box.classList.add("mrr-hidden");
    }
  });
}

function makeDraggable(el, handle, posKey) {
  if (!el || !handle) return;
  var saved = lsGet(posKey);
  if (saved) {
    var pos = safeParse(saved);
    if (pos && typeof pos.left === "number" && typeof pos.top === "number") {
      var safeLeft = Math.max(0, Math.min(window.innerWidth - 80, pos.left));
      var safeTop = Math.max(0, Math.min(window.innerHeight - 30, pos.top));
      el.style.left = safeLeft + "px";
      el.style.top = safeTop + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
    }
  }
  handle.classList.add("mrr-draggable-handle");
  var dragging = false;
  var startX = 0, startY = 0;
  var startLeft = 0, startTop = 0;
  var pid = null;
  marinara.on(handle, "pointerdown", function(e) {
    if (e.target.closest("button, input, select, textarea, a")) return;
    var rect = el.getBoundingClientRect();
    dragging = true;
    pid = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    try {
      handle.setPointerCapture(pid);
    } catch (err) {}
    e.preventDefault();
  });
  marinara.on(handle, "pointermove", function(e) {
    if (!dragging || e.pointerId !== pid) return;
    var nx = startLeft + (e.clientX - startX);
    var ny = startTop + (e.clientY - startY);
    nx = Math.max(0, Math.min(window.innerWidth - 80, nx));
    ny = Math.max(0, Math.min(window.innerHeight - 30, ny));
    el.style.left = nx + "px";
    el.style.top = ny + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";
  });
  function endDrag(e) {
    if (!dragging) return;
    if (e && e.pointerId !== pid) return;
    dragging = false;
    try {
      handle.releasePointerCapture(pid);
    } catch (err) {}
    var rect = el.getBoundingClientRect();
    lsSet(posKey, JSON.stringify({
      left: rect.left,
      top: rect.top
    }));
  }
  marinara.on(handle, "pointerup", endDrag);
  marinara.on(handle, "pointercancel", endDrag);
}

function makeResizable(el, sizeKey) {
  if (!el || typeof ResizeObserver === "undefined") return null;
  el.style.maxHeight = "calc(100vh - 32px)";
  var saved = safeParse(lsGet(sizeKey));
  if (saved && typeof saved.width === "number" && typeof saved.height === "number") {
    var maxW = window.innerWidth - 32;
    var maxH = window.innerHeight - 32;
    el.style.width = Math.min(saved.width, maxW) + "px";
    el.style.height = Math.min(saved.height, maxH) + "px";
  }
  var firstFire = true;
  var saveTimer = null;
  var ro = new ResizeObserver(function(entries) {
    if (firstFire) {
      firstFire = false;
      return;
    }
    var rect = entries[0].contentRect;
    var w = Math.round(rect.width);
    var h = Math.round(rect.height);
    if (!w || !h) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function() {
      lsSet(sizeKey, JSON.stringify({
        width: w,
        height: h
      }));
    }, 150);
  });
  ro.observe(el);
  return ro;
}

function makeEditableValue(parent, getCur, setCur, loF, hiF, afterChange) {
  var input = marinara.addElement(parent, "input", {
    class: "mrr-row__value mrr-row__value--editable",
    type: "number",
    value: String(getCur()),
    inputMode: "numeric"
  });
  if (!input) return null;
  marinara.on(input, "click", function(e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  });
  marinara.on(input, "change", function() {
    var n = parseInt(input.value, 10);
    if (!isFinite(n)) {
      input.value = String(getCur());
      return;
    }
    var lo = typeof loF === "function" ? loF() : loF;
    var hi = typeof hiF === "function" ? hiF() : hiF;
    if (typeof lo === "number" && n < lo) n = lo;
    if (typeof hi === "number" && n > hi) n = hi;
    setCur(n);
    input.value = String(n);
    if (afterChange) afterChange(n);
  });
  return input;
}

function addCustomSkill() {
  if (!Array.isArray(state.sheet.customSkills)) state.sheet.customSkills = [];
  state.sheet.customSkills.push({
    name: "",
    linkedAttribute: "",
    value: 0
  });
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
  var stp = marinara.addElement(parent, "span", {
    class: "mrr-stepper"
  });
  if (!stp) return null;
  var minus = marinara.addElement(stp, "button", {
    textContent: "-"
  });
  var plus = marinara.addElement(stp, "button", {
    textContent: "+"
  });
  function resolve(bound, fallback) {
    var v = typeof bound === "function" ? bound() : bound;
    return v != null ? v : fallback;
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
  if (minus) marinara.on(minus, "click", function() {
    step(-1);
  });
  if (plus) marinara.on(plus, "click", function() {
    step(1);
  });
  return stp;
}

function diceRow(parent, label, key, def) {
  var r = marinara.addElement(parent, "div", {
    class: "mrr-dice__row"
  });
  if (!r) return null;
  marinara.addElement(r, "label", {
    textContent: label
  });
  return marinara.addElement(r, "input", {
    class: "mrr-dice__input",
    type: "number",
    value: String(def),
    "data-mrr-input": key
  });
}

function diceFooter(parent, rollLabel, rollFn) {
  var btnRoll = marinara.addElement(parent, "button", {
    class: "mrr-dice__btn",
    textContent: rollLabel
  });
  var btnSend = marinara.addElement(parent, "button", {
    class: "mrr-dice__btn mrr-dice__btn--secondary mrr-dice__btn--row-spaced",
    textContent: "Send to chat"
  });
  if (btnRoll) marinara.on(btnRoll, "click", rollFn);
  if (btnSend) marinara.on(btnSend, "click", sendLastRoll);
}

function renderXpCard(parent) {
  if (!state.sheet || !state.ruleset) return;
  if (!state.sheet.xp || typeof state.sheet.xp !== "object") {
    state.sheet.xp = {
      current: 0,
      level: 1,
      next: 0,
      total: 0
    };
  }
  if (typeof state.sheet.xp.current !== "number") state.sheet.xp.current = 0;
  if (typeof state.sheet.xp.level !== "number") state.sheet.xp.level = 1;
  if (typeof state.sheet.xp.next !== "number") state.sheet.xp.next = 0;
  if (typeof state.sheet.xp.total !== "number") state.sheet.xp.total = 0;
  var resMode = state.ruleset.resolution && state.ruleset.resolution.mode;
  if (resMode !== "single-roll" && resMode !== "dice-pool") return;
  var card = marinara.addElement(parent, "div", {
    class: "mrr-xp-card"
  });
  if (!card) return;
  marinara.addElement(card, "div", {
    class: "mrr-xp-card__label",
    textContent: "EXPERIENCE"
  });
  if (resMode === "single-roll") {
    function getLevelXp(lvl) {
      var table = state.ruleset.xpTable;
      if (!Array.isArray(table) || !table.length) return 0;
      for (var i = 0; i < table.length; i++) {
        if (table[i] && table[i].level === lvl) {
          return typeof table[i].xp === "number" ? table[i].xp : 0;
        }
      }
      return 0;
    }
    function getNextXp() {
      var lvl = state.sheet.xp.level || 1;
      var nx = getLevelXp(lvl + 1);
      if (nx > 0) return nx;
      var cur = getLevelXp(lvl);
      if (cur > 0) return cur;
      return state.sheet.xp.next || 0;
    }
    function computeBarPct() {
      var cur = state.sheet.xp.current || 0;
      var nx = getNextXp();
      var lo = getLevelXp(state.sheet.xp.level || 1);
      if (nx <= lo) return 100;
      var pct = (cur - lo) / (nx - lo) * 100;
      if (pct < 0) return 0;
      if (pct > 100) return 100;
      return pct;
    }
    var row = marinara.addElement(card, "div", {
      class: "mrr-xp-card__row"
    });
    var lvlGroup = marinara.addElement(row, "div", {
      class: "mrr-xp-card__group"
    });
    marinara.addElement(lvlGroup, "div", {
      class: "mrr-xp-card__sub",
      textContent: "LEVEL"
    });
    var lvlInput = marinara.addElement(lvlGroup, "input", {
      class: "mrr-xp-card__input mrr-xp-card__input--lvl",
      type: "number",
      min: "1",
      max: "20",
      step: "1",
      value: String(state.sheet.xp.level)
    });
    var curGroup = marinara.addElement(row, "div", {
      class: "mrr-xp-card__group"
    });
    marinara.addElement(curGroup, "div", {
      class: "mrr-xp-card__sub",
      textContent: "CURRENT"
    });
    var curInput = marinara.addElement(curGroup, "input", {
      class: "mrr-xp-card__input",
      type: "number",
      min: "0",
      step: "1",
      value: String(state.sheet.xp.current)
    });
    marinara.addElement(row, "span", {
      class: "mrr-xp-card__sep",
      textContent: "/"
    });
    var nextGroup = marinara.addElement(row, "div", {
      class: "mrr-xp-card__group"
    });
    marinara.addElement(nextGroup, "div", {
      class: "mrr-xp-card__sub",
      textContent: "NEXT"
    });
    var nextDisplay = marinara.addElement(nextGroup, "div", {
      class: "mrr-xp-card__next"
    });
    if (nextDisplay) nextDisplay.textContent = String(getNextXp());
    var bar = marinara.addElement(card, "div", {
      class: "mrr-xp-card__bar"
    });
    var barFill = marinara.addElement(bar, "div", {
      class: "mrr-xp-card__bar-fill"
    });
    if (barFill) barFill.style.width = computeBarPct() + "%";
    if (lvlInput) marinara.on(lvlInput, "input", function() {
      var n = parseInt(lvlInput.value, 10);
      state.sheet.xp.level = !isNaN(n) && n >= 1 ? n : 1;
      saveSheet(state.chatId, state.sheet);
      if (nextDisplay) nextDisplay.textContent = String(getNextXp());
      if (barFill) barFill.style.width = computeBarPct() + "%";
    });
    if (curInput) marinara.on(curInput, "input", function() {
      var n = parseInt(curInput.value, 10);
      state.sheet.xp.current = !isNaN(n) && n >= 0 ? n : 0;
      saveSheet(state.chatId, state.sheet);
      if (barFill) barFill.style.width = computeBarPct() + "%";
    });
  } else {
    var poolRow = marinara.addElement(card, "div", {
      class: "mrr-xp-card__row"
    });
    var curGroupP = marinara.addElement(poolRow, "div", {
      class: "mrr-xp-card__group"
    });
    marinara.addElement(curGroupP, "div", {
      class: "mrr-xp-card__sub",
      textContent: "CURRENT"
    });
    var curInputP = marinara.addElement(curGroupP, "input", {
      class: "mrr-xp-card__input",
      type: "number",
      min: "0",
      step: "1",
      value: String(state.sheet.xp.current)
    });
    marinara.addElement(poolRow, "span", {
      class: "mrr-xp-card__sep",
      textContent: "/"
    });
    var totGroup = marinara.addElement(poolRow, "div", {
      class: "mrr-xp-card__group"
    });
    marinara.addElement(totGroup, "div", {
      class: "mrr-xp-card__sub",
      textContent: "TOTAL EARNED"
    });
    var totInput = marinara.addElement(totGroup, "input", {
      class: "mrr-xp-card__input",
      type: "number",
      min: "0",
      step: "1",
      value: String(state.sheet.xp.total)
    });
    var addBtn = marinara.addElement(poolRow, "button", {
      class: "mrr-xp-card__add",
      type: "button",
      textContent: "+1 XP"
    });
    if (curInputP) marinara.on(curInputP, "input", function() {
      var n = parseInt(curInputP.value, 10);
      state.sheet.xp.current = !isNaN(n) && n >= 0 ? n : 0;
      saveSheet(state.chatId, state.sheet);
    });
    if (totInput) marinara.on(totInput, "input", function() {
      var n = parseInt(totInput.value, 10);
      state.sheet.xp.total = !isNaN(n) && n >= 0 ? n : 0;
      saveSheet(state.chatId, state.sheet);
    });
    if (addBtn) marinara.on(addBtn, "click", function() {
      state.sheet.xp.current = (state.sheet.xp.current || 0) + 1;
      state.sheet.xp.total = (state.sheet.xp.total || 0) + 1;
      if (curInputP) curInputP.value = String(state.sheet.xp.current);
      if (totInput) totInput.value = String(state.sheet.xp.total);
      saveSheet(state.chatId, state.sheet);
    });
  }
}

function mrrP3Clamp(v, min, max) {
  if (typeof min === "number" && v < min) v = min;
  if (typeof max === "number" && v > max) v = max;
  return v;
}

function mrrP3RenderSection(parent, opts, bodyFn) {
  if (!parent) return null;
  opts = opts || {};
  var id = opts.id || "";
  var collapseMap = state.sheet && state.sheet.sectionCollapse;
  var defaultOpen = opts.defaultOpen !== false;
  var open = defaultOpen;
  if (id && collapseMap && typeof collapseMap[id] === "boolean") {
    open = !collapseMap[id];
  }
  var card = marinara.addElement(parent, "div", {
    class: "mrr-p3-section" + (open ? " mrr-p3-section--open" : "")
  });
  if (!card) return null;
  var head = marinara.addElement(card, "div", {
    class: "mrr-p3-section__head"
  });
  if (!head) return null;
  if (opts.title != null) {
    marinara.addElement(head, "span", {
      class: "mrr-p3-section__title",
      textContent: String(opts.title)
    });
  }
  if (opts.count != null) {
    marinara.addElement(head, "span", {
      class: "mrr-p3-section__count",
      textContent: String(opts.count)
    });
  }
  if (opts.actions instanceof HTMLElement) {
    var actSpan = marinara.addElement(head, "span", {
      class: "mrr-p3-section__actions"
    });
    if (actSpan) {
      actSpan.appendChild(opts.actions);
      actSpan.addEventListener("click", function(e) {
        e.stopPropagation();
      });
    }
  }
  if (opts.right instanceof HTMLElement) {
    var rt = marinara.addElement(head, "span", {
      class: "mrr-p3-section__right"
    });
    if (rt) {
      rt.appendChild(opts.right);
      rt.addEventListener("click", function(e) {
        e.stopPropagation();
      });
    }
  }
  marinara.addElement(head, "span", {
    class: "mrr-p3-section__chev",
    textContent: "›"
  });
  var body = marinara.addElement(card, "div", {
    class: "mrr-p3-section__body"
  });
  if (!body) return null;
  body.style.display = open ? "flex" : "none";
  body.style.flexDirection = "column";
  body.style.gap = "8px";
  head.addEventListener("click", function() {
    if (!id) return;
    if (!state.sheet.sectionCollapse) state.sheet.sectionCollapse = {};
    open = !open;
    state.sheet.sectionCollapse[id] = !open;
    if (card.classList) {
      if (open) card.classList.add("mrr-p3-section--open"); else card.classList.remove("mrr-p3-section--open");
    }
    body.style.display = open ? "flex" : "none";
    saveSheet(state.chatId, state.sheet);
  });
  if (typeof bodyFn === "function") {
    try {
      bodyFn(body);
    } catch (e) {
      var errMsg = e && e.message ? e.message : String(e);
      warn("mrrP3 renderSection bodyFn failed for id='" + id + "':", errMsg, e && e.stack);
      var errEl = marinara.addElement(body, "div", {
        class: "mrr-p3-section__error"
      });
      if (errEl) {
        errEl.textContent = "⚠ " + errMsg;
        errEl.style.color = "var(--mrr-warning)";
        errEl.style.fontFamily = "var(--mrr-mono)";
        errEl.style.fontSize = "11px";
        errEl.style.padding = "8px 12px";
      }
    }
  }
  return {
    card,
    head,
    body
  };
}

function mrrP3RenderStepper(parent, opts) {
  if (!parent || !opts) return null;
  var span = marinara.addElement(parent, "span", {
    class: "mrr-p3-stepper"
  });
  if (!span) return null;
  var minus = marinara.addElement(span, "button", {
    type: "button",
    textContent: "−"
  });
  var plus = marinara.addElement(span, "button", {
    type: "button",
    textContent: "+"
  });
  if (minus) {
    minus.addEventListener("click", function(e) {
      e.preventDefault();
      var v = (typeof opts.value === "number" ? opts.value : 0) - 1;
      if (typeof opts.onChange === "function") opts.onChange(mrrP3Clamp(v, opts.min, opts.max));
    });
  }
  if (plus) {
    plus.addEventListener("click", function(e) {
      e.preventDefault();
      var v = (typeof opts.value === "number" ? opts.value : 0) + 1;
      if (typeof opts.onChange === "function") opts.onChange(mrrP3Clamp(v, opts.min, opts.max));
    });
  }
  return {
    el: span,
    minus,
    plus
  };
}

function mrrP3RenderAttrRow(parent, opts) {
  if (!parent || !opts) return null;
  var row = marinara.addElement(parent, "div", {
    class: "mrr-p3-row mrr-p3-row--attr"
  });
  if (!row) return null;
  var nameSlot = marinara.addElement(row, "div", {
    class: "mrr-p3-row__name"
  });
  if (nameSlot) {
    nameSlot.textContent = String(opts.name || "");
    if (opts.abbr) {
      marinara.addElement(nameSlot, "span", {
        class: "mrr-p3-row__abbr",
        textContent: String(opts.abbr)
      });
    }
  }
  var input = marinara.addElement(row, "input", {
    class: "mrr-p3-row__val",
    type: "number"
  });
  if (input) {
    input.value = typeof opts.value === "number" ? String(opts.value) : "";
    input.addEventListener("change", function() {
      var n = parseInt(input.value, 10);
      if (isNaN(n)) n = 0;
      if (typeof opts.onChange === "function") opts.onChange(mrrP3Clamp(n, opts.min, opts.max));
    });
  }
  if (opts.modifier !== undefined && opts.modifier !== null) {
    marinara.addElement(row, "div", {
      class: "mrr-p3-row__mod",
      textContent: (opts.modifier >= 0 ? "+" : "") + String(opts.modifier)
    });
  }
  mrrP3RenderStepper(row, {
    value: opts.value,
    min: opts.min,
    max: opts.max,
    onChange: opts.onChange
  });
  var roll = marinara.addElement(row, "button", {
    type: "button",
    class: "mrr-p3-row__roll mrr-p3-row__roll--sm",
    textContent: "Roll"
  });
  if (roll && typeof opts.onRoll === "function") {
    roll.addEventListener("click", function(e) {
      e.preventDefault();
      opts.onRoll(opts.name, opts.value, opts.modifier);
    });
  }
  return {
    row,
    input,
    roll
  };
}

function mrrP3RenderSkillRow(parent, opts) {
  if (!parent || !opts || !opts.skill) return null;
  var sign = function(n) {
    return (n >= 0 ? "+" : "") + n;
  };
  var attrMod = typeof opts.attrMod === "number" ? opts.attrMod : 0;
  var gearBonus = typeof opts.gearBonus === "number" ? opts.gearBonus : 0;
  var tierBonus = typeof opts.tierBonus === "number" ? opts.tierBonus : 0;
  var value = typeof opts.value === "number" ? opts.value : 0;
  var totalBonus = opts.autoCalc ? attrMod + tierBonus + gearBonus + value : attrMod + value + gearBonus;
  var row = marinara.addElement(parent, "div", {
    class: "mrr-p3-row mrr-p3-row--skill"
  });
  if (!row) return null;
  var main = marinara.addElement(row, "div", {
    class: "mrr-p3-row__main"
  });
  if (!main) return null;
  var nameSlot = marinara.addElement(main, "div", {
    class: "mrr-p3-row__name"
  });
  if (nameSlot) {
    nameSlot.textContent = String(opts.skill.name || "");
    if (opts.skill.attr) {
      marinara.addElement(nameSlot, "span", {
        class: "mrr-p3-row__abbr",
        textContent: String(opts.skill.attr)
      });
    }
    if (opts.kindLabel) {
      marinara.addElement(nameSlot, "span", {
        class: "mrr-p3-row__kind",
        textContent: String(opts.kindLabel)
      });
    }
    if (gearBonus !== 0) {
      marinara.addElement(nameSlot, "span", {
        class: "mrr-p3-row__gear",
        title: "Gear bonus " + sign(gearBonus),
        textContent: sign(gearBonus)
      });
    }
  }
  var editor = null;
  var specToggle = null;
  if (opts.allowSpecialties && typeof opts.onAddSpecialty === "function") {
    specToggle = marinara.addElement(nameSlot, "button", {
      type: "button",
      class: "mrr-p3-row__spec-toggle",
      title: "Add a specialty"
    });
    if (specToggle) {
      var specCount = Array.isArray(opts.specialties) ? opts.specialties.length : 0;
      specToggle.textContent = specCount > 0 ? "★ " + specCount : "+ spec";
    }
  }
  if (typeof opts.onDelete === "function") {
    var del = marinara.addElement(nameSlot, "button", {
      type: "button",
      class: "mrr-p3-row__del",
      title: "Remove this entry",
      textContent: "×"
    });
    if (del) {
      del.addEventListener("click", function(e) {
        e.stopPropagation();
        opts.onDelete();
      });
    }
  }
  if (Array.isArray(opts.specialties) && opts.specialties.length > 0) {
    var specsRow = marinara.addElement(main, "div", {
      class: "mrr-p3-row__specs"
    });
    if (specsRow) {
      opts.specialties.forEach(function(sp, i) {
        if (!sp) return;
        var dice = typeof sp.dice === "number" ? sp.dice : typeof opts.specialtyBonus === "number" ? opts.specialtyBonus : 1;
        var chip = marinara.addElement(specsRow, "button", {
          type: "button",
          class: "mrr-p3-spec-chip",
          title: "Roll with " + String(sp.name || "") + " (+" + dice + ")"
        });
        if (!chip) return;
        marinara.addElement(chip, "span", {
          class: "mrr-p3-spec-chip__name",
          textContent: String(sp.name || "")
        });
        marinara.addElement(chip, "span", {
          class: "mrr-p3-spec-chip__dice",
          textContent: "+" + dice
        });
        chip.addEventListener("click", function() {
          if (typeof opts.onRoll === "function") {
            opts.onRoll(opts.skill.name + " (" + String(sp.name || "") + ")", value + gearBonus + dice, attrMod);
          }
        });
        if (typeof opts.onRemoveSpecialty === "function") {
          var x = marinara.addElement(chip, "span", {
            class: "mrr-p3-spec-chip__x",
            textContent: "×"
          });
          if (x) {
            x.addEventListener("click", function(e) {
              e.stopPropagation();
              opts.onRemoveSpecialty(i);
            });
          }
        }
      });
    }
  }
  if (opts.allowSpecialties && typeof opts.onAddSpecialty === "function") {
    editor = marinara.addElement(main, "div", {
      class: "mrr-p3-row__spec-editor",
      style: "display: none"
    });
    if (editor) {
      var specInput = marinara.addElement(editor, "input", {
        class: "mrr-p3-row__spec-input",
        type: "text",
        placeholder: "Specialty name (e.g. Daiklaves, Thrones, Crowds)"
      });
      var addBtn = marinara.addElement(editor, "button", {
        type: "button",
        class: "mrr-p3-row__spec-add",
        textContent: "Add"
      });
      var doneBtn = marinara.addElement(editor, "button", {
        type: "button",
        class: "mrr-p3-row__spec-done",
        textContent: "Done"
      });
      var commitSpec = function() {
        var v = specInput && typeof specInput.value === "string" ? specInput.value.trim() : "";
        if (!v) return;
        opts.onAddSpecialty({
          name: v,
          dice: typeof opts.specialtyBonus === "number" ? opts.specialtyBonus : 1
        });
        if (specInput) specInput.value = "";
      };
      if (specInput) {
        specInput.addEventListener("keydown", function(e) {
          if (e.key === "Enter") {
            e.preventDefault();
            commitSpec();
          }
        });
      }
      if (addBtn) {
        addBtn.addEventListener("click", function(e) {
          e.preventDefault();
          commitSpec();
        });
      }
      if (doneBtn) {
        doneBtn.addEventListener("click", function(e) {
          e.preventDefault();
          editor.style.display = "none";
        });
      }
    }
    if (specToggle) {
      specToggle.addEventListener("click", function(e) {
        e.stopPropagation();
        if (!editor) return;
        editor.style.display = editor.style.display === "none" ? "" : "none";
      });
    }
  }
  var tier = opts.tier || Array.isArray(opts.tiers) && opts.tiers[0] || "";
  var tiers = Array.isArray(opts.tiers) ? opts.tiers : [];
  var tierTitle = (opts.tierLabel && opts.tierLabel[tier] || String(tier)) + " — click to cycle proficiency";
  var tierPill = marinara.addElement(row, "button", {
    type: "button",
    class: "mrr-p3-tier mrr-p3-tier--" + String(tier),
    textContent: String(tier),
    title: tierTitle
  });
  if (tierPill && typeof opts.onTier === "function" && tiers.length > 0) {
    tierPill.addEventListener("click", function(e) {
      e.preventDefault();
      var idx = tiers.indexOf(tier);
      var nextTier = tiers[(idx + 1) % tiers.length];
      opts.onTier(nextTier);
    });
  }
  if (opts.autoCalc) {
    var pill = marinara.addElement(row, "span", {
      class: "mrr-p3-row__val mrr-p3-row__val--auto mrr-p3-save__bonus",
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
      class: "mrr-p3-row__val",
      type: "number"
    });
    if (manual) {
      manual.value = String(value);
      manual.addEventListener("change", function() {
        var n = parseInt(manual.value, 10);
        if (isNaN(n)) n = 0;
        if (typeof opts.onValue === "function") opts.onValue(n);
      });
    }
  }
  var rollBtn = marinara.addElement(row, "button", {
    type: "button",
    class: "mrr-p3-row__roll",
    textContent: "Roll"
  });
  if (rollBtn && typeof opts.onRoll === "function") {
    rollBtn.addEventListener("click", function(e) {
      e.preventDefault();
      if (opts.autoCalc) opts.onRoll(opts.skill.name, totalBonus, 0); else opts.onRoll(opts.skill.name, value + gearBonus, attrMod);
    });
  }
  return {
    row
  };
}

function mrrP3RenderSaveRow(parent, opts) {
  if (!parent || !opts || !opts.save) return null;
  var row = marinara.addElement(parent, "div", {
    class: "mrr-p3-row mrr-p3-row--save"
  });
  if (!row) return null;
  var totalBonus = typeof opts.totalBonus === "number" ? opts.totalBonus : 0;
  var attrMod = typeof opts.attrMod === "number" ? opts.attrMod : 0;
  var sign = totalBonus >= 0 ? "+" : "";
  var nameSlot = marinara.addElement(row, "div", {
    class: "mrr-p3-row__name"
  });
  if (nameSlot) {
    nameSlot.textContent = String(opts.save.name || "");
    if (opts.save.attr) {
      marinara.addElement(nameSlot, "span", {
        class: "mrr-p3-row__abbr",
        textContent: String(opts.save.attr)
      });
    }
  }
  var tier = opts.tier || "";
  var tiers = Array.isArray(opts.tiers) ? opts.tiers : [];
  var tierTitle = (opts.tierLabel && opts.tierLabel[tier] || String(tier)) + " — click to cycle";
  var tierPill = marinara.addElement(row, "button", {
    type: "button",
    class: "mrr-p3-tier mrr-p3-tier--" + String(tier),
    textContent: String(tier),
    title: tierTitle
  });
  if (tierPill && typeof opts.onTier === "function" && tiers.length > 0) {
    tierPill.addEventListener("click", function(e) {
      e.preventDefault();
      var idx = tiers.indexOf(tier);
      var nextTier = tiers[(idx + 1) % tiers.length];
      opts.onTier(nextTier);
    });
  }
  var pill = marinara.addElement(row, "span", {
    class: "mrr-p3-row__val mrr-p3-row__val--auto mrr-p3-save__bonus",
    textContent: sign + String(totalBonus)
  });
  if (pill && opts.save.attr) {
    pill.title = opts.save.attr + " mod " + (attrMod >= 0 ? "+" : "") + attrMod + " + proficiency";
  }
  var rollBtn = marinara.addElement(row, "button", {
    type: "button",
    class: "mrr-p3-row__roll",
    textContent: "Save"
  });
  if (rollBtn && typeof opts.onRoll === "function") {
    rollBtn.addEventListener("click", function(e) {
      e.preventDefault();
      opts.onRoll(String(opts.save.name || "Save") + " save", totalBonus, 0);
    });
  }
  return {
    row
  };
}

function mrrP3RenderBar(parent, opts) {
  if (!parent || !opts) return null;
  var current = typeof opts.current === "number" ? opts.current : 0;
  var max = typeof opts.max === "number" ? opts.max : 0;
  var pct = max > 0 ? mrrP3Clamp(current / max * 100, 0, 100) : 0;
  var ratio = max > 0 ? current / max : 0;
  var auto = ratio < .3 ? "bad" : ratio < .65 ? "warn" : "ok";
  var fill = opts.fillVariant || auto;
  var bar = marinara.addElement(parent, "div", {
    class: "mrr-p3-bar"
  });
  if (!bar) return null;
  var top = marinara.addElement(bar, "div", {
    class: "mrr-p3-bar__top"
  });
  if (top) {
    marinara.addElement(top, "span", {
      class: "mrr-p3-bar__name",
      textContent: String(opts.name || "")
    });
    var values = marinara.addElement(top, "span", {
      class: "mrr-p3-bar__values"
    });
    if (values) {
      var curIn = marinara.addElement(values, "input", {
        class: "mrr-p3-bar__val-input",
        type: "number"
      });
      if (curIn) {
        curIn.value = String(current);
        curIn.addEventListener("change", function() {
          var n = parseInt(curIn.value, 10);
          if (isNaN(n)) n = 0;
          if (typeof opts.onCurrent === "function") opts.onCurrent(mrrP3Clamp(n, 0, max));
        });
      }
      marinara.addElement(values, "span", {
        class: "mrr-p3-bar__sep",
        textContent: "/"
      });
      var maxIn = marinara.addElement(values, "input", {
        class: "mrr-p3-bar__val-input",
        type: "number"
      });
      if (maxIn) {
        maxIn.value = String(max);
        maxIn.addEventListener("change", function() {
          var n = parseInt(maxIn.value, 10);
          if (isNaN(n)) n = 0;
          if (typeof opts.onMax === "function") opts.onMax(n);
        });
      }
    }
  }
  var trackEl = marinara.addElement(bar, "div", {
    class: "mrr-p3-bar__track"
  });
  if (trackEl) {
    var fillEl = marinara.addElement(trackEl, "div", {
      class: "mrr-p3-bar__fill mrr-p3-bar__fill--" + fill
    });
    if (fillEl) fillEl.style.width = pct + "%";
  }
  if (Array.isArray(opts.quick) && opts.quick.length > 0) {
    var quickRow = marinara.addElement(bar, "div", {
      class: "mrr-p3-bar__quick"
    });
    if (quickRow) {
      opts.quick.forEach(function(q) {
        if (!q || typeof q.delta !== "number") return;
        var btn = marinara.addElement(quickRow, "button", {
          type: "button",
          textContent: String(q.label != null ? q.label : "")
        });
        if (btn) {
          btn.addEventListener("click", function(e) {
            e.preventDefault();
            if (typeof opts.onCurrent === "function") {
              opts.onCurrent(mrrP3Clamp(current + q.delta, 0, max));
            }
          });
        }
      });
    }
  }
  return {
    bar
  };
}

function mrrP3RenderDamageTrack(parent, opts) {
  if (!parent || !opts || !opts.track) return null;
  var track = opts.track;
  var levels = Array.isArray(track.levels) ? track.levels : [];
  var filled = Array.isArray(track.filled) ? track.filled : [];
  var counts = {
    B: 0,
    L: 0,
    A: 0
  };
  filled.forEach(function(f) {
    if (f && f.type && counts[f.type] != null) counts[f.type] += 1;
  });
  var bar = marinara.addElement(parent, "div", {
    class: "mrr-p3-bar mrr-p3-bar--damage"
  });
  if (!bar) return null;
  var top = marinara.addElement(bar, "div", {
    class: "mrr-p3-bar__top"
  });
  if (top) {
    marinara.addElement(top, "span", {
      class: "mrr-p3-bar__name",
      textContent: String(track.name || "")
    });
    var summary = "";
    if (counts.B) summary += counts.B + "B ";
    if (counts.L) summary += counts.L + "L ";
    if (counts.A) summary += counts.A + "A";
    if (!counts.B && !counts.L && !counts.A) summary = "B · L · A";
    marinara.addElement(top, "span", {
      class: "mrr-p3-bar__values mrr-p3-bar__values--track",
      textContent: summary
    });
  }
  var trackEl = marinara.addElement(bar, "div", {
    class: "mrr-p3-track"
  });
  if (trackEl) {
    levels.forEach(function(penalty, i) {
      var f = filled[i];
      var cls = "mrr-p3-cell" + (f && f.type ? " mrr-p3-cell--" + f.type : "");
      var cell = marinara.addElement(trackEl, "button", {
        type: "button",
        class: cls,
        title: String(penalty) + " — click cycles B→L→A→clear",
        textContent: f && f.type ? f.type : String(penalty)
      });
      if (cell && typeof opts.onCellClick === "function") {
        cell.addEventListener("click", function(e) {
          e.preventDefault();
          opts.onCellClick(i);
        });
      }
    });
  }
  var tools = marinara.addElement(bar, "div", {
    class: "mrr-p3-track-tools"
  });
  if (tools) {
    var addGroup = marinara.addElement(tools, "div", {
      class: "mrr-p3-track-tools__group"
    });
    if (addGroup) {
      marinara.addElement(addGroup, "span", {
        class: "mrr-p3-track-tools__label",
        textContent: "add"
      });
      [ "-0", "-1", "-2" ].forEach(function(label) {
        var b = marinara.addElement(addGroup, "button", {
          type: "button",
          class: "mrr-p3-track-tools__add",
          title: "Add a " + label + " box",
          textContent: label
        });
        if (b && typeof opts.onAddBox === "function") {
          b.addEventListener("click", function(e) {
            e.preventDefault();
            opts.onAddBox(label);
          });
        }
      });
      var minusBtn = marinara.addElement(addGroup, "button", {
        type: "button",
        class: "mrr-p3-track-tools__add",
        title: "Remove last (non-Inc) box",
        textContent: "−"
      });
      if (minusBtn && typeof opts.onRemoveBox === "function") {
        minusBtn.addEventListener("click", function(e) {
          e.preventDefault();
          opts.onRemoveBox();
        });
      }
    }
    var healGroup = marinara.addElement(tools, "div", {
      class: "mrr-p3-track-tools__group"
    });
    if (healGroup) {
      var anyDamage = !!(counts.B || counts.L || counts.A);
      var healWorst = marinara.addElement(healGroup, "button", {
        type: "button",
        class: "mrr-p3-track-tools__heal",
        title: "Heal worst-severity wound",
        textContent: "Heal worst"
      });
      if (healWorst) {
        healWorst.disabled = !anyDamage;
        if (typeof opts.onHeal === "function") {
          healWorst.addEventListener("click", function(e) {
            e.preventDefault();
            opts.onHeal("worst");
          });
        }
      }
      var healAll = marinara.addElement(healGroup, "button", {
        type: "button",
        class: "mrr-p3-track-tools__heal",
        title: "Clear all damage",
        textContent: "Heal all"
      });
      if (healAll) {
        healAll.disabled = !anyDamage;
        if (typeof opts.onHeal === "function") {
          healAll.addEventListener("click", function(e) {
            e.preventDefault();
            opts.onHeal("all");
          });
        }
      }
    }
  }
  return {
    bar
  };
}

function mrrP3CreatePanel(parent, opts) {
  if (!parent) return null;
  opts = opts || {};
  var defPos = opts.defaultPos || {
    x: 16,
    y: 64
  };
  var defSize = opts.defaultSize || {
    w: 360,
    h: 640
  };
  var minSize = opts.minSize || {
    w: 280,
    h: 240
  };
  var storageKey = opts.storageKey || "";
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
    try {
      localStorage.setItem(storageKey, JSON.stringify(box));
    } catch (e) {}
  }
  function applyBox() {
    if (!panel) return;
    panel.style.left = box.x + "px";
    panel.style.top = box.y + "px";
    panel.style.width = box.w + "px";
    panel.style.height = box.h + "px";
  }
  var className = "mrr-p3-panel" + (opts.className ? " " + opts.className : "");
  var panel = marinara.addElement(parent, "div", {
    class: className
  });
  if (!panel) return null;
  var head = marinara.addElement(panel, "div", {
    class: "mrr-p3-panel__head"
  });
  if (head) {
    if (opts.title) {
      marinara.addElement(head, "span", {
        class: "mrr-p3-panel__title",
        textContent: String(opts.title)
      });
    }
    if (opts.titleMeta) {
      marinara.addElement(head, "span", {
        class: "mrr-p3-panel__title-meta",
        textContent: String(opts.titleMeta)
      });
    }
    if (typeof opts.onClose === "function") {
      var close = marinara.addElement(head, "button", {
        type: "button",
        class: "mrr-p3-panel__close",
        title: "Close",
        textContent: "×"
      });
      if (close) {
        close.addEventListener("click", function(e) {
          e.preventDefault();
          e.stopPropagation();
          opts.onClose();
        });
      }
    }
  }
  var body = marinara.addElement(panel, "div", {
    class: "mrr-p3-panel__body"
  });
  var dirs = [ "n", "s", "e", "w", "ne", "nw", "se", "sw" ];
  for (var di = 0; di < dirs.length; di++) {
    (function(d) {
      var rh = marinara.addElement(panel, "div", {
        class: "mrr-p3-panel__resize mrr-p3-panel__resize--" + d
      });
      if (!rh) return;
      if (d === "se") {
        rh.innerHTML = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M11 1 L1 11 M11 5 L5 11 M11 9 L9 11" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round"/></svg>';
      }
      rh.addEventListener("pointerdown", makeResizeHandler(d));
    })(dirs[di]);
  }
  var dragStart = null;
  function onDragDown(e) {
    var t = e.target;
    if (t && t.closest && t.closest("button, input, select, textarea")) return;
    dragStart = {
      px: e.clientX,
      py: e.clientY,
      x: box.x,
      y: box.y
    };
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
  function makeResizeHandler(dir) {
    return function(e) {
      e.preventDefault();
      e.stopPropagation();
      var startBox = {
        px: e.clientX,
        py: e.clientY,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h
      };
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
        box.x = x;
        box.y = y;
        box.w = w;
        box.h = h;
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
  function dispose() {
    window.removeEventListener("resize", onWindowResize);
    if (head) head.removeEventListener("pointerdown", onDragDown);
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
  }
  applyBox();
  return {
    panel,
    head,
    body,
    dispose
  };
}

function mrrP3RenderSheet() {
  if (!state.ruleset) return;
  barRefreshers.length = 0;
  derivedBonusRefreshers.length = 0;
  if (state.sheetResizeObserver) {
    try {
      state.sheetResizeObserver.disconnect();
    } catch (e) {}
    state.sheetResizeObserver = null;
  }
  if (state.mountEl && state.mountEl.parentNode) state.mountEl.parentNode.removeChild(state.mountEl);
  var host = findSheetContainer();
  var floating = false;
  if (!host) {
    state.mountEl = marinara.addElement(document.body, "div", {
      class: "mrr-sheet mrr-sheet--floating"
    });
    floating = true;
  } else {
    hideBuiltInAttributesPanel(host);
    state.mountEl = marinara.addElement(host, "div", {
      class: "mrr-sheet"
    });
  }
  if (!state.mountEl) return;
  mrrRenderWarnStrip();
  mrrRenderContinueOffer();
  var densityPref = state.sheet && state.sheet.density || "cozy";
  state.mountEl.setAttribute("data-density", densityPref);
  renderSheetHeader(state.mountEl);
  if (floating) {
    var sheetHeader = state.mountEl.querySelector(".mrr-sheet__header");
    if (sheetHeader) makeDraggable(state.mountEl, sheetHeader, "mrr-sheet-pos");
    state.sheetResizeObserver = makeResizable(state.mountEl, LS_SHEET_SIZE);
  }
  renderXpCard(state.mountEl);
  var sections;
  if (state.ruleset.sections && Array.isArray(state.ruleset.sections.order) && state.ruleset.sections.order.length) {
    sections = state.ruleset.sections.order;
  } else if (state.ruleset.sheetSections && state.ruleset.sheetSections.length) {
    sections = state.ruleset.sheetSections;
  } else {
    sections = [ "attributes", "skills", "derived", "states" ];
  }
  if (state.ruleset.sections && Array.isArray(state.ruleset.sections.hidden) && state.ruleset.sections.hidden.length) {
    var hiddenSet = {};
    state.ruleset.sections.hidden.forEach(function(h) {
      if (typeof h === "string" && h.indexOf(":") === -1) hiddenSet[h] = true;
    });
    sections = sections.filter(function(sec) {
      return !hiddenSet[sec];
    });
  }
  var attrsRendered = false;
  sections.forEach(function(sec) {
    if (sec === "attributes") {
      mrrP3RenderAttributesSection(state.mountEl);
      attrsRendered = true;
    } else if (sec === "resources") mrrP3RenderResourcesSection(state.mountEl); else if (sec === "morality") mrrP3RenderMoralitySection(state.mountEl); else if (sec === "skills") mrrP3RenderSkillsSection(state.mountEl); else if (sec === "saves") mrrP3RenderSavesSection(state.mountEl); else if (sec === "derived") mrrP3RenderDerivedSection(state.mountEl); else if (sec === "states") mrrP3RenderStatesSection(state.mountEl); else if (sec === "conditions") mrrP3RenderConditionsSection(state.mountEl); else if (sec === "intimacies") mrrP3RenderIntimaciesSection(state.mountEl); else if (sec === "backgrounds") mrrP3RenderBackgroundsSection(state.mountEl); else if (sec === "meritsFlaws") mrrP3RenderMeritsFlawsSection(state.mountEl); else if (sec === "inventory") mrrP3RenderInventorySection(state.mountEl); else if (sec === "abilities") mrrP3RenderAbilitiesSection(state.mountEl);
  });
  if (!attrsRendered && Array.isArray(state.ruleset.attributes) && state.ruleset.attributes.length) {
    mrrP3RenderAttributesSection(state.mountEl);
  }
  if (state.ruleset.abilities && Array.isArray(state.ruleset.abilities.categories) && sections.indexOf("abilities") === -1) {
    renderAbilitiesSection(state.mountEl);
  }
  if (Array.isArray(state.ruleset.conditions) && state.ruleset.conditions.length && sections.indexOf("conditions") === -1) {
    renderConditions(state.mountEl);
  }
  var actions = marinara.addElement(state.mountEl, "div", {
    class: "mrr-section"
  });
  if (actions) {
    var btnRoll = marinara.addElement(actions, "button", {
      class: "mrr-dice__btn",
      textContent: "Open dice widget"
    });
    if (btnRoll) marinara.on(btnRoll, "click", function() {
      showDice(true);
    });
    var currentDensity = state.sheet && state.sheet.density || "cozy";
    var densityGroup = marinara.addElement(actions, "div", {
      class: "mrr-density-toggle",
      role: "group",
      "aria-label": "Sheet density"
    });
    if (densityGroup) {
      marinara.addElement(densityGroup, "span", {
        class: "mrr-density-toggle__label",
        textContent: "Density"
      });
      [ "compact", "cozy", "roomy" ].forEach(function(mode) {
        var btn = marinara.addElement(densityGroup, "button", {
          type: "button",
          class: "mrr-density-toggle__btn",
          "aria-pressed": mode === currentDensity ? "true" : "false",
          "data-density-mode": mode,
          textContent: mode
        });
        if (!btn) return;
        marinara.on(btn, "click", function() {
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

var mrr_resourceRenderers = {};

function mrrResolveResourceMax(resource, ctx) {
  if (!resource) return 0;
  if (typeof resource.stateName === "string" && resource.stateName) {
    if (state.sheet && state.sheet.derivedMax && typeof state.sheet.derivedMax[resource.stateName] === "number" && state.sheet.derivedMax[resource.stateName] > 0) {
      return state.sheet.derivedMax[resource.stateName];
    }
    if (typeof resource.max === "number") return resource.max;
    if (typeof resource.max === "string" && resource.max) {
      var vState = evalFormula(resource.max, ctx);
      if (typeof vState === "number" && isFinite(vState)) return Math.max(0, Math.floor(vState));
    }
    var currentState = state.sheet && state.sheet.derived && typeof state.sheet.derived[resource.stateName] === "number" ? state.sheet.derived[resource.stateName] : 0;
    return Math.max(DEFAULT_BAR_MAX, currentState);
  }
  if (typeof resource.max === "number") return resource.max;
  if (typeof resource.max === "string" && resource.max) {
    var v = evalFormula(resource.max, ctx);
    return typeof v === "number" && isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  }
  return 0;
}

function mrrResolveResourceDefaultCurrent(resource, ctx, max) {
  if (!resource) return 0;
  if (typeof resource.current === "number") return resource.current;
  if (typeof resource.current === "string" && resource.current) {
    var v = evalFormula(resource.current, ctx);
    return typeof v === "number" && isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  }
  return typeof max === "number" ? max : 0;
}

function mrrGetResourceCurrent(resource, ctx) {
  if (!state.sheet) return 0;
  if (!state.sheet.resources || typeof state.sheet.resources !== "object") {
    state.sheet.resources = {};
  }
  var id = resource && resource.id;
  if (!id) return 0;
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
  if (pct < .3) return "bad";
  if (pct < .65) return "warn";
  return "ok";
}

function mrrRenderResourceQuickButtons(parent, resource, current, max) {
  if (!parent || !resource || !Array.isArray(resource.quickButtons) || !resource.quickButtons.length) return;
  var row = marinara.addElement(parent, "div", {
    class: "mrr-resource__quick"
  });
  if (!row) return;
  resource.quickButtons.forEach(function(qb) {
    if (!qb || typeof qb.label !== "string") return;
    var btn = marinara.addElement(row, "button", {
      type: "button",
      class: "mrr-resource__quick-btn",
      textContent: qb.label
    });
    if (!btn) return;
    marinara.on(btn, "click", function() {
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
  var pct = max > 0 ? Math.max(0, Math.min(100, current / max * 100)) : 0;
  var values = marinara.addElement(parent, "div", {
    class: "mrr-resource__values"
  });
  if (values) {
    var curInput = marinara.addElement(values, "input", {
      class: "mrr-resource__val-input",
      type: "number",
      min: "0",
      value: String(current)
    });
    marinara.addElement(values, "span", {
      class: "mrr-resource__sep",
      textContent: "/"
    });
    marinara.addElement(values, "span", {
      class: "mrr-resource__val",
      textContent: String(max)
    });
    if (curInput) marinara.on(curInput, "change", function() {
      var n = parseInt(curInput.value, 10);
      if (isNaN(n)) n = 0;
      mrrSetResourceCurrent(resource, mrrResourceClamp(n, 0, max));
      renderSheet();
    });
  }
  var bar = marinara.addElement(parent, "div", {
    class: "mrr-resource__bar"
  });
  if (bar) {
    var fill = marinara.addElement(bar, "div", {
      class: "mrr-resource__bar-fill mrr-resource__bar-fill--" + color
    });
    if (fill) fill.style.width = pct + "%";
  }
  mrrRenderResourceQuickButtons(parent, resource, current, max);
}

function mrrResolveResourceDie(resource) {
  var fallback = typeof resource.die === "string" && resource.die ? resource.die : "d6";
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
  var values = marinara.addElement(parent, "div", {
    class: "mrr-resource__values"
  });
  if (values) {
    marinara.addElement(values, "span", {
      class: "mrr-resource__val",
      textContent: String(current)
    });
    marinara.addElement(values, "span", {
      class: "mrr-resource__sep",
      textContent: "/"
    });
    marinara.addElement(values, "span", {
      class: "mrr-resource__val",
      textContent: String(max)
    });
    marinara.addElement(values, "span", {
      class: "mrr-resource__sep",
      textContent: dieLabel
    });
  }
  var dice = marinara.addElement(parent, "div", {
    class: "mrr-resource__dice"
  });
  if (dice) {
    for (var i = 0; i < max; i++) {
      var spent = i >= current;
      var die = marinara.addElement(dice, "button", {
        type: "button",
        class: "mrr-resource__die" + (spent ? " mrr-resource__die--spent" : ""),
        textContent: dieLabel
      });
      if (!die || spent) continue;
      marinara.on(die, "click", function() {
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
  var counter = marinara.addElement(parent, "div", {
    class: "mrr-resource__counter"
  });
  if (counter) {
    var dec = marinara.addElement(counter, "button", {
      type: "button",
      class: "mrr-resource__step",
      textContent: "−"
    });
    if (dec && current <= 0) dec.disabled = true;
    var curInput = marinara.addElement(counter, "input", {
      class: "mrr-resource__val-input",
      type: "number",
      min: "0",
      value: String(current)
    });
    marinara.addElement(counter, "span", {
      class: "mrr-resource__sep",
      textContent: "/"
    });
    marinara.addElement(counter, "span", {
      class: "mrr-resource__val",
      textContent: String(max)
    });
    var inc = marinara.addElement(counter, "button", {
      type: "button",
      class: "mrr-resource__step",
      textContent: "+"
    });
    if (inc && current >= max) inc.disabled = true;
    if (dec) marinara.on(dec, "click", function() {
      mrrSetResourceCurrent(resource, mrrResourceClamp(current - 1, 0, max));
      renderSheet();
    });
    if (inc) marinara.on(inc, "click", function() {
      mrrSetResourceCurrent(resource, mrrResourceClamp(current + 1, 0, max));
      renderSheet();
    });
    if (curInput) marinara.on(curInput, "change", function() {
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
  var values = marinara.addElement(parent, "div", {
    class: "mrr-resource__values"
  });
  if (values) {
    var curInput = marinara.addElement(values, "input", {
      class: "mrr-resource__val-input",
      type: "number",
      min: "0",
      value: String(current)
    });
    marinara.addElement(values, "span", {
      class: "mrr-resource__sep",
      textContent: "/"
    });
    marinara.addElement(values, "span", {
      class: "mrr-resource__val",
      textContent: String(max)
    });
    if (curInput) marinara.on(curInput, "change", function() {
      var n = parseInt(curInput.value, 10);
      if (isNaN(n)) n = 0;
      mrrSetResourceCurrent(resource, mrrResourceClamp(n, 0, max));
      renderSheet();
    });
  }
  mrrRenderResourceQuickButtons(parent, resource, current, max);
}

function mrrRenderResourceStateBanner(parent, resource) {
  var stateRef = typeof resource.stateRef === "string" ? resource.stateRef : null;
  if (!stateRef) {
    mrrRenderResourcePlaceholder(parent, resource, "(missing stateRef)");
    return;
  }
  var stateDef = null;
  if (Array.isArray(state.ruleset.states)) {
    for (var i = 0; i < state.ruleset.states.length; i++) {
      var s = state.ruleset.states[i];
      if (s && s.name === stateRef) {
        stateDef = s;
        break;
      }
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
  function slug(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  var wrap = marinara.addElement(parent, "div", {
    class: "mrr-state-banner"
  });
  if (!wrap) return;
  var pill = marinara.addElement(wrap, "button", {
    class: "mrr-state-banner__pill mrr-state-banner__pill--" + slug(current),
    type: "button",
    title: "Click to cycle " + stateRef,
    textContent: current
  });
  if (!pill) return;
  var sel = marinara.addElement(wrap, "select", {
    class: "mrr-state-banner__select"
  });
  if (sel) {
    stateDef.values.forEach(function(v) {
      var opt = document.createElement("option");
      opt.value = v.label;
      opt.textContent = v.label;
      if (v.label === current) opt.selected = true;
      sel.appendChild(opt);
    });
    marinara.on(sel, "change", function() {
      state.sheet.states[stateRef] = sel.value;
      saveSheet(state.chatId, state.sheet);
      pill.textContent = sel.value;
      pill.className = "mrr-state-banner__pill mrr-state-banner__pill--" + slug(sel.value);
    });
  }
  marinara.on(pill, "click", function(e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    var labels = stateDef.values.map(function(v) {
      return v.label;
    });
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
  var box = marinara.addElement(parent, "div", {
    class: "mrr-resource__placeholder"
  });
  if (!box) return;
  marinara.addElement(box, "span", {
    textContent: "Custom component "
  });
  marinara.addElement(box, "code", {
    textContent: componentName || "(unnamed)"
  });
  marinara.addElement(box, "span", {
    textContent: " not registered"
  });
}

function mrrRenderResourceCustom(parent, resource) {
  if (!parent || !resource) return;
  var componentName = resource.rendererConfig && resource.rendererConfig.component || null;
  var renderer = componentName ? mrr_resourceRenderers[componentName] : null;
  if (typeof renderer === "function") {
    var ctx = {
      state,
      statContext,
      evalFormula,
      saveSheet,
      renderSheet,
      getCurrent: function() {
        return mrrGetResourceCurrent(resource, mrrResourceContext());
      },
      setCurrent: function(v) {
        mrrSetResourceCurrent(resource, v);
      },
      resolveMax: function() {
        return mrrResolveResourceMax(resource, mrrResourceContext());
      },
      resolveCurrentDefault: function(max) {
        return mrrResolveResourceDefaultCurrent(resource, mrrResourceContext(), max);
      }
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
  if (!state.sheet.resources || typeof state.sheet.resources !== "object") {
    state.sheet.resources = {};
  }
  var cluster = marinara.addElement(parent, "div", {
    class: "mrr-resources"
  });
  if (!cluster) return;
  var lastGroup = null;
  resources.forEach(function(resource, idx) {
    if (!resource || typeof resource.type !== "string") return;
    var grp = typeof resource.group === "string" && resource.group ? resource.group : null;
    if (grp && grp !== lastGroup) {
      marinara.addElement(cluster, "div", {
        class: "mrr-resources__group-label",
        textContent: grp
      });
      lastGroup = grp;
    } else if (!grp) {
      lastGroup = null;
    }
    var ctx = mrrResourceContext();
    var formulaMax = mrrResolveResourceMax(resource, ctx);
    var committedForPool = 0;
    if (typeof resource.commitmentPool === "string" && resource.commitmentPool) {
      committedForPool = reconcileCommittedMotes(resource.commitmentPool, resource.stateName || null);
    }
    var max = Math.max(0, formulaMax - committedForPool);
    var current = mrrGetResourceCurrent(resource, ctx);
    if (current > max) {
      current = max;
      mrrSetResourceCurrent(resource, current);
    }
    var card = marinara.addElement(cluster, "div", {
      class: "mrr-resource mrr-resource--" + resource.type
    });
    if (!card) return;
    marinara.addElement(card, "div", {
      class: "mrr-resource__label",
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
      mrrRenderResourcePlaceholder(card, resource, "(type=" + resource.type + ")");
    }
  });
}

function mrrP3RenderAttributesSection(parent) {
  if (!parent || !state.ruleset) return;
  var attrs = state.ruleset.attributes || [];
  if (!attrs.length) return;
  var groups = {};
  var groupOrder = [];
  attrs.forEach(function(a) {
    var g = a.group || "";
    if (!(g in groups)) {
      groups[g] = [];
      groupOrder.push(g);
    }
    groups[g].push(a);
  });
  mrrP3RenderSection(parent, {
    id: "attributes-p3",
    title: "ATTRIBUTES",
    defaultOpen: true
  }, function(body) {
    groupOrder.forEach(function(g) {
      if (g) {
        marinara.addElement(body, "div", {
          class: "mrr-p3-section__subgroup-label",
          textContent: g
        });
      }
      groups[g].forEach(function(a) {
        var ctx = statContext();
        var modKey = a.name + "_mod";
        var hasMod = typeof ctx[modKey] === "number";
        mrrP3RenderAttrRow(body, {
          name: a.name,
          abbr: a.abbreviation || "",
          value: state.sheet.attributes[a.name],
          modifier: hasMod ? ctx[modKey] : undefined,
          min: a.min,
          max: a.max,
          onChange: function(v) {
            state.sheet.attributes[a.name] = v;
            saveSheet(state.chatId, state.sheet);
            renderSheet();
          },
          onRoll: function(name, value, mod) {
            log("Phase 3 attr roll requested:", name, value, mod);
            showDice(true);
          }
        });
      });
    });
  });
}

function mrrP3RenderDerivedSection(parent) {
  if (!parent || !state.ruleset) return;
  if (!Array.isArray(state.ruleset.derivedStats) || !state.ruleset.derivedStats.length) return;
  var derivedHidden = {};
  if (state.ruleset.sections && Array.isArray(state.ruleset.sections.hidden)) {
    state.ruleset.sections.hidden.forEach(function(h) {
      if (typeof h === "string" && h.indexOf("derived:") === 0) {
        derivedHidden[h.slice(8)] = true;
      }
    });
  }
  var bars = [];
  var tracks = [];
  var cards = [];
  state.ruleset.derivedStats.forEach(function(d) {
    if (!d || !d.name) return;
    if (derivedHidden[d.name]) return;
    if (d.renderAs === "bar") bars.push(d); else if (d.renderAs === "track" && Array.isArray(d.track)) tracks.push(d); else cards.push(d);
  });
  if (!bars.length && !tracks.length && !cards.length) return;
  mrrP3RenderSection(parent, {
    id: "derived-p3",
    title: "DERIVED POOLS",
    defaultOpen: true
  }, function(body) {
    marinara.addElement(body, "div", {
      class: "mrr-derived-pools__subtitle",
      textContent: "Auto-calculated from your stats + equipped gear. GM can read these directly."
    });
    bars.forEach(function(d) {
      mrrP3RenderDerivedBar(body, d);
    });
    tracks.forEach(function(d) {
      mrrP3RenderDerivedTrack(body, d);
    });
    if (cards.length) {
      var grid = marinara.addElement(body, "div", {
        class: "mrr-derived-pools"
      });
      if (grid) {
        cards.forEach(function(d) {
          mrrP3RenderDerivedPoolCard(grid, d);
        });
      } else {
        cards.forEach(function(d) {
          mrrP3RenderDerivedPoolCard(body, d);
        });
      }
    }
  });
}

function mrrP3RenderDerivedPoolCard(parent, d) {
  if (!parent || !d) return;
  var card = marinara.addElement(parent, "div", {
    class: "mrr-derived-pool-card"
  });
  if (!card) return;
  var head = marinara.addElement(card, "div", {
    class: "mrr-derived-pool-card__head"
  });
  if (!head) return;
  marinara.addElement(head, "div", {
    class: "mrr-derived-pool-card__name",
    textContent: d.name
  });
  var valueWrap = marinara.addElement(head, "div", {
    class: "mrr-derived-pool-card__value-wrap"
  });
  if (!valueWrap) return;
  var hasValueFormula = typeof d.valueFormula === "string" && !!d.valueFormula;
  var hasTooltipFormula = typeof d.tooltipFormula === "string" && !!d.tooltipFormula;
  var isAutoCalc = hasValueFormula || hasTooltipFormula;
  var bonusSpan;
  if (isAutoCalc) {
    var valSpan = marinara.addElement(valueWrap, "span", {
      class: "mrr-derived-pool-card__value mrr-derived-pool-card__value--autocalc",
      title: hasValueFormula ? "Auto-calculated from formula: " + d.valueFormula : "Auto-calculated from formula: " + d.tooltipFormula
    });
    bonusSpan = marinara.addElement(valueWrap, "span", {
      class: "mrr-derived-pool-card__bonus"
    });
    if (bonusSpan) {
      refreshDerivedBonus(bonusSpan, d.name);
      derivedBonusRefreshers.push(function() {
        refreshDerivedBonus(bonusSpan, d.name);
      });
    }
    function refreshAutocalcCard() {
      if (!valSpan || !valSpan.parentNode) return;
      var ctx = statContext();
      var num;
      if (hasValueFormula) {
        var v = evalFormula(d.valueFormula, ctx);
        num = typeof v === "number" && isFinite(v) ? Math.floor(v) : 0;
      } else {
        var brk0 = mrrComputeTooltipBreakdown(d, ctx);
        num = brk0 && typeof brk0.value === "number" ? brk0.value : 0;
      }
      valSpan.textContent = String(num);
      if (hasTooltipFormula) {
        var brk = mrrComputeTooltipBreakdown(d, ctx);
        if (brk && brk.tooltip) {
          valSpan.title = brk.tooltip;
          valSpan.setAttribute("title", brk.tooltip);
        }
      }
      if (state.sheet.derived[d.name] !== num) {
        state.sheet.derived[d.name] = num;
        saveSheet(state.chatId, state.sheet);
      }
    }
    refreshAutocalcCard();
    barRefreshers.push(refreshAutocalcCard);
  } else {
    function computeCardValueMax() {
      if (typeof d.maxFormula === "string" && d.maxFormula) {
        var v = evalFormula(d.maxFormula, statContext());
        if (v != null && v > 0) return Math.floor(v);
      }
      if (typeof d.max === "number" && d.max > 0) return d.max;
      return null;
    }
    var declaredMax = computeCardValueMax();
    var input = makeEditableValue(valueWrap, function() {
      var stored = state.sheet.derived ? state.sheet.derived[d.name] : null;
      if (stored != null && stored !== "") return stored;
      return typeof d.default === "number" ? d.default : 0;
    }, function(n) {
      if (!state.sheet.derived) state.sheet.derived = {};
      state.sheet.derived[d.name] = n;
      saveSheet(state.chatId, state.sheet);
      refreshAllBars();
      renderSheet();
    }, function() {
      return typeof d.min === "number" ? d.min : -999;
    }, function() {
      return declaredMax != null ? declaredMax : 999;
    });
    if (input) {
      input.classList.add("mrr-derived-pool-card__value-input");
    }
    if (declaredMax != null) {
      marinara.addElement(valueWrap, "span", {
        class: "mrr-derived-pool-card__max",
        textContent: " / " + declaredMax
      });
    }
    bonusSpan = marinara.addElement(valueWrap, "span", {
      class: "mrr-derived-pool-card__bonus"
    });
    if (bonusSpan) {
      refreshDerivedBonus(bonusSpan, d.name);
      derivedBonusRefreshers.push(function() {
        refreshDerivedBonus(bonusSpan, d.name);
      });
    }
  }
  var formulaText = d.formulaShort || d.formula || (isAutoCalc ? d.valueFormula || d.tooltipFormula || "" : "");
  if (formulaText) {
    marinara.addElement(card, "div", {
      class: "mrr-derived-pool-card__formula",
      textContent: formulaText
    });
  }
  if (typeof d.rollFormula === "string" && d.rollFormula && state.ruleset.resolution && derivedRollSupported(mrrResolveModeId(d.resolutionId).mode)) {
    var rollBtn = marinara.addElement(card, "button", {
      class: "mrr-derived-pool-card__roll",
      textContent: "roll"
    });
    if (rollBtn) {
      marinara.on(rollBtn, "click", function(e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        quickRollForDerived(d);
      });
    }
  }
}

function mrrP3RenderDerivedBar(parent, d) {
  var current = state.sheet.derived[d.name] || 0;
  var max = mrrP3ComputeBarMax(d);
  var result = mrrP3RenderBar(parent, {
    name: d.name,
    current,
    max,
    onCurrent: function(v) {
      state.sheet.derived[d.name] = v;
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    },
    onMax: function(v) {
      if (!state.sheet.derivedMax) state.sheet.derivedMax = {};
      state.sheet.derivedMax[d.name] = v;
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    }
  });
  if (result && result.bar) {
    var barRef = result.bar;
    barRefreshers.push(function() {
      if (!barRef || !barRef.parentNode) return;
      var newMax = mrrP3ComputeBarMax(d);
      var newCurrent = state.sheet.derived[d.name] || 0;
      var pct = newMax > 0 ? Math.max(0, Math.min(100, newCurrent / newMax * 100)) : 0;
      var fillEl = barRef.querySelector(".mrr-p3-bar__fill");
      if (fillEl) fillEl.style.width = pct + "%";
      var inputs = barRef.querySelectorAll(".mrr-p3-bar__val-input");
      if (inputs && inputs.length >= 1 && inputs[0]) inputs[0].value = String(newCurrent);
      if (inputs && inputs.length >= 2 && inputs[1]) inputs[1].value = String(newMax);
    });
  }
}

function mrrP3ComputeBarMax(d) {
  if (state.sheet.derivedMax && typeof state.sheet.derivedMax[d.name] === "number" && state.sheet.derivedMax[d.name] > 0) {
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

function mrrP3RenderDerivedTrack(parent, d) {
  var ruleEntries = (d.track || []).map(function(c) {
    return {
      cell: c,
      extra: false
    };
  });
  var extraEntries = state.sheet.extraTrack && state.sheet.extraTrack[d.name] ? state.sheet.extraTrack[d.name].map(function(c) {
    return {
      cell: c,
      extra: true
    };
  }) : [];
  var tagged = ruleEntries.concat(extraEntries);
  tagged.sort(function(a, b) {
    return (b.cell.penalty || 0) - (a.cell.penalty || 0);
  });
  var allCells = tagged.map(function(e) {
    return e.cell;
  });
  var levels = allCells.map(function(c) {
    var lbl = String(c.label || "");
    return lbl.length > 4 ? lbl.slice(0, 3) : lbl;
  });
  var types = damageTypesFor(d);
  var cells = ensureTrackCells(d, allCells.length);
  var filled = cells.map(function(typeLabel) {
    return typeLabel ? {
      type: typeLabel
    } : null;
  });
  mrrP3RenderDamageTrack(parent, {
    track: {
      name: d.name,
      levels,
      filled
    },
    onCellClick: function(idx) {
      if (!types || !cells || idx < 0 || idx >= cells.length) return;
      var current = cells[idx];
      var nextLabel;
      if (!current) {
        var lightest = types[types.length - 1];
        nextLabel = lightest ? lightest.label : null;
      } else {
        var curIdx = -1;
        for (var i = 0; i < types.length; i++) {
          if (types[i].label === current) {
            curIdx = i;
            break;
          }
        }
        if (curIdx <= 0) {
          nextLabel = null;
        } else {
          nextLabel = types[curIdx - 1].label;
        }
      }
      cells[idx] = nextLabel;
      syncTrackCellsToTyped(d);
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    },
    onAddBox: function(label) {
      var penalty = parseInt(String(label), 10);
      if (isNaN(penalty)) penalty = 0;
      if (!state.sheet.extraTrack) state.sheet.extraTrack = {};
      if (!state.sheet.extraTrack[d.name]) state.sheet.extraTrack[d.name] = [];
      state.sheet.extraTrack[d.name].push({
        label: String(label),
        penalty
      });
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    },
    onRemoveBox: function() {
      if (!state.sheet.extraTrack || !state.sheet.extraTrack[d.name] || !state.sheet.extraTrack[d.name].length) return;
      state.sheet.extraTrack[d.name].pop();
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    },
    onHeal: function(mode) {
      if (!types || !cells) return;
      if (mode === "all") {
        for (var i = 0; i < cells.length; i++) cells[i] = null;
      } else {
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
        return;
      }
      syncTrackCellsToTyped(d);
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    }
  });
}

function mrrP3RenderSavesSection(parent) {
  if (!parent || !state.ruleset) return;
  var saves = Array.isArray(state.ruleset.saves) ? state.ruleset.saves : [];
  if (!saves.length) return;
  var prof = state.ruleset.skillProficiency;
  var tiersList = prof && Array.isArray(prof.tiers) ? prof.tiers : [];
  var tiers = tiersList.map(function(t) {
    return t.code;
  });
  var tierLabel = {};
  tiersList.forEach(function(t) {
    tierLabel[t.code] = t.label;
  });
  var skillFormula = state.ruleset.resolution && state.ruleset.resolution.skillBonusFormula;
  mrrP3RenderSection(parent, {
    id: "saves-p3",
    title: "SAVING THROWS",
    defaultOpen: true
  }, function(body) {
    saves.forEach(function(sv) {
      var ctx = statContext();
      var t = tierForSkill(sv.name);
      var tierBonus = t && t.rollBonusFormula ? evalFormula(t.rollBonusFormula, ctx) : 0;
      if (tierBonus == null) tierBonus = 0;
      var attrMod = 0;
      if (sv.linkedAttribute) {
        var modKey = sv.linkedAttribute + "_mod";
        if (typeof ctx[modKey] === "number") attrMod = ctx[modKey];
      }
      var totalBonus;
      if (skillFormula) {
        var subbed = String(skillFormula).replace(/\{linkedAttribute_mod\}/g, String(attrMod)).replace(/\{tierBonus\}/g, String(tierBonus));
        var v = evalFormula(subbed, ctx);
        totalBonus = typeof v === "number" && isFinite(v) ? Math.floor(v) : 0;
      } else {
        totalBonus = attrMod + tierBonus;
      }
      mrrP3RenderSaveRow(body, {
        save: {
          name: sv.name,
          attr: sv.linkedAttribute
        },
        tier: t ? t.code : "",
        tiers,
        tierLabel,
        attrMod,
        totalBonus,
        onTier: function(nextCode) {
          if (!state.sheet.skillProficiency) state.sheet.skillProficiency = {};
          state.sheet.skillProficiency[sv.name] = nextCode;
          saveSheet(state.chatId, state.sheet);
          renderSheet();
        },
        onRoll: function() {
          quickRollForSave(sv);
        }
      });
    });
  });
}

function mrrP3RenderSkillsSection(parent) {
  if (!parent || !state.ruleset || !Array.isArray(state.ruleset.skills)) return;
  var title = state.ruleset.id === "exalted3e" ? "ABILITIES" : "SKILLS";
  var skillFormula = state.ruleset.resolution && state.ruleset.resolution.skillBonusFormula;
  var prof = state.ruleset.skillProficiency;
  var tiersList = prof && Array.isArray(prof.tiers) ? prof.tiers : [];
  var tiers = tiersList.map(function(t) {
    return t.code;
  });
  var tierLabel = {};
  tiersList.forEach(function(t) {
    tierLabel[t.code] = t.label;
  });
  var specsCfg = state.ruleset.skillSpecialties || {};
  var allowSpecs = !!specsCfg.enabled;
  var specBonus = typeof specsCfg.value === "number" ? specsCfg.value : 1;
  var groups = state.ruleset.abilities && Array.isArray(state.ruleset.abilities.groups) ? state.ruleset.abilities.groups : null;
  var skillsByName = {};
  state.ruleset.skills.forEach(function(sk) {
    if (sk && sk.name) skillsByName[sk.name] = sk;
  });
  function renderOneSkill(body, sk) {
    var ctx = statContext();
    var t = tierForSkill(sk.name);
    var tierBonus = t && t.rollBonusFormula ? evalFormula(t.rollBonusFormula, ctx) : 0;
    if (tierBonus == null) tierBonus = 0;
    var attrMod = 0;
    if (sk.linkedAttribute) {
      var modKey = sk.linkedAttribute + "_mod";
      if (typeof ctx[modKey] === "number") attrMod = ctx[modKey];
    }
    var gearBonus = 0;
    try {
      gearBonus = (equippedBonuses(sk.name) || {}).value || 0;
    } catch (e) {}
    var rawValue = state.sheet.skills[sk.name] || 0;
    var specs = state.sheet.skillSpecialties && state.sheet.skillSpecialties[sk.name] || [];
    var primitiveSpecs = specs.map(function(sp) {
      return {
        name: sp.name || "",
        dice: typeof sp.value === "number" ? sp.value : specBonus
      };
    });
    mrrP3RenderSkillRow(body, {
      skill: {
        name: sk.name,
        attr: sk.linkedAttribute
      },
      tier: t ? t.code : "",
      tiers,
      tierLabel,
      value: rawValue,
      attrMod,
      gearBonus,
      tierBonus,
      autoCalc: !!skillFormula,
      specialties: primitiveSpecs,
      allowSpecialties: allowSpecs,
      specialtyBonus: specBonus,
      onTier: function(nextCode) {
        if (!state.sheet.skillProficiency) state.sheet.skillProficiency = {};
        state.sheet.skillProficiency[sk.name] = nextCode;
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      },
      onValue: function(v) {
        state.sheet.skills[sk.name] = v;
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      },
      onRoll: function() {
        quickRollForSkill(sk);
      },
      onAddSpecialty: function(newSp) {
        if (!state.sheet.skillSpecialties) state.sheet.skillSpecialties = {};
        if (!Array.isArray(state.sheet.skillSpecialties[sk.name])) state.sheet.skillSpecialties[sk.name] = [];
        state.sheet.skillSpecialties[sk.name].push({
          name: newSp.name || "",
          value: typeof newSp.dice === "number" ? newSp.dice : specBonus
        });
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      },
      onRemoveSpecialty: function(idx) {
        if (!state.sheet.skillSpecialties || !Array.isArray(state.sheet.skillSpecialties[sk.name])) return;
        state.sheet.skillSpecialties[sk.name].splice(idx, 1);
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      }
    });
  }
  mrrP3RenderSection(parent, {
    id: "skills-p3",
    title,
    defaultOpen: true
  }, function(body) {
    if (groups && groups.length) {
      var rendered = {};
      groups.forEach(function(g) {
        if (!g || !Array.isArray(g.members) || !g.members.length) return;
        var header = marinara.addElement(body, "div", {
          class: "mrr-skill-group-head",
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
        g.members.forEach(function(name) {
          var sk = skillsByName[name];
          if (!sk) return;
          rendered[name] = true;
          renderOneSkill(body, sk);
        });
      });
      var others = state.ruleset.skills.filter(function(sk) {
        return sk && sk.name && !rendered[sk.name];
      });
      if (others.length) {
        var otherHeader = marinara.addElement(body, "div", {
          class: "mrr-skill-group-head",
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
        others.forEach(function(sk) {
          renderOneSkill(body, sk);
        });
      }
    } else {
      state.ruleset.skills.forEach(function(sk) {
        renderOneSkill(body, sk);
      });
    }
    var customs = Array.isArray(state.sheet.customSkills) ? state.sheet.customSkills : [];
    customs.forEach(function(sk, idx) {
      mrrP3RenderCustomSkillRow(body, sk, idx);
    });
    var addBtn = marinara.addElement(body, "button", {
      type: "button",
      class: "mrr-track-add-btn mrr-char-btn--dashed",
      textContent: "+ Add Skill"
    });
    if (addBtn) marinara.on(addBtn, "click", function(e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      addCustomSkill();
    });
  });
}

function mrrP3RenderCustomSkillRow(parent, sk, idx) {
  var row = marinara.addElement(parent, "div", {
    class: "mrr-skill-spec-row mrr-custom-skill-row"
  });
  if (!row) return;
  var nameInput = marinara.addElement(row, "input", {
    class: "mrr-skill-spec-name",
    type: "text",
    placeholder: "skill or lore name",
    value: sk.name || ""
  });
  if (nameInput) {
    var saveTimer = null;
    marinara.on(nameInput, "input", function() {
      sk.name = nameInput.value;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(function() {
        saveSheet(state.chatId, state.sheet);
      }, 250);
    });
    marinara.on(nameInput, "blur", function() {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      saveSheet(state.chatId, state.sheet);
    });
    marinara.on(nameInput, "click", function(e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
  }
  var attrSel = marinara.addElement(row, "select", {
    class: "mrr-custom-skill-attr"
  });
  if (attrSel) {
    var blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "—";
    attrSel.appendChild(blank);
    (state.ruleset.attributes || []).forEach(function(a) {
      var opt = document.createElement("option");
      opt.value = a.abbreviation || a.name;
      opt.textContent = a.abbreviation || a.name;
      if ((sk.linkedAttribute || "") === opt.value) opt.selected = true;
      attrSel.appendChild(opt);
    });
    marinara.on(attrSel, "change", function() {
      sk.linkedAttribute = attrSel.value;
      saveSheet(state.chatId, state.sheet);
    });
    marinara.on(attrSel, "click", function(e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
  }
  var valInput = marinara.addElement(row, "input", {
    class: "mrr-p3-row__val",
    type: "number"
  });
  if (valInput) {
    valInput.value = String(sk.value || 0);
    marinara.on(valInput, "change", function() {
      var n = parseInt(valInput.value, 10);
      if (isNaN(n)) n = 0;
      sk.value = n;
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    });
  }
  var removeBtn = marinara.addElement(row, "button", {
    type: "button",
    class: "mrr-p3-row__del",
    textContent: "×",
    title: "Remove skill"
  });
  if (removeBtn) marinara.on(removeBtn, "click", function(e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    removeCustomSkill(idx);
  });
}

function mrrStateRowApplyMods(row, stateName, activeValue) {
  if (!row || !row.classList) return;
  var classes = [];
  for (var i = 0; i < row.classList.length; i++) {
    var c = row.classList.item(i);
    if (c && c.indexOf("mrr-state--") === 0) classes.push(c);
  }
  classes.forEach(function(c) {
    row.classList.remove(c);
  });
  var name = String(stateName || "");
  var val = String(activeValue || "");
  if (name === "Initiative" && val === "Crashed") {
    row.classList.add("mrr-state--initiative-crashed");
  } else if (name === "Anima Banner" && val === "Suppressed") {
    row.classList.add("mrr-state--anima-suppressed");
  }
  try {
    row.setAttribute("data-active-value", val);
  } catch (e) {}
}

function mrrP3RenderStatesSection(parent) {
  if (!parent || !state.ruleset) return;
  if (!Array.isArray(state.ruleset.states) || !state.ruleset.states.length) return;
  var stateHidden = {};
  if (state.ruleset.sections && Array.isArray(state.ruleset.sections.hidden)) {
    state.ruleset.sections.hidden.forEach(function(h) {
      if (typeof h === "string" && h.indexOf("state:") === 0) {
        stateHidden[h.slice(6)] = true;
      }
    });
  }
  var visibleStates = state.ruleset.states.filter(function(st) {
    return st && st.name && !stateHidden[st.name];
  });
  if (!visibleStates.length) return;
  mrrP3RenderSection(parent, {
    id: "states-p3",
    title: "STATES",
    defaultOpen: true
  }, function(body) {
    var stateValues = state.sheet.states || {};
    visibleStates.forEach(function(st) {
      var row = marinara.addElement(body, "div", {
        class: "mrr-state"
      });
      if (!row) return;
      marinara.addElement(row, "span", {
        class: "mrr-state__name",
        textContent: st.name
      });
      var sel = marinara.addElement(row, "select", {
        class: "mrr-state__select"
      });
      if (!sel) return;
      st.values.forEach(function(v) {
        var opt = document.createElement("option");
        opt.value = v.label;
        opt.textContent = v.label;
        if (v.label === stateValues[st.name]) opt.selected = true;
        sel.appendChild(opt);
      });
      mrrStateRowApplyMods(row, st.name, stateValues[st.name]);
      marinara.on(sel, "change", function() {
        if (!state.sheet.states) state.sheet.states = {};
        state.sheet.states[st.name] = sel.value;
        mrrStateRowApplyMods(row, st.name, sel.value);
        saveSheet(state.chatId, state.sheet);
      });
    });
  });
}

function mrrP3RenderConditionsSection(parent) {
  if (!parent || !state.ruleset) return;
  mrrP3RenderSection(parent, {
    id: "conditions-p3",
    title: "CONDITIONS",
    defaultOpen: true
  }, function(body) {
    var defs = Array.isArray(state.ruleset.conditions) ? state.ruleset.conditions : [];
    var defByName = {};
    defs.forEach(function(d) {
      if (d && d.name) defByName[d.name.toLowerCase()] = d;
    });
    var active = Array.isArray(state.sheet.conditions) ? state.sheet.conditions : [];
    if (!active.length) {
      marinara.addElement(body, "div", {
        class: "mrr-inv-empty",
        textContent: "None active."
      });
    }
    active.forEach(function(name) {
      var row = marinara.addElement(body, "div", {
        class: "mrr-skill-spec-row mrr-condition-row"
      });
      if (!row) return;
      marinara.addElement(row, "span", {
        class: "mrr-skill-spec-name",
        textContent: name
      });
      var def = defByName[String(name).toLowerCase()];
      if (def) {
        var effects = [];
        var dis = Array.isArray(def.imposesDisadvantageOn) ? def.imposesDisadvantageOn : [];
        var adv = Array.isArray(def.grantsAdvantageOn) ? def.grantsAdvantageOn : [];
        if (dis.length) effects.push("disadvantage on " + dis.join(", "));
        if (adv.length) effects.push("advantage on " + adv.join(", "));
        if (effects.length) {
          var effSpan = marinara.addElement(row, "span", {
            class: "mrr-condition-effect",
            textContent: effects.join("; ")
          });
          if (effSpan && def.description) effSpan.title = def.description;
        } else if (def.description) {
          var descSpan = marinara.addElement(row, "span", {
            class: "mrr-condition-effect",
            textContent: "(narrative)"
          });
          if (descSpan) descSpan.title = def.description;
        }
      }
      var rm = marinara.addElement(row, "button", {
        type: "button",
        class: "mrr-track-add-btn mrr-track-add-btn--danger",
        textContent: "×",
        title: "Remove condition"
      });
      if (rm) marinara.on(rm, "click", function(e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        removeCondition(name);
      });
    });
    var addRow = marinara.addElement(body, "div", {
      class: "mrr-skill-spec-row"
    });
    if (addRow) {
      var sel = marinara.addElement(addRow, "select", {
        class: "mrr-item-form__select"
      });
      if (sel) {
        var blank = document.createElement("option");
        blank.value = "";
        blank.textContent = "— add condition —";
        sel.appendChild(blank);
        defs.forEach(function(d) {
          if (!d || !d.name) return;
          if (active.indexOf(d.name) !== -1) return;
          var opt = document.createElement("option");
          opt.value = d.name;
          opt.textContent = d.name;
          if (d.description) opt.title = d.description;
          sel.appendChild(opt);
        });
        var customOpt = document.createElement("option");
        customOpt.value = "__custom__";
        customOpt.textContent = "(other — type a name)";
        sel.appendChild(customOpt);
        marinara.on(sel, "change", function() {
          var v = sel.value;
          if (!v) return;
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

function mrrP3RenderBackgroundsSection(parent) {
  if (!parent || !state.ruleset) return;
  var cfg = state.ruleset.backgrounds;
  if (!cfg || cfg.enabled !== true) return;
  var label = (cfg.label || "BACKGROUNDS").toUpperCase();
  var lo = typeof cfg.min === "number" ? cfg.min : 0;
  var hi = typeof cfg.max === "number" ? cfg.max : 5;
  var textOnly = !!cfg.textOnly;
  mrrP3RenderSection(parent, {
    id: "backgrounds-p3",
    title: label,
    defaultOpen: true
  }, function(body) {
    var entries = Array.isArray(state.sheet.backgrounds) ? state.sheet.backgrounds : [];
    entries.forEach(function(entry, idx) {
      var row = marinara.addElement(body, "div", {
        class: "mrr-skill-spec-row"
      });
      if (!row) return;
      var nameInput = marinara.addElement(row, "input", {
        class: "mrr-skill-spec-name",
        type: "text",
        placeholder: textOnly ? "feat (e.g. Sharpshooter, Lucky)" : "background (e.g. Resources, Allies)",
        value: entry.name || ""
      });
      if (nameInput) {
        var saveTimer = null;
        marinara.on(nameInput, "input", function() {
          entry.name = nameInput.value;
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(function() {
            saveSheet(state.chatId, state.sheet);
          }, 250);
        });
        marinara.on(nameInput, "blur", function() {
          if (saveTimer) {
            clearTimeout(saveTimer);
            saveTimer = null;
          }
          saveSheet(state.chatId, state.sheet);
        });
        marinara.on(nameInput, "click", function(e) {
          if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        });
      }
      if (!textOnly) {
        var valInput = marinara.addElement(row, "input", {
          class: "mrr-p3-row__val",
          type: "number"
        });
        if (valInput) {
          valInput.value = String(entry.value || 0);
          marinara.on(valInput, "change", function() {
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
        class: "mrr-track-add-btn mrr-track-add-btn--danger",
        textContent: "×",
        title: "Remove " + (textOnly ? "feat" : "background")
      });
      if (removeBtn) marinara.on(removeBtn, "click", function(e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        removeBackground(idx);
      });
    });
    var addBtn = marinara.addElement(body, "button", {
      type: "button",
      class: "mrr-track-add-btn mrr-char-btn--dashed",
      textContent: "+ Add " + (textOnly ? "Feat" : "Background")
    });
    if (addBtn) marinara.on(addBtn, "click", function(e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      addBackground();
    });
  });
}

var MERIT_FLAW_TYPES = [ {
  id: "physical",
  label: "Physical"
}, {
  id: "mental",
  label: "Mental"
}, {
  id: "social",
  label: "Social"
}, {
  id: "supernatural",
  label: "Supernatural"
} ];

function newMeritFlawId() {
  return "mf-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);
}

function addMeritFlaw(kind) {
  if (!state.sheet) return;
  if (!Array.isArray(state.sheet.meritsFlaws)) state.sheet.meritsFlaws = [];
  var entry = {
    id: newMeritFlawId(),
    kind: kind === "flaw" ? "flaw" : "merit",
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
  }, function(body) {
    [ "merit", "flaw" ].forEach(function(kind) {
      var head = marinara.addElement(body, "div", {
        class: "mrr-skill-group-head",
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
      entries.forEach(function(entry) {
        if (!entry || entry.kind !== kind) return;
        var row = marinara.addElement(body, "div", {
          class: "mrr-skill-spec-row"
        });
        if (!row) return;
        var nameInput = marinara.addElement(row, "input", {
          class: "mrr-skill-spec-name",
          type: "text",
          placeholder: kind === "merit" ? "merit (e.g. Eat Food, Iron Will)" : "flaw (e.g. Lunatic, Repulsed by Garlic)",
          value: entry.name || ""
        });
        if (nameInput) {
          var saveTimer = null;
          marinara.on(nameInput, "input", function() {
            entry.name = nameInput.value;
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(function() {
              saveSheet(state.chatId, state.sheet);
            }, 250);
          });
          marinara.on(nameInput, "blur", function() {
            if (saveTimer) {
              clearTimeout(saveTimer);
              saveTimer = null;
            }
            saveSheet(state.chatId, state.sheet);
          });
          marinara.on(nameInput, "click", function(e) {
            if (e && typeof e.stopPropagation === "function") e.stopPropagation();
          });
        }
        var typeSel = marinara.addElement(row, "select", {
          class: "mrr-custom-skill-attr"
        });
        if (typeSel) {
          MERIT_FLAW_TYPES.forEach(function(t) {
            var opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = t.label;
            if ((entry.type || "physical") === t.id) opt.selected = true;
            typeSel.appendChild(opt);
          });
          marinara.on(typeSel, "change", function() {
            entry.type = typeSel.value;
            saveSheet(state.chatId, state.sheet);
          });
          marinara.on(typeSel, "click", function(e) {
            if (e && typeof e.stopPropagation === "function") e.stopPropagation();
          });
        }
        var ptsInput = marinara.addElement(row, "input", {
          class: "mrr-p3-row__val",
          type: "number"
        });
        if (ptsInput) {
          ptsInput.value = String(entry.points || 1);
          ptsInput.min = "1";
          ptsInput.max = "7";
          ptsInput.title = kind === "merit" ? "Merit cost (1-7)" : "Flaw bonus points returned (1-7)";
          marinara.on(ptsInput, "change", function() {
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
          class: "mrr-track-add-btn mrr-track-add-btn--danger",
          textContent: "×",
          title: "Remove " + (kind === "merit" ? "merit" : "flaw")
        });
        if (removeBtn) marinara.on(removeBtn, "click", function(e) {
          if (e && typeof e.stopPropagation === "function") e.stopPropagation();
          removeMeritFlaw(entry.id);
        });
      });
      var addBtn = marinara.addElement(body, "button", {
        type: "button",
        class: "mrr-track-add-btn mrr-char-btn--dashed",
        textContent: kind === "merit" ? "+ Add Merit" : "+ Add Flaw"
      });
      if (addBtn) marinara.on(addBtn, "click", function(e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        addMeritFlaw(kind);
      });
    });
  });
}

function mrrP3RenderIntimaciesSection(parent) {
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
  }, function(body) {
    var btn = marinara.addElement(body, "button", {
      type: "button",
      class: "mrr-char-btn mrr-char-btn--dashed",
      textContent: "Intimacies (" + totalIntimacyCount() + ")"
    });
    if (btn) marinara.on(btn, "click", function() {
      showIntimacies(!state.intimaciesOpen);
    });
  });
}

function mrrP3RenderInventorySection(parent) {
  if (!parent) return;
  mrrP3RenderSection(parent, {
    id: "inventory-p3",
    title: "EQUIPMENT",
    defaultOpen: true
  }, function(body) {
    renderInventoryList(body);
  });
}

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
  }, function(body) {
    var btn = marinara.addElement(body, "button", {
      type: "button",
      class: "mrr-char-btn mrr-char-btn--dashed",
      textContent: cfg.label + " (" + totalAbilityCount() + ")"
    });
    if (btn) marinara.on(btn, "click", function() {
      showSpellbook(!state.spellbookOpen);
    });
  });
}

function renderSheet() {
  if (!state.ruleset) return;
  var savedScrollTop = state.mountEl && typeof state.mountEl.scrollTop === "number" ? state.mountEl.scrollTop : 0;
  function restoreScroll() {
    if (!state.mountEl || !savedScrollTop) return;
    var el = state.mountEl;
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function() {
        try {
          el.scrollTop = savedScrollTop;
        } catch (e) {}
      });
    } else {
      try {
        el.scrollTop = savedScrollTop;
      } catch (e) {}
    }
  }
  if (typeof mrrP3RenderSheet === "function") {
    mrrP3RenderSheet();
    restoreScroll();
    return;
  }
}

function renderSheetHeader(parent) {
  var header = marinara.addElement(parent, "div", {
    class: "mrr-sheet__header"
  });
  if (!header) return;
  var titleRow = marinara.addElement(header, "div", {
    class: "mrr-sheet__title-row"
  });
  if (titleRow) {
    marinara.addElement(titleRow, "span", {
      class: "mrr-sheet__title",
      textContent: state.ruleset.name
    });
    marinara.addElement(titleRow, "span", {
      class: "mrr-sheet__meta",
      textContent: "v" + state.ruleset.version + " · " + state.ruleset.dice.type
    });
  }
  var charRow = marinara.addElement(header, "div", {
    class: "mrr-sheet__char-row"
  });
  if (!charRow) return;
  marinara.addElement(charRow, "label", {
    class: "mrr-sheet__char-label",
    textContent: "Character:"
  });
  var sel = marinara.addElement(charRow, "select", {
    class: "mrr-char-select"
  });
  if (sel) {
    state.characters.forEach(function(c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      if (c.id === state.activeCharacterId) opt.selected = true;
      sel.appendChild(opt);
    });
    marinara.on(sel, "change", function() {
      switchCharacter(sel.value);
    });
  }
  var btnAdd = marinara.addElement(charRow, "button", {
    class: "mrr-char-btn",
    textContent: "+",
    title: "Add a new character sheet"
  });
  if (btnAdd) marinara.on(btnAdd, "click", addCharacter);
  var btnRename = marinara.addElement(charRow, "button", {
    class: "mrr-char-btn",
    textContent: "rename"
  });
  if (btnRename) marinara.on(btnRename, "click", renameActiveCharacter);
  var btnRemove = marinara.addElement(charRow, "button", {
    class: "mrr-char-btn mrr-char-btn--danger",
    textContent: "x",
    title: "Remove this character"
  });
  if (btnRemove) marinara.on(btnRemove, "click", removeActiveCharacter);
  var btnSave = marinara.addElement(charRow, "button", {
    class: "mrr-char-btn",
    textContent: "save",
    title: "Download all characters in this chat as a JSON file"
  });
  if (btnSave) marinara.on(btnSave, "click", exportBundle);
  var btnLoad = marinara.addElement(charRow, "button", {
    class: "mrr-char-btn",
    textContent: "load",
    title: "Replace this chat's characters with a previously-saved JSON file"
  });
  if (btnLoad) marinara.on(btnLoad, "click", importBundle);
  marinara.addElement(charRow, "span", {
    class: "mrr-saved-indicator",
    textContent: ""
  });
  var hcfg = state.ruleset && state.ruleset.header || {};
  var raceLbl = hcfg.raceLabel || "Race";
  var classLbl = hcfg.classLabel || "Class";
  if (!state.sheet.identity) state.sheet.identity = {
    race: "",
    class: ""
  };
  var idFields = state.ruleset && Array.isArray(state.ruleset.identityFields) ? state.ruleset.identityFields : [ {
    label: raceLbl,
    key: "race"
  }, {
    label: classLbl,
    key: "class"
  } ];
  var idCard = marinara.addElement(header, "div", {
    class: "mrr-identity"
  });
  if (!idCard) return;
  marinara.addElement(idCard, "div", {
    class: "mrr-identity__avatar",
    textContent: "PORTRAIT"
  });
  var idMain = marinara.addElement(idCard, "div", {
    class: "mrr-identity__main"
  });
  if (!idMain) return;
  var activeChar = null;
  for (var ci = 0; ci < state.characters.length; ci++) {
    if (state.characters[ci].id === state.activeCharacterId) {
      activeChar = state.characters[ci];
      break;
    }
  }
  var nameInput = marinara.addElement(idMain, "input", {
    class: "mrr-identity__name",
    type: "text",
    value: activeChar && activeChar.name || "",
    placeholder: "Character name"
  });
  if (nameInput) {
    var nameSaveTimer = null;
    marinara.on(nameInput, "input", function() {
      if (!activeChar) return;
      activeChar.name = nameInput.value;
      if (nameSaveTimer) clearTimeout(nameSaveTimer);
      nameSaveTimer = setTimeout(function() {
        saveCharacters();
        renderSheet();
      }, 250);
    });
    marinara.on(nameInput, "blur", function() {
      if (nameSaveTimer) {
        clearTimeout(nameSaveTimer);
        nameSaveTimer = null;
      }
      if (!activeChar) return;
      saveCharacters();
      renderSheet();
    });
    marinara.on(nameInput, "click", function(e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
  }
  var idSub = marinara.addElement(idMain, "div", {
    class: "mrr-identity__sub"
  });
  if (idSub) {
    idFields.forEach(function(f) {
      if (!f || !f.key) return;
      mrrRenderIdentitySubField(idSub, f.label || f.key, f.key, f.placeholder);
    });
    mrrRenderBindingField(idSub);
  }
  if (typeof mrrRenderBindPrompt === "function") mrrRenderBindPrompt();
}

function mrrRenderIdentitySubField(parent, labelText, key, placeholder) {
  var item = marinara.addElement(parent, "div", {
    class: "mrr-identity__sub-item"
  });
  if (!item) return;
  marinara.addElement(item, "span", {
    class: "mrr-identity__sub-label",
    textContent: labelText
  });
  var classOptions = key === "class" && state.ruleset && Array.isArray(state.ruleset.classOptions) ? state.ruleset.classOptions : null;
  if (classOptions && classOptions.length > 0) {
    var currentClass = state.sheet.identity && state.sheet.identity[key] || "";
    var select = marinara.addElement(item, "select", {
      class: "mrr-identity__sub-input"
    });
    if (!select) return;
    var placeholderOpt = marinara.addElement(select, "option", {
      value: "",
      textContent: "(choose " + (typeof labelText === "string" ? labelText.toLowerCase() : "class") + ")"
    });
    if (placeholderOpt && !currentClass) placeholderOpt.selected = true;
    classOptions.forEach(function(opt) {
      if (!opt || !opt.name) return;
      var label = opt.name + (opt.hitDie ? " (" + opt.hitDie + ")" : "");
      var optionEl = marinara.addElement(select, "option", {
        value: opt.name,
        textContent: label
      });
      if (optionEl && opt.name === currentClass) optionEl.selected = true;
    });
    marinara.on(select, "change", function() {
      if (!state.sheet.identity) state.sheet.identity = {};
      state.sheet.identity[key] = select.value;
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    });
    marinara.on(select, "click", function(e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    });
    return;
  }
  var input = marinara.addElement(item, "input", {
    class: "mrr-identity__sub-input",
    type: "text",
    value: state.sheet.identity && state.sheet.identity[key] || "",
    placeholder: placeholder || (typeof labelText === "string" ? labelText.toLowerCase() : "")
  });
  if (!input) return;
  var saveTimer = null;
  marinara.on(input, "input", function() {
    if (!state.sheet.identity) state.sheet.identity = {};
    state.sheet.identity[key] = input.value;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function() {
      saveSheet(state.chatId, state.sheet);
    }, 250);
  });
  marinara.on(input, "blur", function() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    saveSheet(state.chatId, state.sheet);
  });
  marinara.on(input, "click", function(e) {
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
  });
}

function quickRollForSave(save) {
  if (!state.ruleset) return;
  var mode = mrrPrepareDiceForResolutionId(null);
  if (mode !== MODES.SINGLE && mode !== MODES.UNDER && mode !== MODES.STANCE) return;
  if (mode === MODES.SINGLE) {
    var condMode = conditionRollMode("save");
    if (condMode !== "normal") state.diceAdvantage = condMode;
  }
  if (mode === MODES.STANCE) {
    var statNameSv = state.ruleset.resolution && state.ruleset.resolution.stat || "Stat";
    var statDefaultSv = state.ruleset.resolution && typeof state.ruleset.resolution.statDefault === "number" ? state.ruleset.resolution.statDefault : 4;
    var statValSv = state.sheet.attributes && typeof state.sheet.attributes[statNameSv] === "number" ? state.sheet.attributes[statNameSv] : statDefaultSv;
    showDice(true);
    state.diceContext = {
      saveName: save.name,
      base: {
        stat: statValSv,
        pool: 1
      }
    };
    setDiceInput("stat", statValSv);
    setDiceInput("pool", 1);
    return;
  }
  var ctx = statContext();
  var t = tierForSkill(save.name);
  var tierBonus = t && t.rollBonusFormula ? evalFormula(t.rollBonusFormula, ctx) : 0;
  if (tierBonus == null) tierBonus = 0;
  var bonuses = equippedBonuses(save.name);
  showDice(true);
  if (mode === MODES.UNDER) {
    var underTarget = 0;
    if (typeof state.sheet.skills[save.name] === "number") {
      underTarget = state.sheet.skills[save.name];
    } else if (save.linkedAttribute && state.sheet.attributes && typeof state.sheet.attributes[save.linkedAttribute] === "number") {
      underTarget = state.sheet.attributes[save.linkedAttribute];
    }
    state.diceContext = {
      saveName: save.name,
      base: {
        target: underTarget,
        bonus: bonuses.value + tierBonus
      }
    };
    setDiceInput("target", underTarget);
    setDiceInput("bonus", bonuses.value + tierBonus);
    return;
  }
  var attrMod = 0;
  if (save.linkedAttribute) {
    var modKey = save.linkedAttribute + "_mod";
    if (typeof ctx[modKey] === "number") attrMod = ctx[modKey];
  }
  state.diceContext = {
    saveName: save.name,
    base: {
      mod: attrMod,
      prof: tierBonus
    }
  };
  setDiceInput("mod", attrMod);
  setDiceInput("prof", tierBonus);
  setDiceInput("equip", bonuses.value);
}

function derivedRollSupported(mode) {
  return mode === MODES.SINGLE || mode === MODES.UNDER || mode === MODES.STANCE || mode === MODES.POOL;
}

function quickRollForDerived(derived) {
  if (!state.ruleset) return;
  var mode = mrrPrepareDiceForResolutionId(derived && derived.resolutionId);
  if (mode !== MODES.SINGLE && mode !== MODES.UNDER && mode !== MODES.STANCE && mode !== MODES.POOL) return;
  if (!derived || typeof derived.rollFormula !== "string" || !derived.rollFormula) return;
  if (mode === MODES.POOL) {
    var ctxP = statContext();
    var derivedBonuses = equippedBonuses(derived.name);
    var poolVal = evalFormula(derived.rollFormula, ctxP);
    var poolSize = typeof poolVal === "number" && isFinite(poolVal) ? Math.max(0, Math.floor(poolVal)) : 0;
    showDice(true);
    state.diceContext = {
      derivedName: derived.name,
      base: {
        pool: poolSize
      }
    };
    setDiceInput("pool", poolSize);
    setDiceInput("equip", derivedBonuses.dice);
    return;
  }
  if (mode === MODES.STANCE) {
    var statNameDv = state.ruleset.resolution && state.ruleset.resolution.stat || "Stat";
    var statDefaultDv = state.ruleset.resolution && typeof state.ruleset.resolution.statDefault === "number" ? state.ruleset.resolution.statDefault : 4;
    var statValDv = state.sheet.attributes && typeof state.sheet.attributes[statNameDv] === "number" ? state.sheet.attributes[statNameDv] : statDefaultDv;
    showDice(true);
    state.diceContext = {
      derivedName: derived.name,
      base: {
        stat: statValDv,
        pool: 1
      }
    };
    setDiceInput("stat", statValDv);
    setDiceInput("pool", 1);
    return;
  }
  var ctx = statContext();
  if (mode === MODES.UNDER) {
    var underTarget = 0;
    if (typeof derived.formula === "string" && derived.formula) {
      var dv = evalFormula(derived.formula, ctx);
      if (typeof dv === "number" && isFinite(dv)) underTarget = Math.floor(dv);
    }
    if (underTarget === 0 && state.sheet.derived && typeof state.sheet.derived[derived.name] === "number") {
      underTarget = state.sheet.derived[derived.name];
    }
    var dBonuses = equippedBonuses(derived.name);
    showDice(true);
    state.diceContext = {
      derivedName: derived.name,
      base: {
        target: underTarget,
        bonus: dBonuses.value
      }
    };
    setDiceInput("target", underTarget);
    setDiceInput("bonus", dBonuses.value);
    return;
  }
  var v = evalFormula(derived.rollFormula, ctx);
  var bonus = typeof v === "number" && isFinite(v) ? Math.floor(v) : 0;
  showDice(true);
  state.diceContext = {
    derivedName: derived.name,
    base: {
      mod: bonus
    }
  };
  setDiceInput("mod", bonus);
  setDiceInput("prof", 0);
  setDiceInput("equip", 0);
  setDiceInput("dc", 0);
}

function quickRollAttack(item) {
  if (!state.ruleset || state.ruleset.resolution.mode !== MODES.SINGLE) return;
  mrrPrepareDiceForResolutionId(null);
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
    var profFormula = state.ruleset.resolution && state.ruleset.resolution.attackProficiencyFormula;
    if (profFormula) {
      var pv = evalFormula(profFormula, ctx);
      if (typeof pv === "number" && isFinite(pv)) prof = Math.floor(pv);
    }
  }
  var bonuses = equippedBonuses("attack");
  showDice(true);
  state.diceContext = {
    itemAttack: item.id,
    base: {
      mod: attrMod,
      prof
    }
  };
  setDiceInput("mod", attrMod);
  setDiceInput("prof", prof);
  setDiceInput("equip", bonuses.value);
}

var DAMAGE_RE = /^\s*(\d+)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+))?(?:\s+(.+?))?\s*$/i;

var EXALTED_DAMAGE_LETTER_RE = /^\s*(\d+)\s*d?\s*([BLA])\s*(?:([+-])\s*(\d+))?\s*$/i;

var FLAT_DAMAGE_RE = /^\s*(\d+)\s+(.+?)\s*$/;

var EXALTED_TYPE_WORDS = {
  bashing: "Bashing",
  lethal: "Lethal",
  aggravated: "Aggravated"
};

var EXALTED_TYPE_LETTERS = {
  b: "Bashing",
  l: "Lethal",
  a: "Aggravated"
};

function parseDamageExpression(s) {
  if (typeof s !== "string" || !s) return null;
  var em = EXALTED_DAMAGE_LETTER_RE.exec(s);
  if (em) {
    var base = parseInt(em[1], 10);
    var bonusDice = em[4] ? parseInt(em[4], 10) : 0;
    if (em[3] === "-") bonusDice = -bonusDice;
    var letter = em[2].toLowerCase();
    return {
      kind: "exalted",
      count: Math.max(0, base + bonusDice),
      type: EXALTED_TYPE_LETTERS[letter]
    };
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
      return {
        kind: "exalted",
        count: n,
        type: EXALTED_TYPE_WORDS[lower]
      };
    }
    return {
      kind: "flat",
      total: n,
      type: typeText
    };
  }
  return null;
}

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
      if (f >= 7) {
        successes++;
        cls += " mrr-dice__face--success";
      }
      faces.push({
        face: f,
        cls
      });
    }
    var text = "[damage: " + n + "d10 = " + successes + " " + parsed.type + " (" + label + ")]";
    return {
      text,
      faces,
      kind: "exalted"
    };
  }
  if (parsed.kind === "dnd") {
    var count = Math.max(0, Math.min(20, parsed.count));
    var size = Math.max(2, Math.min(100, parsed.size));
    var bonus = parsed.bonus || 0;
    if (parsed.sign === "-") bonus = -bonus;
    var attrMod = typeof opts.attrMod === "number" ? opts.attrMod : 0;
    var dndFaces = [];
    var sum = 0;
    for (var j = 0; j < count; j++) {
      var face = 1 + Math.floor(Math.random() * size);
      dndFaces.push({
        face,
        cls: "mrr-dice__face"
      });
      sum += face;
    }
    var total = sum + bonus + attrMod;
    var modPart = "";
    if (bonus) modPart += (bonus > 0 ? "+" : "") + bonus;
    if (attrMod) modPart += (attrMod > 0 ? "+" : "") + attrMod;
    var typePart = parsed.type ? " " + parsed.type : "";
    var dndText = "[damage: " + count + "d" + size + modPart + " = " + total + typePart + " (" + label + ")]";
    return {
      text: dndText,
      faces: dndFaces,
      kind: "dnd"
    };
  }
  var flatText = "[damage: " + parsed.total + (parsed.type ? " " + parsed.type : "") + " (" + label + ")]";
  return {
    text: flatText,
    faces: [],
    kind: "flat"
  };
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
  var rolled = rollParsedDamage(parsed, {
    label,
    attrMod
  });
  showDice(true);
  finalizeRoll(rolled.text, "success", rolled.faces);
}

function quickRollForSkill(skill) {
  var mode = mrrPrepareDiceForResolutionId(skill && skill.resolutionId);
  if (mode === MODES.SINGLE) {
    var condMode = conditionRollMode("skill");
    if (condMode !== "normal") state.diceAdvantage = condMode;
  }
  var bonuses = equippedBonuses(skill.name);
  var tierBonus = resolveTierBonus(skill.name);
  showDice(true);
  state.diceContext = {
    skillName: skill.name,
    base: {}
  };
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
    setDiceInput("pool", state.diceContext.base.pool);
    setDiceInput("equip", bonuses.dice);
  } else if (mode === MODES.SINGLE) {
    var ctxS = statContext();
    var modVal;
    var skillFormula = mrrActiveResolutionConfig().skillBonusFormula;
    if (skillFormula && skill.linkedAttribute) {
      var mk = skill.linkedAttribute + "_mod";
      modVal = typeof ctxS[mk] === "number" ? ctxS[mk] : 0;
    } else {
      modVal = state.sheet.skills[skill.name] || 0;
    }
    state.diceContext.base.mod = modVal;
    state.diceContext.base.prof = tierBonus;
    setDiceInput("mod", state.diceContext.base.mod);
    setDiceInput("prof", state.diceContext.base.prof);
    setDiceInput("equip", bonuses.value);
  } else if (mode === MODES.FATE) {
    state.diceContext.base.skill = (state.sheet.skills[skill.name] || 0) + bonuses.value + tierBonus;
    setDiceInput("skill", state.diceContext.base.skill);
  } else if (mode === MODES.UNDER) {
    var underTarget = state.sheet.skills[skill.name] || 0;
    var underBonus = bonuses.value + tierBonus;
    state.diceContext.base.target = underTarget;
    state.diceContext.base.bonus = underBonus;
    setDiceInput("target", underTarget);
    setDiceInput("bonus", underBonus);
  } else if (mode === MODES.STANCE) {
    var statNameSk = state.ruleset.resolution && state.ruleset.resolution.stat || "Stat";
    var statDefaultSk = state.ruleset.resolution && typeof state.ruleset.resolution.statDefault === "number" ? state.ruleset.resolution.statDefault : 4;
    var statValSk = state.sheet.attributes && typeof state.sheet.attributes[statNameSk] === "number" ? state.sheet.attributes[statNameSk] : statDefaultSk;
    state.diceContext.base.stat = statValSk;
    state.diceContext.base.pool = 1;
    setDiceInput("stat", statValSk);
    setDiceInput("pool", 1);
  } else if (mode === MODES.SUM) {
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

function renderSpecialtiesPane(skill) {
  if (!state.diceEl) return;
  var old = state.diceEl.querySelector(".mrr-dice__specs");
  if (old && old.parentNode) old.parentNode.removeChild(old);
  var cfg = state.ruleset.skillSpecialties;
  if (!cfg || !cfg.enabled) return;
  var specs = state.sheet.skillSpecialties && state.sheet.skillSpecialties[skill.name] || [];
  if (!specs.length) return;
  var pane = marinara.addElement(state.diceEl, "div", {
    class: "mrr-dice__specs"
  });
  if (!pane) return;
  marinara.addElement(pane, "div", {
    class: "mrr-dice__specs-title",
    textContent: skill.name + " specialties"
  });
  var unit = cfg.valueKind === BONUS_KIND.DICE ? " dice" : cfg.valueKind === BONUS_KIND.SUCCESSES ? " succ" : "";
  specs.forEach(function(sp, idx) {
    var row = marinara.addElement(pane, "label", {
      class: "mrr-dice__spec-row"
    });
    if (!row) return;
    var cb = marinara.addElement(row, "input", {
      class: "mrr-dice__spec-checkbox",
      type: "checkbox",
      "data-idx": String(idx)
    });
    var sign = sp.value >= 0 ? "+" : "";
    marinara.addElement(row, "span", {
      class: "mrr-dice__spec-label",
      textContent: (sp.name || "(unnamed)") + " (" + sign + sp.value + unit + ")"
    });
    if (cb) marinara.on(cb, "change", applyDiceContextSpecialties);
  });
  var result = state.diceEl.querySelector("#mrr-dice-result");
  if (result && result.parentNode === state.diceEl && pane.parentNode === state.diceEl) {
    state.diceEl.insertBefore(pane, result);
  }
}

function applyDiceContextSpecialties() {
  var ctx = state.diceContext;
  if (!ctx || !state.diceEl) return;
  var cfg = state.ruleset.skillSpecialties;
  if (!cfg || !cfg.enabled) return;
  var specs = state.sheet.skillSpecialties && state.sheet.skillSpecialties[ctx.skillName] || [];
  var sum = 0;
  var cbs = state.diceEl.querySelectorAll(".mrr-dice__spec-checkbox");
  Array.prototype.forEach.call(cbs, function(cb) {
    if (!cb.checked) return;
    var idx = parseInt(cb.getAttribute("data-idx"), 10);
    var sp = specs[idx];
    if (sp && typeof sp.value === "number" && isFinite(sp.value)) sum += sp.value;
  });
  var mode = state.ruleset.resolution.mode;
  var kind = cfg.valueKind || BONUS_KIND.VALUE;
  if (mode === MODES.POOL) {
    var poolAdd = kind === BONUS_KIND.DICE || kind === BONUS_KIND.SUCCESSES ? sum : 0;
    setDiceInput("pool", (ctx.base.pool || 0) + poolAdd);
  } else if (mode === MODES.SINGLE) {
    var modAdd = kind === BONUS_KIND.VALUE ? sum : 0;
    setDiceInput("mod", (ctx.base.mod || 0) + modAdd);
  } else if (mode === MODES.FATE) {
    var skillAdd = kind === BONUS_KIND.VALUE ? sum : 0;
    setDiceInput("skill", (ctx.base.skill || 0) + skillAdd);
  } else if (mode === MODES.UNDER) {
    var bonusAdd = kind === BONUS_KIND.VALUE ? sum : 0;
    setDiceInput("bonus", (ctx.base.bonus || 0) + bonusAdd);
  } else if (mode === MODES.STANCE) {
    return;
  } else if (mode === MODES.SUM) {
    var sumPoolAdd = kind === BONUS_KIND.DICE ? sum : 0;
    var sumPipsAdd = kind === BONUS_KIND.VALUE ? sum : 0;
    setDiceInput("pool", (ctx.base.pool || 0) + sumPoolAdd);
    setDiceInput("pips", (ctx.base.pips || 0) + sumPipsAdd);
  }
}

function mrrSubstituteTokens(formula, ctx) {
  var breakdown = [];
  var subbed = String(formula || "").replace(/\{([^}]+)\}/g, function(_, key) {
    var v, label;
    if (key.indexOf("bonuses:") === 0) {
      var bonusKey = key.slice("bonuses:".length).trim();
      var b = equippedBonuses(bonusKey);
      v = b && typeof b.value === "number" ? b.value : 0;
      label = bonusKey;
    } else {
      v = ctx && typeof ctx[key] === "number" ? ctx[key] : 0;
      label = key;
    }
    breakdown.push({
      label,
      value: v
    });
    return String(v);
  });
  return {
    substituted: subbed,
    breakdown
  };
}

function mrrComputeTooltipBreakdown(derived, ctx) {
  if (!derived || typeof derived.tooltipFormula !== "string" || !derived.tooltipFormula) return null;
  var sub = mrrSubstituteTokens(derived.tooltipFormula, ctx);
  if (!/^[\s0-9+\-*/().]*$/.test(sub.substituted)) return null;
  var num;
  try {
    num = safeEvalArithmetic(sub.substituted);
  } catch (e) {
    return null;
  }
  if (typeof num !== "number" || !isFinite(num)) return null;
  num = Math.floor(num);
  var arithLine = sub.substituted.replace(/\s+/g, " ").trim();
  var tipLines = [ derived.name + ": " + num + " = " + arithLine ];
  sub.breakdown.forEach(function(b) {
    tipLines.push("  " + b.label + " = " + b.value);
  });
  var tip = tipLines.join("\n");
  return {
    value: num,
    tooltip: tip
  };
}

function damageTypesFor(derived) {
  if (!derived || !Array.isArray(derived.damageTypes) || !derived.damageTypes.length) return null;
  return derived.damageTypes.slice().sort(function(a, b) {
    return (b.severity || 0) - (a.severity || 0);
  });
}

function ensureTrackCells(d, totalLen) {
  if (!state.sheet.trackCells || typeof state.sheet.trackCells !== "object") {
    state.sheet.trackCells = {};
  }
  if (!d || !d.name) return [];
  var name = d.name;
  var cells = state.sheet.trackCells[name];
  if (!Array.isArray(cells)) {
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
      var lightest = types[types.length - 1];
      for (var lc = 0; lc < classic; lc++) cells.push(lightest ? lightest.label : null);
    }
    state.sheet.trackCells[name] = cells;
  }
  while (cells.length < totalLen) cells.push(null);
  if (cells.length > totalLen) {
    var lastFilled = -1;
    for (var fi = 0; fi < cells.length; fi++) {
      if (cells[fi]) lastFilled = fi;
    }
    var cut = Math.max(totalLen, lastFilled + 1);
    if (cut < cells.length) {
      cells = cells.slice(0, cut);
      state.sheet.trackCells[name] = cells;
    }
  }
  return cells;
}

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
  cells.forEach(function(label) {
    if (!label) return;
    for (var j = 0; j < types.length; j++) {
      if (types[j].label === label) {
        typedObj[types[j].id] += 1;
        return;
      }
    }
  });
  state.sheet.track[name] = typedObj;
}

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
  spanEl.title = b.contributors.map(function(c) {
    return c.name + ": " + (c.value > 0 ? "+" : "") + c.value + (c.tag ? " " + c.tag : "");
  }).join("\n");
  spanEl.classList.toggle("mrr-row__bonus--neg", total < 0);
}

function renderConditions(parent) {
  var sec = marinara.addElement(parent, "div", {
    class: "mrr-section"
  });
  if (!sec) return;
  marinara.addElement(sec, "div", {
    class: "mrr-section__title",
    textContent: "Conditions"
  });
  var defs = state.ruleset && Array.isArray(state.ruleset.conditions) ? state.ruleset.conditions : [];
  var defByName = {};
  defs.forEach(function(d) {
    if (d && d.name) defByName[d.name.toLowerCase()] = d;
  });
  var active = Array.isArray(state.sheet.conditions) ? state.sheet.conditions : [];
  if (!active.length) {
    marinara.addElement(sec, "div", {
      class: "mrr-inv-empty",
      textContent: "None active."
    });
  }
  active.forEach(function(name, idx) {
    var row = marinara.addElement(sec, "div", {
      class: "mrr-skill-spec-row mrr-condition-row"
    });
    if (!row) return;
    marinara.addElement(row, "span", {
      class: "mrr-skill-spec-name",
      textContent: name
    });
    var def = defByName[String(name).toLowerCase()];
    if (def) {
      var effects = [];
      var dis = Array.isArray(def.imposesDisadvantageOn) ? def.imposesDisadvantageOn : [];
      var adv = Array.isArray(def.grantsAdvantageOn) ? def.grantsAdvantageOn : [];
      if (dis.length) effects.push("disadvantage on " + dis.join(", "));
      if (adv.length) effects.push("advantage on " + adv.join(", "));
      if (effects.length) {
        var effSpan = marinara.addElement(row, "span", {
          class: "mrr-condition-effect",
          textContent: effects.join("; ")
        });
        if (effSpan && def.description) effSpan.title = def.description;
      } else if (def.description) {
        var descSpan = marinara.addElement(row, "span", {
          class: "mrr-condition-effect",
          textContent: "(narrative)"
        });
        if (descSpan) descSpan.title = def.description;
      }
    }
    var rm = marinara.addElement(row, "button", {
      class: "mrr-track-add-btn mrr-track-add-btn--danger",
      textContent: "×",
      title: "Remove condition"
    });
    if (rm) marinara.on(rm, "click", function(e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      removeCondition(name);
    });
  });
  var addRow = marinara.addElement(sec, "div", {
    class: "mrr-skill-spec-row"
  });
  if (addRow) {
    var sel = marinara.addElement(addRow, "select", {
      class: "mrr-item-form__select"
    });
    if (sel) {
      var blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "— add condition —";
      sel.appendChild(blank);
      defs.forEach(function(d) {
        if (!d || !d.name) return;
        if (active.indexOf(d.name) !== -1) return;
        var opt = document.createElement("option");
        opt.value = d.name;
        opt.textContent = d.name;
        if (d.description) opt.title = d.description;
        sel.appendChild(opt);
      });
      var customOpt = document.createElement("option");
      customOpt.value = "__custom__";
      customOpt.textContent = "(other — type a name)";
      sel.appendChild(customOpt);
      marinara.on(sel, "change", function() {
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
  state.sheet.conditions = state.sheet.conditions.filter(function(c) {
    return c !== name;
  });
  saveSheet(state.chatId, state.sheet);
  renderSheet();
}

function conditionRollMode(category) {
  var defs = state.ruleset && Array.isArray(state.ruleset.conditions) ? state.ruleset.conditions : [];
  if (!defs.length) return "normal";
  var active = Array.isArray(state.sheet.conditions) ? state.sheet.conditions : [];
  if (!active.length) return "normal";
  var defByName = {};
  defs.forEach(function(d) {
    if (d && d.name) defByName[d.name.toLowerCase()] = d;
  });
  var hasDis = false;
  var hasAdv = false;
  for (var i = 0; i < active.length; i++) {
    var def = defByName[String(active[i]).toLowerCase()];
    if (!def) continue;
    if (Array.isArray(def.imposesDisadvantageOn) && def.imposesDisadvantageOn.indexOf(category) !== -1) hasDis = true;
    if (Array.isArray(def.grantsAdvantageOn) && def.grantsAdvantageOn.indexOf(category) !== -1) hasAdv = true;
  }
  if (hasDis) return "disadvantage";
  if (hasAdv) return "advantage";
  return "normal";
}

function renderInventoryList(parent) {
  var list = marinara.addElement(parent, "div", {
    class: "mrr-inv-list"
  });
  if (!list) return;
  function rebuild() {
    list.textContent = "";
    var inv = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
    var equipment = inv.filter(function(it) {
      return (it.category || (it.slot ? "equipment" : "item")) === "equipment";
    });
    if (!equipment.length) {
      marinara.addElement(list, "div", {
        class: "mrr-inv-empty",
        textContent: "No equipment. Use the button below to add a piece."
      });
    }
    equipment.forEach(function(item) {
      var row = marinara.addElement(list, "div", {
        class: "mrr-inv-item"
      });
      if (!row) return;
      var equippedHere = item.slot && state.sheet.equipped[item.slot] === item.id;
      if (equippedHere) row.classList.add("mrr-inv-item--equipped");
      marinara.addElement(row, "span", {
        class: "mrr-inv-item__name",
        textContent: item.name || "(unnamed)"
      });
      if (typeof item.quantity === "number" && item.quantity !== 1) {
        marinara.addElement(row, "span", {
          class: "mrr-chip mrr-chip--quantity",
          textContent: "× " + item.quantity,
          title: item.quantity + " in stack — edit via the item dialog"
        });
      }
      marinara.addElement(row, "span", {
        class: "mrr-inv-item__slot",
        textContent: item.slot ? "[" + item.slot + "]" : ""
      });
      if (item.damage) {
        marinara.addElement(row, "span", {
          class: "mrr-inv-item__damage",
          textContent: String(item.damage),
          title: "Damage: " + item.damage
        });
      }
      if (typeof item.hardness === "number" && item.hardness > 0) {
        marinara.addElement(row, "span", {
          class: "mrr-chip mrr-chip--hardness",
          textContent: "Hardness " + item.hardness,
          title: "Hardness " + item.hardness + " — incoming damage below this floor reduces to the attacker's Overwhelming"
        });
      }
      if (typeof item.overwhelming === "number" && item.overwhelming > 0) {
        marinara.addElement(row, "span", {
          class: "mrr-chip mrr-chip--overwhelming",
          textContent: "Overwhelming " + item.overwhelming,
          title: "Overwhelming " + item.overwhelming + " — minimum damage this weapon always lands, even against soak/Hardness"
        });
      }
      var commitModelInv = state.ruleset && state.ruleset.commitmentModel;
      if (commitModelInv === "attuned" && item.attuned) {
        marinara.addElement(row, "span", {
          class: "mrr-chip mrr-chip--attuned",
          textContent: "Attuned",
          title: "Attuned (D&D 5e) — magical effects from this item are currently active. 3-item attunement cap."
        });
      } else if (commitModelInv === "invested" && item.invested) {
        marinara.addElement(row, "span", {
          class: "mrr-chip mrr-chip--invested",
          textContent: "Invested",
          title: "Invested (Pathfinder 2e) — magical effects from this item are currently active. 10-item investiture cap."
        });
      } else if (commitModelInv === "mote" && typeof item.moteCommitment === "number" && item.moteCommitment > 0) {
        var poolLabel = item.motePool === "Peripheral" ? "Peripheral" : "Personal";
        marinara.addElement(row, "span", {
          class: "mrr-chip mrr-chip--mote",
          textContent: "Committed " + item.moteCommitment + "m " + poolLabel.charAt(0),
          title: "Committed: " + item.moteCommitment + " mote" + (item.moteCommitment === 1 ? "" : "s") + " from the " + poolLabel + " pool while this item is active"
        });
      }
      var summarySpan = marinara.addElement(row, "span", {
        class: "mrr-inv-item__bonus-summary",
        textContent: formatBonuses(item.bonuses, false)
      });
      if (summarySpan) summarySpan.title = formatBonuses(item.bonuses, true);
      var equipBtn = marinara.addElement(row, "button", {
        class: "mrr-char-btn" + (equippedHere ? " mrr-char-btn--accent" : ""),
        textContent: equippedHere ? "Equipped" : "Equip",
        title: item.slot ? 'Toggle equip in slot "' + item.slot + '"' : "Set a slot on this item to equip it"
      });
      if (equipBtn) marinara.on(equipBtn, "click", function() {
        toggleEquip(item);
        rebuild();
        refreshAllEquipmentBonuses();
      });
      var isSingleRoll = state.ruleset && state.ruleset.resolution && state.ruleset.resolution.mode === MODES.SINGLE;
      if (isSingleRoll && item.attackAttribute) {
        var atkBtn = marinara.addElement(row, "button", {
          class: "mrr-char-btn",
          textContent: "atk",
          title: "Roll attack: 1d20 + " + item.attackAttribute + "_mod" + (item.attackProficient ? " + proficiency" : "")
        });
        if (atkBtn) marinara.on(atkBtn, "click", function() {
          quickRollAttack(item);
        });
      }
      if (item.damage) {
        var dmgBtn = marinara.addElement(row, "button", {
          class: "mrr-char-btn",
          textContent: "dmg",
          title: "Roll damage: " + item.damage + (item.attackAttribute ? " + " + item.attackAttribute + "_mod" : "")
        });
        if (dmgBtn) marinara.on(dmgBtn, "click", function() {
          rollWeaponDamage(item);
        });
      }
      var editBtn = marinara.addElement(row, "button", {
        class: "mrr-char-btn",
        textContent: "Edit"
      });
      if (editBtn) marinara.on(editBtn, "click", function() {
        openItemDialog(item.id, rebuild);
      });
      var delBtn = marinara.addElement(row, "button", {
        class: "mrr-char-btn mrr-char-btn--danger",
        textContent: "x",
        title: "Delete this item"
      });
      if (delBtn) marinara.on(delBtn, "click", function() {
        if (!window.confirm('Delete "' + (item.name || item.id) + '"?')) return;
        deleteItem(item.id);
        rebuild();
        refreshAllEquipmentBonuses();
      });
    });
    var addBtn = marinara.addElement(list, "button", {
      class: "mrr-char-btn mrr-char-btn--dashed",
      textContent: "+ Add equipment"
    });
    if (addBtn) marinara.on(addBtn, "click", function() {
      openItemDialog(null, rebuild, "equipment");
    });
    var openBagBtn = marinara.addElement(list, "button", {
      class: "mrr-char-btn",
      textContent: "Open items",
      title: "Open the Items panel (potions, scrolls, mundane gear)"
    });
    if (openBagBtn) marinara.on(openBagBtn, "click", function() {
      showItemBag(!state.itemBagOpen);
    });
  }
  rebuild();
}

function mrrP3BuildItemBag() {
  if (state.itemBagEl) return state.itemBagEl;
  if (typeof mrrP3CreatePanel !== "function") return null;
  var p = mrrP3CreatePanel(document.body, {
    storageKey: "mrr-p3-itembag-pos",
    title: "Items — " + state.ruleset.name,
    defaultPos: {
      x: 360,
      y: 80
    },
    defaultSize: {
      w: 420,
      h: 600
    },
    onClose: function() {
      showItemBag(false);
    }
  });
  if (!p || !p.panel || !p.body) return null;
  if (p.body.classList) p.body.classList.add("mrr-spellbook__body");
  p.panel.style.display = "none";
  state.itemBagEl = p.panel;
  return state.itemBagEl;
}

function buildItemBag() {
  if (state.itemBagEl) return state.itemBagEl;
  state.itemBagEl = marinara.addElement(document.body, "div", {
    class: "mrr-spellbook"
  });
  if (!state.itemBagEl) return null;
  var header = marinara.addElement(state.itemBagEl, "div", {
    class: "mrr-spellbook__header"
  });
  if (header) {
    marinara.addElement(header, "span", {
      class: "mrr-spellbook__title",
      textContent: "Items — " + state.ruleset.name
    });
    var close = marinara.addElement(header, "button", {
      class: "mrr-dice__close",
      innerHTML: "&times;"
    });
    if (close) marinara.on(close, "click", function() {
      showItemBag(false);
    });
    makeDraggable(state.itemBagEl, header, "mrr-itembag-pos");
  }
  marinara.addElement(state.itemBagEl, "div", {
    class: "mrr-spellbook__body"
  });
  return state.itemBagEl;
}

function showItemBag(open) {
  if (open) {
    if (!state.itemBagEl) {
      if (typeof mrrP3BuildItemBag === "function") mrrP3BuildItemBag(); else buildItemBag();
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
  var items = inv.filter(function(it) {
    return (it.category || (it.slot ? "equipment" : "item")) === "item";
  });
  if (!items.length) {
    marinara.addElement(body, "div", {
      class: "mrr-inv-empty",
      textContent: "No items. Add a potion, scroll, or piece of mundane gear below."
    });
  }
  items.forEach(function(item) {
    var row = marinara.addElement(body, "div", {
      class: "mrr-inv-item"
    });
    if (!row) return;
    marinara.addElement(row, "span", {
      class: "mrr-inv-item__name",
      textContent: item.name || "(unnamed)"
    });
    if (typeof item.quantity === "number" && item.quantity > 1) {
      marinara.addElement(row, "span", {
        class: "mrr-inv-item__slot",
        textContent: "x" + item.quantity
      });
    }
    if (item.useEffect) {
      var fx = marinara.addElement(row, "span", {
        class: "mrr-inv-item__damage",
        textContent: item.useEffect,
        title: "Use effect: " + item.useEffect + (item.consumable ? " — consumed on use" : "")
      });
    }
    if (item.useEffect) {
      var useBtn = marinara.addElement(row, "button", {
        class: "mrr-char-btn mrr-char-btn--accent",
        textContent: "Use",
        title: "Roll the effect dice and post a [mrr-use:] tag for the GM to apply"
      });
      if (useBtn) marinara.on(useBtn, "click", function() {
        useItem(item);
      });
    }
    var editBtn = marinara.addElement(row, "button", {
      class: "mrr-char-btn",
      textContent: "Edit"
    });
    if (editBtn) marinara.on(editBtn, "click", function() {
      openItemDialog(item.id, renderItemBagContents);
    });
    var delBtn = marinara.addElement(row, "button", {
      class: "mrr-char-btn mrr-char-btn--danger",
      textContent: "x",
      title: "Delete this item"
    });
    if (delBtn) marinara.on(delBtn, "click", function() {
      if (!window.confirm('Delete "' + (item.name || item.id) + '"?')) return;
      deleteItem(item.id);
      renderItemBagContents();
    });
  });
  var addBtn = marinara.addElement(body, "button", {
    class: "mrr-char-btn mrr-char-btn--dashed",
    textContent: "+ Add item"
  });
  if (addBtn) marinara.on(addBtn, "click", function() {
    openItemDialog(null, renderItemBagContents, "item");
  });
}

function useItem(item) {
  if (!item || !item.useEffect) return;
  var faces = [];
  var rolledText = "";
  var parsed = parseDamageExpression(item.useEffect);
  if (parsed) {
    var rolled = rollParsedDamage(parsed, {
      label: (item.name || "item") + " effect"
    });
    faces = rolled.faces;
    rolledText = rolled.text.replace(/^\[damage:\s*/, "").replace(/\s*\]$/, "");
  } else {
    rolledText = item.useEffect;
  }
  var tagParts = [ '[mrr-use: name="' + (item.name || "item") + '"' ];
  tagParts.push('effect="' + String(item.useEffect).replace(/"/g, "'") + '"');
  if (rolledText) tagParts.push('rolled="' + rolledText.replace(/"/g, "'") + '"');
  if (item.consumable) tagParts.push('consumable="true"');
  var useTag = tagParts.join(" ") + "]";
  if (item.consumable) {
    var inv = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
    var idx = inv.findIndex(function(it) {
      return it.id === item.id;
    });
    if (idx >= 0) {
      var q = typeof inv[idx].quantity === "number" ? inv[idx].quantity : 1;
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
  return bonuses.map(function(b) {
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
  var wasEquipped = state.sheet.equipped[item.slot] === item.id;
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
  var removed = null;
  for (var ri = 0; ri < state.sheet.inventory.length; ri++) {
    if (state.sheet.inventory[ri] && state.sheet.inventory[ri].id === id) {
      removed = state.sheet.inventory[ri];
      break;
    }
  }
  state.sheet.inventory = state.sheet.inventory.filter(function(it) {
    return it.id !== id;
  });
  if (state.sheet.equipped) {
    Object.keys(state.sheet.equipped).forEach(function(slot) {
      if (state.sheet.equipped[slot] === id) delete state.sheet.equipped[slot];
    });
  }
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
  if (rs && Array.isArray(rs.attributes)) rs.attributes.forEach(function(a) {
    names.push(a.name);
  });
  if (rs && Array.isArray(rs.skills)) rs.skills.forEach(function(s) {
    names.push(s.name);
  });
  if (rs && Array.isArray(rs.derivedStats)) rs.derivedStats.forEach(function(d) {
    names.push(d.name);
  });
  if (rs && Array.isArray(rs.equipmentBonusTargets)) {
    rs.equipmentBonusTargets.forEach(function(t) {
      if (names.indexOf(t) === -1) names.push(t);
    });
  }
  return names;
}

function openItemDialog(itemId, onSaved, defaultCategory) {
  if (state.itemDialogEl && state.itemDialogEl.parentNode) {
    state.itemDialogEl.parentNode.removeChild(state.itemDialogEl);
  }
  var backdrop = marinara.addElement(document.body, "div", {
    class: "mrr-dialog-backdrop mrr-dialog-backdrop--open"
  });
  if (!backdrop) return;
  state.itemDialogEl = backdrop;
  var dialog = marinara.addElement(backdrop, "div", {
    class: "mrr-dialog"
  });
  if (!dialog) {
    document.body.removeChild(backdrop);
    state.itemDialogEl = null;
    return;
  }
  var existing = null;
  if (itemId && Array.isArray(state.sheet.inventory)) {
    existing = state.sheet.inventory.find(function(it) {
      return it.id === itemId;
    }) || null;
  }
  var draft = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: "item-" + Date.now() + "-" + Math.floor(Math.random() * 1e3),
    name: "",
    slot: "",
    bonuses: [],
    notes: "",
    category: defaultCategory === "item" || defaultCategory === "equipment" ? defaultCategory : "equipment",
    useEffect: "",
    consumable: false
  };
  marinara.addElement(dialog, "h3", {
    textContent: existing ? "Edit Item" : "New Item"
  });
  var catRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(catRow, "label", {
    textContent: "Category"
  });
  var catSel = marinara.addElement(catRow, "select", {
    class: "mrr-item-form__select"
  });
  if (catSel) {
    [ {
      value: "equipment",
      label: "Equipment (slot, equip, atk/dmg)"
    }, {
      value: "item",
      label: "Item (stored, usable, consumable)"
    } ].forEach(function(o) {
      var opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      if ((draft.category || "equipment") === o.value) opt.selected = true;
      catSel.appendChild(opt);
    });
  }
  var nameRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(nameRow, "label", {
    textContent: "Name"
  });
  var nameInput = marinara.addElement(nameRow, "input", {
    class: "mrr-item-form__input",
    type: "text",
    value: draft.name || "",
    placeholder: "Daiklave of Glory"
  });
  var slotRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(slotRow, "label", {
    textContent: "Slot"
  });
  var slotInput = marinara.addElement(slotRow, "input", {
    class: "mrr-item-form__input",
    type: "text",
    value: draft.slot || "",
    placeholder: "weapon, armor, etc.",
    list: "mrr-slot-suggestions"
  });
  var slots = state.ruleset && Array.isArray(state.ruleset.equipmentSlots) ? state.ruleset.equipmentSlots : [];
  if (slots.length) {
    var dl = marinara.addElement(dialog, "datalist", {
      id: "mrr-slot-suggestions"
    });
    if (dl) slots.forEach(function(s) {
      marinara.addElement(dl, "option", {
        value: s
      });
    });
  }
  var damageRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(damageRow, "label", {
    textContent: "Damage"
  });
  var damageInput = marinara.addElement(damageRow, "input", {
    class: "mrr-item-form__input",
    type: "text",
    value: draft.damage || "",
    placeholder: "1d8 slashing"
  });
  var attrRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(attrRow, "label", {
    textContent: "Atk attr"
  });
  var attrSel = marinara.addElement(attrRow, "select", {
    class: "mrr-item-form__select"
  });
  if (attrSel) {
    var blankOpt = document.createElement("option");
    blankOpt.value = "";
    blankOpt.textContent = "—";
    attrSel.appendChild(blankOpt);
    (state.ruleset.attributes || []).forEach(function(a) {
      var opt = document.createElement("option");
      opt.value = a.name;
      opt.textContent = a.name;
      if (draft.attackAttribute === a.name) opt.selected = true;
      attrSel.appendChild(opt);
    });
  }
  var profRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(profRow, "label", {
    textContent: "Proficient"
  });
  var profInput = marinara.addElement(profRow, "input", {
    type: "checkbox"
  });
  if (profInput && draft.attackProficient) profInput.checked = true;
  var hardRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row mrr-item-form__row--equipment-only"
  });
  marinara.addElement(hardRow, "label", {
    textContent: "Hardness"
  });
  var hardInput = marinara.addElement(hardRow, "input", {
    class: "mrr-item-form__input",
    type: "number",
    min: "0",
    step: "1",
    value: String(typeof draft.hardness === "number" ? draft.hardness : 0),
    placeholder: "0"
  });
  var overRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row mrr-item-form__row--equipment-only"
  });
  marinara.addElement(overRow, "label", {
    textContent: "Overwhelming"
  });
  var overInput = marinara.addElement(overRow, "input", {
    class: "mrr-item-form__input",
    type: "number",
    min: "0",
    step: "1",
    value: String(typeof draft.overwhelming === "number" ? draft.overwhelming : 0),
    placeholder: "0"
  });
  function applyEquipmentVisibility() {
    var isEquipment = catSel && catSel.value === "equipment";
    if (hardRow) hardRow.style.display = isEquipment ? "" : "none";
    if (overRow) overRow.style.display = isEquipment ? "" : "none";
  }
  applyEquipmentVisibility();
  if (catSel) marinara.on(catSel, "change", applyEquipmentVisibility);
  var commitmentModel = state.ruleset && state.ruleset.commitmentModel || null;
  var attuneInput = null;
  var investInput = null;
  var moteCommitInput = null;
  var motePoolSel = null;
  var commitmentRows = [];
  if (commitmentModel) {
    var commitTitle = marinara.addElement(dialog, "div", {
      class: "mrr-bonus-list__title",
      textContent: "Magic / Commitment"
    });
    if (commitTitle) commitmentRows.push(commitTitle);
    if (commitmentModel === "attuned" || commitmentModel === "invested") {
      var labelText = commitmentModel === "attuned" ? "Attuned" : "Invested";
      var capN = commitmentModel === "attuned" ? 3 : 10;
      var commitRow = marinara.addElement(dialog, "div", {
        class: "mrr-item-form__row"
      });
      if (commitRow) {
        commitmentRows.push(commitRow);
        marinara.addElement(commitRow, "label", {
          textContent: labelText
        });
        var commitBox = marinara.addElement(commitRow, "input", {
          type: "checkbox"
        });
        if (commitBox) {
          var prevSet = !!(commitmentModel === "attuned" ? draft.attuned : draft.invested);
          if (prevSet) commitBox.checked = true;
          marinara.on(commitBox, "change", function() {
            if (!commitBox.checked) {
              if (msg) msg.classList.add("mrr-msg--hidden");
              return;
            }
            var inv = Array.isArray(state.sheet.inventory) ? state.sheet.inventory : [];
            var inUse = 0;
            for (var i = 0; i < inv.length; i++) {
              var other = inv[i];
              if (!other || other.id === draft.id) continue;
              if (commitmentModel === "attuned" && other.attuned) inUse += 1; else if (commitmentModel === "invested" && other.invested) inUse += 1;
            }
            if (inUse >= capN) {
              commitBox.checked = false;
              setMsg(msg, labelText + " cap of " + capN + " reached. Remove another " + labelText.toLowerCase() + " item first.", "err");
            } else {
              if (msg) msg.classList.add("mrr-msg--hidden");
            }
          });
        }
        if (commitmentModel === "attuned") attuneInput = commitBox; else investInput = commitBox;
      }
    } else if (commitmentModel === "mote") {
      var moteRow = marinara.addElement(dialog, "div", {
        class: "mrr-item-form__row"
      });
      if (moteRow) {
        commitmentRows.push(moteRow);
        marinara.addElement(moteRow, "label", {
          textContent: "Mote commit"
        });
        moteCommitInput = marinara.addElement(moteRow, "input", {
          class: "mrr-item-form__input",
          type: "number",
          min: "0",
          step: "1",
          value: String(typeof draft.moteCommitment === "number" ? draft.moteCommitment : 0),
          placeholder: "0"
        });
      }
      var poolRow = marinara.addElement(dialog, "div", {
        class: "mrr-item-form__row"
      });
      if (poolRow) {
        commitmentRows.push(poolRow);
        marinara.addElement(poolRow, "label", {
          textContent: "Pool"
        });
        motePoolSel = marinara.addElement(poolRow, "select", {
          class: "mrr-item-form__select"
        });
        if (motePoolSel) {
          [ "Personal", "Peripheral" ].forEach(function(poolName) {
            var opt = document.createElement("option");
            opt.value = poolName;
            opt.textContent = poolName;
            if ((draft.motePool || "Personal") === poolName) opt.selected = true;
            motePoolSel.appendChild(opt);
          });
        }
      }
    }
  }
  function applyCommitmentVisibility() {
    var isEquipment = catSel && catSel.value === "equipment";
    for (var i = 0; i < commitmentRows.length; i++) {
      commitmentRows[i].style.display = isEquipment ? "" : "none";
    }
  }
  applyCommitmentVisibility();
  if (catSel) marinara.on(catSel, "change", applyCommitmentVisibility);
  marinara.addElement(dialog, "div", {
    class: "mrr-bonus-list__title",
    textContent: "Bonuses"
  });
  var bonusList = marinara.addElement(dialog, "div", {
    class: "mrr-bonus-list"
  });
  if (!bonusList) return;
  var targets = bonusTargetCandidates();
  function renderBonusRow(b, idx) {
    var row = marinara.addElement(bonusList, "div", {
      class: "mrr-bonus-row"
    });
    if (!row) return;
    var targetSel = marinara.addElement(row, "select", {
      class: "mrr-bonus-row__input"
    });
    if (targetSel) {
      var blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "(target)";
      targetSel.appendChild(blank);
      targets.forEach(function(t) {
        var opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        if (t === b.target) opt.selected = true;
        targetSel.appendChild(opt);
      });
      marinara.on(targetSel, "change", function() {
        draft.bonuses[idx].target = targetSel.value;
      });
    }
    var valInput = marinara.addElement(row, "input", {
      class: "mrr-bonus-row__input",
      type: "number",
      value: String(b.value || 0)
    });
    if (valInput) marinara.on(valInput, "input", function() {
      var n = parseInt(valInput.value, 10);
      draft.bonuses[idx].value = isNaN(n) ? 0 : n;
    });
    var kindSel = marinara.addElement(row, "select", {
      class: "mrr-bonus-row__input"
    });
    if (kindSel) {
      Object.keys(BONUS_KIND).forEach(function(k) {
        var v = BONUS_KIND[k];
        var opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        if (v === (b.kind || BONUS_KIND.VALUE)) opt.selected = true;
        kindSel.appendChild(opt);
      });
      marinara.on(kindSel, "change", function() {
        draft.bonuses[idx].kind = kindSel.value;
      });
    }
    var tagInput = marinara.addElement(row, "input", {
      class: "mrr-bonus-row__input",
      type: "text",
      value: b.tag || "",
      placeholder: "tag (accuracy)"
    });
    if (tagInput) marinara.on(tagInput, "input", function() {
      draft.bonuses[idx].tag = tagInput.value;
    });
    var rmBtn = marinara.addElement(row, "button", {
      class: "mrr-char-btn mrr-char-btn--danger",
      textContent: "x",
      title: "Remove this bonus"
    });
    if (rmBtn) marinara.on(rmBtn, "click", function() {
      draft.bonuses.splice(idx, 1);
      bonusList.textContent = "";
      draft.bonuses.forEach(renderBonusRow);
    });
  }
  draft.bonuses.forEach(renderBonusRow);
  var addBonusBtn = marinara.addElement(dialog, "button", {
    class: "mrr-char-btn mrr-char-btn--dashed",
    textContent: "+ Add bonus"
  });
  if (addBonusBtn) marinara.on(addBonusBtn, "click", function() {
    var newBonus = {
      target: "",
      value: 0,
      kind: BONUS_KIND.VALUE,
      tag: ""
    };
    draft.bonuses.push(newBonus);
    renderBonusRow(newBonus, draft.bonuses.length - 1);
  });
  var useRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(useRow, "label", {
    textContent: "Use effect"
  });
  var useInput = marinara.addElement(useRow, "input", {
    class: "mrr-item-form__input",
    type: "text",
    value: draft.useEffect || "",
    placeholder: "2d4+2 healing  ·  remove poisoned  ·  1d6 fire"
  });
  var consRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(consRow, "label", {
    textContent: "Consumable"
  });
  var consInput = marinara.addElement(consRow, "input", {
    type: "checkbox"
  });
  if (consInput && draft.consumable) consInput.checked = true;
  var qtyRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(qtyRow, "label", {
    textContent: "Quantity"
  });
  var qtyInput = marinara.addElement(qtyRow, "input", {
    type: "number",
    class: "mrr-item-form__field",
    min: "0",
    step: "1"
  });
  if (qtyInput) qtyInput.value = String(typeof draft.quantity === "number" ? draft.quantity : 1);
  var notesRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(notesRow, "label", {
    textContent: "Notes"
  });
  var notesInput = marinara.addElement(notesRow, "textarea", {
    class: "mrr-item-form__textarea"
  });
  if (notesInput) notesInput.value = draft.notes || "";
  var msg = marinara.addElement(dialog, "div", {
    class: "mrr-msg mrr-msg--info mrr-msg--hidden"
  });
  var buttons = marinara.addElement(dialog, "div", {
    class: "mrr-dialog__buttons"
  });
  if (buttons) {
    var btnCancel = marinara.addElement(buttons, "button", {
      class: "mrr-dice__btn mrr-dice__btn--secondary",
      textContent: "Cancel"
    });
    var btnSave = marinara.addElement(buttons, "button", {
      class: "mrr-dice__btn",
      textContent: "Save"
    });
    if (btnCancel) marinara.on(btnCancel, "click", function() {
      close();
    });
    if (btnSave) marinara.on(btnSave, "click", function() {
      var name = (nameInput && nameInput.value || "").trim();
      if (!name) {
        setMsg(msg, "Name is required.", "err");
        return;
      }
      draft.name = name;
      draft.slot = (slotInput && slotInput.value || "").trim();
      draft.damage = (damageInput && damageInput.value || "").trim();
      draft.attackAttribute = attrSel && attrSel.value || "";
      draft.attackProficient = !!(profInput && profInput.checked);
      draft.notes = (notesInput && notesInput.value || "").trim();
      draft.category = catSel && catSel.value === "item" ? "item" : "equipment";
      draft.useEffect = (useInput && useInput.value || "").trim();
      draft.consumable = !!(consInput && consInput.checked);
      var qn = qtyInput ? parseInt(qtyInput.value, 10) : 1;
      draft.quantity = !isNaN(qn) && qn >= 0 ? Math.floor(qn) : 1;
      if (draft.category === "equipment") {
        var ph = parseInt(hardInput && hardInput.value, 10);
        draft.hardness = !isNaN(ph) && ph >= 0 ? ph : 0;
        var po = parseInt(overInput && overInput.value, 10);
        draft.overwhelming = !isNaN(po) && po >= 0 ? po : 0;
      } else {
        draft.hardness = 0;
        draft.overwhelming = 0;
      }
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
        var newMotes = !isNaN(pmc) && pmc >= 0 ? pmc : 0;
        var newPool = motePoolSel && motePoolSel.value === "Peripheral" ? "Peripheral" : "Personal";
        var oldMotes = existing && typeof existing.moteCommitment === "number" && existing.moteCommitment > 0 ? existing.moteCommitment : 0;
        var oldPool = existing && existing.motePool === "Peripheral" ? "Peripheral" : "Personal";
        var oldPoolKey = oldPool + " Motes";
        var newPoolKey = newPool + " Motes";
        if (!state.sheet.derived) state.sheet.derived = {};
        if (typeof state.sheet.derived[oldPoolKey] !== "number") state.sheet.derived[oldPoolKey] = 0;
        if (typeof state.sheet.derived[newPoolKey] !== "number") state.sheet.derived[newPoolKey] = 0;
        var simOldM = state.sheet.derived[oldPoolKey] + oldMotes;
        var simNewM = (oldPoolKey === newPoolKey ? simOldM : state.sheet.derived[newPoolKey]) - newMotes;
        if (simNewM < 0) {
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
      draft.bonuses = (draft.bonuses || []).filter(function(b) {
        return b && b.target;
      });
      if (!Array.isArray(state.sheet.inventory)) state.sheet.inventory = [];
      var existingIdx = state.sheet.inventory.findIndex(function(it) {
        return it.id === draft.id;
      });
      if (existingIdx >= 0) state.sheet.inventory[existingIdx] = draft; else state.sheet.inventory.push(draft);
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
  marinara.on(backdrop, "click", function(e) {
    if (e.target === backdrop) close();
  });
}

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
  Object.keys(state.sheet.abilities).forEach(function(k) {
    var arr = state.sheet.abilities[k];
    if (Array.isArray(arr)) n += arr.length;
  });
  return n;
}

function renderAbilitiesSection(parent) {
  var cfg = getAbilitiesConfig();
  if (!cfg) return;
  var sec = marinara.addElement(parent, "div", {
    class: "mrr-section mrr-spellbook-row"
  });
  if (!sec) return;
  var btn = marinara.addElement(sec, "button", {
    class: "mrr-char-btn mrr-char-btn--dashed mrr-spellbook-row__btn",
    type: "button",
    textContent: cfg.label + " (" + totalAbilityCount() + ")"
  });
  if (btn) marinara.on(btn, "click", function() {
    showSpellbook(!state.spellbookOpen);
  });
}

function showSpellbook(open) {
  if (!getAbilitiesConfig()) {
    state.spellbookOpen = false;
    return;
  }
  if (open) {
    if (!state.spellbookEl) {
      if (typeof mrrP3BuildSpellbook === "function") mrrP3BuildSpellbook(); else buildSpellbook();
    }
    if (state.spellbookEl) {
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

function mrrP3BuildSpellbook() {
  if (state.spellbookEl) return state.spellbookEl;
  if (typeof mrrP3CreatePanel !== "function") return null;
  var cfg = typeof getAbilitiesConfig === "function" ? getAbilitiesConfig() : null;
  var titleText = (cfg && cfg.label ? cfg.label : "Spellbook") + " — " + state.ruleset.name;
  var p = mrrP3CreatePanel(document.body, {
    storageKey: "mrr-p3-spellbook-pos",
    title: titleText,
    defaultPos: {
      x: 360,
      y: 80
    },
    defaultSize: {
      w: 420,
      h: 640
    },
    onClose: function() {
      showSpellbook(false);
    }
  });
  if (!p || !p.panel || !p.body) return null;
  if (p.body.classList) p.body.classList.add("mrr-spellbook__body");
  p.panel.style.display = "none";
  state.spellbookEl = p.panel;
  return state.spellbookEl;
}

function buildSpellbook() {
  if (state.spellbookEl) return state.spellbookEl;
  state.spellbookEl = marinara.addElement(document.body, "div", {
    class: "mrr-spellbook"
  });
  if (!state.spellbookEl) return null;
  var header = marinara.addElement(state.spellbookEl, "div", {
    class: "mrr-spellbook__header"
  });
  if (header) {
    var cfg = getAbilitiesConfig();
    var titleText = (cfg && cfg.label ? cfg.label : "Spellbook") + " — " + state.ruleset.name;
    marinara.addElement(header, "span", {
      class: "mrr-spellbook__title",
      textContent: titleText
    });
    var close = marinara.addElement(header, "button", {
      class: "mrr-dice__close",
      innerHTML: "&times;"
    });
    if (close) marinara.on(close, "click", function() {
      showSpellbook(false);
    });
    makeDraggable(state.spellbookEl, header, LS_SPELLBOOK_POS);
  }
  marinara.addElement(state.spellbookEl, "div", {
    class: "mrr-spellbook__body"
  });
  return state.spellbookEl;
}

function renderSpellbookContents() {
  if (!state.spellbookEl) return;
  var body = state.spellbookEl.querySelector(".mrr-spellbook__body");
  if (!body) return;
  body.textContent = "";
  var cfg = getAbilitiesConfig();
  if (!cfg) {
    marinara.addElement(body, "div", {
      class: "mrr-msg mrr-msg--info",
      textContent: "This ruleset has no abilities defined."
    });
    return;
  }
  if (!state.sheet.abilityCollapse || typeof state.sheet.abilityCollapse !== "object") {
    state.sheet.abilityCollapse = {};
  }
  if (!state.sheet.abilities || typeof state.sheet.abilities !== "object") {
    state.sheet.abilities = {};
  }
  var declaredIds = {};
  cfg.categories.forEach(function(cat) {
    declaredIds[cat.id] = true;
    renderSpellbookCategory(body, cat);
  });
  if (Array.isArray(state.sheet.customAbilityCategories)) {
    state.sheet.customAbilityCategories.forEach(function(cat) {
      if (!cat || !cat.id) return;
      declaredIds[cat.id] = true;
      renderSpellbookCategory(body, cat, null, true);
    });
  }
  var orphans = Object.keys(state.sheet.abilities).filter(function(k) {
    return !declaredIds[k] && Array.isArray(state.sheet.abilities[k]) && state.sheet.abilities[k].length > 0;
  });
  if (orphans.length) {
    var pseudoCat = {
      id: "__uncategorized",
      label: "Uncategorized"
    };
    orphans.forEach(function(catId) {
      var arr = state.sheet.abilities[catId];
      arr.forEach(function(ab) {
        ab.__orphanCategoryId = catId;
      });
    });
    renderSpellbookCategory(body, pseudoCat, orphans);
  }
  var addCustomBtn = marinara.addElement(body, "button", {
    class: "mrr-char-btn mrr-char-btn--dashed",
    type: "button",
    textContent: "+ Add " + (cfg.label || "Category")
  });
  if (addCustomBtn) marinara.on(addCustomBtn, "click", function() {
    var name = window.prompt("Name for the new " + (cfg.label || "category").toLowerCase() + ":");
    if (!name || !name.trim()) return;
    if (!Array.isArray(state.sheet.customAbilityCategories)) state.sheet.customAbilityCategories = {};
    var nameTrim = name.trim();
    var slug = nameTrim.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    var newId = "custom-" + (slug || "unnamed") + "-" + Date.now().toString(36);
    if (!Array.isArray(state.sheet.customAbilityCategories)) state.sheet.customAbilityCategories = [];
    state.sheet.customAbilityCategories.push({
      id: newId,
      label: nameTrim
    });
    saveSheet(state.chatId, state.sheet);
    renderSpellbookContents();
  });
}

function renderSpellbookCategory(body, cat, orphanCategoryIds, isCustom) {
  var sec = marinara.addElement(body, "div", {
    class: "mrr-spellbook-cat"
  });
  if (!sec) return;
  var count = orphanCategoryIds ? orphanCategoryIds.reduce(function(n, id) {
    return n + abilityCountForCategory(id);
  }, 0) : abilityCountForCategory(cat.id);
  var collapsed = cat.id in state.sheet.abilityCollapse ? !!state.sheet.abilityCollapse[cat.id] : true;
  if (collapsed) sec.classList.add("mrr-spellbook-cat--collapsed");
  var headRow = marinara.addElement(sec, "div", {
    class: "mrr-spellbook-cat__head-row"
  });
  if (!headRow) return;
  var head = marinara.addElement(headRow, "button", {
    class: "mrr-spellbook-cat__head",
    type: "button",
    textContent: cat.label + " " + count
  });
  if (head) marinara.on(head, "click", function() {
    state.sheet.abilityCollapse[cat.id] = !state.sheet.abilityCollapse[cat.id] ? false : true;
    var nowCollapsed = sec.classList.toggle("mrr-spellbook-cat--collapsed");
    state.sheet.abilityCollapse[cat.id] = nowCollapsed;
    saveSheet(state.chatId, state.sheet);
  });
  var isPoolMode = state.ruleset && state.ruleset.resolution && state.ruleset.resolution.mode === "dice-pool";
  if (isPoolMode && !orphanCategoryIds) {
    if (!state.sheet.abilityCategoryScores || typeof state.sheet.abilityCategoryScores !== "object") {
      state.sheet.abilityCategoryScores = {};
    }
    var curScore = state.sheet.abilityCategoryScores[cat.id];
    if (typeof curScore !== "number") curScore = 0;
    var scoreInput = marinara.addElement(headRow, "input", {
      class: "mrr-spellbook-cat__score",
      type: "number",
      min: "0",
      max: "10",
      step: "1",
      title: "Rating (0-10)"
    });
    if (scoreInput) {
      scoreInput.value = String(curScore);
      marinara.on(scoreInput, "click", function(e) {
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      });
      marinara.on(scoreInput, "change", function() {
        var n = parseInt(scoreInput.value, 10);
        if (isNaN(n) || n < 0) n = 0;
        if (n > 10) n = 10;
        state.sheet.abilityCategoryScores[cat.id] = n;
        saveSheet(state.chatId, state.sheet);
      });
    }
  }
  if (isCustom) {
    var delCatBtn = marinara.addElement(headRow, "button", {
      class: "mrr-char-btn mrr-char-btn--danger",
      type: "button",
      textContent: "×",
      title: "Remove this custom " + (cat.label || "category")
    });
    if (delCatBtn) marinara.on(delCatBtn, "click", function(e) {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      if (!window.confirm("Remove " + (cat.label || "category") + " and all its abilities?")) return;
      if (Array.isArray(state.sheet.customAbilityCategories)) {
        state.sheet.customAbilityCategories = state.sheet.customAbilityCategories.filter(function(c) {
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
  var list = marinara.addElement(sec, "div", {
    class: "mrr-spellbook-cat__list"
  });
  if (!list) return;
  var iterIds = orphanCategoryIds || [ cat.id ];
  iterIds.forEach(function(catId) {
    var abs = state.sheet.abilities[catId];
    if (!Array.isArray(abs)) return;
    abs.forEach(function(ab) {
      renderAbilityRow(list, ab, catId);
    });
  });
  if (!orphanCategoryIds) {
    var addBtn = marinara.addElement(sec, "button", {
      class: "mrr-char-btn mrr-char-btn--dashed mrr-spellbook-cat__add",
      type: "button",
      textContent: "+ Add"
    });
    if (addBtn) marinara.on(addBtn, "click", function() {
      openAbilityDialog(null, cat.id);
    });
  }
}

function renderAbilityRow(list, ab, catId) {
  var row = marinara.addElement(list, "div", {
    class: "mrr-spellbook-ab"
  });
  if (!row) return;
  marinara.addElement(row, "span", {
    class: "mrr-spellbook-ab__name",
    textContent: ab.name || "(unnamed)"
  });
  marinara.addElement(row, "span", {
    class: "mrr-spellbook-ab__cost",
    textContent: ab.costText || ""
  });
  var hasCastData = !!(ab.damageDice || ab.saveAttribute || ab.spellcastingAttribute);
  var isPoolModeRow = state.ruleset && state.ruleset.resolution && state.ruleset.resolution.mode === "dice-pool";
  if (state.ruleset && state.ruleset.resolution && (state.ruleset.resolution.mode === MODES.SINGLE && hasCastData || isPoolModeRow)) {
    var castBtn = marinara.addElement(row, "button", {
      class: "mrr-char-btn mrr-char-btn--accent",
      type: "button",
      textContent: "Cast",
      title: isPoolModeRow ? "Announce activation in chat with name + cost" : "Compute DC, roll damage, post chat tag for the GM to resolve"
    });
    if (castBtn) marinara.on(castBtn, "click", function() {
      if (isPoolModeRow) castAbilityPool(ab, catId); else castSpell(ab);
    });
  }
  var editBtn = marinara.addElement(row, "button", {
    class: "mrr-char-btn",
    type: "button",
    textContent: "Edit"
  });
  if (editBtn) marinara.on(editBtn, "click", function() {
    openAbilityDialog(ab.id, catId);
  });
  var delBtn = marinara.addElement(row, "button", {
    class: "mrr-char-btn mrr-char-btn--danger",
    type: "button",
    textContent: "x",
    title: "Delete"
  });
  if (delBtn) marinara.on(delBtn, "click", function() {
    if (!window.confirm('Delete "' + (ab.name || ab.id) + '"?')) return;
    deleteAbility(catId, ab.id);
  });
}

function castAbilityPool(ability, catId) {
  if (!ability || !state.ruleset) return;
  var name = String(ability.name || "ability");
  var cost = String(ability.costText || "");
  var catLabel = "";
  if (catId) {
    var cfg = typeof getAbilitiesConfig === "function" ? getAbilitiesConfig() : null;
    if (cfg && Array.isArray(cfg.categories)) {
      for (var i = 0; i < cfg.categories.length; i++) {
        if (cfg.categories[i].id === catId) {
          catLabel = cfg.categories[i].label;
          break;
        }
      }
    }
    if (!catLabel && Array.isArray(state.sheet.customAbilityCategories)) {
      for (var j = 0; j < state.sheet.customAbilityCategories.length; j++) {
        if (state.sheet.customAbilityCategories[j].id === catId) {
          catLabel = state.sheet.customAbilityCategories[j].label;
          break;
        }
      }
    }
  }
  var rating = "";
  if (catId && state.sheet.abilityCategoryScores && typeof state.sheet.abilityCategoryScores[catId] === "number") {
    rating = String(state.sheet.abilityCategoryScores[catId]);
  }
  var commitModel = state.ruleset.commitmentModel || null;
  if (cost && commitModel === "mote") {
    var _d = state.sheet.derived || {};
    var _mReq = 0, _wReq = 0;
    var _mM = cost.match(/(\d+)\s*m\b(?!p)/i);
    if (_mM) _mReq = parseInt(_mM[1], 10) || 0;
    var _wM = cost.match(/(\d+)\s*(?:wp\b|willpower)/i);
    if (_wM) _wReq = parseInt(_wM[1], 10) || 0;
    var _mAvail = (typeof _d["Peripheral Motes"] === "number" ? _d["Peripheral Motes"] : 0) + (typeof _d["Personal Motes"] === "number" ? _d["Personal Motes"] : 0);
    var _wAvail = typeof _d["Willpower"] === "number" ? _d["Willpower"] : 0;
    if (_mReq > 0 && _mAvail < _mReq || _wReq > 0 && _wAvail < _wReq) {
      warn("cast refused: " + name + " needs " + cost + " but pools hold " + _mAvail + "m / " + _wAvail + "wp");
      if (typeof window !== "undefined" && window.alert) {
        window.alert("Not enough to cast " + name + " (" + cost + "). You have " + _mAvail + " motes and " + _wAvail + " willpower.");
      }
      return;
    }
  } else if (cost && commitModel !== "attuned") {
    var _bReq = 0, _bM = cost.match(/(\d+)\s*(?:b\b|blood)/i);
    if (_bM) _bReq = parseInt(_bM[1], 10) || 0;
    if (_bReq > 0) {
      var _bAvail = state.sheet.derived && typeof state.sheet.derived["Blood Pool"] === "number" ? state.sheet.derived["Blood Pool"] : 0;
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
    var moteMatch = cost.match(/(\d+)\s*m\b(?!p)/i);
    if (moteMatch) {
      var moteCost = parseInt(moteMatch[1], 10) || 0;
      var peri = typeof state.sheet.derived["Peripheral Motes"] === "number" ? state.sheet.derived["Peripheral Motes"] : 0;
      if (peri >= moteCost) {
        state.sheet.derived["Peripheral Motes"] = peri - moteCost;
      } else {
        state.sheet.derived["Peripheral Motes"] = 0;
        var overflow = moteCost - peri;
        var pers = typeof state.sheet.derived["Personal Motes"] === "number" ? state.sheet.derived["Personal Motes"] : 0;
        state.sheet.derived["Personal Motes"] = Math.max(0, pers - overflow);
      }
    }
    var wpMatch = cost.match(/(\d+)\s*(?:wp\b|willpower)/i);
    if (wpMatch) {
      var wpCost = parseInt(wpMatch[1], 10) || 0;
      var wp = typeof state.sheet.derived["Willpower"] === "number" ? state.sheet.derived["Willpower"] : 0;
      state.sheet.derived["Willpower"] = Math.max(0, wp - wpCost);
    }
    if (moteMatch || wpMatch) {
      saveSheet(state.chatId, state.sheet);
      if (typeof refreshAllBars === "function") refreshAllBars();
    }
  } else if (cost && commitModel === "attuned") {} else if (cost) {
    var bloodMatch = cost.match(/(\d+)\s*(?:b\b|blood)/i);
    if (bloodMatch && state.sheet.derived && typeof state.sheet.derived["Blood Pool"] === "number") {
      var bloodCost = parseInt(bloodMatch[1], 10) || 0;
      state.sheet.derived["Blood Pool"] = Math.max(0, state.sheet.derived["Blood Pool"] - bloodCost);
      saveSheet(state.chatId, state.sheet);
      if (typeof refreshAllBars === "function") refreshAllBars();
    }
  }
  var parts = [ '[mrr-cast: name="' + name.replace(/"/g, '\\"') + '"' ];
  if (catLabel) parts.push('discipline="' + catLabel.replace(/"/g, '\\"') + '"');
  if (rating) parts.push('rating="' + rating + '"');
  if (cost) parts.push('cost="' + cost.replace(/"/g, '\\"') + '"');
  parts[parts.length - 1] += "]";
  var tag = parts.join(" ");
  var injected = false;
  if (typeof insertIntoChatInput === "function") {
    injected = !!insertIntoChatInput(tag);
  }
  if (!injected) {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        navigator.clipboard.writeText(tag);
      } catch (e) {}
    }
    if (typeof finalizeRoll === "function") finalizeRoll(tag, "narrate", []);
    log("castAbilityPool: chat input not found; tag copied to clipboard: " + tag);
  }
  if (state.ruleset.resolution && state.ruleset.resolution.mode === MODES.POOL) {
    showDice(true);
    if (rating && typeof setDiceInput === "function") {
      var pool = parseInt(rating, 10);
      if (isFinite(pool) && pool > 0) setDiceInput("pool", pool);
    }
  }
  if (typeof renderSheet === "function") renderSheet();
}

function castSpell(ability) {
  if (!ability || !state.ruleset) return;
  var ctx = statContext();
  var castMod = 0;
  if (ability.spellcastingAttribute) {
    var modKey = ability.spellcastingAttribute + "_mod";
    if (typeof ctx[modKey] === "number") castMod = ctx[modKey];
  }
  var dcFormula = state.ruleset.resolution && state.ruleset.resolution.spellSaveDcFormula;
  var dc = 0;
  if (dcFormula) {
    var subbed = String(dcFormula).replace(/\{spellcastingAttribute_mod\}/g, String(castMod));
    var v = evalFormula(subbed, ctx);
    dc = typeof v === "number" && isFinite(v) ? Math.floor(v) : 0;
  }
  var damageText = "";
  var faces = [];
  if (ability.damageDice) {
    var parsed = parseDamageExpression(ability.damageDice);
    if (parsed) {
      var rolled = rollParsedDamage(parsed, {
        label: ability.name
      });
      faces = rolled.faces;
      damageText = rolled.text;
    }
  }
  var castParts = [ '[mrr-cast: name="' + (ability.name || "spell") + '"' ];
  if (dc > 0) castParts.push('dc="' + dc + '"');
  if (ability.saveAttribute) castParts.push('save="' + ability.saveAttribute + '"');
  if (ability.damageDice) castParts.push('damage="' + ability.damageDice + '"');
  if (ability.halfOnSave) castParts.push('half_on_save="true"');
  if (ability.costText) castParts.push('cost="' + ability.costText.replace(/"/g, "'") + '"');
  var castTag = castParts.join(" ") + "]";
  showDice(true);
  var combined = damageText ? castTag + "\n" + damageText : castTag;
  finalizeRoll(combined, "success", faces);
}

function formatAbilityCost(cost) {
  if (!cost || typeof cost !== "object") return "";
  var amt = typeof cost.amount === "number" ? cost.amount : 0;
  var res = cost.resource || "";
  if (!res && !amt) return "";
  if (!res) return String(amt);
  return amt + " " + res;
}

function deleteAbility(catId, abId) {
  if (!state.sheet.abilities || !Array.isArray(state.sheet.abilities[catId])) return;
  var idx = -1;
  state.sheet.abilities[catId].forEach(function(a, i) {
    if (a.id === abId) idx = i;
  });
  if (idx === -1) return;
  var ab = state.sheet.abilities[catId][idx];
  state.sheet.abilities[catId].splice(idx, 1);
  saveSheet(state.chatId, state.sheet);
  if (ab && ab.lorebookEntryId) {
    deleteAbilityLorebookEntry(ab).catch(function() {});
  }
  renderSpellbookContents();
  renderSheet();
  if (state.spellbookOpen) showSpellbook(true);
}

function openAbilityDialog(abilityId, defaultCategoryId, onSaved) {
  if (state.abilityDialogEl && state.abilityDialogEl.parentNode) {
    state.abilityDialogEl.parentNode.removeChild(state.abilityDialogEl);
    state.abilityDialogEl = null;
  }
  var cfg = getAbilitiesConfig();
  if (!cfg) return;
  var backdrop = marinara.addElement(document.body, "div", {
    class: "mrr-dialog-backdrop mrr-dialog-backdrop--open"
  });
  if (!backdrop) return;
  state.abilityDialogEl = backdrop;
  var dialog = marinara.addElement(backdrop, "div", {
    class: "mrr-dialog"
  });
  if (!dialog) {
    document.body.removeChild(backdrop);
    state.abilityDialogEl = null;
    return;
  }
  var existing = null;
  var existingCatId = null;
  if (abilityId && state.sheet.abilities) {
    Object.keys(state.sheet.abilities).forEach(function(catId) {
      if (existing) return;
      var arr = state.sheet.abilities[catId];
      if (!Array.isArray(arr)) return;
      var hit = arr.find(function(a) {
        return a.id === abilityId;
      });
      if (hit) {
        existing = hit;
        existingCatId = catId;
      }
    });
  }
  var draft = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: "mrr-ability-" + Date.now() + "-" + Math.floor(Math.random() * 1e3),
    name: "",
    cost: {
      resource: "",
      amount: 0
    },
    type: "at-will",
    effectText: "",
    description: "",
    lorebookKeyword: "",
    lorebookEntryId: "",
    damageDice: "",
    saveAttribute: "",
    spellcastingAttribute: "",
    halfOnSave: false
  };
  var startingCatId = existingCatId || defaultCategoryId || cfg.categories[0].id;
  marinara.addElement(dialog, "h3", {
    textContent: existing ? "Edit " + cfg.label.replace(/s$/, "") : "New " + cfg.label.replace(/s$/, "")
  });
  var nameRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(nameRow, "label", {
    textContent: "Name"
  });
  var nameInput = marinara.addElement(nameRow, "input", {
    class: "mrr-item-form__input",
    type: "text",
    value: draft.name || "",
    placeholder: "Fireball"
  });
  var catRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(catRow, "label", {
    textContent: "Category"
  });
  var catSel = marinara.addElement(catRow, "select", {
    class: "mrr-item-form__select"
  });
  if (catSel) {
    cfg.categories.forEach(function(c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.label;
      if (c.id === startingCatId) opt.selected = true;
      catSel.appendChild(opt);
    });
  }
  var costRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(costRow, "label", {
    textContent: "Cost"
  });
  var costInput = marinara.addElement(costRow, "input", {
    class: "mrr-item-form__input",
    type: "text",
    value: draft.costText || "",
    placeholder: "5m 1w · 1 lvl-3 slot · V/S/M · etc."
  });
  var typeRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(typeRow, "label", {
    textContent: "Type"
  });
  var typeSel = marinara.addElement(typeRow, "select", {
    class: "mrr-item-form__select"
  });
  if (typeSel) {
    [ "passive", "triggered", "at-will", "per-rest" ].forEach(function(t) {
      var opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      if (t === draft.type) opt.selected = true;
      typeSel.appendChild(opt);
    });
  }
  var effectRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(effectRow, "label", {
    textContent: "Effect"
  });
  var effectInput = marinara.addElement(effectRow, "input", {
    class: "mrr-item-form__input",
    type: "text",
    value: draft.effectText || "",
    placeholder: "8d6 fire, 150ft, basic Reflex"
  });
  var dmgRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(dmgRow, "label", {
    textContent: "Damage"
  });
  var dmgInput = marinara.addElement(dmgRow, "input", {
    class: "mrr-item-form__input",
    type: "text",
    value: draft.damageDice || "",
    placeholder: "8d6 fire — leave blank for non-damage spells"
  });
  var castAttrRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(castAttrRow, "label", {
    textContent: "Cast attr"
  });
  var castAttrSel = marinara.addElement(castAttrRow, "select", {
    class: "mrr-item-form__select"
  });
  if (castAttrSel) {
    var blankCast = document.createElement("option");
    blankCast.value = "";
    blankCast.textContent = "—";
    castAttrSel.appendChild(blankCast);
    (state.ruleset.attributes || []).forEach(function(a) {
      var opt = document.createElement("option");
      opt.value = a.name;
      opt.textContent = a.name;
      if (draft.spellcastingAttribute === a.name) opt.selected = true;
      castAttrSel.appendChild(opt);
    });
  }
  var saveAttrRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(saveAttrRow, "label", {
    textContent: "Save vs"
  });
  var saveAttrSel = marinara.addElement(saveAttrRow, "select", {
    class: "mrr-item-form__select"
  });
  if (saveAttrSel) {
    var blankSave = document.createElement("option");
    blankSave.value = "";
    blankSave.textContent = "—";
    saveAttrSel.appendChild(blankSave);
    (state.ruleset.attributes || []).forEach(function(a) {
      var opt = document.createElement("option");
      opt.value = a.name;
      opt.textContent = a.name;
      if (draft.saveAttribute === a.name) opt.selected = true;
      saveAttrSel.appendChild(opt);
    });
  }
  var halfRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(halfRow, "label", {
    textContent: "Half on save"
  });
  var halfInput = marinara.addElement(halfRow, "input", {
    type: "checkbox"
  });
  if (halfInput && draft.halfOnSave) halfInput.checked = true;
  var descRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(descRow, "label", {
    textContent: "Description"
  });
  var descInput = marinara.addElement(descRow, "textarea", {
    class: "mrr-item-form__textarea",
    placeholder: "Full rules + flavor — this is what the GM agent will read when the keyword fires."
  });
  if (descInput) descInput.value = draft.description || "";
  var kwRow = marinara.addElement(dialog, "div", {
    class: "mrr-item-form__row"
  });
  marinara.addElement(kwRow, "label", {
    textContent: "Keyword"
  });
  var kwInput = marinara.addElement(kwRow, "input", {
    class: "mrr-item-form__input",
    type: "text",
    value: draft.lorebookKeyword || "",
    placeholder: "(auto-fills from name on save)"
  });
  var msg = marinara.addElement(dialog, "div", {
    class: "mrr-msg mrr-msg--info mrr-msg--hidden"
  });
  function refreshCollisionWarning() {
    if (!msg || !kwInput) return;
    var k = (kwInput.value || "").trim().toLowerCase();
    if (!k) {
      msg.classList.add("mrr-msg--hidden");
      return;
    }
    var hits = [];
    Object.keys(state.sheet.abilities || {}).forEach(function(catId) {
      var arr = state.sheet.abilities[catId];
      if (!Array.isArray(arr)) return;
      arr.forEach(function(a) {
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
  var buttons = marinara.addElement(dialog, "div", {
    class: "mrr-dialog__buttons"
  });
  var saveBtn = marinara.addElement(buttons, "button", {
    class: "mrr-char-btn mrr-char-btn--accent",
    type: "button",
    textContent: "Save"
  });
  var cancelBtn = marinara.addElement(buttons, "button", {
    class: "mrr-char-btn",
    type: "button",
    textContent: "Cancel"
  });
  function close() {
    if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    if (state.abilityDialogEl === backdrop) state.abilityDialogEl = null;
  }
  marinara.on(backdrop, "click", function(e) {
    if (e.target === backdrop) close();
  });
  if (cancelBtn) marinara.on(cancelBtn, "click", close);
  if (saveBtn) marinara.on(saveBtn, "click", function() {
    var name = (nameInput && nameInput.value || "").trim();
    if (!name) {
      window.alert("Name is required.");
      return;
    }
    var newCatId = catSel ? catSel.value : startingCatId;
    var costText = (costInput && costInput.value || "").trim();
    var kw = (kwInput && kwInput.value || "").trim();
    if (!kw) kw = name;
    draft.name = name;
    draft.costText = costText;
    delete draft.cost;
    draft.type = typeSel && typeSel.value || "at-will";
    draft.effectText = (effectInput && effectInput.value || "").trim();
    draft.description = (descInput && descInput.value || "").trim();
    draft.lorebookKeyword = kw;
    draft.damageDice = (dmgInput && dmgInput.value || "").trim();
    draft.spellcastingAttribute = castAttrSel && castAttrSel.value || "";
    draft.saveAttribute = saveAttrSel && saveAttrSel.value || "";
    draft.halfOnSave = !!(halfInput && halfInput.checked);
    if (!state.sheet.abilities || typeof state.sheet.abilities !== "object") state.sheet.abilities = {};
    if (existing && existingCatId && existingCatId !== newCatId) {
      state.sheet.abilities[existingCatId] = (state.sheet.abilities[existingCatId] || []).filter(function(a) {
        return a.id !== draft.id;
      });
    }
    if (!Array.isArray(state.sheet.abilities[newCatId])) state.sheet.abilities[newCatId] = [];
    var idx = state.sheet.abilities[newCatId].findIndex(function(a) {
      return a.id === draft.id;
    });
    if (idx >= 0) state.sheet.abilities[newCatId][idx] = draft; else state.sheet.abilities[newCatId].push(draft);
    saveSheet(state.chatId, state.sheet);
    upsertAbilityLorebookEntry(draft, state.activeCharacterId, newCatId).then(function(entryId) {
      if (entryId && entryId !== draft.lorebookEntryId) {
        draft.lorebookEntryId = entryId;
        var arr = state.sheet.abilities[newCatId];
        var hit = arr && arr.find(function(a) {
          return a.id === draft.id;
        });
        if (hit) {
          hit.lorebookEntryId = entryId;
          saveSheet(state.chatId, state.sheet);
        }
      }
    }).catch(function(e) {
      log("ability lorebook upsert failed", e && e.message);
    });
    close();
    renderSheet();
    if (state.spellbookOpen) showSpellbook(true);
    if (typeof onSaved === "function") onSaved();
  });
}

function getActiveChatTitle() {
  try {
    var el = document.querySelector(".chat-title, [data-chat-title], h1, h2");
    if (el && el.textContent) return el.textContent.trim().slice(0, 80);
  } catch (e) {}
  return "Chat " + (state.chatId ? state.chatId.slice(0, 8) : "");
}

function findOrCreateSpellbookLorebook() {
  if (!state.chatId) return Promise.reject(new Error("no active chatId"));
  if (state.spellbookLbId) return Promise.resolve(state.spellbookLbId);
  var cacheKey = LS_SPELLBOOK_LB_PFX + state.chatId;
  var cached = lsGet(cacheKey);
  if (cached) {
    state.spellbookLbId = cached;
    return Promise.resolve(cached);
  }
  return apiFetch("/lorebooks").then(function(lbs) {
    var existing = Array.isArray(lbs) ? lbs.find(function(lb) {
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
      tags: [ MRR_TAG_SPELLBOOK ],
      scanDepth: 4,
      tokenBudget: 8192,
      generatedBy: "user"
    };
    return apiFetch("/lorebooks", {
      method: "POST",
      body: JSON.stringify(body)
    }).then(function(lb) {
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
  var isSorcery = catId === "sorcery";
  if (isSorcery) {
    content = "Type: Sorcery" + (content ? "\n\n" + content : "");
  }
  var costText = (ability.costText || "").trim();
  if (costText) {
    content = (content ? content + "\n\n" : "") + "Cost: " + costText;
  }
  if (ability.effectText && content.indexOf(ability.effectText) === -1) {
    content = (content ? content + "\n\n" : "") + "Effect: " + ability.effectText;
  }
  var castParts = [];
  if (ability.damageDice) castParts.push("Damage: " + ability.damageDice);
  if (ability.saveAttribute) castParts.push("Save vs: " + ability.saveAttribute);
  if (ability.spellcastingAttribute) castParts.push("Cast attribute: " + ability.spellcastingAttribute);
  if (ability.halfOnSave) castParts.push("Half on save: yes (target takes half damage on a successful save)");
  if (castParts.length) {
    content = (content ? content + "\n\n" : "") + "Cast Mechanics:\n" + castParts.join("\n");
  }
  var keys = keyword ? [ keyword ] : [];
  if (isSorcery && keys.indexOf("sorcery") === -1) keys.push("sorcery");
  return {
    name: ability.name || keyword || "Untitled",
    content,
    keys,
    position: 0,
    matchWholeWords: true,
    enabled: true,
    role: "system"
  };
}

function upsertAbilityLorebookEntry(ability, charId, catId) {
  var keyword = (ability.lorebookKeyword || ability.name || "").trim();
  if (!keyword) {
    return Promise.resolve(null);
  }
  return findOrCreateSpellbookLorebook().then(function(lbId) {
    var body = abilityEntryBody(ability, charId, catId);
    if (ability.lorebookEntryId) {
      return apiFetch("/lorebooks/" + lbId + "/entries/" + ability.lorebookEntryId, {
        method: "PATCH",
        body: JSON.stringify(body)
      }).then(function() {
        return ability.lorebookEntryId;
      }).catch(function(e) {
        if (e && e.status === 404) {
          return apiFetch("/lorebooks/" + lbId + "/entries", {
            method: "POST",
            body: JSON.stringify(body)
          }).then(function(entry) {
            return entry && entry.id;
          });
        }
        throw e;
      });
    }
    return apiFetch("/lorebooks/" + lbId + "/entries", {
      method: "POST",
      body: JSON.stringify(body)
    }).then(function(entry) {
      return entry && entry.id;
    }).catch(function(e) {
      if (e && e.status === 404) {
        invalidateSpellbookLorebookCache();
        return findOrCreateSpellbookLorebook().then(function(newLbId) {
          return apiFetch("/lorebooks/" + newLbId + "/entries", {
            method: "POST",
            body: JSON.stringify(body)
          }).then(function(entry) {
            return entry && entry.id;
          });
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
  var resolveLb = state.spellbookLbId ? Promise.resolve(state.spellbookLbId) : findOrCreateSpellbookLorebook();
  return resolveLb.then(function(lbId) {
    return apiDeleteRaw("/lorebooks/" + lbId + "/entries/" + ability.lorebookEntryId);
  });
}

function mrrActiveResolutionConfig() {
  var ruleset = state.ruleset;
  if (!ruleset || !ruleset.resolution) return {};
  var amId = state.diceActiveModeId;
  if (!amId || amId === "primary") return ruleset.resolution;
  var modes = Array.isArray(ruleset.resolution.additionalModes) ? ruleset.resolution.additionalModes : [];
  for (var i = 0; i < modes.length; i++) {
    var am = modes[i];
    if (am && am.id === amId) {
      var cfg = am.config || {};
      var merged = {
        mode: am.mode
      };
      for (var k in cfg) {
        if (Object.prototype.hasOwnProperty.call(cfg, k)) merged[k] = cfg[k];
      }
      return merged;
    }
  }
  return ruleset.resolution;
}

function mrrResolveModeId(resolutionId) {
  var primaryMode = state.ruleset && state.ruleset.resolution && state.ruleset.resolution.mode;
  if (!resolutionId || resolutionId === "primary") {
    return {
      id: "primary",
      mode: primaryMode
    };
  }
  var modes = state.ruleset && state.ruleset.resolution && Array.isArray(state.ruleset.resolution.additionalModes) ? state.ruleset.resolution.additionalModes : [];
  for (var i = 0; i < modes.length; i++) {
    if (modes[i] && modes[i].id === resolutionId) {
      return {
        id: modes[i].id,
        mode: modes[i].mode
      };
    }
  }
  return {
    id: "primary",
    mode: primaryMode
  };
}

function mrrPrepareDiceForResolutionId(resolutionId) {
  var resolved = mrrResolveModeId(resolutionId);
  state.diceActiveModeId = resolved.id;
  if (state.diceEl && state.diceBuiltModeId !== resolved.id) {
    if (state.diceEl.parentNode) state.diceEl.parentNode.removeChild(state.diceEl);
    state.diceEl = null;
  }
  return resolved.mode;
}

function buildMechanicSelector(parent, additionalModes) {
  var row = marinara.addElement(parent, "div", {
    class: "mrr-dice__mechanic-row"
  });
  if (!row) return;
  marinara.addElement(row, "label", {
    textContent: "Mechanic"
  });
  var sel = marinara.addElement(row, "select", {
    class: "mrr-dice__mechanic-select"
  });
  if (!sel) return;
  var current = state.diceActiveModeId || "primary";
  var primaryOpt = marinara.addElement(sel, "option", {
    textContent: "Primary",
    value: "primary"
  });
  if (primaryOpt && current === "primary") primaryOpt.selected = true;
  additionalModes.forEach(function(am) {
    if (!am || typeof am.id !== "string") return;
    var opt = marinara.addElement(sel, "option", {
      textContent: am.label || am.id,
      value: am.id
    });
    if (opt && current === am.id) opt.selected = true;
  });
  marinara.on(sel, "change", function() {
    var newId = sel.value || "primary";
    state.diceActiveModeId = newId;
    if (state.diceEl && state.diceEl.parentNode) state.diceEl.parentNode.removeChild(state.diceEl);
    state.diceEl = null;
    showDice(true);
  });
}

function buildDice() {
  if (state.diceEl) return state.diceEl;
  if (!state.ruleset || !state.ruleset.resolution) {
    warn("buildDice: ruleset has no resolution block; dice UI unavailable");
    return null;
  }
  state.diceEl = marinara.addElement(document.body, "div", {
    class: "mrr-dice"
  });
  if (!state.diceEl) return null;
  state.diceBuiltModeId = state.diceActiveModeId || "primary";
  var header = marinara.addElement(state.diceEl, "div", {
    class: "mrr-dice__header"
  });
  if (header) {
    marinara.addElement(header, "span", {
      class: "mrr-dice__title",
      textContent: "Dice — " + state.ruleset.name
    });
    var close = marinara.addElement(header, "button", {
      class: "mrr-dice__close",
      innerHTML: "&times;"
    });
    if (close) marinara.on(close, "click", function() {
      showDice(false);
    });
    makeDraggable(state.diceEl, header, "mrr-dice-pos");
  }
  var amList = Array.isArray(state.ruleset.resolution.additionalModes) ? state.ruleset.resolution.additionalModes : [];
  if (amList.length) buildMechanicSelector(state.diceEl, amList);
  var resCfg = mrrActiveResolutionConfig();
  var mode = resCfg.mode;
  if (mode === MODES.POOL) buildPoolWidget(); else if (mode === MODES.SINGLE) buildSingleRollWidget(); else if (mode === MODES.SUM) buildSumWidget(); else if (mode === MODES.D100) buildD100Widget(); else if (mode === MODES.PBTA) buildPbtaWidget(); else if (mode === MODES.FATE) buildFateWidget(); else if (mode === MODES.UNDER) buildRollUnderWidget(); else if (mode === MODES.STANCE) buildStanceModalPoolWidget(); else marinara.addElement(state.diceEl, "div", {
    class: "mrr-msg mrr-msg--err",
    textContent: "Unsupported resolution mode: " + mode
  });
  marinara.addElement(state.diceEl, "div", {
    class: "mrr-dice__result mrr-dice__result--hidden",
    id: "mrr-dice-result"
  });
  return state.diceEl;
}

function buildSingleRollWidget() {
  var d = state.diceEl;
  diceRow(d, "Modifier", "mod", "0");
  diceRow(d, "Proficiency", "prof", "0");
  diceRow(d, "Equipment", "equip", "0");
  diceRow(d, "DC", "dc", "15");
  buildAdvantageRow(d);
  diceFooter(d, "Roll d20", rollSingleRoll);
}

function buildAdvantageRow(parent) {
  if (!state.diceAdvantage) state.diceAdvantage = "normal";
  var row = marinara.addElement(parent, "div", {
    class: "mrr-dice__adv-row"
  });
  if (!row) return;
  marinara.addElement(row, "label", {
    textContent: "Roll mode"
  });
  var modes = [ {
    code: "normal",
    label: "Normal",
    title: "Roll 1d20"
  }, {
    code: "advantage",
    label: "Adv",
    title: "Roll 2d20, keep the higher"
  }, {
    code: "disadvantage",
    label: "Dis",
    title: "Roll 2d20, keep the lower"
  } ];
  modes.forEach(function(m) {
    var btn = marinara.addElement(row, "button", {
      class: "mrr-adv-btn" + (state.diceAdvantage === m.code ? " mrr-adv-btn--active" : ""),
      textContent: m.label,
      title: m.title,
      "data-mrr-adv": m.code
    });
    if (!btn) return;
    marinara.on(btn, "click", function(e) {
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
  var res = mrrActiveResolutionConfig();
  var defaultTarget = typeof res.target === "number" ? res.target : 7;
  diceRow(d, "Pool", "pool", "5");
  diceRow(d, "Target Face", "target", String(defaultTarget));
  diceRow(d, "Successes", "diff", "1");
  diceRow(d, "Stunt", "stunt", "0");
  diceRow(d, "Equipment", "equip", "0");
  diceFooter(d, "Roll pool", rollDicePool);
}

function buildSumWidget() {
  var d = state.diceEl;
  var res = mrrActiveResolutionConfig();
  var difficultyHint = typeof res.difficultyHint === "number" ? res.difficultyHint : 15;
  var wd = res.wildDie || null;
  diceRow(d, "Pool (dice)", "pool", "3");
  diceRow(d, "Pips", "pips", "0");
  diceRow(d, "Difficulty", "diff", String(difficultyHint));
  if (wd && wd.enabled) {
    marinara.addElement(d, "div", {
      class: "mrr-dice__hint",
      textContent: "Wild Die ON — one die explodes on " + (typeof wd.explodeFace === "number" ? wd.explodeFace : 6) + ", crit-fail flag on " + (typeof wd.critFailFace === "number" ? wd.critFailFace : 1) + " when total falls short. Narrator resolves crit-fail effect."
    });
  }
  diceFooter(d, "Roll dice pool", rollDicePoolSum);
}

function buildD100Widget() {
  var d = state.diceEl;
  var res = mrrActiveResolutionConfig();
  var oe = res.openEnded || null;
  if (res.direction === "high") {
    diceRow(d, "Bonus", "bonus", "0");
    diceRow(d, "Difficulty", "diff", "0");
  } else {
    diceRow(d, "Skill %", "skill", "50");
  }
  if (oe) {
    marinara.addElement(d, "div", {
      class: "mrr-dice__hint",
      textContent: "Open-ended: " + (oe.high ? "high ≥" + (oe.high.threshold || 96) + " adds" : "") + (oe.low ? ", low ≤" + (oe.low.threshold || 5) + " subtracts" : "") + ". Unmodified first roll only. Narrator adjudicates the result table."
    });
  }
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

function buildRollUnderWidget() {
  var d = state.diceEl;
  var resUnder = mrrActiveResolutionConfig();
  var formula = resUnder && resUnder.diceFormula || "1d100";
  diceRow(d, "Target", "target", "50");
  diceRow(d, "Bonus", "bonus", "0");
  diceFooter(d, "Roll " + formula, rollRollUnder);
}

function parseRollUnderFormula(formula) {
  if (typeof formula !== "string") return null;
  var m = formula.match(/^([1-9][0-9]*)d([1-9][0-9]*)$/);
  if (!m) return null;
  return {
    count: parseInt(m[1], 10),
    sides: parseInt(m[2], 10)
  };
}

function evalRollUnderFormula(formula, target, margin) {
  if (typeof formula !== "string" || !formula.trim()) return null;
  var substituted = formula.replace(/\{target\}/g, "(" + target + ")").replace(/\{margin\}/g, "(" + margin + ")");
  if (!/^[\s0-9+\-*/().]+$/.test(substituted)) return null;
  try {
    var fn = new Function("return (" + substituted + ");");
    var n = fn();
    if (typeof n !== "number" || isNaN(n) || !isFinite(n)) return null;
    return Math.floor(n);
  } catch (e) {
    return null;
  }
}

function rollRollUnder() {
  var res = mrrActiveResolutionConfig();
  var parsed = parseRollUnderFormula(res.diceFormula) || {
    count: 1,
    sides: 100
  };
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
  var pass = total <= target;
  var margin = target - total;
  var critThreshold = evalRollUnderFormula(res.criticalSuccessFormula, target, margin);
  var critSuccess = pass && critThreshold !== null && total <= critThreshold;
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
  if (critSuccess) {
    outcome = "CRIT SUCCESS";
    kind = "crit";
  } else if (fumble) {
    outcome = "FUMBLE";
    kind = "fumble";
  } else if (pass) {
    outcome = "SUCCESS";
    kind = "success";
  } else {
    outcome = "FAILURE";
    kind = "fail";
  }
  var formulaTag = parsed.count + "d" + parsed.sides;
  var facesTag = faces.length > 1 ? " (" + faces.join("+") + ")" : "";
  var bonusTag = bonus !== 0 ? " (target " + baseTarget + (bonus > 0 ? "+" : "") + bonus + ")" : "";
  var marginTag = pass ? ", margin " + margin : ", margin " + -margin;
  var text = "[dice: " + formulaTag + " vs " + target + bonusTag + " -> " + total + facesTag + " " + outcome + marginTag + "]";
  finalizeRoll(text, kind, faces.map(function(face) {
    return {
      face,
      cls: "mrr-dice__face"
    };
  }));
}

function buildStanceModalPoolWidget() {
  var d = state.diceEl;
  var res = mrrActiveResolutionConfig();
  var stances = Array.isArray(res.stances) ? res.stances : [];
  var statName = res.stat || "Stat";
  if (!state.diceStanceId && stances.length > 0) {
    state.diceStanceId = stances[0].id;
  }
  var stanceRow = marinara.addElement(d, "div", {
    class: "mrr-dice__stance-row"
  });
  if (stanceRow) {
    marinara.addElement(stanceRow, "label", {
      textContent: "Stance"
    });
    var stanceGroup = marinara.addElement(stanceRow, "div", {
      class: "mrr-dice__stance-group"
    });
    if (stanceGroup) {
      stances.forEach(function(s) {
        var active = state.diceStanceId === s.id;
        var btn = marinara.addElement(stanceGroup, "button", {
          class: "mrr-stance-btn" + (active ? " mrr-stance-btn--active" : ""),
          textContent: s.label,
          title: s.description || (s.direction === "under" ? "Each die under " + statName + " is a success" : "Each die over " + statName + " is a success"),
          "data-mrr-stance": s.id
        });
        if (!btn) return;
        marinara.on(btn, "click", function(e) {
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
  diceRow(d, "Pool", "pool", "1");
  diceRow(d, statName, "stat", "4");
  if (res.poolFormula) {
    var hint = marinara.addElement(d, "div", {
      class: "mrr-dice__hint",
      textContent: "Pool: " + res.poolFormula
    });
    if (!hint) {}
  }
  var diceType = res.diceType || "d6";
  diceFooter(d, "Roll Nx" + diceType, rollStanceModalPool);
}

function rollStanceModalPool() {
  var res = mrrActiveResolutionConfig();
  var stances = Array.isArray(res.stances) ? res.stances : [];
  var stanceId = state.diceStanceId || stances[0] && stances[0].id || "stance";
  var stance = null;
  for (var si = 0; si < stances.length; si++) {
    if (stances[si].id === stanceId) {
      stance = stances[si];
      break;
    }
  }
  if (!stance) stance = stances[0] || {
    id: stanceId,
    label: stanceId,
    direction: "under"
  };
  var diceType = res.diceType || "d6";
  var sides = parseInt(diceType.replace(/^d/, ""), 10);
  if (!sides || sides < 2) sides = 6;
  var pool = clamp(numFromInput("pool", 1), 1, 32);
  var statValue = clamp(numFromInput("stat", 4), 1, sides);
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
    pickedTier = {
      label: totalSuccesses > 0 ? "success" : "miss"
    };
  }
  var tierLabel = String(pickedTier.label || "");
  var kind;
  if (totalSuccesses === 0) kind = "fail"; else if (/^crit/i.test(tierLabel) || totalSuccesses >= 3) kind = "crit"; else kind = "success";
  var rulesetId = state.ruleset && state.ruleset.id || "unknown";
  var statKey = res.stat || "stat";
  var diceCsv = faces.join(",");
  var tagParts = [ "ruleset=" + rulesetId, "stance=" + stance.id, "stat=" + statKey, "statValue=" + statValue, "pool=" + pool, "dice=[" + diceCsv + "]", "successes=" + totalSuccesses, "exactMatches=" + exactMatches, "tier=" + (pickedTier.label || "") ];
  if (exactMatches > 0 && res.exactMatch && res.exactMatch.narrationHook) {
    tagParts.push("narrationHook=" + res.exactMatch.narrationHook);
  }
  var text = "[mrr-roll: " + tagParts.join(", ") + "]";
  var faceObjs = faces.map(function(face) {
    var cls = "mrr-dice__face";
    if (face === statValue) {
      cls += " mrr-dice__face--exact";
    } else if (direction === "under" && face < statValue) {
      cls += " mrr-dice__face--success";
    } else if (direction === "over" && face > statValue) {
      cls += " mrr-dice__face--success";
    }
    return {
      face,
      cls
    };
  });
  finalizeRoll(text, kind, faceObjs);
}

var lastRollText = null;

function rollSingleRoll() {
  var mod = numFromInput("mod", 0);
  var prof = numFromInput("prof", 0);
  var equip = numFromInput("equip", 0);
  var dc = numFromInput("dc", 15);
  var advMode = state.diceAdvantage || "normal";
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
  var equipPart = equip ? equip > 0 ? "+" + equip : String(equip) : "";
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
  var pool = Math.max(0, numFromInput("pool", 1));
  var diff = Math.max(0, numFromInput("diff", 2));
  var stunt = clamp(numFromInput("stunt", 0), 0, 2);
  var equip = Math.max(0, numFromInput("equip", 0));
  var totalDice = pool + stunt + equip;
  var faces = [];
  var i;
  for (i = 0; i < totalDice; i++) faces.push(1 + Math.floor(Math.random() * 10));
  var resDP = mrrActiveResolutionConfig();
  var schemaTarget = resDP && typeof resDP.target === "number" ? resDP.target : 7;
  var target = numFromInput("target", schemaTarget);
  var doubleFace = resDP.doubles && resDP.doubles.face || 10;
  var doubleSucc = resDP.doubles && resDP.doubles.successes || 2;
  var botchFace = resDP.botches && resDP.botches.onFace || 1;
  var botchTrigger = resDP.botches && resDP.botches.trigger || BOTCH_TRIGGER.ZERO;
  var successes = 0;
  var doubled = 0;
  var ones = 0;
  faces.forEach(function(f) {
    if (f === botchFace) ones++;
    if (f >= target) {
      successes += 1;
      if (f >= doubleFace) {
        successes += doubleSucc - 1;
        doubled++;
      }
    }
  });
  var botch = false;
  if (botchTrigger === BOTCH_TRIGGER.ZERO) botch = successes === 0 && ones >= 1; else if (botchTrigger === BOTCH_TRIGGER.MAJORITY) botch = ones > successes; else if (botchTrigger === BOTCH_TRIGGER.ALWAYS) botch = ones >= 1;
  var pass = !botch && successes >= diff;
  var bits = [];
  if (doubled) bits.push(doubled + " ten" + (doubled > 1 ? "s" : "") + " doubled");
  if (botch) bits.push("BOTCH");
  var suffix = bits.length ? ", " + bits.join(", ") : "";
  var text = "[dice: " + totalDice + "d10 vs " + target + " -> " + successes + " success" + (successes === 1 ? "" : "es") + suffix + "]" + " (diff " + diff + ", " + (pass ? "pass" : "fail") + ")";
  var resultClass = botch ? "botch" : pass ? "success" : "fail";
  finalizeRoll(text, resultClass, faces.map(function(f) {
    var cls = "mrr-dice__face";
    if (f >= doubleFace) cls += " mrr-dice__face--double"; else if (f >= target) cls += " mrr-dice__face--success"; else if (f === botchFace) cls += " mrr-dice__face--one";
    return {
      face: f,
      cls
    };
  }));
}

function rollDicePoolSum() {
  var pool = Math.max(1, numFromInput("pool", 1));
  var pips = numFromInput("pips", 0);
  var diff = Math.max(1, numFromInput("diff", 15));
  var res = mrrActiveResolutionConfig();
  var dieSize = typeof res.dieSize === "number" ? res.dieSize : 6;
  var wd = res.wildDie || null;
  var wdOn = !!(wd && wd.enabled);
  var explodeFace = wd && typeof wd.explodeFace === "number" ? wd.explodeFace : dieSize;
  var critFailFace = wd && typeof wd.critFailFace === "number" ? wd.critFailFace : 1;
  var explodeCap = wd && typeof wd.explodeCap === "number" ? wd.explodeCap : 0;
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
  var wildText = wdOn ? " wild=" + wildFace + explodesText + (critFail ? " critFail=true" : "") : "";
  var pipsText = pips ? pips > 0 ? "+" + pips : String(pips) : "";
  var text = "[mrr-roll: mode=dice-pool-sum pool=" + pool + " dieSize=" + dieSize + pipsText + wildText + " total=" + total + " vs " + diff + " => " + (pass ? "success" : "fail") + "]";
  var kind = critFail ? "botch" : pass ? "success" : "fail";
  var renderFaces = faces.map(function(f) {
    return {
      face: f,
      cls: "mrr-dice__face"
    };
  });
  if (wdOn) {
    renderFaces.push({
      face: wildFace,
      cls: "mrr-dice__face mrr-dice__face--wild" + (critFail ? " mrr-dice__face--one" : "")
    });
    wildExplodes.forEach(function(xf) {
      renderFaces.push({
        face: xf,
        cls: "mrr-dice__face mrr-dice__face--double"
      });
    });
  }
  finalizeRoll(text, kind, renderFaces);
}

function padD100Face(n) {
  return n < 10 ? "0" + n : String(n);
}

function signedNum(n) {
  return (n >= 0 ? "+" : "") + n;
}

function rollD100() {
  var res = mrrActiveResolutionConfig();
  if (res.direction !== "high") {
    var skill = clamp(numFromInput("skill", 50), 1, 100);
    var face = 1 + Math.floor(Math.random() * 100);
    var pass = face <= skill;
    var text = "[d100: rolled " + face + " vs " + skill + " = " + (pass ? "success" : "failure") + "]";
    finalizeRoll(text, pass ? "success" : "fail", null);
    return;
  }
  var oe = res.openEnded || null;
  var highCfg = oe && oe.high || null;
  var lowCfg = oe && oe.low || null;
  var highThreshold = highCfg && typeof highCfg.threshold === "number" ? highCfg.threshold : 96;
  var lowThreshold = lowCfg && typeof lowCfg.threshold === "number" ? lowCfg.threshold : 5;
  var lowSubtract = !lowCfg || lowCfg.subtract !== false;
  var lowContinueOn = lowCfg && lowCfg.continueOn || "high";
  var highCap = highCfg && typeof highCfg.cascadeCap === "number" ? highCfg.cascadeCap : 0;
  var lowCap = lowCfg && typeof lowCfg.cascadeCap === "number" ? lowCfg.cascadeCap : 0;
  var SAFETY_CAP = 100;
  var bonus = numFromInput("bonus", 0);
  var diff = numFromInput("diff", 0);
  var first = 1 + Math.floor(Math.random() * 100);
  var unusualFaces = oe && Array.isArray(oe.unusualFaces) ? oe.unusualFaces : [];
  var um = unusualFaces.indexOf(first) !== -1 ? first : null;
  var openHigh = !!(highCfg && first >= highThreshold);
  var openLow = !openHigh && !!(lowCfg && first <= lowThreshold);
  var chainRolls = [];
  var cascades = 0;
  var r;
  if (openHigh) {
    r = first;
    while (r >= highThreshold) {
      if (highCap > 0 && cascades >= highCap) break;
      if (cascades >= SAFETY_CAP) break;
      r = 1 + Math.floor(Math.random() * 100);
      chainRolls.push(r);
      cascades++;
    }
  } else if (openLow) {
    while (true) {
      if (lowCap > 0 && cascades >= lowCap) break;
      if (cascades >= SAFETY_CAP) break;
      r = 1 + Math.floor(Math.random() * 100);
      chainRolls.push(r);
      cascades++;
      var continues = lowContinueOn === "low" ? r <= lowThreshold : r >= highThreshold;
      if (!continues) break;
    }
  }
  var chainSum = chainRolls.reduce(function(a, b) {
    return a + b;
  }, 0);
  var roll = openLow ? first + (lowSubtract ? -chainSum : chainSum) : first + chainSum;
  var total = roll + bonus + diff;
  var chainSign = openLow ? lowSubtract ? "-" : "+" : "+";
  var chainText = chainRolls.length ? " chain=" + chainRolls.map(function(f) {
    return chainSign + padD100Face(f);
  }).join(",") : "";
  var diffText = diff !== 0 ? " diff=" + signedNum(diff) : "";
  var umText = um !== null ? " um=" + um : "";
  var text = "[mrr-roll: mode=d100-open first=" + padD100Face(first) + chainText + " roll=" + roll + " bonus=" + signedNum(bonus) + diffText + " total=" + total + umText + "]";
  var renderFaces = [ {
    face: first,
    cls: "mrr-dice__face" + (openHigh || openLow ? " mrr-dice__face--wild" : "")
  } ].concat(chainRolls.map(function(f) {
    return {
      face: f,
      cls: "mrr-dice__face mrr-dice__face--double"
    };
  }));
  finalizeRoll(text, "narrate", renderFaces);
}

function rollPbta() {
  var mod = numFromInput("mod", 0);
  var a = 1 + Math.floor(Math.random() * 6);
  var b = 1 + Math.floor(Math.random() * 6);
  var total = a + b + mod;
  var bands = (state.ruleset.resolution.bands || []).slice().sort(function(x, y) {
    return y.min - x.min;
  });
  var band = bands.find(function(z) {
    return total >= z.min;
  });
  var label = band ? band.label : "?";
  var text = "[2d6+" + mod + " = " + total + " (" + a + "+" + b + ") -> " + label + "]";
  finalizeRoll(text, "success", [ {
    face: a,
    cls: "mrr-dice__face"
  }, {
    face: b,
    cls: "mrr-dice__face"
  } ]);
}

function fateGlyph(v) {
  return v > 0 ? "+" : v < 0 ? "-" : "0";
}

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
  var outcome;
  var kind;
  if (margin <= -1) {
    outcome = "failure";
    kind = "fail";
  } else if (margin === 0) {
    outcome = "tie";
    kind = "tie";
  } else if (margin >= sws) {
    outcome = "success with style";
    kind = "success";
  } else {
    outcome = "success";
    kind = "success";
  }
  var shifts = (margin > 0 ? "+" : "") + margin + " shift" + (Math.abs(margin) === 1 ? "" : "s");
  var modPart = skill !== 0 ? skill > 0 ? "+" + skill : String(skill) : "";
  var text = "[fate: 4dF" + modPart + " = " + total + " (" + faceLabels.join(",") + ") vs " + target + " -> " + outcome + " (" + shifts + ")]";
  finalizeRoll(text, kind, values.map(function(v) {
    var cls = "mrr-dice__face";
    if (v > 0) cls += " mrr-dice__face--success"; else if (v < 0) cls += " mrr-dice__face--one";
    return {
      face: fateGlyph(v),
      cls
    };
  }));
}

function finalizeRoll(text, kind, faces) {
  var amId = state.diceActiveModeId;
  var amStillValid = amId && amId !== "primary" && mrrResolveModeId(amId).id === amId;
  if (amStillValid && typeof text === "string" && text.indexOf("[dice: ") === 0) {
    text = "[dice: mode=" + amId + " " + text.slice("[dice: ".length);
  }
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
  var box = marinara.addElement(state.diceEl, "div", {
    class: "mrr-dice__result mrr-dice__result--" + kind,
    id: "mrr-dice-result"
  });
  if (!box) return;
  marinara.addElement(box, "div", {
    textContent: text
  });
  if (faces && faces.length) {
    var row = marinara.addElement(box, "div", {
      class: "mrr-dice__faces"
    });
    if (row) faces.forEach(function(f) {
      marinara.addElement(row, "span", {
        class: f.cls,
        textContent: String(f.face)
      });
    });
  }
}

function sendLastRoll() {
  if (!lastRollText) return;
  insertIntoChatInput(lastRollText);
}

function showDice(open) {
  if (state.diceEl && !state.diceEl.parentNode) {
    state.diceEl = null;
  }
  if (!state.diceEl) buildDice();
  if (!state.diceEl) {
    try {
      console.error("[mrr] showDice: buildDice failed; dice widget unavailable");
    } catch (e) {}
    return;
  }
  if (open) {
    state.diceEl.classList.add("mrr-dice--open");
    if (state.diceEl.style) {
      var left = parseInt(state.diceEl.style.left, 10);
      var top = parseInt(state.diceEl.style.top, 10);
      if (isFinite(left) || isFinite(top)) {
        if (!isFinite(left)) left = 16;
        if (!isFinite(top)) top = 80;
        var safeLeft = Math.max(0, Math.min(window.innerWidth - 80, left));
        var safeTop = Math.max(0, Math.min(window.innerHeight - 30, top));
        state.diceEl.style.left = safeLeft + "px";
        state.diceEl.style.top = safeTop + "px";
      }
    }
  } else {
    state.diceEl.classList.remove("mrr-dice--open");
    state.diceContext = null;
  }
}

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
    class: "mrr-gear-btn",
    textContent: "Ruleset" + (state.ruleset ? ": " + state.ruleset.name : "")
  });
  if (state.gearEl) marinara.on(state.gearEl, "click", openDialog);
}

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
    if (collapsed) state.mountEl.classList.add("mrr-hidden"); else state.mountEl.classList.remove("mrr-hidden");
  }
  if (state.toggleEl) {
    if (collapsed) state.toggleEl.classList.remove("mrr-sheet-toggle-btn--active"); else state.toggleEl.classList.add("mrr-sheet-toggle-btn--active");
    state.toggleEl.setAttribute("title", collapsed ? "Show character sheet" : "Hide character sheet");
    state.toggleEl.setAttribute("aria-pressed", collapsed ? "false" : "true");
  }
}

var SHEET_TOGGLE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + '<path d="M6 4h11a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H8"/>' + '<path d="M8 10v7a3 3 0 0 1-3 3v0a3 3 0 0 1-3-3v-1h9"/>' + '<path d="M6 4a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3"/>' + '<path d="M11 7h6"/>' + '<path d="M11 13h6"/>' + "</svg>";

function buildHeaderToggle() {
  if (state.toggleEl && state.toggleEl.parentNode) return;
  var anchor = state.gearEl && state.gearEl.parentNode || findHeaderAnchor();
  state.toggleEl = marinara.addElement(anchor, "button", {
    class: "mrr-sheet-toggle-btn",
    "aria-label": "Toggle character sheet",
    "aria-pressed": "false",
    title: "Show character sheet"
  });
  if (!state.toggleEl) return;
  state.toggleEl.innerHTML = SHEET_TOGGLE_SVG;
  marinara.on(state.toggleEl, "click", function(e) {
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
  state.dialogEl = marinara.addElement(document.body, "div", {
    class: "mrr-dialog-backdrop"
  });
  if (!state.dialogEl) return;
  state.dialogEl.classList.add("mrr-dialog-backdrop--open");
  var dialog = marinara.addElement(state.dialogEl, "div", {
    class: "mrr-dialog"
  });
  if (!dialog) return;
  marinara.addElement(dialog, "h3", {
    textContent: "Marinara RPG Ruleset"
  });
  marinara.addElement(dialog, "p", {
    textContent: "Choose a local file, fetch from a URL, or paste a bundle.json (single-file install) or plain ruleset.json directly. All three flows support either format."
  });
  var urlRow = marinara.addElement(dialog, "div", {
    class: "mrr-dialog__row"
  });
  var urlInput = null;
  if (urlRow) {
    marinara.addElement(urlRow, "label", {
      class: "mrr-dialog__label",
      textContent: "URL"
    });
    urlInput = marinara.addElement(urlRow, "input", {
      class: "mrr-dice__input",
      type: "text",
      value: lsGet(LS_RULESET_URL) || "",
      placeholder: "https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Extension/main/rulesets/exalted3e/ruleset.json"
    });
  }
  marinara.addElement(dialog, "p", {
    textContent: "Or paste the ruleset JSON directly:"
  });
  var ta = marinara.addElement(dialog, "textarea", {});
  if (ta) ta.value = lsGet(LS_RULESET) || "";
  var msg = marinara.addElement(dialog, "div", {
    class: "mrr-msg mrr-msg--info mrr-msg--hidden"
  });
  var buttons = marinara.addElement(dialog, "div", {
    class: "mrr-dialog__buttons"
  });
  if (buttons) {
    var btnFetch = marinara.addElement(buttons, "button", {
      class: "mrr-dice__btn mrr-dice__btn--secondary",
      textContent: "Fetch URL"
    });
    var btnFile = marinara.addElement(buttons, "button", {
      class: "mrr-dice__btn mrr-dice__btn--secondary",
      textContent: "Choose file..."
    });
    var btnClear = marinara.addElement(buttons, "button", {
      class: "mrr-dice__btn mrr-dice__btn--secondary",
      textContent: "Clear"
    });
    var btnUninstall = marinara.addElement(buttons, "button", {
      class: "mrr-dice__btn mrr-dice__btn--secondary",
      textContent: "Uninstall server data"
    });
    var btnAgentMgr = marinara.addElement(buttons, "button", {
      class: "mrr-dice__btn mrr-dice__btn--secondary",
      textContent: "Manage agents"
    });
    var btnAgentImport = marinara.addElement(buttons, "button", {
      class: "mrr-dice__btn mrr-dice__btn--secondary",
      textContent: "Import agents"
    });
    var btnRpImport = marinara.addElement(buttons, "button", {
      class: "mrr-dice__btn mrr-dice__btn--secondary",
      textContent: "Import from RP-mode ext"
    });
    var btnSave = marinara.addElement(buttons, "button", {
      class: "mrr-dice__btn",
      textContent: "Save and reload"
    });
    if (btnFile) marinara.on(btnFile, "click", function() {
      triggerUpload(function(text) {
        if (!text) {
          setMsg(msg, "File appears empty.", "err");
          return;
        }
        var parsed = safeParse(text);
        if (!parsed) {
          if (ta) ta.value = text;
          setMsg(msg, "Loaded file is not valid JSON. Fix the contents and click Save.", "err");
          return;
        }
        if (ta) ta.value = JSON.stringify(parsed, null, 2);
        var label = parsed.schema === BUNDLE_SCHEMA_ID ? "bundle for " + (parsed.ruleset && parsed.ruleset.name ? parsed.ruleset.name : "?") + " v" + (parsed.ruleset && parsed.ruleset.version ? parsed.ruleset.version : "?") : "ruleset " + (parsed.name || "?") + " v" + (parsed.version || "?");
        setMsg(msg, "Loaded " + label + " from file — click Save to activate.", "ok");
      });
    });
    if (btnUninstall) marinara.on(btnUninstall, "click", function() {
      if (state.installing) {
        setMsg(msg, "An install or uninstall is already in progress.", "err");
        return;
      }
      var rs = state.ruleset || loadRuleset();
      if (!rs || !rs.id) {
        setMsg(msg, "No active ruleset to uninstall.", "err");
        return;
      }
      if (!window.confirm('Remove the lorebook and GM agent created for ruleset "' + rs.id + '" from your Marinara server? This will not touch the local ruleset cache.')) return;
      state.installing = true;
      btnUninstall.disabled = true;
      if (btnSave) btnSave.disabled = true;
      function done() {
        state.installing = false;
        btnUninstall.disabled = false;
        if (btnSave) btnSave.disabled = false;
      }
      setMsg(msg, "Uninstalling ...", "info");
      uninstallBundleArtifacts(rs.id, "local", function(status) {
        setMsg(msg, status, "info");
      }).then(function() {
        setMsg(msg, "Server artifacts for " + rs.id + " removed.", "ok");
      }).catch(function(e) {
        setMsg(msg, "Uninstall failed: " + e.message, "err");
      }).then(done, done);
    });
    if (btnFetch) marinara.on(btnFetch, "click", function() {
      if (!urlInput || !urlInput.value) {
        setMsg(msg, "Enter a URL first.", "err");
        return;
      }
      lsSet(LS_RULESET_URL, urlInput.value);
      setMsg(msg, "Fetching ...", "info");
      fetchRulesetFromUrl(urlInput.value).then(function(parsed) {
        if (ta) ta.value = JSON.stringify(parsed, null, 2);
        var label = parsed.schema === BUNDLE_SCHEMA_ID ? "bundle for " + parsed.ruleset.name + " v" + parsed.ruleset.version : "ruleset " + parsed.name + " v" + parsed.version;
        setMsg(msg, "Fetched " + label + " — click Save to activate.", "ok");
      }).catch(function(e) {
        setMsg(msg, "Fetch failed: " + e.message, "err");
      });
    });
    if (btnClear) marinara.on(btnClear, "click", function() {
      lsDel(LS_RULESET);
      lsDel(LS_RULESET_URL);
      if (ta) ta.value = "";
      if (urlInput) urlInput.value = "";
      setMsg(msg, "Cleared. Reload the page to return to default Marinara UI.", "ok");
    });
    if (btnAgentMgr) marinara.on(btnAgentMgr, "click", function() {
      openAgentManagerDialog();
    });
    if (btnAgentImport) marinara.on(btnAgentImport, "click", function() {
      openAgentImportDialog();
    });
    if (btnRpImport) marinara.on(btnRpImport, "click", function() {
      importFromRpExtension();
    });
    if (btnSave) marinara.on(btnSave, "click", function() {
      var text = (ta && ta.value || "").trim();
      if (!text) {
        setMsg(msg, "Nothing to save. Use Clear to deactivate.", "err");
        return;
      }
      var parsed = safeParse(text);
      if (!parsed) {
        setMsg(msg, "Invalid JSON. Check braces and quotes.", "err");
        return;
      }
      if (parsed.schema === BUNDLE_SCHEMA_ID) {
        if (state.installing) {
          setMsg(msg, "An install is already in progress.", "err");
          return;
        }
        state.installing = true;
        btnSave.disabled = true;
        if (btnUninstall) btnUninstall.disabled = true;
        setMsg(msg, "Validating bundle ...", "info");
        installBundle(parsed, function(status) {
          setMsg(msg, status, "info");
        }).then(function() {
          if (urlInput && urlInput.value) lsSet(LS_RULESET_URL, urlInput.value);
          return applyScenarioDefaultToCurrentChat(parsed.scenarioDefault, function(status) {
            setMsg(msg, status, "info");
          });
        }).then(function() {
          setMsg(msg, "Bundle installed. Reloading ...", "ok");
          marinara.setTimeout(function() {
            window.location.reload();
          }, RELOAD_DELAY_MS);
        }).catch(function(e) {
          setMsg(msg, e.message, "err");
          state.installing = false;
          btnSave.disabled = false;
          if (btnUninstall) btnUninstall.disabled = false;
        });
        return;
      }
      var err = validateRuleset(parsed);
      if (err) {
        setMsg(msg, "Invalid: " + err, "err");
        return;
      }
      lsSet(LS_RULESET, JSON.stringify(parsed));
      mrrMarkDeliberateRulesetSwitch(parsed.id);
      if (urlInput && urlInput.value) lsSet(LS_RULESET_URL, urlInput.value);
      addToLibrary(parsed);
      setMsg(msg, "Saved. Reloading ...", "ok");
      marinara.setTimeout(function() {
        window.location.reload();
      }, RELOAD_DELAY_MS);
    });
  }
  renderLibrarySection(dialog, msg);
  marinara.on(state.dialogEl, "click", function(e) {
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
  marinara.addElement(dialog, "h3", {
    textContent: "Library",
    class: "mrr-dialog__lib-title"
  });
  marinara.addElement(dialog, "p", {
    class: "mrr-dialog__lib-help",
    textContent: "Saved rulesets on this browser. Switch swaps the active ruleset and reloads."
  });
  var list = marinara.addElement(dialog, "div", {
    class: "mrr-dialog__lib"
  });
  if (!list) return;
  var activeId = state.ruleset ? state.ruleset.id : null;
  ids.sort().forEach(function(id) {
    var entry = lib[id];
    var row = marinara.addElement(list, "div", {
      class: "mrr-dialog__lib-row"
    });
    if (!row) return;
    var label = entry.name + " v" + entry.version + (id === activeId ? " (active)" : "");
    marinara.addElement(row, "span", {
      class: "mrr-dialog__lib-name",
      textContent: label
    });
    if (id === activeId && state.chatId && mrrChatUnboundVirginId === state.chatId) {
      var btnBind = marinara.addElement(row, "button", {
        class: "mrr-dice__btn mrr-dice__btn--secondary",
        textContent: "Use in this chat"
      });
      if (btnBind) marinara.on(btnBind, "click", function() {
        var boundChatId = state.chatId;
        if (!boundChatId || mrrChatUnboundVirginId !== boundChatId) {
          setMsg(msg, "This chat is already bound to a ruleset.", "info");
          return;
        }
        mrrConfirmChatRuleset(boundChatId, "user bound this unbound chat to " + activeId + " from the Library");
        setMsg(msg, "This chat is now using " + entry.name + ".", "ok");
        btnBind.disabled = true;
      });
    }
    if (id !== activeId) {
      var btnSwitch = marinara.addElement(row, "button", {
        class: "mrr-dice__btn mrr-dice__btn--secondary",
        textContent: "Switch"
      });
      if (btnSwitch) marinara.on(btnSwitch, "click", function() {
        if (activateFromLibrary(id)) {
          mrrMarkDeliberateRulesetSwitch(id);
          setMsg(msg, "Activated " + entry.name + ". Reloading ...", "ok");
          marinara.setTimeout(function() {
            window.location.reload();
          }, RELOAD_DELAY_MS);
        }
      });
    }
    var btnRemove = marinara.addElement(row, "button", {
      class: "mrr-char-btn mrr-char-btn--danger",
      textContent: "x",
      title: "Remove from library"
    });
    if (btnRemove) marinara.on(btnRemove, "click", function() {
      if (!window.confirm("Remove " + entry.name + " from library? The active ruleset is unaffected.")) return;
      removeFromLibrary(id);
      if (state.dialogEl && state.dialogEl.parentNode) state.dialogEl.parentNode.removeChild(state.dialogEl);
      state.dialogEl = null;
      openDialog();
    });
  });
}

function mrrMechanicRoutingLines() {
  var res = state.ruleset && state.ruleset.resolution;
  var modes = res && Array.isArray(res.additionalModes) ? res.additionalModes : [];
  if (!modes.length) return [];
  var lines = [];
  lines.push("Dice mechanic routing (this ruleset offers more than one dice mechanic — request the right one by id; the dice widget rolls it and reports a self-describing [dice: mode=<id> ...] tag, you never roll it yourself). Only dice-pool and roll-under mechanics can appear in this list today — more modes as they're converted:");
  modes.forEach(function(am) {
    if (!am || typeof am.id !== "string") return;
    var bound = [];
    (state.ruleset.skills || []).forEach(function(sk) {
      if (sk && sk.resolutionId === am.id && typeof sk.name === "string") bound.push(sk.name);
    });
    (state.ruleset.derivedStats || []).forEach(function(d) {
      if (d && d.resolutionId === am.id && typeof d.name === "string") bound.push(d.name);
    });
    var line = "- " + am.id + " (" + (am.label || am.id) + ")";
    if (typeof am.whenToUse === "string" && am.whenToUse) line += " — " + am.whenToUse;
    if (bound.length) line += " [sheet-bound: " + bound.join(", ") + "]";
    lines.push(line);
  });
  lines.push("");
  return lines;
}

function mrrBuildTrackLadderLines() {
  var out = [];
  if (!state.sheet || !state.ruleset || !Array.isArray(state.ruleset.derivedStats)) return out;
  var tracks = state.ruleset.derivedStats.filter(function(d) {
    return d && d.renderAs === "track" && Array.isArray(d.track) && d.track.length;
  });
  if (!tracks.length) return out;
  tracks.forEach(function(d) {
    var name = d.name;
    var baseCells = d.track.map(function(c) {
      return {
        cell: c,
        extra: false
      };
    });
    var extras = state.sheet.extraTrack && Array.isArray(state.sheet.extraTrack[name]) ? state.sheet.extraTrack[name].map(function(c) {
      return {
        cell: c,
        extra: true
      };
    }) : [];
    var tagged = baseCells.concat(extras);
    tagged.sort(function(a, b) {
      return (b.cell.penalty || 0) - (a.cell.penalty || 0);
    });
    var filled = state.sheet.trackCells && Array.isArray(state.sheet.trackCells[name]) ? state.sheet.trackCells[name].slice() : [];
    while (filled.length < tagged.length) filled.push(null);
    var types = damageTypesFor(d);
    var labelToId = Object.create(null);
    if (types) types.forEach(function(t) {
      labelToId[t.label] = t.id;
    });
    var levels = [];
    for (var i = 0; i < tagged.length; i++) {
      var c = tagged[i].cell;
      var lbl = String(c.label == null ? "?" : c.label);
      var pen = c.penalty || 0;
      var last = levels[levels.length - 1];
      if (!last || last.label !== lbl || last.penalty !== pen) {
        last = {
          label: lbl,
          penalty: pen,
          count: 0,
          bonus: 0,
          marks: Object.create(null),
          empty: 0
        };
        levels.push(last);
      }
      last.count++;
      if (tagged[i].extra) last.bonus++;
      var mark = filled[i];
      if (mark) {
        var key = types ? labelToId[mark] || String(mark) : "marked";
        last.marks[key] = (last.marks[key] || 0) + 1;
      } else {
        last.empty++;
      }
    }
    var totalBoxes = tagged.length;
    var bonusBoxes = extras.length;
    var baseBoxes = totalBoxes - bonusBoxes;
    var parts = levels.map(function(L) {
      var inner = [];
      Object.keys(L.marks).forEach(function(k) {
        inner.push(L.marks[k] + " " + k);
      });
      if (L.empty) inner.push(L.empty + " empty");
      var bonusTag = L.bonus ? " (+" + L.bonus + " bonus)" : "";
      return L.label + " x" + L.count + bonusTag + " [" + inner.join(", ") + "]";
    });
    var deepest = null;
    for (var f = 0; f < tagged.length; f++) {
      if (filled[f]) deepest = tagged[f].cell;
    }
    var deepestStr = deepest ? " — deepest filled level: " + String(deepest.label) + " (penalty " + (deepest.penalty || 0) + ")" : " — no damage marked (penalty 0)";
    var totalsStr = "";
    if (types) {
      var totals = [];
      types.forEach(function(t) {
        var n = 0;
        for (var q = 0; q < filled.length; q++) if (filled[q] === t.label) n++;
        totals.push(n + " " + t.id);
      });
      totalsStr = "; totals " + totals.join(", ");
    } else {
      var markedCount = 0;
      for (var w = 0; w < filled.length; w++) if (filled[w]) markedCount++;
      totalsStr = "; " + markedCount + " of " + totalBoxes + " marked";
    }
    var header = name + " — " + totalBoxes + " boxes total (" + baseBoxes + " base" + (bonusBoxes ? " +" + bonusBoxes + " bonus" : "") + ")";
    out.push("- " + header + ": " + parts.join(" | ") + deepestStr + totalsStr);
  });
  if (out.length) {
    out.unshift("Track ladders (COUNT THESE BOXES — do not assume the system's default ladder; bonus levels from abilities like Ox-Body Technique are already included in the counts below):");
    out.push("");
  }
  return out;
}

function mrrWithSheetBound(sheet, characterId, fn) {
  var prevSheet = state.sheet;
  var prevActive = state.activeCharacterId;
  if (sheet) state.sheet = sheet;
  if (characterId) state.activeCharacterId = characterId;
  try {
    return fn();
  } finally {
    state.sheet = prevSheet;
    state.activeCharacterId = prevActive;
  }
}

var mrrRenderSuppressed = false;

var mrrBoundApplyCharId = null;

function mrrWithSheetBoundApply(sheet, characterId, fn) {
  var prevRender = mrrRenderSuppressed;
  var prevBound = mrrBoundApplyCharId;
  mrrRenderSuppressed = true;
  mrrBoundApplyCharId = characterId;
  try {
    var result = mrrWithSheetBound(sheet, characterId, fn);
    if (result && typeof result.then === "function") {
      warn("party writes: a bound-apply region returned a THENABLE for character " + characterId + " — the binding has already been restored, so any deferred work will run against whoever is active THEN, " + "not this target. The mutation pipeline must stay fully synchronous inside a binding (spec §4.2). " + "This is a defect in whatever was just added to the apply path, not a recoverable condition.");
    }
    return result;
  } finally {
    mrrRenderSuppressed = prevRender;
    mrrBoundApplyCharId = prevBound;
  }
}

function buildSheetForPrompt(sheetArg, characterIdArg) {
  if (sheetArg || characterIdArg) {
    return mrrWithSheetBound(sheetArg, characterIdArg, function() {
      return buildSheetForPrompt();
    });
  }
  if (!state.sheet || !state.ruleset) return "";
  var current = state.characters.find(function(c) {
    return c.id === state.activeCharacterId;
  });
  var charName = current && current.name || "Character";
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
    lines.push("- " + raceLbl + ": " + (state.sheet.identity.race || "(unset)"));
    lines.push("- " + classLbl + ": " + (state.sheet.identity["class"] || "(unset)"));
    lines.push("");
  }
  if (Object.keys(state.sheet.attributes || {}).length) {
    lines.push("Attributes:");
    Object.keys(state.sheet.attributes).forEach(function(n) {
      var v = state.sheet.attributes[n];
      var modKey = n + "_mod";
      var mod = ctx[modKey];
      var modStr = typeof mod === "number" ? "  (mod " + (mod >= 0 ? "+" : "") + mod + ")" : "";
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
    var tierBonus = t && t.rollBonusFormula ? evalFormula(t.rollBonusFormula, ctx) : 0;
    if (tierBonus == null) tierBonus = 0;
    var gearBonus = (equippedBonuses(name) || {}).value || 0;
    if (skillFormula) {
      var subbed = String(skillFormula).replace(/\{linkedAttribute_mod\}/g, String(attrMod)).replace(/\{tierBonus\}/g, String(tierBonus));
      var v = evalFormula(subbed, ctx);
      return (typeof v === "number" && isFinite(v) ? Math.floor(v) : 0) + gearBonus;
    }
    return attrMod + tierBonus + gearBonus;
  }
  if (Array.isArray(state.ruleset.skills) && state.ruleset.skills.length) {
    lines.push("Skills:");
    state.ruleset.skills.forEach(function(sk) {
      if (skillFormula) {
        var b = computeSkillBonus(sk.name, sk.linkedAttribute);
        var t = tierForSkill(sk.name);
        var tCode = t && t.code ? " [" + t.code + "]" : "";
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
    state.sheet.customSkills.forEach(function(sk) {
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
    state.ruleset.saves.forEach(function(sv) {
      var b = computeSkillBonus(sv.name, sv.linkedAttribute);
      var t = tierForSkill(sv.name);
      var tCode = t && t.code ? " [" + t.code + "]" : "";
      var sign = b >= 0 ? "+" : "";
      lines.push("- " + sv.name + " (" + (sv.linkedAttribute || "?") + "): " + sign + b + tCode);
    });
    lines.push("");
  }
  var derivedDefsForSnap = state.ruleset && Array.isArray(state.ruleset.derivedStats) ? state.ruleset.derivedStats : [];
  var derivedHiddenForSnap = {};
  if (state.ruleset && state.ruleset.sections && Array.isArray(state.ruleset.sections.hidden)) {
    state.ruleset.sections.hidden.forEach(function(h) {
      if (typeof h === "string" && h.indexOf("derived:") === 0) {
        derivedHiddenForSnap[h.slice(8)] = true;
      }
    });
  }
  var visibleDerivedForSnap = derivedDefsForSnap.filter(function(d) {
    return d && d.name && !derivedHiddenForSnap[d.name];
  });
  if (visibleDerivedForSnap.length) {
    lines.push('Derived Stats (totals include equipped-item bonuses; "base" = autocalc/manual value before armor/charm bonuses):');
    visibleDerivedForSnap.forEach(function(d) {
      var n = d.name;
      var base = null;
      if (typeof d.valueFormula === "string" && d.valueFormula) {
        var vf = evalFormula(d.valueFormula, ctx);
        base = typeof vf === "number" && isFinite(vf) ? Math.floor(vf) : null;
      } else if (typeof d.tooltipFormula === "string" && d.tooltipFormula && typeof mrrComputeTooltipBreakdown === "function") {
        var brk = mrrComputeTooltipBreakdown(d, ctx);
        base = brk && typeof brk.value === "number" ? brk.value : null;
      }
      if (base == null) {
        var stored = state.sheet.derived ? state.sheet.derived[n] : null;
        if (stored != null && stored !== "") {
          base = typeof stored === "number" ? stored : parseInt(stored, 10) || 0;
        } else if (typeof d.default === "number") {
          base = d.default;
        } else {
          base = 0;
        }
      }
      var b = equippedBonuses(n);
      var bonus = b && typeof b.value === "number" ? b.value : 0;
      if (bonus !== 0) {
        var total = base + bonus;
        var sign = bonus > 0 ? "+" : "";
        var contribs = b.contributors && b.contributors.length ? " [" + b.contributors.map(function(c) {
          return c.name + " " + (c.value > 0 ? "+" : "") + c.value;
        }).join(", ") + "]" : "";
        lines.push("- " + n + ": " + total + " (base " + base + " " + sign + bonus + " from equipment" + contribs + ")");
      } else {
        lines.push("- " + n + ": " + base);
      }
    });
    lines.push("");
  }
  if (Array.isArray(state.ruleset.resources) && state.ruleset.resources.length) {
    var resourceLinesForSnap = [];
    state.ruleset.resources.forEach(function(r) {
      if (!r || !r.id) return;
      if (r.type === "custom") return;
      var maxVal = null;
      if (typeof r.max === "number") maxVal = r.max; else if (typeof r.max === "string" && r.max) {
        var mv = evalFormula(r.max, ctx);
        if (typeof mv === "number" && isFinite(mv)) maxVal = Math.floor(mv);
      }
      var committedForSnap = 0;
      if (typeof r.commitmentPool === "string" && r.commitmentPool && typeof computeCommittedMotes === "function") {
        committedForSnap = computeCommittedMotes(r.commitmentPool);
        if (maxVal != null) maxVal = Math.max(0, maxVal - committedForSnap);
      }
      var stateRec = state.sheet.resources ? state.sheet.resources[r.id] : null;
      var stateNameVal = r.stateName && state.sheet.derived ? state.sheet.derived[r.stateName] : null;
      var current = null;
      if (stateNameVal != null && stateNameVal !== "") {
        current = typeof stateNameVal === "number" ? stateNameVal : parseInt(stateNameVal, 10) || 0;
      } else if (stateRec && stateRec.current != null && stateRec.current !== "") {
        current = typeof stateRec.current === "number" ? stateRec.current : parseInt(stateRec.current, 10) || 0;
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
    Object.keys(state.sheet.states).forEach(function(n) {
      var v = state.sheet.states[n];
      if (v) lines.push("- " + n + ": " + v);
    });
    lines.push("");
  }
  if (Array.isArray(state.sheet.conditions) && state.sheet.conditions.length) {
    var condDefs = state.ruleset && Array.isArray(state.ruleset.conditions) ? state.ruleset.conditions : [];
    var condDefByName = {};
    condDefs.forEach(function(d) {
      if (d && d.name) condDefByName[d.name.toLowerCase()] = d;
    });
    lines.push("Active Conditions:");
    state.sheet.conditions.forEach(function(cn) {
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
    var bgLabel = state.ruleset.backgrounds && state.ruleset.backgrounds.label || "Backgrounds";
    lines.push(bgLabel + ":");
    state.sheet.backgrounds.forEach(function(bg) {
      if (!bg.name) return;
      lines.push("- " + bg.name + ": " + (bg.value || 0));
    });
    lines.push("");
  }
  if (state.sheet.xp && typeof state.sheet.xp === "object") {
    var resModePrompt = state.ruleset.resolution && state.ruleset.resolution.mode;
    if (resModePrompt === "single-roll") {
      var lvlP = state.sheet.xp.level || 1;
      var curP = state.sheet.xp.current || 0;
      var nxtP = state.sheet.xp.next || 0;
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
      var totPP = state.sheet.xp.total || 0;
      lines.push("Experience:");
      lines.push("- XP available to spend: " + curPP);
      lines.push("- Total XP earned (lifetime): " + totPP);
      lines.push("");
    }
  }
  if (Array.isArray(state.sheet.inventory) && state.sheet.inventory.length) {
    var commitModelPrompt = state.ruleset.commitmentModel || null;
    lines.push("Inventory:");
    state.sheet.inventory.forEach(function(it) {
      if (!it || !it.name) return;
      var parts = [ "- " + it.name ];
      if (it.slot) parts.push("[" + it.slot + "]");
      if (it.damage) parts.push("damage: " + it.damage);
      var equipped = state.sheet.equipped && it.slot && state.sheet.equipped[it.slot] === it.id;
      if (equipped) parts.push("EQUIPPED");
      if (commitModelPrompt === "attuned" && it.attuned) parts.push("ATTUNED");
      if (commitModelPrompt === "invested" && it.invested) parts.push("INVESTED");
      if (commitModelPrompt === "mote" && it.moteCommitment > 0) {
        parts.push("committed: " + it.moteCommitment + " mote" + (it.moteCommitment === 1 ? "" : "s") + " (" + (it.motePool || "Personal") + ")");
      }
      lines.push(parts.join(" "));
    });
    lines.push("");
  }
  var commitModelSummary = state.ruleset.commitmentModel || null;
  if (commitModelSummary && Array.isArray(state.sheet.inventory)) {
    if (commitModelSummary === "attuned") {
      var acP = state.sheet.inventory.filter(function(it) {
        return it && it.attuned;
      }).length;
      lines.push("Magic / Commitment:");
      lines.push("- Items attuned: " + acP + " / 3 (D&D attunement cap)");
      lines.push("");
    } else if (commitModelSummary === "invested") {
      var icP = state.sheet.inventory.filter(function(it) {
        return it && it.invested;
      }).length;
      lines.push("Magic / Commitment:");
      lines.push("- Items invested: " + icP + " / 10 (PF2e investiture cap)");
      lines.push("");
    } else if (commitModelSummary === "mote") {
      var personalP = 0, peripheralP = 0;
      state.sheet.inventory.forEach(function(it) {
        if (!it || !it.moteCommitment) return;
        if (it.motePool === "Peripheral") peripheralP += it.moteCommitment; else personalP += it.moteCommitment;
      });
      if (personalP > 0 || peripheralP > 0) {
        lines.push("Magic / Commitment:");
        lines.push("- Mote commitment (Exalted): " + (personalP + peripheralP) + " motes total");
        if (personalP > 0) lines.push("  · Personal pool: " + personalP);
        if (peripheralP > 0) lines.push("  · Peripheral pool: " + peripheralP);
        lines.push("");
      }
    }
  }
  if (Array.isArray(state.sheet.intimacies) && state.sheet.intimacies.length) {
    lines.push("Intimacies:");
    var byDeg = {
      defining: [],
      major: [],
      minor: []
    };
    state.sheet.intimacies.forEach(function(it) {
      if (!it || !it.text) return;
      var d = it.degree === "major" || it.degree === "defining" ? it.degree : "minor";
      byDeg[d].push(it);
    });
    [ "defining", "major", "minor" ].forEach(function(deg) {
      var entries = byDeg[deg];
      if (!entries.length) return;
      var degLabel = deg.charAt(0).toUpperCase() + deg.slice(1);
      lines.push("- " + degLabel + ":");
      entries.forEach(function(it) {
        var kindLabel = it.kind === "principle" ? "Principle" : "Tie";
        var lineParts = [ "  · " + kindLabel + ": " + it.text ];
        if (it.kind === "tie" && it.target) lineParts.push("(toward " + it.target + ")");
        lines.push(lineParts.join(" "));
      });
    });
    lines.push("");
  }
  var poolModeForAbilities = state.ruleset && state.ruleset.resolution && state.ruleset.resolution.mode === "dice-pool";
  var abilitiesCfgForSnap = typeof getAbilitiesConfig === "function" ? getAbilitiesConfig() : null;
  if (poolModeForAbilities && abilitiesCfgForSnap && abilitiesCfgForSnap.categories) {
    var allCatsSnap = abilitiesCfgForSnap.categories.slice();
    if (Array.isArray(state.sheet.customAbilityCategories)) {
      allCatsSnap = allCatsSnap.concat(state.sheet.customAbilityCategories);
    }
    var anyDiscipline = false;
    var disciplineLines = [];
    allCatsSnap.forEach(function(cat) {
      var score = state.sheet.abilityCategoryScores && typeof state.sheet.abilityCategoryScores[cat.id] === "number" ? state.sheet.abilityCategoryScores[cat.id] : 0;
      var abs = state.sheet.abilities && Array.isArray(state.sheet.abilities[cat.id]) ? state.sheet.abilities[cat.id] : [];
      if (score === 0 && abs.length === 0) return;
      anyDiscipline = true;
      var catLine = "- " + cat.label + ": rating " + score;
      if (abs.length) catLine += " (" + abs.length + " " + (abs.length === 1 ? "ability" : "abilities") + ")";
      disciplineLines.push(catLine);
      abs.forEach(function(ab) {
        if (!ab || !ab.name) return;
        var abLine = "  · " + ab.name;
        if (ab.costText) abLine += " — cost: " + ab.costText;
        if (ab.notes && ab.notes !== ab.costText) abLine += " — " + ab.notes;
        disciplineLines.push(abLine);
      });
    });
    if (anyDiscipline) {
      lines.push((abilitiesCfgForSnap.label || "Abilities") + ":");
      disciplineLines.forEach(function(l) {
        lines.push(l);
      });
      lines.push("");
    }
  }
  Array.prototype.push.apply(lines, mrrBuildTrackLadderLines());
  var refLines = [];
  function pushFieldRef(map, defs) {
    if (!Array.isArray(defs) || !defs.length) return;
    defs.forEach(function(def) {
      if (!def || typeof def.name !== "string") return;
      var label = def.name;
      var aliasParts = [];
      if (Array.isArray(def.aliases) && def.aliases.length) aliasParts = aliasParts.concat(def.aliases);
      if (map === "attributes" && typeof def.abbreviation === "string") aliasParts.push(def.abbreviation);
      if (aliasParts.length) label += " (aliases: " + aliasParts.join(", ") + ")";
      refLines.push("- " + label);
    });
  }
  pushFieldRef("derived", state.ruleset.derivedStats);
  pushFieldRef("attributes", state.ruleset.attributes);
  pushFieldRef("skills", state.ruleset.skills);
  refLines.push('- xp (use field="xp" with delta="+50" or absolute current/level/next/total — NOT the display label "XP available to spend")');
  if (Array.isArray(state.sheet.intimacies) || state.ruleset.id === "exalted3e") {
    refLines.push('- intimacies (use field="intimacies" with add="text" kind="tie|principle" degree="minor|major|defining" target="name"; remove="text"; or update via text=... + degree/kind)');
  }
  var commitMod = state.ruleset.commitmentModel;
  if (commitMod === "attuned") {
    refLines.push('- attunement (use field="attunement" item="<item name>" attuned="true|false" — D&D cap 3)');
  } else if (commitMod === "invested") {
    refLines.push('- investiture (use field="investiture" item="<item name>" invested="true|false" — PF2e cap 10)');
  } else if (commitMod === "mote") {
    refLines.push('- commitment (use field="commitment" item="<item name>" motes="N" pool="Personal|Peripheral" — Exalted mote commit)');
  }
  if (Array.isArray(state.ruleset.states) && state.ruleset.states.length) {
    state.ruleset.states.forEach(function(st) {
      if (!st || typeof st.name !== "string") return;
      var stLabels = (Array.isArray(st.values) ? st.values : []).map(function(v) {
        return v && v.label;
      }).filter(Boolean);
      refLines.push("- " + st.name + ' (label-valued STATE — set with field="' + st.name + '" value="<label>", NEVER delta; labels: ' + stLabels.join(" | ") + ")");
    });
  }
  (state.ruleset.derivedStats || []).forEach(function(d) {
    if (!d || d.renderAs !== "track" || !Array.isArray(d.damageTypes) || !d.damageTypes.length) return;
    var typeIds = d.damageTypes.map(function(t) {
      return t.id;
    }).join(" | ");
    refLines.push("- " + d.name + ' damage (use the damage TYPE as the field: field="' + d.damageTypes[0].id + '" delta="+3" — types: ' + typeIds + '; do NOT use field="' + d.name + '" with type attributes)');
  });
  if (refLines.length) {
    lines.push('State-mutator field reference (use these EXACT names — not display labels — in [mrr-state: field="..."] tags):');
    Array.prototype.push.apply(lines, refLines);
    lines.push("");
  }
  Array.prototype.push.apply(lines, mrrMechanicRoutingLines());
  return lines.join("\n").trim();
}

var MRR_PARTY_BLOCK_MAX_BYTES = 24576;

var MRR_PARTY_LABEL_ACTIVE = "ACTIVE PLAYER CHARACTER";

var MRR_PARTY_LABEL_MEMBER = "PARTY MEMBER";

function mrrPartySectionHeader(label, name, note) {
  return "═══ " + label + " — " + name + " ═══" + (note ? "  " + note : "");
}

function mrrPartyMemberSheet(characterId, ruleset) {
  if (!characterId || !ruleset) return null;
  var rid = typeof ruleset.id === "string" && ruleset.id ? ruleset.id : null;
  var res = mrrResolveRecordRaw(characterId, rid);
  if (!res.raw) return null;
  var parsed = safeParse(res.raw);
  if (!parsed) return null;
  if (mrrStoredSheetForeignRuleset(parsed, ruleset)) return null;
  return mergeSheet(blankSheet(ruleset), mrrMigrateIfNeeded(parsed, ruleset));
}

function mrrPartyRosterOrder() {
  var roster = Array.isArray(state.characters) ? state.characters : [];
  var activeId = state.activeCharacterId || null;
  var out = [];
  var seen = Object.create(null);
  if (activeId) {
    out.push({
      id: activeId,
      name: mrrCharacterLabel(activeId),
      active: true
    });
    seen[activeId] = true;
  }
  for (var i = 0; i < roster.length; i++) {
    var c = roster[i];
    if (!c || !c.id || seen[c.id]) continue;
    seen[c.id] = true;
    out.push({
      id: c.id,
      name: c.name || c.id,
      active: false
    });
  }
  return out;
}

function mrrPartyMemberSummaryLines(sheet, characterId) {
  return mrrWithSheetBound(sheet, characterId, function() {
    var defs = state.ruleset && Array.isArray(state.ruleset.derivedStats) ? state.ruleset.derivedStats : [];
    var lines = [];
    defs.forEach(function(d) {
      if (!d || !d.name || d.renderAs !== "bar") return;
      var cur = state.sheet.derived && state.sheet.derived[d.name] || 0;
      var max = mrrP3ComputeBarMax(d);
      lines.push("- " + d.name + ": " + cur + " / " + max);
    });
    if (!lines.length) {
      defs.forEach(function(d) {
        if (!d || !d.name || d.renderAs !== "track" || !Array.isArray(d.track) || !d.track.length) return;
        var extras = state.sheet.extraTrack && Array.isArray(state.sheet.extraTrack[d.name]) ? state.sheet.extraTrack[d.name].length : 0;
        var total = d.track.length + extras;
        var cells = state.sheet.trackCells && Array.isArray(state.sheet.trackCells[d.name]) ? state.sheet.trackCells[d.name] : [];
        var marked = 0;
        for (var i = 0; i < cells.length; i++) if (cells[i]) marked++;
        lines.push("- " + d.name + ": " + marked + " of " + total + " boxes marked");
      });
    }
    if (!lines.length) lines.push("- (this system declares no bar-type stat — no summary numbers exist to quote)");
    return lines;
  });
}

function buildPartySheetBlock() {
  var out = {
    text: "",
    partyCount: 0,
    collapsed: [],
    missing: [],
    bytes: 0,
    over: false
  };
  if (!state.sheet || !state.ruleset) return out;
  var activeText = buildSheetForPrompt();
  var order = mrrPartyRosterOrder();
  var others = order.slice(1);
  if (!others.length) {
    out.text = activeText;
    out.bytes = mrrByteLength(activeText);
    return out;
  }
  var activeName = order[0].name;
  var sections = others.map(function(m) {
    var sheet = mrrPartyMemberSheet(m.id, state.ruleset);
    if (!sheet) {
      out.missing.push(m.name);
      return {
        member: m,
        kind: "missing",
        text: mrrPartySectionHeader(MRR_PARTY_LABEL_MEMBER, m.name, "(no sheet for this system)") + "\n" + "No sheet record exists for " + m.name + " under " + state.ruleset.name + ". This character has NO numbers here. " + "Do not invent any — resolve their actions narratively, or ask the player to create a sheet for this system."
      };
    }
    return {
      member: m,
      kind: "full",
      full: mrrPartySectionHeader(MRR_PARTY_LABEL_MEMBER, m.name) + "\n" + buildSheetForPrompt(sheet, m.id),
      small: mrrPartySectionHeader(MRR_PARTY_LABEL_MEMBER, m.name, "(collapsed — over the party-block budget)") + "\n" + mrrPartyMemberSummaryLines(sheet, m.id).join("\n") + "\n" + "Full sheet omitted to stay inside the prompt budget. These are current/max pool values only; " + "anything not listed is NOT available here — do not invent it."
    };
  });
  var preamble = [ "PARTY ROSTER — " + order.length + " character(s) in this chat under " + state.ruleset.name + " v" + state.ruleset.version + ".", "Each character's sheet appears below under its own header. EXACTLY ONE is the " + MRR_PARTY_LABEL_ACTIVE + " (" + activeName + "): that is the sheet the player's dice widget rolls from and the only sheet the extension can write. " + "The others are " + MRR_PARTY_LABEL_MEMBER + "s — their numbers are given here so you never have to invent them. " + "A member listed with no sheet for this system has no numbers at all; say so rather than making any up.", "" ].join("\n");
  function assemble() {
    var parts = [ preamble, mrrPartySectionHeader(MRR_PARTY_LABEL_ACTIVE, activeName) + "\n" + activeText ];
    sections.forEach(function(s) {
      parts.push(s.kind === "full" ? s.full : s.kind === "collapsed" ? s.small : s.text);
    });
    return parts.join("\n\n");
  }
  var text = assemble();
  for (var i = sections.length - 1; i >= 0 && mrrByteLength(text) > MRR_PARTY_BLOCK_MAX_BYTES; i--) {
    if (sections[i].kind !== "full") continue;
    sections[i].kind = "collapsed";
    out.collapsed.push(sections[i].member.name);
    log("party block: collapsed " + sections[i].member.name + " to a bar summary — assembled block exceeded " + MRR_PARTY_BLOCK_MAX_BYTES + " bytes");
    text = assemble();
  }
  out.text = text;
  out.bytes = mrrByteLength(text);
  out.partyCount = sections.length;
  if (out.bytes > MRR_PARTY_BLOCK_MAX_BYTES) {
    out.over = true;
    warn("party block: " + out.bytes + " bytes with every party member already collapsed — " + (out.bytes - MRR_PARTY_BLOCK_MAX_BYTES) + " bytes over the " + MRR_PARTY_BLOCK_MAX_BYTES + "-byte budget. Nothing is truncated; consider splitting the party across chats.");
  }
  return out;
}

function mrrMutatorPartyRoutingClause(info) {
  if (!info || !info.partyCount) return "";
  var order = mrrPartyRosterOrder();
  var activeName = order.length ? order[0].name : "the active character";
  var names = [];
  for (var i = 0; i < order.length; i++) names.push('"' + order[i].name + '"');
  var lines = [];
  lines.push("STATE-TAG ROUTING — PARTY MODE (read before emitting anything)");
  lines.push("");
  lines.push("The party block above carries " + info.partyCount + " character sheet(s). The " + MRR_PARTY_LABEL_ACTIVE + " is " + activeName + "; the rest are " + MRR_PARTY_LABEL_MEMBER + "s. Your tags can reach ANY of them, and target= is how you choose.");
  lines.push("");
  lines.push("1. EVERY [mrr-state: ...] tag MUST carry target=. The only valid values are these, spelled exactly as " + "the party block headers spell them: " + names.join(", ") + '. You may also write target="player" as ' + "shorthand for the " + MRR_PARTY_LABEL_ACTIVE + ", " + activeName + ". Nothing else is a valid target.");
  lines.push("2. A tag naming a " + MRR_PARTY_LABEL_MEMBER + " updates THAT member's sheet, now, this turn. Routing is " + "real: the extension applies the write to the character you named, not to " + activeName + ".");
  lines.push("3. A character who is NOT in that list — an NPC, or a party member with no sheet in this system — gets " + 'NO tag. State the change in prose instead, on its own line, prefixed "PARTY:" and naming the character ' + "and the change exactly as the narration stated it — e.g. PARTY: Mira took 7 slashing damage (GM narrated 7). " + "A tag with an unrecognised target is DROPPED, not guessed at, so the change would simply be lost.");
  lines.push("4. NO RETROACTIVE CORRECTIONS. Your tags describe THIS turn's narrated changes and nothing else. If a " + "number on a sheet disagrees with what earlier narration implied, do NOT emit a tag to reconcile it — the " + "sheet is the source of truth, and only current-turn narration moves it. Report the disagreement in prose " + 'instead, on its own line, prefixed "DISCREPANCY:" and naming the character, the field, the sheet value ' + "and the value the narration implied — e.g. DISCREPANCY: Mira's Peripheral Motes reads 11, earlier " + "narration implied 6. The humans decide what to do about it. A catch-up tag added to a legitimate new " + "change applies BOTH, which is how a 5-point spend moves a pool by 10.");
  lines.push("5. This ADDS routing and two narrowly-shaped prose lines. It relaxes NOTHING above: numbers are still " + "copied from the narration, still cited in reason=, and a change with no stated number still emits no tag " + "at all. If the turn produced no tags, still print NO STATE CHANGE, with any PARTY: or DISCREPANCY: lines " + "beneath it.");
  return lines.join("\n");
}

var SHEET_INJECT_BEGIN = "\x3c!-- MRR_SHEET_BEGIN --\x3e";

var SHEET_INJECT_END = "\x3c!-- MRR_SHEET_END --\x3e";

function mrrStripInjectedSheetBlock(promptTemplate) {
  var template = String(promptTemplate || "");
  var beginEsc = SHEET_INJECT_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var endEsc = SHEET_INJECT_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var stripRe = new RegExp(beginEsc + "[\\s\\S]*?" + endEsc + "\\n*", "g");
  return template.replace(stripRe, "");
}

function injectSheetIntoPromptTemplate(promptTemplate, sheetBlock) {
  var stripped = mrrStripInjectedSheetBlock(promptTemplate);
  if (!sheetBlock) return stripped.trim();
  return SHEET_INJECT_BEGIN + "\n" + sheetBlock + "\n" + SHEET_INJECT_END + "\n\n" + stripped.trim();
}

function mrrInvalidateSheetSyncMemo(why) {
  state.mrrSyncLastBlock = Object.create(null);
  state.mrrSyncGen = (state.mrrSyncGen || 0) + 1;
  log("sheet-sync content memo cleared (" + why + ") — the next sync re-PATCHes every managed agent");
}

function syncSheetToAgents() {
  if (!state.ruleset) return;
  var party = buildPartySheetBlock();
  var sheetBlock = party.text;
  if (!sheetBlock) return;
  var mutatorClause = mrrMutatorPartyRoutingClause(party);
  var rulesetId = state.ruleset.id;
  if (!state.mrrSyncLastBlock) state.mrrSyncLastBlock = Object.create(null);
  var signature = sheetBlock + "\0" + (mutatorClause || "");
  if (state.mrrSyncLastBlock[rulesetId] === signature) return;
  if (state.mrrSyncInFlight) {
    state.mrrSyncDirty = true;
    return;
  }
  state.mrrSyncInFlight = true;
  state.mrrSyncDirty = false;
  var syncGen = state.mrrSyncGen || 0;
  var fannedOut = false;
  apiFetch("/agents").then(function(agents) {
    if (!Array.isArray(agents)) return;
    var managed = agents.filter(function(a) {
      var s = parseAgentSettings(a);
      return s && s.mrrManaged === true && s.mrrRulesetId === rulesetId;
    });
    if (!managed.length) {
      log("syncSheetToAgents: no managed agents for ruleset " + rulesetId);
      return;
    }
    fannedOut = true;
    var mutatorCount = 0;
    return Promise.all(managed.map(function(a) {
      var s = parseAgentSettings(a);
      var block = sheetBlock;
      if (mutatorClause && s && s.mrrAgentRole === "state-mutator") {
        block = sheetBlock + "\n\n" + mutatorClause;
        mutatorCount++;
      }
      var newPrompt = injectSheetIntoPromptTemplate(a.promptTemplate, block);
      if (newPrompt === a.promptTemplate) return null;
      return apiFetch("/agents/" + a.id, {
        method: "PATCH",
        body: JSON.stringify({
          promptTemplate: newPrompt
        })
      });
    })).then(function() {
      log("synced ACTIVE + " + party.partyCount + " party sheet(s) into " + managed.length + " agent prompts for ruleset " + rulesetId + " (collapsed: " + party.collapsed.length + ")" + (party.missing.length ? " (no sheet for this system: " + party.missing.join(", ") + ")" : "") + (mutatorCount ? " (state-tag routing clause -> " + mutatorCount + " mutator prompt)" : ""));
    });
  }).then(function() {
    state.mrrSyncInFlight = false;
    if (fannedOut && (state.mrrSyncGen || 0) === syncGen) state.mrrSyncLastBlock[rulesetId] = signature;
    if (state.mrrSyncDirty || (state.mrrSyncGen || 0) !== syncGen) {
      state.mrrSyncDirty = false;
      syncSheetToAgents();
    }
  }, function(e) {
    state.mrrSyncInFlight = false;
    state.mrrSyncDirty = false;
    warn("syncSheetToAgents failed: " + (e && e.message ? e.message : e));
  });
}

function buildFieldReferenceContent() {
  if (!state.ruleset) return "";
  var lines = [];
  lines.push("STATE-MUTATOR FIELD REFERENCE for " + state.ruleset.name + " (auto-generated by extension)");
  lines.push("");
  lines.push('When you emit [mrr-state: target="player" field="..." delta="..."] tags, the field token must match a stat the sheet recognizes. The extension auto-resolves case/punctuation variants and accepts these declared aliases. Use any name in the list and the mutation will land on the correct stat.');
  lines.push("");
  function pushDef(label, defs) {
    var rows = [];
    (defs || []).forEach(function(def) {
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
  pushDef("Attributes", state.ruleset.attributes);
  pushDef("Skills", state.ruleset.skills);
  if (Array.isArray(state.ruleset.states) && state.ruleset.states.length) {
    lines.push('Label-valued States (SET BY LABEL — value="<label>", never delta):');
    state.ruleset.states.forEach(function(st) {
      if (!st || typeof st.name !== "string") return;
      var stLabels = (Array.isArray(st.values) ? st.values : []).map(function(v) {
        return v && v.label;
      }).filter(Boolean);
      lines.push("- " + st.name + ": " + stLabels.join(" | "));
    });
    var st0 = state.ruleset.states[0];
    var st0Label = Array.isArray(st0.values) && st0.values[1] && st0.values[1].label || Array.isArray(st0.values) && st0.values[0] && st0.values[0].label || "";
    if (st0Label) lines.push('  Example: [mrr-state: target="player" field="' + st0.name + '" value="' + st0Label + '"]');
    lines.push("");
  }
  lines.push("Common compound mutations the narrator may emit:");
  (state.ruleset.derivedStats || []).forEach(function(d) {
    if (!d || d.renderAs !== "track" || !Array.isArray(d.damageTypes) || !d.damageTypes.length) return;
    var typeIds = d.damageTypes.map(function(t) {
      return t.id;
    }).join(" | ");
    lines.push("- " + d.name + ' damage: use the damage TYPE as the field — [mrr-state: target="player" field="' + d.damageTypes[0].id + '" delta="+3" reason="..."] (types: ' + typeIds + '). Never field="' + d.name + '" with type attributes.');
  });
  lines.push('- Damage: [mrr-state: target="player" field="hp" delta="-5" reason="orc sword hit"]');
  lines.push('- Healing: [mrr-state: target="player" field="hp" delta="+10" reason="healing potion"]');
  lines.push('- Add condition: [mrr-state: target="player" field="conditions" add="poisoned" reason="failed CON save"]');
  lines.push('- Remove condition: [mrr-state: target="player" field="conditions" remove="poisoned"]');
  lines.push('- Inventory gain (bare): [mrr-state: target="player" field="inventory" add="Rope (50ft)" qty="1"]');
  lines.push('- Inventory gain (stored / consumable): [mrr-state: target="player" field="inventory" add="Healing Potion" qty="2" use_effect="2d4+2 healing" consumable="true" reason="purchased"]');
  lines.push('- Inventory gain (weapon): [mrr-state: target="player" field="inventory" add="Longsword" category="equipment" slot="weapon" damage="1d8 slashing" attack_attr="Strength" attack_proficient="true"]');
  lines.push('- Inventory gain (armor): [mrr-state: target="player" field="inventory" add="Chain Mail" category="equipment" slot="armor" notes="AC 16, Disadvantage on Stealth"]');
  lines.push('- Inventory remove: [mrr-state: target="player" field="inventory" remove="Healing Potion" qty="1"]');
  lines.push("");
  lines.push("Optional attrs on inventory.add (all optional, all map to the item-edit dialog):");
  lines.push('  slot              — equipment slot name ("weapon", "armor", "head", etc.) — presence implies category=equipment when not specified');
  lines.push('  damage            — free-text damage expression ("1d8 slashing", "2d6 fire", flat numbers)');
  lines.push('  attack_attr       — attribute name whose modifier adds to attack/damage rolls ("Strength", "Dexterity")');
  lines.push('  attack_proficient — "true" to add the proficiency bonus on attack rolls');
  lines.push('  use_effect        — free-text effect that the player Use button parses and rolls ("2d4+2 healing")');
  lines.push('  consumable        — "true" to decrement quantity by 1 each Use; item is removed when quantity hits 0');
  lines.push("  notes             — free-text notes that show in the dialog");
  lines.push('  category          — "equipment" (lives in the on-sheet Inventory section, equippable to slot) or "item" (Items flyout, usable / consumable). Default: "item" when no slot, "equipment" when slot is set.');
  lines.push("");
  lines.push("Repeated inventory.add tags with the same name BUMP QUANTITY and ENRICH any blank fields on the existing item — populate fields once authoritatively on first add, omit them on subsequent qty bumps.");
  lines.push("");
  Array.prototype.push.apply(lines, mrrMechanicRoutingLines());
  return lines.join("\n").trim();
}

var FIELD_REF_TAG = "mrr-field-reference";

function syncFieldReferenceToLorebook() {
  if (!state.ruleset) return;
  var rulesetId = state.ruleset.id;
  var content = buildFieldReferenceContent();
  if (!content) return;
  var keys = [];
  function addKeys(defs) {
    (defs || []).forEach(function(def) {
      if (def && typeof def.name === "string") keys.push(def.name);
      if (def && Array.isArray(def.aliases)) Array.prototype.push.apply(keys, def.aliases);
      if (def && typeof def.abbreviation === "string") keys.push(def.abbreviation);
    });
  }
  addKeys(state.ruleset.derivedStats);
  addKeys(state.ruleset.attributes);
  addKeys(state.ruleset.skills);
  apiFetch("/lorebooks").then(function(lorebooks) {
    var lb = findManagedLorebook(lorebooks, rulesetId);
    if (!lb) {
      log("syncFieldReferenceToLorebook: no managed lorebook for " + rulesetId);
      return;
    }
    return apiFetch("/lorebooks/" + lb.id + "/entries").then(function(full) {
      var entries = Array.isArray(full) ? full : [];
      var matches = entries.filter(function(e) {
        return e.name === "Field Reference (extension-managed)";
      });
      var cleanupChain = Promise.resolve();
      if (matches.length > 1) {
        log("cleaning up " + (matches.length - 1) + " duplicate field-reference entries");
        var toDelete = matches.slice(1);
        cleanupChain = toDelete.reduce(function(chain, dup) {
          return chain.then(function() {
            return apiDeleteRaw("/lorebooks/" + lb.id + "/entries/" + dup.id).catch(function() {});
          });
        }, Promise.resolve());
      }
      var existing = matches[0] || null;
      var body = {
        name: "Field Reference (extension-managed)",
        content,
        position: 0,
        constant: true,
        selective: false,
        keys
      };
      return cleanupChain.then(function() {
        if (existing) {
          return apiFetch("/lorebooks/" + lb.id + "/entries/" + existing.id, {
            method: "PATCH",
            body: JSON.stringify(body)
          }).then(function() {
            log("synced field reference to lorebook entry " + existing.id);
          });
        }
        return apiFetch("/lorebooks/" + lb.id + "/entries", {
          method: "POST",
          body: JSON.stringify(body)
        }).then(function() {
          log("created field reference lorebook entry");
        });
      });
    });
  }).catch(function(e) {
    warn("syncFieldReferenceToLorebook failed: " + (e && e.message ? e.message : e));
  });
}

function applyScenarioDefaultToCurrentChat(scenarioDefault, progressCb) {
  function report(s) {
    if (progressCb) progressCb(s);
  }
  if (!state.chatId) {
    report("No active chat — scenario default ships in the bundle but won't auto-apply.");
    return Promise.resolve();
  }
  if (!scenarioDefault || typeof scenarioDefault !== "string") {
    return Promise.resolve();
  }
  var prompt = "Apply the bundle's scenario default to this chat now?\n\n" + "This sets the chat's groupScenarioText override (the engine reads it during prompt assembly).\n\n" + "Click Cancel to leave the chat's scenario text alone — you can paste it manually later from the bundle's scenarioDefault field.";
  if (!window.confirm(prompt)) {
    report("Scenario default not applied — chat scenario text unchanged.");
    return Promise.resolve();
  }
  report("Applying scenario default to chat " + state.chatId + " ...");
  return apiFetch("/chats/" + state.chatId + "/metadata", {
    method: "PATCH",
    body: JSON.stringify({
      groupScenarioText: scenarioDefault
    })
  }).then(function() {
    report("Scenario default applied to current chat.");
  }).catch(function(e) {
    report("Failed to apply scenario default: " + (e && e.message ? e.message : e));
  });
}

function reconcileActiveAgents(rebind) {
  if (!state.chatId) return;
  if (!state.ruleset) return;
  var chatId = state.chatId;
  var rulesetId = state.ruleset.id;
  if (mrrChatUnboundVirginId === chatId) {
    log("reconcileActiveAgents: chat " + chatId + " is unbound (no stamp, nothing derivable) — NOT claiming it for " + rulesetId + "; a ruleset must be deliberately activated for this chat first (Corey ruling 2026-08-24)");
    return;
  }
  Promise.all([ apiFetch("/chats/" + chatId), apiFetch("/agents") ]).then(function(results) {
    var chat = results[0];
    var agents = results[1];
    var meta = chat && typeof chat.metadata === "string" ? safeParse(chat.metadata) || {} : chat && chat.metadata || {};
    var existing = Array.isArray(meta.activeAgentIds) ? meta.activeAgentIds : [];
    if (typeof mrrNoteChatRow === "function") mrrNoteChatRow(chatId, chat, "reconcileActiveAgents chat read");
    var stamp = meta.mrrChatRulesetId;
    if (stamp && stamp !== rulesetId) {
      if (!rebind) {
        log("reconcileActiveAgents: chat " + chatId + " is bound to ruleset " + stamp + "; current active is " + rulesetId + " — skipping (switch ruleset to update this chat)");
        return;
      }
      var oldManagedIds = (Array.isArray(agents) ? agents : []).filter(function(a) {
        var s = parseAgentSettings(a);
        return s && s.mrrManaged === true && s.mrrRulesetId === stamp;
      }).reduce(function(acc, a) {
        if (acc.indexOf(a.type) === -1) acc.push(a.type);
        if (acc.indexOf(a.id) === -1) acc.push(a.id);
        return acc;
      }, []);
      var newManagedIdsForRebind = mrrManagedAgentTypes(agents, rulesetId);
      var kept = existing.filter(function(id) {
        return oldManagedIds.indexOf(id) === -1;
      });
      var removedCount = existing.length - kept.length;
      var rebindSet = kept.slice();
      var addedCount = 0;
      newManagedIdsForRebind.forEach(function(id) {
        if (rebindSet.indexOf(id) === -1) {
          rebindSet.push(id);
          addedCount++;
        }
      });
      return apiFetch("/chats/" + chatId + "/metadata", {
        method: "PATCH",
        body: JSON.stringify({
          activeAgentIds: rebindSet,
          mrrChatRulesetId: rulesetId,
          enableAgents: true
        })
      }).then(function(patched) {
        if (typeof mrrNoteChatRow === "function") mrrNoteChatRow(chatId, patched, "metadata PATCH response (rebind)");
        log("reconcileActiveAgents: rebound chat " + chatId + " from " + stamp + " to " + rulesetId + " (−" + removedCount + " old agents, +" + addedCount + " new)");
        mrrNoteChatStamp(chatId, rulesetId, "reconcileActiveAgents rebind");
      });
    }
    var managedIds = mrrManagedAgentTypes(agents, rulesetId);
    if (managedIds.length === 0) {
      log("reconcileActiveAgents: no managed agents for " + rulesetId);
      return;
    }
    var union = existing.slice();
    var added = 0;
    managedIds.forEach(function(id) {
      if (union.indexOf(id) === -1) {
        union.push(id);
        added++;
      }
    });
    var needsPatch = added > 0 || !stamp;
    if (!needsPatch) {
      log("reconcileActiveAgents: " + managedIds.length + " managed agents already active in chat " + chatId);
      return;
    }
    var patchBody = {
      activeAgentIds: union,
      enableAgents: true
    };
    if (!stamp) patchBody.mrrChatRulesetId = rulesetId;
    return apiFetch("/chats/" + chatId + "/metadata", {
      method: "PATCH",
      body: JSON.stringify(patchBody)
    }).then(function(patched) {
      if (typeof mrrNoteChatRow === "function") mrrNoteChatRow(chatId, patched, "metadata PATCH response");
      var parts = [];
      if (added > 0) parts.push("added " + added + " agent id(s)");
      if (!stamp) parts.push("stamped ruleset " + rulesetId);
      log("reconcileActiveAgents: " + parts.join(", ") + " — chat " + chatId);
      mrrNoteChatStamp(chatId, rulesetId, "reconcileActiveAgents stamp");
    });
  }).catch(function(e) {
    warn("reconcileActiveAgents failed: " + (e && e.message ? e.message : e));
  });
}

var MRR_TYPE_SUFFIX_RE = /^[A-Za-z0-9_-]{1,8}(?:-[0-9]+)?$/;

var MRR_PRESET_WATCH_MS = 6e4;

var mrrReconcileDoneKey = null;

var mrrReconcilePromise = null;

var mrrReconcileNoPresetLoggedChatId = null;

var mrrReconcileStockPresetWarnedId = null;

var mrrManagedAgentSig = Object.create(null);

var mrrAppliedChatPresetSeen = Object.create(null);

var mrrStampDeriveTriedChatId = null;

var mrrPresetWatchTs = 0;

var mrrPresetWatchInFlight = false;

var mrrPresetWatchWarned = false;

function mrrChatMeta(chat) {
  if (chat && typeof chat.metadata === "string") return safeParse(chat.metadata) || {};
  return chat && chat.metadata || {};
}

function mrrManagedRoleTypes(agents, rulesetId) {
  var map = Object.create(null);
  var list = Array.isArray(agents) ? agents : [];
  for (var i = 0; i < list.length; i++) {
    var a = list[i];
    if (!a || typeof a.type !== "string" || !a.type) continue;
    var s = parseAgentSettings(a);
    if (!s || s.mrrManaged !== true || s.mrrRulesetId !== rulesetId) continue;
    var role = typeof s.mrrAgentRole === "string" && s.mrrAgentRole ? s.mrrAgentRole : "main";
    if (!map[role]) map[role] = a.type;
  }
  return map;
}

function mrrLiveAgentTypes(agents) {
  var set = Object.create(null);
  var list = Array.isArray(agents) ? agents : [];
  for (var i = 0; i < list.length; i++) {
    var t = list[i] && list[i].type;
    if (typeof t === "string" && t) set[t] = true;
  }
  return set;
}

function mrrRoleForOrphanType(orphanType, roleTypes) {
  if (typeof orphanType !== "string" || !orphanType) return null;
  if (orphanType.indexOf(MRR_AGENT_TYPE) !== 0) return null;
  var best = null;
  var bestLen = -1;
  for (var role in roleTypes) {
    if (!Object.prototype.hasOwnProperty.call(roleTypes, role)) continue;
    var base = mrrAgentTypeForRole(role);
    var rest = null;
    if (orphanType === base) rest = ""; else if (orphanType.indexOf(base + "-") === 0) rest = orphanType.slice(base.length + 1); else continue;
    if (rest && !MRR_TYPE_SUFFIX_RE.test(rest)) continue;
    if (base.length > bestLen) {
      bestLen = base.length;
      best = role;
    }
  }
  return best;
}

function mrrParseManagedPromptPrefix(promptTemplate) {
  if (typeof promptTemplate !== "string" || !promptTemplate) return null;
  var body = mrrStripInjectedSheetBlock(promptTemplate);
  if (body.indexOf(MRR_PROMPT_PFX) !== 0) return null;
  var close = body.indexOf("]");
  if (close === -1) return null;
  var inner = body.slice(MRR_PROMPT_PFX.length, close);
  var slash = inner.indexOf("/");
  if (slash <= 0) return null;
  var authorId = inner.slice(0, slash);
  var rest = inner.slice(slash + 1);
  if (!authorId || authorId.indexOf(":") !== -1) return null;
  var role = "main";
  var rulesetId = rest;
  var colon = rest.indexOf(":");
  if (colon !== -1) {
    rulesetId = rest.slice(0, colon);
    role = rest.slice(colon + 1);
    if (!role) return null;
  }
  if (!rulesetId) return null;
  return {
    authorId,
    rulesetId,
    role
  };
}

function mrrStrippedManagedRow(agent, rulesetId) {
  if (!agent || typeof agent !== "object") return null;
  if (typeof agent.type !== "string" || !agent.type) return null;
  if (agent.type.indexOf(MRR_AGENT_TYPE) !== 0) return null;
  var s = parseAgentSettings(agent);
  if (s && s.mrrManaged === true) return null;
  var pfx = mrrParseManagedPromptPrefix(agent.promptTemplate);
  if (!pfx) return null;
  if (pfx.rulesetId !== rulesetId) return null;
  var candidate = Object.create(null);
  candidate[pfx.role] = mrrAgentTypeForRole(pfx.role);
  if (mrrRoleForOrphanType(agent.type, candidate) !== pfx.role) return null;
  return {
    role: pfx.role,
    authorId: pfx.authorId
  };
}

function mrrStrippedManagedRows(agents, rulesetId) {
  var out = [];
  var list = Array.isArray(agents) ? agents : [];
  for (var i = 0; i < list.length; i++) {
    var hit = mrrStrippedManagedRow(list[i], rulesetId);
    if (hit) out.push({
      agent: list[i],
      role: hit.role,
      authorId: hit.authorId
    });
  }
  return out;
}

function mrrReadoptionSettings(agent, rulesetId, role, authorId) {
  var cur = parseAgentSettings(agent);
  var merged = {};
  for (var k in cur) if (Object.prototype.hasOwnProperty.call(cur, k)) merged[k] = cur[k];
  merged.mrrManaged = true;
  merged.mrrRulesetId = rulesetId;
  merged.mrrAuthorId = authorId;
  merged.mrrAgentRole = role;
  return merged;
}

function mrrReadoptStrippedRows(agents, rulesetId, progress) {
  var stripped = mrrStrippedManagedRows(agents, rulesetId);
  if (!stripped.length) return Promise.resolve([]);
  if (progress) progress("Re-adopting " + stripped.length + " agent row(s)...");
  var adopted = [];
  return stripped.reduce(function(chain, hit) {
    return chain.then(function() {
      var merged = mrrReadoptionSettings(hit.agent, rulesetId, hit.role, hit.authorId);
      return apiFetch("/agents/" + hit.agent.id, {
        method: "PATCH",
        body: JSON.stringify({
          settings: merged
        })
      }).then(function() {
        hit.agent.settings = merged;
        adopted.push({
          role: hit.role,
          id: hit.agent.id
        });
        log("reconcile: re-adopted the '" + hit.role + "' agent (row " + hit.agent.id + ", type '" + hit.agent.type + "') for ruleset " + rulesetId + " — an engine UI edit had stripped its " + "management tags; settings were MERGED, so every foreign key it carried " + "(output cap, connection, anything else) was preserved.");
      }).catch(function(e) {
        warn("reconcile: could not re-adopt the '" + hit.role + "' agent (row " + hit.agent.id + "): " + (e && e.message ? e.message : e) + " — it stays detached until the next pass");
      });
    });
  }, Promise.resolve()).then(function() {
    return adopted;
  });
}

function mrrRetiredManagedAgents(agents, rulesetId, bundleRoles) {
  if (!Array.isArray(bundleRoles) || !bundleRoles.length) return [];
  var keep = Object.create(null);
  for (var k = 0; k < bundleRoles.length; k++) {
    if (typeof bundleRoles[k] === "string" && bundleRoles[k]) keep[bundleRoles[k]] = true;
  }
  keep["main"] = true;
  var out = [];
  var list = Array.isArray(agents) ? agents : [];
  for (var i = 0; i < list.length; i++) {
    var a = list[i];
    if (!a) continue;
    var s = parseAgentSettings(a);
    if (!s || s.mrrManaged !== true || s.mrrRulesetId !== rulesetId) continue;
    var role = typeof s.mrrAgentRole === "string" && s.mrrAgentRole ? s.mrrAgentRole : "main";
    if (keep[role]) continue;
    out.push({
      role,
      type: a.type,
      id: a.id
    });
  }
  return out;
}

function mrrPruneRetiredActiveIds(activeAgentIds, retired) {
  var active = Array.isArray(activeAgentIds) ? activeAgentIds : [];
  if (!Array.isArray(retired) || !retired.length) return active.slice();
  var drop = Object.create(null);
  for (var i = 0; i < retired.length; i++) {
    var r = retired[i];
    if (r && typeof r.type === "string" && r.type) drop[r.type] = true;
    if (r && typeof r.id === "string" && r.id) drop[r.id] = true;
  }
  return active.filter(function(id) {
    return !drop[id];
  });
}

function mrrManagedAgentSignatureFor(agents, rulesetId) {
  var parts = [];
  var list = Array.isArray(agents) ? agents : [];
  for (var i = 0; i < list.length; i++) {
    var a = list[i];
    if (!a) continue;
    var s = parseAgentSettings(a);
    if (!s || s.mrrManaged !== true || s.mrrRulesetId !== rulesetId) continue;
    parts.push(String(a.id) + ":" + String(a.type));
  }
  parts.sort();
  return parts.join(",");
}

function mrrInvalidateMutatorCache(why) {
  if (mrrMutatorConfigIdRulesetId === undefined && mrrMutatorConfigId === null) return;
  mrrMutatorConfigId = null;
  mrrMutatorConfigIdRulesetId = undefined;
  mrrMutatorFilterWarned = false;
  log("reconcile: cleared the state-mutator config-id cache — " + why);
}

function mrrDeriveRulesetFromChatAgents(meta, agents) {
  var active = Array.isArray(meta && meta.activeAgentIds) ? meta.activeAgentIds : [];
  if (!active.length) return null;
  var owner = Object.create(null);
  var list = Array.isArray(agents) ? agents : [];
  for (var i = 0; i < list.length; i++) {
    var a = list[i];
    if (!a) continue;
    var s = parseAgentSettings(a);
    if (!s || s.mrrManaged !== true || typeof s.mrrRulesetId !== "string" || !s.mrrRulesetId) continue;
    if (typeof a.type === "string" && a.type) owner[a.type] = s.mrrRulesetId;
    if (typeof a.id === "string" && a.id) owner[a.id] = s.mrrRulesetId;
  }
  var found = null;
  for (var j = 0; j < active.length; j++) {
    var rid = owner[active[j]];
    if (!rid) continue;
    if (found && found !== rid) return null;
    found = rid;
  }
  return found;
}

function mrrDeriveAndRestampChat(chatId, meta, opts) {
  opts = opts || {};
  if (!opts.force && mrrStampDeriveTriedChatId === chatId) return Promise.resolve(null);
  mrrStampDeriveTriedChatId = chatId;
  if (!Array.isArray(meta && meta.activeAgentIds) || !meta.activeAgentIds.length) return Promise.resolve(null);
  var agentsP = opts.agents ? Promise.resolve(opts.agents) : apiFetch("/agents");
  return agentsP.then(function(agents) {
    var derived = mrrDeriveRulesetFromChatAgents(meta, agents);
    if (!derived) return null;
    return apiFetch("/chats/" + encodeURIComponent(chatId) + "/metadata", {
      method: "PATCH",
      body: JSON.stringify({
        mrrChatRulesetId: derived
      })
    }).then(function() {
      log("re-derived chat ruleset stamp '" + derived + "' from managed agents (preset apply likely wiped it) — chat " + chatId);
      mrrNoteChatStamp(chatId, derived, "stamp re-derivation");
      return derived;
    });
  }).catch(function(e) {
    warn("stamp re-derivation failed for chat " + chatId + " (" + (e && e.message ? e.message : e) + ") — treating the chat as unstamped");
    return null;
  });
}

function mrrReconcilePresetMarkers(chat, chatId, rulesetId, agents, out, progress, retired) {
  var presetId = chat && chat.promptPresetId;
  if (!presetId) {
    if (mrrReconcileNoPresetLoggedChatId !== chatId) {
      mrrReconcileNoPresetLoggedChatId = chatId;
      log("reconcile: chat " + chatId + " has no prompt preset — no agent marker sections to reconcile");
    }
    return Promise.resolve();
  }
  var roleTypes = mrrManagedRoleTypes(agents, rulesetId);
  var roleCount = 0;
  for (var k in roleTypes) {
    if (Object.prototype.hasOwnProperty.call(roleTypes, k)) roleCount++;
  }
  if (!roleCount) return Promise.resolve();
  var live = mrrLiveAgentTypes(agents);
  return apiFetch("/prompts/" + encodeURIComponent(presetId) + "/full").then(function(full) {
    var sections = full && Array.isArray(full.sections) ? full.sections : [];
    var presetName = full && full.preset && full.preset.name || presetId;
    var claimed = mrrExistingAgentSectionTypes(sections);
    var retiredTypes = Object.create(null);
    var retiredList = Array.isArray(retired) ? retired : [];
    for (var q = 0; q < retiredList.length; q++) {
      if (retiredList[q] && typeof retiredList[q].type === "string") {
        retiredTypes[retiredList[q].type] = retiredList[q].role;
      }
    }
    var staleMarkers = [];
    var work = [];
    for (var i = 0; i < sections.length; i++) {
      var sec = sections[i];
      if (!sec || !sec.id || !sec.markerConfig) continue;
      var mc = sec.markerConfig;
      if (typeof mc === "string") mc = safeParse(mc);
      if (!mc || typeof mc !== "object" || mc.type !== "agent_data") continue;
      var t = mc.agentType;
      if (typeof t !== "string" || !t) continue;
      if (retiredTypes[t]) {
        staleMarkers.push({
          type: t,
          role: retiredTypes[t],
          name: sec.name || sec.id
        });
        continue;
      }
      if (live[t]) continue;
      var role = mrrRoleForOrphanType(t, roleTypes);
      if (!role) continue;
      var target = roleTypes[role];
      if (!target || target === t) continue;
      if (claimed[target]) {
        log("reconcile: orphaned marker '" + t + "' maps to role '" + role + "', whose live type '" + target + "' already has a section — leaving the orphan alone (delete it by hand if it is stale)");
        continue;
      }
      claimed[target] = true;
      work.push({
        id: sec.id,
        from: t,
        to: target,
        role
      });
    }
    if (staleMarkers.length) {
      out.staleMarkers = staleMarkers.length;
      log("reconcile: " + staleMarkers.length + " preset marker section(s) point at RETIRED role(s) (" + staleMarkers.map(function(s) {
        return s.role + ' -> "' + s.name + '"';
      }).join(", ") + "). They are inert now that those agents no longer run, so they inject nothing — but they are " + "still listed in the preset. To tidy them: delete the retired agent rows (Manage MRR Agents), then " + 'use "Remove stale agent sections" in the same dialog — it lists exactly what it will delete and ' + "asks before touching anything. Deleting them by hand in the Preset Editor works too.");
    }
    if (!work.length) return;
    progress("Repointing " + work.length + " agent marker section(s)...");
    return work.reduce(function(c, w) {
      return c.then(function() {
        return apiFetch("/prompts/" + encodeURIComponent(presetId) + "/sections/" + encodeURIComponent(w.id), {
          method: "PATCH",
          body: JSON.stringify({
            content: "{{agent::" + w.to + "}}",
            markerConfig: {
              type: "agent_data",
              agentType: w.to
            }
          })
        }).then(function() {
          out.rewritten++;
          log("reconcile: repointed the '" + w.role + "' agent marker from dead type '" + w.from + "' to '" + w.to + "'");
        });
      });
    }, Promise.resolve()).then(function() {
      if (out.rewritten > 0) {
        log("reconciled " + out.rewritten + ' orphaned agent marker(s) after reinstall — preset "' + presetName + '" now points at the live agent types');
      }
    });
  }).catch(function(e) {
    if (e && e.status === 409) {
      if (mrrReconcileStockPresetWarnedId !== presetId) {
        mrrReconcileStockPresetWarnedId = presetId;
        warn('reconcile: preset is read-only (the stock "Marinara Universal" preset refuses every mutation) — ' + "its orphaned agent markers cannot be repaired. Save a copy, select it for this chat, and re-run the install.");
      }
      return;
    }
    warn("reconcile: preset marker pass failed: " + (e && e.message ? e.message : e));
  });
}

function mrrReconcileAgentBindings(opts) {
  opts = opts || {};
  var rulesetId = opts.rulesetId || state.ruleset && state.ruleset.id;
  var chatId = opts.chatId || state.chatId;
  var reason = opts.reason || "unspecified";
  function progress(m) {
    if (opts.progressCb) opts.progressCb(m);
  }
  var out = {
    rewritten: 0,
    restamped: null
  };
  if (!rulesetId || !chatId) return Promise.resolve(out);
  var key = chatId + "|" + rulesetId;
  if (!opts.force && mrrReconcileDoneKey === key) return Promise.resolve(out);
  if (mrrReconcilePromise) return mrrReconcilePromise;
  mrrReconcileDoneKey = key;
  mrrReconcilePromise = Promise.all([ apiFetch("/chats/" + encodeURIComponent(chatId)), apiFetch("/agents") ]).then(function(r) {
    var chat = r[0];
    var agents = r[1];
    if (state.chatId !== chatId && !opts.force) return out;
    var meta = mrrChatMeta(chat);
    mrrAppliedChatPresetSeen[chatId] = typeof meta.appliedChatPresetId === "string" ? meta.appliedChatPresetId : null;
    if (typeof mrrNoteChatRow === "function") mrrNoteChatRow(chatId, chat, "binding reconciliation chat read");
    return mrrReadoptStrippedRows(agents, rulesetId, progress).then(function(adopted) {
      out.readopted = adopted.map(function(a) {
        return a.role;
      });
      var sig = mrrManagedAgentSignatureFor(agents, rulesetId);
      var prevSig = mrrManagedAgentSig[rulesetId];
      if (opts.force || adopted.length || prevSig !== undefined && prevSig !== sig) {
        mrrInvalidateMutatorCache(adopted.length ? "re-adopted " + adopted.length + " row(s) whose tags an engine UI edit had stripped, for ruleset '" + rulesetId + "' (" + reason + ")" : "managed agent rows changed for ruleset '" + rulesetId + "' (" + reason + ")");
      }
      mrrManagedAgentSig[rulesetId] = sig;
      var retired = mrrRetiredManagedAgents(agents, rulesetId, opts.bundleRoles);
      out.retired = retired.map(function(r) {
        return r.role;
      });
      var retireChain = Promise.resolve();
      if (retired.length) {
        var pruned = mrrPruneRetiredActiveIds(meta.activeAgentIds, retired);
        var removedN = (Array.isArray(meta.activeAgentIds) ? meta.activeAgentIds.length : 0) - pruned.length;
        var retiredNames = retired.map(function(r) {
          return r.role;
        }).join(", ");
        if (removedN > 0) {
          progress("Retiring " + retired.length + " dropped agent role(s)...");
          retireChain = apiFetch("/chats/" + encodeURIComponent(chatId) + "/metadata", {
            method: "PATCH",
            body: JSON.stringify({
              activeAgentIds: pruned
            })
          }).then(function() {
            out.retiredIdsRemoved = removedN;
            log("reconcile: retired " + retired.length + " role(s) no longer in the " + rulesetId + " bundle (" + retiredNames + ") — removed " + removedN + " entr(ies) from this chat's " + "activeAgentIds so they stop running. Their agent rows are left in Settings -> Agents; " + "delete them there if you want them gone entirely.");
          }).catch(function(e) {
            warn("reconcile: could not prune retired roles from chat " + chatId + " (" + (e && e.message ? e.message : e) + ") — they may keep running until the next pass");
          });
        } else {
          log("reconcile: " + retired.length + " retired role row(s) present for " + rulesetId + " (" + retiredNames + ") but none active in this chat — nothing to prune");
        }
      }
      var stampChain = opts.rederiveStamp && !meta.mrrChatRulesetId ? mrrDeriveAndRestampChat(chatId, meta, {
        force: true,
        agents
      }).then(function(d) {
        out.restamped = d;
      }) : Promise.resolve();
      return retireChain.then(function() {
        return stampChain;
      }).then(function() {
        return mrrReconcilePresetMarkers(chat, chatId, rulesetId, agents, out, progress, retired);
      }).then(function() {
        return out;
      });
    });
  }).catch(function(e) {
    mrrReconcileDoneKey = null;
    warn("mrrReconcileAgentBindings failed (" + reason + "): " + (e && e.message ? e.message : e));
    return out;
  }).then(function(res) {
    mrrReconcilePromise = null;
    return res;
  });
  return mrrReconcilePromise;
}

function mrrWatchAppliedChatPreset(chatId) {
  if (!chatId) return;
  if (!state.ruleset || !state.ruleset.id) return;
  if (state.installing) return;
  if (mrrRulesetConfirmedChatId !== chatId) return;
  if (mrrPresetWatchInFlight) return;
  var now = Date.now();
  if (now - mrrPresetWatchTs < MRR_PRESET_WATCH_MS) return;
  mrrPresetWatchTs = now;
  mrrPresetWatchInFlight = true;
  apiFetch("/chats/" + encodeURIComponent(chatId)).then(function(chat) {
    mrrPresetWatchInFlight = false;
    if (state.chatId !== chatId) return;
    var meta = mrrChatMeta(chat);
    var applied = typeof meta.appliedChatPresetId === "string" ? meta.appliedChatPresetId : null;
    if (typeof mrrNoteChatRow === "function") mrrNoteChatRow(chatId, chat, "applied-chat-preset watch");
    var had = Object.prototype.hasOwnProperty.call(mrrAppliedChatPresetSeen, chatId);
    var prev = had ? mrrAppliedChatPresetSeen[chatId] : undefined;
    mrrAppliedChatPresetSeen[chatId] = applied;
    if (!had || prev === applied) return;
    log("chat " + chatId + " had a chat-preset applied (appliedChatPresetId " + (prev || "(none)") + " -> " + (applied || "(none)") + ") — an apply replaces chat metadata wholesale, so re-running the binding reconciliation");
    mrrStampDeriveTriedChatId = null;
    mrrReconcileAgentBindings({
      chatId,
      reason: "chat-preset applied",
      force: true,
      rederiveStamp: true
    }).then(function() {
      if (typeof reconcileActiveAgents === "function") reconcileActiveAgents();
    });
  }).catch(function(e) {
    mrrPresetWatchInFlight = false;
    if (!mrrPresetWatchWarned) {
      mrrPresetWatchWarned = true;
      warn("mrrWatchAppliedChatPreset: could not read chat " + chatId + " (" + (e && e.message ? e.message : e) + ") — a chat-preset apply may go unnoticed until the next chat switch");
    }
  });
}

function mrrCheckChatRulesetStamp(chatId) {
  if (!chatId) return;
  if (!state.ruleset || !state.ruleset.id) return;
  if (mrrRulesetConfirmedChatId === chatId) return;
  if (mrrStampHeldChatId === chatId) return;
  if (mrrChatUnboundVirginId === chatId) return;
  if (mrrStampCheckInFlightChatId === chatId) return;
  var activeId = state.ruleset.id;
  mrrStampCheckInFlightChatId = chatId;
  apiFetch("/chats/" + chatId).then(function(chat) {
    if (state.chatId !== chatId) {
      mrrStampCheckInFlightChatId = null;
      return;
    }
    var meta = chat && typeof chat.metadata === "string" ? safeParse(chat.metadata) || {} : chat && chat.metadata || {};
    var stamp = meta.mrrChatRulesetId;
    mrrAppliedChatPresetSeen[chatId] = typeof meta.appliedChatPresetId === "string" ? meta.appliedChatPresetId : null;
    if (typeof mrrNoteChatRow === "function") mrrNoteChatRow(chatId, chat, "chat metadata read");
    if (typeof stamp === "string" && stamp) mrrNoteChatStamp(chatId, stamp, "chat metadata read"); else mrrChatStampSeen[chatId] = null;
    if (stamp) {
      mrrStampCheckInFlightChatId = null;
      decide(stamp);
      return;
    }
    mrrDeriveAndRestampChat(chatId, meta).then(function(derived) {
      mrrStampCheckInFlightChatId = null;
      if (state.chatId !== chatId) return;
      if (derived) {
        decide(derived);
        return;
      }
      if (mrrConsumeDeliberateSwitchIntent(activeId)) {
        log("auto-switch: chat " + chatId + " carries no ruleset stamp, but the user just deliberately activated " + activeId + " — honoring the deliberate activation and binding the chat to it");
        mrrConfirmChatRuleset(chatId, "deliberate activation of " + activeId + " in a previously-unbound chat");
        return;
      }
      mrrChatUnboundVirginId = chatId;
      log("virgin chat " + chatId + ": no ruleset stamp and nothing to derive — staying unbound until a ruleset is " + "deliberately activated (Corey ruling 2026-08-24). No stamp written, no agents added, sheet writes held.");
    });
    return;
  }).catch(function(e) {
    mrrStampCheckInFlightChatId = null;
    if (mrrStampFetchWarnedChatId !== chatId) {
      mrrStampFetchWarnedChatId = chatId;
      warn("mrrCheckChatRulesetStamp: could not read chat " + chatId + "'s metadata (" + (e && e.message ? e.message : e) + ") — sheet writes stay latched shut and the check retries on the next route-poll tick");
    }
  });
  function decide(stamp) {
    if (stamp === activeId) {
      mrrConfirmChatRuleset(chatId, "chat stamp '" + stamp + "' matches the active ruleset");
      return;
    }
    if (mrrConsumeDeliberateSwitchIntent(activeId)) {
      log("auto-switch: chat " + chatId + " is stamped " + stamp + " but the user just deliberately activated " + activeId + " — honoring the deliberate switch and rebinding the chat rather than switching back");
      mrrConfirmChatRuleset(chatId, "deliberate switch to " + activeId + "; chat is being rebound from " + stamp);
      return;
    }
    var guard = mrrReadAutoswitchGuard();
    if (guard && guard.chatId === chatId && guard.stamp === stamp) {
      mrrStampHeldChatId = chatId;
      warn("auto-switch RELOAD-LOOP GUARD: chat " + chatId + " is stamped '" + stamp + "' and we already reloaded to activate it, " + "but the active ruleset is STILL '" + activeId + "' — activation is not sticking. NOT reloading again. " + "Sheet writes stay latched shut for this chat to prevent cross-ruleset bleed; activate '" + stamp + "' by hand (Ruleset > Library) and report this.");
      return;
    }
    if (activateFromLibrary(stamp)) {
      mrrWriteAutoswitchGuard(chatId, stamp);
      log("auto-switch: chat " + chatId + " is stamped " + stamp + ", active is " + activeId + " — activating and reloading");
      marinara.setTimeout(function() {
        window.location.reload();
      }, RELOAD_DELAY_MS);
      return;
    }
    mrrStampHeldChatId = chatId;
    if (mrrStampWarnedChatId !== chatId) {
      mrrStampWarnedChatId = chatId;
      warn("chat " + chatId + " is stamped '" + stamp + "' but that ruleset is not in the library — sheet is held to prevent bleed; activate '" + stamp + "' manually (Ruleset > Library, or import its bundle) to use this chat.");
    }
  }
}

var autoSyncTimer = null;

function scheduleAutoSync() {
  if (autoSyncTimer) clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(function() {
    autoSyncTimer = null;
    if (state.installing) {
      warn("auto-sync skipped: install/uninstall in progress");
      return;
    }
    try {
      syncSheetToAgents();
    } catch (e) {
      warn("auto-sync agents threw: " + e);
    }
    try {
      syncFieldReferenceToLorebook();
    } catch (e) {
      warn("auto-sync lorebook threw: " + e);
    }
  }, 1500);
}

var STATE_TAG_RE = /\[mrr-state:\s+([^\]]+)\]/g;

var STATE_KV_RE = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

var MRR_STATE_TAG_VERSION = 1;

var MRR_PLACEHOLDER_MESSAGE_IDS = {
  __streaming__: true,
  __conversation_live_stream__: true
};

function mrrIsPlaceholderMessageId(msgId) {
  return !!msgId && MRR_PLACEHOLDER_MESSAGE_IDS[msgId] === true;
}

var processedMessageIds = {};

var processedMessageIdsChatId = null;

var mrrProcessedTextMemo = Object.create(null);

var mrrSkippedDiagnosticWarned = Object.create(null);

var mrrSkipObservationCount = 0;

var mrrNonSkipObservationCount = 0;

var mrrOrphanDiagLogged = false;

var MRR_ORPHAN_DIAG_MIN_SKIPS = 3;

var appliedMutationKeys = Object.create(null);

var mrrBucketChannelClaims = Object.create(null);

var MRR_CLAIM_SEP = "\0";

function mrrClaimKey(bucketKey, characterId) {
  return String(bucketKey) + MRR_CLAIM_SEP + String(characterId);
}

function mrrReleaseBucketClaims(bucketKey) {
  var prefix = String(bucketKey) + MRR_CLAIM_SEP;
  var released = 0;
  for (var k in mrrBucketChannelClaims) {
    if (Object.prototype.hasOwnProperty.call(mrrBucketChannelClaims, k) && k.indexOf(prefix) === 0) {
      delete mrrBucketChannelClaims[k];
      released++;
    }
  }
  return released;
}

var MRR_TAG_OUTCOME = {
  APPLIED: "APPLIED",
  DEDUPED: "DEDUPED",
  CLAIM_SUPPRESSED: "CLAIM_SUPPRESSED",
  DROPPED_UNKNOWN: "DROPPED_UNKNOWN",
  DROPPED_AMBIGUOUS: "DROPPED_AMBIGUOUS",
  DROPPED_RECORDLESS: "DROPPED_RECORDLESS",
  DROPPED_MALFORMED: "DROPPED_MALFORMED"
};

var mrrLastApplyOutcomes = null;

var mrrAbsentTargetCount = 0;

var mrrAbsentTargetLogged = false;

var mrrTargetWarnSeen = Object.create(null);

function mrrNormalizeTargetString(raw) {
  if (raw == null) return "";
  var s = String(raw).trim();
  s = s.replace(/^[\"'`‘’“”]+/, "").replace(/[\"'`‘’“”]+$/, "").trim();
  s = s.replace(/[.,;:!]+$/, "");
  s = s.replace(/\s+/g, " ").trim();
  if (typeof s.normalize === "function") {
    try {
      s = s.normalize("NFKC");
    } catch (e) {}
  }
  return s.toLowerCase();
}

var MRR_TARGET_SELF_WORDS = {
  "": true,
  player: true,
  active: true,
  self: true
};

function mrrResolveTagTarget(attrs, quiet) {
  var raw = attrs && attrs.target != null ? attrs.target : null;
  var norm = mrrNormalizeTargetString(raw);
  var roster = mrrPartyRosterOrder();
  var activeId = state.activeCharacterId || null;
  if (Object.prototype.hasOwnProperty.call(MRR_TARGET_SELF_WORDS, norm)) {
    if (raw == null && !quiet) {
      mrrAbsentTargetCount++;
      if (!mrrAbsentTargetLogged) {
        mrrAbsentTargetLogged = true;
        log("party writes: a state tag arrived with no target= — routed to the ACTIVE character, exactly as every pre-party-writes build did. " + 'Every shipped ruleset\'s examples emit target="player", so this is prompt-compliance telemetry, not an error. ' + "This session's running count rides each apply tally as absentTarget=N.");
      }
    }
    if (!activeId) {
      return {
        ok: false,
        outcome: MRR_TAG_OUTCOME.DROPPED_UNKNOWN,
        raw,
        normalized: norm,
        candidates: []
      };
    }
    return {
      ok: true,
      charId: activeId,
      active: true,
      absent: raw == null
    };
  }
  var i;
  for (i = 0; i < roster.length; i++) {
    if (mrrNormalizeTargetString(roster[i].id) === norm) {
      return {
        ok: true,
        charId: roster[i].id,
        active: roster[i].id === activeId,
        absent: false
      };
    }
  }
  var hits = [];
  for (i = 0; i < roster.length; i++) {
    if (mrrNormalizeTargetString(roster[i].name) === norm) hits.push(roster[i]);
  }
  if (hits.length === 1) {
    return {
      ok: true,
      charId: hits[0].id,
      active: hits[0].id === activeId,
      absent: false
    };
  }
  var valid = [];
  for (i = 0; i < roster.length; i++) valid.push(roster[i].name);
  var outcome = hits.length > 1 ? MRR_TAG_OUTCOME.DROPPED_AMBIGUOUS : MRR_TAG_OUTCOME.DROPPED_UNKNOWN;
  if (!quiet && !mrrTargetWarnSeen[norm]) {
    mrrTargetWarnSeen[norm] = true;
    if (hits.length > 1) {
      warn("party writes: target '" + String(raw) + "' matches " + hits.length + " roster members whose names normalize identically — " + "the mutation is DROPPED, never guessed. Rename one of them, or address the write by character id. " + "Valid targets: " + valid.join(", ") + ' (or "player" for the active character).');
    } else {
      warn("party writes: target '" + String(raw) + "' matches no character in this chat's roster — the mutation is DROPPED, never " + "routed to the active character (a guess writes a real number onto the wrong sheet, silently). " + "Valid targets: " + valid.join(", ") + ' (or "player" for the active character).');
    }
  }
  return {
    ok: false,
    outcome,
    raw,
    normalized: norm,
    candidates: hits.map(function(h) {
      return h.id;
    })
  };
}

function mutationContentSig(attrs) {
  if (!attrs || typeof attrs !== "object") return "";
  var keys = Object.keys(attrs).sort();
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    parts.push(keys[i] + "=" + String(attrs[keys[i]]).trim());
  }
  return parts.join("|");
}

function normalizeStateAttrs(attrs) {
  if (!attrs || typeof attrs !== "object") return [ attrs ];
  if (!state.ruleset || !Array.isArray(state.ruleset.derivedStats)) return [ attrs ];
  if (typeof attrs.field !== "string") return [ attrs ];
  var target = normalizeFieldKey(attrs.field);
  if (!target) return [ attrs ];
  var trackDef = null;
  for (var i = 0; i < state.ruleset.derivedStats.length; i++) {
    var d = state.ruleset.derivedStats[i];
    if (d.renderAs === "track" && Array.isArray(d.damageTypes) && normalizeFieldKey(d.name) === target) {
      trackDef = d;
      break;
    }
  }
  if (!trackDef) return [ attrs ];
  var types = damageTypesFor(trackDef) || [];
  var carry = {};
  if (attrs.target != null) carry.target = attrs.target;
  if (attrs.reason != null) carry.reason = attrs.reason;
  var out = [];
  var attrKeys = Object.keys(attrs);
  for (var t = 0; t < types.length; t++) {
    var dt = types[t];
    for (var k = 0; k < attrKeys.length; k++) {
      var key = attrKeys[k];
      if (key === "field" || key === "target" || key === "reason" || key === "damage" || key === "type") continue;
      var nk = normalizeFieldKey(key);
      if (nk !== normalizeFieldKey(dt.id) && nk !== normalizeFieldKey(dt.label)) continue;
      var n = parseInt(attrs[key], 10);
      if (isNaN(n)) continue;
      out.push(Object.assign({
        field: dt.id,
        delta: n >= 0 ? "+" + n : String(n)
      }, carry));
    }
  }
  if (attrs.damage != null && attrs.type != null) {
    var typeNorm = normalizeFieldKey(String(attrs.type));
    for (var t2 = 0; t2 < types.length; t2++) {
      var dt2 = types[t2];
      if (typeNorm === normalizeFieldKey(dt2.id) || typeNorm === normalizeFieldKey(dt2.label)) {
        var n2 = parseInt(attrs.damage, 10);
        if (!isNaN(n2)) out.push(Object.assign({
          field: dt2.id,
          delta: n2 >= 0 ? "+" + n2 : String(n2)
        }, carry));
        break;
      }
    }
  }
  return out.length ? out : [ attrs ];
}

function mrrWarnCrossChannelMismatch(bucketKey, anchorId, claimedBy, chan, characterId, sigs) {
  try {
    var occ = Object.create(null);
    var missing = [];
    for (var i = 0; i < sigs.length; i++) {
      var sig = sigs[i];
      var idx = (occ[sig] = (occ[sig] || 0) + 1) - 1;
      if (appliedMutationKeys[String(anchorId) + "::" + sig + "::" + idx]) continue;
      missing.push(sig.length > 120 ? sig.slice(0, 120) + "…" : sig);
    }
    if (!missing.length) return;
    warn("cross-channel: bucket " + bucketKey + " target " + mrrCharacterLabel(characterId) + " (" + characterId + ") — " + missing.length + " suppressed " + chan + " mutation(s) have no matching apply from the claiming '" + claimedBy + "' channel: " + missing.join(" ; ") + " — either a differently-worded echo (expected, harmless) or a genuinely distinct write that is now LOST for this turn (accepted round-23 trade-off; report this line so it can be re-opened with real data)");
  } catch (e) {
    warn("cross-channel: mismatch telemetry threw for bucket '" + bucketKey + "' (" + (e && e.message ? e.message : e) + ") — suppression itself is unaffected");
  }
}

function mrrShowTargetDropToast(res) {
  try {
    var what = res.outcome === MRR_TAG_OUTCOME.DROPPED_AMBIGUOUS ? "ambiguous target" : res.outcome === MRR_TAG_OUTCOME.DROPPED_RECORDLESS ? "no sheet for this system" : "unknown target";
    showMutationToast({
      __mrrToastLabel: {
        prefix: "DROPPED",
        change: what,
        reason: res.raw == null ? "(no target named)" : "'" + String(res.raw) + "'"
      }
    });
  } catch (e) {}
}

function mrrEnsureTargetSheet(res, sheetCache) {
  if (Object.prototype.hasOwnProperty.call(sheetCache, res.charId)) return sheetCache[res.charId] !== null;
  var sheet = mrrLoadSheetRecordFor(res.charId);
  sheetCache[res.charId] = sheet;
  if (!sheet) {
    warn("party writes: " + mrrCharacterLabel(res.charId) + " (" + res.charId + ") has no sheet for this system — " + "the mutation is DROPPED. A sheet is never auto-created for a narrated change (consent doctrine); " + "state it as a PARTY: prose line, or create the character's sheet for this ruleset first.");
  }
  return sheet !== null;
}

function mrrApplyResolvedMutation(attrs, res, sheetCache) {
  if (res.active) {
    return applyStateMutation(attrs) ? MRR_TAG_OUTCOME.APPLIED : MRR_TAG_OUTCOME.DROPPED_MALFORMED;
  }
  var ok = mrrWithSheetBoundApply(sheetCache[res.charId], res.charId, function() {
    return applyStateMutation(attrs);
  });
  return ok ? MRR_TAG_OUTCOME.APPLIED : MRR_TAG_OUTCOME.DROPPED_MALFORMED;
}

function applyStateTagsWithDedup(tags, anchorId, journalKey, channel) {
  if (!tags || !tags.length) return 0;
  var bucketKey = journalKey || anchorId;
  var chan = channel || "dom";
  var occ = Object.create(null);
  var applied = 0;
  var tally = mrrNewOutcomeTally();
  mrrLastApplyOutcomes = tally;
  var touched = Object.create(null);
  var suppressed = Object.create(null);
  var sheetCache = Object.create(null);
  var prevJournalBucketKey = mrrCurrentJournalBucketKey;
  mrrCurrentJournalBucketKey = journalKey || anchorId;
  var partyMode = mrrPartyRosterOrder().length > 1;
  var prevRenderSuppressed = mrrRenderSuppressed;
  if (partyMode) mrrRenderSuppressed = true;
  try {
    for (var i = 0; i < tags.length; i++) {
      var rawAttrs = tags[i] && tags[i].attrs;
      if (!rawAttrs || typeof rawAttrs !== "object") {
        tally[MRR_TAG_OUTCOME.DROPPED_MALFORMED]++;
        continue;
      }
      var res = mrrResolveTagTarget(rawAttrs);
      if (!res.ok) {
        tally[res.outcome]++;
        mrrShowTargetDropToast(res);
        continue;
      }
      if (res.absent) tally.absentTarget++;
      if (!res.active && !mrrEnsureTargetSheet(res, sheetCache)) {
        tally[MRR_TAG_OUTCOME.DROPPED_RECORDLESS]++;
        mrrShowTargetDropToast({
          outcome: MRR_TAG_OUTCOME.DROPPED_RECORDLESS,
          raw: res.charId
        });
        continue;
      }
      var normalized = normalizeStateAttrs(rawAttrs);
      for (var n = 0; n < normalized.length; n++) {
        var cand = Object.assign({}, normalized[n]);
        cand.target = res.charId;
        var sig = mutationContentSig(cand);
        var idx = (occ[sig] = (occ[sig] || 0) + 1) - 1;
        var key = String(anchorId) + "::" + sig + "::" + idx;
        if (appliedMutationKeys[key]) {
          tally[MRR_TAG_OUTCOME.DEDUPED]++;
          continue;
        }
        var claimKey = mrrClaimKey(bucketKey, res.charId);
        var claimedBy = mrrBucketChannelClaims[claimKey];
        if (claimedBy && claimedBy !== chan) {
          tally[MRR_TAG_OUTCOME.CLAIM_SUPPRESSED]++;
          if (!suppressed[res.charId]) suppressed[res.charId] = {
            claimedBy,
            sigs: []
          };
          suppressed[res.charId].sigs.push(sig);
          continue;
        }
        touched[res.charId] = true;
        appliedMutationKeys[key] = true;
        var prevApplySig = mrrCurrentApplySig;
        mrrCurrentApplySig = sig;
        try {
          var outcome = mrrApplyResolvedMutation(cand, res, sheetCache);
          tally[outcome]++;
          if (outcome === MRR_TAG_OUTCOME.APPLIED) {
            applied++;
            tally.targets[res.charId] = (tally.targets[res.charId] || 0) + 1;
            if (res.active) tally.activeTouched = true; else tally.boundApplies++;
          }
        } finally {
          mrrCurrentApplySig = prevApplySig;
        }
      }
    }
  } finally {
    mrrCurrentJournalBucketKey = prevJournalBucketKey;
    mrrRenderSuppressed = prevRenderSuppressed;
    for (var cid in touched) {
      if (Object.prototype.hasOwnProperty.call(touched, cid)) mrrBucketChannelClaims[mrrClaimKey(bucketKey, cid)] = chan;
    }
  }
  for (var scid in suppressed) {
    if (!Object.prototype.hasOwnProperty.call(suppressed, scid)) continue;
    log("cross-channel: bucket " + bucketKey + " target " + scid + " already applied by " + suppressed[scid].claimedBy + " — suppressing " + suppressed[scid].sigs.length + " mutation(s) from " + chan);
    mrrWarnCrossChannelMismatch(bucketKey, anchorId, suppressed[scid].claimedBy, chan, scid, suppressed[scid].sigs);
  }
  if (partyMode && tally.activeTouched) renderSheet();
  mrrLogOutcomeTally(bucketKey, chan, tally);
  return applied;
}

function mrrNewOutcomeTally() {
  return {
    APPLIED: 0,
    DEDUPED: 0,
    CLAIM_SUPPRESSED: 0,
    DROPPED_UNKNOWN: 0,
    DROPPED_AMBIGUOUS: 0,
    DROPPED_RECORDLESS: 0,
    DROPPED_MALFORMED: 0,
    targets: Object.create(null),
    absentTarget: 0,
    boundApplies: 0,
    activeTouched: false
  };
}

function mrrLogOutcomeTally(bucketKey, chan, tally) {
  var noisy = tally.CLAIM_SUPPRESSED || tally.DROPPED_UNKNOWN || tally.DROPPED_AMBIGUOUS || tally.DROPPED_RECORDLESS || tally.DROPPED_MALFORMED;
  if (!noisy && mrrPartyRosterOrder().length < 2) return;
  var parts = [];
  var order = [ "APPLIED", "DEDUPED", "CLAIM_SUPPRESSED", "DROPPED_UNKNOWN", "DROPPED_AMBIGUOUS", "DROPPED_RECORDLESS", "DROPPED_MALFORMED" ];
  for (var i = 0; i < order.length; i++) if (tally[order[i]]) parts.push(order[i] + "=" + tally[order[i]]);
  var who = [];
  for (var cid in tally.targets) {
    if (Object.prototype.hasOwnProperty.call(tally.targets, cid)) who.push(mrrCharacterLabel(cid) + ":" + tally.targets[cid]);
  }
  log("state-tags: bucket " + bucketKey + " via " + chan + " — " + (parts.length ? parts.join(" ") : "no outcomes") + (who.length ? " | targets " + who.join(", ") : "") + " | absentTarget=" + mrrAbsentTargetCount + " (session)");
}

function loadProcessedMessageIds(chatId) {
  if (!chatId) {
    processedMessageIds = {};
    processedMessageIdsChatId = null;
    appliedMutationKeys = Object.create(null);
    mrrBucketChannelClaims = Object.create(null);
    mrrProcessedTextMemo = Object.create(null);
    mrrLoadMutationJournal(null);
    return;
  }
  if (processedMessageIdsChatId === chatId) return;
  appliedMutationKeys = Object.create(null);
  mrrBucketChannelClaims = Object.create(null);
  mrrProcessedTextMemo = Object.create(null);
  mrrLoadMutationJournal(chatId);
  var raw = lsGet(LS_PROCESSED_MSGS_PFX + chatId);
  var parsed = raw ? safeParse(raw) : null;
  processedMessageIds = parsed && typeof parsed === "object" ? parsed : {};
  processedMessageIdsChatId = chatId;
}

function saveProcessedMessageIds() {
  if (!processedMessageIdsChatId) return;
  lsSet(LS_PROCESSED_MSGS_PFX + processedMessageIdsChatId, JSON.stringify(processedMessageIds));
}

var mrrMutationJournal = {
  buckets: {},
  lastSeenIdx: {}
};

var mrrMutationJournalChatId = null;

var mrrCurrentJournalBucketKey = null;

var mrrJournalSuppressed = false;

var mrrCurrentApplySig = null;

function mrrLoadMutationJournal(chatId) {
  var outgoingChatId = mrrMutationJournalChatId;
  var outgoingBucketCount = mrrMutationJournal && mrrMutationJournal.buckets ? Object.keys(mrrMutationJournal.buckets).length : 0;
  if (!chatId) {
    if (outgoingBucketCount > 0) {
      warn("mrrLoadMutationJournal: WIPE — resetting to no chat (null), but the outgoing in-memory journal for chatId=" + outgoingChatId + " had " + outgoingBucketCount + " bucket(s). If those were never saved (check for a prior 'journal: saved' line for this chatId), they are gone.");
    }
    mrrMutationJournal = {
      buckets: {},
      lastSeenIdx: {}
    };
    mrrMutationJournalChatId = null;
    return;
  }
  if (mrrMutationJournalChatId === chatId) return;
  var raw = lsGet(LS_MUTATION_JOURNAL_PFX + chatId);
  var parsed = raw ? safeParse(raw) : null;
  var journal = parsed && typeof parsed === "object" && parsed.buckets && parsed.lastSeenIdx ? parsed : {
    buckets: {},
    lastSeenIdx: {}
  };
  if (Object.keys(journal.buckets).length === 0 && outgoingBucketCount > 0) {
    warn("mrrLoadMutationJournal: WIPE — loading chatId=" + chatId + " (0 buckets from disk) is about to REPLACE the outgoing in-memory journal for chatId=" + outgoingChatId + ", which had " + outgoingBucketCount + " bucket(s). If those belonged to " + outgoingChatId + " and were never saved under its own key, they are gone as of this call.");
  }
  var discarded = 0;
  Object.keys(journal.buckets).forEach(function(k) {
    var b = journal.buckets[k];
    var hasLegacyDelta = b && Array.isArray(b.entries) && b.entries.some(function(e) {
      return e && e.kind === "delta";
    });
    if (hasLegacyDelta) {
      delete journal.buckets[k];
      discarded++;
    }
  });
  if (discarded > 0) warn("mrrLoadMutationJournal: discarded " + discarded + " bucket(s) with pre-fix delta-kind entries (round-9 1b — no migration shim)");
  mrrMutationJournal = journal;
  mrrMutationJournalChatId = chatId;
}

function mrrSaveMutationJournal() {
  if (!mrrMutationJournalChatId) {
    warn("mrrSaveMutationJournal: called with no chatId loaded — journal write discarded (in-memory bucket may still exist but will not survive the next load)");
    return;
  }
  var lsKey = LS_MUTATION_JOURNAL_PFX + mrrMutationJournalChatId;
  var ok = lsSet(lsKey, JSON.stringify(mrrMutationJournal));
  if (!ok) {
    warn("mrrSaveMutationJournal: lsSet failed (quota or private mode?) — journal entry may not persist across reload");
    return;
  }
  log("journal: saved " + Object.keys(mrrMutationJournal.buckets).length + " bucket(s) → " + lsKey);
}

function mrrJournalMutation(field, payload) {
  if (mrrJournalSuppressed) return;
  var bucketKey = mrrCurrentJournalBucketKey;
  if (!bucketKey) {
    warn("mrrJournalMutation: fired with no active bucket key — mutation for field '" + field + "' was NOT journaled (swipe-revert will not see it)");
    return;
  }
  var bucket = mrrMutationJournal.buckets[bucketKey];
  if (!bucket) {
    bucket = {
      entries: [],
      reverted: false
    };
    mrrMutationJournal.buckets[bucketKey] = bucket;
  }
  var entry = {
    field,
    kind: "set",
    prev: payload.prev,
    next: payload.next,
    sig: mrrCurrentApplySig || null,
    charId: state.activeCharacterId || null,
    v: 2
  };
  bucket.entries.push(entry);
  mrrSaveMutationJournal();
}

function mrrBuildReplayAttrs(entry, direction) {
  var value = direction === "inverse" ? entry.prev : entry.next;
  if (typeof entry.field === "string" && entry.field.indexOf("__mrrTrack:") === 0) {
    return {
      field: entry.field,
      __mrrTrackRestore: {
        trackId: entry.field.slice("__mrrTrack:".length),
        snapshot: value
      }
    };
  }
  if (entry.field === "__mrrConditions") {
    return {
      field: entry.field,
      __mrrConditionsRestore: {
        snapshot: value
      }
    };
  }
  var isState = !!resolveRulesetState(entry.field);
  if (isState && value === null) {
    return {
      field: entry.field,
      __mrrStateClear: true
    };
  }
  return isState ? {
    field: entry.field,
    value
  } : {
    field: entry.field,
    current: value
  };
}

function mrrAnchorFromBucketKey(bucketKey) {
  var m = /^(.*):(\d+)$/.exec(String(bucketKey));
  return m ? m[1] : bucketKey;
}

function mrrDeleteAppliedKeysForSig(anchor, sig) {
  var prefix = String(anchor) + "::" + sig + "::";
  var deleted = 0;
  for (var k in appliedMutationKeys) {
    if (Object.prototype.hasOwnProperty.call(appliedMutationKeys, k) && k.indexOf(prefix) === 0) {
      delete appliedMutationKeys[k];
      deleted++;
    }
  }
  return deleted;
}

function mrrClearDedupKeysForBucket(anchor, bucket) {
  bucket.entries.forEach(function(entry) {
    if (entry.sig == null) return;
    if (entry.staticSkipped) return;
    mrrDeleteAppliedKeysForSig(anchor, entry.sig);
  });
}

function mrrGroupBucketEntriesByCharacter(bucket) {
  var activeId = state.activeCharacterId || null;
  var byId = Object.create(null);
  var order = [];
  for (var i = 0; i < bucket.entries.length; i++) {
    var entry = bucket.entries[i];
    var cid = entry.charId || activeId;
    var key = cid == null ? "null" : cid;
    if (!byId[key]) {
      byId[key] = {
        charId: cid,
        active: cid === activeId || cid == null,
        entries: []
      };
      order.push(byId[key]);
    }
    byId[key].entries.push(entry);
  }
  order.sort(function(a, b) {
    return a.active === b.active ? 0 : a.active ? -1 : 1;
  });
  return order;
}

function mrrEntryCurrentValue(entry) {
  var sheet = state.sheet;
  if (!sheet) return {
    ok: false
  };
  var f = entry.field;
  if (typeof f === "string" && f.indexOf("__mrrTrack:") === 0) {
    var trackName = f.slice("__mrrTrack:".length);
    var cells = sheet.trackCells && Array.isArray(sheet.trackCells[trackName]) ? sheet.trackCells[trackName] : null;
    return cells ? {
      ok: true,
      value: cells
    } : {
      ok: false
    };
  }
  if (f === "__mrrConditions") {
    return Array.isArray(sheet.conditions) ? {
      ok: true,
      value: sheet.conditions
    } : {
      ok: false
    };
  }
  var stateDef = resolveRulesetState(f);
  if (stateDef) {
    var have = sheet.states && typeof sheet.states === "object" && Object.prototype.hasOwnProperty.call(sheet.states, stateDef.name);
    return {
      ok: true,
      value: have ? sheet.states[stateDef.name] : null
    };
  }
  var resolved = resolveSheetField(sheet, f);
  if (resolved) {
    var map = sheet[resolved.map];
    return {
      ok: true,
      value: typeof map[resolved.key] === "number" ? map[resolved.key] : 0
    };
  }
  var parts = String(f).split(".").filter(function(p) {
    return p.length > 0;
  });
  if (!parts.length) return {
    ok: false
  };
  var node = sheet;
  for (var p = 0; p < parts.length - 1; p++) {
    if (!node[parts[p]] || typeof node[parts[p]] !== "object") return {
      ok: false
    };
    node = node[parts[p]];
  }
  var leaf = parts[parts.length - 1];
  return {
    ok: true,
    value: typeof node[leaf] === "number" ? node[leaf] : 0
  };
}

function mrrRevertCasBlocked(entry, bucketKey) {
  var cur = mrrEntryCurrentValue(entry);
  if (!cur.ok) return false;
  if (mrrDeepEqual(cur.value, entry.next)) return false;
  warn("B2-R revert: field '" + entry.field + "' in bucket '" + bucketKey + "' has changed since this mutation wrote it " + "(expected " + JSON.stringify(entry.next) + ", found " + JSON.stringify(cur.value) + ") — SKIPPED, not reverted. " + "Something edited it after the fact (a hand edit, or another write), and inverting now would throw that away. " + "The bucket stays un-reverted so a swipe-back cannot re-apply on top of it.");
  return true;
}

function mrrRevertGroupEntries(entries, skipSigs, bucketKey) {
  var allOk = true;
  for (var i = entries.length - 1; i >= 0; i--) {
    var entry = entries[i];
    if (skipSigs && entry.sig != null && skipSigs[entry.sig]) {
      entry.staticSkipped = true;
      continue;
    }
    entry.staticSkipped = false;
    if (mrrRevertCasBlocked(entry, bucketKey)) {
      entry.casSkipped = true;
      allOk = false;
      continue;
    }
    entry.casSkipped = false;
    var ok = false;
    try {
      ok = applyStateMutation(mrrBuildReplayAttrs(entry, "inverse"));
      if (!ok) warn("B2-R revert: entry for field '" + entry.field + "' in bucket '" + bucketKey + "' was rejected on replay — skipped");
    } catch (e) {
      warn("B2-R revert: entry for field '" + entry.field + "' in bucket '" + bucketKey + "' threw on replay — skipped (" + (e && e.message ? e.message : e) + ")");
    }
    entry.revertFailed = !ok;
    if (!ok) allOk = false;
  }
  return allOk;
}

function mrrRevertBucket(bucketKey, skipSigs) {
  var bucket = mrrMutationJournal.buckets[bucketKey];
  if (!bucket || !bucket.entries.length || bucket.reverted) return;
  var prevSuppressed = mrrJournalSuppressed;
  mrrJournalSuppressed = true;
  var allOk = true;
  var groups = mrrGroupBucketEntriesByCharacter(bucket);
  try {
    for (var g = 0; g < groups.length; g++) {
      var grp = groups[g];
      if (grp.active) {
        if (!mrrRevertGroupEntries(grp.entries, skipSigs, bucketKey)) allOk = false;
        continue;
      }
      var targetSheet = mrrLoadSheetRecordFor(grp.charId);
      if (!targetSheet) {
        warn("B2-R revert: bucket '" + bucketKey + "' carries " + grp.entries.length + " entr(y/ies) for character " + mrrCharacterLabel(grp.charId) + " (" + grp.charId + "), which no longer has a record for this system — " + "the group is SKIPPED and no record is created. The bucket stays un-reverted.");
        for (var d = 0; d < grp.entries.length; d++) grp.entries[d].revertFailed = true;
        allOk = false;
        continue;
      }
      if (!mrrReplayBoundGroup(targetSheet, grp, "inverse", skipSigs, bucketKey)) allOk = false;
    }
  } finally {
    mrrJournalSuppressed = prevSuppressed;
  }
  bucket.reverted = allOk;
  try {
    mrrReleaseBucketClaims(bucketKey);
    mrrClearDedupKeysForBucket(mrrAnchorFromBucketKey(bucketKey), bucket);
  } catch (e) {
    warn("B2-R revert: mrrClearDedupKeysForBucket threw for bucket '" + bucketKey + "' — dedup keys may not be cleared, incoming identical-content swipes may still be blocked (" + (e && e.message ? e.message : e) + ")");
  }
  mrrSaveMutationJournal();
  if (!prevSuppressed) {
    saveSheet(state.chatId, state.sheet);
    renderSheet();
  }
}

function mrrReapplyGroupEntries(entries, bucketKey) {
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (entry.revertFailed || entry.staticSkipped || entry.casSkipped) continue;
    try {
      if (!applyStateMutation(mrrBuildReplayAttrs(entry, "forward"))) {
        warn("B2-R swipe-back: entry for field '" + entry.field + "' in bucket '" + bucketKey + "' was rejected on replay — skipped");
      }
    } catch (e) {
      warn("B2-R swipe-back: entry for field '" + entry.field + "' in bucket '" + bucketKey + "' threw on replay — skipped (" + (e && e.message ? e.message : e) + ")");
    }
  }
  return true;
}

function mrrReplayBoundGroup(targetSheet, grp, direction, skipSigs, bucketKey) {
  return mrrWithSheetBoundApply(targetSheet, grp.charId, function() {
    var ok = direction === "inverse" ? mrrRevertGroupEntries(grp.entries, skipSigs, bucketKey) : mrrReapplyGroupEntries(grp.entries, bucketKey);
    saveSheet(state.chatId, state.sheet);
    return ok;
  });
}

function mrrReapplyBucket(bucketKey) {
  var bucket = mrrMutationJournal.buckets[bucketKey];
  if (!bucket || !bucket.entries.length || !bucket.reverted) return;
  var prevSuppressed = mrrJournalSuppressed;
  mrrJournalSuppressed = true;
  var groups = mrrGroupBucketEntriesByCharacter(bucket);
  try {
    for (var g = 0; g < groups.length; g++) {
      var grp = groups[g];
      if (grp.active) {
        mrrReapplyGroupEntries(grp.entries, bucketKey);
        continue;
      }
      var targetSheet = mrrLoadSheetRecordFor(grp.charId);
      if (!targetSheet) {
        warn("B2-R swipe-back: bucket '" + bucketKey + "' carries " + grp.entries.length + " entr(y/ies) for character " + mrrCharacterLabel(grp.charId) + " (" + grp.charId + "), which no longer has a record for this system — " + "the group is SKIPPED and no record is created.");
        continue;
      }
      mrrReplayBoundGroup(targetSheet, grp, "forward", null, bucketKey);
    }
  } finally {
    mrrJournalSuppressed = prevSuppressed;
  }
  bucket.reverted = false;
  mrrSaveMutationJournal();
  if (!prevSuppressed) {
    saveSheet(state.chatId, state.sheet);
    renderSheet();
  }
}

var mrrSwipeIndexFetchPromise = null;

var mrrSwipeIndexFetchChatId = null;

var mrrSwipeIndexWarned = false;

var mrrMsgAnchorMap = null;

var mrrMsgAnchorLastId = null;

var mrrMsgAnchorChatId = null;

var mrrRunAnchorDeferrals = Object.create(null);

var mrrRunAnchorFallbackWarned = false;

var mrrMsgAnchorRoleWarned = false;

var MRR_RUN_ANCHOR_MAX_DEFERRALS = 200;

function mrrBuildMsgAnchorMap(rows, chatId) {
  var ordered = [];
  var sawRole = false;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r && typeof r.id === "string") {
      ordered.push({
        row: r,
        i
      });
      if (typeof r.role === "string") sawRole = true;
    }
  }
  if (!sawRole && ordered.length) {
    mrrMsgAnchorMap = null;
    mrrMsgAnchorLastId = null;
    mrrMsgAnchorChatId = null;
    if (!mrrMsgAnchorRoleWarned) {
      mrrMsgAnchorRoleWarned = true;
      warn("runs-poller: /chats/:id/messages returned no `role` field on any row — cannot re-anchor pre-generation runs to their assistant reply; falling back to raw-messageId anchoring (swipe-revert unavailable for the poller transport)");
    }
    return;
  }
  ordered.sort(function(a, b) {
    var ar = a.row.rowid, br = b.row.rowid;
    if (typeof ar === "number" && typeof br === "number" && ar !== br) return ar - br;
    var ac = a.row.createdAt, bc = b.row.createdAt;
    if (typeof ac === "string" && typeof bc === "string" && ac !== bc) return ac < bc ? -1 : 1;
    return a.i - b.i;
  });
  var map = Object.create(null);
  var nextAssistant = null;
  for (var j = ordered.length - 1; j >= 0; j--) {
    var m = ordered[j].row;
    var visibleAssistant = m.role === "assistant" && !mrrIsHiddenFromUser(m);
    map[m.id] = visibleAssistant ? m.id : nextAssistant;
    if (visibleAssistant) nextAssistant = m.id;
  }
  mrrMsgAnchorMap = map;
  mrrMsgAnchorLastId = ordered.length ? ordered[ordered.length - 1].row.id : null;
  mrrMsgAnchorChatId = chatId;
}

function mrrIsHiddenFromUser(row) {
  if (!row) return false;
  var extra = row.extra;
  if (typeof extra === "string") extra = safeParse(extra);
  return !!(extra && typeof extra === "object" && extra.hiddenFromUser === true);
}

function mrrResolveRunDomAnchor(chatId, mid) {
  if (!mid || !mrrMsgAnchorMap || mrrMsgAnchorChatId !== chatId) return {
    status: "window"
  };
  if (!Object.prototype.hasOwnProperty.call(mrrMsgAnchorMap, mid)) return {
    status: "window"
  };
  var anchor = mrrMsgAnchorMap[mid];
  if (anchor) return {
    status: "resolved",
    anchor
  };
  return {
    status: mid === mrrMsgAnchorLastId ? "defer" : "none"
  };
}

function mrrProcessedKey(msgId, idx) {
  return idx === null || idx === undefined ? msgId : msgId + ":" + idx;
}

function mrrJournalHasBucketsFor(msgId) {
  if (!msgId || !mrrMutationJournal || !mrrMutationJournal.buckets) return false;
  var prefix = msgId + ":";
  var keys = Object.keys(mrrMutationJournal.buckets);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (k !== msgId && k.indexOf(prefix) !== 0) continue;
    var b = mrrMutationJournal.buckets[k];
    if (b && Array.isArray(b.entries) && b.entries.length) return true;
  }
  return false;
}

function mrrMaybeLogOrphanedBuckets() {
  if (mrrOrphanDiagLogged) return;
  if (mrrNonSkipObservationCount > 0) return;
  if (mrrSkipObservationCount < MRR_ORPHAN_DIAG_MIN_SKIPS) return;
  if (!mrrMutationJournal || !mrrMutationJournal.buckets) return;
  var bucketKeys = Object.keys(mrrMutationJournal.buckets);
  if (!bucketKeys.length) return;
  var domIds = Object.create(null);
  var domList = [];
  try {
    var els = document.querySelectorAll("[data-message-id]");
    for (var e = 0; e < els.length; e++) {
      var id = els[e].getAttribute("data-message-id");
      if (!id || domIds[id]) continue;
      var isAssistant = !!(els[e].classList && els[e].classList.contains("mari-message-assistant"));
      domIds[id] = true;
      domList.push(id + (isAssistant ? "(a)" : "(o)"));
    }
  } catch (err) {}
  var unmatched = [];
  for (var b = 0; b < bucketKeys.length; b++) {
    var anchor = mrrAnchorFromBucketKey(bucketKeys[b]);
    if (!domIds[anchor] && unmatched.indexOf(bucketKeys[b]) === -1) unmatched.push(bucketKeys[b]);
  }
  if (!unmatched.length) return;
  mrrOrphanDiagLogged = true;
  log("journal keys with no DOM match: [" + unmatched.join(", ") + "] after " + mrrSkipObservationCount + " skipped observation(s), 0 non-skipped; DOM message ids present: [" + domList.join(", ") + "]");
}

function mrrComputeIncomingSigs(tags) {
  var sigs = Object.create(null);
  if (!tags || !tags.length) return sigs;
  for (var i = 0; i < tags.length; i++) {
    var normalized = normalizeStateAttrs(tags[i].attrs);
    for (var n = 0; n < normalized.length; n++) {
      sigs[mutationContentSig(normalized[n])] = true;
    }
  }
  return sigs;
}

function mrrHandleSwipeTransition(msgId, newIdx, incomingSigs) {
  if (newIdx === null || newIdx === undefined) return false;
  var priorIdx = mrrMutationJournal.lastSeenIdx[msgId];
  if (priorIdx === undefined || priorIdx === newIdx) {
    if (priorIdx === undefined) mrrMutationJournal.lastSeenIdx[msgId] = newIdx;
    return false;
  }
  var oldBucketKey = mrrProcessedKey(msgId, priorIdx);
  var oldBucket = mrrMutationJournal.buckets[oldBucketKey];
  var reverted = false;
  if (oldBucket && oldBucket.entries.length && !oldBucket.reverted) {
    mrrRevertBucket(oldBucketKey, incomingSigs || {});
    log("state-mutator: swipe change on " + msgId + " (" + priorIdx + " -> " + newIdx + ") reverted bucket " + oldBucketKey);
    reverted = true;
  }
  var newBucketKey = mrrProcessedKey(msgId, newIdx);
  var newBucket = mrrMutationJournal.buckets[newBucketKey];
  var reappliedFromJournal = false;
  if (newBucket && newBucket.reverted) {
    mrrReapplyBucket(newBucketKey);
    reappliedFromJournal = true;
    log("state-mutator: swipe-back re-applied bucket " + newBucketKey + " from journal");
  }
  mrrMutationJournal.lastSeenIdx[msgId] = newIdx;
  mrrSaveMutationJournal();
  return {
    reverted,
    reappliedFromJournal,
    oldBucketKey,
    newBucketKey
  };
}

function isMessageProcessed(msgId, idx) {
  if (processedMessageIds[msgId]) return true;
  if (idx !== null && idx !== undefined) {
    return !!processedMessageIds[msgId + ":" + idx];
  }
  var prefix = msgId + ":";
  for (var k in processedMessageIds) {
    if (Object.prototype.hasOwnProperty.call(processedMessageIds, k) && k.indexOf(prefix) === 0) return true;
  }
  return false;
}

function fetchSwipeIndexMap(chatId) {
  if (mrrSwipeIndexFetchPromise) {
    if (mrrSwipeIndexFetchChatId === chatId) return mrrSwipeIndexFetchPromise;
    return Promise.resolve(null);
  }
  mrrSwipeIndexFetchChatId = chatId;
  mrrSwipeIndexFetchPromise = apiFetch("/chats/" + encodeURIComponent(chatId) + "/messages?limit=50").then(function(rows) {
    if (!Array.isArray(rows)) {
      mrrMsgAnchorMap = null;
      mrrMsgAnchorChatId = null;
      mrrMsgAnchorLastId = null;
      return null;
    }
    mrrBuildMsgAnchorMap(rows, chatId);
    var map = Object.create(null);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r && typeof r.id === "string" && typeof r.activeSwipeIndex === "number") {
        map[r.id] = r.activeSwipeIndex;
      }
    }
    return map;
  }).catch(function(e) {
    mrrMsgAnchorMap = null;
    mrrMsgAnchorChatId = null;
    mrrMsgAnchorLastId = null;
    if (!mrrSwipeIndexWarned) {
      mrrSwipeIndexWarned = true;
      warn("swipe-index fetch failed (" + (e && e.message ? e.message : e) + ") — falling back to plain-messageId keying");
    }
    return null;
  }).then(function(result) {
    mrrSwipeIndexFetchPromise = null;
    mrrSwipeIndexFetchChatId = null;
    return result;
  });
  return mrrSwipeIndexFetchPromise;
}

function resolveSwipeIndexForMessage(chatId, msgId) {
  return fetchSwipeIndexMap(chatId).then(function(map) {
    if (!map || !Object.prototype.hasOwnProperty.call(map, msgId)) return null;
    return map[msgId];
  });
}

function parseStateAttrs(attrStr) {
  var attrs = {};
  STATE_KV_RE.lastIndex = 0;
  var m;
  while ((m = STATE_KV_RE.exec(attrStr)) !== null) {
    attrs[m[1]] = m[2] !== undefined ? m[2] : m[3];
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
    tags.push({
      raw: m[0],
      attrs
    });
  }
  return tags;
}

function formatMutationLabel(attrs) {
  var prefix, change;
  if (attrs.field === "conditions") {
    prefix = "Condition";
    change = attrs.add ? "+ " + attrs.add : attrs.remove ? "− " + attrs.remove : "?";
  } else if (attrs.field === "inventory") {
    var q = parseInt(attrs.qty, 10);
    if (!q || q < 1) q = 1;
    prefix = "Inventory";
    change = attrs.add ? "+ " + q + "× " + attrs.add : attrs.remove ? "− " + q + "× " + attrs.remove : "?";
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
  return {
    prefix,
    change,
    reason: attrs.reason || ""
  };
}

function showMutationToast(attrs, nameLabel) {
  var label = attrs && attrs.__mrrToastLabel ? attrs.__mrrToastLabel : formatMutationLabel(attrs);
  if (nameLabel) label = {
    prefix: nameLabel + ": " + label.prefix,
    change: label.change,
    reason: label.reason
  };
  var container = document.getElementById("mrr-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "mrr-toast-container";
    container.className = "mrr-toast-container";
    document.body.appendChild(container);
  }
  var toast = document.createElement("div");
  toast.className = "mrr-toast";
  var p = document.createElement("span");
  p.className = "mrr-toast__prefix";
  p.textContent = label.prefix;
  var c = document.createElement("span");
  c.className = "mrr-toast__change";
  c.textContent = label.change;
  toast.appendChild(p);
  toast.appendChild(c);
  if (label.reason) {
    var r = document.createElement("span");
    r.className = "mrr-toast__reason";
    r.textContent = label.reason;
    toast.appendChild(r);
  }
  container.appendChild(toast);
  setTimeout(function() {
    toast.classList.add("mrr-toast--visible");
  }, 10);
  setTimeout(function() {
    toast.classList.remove("mrr-toast--visible");
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 320);
  }, 3500);
}

function normalizeFieldKey(s) {
  return String(s == null ? "" : s).toLowerCase().replace(/[\s_\-]+/g, "");
}

function resolvedFieldMax(map, key) {
  if (!state.ruleset) return null;
  var defs;
  if (map === "derived") defs = state.ruleset.derivedStats; else if (map === "attributes") defs = state.ruleset.attributes; else if (map === "skills") defs = state.ruleset.skills;
  if (!Array.isArray(defs)) return null;
  var def = null;
  for (var i = 0; i < defs.length; i++) {
    if (defs[i] && defs[i].name === key) {
      def = defs[i];
      break;
    }
  }
  if (!def) return null;
  if (def.maxFormula) {
    var v = evalFormula(def.maxFormula, statContext());
    if (typeof v === "number" && isFinite(v) && v > 0) return Math.floor(v);
  }
  if (typeof def.max === "number") return def.max;
  return null;
}

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
        return {
          trackName: d.name,
          typeId: dt.id,
          types,
          derived: d
        };
      }
    }
  }
  return null;
}

function resolveSheetField(sheet, field) {
  var maps = [ "derived", "attributes", "skills" ];
  var defsByMap = {
    derived: state.ruleset && state.ruleset.derivedStats || [],
    attributes: state.ruleset && state.ruleset.attributes || [],
    skills: state.ruleset && state.ruleset.skills || []
  };
  var i, m, keys, k;
  for (i = 0; i < maps.length; i++) {
    m = sheet[maps[i]];
    if (m && typeof m === "object" && Object.prototype.hasOwnProperty.call(m, field)) {
      return {
        map: maps[i],
        key: field
      };
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
        return {
          map: maps[i],
          key: keys[k]
        };
      }
    }
  }
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
        if (normalizeFieldKey(aliasKeys[a]) === target) {
          hit = true;
          break;
        }
      }
      if (!hit) continue;
      m = sheet[maps[i]];
      if (m && typeof m === "object") return {
        map: maps[i],
        key: def.name
      };
    }
  }
  return null;
}

function finalizeMutation(attrs) {
  if (!mrrJournalSuppressed) {
    mrrClearBootstrapFlag("state mutation applied to this character");
    saveSheet(state.chatId, state.sheet);
    if (!mrrRenderSuppressed) renderSheet();
    if (!Array.isArray(state.mutationLog)) state.mutationLog = [];
    state.mutationLog.push({
      timestamp: Date.now(),
      field: attrs.field,
      delta: attrs.delta,
      add: attrs.add,
      remove: attrs.remove,
      qty: attrs.qty,
      reason: attrs.reason,
      charId: state.activeCharacterId || null
    });
    if (state.mutationLog.length > 20) state.mutationLog.shift();
    showMutationToast(attrs, mrrBoundApplyCharId ? mrrCharacterLabel(mrrBoundApplyCharId) : null);
  }
  return true;
}

function applyStateMutation(attrs) {
  if (!state.sheet || !state.ruleset) return false;
  var sheet = state.sheet;
  var rawField = attrs.field;
  var lcField = typeof rawField === "string" ? rawField.trim().toLowerCase() : "";
  var fieldAliases = {
    "xp available to spend": "xp",
    "xp available": "xp",
    xp: "xp",
    experience: "xp",
    "experience points": "xp",
    "total xp earned (lifetime)": "xp",
    "total xp earned": "xp",
    "total xp": "xp",
    intimacy: "intimacies",
    intimacies: "intimacies",
    attune: "attunement",
    attunement: "attunement",
    attuned: "attunement",
    invest: "investiture",
    invested: "investiture",
    investiture: "investiture",
    commit: "commitment",
    commitment: "commitment",
    "mote commitment": "commitment",
    "mote commit": "commitment"
  };
  if (lcField && fieldAliases[lcField] && fieldAliases[lcField] !== rawField) {
    log("state-mutator: alias-resolved field '" + rawField + "' to canonical '" + fieldAliases[lcField] + "'");
    attrs.field = fieldAliases[lcField];
  }
  if (attrs.field === "xp" && attrs.value != null && attrs.current == null && attrs.level == null && attrs.next == null && attrs.total == null && attrs.delta == null) {
    if (lcField && lcField.indexOf("total") !== -1) {
      attrs.total = attrs.value;
    } else {
      attrs.current = attrs.value;
    }
    log("state-mutator: xp value=" + attrs.value + " mapped to " + (lcField.indexOf("total") !== -1 ? "total" : "current"));
  }
  var field = attrs.field;
  if (field === "conditions") {
    if (!Array.isArray(sheet.conditions)) sheet.conditions = [];
    var prevConditionsSnapshot = sheet.conditions.slice();
    if (attrs.add) {
      if (sheet.conditions.indexOf(attrs.add) === -1) sheet.conditions.push(attrs.add);
    } else if (attrs.remove) {
      sheet.conditions = sheet.conditions.filter(function(c) {
        return c !== attrs.remove;
      });
    } else {
      return false;
    }
    mrrJournalMutation("__mrrConditions", {
      prev: prevConditionsSnapshot,
      next: sheet.conditions.slice()
    });
    return finalizeMutation(attrs);
  }
  if (field === "inventory") {
    if (!Array.isArray(sheet.inventory)) sheet.inventory = [];
    var qty = parseInt(attrs.qty, 10);
    if (!qty || qty < 1) qty = 1;
    log("state-mutator inventory attrs:", attrs);
    if (attrs.add) {
      var existing = null;
      for (var i = 0; i < sheet.inventory.length; i++) {
        if (sheet.inventory[i] && sheet.inventory[i].name === attrs.add) {
          existing = sheet.inventory[i];
          break;
        }
      }
      if (existing) {
        normalizeInventoryItem(existing, sheet.inventory.indexOf(existing));
        applyItemAttrs(existing, attrs);
        existing.quantity = (existing.quantity || 1) + qty;
      } else {
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
    } else {
      return false;
    }
    return finalizeMutation(attrs);
  }
  if (field === "backgrounds") {
    if (!Array.isArray(sheet.backgrounds)) sheet.backgrounds = [];
    if (attrs.add) {
      var existingBg = null;
      for (var bgix = 0; bgix < sheet.backgrounds.length; bgix++) {
        var bgEntry = sheet.backgrounds[bgix];
        if (bgEntry && typeof bgEntry.name === "string" && bgEntry.name.toLowerCase() === String(attrs.add).toLowerCase()) {
          existingBg = bgEntry;
          break;
        }
      }
      if (existingBg) {
        var ratingNum = parseInt(attrs.rating, 10);
        if (!isNaN(ratingNum)) existingBg.value = ratingNum;
      } else {
        var newRating = parseInt(attrs.rating, 10);
        sheet.backgrounds.push({
          name: String(attrs.add),
          value: isNaN(newRating) ? 0 : newRating
        });
      }
    } else if (attrs.remove) {
      var rem = String(attrs.remove).toLowerCase();
      var idxBg = -1;
      for (var bgi = 0; bgi < sheet.backgrounds.length; bgi++) {
        var bg = sheet.backgrounds[bgi];
        if (bg && typeof bg.name === "string" && bg.name.toLowerCase() === rem) {
          idxBg = bgi;
          break;
        }
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
          matchBg = bgm;
          break;
        }
      }
      if (!matchBg) {
        warn("state-mutator backgrounds delta: no match for '" + attrs.name + "'");
        return false;
      }
      var bgMin = state.ruleset.backgrounds && typeof state.ruleset.backgrounds.min === "number" ? state.ruleset.backgrounds.min : 0;
      var bgMax = state.ruleset.backgrounds && typeof state.ruleset.backgrounds.max === "number" ? state.ruleset.backgrounds.max : 99;
      matchBg.value = Math.max(bgMin, Math.min(bgMax, (matchBg.value || 0) + deltaBg));
    } else {
      return false;
    }
    return finalizeMutation(attrs);
  }
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
      var inKind = attrs.kind === "principle" ? "principle" : "tie";
      var inDeg = attrs.degree === "major" || attrs.degree === "defining" ? attrs.degree : "minor";
      var inTarget = inKind === "tie" && typeof attrs.target === "string" ? attrs.target : "";
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
    } else {
      return false;
    }
    return finalizeMutation(attrs);
  }
  if (field === "xp") {
    if (!sheet.xp) sheet.xp = {
      current: 0,
      level: 1,
      next: 0,
      total: 0
    };
    var hasDelta = attrs.delta != null;
    var hasAbsolute = attrs.current != null || attrs.level != null || attrs.next != null || attrs.total != null;
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
      var setKeys = [ "current", "level", "next", "total" ];
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
      Object.keys(pending).forEach(function(k) {
        sheet.xp[k] = pending[k];
      });
      return finalizeMutation(attrs);
    }
    warn("state-mutator xp: must provide delta=N or absolute current/level/next/total");
    return false;
  }
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
    var wantA = attrs.attuned === "true";
    if (wantA) {
      if (attTarget.invested === true || typeof attTarget.moteCommitment === "number" && attTarget.moteCommitment > 0) {
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
    var newAc = 0;
    for (var aco = 0; aco < sheet.inventory.length; aco++) {
      if (sheet.inventory[aco] && sheet.inventory[aco].attuned) newAc += 1;
    }
    sheet.attunedCount = newAc;
    return finalizeMutation(attrs);
  }
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
    var wantI = attrs.invested === "true";
    if (wantI) {
      if (iTarget.attuned === true || typeof iTarget.moteCommitment === "number" && iTarget.moteCommitment > 0) {
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
    var newPool = attrs.pool;
    if (newPool !== "Personal" && newPool !== "Peripheral") {
      if (mTarget.motePool === "Personal" || mTarget.motePool === "Peripheral") newPool = mTarget.motePool; else newPool = "Personal";
    }
    var oldPool = mTarget.motePool === "Peripheral" ? "Peripheral" : "Personal";
    var oldPoolKey = oldPool + " Motes";
    var newPoolKey = newPool + " Motes";
    var oldMotes = typeof mTarget.moteCommitment === "number" && mTarget.moteCommitment > 0 ? mTarget.moteCommitment : 0;
    if (!sheet.derived) sheet.derived = {};
    if (typeof sheet.derived[oldPoolKey] !== "number") {
      log("state-mutator commitment: derived[" + oldPoolKey + "] missing — treating as 0");
      sheet.derived[oldPoolKey] = 0;
    }
    if (typeof sheet.derived[newPoolKey] !== "number") {
      log("state-mutator commitment: derived[" + newPoolKey + "] missing — treating as 0");
      sheet.derived[newPoolKey] = 0;
    }
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
  var stateDef = resolveRulesetState(field);
  if (stateDef) {
    if (attrs.__mrrStateClear === true) {
      if (sheet.states && typeof sheet.states === "object") delete sheet.states[stateDef.name];
      return finalizeMutation(attrs);
    }
    var rawStateVal = attrs.value != null ? attrs.value : attrs.set != null ? attrs.set : attrs.current;
    var stateLabels = (stateDef.values || []).map(function(v) {
      return v.label;
    });
    if (rawStateVal == null) {
      warn("state-mutator: state '" + stateDef.name + '\' is set by label, not delta — use value="<label>"; valid: ' + stateLabels.join(", "));
      return false;
    }
    var canonicalLabel = null;
    var nsv = String(rawStateVal).trim().toLowerCase();
    for (var sl = 0; sl < stateLabels.length; sl++) {
      if (String(stateLabels[sl]).trim().toLowerCase() === nsv) {
        canonicalLabel = stateLabels[sl];
        break;
      }
    }
    if (canonicalLabel == null) {
      var aliased = mrrResolveStateLabel(state.ruleset && typeof state.ruleset.id === "string" ? state.ruleset.id : null, stateDef, rawStateVal);
      if (aliased != null) {
        var na = String(aliased).trim().toLowerCase();
        for (var sa = 0; sa < stateLabels.length; sa++) {
          if (String(stateLabels[sa]).trim().toLowerCase() === na) {
            canonicalLabel = stateLabels[sa];
            break;
          }
        }
      }
    }
    if (canonicalLabel == null) {
      warn("state-mutator: state '" + stateDef.name + "' has no label matching '" + rawStateVal + "' — valid: " + stateLabels.join(", "));
      return false;
    }
    if (!sheet.states || typeof sheet.states !== "object") sheet.states = {};
    var prevStateLabel = sheet.states[stateDef.name] !== undefined ? sheet.states[stateDef.name] : null;
    sheet.states[stateDef.name] = canonicalLabel;
    mrrJournalMutation(stateDef.name, {
      prev: prevStateLabel,
      next: canonicalLabel
    });
    return finalizeMutation(attrs);
  }
  if (attrs.__mrrTrackRestore && typeof attrs.__mrrTrackRestore === "object") {
    var trRestore = attrs.__mrrTrackRestore;
    var trDerived = null;
    if (state.ruleset && Array.isArray(state.ruleset.derivedStats)) {
      for (var tdi = 0; tdi < state.ruleset.derivedStats.length; tdi++) {
        if (state.ruleset.derivedStats[tdi] && state.ruleset.derivedStats[tdi].name === trRestore.trackId) {
          trDerived = state.ruleset.derivedStats[tdi];
          break;
        }
      }
    }
    if (!trDerived) {
      warn("B2-R track-restore: track '" + trRestore.trackId + "' no longer exists in the active ruleset — skipped");
      return false;
    }
    if (!Array.isArray(trRestore.snapshot)) {
      warn("B2-R track-restore: malformed snapshot for track '" + trRestore.trackId + "' — skipped");
      return false;
    }
    if (!sheet.trackCells || typeof sheet.trackCells !== "object") sheet.trackCells = {};
    sheet.trackCells[trRestore.trackId] = trRestore.snapshot.slice();
    syncTrackCellsToTyped(trDerived);
    return finalizeMutation(attrs);
  }
  if (attrs.__mrrConditionsRestore && typeof attrs.__mrrConditionsRestore === "object") {
    var condRestore = attrs.__mrrConditionsRestore;
    if (!Array.isArray(condRestore.snapshot)) {
      warn("B2-R conditions-restore: malformed snapshot — skipped");
      return false;
    }
    sheet.conditions = condRestore.snapshot.slice();
    return finalizeMutation(attrs);
  }
  var hasDelta = attrs.delta != null;
  var hasAbsolute = attrs.current != null || attrs.value != null || attrs.set != null;
  if (!hasDelta && !hasAbsolute) {
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
    var rawAbs = attrs.current != null ? attrs.current : attrs.value != null ? attrs.value : attrs.set;
    absoluteValue = parseInt(rawAbs, 10);
    if (isNaN(absoluteValue)) {
      warn("state-mutator: value '" + rawAbs + "' for field '" + field + "' is not an integer — dropped (label-valued stats must be declared in ruleset.states)");
      return false;
    }
  }
  var dmg = resolveDamageType(field);
  if (dmg) {
    var derivedObj = dmg.derived;
    var rulesetCellCount = Array.isArray(derivedObj.track) ? derivedObj.track.length : 0;
    var extraCellCount = sheet.extraTrack && Array.isArray(sheet.extraTrack[dmg.trackName]) ? sheet.extraTrack[dmg.trackName].length : 0;
    var totalLen = rulesetCellCount + extraCellCount;
    if (totalLen <= 0) {
      log("state-mutator typed-damage: derived '" + dmg.trackName + "' has no cells declared");
      return false;
    }
    var cells = ensureTrackCells(derivedObj, totalLen);
    var prevCellsSnapshot = cells.slice();
    var typeForLabel = null;
    for (var ti = 0; ti < dmg.types.length; ti++) {
      if (dmg.types[ti].id === dmg.typeId) {
        typeForLabel = dmg.types[ti];
        break;
      }
    }
    if (!typeForLabel) return false;
    var label = typeForLabel.label;
    var currentCount = 0;
    for (var cci = 0; cci < cells.length; cci++) {
      if (cells[cci] === label) currentCount += 1;
    }
    var targetCount = hasAbsolute ? absoluteValue : currentCount + delta;
    if (targetCount < 0) targetCount = 0;
    var diff = targetCount - currentCount;
    if (diff > 0) {
      for (var ai = 0; ai < cells.length && diff > 0; ai++) {
        if (cells[ai] == null) {
          cells[ai] = label;
          diff -= 1;
        }
      }
    } else if (diff < 0) {
      var toRemove = -diff;
      for (var ri = cells.length - 1; ri >= 0 && toRemove > 0; ri--) {
        if (cells[ri] === label) {
          cells[ri] = null;
          toRemove -= 1;
        }
      }
    }
    mrrJournalMutation("__mrrTrack:" + dmg.trackName, {
      prev: prevCellsSnapshot,
      next: cells.slice()
    });
    syncTrackCellsToTyped(derivedObj);
    return finalizeMutation(attrs);
  }
  var resolved = resolveSheetField(sheet, field);
  if (resolved) {
    var bucket = sheet[resolved.map];
    var current = typeof bucket[resolved.key] === "number" ? bucket[resolved.key] : 0;
    var max = resolvedFieldMax(resolved.map, resolved.key);
    var next = hasAbsolute ? absoluteValue : current + delta;
    if (typeof max === "number") next = Math.min(max, next);
    var finalNext = Math.max(0, next);
    bucket[resolved.key] = finalNext;
    mrrJournalMutation(resolved.key, {
      prev: current,
      next: finalNext
    });
    return finalizeMutation(attrs);
  }
  warn("state-mutator: unmatched field '" + field + "' — stashed on sheet" + (field.indexOf(".") !== -1 ? " (nested path)" : " root"));
  var pathParts = String(field).split(".").filter(function(p) {
    return p.length > 0;
  });
  if (!pathParts.length) return false;
  var node = sheet;
  for (var p = 0; p < pathParts.length - 1; p++) {
    var seg = pathParts[p];
    if (!node[seg] || typeof node[seg] !== "object" || Array.isArray(node[seg])) node[seg] = {};
    node = node[seg];
  }
  var leaf = pathParts[pathParts.length - 1];
  var rootCurrent = typeof node[leaf] === "number" ? node[leaf] : 0;
  var stashFinal = hasAbsolute ? Math.max(0, absoluteValue) : Math.max(0, rootCurrent + delta);
  node[leaf] = stashFinal;
  mrrJournalMutation(field, {
    prev: rootCurrent,
    next: stashFinal
  });
  return finalizeMutation(attrs);
}

function processChatMessage(node) {
  if (!node || !node.getAttribute) return;
  var msgId = node.getAttribute("data-message-id");
  if (!msgId) return;
  if (mrrIsPlaceholderMessageId(msgId)) return;
  if (!node.classList || !node.classList.contains("mari-message-assistant")) return;
  var text = node.textContent || "";
  var isTagBearing = text.indexOf("[mrr-state:") !== -1;
  var hasBuckets = !isTagBearing && mrrJournalHasBucketsFor(msgId);
  if (!isTagBearing && !hasBuckets) {
    if (!mrrSkippedDiagnosticWarned[msgId]) {
      mrrSkippedDiagnosticWarned[msgId] = true;
      mrrSkipObservationCount++;
      log("swipe-detect: msgId=" + msgId + " skipped — no tags, no buckets");
      mrrMaybeLogOrphanedBuckets();
    }
    return;
  }
  mrrNonSkipObservationCount++;
  if (!processedMessageIds[msgId] && mrrProcessedTextMemo[msgId] !== text) {
    var scanChatId = state.chatId;
    var tags = isTagBearing ? parseStateTags(text) : [];
    resolveSwipeIndexForMessage(scanChatId, msgId).then(function(idx) {
      if (state.chatId !== scanChatId) return;
      loadProcessedMessageIds(scanChatId);
      var hasBucketsForLog = isTagBearing ? mrrJournalHasBucketsFor(msgId) : hasBuckets;
      var jBucketCount = mrrMutationJournal && mrrMutationJournal.buckets ? Object.keys(mrrMutationJournal.buckets).length : 0;
      log("swipe-detect: msgId=" + msgId + " buckets=" + hasBucketsForLog + " idx=" + idx + " jChat=" + mrrMutationJournalChatId + " jBuckets=" + jBucketCount);
      var incomingSigs = isTagBearing ? mrrComputeIncomingSigs(tags) : {};
      var transition = mrrHandleSwipeTransition(msgId, idx, incomingSigs);
      if (transition && transition.reappliedFromJournal) {
        processedMessageIds[transition.newBucketKey] = true;
        mrrBucketChannelClaims[transition.newBucketKey] = "dom";
        mrrProcessedTextMemo[msgId] = text;
        saveProcessedMessageIds();
        return;
      }
      if (!isTagBearing) {
        mrrProcessedTextMemo[msgId] = text;
        return;
      }
      if (isMessageProcessed(msgId, idx)) {
        if (idx !== null && idx !== undefined) mrrProcessedTextMemo[msgId] = text;
        return;
      }
      var key = mrrProcessedKey(msgId, idx);
      var applied = applyStateTagsWithDedup(tags, msgId, key, "dom");
      processedMessageIds[key] = true;
      mrrProcessedTextMemo[msgId] = text;
      saveProcessedMessageIds();
      log("state-mutator: applied " + applied + "/" + tags.length + " mutation(s) from message " + key);
    });
  }
}

var processedRunIds = Object.create(null);

var processedRunIdsChatId = null;

var runsPollInFlight = false;

var runsPollDumpedOnce = false;

var runsBaselineExists = false;

var mrrMutatorConfigId = null;

var mrrMutatorConfigIdRulesetId = undefined;

var mrrMutatorFilterWarned = false;

var mrrSoleWriterWarnedAgents = Object.create(null);

function mrrResolveMutatorConfigId(rulesetId) {
  if (!rulesetId) return Promise.resolve(null);
  if (mrrMutatorConfigIdRulesetId === rulesetId) return Promise.resolve(mrrMutatorConfigId);
  return apiFetch("/agents").then(function(agents) {
    var mutator = null;
    if (Array.isArray(agents)) {
      for (var i = 0; i < agents.length; i++) {
        var a = agents[i];
        if (!a || typeof a !== "object") continue;
        var s = parseAgentSettings(a);
        if (s.mrrManaged === true && s.mrrRulesetId === rulesetId && s.mrrAgentRole === "state-mutator") {
          mutator = a;
          break;
        }
      }
    }
    mrrMutatorConfigId = mutator ? mutator.id : null;
    mrrMutatorConfigIdRulesetId = rulesetId;
    if (!mutator && !mrrMutatorFilterWarned) {
      mrrMutatorFilterWarned = true;
      warn("sole-writer filter inactive — mutator id unknown (no managed state-mutator agent found for ruleset '" + rulesetId + "') — applying state tags from all non-built-in agents, unfiltered");
    }
    return mrrMutatorConfigId;
  }).catch(function(e) {
    if (!mrrMutatorFilterWarned) {
      mrrMutatorFilterWarned = true;
      warn("sole-writer filter inactive — /agents fetch failed (" + (e && e.message ? e.message : e) + ") — applying state tags from all non-built-in agents, unfiltered this cycle");
    }
    return null;
  });
}

function loadProcessedRunIds(chatId) {
  if (!chatId) {
    processedRunIds = Object.create(null);
    processedRunIdsChatId = null;
    runsBaselineExists = false;
    return;
  }
  if (processedRunIdsChatId === chatId) return;
  var raw = lsGet(LS_PROCESSED_RUNS_PFX + chatId);
  var parsed = raw ? safeParse(raw) : null;
  processedRunIds = parsed && typeof parsed === "object" ? parsed : Object.create(null);
  processedRunIdsChatId = chatId;
  runsBaselineExists = parsed !== null && typeof parsed === "object";
}

function saveProcessedRunIds() {
  if (!processedRunIdsChatId) return;
  lsSet(LS_PROCESSED_RUNS_PFX + processedRunIdsChatId, JSON.stringify(processedRunIds));
}

function extractRunText(row) {
  if (!row || typeof row !== "object") return "";
  var candidates = [ row.resultData && row.resultData.text, row.output, row.text, row.result, row.data, row.output && row.output.text, row.result && row.result.text ];
  for (var i = 0; i < candidates.length; i++) {
    if (typeof candidates[i] === "string" && candidates[i].indexOf("[mrr-state:") !== -1) return candidates[i];
  }
  try {
    var s = JSON.stringify(row);
    if (s.indexOf("[mrr-state:") !== -1) return s;
  } catch (e) {}
  return "";
}

function extractRunId(row) {
  return row && (row.id || row.runId || row._id) || null;
}

function extractRunAnchor(row, fallbackId) {
  var mid = row && (row.messageId || row.message_id || row.message && row.message.id);
  if (mid) return mid;
  warn("runs-poller: run " + fallbackId + " has no messageId — anchoring to a synthetic per-run id (no cross-transport dedup, no swipe-aware journal bucket for this mutation)");
  return "run:" + fallbackId;
}

var runsPollStartedAt = 0;

var runsPollCycleToken = 0;

var runsPollStallWarned = false;

var MRR_RUNS_POLL_STALL_MS = 3e4;

function mrrNow() {
  return Date.now();
}

var mrrPollerBlockLogged = null;

function pollCustomAgentRuns(chatId) {
  if (MRR_RUNS_POLLER_MODE === "off") return;
  if (!chatId) return;
  var pollBlock = mrrSheetWriteBlockReason();
  if (pollBlock) {
    var pollKey = chatId + "|" + pollBlock.code;
    if (mrrPollerBlockLogged !== pollKey) {
      mrrPollerBlockLogged = pollKey;
      log("runs-poller: standing down while sheet writes are blocked (" + pollBlock.code + ") — no fetch, no run marked processed, retrying each tick");
    }
    return;
  }
  mrrPollerBlockLogged = null;
  if (runsPollInFlight) {
    if (!runsPollStartedAt || mrrNow() - runsPollStartedAt < MRR_RUNS_POLL_STALL_MS) return;
    if (!runsPollStallWarned) {
      runsPollStallWarned = true;
      warn("runs-poller: a poll cycle has been in flight for over " + Math.round(MRR_RUNS_POLL_STALL_MS / 1e3) + "s (hung request?) — force-releasing the in-flight latch so polling can resume. Without this the poller stays dead for the rest of the session.");
    }
    runsPollInFlight = false;
  }
  runsPollInFlight = true;
  runsPollStartedAt = mrrNow();
  var pollToken = ++runsPollCycleToken;
  try {
    return mrrPollCustomAgentRunsInner(chatId, pollToken);
  } catch (e) {
    if (runsPollCycleToken === pollToken) {
      runsPollInFlight = false;
      runsPollStartedAt = 0;
    }
    warn("runs-poller: poll cycle threw synchronously (" + (e && e.message ? e.message : e) + ") — latch released, retrying next tick rather than stalling the poller permanently");
    return;
  }
}

function mrrPollCustomAgentRunsInner(chatId, pollToken) {
  var pollChatId = chatId;
  loadProcessedMessageIds(chatId);
  loadProcessedRunIds(chatId);
  apiFetch("/agents/runs/" + encodeURIComponent(chatId) + "/custom?limit=50").then(function(rows) {
    if (state.chatId !== pollChatId) return;
    if (!Array.isArray(rows)) return;
    if (MRR_RUNS_POLLER_MODE === "dump") {
      if (!runsPollDumpedOnce && rows.length) {
        runsPollDumpedOnce = true;
        log("runs-poller DUMP — inspect this row's output + messageId fields, confirm messageId matches the narrator data-message-id, then set MRR_RUNS_POLLER_MODE='apply': " + JSON.stringify(rows[0]));
      }
      return;
    }
    if (!runsBaselineExists) {
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
    var deferredThisPoll = 0, deferredMaxPolls = 0;
    var tagBearingRows = [];
    for (var i = 0; i < rows.length; i++) {
      var runId = extractRunId(rows[i]);
      if (runId != null && processedRunIds[runId]) continue;
      var text = extractRunText(rows[i]);
      var tags = text ? parseStateTags(text) : [];
      if (tags.length) {
        tagBearingRows.push({
          row: rows[i],
          runId,
          tags
        });
      } else if (runId != null) {
        processedRunIds[runId] = true;
        sawNew = true;
      }
    }
    function finishRunsPoll() {
      if (sawNew) saveProcessedRunIds();
      if (total) log("runs-poller: applied " + applied + "/" + total + " mutation(s) from custom-agent runs");
      if (deferredThisPoll) {
        log("runs-poller: " + deferredThisPoll + " run(s) deferred awaiting assistant anchor (poll " + deferredMaxPolls + "/" + MRR_RUN_ANCHOR_MAX_DEFERRALS + ")");
      }
    }
    if (!tagBearingRows.length) {
      finishRunsPoll();
      return;
    }
    var mutatorRulesetId = state.ruleset && state.ruleset.id;
    return Promise.all([ fetchSwipeIndexMap(chatId), mrrResolveMutatorConfigId(mutatorRulesetId) ]).then(function(hopResults) {
      var swipeMap = hopResults[0];
      var mutatorConfigId = hopResults[1];
      if (state.chatId !== pollChatId) return;
      if (runsPollCycleToken !== pollToken) return;
      if (mrrMutationJournalChatId !== pollChatId) {
        warn("pollCustomAgentRuns: journal scope mismatch at apply time — mrrMutationJournalChatId=" + mrrMutationJournalChatId + " but this poll belongs to pollChatId=" + pollChatId + ". Reloading before applying (this should not be reachable — if you see this warn, the round-17 static proof was wrong).");
        loadProcessedMessageIds(pollChatId);
      }
      try {
        for (var r = 0; r < tagBearingRows.length; r++) {
          var entry = tagBearingRows[r];
          if (mutatorConfigId != null && entry.row && entry.row.agentConfigId !== mutatorConfigId) {
            var offendingName = entry.row && entry.row.agentName || "(unknown agent)";
            if (!mrrSoleWriterWarnedAgents[offendingName]) {
              mrrSoleWriterWarnedAgents[offendingName] = true;
              warn("sole-writer: ignoring state tags from non-mutator agent '" + offendingName + "' — prompt leak");
            }
            if (entry.runId != null) {
              processedRunIds[entry.runId] = true;
              sawNew = true;
            }
            continue;
          }
          var rawAnchor = extractRunAnchor(entry.row, entry.runId);
          var rawMid = entry.row && (entry.row.messageId || entry.row.message_id || entry.row.message && entry.row.message.id);
          var anchorResolution = mrrResolveRunDomAnchor(pollChatId, rawMid);
          if (anchorResolution.status === "defer") {
            var deferKey = entry.runId != null ? entry.runId : "anchorless:" + rawMid;
            var deferrals = mrrRunAnchorDeferrals[deferKey] = (mrrRunAnchorDeferrals[deferKey] || 0) + 1;
            if (deferrals <= MRR_RUN_ANCHOR_MAX_DEFERRALS) {
              deferredThisPoll++;
              deferredMaxPolls = Math.max(deferredMaxPolls, deferrals);
              continue;
            }
            warn("runs-poller: BACKSTOP TRIPPED — run " + entry.runId + " waited " + deferrals + " polls (~" + Math.round(deferrals * ROUTE_POLL_MS / 1e3) + "s) for an assistant reply to anchor to and never got one. Applying under the raw messageId '" + rawMid + "': the mutation lands, but this bucket can NEVER be swipe-reverted. If you see this repeatedly, the run→assistant mapping is broken, not merely slow.");
          } else if (anchorResolution.status === "none" && !mrrRunAnchorFallbackWarned) {
            mrrRunAnchorFallbackWarned = true;
            warn("runs-poller: run " + entry.runId + " anchors to message '" + rawMid + "', which has later messages but no visible assistant reply among them — applying under the raw messageId (mutation lands, but this bucket cannot be swipe-reverted)");
          }
          var anchor = anchorResolution.status === "resolved" ? anchorResolution.anchor : rawAnchor;
          var mid = anchorResolution.status === "resolved" ? anchorResolution.anchor : rawMid;
          var journalKey = mid && swipeMap && Object.prototype.hasOwnProperty.call(swipeMap, mid) ? mrrProcessedKey(mid, swipeMap[mid]) : anchor;
          log("runs-poller: run " + entry.runId + " mid=" + rawMid + (mid === rawMid ? "" : " → anchor=" + mid) + " (" + anchorResolution.status + ") journalKey=" + journalKey);
          total += entry.tags.length;
          try {
            if (mid && swipeMap && Object.prototype.hasOwnProperty.call(swipeMap, mid)) {
              var pollTransition = mrrHandleSwipeTransition(mid, swipeMap[mid], mrrComputeIncomingSigs(entry.tags));
              if (pollTransition && pollTransition.reappliedFromJournal) mrrBucketChannelClaims[pollTransition.newBucketKey] = "poller";
            }
            applied += applyStateTagsWithDedup(entry.tags, anchor, journalKey, "poller");
            if (entry.runId != null) {
              processedRunIds[entry.runId] = true;
              sawNew = true;
            }
          } catch (e) {
            warn("runs-poller: row for anchor '" + anchor + "' threw while applying — not marked processed, will retry next poll (" + (e && e.message ? e.message : e) + ")");
          }
        }
      } finally {
        finishRunsPoll();
      }
    });
  }).catch(function(e) {
    warn("runs-poller: /agents/runs fetch failed (" + (e && e.message ? e.message : e) + ") — degrading; narrator path unaffected");
  }).then(releaseRunsPollLatch, releaseRunsPollLatch);
  function releaseRunsPollLatch() {
    if (runsPollCycleToken !== pollToken) return;
    runsPollInFlight = false;
    runsPollStartedAt = 0;
  }
}

function watchChatMessages() {
  var pendingTokens = Object.create(null);
  var nextToken = 0;
  var mrrMsgDeferCounts = Object.create(null);
  var MRR_MSG_DEFER_MAX_TRIES = 20;
  var mrrMsgUnboundWarnedChatId = null;
  function findParentMessage(el) {
    if (el && el.nodeType !== 1) el = el.parentElement;
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
    if (mrrIsPlaceholderMessageId(msgId)) return;
    var myToken = ++nextToken;
    pendingTokens[msgId] = myToken;
    marinara.setTimeout(function() {
      if (pendingTokens[msgId] !== myToken) return;
      delete pendingTokens[msgId];
      var msgBlock = mrrSheetWriteBlockReason();
      if (msgBlock) {
        if (msgBlock.code === "unbound") {
          if (mrrMsgUnboundWarnedChatId !== state.chatId) {
            mrrMsgUnboundWarnedChatId = state.chatId;
            warn("chat " + state.chatId + " is not bound to any ruleset — narrator state tags are being observed but NOT applied " + "(each observation is dropped unprocessed and stays unmarked, so it re-processes once the chat is bound). " + msgBlock.msg);
          }
          delete mrrMsgDeferCounts[msgId];
          return;
        }
        var tries = (mrrMsgDeferCounts[msgId] || 0) + 1;
        mrrMsgDeferCounts[msgId] = tries;
        if (tries <= MRR_MSG_DEFER_MAX_TRIES) {
          schedule(msgEl);
          return;
        }
        delete mrrMsgDeferCounts[msgId];
        warn("message " + msgId + " deferred " + MRR_MSG_DEFER_MAX_TRIES + " times while sheet writes were blocked (" + msgBlock.code + ") — dropping this observation UNPROCESSED (not marked applied) so a later reload can re-process it. " + msgBlock.msg);
        return;
      }
      delete mrrMsgDeferCounts[msgId];
      processChatMessage(msgEl);
    }, 1500);
  }
  var obs = new MutationObserver(function(records) {
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
  obs.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  marinara.onCleanup(function() {
    obs.disconnect();
  });
  loadProcessedMessageIds(state.chatId);
  var existing = document.querySelectorAll("[data-message-id]");
  for (var x = 0; x < existing.length; x++) {
    var el = existing[x];
    var mid = el.getAttribute("data-message-id");
    if (mrrIsPlaceholderMessageId(mid)) continue;
    if (mid && isMessageProcessed(mid, null)) continue;
    schedule(el);
  }
}

function init() {
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
  state.diceActiveModeId = "primary";
  state.diceBuiltModeId = null;
  addToLibrary(rs);
  state.chatId = getChatId();
  mrrCheckChatRulesetStamp(state.chatId);
  migrateLegacySheet(state.chatId);
  state.characters = loadCharacters(state.chatId);
  state.activeCharacterId = loadActiveCharacterId(state.chatId, state.characters[0].id);
  if (!state.characters.some(function(c) {
    return c.id === state.activeCharacterId;
  })) {
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
  mrrWatchSheetPanelUse();
  exposeDebug();
  log("activated ruleset " + rs.id + " v" + rs.version + " on chat " + (state.chatId || "(none)") + " as " + state.activeCharacterId);
  if (typeof scheduleAutoSync === "function") scheduleAutoSync();
}

function exposeDebug() {
  window.mrrDebug = {
    state: function() {
      return state;
    },
    dump: function() {
      var rows = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("mrr-") === 0) {
          var v = localStorage.getItem(k);
          rows.push({
            key: k,
            bytes: v ? v.length : 0
          });
        }
      }
      console.table(rows);
      return rows;
    },
    read: function(key) {
      var v = lsGet(key);
      if (!v) return null;
      try {
        return JSON.parse(v);
      } catch (e) {
        return v;
      }
    },
    forceSave: function() {
      flushSave();
      return "saved";
    }
  };
}

function watchRouteChanges() {
  var lastSeenChatId = state.chatId;
  marinara.setInterval(function() {
    pollCustomAgentRuns(state.chatId);
    mrrCheckChatRulesetStamp(state.chatId);
    mrrWatchAppliedChatPreset(state.chatId);
    var newId = getChatId();
    if (newId === lastSeenChatId) return;
    lastSeenChatId = newId;
    log("chatId changed: " + state.chatId + " -> " + newId);
    flushSave();
    state.chatId = newId;
    mrrResetRulesetLatch();
    mrrCheckChatRulesetStamp(newId);
    if (!state.ruleset) return;
    if (!newId) return;
    migrateLegacySheet(state.chatId);
    state.characters = loadCharacters(state.chatId);
    state.activeCharacterId = loadActiveCharacterId(state.chatId, state.characters[0].id);
    if (!state.characters.some(function(c) {
      return c.id === state.activeCharacterId;
    })) {
      state.activeCharacterId = state.characters[0].id;
      saveActiveCharacterId();
    }
    state.sheet = loadSheet(state.chatId, state.ruleset);
    renderSheet();
    state.collapsed = loadCollapsedPref(state.chatId);
    applyCollapsed(state.collapsed);
    loadProcessedMessageIds(state.chatId);
  }, ROUTE_POLL_MS);
}

function watchLifecycleSaves() {
  marinara.on(document, "visibilitychange", function() {
    if (document.visibilityState === "hidden") {
      flushSave();
    } else if (document.visibilityState === "visible") {
      if (hasServerStorage) mrrReconcileFromOtherTabs();
    }
  });
  marinara.on(window, "beforeunload", flushSave);
  marinara.on(window, "pagehide", flushSave);
}

var mrr_v20PathVirtueMap = {
  humanity: {
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
  caine: {
    description: "PATH OF CAINE. Virtues: Conviction + Instinct + Courage. Noddists hold that Caine is the only legitimate model — humanity is delusion, mortal morality contemptible. The goal is to study Noddist scripture and transcend through diablerie if necessary.",
    virtues: {
      "conscience-conviction": "conviction",
      "self-control-instinct": "instinct"
    }
  },
  beast: {
    description: "PATH OF THE BEAST. Virtues: Conviction + Instinct + Courage. The Beast is not the enemy — the Beast is the truth, and suppressing it is the lie. Hunt as predator, integrate rational mind with primal drive.",
    virtues: {
      "conscience-conviction": "conviction",
      "self-control-instinct": "instinct"
    }
  },
  night: {
    description: "PATH OF NIGHT. Virtues: Conviction + Instinct + Courage. Vampires as God's appointed instruments of damnation — expose latent sin in mortals and force confrontation with it. Suffering is sacrament; pain is pedagogy.",
    virtues: {
      "conscience-conviction": "conviction",
      "self-control-instinct": "instinct"
    }
  }
};

function mrrMoralityEnsureState() {
  if (!state.sheet || !state.ruleset || !state.ruleset.morality) return null;
  var m = state.ruleset.morality;
  if (!state.sheet.morality || typeof state.sheet.morality !== "object") {
    state.sheet.morality = {};
  }
  var bag = state.sheet.morality;
  if (typeof bag.rating !== "number") {
    bag.rating = m.rating && typeof m.rating.default === "number" ? m.rating.default : 7;
  }
  var paths = Array.isArray(m.paths) ? m.paths : [];
  if (typeof bag.path !== "string" || !paths.some(function(p) {
    return p && p.id === bag.path;
  })) {
    bag.path = paths.length ? paths[0].id : "humanity";
  }
  if (!bag.virtues || typeof bag.virtues !== "object") bag.virtues = {};
  var virtues = Array.isArray(m.virtues) ? m.virtues : [];
  var pathMap = mrr_v20PathVirtueMap[bag.path] || mrr_v20PathVirtueMap["humanity"] || {
    virtues: {}
  };
  virtues.forEach(function(v) {
    if (!v || typeof v.id !== "string") return;
    if (!bag.virtues[v.id] || typeof bag.virtues[v.id] !== "object") bag.virtues[v.id] = {};
    var entry = bag.virtues[v.id];
    if (typeof entry.value !== "number") {
      entry.value = typeof v.default === "number" ? v.default : 3;
    }
    if (Array.isArray(v.options) && v.options.length) {
      var pathActive = pathMap.virtues && pathMap.virtues[v.id];
      var validIds = v.options.map(function(o) {
        return o && o.id;
      });
      if (typeof entry.active !== "string" || validIds.indexOf(entry.active) === -1) {
        entry.active = pathActive && validIds.indexOf(pathActive) !== -1 ? pathActive : v.options[0] && v.options[0].id || null;
      }
    }
  });
  if (!state.sheet.derived || typeof state.sheet.derived !== "object") {
    state.sheet.derived = {};
  }
  virtues.forEach(function(v) {
    if (!v || typeof v.id !== "string") return;
    var entry = bag.virtues[v.id];
    if (!entry || typeof entry.value !== "number") return;
    if (Array.isArray(v.options) && v.options.length && entry.active) {
      var activeOpt = v.options.filter(function(o) {
        return o && o.id === entry.active;
      })[0];
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

function mrrRenderPathPicker(parent) {
  if (!parent || !state.ruleset || !state.ruleset.morality) return;
  var m = state.ruleset.morality;
  var paths = Array.isArray(m.paths) ? m.paths : [];
  if (!paths.length) return;
  var bag = mrrMoralityEnsureState();
  if (!bag) return;
  var row = marinara.addElement(parent, "div", {
    class: "mrr-morality__path-row"
  });
  if (!row) return;
  var select = marinara.addElement(row, "select", {
    class: "mrr-morality__path-select",
    "aria-label": "Path"
  });
  if (select) {
    paths.forEach(function(p) {
      if (!p || typeof p.id !== "string") return;
      var opt = marinara.addElement(select, "option", {
        value: p.id,
        textContent: p.label || p.id
      });
      if (opt && p.id === bag.path) opt.selected = true;
    });
    marinara.on(select, "change", function() {
      bag.path = select.value;
      var pathMap = mrr_v20PathVirtueMap[bag.path];
      if (pathMap && pathMap.virtues) {
        Object.keys(pathMap.virtues).forEach(function(vid) {
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
  var desc = pathMap && pathMap.description || "";
  if (desc) {
    marinara.addElement(row, "div", {
      class: "mrr-morality__path-desc",
      textContent: desc
    });
  }
}

function mrrRenderVirtueRow(parent, virtue) {
  if (!parent || !virtue || typeof virtue.id !== "string") return;
  var bag = mrrMoralityEnsureState();
  if (!bag) return;
  var entry = bag.virtues && bag.virtues[virtue.id];
  if (!entry) return;
  var lo = typeof virtue.min === "number" ? virtue.min : 1;
  var hi = typeof virtue.max === "number" ? virtue.max : 5;
  var row = marinara.addElement(parent, "div", {
    class: "mrr-morality__virtue"
  });
  if (!row) return;
  if (Array.isArray(virtue.options) && virtue.options.length) {
    var toggle = marinara.addElement(row, "div", {
      class: "mrr-morality__virtue-toggle",
      role: "group",
      "aria-label": virtue.label || virtue.id
    });
    virtue.options.forEach(function(opt) {
      if (!opt || typeof opt.id !== "string") return;
      var btn = marinara.addElement(toggle, "button", {
        type: "button",
        class: "mrr-morality__virtue-toggle-btn",
        "aria-pressed": entry.active === opt.id ? "true" : "false",
        textContent: opt.label || opt.id
      });
      if (!btn) return;
      marinara.on(btn, "click", function() {
        if (entry.active === opt.id) return;
        entry.active = opt.id;
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      });
    });
    var activeOpt = virtue.options.filter(function(o) {
      return o && o.id === entry.active;
    })[0];
    marinara.addElement(row, "span", {
      class: "mrr-morality__virtue-label",
      textContent: activeOpt && activeOpt.label || virtue.label || virtue.id
    });
  } else {
    marinara.addElement(row, "span", {
      class: "mrr-morality__virtue-label",
      textContent: virtue.label || virtue.id
    });
  }
  var stepper = marinara.addElement(row, "div", {
    class: "mrr-morality__virtue-stepper"
  });
  if (stepper) {
    var dec = marinara.addElement(stepper, "button", {
      type: "button",
      class: "mrr-morality__virtue-step",
      textContent: "−"
    });
    if (dec && entry.value <= lo) dec.disabled = true;
    marinara.addElement(stepper, "span", {
      class: "mrr-morality__virtue-value",
      textContent: String(entry.value)
    });
    var inc = marinara.addElement(stepper, "button", {
      type: "button",
      class: "mrr-morality__virtue-step",
      textContent: "+"
    });
    if (inc && entry.value >= hi) inc.disabled = true;
    if (dec) marinara.on(dec, "click", function() {
      entry.value = mrrMoralityClamp(entry.value - 1, lo, hi);
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    });
    if (inc) marinara.on(inc, "click", function() {
      entry.value = mrrMoralityClamp(entry.value + 1, lo, hi);
      saveSheet(state.chatId, state.sheet);
      renderSheet();
    });
  }
}

function mrrP3RenderMoralitySection(parent) {
  if (!parent || !state.ruleset || !state.ruleset.morality || !state.sheet) return;
  var m = state.ruleset.morality;
  var bag = mrrMoralityEnsureState();
  if (!bag) return;
  var cluster = marinara.addElement(parent, "div", {
    class: "mrr-morality"
  });
  if (!cluster) return;
  var header = marinara.addElement(cluster, "div", {
    class: "mrr-morality__header"
  });
  if (header) {
    marinara.addElement(header, "div", {
      class: "mrr-morality__title",
      textContent: "Morality"
    });
    var rating = marinara.addElement(header, "div", {
      class: "mrr-morality__rating"
    });
    if (rating) {
      marinara.addElement(rating, "span", {
        class: "mrr-morality__rating-label",
        textContent: m.rating && m.rating.label || "Path Rating"
      });
      var rLo = m.rating && typeof m.rating.min === "number" ? m.rating.min : 0;
      var rHi = m.rating && typeof m.rating.max === "number" ? m.rating.max : 10;
      var dec = marinara.addElement(rating, "button", {
        type: "button",
        class: "mrr-morality__rating-step",
        textContent: "−"
      });
      if (dec && bag.rating <= rLo) dec.disabled = true;
      marinara.addElement(rating, "span", {
        class: "mrr-morality__rating-value",
        textContent: String(bag.rating)
      });
      var inc = marinara.addElement(rating, "button", {
        type: "button",
        class: "mrr-morality__rating-step",
        textContent: "+"
      });
      if (inc && bag.rating >= rHi) inc.disabled = true;
      if (dec) marinara.on(dec, "click", function() {
        bag.rating = mrrMoralityClamp(bag.rating - 1, rLo, rHi);
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      });
      if (inc) marinara.on(inc, "click", function() {
        bag.rating = mrrMoralityClamp(bag.rating + 1, rLo, rHi);
        saveSheet(state.chatId, state.sheet);
        renderSheet();
      });
    }
  }
  mrrRenderPathPicker(cluster);
  var virtuesEl = marinara.addElement(cluster, "div", {
    class: "mrr-morality__virtues"
  });
  if (virtuesEl && Array.isArray(m.virtues)) {
    m.virtues.forEach(function(v) {
      mrrRenderVirtueRow(virtuesEl, v);
    });
  }
}

mrr_resourceRenderers["v20-health-track"] = function(resource, parent, ctx) {
  if (!parent || !resource) return;
  var cfg = resource.rendererConfig || {};
  var levels = Array.isArray(cfg.levels) ? cfg.levels : [];
  var damageTypes = Array.isArray(cfg.damageTypes) ? cfg.damageTypes : [];
  if (!levels.length) return;
  var typeIds = damageTypes.slice().sort(function(a, b) {
    return (a.severity || 0) - (b.severity || 0);
  }).map(function(d) {
    return d && d.label;
  }).filter(function(x) {
    return typeof x === "string" && x.length;
  });
  if (!typeIds.length) typeIds = [ "B", "L", "A" ];
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
    for (var i = 0; i < levels.length; i++) entry.track.push({
      type: null
    });
  }
  var damaged = entry.track.filter(function(b) {
    return b && b.type;
  }).length;
  entry.current = levels.length - damaged;
  var track = marinara.addElement(parent, "div", {
    class: "mrr-health-track"
  });
  if (!track) return;
  var grid = marinara.addElement(track, "div", {
    class: "mrr-health-track__levels"
  });
  if (grid) {
    levels.forEach(function(lvl, idx) {
      var col = marinara.addElement(grid, "div", {
        class: "mrr-health-track__level"
      });
      if (!col) return;
      var slot = entry.track[idx] || {
        type: null
      };
      var box = marinara.addElement(col, "button", {
        type: "button",
        class: "mrr-health-track__box",
        textContent: slot.type || "·",
        "aria-label": (lvl.label || "Level " + (idx + 1)) + " — damage " + (slot.type || "none")
      });
      if (box) {
        if (slot.type) box.setAttribute("data-damage", slot.type);
        marinara.on(box, "click", function() {
          var cur = slot.type;
          var nextIdx = cur === null || cur === undefined ? 0 : typeIds.indexOf(cur) + 1;
          slot.type = nextIdx >= typeIds.length ? null : typeIds[nextIdx];
          entry.track[idx] = slot;
          ctx.saveSheet(state.chatId, state.sheet);
          ctx.renderSheet();
        });
      }
      marinara.addElement(col, "div", {
        class: "mrr-health-track__label",
        textContent: lvl.label || ""
      });
      if (typeof lvl.penalty === "number" && lvl.penalty !== 0) {
        marinara.addElement(col, "div", {
          class: "mrr-health-track__penalty",
          textContent: (lvl.penalty > 0 ? "+" : "") + lvl.penalty
        });
      }
    });
  }
  var summary = marinara.addElement(track, "div", {
    class: "mrr-health-track__summary"
  });
  if (summary) {
    marinara.addElement(summary, "span", {
      textContent: levels.length - damaged + " / " + levels.length + " healthy"
    });
    var legend = marinara.addElement(summary, "span", {
      class: "mrr-health-track__legend"
    });
    if (legend) {
      typeIds.forEach(function(t) {
        marinara.addElement(legend, "code", {
          textContent: t
        });
      });
    }
  }
};

mrr_resourceRenderers["exalted-health-track"] = function(resource, parent, ctx) {
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

var mrrDisposed = false;

var mrrInitStarted = false;

marinara.onCleanup(function() {
  mrrDisposed = true;
  mrrBestEffortFlushOnCleanup();
});

function mrrInitOnce() {
  if (mrrInitStarted) return;
  mrrInitStarted = true;
  init();
}

hydrateStore().then(function() {
  if (!mrrDisposed) mrrInitOnce();
});