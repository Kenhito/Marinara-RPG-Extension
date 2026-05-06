#!/usr/bin/env node
/**
 * build-agents.mjs — Generate a per-ruleset agents.json from gm-agent.md +
 * agents/*.md source files. Output is consumed by the extension's
 * "Import Agents" dialog (delete-then-replace flow).
 *
 * Usage:
 *   node tools/build-agents.mjs rulesets/exalted3e/   # builds rulesets/exalted3e/agents.json
 *   node tools/build-agents.mjs --all                  # builds all ruleset agents.json files
 *
 * Translation rules:
 *   - gm-agent.md becomes the "main" role agent (the primary RP overlay).
 *   - Per-ruleset agents/<role>.md files become individual role agents.
 *   - Shared <repo>/agents/<role>.md files apply to rulesets that don't
 *     override that role.
 *
 * Output schema mirrors the validator in extension/RPG-Extension-RP-Mode.js
 * (validateAgentImport):
 *   { schema: "mrrp-agents", version: 1, rulesetId, rulesetName, authorId,
 *     agents: [{role, name, description, phase, enabled, promptTemplate, settings}] }
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function extractPromptBlock(md) {
  const fenced = md.match(/```text\s*\n([\s\S]*?)\n```/);
  if (fenced) return fenced[1].trim();
  const sep = md.match(/^---\s*$/m);
  if (sep) {
    const after = md.slice((sep.index ?? 0) + sep[0].length);
    if (after.trim().length > 100) return after.trim();
  }
  throw new Error(
    "Source markdown has no ```text fenced block and no `---` separator with prose after it."
  );
}

function titleCase(s) {
  return s.split(/[-_]/).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
}

function loadRoleAgents(rulesetName, rulesetDir) {
  const sharedDir = resolve(root, "agents");
  const overrideDir = join(rulesetDir, "agents");
  const roles = new Set();
  function collectFrom(dir) {
    try {
      for (const f of readdirSync(dir)) {
        if (f.endsWith(".md")) roles.add(f.replace(/\.md$/, ""));
      }
    } catch (e) { /* directory absent — fine */ }
  }
  collectFrom(sharedDir);
  collectFrom(overrideDir);
  return Array.from(roles).sort().map(function (role) {
    const overridePath = join(overrideDir, role + ".md");
    let md, isOverride;
    try { md = readFileSync(overridePath, "utf8"); isOverride = true; }
    catch (e) { md = readFileSync(join(sharedDir, role + ".md"), "utf8"); isOverride = false; }
    const promptTemplate = extractPromptBlock(md);
    const firstHeading = (md.match(/^#\s+(.+)$/m) || [])[1] || titleCase(role);
    const tunedNote = isOverride ? " — tuned for " + rulesetName : " — shared baseline";
    return {
      role,
      name: rulesetName + " — " + firstHeading.replace(/\s+Agent\s*$/i, ""),
      description: "Focused " + role.replace(/-/g, " ") + " agent for " + rulesetName + tunedNote + ".",
      phase: "pre_generation",
      enabled: false,
      promptTemplate,
      settings: {}
    };
  });
}

function buildAgents(dir) {
  const ruleset = JSON.parse(readFileSync(join(dir, "ruleset.json"), "utf8"));
  const gmMd = readFileSync(join(dir, "gm-agent.md"), "utf8");
  const mainPrompt = extractPromptBlock(gmMd);

  const main = {
    role: "main",
    name: ruleset.name + " Ruleset Helper",
    description: "Provides " + ruleset.name + " skill resolution and dice formatting guidance for Roleplay Mode narration.",
    phase: "pre_generation",
    enabled: true,
    promptTemplate: mainPrompt,
    settings: {}
  };

  const subAgents = loadRoleAgents(ruleset.name, dir);

  const out = {
    schema: "mrrp-agents",
    version: 1,
    rulesetId: ruleset.id,
    rulesetName: ruleset.name,
    authorId: "kenhito",
    generator: { name: "build-agents.mjs", version: "1.0.0" },
    agents: [main].concat(subAgents)
  };

  const outPath = join(dir, "agents.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  return { outPath, count: out.agents.length };
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node tools/build-agents.mjs <rulesetDir> | --all");
  process.exit(2);
}

const dirs = [];
if (args[0] === "--all") {
  const rulesetsDir = resolve(root, "rulesets");
  for (const name of readdirSync(rulesetsDir)) {
    const p = join(rulesetsDir, name);
    if (statSync(p).isDirectory()) dirs.push(p);
  }
} else {
  dirs.push(resolve(root, args[0]));
}

let failed = 0;
for (const dir of dirs) {
  try {
    const { outPath, count } = buildAgents(dir);
    console.log("PASS " + basename(dir) + " -> " + outPath + " (" + count + " agents)");
  } catch (e) {
    console.error("FAIL " + basename(dir) + " — " + e.message);
    failed++;
  }
}
process.exit(failed === 0 ? 0 : 1);
