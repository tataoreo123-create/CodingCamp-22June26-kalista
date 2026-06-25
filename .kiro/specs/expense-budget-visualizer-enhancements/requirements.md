# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that enables users to track personal expenses by recording transactions, viewing spending totals, and visualizing spending distribution across categories through a pie chart. The app requires no backend server, stores all data in the browser's Local Storage, and is built with HTML, CSS, and Vanilla JavaScript only. It can be used as a standalone web page or browser extension.

## Glossary

- **App**: The Expense & Budget Visualizer web application
- **Balance_Display**: The UI element that shows the running total of all transaction amounts
- **Budget_Limit**: A positive monetary amount entered by the user above which the total spending is considered over-budget
- **Limit_Input**: The UI control (numeric input + save button) used to set or clear the Budget_Limit
- **Limit_Indicator**: A visual highlight (CSS class or style change) applied to the Balance_Display and/or transaction rows when spending equals or exceeds the Budget_Limit
- **Theme_Toggle**: The accessible button or switch that alternates the App between light mode and dark mode
- **Theme_Preference**: The string `"dark"` or `"light"` persisted under a fixed Local Storage key
- **Monthly_Summary_View**: A secondary UI panel that groups transactions by year-month and displays per-month and per-category totals
- **Summary_Toggle**: The button that shows or hides the Monthly_Summary_View
- **Month_Group**: A single collapsible section within the Monthly_Summary_View representing one calendar month
- **Transaction**: A single expense entry with fields `id`, `name`, `amount`, `category`, and `date`
- **Category**: A classification label for a transaction; one of: Food, Transport, or Fun
- **Local_Storage**: The browser's Local Storage API used for client-side data persistence
- **Validator**: The logic component responsible for checking that all form fields are valid before submission

---

## Requirements

### Requirement 1: Transaction Entry via Input Form

**User Story:** As a user, I want to fill in and submit a form with an item name, amount, and category, so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL include a text field for the item name, a numeric field for the amount, and a dropdown selector with the options Food, Transport, and Fun, where no category option is pre-selected by default.
2. WHEN the user submits the Input_Form with all fields filled, THE App SHALL add the transaction to the Transaction_List and persist it to Local_Storage within 300ms.
3. WHEN the user submits the Input_Form, THE Validator SHALL check that the item name field is not empty and does not consist solely of whitespace, the amount field contains a numeric value greater than zero (decimals allowed, up to 2 decimal places), and a category has been selected from the dropdown.
4. IF the Validator detects that one or more fields are empty or invalid, THEN THE Input_Form SHALL display a descriptive inline validation message adjacent to the offending field(s) and SHALL NOT add a transaction to the Transaction_List.
5. WHEN a transaction is successfully submitted, THE Input_Form SHALL reset all fields to their default empty/unselected state immediately.
6. THE Input_Form SHALL prevent submission via both button click and keyboard Enter key when validation fails.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see a scrollable list of all my recorded transactions, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each transaction with its item name, monetary amount formatted to 2 decimal places with a currency symbol, and category label.
2. THE Transaction_List SHALL be scrollable when the number of transactions exceeds the visible area of the list container.
3. WHEN the App loads in the browser, THE Transaction_List SHALL render all transactions stored in Local_Storage in the order they were added (oldest first).
4. WHEN a new transaction is added, THE Transaction_List SHALL update to include the new entry at the bottom of the list within 300ms, without requiring a page reload.
5. WHEN no transactions exist, THE Transaction_List SHALL display a placeholder message indicating that no transactions have been recorded yet.

---

### Requirement 3: Transaction Deletion

**User Story:** As a user, I want to delete a transaction from the list, so that I can remove incorrect or unwanted entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a clearly labelled delete control (e.g., a "Delete" button or trash icon) for each transaction entry.
2. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from the Transaction_List display immediately.
3. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from Local_Storage within 300ms of the user's action.
4. IF a Local_Storage write failure occurs during deletion, THEN THE App SHALL retain the transaction in the Transaction_List and display an error message to the user.
5. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the new total within 500ms.
6. WHEN a transaction is deleted, THE Chart SHALL update to reflect the new category distribution within 500ms.

---

### Requirement 4: Total Balance Display

**User Story:** As a user, I want to see my total spending balance at the top of the page, so that I always know how much I have spent in total.

#### Acceptance Criteria

1. THE Balance_Display SHALL be positioned above both the Input_Form and the Transaction_List in the visual layout of the App.
2. THE Balance_Display SHALL show the sum of all transaction amounts currently stored in Local_Storage, formatted to 2 decimal places with a currency symbol (e.g., $0.00).
3. WHEN a transaction is added, THE Balance_Display SHALL update to reflect the new total within 500ms, without requiring a page reload.
4. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the new total within 500ms, without requiring a page reload.
5. WHEN no transactions exist, THE Balance_Display SHALL show a total of $0.00.

