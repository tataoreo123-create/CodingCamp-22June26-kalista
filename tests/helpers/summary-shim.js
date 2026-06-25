/**
 * Summary shim — re-exports the Summary module logic so test files can import
 * it as an ES module, while app.js itself is a plain browser script.
 *
 * The shim accepts an injected `document`-like object so the DOM operations
 * performed by `render` are testable in Vitest without a real browser.
 *
 * Mirrors the pattern of storage-shim.js, theme-shim.js, and limit-shim.js.
 *
 * Validates: Requirements 12.1, 12.3, 12.4, 12.6, 12.7, 12.8
 */

// Injected dependency — replaced per-test via resetSummary()
let _document = null;

/**
 * Resets the injected document double.
 * Call this in beforeEach() to isolate tests.
 *
 * @param {object} documentMock - object with getElementById() that returns
 *                                a container element supporting innerHTML and
 *                                appendChild (e.g. a happy-dom or jsdom element)
 */
export function resetSummary(documentMock) {
  _document = documentMock;
}

// ---------------------------------------------------------------------------
// Summary logic (mirrors app.js implementation, using injected _document)
// ---------------------------------------------------------------------------

const CATEGORIES = ['Food', 'Transport', 'Fun'];

export const Summary = {
  /**
   * Derives a YYYY-MM bucket key from a transaction date string.
   * Returns "unknown" for absent, null, or any non-YYYY-MM-DD value (Req 12.8).
   *
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
   *
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
   * Groups transactions into Month_Groups and renders them into the
   * #monthly-summary element obtained from the injected document.
   * When the array is empty renders the placeholder paragraph instead (Req 12.6).
   *
   * @param {Array} txs - transaction array
   */
  render(txs) {
    const container = _document.getElementById('monthly-summary');
    if (!container) return;

    // Clear previous render
    container.innerHTML = '';

    // Empty state (Req 12.6)
    if (!txs || txs.length === 0) {
      const p = _document.createElement('p');
      p.id = 'summary-placeholder';
      p.textContent = 'No transactions to summarize.';
      container.appendChild(p);
      return;
    }

    // Build a map: key → { total, byCategory }
    const groups = new Map();

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
      return b.localeCompare(a);
    });

    sortedKeys.forEach(function (key) {
      const g = groups.get(key);
      const heading = Summary._formatMonthHeading(key);
      const totalFormatted = '$' + g.total.toFixed(2);

      // <section class="month-group">
      const section = _document.createElement('section');
      section.classList.add('month-group');

      // <h3> with heading + total
      const h3 = _document.createElement('h3');
      h3.textContent = heading + ' — ' + totalFormatted;

      // Collapse <button> (Req 12.7)
      const toggleBtn = _document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.textContent = 'Collapse';
      toggleBtn.setAttribute('aria-expanded', 'true');

      // <ul> of per-category subtotals
      const ul = _document.createElement('ul');
      CATEGORIES.forEach(function (cat) {
        const amount = g.byCategory[cat];
        if (amount <= 0) return; // omit zero-total categories (Req 12.4)
        const li = _document.createElement('li');
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
};
