/**
 * agent-roster.mjs — the single source of truth for WHICH role agents a
 * ruleset builds and WHAT PHASE each one runs in.
 *
 * Before this module, `build-agents.mjs` and `build-bundle.mjs` each carried
 * their own copy of the role-union walk and the `**Phase:**` parser, with a
 * comment in the bundle copy admitting it was "kept in sync defensively."
 * They drifted in the way copies always do — not in the code, but in what the
 * code silently tolerated. Two facts from the 2026-08-25 static trace:
 *
 *   · `rulesets/vtmv20/agents/state-mutator.md` declared no phase at all, so
 *     it built as `pre_generation` while every other mutator ran
 *     `post_processing` — a wrong phase CLASS, arrived at by omission.
 *   · exwod and w20 carried five undeclared legacy role files each, so all
 *     eight of their agents ran in the blocking pre-generation path.
 *
 * Neither was a typo anyone could see in a diff; both were the default firing.
 * So the default is gone: a role source file with no `**Phase:**` line is now
 * a BUILD ERROR (`main` excepted — it is hardcoded `pre_generation` by both
 * builders and has no source declaration to read).
 *
 * The roster manifest is the second half. The role set used to be the bare
 * union of two directory listings, which meant NOTHING could remove a shared
 * role from one ruleset's build — the only lever was deleting the shared file
 * for everybody. `rulesets/<id>/agents.manifest.json` adds that lever:
 *
 *   {
 *     "suppress": ["lore-query"],
 *     "phaseOverride": { "blood-pool-tracker": "parallel" }
 *   }
 *
 * Both keys are optional and both are strict: suppressing or overriding a role
 * that does not exist is an error, not a no-op, because a manifest that has
 * quietly stopped matching the roster is exactly the drift this file exists to
 * make loud.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/* The engine's phase enum, verbatim. Mirrors
   ~/Marinara-Engine/packages/shared/src/schemas/agent.schema.ts:8 and
   packages/shared/src/types/agent.ts:20.

   Round-25 correction, preserved here as the reason the list is a constant
   rather than a literal typed twice: the builders once accepted
   `post_generation`, which the engine has never accepted as a phase — it
   exists there only as an SSE *event* label (generate.routes.ts:8185).
   Declaring it fell through to `pre_generation` while looking accepted, so
   the typo was latent-but-real: it blocked the only correct spelling of the
   post phase. */
export const ENGINE_PHASES = ["pre_generation", "parallel", "post_processing"];

const PHASE_SET = new Set(ENGINE_PHASES);
const PHASE_RE = /^\s*\*\*Phase:\*\*\s*`?([a-zA-Z_]+)`?/m;

/* `main` is built from gm-agent.md by both builders with a hardcoded
   `pre_generation`, and never routed through extractPhase. It is exempt from
   the declaration requirement because there is no declaration site to fill. */
export const PHASE_EXEMPT_ROLES = new Set(["main"]);

export class RosterError extends Error {}

/**
 * Read a role source file's declared phase. Throws unless the file declares
 * one of the engine's three phases.
 *
 * `where` is a human-facing path used in the error text — the whole value of
 * failing here instead of defaulting is that the message names the file.
 */
export function extractPhaseStrict(md, where) {
  const m = PHASE_RE.exec(md);
  if (!m) {
    throw new RosterError(
      where + ": no `**Phase:**` declaration. Every role agent must declare its " +
      "phase explicitly — one of " + ENGINE_PHASES.join(" / ") + ". (Until 2026-08-25 a " +
      "missing declaration silently built as pre_generation, which is how vtmv20's " +
      "state-mutator ended up in the wrong phase class and how exwod/w20 ended up " +
      "running all eight agents in the blocking path.) Add a line like:\n" +
      "    **Phase:** `post_processing`"
    );
  }
  const declared = String(m[1] || "").trim().toLowerCase();
  if (!PHASE_SET.has(declared)) {
    throw new RosterError(
      where + ": `**Phase:** " + declared + "` is not an engine phase. The engine's enum is " +
      "exactly " + ENGINE_PHASES.join(" / ") + " — anything else is rejected at import, or " +
      "(worse) silently ignored at runtime."
    );
  }
  return declared;
}

function listRoles(dir) {
  const out = [];
  try {
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".md")) out.push(f.replace(/\.md$/, ""));
    }
  } catch (e) { /* directory absent — a ruleset with no overrides is normal */ }
  return out;
}

