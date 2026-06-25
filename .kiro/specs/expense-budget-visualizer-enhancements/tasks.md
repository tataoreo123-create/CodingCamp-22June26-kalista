# Implementation Plan: Expense & Budget Visualizer Enhancements

## Overview

Five interrelated enhancements to the existing single-page vanilla JS app. All changes land
in `js/app.js`, `css/styles.css`, and `index.html` only. Tests live in `tests/` using Vitest
and fast-check. The implementation follows the existing unidirectional data-flow pattern:
user gesture → mutate in-memory state → persist to Local Storage → re-render affected UI.

New logical modules added to `js/app.js`: `Storage.savePref`/`loadPref`, `Theme`, `Limit`,
`Summary`, and `Validator.validateLimit`. New test shims and test files are added alongside
the existing `storage-shim.js` and `validate-shim.js` pattern.

---

## Tasks

- [x] 1. Extend Storage module with `savePref` / `loadPref`
  - [x] 1.1 Add `Storage.savePref(key, value)` and `Storage.loadPref(key)` methods to `js/app.js`
    - JSON-serialise value in `savePref`; return `true` on success, `false` on exception
    - `loadPref` returns `undefined` on missing key or exception; follow the same try/catch → error-banner pattern as `save`/`load`
    - _Requirements: 14.1, 14.4, 9.2, 11.3_
  - [x] 1.2 Create `tests/helpers/storage-pref-shim.js` re-exporting `savePref` and `loadPref` with injected dependencies
    - Mirror the pattern of `tests/helpers/storage-shim.js`
    - _Requirements: 14.1, 14.4_
 

- [x] 2. Add `Validator.validateLimit` and extend the validate shim
  - [x] 2.1 Add `validateLimit(value)` function to `js/app.js`
    - Returns `{ valid: true }` when `value` is a finite number > 0
    - Returns `{ valid: false, error: '...' }` for empty string, zero, negative, or non-numeric input
    - _Requirements: 9.4_
  - [x] 2.2 Export `validateLimit` from `tests/helpers/validate-shim.js`
    - Add the duplicate implementation alongside the existing `validate` export
    - _Requirements: 9.4_

- [x] 3. Implement inline theme-initialisation script and CSS custom properties
  - [x] 3.1 Add inline `<script>` in `<head>` of `index.html` (after `<link rel="stylesheet">`) that reads `localStorage.getItem("expense_theme")` and writes `document.documentElement.dataset.theme` before `DOMContentLoaded`
    - Defaults to `"light"` if key is absent or value is neither `"dark"` nor `"light"`
    - _Requirements: 11.4, 11.5_
  - [x] 3.2 Add `[data-theme="dark"]` CSS block in `css/styles.css` overriding `--color-bg`, `--color-surface`, `--color-text`, and `--color-border`
    - No inline `style` attributes on any element
    - _Requirements: 11.6, 11.8_

- [x] 4. Implement the `Theme` module in `js/app.js`
  - [x] 4.1 Define the `Theme` object with `LIGHT`, `DARK` constants, `load()`, `apply(theme)`, and `toggle()` methods
    - `load()` reads `Storage.loadPref("expense_theme")`; falls back to `"light"` for absent/invalid values (Req 14.3)
    - `apply(theme)` sets `document.documentElement.dataset.theme`, updates `#theme-toggle` text content and `aria-checked` synchronously
    - `toggle()` flips current theme, calls `Storage.savePref("expense_theme", newTheme)`, then `apply()`
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.7_
  - [x] 4.2 Add Theme_Toggle button to `index.html` inside `<header>` after `<h1>`
    - `id="theme-toggle"`, `role="switch"`, initial `aria-checked="false"`, initial text `"Switch to Dark Mode"`
    - _Requirements: 11.1, 11.7_
  - [x] 4.3 Wire `Theme.toggle()` to the `#theme-toggle` click handler in `init()` and call `Theme.apply(Theme.load())` on startup
    - _Requirements: 11.2, 11.4_
  - [x] 4.4 Create `tests/helpers/theme-shim.js` re-exporting the `Theme` module with injected `document` and `storage` doubles
    - _Requirements: 11.2, 11.7_


- [x] 5. Checkpoint — Verify Storage and Theme modules
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the `Limit` module and budget limit UI
  - [x] 6.1 Define the `Limit` object in `js/app.js` with `_value`, `load()`, `set(rawInput)`, `clear()`, and `updateIndicator()` methods
    - `load()` calls `Storage.loadPref("expense_budget_limit")`; validates it is a finite number > 0; sets `Limit._value`; populates `#limit-amount` input field (Req 9.3, 14.2)
    - `set(rawInput)` calls `validateLimit`; on invalid input injects error into `#error-limit` and returns without state change; on valid input persists via `savePref` and calls `updateIndicator()` (Req 9.2, 9.4)
    - `clear()` removes key from storage, sets `_value = null`, clears `#limit-amount`, clears `#error-limit`, calls `updateIndicator()` (Req 9.5, 10.4)
    - `updateIndicator()` adds/removes `.over-limit` CSS class and updates `aria-label` on `#balance-display` based on `Limit._value` vs current transaction total (Req 10.1, 10.2, 10.3, 10.5)
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 14.1, 14.2_
  - [x] 6.2 Add budget limit row to `index.html` directly after `#balance-display`
    - `<div id="limit-input-row">` containing: `<input type="number" id="limit-amount" aria-label="Budget limit amount">`, `<button id="set-limit-btn" aria-label="Set spending limit">Set Limit</button>`, `<span id="error-limit" class="field-error" aria-live="polite"></span>`
    - _Requirements: 9.1, 9.6_
  - [x] 6.3 Add CSS for `#limit-input-row` (flex row layout) and `#balance-display.over-limit` (red border / warning background) to `css/styles.css`
    - _Requirements: 10.1_
  - [x] 6.4 Add `aria-live="polite"` attribute to `#balance-display` in `index.html`
    - _Requirements: 10.5_
  - [x] 6.5 Wire `#set-limit-btn` click handler to `Limit.set()` in `init()`; wire Enter-key on `#limit-amount` to the same action; call `Limit.load()` on startup; call `Limit.updateIndicator()` inside `renderAll()`
    - _Requirements: 9.2, 9.3, 9.6, 10.3_
  - [x] 6.6 Create `tests/helpers/limit-shim.js` re-exporting the `Limit` module with injected storage and DOM doubles
    - _Requirements: 9.4, 10.1, 10.2_


