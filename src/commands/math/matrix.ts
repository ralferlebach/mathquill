/***********************************************
 * LaTeX matrix environments.
 *
 * Environments are delimited by \begin{...} and
 * \end{...}. Inside a matrix environment `&`
 * separates columns and `\\` separates rows.
 *
 * A matrix is modelled as a real 2D structure of
 * MatrixCell blocks. The doubly linked list of
 * children is kept in row-major order, so that
 * Left/Right traverse the matrix cell by cell,
 * while Up/Down use the upOutOf/downOutOf links
 * that `relink()` rebuilds after every mutation.
 **********************************************/

type MatrixEnvironmentName =
  | 'matrix'
  | 'pmatrix'
  | 'bmatrix'
  | 'Bmatrix'
  | 'vmatrix'
  | 'Vmatrix';

type LatexEnvironmentFactory = () => MathCommand;

/**
 * Registry of known LaTeX environments, keyed by environment name.
 * Unknown environments are rejected by the \begin parser.
 */
const LatexEnvironments: Record<string, LatexEnvironmentFactory> = {};

/** Upper bound for matrices created through the public API. */
const MATRIX_MAX_DIMENSION = 50;

type MatrixDelimiters = {
  left: keyof typeof SVG_SYMBOLS | null;
  right: keyof typeof SVG_SYMBOLS | null;
};

const MATRIX_ENVIRONMENTS: Record<MatrixEnvironmentName, MatrixDelimiters> = {
  matrix: { left: null, right: null },
  pmatrix: { left: '(', right: ')' },
  bmatrix: { left: '[', right: ']' },
  Bmatrix: { left: '{', right: '}' },
  vmatrix: { left: '|', right: '|' },
  Vmatrix: { left: '&#8741;', right: '&#8741;' }
};

function isMatrixEnvironmentName(name: string): name is MatrixEnvironmentName {
  return Object.prototype.hasOwnProperty.call(MATRIX_ENVIRONMENTS, name);
}

/**
 * A single editable cell of a matrix. Knows its position so that
 * navigation and mutation do not depend on index arithmetic over the
 * flat list of children.
 */
class MatrixCell extends MathBlock {
  row: number = 0;
  column: number = 0;
  matrix: Matrix;

  keystroke(key: string, e: KeyboardEvent | undefined, ctrlr: Controller) {
    switch (key) {
      case 'Shift-Spacebar':
        e?.preventDefault();
        this.matrix.insertColumnAfter(this, ctrlr.cursor);
        return;
      case 'Shift-Enter':
        e?.preventDefault();
        this.matrix.insertRowAfter(this, ctrlr.cursor);
        return;
      default:
        return super.keystroke(key, e, ctrlr);
    }
  }

  // Cells must not follow the leftRightIntoCmdGoes shortcut of their
  // parent command; horizontally they are plain neighbours.
  moveOutOf(dir: Direction, cursor: Cursor, _updown?: 'up' | 'down') {
    super.moveOutOf(dir, cursor);
  }

  deleteOutOf(dir: Direction, cursor: Cursor) {
    this.matrix.deleteOutOfCell(this, dir, cursor);
  }
}

/**
 * A LaTeX matrix environment. The six standard environments only differ
 * in their delimiters, so they share this single implementation.
 */
class Matrix extends MathCommand {
  environment: MatrixEnvironmentName;
  cells: MatrixCell[][] = [];
  rowCount: number = 0;
  columnCount: number = 0;
  private initialRows: number;
  private initialColumns: number;

  constructor(
    environment: MatrixEnvironmentName = 'matrix',
    rows: number = 2,
    columns: number = 2
  ) {
    super();
    this.environment = environment;
    this.ctrlSeq = '\\begin{' + environment + '}';
    this.initialRows = rows;
    this.initialColumns = columns;
    this.ariaLabel = 'matrix';
  }

  //
  // -*- Structure -*-
  //

  numBlocks() {
    return this.blocks
      ? this.blocks.length
      : this.initialRows * this.initialColumns;
  }

  createBlocks() {
    const cells: MatrixCell[][] = [];
    for (let r = 0; r < this.initialRows; r += 1) {
      const row: MatrixCell[] = [];
      for (let c = 0; c < this.initialColumns; c += 1) {
        row.push(new MatrixCell());
      }
      cells.push(row);
    }
    this.adoptCells(cells);
  }

