# MathQuill fork: Android soft-keyboard fix (#72)

This is the source tree of `ralferlebach/mathquill`, branch `main`, at commit `2047f12`
("typed space key"), with one change on top: the fix for
`moodle-local_stackmatheditor` issue #72.

## What changed

`src/services/saneKeyboardEvents.util.ts`

* `onInput()` is now a text-entry path of its own. For a non-composing insert event it registers
  `typedText` with the `EveryTick` poller, which is what the keypress path has always done.
  Blink on Android delivers soft-keyboard text without a keypress the shim can use, so the
  poller still held `noop` and every character was dropped until Enter happened to register it.
* Registering `typedText` rather than calling it is what keeps this safe where the classic
  keyboard path also runs: `typedText()` empties the textarea when it inserts, so a second run
  finds nothing to insert. No browser detection, no synthetic key.
* `compositionend` commits an IME word character by character, which `typedText()` cannot do -
  it only ever inserts a single character.

`test/unit/androidInput.test.js` (new)

Six cases: a character without keydown or keypress, digits and operators, a fresh field needing
no Enter first, a deletion left to the keystroke path, the classic desktop sequence typing
exactly one character, and an IME commit arriving once.

## How to put it into the repository

The tree is the repository content, so either copy the two files or replace the working tree:

    cd mathquill                  # your clone, on main at 2047f12
    cp <this>/src/services/saneKeyboardEvents.util.ts src/services/
    cp <this>/test/unit/androidInput.test.js test/unit/
    npm ci && make && make lint
    git add -A && git commit -m "fix(input): accept soft-keyboard text without a preceding keypress"
    git push origin main
    git rev-parse HEAD            # <- this SHA is needed below

## After pushing

`local/stackmatheditor/thirdparty/readme_moodle.txt` in 1.3.0 currently names the fork commit
`5364d108...`, which only ever existed in the build machine that produced the bundle. Replace it
with the SHA you just pushed, in both places:

    sed -i 's/5364d108d1e62973e737630ba52ddf5db27b4a6b/<YOUR_SHA>/g' \
        local/stackmatheditor/thirdparty/readme_moodle.txt

Nothing else has to be rebuilt. The bundle in `build/` here was built from exactly this tree
with Node 22.22.2 and npm 10.9.7, and it is byte-identical to the one 1.3.0 ships:

    mathquill.js      a8f0b253bf380ee2f625e71f9826fa585eece1087fa60b06bfe42a9747e3b0d5
    mathquill.min.js  19be0bd1d948c1692db5bc905a0bb18955ef51a9a486542eb60b3dfcbb07cfce
    mathquill.css     25af0d2b872ae38cb2024599787d4617dbecfb3a0228301a8b296ed60c59cb78

That is the point of the exercise: after this commit, the library the plugin ships can be
rebuilt from a commit that exists in your repository.

## Verified here

* `make`, `make lint`: green
* Mocha through Playwright (Chromium): 822 passing, 0 failing
* The build output matches the vendored bundle byte for byte
