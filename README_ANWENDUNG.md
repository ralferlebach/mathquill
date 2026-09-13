# Matrix-/Vektorunterstützung für ralferlebach/mathquill — Auslieferung 03

Branch: `feature/matrix-environments` auf `main` (`bb9974ab`).

## Was gegenüber Auslieferung 02 dazukommt

Die CI-Referenzbilder für die visuelle Regression und die Umstellung des Jobs auf einen echten
Gate. Am Quellcode der Bibliothek ändert sich nichts.

* `test/e2e/visual.spec.ts-snapshots/*.png` — zehn Referenzbilder, erzeugt vom
  `visual-regression`-Job des Laufs 94135632916
* `.github/workflows/mathquill-pr-linting.yml` — `continue-on-error` beim
  `visual-regression`-Job entfernt
* `playwright.config.ts` — `toHaveScreenshot: { maxDiffPixelRatio: 0.01 }`
* `docs/Matrix.md` — Abschnitt zu den Referenzbildern aktualisiert

## Wenn 02 schon eingespielt ist

Dann reicht der kleine Patch:

```bash
git am mathquill_visual_baselines_only.patch
```

## Von vorn

```bash
cd /pfad/zu/mathquill
git checkout main && git pull
git checkout -b feature/matrix-environments
git am mathquill_matrix_environments_03.patch
npm ci
make && make lint
```

Alternativ enthält dieses Archiv den vollständigen Quellbaum des Branches (ohne `node_modules/`
und `build/`) zum Kopieren.

## Verifiziert

- `npx playwright test --project=visual` gegen die CI-Bilder: 10 von 10 grün, ohne Abweichung
- `npx playwright test --project=chromium --project=visual`: 39 grün
- `make lint`, `prettier --check`: grün

## Referenzbilder künftig ändern

Nur aus dem Artefakt des `visual-regression`-Jobs übernehmen (`-actual`-Bilder), nie auf einem
Entwicklungsrechner erzeugen: Bilder von einer Maschine mit anderen Schriften widersprechen
danach jedem CI-Lauf. `npm run test:visual:update` ist zum lokalen Ausprobieren da, nicht für
das, was committet wird.
