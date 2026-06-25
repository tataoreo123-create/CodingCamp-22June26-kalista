/**
 * Thin shim that re-exports validate() and validateLimit() so test files
 * can import them as ES modules, while app.js itself is a plain script.
 *
 * Implementations are duplicated here to keep app.js as a plain
 * browser script (no `export` keyword) per Requirement 7.2.
 */

/**
 * Validates a raw form submission.
 * @param {string} name
 * @param {string} amount
 * @param {string} category
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
export function validate(name, amount, category) {
  const errors = {};

  if (!name || name.trim() === '') {
    errors.name = 'Item name is required.';
  }

  if (!amount || !/^\d+(\.\d{1,2})?$/.test(amount.trim()) || parseFloat(amount) <= 0) {
    errors.amount = 'Amount must be a number greater than 0 (up to 2 decimal places).';
  }

  const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];
  if (!category || !VALID_CATEGORIES.includes(category)) {
    errors.category = 'Please select a valid category (Food, Transport, or Fun).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates a budget limit value from the Limit_Input field.
 * @param {string|number} value - raw value from the limit input
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
export function validateLimit(value) {
  const num = parseFloat(value);
  if (value === '' || value === null || value === undefined || String(value).trim() === '') {
    return { valid: false, error: 'Please enter a valid amount greater than zero.' };
  }
  if (!isFinite(num) || isNaN(num) || num <= 0) {
    return { valid: false, error: 'Please enter a valid amount greater than zero.' };
  }
  return { valid: true };
}
