#!/usr/bin/env node
/**
 * lint-agent-redundancy.mjs — find RULES TEXT that lives in more than one
 * place inside a single ruleset. REPORT-ONLY: never fails a build.
 *
 * Usage:
 *   node tools/lint-agent-redundancy.mjs rulesets/exalted3e/
 *   node tools/lint-agent-redundancy.mjs --all
 *   node tools/lint-agent-redundancy.mjs --all --json
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * The 2026-08-25 agent-architecture council drew a line that this tool
 * enforces: REASONING redundancy is load-bearing and stays; REFERENCE
 * redundancy is rot and goes.
 *
 * Keeping several independent reasoners is what let the agents outvote the
 * Helper's two rules errors on 2026-08-25 — delete that and you delete the
 * disagreement mechanism. But restating the same rules TEXT across several
 * prompts buys no independence at all, because the copies drift silently and
 * then the "independent" reasoners are arguing from different rulebooks.
 *
 * The canary is Exalted's anima table, which by 08-25 existed in THREE
 * mutually inconsistent forms: the Helper's stepwise "+1 level per 5
 * Peripheral motes", the lorebook's absolute bands, and the anima monitor's
 * own third table. No single edit was wrong; the duplication was.
 *
 * So the target state is one canonical source per rule (the lorebook) that
 * agents QUERY rather than restate. This lint does not perform that
 * migration — it makes the drift visible, ruleset by ruleset, so the
 * migration has a worklist and a way to prove it finished.
 *
 * ── How it decides ───────────────────────────────────────────────────────
 * Everything is compared at BLOCK granularity, never whole-document:
 * a duplicated paragraph inside a 20KB prompt is invisible to any
 * document-level score. Blocks are blank-line-separated chunks of a
 * promptTemplate or a lorebook entry's content.
 *
 * For each block pair we compute word-shingle CONTAINMENT — the share of the
 * SMALLER block's shingles that also appear in the larger one — rather than
 * Jaccard. A three-line rule restated inside a long prompt is exactly the
 * case we care about, and Jaccard would score it near zero purely because the
 * two blocks differ in length.
 *
 * Pairs compared, per ruleset:
 *   (a) every promptTemplate block vs every OTHER agent's promptTemplate block
 *   (b) every promptTemplate block vs every lorebook entry block
 * Blocks within one document are never compared to each other — a prompt
 * repeating itself is a different (and much rarer) problem.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, basename } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

/* ── tuning ──────────────────────────────────────────────────────────────
   SHINGLE_N=5 is the deliberate choice. At n=8 the anima canary goes
   undetected: the Helper writes "+1 level for every 5 PERIPHERAL motes spent
   in a single action" and the lorebook writes "+1 banner level per 5
   Peripheral motes spent in a single action", which share no 8-word window
   but plenty of 5-word ones. Restated rules are paraphrased, not copied, so
   the window has to be short enough to survive paraphrase and long enough to
   avoid matching ordinary English. Five is where both hold.

   MIN_BLOCK_WORDS drops headers and one-liners, which otherwise dominate the
   report with true-but-useless matches ("# Rules", "BE BRIEF."). */
const SHINGLE_N = 5;
const MIN_BLOCK_WORDS = 12;
/* MIN_SHARED_SHINGLES does the real work, and it is an ABSOLUTE count on
   purpose. Four overlapping 5-word windows chain into roughly eight identical
   consecutive words — after cross-agent boilerplate has already been
   subtracted, that does not happen by accident in rules prose. The ratio is
   kept only as a floor against a tiny fragment matching a very long block:
   the anima canary scores 0.22 (four shared windows out of eighteen), so any
   threshold tight enough to look respectable is tight enough to miss it. */
const CONTAINMENT_THRESHOLD = 0.15;
const MIN_SHARED_SHINGLES = 4;
/* A paragraph longer than this is also split into finer units. Restated rules
   usually hide as ONE bullet inside a long list — Exalted's anima rule is a
   single bullet in a 106-word "Combat / out-of-combat economy" block, and at
   paragraph granularity its duplication of the lorebook's anima entry scored
   0.09 purely because the surrounding bullets diluted it. */
const PARA_SPLIT_WORDS = 40;
/* Per document pair, report only the strongest few matches. Paragraph-level
   and sub-unit-level detection of the SAME duplication would otherwise print
   the finding twice. */
const MAX_FINDINGS_PER_PAIR = 2;

