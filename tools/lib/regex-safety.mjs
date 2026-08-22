/**
 * regex-safety.mjs — local port of the Marinara engine's server-side
 * catastrophic-backtracking heuristic (packages/shared/src/utils/regex-safety.ts,
 * function isPatternSafe / hasPolynomialBacktrackingRisk, engine v2.4.3).
 *
 * Why a port instead of a dependency: this repo doesn't depend on the engine
 * package, and the engine repo isn't a publishable package this project can
 * import. This is a faithful line-for-line translation (types stripped only)
 * so `npm run validate-bundles` catches an unsafe regexScripts pattern
 * locally, before it ever reaches a live import and gets rejected with a
 * 400 mid-install (see tools/build-regex-scripts.mjs's 2026-08-22 fix for
 * the bug this exists to prevent from recurring).
 *
 * Re-sync if the engine's regex-safety.ts changes — it's vendored, not
 * live-linked, so drift is possible. Diff against
 * ~/Marinara-Engine/packages/shared/src/utils/regex-safety.ts periodically
 * (see COUPLINGS.md).
 */

const DEFAULTS = {
  maxLength: 1000,
  maxStarHeight: 1,
  maxRepetition: Infinity,
};

const INVALID_QUANTIFIER = Symbol("invalid-quantifier");

export function isPatternSafe(source, options = {}) {
  const { maxLength, maxStarHeight, maxRepetition } = { ...DEFAULTS, ...options };

  if (typeof source !== "string") return false;
  if (source.length === 0) return true;
  if (source.length > maxLength) return false;
  if (hasPolynomialBacktrackingRisk(source, maxRepetition)) return false;

  let i = 0;
  let groupDepth = 0;
  const groupInnerHeight = [];
  const groupBodyStart = [];
  let topLevelHeight = 0;

  const recordAtomHeight = (h) => {
    if (groupDepth > 0) {
      const idx = groupInnerHeight.length - 1;
      if (h > groupInnerHeight[idx]) groupInnerHeight[idx] = h;
    } else if (h > topLevelHeight) {
      topLevelHeight = h;
    }
  };

  while (i < source.length) {
    const c = source[i];

    if (c === "\\") {
      const atomEnd = consumeEscapedAtom(source, i);
      if (atomEnd === null) return false;
      const consumed = consumeQuantifier(source, atomEnd, maxRepetition);
      if (consumed === INVALID_QUANTIFIER) return false;
      recordAtomHeight(consumed?.addsStarHeight ? 1 : 0);
      i = consumed?.end ?? atomEnd;
      continue;
    }

    if (c === "[") {
      const closeIdx = findCharClassClose(source, i);
      if (closeIdx === -1) return false;
      const atomEnd = closeIdx + 1;
      const consumed = consumeQuantifier(source, atomEnd, maxRepetition);
      if (consumed === INVALID_QUANTIFIER) return false;
      recordAtomHeight(consumed?.addsStarHeight ? 1 : 0);
      i = consumed?.end ?? atomEnd;
      continue;
    }

    if (c === "(") {
      groupDepth += 1;
      groupInnerHeight.push(0);
      const bodyStart = getGroupBodyStart(source, i);
      if (bodyStart === null) return false;
      groupBodyStart.push(bodyStart);
      i = bodyStart;
      continue;
    }

    if (c === ")") {
      if (groupDepth === 0) return false;
      const innerHeight = groupInnerHeight.pop() ?? 0;
      const bodyStart = groupBodyStart.pop() ?? i;
      groupDepth -= 1;
      const consumed = consumeQuantifier(source, i + 1, maxRepetition);
      if (consumed === INVALID_QUANTIFIER) return false;
      const quantified = consumed?.addsStarHeight === true;
      if (quantified && hasUnsafeQuantifiedAlternation(source.slice(bodyStart, i))) return false;
      const groupHeight = innerHeight + (quantified ? 1 : 0);
      if (groupHeight > maxStarHeight) return false;
      recordAtomHeight(groupHeight);
      i = consumed?.end ?? i + 1;
      continue;
    }

    const atomEnd = i + 1;
    const consumed = consumeQuantifier(source, atomEnd, maxRepetition);
    if (consumed === INVALID_QUANTIFIER) return false;
    recordAtomHeight(consumed?.addsStarHeight ? 1 : 0);
    i = consumed?.end ?? atomEnd;
  }

  if (groupDepth !== 0) return false;
  if (topLevelHeight > maxStarHeight) return false;
  return true;
}