  /** Adopt a freshly built 2D array of cells in row-major order. */
  private adoptCells(cells: MatrixCell[][]) {
    this.columnCount = cells[0].length;
    this.rowCount = cells.length;

    let leftward: NodeRef = 0;
    for (let r = 0; r < cells.length; r += 1) {
      for (let c = 0; c < cells[r].length; c += 1) {
        const cell = cells[r][c];
        cell.adopt(this, leftward, 0);
        leftward = cell;
      }
    }
    this.syncCells();
  }

  /**
   * Rebuild `cells`, `blocks` and the cell coordinates from the linked
   * list of children. Called after every structural change.
   */
  private syncCells() {
    const cells: MatrixCell[][] = [];
    const blocks: MatrixCell[] = [];
    const columnCount = this.columnCount;

    this.eachChild((child) => {
      const cell = child as MatrixCell;
      const index = blocks.length;
      const row = Math.floor(index / columnCount);
      const column = index % columnCount;

      cell.matrix = this;
      cell.row = row;
      cell.column = column;
      if (!cells[row]) cells[row] = [];
      cells[row][column] = cell;
      blocks.push(cell);
      return undefined;
    });

    this.cells = cells;
    this.rowCount = cells.length;
    this.blocks = blocks;
  }

  /** Rebuild vertical navigation links, ARIA labels and row class. */
  relink() {
    const cells = this.cells;

    for (let r = 0; r < cells.length; r += 1) {
      for (let c = 0; c < cells[r].length; c += 1) {
        const cell = cells[r][c];
        cell.upOutOf = r > 0 ? cells[r - 1][c] : undefined;
        cell.downOutOf = r < cells.length - 1 ? cells[r + 1][c] : undefined;
        cell.ariaLabel = 'row ' + (r + 1) + ' column ' + (c + 1);
      }
    }

    if (cells.length) {
      this.upInto = cells[0][0];
      this.downInto = cells[cells.length - 1][0];
    }

    const table = this.tableElement();
    if (table) {
      if (cells.length === 1) table.classList.add('mq-rows-1');
      else table.classList.remove('mq-rows-1');
    }
  }

  finalizeTree() {
    this.syncCells();
    this.relink();
  }

  //
  // -*- Parsing and serialisation -*-
  //

  parser(): Parser<MQNode | Fragment> {
    const self = this;
    const optWhitespace = Parser.optWhitespace;
    const string = Parser.string;

    return optWhitespace
      .then(string('&').or(string('\\\\')).or(latexMathParser.block))
      .many()
      .skip(optWhitespace)
      .then(function (items) {
        const rows: MatrixCell[][] = [];
        let row: MatrixCell[] = [];
        let collected: MathBlock[] = [];

        function addCell() {
          const cell = new MatrixCell();
          for (let i = 0; i < collected.length; i += 1) {
            collected[i].children().adopt(cell, cell.getEnd(R), 0);
          }
          collected = [];
          row.push(cell);
        }

        for (let i = 0; i < items.length; i += 1) {
          const item = items[i];
          if (typeof item === 'string') {
            addCell();
            if (item === '\\\\') {
              rows.push(row);
              row = [];
            }
          } else {
            collected.push(item);
          }
        }
        addCell();
        rows.push(row);

        // Pad short rows to the longest row, as the original
        // implementation did, rather than rejecting the input.
        let columnCount = 0;
        for (let i = 0; i < rows.length; i += 1) {
          columnCount = max(columnCount, rows[i].length);
        }
        for (let i = 0; i < rows.length; i += 1) {
          while (rows[i].length < columnCount) rows[i].push(new MatrixCell());
        }

        self.adoptCells(rows);
        self.relink();
        return Parser.succeed(self);
      });
  }

  latexRecursive(ctx: LatexContext) {
    this.checkCursorContextOpen(ctx);

    ctx.uncleanedLatex += '\\begin{' + this.environment + '}';
    for (let r = 0; r < this.cells.length; r += 1) {
      if (r > 0) ctx.uncleanedLatex += '\\\\';
      for (let c = 0; c < this.cells[r].length; c += 1) {
        if (c > 0) ctx.uncleanedLatex += '&';
        this.cells[r][c].latexRecursive(ctx);
      }
    }
    ctx.uncleanedLatex += '\\end{' + this.environment + '}';

    this.checkCursorContextClose(ctx);
  }

