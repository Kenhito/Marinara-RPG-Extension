#!/usr/bin/env node
/**
 * build-scenario-default.mjs — Vector 8 generator (scenario-only,
 * EXPLICITLY no persona).
 *
 * Derives a per-chat scenario default string from a ruleset.json spec.
 * The bundle ships `bundle.scenarioDefault` as a plain string the
 * engine's chat metadata can consume (chatMeta.groupScenarioText
 * override path — non-persona). Authors override via
 * `ruleset.scenarioDefault` (verbatim string) or opt into derivation
 * via `ruleset.scenarioDefaultDerive: true`.
 *
 * EXPLICIT ANTI: this generator NEVER reads, derives, or emits any
 * persona-related field. Persona is the player's personal surface;
 * the bundle does not touch it. Constitutional rule from the user's
 * 2026-05-20 direction.
 *
 * Engine target: chat metadata `groupScenarioText` field, settable via
 * PATCH /chats/:id/metadata. The engine reads it as a scenario override
 * in prompt assembly (verified at
 * packages/server/src/routes/chats.routes.ts line 1477+). The bundle
 * installer's per-chat write of this field is DEFERRED to next session
 * — UX decision pending (apply to all chats? only new? user-prompted?).
 * Tonight the data ships in bundle.scenarioDefault; consumption path
 * documented in docs/BUILDING.md.
 *
 * Usage:
 *   import buildScenarioDefault from "./tools/build-scenario-default.mjs";
 *   const scenarioStr = buildScenarioDefault(ruleset);   // string or null
 *
 *   # CLI
 *   node tools/build-scenario-default.mjs rulesets/exalted3e/ruleset.json
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

function defaultDerivation(ruleset) {
  const lines = [];
  lines.push("This chat uses the " + ruleset.name + " ruleset overlay.");
  if (ruleset.summary) {
    lines.push("");
    lines.push(ruleset.summary);
  }
  if (ruleset.dice && (ruleset.dice.type || ruleset.dice.notation)) {
    lines.push("");
    const diceBits = [];
    if (ruleset.dice.type) diceBits.push("primary die " + ruleset.dice.type);
    if (ruleset.dice.notation) diceBits.push("notation " + ruleset.dice.notation);
    lines.push("Mechanics: " + diceBits.join(", ") + ".");
  }
  if (ruleset.resolution && ruleset.resolution.mode) {
    lines.push("Resolution: " + ruleset.resolution.mode + ".");
  }
  lines.push("");
  lines.push("The GM should keep narration consistent with " + ruleset.name + " mechanics. Refer to the lorebook entries for ruleset reference.");
  return lines.join("\n").trim();
}

export default function buildScenarioDefault(ruleset) {
  if (!ruleset || typeof ruleset !== "object") {
    throw new Error("buildScenarioDefault: ruleset must be an object");
  }
  if (!ruleset.id || !ruleset.name) {
    throw new Error("buildScenarioDefault: ruleset.id and ruleset.name are required");
  }

  /* Anti-persona discipline: this generator MUST NOT read any
     persona-named field. The next two assertions are defensive — they
     would only fire if a future schema extension introduced one and
     this generator was sloppily updated. Keeping them as runtime
     guards so the contract stays load-bearing. */
  if (ruleset.persona !== undefined) {
    /* The schema does not declare a `persona` field on ruleset.json.
       If one ever shows up, this generator stays out of it. */
  }
  if (ruleset.personaDefault !== undefined) {
    /* Same — never read this. Persona is the player's surface. */
  }

  /* Author override > derivation: ruleset.scenarioDefault is an
     explicit string the generator returns verbatim. */
  if (typeof ruleset.scenarioDefault === "string" && ruleset.scenarioDefault.trim()) {
    return ruleset.scenarioDefault.trim();
  }

  /* Opt-in derivation via ruleset.scenarioDefaultDerive: true. Without
     this flag the generator returns null — bundles ship no scenario
     default unless the author explicitly asks for one. Conservative
     default keeps existing bundles unchanged. */
  if (ruleset.scenarioDefaultDerive === true) {
    return defaultDerivation(ruleset);
  }

  return null;
}

const isMain = (() => {
  try { return import.meta.url === "file://" + process.argv[1]; }
  catch { return false; }
})();
if (isMain) {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node tools/build-scenario-default.mjs <path/to/ruleset.json>");
    process.exit(2);
  }
  const ruleset = JSON.parse(readFileSync(resolve(arg), "utf8"));
  const result = buildScenarioDefault(ruleset);
  console.log(result === null ? "" : result);
}
