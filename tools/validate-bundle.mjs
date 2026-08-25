#!/usr/bin/env node
/**
 * validate-bundle.mjs — Validate one or more bundle.json files against
 * schema/bundle.schema.json AND the embedded ruleset against ruleset.schema.json.
 *
 * Usage:
 *   node tools/validate-bundle.mjs path/to/bundle.json
 *   node tools/validate-bundle.mjs --all
 */
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, basename } from "node:path";
import { isPatternSafe } from "./lib/regex-safety.mjs";
import { lintAll, formatReport, rulesetDirs } from "./lint-agent-redundancy.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const bundleSchema = JSON.parse(readFileSync(resolve(root, "schema/bundle.schema.json"), "utf8"));
const rulesetSchema = JSON.parse(readFileSync(resolve(root, "schema/ruleset.schema.json"), "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateBundle = ajv.compile(bundleSchema);
const validateRuleset = ajv.compile(rulesetSchema);

function validateFile(path) {
  const data = JSON.parse(readFileSync(path, "utf8"));
  const errors = [];
  if (!validateBundle(data)) {
    for (const e of validateBundle.errors || []) {
      errors.push("bundle" + e.instancePath + " " + e.message);
    }
  }
  if (data.ruleset && !validateRuleset(data.ruleset)) {
    for (const e of validateRuleset.errors || []) {
      errors.push("ruleset" + e.instancePath + " " + e.message);
    }
  }
  // Catastrophic-backtracking check (C-2, 2026-08-22): the engine's server-side
  // POST /regex-scripts rejects unsafe patterns at import time with a 400 — this
  // catches that HERE, before a live install ever sees it. See
  // tools/lib/regex-safety.mjs for provenance; macro-stripping mirrors the
  // engine's own regex.schema.ts validatePatternSafety exactly.
  const regexScripts = Array.isArray(data.regexScripts) ? data.regexScripts : [];
  for (let i = 0; i < regexScripts.length; i++) {
    const findRegex = regexScripts[i]?.findRegex;
    if (typeof findRegex !== "string") continue;
    const stripped = findRegex.replace(/\{\{[^}]*\}\}/g, "x");
    if (!isPatternSafe(stripped)) {
      errors.push(
        `regexScripts[${i}] (${regexScripts[i]?.name || "unnamed"}): findRegex is unsafe — the engine will reject it ` +
        `with "Regex pattern is unsafe: it may cause catastrophic backtracking" at import time. Bound every ` +
        `*/+ quantifier on a broad class (\\s \\S \\w \\W \\d \\D . or [^...]) to a finite {n,m}.`
      );
    }
  }
  return errors;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node tools/validate-bundle.mjs <bundle.json> | --all");
  process.exit(2);
}

const paths = [];
if (args[0] === "--all") {
  const rulesetsDir = resolve(root, "rulesets");
  for (const name of readdirSync(rulesetsDir)) {
    const dir = join(rulesetsDir, name);
    if (!statSync(dir).isDirectory()) continue;
    const bundlePath = join(dir, "bundle.json");
    try { statSync(bundlePath); paths.push(bundlePath); } catch {}
  }
} else {
  paths.push(resolve(args[0]));
}

let failed = 0;
for (const p of paths) {
  const errors = validateFile(p);
  if (errors.length === 0) {
    console.log("PASS " + p.replace(root + "/", ""));
  } else {
    console.log("FAIL " + p.replace(root + "/", ""));
    for (const err of errors) console.log("  - " + err);
    failed++;
  }
}

/* ─── Reference-redundancy lint — REPORT ONLY, never fails this run ───────
   Deliberately not a gate. The council's 08-25 verdict is that rules TEXT
   restated across prompts has to collapse into one canonical lorebook copy
   that agents query, but that migration happens ruleset by ruleset and would
   block every unrelated ship if it were enforced today. The v1 job is to make
   the drift countable, so the migration has a worklist and a way to prove it
   finished.

   Wrapped whole: a lint crash must never turn a passing validation into a
   failing one. Its exit status is discarded by construction — `failed` is not
   touched below this line. */
if (args[0] === "--all") {
  try {
    console.log("");
    console.log("Reference-redundancy lint (report-only — does not affect the exit status):");
    console.log(formatReport(lintAll(rulesetDirs("--all"))));
  } catch (e) {
    console.log("  lint skipped — " + (e && e.message ? e.message : e));
  }
}

process.exit(failed === 0 ? 0 : 1);