  text() {
    const rows: string[] = [];
    for (let r = 0; r < this.cells.length; r += 1) {
      const cells: string[] = [];
      for (let c = 0; c < this.cells[r].length; c += 1) {
        cells.push(this.cells[r][c].text());
      }
      rows.push('[' + cells.join(',') + ']');
    }
    return 'matrix(' + rows.join(',') + ')';
  }

  mathspeak() {
    const parts: string[] = [
      'Start ' + this.rowCount + ' by ' + this.columnCount + ' Matrix'
    ];
    for (let r = 0; r < this.cells.length; r += 1) {
      parts.push('Row ' + (r + 1));
      for (let c = 0; c < this.cells[r].length; c += 1) {
        parts.push('Column ' + (c + 1) + ',');
        parts.push(this.cells[r][c].mathspeak());
      }
    }
    parts.push(', End Matrix');
    return parts.join(' ').replace(/ +(?= )/g, '');
  }

  //
  // -*- Rendering -*-
  //

  html() {
    const delimiters = MATRIX_ENVIRONMENTS[this.environment];
    const leftSymbol = matrixSymbol(delimiters.left);
    const rightSymbol = matrixSymbol(delimiters.right);
    const columnCount = this.columnCount;
    const blocks = this.blocks || [];

    this.domView = new DOMView(blocks.length, (renderedBlocks) => {
      const trs: HTMLElement[] = [];
      const rowCount = Math.ceil(renderedBlocks.length / columnCount);

      for (let r = 0; r < rowCount; r += 1) {
        const tds: HTMLElement[] = [];
        for (let c = 0; c < columnCount; c += 1) {
          const block = renderedBlocks[r * columnCount + c];
          if (!block) continue;
          tds.push(h.block('td', { class: 'mq-matrix-cell' }, block));
        }
        trs.push(h('tr', {}, tds));
      }

      const table = h(
        'table',
        {
          class:
            'mq-matrix-table mq-non-leaf' + (rowCount === 1 ? ' mq-rows-1' : '')
        },
        [h('tbody', {}, trs)]
      );

      const children: HTMLElement[] = [];
      if (leftSymbol) {
        children.push(
          h(
            'span',
            {
              style: 'width:' + leftSymbol.width,
              class: 'mq-scaled mq-paren mq-bracket-l'
            },
            [leftSymbol.html()]
          )
        );
      }
      children.push(
        h(
          'span',
          {
            style:
              'margin-left:' +
              (leftSymbol ? leftSymbol.width : '0') +
              ';margin-right:' +
              (rightSymbol ? rightSymbol.width : '0'),
            class: 'mq-matrix-middle mq-non-leaf'
          },
          [table]
        )
      );
      if (rightSymbol) {
        children.push(
          h(
            'span',
            {
              style: 'width:' + rightSymbol.width,
              class: 'mq-scaled mq-paren mq-bracket-r'
            },
            [rightSymbol.html()]
          )
        );
      }

      return h(
        'span',
        { class: 'mq-matrix mq-non-leaf mq-bracket-container' },
        children
      );
    });

    return super.html();
  }

  private tableElement(): HTMLElement | null {
    // relink() also runs while parsing, before any DOM exists.
    const frag = this.domFrag();
    if (frag.isEmpty()) return null;
    const el = frag.oneElement();
    return el ? (el.querySelector('table') as HTMLElement | null) : null;
  }

  private rowElements(): HTMLElement[] {
    const table = this.tableElement();
    if (!table) return [];
    const trs = table.querySelectorAll('tr');
    const out: HTMLElement[] = [];
    for (let i = 0; i < trs.length; i += 1) out.push(trs[i] as HTMLElement);
    return out;
  }

  private newCell() {
    const cell = new MatrixCell();
    cell.matrix = this;
    const td = h.block('td', { class: 'mq-matrix-cell mq-empty' }, cell);
    return { cell: cell, td: td };
  }

  //
  // -*- Mutation -*-
  //

