#!/usr/bin/env node
/**
 * embed-css.mjs — Embed extension/ruleset-loader.css into ruleset-loader.js
 * as a JSON-stringified constant between EMBEDDED_CSS_BEGIN/END markers.
 *
 * Run after editing ruleset-loader.css so the embedded copy stays in sync.
 *
 * Usage: node tools/embed-css.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const cssPath = resolve(root, "extension/ruleset-loader.css");
const jsPath = resolve(root, "extension/ruleset-loader.js");

const css = readFileSync(cssPath, "utf8");
const js = readFileSync(jsPath, "utf8");

const stringified = JSON.stringify(css);
const replacement =
  "/* EMBEDDED_CSS_BEGIN */\nvar EMBEDDED_CSS = " + stringified + ";\n/* EMBEDDED_CSS_END */";

const pattern = /\/\* EMBEDDED_CSS_BEGIN \*\/[\s\S]*?\/\* EMBEDDED_CSS_END \*\//;
if (!pattern.test(js)) {
  console.error(
    "Could not find EMBEDDED_CSS_BEGIN/END markers in",
    jsPath,
    "\nAdd these two lines somewhere near the top:\n  /* EMBEDDED_CSS_BEGIN */\n  /* EMBEDDED_CSS_END */"
  );
  process.exit(1);
}

writeFileSync(jsPath, js.replace(pattern, replacement));
console.log("Embedded " + css.length + " chars of CSS into ruleset-loader.js");
