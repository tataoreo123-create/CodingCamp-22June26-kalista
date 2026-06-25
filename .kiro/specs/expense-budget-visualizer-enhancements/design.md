# Design Document

## Feature: expense-budget-visualizer-enhancements

---

## Overview

This document describes the technical design for five interrelated enhancements to the existing Expense & Budget Visualizer single-page application:

1. **Spending Limit Configuration & Visual Highlight** (Requirements 9 & 10) — lets the user define a budget cap that triggers a visual warning on the balance display when total spending meets or exceeds it.
2. **Dark/Light Mode Toggle** (Requirement 11) — a header button that flips the app between a light and a dark colour palette, persisted across sessions.
3. **Monthly Summary View** (Requirement 12) — a collapsible panel that groups all transactions by calendar month with per-category subtotals.
4. **Transaction Date Field** (Requirement 13) — stamps every new transaction with the local calendar date in `YYYY-MM-DD` format so the summary view can group it correctly.
5. **Persistence Consistency for New Preferences** (Requirement 14) — defines a strict schema for the two new Local Storage keys (`"expense_budget_limit"` and `"expense_theme"`) so the app initialises predictably.

### Constraints (unchanged from baseline)
- Single-file constraint: all changes land in `js/app.js`, `css/styles.css`, and `index.html` only.
- Vanilla JavaScript only — no frameworks, no build tools.
- Chart.js loaded via CDN is the only permitted external dependency.

### Design philosophy
All five enhancements share a single unidirectional data-flow pattern already used by the baseline app: **user gesture → mutate in-memory state → persist to Local Storage → re-render affected UI regions**. Each enhancement adds one or more new "re-render affected UI regions" targets without breaking the existing ones.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  index.html  (DOM skeleton)                                   │
│  ┌────────────┐  ┌─────────────────────────────────────────┐ │
│  │  <header>  │  │  <main>                                  │ │
│  │  theme-    │  │  balance-display  limit-input            │ │
│  │  toggle    │  │  expense-form                            │ │
│  │  button    │  │  transaction-list / empty-placeholder    │ │
│  └────────────┘  │  chart-container                         │ │
│                  │  summary-toggle  monthly-summary         │ │
│                  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                          │  events
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  js/app.js                                                    │
│                                                               │
│  Storage module  ──── reads/writes localStorage              │
│    .save(transactions)                                        │
│    .load()                                                    │
│    .savePref(key, value)   ◄── NEW                           │
│    .loadPref(key)          ◄── NEW                           │
│    .showErrorBanner(msg)                                      │
│                                                               │
│  Validator module                                             │
│    validate(name, amount, category)                          │
│    validateLimit(value)    ◄── NEW                           │
│    showErrors / clearErrors                                   │
│                                                               │
│  Theme module              ◄── NEW                           │
│    applyTheme(theme)                                          │
│    toggleTheme()                                              │
│                                                               │
│  LimitModule               ◄── NEW                           │
│    setLimit(value)                                            │
│    clearLimit()                                               │
│    updateLimitIndicator()                                     │
│                                                               │
│  SummaryModule             ◄── NEW                           │
│    renderSummary(transactions)                                │
│    toggleSummary()                                            │
│                                                               │
│  Controller (handleSubmit, handleDelete, init)               │
│    renderAll()  ── calls balance, list, chart, summary       │
└──────────────────────────────────────────────────────────────┘
```

The app remains a single JS file; the module boundaries above are logical groupings via plain object literals and standalone functions, not ES modules.

---

## Components and Interfaces

### 1. `Storage.savePref(key, value)` / `Storage.loadPref(key)`

Two thin wrappers added to the existing `Storage` object to read/write preference keys (`"expense_budget_limit"`, `"expense_theme"`) separately from the transactions array. Both follow the same try/catch → error-banner pattern as the existing `save`/`load` pair.

```js
// Signature
Storage.savePref(key: string, value: any): boolean
Storage.loadPref(key: string): any   // returns undefined on missing or error
```

Callers are responsible for interpreting the returned value; `savePref` JSON-serialises the value before writing.

### 2. Theme Module

```js
const Theme = {
  LIGHT: 'light',
  DARK:  'dark',
  // Read stored theme, fall back to 'light'
  load(): string,
  // Apply theme: set data-theme on <html>, update toggle button label/aria
  apply(theme: string): void,
  // Flip current theme, persist, re-apply
  toggle(): void,
};
```

`Theme.apply` writes `document.documentElement.dataset.theme` and sets `aria-checked` on `#theme-toggle`. It is intentionally called from both `init()` (for the initial paint) and the toggle's click handler.