- [x] 7. Add `date` field to transactions
  - [x] 7.1 Modify `handleSubmit` in `js/app.js` to derive the current local date as `YYYY-MM-DD` and assign it to the new Transaction's `date` field before passing to `Storage.save()`
    - Use `new Date()` with `toLocaleDateString('en-CA')` or equivalent to produce `YYYY-MM-DD`
    - _Requirements: 13.1, 13.2_
  - [x] 7.2 Verify `Storage.save` and `Storage.load` already preserve the `date` field unchanged (no code change needed if JSON round-trip is intact; document via test only)
    - _Requirements: 13.4_
  

- [x] 8. Implement the `Summary` module and Monthly Summary View
  - [x] 8.1 Define the `Summary` object in `js/app.js` with `toggle()`, `render(transactions)`, `_monthKey(date)`, and `_formatMonthHeading(key)` methods
    - `_monthKey` returns `"unknown"` for absent/null/invalid date; returns `"YYYY-MM"` for valid dates (Req 12.3, 12.8)
    - `_formatMonthHeading` maps `"YYYY-MM"` → full month name + year (e.g. `"June 2026"`); maps `"unknown"` → `"Unknown Date"` (Req 12.4)
    - `render` groups transactions into Month_Groups sorted newest → oldest with `"unknown"` last; renders each group as `<section>` with `<h3>`, month total, and `<ul>` of per-category subtotals (categories with zero omitted); renders `<p id="summary-placeholder">` when array is empty; each group includes a collapse toggle button with `aria-expanded` (Req 12.2, 12.4, 12.6, 12.7)
    - `toggle` toggles `hidden` attribute on `#monthly-summary` and updates `#summary-toggle` label; calls `render` when revealing (Req 12.1, 12.2, 12.5)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_
  - [x] 8.2 Add Summary_Toggle button and Monthly_Summary panel to `index.html` after `#chart-container`
    - `<button id="summary-toggle">Show Monthly Summary</button>`
    - `<section id="monthly-summary" hidden></section>`
    - _Requirements: 12.1_
  - [x] 8.3 Add CSS for `#monthly-summary`, `.month-group`, and `#summary-toggle` to `css/styles.css`
    - _Requirements: 12.4_
  - [x] 8.4 Wire `#summary-toggle` click handler to `Summary.toggle()` in `init()`; call `Summary.render(transactions)` inside `renderAll()` only when `#monthly-summary` does not carry `hidden`
    - _Requirements: 12.2, 12.5_
  - [x] 8.5 Create `tests/helpers/summary-shim.js` re-exporting the `Summary` module's `_monthKey`, `_formatMonthHeading`, and `render` with injected DOM
    - _Requirements: 12.3, 12.8_
 

- [x] 9. Wire everything together in `renderAll()` and `init()`
  - [x] 9.1 Update `renderAll()` in `js/app.js` to call `Limit.updateIndicator()` and `Summary.render(transactions)` (when summary panel is visible) after balance and list re-render
    - _Requirements: 10.3, 12.5_
  - [x] 9.2 Update `init()` to call `Theme.apply(Theme.load())`, `Limit.load()`, wire `#theme-toggle`, `#set-limit-btn`, `#summary-toggle` event listeners, and ensure `Storage.load()` feeds the initial `renderAll()`
    - _Requirements: 9.3, 11.4, 12.1_

- [x] 10. Final Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build
- Each task references specific requirements for traceability
- Checkpoints (tasks 5 and 10) ensure incremental validation before moving on
- Property tests validate universal correctness invariants (Properties 1–8 from design.md)
- Unit tests validate specific examples and edge cases for each new module
- The shim pattern (mirrors `storage-shim.js` / `validate-shim.js`) is used for all new modules so they can be imported as ES modules in Vitest while `app.js` stays a plain browser script
- Existing transactions without a `date` field are never modified; they are assigned to the `"Unknown Date"` Month_Group only

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2", "3.1", "3.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "1.5", "2.3", "2.4", "4.1", "4.2"] },
    { "id": 3, "tasks": ["4.3", "4.4", "6.2", "6.3", "6.4", "7.1", "8.2", "8.3"] },
    { "id": 4, "tasks": ["4.5", "4.6", "6.1", "7.2", "8.5"] },
    { "id": 5, "tasks": ["6.5", "6.6", "7.3", "8.4"] },
    { "id": 6, "tasks": ["6.7", "6.8", "8.1", "8.6"] },
    { "id": 7, "tasks": ["8.7", "8.8", "9.1"] },
    { "id": 8, "tasks": ["9.2"] }
  ]
}
```
