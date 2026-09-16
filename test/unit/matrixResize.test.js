suite('resizing a matrix in place', function () {
  const $ = window.test_only_jquery;
  var mq;

  setup(function () {
    mq = MQ.MathField($('<span></span>').appendTo('#mock')[0]);
  });

  test('there is no matrix to report outside one', function () {
    mq.latex('a+b');
    assert.equal(mq.matrixAtCursor(), null);
  });

  test('the matrix under the cursor is reported with its contents', function () {
    mq.latex('\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}');
    mq.focus();
    mq.moveToLeftEnd();
    mq.keystroke('Right');

    var described = mq.matrixAtCursor();
    assert.ok(described, 'the cursor is inside the matrix');
    assert.equal(described.rows, 2);
    assert.equal(described.columns, 2);
    assert.equal(described.environment, 'bmatrix');
    assert.equal(described.cells[0][0], '1');
    assert.equal(described.cells[1][1], '4');
  });

  test('growing keeps what was there and adds empty cells', function () {
    mq.latex('\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}');
    mq.focus();
    mq.moveToLeftEnd();
    mq.keystroke('Right');

    var result = mq.resizeMatrix({ rows: 3, columns: 3 });
    assert.ok(result.resized);
    assert.equal(result.cellsLost, 0);
    assert.equal(result.to.rows, 3);
    assert.equal(result.to.columns, 3);

    var described = mq.matrixAtCursor();
    assert.equal(described.cells[0][0], '1');
    assert.equal(described.cells[1][1], '4');
    assert.equal(described.cells[2][2], '');
  });

  test('shrinking drops the cells beyond the new size', function () {
    mq.latex('\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}');
    mq.focus();
    mq.moveToLeftEnd();
    mq.keystroke('Right');

    var result = mq.resizeMatrix({ rows: 1, columns: 1 });
    assert.ok(result.resized);
    assert.equal(result.cellsLost, 3, 'three filled cells are gone');

    var described = mq.matrixAtCursor();
    assert.equal(described.rows, 1);
    assert.equal(described.columns, 1);
    assert.equal(described.cells[0][0], '1');
  });

  test('a dry run reports the loss and changes nothing', function () {
    mq.latex('\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}');
    mq.focus();
    mq.moveToLeftEnd();
    mq.keystroke('Right');

    var result = mq.resizeMatrix({ rows: 1, columns: 2, dryRun: true });
    assert.equal(result.resized, false);
    assert.equal(result.cellsLost, 2);

    var described = mq.matrixAtCursor();
    assert.equal(described.rows, 2, 'still two rows');
    assert.equal(described.columns, 2);
  });

  test('empty cells are not counted as a loss', function () {
    mq.latex('\\begin{bmatrix}1&\\\\&\\end{bmatrix}');
    mq.focus();
    mq.moveToLeftEnd();
    mq.keystroke('Right');

    assert.equal(
      mq.resizeMatrix({ rows: 1, columns: 1, dryRun: true }).cellsLost,
      0
    );
  });

  test('outside a matrix nothing is resized', function () {
    mq.latex('a+b');
    var result = mq.resizeMatrix({ rows: 2, columns: 2 });
    assert.equal(result.resized, false);
    assert.equal(result.from, null);
    assert.equal(mq.latex(), 'a+b');
  });

  test('an invalid size is refused', function () {
    mq.latex('\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}');
    assert.throws(function () {
      mq.resizeMatrix({ rows: 0, columns: 2 });
    });
  });

  test('the environment survives a resize', function () {
    mq.latex('\\begin{pmatrix}1\\\\2\\end{pmatrix}');
    mq.focus();
    mq.moveToLeftEnd();
    mq.keystroke('Right');

    mq.resizeMatrix({ rows: 3, columns: 1 });
    assert.equal(mq.latex(), '\\begin{pmatrix}1\\\\2\\\\\\end{pmatrix}');
  });
});
