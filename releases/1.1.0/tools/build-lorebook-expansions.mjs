#!/usr/bin/env node
/**
 * build-lorebook-expansions.mjs — Vector 2 generator.
 *
 * Derives ruleset-aware lorebook entries from a Marinara ruleset.json
 * spec — one entry per attribute, one per skill, one per condition, one
 * per derived stat (when described), plus a single difficulty-ladder
 * reference entry. The build pipeline merges these into the bundle's
 * lorebook entries; hand-authored entries with the same `name` win.
 *
 * Why this matters: the engine fires lorebook entries on keyword match.
 * Every time the AI or the user mentions "strength" / "wits" /
 * "stealth" / "DC" / "difficulty" in conversation, the matching
 * derived entry surfaces ruleset-specific definition into the
 * generation context. The GM agent prompt + hand-authored entries
 * already do part of this; the auto-derivation closes coverage gaps
 * without bundle authors having to hand-write 25+ skill entries.
 *
 * Idempotency story: derived entries are merged into the bundle's
 * lorebook entries AT BUILD TIME. The bundle install path already does
 * delete-then-add for the managed lorebook (see RPG-Extension JS
 * installBundle), so re-builds don't accumulate at install time.
 * No install-time tracking field needed.
 *
 * Author override > derivation:
 *   1. If ruleset.lorebookExpansions is an array, return it verbatim.
 *   2. At merge time (in build-bundle.mjs), hand-authored entries in
 *      lorebook.json win on name conflict.
 *
 * Usage:
 *   import buildLorebookExpansions from "./tools/build-lorebook-expansions.mjs";
 *   const entries = buildLorebookExpansions(ruleset);
 *
 *   # CLI for inspection
 *   node tools/build-lorebook-expansions.mjs rulesets/exalted3e/ruleset.json
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

function baseEntry(over) {
  return Object.assign({
    name: "",
    keys: [],
    content: "",
    position: 0,
    selective: false,
    constant: false
  }, over);
}

function uniqLowerCaseKeys(keys) {
  const seen = new Set();
  const out = [];
  for (const k of keys) {
    if (!k) continue;
    const norm = String(k).trim();
    if (!norm) continue;
    const key = norm.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(norm);
  }
  return out;
}

function attributeEntry(ruleset, attr) {
  const name = attr.name || attr.id || "Unknown";
  const abbr = attr.abbreviation || null;
  const group = attr.group ? " [" + attr.group + "]" : "";
  const desc = attr.description || "(no description supplied)";
  const keys = uniqLowerCaseKeys([name, abbr].filter(Boolean));
  return baseEntry({
    name: "Attribute: " + name + (abbr ? " (" + abbr + ")" : ""),
    keys: keys,
    content: ruleset.name + " attribute. " + name + (abbr ? " (" + abbr + ")" : "") + group + " — " + desc
  });
}

function skillEntry(ruleset, skill) {
  const name = skill.name || skill.id || "Unknown";
  const attribute = skill.attribute ? " Associated attribute: " + skill.attribute + "." : "";
  const desc = skill.description || "";
  const content = ruleset.name + " skill. " + name + "." + attribute +
    (desc ? " " + desc : "");
  return baseEntry({
    name: "Skill: " + name,
    keys: uniqLowerCaseKeys([name]),
    content: content
  });
}

function conditionEntry(ruleset, condition) {
  const name = condition.name || condition.id || "Unknown";
  const desc = condition.description || condition.effect || "(no description supplied)";
  return baseEntry({
    name: "Condition: " + name,
    keys: uniqLowerCaseKeys([name]),
    content: ruleset.name + " condition. " + name + " — " + desc
  });
}

function derivedStatEntry(ruleset, stat) {
  const name = stat.name || stat.id || null;
  if (!name) return null;
  const desc = stat.description || stat.tooltip || "";
  const formula = stat.valueFormula || stat.formula || "";
  if (!desc && !formula) return null; // skip if nothing useful to say
  const content = ruleset.name + " derived stat. " + name +
    (formula ? " — formula: " + formula : "") +
    (desc ? ". " + desc : "");
  return baseEntry({
    name: "Derived stat: " + name,
    keys: uniqLowerCaseKeys([name]),
    content: content
  });
}

function difficultyLadderEntry(ruleset) {
  const diffs = ruleset.difficulties;
  if (!diffs || typeof diffs !== "object") return null;
  const lines = [];
  lines.push(ruleset.name + " difficulty ladder. Threshold values needed for success:");
  for (const [bandName, body] of Object.entries(diffs)) {
    const t = body && typeof body.threshold === "number" ? body.threshold : "?";
    const d = body && body.description ? body.description : "";
    lines.push("- " + bandName + " (threshold " + t + ")" + (d ? " — " + d : ""));
  }
  return baseEntry({
    name: "Difficulty ladder reference",
    keys: uniqLowerCaseKeys(["DC", "difficulty", "target number", "TN", "threshold", "thresholds"]),
    content: lines.join("\n")
  });
}

/* Vector 2 derivation. Returns LorebookEntry[] (matching the existing
   lorebook entry shape). Empty array is a valid no-op. */
export default function buildLorebookExpansions(ruleset) {
  if (!ruleset || typeof ruleset !== "object") {
    throw new Error("buildLorebookExpansions: ruleset must be an object");
  }
  if (!ruleset.id || !ruleset.name) {
    throw new Error("buildLorebookExpansions: ruleset.id and ruleset.name are required");
  }

  /* Author override > derivation. */
  if (Array.isArray(ruleset.lorebookExpansions)) {
    return ruleset.lorebookExpansions.slice();
  }

  const out = [];

  if (Array.isArray(ruleset.attributes)) {
    for (const a of ruleset.attributes) out.push(attributeEntry(ruleset, a));
  }
  if (Array.isArray(ruleset.skills)) {
    for (const s of ruleset.skills) out.push(skillEntry(ruleset, s));
  }
  if (Array.isArray(ruleset.conditions)) {
    for (const c of ruleset.conditions) out.push(conditionEntry(ruleset, c));
  }
  if (Array.isArray(ruleset.derivedStats)) {
    for (const d of ruleset.derivedStats) {
      const e = derivedStatEntry(ruleset, d);
      if (e) out.push(e);
    }
  }
  const ladder = difficultyLadderEntry(ruleset);
  if (ladder) out.push(ladder);

  return out;
}

/* CLI entry point */
const isMain = (() => {
  try { return import.meta.url === "file://" + process.argv[1]; }
  catch { return false; }
})();
if (isMain) {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node tools/build-lorebook-expansions.mjs <path/to/ruleset.json>");
    process.exit(2);
  }
  const ruleset = JSON.parse(readFileSync(resolve(arg), "utf8"));
  const entries = buildLorebookExpansions(ruleset);
  console.log(JSON.stringify(entries, null, 2));
}
