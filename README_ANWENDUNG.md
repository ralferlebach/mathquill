# ralferlebach/mathquill — Auslieferung 06

Branch: `feature/matrix-environments` auf `main` (`bb9974ab`).

## Neu gegenüber Auslieferung 05

Ein getipptes Leerzeichen bekommt die Klasse `mq-space`.

MathQuill rendert es bisher als `<span>&nbsp;</span>` ohne Klasse — damit gibt es keinen
stabilen CSS-Hook. Wo Leerzeichen Bedeutung tragen (CAS-Eingaben mit STACKs
„Insert stars for spaces"), muss `a b` von `ab` unterscheidbar sein.

Die DOM-Erwartungen in `test/unit/digit-grouping.test.js` wurden entsprechend nachgezogen
(18 Stellen).

## Wenn 05 schon eingespielt ist

```bash
git am mathquill_mq_space_class_only.patch
```

## Verifiziert

- Mocha: 816 grün in Chromium
- Playwright Chromium + visual: 40 grün
- `make`, `make lint`, `prettier --check`: grün
