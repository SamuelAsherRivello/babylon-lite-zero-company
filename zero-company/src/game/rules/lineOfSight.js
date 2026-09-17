import { LEVEL_DEFINITION, isCellInBounds } from "./level.js";

const EPSILON = 1e-9;

function segmentIntersectsCell(fromCell, targetCell, coverCell, cellSize) {
  const halfCell = cellSize / 2;
  const minimum = {
    x: coverCell.column - halfCell,
    y: coverCell.row - halfCell,
  };
  const maximum = {
    x: coverCell.column + halfCell,
    y: coverCell.row + halfCell,
  };
  const start = { x: fromCell.column, y: fromCell.row };
  const delta = {
    x: targetCell.column - fromCell.column,
    y: targetCell.row - fromCell.row,
  };
  let minimumTime = 0;
  let maximumTime = 1;

  for (const axis of ["x", "y"]) {
    if (Math.abs(delta[axis]) <= EPSILON) {
      if (start[axis] < minimum[axis] || start[axis] > maximum[axis]) {
        return false;
      }
      continue;
    }

    const inverseDelta = 1 / delta[axis];
    let entryTime = (minimum[axis] - start[axis]) * inverseDelta;
    let exitTime = (maximum[axis] - start[axis]) * inverseDelta;
    if (entryTime > exitTime) {
      [entryTime, exitTime] = [exitTime, entryTime];
    }
    minimumTime = Math.max(minimumTime, entryTime);
    maximumTime = Math.min(maximumTime, exitTime);
    if (maximumTime + EPSILON < minimumTime) {
      return false;
    }
  }

  return maximumTime >= 0 && minimumTime <= 1;
}
export function hasLineOfSight({
  level = LEVEL_DEFINITION,
  fromCell,
  targetCell,
  units: _units = [],
}) {
  if (!isCellInBounds(fromCell, level) || !isCellInBounds(targetCell, level)) {
    return false;
  }

  return !level.covers.some((cover) =>
    cover.cells.some((coverCell) =>
      segmentIntersectsCell(fromCell, targetCell, coverCell, level.cellSize),
    ),
  );
}
