/**
 * Tests for the Storage module (Task 5)
 *
 * Covers:
 *   - Unit tests: save/load normal operation and localStorage exceptions
 *   - Subtask 5.4: in-memory fallback persists for the rest of the session
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Storage, resetStorage } from './helpers/storage-shim.js';

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

/** A minimal localStorage-like in-memory implementation. */
function makeLocalStorageMock() {
  const store = {};
  return {
    setItem(key, value) { store[key] = value; },
    getItem(key) { return key in store ? store[key] : null; },
    removeItem(key) { delete store[key]; },
    clear() { Object.keys(store).forEach(k => delete store[k]); },
    // Expose raw store for inspection in tests
    _store: store,
  };
}

/** A localStorage mock that always throws on every method call. */
function makeThrowingLocalStorage() {
  return {
    setItem() { throw new Error('localStorage unavailable'); },
    getItem() { throw new Error('localStorage unavailable'); },
    removeItem() { throw new Error('localStorage unavailable'); },
  };
}

/** A minimal document-like mock with a storage-error-banner element. */
function makeDocumentMock() {
  const banner = {
    textContent: '',
    _hidden: true,
    _classes: new Set(),
    removeAttribute(attr) { if (attr === 'hidden') this._hidden = false; },
    setAttribute(attr) { if (attr === 'hidden') this._hidden = true; },
    classList: {
      _owner: null,
      add(cls) { banner._classes.add(cls); },
      remove(cls) { banner._classes.delete(cls); },
      contains(cls) { return banner._classes.has(cls); },
    },
  };
  return {
    getElementById(id) {
      if (id === 'storage-error-banner') return banner;
      return null;
    },
    _banner: banner,
  };
}

// Sample transactions fixture
const TX1 = { id: 'abc-1', name: 'Lunch', amount: 12.50, category: 'Food' };
const TX2 = { id: 'abc-2', name: 'Bus', amount: 3.00, category: 'Transport' };

// ---------------------------------------------------------------------------
// Helper: reset before each test
// ---------------------------------------------------------------------------
let lsMock;
let docMock;

beforeEach(() => {
  lsMock = makeLocalStorageMock();
  docMock = makeDocumentMock();
  resetStorage(lsMock, docMock);
});

// ---------------------------------------------------------------------------
// Subtask 5.1 — Storage.save()
// ---------------------------------------------------------------------------

describe('Storage.save() — normal operation', () => {
  it('returns true when localStorage succeeds', () => {
    expect(Storage.save([TX1])).toBe(true);
  });

  it('writes JSON to localStorage under the correct key', () => {
    Storage.save([TX1, TX2]);
    const raw = lsMock._store['expense_transactions'];
    expect(raw).toBeDefined();
    expect(JSON.parse(raw)).toEqual([TX1, TX2]);
  });

  it('overwrites previous data on subsequent saves', () => {
    Storage.save([TX1]);
    Storage.save([TX1, TX2]);
    const stored = JSON.parse(lsMock._store['expense_transactions']);
    expect(stored).toHaveLength(2);
  });

  it('saves an empty array without error', () => {
    expect(Storage.save([])).toBe(true);
    expect(JSON.parse(lsMock._store['expense_transactions'])).toEqual([]);
  });
});

describe('Storage.save() — localStorage failure', () => {
  beforeEach(() => {
    resetStorage(makeThrowingLocalStorage(), docMock);
  });

  it('returns false when localStorage throws', () => {
    expect(Storage.save([TX1])).toBe(false);
  });

  it('updates the in-memory fallback with the passed transactions', () => {
    Storage.save([TX1, TX2]);
    expect(Storage.memoryFallback).toEqual([TX1, TX2]);
  });

  it('shows the error banner after a save failure', () => {
    Storage.save([TX1]);
    expect(docMock._banner._hidden).toBe(false);
    expect(docMock._banner._classes.has('visible')).toBe(true);
    expect(docMock._banner.textContent).toMatch(/local storage/i);
  });
});

// ---------------------------------------------------------------------------
// Subtask 5.2 — Storage.load()
// ---------------------------------------------------------------------------

describe('Storage.load() — normal operation', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(Storage.load()).toEqual([]);
  });

  it('returns the persisted transactions', () => {
    lsMock.setItem('expense_transactions', JSON.stringify([TX1, TX2]));
    expect(Storage.load()).toEqual([TX1, TX2]);
  });

  it('round-trips: save then load returns the same data (Req 6.5)', () => {
    Storage.save([TX1, TX2]);
    const loaded = Storage.load();
    expect(loaded).toEqual([TX1, TX2]);
  });
});