**Critical timing**: Requirement 11.4 demands the theme attribute is set before any element is painted. The `<html>` element gets `data-theme` via an inline `<script>` block placed in `<head>` (before CSS) that reads Local Storage directly. The full `Theme` module in `app.js` then re-applies on `DOMContentLoaded` to wire up the button.

### 3. Limit Module

```js
const Limit = {
  // Active Budget_Limit value (number | null) — in-memory
  _value: null,
  load(): void,                    // reads from storage, sets _value
  set(rawInput: string): void,     // validates, persists, updates indicator
  clear(): void,                   // removes key, sets _value = null, removes indicator
  updateIndicator(): void,         // adds/removes .over-limit and aria-label on #balance-display
};
```

`Limit.updateIndicator()` is called by:
- `Limit.set` / `Limit.clear`
- `renderAll()` after every add/delete transaction

### 4. Summary Module

```js
const Summary = {
  // Toggle visibility of #monthly-summary
  toggle(): void,
  // Rebuild the Monthly_Summary_View DOM from the transactions array
  render(transactions: Transaction[]): void,
  // Derive YYYY-MM key from a date string (or 'unknown')
  _monthKey(date: string | undefined): string,
  // Format a month key to full month + year string (e.g. 'June 2026')
  _formatMonthHeading(key: string): string,
};
```

`Summary.render` is a full re-render (clear inner HTML, rebuild). It is only called when `#monthly-summary` does not carry the `hidden` attribute, so there is no wasted work while the panel is hidden.

### 5. HTML additions (`index.html`)

| Element | id / attributes | Position |
|---|---|---|
| Theme toggle button | `id="theme-toggle"` `role="switch"` `aria-checked` | Inside `<header>`, after `<h1>` |
| Inline theme-init script | `<script>` in `<head>` | After `<link rel="stylesheet">`, before `</head>` |
| Budget limit row | `id="limit-amount"` input + `id="set-limit-btn"` button + `id="error-limit"` span | Inside `<main>`, directly after `#balance-display` |
| Summary toggle button | `id="summary-toggle"` | Inside `<main>`, after `#chart-container` |
| Monthly summary panel | `id="monthly-summary"` `hidden` | Inside `<main>`, after `#summary-toggle` |

### 6. CSS additions (`css/styles.css`)

| Selector / Rule | Purpose |
|---|---|
| `[data-theme="dark"]` block | Overrides `--color-bg`, `--color-surface`, `--color-text`, `--color-border` and other custom properties for dark mode |
| `#balance-display.over-limit` | Red border / warning background when spending ≥ budget limit |
| `#limit-input-row` | Flex row layout for the limit input, button, and error span |
| `#monthly-summary`, `.month-group`, `.month-group summary` | Layout and typography for the Monthly Summary View |
| `#theme-toggle` | Minimal pill/switch styling in header |

---

## Data Models

### Transaction (extended)

```js
/**
 * @typedef {Object} Transaction
 * @property {string} id        - Unique identifier (e.g. crypto.randomUUID() or Date.now().toString())
 * @property {string} name      - Item name (non-empty, trimmed)
 * @property {number} amount    - Positive number, up to 2 decimal places
 * @property {string} category  - One of: 'Food' | 'Transport' | 'Fun'
 * @property {string} date      - Local calendar date as 'YYYY-MM-DD' (new, required for all new transactions)
 */
```

The `date` field is new. Existing transactions loaded from storage that lack `date` are treated as `"unknown"` in the summary view — the stored data is never modified.

### Budget Limit

Stored under Local Storage key `"expense_budget_limit"` as a JSON-serialised positive finite number. Absent from storage when no limit is active (never written as `null` or `0`).

