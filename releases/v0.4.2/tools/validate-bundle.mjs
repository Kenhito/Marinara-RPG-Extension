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
process.exit(failed === 0 ? 0 : 1);