---

### Requirement 5: Pie Chart Visualization

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can quickly understand how my budget is distributed.

#### Acceptance Criteria

1. THE Chart SHALL display a pie chart where each slice represents a category (Food, Transport, Fun) with a size proportional to the sum of transaction amounts for that category; categories with a zero total SHALL be omitted from the chart.
2. WHEN a transaction is added, THE Chart SHALL update automatically to reflect the new category distribution within 500ms, without requiring a page reload.
3. WHEN a transaction is deleted, THE Chart SHALL update automatically to reflect the new category distribution within 500ms, without requiring a page reload.
4. WHEN all transactions are removed or no transactions exist, THE Chart SHALL hide the pie chart and display a visible placeholder element with text indicating no spending data is available (e.g., "No data to display").
5. THE Chart SHALL include a legend identifying each category by its colour and label.

---

### Requirement 6: Client-Side Data Persistence

**User Story:** As a user, I want my transactions to be saved between browser sessions, so that my data is not lost when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL write the complete updated transaction list to Local_Storage immediately (within the same event loop tick as the UI update).
2. WHEN a transaction is deleted, THE App SHALL write the complete updated transaction list to Local_Storage immediately (within the same event loop tick as the UI update).
3. WHEN the App loads, THE App SHALL read all transactions from Local_Storage and render them in the Transaction_List, the Balance_Display, and the Chart before the user can interact with the Input_Form.
4. THE App SHALL store all transaction data under a single, fixed Local_Storage key as a JSON-serialized array of transaction objects, where each object contains at minimum the fields: id (unique string), name (string), amount (number), and category (string).
5. FOR ALL valid transaction arrays, serializing the array to JSON and then parsing the resulting JSON string SHALL produce an array whose entries are strictly equal (same id, name, amount, and category values) to the original (round-trip property).
6. IF Local_Storage is unavailable or throws an exception during a read or write operation, THEN THE App SHALL display a visible error message to the user and continue operating with in-memory data for the current session.

---

### Requirement 7: File and Code Structure

**User Story:** As a developer, I want the project to follow a clean, minimal file structure, so that the codebase is easy to read and maintain.

#### Acceptance Criteria

1. THE App SHALL be structured with exactly one HTML file at the project root (e.g., `index.html`), exactly one CSS file inside the `css/` directory, and exactly one JavaScript file inside the `js/` directory; no other CSS or JS files shall be present in those directories.
2. THE App's source code SHALL use only HTML, CSS, and Vanilla JavaScript; it SHALL NOT import, bundle, or reference any front-end framework (e.g., React, Vue, Angular) or build tool (e.g., webpack, Vite, Babel) either at development time or at runtime, with the sole exception of Chart.js loaded via a CDN `<script>` tag.
3. THE App SHALL be fully functional when opened as a local file in a browser (via `file://` protocol) or served as a browser extension, without requiring a local development server, provided that the browser supports ES6 and the Web Storage API (Local Storage) — covering Chrome ≥ 90, Firefox ≥ 88, Edge ≥ 90, and Safari ≥ 14.

---

### Requirement 8: Browser Compatibility and Performance

**User Story:** As a user, I want the app to load quickly and respond without lag in any modern browser, so that the experience is smooth and reliable.



#### Acceptance Criteria

1. THE App SHALL function without JavaScript errors, layout breakage, or data loss in the current stable releases of Chrome (≥ 90), Firefox (≥ 88), Edge (≥ 90), and Safari (≥ 14).
2. WHEN the user interacts with the Input_Form, Transaction_List, Balance_Display, or Chart, THE App SHALL reflect the change in the UI within 100ms, measured on a device with at least a quad-core CPU at 2 GHz and 4 GB RAM.
3. THE App SHALL load all required assets and render a fully interactive initial UI within 3 seconds, measured on a network connection of at least 10 Mbps download speed with a cold browser cache.

---

### Requirement 9: Spending Limit Configuration

**User Story:** As a user, I want to set a spending limit so that I can define a budget threshold for my total expenses.

#### Acceptance Criteria

