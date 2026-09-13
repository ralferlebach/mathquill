# Matrix-/Vektorunterstützung für ralferlebach/mathquill — Auslieferung 02

Branch: `feature/matrix-environments` auf `main` (`bb9974ab`).

## Was sich gegenüber Auslieferung 01 ändert

Nur eines: **`package-lock.json` liegt jetzt bei.** In der ersten ZIP fehlte sie, weshalb in
der CI jeder Job an `npm ci` scheiterte:

    npm error Missing: @playwright/test@1.63.0 from lock file
    npm error Missing: @types/node@22.20.2 from lock file

Der Quellcode ist unverändert. Wer die 01 bereits eingespielt hat, braucht nur die
`package-lock.json` und `package.json` aus diesem Archiv.

## Inhalt

Dieses Archiv enthält den **vollständigen Quellbaum** des Branches (ohne `node_modules/` und
`build/`) sowie den Patch. Damit kann nichts mehr versehentlich fehlen.

## Variante A — Patch anwenden (empfohlen)

```bash
cd /pfad/zu/mathquill
git checkout main && git pull
git checkout -b feature/matrix-environments
git am mathquill_matrix_environments_02.patch
npm ci
make && make lint
npx prettier --check '**/*.{ts,js,css,html}'
```

## Variante B — Dateien kopieren

Archivinhalt über den Arbeitsbaum kopieren, dann `npm ci`.

## Tests

```bash
make test
npx playwright install --with-deps chromium firefox webkit
make e2e               # Chromium
npm run test:e2e:all   # Chromium + Firefox + WebKit
npm run test:visual    # Screenshots, Baselines siehe docs/Matrix.md
```

## Verifiziert

- `npm ci` in einem frischen Checkout dieses Commits: grün
- `make`, `make basic`, `make lint`, `prettier --check`: grün
- Mocha: 811 passing (Chromium)
- Playwright: je 29 Tests grün in Chromium, Firefox und WebKit
- Firefox (`saneKeyboardEvents copy`) und WebKit (`Digit Grouping`) haben Mocha-Fehlschläge,
  die auch auf unverändertem `main` auftreten; sie sind im Runner als bekannte Upstream-Fehler
  geführt, alles andere lässt den Lauf scheitern.

## Noch offen

Referenz-Screenshots für die visuelle Regression aus dem Artefakt des ersten erfolgreichen
CI-Laufs committen, danach `continue-on-error` im Job entfernen.
