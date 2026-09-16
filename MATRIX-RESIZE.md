# MathQuill fork: inspect and resize the matrix under the cursor (#62)

Source tree of `ralferlebach/mathquill`, main at `c1aa2e8` ("android-fix"), with one change on
top. Two new methods on an editable field.

## The API

```js
field.matrixAtCursor()
// -> {rows, columns, environment, cells: [[latex, ...], ...]}  or null

field.resizeMatrix({rows, columns, dryRun})
// -> {resized, from: {rows, columns}|null, to: {rows, columns}, cellsLost}
```

* Rows and columns are added at the end and start empty.
* Everything beyond the new size is removed, with whatever it contained.
* The cells that stay keep their content and their position - that is the difference between
  resizing and inserting a new matrix.
* `dryRun: true` changes nothing and reports how many filled cells a shrink would discard, so the
  host application can ask before it destroys anything.
* Outside a matrix, `resized` is false and `from` is null; nothing is touched.
* An invalid size throws, exactly as `insertMatrix` does.

## Files

* `src/commands/math/matrix.ts` - `matrixAtCursor()`, `describeMatrix()`, `cellsLostByResize()`,
  `applyMatrixResize()`
* `src/publicapi.ts` - the two public methods
* `src/mathquill.d.ts`, `src/shared_types.d.ts` - the types
* `test/unit/matrixResize.test.js` - nine cases (new)

## How to put it into the repository

```bash
cd mathquill                    # your clone, main at c1aa2e8
cp <this>/src/commands/math/matrix.ts src/commands/math/
cp <this>/src/publicapi.ts src/
cp <this>/src/mathquill.d.ts src/mathquill.d.ts
cp <this>/src/shared_types.d.ts src/
cp <this>/test/unit/matrixResize.test.js test/unit/
npm ci && make && make lint
git commit -am "feat(matrix): inspect and resize the matrix under the cursor"
git push origin main
git rev-parse HEAD
```

## After pushing

`local/stackmatheditor/thirdparty/readme_moodle.txt` says `PENDING` where the fork commit
belongs. Replace it with the SHA you just pushed. The bundle the plugin ships was built from
exactly this tree:

    mathquill.js  300429ef6c7c1e4ff0ecbaf5b1ab5bfc7781d6bc4a441ccdf42d8f5f8588fa89
    mathquill.min.js  716c7a040668452d0fc6f7305c498c466c739487706114a53f010d91bd6686b4
    mathquill.css  25af0d2b872ae38cb2024599787d4617dbecfb3a0228301a8b296ed60c59cb78

A rebuild from your commit has to produce the same three checksums; if it does, the plugin needs
no new build.

## Verified here

* `make`, `make lint`, `prettier --check`: green
* Mocha through Playwright (Chromium): 831 passing, 0 failing
* The resize path driven through the vendored bundle in a browser: a dry run to 1x1 on a filled
  2x2 reports three cells lost; growing to 3x3 keeps the four entries and adds five empty cells
