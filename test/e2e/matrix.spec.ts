import { test, expect, Page } from '@playwright/test';

const ENVIRONMENTS = [
  'matrix',
  'pmatrix',
  'bmatrix',
  'Bmatrix',
  'vmatrix',
  'Vmatrix'
] as const;

async function openFixture(page: Page) {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  const response = await page.goto('/test/matrix.html');
  expect(response?.ok(), 'test/matrix.html must be served').toBeTruthy();
  await expect(page.locator('#matrix-field')).toHaveClass(/mq-editable-field/);

  return pageErrors;
}

function latexOf(page: Page) {
  return page.evaluate(() => (window as any).field.latex() as string);
}

async function insertMatrix(
  page: Page,
  rows: number,
  columns: number,
  environment: string = 'bmatrix'
) {
  await page.evaluate(
    ({ rows, columns, environment }) => {
      const field = (window as any).field;
      field.latex('');
      field.focus();
      field.insertMatrix({ rows, columns, environment });
    },
    { rows, columns, environment }
  );
}

async function cellCount(page: Page) {
  return page.locator('#matrix-field td.mq-matrix-cell').count();
}

test.describe('matrix rendering', () => {
  for (const environment of ENVIRONMENTS) {
    test(`renders \\begin{${environment}}`, async ({ page }) => {
      await openFixture(page);

      const example = page.locator(`#${environment}-example`);
      await expect(example.locator('.mq-matrix')).toHaveCount(1);
      await expect(example.locator('td.mq-matrix-cell')).toHaveCount(4);
      await expect(example.locator('tr')).toHaveCount(2);

      const delimiters = await example.locator('.mq-paren').count();
      expect(delimiters).toBe(environment === 'matrix' ? 0 : 2);
    });
  }

  test('renders vectors and larger matrices', async ({ page }) => {
    await openFixture(page);

    await expect(
      page.locator('#bmatrix-3x1-example td.mq-matrix-cell')
    ).toHaveCount(3);
    await expect(page.locator('#bmatrix-3x1-example tr')).toHaveCount(3);

    await expect(
      page.locator('#bmatrix-1x3-example td.mq-matrix-cell')
    ).toHaveCount(3);
    await expect(page.locator('#bmatrix-1x3-example tr')).toHaveCount(1);

    await expect(
      page.locator('#bmatrix-4x4-example td.mq-matrix-cell')
    ).toHaveCount(16);
  });

  test('cells do not overlap', async ({ page }) => {
    await openFixture(page);

    const cells = page.locator('#bmatrix-4x4-example tr').first().locator('td');
    const boxes = [];
    for (let i = 0; i < (await cells.count()); i += 1) {
      boxes.push(await cells.nth(i).boundingBox());
    }

    for (let i = 1; i < boxes.length; i += 1) {
      const previous = boxes[i - 1]!;
      const current = boxes[i]!;
      expect(current.x).toBeGreaterThanOrEqual(previous.x + previous.width - 1);
    }
  });
});

test.describe('matrix input', () => {
  test('inserts a matrix through the public API and fills every cell', async ({
    page
  }) => {
    const pageErrors = await openFixture(page);
    await insertMatrix(page, 3, 2);

    expect(await cellCount(page)).toBe(6);

    // cursor starts in cell [0][0]
    await page.keyboard.type('a');
    await page.keyboard.press('Tab');
    await page.keyboard.type('b');
    await page.keyboard.press('Tab');
    await page.keyboard.type('c');
    await page.keyboard.press('Tab');
    await page.keyboard.type('d');
    await page.keyboard.press('Tab');
    await page.keyboard.type('e');
    await page.keyboard.press('Tab');
    await page.keyboard.type('f');

    expect(await latexOf(page)).toBe(
      '\\begin{bmatrix}a&b\\\\c&d\\\\e&f\\end{bmatrix}'
    );
    expect(pageErrors).toEqual([]);
  });

  test('supports expressions before and after a matrix', async ({ page }) => {
    await openFixture(page);
    await insertMatrix(page, 1, 2, 'pmatrix');

    await page.keyboard.type('x');
    await page.keyboard.press('Tab');
    await page.keyboard.type('y');
    // leave the matrix to the right and keep typing
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type('+1');

    expect(await latexOf(page)).toBe('\\begin{pmatrix}x&y\\end{pmatrix}+1');
  });

  test('insertColumnVector and insertRowVector', async ({ page }) => {
    await openFixture(page);

    await page.locator('#insert-column-vector').click();
    await expect(page.locator('#matrix-field tr')).toHaveCount(3);
    expect(await cellCount(page)).toBe(3);

    await page.keyboard.type('x');
    await page.keyboard.press('Tab');
    await page.keyboard.type('y');
    await page.keyboard.press('Tab');
    await page.keyboard.type('z');
    expect(await latexOf(page)).toBe(
      '\\begin{bmatrix}x\\\\y\\\\z\\end{bmatrix}'
    );

    await page.locator('#clear-field').click();
    await page.locator('#insert-row-vector').click();
    await expect(page.locator('#matrix-field tr')).toHaveCount(1);
    expect(await cellCount(page)).toBe(3);
  });
});

