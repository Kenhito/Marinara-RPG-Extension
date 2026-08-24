#!/usr/bin/env node
/**
 * check-freshness.mjs — CI-style gate proving that every committed generated
 * artifact still matches the committed sources it was generated from.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every artifact in this repo is derived: `bundle.json` and `agents.json` come
 * from a ruleset's `ruleset.json` + `lorebook.json` + `gm-agent.md` + `agents/*.md`,
 * the loader's EMBEDDED_CSS block comes from the companion `.css`, and everything
 * under `releases/<version>/` comes from the loader plus `package.json`. Nothing
 * stops a contributor (human or agent) from editing a source, committing it, and
 * never re-running the builder — at which point the repo ships a bundle that
 * silently disagrees with its own source of truth. That is not hypothetical: a
 * past P0 shipped exactly that way, where a source fix existed in git and the
 * generated artifact users actually installed never carried it.
 *
 * THE CONTRACT
 * ------------
 * Clean tree in, clean tree out.
 *
 *   Re-running the full artifact pipeline against the CURRENT working tree must
 *   produce ZERO diff. If rebuilding changes a byte, the committed artifact was
 *   stale relative to its committed source, and the gate fails.
 *
 * This is deliberately a statement about the *tree*, not about `git HEAD`: it
 * holds for a clean checkout of any commit, and it also holds mid-review with
 * source edits staged, as long as the artifacts were rebuilt alongside them.
 * That is why the gate refuses to run when the artifact paths are already dirty
 * (see PREFLIGHT) — with pre-existing modifications in place there is no way to
 * tell "the builder produced this" from "somebody hand-edited it".
 *
 * PREFLIGHT
 * ---------
 * The artifact paths must be clean before the gate runs. If they are not, the
 * gate exits 2 and lists them, rather than reporting a bogus verdict. Commit or
 * stash first. `--allow-dirty` overrides this for local experimentation; the
 * verdict is then advisory only and is labelled as such.
 *
 * AFTER A FAILURE
 * ---------------
 * The rebuilt artifacts are left in the working tree on purpose, so that
 * `git diff -- <path>` shows exactly what drifted. To accept the rebuild, commit
 * it. To discard it, `git checkout -- <path>`.
 *
 * TWO THINGS ARE DELIBERATELY NOT BYTE-CHECKED
 * --------------------------------------------
 *  1. `releases/<version>/*.extension.zip` — zip entries carry the mtime of the
 *     files being archived, and those files are rewritten on every run, so the
 *     archive can never be byte-reproducible. It is excluded from the diff. This
 *     costs nothing: the zip's entire payload is `marinara-extensions.json` plus
 *     the `Extensions/` tree, and both of those ARE byte-checked, so a stale zip
 *     cannot hide a stale artifact.
 *  2. `exportedAt` inside the release envelope — it defaults to `now()`, which
 *     would fail the gate on every run for a reason that means nothing. The gate
 *     reads the committed envelope's `exportedAt` and feeds it back to the
 *     builder via `--exported-at`, so the field is held constant and every OTHER
 *     byte of the envelope is still compared.
 *
 * Usage:
 *   node tools/check-freshness.mjs                # full gate
 *   node tools/check-freshness.mjs --no-package   # skip the release-package stage
 *   node tools/check-freshness.mjs --allow-dirty  # advisory run on a dirty tree
 *   node tools/check-freshness.mjs --json         # machine-readable verdict
 *
 * Exit codes:
 *   0  FRESH  — rebuild produced no diff
 *   1  STALE  — at least one artifact drifted from its source (list printed)
 *   2  ERROR  — preflight refused, a builder failed, or a prerequisite is missing
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const argv = process.argv.slice(2);
const wantJson = argv.includes("--json");
const allowDirty = argv.includes("--allow-dirty");
const skipPackage = argv.includes("--no-package");

const log = (...a) => { if (!wantJson) console.log(...a); };

function git(args, opts = {}) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", ...opts });
}

function haveCommand(cmd) {
  try {
    execFileSync("sh", ["-c", `command -v ${cmd}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/* ── Discover the artifact set ──────────────────────────────────────────────
   Rather than hardcoding a list that rots the moment a ruleset is added, the
   generated set is derived the same way the builders derive it: every directory
   under rulesets/ that carries a ruleset.json is a build target, and its
   bundle.json + agents.json are its artifacts. */
function rulesetIds() {
  const dir = resolve(root, "rulesets");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => {
      const p = join(dir, name);
      return statSync(p).isDirectory() && existsSync(join(p, "ruleset.json"));
    })
    .sort();
}

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const releaseVersion = pkg.version;
const releaseDir = join("releases", releaseVersion);

/* git pathspecs covering every generated file. `:(glob)` magic keeps `*` from
   being interpreted as a literal, and the `:(exclude)` entry drops the zip for
   the reason documented in the header. */
const artifactPathspecs = [
  ":(glob)rulesets/*/bundle.json",
  ":(glob)rulesets/*/agents.json",
  "extension/RPG-Extension-GM-Mode.js",
  ...(skipPackage ? [] : [
    `${releaseDir}/marinara-extensions.json`,
    `${releaseDir}/Extensions`,
    `${releaseDir}/RPG-Extension-GM-Mode.js`,
    `:(exclude,glob)releases/*/*.extension.zip`,
  ]),
];

