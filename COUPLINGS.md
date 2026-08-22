# Coupling Ledger

Every place MRR touches a Marinara Engine surface outside the documented, versioned public API. Class A = documented 2.4.3 API · B = REST route · C = engine internal (undocumented, could shift on any engine release). Every Class-C row needs a feature probe, a graceful fallback, and a visible degradation warning in the MRR panel status area.

**The Coupling Law (non-negotiable):** any commit that adds/removes/changes an engine touchpoint updates this file in the same commit. See `AGENTS.md` §8.5 and `Plans/2026-08-22_engine-2.4.3-upgrade-and-rolemaster-plan.md` §1.3/§3.

Rows marked `PENDING — live probe` were seeded from the plan's design/static analysis this session (agent-executed, no live engine access) and need a follow-up live probe on Corey's running engine (plan §4.A0.3–A0.5) before they can be marked confirmed.

| # | Coupling | Class | Where (symbol) | Probe | Fallback / degradation | Status |
|---|---|---|---|---|---|---|
| 1 | `marinara` full-page API (fetch/storage/timers/onCleanup/log/extension) | A | compat shim, `extension/RPG-Extension-GM-Mode.js` (top of file, after constants) | `typeof marinara.fetch === "function"` (feature-detects legacy vs 2.4.x host inside the shim) | pre-2.3.4 host object passthrough (shim returns `host` unchanged when `host.addElement` exists) | Confirmed 2026-08-22 — `FullPageExtensionApi` v1 shape verified against engine `v2.4.3` tag (`PersonalExtensionInjector.tsx`) |
| 2 | `GET /agents/runs/:chatId/custom` | B | `pollCustomAgentRuns` | A0 live GET | poller warns once, narrator path unaffected | PENDING — live probe (poller stays `MRR_RUNS_POLLER_MODE = "off"`, inert) |
| 3 | `/agents` CRUD + `/agents/:id` | B | installer/reconciler family | A0 live GET | install aborts with panel error | PENDING — live probe |
| 4 | `/lorebooks` (+entries) CRUD | B | spellbook/install family | A0 live GET | ability-lorebook features warn+skip | PENDING — live probe |
| 5 | `/chats/:id`, `/chats/:id/metadata` | B | `syncSheetToChat`, mode detect | A0 live GET | sync disabled with panel warning | PENDING — live probe |
| 6 | `/regex-scripts`, `/custom-tools`, `/connections` | B | installer family | A0 live GET | affected installs warn+skip | PENDING — live probe |
| 7 | `/chats/:id/game-state` (P2-A/B, future) | B | not yet called | probe when built | feature stays off | Not yet built (Phase B) |
| 8 | Sheet container + Attributes panel heading text | C | `findSheetContainer`, `hideBuiltInAttributesPanel` | smoke item | sheet floats unanchored + warning | PENDING — live smoke (plan §4.A6.3) |
| 9 | Composer textarea + React synthetic input | C | `findChatInputTextarea` | smoke item | dice tags copy-to-clipboard + warning | PENDING — live smoke (plan §4.A6.4) |
| 10 | `[data-message-id]` DOM scraping | C | `processChatMessage` | smoke item | narrator path dead → poller becomes primary | PENDING — live smoke |
| 11 | `localStorage["marinara-active-chat-id"]` (engine's own key) | C | `getChatId` | smoke item | URL-regex fallback (exists) + warning if both fail | PENDING — live smoke |
| 12 | Peek Prompt (Game Logs) as verification surface | C | manual smoke only | smoke item | verify via agent promptTemplate instead | PENDING — live smoke |
| 13 | `document.head`/`document.body` injection points | C | `init` (style inject), dialog/panel mounts | smoke item | none (page-fundamental) — note only | Page-fundamental, no fallback needed |
| 14 | CSRF protection hook on unsafe `/api` methods | B | compat shim `apiFetch` + `apiPostRaw`/`apiDeleteRaw` | A0.5 unsafe-method probe | writes fail loudly with panel error naming the CSRF header | `CSRF_HEADER`/`CSRF_HEADER_VALUE` confirmed 2026-08-22 against engine `v2.4.3` `packages/shared/src/constants/security.ts`; header now sent unconditionally on non-GET/HEAD by the shim + both raw helpers — **live 403/200 confirmation still PENDING** (plan §4.A0.5) |

## Data-contract versions (seeded, plan §5.B14)

- `stateTagVersion` (the `[mrr-state:]` grammar): not yet stamped — TODO, tracked for Phase B14.
- Ruleset schema version: `bundle.json` `version: 1` (existing).
- Storage layout version: not yet applicable — `marinara.storage` adoption is Phase B1, not started.
