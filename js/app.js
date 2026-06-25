document.addEventListener('DOMContentLoaded', function () {
  init();
});

// ---------------------------------------------------------------------------
// In-memory transactions array (shared across all modules)
// ---------------------------------------------------------------------------

/**
 * Primary in-memory copy of all transactions.
 * Populated by init() from Local Storage and kept in sync on every mutation.
 * @type {Array}
 */
let transactions = [];

// ---------------------------------------------------------------------------
// Storage Module (Task 5)
// ---------------------------------------------------------------------------

// Module-level fallback state used when localStorage is unavailable (Req 6.6)
let _memoryFallback = [];
let _storageUnavailable = false;

const Storage = {
  /**
   * Persists the transaction array to localStorage.
   * Falls back to in-memory storage on any exception (Req 6.1, 6.2, 6.6).
   * @param {Array} transactions
   * @returns {boolean} true on success, false if localStorage threw
   */
  save(transactions) {
    try {
      localStorage.setItem('expense_transactions', JSON.stringify(transactions));
      return true;
    } catch (err) {
      _storageUnavailable = true;
      Storage.showErrorBanner(
        '⚠ Local Storage is unavailable. Your data will not be saved between sessions.'
      );
      _memoryFallback = transactions;
      return false;
    }
  },

  /**
   * Reads and returns the persisted transaction array (Req 6.3, 6.6).
   * Returns the in-memory fallback if localStorage throws.
   * @returns {Array}
   */
  load() {
    try {
      const raw = localStorage.getItem('expense_transactions');
      if (raw === null) return [];
      return JSON.parse(raw);
    } catch (err) {
      _storageUnavailable = true;
      Storage.showErrorBanner(
        '⚠ Local Storage is unavailable. Your data will not be saved between sessions.'
      );
      return _memoryFallback;
    }
  },

  /**
   * Displays the storage error banner with the given message (Req 6.6).
   * @param {string} message
   */
  showErrorBanner(message) {
    const banner = document.getElementById('storage-error-banner');
    if (!banner) return;
    banner.textContent = message;
    banner.removeAttribute('hidden');
    banner.classList.add('visible');
  },

  /**
   * Hides the storage error banner.
   */
  hideErrorBanner() {
    const banner = document.getElementById('storage-error-banner');
    if (!banner) return;
    banner.setAttribute('hidden', '');
    banner.classList.remove('visible');
  },

  /**
   * Persists a single preference value to localStorage as JSON (Req 14.1, 9.2, 11.3).
   * Falls back gracefully on exception — shows error banner, does NOT throw (Req 14.4).
   * @param {string} key
   * @param {any} value
   * @returns {boolean} true on success, false if localStorage threw
   */
  savePref(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      Storage.showErrorBanner(
        '⚠ Local Storage is unavailable. Your data will not be saved between sessions.'
      );
      return false;
    }
  },

  /**
   * Reads and JSON-parses a single preference from localStorage (Req 14.1, 14.4).
   * Returns undefined when the key is absent or on any exception.
   * @param {string} key
   * @returns {any} parsed value, or undefined
   */
  loadPref(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return undefined;
      return JSON.parse(raw);
    } catch (err) {
      Storage.showErrorBanner(
        '⚠ Local Storage is unavailable. Your data will not be saved between sessions.'
      );
      return undefined;
    }
  },
};

// ---------------------------------------------------------------------------
// Theme Module (Task 4)
// ---------------------------------------------------------------------------

const Theme = {
  LIGHT: 'light',
  DARK: 'dark',

  /**
   * Reads the stored theme preference from Local Storage.
   * Falls back to 'light' if the key is absent or the value is invalid (Req 14.3).
   * @returns {'light'|'dark'}
   */
  load() {
    const stored = Storage.loadPref('expense_theme');
    return (stored === Theme.DARK || stored === Theme.LIGHT) ? stored : Theme.LIGHT;
  },

  /**
   * Applies the given theme to the document:
   *   - Sets data-theme on <html>
   *   - Updates #theme-toggle text and aria-checked synchronously (Req 11.1, 11.7)
   * @param {'light'|'dark'} theme
   */
  apply(theme) {
    document.documentElement.dataset.theme = theme;
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    if (theme === Theme.DARK) {
      btn.textContent = 'Switch to Light Mode';
      btn.setAttribute('aria-checked', 'true');
    } else {
      btn.textContent = 'Switch to Dark Mode';
      btn.setAttribute('aria-checked', 'false');
    }
  },

  /**
   * Flips the current theme, persists it, and applies it (Req 11.2, 11.3).
   */
  toggle() {
    const current = document.documentElement.dataset.theme;
    const newTheme = (current === Theme.DARK) ? Theme.LIGHT : Theme.DARK;
    Storage.savePref('expense_theme', newTheme);
    Theme.apply(newTheme);
  },
};