/**
 * Load and validate `rulesets/<id>/agents.manifest.json`. Absent file is the
 * normal case and yields the empty manifest.
 */
export function loadRosterManifest(rulesetDir) {
  const path = join(rulesetDir, "agents.manifest.json");
  let raw;
  try { raw = readFileSync(path, "utf8"); }
  catch (e) { return { suppress: [], phaseOverride: {}, present: false }; }

  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { throw new RosterError("agents.manifest.json: not valid JSON — " + e.message); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new RosterError("agents.manifest.json: must be a JSON object.");
  }

  for (const key of Object.keys(parsed)) {
    if (key !== "suppress" && key !== "phaseOverride") {
      throw new RosterError(
        "agents.manifest.json: unknown key \"" + key + "\". Supported keys are " +
        "\"suppress\" (array of role ids) and \"phaseOverride\" (role id -> engine phase)."
      );
    }
  }

  const suppress = parsed.suppress === undefined ? [] : parsed.suppress;
  if (!Array.isArray(suppress) || suppress.some((r) => typeof r !== "string" || !r)) {
    throw new RosterError("agents.manifest.json: \"suppress\" must be an array of non-empty role id strings.");
  }
  if (suppress.includes("main")) {
    throw new RosterError(
      "agents.manifest.json: \"main\" cannot be suppressed — it is the ruleset helper built from " +
      "gm-agent.md, not a role file, and a bundle without it has no overlay at all."
    );
  }

  const phaseOverrideRaw = parsed.phaseOverride === undefined ? {} : parsed.phaseOverride;
  if (!phaseOverrideRaw || typeof phaseOverrideRaw !== "object" || Array.isArray(phaseOverrideRaw)) {
    throw new RosterError("agents.manifest.json: \"phaseOverride\" must be an object mapping role id -> engine phase.");
  }
  const phaseOverride = {};
  for (const role of Object.keys(phaseOverrideRaw)) {
    const phase = phaseOverrideRaw[role];
    if (typeof phase !== "string" || !PHASE_SET.has(phase)) {
      throw new RosterError(
        "agents.manifest.json: phaseOverride[\"" + role + "\"] = " + JSON.stringify(phase) +
        " is not an engine phase. Must be one of " + ENGINE_PHASES.join(" / ") + "."
      );
    }
    if (role === "main") {
      throw new RosterError(
        "agents.manifest.json: phaseOverride[\"main\"] is not honored — both builders hardcode the " +
        "ruleset helper to pre_generation. Remove the entry rather than leaving a claim the build ignores."
      );
    }
    phaseOverride[role] = phase;
  }

  return { suppress, phaseOverride, present: true };
}

/**
 * Resolve one ruleset's role roster: the union of the shared and per-ruleset
 * `agents/` directories, minus anything the manifest suppresses.
 *
 * Returns [{ role, sourcePath, isOverride }], sorted by role, which is the
 * order both builders have always emitted.
 */
export function resolveRoster(sharedDir, overrideDir, manifest) {
  const roles = new Set();
  for (const r of listRoles(sharedDir)) roles.add(r);
  for (const r of listRoles(overrideDir)) roles.add(r);

  /* A suppress entry naming a role that isn't in the union is a stale
     manifest, and a stale manifest is drift wearing the costume of intent.
     Fail rather than shrug. */
  for (const role of manifest.suppress) {
    if (!roles.has(role)) {
      throw new RosterError(
        "agents.manifest.json: suppress lists \"" + role + "\", which is not in this ruleset's role " +
        "union (no rulesets/<id>/agents/" + role + ".md and no shared agents/" + role + ".md). " +
        "Remove the entry — the role is already gone."
      );
    }
    roles.delete(role);
  }

  for (const role of Object.keys(manifest.phaseOverride)) {
    if (!roles.has(role)) {
      throw new RosterError(
        "agents.manifest.json: phaseOverride names \"" + role + "\", which this ruleset does not build " +
        (manifest.suppress.includes(role) ? "(it is also in \"suppress\" — pick one)." : "(no such role file).")
      );
    }
  }

  return Array.from(roles).sort().map(function (role) {
    const overridePath = join(overrideDir, role + ".md");
    const sharedPath = join(sharedDir, role + ".md");
    let isOverride = true;
    try { readFileSync(overridePath, "utf8"); }
    catch (e) { isOverride = false; }
    return { role, sourcePath: isOverride ? overridePath : sharedPath, isOverride };
  });
}

