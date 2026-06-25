/**
 * Tests for the Theme module (Task 4.4)
 *
 * Covers:
 *   - Unit tests: Theme.load(), Theme.apply(), Theme.toggle()
 *   - Property-based tests: Property 3 and Property 4 from design.md
 *
 * Feature: expense-budget-visualizer-enhancements
 *
 * Validates: Requirements 11.2, 11.3, 11.7, 14.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { Theme, resetTheme } from './helpers/theme-shim.js';

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

/**
 * A minimal in-memory storage mock exposing savePref / loadPref.
 * savePref stores values as raw strings (matching the Theme module's usage).
 */
function makeStorageMock() {
  const store = {};
  return {
    savePref(key, value) {
      store[key] = value;
      return true;
    },
    loadPref(key) {
      return key in store ? store[key] : undefined;
    },
    // Expose raw store for direct seeding in tests
    _store: store,
  };
}

/**
 * A minimal document mock with:
 *  - documentElement.dataset.theme (readable and settable)
 *  - getElementById('theme-toggle') returning a button-like element
 */
function makeDocumentMock() {
  const dataset = { theme: undefined };
  const btn = {
    textContent: '',
    _attrs: {},
    setAttribute(name, value) { this._attrs[name] = value; },
    getAttribute(name) { return this._attrs[name]; },
  };
  return {
    documentElement: { dataset },
    getElementById(id) {
      if (id === 'theme-toggle') return btn;
      return null;
    },
    _dataset: dataset,
    _btn: btn,
  };
}

// ---------------------------------------------------------------------------
// Per-test state
// ---------------------------------------------------------------------------

let storageMock;
let documentMock;

beforeEach(() => {
  storageMock = makeStorageMock();
  documentMock = makeDocumentMock();
  resetTheme(documentMock, storageMock);
});

// ---------------------------------------------------------------------------
// Unit tests — Theme.load()
// ---------------------------------------------------------------------------

describe('Theme.load() — unit tests', () => {
  it('returns "light" when key is absent from storage', () => {
    // storageMock is empty — loadPref returns undefined
    expect(Theme.load()).toBe('light');
  });

  it('returns "light" when stored value is an invalid string (e.g. "blue")', () => {
    storageMock._store['expense_theme'] = 'blue';
    expect(Theme.load()).toBe('light');
  });

  it('returns "light" when stored value is "light"', () => {
    storageMock._store['expense_theme'] = 'light';
    expect(Theme.load()).toBe('light');
  });

  it('returns "dark" when stored value is "dark"', () => {
    storageMock._store['expense_theme'] = 'dark';
    expect(Theme.load()).toBe('dark');
  });
});

// ---------------------------------------------------------------------------
// Unit tests — Theme.apply()
// ---------------------------------------------------------------------------

describe('Theme.apply("dark") — unit tests', () => {
  it('sets data-theme to "dark" on documentElement', () => {
    Theme.apply('dark');
    expect(documentMock._dataset.theme).toBe('dark');
  });

  it('sets aria-checked to "true" on #theme-toggle', () => {
    Theme.apply('dark');
    expect(documentMock._btn._attrs['aria-checked']).toBe('true');
  });

  it('sets button text to "Switch to Light Mode"', () => {
    Theme.apply('dark');
    expect(documentMock._btn.textContent).toBe('Switch to Light Mode');
  });
});

describe('Theme.apply("light") — unit tests', () => {
  it('sets data-theme to "light" on documentElement', () => {
    Theme.apply('light');
    expect(documentMock._dataset.theme).toBe('light');
  });

  it('sets aria-checked to "false" on #theme-toggle', () => {
    Theme.apply('light');
    expect(documentMock._btn._attrs['aria-checked']).toBe('false');
  });

  it('sets button text to "Switch to Dark Mode"', () => {
    Theme.apply('light');
    expect(documentMock._btn.textContent).toBe('Switch to Dark Mode');
  });
});

// ---------------------------------------------------------------------------
// Unit tests — Theme.toggle()
// ---------------------------------------------------------------------------

describe('Theme.toggle() — unit tests', () => {
  it('from light → flips to dark, persists to storage, and applies dark', () => {
    // Start from light
    documentMock._dataset.theme = 'light';

    Theme.toggle();

    expect(documentMock._dataset.theme).toBe('dark');
    expect(storageMock._store['expense_theme']).toBe('dark');
    expect(documentMock._btn._attrs['aria-checked']).toBe('true');
    expect(documentMock._btn.textContent).toBe('Switch to Light Mode');
  });

  it('from dark → flips to light, persists to storage, and applies light', () => {
    // Start from dark
    documentMock._dataset.theme = 'dark';

    Theme.toggle();

    expect(documentMock._dataset.theme).toBe('light');
    expect(storageMock._store['expense_theme']).toBe('light');
    expect(documentMock._btn._attrs['aria-checked']).toBe('false');
    expect(documentMock._btn.textContent).toBe('Switch to Dark Mode');
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests — Property 3: Theme toggle is an involution
// Feature: expense-budget-visualizer-enhancements, Property 3: Theme toggle is an involution
// Validates: Requirements 11.2, 11.7
// ---------------------------------------------------------------------------

describe('Theme.toggle() — Property 3: involution (property-based)', () => {
  it('calling toggle() twice returns data-theme and aria-checked to original values', () => {
    // Feature: expense-budget-visualizer-enhancements, Property 3: Theme toggle is an involution
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        (startingTheme) => {
          // Fresh doubles per iteration
          const sm = makeStorageMock();
          const dm = makeDocumentMock();
          resetTheme(dm, sm);

          // Establish the starting state
          Theme.apply(startingTheme);
          const originalDataTheme = dm._dataset.theme;
          const originalAriaChecked = dm._btn._attrs['aria-checked'];

          // Two toggles — should be an identity operation
          Theme.toggle();
          Theme.toggle();

          return (
            dm._dataset.theme === originalDataTheme &&
            dm._btn._attrs['aria-checked'] === originalAriaChecked
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests — Property 4: Theme preference round-trip
// Feature: expense-budget-visualizer-enhancements, Property 4: Theme preference round-trip
// Validates: Requirements 11.3, 14.3
// ---------------------------------------------------------------------------

describe('Theme — Property 4: theme preference round-trip (property-based)', () => {
  it('writing via storageMock.savePref then reading via Theme.load() returns the same string', () => {
    // Feature: expense-budget-visualizer-enhancements, Property 4: Theme preference round-trip
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        (theme) => {
          // Fresh doubles per iteration
          const sm = makeStorageMock();
          const dm = makeDocumentMock();
          resetTheme(dm, sm);

          // Write the preference directly via storage mock
          sm.savePref('expense_theme', theme);

          // Read it back through Theme.load() (which delegates to _storage.loadPref)
          const loaded = Theme.load();

          return loaded === theme;
        }
      ),
      { numRuns: 100 }
    );
  });
});