/* ── the second signal ───────────────────────────────────────────────────
   Shingles catch COPIED text. They do not catch text that was rewritten,
   and rules get rewritten every time someone restates them from memory.
   Measured on the anima canary: the Helper's "+1 level for every 5
   PERIPHERAL motes spent in a single action" and the lorebook's "+1 banner
   level per 5 Peripheral motes spent in a single action" share only four
   5-word windows — a containment of 0.25, under any threshold loose enough
   to stay quiet on ordinary English.

   So the second signal ignores word ORDER and asks a different question:
   do these two blocks talk about the same rare things? Terms that appear in
   only a minority of the ruleset's documents are its domain vocabulary
   (anima, peripheral, bonfire, motes), and two blocks sharing a cluster of
   them are two blocks about the same rule. That is precisely the
   "rules text living in >= 2 places" the council asked to see, and it fires
   on the anima BAND TABLES too, which paraphrase so heavily that they share
   almost no word windows at all. */
const RARE_TERM_MAX_DOC_RATIO = 0.5;   /* a term in more than half the docs is vocabulary, not a rule */
const RARE_TERM_MIN_LEN = 4;
const MIN_SHARED_RARE_TERMS = 7;
const RARE_TERM_CONTAINMENT = 0.55;
/* Both sides need enough domain vocabulary for the overlap to mean anything.
   Without this a three-word marker like "[anima-banner]" matches every block
   that mentions anima, at a containment of 1.0. */
const MIN_RARE_TERMS_PER_BLOCK = 8;

/* Instructions deliberately repeated across every agent (the "never emit
   [mrr-state:] tags" sole-writer warning, the shared preamble) are not drift
   — they are one rule stated to several readers, and collapsing them would
   be wrong. A unit present in this many documents is boilerplate and is
   dropped from the pair report.

   Matching is NEAR-duplicate, not verbatim: each agent's copy of the
   sole-writer warning has been lightly edited over time, so exact text
   matching grouped none of them and the report filled up with the same
   warning compared nine ways. */
const BOILERPLATE_DOC_COUNT = 3;
const BOILERPLATE_SIMILARITY = 0.80;

const STOPWORDS = new Set([
  "that", "this", "with", "from", "they", "them", "then", "than", "when", "what",
  "your", "you", "the", "and", "for", "are", "not", "but", "any", "all", "one",
  "its", "it's", "has", "have", "was", "were", "will", "would", "should", "must",
  "each", "into", "onto", "over", "under", "only", "also", "such", "same", "other",
  "their", "there", "here", "which", "while", "does", "done", "make", "made",
  "use", "used", "using", "per", "via", "out", "off", "own", "get", "got", "how",
  "why", "who", "whom", "can", "may", "might", "just", "very", "more", "most",
  "less", "least", "every", "some", "none", "both", "never", "always", "next",
  "last", "first", "second", "third", "line", "text", "output", "input", "agent",
  "player", "turn", "scene", "rule", "rules", "roll", "rolls"
]);

function extractPromptBlock(md) {
  const fenced4 = md.match(/````text\s*\n([\s\S]*?)\n````/);
  if (fenced4) return fenced4[1].trim();
  const fenced = md.match(/```text\s*\n([\s\S]*?)\n```/);
  if (fenced) return fenced[1].trim();
  const sep = md.match(/^---\s*$/m);
  if (sep) {
    const after = md.slice((sep.index ?? 0) + sep[0].length);
    if (after.trim().length > 100) return after.trim();
  }
  return null;
}

/* Normalize away everything that is presentation rather than content:
   markdown table pipes, list bullets, heading hashes, backticks, and
   punctuation. The anima tables differ in FORMAT (one a markdown table, one
   prose) while saying the same thing, so format has to stop mattering before
   the comparison starts. */
