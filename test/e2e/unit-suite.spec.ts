import { test, expect } from '@playwright/test';

type MochaAssertion = {
  result: boolean;
  message: string;
  stacktrace?: string;
};

type MochaModule = {
  name: string;
  assertions: MochaAssertion[];
};

type MochaResults = {
  modules: { mathquill: MochaModule[] };
  passes: number;
  failures: number;
};

/**
 * Mocha tests that already fail on upstream MathQuill, verified by
 * running this same runner against the unmodified main branch. They are
 * reported but do not fail the run, so that a real regression is not
 * drowned out by pre-existing noise. Remove an entry as soon as the
 * underlying bug is fixed — an entry that no longer matches any failure
 * is not an error, but it is dead weight.
 */
const KNOWN_UPSTREAM_FAILURES: Record<string, RegExp[]> = {
  // The fake controller in this test has no exportLatexSelection.
  firefox: [/saneKeyboardEvents copy/],
  // Feature detection for the spacing bug reports a different class set.
  webkit: [/Digit Grouping[\s\S]*mq-has-spacing-bug/]
};

/**
 * Runs the existing test/unit.html Mocha suite in a real browser and
 * reports its result to Playwright. No test is rewritten for this: the
 * page already exposes `window.testResultsString` when loaded with the
 * `json` query parameter.
 */
test.describe('existing MathQuill unit suite', () => {
  test('all Mocha unit tests pass', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(String(error)));

    const response = await page.goto('/test/unit.html?json');
    expect(
      response?.ok(),
      'test/unit.html must be served — run `make test` first'
    ).toBeTruthy();

    // The page turns red on an uncaught error while loading.
    await expect
      .poll(
        () =>
          page.evaluate(
            () => typeof (window as any).testResultsString === 'string'
          ),
        {
          message: 'the Mocha suite did not finish',
          timeout: 300_000,
          intervals: [500]
        }
      )
      .toBe(true);

    const results = (await page.evaluate(() =>
      JSON.parse((window as any).testResultsString)
    )) as MochaResults;

    const known = KNOWN_UPSTREAM_FAILURES[test.info().project.name] ?? [];
    const unexpected: string[] = [];
    const expectedFailures: string[] = [];

    for (const module of results.modules.mathquill) {
      for (const assertion of module.assertions) {
        if (assertion.result) continue;
        const failure = `${module.name}: ${assertion.message}\n${
          assertion.stacktrace ?? ''
        }`;
        if (known.some((pattern) => pattern.test(failure))) {
          expectedFailures.push(failure);
        } else {
          unexpected.push(failure);
        }
      }
    }

    expect(pageErrors, 'uncaught errors on test/unit.html').toEqual([]);
    expect(unexpected.join('\n\n')).toBe('');
    expect(results.passes).toBeGreaterThan(0);
    test.info().annotations.push({
      type: 'mocha',
      description:
        `${results.passes} passing, ${results.failures} failing ` +
        `(${expectedFailures.length} known upstream)`
    });
  });
});
