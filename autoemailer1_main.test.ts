import { test, expect, describe, afterEach } from 'bun:test';
import {
  generator,
  shuffle,
  difficultyRanges,
  formatLegend,
  planEmails,
  parseRecipients,
} from './autoemailer1_main.ts';

// Count how many times each problem number appears across all recipients.
function countAssignments(np: number[][]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const recipient of np) {
    for (const problem of recipient) {
      counts.set(problem, (counts.get(problem) ?? 0) + 1);
    }
  }
  return counts;
}

describe('difficultyRanges', () => {
  test('numbers problems basic, then intermediate, then hard', () => {
    expect(difficultyRanges({ basic: 3, intermediate: 4, hard: 2 })).toEqual({
      basic: [1, 3],
      intermediate: [4, 7],
      hard: [8, 9],
    });
  });

  test('returns null for difficulties with no problems', () => {
    expect(difficultyRanges({ basic: 0, intermediate: 2, hard: 0 })).toEqual({
      basic: null,
      intermediate: [1, 2],
      hard: null,
    });
  });

  test('defaults every count to zero', () => {
    expect(difficultyRanges()).toEqual({ basic: null, intermediate: null, hard: null });
  });
});

describe('formatLegend', () => {
  test('renders each present difficulty, collapsing single-problem ranges', () => {
    const ranges = difficultyRanges({ basic: 3, intermediate: 4, hard: 1 });
    expect(formatLegend(ranges)).toBe('Difficulty — Basic: Q1-Q3, Intermediate: Q4-Q7, Hard: Q8');
  });

  test('omits difficulties with no problems', () => {
    const ranges = difficultyRanges({ basic: 0, intermediate: 2, hard: 0 });
    expect(formatLegend(ranges)).toBe('Difficulty — Intermediate: Q1-Q2');
  });

  test('reports none when there are no problems', () => {
    expect(formatLegend(difficultyRanges())).toBe('Difficulty — (none)');
  });
});

describe('generator', () => {
  test('returns one assignment bucket per recipient', () => {
    expect(generator({ basic: 9 }, 5, 3).assignments).toHaveLength(5);
    expect(generator({ basic: 9 }, 7, 3).assignments).toHaveLength(7);
  });

  test('defaults to 3 basic, 4 intermediate, 2 hard across 5 recipients', () => {
    const { assignments, difficulty } = generator();
    expect(assignments).toHaveLength(5);
    expect(countAssignments(assignments).size).toBe(9);
    expect(difficulty).toEqual({
      1: 'basic',
      2: 'basic',
      3: 'basic',
      4: 'intermediate',
      5: 'intermediate',
      6: 'intermediate',
      7: 'intermediate',
      8: 'hard',
      9: 'hard',
    });
  });

  test('accepts a plain number as that many basic problems', () => {
    const { assignments, difficulty } = generator(4, 4, 1);
    expect(assignments.flat().sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    expect(difficulty).toEqual({ 1: 'basic', 2: 'basic', 3: 'basic', 4: 'basic' });
  });

  test('assigns every problem to exactly s recipients', () => {
    const s = 3;
    const counts = countAssignments(generator({ basic: 5, intermediate: 4 }, 5, s).assignments);
    for (let q = 1; q <= 9; q++) {
      expect(counts.get(q)).toBe(s);
    }
  });

  test('spreads consecutive problems to consecutive recipients, wrapping', () => {
    // s=1: problem q (1-indexed) lands on recipient (q-1) % N.
    const { assignments } = generator({ basic: 6 }, 4, 1);
    expect(assignments[0]).toEqual([1, 5]);
    expect(assignments[1]).toEqual([2, 6]);
    expect(assignments[2]).toEqual([3]);
    expect(assignments[3]).toEqual([4]);
  });

  test('produces no assignments when there are no problems', () => {
    const { assignments, difficulty } = generator({}, 5, 3);
    expect(assignments).toEqual([[], [], [], [], []]);
    expect(difficulty).toEqual({});
  });
});

describe('parseRecipients', () => {
  test('splits, trims, and sorts addresses', () => {
    expect(parseRecipients('c@x.edu, a@x.edu ,b@x.edu')).toEqual(['a@x.edu', 'b@x.edu', 'c@x.edu']);
  });

  test('drops empty entries from stray or trailing commas', () => {
    expect(parseRecipients('a@x.edu,,b@x.edu,')).toEqual(['a@x.edu', 'b@x.edu']);
  });

  test('de-duplicates repeated addresses', () => {
    expect(parseRecipients('a@x.edu,b@x.edu,a@x.edu')).toEqual(['a@x.edu', 'b@x.edu']);
  });

  test('returns an empty list for blank input', () => {
    expect(parseRecipients('   ,  , ')).toEqual([]);
  });
});

describe('planEmails', () => {
  const addresses = ['a@x.edu', 'b@x.edu', 'c@x.edu'];

  test('builds one email per recipient with subject, address, and body', () => {
    const emails = planEmails({ basic: 3 }, addresses, 1);
    expect(emails).toHaveLength(3);
    for (let i = 0; i < addresses.length; i++) {
      expect(emails[i].address).toBe(addresses[i]);
      expect(emails[i].subject).toBe('Question Assignments Calculation');
      expect(emails[i].body).toContain(`Believed Address: ${addresses[i]}`);
    }
  });

  test('lists the assigned problem numbers and a difficulty legend in the body', () => {
    // s=1: recipient 0 gets Q1, recipient 1 gets Q2, recipient 2 gets Q3.
    const emails = planEmails({ basic: 1, intermediate: 1, hard: 1 }, addresses, 1);
    expect(emails[0].problems).toEqual([1]);
    expect(emails[0].body).toContain('Computed Assignments: Q1');
    expect(emails[0].body).toContain('Difficulty — Basic: Q1, Intermediate: Q2, Hard: Q3');
  });

  test('accepts a plain number as that many basic problems', () => {
    const emails = planEmails(3, addresses, 1);
    expect(emails[1].problems).toEqual([2]);
    expect(emails[1].body).toContain('Difficulty — Basic: Q1-Q3');
  });
});

describe('shuffle', () => {
  const realRandom = Math.random;
  afterEach(() => {
    Math.random = realRandom;
  });

  test('shuffles in place and returns the same array reference', () => {
    const d = [1, 2, 3, 4, 5];
    expect(shuffle(d)).toBe(d);
  });

  test('preserves all elements (is a permutation)', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = shuffle([...original]);
    expect([...result].sort((a, b) => a - b)).toEqual(original);
  });

  test('is deterministic given a fixed RNG', () => {
    Math.random = () => 0; // always pick index 0
    // With random() === 0, Fisher-Yates rotates the last element to the front
    // at each step, leaving the head element last.
    expect(shuffle([1, 2, 3, 4])).toEqual([2, 3, 4, 1]);
  });

  test('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([42])).toEqual([42]);
  });
});