In-memory representation: `Limit._value: number | null`.

### Theme Preference

Stored under Local Storage key `"expense_theme"` as the plain string `"dark"` or `"light"` (note: NOT JSON-serialised — stored as a raw string for simplicity, matching Requirement 11 wording). Absent keys default to `"light"` at runtime.

### Month Group (derived, not stored)

```js
/**
 * @typedef {Object} MonthGroup
 * @property {string} key           - 'YYYY-MM' | 'unknown'
 * @property {string} heading       - e.g. 'June 2026' | 'Unknown Date'
 * @property {number} total         - sum of all transaction amounts in this month
 * @property {Object.<string,number>} byCategory - { Food: 12.50, Transport: 5.00, … }
 */
```

Derived at render time by `Summary.render`; never stored.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Budget limit round-trip

*For any* positive finite number `v`, saving it as the Budget Limit via `Storage.savePref("expense_budget_limit", v)` and then reading it back via `Storage.loadPref("expense_budget_limit")` SHALL return a number `v'` such that `v' === v`.

**Validates: Requirements 14.5, 9.2**

---

### Property 2: Over-limit indicator is on iff spending ≥ limit

*For any* non-empty list of transactions with a total `T` and any active Budget Limit `L > 0`, after calling `Limit.updateIndicator()`:
- IF `T >= L` THEN `#balance-display` SHALL have the CSS class `over-limit`.
- IF `T < L` THEN `#balance-display` SHALL NOT have the CSS class `over-limit`.

**Validates: Requirements 10.1, 10.2, 10.3**

---

### Property 3: Theme toggle is an involution

*For any* starting theme value (`"light"` or `"dark"`), calling `Theme.toggle()` twice SHALL leave the `data-theme` attribute on `<html>` equal to the original value, and `aria-checked` on `#theme-toggle` equal to its original value.

**Validates: Requirements 11.2, 11.7**

---

### Property 4: Theme preference round-trip

*For any* theme value in `{ "light", "dark" }`, writing it to Local Storage via `Storage.savePref("expense_theme", theme)` and then reading it back SHALL return the identical string.

**Validates: Requirements 11.3, 14.3**

---

### Property 5: Monthly summary groups cover all transactions

*For any* non-empty array of transactions, the total of all Month Group totals in `Summary.render(transactions)` SHALL equal the sum of all transaction amounts in the input array (no transactions are silently dropped or double-counted).

**Validates: Requirements 12.3, 12.4**

---

### Property 6: Unknown-date transactions are isolated to the "unknown" group

*For any* transaction whose `date` field is absent, `null`, or not a valid `YYYY-MM-DD` string, `Summary._monthKey(date)` SHALL return `"unknown"`, and `Summary.render` SHALL place that transaction in the Month Group with key `"unknown"` and heading `"Unknown Date"`, not in any `YYYY-MM` group.

**Validates: Requirements 12.8, 13.3**

---

### Property 7: Transaction date field round-trip

*For any* valid `YYYY-MM-DD` date string `d` assigned to a Transaction's `date` field, saving the transaction array via `Storage.save(transactions)` and loading it back via `Storage.load()` SHALL return a transaction whose `date` field is the character-for-character identical string `d`.

**Validates: Requirements 13.4, 13.2, 6.5**

---

### Property 8: Invalid limit input leaves state unchanged

*For any* input value that is not a finite number greater than zero (empty string, zero, negative, non-numeric), calling `Limit.set(input)` SHALL leave `Limit._value` unchanged, leave the `"expense_budget_limit"` Local Storage key unchanged, and inject an error message into `#error-limit`.

**Validates: Requirements 9.4**

---

## Error Handling

