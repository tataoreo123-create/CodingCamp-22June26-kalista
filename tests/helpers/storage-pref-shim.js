/**
 * Storage-pref shim — re-exports the savePref/loadPref logic so test files
 * can import them as ES modules, while app.js itself is a plain browser script.
 *
 * The shim accepts an injected `localStorage`-like object so tests can
 * simulate both normal operation and failure conditions (Req 14.4).
 * The `document` dependency (for the banner) is injected via resetStoragePref().
 */

// Injected dependencies — replaced per-test
let _localStorage = null;
let _document = null;

/**
 * Resets injected dependencies to fresh test doubles.
 * Call this in beforeEach() to isolate tests.
 *
 * @param {object} localStorageMock - localStorage-like test double
 * @param {object} documentMock    - document-like test double with getElementById
 */
export function resetStoragePref(localStorageMock, documentMock) {
  _localStorage = localStorageMock;
  _document = documentMock;
}

// ---------------------------------------------------------------------------
// Internal helper (mirrors app.js showErrorBanner, using injected _document)
// ---------------------------------------------------------------------------
function _showErrorBanner(message) {
  if (!_document) return;
  const banner = _document.getElementById('storage-error-banner');
  if (!banner) return;
  banner.textContent = message;
  banner.removeAttribute('hidden');
  banner.classList.add('visible');
}

// ---------------------------------------------------------------------------
// Exported functions (Req 14.1, 14.4, 9.2, 11.3)
// ---------------------------------------------------------------------------

/**
 * Persists a single preference value to localStorage as JSON.
 * Returns true on success, false if localStorage threw (Req 14.4).
 *
 * @param {string} key
 * @param {any} value
 * @returns {boolean}
 */
export function savePref(key, value) {
  try {
    _localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    _showErrorBanner(
      '⚠ Local Storage is unavailable. Your data will not be saved between sessions.'
    );
    return false;
  }
}

/**
 * Reads and JSON-parses a single preference from localStorage.
 * Returns undefined when the key is absent or on any exception (Req 14.4).
 *
 * @param {string} key
 * @returns {any} parsed value, or undefined
 */
export function loadPref(key) {
  try {
    const raw = _localStorage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw);
  } catch (err) {
    _showErrorBanner(
      '⚠ Local Storage is unavailable. Your data will not be saved between sessions.'
    );
    return undefined;
  }
}