function consumeQuantifier(source, i, maxRepetition) {
  const c = source[i];
  if (c === "*" || c === "+" || c === "?") {
    const next = source[i + 1];
    if (next === "+") return INVALID_QUANTIFIER;
    return {
      end: next === "?" ? i + 2 : i + 1,
      addsStarHeight: c !== "?",
      unbounded: c !== "?",
      required: c === "+",
    };
  }
  if (c === "{") {
    const close = source.indexOf("}", i + 1);
    if (close === -1) return null;
    const body = source.slice(i + 1, close);
    const m = /^(\d+)(,(\d*))?$/.exec(body);
    if (!m) return null;
    const lo = Number(m[1]);
    const upperRaw = m[3];
    const hi = m[2] === undefined ? lo : upperRaw === "" || upperRaw === undefined ? Infinity : Number(upperRaw);
    if (!Number.isFinite(lo) || lo > maxRepetition) return INVALID_QUANTIFIER;
    if (Number.isFinite(hi) && hi > maxRepetition) return INVALID_QUANTIFIER;
    if (!Number.isFinite(hi) && Number.isFinite(maxRepetition)) return INVALID_QUANTIFIER;
    let next = close + 1;
    if (source[next] === "+") return INVALID_QUANTIFIER;
    if (source[next] === "?") next += 1;
    return { end: next, addsStarHeight: true, unbounded: !Number.isFinite(hi), required: lo > 0 };
  }
  return null;
}

function consumeEscapedAtom(source, i) {
  const next = source[i + 1];
  if (next === undefined) return null;
  if ((next === "p" || next === "P" || next === "u") && source[i + 2] === "{") {
    const close = source.indexOf("}", i + 3);
    return close === -1 ? null : close + 1;
  }
  return i + 2;
}

function getGroupBodyStart(source, openIdx) {
  if (source[openIdx + 1] !== "?") return openIdx + 1;
  const kind = source[openIdx + 2];
  if (kind === ":" || kind === "=" || kind === "!") return openIdx + 3;
  if (kind === "<") {
    const lookbehindKind = source[openIdx + 3];
    if (lookbehindKind === "=" || lookbehindKind === "!") return openIdx + 4;
    const close = source.indexOf(">", openIdx + 3);
    return close === -1 ? null : close + 1;
  }
  return null;
}

function findCharClassClose(source, openIdx) {
  let j = openIdx + 1;
  if (source[j] === "^") j += 1;
  if (source[j] === "]") j += 1;
  while (j < source.length) {
    const c = source[j];
    if (c === "\\") {
      j += 2;
      continue;
    }
    if (c === "]") return j;
    j += 1;
  }
  return -1;
}

function hasUnsafeQuantifiedAlternation(body) {
  const alternatives = splitTopLevelAlternatives(body);
  if (alternatives.length < 2) return false;
  const tokenized = alternatives.map(tokenizeAlternative);
  if (tokenized.some((tokens) => tokens.length === 0)) return true;

  for (let i = 0; i < tokenized.length; i += 1) {
    for (let j = i + 1; j < tokenized.length; j += 1) {
      const a = tokenized[i];
      const b = tokenized[j];
      if (isTokenPrefix(a, b) || isTokenPrefix(b, a)) return true;
    }
  }
  return false;
}

function splitTopLevelAlternatives(body) {
  const alternatives = [];
  let start = 0;
  let depth = 0;
  let inClass = false;
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i];
    if (c === "\\") {
      i += 1;
      continue;
    }
    if (inClass) {
      if (c === "]") inClass = false;
      continue;
    }
    if (c === "[") {
      inClass = true;
      continue;
    }
    if (c === "(") {
      depth += 1;
      continue;
    }
    if (c === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (c === "|" && depth === 0) {
      alternatives.push(body.slice(start, i));
      start = i + 1;
    }
  }
  alternatives.push(body.slice(start));
  return alternatives;
}

function tokenizeAlternative(alternative) {
  const tokens = [];
  for (let i = 0; i < alternative.length; i += 1) {
    const c = alternative[i];
    if (c === "\\") {
      const end = consumeEscapedAtom(alternative, i);
      if (end === null) return tokens;
      tokens.push(alternative.slice(i, end));
      i = end - 1;
      continue;
    }
    if (c === "[") {
      const close = findCharClassClose(alternative, i);
      if (close === -1) return tokens;
      tokens.push(alternative.slice(i, close + 1));
      i = close;
      continue;
    }
    if ("(){}*+?|^$.".includes(c)) {
      return tokens;
    }
    tokens.push(c);
  }
  return tokens;
}

function isTokenPrefix(prefix, candidate) {
  if (prefix.length > candidate.length) return false;
  return prefix.every((token, index) => candidate[index] === token);
}