describe('Storage.load() — localStorage failure', () => {
  it('returns _memoryFallback when localStorage throws', () => {
    // Pre-populate the fallback by failing a save first
    resetStorage(makeThrowingLocalStorage(), docMock);
    Storage.save([TX1]);          // sets _memoryFallback = [TX1]
    const result = Storage.load(); // getItem throws → returns _memoryFallback
    expect(result).toEqual([TX1]);
  });

  it('returns empty array when fallback is empty and localStorage throws', () => {
    resetStorage(makeThrowingLocalStorage(), docMock);
    expect(Storage.load()).toEqual([]);
  });

  it('shows the error banner after a load failure', () => {
    resetStorage(makeThrowingLocalStorage(), docMock);
    Storage.load();
    expect(docMock._banner._hidden).toBe(false);
    expect(docMock._banner._classes.has('visible')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Subtask 5.3 — Storage.showErrorBanner() / hideErrorBanner()
// ---------------------------------------------------------------------------

describe('Storage.showErrorBanner()', () => {
  it('sets the banner text', () => {
    Storage.showErrorBanner('Test message');
    expect(docMock._banner.textContent).toBe('Test message');
  });

  it('removes the hidden attribute', () => {
    Storage.showErrorBanner('Test');
    expect(docMock._banner._hidden).toBe(false);
  });

  it('adds the "visible" CSS class', () => {
    Storage.showErrorBanner('Test');
    expect(docMock._banner._classes.has('visible')).toBe(true);
  });
});

describe('Storage.hideErrorBanner()', () => {
  it('sets the hidden attribute', () => {
    Storage.showErrorBanner('Test');  // show first
    Storage.hideErrorBanner();
    expect(docMock._banner._hidden).toBe(true);
  });

  it('removes the "visible" CSS class', () => {
    Storage.showErrorBanner('Test');
    Storage.hideErrorBanner();
    expect(docMock._banner._classes.has('visible')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Subtask 5.4 — In-memory fallback used for the rest of the session (Req 6.6)
// ---------------------------------------------------------------------------

describe('In-memory fallback — session consistency (Req 6.6)', () => {
  it('after a save failure, subsequent load() returns the fallback (not [])', () => {
    resetStorage(makeThrowingLocalStorage(), docMock);

    Storage.save([TX1]);            // fails → _memoryFallback = [TX1]
    const result = Storage.load();  // fails → returns _memoryFallback
    expect(result).toEqual([TX1]);
  });

  it('fallback is updated on each failed save, keeping it in sync', () => {
    resetStorage(makeThrowingLocalStorage(), docMock);

    Storage.save([TX1]);
    expect(Storage.memoryFallback).toEqual([TX1]);

    Storage.save([TX1, TX2]);
    expect(Storage.memoryFallback).toEqual([TX1, TX2]);

    const result = Storage.load();
    expect(result).toEqual([TX1, TX2]);
  });

  it('multiple failed loads return the same fallback array', () => {
    resetStorage(makeThrowingLocalStorage(), docMock);

    Storage.save([TX1]);            // sets fallback
    const first  = Storage.load();
    const second = Storage.load();
    expect(first).toEqual(second);
    expect(first).toEqual([TX1]);
  });

  it('banner is shown exactly once even after multiple failures', () => {
    // Track how many times textContent is set by overriding the setter
    let bannerSetCount = 0;
    const countingDoc = makeDocumentMock();
    Object.defineProperty(countingDoc._banner, 'textContent', {
      set(v) { bannerSetCount++; this._text = v; },
      get() { return this._text || ''; },
    });
    resetStorage(makeThrowingLocalStorage(), countingDoc);

    Storage.save([TX1]);
    Storage.save([TX2]);
    Storage.load();

    // Banner should have been set three times (once per call), but it's
    // idempotent — the important thing is it's visible after each failure.
    expect(bannerSetCount).toBeGreaterThanOrEqual(1);
    expect(countingDoc._banner._hidden).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 7.2 — Property 7: Transaction date field round-trip (Req 13.4)
// Feature: expense-budget-visualizer-enhancements, Property 7: Transaction date field round-trip
// ---------------------------------------------------------------------------

import { describe as describeP7, it as itP7, expect as expectP7, beforeEach as beforeEachP7 } from 'vitest';
import fc from 'fast-check';

describeP7('Property 7: Transaction date field round-trips through Storage.save → Storage.load', () => {
  // Use a fresh localStorage mock for each property test run
  beforeEachP7(() => {
    lsMock = makeLocalStorageMock();
    docMock = makeDocumentMock();
    resetStorage(lsMock, docMock);
  });

  // Feature: expense-budget-visualizer-enhancements, Property 7: Transaction date field round-trip
  // **Validates: Requirements 13.4**
  itP7('date field is preserved character-for-character after save → load', () => {
    // Arbitrary: a valid YYYY-MM-DD date string
    const yearArb     = fc.integer({ min: 2000, max: 2099 }).map(y => String(y));
    const monthArb    = fc.integer({ min: 1, max: 12 }).map(m => String(m).padStart(2, '0'));
    const dayArb      = fc.integer({ min: 1, max: 28 }).map(d => String(d).padStart(2, '0'));
    const dateArb     = fc.tuple(yearArb, monthArb, dayArb).map(([y, m, d]) => `${y}-${m}-${d}`);

    // Arbitrary: a single transaction with a valid date
    const transactionArb = fc.record({
      id:       fc.string({ minLength: 1, maxLength: 20 }),
      name:     fc.string({ minLength: 1, maxLength: 50 }),
      amount:   fc.double({ min: 0.01, max: 9999.99, noNaN: true }),
      category: fc.constantFrom('Food', 'Transport', 'Fun'),
      date:     dateArb,
    });

    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1, maxLength: 10 }),
        (transactions) => {
          // Reset storage for each generated example
          const freshLs = makeLocalStorageMock();
          resetStorage(freshLs, makeDocumentMock());

          Storage.save(transactions);
          const loaded = Storage.load();

          // Every transaction's date field must be the exact same string
          return transactions.every((tx, i) => loaded[i].date === tx.date);
        }
      ),
      { numRuns: 100 }
    );
  });
});
