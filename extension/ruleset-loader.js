/*
 * Marinara-RPG-Rulesets — ruleset-loader.js
 * Client extension that overlays a custom RPG ruleset on Marinara Engine's
 * Game Mode UI. Reads ruleset.json (paste-blob or fetch-by-URL), renders a
 * replacement character sheet, and drives a dice-pool / single-roll widget.
 *
 * Pair with ruleset-loader.css.
 *
 * License: MIT
 * Source:  https://github.com/Kenhito/Marinara-RPG-Rulesets
 *
 * Runtime contract: Marinara invokes this file as
 *     new Function("marinara", source)(marinara)
 * so the entire file is a Function body (no import / export / top-level
 * await). All statements run at extension load.
 */

"use strict";

/* ─────  constants  ───── */

var LS_RULESET     = "marinara-rpg-ruleset";
var LS_RULESET_URL = "marinara-rpg-ruleset-url";
var LS_SHEET_PFX   = "mrr-sheet-";

var ROUTE_POLL_MS    = 1500;
var RELOAD_DELAY_MS  = 600;
var DEFAULT_BAR_MAX  = 10;
var DEFAULT_SKILL_MAX = 99;

var REQUIRED_FIELDS = ["id", "name", "version", "dice", "resolution", "attributes", "skills"];

var MODES = {
  SINGLE: "single-roll",
  POOL:   "dice-pool",
  D100:   "d100-percentile",
  PBTA:   "2d6-stat"
};

var BOTCH_TRIGGER = {
  ZERO:     "any-on-zero-successes",
  MAJORITY: "majority",
  ALWAYS:   "always-on-face"
};

var state = {
  ruleset: null,
  sheet:   null,
  chatId:  null,
  mountEl: null,
  diceEl:  null,
  dialogEl:null,
  gearEl:  null
};

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
    var rs = safeParse(text);
    var err = validateRuleset(rs);
    if (err) throw new Error("invalid ruleset: " + err);
    lsSet(LS_RULESET, JSON.stringify(rs));
    return rs;
  });
}

