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
import buildRegexScripts from "./build-regex-scripts.mjs";
import buildCustomTools from "./build-custom-tools.mjs";
import buildLorebookExpansions from "./build-lorebook-expansions.mjs";
import buildPreInputTransformer from "./build-pre-input-transformer.mjs";
import buildScenarioDefault from "./build-scenario-default.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function extractPromptBlock(md) {
  /* Round-12 F3 finding: a plain 3-backtick outer fence cannot safely
     contain an illustrative 3-backtick example block of its own — the
     first match wins (non-greedy), silently truncating extraction at the
     INNER closing fence instead of the real outer one. Confirmed live
     impact: rulesets/exalted3e/agents/state-mutator.md's "Output format
     you MUST produce" nested example cut its shipped promptTemplate from
     ~19.5KB of source down to 1429 chars — the FORBIDDEN field names
     list, field vocabulary, entire Sorcery workflow, conditions
     vocabulary, and every worked example never reached the live agent.
     Fix: prefer a 4-backtick outer fence when present (CommonMark rule —
     a fence can only be closed by a fence of the same character and >=
     length, so a shorter 3-backtick fence nested inside is just literal
     text), falling back to the original 3-backtick match for every other
     file unchanged. */
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

/* See build-agents.mjs for the source of truth. Kept in sync here defensively
   — loadAdditionalAgents below is currently dead in GM-mode but used to be
   the bundle-side install path and may be revived; either way, both should
   parse Phase identically so a future revival doesn't silently regress. */
function extractPhase(md) {
  const m = md.match(/^\s*\*\*Phase:\*\*\s*`?([a-zA-Z_]+)`?/m);
  if (!m) return "pre_generation";
  const declared = (m[1] || "").trim().toLowerCase();
  /* Round-25: mirrors the engine enum exactly — see build-agents.mjs's
     extractPhase comment for why `post_generation` was wrong and removed. */
  const ALLOWED = new Set(["pre_generation", "parallel", "post_processing"]);
  return ALLOWED.has(declared) ? declared : "pre_generation";
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
    const phase = extractPhase(md);
    const firstHeading = (md.match(/^#\s+(.+)$/m) || [])[1] || titleCase(role);
    const tunedNote = isOverride
      ? " — tuned for " + rulesetName
      : " — shared baseline";
    return {
      role,
      name: rulesetName + " — " + firstHeading.replace(/\s+Agent\s*$/i, ""),
      description: "Focused " + role.replace(/-/g, " ") + " agent for " + rulesetName + tunedNote + ".",
      phase,
      promptTemplate,
      settings: mrrInjectionSettings(role, phase)
    };
  });
}

/* ─── Round-20 F2: injection-eligibility settings ────────────────────────
   Engine v2.4.0+ makes an RP preset OWN agent placement. For a
   pre_generation agent's output to reach the narrator at all, three things
   must line up (all verified against ~/Marinara-Engine):

     1. the agent's TYPE is in chatMeta.activeAgentIds
        (runtime-agent-sections.ts:118 `activeAgentIds.has(agent.type)`),
     2. phase === "pre_generation"        (:120),
     3. resolveAgentResultType(...) === "context_injection"   (:122).

   `resultType` is therefore RUNTIME-CRITICAL and is stamped explicitly here
   rather than left to inference. `injectAsSection` is the separate,
   CLIENT-side flag that makes an agent show up in Preset Editor → Add
   Section → Agent Sections — without it the user cannot add the marker the
   runtime then needs, so the two travel together.

   Two roles are deliberately NOT narrator-facing:

     · state-mutator — its output is `[mrr-state: ...]` tags addressed to
       THIS EXTENSION, not to the narrator. The extension reads it through
       the runs poller (GET /agents/runs/:chatId/custom), which is entirely
       independent of preset placement, so injecting it buys the read path
       nothing. It also carries real risk: feeding raw tag syntax into the
       narrator's context invites the narrator to echo tags, and that is not
       hypothetical — round 11 diagnosed a live triple-apply (−15 instead of
       −5) caused by non-mutator agents echoing tag text, which is why the
       sole-writer filter exists. As of round 25 the mutator is a
       post_processing agent, so the question is moot at the runtime level
       too — a post-phase agent's output can never reach the narrator's
       prompt by any path. injectAsSection is therefore not emitted at all
       for it (see mrrInjectionSettings below).
     · pre-input-transformer — transforms the USER's input; its result is
       not a narrator context injection.

   Parallel-phase overlays (e.g. exalted3e's anima-banner-monitor) are also
   left alone: :120 rejects any phase other than pre_generation, so marking
   them injectable would be a lie the runtime silently ignores. */