  /** Insert a new row below the row containing `afterCell`. */
  insertRowAfter(afterCell: MatrixCell, cursor?: Cursor) {
    const row = afterCell.row;
    const column = afterCell.column;
    const tr = h('tr', {}, []);
    const newCells: MatrixCell[] = [];

    let leftward: NodeRef = this.cells[row][this.columnCount - 1];
    for (let c = 0; c < this.columnCount; c += 1) {
      const created = this.newCell();
      tr.appendChild(created.td);
      created.cell.adopt(this, leftward, (leftward as MQNode)[R]);
      leftward = created.cell;
      newCells.push(created.cell);
    }

    const trs = this.rowElements();
    if (trs[row]) {
      const parentNode = trs[row].parentNode;
      if (parentNode) parentNode.insertBefore(tr, trs[row].nextSibling);
    }

    this.syncCells();
    this.relink();
    this.finishMutation(newCells[column], cursor);
    return newCells[column];
  }

  /** Insert a new column right of the column containing `afterCell`. */
  insertColumnAfter(afterCell: MatrixCell, cursor?: Cursor) {
    const column = afterCell.column;
    const row = afterCell.row;
    const trs = this.rowElements();
    const newCells: MatrixCell[] = [];

    for (let r = 0; r < this.rowCount; r += 1) {
      const created = this.newCell();
      const leftward = this.cells[r][column];
      created.cell.adopt(this, leftward, leftward[R]);
      newCells.push(created.cell);

      const tr = trs[r];
      if (tr) {
        const tds = tr.querySelectorAll('td');
        const reference = tds[column];
        if (reference) {
          tr.insertBefore(created.td, reference.nextSibling);
        } else {
          tr.appendChild(created.td);
        }
      }
    }

    this.columnCount += 1;
    this.syncCells();
    this.relink();
    this.finishMutation(newCells[row], cursor);
    return newCells[row];
  }

  /** Remove a whole row. Never removes the last remaining row. */
  deleteRow(row: number) {
    if (this.rowCount <= 1) return;
    const trs = this.rowElements();

    for (let c = 0; c < this.cells[row].length; c += 1) {
      this.cells[row][c].remove();
    }
    const tr = trs[row];
    if (tr && tr.parentNode) tr.parentNode.removeChild(tr);

    this.syncCells();
    this.relink();
  }

  /** Remove a whole column. Never removes the last remaining column. */
  deleteColumn(column: number) {
    if (this.columnCount <= 1) return;

    for (let r = 0; r < this.rowCount; r += 1) {
      this.cells[r][column].remove();
    }

    this.columnCount -= 1;
    this.syncCells();
    this.relink();
  }

  private finishMutation(cellToFocus: MatrixCell, cursor?: Cursor) {
    if (cursor) {
      cursor.insAtRightEnd(cellToFocus);
      cursor.controller.aria.alert(cellToFocus.ariaLabel);
    }
    this.bubble(function (node) {
      node.reflow();
      return undefined;
    });
  }

  private isRowEmpty(row: number) {
    for (let c = 0; c < this.cells[row].length; c += 1) {
      if (!this.cells[row][c].isEmpty()) return false;
    }
    return true;
  }

  private isColumnEmpty(column: number) {
    for (let r = 0; r < this.rowCount; r += 1) {
      if (!this.cells[r][column].isEmpty()) return false;
    }
    return true;
  }

  /**
   * Backspace/Delete out of a cell:
   * an empty matrix is removed, an empty row or column is removed,
   * otherwise the cursor moves to the neighbouring cell.
   */
  deleteOutOfCell(cell: MatrixCell, dir: Direction, cursor: Cursor) {
    if (cell.isEmpty()) {
      // An empty row or column disappears first; only a matrix that has
      // shrunk to a single empty cell is removed itself.
      if (this.rowCount > 1 && this.isRowEmpty(cell.row)) {
        const target = this.neighbourOutsideRow(cell, dir);
        this.deleteRow(cell.row);
        cursor.insAtDirEnd(target.end, target.cell);
        return;
      }

      if (this.columnCount > 1 && this.isColumnEmpty(cell.column)) {
        const target = this.neighbourOutsideColumn(cell, dir);
        this.deleteColumn(cell.column);
        cursor.insAtDirEnd(target.end, target.cell);
        return;
      }

      if (this.isEmpty()) {
        const leftward = this[L];
        const parent = this.parent;
        this.remove();
        if (leftward) cursor.insRightOf(leftward);
        else cursor.insAtLeftEnd(parent);
        return;
      }
    }

    const neighbour = cell[dir];
    if (neighbour) {
      cursor.insAtDirEnd(-dir as Direction, neighbour);
    } else {
      cursor.insDirOf(dir, this);
    }
  }

