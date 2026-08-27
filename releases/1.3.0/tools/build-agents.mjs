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
 * Output schema mirrors the validator in extension/RPG-Extension-GM-Mode.js
 * (validateAgentImport):
 *   { schema: "mrr-agents", version: 1, rulesetId, rulesetName, authorId,
 *     agents: [{role, name, description, phase, enabled, promptTemplate, settings}] }
 *
 * Roster + phase resolution moved to tools/lib/agent-roster.mjs on 2026-08-25
 * so this file and build-bundle.mjs cannot disagree about which agents a
 * ruleset has or what phase they run in. See that module's header for why the
 * missing-declaration default had to die.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename, join } from "node:path";
import {
  loadRosterManifest, resolveRoster, phaseForRole, phaseSummary
} from "./lib/agent-roster.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function extractPromptBlock(md) {
  /* Round-12 F3 finding — kept in sync with build-bundle.mjs's copy (see
     its comment for the full postmortem): prefer a 4-backtick outer
     fence when present, so a prompt can safely nest an illustrative
     3-backtick example block without truncating extraction at the
     INNER close instead of the real outer one. */
  const fenced4 = md.match(/````text\s*\n([\s\S]*?)\n````/);
  if (fenced4) return fenced4[1].trim();
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
  const manifest = loadRosterManifest(rulesetDir);
  return resolveRoster(sharedDir, overrideDir, manifest).map(function (entry) {
    const role = entry.role;
    const isOverride = entry.isOverride;
    const md = readFileSync(entry.sourcePath, "utf8");
    const promptTemplate = extractPromptBlock(md);
    const phase = phaseForRole(role, md, entry.sourcePath, manifest, root);
    const firstHeading = (md.match(/^#\s+(.+)$/m) || [])[1] || titleCase(role);
    const tunedNote = isOverride ? " — tuned for " + rulesetName : " — shared baseline";
    return {
      role,
      name: rulesetName + " — " + firstHeading.replace(/\s+Agent\s*$/i, ""),
      description: "Focused " + role.replace(/-/g, " ") + " agent for " + rulesetName + tunedNote + ".",
      phase,
      enabled: true,
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
    schema: "mrr-agents",
    version: 1,
    rulesetId: ruleset.id,
    rulesetName: ruleset.name,
    authorId: "kenhito",
    generator: { name: "build-agents.mjs", version: "1.0.0" },
    agents: [main].concat(subAgents)
  };

  const outPath = join(dir, "agents.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  return { outPath, count: out.agents.length, summary: phaseSummary(out.agents) };
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
    /* The phase summary rides the PASS line rather than a separate report so
       roster drift is visible in the same scrollback that shows the build —
       "8 agents: 8 blocking / 0 parallel / 0 post" is the shape of the exwod
       bug, and it would have been readable on any build day since. */
    const { outPath, summary } = buildAgents(dir);
    console.log("PASS " + basename(dir) + " -> " + outPath + " (" + summary + ")");
  } catch (e) {
    console.error("FAIL " + basename(dir) + " — " + e.message);
    failed++;
  }
}
process.exit(failed === 0 ? 0 : 1);
