declare namespace MathQuill {
  /** The global MathQuill object */
  interface MathQuill {
    getInterface(version: 1): v1.API;
    getInterface(version: 2): v1.API;
    getInterface(version: 3): v3.API;
  }

  type Direction = -1 | 1;

  namespace v3 {
    type HandlersWithDirection = v1.HandlersWithDirection;
    type HandlersWithoutDirection = v1.HandlersWithoutDirection;
    type HandlerOptions = v1.HandlerOptions<BaseMathQuill>;
    type EmbedOptions = v1.EmbedOptions;
    type EmbedOptionsData = v1.EmbedOptionsData;

    type Config = Omit<v1.Config, 'substituteKeyboardEvents' | 'handlers'> & {
      handlers?: HandlerOptions;
    };

    type MatrixEnvironmentName =
      | 'matrix'
      | 'pmatrix'
      | 'bmatrix'
      | 'Bmatrix'
      | 'vmatrix'
      | 'Vmatrix';

    /** Options for EditableMathQuill#insertMatrix. */
    interface MatrixInsertOptions {
      /** Number of rows, an integer between 1 and 50. */
      rows: number;
      /** Number of columns, an integer between 1 and 50. */
      columns: number;
      /** LaTeX environment to use, defaults to 'bmatrix'. */
      environment?: MatrixEnvironmentName;
    }

    /** What EditableMathQuill#matrixAtCursor reports about the matrix under the cursor. */
    interface MatrixDescription {
      /** Number of rows. */
      rows: number;
      /** Number of columns. */
      columns: number;
      /** The LaTeX environment this matrix uses. */
      environment: MatrixEnvironmentName;
      /** Cell contents as LaTeX, row-major. */
      cells: string[][];
    }

    /** Options for EditableMathQuill#resizeMatrix. */
    interface MatrixResizeOptions {
      /** New number of rows, an integer between 1 and 50. */
      rows: number;
      /** New number of columns, an integer between 1 and 50. */
      columns: number;
      /** Report what would be lost without changing anything. */
      dryRun?: boolean;
    }

    /** What EditableMathQuill#resizeMatrix reports. */
    interface MatrixResizeResult {
      /** False when the cursor is not inside a matrix; nothing was changed then. */
      resized: boolean;
      /** Size before the change, or null when there was no matrix. */
      from: { rows: number; columns: number } | null;
      /** Size after the change, or the requested one for a dry run. */
      to: { rows: number; columns: number };
      /** How many non-empty cells the change discards. */
      cellsLost: number;
    }

    type ExportedLatexSelection = {
      latex: string;
      startIndex: number;
      endIndex: number;
    };

    interface BaseMathQuill {
      id: number;
      data: { [key: string]: any };
      revert: () => HTMLElement;
      reflow: () => void;
      el: () => HTMLElement;
      getAriaLabel(): string;
      html: () => string;
      mathspeak: () => string;
      text(): string;
      selection(selection: ExportedLatexSelection): this;
      selection(): ExportedLatexSelection;
      domNodeToSpan(dom: Element): ExportedLatexSelection | undefined;
      //chainable methods
      config(opts: Config): this;
      latex(latex: string): this;
      latex(): string;
      setAriaLabel(str: string): this;
      blur(): this;
      focus(): this;
      select(): this;
    }

    interface EditableMathQuill extends BaseMathQuill {
      moveToRightEnd: () => EditableMathQuill;
      moveToLeftEnd: () => EditableMathQuill;
      cmd: (latex: string) => EditableMathQuill;
      write: (latex: string) => EditableMathQuill;
      keystroke: (key: string, evt?: KeyboardEvent) => EditableMathQuill;
      typedText: (text: string) => EditableMathQuill;
      clearSelection: () => EditableMathQuill;
      insertMatrix: {
        (options: MatrixInsertOptions): EditableMathQuill;
        (
          rows: number,
          columns: number,
          environment?: MatrixEnvironmentName
        ): EditableMathQuill;
      };
      matrixAtCursor: () => MatrixDescription | null;
      resizeMatrix: (options: MatrixResizeOptions) => MatrixResizeResult;
      insertColumnVector: (
        rows: number,
        environment?: MatrixEnvironmentName
      ) => EditableMathQuill;
      insertRowVector: (
        columns: number,
        environment?: MatrixEnvironmentName
      ) => EditableMathQuill;
      getAriaPostLabel: () => string;
      setAriaPostLabel: (str: string, timeout?: number) => EditableMathQuill;
      ignoreNextMousedown: (func: () => boolean) => EditableMathQuill;
      clickAt: (x: number, y: number, el: HTMLElement) => EditableMathQuill;
      isUserSelecting: () => boolean;
    }

    interface API {
      (el: HTMLElement): BaseMathQuill | null;

      StaticMath(el: null | undefined): null;
      StaticMath(el: HTMLElement, config?: Config): BaseMathQuill;

      MathField(el: null | undefined): null;
      MathField(el: HTMLElement, config?: Config): EditableMathQuill;

      InnerMathField(el: null | undefined): null;
      InnerMathField(el: HTMLElement, config?: Config): EditableMathQuill;

      TextField?: {
        (el: null | undefined): null;
        (el: HTMLElement, config?: Config): EditableMathQuill;
      };

      L: -1;
      R: 1;
      config(options: Config): void;
      registerEmbed(
        name: string,
        options: (data: v1.EmbedOptionsData) => v1.EmbedOptions
      ): void;
    }
  }

