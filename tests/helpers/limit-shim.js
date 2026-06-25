/**
 * Limit shim — re-exports the Limit module logic so test files can import
 * it as an ES module, while app.js itself is a plain browser script.
 *
 * The shim accepts injected `storage` and `dom` doubles so the module can
 * be tested in Vitest without a browser.
 *
 * Mirrors the pattern of storage-shim.js and validate-shim.js.
 *
 * Validates: Requirements 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.5
 */

/**
 * Validates a budget limit value from the Limit_Input field.
 * Duplicated from validate-shim.js so this shim is self-contained.
 *
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

/**
 * Factory that returns a Limit-like object with the same public interface as
 * the Limit constant in app.js, but with all DOM and storage access routed
 * through the injected doubles.
 *
 * @param {object} storage - storage double with loadPref(key), savePref(key, value), removeItem(key)
 * @param {object} dom     - DOM double with getElementById(id) and querySelectorAll(selector)
 * @returns {object} Limit-like module
 */
export function makeLimitModule(storage, dom) {
  const Limit = {
    /**
     * Active Budget_Limit value in memory (number | null).
     */
    _value: null,

    /**
     * Reads the stored budget limit from injected storage.
     * If the value is a finite number > 0, sets _value and populates the input.
     * Otherwise sets _value = null (Req 9.3, 14.2).
     */
    load() {
      const stored = storage.loadPref('expense_budget_limit');
      const num = parseFloat(stored);
      if (isFinite(num) && num > 0) {
        Limit._value = num;
        const input = dom.getElementById('limit-amount');
        if (input) input.value = num;
      } else {
        Limit._value = null;
      }
    },

    /**
     * Validates rawInput; on failure injects error into #error-limit and returns.
     * On success persists the value, updates _value, and refreshes the indicator
     * (Req 9.2, 9.4).
     *
     * @param {string|number} rawInput
     */
    set(rawInput) {
      const result = validateLimit(rawInput);
      const errorSpan = dom.getElementById('error-limit');

      if (!result.valid) {
        if (errorSpan) {
          errorSpan.textContent = result.error;
          errorSpan.style.visibility = 'visible';
        }
        return;
      }

      const num = parseFloat(rawInput);
      storage.savePref('expense_budget_limit', num);
      Limit._value = num;
      if (errorSpan) {
        errorSpan.textContent = '';
        errorSpan.style.visibility = 'hidden';
      }
      Limit.updateIndicator();
    },

    /**
     * Removes the budget limit: clears storage key, sets _value = null,
     * clears the input field and error span, and removes the visual indicator
     * (Req 9.5, 10.4).
     */
    clear() {
      storage.removeItem('expense_budget_limit');
      Limit._value = null;
      const input = dom.getElementById('limit-amount');
      if (input) input.value = '';
      const errorSpan = dom.getElementById('error-limit');
      if (errorSpan) {
        errorSpan.textContent = '';
        errorSpan.style.visibility = 'hidden';
      }
      Limit.updateIndicator();
    },

    /**
     * Computes the current transaction total from DOM elements tagged with
     * [data-amount] and applies or removes the over-limit CSS class and
     * aria-label on #balance-display (Req 10.1–10.3, 10.5).
     */
    updateIndicator() {
      const balanceDisplay = dom.getElementById('balance-display');
      if (!balanceDisplay) return;

      // Sum all transaction amounts from the DOM transaction list
      const items = dom.querySelectorAll('#transaction-list li[data-amount]');
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

  return Limit;
}