/**
 * Phase for one role: the manifest override when present, otherwise the
 * source file's own strict declaration.
 */
export function phaseForRole(role, md, sourcePath, manifest, repoRoot) {
  if (Object.prototype.hasOwnProperty.call(manifest.phaseOverride, role)) {
    return manifest.phaseOverride[role];
  }
  const where = repoRoot ? sourcePath.replace(repoRoot + "/", "") : sourcePath;
  return extractPhaseStrict(md, where);
}

/* TIERING ROUND (Stage 2C, 2026-08-27) — per-role settings.contextSources.
   Engine `packages/shared/src/types/agent.ts:583-592`: an agent whose
   settings carry a `contextSources` object runs in SELECTIVE context mode —
   only the sources listed `true` are included in its prompt build. An agent
   created without the object (`packages/server/src/services/agents/
   agent-executor.ts:125-131`) gets EVERY source. See COUPLINGS.md row 18.

   Every kept source is listed explicitly, `true` or `false`, never omitted —
   an omitted key reads as "nobody decided" where this table means "no."
   `contextSize` (message-count cap on chatHistory) is set only for
   pre-input-transformer, which needs just enough recent turns to rewrite the
   user's input and nothing else.

   ONE place, no duplication (Phase 0 discipline): both build-agents.mjs and
   build-bundle.mjs call this, exactly the reason agent-roster.mjs exists at
   all (see this file's header). The loader (extension/RPG-Extension-GM-Mode.js)
   cannot import this module — it is a single browser-side file — so
   mrrReadoptionSettings carries its own copy of this same table for the heal
   path; that second copy is the plan's explicit second half, not drift. */
const MRR_CONTEXT_SOURCES_BY_ROLE = {
  "main":                  { chatHistory: true, activatedLorebookEntries: true,  characters: true,  persona: false, chatSummary: false, others: false },
  "combat-overseer":       { chatHistory: true, activatedLorebookEntries: true,  characters: false, persona: false, chatSummary: false, others: false },
  "state-mutator":         { chatHistory: true, activatedLorebookEntries: true,  characters: false, persona: false, chatSummary: false, others: false },
  "context-fuser":         { chatHistory: true, activatedLorebookEntries: false, characters: true,  persona: true,  chatSummary: true,  others: false },
  "essence-manager":       { chatHistory: true, activatedLorebookEntries: true,  characters: false, persona: false, chatSummary: false, others: false },
  "pre-input-transformer": { chatHistory: true, activatedLorebookEntries: false, characters: false, persona: false, chatSummary: false, others: false }
};
const MRR_CONTEXT_SIZE_BY_ROLE = {
  "pre-input-transformer": 4
};

/**
 * The settings fragment for one role's contextSources (+ contextSize where
 * the table declares one). A role this table doesn't name (future role, or
 * a ruleset-local override with no round-27 entry) falls back to the "main"
 * row — a bounded, intentional context rather than the engine's own
 * ALL-sources default, which is what an unset object would otherwise mean.
 */
export function contextSourcesForRole(role) {
  const key = (typeof role === "string" && role && Object.prototype.hasOwnProperty.call(MRR_CONTEXT_SOURCES_BY_ROLE, role))
    ? role : "main";
  const out = { contextSources: Object.assign({}, MRR_CONTEXT_SOURCES_BY_ROLE[key]) };
  if (Object.prototype.hasOwnProperty.call(MRR_CONTEXT_SIZE_BY_ROLE, key)) {
    out.contextSize = MRR_CONTEXT_SIZE_BY_ROLE[key];
  }
  return out;
}

/**
 * "N agents: M blocking / K parallel / J post" — the line both builders print
 * so a roster's latency shape is visible at build time rather than discovered
 * in a runs dump three weeks later.
 */
export function phaseSummary(agents) {
  let blocking = 0, parallel = 0, post = 0;
  for (const a of agents) {
    if (a.phase === "pre_generation") blocking++;
    else if (a.phase === "parallel") parallel++;
    else if (a.phase === "post_processing") post++;
  }
  return agents.length + " agents: " + blocking + " blocking / " + parallel + " parallel / " + post + " post";
}
