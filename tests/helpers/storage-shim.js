/**
 * Storage shim — re-exports the Storage module logic so test files can import
 * it as an ES module, while app.js itself is a plain browser script.
 *
 * The shim accepts an injected `localStorage`-like object so tests can
 * simulate both normal operation and failure conditions (Req 6.6).
 * The `document` dependency (for the banner) is injected via `setDocument`.
 */

// Module-level fallback state (mirrors app.js)
let _memoryFallback = [];
let _storageUnavailable = false;

// Injected dependencies — replaced per-test
let _localStorage = null;
let _document = null;

/**
 * Resets the fallback state and injects fresh test doubles.
 * Call this in beforeEach() to isolate tests.
 */
export function resetStorage(localStorageMock, documentMock) {
  _memoryFallback = [];
  _storageUnavailable = false;
  _localStorage = localStorageMock;
  _document = documentMock;
}

export const Storage = {
  save(transactions) {
    try {
      _localStorage.setItem('expense_transactions', JSON.stringify(transactions));
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

  load() {
    try {
      const raw = _localStorage.getItem('expense_transactions');
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

  showErrorBanner(message) {
    if (!_document) return;
    const banner = _document.getElementById('storage-error-banner');
    if (!banner) return;
    banner.textContent = message;
    banner.removeAttribute('hidden');
    banner.classList.add('visible');
  },

  hideErrorBanner() {
    if (!_document) return;
    const banner = _document.getElementById('storage-error-banner');
    if (!banner) return;
    banner.setAttribute('hidden', '');
    banner.classList.remove('visible');
  },

  // Expose internal state for test assertions
  get isUnavailable() { return _storageUnavailable; },
  get memoryFallback() { return _memoryFallback; },
};
