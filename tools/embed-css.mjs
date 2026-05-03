#!/usr/bin/env node
/**
 * embed-css.mjs — Embed extension/RPG-Extension-GM-Mode.css into RPG-Extension-GM-Mode.js
 * as a JSON-stringified constant between EMBEDDED_CSS_BEGIN/END markers.
 *
 * Run after editing RPG-Extension-GM-Mode.css so the embedded copy stays in sync.
 *
 * Usage: node tools/embed-css.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const cssPath = resolve(root, "extension/RPG-Extension-GM-Mode.css");
const jsPath = resolve(root, "extension/RPG-Extension-GM-Mode.js");

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
console.log("Embedded " + css.length + " chars of CSS into RPG-Extension-GM-Mode.js");
