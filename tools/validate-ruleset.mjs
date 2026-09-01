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

/*
 * B18 — checks the JSON Schema oneOf/$ref machinery can't express:
 *   1. resolution.additionalModes[].id must be unique within the array
 *      (sibling-array uniqueness isn't expressible as a JSON Schema
 *      constraint on items without draft 2019+ `uniqueItems` on a
 *      projected key, which this schema doesn't use).
 *   2. skills[].resolutionId / derivedStats[].resolutionId, when present
 *      and not the literal "primary", must reference an id that actually
 *      exists in resolution.additionalModes[] — the schema only checks
 *      resolutionId is a string, not that it resolves to anything real.
 * Returns an array of human-readable error strings; empty = clean.
 */
export function extraChecks(data) {
  const errors = [];
  const additionalModes = (data && data.resolution && Array.isArray(data.resolution.additionalModes))
    ? data.resolution.additionalModes
    : [];

  const seenIds = new Map();
  for (const am of additionalModes) {
    if (!am || typeof am.id !== "string") continue;
    if (seenIds.has(am.id)) {
      errors.push(`resolution.additionalModes: duplicate id "${am.id}" (also used by entry ${seenIds.get(am.id)})`);
    } else {
      seenIds.set(am.id, additionalModes.indexOf(am));
    }
  }

  const validIds = new Set(additionalModes.map((am) => am && am.id).filter((id) => typeof id === "string"));
  function checkResolutionIds(list, label) {
    if (!Array.isArray(list)) return;
    list.forEach((item, idx) => {
      if (!item || typeof item.resolutionId !== "string") return;
      if (item.resolutionId === "primary") return;
      if (!validIds.has(item.resolutionId)) {
        errors.push(`${label}[${idx}] ("${item.name}"): resolutionId "${item.resolutionId}" does not match any resolution.additionalModes[].id (or "primary")`);
      }
    });
  }
  checkResolutionIds(data && data.skills, "skills");
  checkResolutionIds(data && data.derivedStats, "derivedStats");

  /*
   * S5 — inventory validation gate (ruling R9-as-amended + R17). Everything
   * the schema can already express (inventory shape, field required props,
   * id pattern, the `type`/`bonusKind`/`capMode` closed enums) is left to
   * ajv above; these three are the only inventory-field checks a plain
   * JSON Schema can't express without a bespoke if/then per property:
   *   1. field ids must be unique within inventory.fields (sibling-array
   *      uniqueness — same limitation as additionalModes[].id above).
   *   2. type:"enum" without a non-empty options[] renders no choices; the
   *      schema's own description marks this "by convention, not schema
   *      enforcement".
   *   3. capMode is only meaningful alongside capsToken — a field with
   *      capMode and no capsToken is a meaningless declaration the schema
   *      has no way to cross-check.
   */
  const invFields = (data && data.inventory && Array.isArray(data.inventory.fields))
    ? data.inventory.fields
    : [];

  const seenFieldIds = new Map();
  invFields.forEach((f, idx) => {
    if (!f || typeof f.id !== "string") return;
    if (seenFieldIds.has(f.id)) {
      errors.push(`inventory.fields: duplicate id "${f.id}" (also used by entry ${seenFieldIds.get(f.id)})`);
    } else {
      seenFieldIds.set(f.id, idx);
    }

    if (f.type === "enum" && (!Array.isArray(f.options) || f.options.length === 0)) {
      errors.push(`inventory.fields[${idx}] ("${f.id}"): type "enum" requires a non-empty options[] array`);
    }

    if (f.capMode !== undefined && typeof f.capsToken !== "string") {
      errors.push(`inventory.fields[${idx}] ("${f.id}"): capMode declared without capsToken`);
    }
  });

  return errors;
}

/*
 * S5 warn-level companion to extraChecks — advisory cross-references the
 * loader does not enforce at runtime, so a miss here must never fail the
 * run:
 *   1. bonusTarget should name a declared attribute, skill, or derivedStat
 *      (or, per ose's ad-hoc equipment vocabulary, an
 *      equipmentBonusTargets[] entry). bonusTarget is strictly optional —
 *      rulesets with no derivedStats at all produce no warnings simply
 *      because they declare no inventory fields that use it.
 *   2. appliesTo should only name slots the ruleset declares in
 *      equipmentSlots[] — advisory because item slots are free text at
 *      runtime, but it catches transcription typos that now matter
 *      arithmetically since appliesTo gates the bonus resolvers (F22).
 * Returns an array of human-readable warning strings; empty = clean.
 */
export function extraWarnings(data) {
  const warnings = [];
  const invFields = (data && data.inventory && Array.isArray(data.inventory.fields))
    ? data.inventory.fields
    : [];
  if (invFields.length === 0) return warnings;

  const statNames = new Set();
  for (const list of [data && data.attributes, data && data.skills, data && data.derivedStats]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item && typeof item.name === "string") statNames.add(item.name);
    }
  }
  const bonusTargetLabels = new Set(
    Array.isArray(data && data.equipmentBonusTargets) ? data.equipmentBonusTargets : []
  );
  const declaredSlots = new Set(
    Array.isArray(data && data.equipmentSlots) ? data.equipmentSlots : []
  );

  invFields.forEach((f, idx) => {
    if (!f) return;
    const label = typeof f.id === "string" ? f.id : `#${idx}`;

    if (typeof f.bonusTarget === "string" && !statNames.has(f.bonusTarget) && !bonusTargetLabels.has(f.bonusTarget)) {
      warnings.push(`inventory.fields[${idx}] ("${label}"): bonusTarget "${f.bonusTarget}" does not match any declared attribute, skill, or derivedStat name (or equipmentBonusTargets[] entry)`);
    }

    if (Array.isArray(f.appliesTo)) {
      f.appliesTo.forEach((slot) => {
        if (typeof slot === "string" && !declaredSlots.has(slot)) {
          warnings.push(`inventory.fields[${idx}] ("${label}"): appliesTo "${slot}" is not in equipmentSlots[]`);
        }
      });
    }
  });

  return warnings;
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
    const extra = ok ? extraChecks(data) : [];
    if (ok && extra.length === 0) {
      process.stdout.write(`PASS ${t}  (${data.id} v${data.version})\n`);
    } else if (ok) {
      process.stderr.write(`FAIL ${t}\n${extra.map((m) => `  - ${m}`).join("\n")}\n`);
      failures++;
    } else {
      process.stderr.write(`FAIL ${t}\n${fmtErrors(validator.errors)}\n`);
      failures++;
    }
    // S5 warn-level: printed regardless of pass/fail, never counted toward failures.
    if (ok) {
      for (const w of extraWarnings(data)) {
        process.stdout.write(`WARN ${data.id}: ${w}\n`);
      }
    }
  }

  process.exit(failures === 0 ? 0 : 1);
}

// B18: guard the CLI entrypoint so this file can be `import`ed (for its
// `extraChecks` export, used by tools/b18-multimode-probes.mjs) without
// immediately re-running `main()` as if invoked from the shell. No change
// to `node tools/validate-ruleset.mjs [...]` behavior — process.argv[1]
// still equals this file's URL on direct invocation.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((e) => {
    process.stderr.write(`unexpected error: ${e.stack || e.message || e}\n`);
    process.exit(2);
  });
}
