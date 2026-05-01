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

function buildBundle(dir) {
  const ruleset = JSON.parse(readFileSync(join(dir, "ruleset.json"), "utf8"));
  const gmMd = readFileSync(join(dir, "gm-agent.md"), "utf8");
  const lb = JSON.parse(readFileSync(join(dir, "lorebook.json"), "utf8"));

  const promptTemplate = extractPromptBlock(gmMd);

  const bundle = {
    schema: "mrr-bundle",
    version: 1,
    minExtensionVersion: "0.3.0",
    authorId: "kenhito",
    generator: { name: "build-bundle.mjs", version: "1.0.0" },
    ruleset,
    gmAgent: {
      name: ruleset.name + " Ruleset Override",
      description: "Enforces " + ruleset.name + " skill resolution and dice formatting in Game Mode narration.",
      phase: "pre_generation",
      promptTemplate,
      settings: {}
    },
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