function getChatId() {
  var m = window.location.pathname.match(/\/chat\/([^/?#]+)/);
  if (m) return m[1];
  m = window.location.pathname.match(/\/game\/([^/?#]+)/);
  if (m) return m[1];
  return null;
}

function loadSheet(chatId, ruleset) {
  if (!chatId) return blankSheet(ruleset);
  var raw = lsGet(LS_SHEET_PFX + chatId);
  if (!raw) return blankSheet(ruleset);
  var parsed = safeParse(raw);
  if (!parsed) return blankSheet(ruleset);
  return mergeSheet(blankSheet(ruleset), parsed);
}

function saveSheet(chatId, sheet) {
  if (!chatId) return;
  lsSet(LS_SHEET_PFX + chatId, JSON.stringify(sheet));
}

function blankSheet(rs) {
  var s = { attributes: {}, skills: {}, derived: {}, states: {}, track: {} };
  rs.attributes.forEach(function (a) { s.attributes[a.name] = (a["default"] != null ? a["default"] : a.min); });
  rs.skills.forEach(function (k) { s.skills[k.name] = (k["default"] != null ? k["default"] : (k.min != null ? k.min : 0)); });
  if (Array.isArray(rs.derivedStats)) {
    rs.derivedStats.forEach(function (d) {
      if (d.renderAs === "track") s.track[d.name] = 0;
      else                         s.derived[d.name] = 0;
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
  return base;
}

function clamp(v, lo, hi) {
  if (typeof v !== "number" || isNaN(v)) return lo;
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
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

/* Stepper used by attributes, skills, derived values, derived bars.
   opts: { get(), set(v), min, max, onChange?(v) } */
function addStepper(parent, opts) {
  var stp = marinara.addElement(parent, "span", { className: "mrr-stepper" });
  if (!stp) return null;
  var minus = marinara.addElement(stp, "button", { textContent: "-" });
  var plus  = marinara.addElement(stp, "button", { textContent: "+" });
  function step(delta) {
    var current = opts.get();
    if (typeof current !== "number") current = 0;
    var lo = (opts.min != null) ? opts.min : 0;
    var hi = (opts.max != null) ? opts.max : DEFAULT_SKILL_MAX;
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
  var r = marinara.addElement(parent, "div", { className: "mrr-dice__row" });
  if (!r) return null;
  marinara.addElement(r, "label", { textContent: label });
  return marinara.addElement(r, "input", { className: "mrr-dice__input", type: "number", value: String(def), "data-mrr-input": key });
}

/* "Roll" + "Send to chat" footer for every widget. */
function diceFooter(parent, rollLabel, rollFn) {
  var btnRoll = marinara.addElement(parent, "button", { className: "mrr-dice__btn", textContent: rollLabel });
  var btnSend = marinara.addElement(parent, "button", { className: "mrr-dice__btn mrr-dice__btn--secondary mrr-dice__btn--row-spaced", textContent: "Send to chat" });
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

  if (state.mountEl && state.mountEl.parentNode) state.mountEl.parentNode.removeChild(state.mountEl);

  var host = findSheetContainer();
  if (!host) {
    state.mountEl = marinara.addElement(document.body, "div", { className: "mrr-sheet mrr-sheet--floating" });
    if (!state.mountEl) return;
  } else {
    hideBuiltInAttributesPanel(host);
    state.mountEl = marinara.addElement(host, "div", { className: "mrr-sheet" });
    if (!state.mountEl) return;
  }

  marinara.addElement(state.mountEl, "div", {
    className: "mrr-sheet__header",
    innerHTML:
      "<span class='mrr-sheet__title'>" + escapeHtml(state.ruleset.name) + "</span>" +
      "<span class='mrr-sheet__meta'>v" + escapeHtml(state.ruleset.version) + " &middot; " + escapeHtml(state.ruleset.dice.type) + "</span>"
  });

  var sections = (state.ruleset.sheetSections && state.ruleset.sheetSections.length)
    ? state.ruleset.sheetSections
    : ["attributes", "skills", "derived", "states"];

  sections.forEach(function (sec) {
    if (sec === "attributes") renderAttributes(state.mountEl);
    else if (sec === "skills") renderSkills(state.mountEl);
    else if (sec === "derived") renderDerived(state.mountEl);
    else if (sec === "states") renderStates(state.mountEl);
  });

  var actions = marinara.addElement(state.mountEl, "div", { className: "mrr-section" });
  if (actions) {
    var btnRoll = marinara.addElement(actions, "button", { className: "mrr-dice__btn", textContent: "Open dice widget" });
    var btnSync = marinara.addElement(actions, "button", { className: "mrr-dice__btn mrr-dice__btn--secondary mrr-dice__btn--row-spaced", textContent: "Sync sheet to chat fields" });
    if (btnRoll) marinara.on(btnRoll, "click", function () { showDice(true); });
    if (btnSync) marinara.on(btnSync, "click", syncSheetToChat);
  }
}

function renderAttributes(parent) {
  var sec = marinara.addElement(parent, "div", { className: "mrr-section" });
  if (!sec) return;
  marinara.addElement(sec, "div", { className: "mrr-section__title", textContent: "Attributes" });

  var groups = {};
  var groupOrder = [];
  state.ruleset.attributes.forEach(function (a) {
    var g = a.group || "";
    if (!(g in groups)) { groups[g] = []; groupOrder.push(g); }
    groups[g].push(a);
  });

  groupOrder.forEach(function (g) {
    var grpEl = marinara.addElement(sec, "div", { className: "mrr-group" });
    if (!grpEl) return;
    if (g) marinara.addElement(grpEl, "div", { className: "mrr-group__label", textContent: g });
    groups[g].forEach(function (a) { renderAttrRow(grpEl, a); });
  });
}

function renderAttrRow(parent, attr) {
  var row = marinara.addElement(parent, "div", { className: "mrr-row" });
  if (!row) return;
  marinara.addElement(row, "span", { className: "mrr-row__name", textContent: attr.name });
  marinara.addElement(row, "span", { className: "mrr-row__abbr", textContent: attr.abbreviation || "" });
  var val = marinara.addElement(row, "span", { className: "mrr-row__value", textContent: String(state.sheet.attributes[attr.name]) });

  addStepper(row, {
    get: function () { return state.sheet.attributes[attr.name]; },
    set: function (v) { state.sheet.attributes[attr.name] = v; saveSheet(state.chatId, state.sheet); },
    min: attr.min,
    max: attr.max,
    onChange: function (v) { if (val) val.textContent = String(v); }
  });
}

function renderSkills(parent) {
  var sec = marinara.addElement(parent, "div", { className: "mrr-section" });
  if (!sec) return;
  var title = (state.ruleset.id === "exalted3e") ? "Abilities" : "Skills";
  marinara.addElement(sec, "div", { className: "mrr-section__title", textContent: title });

  state.ruleset.skills.forEach(function (sk) { renderSkillRow(sec, sk); });
}

function renderSkillRow(parent, skill) {
  var row = marinara.addElement(parent, "div", { className: "mrr-row" });
  if (!row) return;
  marinara.addElement(row, "span", { className: "mrr-row__name", textContent: skill.name });
  marinara.addElement(row, "span", { className: "mrr-row__abbr", textContent: skill.linkedAttribute ? "(" + skill.linkedAttribute + ")" : "" });
  var val = marinara.addElement(row, "span", { className: "mrr-row__value", textContent: String(state.sheet.skills[skill.name]) });

  var stp = addStepper(row, {
    get: function () { return state.sheet.skills[skill.name]; },
    set: function (v) { state.sheet.skills[skill.name] = v; saveSheet(state.chatId, state.sheet); },
    min: skill.min != null ? skill.min : 0,
    max: skill.max != null ? skill.max : DEFAULT_SKILL_MAX,
    onChange: function (v) { if (val) val.textContent = String(v); }
  });
  if (!stp) return;
  var roll = marinara.addElement(stp, "button", { textContent: "roll", className: "mrr-row__roll" });
  if (roll) marinara.on(roll, "click", function () { quickRollForSkill(skill); });
}

function quickRollForSkill(skill) {
  var mode = state.ruleset.resolution.mode;
  if (mode === MODES.POOL) {
    var ability = state.sheet.skills[skill.name] || 0;
    var attr = 0;
    if (skill.linkedAttribute && state.sheet.attributes[skill.linkedAttribute] != null) {
      attr = state.sheet.attributes[skill.linkedAttribute];
    } else {
      var firstAttr = state.ruleset.attributes[0];
      attr = state.sheet.attributes[firstAttr.name] || 0;
    }
    showDice(true);
    var input = state.diceEl && state.diceEl.querySelector("[data-mrr-input='pool']");
    if (input) input.value = String(attr + ability);
  } else if (mode === MODES.SINGLE) {
    var mod = state.sheet.skills[skill.name] || 0;
    showDice(true);
    var modInput = state.diceEl && state.diceEl.querySelector("[data-mrr-input='mod']");
    if (modInput) modInput.value = String(mod);
  }
}

function renderDerived(parent) {
  if (!Array.isArray(state.ruleset.derivedStats) || !state.ruleset.derivedStats.length) return;
  var sec = marinara.addElement(parent, "div", { className: "mrr-section" });
  if (!sec) return;
  marinara.addElement(sec, "div", { className: "mrr-section__title", textContent: "Derived" });

  state.ruleset.derivedStats.forEach(function (d) {
    var wrap = marinara.addElement(sec, "div", { className: "mrr-derived" });
    if (!wrap) return;
    marinara.addElement(wrap, "div", { className: "mrr-derived__formula", textContent: d.name + " — " + d.formula });
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
  var row = marinara.addElement(parent, "div", { className: "mrr-row mrr-row--compact" });
  if (!row) return;
  var val = marinara.addElement(row, "span", { className: "mrr-row__value", textContent: String(state.sheet.derived[derived.name] || 0) });
  addStepper(row, {
    get: function () { return state.sheet.derived[derived.name] || 0; },
    set: function (v) { state.sheet.derived[derived.name] = v; saveSheet(state.chatId, state.sheet); },
    min: -999,
    max: 999,
    onChange: function (v) { if (val) val.textContent = String(v); }
  });
}

function renderBar(parent, derived) {
  var bar = marinara.addElement(parent, "div", { className: "mrr-bar" });
  if (!bar) return;
  var fill = marinara.addElement(bar, "div", { className: "mrr-bar__fill" });
  var label = marinara.addElement(bar, "div", { className: "mrr-bar__label" });
  var max = derived.max || DEFAULT_BAR_MAX;
  function refresh() {
    var v = state.sheet.derived[derived.name] || 0;
    if (fill) fill.style.width = Math.max(0, Math.min(100, (v / max) * 100)) + "%";
    if (label) label.textContent = v + " / " + max;
  }
  refresh();

  var ctrl = marinara.addElement(parent, "div", { className: "mrr-state" });
  if (!ctrl) return;
  addStepper(ctrl, {
    get: function () { return state.sheet.derived[derived.name] || 0; },
    set: function (v) { state.sheet.derived[derived.name] = v; saveSheet(state.chatId, state.sheet); },
    min: 0,
    max: max,
    onChange: refresh
  });
}

function renderTrack(parent, derived) {
  var track = marinara.addElement(parent, "div", { className: "mrr-track" });
  if (!track) return;
  var cells = [];

  function refresh() {
    var filled = state.sheet.track[derived.name] || 0;
    cells.forEach(function (c, idx) {
      var cls = "mrr-track__cell";
      if (idx < filled) cls += " mrr-track__cell--filled";
      if (idx === filled - 1 && filled > 0) cls += " mrr-track__cell--active";
      c.className = cls;
    });
  }

  derived.track.forEach(function (cell, idx) {
    var c = marinara.addElement(track, "div", {
      title: "penalty " + cell.penalty,
      textContent: cell.label
    });
    if (!c) return;
    cells.push(c);
    marinara.on(c, "click", function () {
      var current = state.sheet.track[derived.name] || 0;
      state.sheet.track[derived.name] = (current === idx + 1) ? idx : idx + 1;
      saveSheet(state.chatId, state.sheet);
      refresh();
    });
  });
  refresh();
}

function renderStates(parent) {
  if (!Array.isArray(state.ruleset.states) || !state.ruleset.states.length) return;
  var sec = marinara.addElement(parent, "div", { className: "mrr-section" });
  if (!sec) return;
  marinara.addElement(sec, "div", { className: "mrr-section__title", textContent: "States" });

  state.ruleset.states.forEach(function (st) {
    var row = marinara.addElement(sec, "div", { className: "mrr-state" });
    if (!row) return;
    marinara.addElement(row, "span", { className: "mrr-state__name", textContent: st.name });
    var sel = marinara.addElement(row, "select", { className: "mrr-state__select" });
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

/* ─────  dice widget  ───── */

function buildDice() {
  if (state.diceEl) return state.diceEl;
  state.diceEl = marinara.addElement(document.body, "div", { className: "mrr-dice" });
  if (!state.diceEl) return null;

  var header = marinara.addElement(state.diceEl, "div", { className: "mrr-dice__header" });
  if (header) {
    marinara.addElement(header, "span", { className: "mrr-dice__title", textContent: "Dice — " + state.ruleset.name });
    var close = marinara.addElement(header, "button", { className: "mrr-dice__close", innerHTML: "&times;" });
    if (close) marinara.on(close, "click", function () { showDice(false); });
  }

  var mode = state.ruleset.resolution.mode;
  if      (mode === MODES.POOL)   buildPoolWidget();
  else if (mode === MODES.SINGLE) buildSingleRollWidget();
  else if (mode === MODES.D100)   buildD100Widget();
  else if (mode === MODES.PBTA)   buildPbtaWidget();
  else marinara.addElement(state.diceEl, "div", { className: "mrr-msg mrr-msg--err", textContent: "Unsupported resolution mode: " + mode });

  marinara.addElement(state.diceEl, "div", { className: "mrr-dice__result mrr-dice__result--hidden", id: "mrr-dice-result" });
  return state.diceEl;
}

function buildSingleRollWidget() {
  var d = state.diceEl;
  diceRow(d, "Modifier",    "mod",  "0");
  diceRow(d, "Proficiency", "prof", "0");
  diceRow(d, "DC",          "dc",   "15");
  diceFooter(d, "Roll d20", rollSingleRoll);
}

function buildPoolWidget() {
  var d = state.diceEl;
  diceRow(d, "Pool",       "pool",  "5");
  diceRow(d, "Difficulty", "diff",  "2");
  diceRow(d, "Stunt",      "stunt", "0");
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

var lastRollText = null;

function rollSingleRoll() {
  var mod  = numFromInput("mod",  0);
  var prof = numFromInput("prof", 0);
  var dc   = numFromInput("dc",   15);
  var face = 1 + Math.floor(Math.random() * 20);
  var total = face + mod + prof;
  var pass = total >= dc;
  var label = pass ? "success" : "failure";
  var text = "[dice: 1d20+" + mod + (prof ? "+" + prof : "") + " vs DC" + dc + " = " + total + " " + label + " (face " + face + ")]";
  finalizeRoll(text, pass ? "success" : "fail", null);
}

function rollDicePool() {
  var pool  = Math.max(0, numFromInput("pool", 1));
  var diff  = Math.max(0, numFromInput("diff", 2));
  var stunt = clamp(numFromInput("stunt", 0), 0, 2);
  var totalDice = pool + stunt;
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

function showResult(text, kind, faces) {
  if (!state.diceEl) return;
  var prev = state.diceEl.querySelector("#mrr-dice-result");
  if (prev) prev.parentNode.removeChild(prev);
  var box = marinara.addElement(state.diceEl, "div", { className: "mrr-dice__result mrr-dice__result--" + kind, id: "mrr-dice-result" });
  if (!box) return;
  marinara.addElement(box, "div", { textContent: text });
  if (faces && faces.length) {
    var row = marinara.addElement(box, "div", { className: "mrr-dice__faces" });
    if (row) faces.forEach(function (f) { marinara.addElement(row, "span", { className: f.cls, textContent: String(f.face) }); });
  }
}

function sendLastRoll() {
  if (!lastRollText) return;
  insertIntoChatInput(lastRollText);
}

function showDice(open) {
  if (!state.diceEl) buildDice();
  if (!state.diceEl) return;
  if (open) state.diceEl.classList.add("mrr-dice--open");
  else      state.diceEl.classList.remove("mrr-dice--open");
}

/* ─────  ruleset switcher dialog + header gear  ───── */

function buildHeaderGear() {
  if (state.gearEl && state.gearEl.parentNode) return;
  var headers = document.querySelectorAll("header, [role='banner']");
  var anchor = null;
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].offsetParent !== null) { anchor = headers[i]; break; }
  }
  if (!anchor) anchor = document.body;

  state.gearEl = marinara.addElement(anchor, "button", {
    className: "mrr-gear-btn",
    textContent: "Ruleset" + (state.ruleset ? ": " + state.ruleset.name : "")
  });
  if (state.gearEl) marinara.on(state.gearEl, "click", openDialog);
}

function openDialog() {
  if (state.dialogEl) {
    state.dialogEl.classList.add("mrr-dialog-backdrop--open");
    return;
  }
  state.dialogEl = marinara.addElement(document.body, "div", { className: "mrr-dialog-backdrop" });
  if (!state.dialogEl) return;
  state.dialogEl.classList.add("mrr-dialog-backdrop--open");

  var dialog = marinara.addElement(state.dialogEl, "div", { className: "mrr-dialog" });
  if (!dialog) return;

  marinara.addElement(dialog, "h3", { textContent: "Marinara RPG Ruleset" });
  marinara.addElement(dialog, "p", {
    textContent: "Paste a ruleset.json below, or paste a URL to fetch one. Clear both fields and Save to deactivate."
  });

  var urlRow = marinara.addElement(dialog, "div", { className: "mrr-dialog__row" });
  var urlInput = null;
  if (urlRow) {
    marinara.addElement(urlRow, "label", { className: "mrr-dialog__label", textContent: "URL" });
    urlInput = marinara.addElement(urlRow, "input", {
      className: "mrr-dice__input",
      type: "text",
      value: lsGet(LS_RULESET_URL) || "",
      placeholder: "https://raw.githubusercontent.com/Kenhito/Marinara-RPG-Rulesets/main/rulesets/exalted3e/ruleset.json"
    });
  }

  marinara.addElement(dialog, "p", { textContent: "Or paste the ruleset JSON directly:" });
  var ta = marinara.addElement(dialog, "textarea", {});
  if (ta) ta.value = lsGet(LS_RULESET) || "";

  var msg = marinara.addElement(dialog, "div", { className: "mrr-msg mrr-msg--info mrr-msg--hidden" });

  var buttons = marinara.addElement(dialog, "div", { className: "mrr-dialog__buttons" });
  if (buttons) {
    var btnFetch = marinara.addElement(buttons, "button", { className: "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Fetch URL" });
    var btnClear = marinara.addElement(buttons, "button", { className: "mrr-dice__btn mrr-dice__btn--secondary", textContent: "Clear" });
    var btnSave  = marinara.addElement(buttons, "button", { className: "mrr-dice__btn", textContent: "Save and reload" });

    if (btnFetch) marinara.on(btnFetch, "click", function () {
      if (!urlInput || !urlInput.value) { setMsg(msg, "Enter a URL first.", "err"); return; }
      lsSet(LS_RULESET_URL, urlInput.value);
      setMsg(msg, "Fetching ...", "info");
      fetchRulesetFromUrl(urlInput.value).then(function (rs) {
        if (ta) ta.value = JSON.stringify(rs, null, 2);
        setMsg(msg, "Fetched " + rs.name + " v" + rs.version + " — click Save to activate.", "ok");
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
      var err = validateRuleset(parsed);
      if (err) { setMsg(msg, "Invalid: " + err, "err"); return; }
      lsSet(LS_RULESET, JSON.stringify(parsed));
      if (urlInput && urlInput.value) lsSet(LS_RULESET_URL, urlInput.value);
      setMsg(msg, "Saved. Reloading ...", "ok");
      marinara.setTimeout(function () { window.location.reload(); }, RELOAD_DELAY_MS);
    });
  }

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

/* ─────  sync sheet to chat customTrackerFields  ───── */

function syncSheetToChat() {
  if (!state.chatId) { warn("no chat id; cannot sync"); return; }
  var fields = [];
  Object.keys(state.sheet.attributes).forEach(function (n) { fields.push({ name: n, value: String(state.sheet.attributes[n]) }); });
  Object.keys(state.sheet.skills).forEach(function (n) { fields.push({ name: n, value: String(state.sheet.skills[n]) }); });
  Object.keys(state.sheet.derived).forEach(function (n) { fields.push({ name: n, value: String(state.sheet.derived[n]) }); });
  Object.keys(state.sheet.states).forEach(function (n) { fields.push({ name: n, value: String(state.sheet.states[n]) }); });

  marinara.apiFetch("/chats/" + state.chatId, {
    method: "PATCH",
    body: JSON.stringify({ customTrackerFields: fields })
  }).then(function () {
    log("synced " + fields.length + " fields to chat " + state.chatId);
  }).catch(function (e) {
    warn("sync failed: " + (e && e.message ? e.message : e));
  });
}

/* ─────  init  ───── */

function init() {
  var rs = loadRuleset();
  buildHeaderGear();
  if (!rs) {
    warn("no active ruleset; extension is dormant. Click the Ruleset button to configure.");
    return;
  }
  state.ruleset = rs;
  state.chatId  = getChatId();
  state.sheet   = loadSheet(state.chatId, rs);
  renderSheet();
  buildDice();
  watchRouteChanges();
  log("activated ruleset " + rs.id + " v" + rs.version + " on chat " + (state.chatId || "(none)"));
}

/* SPAs use history.pushState which does NOT fire popstate. Polling is the
   portable way to detect Marinara's chat navigation. Only runs after a
   ruleset has activated; dormant tabs do no work. */
function watchRouteChanges() {
  var lastPath = window.location.pathname;
  marinara.setInterval(function () {
    if (window.location.pathname === lastPath) return;
    lastPath = window.location.pathname;
    var newId = getChatId();
    if (newId === state.chatId) return;
    state.chatId = newId;
    if (state.ruleset) {
      state.sheet = loadSheet(state.chatId, state.ruleset);
      renderSheet();
    }
  }, ROUTE_POLL_MS);
}

init();
