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
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename, join } from "node:path";

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

/* Vector 7 enabler. The agent .md convention declares phase as a bold-prefixed
   line in the prose body — `**Phase:** parallel`, `**Phase:** pre_generation`,
   etc. Earlier versions of this generator hardcoded pre_generation regardless
   of what the source declared, which silently downgraded parallel-phase agents
   to pre_generation and broke the V7 path. We honor the declaration here;
   anything outside the engine's accepted enum falls back to pre_generation
   (defensive default — keeps existing seven shared agents unchanged).

   Round-25 correction: the ALLOWED set carried `post_generation`, which is
   NOT a value the engine accepts. The engine's enum is exactly
   ["pre_generation", "parallel", "post_processing"] — see
   ~/Marinara-Engine/packages/shared/src/schemas/agent.schema.ts:8 and
   packages/shared/src/types/agent.ts:20. `post_generation` appears in the
   engine only as an SSE *event* label (generate.routes.ts:8185), never as a
   phase. Declaring it would have fallen through to pre_generation here while
   looking accepted, so the typo was latent-but-real: it blocked the only
   correct spelling of the post phase. Fixed to mirror the engine enum. */
function extractPhase(md) {
  const m = md.match(/^\s*\*\*Phase:\*\*\s*`?([a-zA-Z_]+)`?/m);
  if (!m) return "pre_generation";
  const declared = (m[1] || "").trim().toLowerCase();
  const ALLOWED = new Set(["pre_generation", "parallel", "post_processing"]);
  return ALLOWED.has(declared) ? declared : "pre_generation";
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
    const phase = extractPhase(md);
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