1. THE App SHALL include a Limit_Input component consisting of a numeric input field (id `limit-amount`) with `aria-label="Budget limit amount"` and a "Set Limit" button (id `set-limit-btn`) with `aria-label="Set spending limit"`, positioned adjacent to or below the Balance_Display.
2. WHEN the user activates the "Set Limit" button and the Limit_Input field contains a finite numeric value greater than zero, THE App SHALL persist that value as a JSON-serialized number to Local_Storage under the key `"expense_budget_limit"` within the same event loop tick and update the active Budget_Limit in memory.
3. WHEN the App loads, THE App SHALL read the `"expense_budget_limit"` key from Local_Storage; IF the stored value is a finite number greater than zero, THEN THE App SHALL set it as the active Budget_Limit and populate the Limit_Input field with that value.
4. WHEN the user activates the "Set Limit" button and the Limit_Input field is empty or contains a value less than or equal to zero, THE Validator SHALL inject an inline error message into the element with id `error-limit` adjacent to the Limit_Input field, set its `visibility` to `visible`, and SHALL NOT modify the stored Budget_Limit or the active in-memory limit.
5. WHEN the user activates the "Set Limit" button with an empty Limit_Input field, THE App SHALL treat this as a clear action: remove the `"expense_budget_limit"` key from Local_Storage, set the active Budget_Limit to `null` in memory, clear any Limit_Indicator from the Balance_Display, and reset the Limit_Input field to empty.
6. THE Limit_Input numeric field SHALL be reachable via Tab key navigation and SHALL be activatable by pressing Enter when focused.

---

### Requirement 10: Spending Limit Visual Highlight

**User Story:** As a user, I want the balance and transactions highlighted when I exceed my spending limit, so that I get an immediate visual warning that I am over budget.

#### Acceptance Criteria

1. WHILE a Budget_Limit is set (non-null) and the numeric sum of all transaction amounts is greater than or equal to the Budget_Limit, THE Balance_Display element SHALL have the CSS class `over-limit` applied to it, producing a visually distinct appearance (such as a red border or warning background) defined entirely in `css/styles.css`.
2. WHILE a Budget_Limit is set (non-null) and the numeric sum of all transaction amounts is strictly less than the Budget_Limit, THE Balance_Display element SHALL NOT have the CSS class `over-limit` applied, and SHALL render using only its default CSS rules.
3. WHEN a transaction is added or deleted and a Budget_Limit is set, THE App SHALL recompute the spending total, compare it against the Budget_Limit, and add or remove the `over-limit` CSS class on the Balance_Display within 500ms of the user's action.
4. WHEN the Budget_Limit is cleared (set to null), THE App SHALL remove the `over-limit` CSS class from the Balance_Display within 500ms.
5. THE Balance_Display element SHALL carry `aria-live="polite"` so that its text content changes (which include the current total) are announced by screen readers; additionally, WHEN the `over-limit` class is added, THE App SHALL update the `aria-label` of the Balance_Display to include the phrase "over budget" and WHEN the class is removed the `aria-label` SHALL revert to a label that does not include "over budget".

---

### Requirement 11: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between a dark and a light color theme, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL include a Theme_Toggle button (id `theme-toggle`) in the `<header>` element. WHEN the active theme is light, its text content SHALL be `"Switch to Dark Mode"`. WHEN the active theme is dark, its text content SHALL be `"Switch to Light Mode"`.
2. WHEN the user activates the Theme_Toggle, THE App SHALL toggle the `data-theme` attribute on the `<html>` element between `"light"` and `"dark"`, causing all CSS custom properties scoped to `[data-theme]` to recompute within one browser rendering cycle.
3. WHEN the user activates the Theme_Toggle, THE App SHALL write the new theme value (`"dark"` or `"light"`) to Local_Storage under the key `"expense_theme"` within the same event loop tick as the attribute change.
4. WHEN the App loads, THE App SHALL read the `"expense_theme"` key from Local_Storage and set the `data-theme` attribute on the `<html>` element to the stored value before `DOMContentLoaded` fires, so that the correct theme's CSS custom properties are active before any element is painted.
5. WHERE the `"expense_theme"` key is absent from Local_Storage or its value is neither `"dark"` nor `"light"`, THE App SHALL set `data-theme="light"` on the `<html>` element.
6. THE dark theme SHALL be defined exclusively via CSS custom property overrides inside a `[data-theme="dark"]` selector block in `css/styles.css`, covering at minimum: `--color-bg`, `--color-surface`, `--color-text`, and `--color-border`; no inline `style` attributes SHALL be set on any element to implement theming.
7. THE Theme_Toggle button SHALL carry `role="switch"` and `aria-checked="true"` when the active theme is dark and `aria-checked="false"` when the active theme is light; the attribute SHALL be updated synchronously whenever the theme changes.
8. WHEN the `data-theme` attribute changes, all elements that use CSS custom properties for background, text, border, or accent color SHALL automatically reflect the new theme palette, because they reference the same custom properties overridden by the `[data-theme="dark"]` block.

---

### Requirement 12: Monthly Summary View

**User Story:** As a user, I want to see my transactions grouped by month, so that I can quickly understand my spending patterns over time.

#### Acceptance Criteria

