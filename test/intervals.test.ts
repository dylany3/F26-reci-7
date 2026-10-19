import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Start plus a non-negative length, so start <= end.
const interval: fc.Arbitrary<Interval> = fc
  .tuple(fc.integer({ min: -20, max: 20 }), fc.nat({ max: 6 }))
  .map(([start, len]) => [start, start + len] as Interval);
const intervalList = fc.array(interval, { maxLength: 8 });

// Targeted generator: intervals with a gap of at least 1 between each.
const disjointSorted: fc.Arbitrary<Interval[]> = fc
  .tuple(
    fc.integer({ min: -20, max: 20 }),
    fc.array(fc.tuple(fc.integer({ min: 1, max: 3 }), fc.nat({ max: 4 })), { maxLength: 6 }),
  )
  .map(([first, parts]) => {
    const result: Interval[] = [];
    let pos = first;
    for (const [gap, len] of parts) {
      result.push([pos, pos + len]);
      pos = pos + len + gap;
    }
    return result;
  });
const covers = (list: Interval[], p: number) => list.some(([s, e]) => s <= p && p <= e);

describe('mergeIntervals', () => {
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const uncovered = xs.filter(([s, e]) => !out.some(([a, b]) => a <= s && e <= b));
        expect(uncovered).toEqual([]);
      }),
    );
  });

  // Pattern: invariant. The output is sorted, and consecutive intervals neither overlap nor touch.
  it('output is sorted with a gap between consecutive intervals', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        for (let i = 0; i + 1 < out.length; i++) {
          expect(out[i][1]).toBeLessThan(out[i + 1][0]);
        }
      }),
    );
  });

  // Pattern: invariant. The input array and its intervals are not modified.
  it('does not modify the input', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const copy = structuredClone(xs);
        mergeIntervals(xs);
        expect(xs).toEqual(copy);
      }),
    );
  });

  // Pattern: differential. Input and output cover exactly the same points, including halfway points like 2.5.
  it('covers exactly the same points as the input', () => {
    fc.assert(
      fc.property(intervalList, fc.integer({ min: -50, max: 70 }), (xs, k) => {
        const p = k / 2;
        expect(covers(mergeIntervals(xs), p)).toBe(covers(xs, p));
      }),
    );
  });

  // Pattern: algebraic. Merging an already merged list changes nothing.
  it('merging twice is the same as merging once', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const once = mergeIntervals(xs);
        expect(mergeIntervals(once)).toEqual(once);
      }),
    );
  });

  // Pattern: metamorphic. Shuffling the input does not change the output.
  it('input order does not matter', () => {
    fc.assert(
      fc.property(
        intervalList.chain(xs =>
          fc
            .shuffledSubarray(xs, { minLength: xs.length, maxLength: xs.length })
            .map(shuffled => [xs, shuffled] as const),
        ),
        ([xs, shuffled]) => {
          expect(mergeIntervals(shuffled)).toEqual(mergeIntervals(xs));
        },
      ),
    );
  });

  // Pattern: conditional. If the input is already disjoint (no overlaps or touching), the output is the input sorted.
  it('already-disjoint input comes back sorted and unchanged', () => {
    fc.assert(
      fc.property(
        disjointSorted.chain(sorted =>
          fc
            .shuffledSubarray(sorted, { minLength: sorted.length, maxLength: sorted.length })
            .map(shuffled => [sorted, shuffled] as const),
        ),
        ([sorted, shuffled]) => {
          expect(mergeIntervals(shuffled)).toEqual(sorted);
        },
      ),
    );
  });
});