  namespace v1 {
    interface Config<$ = DefaultJquery> {
      ignoreNextMousedown?: (_el: MouseEvent) => boolean;
      substituteTextarea?: () => HTMLElement;
      substituteKeyboardEvents?: (
        textarea: $,
        controller: unknown
      ) => {
        select: (text: string) => void;
      };

      restrictMismatchedBrackets?: boolean | 'none';
      /**
       * Recognise an operator name only when it is the whole word: "max" becomes the operator,
       * "Umax" stays an identifier. Defaults to false.
       */
      autoOperatorNamesOnlyWholeWord?: boolean;
      typingSlashCreatesNewFraction?: boolean;
      charsThatBreakOutOfSupSub?: string;
      sumStartsWithNEquals?: boolean;
      autoSubscriptNumerals?: boolean;
      supSubsRequireOperand?: boolean;
      spaceBehavesLikeTab?: boolean;
      typingAsteriskWritesTimesSymbol?: boolean;
      typingSlashWritesDivisionSymbol?: boolean;
      typingPercentWritesPercentOf?: boolean;
      resetCursorOnBlur?: boolean | undefined;
      tabindex?: number;
      leftRightIntoCmdGoes?: 'up' | 'down';
      enableDigitGrouping?: boolean;
      tripleDotsAreEllipsis?: boolean;
      mouseEvents?: boolean;
      maxDepth?: number;
      disableCopyPaste?: boolean;
      statelessClipboard?: boolean;
      onPaste?: () => void;
      onCut?: () => void;
      overridePaste?: (event?: ClipboardEvent) => boolean;
      overrideCopy?: (event?: ClipboardEvent) => boolean;
      overrideCut?: (event?: ClipboardEvent) => boolean;
      overrideTypedText?: (text: string) => void;
      overrideKeystroke?: (key: string, event: KeyboardEvent) => void;
      autoOperatorNames?: string;
      infixOperatorNames?: string;
      prefixOperatorNames?: string;
      autoCommands?: string;
      logAriaAlerts?: boolean;
      autoParenthesizedFunctions?: string;
      quietEmptyDelimiters?: string;
      disableAutoSubstitutionInSubscripts?: boolean | { except: string };
      interpretTildeAsSim?: boolean;
      handlers?: HandlerOptions<BaseMathQuill<$>>;
      askIfShouldIgnoreMousemove?: (
        evt: MouseEvent,
        rootElt: HTMLElement
      ) => boolean;
    }

    interface Handler<MQClass> {
      (mq: MQClass): void;
      (dir: Direction, mq: MQClass): void;
    }

    type HandlersWithDirection = 'moveOutOf' | 'deleteOutOf' | 'selectOutOf';
    type HandlersWithoutDirection =
      | 'reflow'
      | 'enter'
      | 'upOutOf'
      | 'downOutOf'
      | 'edited'
      | 'edit';
    type HandlerOptions<MQClass = unknown> = Partial<
      {
        [K in HandlersWithDirection]: (dir: Direction, mq: MQClass) => void;
      } & {
        [K in HandlersWithoutDirection]: (mq: MQClass) => void;
      }
    >;
    type HandlerName = keyof HandlerOptions;

    interface BaseMathQuill<$ = DefaultJquery> {
      id: number;
      data: { [key: string]: any };
      revert: () => $;
      latex(latex: string): void;
      latex(): string;
      reflow: () => void;
      el: () => HTMLElement;
      getAriaLabel: () => string;
      setAriaLabel: (str: string) => void;
      html: () => string;
      mathspeak: () => string;
      text(): string;
      blur: () => void;
      focus: () => void;
    }

    interface EditableMathQuill extends BaseMathQuill {
      select: () => void;
      moveToRightEnd: () => void;
      cmd: (latex: string) => void;
      write: (latex: string) => void;
      keystroke: (key: string, evt?: KeyboardEvent) => void;
      typedText: (text: string) => void;
      clearSelection: () => void;
      insertMatrix: {
        (options: v3.MatrixInsertOptions): void;
        (
          rows: number,
          columns: number,
          environment?: v3.MatrixEnvironmentName
        ): void;
      };
      insertColumnVector: (
        rows: number,
        environment?: v3.MatrixEnvironmentName
      ) => void;
      insertRowVector: (
        columns: number,
        environment?: v3.MatrixEnvironmentName
      ) => void;
      getAriaPostLabel: () => string;
      setAriaPostLabel: (str: string, timeout?: number) => void;
      ignoreNextMousedown: (func: () => boolean) => void;
      clickAt: (x: number, y: number, el: HTMLElement) => void;
    }

    interface EmbedOptions {
      latex?: () => string;
      text?: () => string;
      htmlString?: string;
    }
    type EmbedOptionsData = any;

    interface API {
      (el: HTMLElement): BaseMathQuill | null;

      StaticMath(el: null | undefined): null;
      StaticMath(el: HTMLElement, config?: Config): BaseMathQuill;

      MathField(el: null | undefined): null;
      MathField(el: HTMLElement, config?: Config): EditableMathQuill;

      InnerMathField(el: null | undefined): null;
      InnerMathField(el: HTMLElement, config?: Config): EditableMathQuill;

      TextField?: {
        (el: null | undefined): null;
        (el: HTMLElement, config?: Config): EditableMathQuill;
      };

      L: -1;
      R: 1;
      config(options: Config): void;
      registerEmbed(
        name: string,
        options: (data: EmbedOptionsData) => EmbedOptions
      ): void;
    }
  }

  interface DefaultJquery {
    (el: HTMLElement): DefaultJquery;
    length: number;
    [index: number]: HTMLElement | undefined;
  }
}
