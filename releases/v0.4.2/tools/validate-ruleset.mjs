#!/usr/bin/env node
/*
 * validate-ruleset.mjs — validate a ruleset.json against the schema.
 *
 * Usage:
 *   node tools/validate-ruleset.mjs <path/to/ruleset.json>
 *   node tools/validate-ruleset.mjs --all          # validate every rulesets/* /ruleset.json
 *
 * Exit codes:
 *   0  all inputs valid
 *   1  one or more inputs invalid
 *   2  CLI / I/O error
 */

import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const schemaPath = join(repoRoot, "schema", "ruleset.schema.json");

const Ajv = (await import("ajv/dist/2020.js")).default;

async function loadJson(path) {
  const txt = await readFile(path, "utf8");
  try {
    return JSON.parse(txt);
  } catch (e) {
    throw new Error(`${path}: ${e.message}`);
  }
}

async function discoverRulesets() {
  const dir = join(repoRoot, "rulesets");
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (e) {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => join(dir, e.name, "ruleset.json"));
}

function fmtErrors(errors) {
  if (!errors) return "(no detail)";
  return errors
    .map((e) => `  - ${e.instancePath || "(root)"} ${e.message}` + (e.params ? ` ${JSON.stringify(e.params)}` : ""))
    .join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    process.stderr.write("usage: node tools/validate-ruleset.mjs <ruleset.json | --all>\n");
    process.exit(2);
  }

  let targets;
  if (args[0] === "--all") {
    targets = await discoverRulesets();
    if (targets.length === 0) {
      process.stderr.write(`no rulesets discovered under ${join(repoRoot, "rulesets")}\n`);
      process.exit(2);
    }
  } else {
    targets = args.map((a) => resolve(a));
  }

  let schema;
  try {
    schema = await loadJson(schemaPath);
  } catch (e) {
    process.stderr.write(`schema load failed: ${e.message}\n`);
    process.exit(2);
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  let validator;
  try {
    validator = ajv.compile(schema);
  } catch (e) {
    process.stderr.write(`schema compile failed: ${e.message}\n`);
    process.exit(2);
  }

  let failures = 0;
  for (const t of targets) {
    let data;
    try {
      data = await loadJson(t);
    } catch (e) {
      process.stderr.write(`FAIL ${t}\n  ${e.message}\n`);
      failures++;
      continue;
    }
    const ok = validator(data);
    if (ok) {
      process.stdout.write(`PASS ${t}  (${data.id} v${data.version})\n`);
    } else {
      process.stderr.write(`FAIL ${t}\n${fmtErrors(validator.errors)}\n`);
      failures++;
    }
  }

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  process.stderr.write(`unexpected error: ${e.stack || e.message || e}\n`);
  process.exit(2);
});