// ---------------------------------------------------------------------------
// Validator Module (Task 4.1)
// ---------------------------------------------------------------------------

/**
 * Validates a raw form submission.
 * @param {string} name     - raw value from the name input
 * @param {string} amount   - raw value from the amount input
 * @param {string} category - raw value from the category select
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validate(name, amount, category) {
  const errors = {};

  // name: non-empty after trimming whitespace
  if (!name || name.trim() === '') {
    errors.name = 'Item name is required.';
  }

  // amount: matches /^\d+(\.\d{1,2})?$/ AND parses to a finite number > 0
  if (!amount || !/^\d+(\.\d{1,2})?$/.test(amount.trim()) || parseFloat(amount) <= 0) {
    errors.amount = 'Amount must be a number greater than 0 (up to 2 decimal places).';
  }

  // category: must be exactly one of the allowed values
  const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];
  if (!category || !VALID_CATEGORIES.includes(category)) {
    errors.category = 'Please select a valid category (Food, Transport, or Fun).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Validator Module (Task 2.1) — Budget Limit Validation
// ---------------------------------------------------------------------------

/**
 * Validates a budget limit value from the Limit_Input field.
 * @param {string|number} value - raw value from the limit input
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
function validateLimit(value) {
  const num = parseFloat(value);
  if (value === '' || value === null || value === undefined || String(value).trim() === '') {
    return { valid: false, error: 'Please enter a valid amount greater than zero.' };
  }
  if (!isFinite(num) || isNaN(num) || num <= 0) {
    return { valid: false, error: 'Please enter a valid amount greater than zero.' };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Validation Error Display Helpers (Task 4.2)
// ---------------------------------------------------------------------------

/**
 * Populates the inline error spans adjacent to each field and makes them visible.
 * @param {{ name?: string, amount?: string, category?: string }} errors
 */
function showErrors(errors) {
  const fields = ['name', 'amount', 'category'];
  fields.forEach(function (field) {
    const span = document.getElementById('error-' + field);
    if (!span) return;
    if (errors[field]) {
      span.textContent = errors[field];
      span.style.visibility = 'visible';
    } else {
      span.textContent = '';
      span.style.visibility = 'hidden';
    }
  });
}

/**
 * Clears all inline error spans and hides them.
 */
function clearErrors() {
  const fields = ['name', 'amount', 'category'];
  fields.forEach(function (field) {
    const span = document.getElementById('error-' + field);
    if (!span) return;
    span.textContent = '';
    span.style.visibility = 'hidden';
  });
}

// ---------------------------------------------------------------------------
// Limit Module (Task 6)
// ---------------------------------------------------------------------------

const Limit = {
  /**
   * Active Budget_Limit value in memory (number | null).
   * null means no limit is currently set.
   */
  _value: null,

  /**
   * Reads the stored budget limit from Local Storage.
   * If the value is a finite number > 0, sets _value and populates the input.
   * Otherwise sets _value = null (Req 9.3, 14.2).
   */
  load() {
    const stored = Storage.loadPref('expense_budget_limit');
    const num = parseFloat(stored);
    if (isFinite(num) && num > 0) {
      Limit._value = num;
      const input = document.getElementById('limit-amount');
      if (input) input.value = num;
    } else {
      Limit._value = null;
    }
  },

  /**
   * Validates rawInput; on failure injects error into #error-limit and returns.
   * On success persists the value, updates _value, and refreshes the indicator
   * (Req 9.2, 9.4).
   * @param {string|number} rawInput
   */
  set(rawInput) {
    const result = validateLimit(rawInput);
    const errorSpan = document.getElementById('error-limit');

    if (!result.valid) {
      if (errorSpan) {
        errorSpan.textContent = result.error;
        errorSpan.style.visibility = 'visible';
      }
      return;
    }

    const num = parseFloat(rawInput);
    Storage.savePref('expense_budget_limit', num);
    Limit._value = num;
    if (errorSpan) {
      errorSpan.textContent = '';
      errorSpan.style.visibility = 'hidden';
    }
    Limit.updateIndicator();
  },

  /**
   * Removes the budget limit: clears Local Storage key, sets _value = null,
   * clears the input field and error span, and removes the visual indicator
   * (Req 9.5, 10.4).
   */
  clear() {
    localStorage.removeItem('expense_budget_limit');
    Limit._value = null;
    const input = document.getElementById('limit-amount');
    if (input) input.value = '';
    const errorSpan = document.getElementById('error-limit');
    if (errorSpan) {
      errorSpan.textContent = '';
      errorSpan.style.visibility = 'hidden';
    }
    Limit.updateIndicator();
  },

  /**
   * Computes the current transaction total and applies or removes the
   * over-limit CSS class and aria-label on #balance-display (Req 10.1–10.3, 10.5).
   */
  updateIndicator() {
    const balanceDisplay = document.getElementById('balance-display');
    if (!balanceDisplay) return;

    // Sum all transaction amounts from the DOM transaction list
    const items = document.querySelectorAll('#transaction-list li[data-amount]');
    let total = 0;
    items.forEach(function (li) {
      const amt = parseFloat(li.dataset.amount);
      if (isFinite(amt)) total += amt;
    });

    if (Limit._value !== null && total >= Limit._value) {
      balanceDisplay.classList.add('over-limit');
      balanceDisplay.setAttribute('aria-label', 'Total balance — over budget');
    } else {
      balanceDisplay.classList.remove('over-limit');
      balanceDisplay.setAttribute('aria-label', 'Total balance');
    }
  },
};