function hasPolynomialBacktrackingRisk(source, maxRepetition) {
  let broadUnboundedCount = 0;
  let adjacentBroadUnboundedCount = 0;
  let pendingNegatedClassBoundary = null;
  let countBeforePendingNegatedClass = 0;

  const consumeRequiredLiteralBoundary = (literal) => {
    adjacentBroadUnboundedCount = 0;
    if (
      literal !== null &&
      pendingNegatedClassBoundary !== null &&
      !characterClassMatchesLiteral(pendingNegatedClassBoundary, literal)
    ) {
      broadUnboundedCount = countBeforePendingNegatedClass;
      pendingNegatedClassBoundary = null;
    }
  };

  for (let i = 0; i < source.length; ) {
    const c = source[i];

    if (c === "\\") {
      const atomEnd = consumeEscapedAtom(source, i);
      if (atomEnd === null) return true;
      const consumed = consumeQuantifier(source, atomEnd, maxRepetition);
      if (consumed === INVALID_QUANTIFIER) return true;
      const broadUnbounded = consumed?.unbounded === true && isBroadEscapedAtom(source[i + 1]);
      if (broadUnbounded) {
        pendingNegatedClassBoundary = null;
        countBeforePendingNegatedClass = broadUnboundedCount;
        broadUnboundedCount += 1;
        adjacentBroadUnboundedCount += 1;
        if (adjacentBroadUnboundedCount >= 2 || broadUnboundedCount >= 3) return true;
      } else if (isRequiredLiteralAtom(consumed)) {
        consumeRequiredLiteralBoundary(readRequiredLiteral(source.slice(i, atomEnd)));
      }
      i = consumed?.end ?? atomEnd;
      continue;
    }

    if (c === "[") {
      const closeIdx = findCharClassClose(source, i);
      if (closeIdx === -1) return true;
      const atomEnd = closeIdx + 1;
      const consumed = consumeQuantifier(source, atomEnd, maxRepetition);
      if (consumed === INVALID_QUANTIFIER) return true;
      const broadUnbounded = consumed?.unbounded === true && isBroadCharacterClass(source.slice(i, atomEnd));
      if (broadUnbounded) {
        const characterClass = source.slice(i, atomEnd);
        countBeforePendingNegatedClass = broadUnboundedCount;
        pendingNegatedClassBoundary = characterClass.startsWith("[^") ? characterClass : null;
        broadUnboundedCount += 1;
        adjacentBroadUnboundedCount += 1;
        if (adjacentBroadUnboundedCount >= 2 || broadUnboundedCount >= 3) return true;
      } else if (isRequiredLiteralAtom(consumed)) {
        consumeRequiredLiteralBoundary(null);
      }
      i = consumed?.end ?? atomEnd;
      continue;
    }

    if (c === ".") {
      const atomEnd = i + 1;
      const consumed = consumeQuantifier(source, atomEnd, maxRepetition);
      if (consumed === INVALID_QUANTIFIER) return true;
      if (consumed?.unbounded) {
        pendingNegatedClassBoundary = null;
        countBeforePendingNegatedClass = broadUnboundedCount;
        broadUnboundedCount += 1;
        adjacentBroadUnboundedCount += 1;
        if (adjacentBroadUnboundedCount >= 2 || broadUnboundedCount >= 3) return true;
      } else if (isRequiredLiteralAtom(consumed)) {
        consumeRequiredLiteralBoundary(".");
      }
      i = consumed?.end ?? atomEnd;
      continue;
    }

    if (c === "(" || c === ")" || c === "|" || c === "^" || c === "$") {
      i += 1;
      continue;
    }

    const atomEnd = i + 1;
    const consumed = consumeQuantifier(source, atomEnd, maxRepetition);
    if (consumed === INVALID_QUANTIFIER) return true;
    if (isRequiredLiteralAtom(consumed)) consumeRequiredLiteralBoundary(c);
    i = consumed?.end ?? atomEnd;
  }

  return false;
}

function readRequiredLiteral(atom) {
  if (atom.length === 1) return atom;
  if (/^\\[\\^$.*+?()[\]{}|/-]$/.test(atom)) return atom[1] ?? null;
  return null;
}

function characterClassMatchesLiteral(characterClass, literal) {
  try {
    return new RegExp(`^(?:${characterClass})$`).test(literal);
  } catch {
    return true;
  }
}

function isRequiredLiteralAtom(consumed) {
  return consumed === null || consumed.required;
}

function isBroadEscapedAtom(atom) {
  return atom === "s" || atom === "S" || atom === "w" || atom === "W" || atom === "d" || atom === "D";
}

function isBroadCharacterClass(source) {
  const body = source.slice(1, -1);
  if (!body) return false;
  if (body.startsWith("^")) return true;
  return (
    body.includes("\\s") ||
    body.includes("\\S") ||
    body.includes("\\w") ||
    body.includes("\\W") ||
    body.includes("\\d") ||
    body.includes("\\D")
  );
}
