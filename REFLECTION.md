# Reflection

**Name / Andrew ID:** Dylan Yang / dylany

**Recitation group members (Task 2):** Team Patient Zero

---

### 1. Valid but weak

`returns exactly five colors` (invariant) kills no public mutants, since
every mutant still returns five colors. It is valid because the spec promises
one color per position of `guess`, so it holds for every correct
implementation. It would catch an off-by-one bug, such as a loop running
`i < 4` that returns only four colors.

### 2. A generator problem, not a property problem

`singlePass` was flaky against "never credits a letter more times than the
secret contains it". The property was fine, but with 26 letters, two random
words rarely share repeated letters, the only case that triggers the bug. I
added a small-alphabet generator (`A`, `B`, `C`) and used
`fc.oneof(word, smallWord)`, so repeats are common while the full alphabet
still produces letters missing from the secret.

Before:

```
  ~ singlePass     flaky: killed in 2/5 runs  by: never credits a letter more times than the secret contains it
      Counterexample: ["AAAAW","AAWAW"]
      AssertionError: expected 2 to be less than or equal to 1
```

After:

```
  ✔ singlePass     killed  by: never credits a letter more times than the secret contains it; swapping secret and guess keeps the color counts
      Counterexample: ["AAABA","AABBA"]
      AssertionError: expected 2 to be less than or equal to 1
```

### 3. Reading a counterexample

```
  ✔ mergesIntegerNeighbors  killed  by: already-disjoint input comes back sorted and unchanged; covers exactly the same points as the input
      Counterexample: [[[[0,0],[1,1]],[[0,0],[1,1]]]]
      AssertionError: expected [ [ +0, 1 ] ] to deeply equal [ [ +0, +0 ], [ 1, 1 ] ]
```

The spec says the output must cover exactly the same points as the input,
where points are all real numbers. `[0, 0]` and `[1, 1]` leave a gap
(e.g. 0.5), so they must stay separate. The mutant merged them into `[0, 1]`,
which wrongly covers 0.5.

### 4. Your project

I'd test the label service I added in our PR #22
(`packages/core/src/label.ts`), which lets users organize sessions into
nested labels.

Property 1 (algebraic): if I run `normalizeName` on a name that's already
normalized, I should get the same name back.

Property 2 (invariant): no matter what order labels get created, moved, or
deleted in, the labels should never end up in a cycle, and two labels under
the same parent should never have the same name (ignoring case).

For the first property, just using `fc.string()` wouldn't be enough because
it almost never gives you the tricky cases, like a name that's only spaces,
or one that's exactly 64 or 65 characters (the length limit). I'd add those
in on purpose. For the second, I'd generate a list of operations where the
parent IDs come from labels that were already created. If I just made up
random IDs, almost every operation would fail with `NotFoundError` and the
tree would never get more than one level deep. I'd also want it to try moving
a label under one of its own children pretty often, since that's the case the
cycle check is supposed to catch, and to reuse names with different
capitalization like "Bugs" and "bugs".