function words(text) {
  return String(text)
    .toLowerCase()
    .replace(/`+/g, " ")
    .replace(/[|#>*_\-–—]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function shingles(text) {
  const w = words(text);
  const set = new Set();
  if (w.length < SHINGLE_N) return set;
  for (let i = 0; i + SHINGLE_N <= w.length; i++) {
    set.add(w.slice(i, i + SHINGLE_N).join(" "));
  }
  return set;
}

/* Break a long paragraph into the units a rule actually gets written as: one
   list item, one table row, or one sentence. Without this the lint only sees
   duplication that happens to span a whole paragraph, which is the rarer
   case — rules get restated a line at a time. */
function subUnits(paragraph) {
  const out = [];
  const lines = paragraph.split("\n");
  let buf = [];
  const flush = () => {
    if (!buf.length) return;
    const t = buf.join(" ").trim();
    if (t) out.push(t);
    buf = [];
  };
  for (const line of lines) {
    /* A list marker, a table row, or a numbered step starts a new unit. */
    if (/^\s*(?:[-*•]|\||\d+[.)])\s+/.test(line)) {
      flush();
      buf.push(line.trim());
    } else {
      buf.push(line.trim());
    }
  }
  flush();

  /* Anything still long and prose-shaped gets split at sentence boundaries. */
  const final = [];
  for (const unit of out) {
    if (words(unit).length <= PARA_SPLIT_WORDS) { final.push(unit); continue; }
    const sentences = unit.split(/(?<=[.!?])\s+(?=[A-Z(])/);
    if (sentences.length <= 1) { final.push(unit); continue; }
    for (const s of sentences) if (s.trim()) final.push(s.trim());
  }
  return final;
}

function splitBlocks(text, sourceLabel) {
  const out = [];
  const seen = new Set();
  const push = (t) => {
    const trimmed = t.trim();
    if (!trimmed || seen.has(trimmed)) return;
    if (words(trimmed).length < MIN_BLOCK_WORDS) return;
    seen.add(trimmed);
    out.push({
      source: sourceLabel,
      text: trimmed,
      norm: words(trimmed).join(" "),
      sh: shingles(trimmed),
      terms: termSet(trimmed)
    });
  };

  for (const chunk of String(text).split(/\n\s*\n/)) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    push(trimmed);
    /* Also index the paragraph's finer units, so a rule restated as a single
       bullet is comparable against a lorebook entry that states it as a
       sentence. Both granularities are compared; MAX_FINDINGS_PER_PAIR keeps
       the report from printing the same duplication twice. */
    if (words(trimmed).length > PARA_SPLIT_WORDS) {
      for (const unit of subUnits(trimmed)) push(unit);
    }
  }
  return out;
}

function termSet(text) {
  const set = new Set();
  for (const w of words(text)) {
    if (w.length < RARE_TERM_MIN_LEN) continue;
    if (STOPWORDS.has(w)) continue;
    set.add(w);
  }
  return set;
}

function containment(a, b) {
  const small = a.size <= b.size ? a : b;
  const large = small === a ? b : a;
  if (small.size === 0) return { score: 0, shared: 0, examples: [] };
  let shared = 0;
  const examples = [];
  for (const s of small) {
    if (large.has(s)) {
      shared++;
      if (examples.length < 3) examples.push(s);
    }
  }
  return { score: shared / small.size, shared, examples };
}

function firstLine(text) {
  const line = text.split("\n").find((l) => l.trim()) || "";
  const clean = line.trim().replace(/\s+/g, " ");
  return clean.length > 90 ? clean.slice(0, 87) + "..." : clean;
}

function collectRuleset(dir) {
  const docs = [];

  const rulesetPath = join(dir, "ruleset.json");
  const ruleset = JSON.parse(readFileSync(rulesetPath, "utf8"));

  /* The main Helper. Uses the same extraction the builders use, so the lint
     sees the text that actually ships rather than the whole markdown file. */
  try {
    const gm = extractPromptBlock(readFileSync(join(dir, "gm-agent.md"), "utf8"));
    if (gm) docs.push({ kind: "agent", label: "gm-agent (main)", blocks: splitBlocks(gm, "gm-agent (main)") });
  } catch (e) { /* a ruleset with no gm-agent.md is already a build failure elsewhere */ }

  /* Role agents, resolved the way the builders resolve them: per-ruleset
     override wins over the shared baseline, union of both directories.
     Deliberately NOT importing agent-roster.mjs — a lint that throws on the
     same strictness the build enforces would just fail twice and report
     nothing useful. */
  const sharedDir = resolve(root, "agents");
  const overrideDir = join(dir, "agents");
  const roles = new Set();
  for (const d of [sharedDir, overrideDir]) {
    try { for (const f of readdirSync(d)) if (f.endsWith(".md")) roles.add(f.replace(/\.md$/, "")); }
    catch (e) { /* absent dir is fine */ }
  }
  for (const role of Array.from(roles).sort()) {
    let md;
    try { md = readFileSync(join(overrideDir, role + ".md"), "utf8"); }
    catch (e) {
      try { md = readFileSync(join(sharedDir, role + ".md"), "utf8"); }
      catch (e2) { continue; }
    }
    const prompt = extractPromptBlock(md);
    if (!prompt) continue;
    docs.push({ kind: "agent", label: role, blocks: splitBlocks(prompt, role) });
  }

  /* Lorebook entries. Each entry is its own document — an entry restating
     another entry is a real finding too, and costs nothing extra to check. */
  try {
    const lb = JSON.parse(readFileSync(join(dir, "lorebook.json"), "utf8"));
    for (const e of (lb.entries || [])) {
      const content = e && e.content;
      if (typeof content !== "string" || !content.trim()) continue;
      const label = "lorebook:" + (e.id || e.name || "entry");
      docs.push({ kind: "lorebook", label, blocks: splitBlocks(content, label) });
    }
  } catch (e) { /* no lorebook is unusual but not this tool's business */ }

  return { rulesetId: ruleset.id, rulesetName: ruleset.name, docs };
}

function lintRuleset(dir) {
  const { rulesetId, docs } = collectRuleset(dir);
  const findings = [];

  /* ── boilerplate pass ──────────────────────────────────────────────────
     A rule shared verbatim by three or more agents is a deliberate
     cross-agent instruction, not drift, and reporting it would bury every
     real finding under the same sole-writer warning repeated nine ways.

     Suppressing whole BLOCKS is not enough, and the first attempt at this
     proved it: the sole-writer warning is one bullet inside each agent's
     otherwise-distinct "# Rules" list, so no block was a near-duplicate of
     another while every pair still matched on the shared bullet. What has to
     be removed is the shared TEXT, not the blocks containing it.

     So boilerplate is subtracted at the shingle and term level: anything
     present in BOILERPLATE_DOC_COUNT or more documents stops counting as
     evidence anywhere. A block that is nothing BUT boilerplate then has no
     evidence left and cannot match; a block that embeds boilerplate inside
     real content is still compared on the real content. */
  const shingleDocs = new Map();
  const termDocs = new Map();
  for (const doc of docs) {
    const sSeen = new Set(), tSeen = new Set();
    for (const b of doc.blocks) {
      for (const s of b.sh) sSeen.add(s);
      for (const t of b.terms) tSeen.add(t);
    }
    for (const s of sSeen) shingleDocs.set(s, (shingleDocs.get(s) || 0) + 1);
    for (const t of tSeen) termDocs.set(t, (termDocs.get(t) || 0) + 1);
  }
  let boilerplateUnits = 0;
  for (const [, n] of shingleDocs) if (n >= BOILERPLATE_DOC_COUNT) boilerplateUnits++;
  for (const doc of docs) {
    for (const b of doc.blocks) {
      b.sh = new Set(Array.from(b.sh).filter((s) => (shingleDocs.get(s) || 0) < BOILERPLATE_DOC_COUNT));
      /* TERMS are deliberately NOT subtracted the same way. A word window
         appearing in three documents is copied boilerplate; a domain TERM
         appearing in three documents is just the ruleset's subject matter.
         Subtracting terms at this threshold deleted "anima", "peripheral"
         and "motes" from Exalted and took the canary down with them.
         Term rarity is handled by RARE_TERM_MAX_DOC_RATIO instead. */
    }
  }
  /* A block with nothing distinctive left is pure boilerplate. */
  const isBoilerplate = (b) => b.sh.size < MIN_SHARED_SHINGLES;

  /* ── rare-term pass ────────────────────────────────────────────────────
     Document frequency over the ruleset's own documents decides what counts
     as domain vocabulary here. "motes" is rare in D&D and ordinary in
     Exalted, so the threshold has to be computed per ruleset rather than
     hardcoded. */
  const termDocCount = new Map();
  for (const doc of docs) {
    const docTerms = new Set();
    for (const b of doc.blocks) for (const t of b.terms) docTerms.add(t);
    for (const t of docTerms) termDocCount.set(t, (termDocCount.get(t) || 0) + 1);
  }
  const maxDocs = Math.max(1, docs.length);
  const isRare = (t) => ((termDocCount.get(t) || 0) / maxDocs) <= RARE_TERM_MAX_DOC_RATIO;
  for (const doc of docs) {
    for (const b of doc.blocks) {
      b.rare = new Set();
      for (const t of b.terms) if (isRare(t)) b.rare.add(t);
    }
  }

  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const A = docs[i], B = docs[j];
      /* (a) agent-vs-agent and (b) agent-vs-lorebook. Two lorebook entries
         are compared too; only same-document blocks are skipped, which the
         i/j loop already guarantees. */
      if (A.kind === "lorebook" && B.kind === "lorebook") {
        /* Lorebook-internal overlap is real but far noisier (entries
           deliberately share vocabulary), and it is not what the council
           asked to see. Kept out of the default report. */
        continue;
      }
      const pairFindings = [];
      for (const ba of A.blocks) {
        if (isBoilerplate(ba)) continue;
        for (const bb of B.blocks) {
          if (isBoilerplate(bb)) continue;

          /* Signal 1 — copied text. */
          const c = containment(ba.sh, bb.sh);
          const copied = c.score >= CONTAINMENT_THRESHOLD && c.shared >= MIN_SHARED_SHINGLES;

          /* Signal 2 — same rule, reworded. */
          const enoughVocab = ba.rare.size >= MIN_RARE_TERMS_PER_BLOCK &&
                              bb.rare.size >= MIN_RARE_TERMS_PER_BLOCK;
          const rc = containment(ba.rare, bb.rare);
          const reworded = enoughVocab &&
            rc.shared >= MIN_SHARED_RARE_TERMS && rc.score >= RARE_TERM_CONTAINMENT;

          if (!copied && !reworded) continue;
          pairFindings.push({
            rulesetId,
            a: A.label, b: B.label,
            signal: copied && reworded ? "copied+reworded" : (copied ? "copied" : "reworded"),
            /* Rank on whichever signal actually fired, so a reworded finding
               is not sorted below a weaker copied one. */
            score: Number(Math.max(copied ? c.score : 0, reworded ? rc.score : 0).toFixed(2)),
            shared: copied ? c.shared : rc.shared,
            aExcerpt: firstLine(ba.text),
            bExcerpt: firstLine(bb.text),
            terms: reworded ? rc.examples : c.examples
          });
        }
      }
      pairFindings.sort((x, y) => y.score - x.score || y.shared - x.shared);
      for (const f of pairFindings.slice(0, MAX_FINDINGS_PER_PAIR)) findings.push(f);
    }
  }

  findings.sort((x, y) => y.score - x.score || y.shared - x.shared);
  return { rulesetId, findings, boilerplateUnits };
}

export function lintAll(dirs) {
  return dirs.map(lintRuleset);
}

export function formatReport(results) {
  const lines = [];
  let total = 0;
  for (const r of results) {
    if (!r.findings.length) continue;
    total += r.findings.length;
    lines.push("  " + r.rulesetId + " — " + r.findings.length + " duplicated block(s):");
    for (const f of r.findings) {
      lines.push("    [" + f.score.toFixed(2) + " " + f.signal + "] " + f.a + "  <->  " + f.b);
      lines.push("        A: " + f.aExcerpt);
      lines.push("        B: " + f.bExcerpt);
    }
  }
  if (total === 0) return "  no duplicated rules blocks above threshold.";
  lines.push("");
  lines.push("  " + total + " duplicated block(s) across " +
    results.filter((r) => r.findings.length).length + " ruleset(s). Report-only — nothing failed.");
  lines.push("  Fix direction: keep ONE canonical copy (the lorebook) and have agents query it.");
  return lines.join("\n");
}

function rulesetDirs(arg) {
  if (arg === "--all") {
    const rulesetsDir = resolve(root, "rulesets");
    return readdirSync(rulesetsDir)
      .map((n) => join(rulesetsDir, n))
      .filter((p) => statSync(p).isDirectory());
  }
  return [resolve(root, arg)];
}

/* Only run as a CLI when invoked directly — validate-bundle.mjs imports
   lintAll/formatReport and must not trigger a second argv parse. */
const invokedDirectly = process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: node tools/lint-agent-redundancy.mjs <rulesetDir> | --all [--json]");
    process.exit(2);
  }
  const results = lintAll(rulesetDirs(args[0]));
  if (args.includes("--json")) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log("Reference-redundancy report (report-only, never fails a build)");
    console.log(formatReport(results));
  }
  /* Always exit 0. The whole contract of a v1 report is that it cannot
     block a ship; the migration it feeds is ruleset-by-ruleset work. */
  process.exit(0);
}

export { lintRuleset, rulesetDirs };
