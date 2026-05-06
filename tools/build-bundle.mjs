#!/usr/bin/env node
/**
 * build-bundle.mjs — Generate a bundle.json from a ruleset directory's
 * three source files: ruleset.json, gm-agent.md, lorebook.json.
 *
 * Usage:
 *   node tools/build-bundle.mjs rulesets/dnd5e/         # builds rulesets/dnd5e/bundle.json
 *   node tools/build-bundle.mjs --all                    # builds all rulesets/ * /bundle.json
 *
 * Translation rules:
 *   - gm-agent.md: extracts the first ```text fenced block as promptTemplate.
 *   - lorebook entries: drops the "id" field (server-assigned), defaults
 *     position to 0 if absent, passes all other fields through verbatim.
 *   - bundle: wraps in { schema, version, ruleset, gmAgent, lorebook }.
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
    "gm-agent.md has no ```text fenced block and no `---` separator with prose after it. " +
    "Wrap the prompt in a ```text fenced block or place it after a horizontal rule."
  );
}

function buildEntry(src) {
  const out = {};
  for (const k of Object.keys(src)) {
    if (k === "id") continue;
    out[k] = src[k];
  }
  if (!out.name) {
    const id = src.id || (Array.isArray(src.keys) && src.keys[0]) || "entry";
    out.name = id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  if (typeof out.position !== "number") out.position = 0;
  if (!out.content) out.content = "";
  if (!Array.isArray(out.keys)) out.keys = [];
  return out;
}

function titleCase(s) {
  return s.split(/[-_]/).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
}

function loadAdditionalAgents(rulesetName, rulesetDir) {
  /* Resolve agent prompts with per-ruleset override precedence:
     prefer rulesets/<id>/agents/<role>.md, fall back to <repo>/agents/<role>.md.
     Roles are the union of files in both directories — a per-ruleset override
     can introduce a role that doesn't exist as a shared baseline, and a shared
     agent applies to rulesets without overrides. */
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
  if (roles.size === 0) return [];
  return Array.from(roles).sort().map(function (role) {
    const overridePath = join(overrideDir, role + ".md");
    let md, isOverride;
    try { md = readFileSync(overridePath, "utf8"); isOverride = true; }
    catch (e) { md = readFileSync(join(sharedDir, role + ".md"), "utf8"); isOverride = false; }
    const promptTemplate = extractPromptBlock(md);
    const firstHeading = (md.match(/^#\s+(.+)$/m) || [])[1] || titleCase(role);
    const tunedNote = isOverride
      ? " — tuned for " + rulesetName
      : " — shared baseline";
    return {
      role,
      name: rulesetName + " — " + firstHeading.replace(/\s+Agent\s*$/i, ""),
      description: "Focused " + role.replace(/-/g, " ") + " agent for " + rulesetName + tunedNote + ".",
      phase: "pre_generation",
      promptTemplate,
      settings: {}
    };
  });
}

function buildBundle(dir) {
  const ruleset = JSON.parse(readFileSync(join(dir, "ruleset.json"), "utf8"));
  const lb = JSON.parse(readFileSync(join(dir, "lorebook.json"), "utf8"));

  /* GM-mode bundles ship ruleset + lorebook only as of v0.4. Agents have
     been decoupled from the bundle and are NOT installed here — GM-mode
     does not use the MRR-managed agents in practice, and embedding them
     caused duplicate-agent accumulation across re-installs. The
     gm-agent.md and per-ruleset agents/ folders are kept on disk for
     reference and for the RP-mode build pipeline that does ship agents. */
  const bundle = {
    schema: "mrr-bundle",
    version: 1,
    minExtensionVersion: "0.4.0",
    authorId: "kenhito",
    generator: { name: "build-bundle.mjs", version: "1.1.0" },
    ruleset,
    lorebook: {
      name: lb.name,
      description: lb.description || "",
      category: "world",
      scanDepth: typeof lb.scanDepth === "number" ? lb.scanDepth : 4,
      tokenBudget: typeof lb.tokenBudget === "number" ? lb.tokenBudget : 1500,
      recursiveScanning: !!lb.recursiveScanning,
      entries: (lb.entries || []).map(buildEntry)
    }
  };

  const outPath = join(dir, "bundle.json");
  writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n");
  return { outPath, entryCount: bundle.lorebook.entries.length };
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node tools/build-bundle.mjs <rulesetDir> | --all");
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
    const { outPath, entryCount } = buildBundle(dir);
    console.log("PASS " + basename(dir) + " -> " + outPath + " (" + entryCount + " entries)");
  } catch (e) {
    console.error("FAIL " + basename(dir) + " — " + e.message);
    failed++;
  }
}
process.exit(failed === 0 ? 0 : 1);
