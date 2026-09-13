# Matrix-/Vektor-Unterstützung für ralferlebach/mathquill

Branch: `feature/matrix-environments` (auf `main`, Stand `bb9974ab`).

## Variante A — Patch anwenden (empfohlen)

```bash
cd /pfad/zu/mathquill
git checkout main && git pull
git checkout -b feature/matrix-environments
git am mathquill_matrix_environments_01.patch
npm ci
make && make lint
npx prettier --check '**/*.{ts,js,css,html}'
```

Der Patch enthält auch die Änderung an `package-lock.json`
(@playwright/test, @types/node).

## Variante B — Dateien kopieren

Die Dateien dieses Archivs liegen in der Repo-Struktur und können über
den Arbeitsbaum kopiert werden. Danach zusätzlich:

```bash
npm install --save-dev @playwright/test@^1.56.0 @types/node@^22
```

## Tests

```bash
make test                      # Build + test/unit.html (Mocha, manuell)
npx playwright install --with-deps chromium firefox webkit
make e2e                       # Chromium
npm run test:e2e:all           # Chromium + Firefox + WebKit
npm run test:visual            # Screenshot-Vergleich (Baselines s. docs/Matrix.md)
```

Die Mocha-Suite läuft über `test/e2e/unit-suite.spec.ts` automatisiert im
Browser mit; sie muss nicht mehr von Hand geöffnet werden.

## Verifiziert (lokal, Node 22.22, Ubuntu 24.04)

- `make`, `make basic`, `make lint`, `prettier --check`: grün
- Mocha: 811 passing / 0 failing (Chromium)
- Playwright: 29 Tests je Engine grün — Chromium, Firefox, WebKit
- Firefox (`saneKeyboardEvents copy`) und WebKit (`Digit Grouping`)
  haben je einen bzw. mehrere Mocha-Fehlschläge, die auch auf
  unverändertem `main` auftreten; sie sind im Runner als bekannte
  Upstream-Fehler geführt, alles andere lässt den Lauf scheitern.

## Noch offen

- Referenz-Screenshots für die visuelle Regression: aus dem Artefakt des
  ersten CI-Laufs committen, dann `continue-on-error` im Job entfernen.
