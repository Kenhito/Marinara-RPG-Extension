#!/usr/bin/env node
/**
 * build-regex-scripts.mjs — Vector 9 generator.
 *
 * Derives an array of engine-native RegexScript objects from a Marinara
 * ruleset.json spec. The build pipeline embeds the result as the bundle's
 * `regexScripts` field; the extension installer POSTs each entry to
 * Marinara's `/regex-scripts` API. Server-side d20 math runs regardless —
 * these scripts rewrite engine-emitted SURFACE text in AI output so the
 * user sees ruleset-flavored prose instead of d20-default vocabulary.
 *
 * Author override > derivation: if ruleset.json ships its own
 * `regexScripts` array, this generator returns it verbatim.
 *
 * Engine shape (packages/shared/src/types/regex.ts) — server assigns id,
 * createdAt, updatedAt. The bundle ships everything else.
 *
 * Usage:
 *   import buildRegexScripts from "./tools/build-regex-scripts.mjs";
 *   const scripts = buildRegexScripts(ruleset);
 *
 *   # CLI for ad-hoc inspection
 *   node tools/build-regex-scripts.mjs rulesets/exalted3e/ruleset.json
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

function baseScript(over) {
  return Object.assign({
    enabled: true,
    findRegex: "",
    replaceString: "",
    trimStrings: [],
    placement: ["ai_output"],
    flags: "gi",
    promptOnly: false,
    order: 100,
    minDepth: null,
    maxDepth: null
  }, over);
}

/* Vector 9 derivation. Conservative on purpose: the gmAgent prompt and
   the lorebook do the heavy lifting on ruleset vocabulary; regex scripts
   only catch the surface tags and bracket phrasing the engine emits
   regardless of what the AI was instructed to do. Over-rewriting risks
   silent narration breakage. */
export default function buildRegexScripts(ruleset) {
  if (!ruleset || typeof ruleset !== "object") {
    throw new Error("buildRegexScripts: ruleset must be an object");
  }
  if (!ruleset.id || !ruleset.name) {
    throw new Error("buildRegexScripts: ruleset.id and ruleset.name are required");
  }

  /* Author override wins. Pass through verbatim — the schema still
     validates each entry; this generator does no shape massaging. */
  if (Array.isArray(ruleset.regexScripts)) {
    return ruleset.regexScripts.slice();
  }

  const out = [];
  const diceType = ruleset.dice && typeof ruleset.dice.type === "string" ? ruleset.dice.type.toLowerCase() : "";
  const isD20Ruleset = diceType === "d20";
  const hasDifficulties = ruleset.difficulties && typeof ruleset.difficulties === "object";
  const initiativeTerm = typeof ruleset.initiativeTerminology === "string" && ruleset.initiativeTerminology.trim();

  /* No-op short-circuit: d20 dice with no initiative remap = engine
     default vocabulary already matches the ruleset. The DC/skill_check
     surface that the engine emits IS what dnd5e / pf2e players expect
     to see. Rewriting would corrupt the surface, not improve it. */
  if (isD20Ruleset && !initiativeTerm) {
    return [];
  }

  /* 1. [skill_check: ...] tag rewrite. Fires for any non-d20 ruleset.
     The engine emits this tag with d20-shaped attributes regardless of
     ruleset; the rewrite keeps the success/failure verdict and reframes
     the threshold from "DC N" to "difficulty N" — the gmAgent prompt
     teaches the AI the ruleset's full mapping table. */
  if (!isD20Ruleset) {
    out.push(baseScript({
      name: "skill_check tag → " + ruleset.name + " surface",
      findRegex: "\\[skill_check:\\s*dc=\"(\\d+)\"\\s+rolls=\"(\\d+)\"(?:\\s+modifier=\"([+-]?\\d+)\")?(?:\\s+total=\"(-?\\d+)\")?\\s+result=\"(success|failure|critical|fumble)\"\\s*\\]",
      replaceString: "$5 — rolled against difficulty $1",
      flags: "gi",
      order: 100
    }));
  }

  /* 2. DC mention rewrite. Fires when difficulties is present AND
     ruleset is non-d20. Conservative: swap the "DC" token to
     "difficulty"; numeric value stays. The gmAgent prompt teaches the
     player-facing mapping table (e.g. Exalted threshold-vs-DC). */
  if (hasDifficulties && !isD20Ruleset) {
    out.push(baseScript({
      name: "DC mention → " + ruleset.name + " difficulty",
      findRegex: "\\bDC\\s+(\\d+)\\b",
      replaceString: "difficulty $1",
      flags: "gi",
      order: 110
    }));
  }

  /* 3. Initiative rewrite. Fires only when ruleset explicitly maps it. */
  if (initiativeTerm) {
    out.push(baseScript({
      name: "initiative → " + ruleset.name,
      findRegex: "\\binitiative\\b",
      replaceString: initiativeTerm,
      flags: "gi",
      order: 120
    }));
  }

  return out;
}

/* CLI entry point — `node tools/build-regex-scripts.mjs <ruleset.json>`
   prints the derived array to stdout for inspection. */
const isMain = (() => {
  try { return import.meta.url === "file://" + process.argv[1]; }
  catch { return false; }
})();
if (isMain) {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node tools/build-regex-scripts.mjs <path/to/ruleset.json>");
    process.exit(2);
  }
  const ruleset = JSON.parse(readFileSync(resolve(arg), "utf8"));
  const scripts = buildRegexScripts(ruleset);
  console.log(JSON.stringify(scripts, null, 2));
}
