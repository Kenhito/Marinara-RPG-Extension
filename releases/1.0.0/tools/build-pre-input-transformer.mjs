#!/usr/bin/env node
/**
 * build-pre-input-transformer.mjs — Vector 5 generator.
 *
 * Derives a `pre_generation` agent that re-casts the player's input
 * with ruleset-flavored vocabulary annotations before the main
 * narration model sees it. The agent's prompt is generated from
 * `ruleset.vocabularyHints[]` — a list of `{ pattern, hint }` pairs
 * the agent uses to recognize common verbs/phrases and append a
 * ruleset-native interpretation.
 *
 * Why generate an agent (not a regex script): the engine's regex
 * scripts only touch AI OUTPUT; player input goes to the model
 * untransformed. To shape how the AI thinks about an action, the
 * input must be re-framed at a phase the model sees BEFORE
 * generation — that's the pre_generation agent slot.
 *
 * Author override > derivation: if `ruleset.preInputTransformerAgent`
 * is present (full agent object), the generator returns it verbatim.
 *
 * Engine reference: agents.routes.ts / shared/types/agent.ts.
 *
 * Usage:
 *   import buildPreInputTransformer from "./tools/build-pre-input-transformer.mjs";
 *   const agent = buildPreInputTransformer(ruleset);   // null when no hints
 *
 *   # CLI for inspection
 *   node tools/build-pre-input-transformer.mjs rulesets/exalted3e/ruleset.json
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

function escapeMarkdownPipe(s) {
  return String(s || "").replace(/\|/g, "\\|");
}

function buildPrompt(ruleset, hints) {
  const lines = [];
  lines.push("# " + ruleset.name + " — pre-input transformer");
  lines.push("");
  lines.push("You are a pre-generation context-injection agent for an RPG roleplay using the " + ruleset.name + " ruleset overlay. Your job is to read the player's most recent input and emit a SHORT annotation that re-frames common verbs and action phrases in " + ruleset.name + "-flavored vocabulary.");
  lines.push("");
  lines.push("## Output format");
  lines.push("");
  lines.push("Emit a context-injection block of the form:");
  lines.push("```");
  lines.push("[" + ruleset.id + " annotation] <one-sentence re-frame, OR \"No re-frame needed.\">");
  lines.push("```");
  lines.push("");
  lines.push("Annotate only when one of the recognized patterns matches the player's input. Otherwise output exactly \"No re-frame needed.\" and stop.");
  lines.push("");
  lines.push("## Recognition table");
  lines.push("");
  lines.push("| When player input matches | Re-frame guidance |");
  lines.push("|---|---|");
  for (const h of hints) {
    const p = escapeMarkdownPipe(h.pattern || "(unset)");
    const hh = escapeMarkdownPipe(h.hint || "(unset)");
    lines.push("| " + p + " | " + hh + " |");
  }
  lines.push("");
  lines.push("## Rules");
  lines.push("");
  lines.push("- Match liberally (paraphrase / synonym OK) but never invent annotations for input that doesn't fit any row.");
  lines.push("- Never narrate the scene; never speak as a character; never roll dice.");
  lines.push("- One annotation per turn maximum. If multiple rows match, pick the most specific.");
  lines.push("- Keep the annotation under 25 words.");
  return lines.join("\n");
}

export default function buildPreInputTransformer(ruleset) {
  if (!ruleset || typeof ruleset !== "object") {
    throw new Error("buildPreInputTransformer: ruleset must be an object");
  }
  if (!ruleset.id || !ruleset.name) {
    throw new Error("buildPreInputTransformer: ruleset.id and ruleset.name are required");
  }

  /* Author override > derivation. Caller is responsible for the
     override agent's full shape. */
  if (ruleset.preInputTransformerAgent
      && typeof ruleset.preInputTransformerAgent === "object") {
    return ruleset.preInputTransformerAgent;
  }

  const hints = Array.isArray(ruleset.vocabularyHints) ? ruleset.vocabularyHints : [];
  if (hints.length === 0) return null; // no-op when nothing to bind

  return {
    role: "pre-input-transformer",
    name: ruleset.name + " — Pre-Input Transformer",
    description: "Re-frames common player-input phrases in " + ruleset.name + "-native vocabulary before the narration model sees them.",
    phase: "pre_generation",
    enabled: false, // user opts in via Settings → Agents
    promptTemplate: buildPrompt(ruleset, hints),
    settings: {}
  };
}

const isMain = (() => {
  try { return import.meta.url === "file://" + process.argv[1]; }
  catch { return false; }
})();
if (isMain) {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node tools/build-pre-input-transformer.mjs <path/to/ruleset.json>");
    process.exit(2);
  }
  const ruleset = JSON.parse(readFileSync(resolve(arg), "utf8"));
  const agent = buildPreInputTransformer(ruleset);
  console.log(JSON.stringify(agent, null, 2));
}