1. THE App SHALL include a Summary_Toggle button (id `summary-toggle`) visible in the page layout. WHEN the Monthly_Summary_View is hidden, its label SHALL be `"Show Monthly Summary"`. WHEN the Monthly_Summary_View is visible, its label SHALL be `"Hide Monthly Summary"`. THE Monthly_Summary_View (id `monthly-summary`) SHALL have the `hidden` attribute set on initial page load.
2. WHEN the user activates the Summary_Toggle, THE App SHALL toggle the `hidden` attribute on the Monthly_Summary_View element and update the Summary_Toggle label accordingly within 300ms.
3. THE Monthly_Summary_View SHALL group transactions into Month_Groups by deriving a `YYYY-MM` key from the `date` field (or `"unknown"` when the field is absent); Month_Groups SHALL be ordered from the most recent `YYYY-MM` key to the oldest, with the `"unknown"` group, if present, rendered last.
4. THE Monthly_Summary_View SHALL render each Month_Group as a `<section>` containing: a `<h3>` heading with the full month name and four-digit year (e.g., `"June 2026"`) and the month total formatted as `"$N.NN"`; and a `<ul>` of per-category lines showing category name and category total formatted as `"$N.NN"`, covering only categories that have at least one transaction in that month; categories with zero total for the month SHALL be omitted.
5. WHEN a transaction is added or deleted and the Monthly_Summary_View does not have the `hidden` attribute, THE App SHALL re-render the Monthly_Summary_View to reflect the change within 500ms of the user's action.
6. WHEN no transactions exist and the Monthly_Summary_View is visible, THE App SHALL display a `<p id="summary-placeholder">` element with the text `"No transactions to summarize."` and render no Month_Group sections.
7. Each Month_Group `<section>` SHALL contain a `<button>` (the group toggle) that expands or collapses the per-category `<ul>`. On first render all groups SHALL be in the expanded state. The group toggle SHALL carry `aria-expanded="true"` when expanded and `aria-expanded="false"` when collapsed and SHALL be reachable via Tab key navigation.
8. IF a Transaction object's `date` field is absent, `null`, or not a valid `YYYY-MM-DD` string, THEN THE App SHALL assign it to a Month_Group with heading `"Unknown Date"` and `YYYY-MM` key `"unknown"`, rendered last in the Monthly_Summary_View.

---

### Requirement 13: Transaction Date Field

**User Story:** As a user, I want each transaction I record to be stamped with the date it was added, so that the monthly summary view can correctly group my expenses.

#### Acceptance Criteria

1. WHEN the user submits a valid expense entry, THE App SHALL derive the current local calendar date as a string in `YYYY-MM-DD` format and assign it to the `date` field of the new Transaction object before the object is passed to Storage.
2. WHEN a Transaction object is written to Local_Storage, THE App SHALL include the `date` field in the JSON-serialized representation alongside `id`, `name`, `amount`, and `category`; a Transaction object without a `date` field SHALL NOT be written to storage by this App.
3. WHEN the App loads transactions from Local_Storage that lack a `date` field, THE App SHALL treat those transactions as having an unknown date, assigning them to the `"Unknown Date"` Month_Group in the Monthly_Summary_View, without modifying or discarding the stored data.
4. THE App SHALL store the `date` field value unchanged in Local_Storage such that `Storage.load()` returns a `date` string identical (same character sequence) to the one that was passed to `Storage.save()`.

---

### Requirement 14: Persistence Consistency for New Preferences

**User Story:** As a developer, I want all new user preferences stored in Local Storage to follow a consistent schema, so that the app initializes predictably across sessions.

#### Acceptance Criteria

1. WHEN the App saves a Budget_Limit, THE App SHALL write a JSON-serialized positive finite number to Local_Storage under the key `"expense_budget_limit"`; WHEN no Budget_Limit is active, the key SHALL be absent from Local_Storage (not set to `null` or `0`).
2. WHEN the App loads and the `"expense_budget_limit"` key is present in Local_Storage, THE App SHALL parse the stored value; IF the parsed value is not a finite number greater than zero, THEN THE App SHALL treat it as absent and set the active Budget_Limit to `null` without writing back to Local_Storage.
3. WHEN the App saves a Theme_Preference, THE App SHALL write the string `"dark"` or `"light"` to Local_Storage under the key `"expense_theme"`; WHEN the App loads and the stored value is neither `"dark"` nor `"light"`, THE App SHALL default to `"light"` without writing back to Local_Storage.
4. IF Local_Storage is unavailable when reading or writing any preference key (`"expense_budget_limit"` or `"expense_theme"`), THEN THE App SHALL catch the exception, operate with in-memory defaults (Budget_Limit `null`; Theme_Preference `"light"`), and display the existing storage error banner without throwing an unhandled exception.
5. WHEN the App saves a Budget_Limit value `v` (a positive finite number) to Local_Storage and then reads it back via `Storage.load` for the budget key, THE App SHALL obtain a number `v'` such that `v' === v`.