const MRR_NON_INJECTING_ROLES = new Set(["state-mutator", "pre-input-transformer"]);

function mrrInjectionSettings(role, phase) {
  if (phase !== "pre_generation") {
    /* Round-25. A post_processing / parallel agent gets NO injectAsSection —
       the flag only ever gated the pre-gen preset-marker path, and the
       loader's own eligibility filter rejects any phase !== "pre_generation"
       before it ever looks at the flag (RPG-Extension-GM-Mode.js
       mrrInjectableManagedAgents, mirroring runtime-agent-sections.ts:120).
       Shipping it would be a claim the runtime cannot honor.

       resultType, however, STILL matters off the pre-gen path and is stamped
       explicitly: resolveAgentResultType (agent-executor.ts:3171-3179) reads
       settings.resultType first and only then falls back to a per-type map.
       For a post_processing agent the value it lands on decides real
       behavior — "text_rewrite" would make the engine REWRITE the narrator's
       message with the agent's output (agent-pipeline.ts:150,
       generate.routes.ts:4764). Custom types miss the map and default to
       context_injection, which is what we want and what the runs poller
       reads (`resultData.text`), but "what we want by default" is not a
       contract. State it. */
    return { resultType: "context_injection" };
  }
  if (role && MRR_NON_INJECTING_ROLES.has(role)) {
    /* Explicit false, not merely absent — the role IS a context_injection
       run type (that is how the poller reads it), so we state the UI intent
       rather than letting it be inferred. */
    return { resultType: "context_injection", injectAsSection: false };
  }
  return { resultType: "context_injection", injectAsSection: true };
}

