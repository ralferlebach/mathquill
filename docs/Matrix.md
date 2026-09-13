# Matrix environments

MathQuill supports the six standard LaTeX matrix environments as real,
editable structures:

| Environment | Delimiters |
| ----------- | ---------- |
| `matrix`    | none       |
| `pmatrix`   | `(` `)`    |
| `bmatrix`   | `[` `]`    |
| `Bmatrix`   | `{` `}`    |
| `vmatrix`   | `\|` `\|`  |
| `Vmatrix`   | `‖` `‖`    |

Inside an environment `&` separates columns and `\\` separates rows:

```latex
\begin{bmatrix}a&b\\c&d\end{bmatrix}
```

Rows of unequal length are padded with empty cells to the length of the
longest row. Unknown environments are rejected by the parser rather than
silently accepted.

## Editing

| Key                | Effect                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Left / Right       | move inside the cell, then to the next one                                                                               |
| Up / Down          | move to the cell above or below                                                                                          |
| Tab / Shift-Tab    | move to the next or previous cell                                                                                        |
| Shift-Enter        | insert a row below the current one                                                                                       |
| Shift-Spacebar     | insert a column right of the current one                                                                                 |
| Backspace / Delete | delete content; an empty row or column is removed, and a matrix that has shrunk to a single empty cell is removed itself |

## Public API

```js
const field = MQ.MathField(element);

field.insertMatrix({ rows: 3, columns: 2, environment: 'bmatrix' });
field.insertMatrix(3, 2, 'bmatrix'); // positional form

field.insertColumnVector(3); // 3 x 1, pmatrix by default
field.insertRowVector(3); // 1 x 3, pmatrix by default
```

`environment` defaults to `bmatrix`. `rows` and `columns` must be
integers between 1 and 50; anything else throws. After insertion the
cursor is in cell `[0][0]`.

A vector is a matrix of size `n × 1` or `1 × n`. Whether such a
structure is interpreted as a matrix, a list or a vector is a question
for the CAS on the other side, not for MathQuill.

`field.text()` serialises a matrix as `matrix([a,b],[c,d])`.

## Testing

- `test/unit/matrix.test.js` — parser, serialisation, roundtrip,
  navigation, mutation, deletion and the public API. Runs inside the
  existing Mocha suite (`test/unit.html`).
- `test/e2e/matrix.spec.ts` — rendering, keyboard handling, layout,
  delimiter scaling and responsive behaviour in a real browser.
- `test/matrix.html` — manual verification page and fixture for the
  Playwright suites.

```bash
make test                      # build, then open test/unit.html
make e2e                       # Playwright, Chromium
npm run test:e2e:all           # Chromium, Firefox and WebKit
npm run test:visual            # screenshot comparison
npm run test:visual:update     # write new reference screenshots
```

## Known upstream failures

The Mocha suite is run in Chromium, Firefox and WebKit by
`test/e2e/unit-suite.spec.ts`. Two failures pre-date this work and were
confirmed by running the same runner against unmodified upstream `main`:

- Firefox: `saneKeyboardEvents copy` — the fake controller in that test
  has no `exportLatexSelection`.
- WebKit: the `Digit Grouping` tests, because the spacing-bug feature
  detection reports an extra `mq-has-spacing-bug` class.

They are listed in `KNOWN_UPSTREAM_FAILURES` in the runner, reported as
an annotation and do not fail the run. Every other failure does. Remove
an entry as soon as the underlying bug is fixed.

## Visual baselines

The reference images in `test/e2e/visual.spec.ts-snapshots/` were
produced by the `visual-regression` job and are committed, so that job is
a gate: an unintended layout change fails it.

To accept an intended change, take the `-actual` images from the job's
artifact and commit them as the new references. Do not generate
references on a developer machine: they depend on the rendering
environment, and a machine with different fonts produces images that
disagree with every CI run afterwards. `npm run test:visual:update`
exists for experimenting locally, not for producing what gets committed.

Snapshot names must not differ only in case. Git keeps `Bmatrix-…png` and `bmatrix-…png` apart,
a checkout on Windows or macOS does not: one of the pair is lost, and the next CI run reports a
missing reference image for a file that is in the repository. The environments with capitalised
names are therefore called `bmatrix-braces` and `vmatrix-double`, and a test in
`visual.spec.ts` fails if a new name collides.

The comparison allows a 1% pixel ratio (`toHaveScreenshot` in
`playwright.config.ts`), which absorbs antialiasing noise after a runner
image update while still catching a moved delimiter or a changed row
height.

## Identifiers containing an operator name

MathQuill un-italicises an operator name wherever it appears inside a run of letters, so typing
`Umax` produces `U\max`. For a CAS input that is wrong: `Umax` is one variable. Set
[`autoOperatorNamesOnlyWholeWord`](Config.md#autooperatornamesonlywholeword) to keep such names
intact, and `disableAutoSubstitutionInSubscripts` for the same problem inside a subscript
(`U_max`).
