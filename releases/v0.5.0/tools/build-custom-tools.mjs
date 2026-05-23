#!/usr/bin/env node
/**
 * build-custom-tools.mjs — Vector 3 generator (static reference tools).
 *
 * Derives an array of engine-native CustomTool entries from a Marinara
 * ruleset.json spec. Tonight's slice ships ONLY `executionType: "static"`
 * tools — they don't require the CUSTOM_TOOL_SCRIPT_ENABLED env var and
 * work out of the box on any self-hosted Marinara install where the
 * caller has privileged access.
 *
 * What a static tool buys: the AI can call it mid-generation via the
 * engine's tool-use machinery and get back a deterministic ruleset
 * reference string instead of paraphrasing the lorebook from memory.
 * One tool per ruleset = focused, low-noise install.
 *
 * Future Vector 3.1: when CUSTOM_TOOL_SCRIPT_ENABLED is on, bundles can
 * additionally ship `executionType: "script"` tools that do actual
 * ruleset math (dice pools, success counting, etc). Not in tonight's
 * scope — see docs/BUILDING.md for the deferred-script-tool design.
 *
 * Engine reference (verified 2026-05-17):
 *   schema:  packages/shared/src/schemas/custom-tool.schema.ts
 *   routes:  packages/server/src/routes/custom-tools.routes.ts
 *
 * Engine constraints honored here:
 *   - Tool name regex: ^[a-z][a-z0-9_]*$  (lowercase snake_case, ≤100 chars)
 *   - Description: 1-500 chars
 *   - parametersSchema: Record<string, unknown> (we ship {} for static tools)
 *   - executionType: "static" — no script_enabled env required
 *
 * Author override > derivation: if ruleset.customTools is present and
 * is an array, return it verbatim.
 *
 * Usage:
 *   import buildCustomTools from "./tools/build-custom-tools.mjs";
 *   const tools = buildCustomTools(ruleset);
 *
 *   # CLI for ad-hoc inspection
 *   node tools/build-custom-tools.mjs rulesets/exalted3e/ruleset.json
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/* Convert ruleset.id (kebab-case allowed) to a snake_case tool-name segment.
   Engine regex ^[a-z][a-z0-9_]*$ — dashes are NOT allowed. Replace them
   with underscores; lowercase any uppercase; strip anything still
   non-conforming. */
function ruleSetIdToSnake(id) {
  return String(id || "")
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^[^a-z]/, "x");
}

/* Build the structured Markdown reference block that becomes the
   staticResult. Conservative: only includes fields that are present. */
function buildReferenceMarkdown(ruleset) {
  const lines = [];
  lines.push("# " + (ruleset.name || ruleset.id) + " — canonical reference");
  lines.push("");
  if (ruleset.summary) {
    lines.push(ruleset.summary);
    lines.push("");
  }
  if (ruleset.dice && (ruleset.dice.type || ruleset.dice.notation)) {
    lines.push("## Dice");
    if (ruleset.dice.type) lines.push("- Type: `" + ruleset.dice.type + "`");
    if (ruleset.dice.notation) lines.push("- Notation: `" + ruleset.dice.notation + "`");
    lines.push("");
  }
  if (ruleset.resolution) {
    lines.push("## Resolution");
    if (ruleset.resolution.mode) lines.push("- Mode: `" + ruleset.resolution.mode + "`");
    if (ruleset.resolution.poolFormula) lines.push("- Pool formula: " + ruleset.resolution.poolFormula);
    if (typeof ruleset.resolution.target === "number") lines.push("- Default target: " + ruleset.resolution.target);
    lines.push("");
  }
  if (ruleset.difficulties && typeof ruleset.difficulties === "object") {
    lines.push("## Difficulty ladder");
    for (const [name, body] of Object.entries(ruleset.difficulties)) {
      const t = body && typeof body.threshold === "number" ? body.threshold : "?";
      const d = body && body.description ? body.description : "";
      lines.push("- **" + name + "** (threshold " + t + ") — " + d);
    }
    lines.push("");
  }
  if (Array.isArray(ruleset.attributes) && ruleset.attributes.length > 0) {
    lines.push("## Attributes");
    for (const a of ruleset.attributes) {
      const name = a.name || a.id || "?";
      const abbr = a.abbreviation ? " (" + a.abbreviation + ")" : "";
      const group = a.group ? " [" + a.group + "]" : "";
      const desc = a.description ? " — " + a.description : "";
      lines.push("- **" + name + "**" + abbr + group + desc);
    }
    lines.push("");
  }
  if (Array.isArray(ruleset.skills) && ruleset.skills.length > 0) {
    lines.push("## Skills");
    for (const s of ruleset.skills) {
      const name = s.name || s.id || "?";
      const attr = s.attribute ? " [" + s.attribute + "]" : "";
      const desc = s.description ? " — " + s.description : "";
      lines.push("- **" + name + "**" + attr + desc);
    }
    lines.push("");
  }
  if (ruleset.commitmentModel) {
    lines.push("## Commitment");
    lines.push("- Model: `" + ruleset.commitmentModel + "`");
    lines.push("");
  }
  return lines.join("\n").trim();
}

/* Vector 3 derivation. Returns CustomTool[] minus server-assigned id /
   createdAt / updatedAt. Empty array is a valid no-op. */
export default function buildCustomTools(ruleset) {
  if (!ruleset || typeof ruleset !== "object") {
    throw new Error("buildCustomTools: ruleset must be an object");
  }
  if (!ruleset.id || !ruleset.name) {
    throw new Error("buildCustomTools: ruleset.id and ruleset.name are required");
  }

  /* Author override > derivation. */
  if (Array.isArray(ruleset.customTools)) {
    return ruleset.customTools.slice();
  }

  /* Require at least one of difficulty/attribute/skill — otherwise there's
     nothing useful to ship a reference tool for. */
  const hasAnyContent =
    (ruleset.difficulties && typeof ruleset.difficulties === "object") ||
    (Array.isArray(ruleset.attributes) && ruleset.attributes.length > 0) ||
    (Array.isArray(ruleset.skills) && ruleset.skills.length > 0);
  if (!hasAnyContent) return [];

  const idSnake = ruleSetIdToSnake(ruleset.id);
  const toolName = idSnake + "_reference";
  const staticResult = buildReferenceMarkdown(ruleset);

  /* Engine description cap is 500 chars. Keep it short and instructive. */
  let description =
    "Returns canonical " + ruleset.name + " reference: dice, resolution, " +
    "difficulty ladder, attributes, skills. Call when the GM needs " +
    "authoritative ruleset detail mid-narration.";
  if (description.length > 500) description = description.slice(0, 497) + "...";

  return [{
    name: toolName,
    description: description,
    parametersSchema: {},
    executionType: "static",
    webhookUrl: null,
    staticResult: staticResult,
    scriptBody: null,
    enabled: true
  }];
}

/* CLI entry point — `node tools/build-custom-tools.mjs <ruleset.json>`
   prints the derived tools array to stdout. */
const isMain = (() => {
  try { return import.meta.url === "file://" + process.argv[1]; }
  catch { return false; }
})();
if (isMain) {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node tools/build-custom-tools.mjs <path/to/ruleset.json>");
    process.exit(2);
  }
  const ruleset = JSON.parse(readFileSync(resolve(arg), "utf8"));
  const tools = buildCustomTools(ruleset);
  console.log(JSON.stringify(tools, null, 2));
}