/* ── Preflight ────────────────────────────────────────────────────────────── */
function dirtyArtifacts() {
  const out = git(["status", "--porcelain", "--", ...artifactPathspecs]).trim();
  return out ? out.split("\n").map((l) => l.trim()) : [];
}

const preexisting = dirtyArtifacts();
if (preexisting.length && !allowDirty) {
  console.error("ERROR: artifact paths are already modified — cannot judge freshness.");
  console.error("       Commit or stash these first, or re-run with --allow-dirty:");
  for (const line of preexisting) console.error("         " + line);
  process.exit(2);
}
if (preexisting.length && allowDirty) {
  log(`NOTE: ${preexisting.length} artifact path(s) were already dirty (--allow-dirty).`);
  log("      The verdict below is ADVISORY — pre-existing edits are indistinguishable");
  log("      from build output.");
  log("");
}

/* ── Hold exportedAt constant across the rebuild ──────────────────────────── */
let exportedAt = null;
const envelopePath = resolve(root, releaseDir, "marinara-extensions.json");
if (!skipPackage && existsSync(envelopePath)) {
  try {
    exportedAt = JSON.parse(readFileSync(envelopePath, "utf8")).exportedAt || null;
  } catch {
    exportedAt = null;
  }
}

/* ── Stages ───────────────────────────────────────────────────────────────── */
const ids = rulesetIds();
const stages = [
  { name: "bundles", desc: `build-bundle --all (${ids.length} rulesets)`, args: ["tools/build-bundle.mjs", "--all"] },
  { name: "agents", desc: `build-agents --all (${ids.length} rulesets)`, args: ["tools/build-agents.mjs", "--all"] },
  { name: "embedded-css", desc: "embed-css (loader EMBEDDED_CSS region)", args: ["tools/embed-css.mjs"] },
];
if (!skipPackage) {
  stages.push({
    name: "release-package",
    desc: `build-extension-package v${releaseVersion}`,
    args: [
      "tools/build-extension-package.mjs",
      "--version", releaseVersion,
      ...(exportedAt ? ["--exported-at", exportedAt] : []),
    ],
  });
}

if (!skipPackage && !haveCommand("zip")) {
  console.error("ERROR: `zip` is not on PATH, and build-extension-package.mjs needs it.");
  console.error("       Install zip, or re-run with --no-package to gate the other stages only.");
  process.exit(2);
}

log("check-freshness — rebuilding every generated artifact in place");
log(`  repo:    ${root}`);
log(`  release: ${releaseVersion}${exportedAt ? ` (exportedAt pinned to ${exportedAt})` : ""}`);
log("");

for (const stage of stages) {
  process.stdout.write(wantJson ? "" : `  [${stage.name}] ${stage.desc} ... `);
  try {
    execFileSync(process.execPath, stage.args, { cwd: root, stdio: "pipe", encoding: "utf8" });
    log("ok");
  } catch (err) {
    log("FAILED");
    console.error(`\nERROR: stage "${stage.name}" failed.`);
    console.error(`  command: node ${stage.args.join(" ")}`);
    const out = (err.stdout || "") + (err.stderr || "");
    if (out.trim()) console.error(out.trim().split("\n").map((l) => "  " + l).join("\n"));
    process.exit(2);
  }
}
log("");

/* ── Verdict ──────────────────────────────────────────────────────────────── */
let modified = [];
try {
  git(["diff", "--exit-code", "--quiet", "--", ...artifactPathspecs]);
} catch {
  modified = git(["diff", "--name-only", "--", ...artifactPathspecs]).trim().split("\n").filter(Boolean);
}
const untracked = git(["ls-files", "--others", "--exclude-standard", "--", ...artifactPathspecs])
  .trim().split("\n").filter(Boolean);

const stale = [
  ...modified.map((f) => ({ path: f, why: "rebuild changed the committed artifact" })),
  ...untracked.map((f) => ({ path: f, why: "artifact is generated but never committed" })),
];

if (wantJson) {
  console.log(JSON.stringify({
    verdict: stale.length ? "STALE" : "FRESH",
    advisory: preexisting.length > 0,
    release: releaseVersion,
    rulesets: ids.length,
    stages: stages.map((s) => s.name),
    stale,
  }, null, 2));
} else if (stale.length) {
  console.log(`STALE — ${stale.length} artifact(s) do not match their sources:`);
  for (const s of stale) console.log(`  ${s.path}\n      ${s.why}`);
  console.log("");
  console.log("The rebuilt files are left in the working tree. Inspect with:");
  console.log("  git diff -- " + stale.map((s) => s.path).join(" "));
  console.log("Accept them by committing, or discard with `git checkout --`.");
} else {
  console.log(`FRESH — every generated artifact matches its source.`);
  console.log(`  ${ids.length} ruleset bundles + agents, the loader's embedded CSS, and the`);
  console.log(`  v${releaseVersion} release package all rebuilt byte-identical.`);
}

process.exit(stale.length ? 1 : 0);
