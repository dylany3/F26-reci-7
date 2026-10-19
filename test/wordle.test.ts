import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { matchGuess } from '../src/wordle';

// Recitation Part 1: follow along with your TA, filling in the todos below.
// Problem set Task 1: keep adding properties until `npm run mutants:wordle`
// kills every mutant. Read the spec in src/wordle/matchGuess.ts.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The result always has exactly five colors.
// (invariant, algebraic, metamorphic, differential, or conditional)

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Step 1: a generator for five-letter uppercase words.
const letter = fc.constantFrom(...ALPHABET);
const word = fc.string({ unit: letter, minLength: 5, maxLength: 5 });
const smallWord = fc.string({ unit: fc.constantFrom('A', 'B', 'C'), minLength: 5, maxLength: 5 });

// Targeted generator: a secret plus a shuffled copy of it as the guess.
const secretAndAnagram = word.chain(secret =>
  fc
    .shuffledSubarray([...secret], { minLength: 5, maxLength: 5 })
    .map(letters => [secret, letters.join('')] as const),
);

const count = (w: string, L: string) => [...w].filter(c => c === L).length;

describe('matchGuess', () => {
  // it.todo('returns exactly five colors');
  // Pattern: invariant. The result always has exactly five colors.
  it('returns exactly five colors', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        expect(matchGuess(secret, guess).length).toBe(5);
      }),
    );
  });

  // it.todo('only uses the colors G, Y, B');
  // Pattern: invariant. Every color in the result is G, Y, or B.
  it('only uses the colors G, Y, B', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        expect(matchGuess(secret, guess).join('')).toMatch(/^[GYB]*$/);
      }),
    );
  });

  // it.todo('guessing the secret gives all greens');
  // Pattern: conditional. If the guess equals the secret, every color is green.
  it('guessing the secret gives all greens', () => {
    fc.assert(
      fc.property(word, secret => {
        expect(matchGuess(secret, secret).join('')).toBe('GGGGG');
      }),
    );
  });

  // it.todo('never credits a letter more times than the secret contains it');
  // Pattern: invariant. Each letter gets at most as many G/Y marks as the secret has copies of it.
  it('never credits a letter more times than the secret contains it', () => {
    fc.assert(
      fc.property(fc.oneof(word, smallWord), fc.oneof(word, smallWord), (secret, guess) => {
        const colors = matchGuess(secret, guess);
        const credited = [...guess].filter((_, i) => colors[i] !== 'B').join('');
        for (const L of guess) {
          expect(count(credited, L)).toBeLessThanOrEqual(count(secret, L));
        }
      }),
    );
  });

  // Pattern: invariant. A position is green exactly when the guess and secret have the same letter there.
  it('greens are exactly the matching positions', () => {
    fc.assert(
      fc.property(fc.oneof(word, smallWord), fc.oneof(word, smallWord), (secret, guess) => {
        const colors = matchGuess(secret, guess);
        for (let i = 0; i < 5; i++) {
          expect(colors[i] === 'G').toBe(secret[i] === guess[i]);
        }
      }),
    );
  });

  // Pattern: conditional. If the guess is a rearrangement of the secret, no letter is black.
  it('a rearrangement of the secret has no blacks', () => {
    fc.assert(
      fc.property(secretAndAnagram, ([secret, guess]) => {
        expect(matchGuess(secret, guess)).not.toContain('B');
      }),
    );
  });

  // Pattern: metamorphic. Swapping secret and guess keeps the same number of greens and the same number of blacks.
  it('swapping secret and guess keeps the color counts', () => {
    fc.assert(
      fc.property(fc.oneof(word, smallWord), fc.oneof(word, smallWord), (secret, guess) => {
        const a = matchGuess(secret, guess).join('');
        const b = matchGuess(guess, secret).join('');
        expect(count(a, 'G')).toBe(count(b, 'G'));
        expect(count(a, 'B')).toBe(count(b, 'B'));
      }),
    );
  });
});