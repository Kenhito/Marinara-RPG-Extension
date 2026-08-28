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
import {
  loadRosterManifest, resolveRoster, phaseForRole, phaseSummary, contextSourcesForRole, filterSharedShellSections
} from "./lib/agent-roster.mjs";

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

function loadAdditionalAgents(rulesetName, rulesetDir) {
  /* Roster + phase now come from tools/lib/agent-roster.mjs, shared with
     build-agents.mjs. This function used to carry its own copy of the union
     walk and the phase parser under a comment promising they were "kept in
     sync defensively" — the promise held for the code and failed for the
     tolerances, which is where the 2026-08-25 phase bugs lived. One module,
     one set of rules, one place to change them.

     Override precedence is unchanged: rulesets/<id>/agents/<role>.md wins over
     the shared agents/<role>.md, and the role set is the union of both dirs
     minus whatever agents.manifest.json suppresses. */
  const sharedDir = resolve(root, "agents");
  const overrideDir = join(rulesetDir, "agents");
  const manifest = loadRosterManifest(rulesetDir);
  const roster = resolveRoster(sharedDir, overrideDir, manifest);
  if (roster.length === 0) return [];
  return roster.map(function (entry) {
    const role = entry.role;
    const isOverride = entry.isOverride;
    const md = readFileSync(entry.sourcePath, "utf8");
    /* F#19: shared prompts are filtered to this system's own shell-fields
       section; overrides are already system-specific. */
    const promptTemplate = isOverride
      ? extractPromptBlock(md)
      : filterSharedShellSections(extractPromptBlock(md), basename(rulesetDir));
    const phase = phaseForRole(role, md, entry.sourcePath, manifest, root);
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
      /* TIERING ROUND (Stage 2C): contextSourcesForRole is the SAME shared
         helper build-agents.mjs calls (tools/lib/agent-roster.mjs) — merged
         ahead of mrrInjectionSettings so a key collision (there is none
         today) would let the injection-eligibility fields win. */
      settings: Object.assign({}, contextSourcesForRole(role), mrrInjectionSettings(role, phase))
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
      settings: Object.assign({}, contextSourcesForRole("main"), mrrInjectionSettings("main", "pre_generation"))
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
        contextSourcesForRole("pre-input-transformer"),
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
    scenarioBytes: (bundle.scenarioDefault || "").length,
    /* Counts the gmAgent alongside additionalAgents, i.e. everything this
       bundle actually installs. Note this can legitimately exceed the count
       build-agents.mjs reports for the same ruleset: agents.json carries only
       the role agents, while a bundle ALSO ships the derived
       pre-input-transformer where one exists (vtmv20 and exalted3e today). The
       two numbers describe two different artifacts, and both are correct. */
    phaseSummary: phaseSummary(
      [{ phase: "pre_generation" }].concat(bundle.additionalAgents || [])
    )
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
    const b = buildBundle(dir);
    console.log("PASS " + basename(dir) + " -> " + b.outPath + " (" + b.entryCount + " entries [" + b.handAuthoredCount + " hand + " + b.derivedCount + " derived], " + b.regexCount + " regex scripts, " + b.toolCount + " custom tools, " + b.addAgentCount + " add'l agents, " + b.scenarioBytes + " scenario bytes)");
    console.log("     roster: " + b.phaseSummary);
  } catch (e) {
    console.error("FAIL " + basename(dir) + " — " + e.message);
    failed++;
  }
}
process.exit(failed === 0 ? 0 : 1);
