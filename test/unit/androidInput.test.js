suite('text entry without a keypress', function () {
  const $ = window.test_only_jquery;
  var mq;

  setup(function () {
    mq = MQ.MathField($('<span></span>').appendTo('#mock')[0]);
  });

  function textarea() {
    return $(mq.el()).find('textarea')[0];
  }

  function fireInput(character, inputType) {
    const el = textarea();
    el.value = character;
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: inputType || 'insertText',
        data: character
      })
    );
  }

  function tick(done, assertion) {
    // The shim inserts on the next tick, as it always has.
    setTimeout(function () {
      assertion();
      done();
    }, 10);
  }

  test('a character arrives without keydown or keypress', function (done) {
    // Blink on Android: the soft keyboard produces input events only. Before this was
    // handled, the character was dropped until some other key registered the poller.
    mq.focus();
    fireInput('a');

    tick(done, function () {
      assert.equal(mq.latex(), 'a');
    });
  });

  test('digits and operators arrive the same way', function (done) {
    mq.focus();
    fireInput('1');

    setTimeout(function () {
      fireInput('+');
      tick(done, function () {
        assert.equal(mq.latex(), '1+');
      });
    }, 10);
  });

  test('no Enter is needed first', function (done) {
    // The workaround this replaces: press Enter once, then typing works.
    mq.focus();
    assert.equal(mq.latex(), '');
    fireInput('x');

    tick(done, function () {
      assert.equal(
        mq.latex(),
        'x',
        'a fresh field must accept the first character'
      );
    });
  });

  test('a deletion is left to the keystroke path', function (done) {
    mq.latex('ab');
    mq.focus();

    const el = textarea();
    el.value = '';
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'deleteContentBackward'
      })
    );

    tick(done, function () {
      assert.equal(
        mq.latex(),
        'ab',
        'the input handler must not delete anything itself'
      );
    });
  });

  test('the classic path still types exactly one character', function (done) {
    // Desktop: keydown, keypress, input, keyup for the same character. The character must
    // not arrive twice.
    mq.focus();
    const el = textarea();

    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'q' }));
    el.dispatchEvent(
      new KeyboardEvent('keypress', { bubbles: true, key: 'q' })
    );
    el.value = 'q';
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: 'q'
      })
    );
    el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'q' }));

    tick(done, function () {
      assert.equal(mq.latex(), 'q');
    });
  });

  test('an IME commits a word once', function (done) {
    mq.focus();
    const el = textarea();

    el.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true })
    );
    el.value = 'ab';
    el.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'insertCompositionText',
        data: 'ab',
        isComposing: true
      })
    );
    el.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true, data: 'ab' })
    );

    tick(done, function () {
      assert.equal(mq.latex(), 'ab');
    });
  });
});
