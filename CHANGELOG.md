# Changelog

All notable changes to Marinara-RPG-Extension are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Version numbers follow [Semantic Versioning](https://semver.org/) once a 1.0
release is cut; pre-1.0 minor bumps may include breaking changes (called out
explicitly when they do).

## [Unreleased]

Pending the next published release. New entries land here between releases;
each release moves the entries into a dated section below.

### Added — Phase 3.1 UI port: row primitives extracted from sheet.jsx (2026-05-08)

First slice of the multi-session renderSheet rewrite. Seven foundational row primitives translated from the Claude-Design prototype's `~/projects/claude-design-updates/sheet.jsx` into vanilla-JS DOM-builder functions, sitting alongside the existing 7K-line `renderSheet` so a future-session cutover can compose them mechanically. No behavioral change this commit — primitives are uncalled by the running renderer.

- **`mrrP3RenderSection(parent, opts, bodyFn)`** — collapsible card matching `sheet.jsx:17`. Open/closed state persists in `state.sheet.sectionCollapse[id]` when `id` is provided. Click on header toggles + saves + re-renders; clicks on actions / right slot don't propagate.
- **`mrrP3RenderStepper(parent, opts)`** — −/+ stateless buttons matching `sheet.jsx:34`. Clamps via `mrrP3Clamp` and calls `onChange`.
- **`mrrP3RenderAttrRow(parent, opts)`** — attribute row (5-col grid) matching `sheet.jsx:44`. Composes `mrrP3RenderStepper`. Modifier slot collapses when `opts.modifier` is undefined/null.
- **`mrrP3RenderSkillRow(parent, opts)`** — skill row (4-col grid) matching `sheet.jsx:60`. Largest primitive — handles autoCalc total breakdown tooltip, clickable tier pill that cycles `opts.tiers`, gear bonus pill, in-place specialty chips with delete + click-to-roll, an inline specialty editor toggleable via `+ spec` button, and an optional `×` delete button.
- **`mrrP3RenderSaveRow(parent, opts)`** — save row (4-col grid) matching `sheet.jsx:132`. Always autoCalc; total bonus computed by caller; tier pill cycles like SkillRow's.
- **`mrrP3RenderBar(parent, opts)`** — resource bar matching `sheet.jsx:149`. Auto-color: ratio < 0.3 → bad, < 0.65 → warn, else ok (override via `opts.fillVariant`). Quick-button array supports `{label, delta}` deltas applied to current.
- **`mrrP3RenderDamageTrack(parent, opts)`** — Exalted damage track matching `sheet.jsx:180`. Counts B/L/A from `track.filled`; renders cell buttons whose click fires `onCellClick(i)`; track tools support add -0/-1/-2 boxes, remove last, Heal worst, Heal all (disabled when no damage).

CSS additions (~500 lines) under the **`mrr-p3-*` namespace** prevent collision with the running renderer's existing `.mrr-section` / `.mrr-row` / `.mrr-stepper` / `.mrr-bar` rules. Both `extension/RPG-Extension-GM-Mode.css` and the embedded `EMBEDDED_CSS` string are in sync via `tools/embed-css.mjs`. Density values (12/8/30/13 cozy defaults from UI-build.md §2.3) are inlined since the extension doesn't yet ship `--density-*` tokens; the token-migration phase will swap them.

Function names use the `mrrP3*` prefix for the same reason — `renderAttrRow` / `renderSkillRow` / `renderSaveRow` / `renderBar` already exist in the extension at the running-renderer's call sites; same-name redeclarations would shadow and break the live UI.

The new primitives have no caller this session by design — they're foundation for Session 3.2 (panel-frame port) and Session 3.3+ (renderSheet body cutover). Engine functions (`statContext`, `equippedBonuses`, `tierForSkill`, `resolveTierBonus`) are untouched. State-mutator parser (Phase 2) is untouched. Bundle install validators all PASS.

### Added — Phase 2 UI port: state-mutator write-back + mote-pool plumbing (2026-05-08)

Phase 2 of the multi-session UI port. Closes the read/write asymmetry Phase 1 left open: agents could SEE the new XP and commitment state but couldn't MODIFY it. Phase 2 wires the write path on three surfaces — agent tags, inventory dialog, and item delete — so every mutation route honors the same caps and pool budget.

- **State-mutator parser — five new field branches.** `applyStateMutation` in `extension/RPG-Extension-GM-Mode.js` gains branches for:
  - `[mrr-state: field="xp" delta="±N"]` and absolute `current/level/next/total` (pool-style rulesets bump both `current` and `total` on positive delta; mixed delta+absolute rejected as ambiguous)
  - `[mrr-state: field="attunement" item="Name" attuned="true|false"]` (cap-3 enforced at write time; exclusivity check against invested + mote commitment)
  - `[mrr-state: field="investiture" item="Name" invested="true|false"]` (cap-10; mirror exclusivity)
  - `[mrr-state: field="commitment" item="Name" motes=N pool="Personal|Peripheral"]` (atomic pool change, negative-floor refusal, exclusivity vs attuned/invested)
  All branches surface error toasts via `warn()` on rejection and route success through `finalizeMutation` for the existing saveSheet → renderSheet → mutationLog → toast pipeline.

- **Cache fix on snapshot read sites.** `buildSyncFields` and `buildSheetForPrompt` no longer short-circuit on the `state.sheet.attunedCount` / `investedCount` caches. All four read sites recompute from inventory each call so an agent-side write that bypasses `openItemDialog` (the Phase 2.B parser) still produces correct counts in the next snapshot fire. Cache fields stay on disk for legacy consumers but are no longer trusted.

- **Delete-time mote restore.** `deleteItem` now restores committed motes to `state.sheet.derived[motePool]` before persisting. Removing an Exalted item with `moteCommitment > 0` previously leaked those motes — the field went to GC but the pool subtraction stayed forever. Phase 2 closes that.

- **Mote-pool live decrement on item save.** The `openItemDialog` save handler (mote model) now propagates `moteCommitment` + `motePool` deltas to `state.sheet.derived[motePool]` atomically. Pool change (Personal → Peripheral) restores the old commit to the old pool first, then debits the new commit from the new pool. Negative-floor check refuses commits that would deplete a pool below 0 — the inline message slot surfaces the error and the dialog keeps the prior commitment.

- **Agent docs — `gm-agent.md` (D&D 5e + Exalted 3e).** New `## State-mutator tags` sections teaching the narration model when to emit `xp`, `attunement`, and `commitment` tags. D&D's section covers the cap-3 attunement rule and the formula-style XP behavior; Exalted's section covers the pool-style XP accounting (delta bumps `current` AND `total`) and the two-pool mote commitment model.

- **Lorebook entries — D&D 5e + Exalted 3e + PF2e.** Keyword-triggered context injections so the agent can answer "how does attunement work?" / "what's mote commitment?" / "how does PF2e investiture work?" using SRD-aligned content. Each entry includes the corresponding state-mutator tag form so the agent doesn't have to consult `gm-agent.md` to remember the syntax. PF2e gets two entries (investiture + state-mutator XP tags) because PF2e's bundle.json embeds the lorebook directly without a sibling `gm-agent.md`.

- **Three pool writers, one pattern.** All three derived[motePool]-mutating paths — `deleteItem`, `openItemDialog` save handler, and the new `applyStateMutation` commitment branch — follow the same restore-old + debit-new pattern with negative-floor refusal. Side-effect ordering is consistent so a future cross-path interaction (delete-an-item-with-motes immediately after a state-mutator commit) does the right thing.

- **Engine functions still untouched.** `statContext`, `equippedBonuses`, `tierForSkill`, `resolveTierBonus` — sacred this phase too.

- **Deferred** (continuing the multi-session port, tracked in `MEMORY/WORK/20260508-marinara-ui-port/ISA.md`): the bigger work — design-token migration to oklch + Geist fonts, full `renderSheet` rewrite from `panel-frame.jsx`, item-bonus schema upgrade `{target,value,kind}` → `{stat,delta}`. Decision point for next session: tokens first (CSS-only, shallower) or renderer first (JS, deeper but unblocks the rest).

### Added — Phase 1 UI port: commitmentModel + XP card + snapshot extension (2026-05-08)

First Phase of the multi-session UI port that merges the Claude-Design prototype at `~/projects/claude-design-updates/` into both extensions. Phase 1 ships the data plumbing, the visible XP card, and the agent-facing snapshot. Subsequent phases will translate the rest of the React/JSX prototype (panel-frame, dialog system, full token migration) into the existing vanilla-JS form.

- **`commitmentModel` declaration in `ruleset.schema.json`.** New optional enum property on the ruleset root: `"attuned"` (D&D 5e), `"invested"` (Pathfinder 2e), `"mote"` (Exalted 3e), or `null` (default — ruleset has no commitment mechanic). Existing rulesets are unaffected; the field is optional with a null default.
- **`xpTable` declaration in `ruleset.schema.json`.** New optional array property on the ruleset root: ordered `{level, xp}` entries that drive the XP card's next-level threshold + progress bar. Pool-based rulesets omit this; their XP card shows current/total + a +1 button.
- **Reference rulesets declare commitmentModel.** `dnd5e/ruleset.json` declares `"attuned"` + 20-entry SRD `xpTable`. `exalted3e/ruleset.json` declares `"mote"` (no xpTable; pool system). `pathfinder2e/bundle.json` declares `"invested"` + 20-entry 1000/level `xpTable`.
- **Item commitment fields in inventory editor.** New "Magic / Commitment" section between Hardness/Overwhelming and Bonuses, gated by `ruleset.commitmentModel` and the equipment category. Boolean models (attuned / invested) render a checkbox with cap enforcement (3 / 10) and an inline error in the existing dialog message slot when the cap is hit. The mote model renders an integer commit input plus a Personal/Peripheral pool select. Items now persist `attuned`, `invested`, `moteCommitment`, `motePool` fields; `normalizeInventoryItem` heals legacy saves into the new shape.
- **Cap enforcement counters on the sheet.** New `state.sheet.attunedCount` and `state.sheet.investedCount` derived caches refreshed on every inventory write so the editor's cap check stays cheap and the snapshot always shows the current budget.
- **XP card slotted between identity and section list.** New `renderXpCard` function called from `renderSheet` between `renderSheetHeader` and the `sectionsforEach` loop. Two layouts driven by `ruleset.resolution.mode`: single-roll (D&D, PF2e) shows level + current/next + 4px progress bar fed by `ruleset.xpTable`; dice-pool (Exalted) shows current + total earned + a "+1 XP" button (a pure int accumulator that increments BOTH fields atomically). Skipped silently for any other resolution mode (Fate Core uses Fate Points, not XP). Live updates: editing level or current refreshes the next-display and bar fill in place — no full sheet rebuild, focus preserved. Lazy field healing: tolerates a saved sheet without xp fields and seeds defaults in place, so legacy sheets work without a `mergeSheet` migration.
- **Snapshot extension — `buildSyncFields`.** Writes new fields to `chats.customTrackerFields` so any agent reading the standard tracker surface sees XP and commitment state. Single-roll → `XP Level`, `XP Current`, `XP Next`. Dice-pool → `XP Current`, `XP Total Earned`. Boolean commitment → `Attuned` / `Invested` field formatted as `in-use / cap`. Mote model → `Mote Commitment` field with total + per-pool breakdown.
- **Snapshot extension — `buildSheetForPrompt`.** Adds an "Experience:" section before the Inventory block, annotates each inventory row with its commitment state (ATTUNED / INVESTED / committed:N motes), and adds a "Magic / Commitment:" summary block after the inventory list. The GM agent now sees XP progression and item commitment in every prompt fire, without the player having to re-explain it. Foundation for the agent-side rule-awareness work targeted before the 5/14 ship.
- **CSS additions for the XP card.** New `.mrr-xp-card-*` classes in `RPG-Extension-GM-Mode.css` (134 lines) re-embedded into the JS string via `tools/embed-css.mjs`. Reuses existing `--mrr-bg-elev`, `--mrr-accent`, `--mrr-mono`, etc. tokens — Phase 1 is additive, no token migration yet.
- **Engine functions intentionally untouched.** `statContext`, `equippedBonuses`, `tierForSkill`, `resolveTierBonus`, the dice payload schema, the chat-feed payload shapes — all preserved exactly. Autocalc paths sacred this run.
- **Deferred to subsequent sessions** (tracked in `MEMORY/WORK/20260508-marinara-ui-port/ISA.md`): full `renderSheet` rewrite, panel-frame port, dialog system port, design-token migration to oklch + Geist fonts, item-bonus schema upgrade `{target,value,kind}` → `{stat,delta}`, mote-pool live decrement on commit, `mergeSheet` defaulting xp + counters for legacy saved sheets.

### Added — Exalted: Hardness, Overwhelming, Intimacies, GM-mutable backgrounds + intimacies (2026-05-06)

- **Hardness on inventory items.** New non-negative integer field `hardness` on every inventory item. Defaults to 0 (chip hidden). Surfaces as a `Hardness N` chip on the inventory card and a "Hardness" numeric input in the equipment-edit dialog. Heals on legacy saves via `normalizeInventoryItem`.
- **Overwhelming on inventory items.** Companion field `overwhelming` (also non-negative integer). Surfaces as `Overwhelming N` chip and "Overwhelming" dialog input. Both fields are equipment-only in the dialog — non-equipment items hide the inputs and clear the values to 0 on save.
- **Intimacies sheet section + flyout panel (Exalted).** New `renderIntimaciesSection` mirrors the Charms/Spellbook flyout pattern. Floating panel groups entries into Minor / Major / Defining collapsible sections (state in `state.sheet.intimacyCollapse[degree]`, default closed). Each row: kind chip (Tie ⇄ Principle, click to toggle), debounce-saved text input, degree dropdown, optional target field (Tie only), Delete button. Per-degree `+ Add <Degree>` buttons plus a top-level `+ Add Intimacy`. State on sheet: `intimacies: []`, `intimacyCollapse: {}`. Healed on legacy saves via `mergeSheet`.
- **State-mutator: backgrounds.** GM agent can now adjust the on-sheet Backgrounds & Merits via `[mrr-state: field="backgrounds" ...]` tags: `add="Name" rating="N"`, `remove="Name"`, or `name="Name" delta="±N"` (clamped to ruleset min/max). Symmetric with the existing conditions/inventory branches; goes through `finalizeMutation`/`showMutationToast` and respects `processedMessageIds` idempotency.
- **State-mutator: intimacies.** Companion branch: `[mrr-state: field="intimacies" add="text" degree="..." kind="..." target="..."]`, `remove="text"`, or `text="text" degree="..."` / `kind="..."` to update an existing entry in place. Defaults: `kind="tie"`, `degree="minor"`. Removing a kind toggle off `tie` clears the target.
- **Lorebook entries (Exalted).** Three new keyword-triggered entries explain Hardness, Overwhelming damage, and Intimacies (Ties + Principles + Minor/Major/Defining degrees) in canon terms.
- **`gm-agent.md` (Exalted).** New sections teach the agent the four state-mutator tag combinations and remind it to honor Hardness vs Overwhelming when narrating combat outcomes.

### Added — Step 1 of character-library storage evolution: chat-independent sheet keys (2026-05-06)

- **Sheet data decoupled from `chatId`.** New `characterKey(characterId)` returns `mrr-character-{characterId}` — the post-v0.4.1 home for sheet data. `loadSheet` tries this key first, falls back to the legacy `mrr-sheet-{chatId}-{characterId}` once with auto-migration (copies forward, leaves legacy in place for safety), then blank. `saveSheet` writes only to the character-library key. The `chatId` argument is retained for interface stability but unused in the new path.
- **`loadCharacters` migrates legacy bare `id: "player"` ids to fresh UUIDs on first load.** Every chat used to default to `id: "player"`, which would collide across chats under the new chat-independent key. Migration: each legacy "player" character gets a fresh `char-{Date.now()}-{random}` id, the chat's character list and `mrr-active-char-{chatId}` pointer update, and the legacy chat-scoped sheet copies forward to `characterKey(newId)`. Each historical chat keeps its own distinct sheet — no data loss, no collision.
- **What this unlocks:** characters become portable across chats. Foundation for any future "import character into this chat" UI; foundation for Steps 2 (IndexedDB) and 3 (Marinara API mirror) per the roadmap at `~/cc-wiki/Roadmap/marinara-character-library-storage-evolution.md`.


## [0.4.1] - 2026-05-06

Sheet-ergonomics, item lifecycle, and multi-system damage release. Twenty-two iterative rounds of fixes against live in-Marinara playtest, all in service of getting D&D 5e and Exalted 3e to feel correct under the new two-tier inventory + state-mutator + bar UX models. The big themes:

- **Inventory is robust end-to-end.** Items survive load (no silent merge drop), agent-added items carry the full dialog field set (slot, damage, attack_attr, attack_proficient, use_effect, consumable, notes, category), the agent's own promptTemplate documents the schema as extension-confirmed, and consumable Use posts a tag the GM agent reads.
- **Bars finally make sense.** Every bar shows editable current AND max as separate inputs; user-set max overrides ruleset formula/literal so manual adjustments stick; refresh re-syncs both inputs to state after every state-mutator delta (no more stale UI confusing the agent on the next refresh).
- **Damage parser is multi-system.** `parseDamageExpression` handles D&D `NdM[+K] [type]`, Exalted `12L`/`12B`/`12A`/`12dL`/`12 Lethal` (rolls Nd10 → counts 7+ as successes per Exalted 3e), and flat `5 fire`. Weapons, items, and spells all share one parser.
- **Per-ruleset polish.** Exalted header now reads `Type` / `Caste/Aspect`; D&D Feats section enabled with `textOnly` rows; D&D 5e attribute modifiers + skill bonuses + saves are first-class autocalc; conditions tracker with roll-mode aggregation; item categories (equipment vs item) with separate Equipment section + Items flyout panel.



### Added — Sheet ergonomics batch (six features)

- **Editable numeric inputs everywhere.** Attributes, skills, derived stats, backgrounds, custom skills, and bar current values (HP, motes) all swap their value `<span>` for an `<input type="number">`. Type a number and press Enter or tab away to commit; the +/- stepper still nudges. Native browser spinners are suppressed because the stepper already provides that affordance and double controls are visual noise.
- **Identity row in the sheet header.** Two free-text fields below the character switcher whose labels are ruleset-driven: Race + Class (D&D 5e), Ancestry + Class (PF2e), Exalt Type + Caste (Exalted 3e), Concept + Trouble (Fate Core). New optional `header.raceLabel` / `header.classLabel` in the ruleset schema; old bundles fall back to "Race" / "Class".
- **D&D 5e Feats section.** The dnd5e ruleset and bundle now ship with `backgrounds: { enabled: true, label: "Feats", min: 0, max: 5, default: 0 }` and `"backgrounds"` inserted into `sheetSections` between states and inventory. The existing free-text dot-rated trait pattern carries D&D feats with no new section type.
- **Add custom skills / lores.** A "+ Add Skill" button at the foot of the Skills section pushes a fresh entry into `state.sheet.customSkills`. Each row has a free-text name input, optional linked-attribute select drawn from the ruleset's attributes, value display + stepper, and remove × button. Multiple custom skills are supported. Custom skill values participate in `statContext()` so dice formulas and `valueFormula` can reference them by name.
- **Autocalc for derived stats.** New optional `derivedStats[].valueFormula` (parallel to existing `maxFormula`). When present, the sheet displays the computed value and suppresses the manual stepper — the formula IS the override. Same `{StatName}` placeholder + arithmetic-only whitelist as `maxFormula`. Exalted 3e populated for Defense (Parry), Defense (Evasion), Resolve, Guile, Soak (Bashing), and Soak (Lethal).
- **Backwards-compatible storage shape.** New fields (`identity`, `customSkills`) default to empty on `blankSheet`; `mergeSheet` accepts either presence or absence. Old saved sheets load without migration.

### Fixed — v0.4.x Round 22 — Damage parser handles Exalted notation (NL/NB/NA, NdL/NdB/NdA, "N Lethal") (2026-05-06)

- **Damage parser was hardcoded to D&D's `NdM[+K] [type]` regex.** Live test in Exalted surfaced three Exalted-flavored damage strings the agent emitted that the parser rejected: `12L` (12 dice, lethal), `12dL` (dice-pool variant), and `12 Lethal` (word type). All three logged `rollWeaponDamage: cannot parse '...'` and the dmg button silently failed.
- **New unified `parseDamageExpression(s)`** returns a tagged result `{kind: "dnd"|"exalted"|"flat", ...}`. Three regexes feed it: D&D `NdM[+K] [type]`, Exalted single-letter `N[d]X` where `X ∈ {B,L,A}`, and flat `N type-word`. When the type word is Bashing/Lethal/Aggravated the flat branch routes to Exalted (matches Exalted convention that the number is dice pool count, not result). Anything else stays flat.
- **New `rollParsedDamage(parsed, opts)`** dispatches by kind: D&D rolls Nd-size and sums; Exalted rolls Nd10 and counts 7+ as successes (Exalted 3e damage convention — 10s do NOT double on damage rolls); flat posts the value as-is. Returns `{text, faces, kind}` so the caller finalizes via `finalizeRoll`.
- **`rollWeaponDamage`, `useItem`, and `castSpell` (ability.damageDice)** all now route through the unified parser. One contract, one place to extend when a future ruleset wants its own damage notation. Exalted `12L` weapons now roll 12d10 and count successes; `2d4+2 healing` potions still sum dice; `5 fire` flat values just post.
- **`mrr-dice__face--success` CSS class** already existed; Exalted dice rolls now apply it to faces showing 7+ for visual success-counting feedback.
- **Re-paste the extension JS** to activate. No bundle change required.

### Fixed — v0.4.x Round 21 — Bars always show editable max + refresh syncs inputs + Willpower per-character cap (2026-05-06)

- **All bars now render an editable max input alongside current.** Previously `renderBar` gated the max input behind `!hasExplicitMax`, so Personal Motes / Peripheral Motes / Willpower (all formula- or literal-capped) hid the max — the player could only see "current" with no way to inspect or override the cap, and a state-mutator refresh attempt produced math errors because the agent had only one number to read. Now every bar shows `[current] / [max]` as two editable inputs. For ruleset-capped bars the max input default-displays the formula/literal value; typing a value persists to `state.sheet.derivedMax[name]` and overrides the ruleset (Anima boosts, temporary Willpower modifiers, GM-side tweaks the formula doesn't model). Tooltip on the max input names the formula/default explicitly so it's clear what the user is overriding.
- **`refresh()` now re-syncs both inputs to current state.** A state-mutator delta like `[mrr-state: field="Personal Motes" delta="+5"]` writes to `state.sheet.derived["Personal Motes"]` and fires `refreshAllBars()`. Pre-fix: the bar fill + label updated, but the editable inputs kept showing stale numbers — the player saw "8" in the input but the bar said "13 / 25", and the GM agent's next refresh attempt computed against the stale display. Fix: refresh() unconditionally writes `inputEl.value` and `maxEl.value` from current state.
- **`computeMax()` derivedMax check moved to top.** User-set override now wins over `maxFormula`/`max` literal so manual edits stick across re-renders. Previously the formula always recomputed and clobbered the user override; now once the user types a max value, that's the cap until they clear it.
- **Willpower no longer has a hardcoded `max: 10` in the ruleset.** Canonical Exalted Willpower caps are per-character (typically 5–10 for Solars). The literal cap forced every character to display "10" as the cap. Removed `max: 10` from the exalted3e Willpower derived-stat definition; the user now sets the cap via the bar's max input. Default for fresh sheets falls through the auto-grow fallback until the user types a value (recommended: 5 for starting Solars).
- **Re-install the exalted3e bundle** to pick up the Willpower ruleset change. Re-paste the `extension/RPG-Extension-GM-Mode.js` to pick up the renderBar + refresh fixes (CSS already embedded by `tools/embed-css.mjs`).

### Added — v0.4.x Round 20 — Exalted header labels + capped-value display (2026-05-06)

- **Exalted 3e header labels updated.** `header.raceLabel: "Exalt Type"` → `"Type"`; `header.classLabel: "Caste"` → `"Caste/Aspect"`. Bundle regenerated; reflects the canonical Solar/Sidereal/Abyssal vocabulary (Exalts have a Type and a Caste; Dragon-Bloods use Aspect — the slash makes it work for both without forcing a single term).
- **Derived stats with declared caps now show "current / max" inline.** `renderValue` (used for `renderAs: "value"` derived stats) gained a `computeValueMax()` helper and an inline `mrr-row__cap` span that reads `" / N"` whenever the ruleset declared a `max` literal or a `maxFormula`. Essence reads "5 / 10", any value-rendered capped stat reads similarly. The cap label refreshes when bars refresh, so a capped stat keyed on another stat's value (Personal Motes' max keyed on Essence) updates live. Editable input + stepper now also clamp to the computed cap when one is declared. CSS class `.mrr-row__cap` styled in monospace dim-text matching the existing bonus suffix idiom.
- **`renderAs: "bar"` unchanged** — Willpower (already a bar with `max: 10`) keeps its bar-fill UX with the existing "current / max" label inside the fill. The new cap suffix only adds visibility to value-rendered stats that were previously bare numbers.

### Added — v0.4.x Round 19 — State-mutator agent body documents the full inventory schema (2026-05-06)

- **Agents themselves now know the full schema.** Round 18 wired the parser + helper + lorebook field-reference doc, but the agent's own `promptTemplate` (built from `agents/state-mutator.md` + per-ruleset overrides) still listed only the original 5 fields (`target/field/add/remove/qty/reason`) as canonical, so the agent kept saying "extended fields unconfirmed by parser" and refused to emit them. Updated all six source markdown files (shared `agents/state-mutator.md` + `rulesets/dnd5e/agents/state-mutator.md` + `rulesets/exalted3e/agents/state-mutator.md` per repo) with: (a) the inventory tag protocol line now lists the optional attrs inline; (b) a new `# Inventory schema (full field list — extension-confirmed)` section documents all 8 attrs with examples and the "repeated add enriches blank fields" semantic; (c) two new worked examples (stored consumable, weapon gift between characters) join the existing damage / save / spell-slot examples. The phrase "extension-confirmed" is deliberate — earlier rounds the agent's own diagnostic noted "no parser guarantee" on extended fields; the heading wording lets the agent know these ARE supported.
- **Rebuilt agents.json + bundle.json for all three rulesets per repo.** `tools/build-agents.mjs --all` regenerated `rulesets/{dnd5e,exalted3e,fate-core}/agents.json` from the updated source markdown; `tools/build-bundle.mjs --all` regenerated bundles. (pf2e is bundle-only; agents.json doesn't apply.) All gates green: `node --check`, `validate-rulesets` 3/3 PASS, `validate-bundles` 4/4 PASS.
- **Re-install is required to push the new schema to live agents.** Per the v0.4 architecture, agents are decoupled from the bundle and installed via the "Import Agents" dialog. To activate Round 19 in your live Marinara session: reload the extension JS, then re-import the regenerated `rulesets/dnd5e/agents.json` via the extension's Import Agents flow. The dialog uses delete-then-replace, so the State Mutator overlay's promptTemplate is replaced wholesale with the new schema-aware text.

### Added — v0.4.x Round 18 — State-mutator inventory tags accept full dialog field set (2026-05-06)

- **`[mrr-state: action="add" field="inventory"]` now accepts dialog attrs.** The Round 17 fix made agent-added items survive load and render correctly, but the agent could only set `name`/`quantity`/`reason` — every other dialog field defaulted to empty. Logs from the live test showed the GM agent itself flagging the gap: "for stat/effect field support on inventory tags. Client parser behavior is unknown." The parser already extracted every `key="value"` pair via `STATE_KV_RE`; only `applyStateMutation` was throwing the rest away. New `applyItemAttrs(item, attrs)` helper maps `slot`, `damage`, `attack_attr` → `attackAttribute`, `attack_proficient` (bool), `use_effect` → `useEffect`, `consumable` (bool), `notes`, and `category` (`"equipment"` or `"item"`) onto the item. Snake-case keys are LLM-friendly inside a tag.
- **Auto-categorize new items by slot presence.** When the agent sends `slot="weapon"` without `category`, the new push order now applies attrs FIRST and normalizes SECOND, so the normalizer's existing slot-presence rule (`slot ? "equipment" : "item"`) infers `category="equipment"` automatically. Explicit `category="..."` always wins over inference.
- **Repeated adds enrich blank fields.** When `[mrr-state: add="Sword" damage="1d8"]` hits a name-match in inventory, `applyItemAttrs` runs on the existing item before the quantity bump — agent can populate fields once authoritatively on first add, omit them on subsequent qty bumps. Empty strings are ignored (omit a field to leave it alone). Booleans only land on truthy values; once `true`, can't be unset via tag — use the dialog.
- **Field-reference lorebook entry advertises the full schema.** `buildFieldReferenceContent` now emits four worked examples (bare / stored consumable / weapon / armor) plus an 8-row attrs reference table. Auto-sync PATCHes the lorebook entry on next save, so the narrator and overlay agents see the new schema on the next generation without any manual lorebook edit.

### Fixed — v0.4.x Round 17 — Items vanish after edit, agent-added items render bare (2026-05-06)

- **State-mutator inventory.add now produces fully-formed items.** When the GM agent emits `[mrr-state: action="add" field="inventory" add="Sword"]`, `applyStateMutation` was pushing `{name, quantity, description, location}` only — no `id`, no `category`, no dialog fields. Two downstream effects: (a) the item rendered bare in the Equipment / Items flyout (no slot, damage, bonuses) because the renderer reads fields that didn't exist, and (b) `mergeSheet`'s inventory branch silently dropped every id-less item on the next character switch / page reload. Net: items appeared "with the right name but no stats" and "got deleted any time another item was modified". Fix: state-mutator's add path now routes through a new `normalizeInventoryItem()` helper that fills `id`, `category`, `slot`, `damage`, `attackAttribute`, `attackProficient`, `bonuses`, `useEffect`, `consumable`, and `notes` to safe defaults.
- **mergeSheet self-heals legacy partial items instead of dropping them.** The inventory filter no longer requires `typeof it.id === "string"`. Instead, every loaded item runs through `normalizeInventoryItem(it, idx)`, which assigns a deterministic `item-heal-{nameSlug}-{idx}` id (stable across reloads so `state.sheet.equipped[slot]` references survive) plus all dialog-field defaults. Items already saved to localStorage from any prior session — including the broken pre-fix state-mutator pushes — are upgraded in place on next load, no manual re-add required.
- **State-mutator existing-name merge backfills missing fields.** When `[mrr-state: action="add"]` hits a name-match in the inventory, the existing item now passes through `normalizeInventoryItem` before the quantity bump. Previously, an existing partial item stayed partial and would throw on `draft.bonuses.forEach(...)` when the user opened it for editing.

### Fixed + Added — v0.4.2 round (2026-05-06)

- **HP / bar manual entry now accepts any value.** Bug: when a derived stat is `renderAs: "bar"` with no `max` or `maxFormula` declared (D&D Hit Points), the input was clamping to `DEFAULT_BAR_MAX = 10`. Fix: when neither cap is declared the input is unclamped on the upper side, the stepper goes up to 9999, and the bar fill auto-grows so it always shows partial progress instead of saturating against a phantom 10.
- **Autocalc now actually computes D&D / PF2e skill bonuses.** Prior batch only handled derived-stat `valueFormula`; skills displayed raw user-entered numbers. New: when a ruleset declares `resolution.skillBonusFormula` (e.g. D&D's `"{linkedAttribute_mod} + {tierBonus}"`), every skill row shows the computed bonus and hides the raw stepper. Concrete behavior: Sleight of Hand at Dex 16, Trained, Level 4 displays **+5** automatically.
- **Attribute modifiers are now a first-class concept.** New optional `attributes[].modifierFormula` field — D&D 5e ships with `({Score} - 10) / 2`. The renderer computes each attribute's modifier on every refresh and exposes it under both `<name>_mod` and `<abbreviation>_mod` (so formulas can write `Dexterity_mod` or `DEX_mod` interchangeably).
- **Level + autocalc'd Proficiency Bonus.** D&D 5e gains a Level derived stat (default 1, max 20). Proficiency Bonus gets `valueFormula: "2 + (({Level} - 1) / 4)"` — automatically advances 2/3/4/5/6 at L1/5/9/13/17. Math.floor (not round) is now used for autocalc display so D&D mod (9-10)/2 = -1 (not 0) and Exalted ceiling formulas remain correct.
- **HP stays manual.** Explicitly: Hit Points has no `valueFormula` — the table decides their own HP method (max-per-level, rolled, average, etc.).
- **Saving Throws section.** New ruleset field `saves: [{ name, linkedAttribute }]` plus a `"saves"` sheetSection key. D&D 5e ships with all six (one per ability), each with proficiency-tier toggle. The displayed save bonus = attribute mod + tier bonus, computed live the same way skills are.
- **Item damage field.** Inventory items gain an optional free-text `damage` field ("1d8 slashing", "2d6 fire"); the item dialog has a Damage row between Slot and Bonuses; the inventory list shows the damage in a warning-hued cell next to the slot tag.
- **System-agnostic guarantee.** Every autocalc path is opt-in per ruleset: Exalted (no `modifierFormula`, no `skillBonusFormula`) keeps using `valueFormula`-on-derived only; D&D layers modifierFormula + skillBonusFormula on top; a future GURPS bundle can declare its own formulas without engine changes. The renderer respects whatever the ruleset provides.

### Fixed (carried forward from prior round)

- Pathfinder 2e bundle gained `attributes[].modifierFormula = "{Score}"` (PF2e attributes are already-modified) plus `Level` derived stat and `resolution.skillBonusFormula = "{linkedAttribute_mod} + {tierBonus}"`. PF2e tier formulas already include `{Level}`.

### Fixed — Agent visibility (LLM couldn't see the sheet)

- **First diagnosis (incomplete):** `syncSheetToChat` was button-triggered only and exported only legacy fields. Fix part 1 added auto-sync on save and a complete payload via new `buildSyncFields(prefix)` (identity, raw attributes, computed attribute mods, skill/save bonuses, custom skills, derived, states, backgrounds).
- **Live test surfaced the deeper bug:** Even with the auto-sync running and 45 fields PATCHed to `chats.customTrackerFields`, the overlay agents still saw zero numbers. **Reading the Marinara engine source revealed why:** `chats.customTrackerFields` only reaches generation context via Marinara's stock `custom-tracker` agent (which writes a snapshot to `gameStateSnapshots.playerStats.customTrackerFields` that the marker-expander then reads). The player's chat does not have the stock `custom-tracker` agent enabled — only the six `mrr-overlay-v1` agents. So everything we PATCHed into the chat field was visible only to the chat UI tracker panel, not the LLM.
- **Real fix: prompt-template injection into managed agents.** New `buildSheetForPrompt()` renders the live sheet as a markdown block ("LIVE CHARACTER SHEET — Corey (Dungeons & Dragons 5th Edition v1.0.0)…" with identity / attributes-with-mods / skills-with-computed-bonuses / saves / derived / inventory-with-damage / backgrounds). New `syncSheetToAgents()` GETs all agents, filters to managed overlays for the active ruleset, and PATCHes each agent's `promptTemplate` to embed the sheet block between `<!-- MRR_SHEET_BEGIN -->` / `<!-- MRR_SHEET_END -->` markers. New `injectSheetIntoPromptTemplate(prompt, block)` strips any prior block before prepending the new one, so updates over time never accumulate stale sheets.
- **Wired to the same debounce.** `scheduleAutoSync()` now fires both `syncSheetToChat` (for the UI tracker panel) AND `syncSheetToAgents` (the LLM-reaching path) on a single 1.5s debounce after every save and on ruleset activation. Six agents × one PATCH each per save burst = manageable round-trip cost on localhost.
- **No re-install required.** Reloading the JS extension is enough — the new sync path PATCHes the existing already-installed agents. Bundles do not need to be re-pasted to fix this.

### Added — Player rolls (saves, initiative, attack, damage)

- **`quickRollForSave(save)`** — opens the dice widget pre-filled with mod = linked attribute modifier and prof = active proficiency tier bonus. Each save row now ends with a `roll` button. Player picks the DC the GM called and rolls.
- **`quickRollForDerived(derived)`** — opens the dice widget for any derived stat that declares `rollFormula`. D&D 5e Initiative ships with `rollFormula: "{Dexterity_mod}"` (and `valueFormula` of the same so the displayed value tracks Dex_mod live). Roll button shows up on both autocalc'd and manual-entry derived rows when a rollFormula is set.
- **`quickRollAttack(item)`** — opens the dice widget pre-filled for a weapon attack: 1d20 + attack-attribute modifier + (proficiency bonus when `item.attackProficient`) + equipped item value bonuses. Item rows render an `atk` button when `item.attackAttribute` is set.
- **`rollWeaponDamage(item)`** — parses the damage string (`NdM`, `NdM+K`, `NdM+K type`, e.g. "1d8 slashing", "2d6 fire", "1d4+1 piercing"), rolls the dice, adds `attackAttribute_mod` if set, and posts `[damage: NdM±K = total type (item-name)]` to the dice widget result. Item rows render a `dmg` button when `damage` is set.
- **Item dialog** gains "Atk attr" (dropdown of ruleset attributes) and "Proficient" (checkbox) rows so the player declares per-weapon how the to-hit and damage are computed.
- **Schema:** `derivedStats[].rollFormula` added (parallel to `valueFormula`); inventory items gain optional `attackAttribute` and `attackProficient` fields (pass-through; inventory wasn't strictly schema'd before).
- **Skill-roll fix for autocalc systems:** `quickRollForSkill` was filling `mod` from `state.sheet.skills[name]` (always 0 in the autocalc world for D&D and PF2e). Now reads the linked attribute's modifier when `skillBonusFormula` is set, so a Sleight of Hand roll on Dex 16 + Trained correctly fills 1d20 + 3 (mod) + 2 (prof).

### Fixed — State-mutator HP and other shorthand fields

- **Bug:** Console log `[mrr] state-mutator: unmatched field 'hp' — stashed on sheet root` fired every turn the LLM tried to apply HP damage. `resolveSheetField` matched canonical names and case/punctuation variants, but "hp" → "hp" never matched "Hit Points" → "hitpoints". Mutation values landed on `sheet.hp` instead of `sheet.derived["Hit Points"]` and the HP bar never moved.
- **Fix:** Added an aliases pass to `resolveSheetField`. Each derived stat / attribute / skill can now declare `aliases: [...]`. Attribute `abbreviation` is auto-recognized so `field="DEX"` resolves to "Dexterity" without needing an explicit alias. D&D 5e ships with: Hit Points → ["hp", "HP", "hitPoints", "hitpoints"], Armor Class → ["ac", "AC", "armorClass"], Initiative → ["init"], Proficiency Bonus → ["prof", "proficiency", "PB"], Speed → ["speed", "movement"], Level → ["level", "lvl", "characterLevel"].
- **Agent self-documentation:** `buildSheetForPrompt` now appends a "State-mutator field reference" block listing every canonical name with its declared aliases. The agent sees this in its prompt every turn and learns which names resolve.

### Added — Triple-coverage field reference (lorebook bridge)

The aliases pass and the agent-prompt block both reach our six overlay agents — but **the main narrator** (the model that actually emits `[mrr-state: ...]` tags inside the chat narration) does not read overlay agent prompts. It reads the lorebook. So the field reference now lives in three places, and the narrator picks it up via the third:

- **`buildFieldReferenceContent()`** — formats the canonical names + aliases for every `derivedStats` / `attributes` / `skills` entry on the active ruleset, plus a "common compound mutations" cheat sheet (HP delta, condition add/remove, inventory gain).
- **`syncFieldReferenceToLorebook()`** — finds the managed lorebook for the active ruleset, finds (or creates) an entry tagged `mrr-field-reference`, and PATCHes its content. The entry uses `constant: true` (Marinara's "always include" lorebook flag) so the narrator sees it every turn regardless of keyword triggers. Tagged so we update in place rather than spawn duplicates on every save.
- **Wired to the same debounce.** `scheduleAutoSync()` now fires three sync paths after every save and on activation: chat customTrackerFields (UI tracker panel) → overlay agent promptTemplates (six PATCHes) → managed lorebook field-reference entry (one PATCH).
- **Exalted 3e alias adoption:** Personal Motes / Peripheral Motes / Willpower / Essence / Health Track / Defense (Parry) / Defense (Evasion) / Resolve / Guile / Soak (Bashing) / Soak (Lethal) / Sorcerous Motes — each now declares the LLM's natural shorthands ("motes", "wp", "soakBashing", etc.). Same belt-and-suspenders that D&D got, system-agnostic — any future ruleset (GURPS, Lancer, Cyberpunk RED, …) just declares its own aliases and the triple-coverage applies automatically.

### Fixed — Bar max persistence and dotted-path stash

- **Bug:** Take 15 damage on D&D HP 15 → bar showed "0 / 10" (max collapsed). Cause: `computeMax` used `Math.max(DEFAULT_BAR_MAX, current)` when no engine cap was declared, so dropping current to 0 collapsed the visual max back to 10.
- **Fix:** New `state.sheet.derivedMax` bucket — the user's typed max for bars without a ruleset-declared cap. `computeMax` prefers it over the auto-grow fallback, so the bar's denominator survives any current-value change. `renderBar` now renders a SECOND editable input next to current when no engine cap is declared (D&D HP); a "/" separator sits between them. Engine-capped bars (Exalted Motes/Willpower) hide the max input.
- **`mergeSheet`** validates `derivedMax` on load; old saves without it default to `{}`.
- **Bonus fix: dotted-path support.** The state-mutator was emitting `field="deathSaves.failures"` and the resolver flattened it onto the sheet root as a single key. Now the stash fallback splits on `.`, walks/creates nested objects, and writes the leaf — so `deathSaves.failures = +1` lands at `sheet.deathSaves.failures` correctly. Sets the floor for future structured-state features without locking the schema.

### Added — Advantage / disadvantage on d20 rolls

- **Three-way toggle** in the dice widget (single-roll mode only): Normal (1d20), Adv (2d20 keep highest), Dis (2d20 keep lowest). Active mode picks up the accent color so the player can see which mode is armed at a glance. Persists in `state.diceAdvantage` across rolls within a session — set "advantage" once and roll a save, an attack, and an ability check without re-toggling.
- **Result text shows both faces.** Format: `[dice: 2d20kh1+5+2 vs DC15 = 19 success (kept 19, dropped 7 — advantage)]`. The state-mutator and any GM reading the chat see exactly what landed and what didn't.
- **Wired into existing roll buttons.** `quickRollForSkill`, `quickRollForSave`, `quickRollForDerived`, `quickRollAttack` all open the dice widget — the player picks adv/dis once and rolls. No separate "advantage roll" button per row.

### Added — Spell cast workflow (DC + damage + lorebook)

- **`Cast` button on every spellbook ability with cast-time data** (damageDice, saveAttribute, or spellcastingAttribute). One click computes the spell save DC, rolls damage, and posts both as chat tags ready for "Send to chat".
- **Auto-computed DC.** Formula is ruleset-driven via `resolution.spellSaveDcFormula`. D&D 5e ships with `"8 + {Proficiency Bonus} + {spellcastingAttribute_mod}"`. PF2e bundle ships with `"10 + {Level} + {spellcastingAttribute_mod}"`. The `{spellcastingAttribute_mod}` token is pre-substituted with the spell's specific caster-attribute mod before evaluation.
- **Cast tag format:** `[mrr-cast: name="Fireball" dc="15" save="Dexterity" damage="8d6 fire" half_on_save="true" cost="1 lvl-3 slot"]`. Followed by the rolled `[damage: 8d6 = 27 fire (Fireball)]`. The narrator reads both — DC for save resolution, damage to apply post-save.
- **Spell fields** added to the ability dialog: Damage (free-text dice), Cast attr (caster's spellcasting ability), Save vs (defender's save target), Half on save (D&D 5e half-damage default).
- **Lorebook entry** now embeds a "Cast Mechanics" block with all four cast fields. The GM/state-mutator agents read it when the spell's keyword fires in chat — they see exactly which save to call for, the DC, and the half-on-save rule.
- **Workflow:** create spell in spellbook → auto-syncs to lorebook → click Cast → DC + damage tags drop into the dice widget → "Send to chat" → narrator/GM agent resolves saves and applies damage via the existing `[mrr-state: field="hp" delta=...]` pipeline.

### Added — Active conditions on the sheet (with mechanical effects)

- **New "Conditions" section** on the character sheet rendered between States and Backgrounds. Lists currently active conditions from `state.sheet.conditions` with × remove buttons. Add via a dropdown of ruleset-declared options or a "(other — type a name)" free-text entry.
- **Ruleset-declared condition definitions.** New `ruleset.conditions: [{ name, description, imposesDisadvantageOn?, grantsAdvantageOn? }]` schema field. Each condition can declare which roll categories — `attack`, `save`, `skill` — it imposes disadvantage or grants advantage on. The dialog dropdown surfaces the description as a hover tooltip; the row shows a one-line effect summary inline.
- **Mechanical effects on rolls.** New `conditionRollMode(category)` helper aggregates every active condition's effect for the given category. `quickRollForSkill`, `quickRollForSave`, `quickRollAttack` each consult it before opening the dice widget — auto-arming the Adv/Dis toggle so the player doesn't have to remember every condition's effect. Disadvantage wins ties (mirrors the D&D 5e canonical "any disadvantage cancels every advantage" rule, simplified to "if both, disadvantage wins"). The player can still override at the toggle in one click.
- **Agent visibility.** `buildSheetForPrompt` now emits an "Active Conditions" block listing each active condition with its declared effects and description. The narrator and overlay agents see that "Poisoned — disadvantage on attack, skill" is active, so attack rolls and ability checks resolve correctly even when the player narrates without explicitly mentioning the disadvantage.
- **D&D 5e bundle adoption.** All 15 SRD conditions ship in the dnd5e ruleset: Blinded, Charmed, Deafened, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious, Exhausted. Roll-mode mappings encoded for the canonical SRD effects: Blinded / Poisoned / Frightened / Prone / Restrained / Exhausted impose disadvantage; Invisible grants advantage on attacks. Narrative-only conditions (Charmed, Deafened, Grappled, Incapacitated, Petrified) carry only the description.
- **State-mutator pipeline unchanged.** The existing `[mrr-state: field="conditions" add="poisoned"]` and `remove="poisoned"` tags still drive the same `state.sheet.conditions` array — the new render layer just visualizes what was already in the data, and the new effect layer just consults it.

### Fixed — Two D&D leaks in the core engine (system-agnostic discipline)

Audit found two runtime paths in the core extension that hardcoded D&D 5e conventions; both are now ruleset-driven:

- **`castSpell` DC fallback removed.** Was: `dcFormula = ruleset.spellSaveDcFormula || "8 + {Proficiency Bonus} + {spellcastingAttribute_mod}"`. Now: when the ruleset doesn't declare `spellSaveDcFormula`, the cast tag posts without a DC and the agent picks one by rule context. The core extension knows no system's spell-save convention by default.
- **`quickRollAttack` proficiency lookup generalized.** Was: `ctx["Proficiency Bonus"]` — a hardcoded stat name lookup. Now: ruleset declares `resolution.attackProficiencyFormula` (D&D 5e bundle now ships `"{Proficiency Bonus}"`); when omitted, attacks contribute zero proficiency and the player can type a value manually. The core extension knows no system's proficiency convention by default.
- **No hardcoded D&D conventions remain in runtime paths.** Mentions of "Hit Points" / "Dexterity" / "Poisoned" etc. that survive in the JS are exclusively in JSDoc comments and placeholder text (e.g. the spell-name input's placeholder is "Fireball" — descriptive, not behavioral).
- **Architecture restated for the doctrine record:** the core extension provides generic engine surface — `renderConditions`, `castSpell`, `conditionRollMode`, `resolveSheetField`, `evalFormula`, `statContext`, `quickRoll*`. Per-system rules — D&D's 15 SRD conditions, ability modifier formula `({Score} - 10) / 2`, spell DC formula, attack proficiency formula, the six saves, the aliases on Hit Points / AC / Initiative — all live in `rulesets/dnd5e/ruleset.json`. A user installing GURPS would never see a single D&D condition or formula. A user authoring a new ruleset edits only the bundle; no extension rebuild required.

### Added — Text-only background entries (D&D Feats)

- **New `backgrounds.textOnly: bool`** schema flag. When true, the section renders name-only rows (no dot value, no stepper). D&D 5e Feats now uses this — feats are described, not rated; the player adds a lorebook entry per feat to teach the agent the mechanics. Exalted Backgrounds, WoD Merits, and other dot-rated systems leave it false (default) and keep the dot rating.

### Added — Two-tier inventory: Equipment + Items flyout

- **Item shape gains three optional fields:** `category` (`"equipment"` or `"item"`), `useEffect` (free-text dice expression), `consumable` (bool — Use decrements quantity). `mergeSheet` infers `category` from slot presence on legacy items: slot present → equipment, slot absent → item.
- **Equipment section on the sheet** filters `state.sheet.inventory` to category="equipment". Renamed visually from "Inventory" to "Equipment". Shows the existing slot / Equip / atk / dmg / Edit / Delete row layout. The "+ Add equipment" button opens the dialog with category pre-set.
- **Items flyout** — a separate floating draggable panel (mirrors the spellbook flyout pattern). Opens via "Open items" button at the foot of the Equipment section. Lists every inventory entry with category="item" with quantity badge, useEffect summary, and Use / Edit / Delete buttons.
- **`useItem(item)`** — parses `useEffect` via the same `NdM[+K type]` regex the weapon roller uses, rolls each die, posts a `[mrr-use: name="Healing Potion" effect="2d4+2 healing" rolled="2d4+2 = 8 healing" consumable="true"]` tag to the dice widget. Decrements quantity by 1 when the item is consumable; removes the item when quantity hits 0. The state-mutator agent reads the use tag and applies the mechanical effect via the existing `[mrr-state: field="hp" delta=...]` pipeline.
- **Item dialog gains three rows:** Category (Equipment / Item), Use effect (free-text), Consumable (checkbox). Existing items default to "equipment" (no behavior change for current sheets); new items added via the items flyout default to "item".
- **System-agnostic:** the categorization, dialog, and flyout are entirely in the core engine and need no per-ruleset configuration. An Exalted character with a burner cell phone (item, no slot) and an artifact pair of bracers (equipment, slot=arms) work identically — the framework just respects what the player picks.

## [0.4.0] - 2026-05-06

A consolidation release. Agents are now decoupled from the bundle and install
through their own dialog; tracks support typed damage; the spellbook adds a
sorcery category with multi-turn casting; the formula evaluator is CSP-safe;
the lorebook install path was rewritten to fix silent-failure on managed
re-installs. Ships with a self-contained download under `releases/v0.4.0/`
that includes seven AI-feedable build docs, two complete reference rulesets
(D&D 5e and Exalted 3e), and drop-in install files. Targeted at users who
want to point a chat AI at the documentation and have it author a complete
ruleset for any tabletop RPG system.

### Added — Typed damage on tracks

- **`damageTypes` schema field** on `renderAs: "track"` derived stats. Declares a list of damage types (id, label, severity, description). When present, the renderer shows each filled cell colored by type, stacks higher-severity damage to the leftmost positions, and provides per-type "Take" buttons plus a "heal worst" button.
- **State-mutator routes typed damage automatically.** `field="bashing" delta="+3"` mutates `state.sheet.track["Health Track"].bashing`. Mirror-mapped against the active ruleset's declared damage type ids.
- **CSS modifier classes** `.mrr-track__cell--<typeId>` for each declared type. Bashing yellow, Lethal red, Aggravated dark maroon in the bundled Exalted ruleset; system authors define their own palette.
- **Migration:** legacy single-counter `track[name] = N` data folds into `bashing` (the lightest type) on first read so existing characters auto-upgrade without data loss.

### Added — Sorcery / multi-turn casting

- **`sorcery` ability category** is special-cased by the spellbook → lorebook push. Entries get a `Type: Sorcery` content header and a `sorcery` keyword, signaling the state-mutator to use multi-turn shape-sorcery flow instead of immediate-cost charm flow.
- **`Sorcerous Motes` derived stat + `Sorcery Circle` / `Shaping Spell` states** added to the Exalted reference ruleset; documented as the system-agnostic pattern for any RPG with multi-turn casting.
- **State-mutator override walks the casting workflow:** declare → roll → accumulate → unleash with Willpower refund, plus leak-on-no-action and abort-on-switch handling. Documented in `releases/v0.4.0/docs-for-ai/05-AGENT-AUTHORING.md`.

### Added — Build pipeline separation

- **`tools/build-agents.mjs`** — generates `rulesets/<system>/agents.json` from per-system overrides + shared baseline `agents/*.md`. The `main` role comes from `gm-agent.md`; sub-agent roles fall back to the shared baseline when no per-system override exists.
- **Per-system agent override pattern.** Drop a `.md` at `rulesets/<system>/agents/<role>.md` to tune any role for that system; the build tool prefers the override over the shared baseline. System-agnostic by default, system-specific by exception.
- **Bundle no longer carries agents.** `tools/build-bundle.mjs` produces `bundle.json` with ruleset + lorebook only. Agents install through Marinara's Import Agents dialog as a separate operation. Decoupling lets prompt updates ship without forcing users to reinstall the entire ruleset.

### Added — Documentation for AI-assisted authoring

- **`releases/v0.4.0/docs-for-ai/`** — seven numbered Markdown files designed to be fed to a chat AI (ChatGPT / Claude.ai / Gemini) so the AI can author a complete ruleset for any system. Covers overview, agent architecture, schema, lorebook format, agent prompt-writing patterns, build pipeline, and copy-paste prompts for AI authoring.
- **`releases/v0.4.0/examples/`** — two complete worked examples (D&D 5e and Exalted 3e) that AI authors can pattern-match against.
- **`releases/v0.4.0/install-files/`** — the framework JS plus pre-built `bundle.json` and `agents.json` for both example systems. Three pastes from zero to playing.
- **`releases/v0.4.0/BUILD-YOUR-OWN-RULESET.md`** — three options for non-technical users (AI-with-repo, AI-with-zip, manual).

### Fixed — Critical correctness bugs

- **CSP-safe formula evaluator** — the framework's `{StatName}*N+M` parser uses a hand-rolled recursive-descent evaluator instead of `new Function`. Marinara's page CSP blocks `'unsafe-eval'` in many configurations; every formula was throwing silently and bar maxes were falling back to `DEFAULT_BAR_MAX = 10`. The Personal Motes bar on an Essence-7 Exalt was showing /10 instead of /31. Now correctly evaluates with parens, unary +/-, integer and decimal literals.
- **State-mutator field-name normalization** — `peripheralMotes` resolves to schema's `Peripheral Motes`, `hp` to `HP`, etc. Lowercase + strip whitespace/underscore/hyphen on both sides of the comparison. Eliminates the failure mode where AI-emitted variants got stashed as ghost root keys.
- **Max-clamp on numeric deltas** — `field="Personal Motes" delta="+999"` caps at the formula-computed maximum instead of overflowing. Refresh-to-full works correctly. Resolver consults `derived.maxFormula` (evaluated against live stat context) or static `derived.max`.
- **Persisted state-mutator dedupe** — `processedMessageIds` now persists per-chat in `localStorage["mrr-processed-msgs-<chatId>"]`. Hard refresh no longer replays every historic mutation. Initial DOM sweep on load only re-wraps tag spans for hidden display; mutations that have already applied don't fire again.
- **Lorebook install rewritten** — the bulk endpoint was returning OK but landing zero entries. Replaced with per-entry POST loop matching the proven spellbook write path. Re-install now does delete-then-add to wipe stale entries instead of accumulating duplicates. `tag: "..."` (singular string) replaced with `tags: [...]` (plural array) on each entry to match Marinara's API expectation.
- **Floating panel position clamp on load** — saved positions outside the current viewport now clamp into bounds on restore instead of leaving the sheet stranded offscreen. The drag handler already clamped at move time; the load path now matches.
- **`saveSheet()` no-args call fixed** — `finalizeMutation` was calling `saveSheet()` with zero args, hitting the early-return guard and never persisting. Now correctly passes `(state.chatId, state.sheet)`.
- **`applyStateMutation` numeric path looked at `sheet.bars` (doesn't exist)** instead of `sheet.derived` / `sheet.attributes` / `sheet.skills`. Every numeric delta was writing ghost top-level keys. New `resolveSheetField()` walks the typed maps; legacy fallback path warns instead of silently corrupting state.

### Fixed — UX

- **Health track grouping.** Adding `-0` / `-1` / `-2` health levels via the Ox-Body buttons no longer appends them after Incapacitated. Penalty-descending stable sort groups like-with-like (-0s, then -1s, then -2s, then -4, then Incap last regardless of insertion order).
- **Agent prompt FORBIDDEN section** in the Exalted state-mutator override calls out the field-name traps the model used to invent (`Health Levels`, `Wound Penalty`, `peripheral_essence`, `healthLevels.minus1`). Pairs with a new `state-reminder` per-system override that surfaces canonical field names every turn so the model sees them from two angles.

### Schema

- `ruleset.json` derivedStats with `renderAs: "track"` may declare an optional `damageTypes: [{id, label, severity, description}]` array.
- `ruleset.json` `abilities.categories` may include `{ "id": "sorcery", "label": "Sorceries" }` to enable the multi-turn casting flow on lorebook push.
- Bundle schema unchanged top-level (still `mrr-bundle` v1) — backward compatible with prior bundles. The new fields are additive.
- Agent collection schema is `mrr-agents` v1 — new in v0.4.

### Removed

- The bundle's `additionalAgents[]` field is no longer authored by humans (the build pipeline ignores it on read; `build-agents.mjs` produces a separate `agents.json` instead). Existing bundles with `additionalAgents` still install correctly under v0.3 framework JS; with v0.4 framework JS, the install path skips the bundle's agents and expects the user to import agents separately.

## [0.3.0] - 2026-05-01

First release after the v0.2 publish at commit `b85e7b0`. Adds the single-
file bundle install path, an embedded-CSS framework JS, an inventory +
equipment-bonus system, a resizable + collapsible character sheet, a
no-developer-tools install guide, and four reference bundles (D&D 5e,
Exalted 3e, Fate Core, Pathfinder 2e).

### Added

- **Single-file install bundles.** New `bundle.json` format wraps the ruleset,
  GM agent prompt, and lorebook into one envelope. Pasting a bundle into the
  Ruleset dialog (or fetching one from a URL) auto-installs all three pieces:
  ruleset to localStorage, GM agent via `POST /api/agents`, lorebook via
  `POST /api/lorebooks` + `/:id/entries/bulk`. End-user install collapses
  from five steps to two: paste the framework JS once, then paste the bundle.
  Idempotent re-install detects existing managed agents/lorebooks via
  settings flags + tags and PATCHes rather than duplicating. Schema at
  `schema/bundle.schema.json`. CLI validators (`npm run validate-bundles`)
  and builder (`npm run build-bundles`).
- **CSS embedded in the framework JS.** Eliminates the separate CSS paste —
  one JS paste now installs the entire client extension. Rebuild the embedded
  copy with `npm run embed-css` after editing `RPG-Extension-GM-Mode.css`.
- **Vibecoder authoring path.** `AUTHORING-PROMPT.md` at repo root is a
  paste-ready prompt template authors hand to any chat AI (claude.ai,
  ChatGPT, Gemini) that returns a valid `bundle.json` for their system. No
  Node, no Git, no JavaScript required to author a new ruleset.
- **Three reference bundles** at `rulesets/{dnd5e,exalted3e,fate-core}/bundle.json`,
  generated from the existing source files via `build-bundle.mjs`.
- **Uninstall server data button** in the Ruleset dialog. Removes the
  managed lorebook + GM agent for the active ruleset (keeps local cache
  intact; use Clear for that).
- **Resizable floating character sheet.** The floating sheet now exposes a
  native bottom-right resize grip (CSS `resize: both`). Drag the corner to
  reshape the panel; the chosen size is saved to localStorage under the key
  `mrr-sheet-size` and restored on reload. Saved dimensions are clamped to
  the current viewport on load so a sheet sized on a large monitor doesn't
  open off-screen on a smaller one. Minimum 280 × 200 px; maximum
  `100vw - 32px` × `100vh - 32px`. The default 320 px width and 70vh height
  cap are preserved for users who never resize. Existing drag-the-header
  positioning is unaffected.
- **Inventory section + equipment-driven roll bonuses.** New `"inventory"`
  sheet section (already present in the schema's `sheetSections` enum, now
  rendered) lists per-character items. Each item carries a `slot`, optional
  `notes`, and a list of `bonuses` of shape
  `{target, value, kind: "value"|"dice"|"successes", tag}`. Items are
  authored in a form-based dialog: target is a dropdown sourced from the
  ruleset's attributes + skills + derivedStats (plus the new advisory
  `equipmentBonusTargets` list); slot is a freeform text input with an
  optional autocomplete `<datalist>` driven by the ruleset's
  `equipmentSlots`. Equipping an item writes `state.sheet.equipped[slot] =
  itemId`; equipping a second item in the same slot replaces the first.
  Derived stats whose name matches an equipped item's bonus target render
  with a `+N` suffix and a hover tooltip listing each contributing item.
  The dice widget (pool and single-roll) gains a new "Equipment" input
  pre-filled by skill quick-roll, and `[dice: ...]` tags include the
  equipment contribution so the GM agent sees the full pool. Inventory and
  equipped state round-trip through the existing per-character save/load
  bundle.
- **Schema additions** (optional). `ruleset.schema.json` now accepts
  `equipmentSlots` and `equipmentBonusTargets` arrays — both advisory,
  surfaced as autocomplete hints in the inventory UI but not enforced.
  Existing rulesets validate unchanged.
- **Exalted 3e ruleset bumped to 1.1.0.** GM-agent prompt gains an
  Equipment paragraph teaching the agent to narrate gear but trust the
  printed `[dice: ...]` tag (which already includes the equipped bonuses)
  rather than re-applying them in narration math. No `equipmentSlots`
  pre-populated — slot vocabulary is left for the player to author.
- **Choose file… in the Ruleset dialog.** Authors can now load a
  `bundle.json` (or plain `ruleset.json`) directly from disk via a new
  **Choose file…** button that sits next to **Fetch URL** in the dialog.
  Reuses the existing `triggerUpload` helper. The Save flow is unchanged
  — schema discriminator still routes bundles to the install pipeline
  and plain rulesets to the localStorage activation path. Paste-text and
  Fetch-URL remain available; the file-import affordance is additive.
- **Collapsible character sheet (header scroll-icon toggle).** A new
  circular toggle button sits next to the Ruleset button in the chat
  header, marked with an inline scroll-of-parchment SVG. Click to show or
  hide the floating character sheet without dismissing it. The sheet
  starts **collapsed by default** on a fresh chat — it stays opt-in
  real-estate during long GM narration — and the show/hide preference is
  persisted per chat under the `mrr-sheet-collapsed-{chatId}` localStorage
  key. Drag and resize on the sheet are unchanged when expanded; the
  resize observer now skips zero-dim entries so the saved size is never
  overwritten while the sheet is hidden. The Marinara character button
  row in the top-left is not modified — this is a separate overlay
  control on the right side of the header.
- **No-developer-tools install path.** A new "Install (no developer tools
  required)" section in `README.md` walks non-savvy users through
  download-zip → extract → Marinara Settings → Extensions → Import
  Extension → Ruleset button, with inline screenshots of the Marinara
  Settings dialog and the Ruleset dialog. Custom-bundle authors using
  `AUTHORING-PROMPT.md` follow the same Ruleset-dialog flow.

### Changed

- **Install docs corrected.** `README.md`, `AUTHORING-PROMPT.md`, and
  the three `rulesets/*/INSTALL.md` files now say "import the
  `extension/RPG-Extension-GM-Mode.js` file" for the framework extension —
  Marinara's Settings → Extensions screen is a file-upload UI, not a
  paste-text UI. Bundle install language now leads with **Choose file…**
  alongside Fetch-URL and paste; "two pastes total" framing replaced
  with "one file import + one bundle install."
- **Source `lorebook.json` files** in `rulesets/dnd5e/` and
  `rulesets/exalted3e/` migrated `position` from string `"before_an"` to
  numeric `0` to match Marinara's API contract (`position: 0|1|2` per
  `createLorebookEntrySchema`). `fate-core` source files were already
  position-free; the bundle builder defaults to 0. Manual lorebook imports
  via Marinara's UI are unaffected.

[Unreleased]: https://github.com/Kenhito/Marinara-RPG-Extension/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/Kenhito/Marinara-RPG-Extension/compare/b85e7b0...v0.3.0
