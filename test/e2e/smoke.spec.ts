import { test, expect } from '@playwright/test';

/**
 * Baseline: prove that the built artefacts load in a real browser, that
 * a MathField can be focused and typed into, and that the public API
 * returns the expected LaTeX. If this fails, no matrix test result is
 * meaningful.
 */
test.describe('MathQuill baseline', () => {
  test('typing into the demo field produces the expected LaTeX', async ({
    page
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));

    const response = await page.goto('/test/demo.html');
    expect(response?.ok(), 'test/demo.html must be served').toBeTruthy();

    const field = page.locator('#editable-math');
    await expect(field).toHaveClass(/mq-editable-field/);

    await field.click();
    await page.evaluate(() => {
      const el = document.getElementById('editable-math') as HTMLElement;
      (window as any).MQ(el).latex('');
    });

    await page.keyboard.type('x^2');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type('+1');

    const latex = await page.evaluate(() => {
      const el = document.getElementById('editable-math') as HTMLElement;
      return (window as any).MQ(el).latex();
    });

    expect(latex).toBe('x^{2}+1');
    expect(pageErrors, 'uncaught errors on test/demo.html').toEqual([]);
  });

  test('the matrix fixture page initialises', async ({ page }) => {
    const response = await page.goto('/test/matrix.html');
    expect(response?.ok(), 'test/matrix.html must be served').toBeTruthy();

    await expect(page.locator('#matrix-field')).toHaveClass(
      /mq-editable-field/
    );
    await expect(
      page.locator('#bmatrix-example .mq-matrix'),
      'static examples must render as matrices'
    ).toHaveCount(1);
  });
});