// ---------------------------------------------------------------------------
// Summary Module (Task 8)
// ---------------------------------------------------------------------------

const Summary = {
  /**
   * Derives a YYYY-MM bucket key from a transaction date string.
   * Returns "unknown" for absent, null, or any non-YYYY-MM-DD value (Req 12.8).
   * @param {string|null|undefined} date
   * @returns {string}
   */
  _monthKey(date) {
    if (date === null || date === undefined) return 'unknown';
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'unknown';
    return date.slice(0, 7); // "YYYY-MM"
  },

  /**
   * Maps a month key to a human-readable heading string (Req 12.3, 12.4).
   * "YYYY-MM" → "June 2026"; "unknown" → "Unknown Date".
   * @param {string} key
   * @returns {string}
   */
  _formatMonthHeading(key) {
    if (key === 'unknown') return 'Unknown Date';
    const [year, month] = key.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  },

  /**
   * Groups transactions into Month_Groups and renders them into #monthly-summary.
   * When the array is empty renders the placeholder paragraph instead (Req 12.6).
   * @param {Array} txs - transaction array
   */
  render(txs) {
    const container = document.getElementById('monthly-summary');
    if (!container) return;

    // Clear previous render
    container.innerHTML = '';

    // Empty state (Req 12.6)
    if (!txs || txs.length === 0) {
      const p = document.createElement('p');
      p.id = 'summary-placeholder';
      p.textContent = 'No transactions to summarize.';
      container.appendChild(p);
      return;
    }

    // Build a map: key → { total, byCategory }
    const groups = new Map();
    const CATEGORIES = ['Food', 'Transport', 'Fun'];

    txs.forEach(function (tx) {
      const key = Summary._monthKey(tx.date);
      if (!groups.has(key)) {
        const byCategory = {};
        CATEGORIES.forEach(function (c) { byCategory[c] = 0; });
        groups.set(key, { total: 0, byCategory });
      }
      const g = groups.get(key);
      g.total += tx.amount;
      if (CATEGORIES.includes(tx.category)) {
        g.byCategory[tx.category] += tx.amount;
      }
    });

    // Sort keys: newest YYYY-MM first, "unknown" always last (Req 12.3)
    const sortedKeys = Array.from(groups.keys()).sort(function (a, b) {
      if (a === 'unknown') return 1;
      if (b === 'unknown') return -1;
      return b.localeCompare(a); // lexicographic descending works for YYYY-MM
    });

    sortedKeys.forEach(function (key) {
      const g = groups.get(key);
      const heading = Summary._formatMonthHeading(key);
      const totalFormatted = '$' + g.total.toFixed(2);

      // <section class="month-group">
      const section = document.createElement('section');
      section.classList.add('month-group');

      // <h3> with heading + total
      const h3 = document.createElement('h3');
      h3.textContent = heading + ' — ' + totalFormatted;

      // Collapse <button> (Req 12.7)
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.textContent = 'Collapse';
      toggleBtn.setAttribute('aria-expanded', 'true');

      // <ul> of per-category subtotals
      const ul = document.createElement('ul');
      CATEGORIES.forEach(function (cat) {
        const amount = g.byCategory[cat];
        if (amount <= 0) return; // omit zero-total categories (Req 12.4)
        const li = document.createElement('li');
        li.textContent = cat + ': $' + amount.toFixed(2);
        ul.appendChild(li);
      });

      // Toggle click handler (Req 12.7)
      toggleBtn.addEventListener('click', function () {
        const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        if (expanded) {
          ul.hidden = true;
          toggleBtn.setAttribute('aria-expanded', 'false');
          toggleBtn.textContent = 'Expand';
        } else {
          ul.hidden = false;
          toggleBtn.setAttribute('aria-expanded', 'true');
          toggleBtn.textContent = 'Collapse';
        }
      });

      section.appendChild(h3);
      section.appendChild(toggleBtn);
      section.appendChild(ul);
      container.appendChild(section);
    });
  },

  /**
   * Toggles #monthly-summary visibility and updates the #summary-toggle label.
   * When revealing the panel, calls render() with the current transactions (Req 12.1, 12.2).
   */
  toggle() {
    const panel = document.getElementById('monthly-summary');
    const btn = document.getElementById('summary-toggle');
    if (!panel || !btn) return;

    if (panel.hasAttribute('hidden')) {
      // Reveal: render first, then show
      Summary.render(transactions);
      panel.removeAttribute('hidden');
      btn.textContent = 'Hide Monthly Summary';
    } else {
      // Hide
      panel.setAttribute('hidden', '');
      btn.textContent = 'Show Monthly Summary';
    }
  },
};