test.describe('matrix keyboard navigation', () => {
  test('Left, Right, Up, Down and Tab reach every cell', async ({ page }) => {
    await openFixture(page);
    await insertMatrix(page, 2, 2);

    await page.keyboard.type('a');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type('b');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('d');
    // the first Left moves inside the cell, the second one into the cell
    // to its left
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('c');

    expect(await latexOf(page)).toBe(
      '\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}'
    );
  });

  test('Up and Down move between rows in the same column', async ({ page }) => {
    await openFixture(page);
    await insertMatrix(page, 2, 2);

    await page.keyboard.type('a');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.type('c');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.type('1');

    expect(await latexOf(page)).toBe('\\begin{bmatrix}a1&\\\\c&\\end{bmatrix}');
  });

  test('Shift-Tab walks backwards and the cursor can leave the matrix', async ({
    page
  }) => {
    await openFixture(page);
    await insertMatrix(page, 1, 2);

    await page.keyboard.press('Tab');
    await page.keyboard.type('y');
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.type('x');
    expect(await latexOf(page)).toBe('\\begin{bmatrix}x&y\\end{bmatrix}');

    // first Left moves in front of the x, the second one out of the matrix
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('2');
    expect(await latexOf(page)).toBe('2\\begin{bmatrix}x&y\\end{bmatrix}');
  });

  test('Tab walks through every cell without a keyboard trap', async ({
    page
  }) => {
    await openFixture(page);
    await insertMatrix(page, 2, 2);

    const positions: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      positions.push(
        await page.evaluate(
          () => (window as any).field.__controller.cursor.parent.ariaLabel
        )
      );
      const insideField = await page.evaluate(() =>
        document
          .getElementById('matrix-field')!
          .contains(document.activeElement)
      );
      expect(insideField).toBe(true);
      await page.keyboard.press('Tab');
    }

    expect(positions).toEqual([
      'row 1 column 1',
      'row 1 column 2',
      'row 2 column 1',
      'row 2 column 2'
    ]);

    // after the last cell the cursor is back in the root block, not trapped
    const parentIsRoot = await page.evaluate(() => {
      const controller = (window as any).field.__controller;
      return controller.cursor.parent === controller.root;
    });
    expect(parentIsRoot).toBe(true);
  });
});

test.describe('matrix mutation', () => {
  test('Shift-Enter adds a row, Shift-Spacebar adds a column', async ({
    page
  }) => {
    await openFixture(page);
    await insertMatrix(page, 1, 1);

    await page.keyboard.type('a');
    await page.locator('#add-row').click();
    await page.keyboard.type('b');
    expect(await latexOf(page)).toBe('\\begin{bmatrix}a\\\\b\\end{bmatrix}');
    await expect(page.locator('#matrix-field tr')).toHaveCount(2);

    await page.locator('#add-column').click();
    await page.keyboard.type('c');
    expect(await latexOf(page)).toBe('\\begin{bmatrix}a&\\\\b&c\\end{bmatrix}');
    expect(await cellCount(page)).toBe(4);
  });

  test('an empty row and an empty column are removed by Backspace', async ({
    page
  }) => {
    await openFixture(page);
    await insertMatrix(page, 2, 2);

    await page.keyboard.type('a');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.type('b');
    // move into the (empty) second row and delete it
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Backspace');

    expect(await latexOf(page)).toBe('\\begin{bmatrix}a&b\\end{bmatrix}');
    await expect(page.locator('#matrix-field tr')).toHaveCount(1);
  });

  test('an empty matrix is removed only on the final Backspace', async ({
    page
  }) => {
    await openFixture(page);
    await insertMatrix(page, 2, 2);

    // 2x2 empty -> 1x2 -> 1x1 -> gone
    await page.keyboard.press('Backspace');
    expect(await cellCount(page)).toBe(2);
    await page.keyboard.press('Backspace');
    expect(await cellCount(page)).toBe(1);
    await page.keyboard.press('Backspace');
    expect(await cellCount(page)).toBe(0);
    expect(await latexOf(page)).toBe('');
  });
});

