import { test, expect } from '@playwright/test';

/**
 * Screenshot comparisons.
 *
 * Snapshot file names must not differ only in case. Git stores both, but a checkout on Windows
 * or macOS keeps only one of the pair, and the CI run then reports a missing reference image
 * for a file that is present in the repository. Hence bmatrix-braces rather than Bmatrix. Reference images are rendering-environment
 * specific, so this project is run separately from the functional
 * suites and is not a merge gate until the baselines have been
 * committed from a CI run.
 */
const SNAPSHOTS: [string, string][] = [
  ['#matrix-example', 'matrix-2x2.png'],
  ['#pmatrix-example', 'pmatrix-2x2.png'],
  ['#bmatrix-example', 'bmatrix-2x2.png'],
  ['#Bmatrix-example', 'bmatrix-braces-2x2.png'],
  ['#vmatrix-example', 'vmatrix-2x2.png'],
  ['#Vmatrix-example', 'vmatrix-double-2x2.png'],
  ['#bmatrix-3x1-example', 'bmatrix-3x1.png'],
  ['#bmatrix-1x3-example', 'bmatrix-1x3.png'],
  ['#bmatrix-4x4-example', 'bmatrix-4x4.png'],
  ['#nested-example', 'nested-content.png']
];

test.describe('matrix visual regression', () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto('/test/matrix.html');
    expect(response?.ok(), 'test/matrix.html must be served').toBeTruthy();
    await expect(page.locator('#bmatrix-example .mq-matrix')).toHaveCount(1);
  });

  test('no two snapshot names differ only in case', () => {
    const lowercased = SNAPSHOTS.map(([, snapshot]) => snapshot.toLowerCase());
    expect(new Set(lowercased).size).toBe(lowercased.length);
  });

  for (const [selector, snapshot] of SNAPSHOTS) {
    test(`matches ${snapshot}`, async ({ page }) => {
      await expect(page.locator(selector)).toHaveScreenshot(snapshot);
    });
  }
});
