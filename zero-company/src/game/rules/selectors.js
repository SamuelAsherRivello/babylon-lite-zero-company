import {
  ACTIONS,
  BATTLE_PHASES,
  TEAMS,
  UNIT_STATUSES,
} from "./contracts.js";
import { getWeaponDefinition } from "./weapons.js";

function normalizeActivity(activity) {
  return String(activity ?? "").toLowerCase().replaceAll("_", "-");
}

export function deriveUnitStatus(unit) {
  if (!unit || unit.health <= 0) {
    return UNIT_STATUSES.DEAD;
  }

  const activity = normalizeActivity(unit.activity);
  if (activity === "taking-damage") {
    return UNIT_STATUSES.TAKING_DAMAGE;
  }
  if (activity === "moving") {
    return UNIT_STATUSES.MOVING;
  }
  if (activity === "shooting") {
    return UNIT_STATUSES.SHOOTING;
  }
  if (unit.overwatch) {
    return UNIT_STATUSES.OVERWATCH;
  }
  return UNIT_STATUSES.IDLE;
}

export function getUnit(state, unitId) {
  return state.units.find((unit) => unit.id === unitId) ?? null;
}

export function getAvailableActions(state, unitId) {
  const unit = getUnit(state, unitId);
  const canAct =
    state.phase === BATTLE_PHASES.PLAYER &&
    state.result === null &&
    state.pendingConfirmation === null &&
    unit?.team === TEAMS.PLAYER &&
    unit.health > 0 &&
    unit.actionPoints > 0 &&
    !unit.overwatch;

  if (!canAct) {
    return [];
  }

  const actions = [ACTIONS.MOVE];
  const weapon = getWeaponDefinition(unit.weaponId);
  if (weapon && unit.actionPoints >= weapon.apCost) {
    actions.push(ACTIONS.SHOOT);
  }
  actions.push(ACTIONS.OVERWATCH);
  return actions;
}

export function getUnitInspection(state, unitId) {
  const unit = getUnit(state, unitId);
  if (!unit) {
    return null;
  }

  return {
    id: unit.id,
    team: unit.team,
    label: unit.label,
    weaponId: unit.weaponId,
    health: unit.health,
    maxHealth: unit.maxHealth,
    actionPoints: unit.actionPoints,
    status: deriveUnitStatus(unit),
    overwatch: unit.overwatch
      ? {
          ...unit.overwatch,
          originCell: { ...unit.overwatch.originCell },
          targetCell: { ...unit.overwatch.targetCell },
          direction: { ...unit.overwatch.direction },
        }
      : null,
    cell: { ...unit.cell },
    availableActions: getAvailableActions(state, unitId),
  };
}

function cellCoordinates(cell) {
  if (Array.isArray(cell)) {
    return { column: cell[0], row: cell[1] };
  }
  return cell;
}

export function cellsEqual(first, second) {
  const firstCell = cellCoordinates(first);
  const secondCell = cellCoordinates(second);
  return (
    firstCell?.column === secondCell?.column && firstCell?.row === secondCell?.row
  );
}

export function isCellOccupied(state, cell, { excludeUnitId = null } = {}) {
  return state.units.some(
    (unit) => unit.id !== excludeUnitId && cellsEqual(unit.cell, cell),
  );
}

export function hasUsablePlayerActionPoints(state) {
  return state.units.some(
    (unit) =>
      unit.team === TEAMS.PLAYER &&
      unit.health > 0 &&
      unit.actionPoints > 0 &&
      !unit.overwatch,
  );
}

export function getLivingUnitIds(state, team) {
  return state.units
    .filter((unit) => unit.team === team && unit.health > 0)
    .map((unit) => unit.id);
}