// ---------------------------------------------------------------------------
// Controller (Task 4.3 & 4.4)
// ---------------------------------------------------------------------------

/**
 * Handles form submission — always prevents default first (Req 1.6),
 * then validates before allowing a transaction to be created.
 * @param {Event} event
 */
function handleSubmit(event) {
  // Task 4.4: prevent submission via button click AND Enter key
  event.preventDefault();

  const name     = document.getElementById('expense-name').value;
  const amount   = document.getElementById('expense-amount').value;
  const category = document.getElementById('expense-category').value;

  const result = validate(name, amount, category);

  if (!result.valid) {
    // Task 4.2: show inline errors — do NOT add transaction
    showErrors(result.errors);
    return;
  }

  // Clear any leftover errors from a previous failed submission
  clearErrors();

  // Task 7.1: Create transaction object with date field (Req 13.1, 13.2)
  const transaction = {
    id: Date.now().toString(),
    name: name.trim(),
    amount: parseFloat(amount),
    category: category,
    date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD local date
  };

  const txList = Storage.load();
  txList.push(transaction);
  Storage.save(txList);
  transactions = txList;

  // Reset the form fields after successful submission (Req 1.5)
  document.getElementById('expense-form').reset();

  renderAll();
}

/**
 * Re-renders all dynamic UI regions: balance display, transaction list, chart,
 * limit indicator, and (if visible) the monthly summary.
 * Called after any transaction mutation (add / delete).
 */
function renderAll() {
  // Task 6: Update the over-limit indicator whenever the UI is refreshed (Req 10.3)
  Limit.updateIndicator();

  // Task 8.4: Re-render Monthly Summary only when the panel is visible (Req 12.5)
  const summaryPanel = document.getElementById('monthly-summary');
  if (summaryPanel && !summaryPanel.hasAttribute('hidden')) {
    Summary.render(transactions);
  }
  // TODO: renderBalance(), renderList(), renderChart() (Tasks 7+)
}

function init() {
  // Load persisted transactions into in-memory array (Req 6.3)
  transactions = Storage.load();

  // Task 4: Apply persisted theme on startup (Req 11.4)
  Theme.apply(Theme.load());

  // Task 4: Wire Theme_Toggle click handler (Req 11.2)
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      Theme.toggle();
    });
  }

  // Wire submit handler (Task 4.4)
  document.getElementById('expense-form')
    .addEventListener('submit', handleSubmit);

  // Task 4.3: clear inline errors as the user edits each field
  document.getElementById('expense-name')
    .addEventListener('input', clearErrors);

  document.getElementById('expense-amount')
    .addEventListener('input', clearErrors);

  document.getElementById('expense-category')
    .addEventListener('change', clearErrors);

  // Task 6: Load persisted budget limit (Req 9.3, 14.2)
  Limit.load();

  // Task 6: Wire Set Limit button (Req 9.2)
  const setLimitBtn = document.getElementById('set-limit-btn');
  if (setLimitBtn) {
    setLimitBtn.addEventListener('click', function () {
      Limit.set(document.getElementById('limit-amount').value);
    });
  }

  // Task 6: Wire Enter key on limit-amount input (Req 9.6)
  const limitAmountInput = document.getElementById('limit-amount');
  if (limitAmountInput) {
    limitAmountInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        Limit.set(limitAmountInput.value);
      }
    });
  }

  // Task 8.4: Wire Summary_Toggle click → Summary.toggle() (Req 12.2)
  const summaryToggleBtn = document.getElementById('summary-toggle');
  if (summaryToggleBtn) {
    summaryToggleBtn.addEventListener('click', function () {
      Summary.toggle();
    });
  }
}