| Scenario | Handling |
|---|---|
| `localStorage` throws during `savePref` or `loadPref` | Caught in `Storage.savePref`/`loadPref`; in-memory defaults used; existing error banner shown (Req 14.4) |
| `"expense_budget_limit"` key present but parsed value is not a finite number > 0 | Treated as absent; `Limit._value` set to `null`; no write-back (Req 14.2) |
| `"expense_theme"` key present but value is neither `"dark"` nor `"light"` | Defaults to `"light"`; no write-back (Req 14.3) |
| `Limit.set` called with invalid input | Inline error in `#error-limit` shown; no state change (Req 9.4) |
| Transaction loaded from storage without a `date` field | Treated as unknown date for summary grouping; stored data not modified (Req 13.3) |
| `Summary.render` called with an empty array | Renders `<p id="summary-placeholder">No transactions to summarize.</p>` and no month group sections (Req 12.6) |
| `#monthly-summary` is hidden when a transaction is added/deleted | `Summary.render` is skipped; render is deferred until the panel is opened (Req 12.5) |
| Chart.js CDN load failure | Existing `#chart-unavailable` banner shown (already handled in baseline) |

---

## Testing Strategy

### Dual approach

Unit tests cover specific examples and edge cases. Property-based tests verify universal invariants across a wide range of generated inputs. Both are implemented with the existing Vitest test runner (see `package.json`).

### Property-based testing library

**fast-check** (npm package `fast-check`) is the chosen PBT library. It integrates with Vitest via standard `it`/`test` wrappers and supports all the arbitraries needed (numbers, strings, arrays of objects).

Each property test MUST run a minimum of **100 iterations** (fast-check default is 100 runs; set `{ numRuns: 100 }` explicitly).

Each property test MUST include a comment in the format:
```
// Feature: expense-budget-visualizer-enhancements, Property N: <property text>
```

### Unit tests (example-based)

- **Validator**: `validateLimit` rejects empty string, zero, negative, non-numeric; accepts positive finite numbers.
- **Theme module**: `Theme.load()` returns `"light"` when key is absent; `Theme.apply("dark")` sets `data-theme="dark"` and `aria-checked="true"`.
- **Limit module**: `Limit.updateIndicator()` adds `over-limit` when total ≥ limit; removes it when total < limit; removes it when limit is null.
- **Summary module**: `Summary._monthKey` returns `"unknown"` for null/undefined/invalid date; returns `"2026-06"` for `"2026-06-15"`.
- **Summary render**: renders `#summary-placeholder` when transactions array is empty; renders correct month headings and totals for a known set of transactions.
- **Storage.savePref / loadPref**: savePref returns `true` on success; loadPref returns `undefined` when key is absent.

### Property-based tests

Each property maps to one property-based test:

| Property | Generator(s) | Assertion |
|---|---|---|
| P1: Budget limit round-trip | `fc.float({ min: 0.01, max: 1e9, noNaN: true })` | `loadPref(key) === v` |
| P2: Over-limit indicator | `fc.array(transactionArb)`, `fc.float(…)` for limit | class presence matches `total >= limit` |
| P3: Theme toggle involution | `fc.constantFrom('light', 'dark')` | two toggles return to original `data-theme` and `aria-checked` |
| P4: Theme preference round-trip | `fc.constantFrom('light', 'dark')` | `loadPref("expense_theme") === theme` |
| P5: Summary totals coverage | `fc.array(transactionArb, { minLength: 1 })` | sum of group totals === sum of amounts |
| P6: Unknown-date isolation | `fc.oneof(fc.constant(null), fc.constant(undefined), fc.string().filter(s => !/^\d{4}-\d{2}-\d{2}$/.test(s)))` | `_monthKey` returns `"unknown"` |
| P7: Transaction date round-trip | `fc.array(transactionWithDateArb, { minLength: 1 })` | `load()[i].date === save input date` |
| P8: Invalid limit leaves state unchanged | `fc.oneof(fc.constant(''), fc.constant('0'), fc.constant('-5'), fc.string().filter(s => isNaN(parseFloat(s))))` | `Limit._value` and storage key unchanged, error shown |

### Integration / smoke tests

- App loads with no Local Storage keys set → no errors thrown, balance shows $0.00, theme is light.
- App loads with a pre-seeded `"expense_budget_limit"` of `50` → `Limit._value === 50`; limit input field shows `50`.
- App loads with `"expense_theme": "dark"` → `document.documentElement.dataset.theme === "dark"`.