function buildBundle(dir) {
  const ruleset = JSON.parse(readFileSync(join(dir, "ruleset.json"), "utf8"));
  const lb = JSON.parse(readFileSync(join(dir, "lorebook.json"), "utf8"));
  const gmMd = readFileSync(join(dir, "gm-agent.md"), "utf8");
  const mainPromptTemplate = extractPromptBlock(gmMd);

  /* GM-mode bundles embed both the main GM agent (bundle.gmAgent) AND
     role agents (bundle.additionalAgents), all enabled:true. GM-mode
     does not expose an Import Agents dialog or per-agent toggle, so
     agents must arrive installed-and-live with the ruleset bundle.
     The extension's existing install path keys idempotently on
     settings.mrrAgentRole (and on mrrRulesetId for the main agent),
     so re-installs update in place rather than accumulating duplicates.
     RP-mode keeps a separate agents.json import flow because RP users
     CAN toggle. */
  const roleAgents = loadAdditionalAgents(ruleset.name, dir).map(function (ag) {
    return Object.assign({}, ag, { enabled: true });
  });
  const regexScripts = buildRegexScripts(ruleset);
  const customTools = buildCustomTools(ruleset);

  /* Vector 2: derive auto-lorebook entries from ruleset.json
     (attributes, skills, conditions, derivedStats, difficulties), then
     merge into the hand-authored lorebook.json entries. Hand-authored
     entries WIN on name conflict — they're more specific than the
     generator's defaults.

     Why merge at build time (vs install time): the bundle install
     pipeline already does delete-then-add for the managed lorebook, so
     re-builds don't accumulate at install time. The merge needs to
     happen here so the bundle.json is the single source of truth at
     install time. */
  const handAuthoredEntries = (lb.entries || []).map(buildEntry);
  const derivedEntries = buildLorebookExpansions(ruleset);
  const handAuthoredNames = new Set(handAuthoredEntries.map(e => e.name));
  const derivedFiltered = derivedEntries.filter(e => !handAuthoredNames.has(e.name));
  const mergedEntries = handAuthoredEntries.concat(derivedFiltered);

  const bundle = {
    schema: "mrr-bundle",
    version: 1,
    minExtensionVersion: "0.4.0",
    authorId: "kenhito",
    generator: { name: "build-bundle.mjs", version: "1.7.0" },
    ruleset,
    gmAgent: {
      name: ruleset.name + " Ruleset Helper",
      description: "Auto-installed by GM-mode bundle. Provides " + ruleset.name + " skill resolution, dice formatting, and ruleset-aware narration framing for Marinara's Game Mode.",
      phase: "pre_generation",
      promptTemplate: mainPromptTemplate,
      settings: mrrInjectionSettings("main", "pre_generation")
    },
    lorebook: {
      name: lb.name,
      description: lb.description || "",
      category: "world",
      scanDepth: typeof lb.scanDepth === "number" ? lb.scanDepth : 4,
      tokenBudget: typeof lb.tokenBudget === "number" ? lb.tokenBudget : 1500,
      recursiveScanning: !!lb.recursiveScanning,
      entries: mergedEntries
    }
  };

  /* Vector 9: only embed regexScripts when the generator emitted at
     least one. Bundles without scripts stay byte-compatible with v0.4.x
     readers that don't know the field. */
  if (Array.isArray(regexScripts) && regexScripts.length > 0) {
    bundle.regexScripts = regexScripts;
  }

  /* Vector 3: only embed customTools when the generator emitted at
     least one. Same back-compat contract as Vector 9. */
  if (Array.isArray(customTools) && customTools.length > 0) {
    bundle.customTools = customTools;
  }

  /* Role agents (combat-overseer, context-fuser, state-mutator, plus any
     per-system parallel overlays). Loaded above as roleAgents with
     enabled:true forced. Empty array is fine — no key set. */
  if (roleAgents.length > 0) {
    if (!Array.isArray(bundle.additionalAgents)) bundle.additionalAgents = [];
    for (const ag of roleAgents) bundle.additionalAgents.push(ag);
  }

  /* Vector 5: pre-input transformer agent. The generator returns either
     a single agent object (from vocabularyHints[] derivation or from
     ruleset.preInputTransformerAgent override) or null. We attach it
     into bundle.additionalAgents so the existing additionalAgents
     install path handles it idempotently (settings.mrrAgentRole keys
     re-install matching). GM-mode policy: force enabled:true since the
     mode has no per-agent toggle UI. */
  const transformerAgent = buildPreInputTransformer(ruleset);
  if (transformerAgent && typeof transformerAgent === "object") {
    if (!Array.isArray(bundle.additionalAgents)) bundle.additionalAgents = [];
    /* Round-20 F2: the transformer is a non-injecting role (it rewrites the
       USER's input, not the narrator's context) — stamped explicitly so the
       built bundle states the intent rather than leaving it inferred. */
    bundle.additionalAgents.push(Object.assign({}, transformerAgent, {
      enabled: true,
      settings: Object.assign(
        {},
        transformerAgent.settings || {},
        mrrInjectionSettings("pre-input-transformer", transformerAgent.phase || "pre_generation")
      )
    }));
  }

  /* Vector 8: scenario default (NON-persona). When present the engine
     reads it via chatMeta.groupScenarioText override. Per-chat
     auto-install deferred to next session — tonight the bundle just
     ships the string. */
  const scenarioDefault = buildScenarioDefault(ruleset);
  if (typeof scenarioDefault === "string" && scenarioDefault.trim()) {
    bundle.scenarioDefault = scenarioDefault;
  }

  const outPath = join(dir, "bundle.json");
  writeFileSync(outPath, JSON.stringify(bundle, null, 2) + "\n");
  return {
    outPath,
    entryCount: bundle.lorebook.entries.length,
    handAuthoredCount: handAuthoredEntries.length,
    derivedCount: derivedFiltered.length,
    regexCount: (bundle.regexScripts || []).length,
    toolCount: (bundle.customTools || []).length,
    addAgentCount: (bundle.additionalAgents || []).length,
    scenarioBytes: (bundle.scenarioDefault || "").length
  };
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
    const { outPath, entryCount, handAuthoredCount, derivedCount, regexCount, toolCount, addAgentCount, scenarioBytes } = buildBundle(dir);
    console.log("PASS " + basename(dir) + " -> " + outPath + " (" + entryCount + " entries [" + handAuthoredCount + " hand + " + derivedCount + " derived], " + regexCount + " regex scripts, " + toolCount + " custom tools, " + addAgentCount + " add'l agents, " + scenarioBytes + " scenario bytes)");
  } catch (e) {
    console.error("FAIL " + basename(dir) + " — " + e.message);
    failed++;
  }
}
process.exit(failed === 0 ? 0 : 1);
