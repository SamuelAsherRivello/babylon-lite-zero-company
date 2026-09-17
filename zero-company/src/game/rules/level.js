function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
function coverCells(firstColumn) {
  return [
    { column: firstColumn, row: 3 },
    { column: firstColumn + 1, row: 3 },
    { column: firstColumn, row: 4 },
    { column: firstColumn + 1, row: 4 },
  ];
}

export const LEVEL_DEFINITION = deepFreeze({
  id: "greybox-01",
  columns: 13,
  rows: 8,
  cellSize: 1,
  arenaTop: 0.3,
  starts: {
    "player-1": { column: 2, row: 1 },
    "player-2": { column: 6, row: 1 },
    "player-3": { column: 10, row: 1 },
    "enemy-1": { column: 2, row: 6 },
    "enemy-2": { column: 6, row: 6 },
    "enemy-3": { column: 10, row: 6 },
  },
  covers: [
    { id: "cover-left", cells: coverCells(1) },
    { id: "cover-center", cells: coverCells(5) },
    { id: "cover-right", cells: coverCells(10) },
  ],
});

export function isCellInBounds(cell, level = LEVEL_DEFINITION) {
  return (
    Number.isInteger(cell?.column) &&
    Number.isInteger(cell?.row) &&
    cell.column >= 0 &&
    cell.column < level.columns &&
    cell.row >= 0 &&
    cell.row < level.rows
  );
}

export function cellToWorld(cell, level = LEVEL_DEFINITION) {
  if (!isCellInBounds(cell, level)) {
    throw new RangeError("Cell must be inside the level grid.");
  }
  return {
    x: (cell.column - 6) * level.cellSize,
    y: level.arenaTop,
    z: (cell.row - 3.5) * level.cellSize,
  };
}

export function worldToCell(position, level = LEVEL_DEFINITION) {
  const cell = {
    column: Math.round(position.x / level.cellSize + 6),
    row: Math.round(position.z / level.cellSize + 3.5),
  };
  return isCellInBounds(cell, level) ? cell : null;
}
