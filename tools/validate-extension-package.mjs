#!/usr/bin/env node
/**
 * validate-extension-package.mjs — Assert that the generated folder/manifest
 * artifacts match the Marinara engine contract
 * (packages/shared/src/schemas/extension.schema.ts +
 *  packages/shared/src/features/folder-packages/manifest-package.ts).
 *
 * Usage:
 *   node tools/validate-extension-package.mjs            # validates releases/<package.json version>/
 *   node tools/validate-extension-package.mjs --version 1.0.0
 * Exit 0 = all checks pass; exit 1 = one or more failures.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const MAX_CSS_BYTES = 256 * 1024;
const MAX_JS_BYTES = 1024 * 1024;

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const version = argValue("--version", pkg.version);
const outDir = resolve(root, "releases", version);

const errs = [];
const fail = (m) => errs.push(m);

// Mirror of engine getFolderManifestConfig: unwrap { config } / { data }.
function getManifestConfig(manifest) {
  if (!manifest || typeof manifest !== "object") return null;
  if (typeof manifest.type === "string" && manifest.version === 1) return manifest;
  if (manifest.config && typeof manifest.config === "object" && !Array.isArray(manifest.config)) return manifest.config;
  if (typeof manifest.kind === "string" && manifest.data && typeof manifest.data === "object") return manifest.data;
  return manifest;
}

function checkConfig(config, where) {
  if (!config || typeof config !== "object") { fail(`${where}: config is not an object`); return; }
  if (typeof config.name !== "string" || config.name.length < 1 || config.name.length > 200)
    fail(`${where}: config.name must be a 1..200 char string (got ${JSON.stringify(config.name)})`);
  if (config.description != null && (typeof config.description !== "string" || config.description.length > 2000))
    fail(`${where}: config.description must be a string <= 2000 chars`);
  if (config.css != null) {
    if (typeof config.css !== "string") fail(`${where}: config.css must be string|null`);
    else if (Buffer.byteLength(config.css, "utf8") > MAX_CSS_BYTES) fail(`${where}: config.css over ${MAX_CSS_BYTES} bytes`);
  }
  if (config.js != null) {
    if (typeof config.js !== "string") fail(`${where}: config.js must be string|null`);
    // 2.4.3 removed the engine's 1 MiB personal-extension JS source cap
    // (commit 97a3a56ff) — kept here as a soft discipline warning, not a
    // hard failure, since the engine no longer enforces it.
    else if (Buffer.byteLength(config.js, "utf8") > MAX_JS_BYTES) console.warn(`WARN ${where}: config.js over ${MAX_JS_BYTES} bytes (soft — engine cap removed at 2.4.3)`);
  }
  if (config.css == null && config.js == null) fail(`${where}: at least one of css/js must be present`);
  if (config.enabled != null && typeof config.enabled !== "boolean") fail(`${where}: config.enabled must be boolean`);
  // Inline js must be syntactically valid after JSON round-trip — guards against
  // a double-escaping bug silently corrupting the install (the source-eval test
  // harness can't see this because it evals the source, not the manifest payload).
  if (typeof config.js === "string") {
    try { new Function("marinara", config.js); }
    catch (e) { fail(`${where}: inline config.js fails to parse (escaping corruption?): ${e.message}`); }
    // Mirrors the 2.4.3 full-page wrapper (run(extension, async (marinara) => {...}))
    // so a strict-mode/top-level-await mistake that only breaks under the async
    // wrapper (but parses fine as a plain Function body) is caught pre-import.
    try { new Function('"use strict"; return async (marinara) => {\n' + config.js + '\n};'); }
    catch (e) { fail(`${where}: inline config.js fails the 2.4.3 async-wrapper parse: ${e.message}`); }
  }
  // NOTE: the engine's own export sets BOTH inline css/js AND cssPath/jsPath
  // (extension-transfer.ts); the importer prefers the sibling file and falls
  // back to inline. So inline+path together is the canonical form, not an error.
  if (config.cssPath != null && typeof config.cssPath !== "string") fail(`${where}: config.cssPath must be a string`);
  if (config.jsPath != null && typeof config.jsPath !== "string") fail(`${where}: config.jsPath must be a string`);
}

function checkItemManifest(manifest, where) {
  if (!manifest || typeof manifest !== "object") { fail(`${where}: manifest missing`); return; }
  if (manifest.kind !== "marinara.extension") fail(`${where}: kind must be "marinara.extension" (got ${JSON.stringify(manifest.kind)})`);
  if (manifest.version !== 1) fail(`${where}: version must be 1`);
  checkConfig(getManifestConfig(manifest), where);
}

// 1. Item manifest under Extensions/<segment>/manifest.json
let foundManifestPath = null;
const envPath = join(outDir, "marinara-extensions.json");
if (!existsSync(envPath)) {
  fail(`missing envelope: ${envPath}`);
} else {
  const env = JSON.parse(readFileSync(envPath, "utf8"));
  if (env.kind !== "marinara.extension-folder") fail(`envelope.kind must be "marinara.extension-folder" (got ${JSON.stringify(env.kind)})`);
  if (env.version !== 1) fail(`envelope.version must be 1`);
  if (typeof env.exportedAt !== "string") fail(`envelope.exportedAt must be a string`);
  if (typeof env.folderName !== "string") fail(`envelope.folderName must be a string`);
  if (!Array.isArray(env.extensions) || !env.extensions.length) fail(`envelope.extensions must be a non-empty array`);
  else env.extensions.forEach((e, i) => {
    if (typeof e.path !== "string" || !e.path.endsWith("manifest.json")) fail(`extensions[${i}].path must end with manifest.json`);
    checkItemManifest(e.manifest, `envelope.extensions[${i}].manifest`);
    if (i === 0 && typeof e.path === "string") foundManifestPath = join(outDir, e.path);
  });
}

// 2. The on-disk manifest.json the envelope points at must exist and validate,
//    and any cssPath/jsPath must resolve to a sibling file that matches inline.
if (foundManifestPath) {
  if (!existsSync(foundManifestPath)) fail(`missing on-disk manifest: ${foundManifestPath}`);
  else {
    const m = JSON.parse(readFileSync(foundManifestPath, "utf8"));
    checkItemManifest(m, `on-disk ${foundManifestPath}`);
    const cfg = getManifestConfig(m) || {};
    const folder = dirname(foundManifestPath);
    for (const [pathKey, inlineKey] of [["cssPath", "css"], ["jsPath", "js"]]) {
      if (cfg[pathKey] == null) continue;
      const sib = join(folder, cfg[pathKey]);
      if (!existsSync(sib)) { fail(`sibling asset missing: ${cfg[pathKey]} (referenced by config.${pathKey})`); continue; }
      if (typeof cfg[inlineKey] === "string") {
        const sibContent = readFileSync(sib, "utf8");
        if (sibContent !== cfg[inlineKey]) fail(`sibling ${cfg[pathKey]} content != inline config.${inlineKey} (must match when both present)`);
      }
    }
  }
}

// 3. Anti (ISC-41): no mrrp token in the manifest METADATA (name/kind/paths/
//    description/folderName). The inlined config.js / config.css are opaque code
//    blobs that legitimately carry the D2/D3 legacy-accept migration strings
//    (mrrp-character-bundle / mrrp-agents read paths), so they are excluded from
//    this scan — only the package's own structural fields must be mrr-clean.
function stripCodeBlobs(node) {
  if (Array.isArray(node)) return node.map(stripCodeBlobs);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "js" || k === "css") out[k] = v == null ? v : "<blob>";
      else out[k] = stripCodeBlobs(v);
    }
    return out;
  }
  return node;
}
for (const p of [envPath, foundManifestPath].filter(Boolean)) {
  if (!existsSync(p)) continue;
  const meta = JSON.stringify(stripCodeBlobs(JSON.parse(readFileSync(p, "utf8"))));
  if (meta.includes("mrrp")) fail(`${p}: manifest metadata contains a "mrrp" token (must be mrr- only)`);
}

// 4. The importable zip exists and contains the canonical entries.
try {
  const { execFileSync } = await import("node:child_process");
  const { readdirSync } = await import("node:fs");
  const zip = readdirSync(outDir).find((n) => n.endsWith(".extension.zip"));
  if (!zip) fail(`missing <name>.extension.zip in ${outDir}`);
  else {
    const listing = execFileSync("unzip", ["-Z1", join(outDir, zip)], { encoding: "utf8" });
    if (!/(^|\n)marinara-extensions\.json/.test(listing)) fail(`zip ${zip} missing marinara-extensions.json`);
    if (!/manifest\.json/.test(listing)) fail(`zip ${zip} missing Extensions/<name>/manifest.json`);
  }
} catch (e) {
  fail(`zip verification failed: ${e.message}`);
}

if (errs.length) {
  console.error(`FAIL validate-extension-package v${version} — ${errs.length} issue(s):`);
  errs.forEach((e) => console.error("  • " + e));
  process.exit(1);
}
console.log(`PASS validate-extension-package v${version} — manifest + envelope conform to the engine contract; no mrrp token.`);
