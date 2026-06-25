/**
 * Tests for the Validator module (Tasks 4.1 – 4.4)
 *
 * Covers:
 *   - Unit tests: specific valid/invalid combinations
 *   - Property-based tests (fast-check): Property 1 from design.md
 *
 * Feature: expense-budget-visualizer, Property 1:
 *   validate() returns valid:true iff name is non-empty after trim,
 *   amount is a finite number > 0 with at most 2 decimal places,
 *   and category is one of "Food", "Transport", "Fun".
 *
 * Validates: Requirements 1.3, 1.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Import the function under test
// app.js uses no ES-module syntax, so we read and eval it in a Node context.
// We expose validate() by importing it via a thin re-export shim.
// ---------------------------------------------------------------------------
import { validate } from './helpers/validate-shim.js';

// ---------------------------------------------------------------------------
// Unit tests — specific examples
// ---------------------------------------------------------------------------

describe('validate() — unit tests', () => {
  // ---- valid combinations ----
  it('accepts a typical valid submission', () => {
    const result = validate('Lunch', '12.50', 'Food');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('accepts an integer amount', () => {
    expect(validate('Bus', '5', 'Transport').valid).toBe(true);
  });

  it('accepts amount with one decimal place', () => {
    expect(validate('Movie', '9.5', 'Fun').valid).toBe(true);
  });

  it('accepts all three valid categories', () => {
    expect(validate('x', '1', 'Food').valid).toBe(true);
    expect(validate('x', '1', 'Transport').valid).toBe(true);
    expect(validate('x', '1', 'Fun').valid).toBe(true);
  });

  it('accepts name with leading/trailing whitespace (trimmed)', () => {
    expect(validate('  Lunch  ', '5', 'Food').valid).toBe(true);
  });

  // ---- invalid name ----
  it('rejects empty name', () => {
    const result = validate('', '10', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeTruthy();
  });

  it('rejects whitespace-only name', () => {
    const result = validate('   ', '10', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeTruthy();
  });

  // ---- invalid amount ----
  it('rejects zero amount', () => {
    const result = validate('Lunch', '0', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeTruthy();
  });

  it('rejects negative amount', () => {
    const result = validate('Lunch', '-5', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeTruthy();
  });

  it('rejects amount with three decimal places', () => {
    const result = validate('Lunch', '1.999', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeTruthy();
  });

  it('rejects non-numeric amount string', () => {
    const result = validate('Lunch', 'abc', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeTruthy();
  });

  it('rejects empty amount', () => {
    const result = validate('Lunch', '', 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors.amount).toBeTruthy();
  });

  // ---- invalid category ----
  it('rejects unknown category', () => {
    const result = validate('Lunch', '10', 'Shopping');
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeTruthy();
  });

  it('rejects empty category', () => {
    const result = validate('Lunch', '10', '');
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeTruthy();
  });

  it('rejects category with wrong capitalisation', () => {
    const result = validate('Lunch', '10', 'food');
    expect(result.valid).toBe(false);
    expect(result.errors.category).toBeTruthy();
  });

  // ---- multiple errors at once ----
  it('reports errors for all three invalid fields simultaneously', () => {
    const result = validate('', '0', '');
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.amount).toBeTruthy();
    expect(result.errors.category).toBeTruthy();
  });

  // ---- no spurious error keys on valid submission ----
  it('returns no error keys for a valid submission', () => {
    const result = validate('Coffee', '3.00', 'Fun');
    expect(Object.keys(result.errors)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests — Property 1 (design.md)
// Feature: expense-budget-visualizer, Property 1: validate() accepts valid
// inputs and rejects invalid inputs
// Validates: Requirements 1.3, 1.4
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

/** Generates a valid amount string: integer or up to 2 d.p., value > 0 */
const validAmountArb = fc
  .tuple(fc.nat({ max: 9999 }), fc.nat({ max: 99 }), fc.boolean())
  .map(([whole, cents, useDecimal]) => {
    if (!useDecimal || cents === 0) {
      // pure integer, must be at least 1
      return String(whole + 1);
    }
    const c = String(cents).padStart(2, '0');
    return `${whole + 1}.${c}`;
  });

/** Generates a non-empty, non-whitespace-only name */
const validNameArb = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);

describe('validate() — property-based tests (Property 1)', () => {
  // ---- valid inputs always produce valid: true ----
  it('Property 1a: always returns valid:true for any valid (name, amount, category)', () => {
    fc.assert(
      fc.property(
        validNameArb,
        validAmountArb,
        fc.constantFrom(...VALID_CATEGORIES),
        (name, amount, category) => {
          const result = validate(name, amount, category);
          return result.valid === true && Object.keys(result.errors).length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  // ---- invalid name always produces valid: false with name error ----
  it('Property 1b: always returns valid:false with errors.name when name is empty/whitespace', () => {
    const blankNameArb = fc.oneof(
      fc.constant(''),
      fc.stringMatching(/^\s+$/)
    );
    fc.assert(
      fc.property(
        blankNameArb,
        validAmountArb,
        fc.constantFrom(...VALID_CATEGORIES),
        (name, amount, category) => {
          const result = validate(name, amount, category);
          return result.valid === false && !!result.errors.name;
        }
      ),
      { numRuns: 100 }
    );
  });

  // ---- invalid amount always produces valid: false with amount error ----
  it('Property 1c: always returns valid:false with errors.amount for non-positive or malformed amounts', () => {
    const invalidAmountArb = fc.oneof(
      fc.constant('0'),
      fc.constant(''),
      fc.constant('-1'),
      fc.constant('1.999'),
      fc.constant('abc'),
      // three or more decimal places — pad to guarantee ≥3 decimal digits
      fc
        .tuple(fc.nat({ max: 999 }), fc.nat({ min: 1, max: 9999 }))
        .map(([w, d]) => `${w}.${String(d).padStart(3, '0')}`)
    );
    fc.assert(
      fc.property(
        validNameArb,
        invalidAmountArb,
        fc.constantFrom(...VALID_CATEGORIES),
        (name, amount, category) => {
          const result = validate(name, amount, category);
          return result.valid === false && !!result.errors.amount;
        }
      ),
      { numRuns: 100 }
    );
  });

  // ---- invalid category always produces valid: false with category error ----
  it('Property 1d: always returns valid:false with errors.category for non-allowed category values', () => {
    const invalidCategoryArb = fc
      .string()
      .filter(s => !VALID_CATEGORIES.includes(s));
    fc.assert(
      fc.property(
        validNameArb,
        validAmountArb,
        invalidCategoryArb,
        (name, amount, category) => {
          const result = validate(name, amount, category);
          return result.valid === false && !!result.errors.category;
        }
      ),
      { numRuns: 100 }
    );
  });
});