test.describe('matrix layout', () => {
  test('delimiters grow with added rows and shrink again', async ({ page }) => {
    await openFixture(page);
    await insertMatrix(page, 1, 1);

    const delimiter = page.locator('#matrix-field .mq-bracket-l').first();
    const initial = (await delimiter.boundingBox())!.height;

    await page.locator('#add-row').click();
    await page.locator('#add-row').click();
    const grown = (await delimiter.boundingBox())!.height;
    expect(grown).toBeGreaterThan(initial);

    // remove the two empty rows again
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    const shrunk = (await delimiter.boundingBox())!.height;
    expect(shrunk).toBeLessThan(grown);
  });

  test('the field grows vertically instead of clipping', async ({ page }) => {
    await openFixture(page);

    const fieldBox = (await page.locator('#matrix-field').boundingBox())!;
    await insertMatrix(page, 4, 2);
    const grownBox = (await page.locator('#matrix-field').boundingBox())!;

    expect(grownBox.height).toBeGreaterThan(fieldBox.height);

    const tableBox = (await page.locator('#matrix-field table').boundingBox())!;
    expect(tableBox.height).toBeLessThanOrEqual(grownBox.height + 1);
  });

  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 }
  ]) {
    test(`renders at ${viewport.width}x${viewport.height}`, async ({
      page
    }) => {
      await page.setViewportSize(viewport);
      await openFixture(page);
      await insertMatrix(page, 3, 3);

      expect(await cellCount(page)).toBe(9);
      const box = (await page.locator('#matrix-field table').boundingBox())!;
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    });
  }
});

test.describe('matrix accessibility', () => {
  test('matrix cells are keyboard reachable and announced', async ({
    page
  }) => {
    await openFixture(page);
    await insertMatrix(page, 2, 2);

    const ariaLabels = await page.evaluate(() => {
      const field = (window as any).field;
      const labels: string[] = [];
      for (let i = 0; i < 4; i += 1) {
        labels.push(field.__controller.cursor.parent.ariaLabel);
        field.keystroke('Tab');
      }
      return labels;
    });

    expect(ariaLabels).toEqual([
      'row 1 column 1',
      'row 1 column 2',
      'row 2 column 1',
      'row 2 column 2'
    ]);
  });

  test('mathspeak output stays intact for normal expressions', async ({
    page
  }) => {
    await openFixture(page);

    const speech = await page.evaluate(() => {
      const field = (window as any).field;
      field.latex('\\frac{x+1}{y}');
      return field.mathspeak();
    });

    expect(speech).toContain('Fraction');
  });
});

test.describe('acceptance workflow', () => {
  test('insert, fill, navigate, mutate, delete, leave and keep typing', async ({
    page
  }) => {
    const pageErrors = await openFixture(page);

    await insertMatrix(page, 3, 2);
    for (const ch of ['a', 'b', 'c', 'd', 'e', 'f']) {
      await page.keyboard.type(ch);
      await page.keyboard.press('Tab');
    }
    expect(await latexOf(page)).toBe(
      '\\begin{bmatrix}a&b\\\\c&d\\\\e&f\\end{bmatrix}'
    );

    // the last Tab left the matrix; step back into the last cell
    await page.keyboard.press('ArrowLeft');
    await page.locator('#add-row').click();
    await page.locator('#add-column').click();
    expect(await cellCount(page)).toBe(12);

    // remove the added, still empty column and row again
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    expect(await latexOf(page)).toBe(
      '\\begin{bmatrix}a&b\\\\c&d\\\\e&f\\end{bmatrix}'
    );

    await page.evaluate(() => (window as any).field.moveToRightEnd());
    await page.keyboard.type('+x');
    expect(await latexOf(page)).toBe(
      '\\begin{bmatrix}a&b\\\\c&d\\\\e&f\\end{bmatrix}+x'
    );
    expect(pageErrors).toEqual([]);
  });
});
