/**
 * Theme shim — re-exports the Theme module logic so test files can import
 * it as an ES module, while app.js itself is a plain browser script.
 *
 * The shim accepts an injected `document`-like object and a `storage`-like
 * object so tests can verify Theme behaviour without touching the real DOM
 * or localStorage.
 *
 * Mirrors the pattern of storage-shim.js and storage-pref-shim.js.
 *
 * Validates: Requirements 11.2, 11.7
 */

// Injected dependencies — replaced per-test via resetTheme()
let _document = null;
let _storage = null;

/**
 * Resets injected dependencies to fresh test doubles.
 * Call this in beforeEach() to isolate tests.
 *
 * @param {object} documentMock - object with `documentElement.dataset` and
 *                                getElementById() returning a #theme-toggle-like element
 * @param {object} storageMock  - object with savePref(key, value) and
 *                                loadPref(key) matching Storage's API
 */
export function resetTheme(documentMock, storageMock) {
  _document = documentMock;
  _storage = storageMock;
}

// ---------------------------------------------------------------------------
// Theme constants and methods (duplicate of app.js implementation)
// ---------------------------------------------------------------------------

export const Theme = {
  LIGHT: 'light',
  DARK: 'dark',

  /**
   * Reads the stored theme preference via injected storage.
   * Falls back to 'light' if the key is absent or the value is invalid (Req 14.3).
   * @returns {'light'|'dark'}
   */
  load() {
    const stored = _storage.loadPref('expense_theme');
    return (stored === Theme.DARK || stored === Theme.LIGHT) ? stored : Theme.LIGHT;
  },

  /**
   * Applies the given theme to the injected document:
   *   - Sets data-theme on documentElement
   *   - Updates #theme-toggle text and aria-checked synchronously (Req 11.1, 11.7)
   * @param {'light'|'dark'} theme
   */
  apply(theme) {
    _document.documentElement.dataset.theme = theme;
    const btn = _document.getElementById('theme-toggle');
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
   * Flips the current theme, persists it via injected storage, and applies it
   * (Req 11.2, 11.3).
   */
  toggle() {
    const current = _document.documentElement.dataset.theme;
    const newTheme = (current === Theme.DARK) ? Theme.LIGHT : Theme.DARK;
    _storage.savePref('expense_theme', newTheme);
    Theme.apply(newTheme);
  },
};
