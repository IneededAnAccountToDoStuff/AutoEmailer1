'use strict';

const { test, expect, describe, afterEach } = require('bun:test');
const { generator, shuffle } = require('./autoemailer1_main.js');

// Count how many times each problem number appears across all recipients.
function countAssignments(np) {
  const counts = new Map();
  for (const recipient of np) {
    for (const problem of recipient) {
      counts.set(problem, (counts.get(problem) ?? 0) + 1);
    }
  }
  return counts;
}

describe('generator', () => {
  test('returns one bucket per recipient', () => {
    expect(generator(9, 5, 3)).toHaveLength(5);
    expect(generator(9, 7, 3)).toHaveLength(7);
  });

  test('defaults to Q=9, N=5, s=3', () => {
    const np = generator();
    expect(np).toHaveLength(5);
    const counts = countAssignments(np);
    expect(counts.size).toBe(9);
  });

  test('assigns every problem to exactly s recipients', () => {
    const Q = 9;
    const s = 3;
    const counts = countAssignments(generator(Q, 5, s));
    for (let q = 1; q <= Q; q++) {
      expect(counts.get(q)).toBe(s);
    }
  });

  test('uses 1-indexed problem numbers', () => {
    const np = generator(4, 4, 1);
    const all = np.flat().sort((a, b) => a - b);
    expect(all).toEqual([1, 2, 3, 4]);
  });

  test('spreads consecutive problems to consecutive recipients, wrapping', () => {
    // s=1: problem q (1-indexed) lands on recipient (q-1) % N.
    const np = generator(6, 4, 1);
    expect(np[0]).toEqual([1, 5]);
    expect(np[1]).toEqual([2, 6]);
    expect(np[2]).toEqual([3]);
    expect(np[3]).toEqual([4]);
  });

  test('produces no assignments when there are no problems', () => {
    const np = generator(0, 5, 3);
    expect(np).toEqual([[], [], [], [], []]);
  });
});

describe('shuffle', () => {
  afterEach(() => {
    // Restore the real RNG after tests that stub it.
    if (Math.random.mock) {
      Math.random = Math.random.original;
    }
  });

  test('shuffles in place and returns the same array reference', () => {
    const d = [1, 2, 3, 4, 5];
    const result = shuffle(d);
    expect(result).toBe(d);
  });

  test('preserves all elements (is a permutation)', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = shuffle([...original]);
    expect([...result].sort((a, b) => a - b)).toEqual(original);
  });

  test('is deterministic given a fixed RNG', () => {
    const original = Math.random;
    const stub = () => 0; // always pick index 0
    stub.mock = true;
    stub.original = original;
    Math.random = stub;

    // With random() === 0, Fisher-Yates rotates the last element to the front
    // at each step, leaving the head element last.
    expect(shuffle([1, 2, 3, 4])).toEqual([2, 3, 4, 1]);
  });

  test('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([42])).toEqual([42]);
  });
});
