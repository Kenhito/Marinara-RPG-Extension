# Changelog

All notable changes to Marinara-RPG-Extension are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Version numbers follow [Semantic Versioning](https://semver.org/) once a 1.0
release is cut; pre-1.0 minor bumps may include breaking changes (called out
explicitly when they do).

## [Unreleased]

Pending the next published release. New entries land here between releases;
each release moves the entries into a dated section below.

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
  copy with `npm run embed-css` after editing `ruleset-loader.css`.
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
  `extension/ruleset-loader.js` file" for the framework extension —
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