  /** Cell and cursor end to use after `cell`'s row has been removed. */
  private neighbourOutsideRow(cell: MatrixCell, dir: Direction) {
    const row = cell.row;
    if (dir === L && row > 0) {
      return { cell: this.cells[row - 1][this.columnCount - 1], end: R };
    }
    if (dir === R && row < this.rowCount - 1) {
      return { cell: this.cells[row + 1][0], end: L };
    }
    return row > 0
      ? { cell: this.cells[row - 1][this.columnCount - 1], end: R }
      : { cell: this.cells[row + 1][0], end: L };
  }

  /** Cell and cursor end to use after `cell`'s column has been removed. */
  private neighbourOutsideColumn(cell: MatrixCell, dir: Direction) {
    const row = cell.row;
    const column = cell.column;
    if (dir === L && column > 0) {
      return { cell: this.cells[row][column - 1], end: R };
    }
    if (dir === R && column < this.columnCount - 1) {
      return { cell: this.cells[row][column + 1], end: L };
    }
    return column > 0
      ? { cell: this.cells[row][column - 1], end: R }
      : { cell: this.cells[row][column + 1], end: L };
  }
}

function matrixSymbol(name: keyof typeof SVG_SYMBOLS | null) {
  if (!name) return null;
  return SVG_SYMBOLS[name];
}

LatexEnvironments.matrix = () => new Matrix('matrix');
LatexEnvironments.pmatrix = () => new Matrix('pmatrix');
LatexEnvironments.bmatrix = () => new Matrix('bmatrix');
LatexEnvironments.Bmatrix = () => new Matrix('Bmatrix');
LatexEnvironments.vmatrix = () => new Matrix('vmatrix');
LatexEnvironments.Vmatrix = () => new Matrix('Vmatrix');

/**
 * \begin{env} ... \end{env}
 *
 * Looks the environment up in the registry; unknown environments fail
 * the parse instead of being silently accepted.
 */
LatexCmds.begin = class extends MathCommand {
  parser(): Parser<MQNode | Fragment> {
    const string = Parser.string;
    const regex = Parser.regex;

    return string('{')
      .then(regex(/^[a-z]+/i))
      .skip(string('}'))
      .then(function (env) {
        const factory = LatexEnvironments[env];
        if (!factory) {
          return Parser.fail('unknown environment type: ' + env);
        }
        return factory()
          .parser()
          .skip(string('\\end{' + env + '}'));
      });
  }
};

/**
 * Normalise and validate the arguments of the public matrix API.
 * Accepts both `insertMatrix(3, 2, 'bmatrix')` and the preferred
 * `insertMatrix({ rows: 3, columns: 2, environment: 'bmatrix' })`.
 */
function normalizeMatrixInsertOptions(
  optionsOrRows: MatrixInsertOptions | number,
  columns?: number,
  environment?: string
): { rows: number; columns: number; environment: MatrixEnvironmentName } {
  const options: MatrixInsertOptions =
    typeof optionsOrRows === 'number'
      ? {
          rows: optionsOrRows,
          columns: columns as number,
          environment: environment as MatrixEnvironmentName
        }
      : optionsOrRows;

  const rows = options.rows;
  const cols = options.columns;
  const env = options.environment || 'bmatrix';

  validateMatrixDimension('rows', rows);
  validateMatrixDimension('columns', cols);

  if (!isMatrixEnvironmentName(env)) {
    throw new Error('MathQuill: unknown matrix environment: ' + env);
  }

  return { rows: rows, columns: cols, environment: env };
}

function validateMatrixDimension(name: string, value: unknown) {
  if (
    typeof value !== 'number' ||
    !isFinite(value) ||
    Math.floor(value) !== value ||
    value < 1 ||
    value > MATRIX_MAX_DIMENSION
  ) {
    throw new Error(
      'MathQuill: matrix ' +
        name +
        ' must be an integer between 1 and ' +
        MATRIX_MAX_DIMENSION +
        ', got: ' +
        value
    );
  }
}
