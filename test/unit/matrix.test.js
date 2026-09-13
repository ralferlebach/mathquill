suite('matrix', function () {
  const $ = window.test_only_jquery;
  var mq, mostRecentlyReportedLatex;

  var config = {
    handlers: {
      edit: function () {
        mostRecentlyReportedLatex = mq.latex();
      }
    }
  };

  setup(function () {
    mostRecentlyReportedLatex = NaN; // != to everything
    mq = MQ.MathField($('<span></span>').appendTo('#mock')[0], config);
  });

  function matrixNode() {
    return mq.__controller.root.getEnd(L);
  }

  function assertRoundtrip(latex, expected) {
    if (arguments.length < 2) expected = latex;
    mq.latex(latex);
    assert.equal(mq.latex(), expected, 'first roundtrip of ' + latex);
    mq.latex(mq.latex());
    assert.equal(mq.latex(), expected, 'second roundtrip of ' + latex);
  }

  function cellAt(r, c) {
    return matrixNode().cells[r][c].latex();
  }

  function assertCellContains(r, c, needle) {
    var value = cellAt(r, c);
    assert.ok(
      value.indexOf(needle) > -1,
      'cell ' + r + ',' + c + ' should contain ' + needle + ', got: ' + value
    );
  }

  function cellLatex() {
    var matrix = matrixNode();
    return matrix.cells.map(function (row) {
      return row.map(function (cell) {
        return cell.latex();
      });
    });
  }

  suite('parser', function () {
    test('every matrix environment', function () {
      var environments = [
        'matrix',
        'pmatrix',
        'bmatrix',
        'Bmatrix',
        'vmatrix',
        'Vmatrix'
      ];
      for (var i = 0; i < environments.length; i += 1) {
        var env = environments[i];
        assertRoundtrip('\\begin{' + env + '}a&b\\\\c&d\\end{' + env + '}');
        assert.equal(matrixNode().environment, env);
      }
    });

    test('dimensions 1x1, 1xn, nx1 and nxm', function () {
      mq.latex('\\begin{bmatrix}a\\end{bmatrix}');
      assert.equal(matrixNode().rowCount, 1);
      assert.equal(matrixNode().columnCount, 1);

      mq.latex('\\begin{bmatrix}a&b&c\\end{bmatrix}');
      assert.equal(matrixNode().rowCount, 1);
      assert.equal(matrixNode().columnCount, 3);

      mq.latex('\\begin{bmatrix}a\\\\b\\\\c\\end{bmatrix}');
      assert.equal(matrixNode().rowCount, 3);
      assert.equal(matrixNode().columnCount, 1);

      mq.latex('\\begin{bmatrix}a&b&c\\\\d&e&f\\end{bmatrix}');
      assert.equal(matrixNode().rowCount, 2);
      assert.equal(matrixNode().columnCount, 3);
    });

    test('empty cells are kept and stay editable', function () {
      assertRoundtrip('\\begin{bmatrix}&b\\\\c&\\end{bmatrix}');
      var cells = cellLatex();
      assert.equal(cells[0][0], '');
      assert.equal(cells[0][1], 'b');
      assert.equal(cells[1][0], 'c');
      assert.equal(cells[1][1], '');
    });

    test('complex cell contents', function () {
      assertRoundtrip(
        '\\begin{bmatrix}\\frac{1}{2}&x^{2}\\\\\\sqrt{y}&\\sin\\left(x\\right)\\end{bmatrix}'
      );
    });

    test('nested brackets and nested matrices', function () {
      assertRoundtrip(
        '\\begin{bmatrix}\\left(a+b\\right)&\\begin{pmatrix}x\\\\y\\end{pmatrix}\\end{bmatrix}'
      );
      assert.equal(matrixNode().columnCount, 2);
    });

    test('a matrix inside a larger expression', function () {
      assertRoundtrip('2\\begin{bmatrix}a&b\\end{bmatrix}+1');
    });

    test('ragged rows are padded to the longest row', function () {
      mq.latex('\\begin{bmatrix}a&b&c\\\\d\\end{bmatrix}');
      assert.equal(matrixNode().rowCount, 2);
      assert.equal(matrixNode().columnCount, 3);
      assert.equal(mq.latex(), '\\begin{bmatrix}a&b&c\\\\d&&\\end{bmatrix}');
    });

    test('whitespace and line breaks between cells', function () {
      mq.latex('\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}');
      assert.equal(mq.latex(), '\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}');
    });

    test('an unknown environment is rejected', function () {
      mq.latex('\\begin{bmatrix}a\\end{bmatrix}');
      mq.latex('\\begin{notanenvironment}a\\end{notanenvironment}');
      assert.equal(mq.latex(), '', 'unknown environments do not parse');
    });

    test('an unterminated environment is rejected', function () {
      mq.latex('\\begin{bmatrix}a&b');
      assert.equal(mq.latex(), '');
    });
  });

  suite('serialisation', function () {
    test('column and row separators', function () {
      mq.latex('\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}');
      assert.equal(mq.latex(), '\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}');
    });

    test('text output', function () {
      mq.latex('\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}');
      assert.equal(mq.text(), 'matrix([a,b],[c,d])');
    });

    test('mathspeak names rows and columns', function () {
      mq.latex('\\begin{bmatrix}a&b\\end{bmatrix}');
      var speech = mq.mathspeak();
      assert.ok(
        speech.indexOf('Start 1 by 2 Matrix') > -1,
        'mathspeak announces the dimensions, got: ' + speech
      );
      assert.ok(speech.indexOf('End Matrix') > -1, 'mathspeak has an end');
    });
  });

  suite('navigation', function () {
    test('Right and Left walk through all cells', function () {
      mq.latex('\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}');
      mq.moveToLeftEnd();

      mq.keystroke('Right'); // into cell 0,0
      mq.typedText('1');
      mq.keystroke('Right Right'); // past the 1 and a, into cell 0,1
      mq.typedText('2');

      assert.equal(mq.latex(), '\\begin{bmatrix}1a&2b\\\\c&d\\end{bmatrix}');
    });

    test('Up and Down stay in the same column', function () {
      mq.latex('\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}');
      mq.moveToLeftEnd();
      mq.keystroke('Right'); // cell 0,0
      mq.keystroke('Down'); // cell 1,0
      mq.typedText('x');

      // Up/Down seek the horizontal position, so only the target cell is
      // asserted, not the exact offset inside it.
      assertCellContains(1, 0, 'x');
      assertCellContains(1, 0, 'c');

      mq.keystroke('Up');
      mq.typedText('y');
      assertCellContains(0, 0, 'y');
      assertCellContains(0, 0, 'a');
      assert.equal(cellAt(0, 1), 'b');
      assert.equal(cellAt(1, 1), 'd');
    });

    test('Tab and Shift-Tab move cell by cell', function () {
      mq.insertMatrix({ rows: 2, columns: 2, environment: 'bmatrix' });
      mq.typedText('a');
      mq.keystroke('Tab');
      mq.typedText('b');
      mq.keystroke('Tab');
      mq.typedText('c');
      mq.keystroke('Shift-Tab');
      mq.typedText('1');

      assert.equal(mq.latex(), '\\begin{bmatrix}a&b1\\\\c&\\end{bmatrix}');
    });

    test('the cursor can enter and leave the matrix', function () {
      mq.latex('\\begin{bmatrix}a\\end{bmatrix}');
      mq.moveToRightEnd();
      mq.keystroke('Left'); // into the last cell
      mq.keystroke('Left'); // in front of the a
      mq.keystroke('Left'); // out of the matrix
      mq.typedText('2');

      assert.equal(mq.latex(), '2\\begin{bmatrix}a\\end{bmatrix}');
    });
  });

  suite('mutation', function () {
    test('Shift-Enter inserts a row below the current one', function () {
      mq.latex('\\begin{bmatrix}a&b\\end{bmatrix}');
      mq.moveToLeftEnd();
      mq.keystroke('Right');
      mq.keystroke('Shift-Enter');
      mq.typedText('c');

      assert.equal(matrixNode().rowCount, 2);
      assert.equal(mq.latex(), '\\begin{bmatrix}a&b\\\\c&\\end{bmatrix}');
    });

    test('Shift-Spacebar inserts a column right of the current one', function () {
      mq.latex('\\begin{bmatrix}a\\\\b\\end{bmatrix}');
      mq.moveToLeftEnd();
      mq.keystroke('Right');
      mq.keystroke('Shift-Spacebar');
      mq.typedText('x');

      assert.equal(matrixNode().columnCount, 2);
      assert.equal(mq.latex(), '\\begin{bmatrix}a&x\\\\b&\\end{bmatrix}');
    });

    test('coordinates and navigation stay correct after a mutation', function () {
      mq.latex('\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}');
      mq.moveToLeftEnd();
      mq.keystroke('Right');
      mq.keystroke('Shift-Enter'); // new row between the two existing ones

      var matrix = matrixNode();
      assert.equal(matrix.rowCount, 3);
      for (var r = 0; r < matrix.cells.length; r += 1) {
        for (var c = 0; c < matrix.cells[r].length; c += 1) {
          assert.equal(matrix.cells[r][c].row, r);
          assert.equal(matrix.cells[r][c].column, c);
        }
      }

      mq.typedText('x');
      assertCellContains(1, 0, 'x');
      mq.keystroke('Down');
      mq.typedText('1');
      assertCellContains(2, 0, '1');
      assertCellContains(2, 0, 'c');
      assert.equal(cellAt(0, 0), 'a');
      assert.equal(cellAt(2, 1), 'd');
    });

    test('deleteRow and deleteColumn keep the matrix consistent', function () {
      mq.latex('\\begin{bmatrix}a&b&c\\\\d&e&f\\end{bmatrix}');
      matrixNode().deleteColumn(1);
      assert.equal(mq.latex(), '\\begin{bmatrix}a&c\\\\d&f\\end{bmatrix}');

      matrixNode().deleteRow(0);
      assert.equal(mq.latex(), '\\begin{bmatrix}d&f\\end{bmatrix}');
      assert.equal(matrixNode().rowCount, 1);
      assert.equal(matrixNode().columnCount, 2);
    });

    test('the last row and column cannot be removed', function () {
      mq.latex('\\begin{bmatrix}a\\end{bmatrix}');
      matrixNode().deleteRow(0);
      matrixNode().deleteColumn(0);
      assert.equal(mq.latex(), '\\begin{bmatrix}a\\end{bmatrix}');
    });

    test('the edit handler fires on mutation', function () {
      mq.latex('\\begin{bmatrix}a\\end{bmatrix}');
      mq.moveToLeftEnd();
      mq.keystroke('Right');
      mostRecentlyReportedLatex = NaN;
      mq.keystroke('Shift-Enter');
      assert.equal(
        mostRecentlyReportedLatex,
        '\\begin{bmatrix}a\\\\\\end{bmatrix}'
      );
    });
  });

  suite('deleting', function () {
    test('Backspace deletes cell content first', function () {
      mq.latex('\\begin{bmatrix}ab&c\\end{bmatrix}');
      mq.moveToLeftEnd();
      mq.keystroke('Right Right Right'); // right of the b
      mq.keystroke('Backspace');
      assert.equal(mq.latex(), '\\begin{bmatrix}a&c\\end{bmatrix}');
    });

    test('an empty row is removed', function () {
      mq.latex('\\begin{bmatrix}a&b\\\\&\\end{bmatrix}');
      mq.moveToRightEnd();
      mq.keystroke('Left'); // into the last (empty) cell
      mq.keystroke('Backspace');
      assert.equal(mq.latex(), '\\begin{bmatrix}a&b\\end{bmatrix}');
      assert.equal(matrixNode().rowCount, 1);
    });

    test('an empty column is removed', function () {
      mq.latex('\\begin{bmatrix}a&\\\\b&\\end{bmatrix}');
      mq.moveToRightEnd();
      mq.keystroke('Left');
      mq.keystroke('Backspace');
      assert.equal(mq.latex(), '\\begin{bmatrix}a\\\\b\\end{bmatrix}');
      assert.equal(matrixNode().columnCount, 1);
    });

    test('the matrix itself is removed only when nothing is left', function () {
      mq.insertMatrix({ rows: 2, columns: 2 });
      mq.keystroke('Backspace'); // empty row goes
      assert.equal(matrixNode().rowCount, 1);
      mq.keystroke('Backspace'); // empty column goes
      assert.equal(matrixNode().columnCount, 1);
      mq.keystroke('Backspace'); // matrix goes
      assert.equal(mq.latex(), '');
    });

    test('the surrounding expression survives deleting the matrix', function () {
      mq.latex('1+');
      mq.insertMatrix({ rows: 1, columns: 1 });
      mq.keystroke('Backspace');
      assert.equal(mq.latex(), '1+');
      mq.typedText('2');
      assert.equal(mq.latex(), '1+2');
    });
  });

  suite('public API', function () {
    test('insertMatrix with an options object', function () {
      mq.insertMatrix({ rows: 3, columns: 2, environment: 'pmatrix' });
      assert.equal(matrixNode().rowCount, 3);
      assert.equal(matrixNode().columnCount, 2);
      assert.equal(matrixNode().environment, 'pmatrix');
    });

    test('insertMatrix with positional arguments', function () {
      mq.insertMatrix(2, 3, 'vmatrix');
      assert.equal(matrixNode().rowCount, 2);
      assert.equal(matrixNode().columnCount, 3);
      assert.equal(matrixNode().environment, 'vmatrix');
    });

    test('the default environment is bmatrix', function () {
      mq.insertMatrix({ rows: 1, columns: 1 });
      assert.equal(matrixNode().environment, 'bmatrix');
    });

    test('every environment can be inserted', function () {
      var environments = [
        'matrix',
        'pmatrix',
        'bmatrix',
        'Bmatrix',
        'vmatrix',
        'Vmatrix'
      ];
      for (var i = 0; i < environments.length; i += 1) {
        mq.latex('');
        mq.insertMatrix({
          rows: 2,
          columns: 2,
          environment: environments[i]
        });
        assert.equal(matrixNode().environment, environments[i]);
      }
    });

    test('sizes 1x1, 1x3, 3x1, 2x2 and 3x4', function () {
      var sizes = [
        [1, 1],
        [1, 3],
        [3, 1],
        [2, 2],
        [3, 4]
      ];
      for (var i = 0; i < sizes.length; i += 1) {
        mq.latex('');
        mq.insertMatrix({ rows: sizes[i][0], columns: sizes[i][1] });
        assert.equal(matrixNode().rowCount, sizes[i][0]);
        assert.equal(matrixNode().columnCount, sizes[i][1]);
        assert.equal(
          matrixNode().cells.length * matrixNode().cells[0].length,
          sizes[i][0] * sizes[i][1]
        );
      }
    });

    test('the cursor starts in cell [0][0]', function () {
      mq.insertMatrix({ rows: 2, columns: 2 });
      mq.typedText('z');
      assert.equal(mq.latex(), '\\begin{bmatrix}z&\\\\&\\end{bmatrix}');
    });

    test('insertColumnVector and insertRowVector', function () {
      mq.insertColumnVector(3);
      assert.equal(matrixNode().rowCount, 3);
      assert.equal(matrixNode().columnCount, 1);
      assert.equal(matrixNode().environment, 'pmatrix');

      mq.latex('');
      mq.insertRowVector(3, 'bmatrix');
      assert.equal(matrixNode().rowCount, 1);
      assert.equal(matrixNode().columnCount, 3);
      assert.equal(matrixNode().environment, 'bmatrix');
    });

    test('invalid dimensions are rejected', function () {
      assert.throws(function () {
        mq.insertMatrix({ rows: 0, columns: 2 });
      });
      assert.throws(function () {
        mq.insertMatrix({ rows: 2, columns: 0 });
      });
      assert.throws(function () {
        mq.insertMatrix({ rows: -1, columns: 2 });
      });
      assert.throws(function () {
        mq.insertMatrix({ rows: 2.5, columns: 2 });
      });
      assert.throws(function () {
        mq.insertMatrix({ rows: 51, columns: 2 });
      });
      assert.throws(function () {
        mq.insertMatrix({ rows: 2, columns: 51 });
      });
      assert.equal(mq.latex(), '', 'nothing was inserted');
    });

    test('an unknown environment is rejected', function () {
      assert.throws(function () {
        mq.insertMatrix({ rows: 1, columns: 1, environment: 'array' });
      });
      assert.equal(mq.latex(), '');
    });

    test('a selection is kept when a matrix replaces it', function () {
      mq.latex('xy');
      mq.select();
      mq.insertMatrix({ rows: 1, columns: 2 });
      assert.equal(mq.latex(), '\\begin{bmatrix}xy&\\end{bmatrix}');
    });
  });

  suite('performance and robustness', function () {
    test('a 20x20 matrix parses, serialises and navigates', function () {
      var rows = [];
      for (var r = 0; r < 20; r += 1) {
        var cells = [];
        for (var c = 0; c < 20; c += 1) cells.push('a');
        rows.push(cells.join('&'));
      }
      var latex = '\\begin{bmatrix}' + rows.join('\\\\') + '\\end{bmatrix}';

      mq.latex(latex);
      assert.equal(matrixNode().rowCount, 20);
      assert.equal(matrixNode().columnCount, 20);
      assert.equal(mq.latex(), latex);

      mq.moveToLeftEnd();
      mq.keystroke('Right Down Down Right');
      mq.typedText('1');
      assert.ok(
        mq.latex().indexOf('1') > -1,
        'typing lands in a cell of the large matrix'
      );
      assert.equal(matrixNode().rowCount, 20);
      assert.equal(matrixNode().columnCount, 20);
    });

    test('inserting a 10x10 matrix through the API', function () {
      mq.insertMatrix({ rows: 10, columns: 10 });
      assert.equal(matrixNode().rowCount, 10);
      assert.equal(matrixNode().columnCount, 10);
    });
  });
});
