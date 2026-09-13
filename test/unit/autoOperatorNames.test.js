suite('autoOperatorNames', function () {
  const $ = window.test_only_jquery;
  var mq;
  var normalConfig = {
    autoCommands: 'sum int'
  };
  var subscriptConfig = {
    autoCommands: 'sum int',
    disableAutoSubstitutionInSubscripts: true
  };
  const subscriptConfigNoLog = {
    autoCommands: 'sum int',
    disableAutoSubstitutionInSubscripts: { except: 'log' }
  };
  const wholeWordConfig = {
    autoCommands: 'sum int',
    autoOperatorNamesOnlyWholeWord: true
  };

  setup(function () {
    mq = MQ.MathField($('<span></span>').appendTo('#mock')[0]);
    mq.config(normalConfig);
  });

  function assertLatex(input, expected) {
    var result = mq.latex();
    assert.equal(
      result,
      expected,
      input + ", got '" + result + "', expected '" + expected + "'"
    );
  }

  function assertText(input, expected) {
    var result = mq.text();
    assert.equal(
      result,
      expected,
      input + ", got '" + result + "', expected '" + expected + "'"
    );
  }

  test('simple LaTeX parsing, typing', function () {
    function assertAutoOperatorNamesWork(str, latex) {
      var count = 0;
      var _autoUnItalicize = Letter.prototype.autoUnItalicize;
      Letter.prototype.autoUnItalicize = function () {
        count += 1;
        return _autoUnItalicize.apply(this, arguments);
      };

      mq.latex(str);
      assertLatex("parsing '" + str + "'", latex);
      assert.equal(count, 1);

      // Since Latex doesn't change, count should remain at 1.
      mq.latex(latex);
      assertLatex("parsing '" + latex + "'", latex);
      assert.equal(count, 1);

      mq.latex('');
      for (var i = 0; i < str.length; i += 1) mq.typedText(str.charAt(i));
      assertLatex("typing '" + str + "'", latex);
      assert.equal(count, 1 + str.length);
    }

    assertAutoOperatorNamesWork('sin', '\\sin');
    assertAutoOperatorNamesWork('inf', '\\inf');
    assertAutoOperatorNamesWork('arcosh', '\\operatorname{arcosh}');
    assertAutoOperatorNamesWork('acosh', 'a\\cosh');
    assertAutoOperatorNamesWork('cosine', '\\cos ine');
    assertAutoOperatorNamesWork('arcosecant', 'ar\\operatorname{cosec}ant');
    assertAutoOperatorNamesWork('cscscscscscsc', '\\csc s\\csc s\\csc sc');
    assertAutoOperatorNamesWork('scscscscscsc', 's\\csc s\\csc s\\csc');
  });

  test('works in \\sum', function () {
    mq.typedText('sum');
    mq.typedText('sin');
    assertLatex('sum allows operatorname', '\\sum_{\\sin}^{ }');
  });

  test('works in \\int', function () {
    mq.typedText('int');
    mq.typedText('sin');
    assertLatex('int allows operatorname', '\\int_{\\sin}^{ }');
  });

  test('works in subscript after log, based on "except" option', function () {
    // log subscript without config option
    mq.config(subscriptConfig);
    mq.typedText('log_');
    mq.typedText('sin');
    assertLatex('subscripts do not turn to operatorname', '\\log_{sin}');

    // log subscript
    mq.latex('');
    mq.config(subscriptConfigNoLog);
    mq.typedText('log_');
    mq.typedText('sin');
    assertLatex('log subscript does turn to operatorname', '\\log_{\\sin}');
  });

  test('no auto operator names in simple subscripts when typing', function () {
    // normal
    mq.config(normalConfig);
    mq.typedText('x_');
    mq.typedText('sin');
    assertLatex('subscripts turn to operatorname', 'x_{\\sin}');

    // subscript config
    mq.latex('');
    mq.config(subscriptConfig);
    mq.typedText('x_');
    mq.typedText('sin');
    assertLatex('subscripts do not turn to operatorname', 'x_{sin}');
  });

  test('no auto operator names in simple subscripts when pasting', function () {
    var textarea = $(mq.el()).find('textarea');
    mq.config(normalConfig);
    trigger.paste(textarea[0]);
    textarea.val('x_{sin}');
    trigger.input(textarea[0]);
    assertLatex('subscripts turn to operatorname', 'x_{\\sin}');
    mq.latex('');
    mq.config(subscriptConfig);
    trigger.paste(textarea[0]);
    textarea.val('x_{sin}');
    trigger.input(textarea[0]);
    assertLatex('subscripts do not turn to operatorname', 'x_{sin}');
    mq.config(normalConfig);
  });

  test('text() output', function () {
    function assertTranslatedCorrectly(latexStr, text) {
      mq.latex(latexStr);
      assertText('outputting ' + latexStr, text);
    }

    assertTranslatedCorrectly('\\sin', 'sin');
    assertTranslatedCorrectly('\\sin\\left(xy\\right)', 'sin(x*y)');
  });

  test('deleting', function () {
    var count = 0;
    var _autoUnItalicize = Letter.prototype.autoUnItalicize;
    Letter.prototype.autoUnItalicize = function () {
      count += 1;
      return _autoUnItalicize.apply(this, arguments);
    };

    var str = 'cscscscscscsc';
    for (var i = 0; i < str.length; i += 1) mq.typedText(str.charAt(i));
    assertLatex("typing '" + str + "'", '\\csc s\\csc s\\csc sc');
    assert.equal(count, str.length);

    mq.moveToLeftEnd().keystroke('Del');
    assertLatex('deleted first char', 's\\csc s\\csc s\\csc');
    assert.equal(count, str.length + 1);

    mq.typedText('c');
    assertLatex('typed back first char', '\\csc s\\csc s\\csc sc');
    assert.equal(count, str.length + 2);

    mq.typedText('+');
    assertLatex(
      'typed plus to interrupt sequence of letters',
      'c+s\\csc s\\csc s\\csc'
    );
    assert.equal(count, str.length + 4);

    mq.keystroke('Backspace');
    assertLatex('deleted plus', '\\csc s\\csc s\\csc sc');
    assert.equal(count, str.length + 5);
  });

  suite('override autoOperatorNames', function () {
    test('basic', function () {
      mq.config({ autoOperatorNames: 'sin lol' });
      mq.typedText('arcsintrololol');
      assert.equal(mq.latex(), 'arc\\sin tro\\operatorname{lol}ol');
    });

    test('command contains non-letters', function () {
      assert.throws(function () {
        MQ.config({ autoOperatorNames: 'e1' });
      });
    });

    test('command length less than 2', function () {
      assert.throws(function () {
        MQ.config({ autoOperatorNames: 'e' });
      });
    });

    suite('command list not perfectly space-delimited', function () {
      test('double space', function () {
        assert.throws(function () {
          MQ.config({ autoOperatorNames: 'pi  theta' });
        });
      });

      test('leading space', function () {
        assert.throws(function () {
          MQ.config({ autoOperatorNames: ' pi' });
        });
      });

      test('trailing space', function () {
        assert.throws(function () {
          MQ.config({ autoOperatorNames: 'pi ' });
        });
      });
    });
  });

  suite('autoOperatorNamesOnlyWholeWord', function () {
    setup(function () {
      mq.config(wholeWordConfig);
    });

    function assertTyped(str, expected) {
      mq.latex('');
      for (var i = 0; i < str.length; i += 1) mq.typedText(str.charAt(i));
      assertLatex("typing '" + str + "'", expected);
    }

    test('a name on its own is still an operator', function () {
      assertTyped('max', '\\max');
      assertTyped('min', '\\min');
      assertTyped('sin', '\\sin');
      assertTyped('arcosh', '\\operatorname{arcosh}');
    });

    test('an applied name is still an operator', function () {
      assertTyped('max(', '\\max\\left(\\right)');
      assertTyped('sin(x', '\\sin\\left(x\\right)');
    });

    test('a name inside a longer word stays part of the identifier', function () {
      assertTyped('Umax', 'Umax');
      assertTyped('Umin', 'Umin');
      assertTyped('maxU', 'maxU');
      assertTyped('argmax', 'argmax');
      assertTyped('maximum', 'maximum');
      assertTyped('sinvalue', 'sinvalue');
      assertTyped('cosine', 'cosine');
    });

    test('typing past a recognised name gives the identifier back', function () {
      // "sin" is an operator while it is the whole word and turns back into letters as soon as
      // the word grows.
      mq.latex('');
      mq.typedText('sin');
      assertLatex("typing 'sin'", '\\sin');
      mq.typedText('e');
      assertLatex("typing 'sine'", 'sine');
    });

    test('the default is unchanged', function () {
      // config() merges, so the comparison needs a field of its own.
      var plain = MQ.MathField($('<span></span>').appendTo('#mock')[0]);
      plain.config(normalConfig);
      plain.latex('');
      'Umax'.split('').forEach(function (ch) {
        plain.typedText(ch);
      });
      assert.equal(plain.latex(), 'U\\max', "typing 'Umax' without the option");

      plain.latex('');
      'cosine'.split('').forEach(function (ch) {
        plain.typedText(ch);
      });
      assert.equal(
        plain.latex(),
        '\\cos ine',
        "typing 'cosine' without the option"
      );
    });
  });
});
