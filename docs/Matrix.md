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

| Key                   | Effect                                    |
| --------------------- | ----------------------------------------- |
| Left / Right          | move inside the cell, then to the next one |
| Up / Down             | move to the cell above or below            |
| Tab / Shift-Tab       | move to the next or previous cell          |
| Shift-Enter           | insert a row below the current one         |
| Shift-Spacebar        | insert a column right of the current one   |
| Backspace / Delete    | delete content; an empty row or column is removed, and a matrix that has shrunk to a single empty cell is removed itself |

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

`test/e2e/visual.spec.ts-snapshots/` is intentionally empty in this
branch: reference images depend on the rendering environment, and images
produced on a developer machine will not match a CI runner. The
`visual-regression` job therefore runs with `continue-on-error` and
uploads whatever it produced. To turn it into a gate, download the
artifact of a run, copy the generated images into
`test/e2e/visual.spec.ts-snapshots/`, commit them and remove
`continue-on-error` from the job.
