import { LEVEL_DEFINITION, isCellInBounds } from "./level.js";

const DIRECTIONS = Object.freeze([
  { column: 0, row: -1 },
  { column: 1, row: 0 },
  { column: 0, row: 1 },
  { column: -1, row: 0 },
  { column: 1, row: -1 },
  { column: 1, row: 1 },
  { column: -1, row: 1 },
  { column: -1, row: -1 },
]);

export function cellKey(cell) {
  return `${cell.column},${cell.row}`;
}
function cloneCell(cell) {
  return { column: cell.column, row: cell.row };
}

export function getCoverCells(level = LEVEL_DEFINITION) {
  return level.covers.flatMap((cover) => cover.cells.map(cloneCell));
}

export function getOccupiedCells(state, { excludeUnitId = null } = {}) {
  return state.units
    .filter((unit) => unit.id !== excludeUnitId)
    .map((unit) => cloneCell(unit.cell));
}

export function getBlockedCells(
  state,
  level = LEVEL_DEFINITION,
  { excludeUnitId = null } = {},
) {
  const cells = [
    ...getCoverCells(level),
    ...getOccupiedCells(state, { excludeUnitId }),
  ];
  const uniqueCells = new Map(cells.map((cell) => [cellKey(cell), cell]));
  return [...uniqueCells.values()].map(cloneCell);
}

function isDiagonal(direction) {
  return direction.column !== 0 && direction.row !== 0;
}

function diagonalSides(cell, direction) {
  return [
    { column: cell.column + direction.column, row: cell.row },
    { column: cell.column, row: cell.row + direction.row },
  ];
}

export function findReachableCells({
  level = LEVEL_DEFINITION,
  origin,
  blockedCells = [],
  maxSteps,
}) {
  if (!isCellInBounds(origin, level)) {
    throw new RangeError("Movement origin must be inside the level grid.");
  }
  if (!Number.isInteger(maxSteps) || maxSteps < 0) {
    throw new RangeError("Movement maxSteps must be a non-negative integer.");
  }

  const blocked = new Set(
    [...getCoverCells(level), ...blockedCells].map((cell) => cellKey(cell)),
  );
  blocked.delete(cellKey(origin));

  const visited = new Set([cellKey(origin)]);
  const queue = [{ cell: cloneCell(origin), path: [] }];
  const reachable = [];

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const current = queue[queueIndex];
    if (current.path.length >= maxSteps) {
      continue;
    }

    for (const direction of DIRECTIONS) {
      const next = {
        column: current.cell.column + direction.column,
        row: current.cell.row + direction.row,
      };
      const nextKey = cellKey(next);
      if (!isCellInBounds(next, level) || blocked.has(nextKey) || visited.has(nextKey)) {
        continue;
      }

      if (
        isDiagonal(direction) &&
        diagonalSides(current.cell, direction).some((side) =>
          blocked.has(cellKey(side)),
        )
      ) {
        continue;
      }

      const path = [...current.path.map(cloneCell), cloneCell(next)];
      const steps = path.length;
      const entry = {
        cell: cloneCell(next),
        steps,
        minimumActionPoints: getMinimumMovementCost(steps),
        path,
      };
      visited.add(nextKey);
      queue.push({ cell: cloneCell(next), path });
      reachable.push(entry);
    }
  }

  return reachable.sort(
    (first, second) =>
      first.steps - second.steps ||
      first.cell.row - second.cell.row ||
      first.cell.column - second.cell.column,
  );
}

export const MOVEMENT_PROFILE = Object.freeze({
  base: 3.9,
  multipliers: Object.freeze({ 1: 1, 2: 1.2, 3: 1.3 }),
});

export function getMovementAllowance(actionPoints) {
  const clampedActionPoints = Math.min(Math.max(Math.trunc(actionPoints), 0), 3);
  const multiplier = MOVEMENT_PROFILE.multipliers[clampedActionPoints];
  return multiplier ? Math.floor(MOVEMENT_PROFILE.base * multiplier) : 0;
}

export function getMinimumMovementCost(steps) {
  for (let actionPoints = 1; actionPoints <= 3; actionPoints += 1) {
    if (steps <= getMovementAllowance(actionPoints)) {
      return actionPoints;
    }
  }
  return null;
}
