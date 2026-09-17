import { BATTLE_PHASES, TEAMS } from "./contracts.js";
import {
  cellKey,
  findReachableCells,
  getBlockedCells,
  getMovementAllowance,
} from "./grid.js";
import { LEVEL_DEFINITION } from "./level.js";
import { getUnit } from "./selectors.js";

function cloneCell(cell) {
  return { column: cell.column, row: cell.row };
}
function reject(state, reason) {
  return {
    accepted: false,
    reason,
    state,
    cost: 0,
    path: [],
    events: [{ type: "move-rejected", reason }],
  };
}

function canMoveInCurrentPhase(state, unit) {
  if (state.result !== null || state.pendingConfirmation !== null) {
    return false;
  }
  if (state.phase === BATTLE_PHASES.PLAYER) {
    return unit.team === TEAMS.PLAYER;
  }
  if (state.phase === BATTLE_PHASES.ENEMY) {
    return unit.team === TEAMS.ENEMY && state.activeUnitId === unit.id;
  }
  return false;
}

export function getReachableDestinations(
  state,
  unitId,
  { level = LEVEL_DEFINITION } = {},
) {
  const unit = getUnit(state, unitId);
  if (!unit || unit.health <= 0 || unit.actionPoints <= 0 || unit.overwatch) {
    return [];
  }

  const spendableActionPoints = Math.min(unit.actionPoints, 3);
  const blockedCells = getBlockedCells(state, level, { excludeUnitId: unitId });
  return findReachableCells({
    level,
    origin: unit.cell,
    blockedCells,
    maxSteps: getMovementAllowance(spendableActionPoints),
  }).filter(
    (destination) => destination.minimumActionPoints <= spendableActionPoints,
  );
}

export function resolveMove(
  state,
  { unitId, destination, level = LEVEL_DEFINITION },
) {
  const unit = getUnit(state, unitId);
  if (!unit) {
    return reject(state, "unknown-unit");
  }
  if (unit.health <= 0) {
    return reject(state, "unit-dead");
  }
  if (!canMoveInCurrentPhase(state, unit)) {
    return reject(state, "wrong-phase");
  }

  const reachable = getReachableDestinations(state, unitId, { level });
  const selected = reachable.find(
    (entry) => cellKey(entry.cell) === cellKey(destination),
  );
  if (!selected) {
    return reject(state, "destination-not-reachable");
  }

  const from = cloneCell(unit.cell);
  const path = selected.path.map(cloneCell);
  const remainingActionPoints = unit.actionPoints - selected.minimumActionPoints;
  const units = state.units.map((candidate) =>
    candidate.id === unitId
      ? {
          ...candidate,
          cell: cloneCell(selected.cell),
          actionPoints: remainingActionPoints,
          activity: null,
        }
      : candidate,
  );
  const stepEvents = path.map((cell, index) => ({
    type: "move-step",
    unitId,
    step: index + 1,
    totalSteps: path.length,
    from: index === 0 ? cloneCell(from) : cloneCell(path[index - 1]),
    to: cloneCell(cell),
  }));

  return {
    accepted: true,
    state: {
      ...state,
      units,
      pendingAction: null,
    },
    cost: selected.minimumActionPoints,
    path,
    events: [
      {
        type: "move-started",
        unitId,
        from,
        destination: cloneCell(selected.cell),
        cost: selected.minimumActionPoints,
        path: path.map(cloneCell),
      },
      ...stepEvents,
      {
        type: "move-completed",
        unitId,
        destination: cloneCell(selected.cell),
        cost: selected.minimumActionPoints,
        remainingActionPoints,
      },
    ],
  };
}
