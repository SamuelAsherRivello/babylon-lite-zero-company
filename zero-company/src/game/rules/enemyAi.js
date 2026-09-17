import { ACTIONS, BATTLE_PHASES, TEAMS } from "./contracts.js";
import { isCellInBounds, LEVEL_DEFINITION } from "./level.js";
import { getReachableDestinations } from "./movement.js";
import {
  createOverwatchCommitment,
  getOverwatchConeWidthRatio,
  getOverwatchDirection,
  getOverwatchHalfAngle,
  OVERWATCH_PROFILE,
} from "./overwatch.js";
import { getUnit } from "./selectors.js";
import { getAttackPreview } from "./shoot.js";

export const ENEMY_AI_LIMITS = Object.freeze({
  maxTargets: 3,
  maxDestinations: 104,
  maxPlans: 512,
});

const ACTION_ORDER = Object.freeze({
  [ACTIONS.SHOOT]: 0,
  [ACTIONS.MOVE]: 1,
  [ACTIONS.OVERWATCH]: 2,
});

function cloneCell(cell) {
  return { column: cell.column, row: cell.row };
}

function clonePath(path = []) {
  return path.map(cloneCell);
}

function findUnitCell(state, unitId) {
  const cell = state?.units?.find((unit) => unit.id === unitId)?.cell;
  return cell ? cloneCell(cell) : null;
}

function createShotIntentPreview(preview) {
  return preview
    ? {
        hitProbability: preview.hitProbability,
        maxDamage: preview.maxDamage,
        apCost: preview.apCost,
      }
    : null;
}

function expectedDamage(preview) {
  return preview.hitProbability * ((preview.minDamage + preview.maxDamage) / 2);
}

function livingPlayers(state) {
  return state.units
    .filter((unit) => unit.team === TEAMS.PLAYER && unit.health > 0)
    .slice(0, ENEMY_AI_LIMITS.maxTargets);
}

function canPlan(state, unit) {
  return (
    state.phase === BATTLE_PHASES.ENEMY &&
    state.result === null &&
    state.pendingConfirmation === null &&
    state.pendingAction === null &&
    state.pendingResolution == null &&
    unit?.id === state.activeUnitId &&
    unit.team === TEAMS.ENEMY &&
    unit.health > 0 &&
    unit.actionPoints > 0 &&
    !unit.overwatch
  );
}

function createShootStep(unitId, targetId, preview) {
  return {
    unitId,
    action: ACTIONS.SHOOT,
    targetId,
    cost: preview.apCost,
    preview,
  };
}

function createImmediateShotPlan(unit, target, preview) {
  const step = createShootStep(unit.id, target.id, preview);
  return {
    unitId: unit.id,
    action: ACTIONS.SHOOT,
    targetId: target.id,
    cost: preview.apCost,
    totalCost: preview.apCost,
    expectedDamage: expectedDamage(preview),
    preview,
    sequence: [step],
  };
}

function stateAfterPlannedMove(state, unit, destination, cost) {
  return {
    ...state,
    units: state.units.map((candidate) =>
      candidate.id === unit.id
        ? {
            ...candidate,
            cell: cloneCell(destination),
            actionPoints: candidate.actionPoints - cost,
          }
        : candidate,
    ),
  };
}

function createMoveThenShootPlan(unit, destination, target, preview) {
  const moveStep = {
    unitId: unit.id,
    action: ACTIONS.MOVE,
    destination: cloneCell(destination.cell),
    path: destination.path.map(cloneCell),
    cost: destination.minimumActionPoints,
  };
  const shootStep = createShootStep(unit.id, target.id, preview);
  return {
    unitId: unit.id,
    action: ACTIONS.MOVE,
    targetId: target.id,
    destination: cloneCell(destination.cell),
    path: destination.path.map(cloneCell),
    cost: destination.minimumActionPoints,
    totalCost: destination.minimumActionPoints + preview.apCost,
    expectedDamage: expectedDamage(preview),
    followUp: shootStep,
    sequence: [moveStep, shootStep],
  };
}

function createOverwatchPlan(unit, target) {
  const targetCell = cloneCell(target.cell);
  const direction = getOverwatchDirection(unit.cell, targetCell);
  if (!direction) {
    return null;
  }

  const step = {
    unitId: unit.id,
    action: ACTIONS.OVERWATCH,
    targetCell: cloneCell(targetCell),
    direction: { ...direction },
    range: OVERWATCH_PROFILE.range,
    widthRatio: getOverwatchConeWidthRatio(unit.actionPoints),
    halfAngle: getOverwatchHalfAngle(unit.actionPoints),
    cost: unit.actionPoints,
  };
  return {
    ...step,
    targetId: target.id,
    totalCost: unit.actionPoints,
    expectedDamage: 0,
    sequence: [step],
  };
}

function cellOrder(first, second) {
  const firstCell = first.destination ?? first.targetCell ?? { column: -1, row: -1 };
  const secondCell = second.destination ?? second.targetCell ?? {
    column: -1,
    row: -1,
  };
  return firstCell.row - secondCell.row || firstCell.column - secondCell.column;
}

function comparePlans(first, second) {
  return (
    second.expectedDamage - first.expectedDamage ||
    first.totalCost - second.totalCost ||
    String(first.targetId ?? "").localeCompare(String(second.targetId ?? "")) ||
    String(first.unitId).localeCompare(String(second.unitId)) ||
    cellOrder(first, second) ||
    ACTION_ORDER[first.action] - ACTION_ORDER[second.action]
  );
}

function approachDistance(plan, unit) {
  const targetCell = plan.targetCell;
  return Math.hypot(
    targetCell.column - unit.cell.column,
    targetCell.row - unit.cell.row,
  );
}

function compareDefensivePlans(unit) {
  return (first, second) =>
    approachDistance(first, unit) - approachDistance(second, unit) ||
    String(first.targetId).localeCompare(String(second.targetId)) ||
    cellOrder(first, second);
}

export function enumerateEnemyPlans(
  state,
  { level = LEVEL_DEFINITION, unitId = state?.activeUnitId } = {},
) {
  if (!state || !Array.isArray(state.units)) {
    throw new TypeError("enumerateEnemyPlans requires a battle state.");
  }

  const unit = getUnit(state, unitId);
  if (!canPlan(state, unit)) {
    return [];
  }

  const targets = livingPlayers(state);
  const plans = [];

  for (const target of targets) {
    const preview = getAttackPreview(state, unit.id, target.id, { level });
    if (preview.selectable) {
      plans.push(createImmediateShotPlan(unit, target, preview));
    }
  }

  const destinations = getReachableDestinations(state, unit.id, { level }).slice(
    0,
    ENEMY_AI_LIMITS.maxDestinations,
  );
  for (const destination of destinations) {
    const remainingActionPoints =
      unit.actionPoints - destination.minimumActionPoints;
    if (remainingActionPoints <= 0) {
      continue;
    }

    const movedState = stateAfterPlannedMove(
      state,
      unit,
      destination.cell,
      destination.minimumActionPoints,
    );
    for (const target of targets) {
      const preview = getAttackPreview(movedState, unit.id, target.id, { level });
      const totalCost = destination.minimumActionPoints + preview.apCost;
      if (!preview.selectable || totalCost > unit.actionPoints) {
        continue;
      }
      plans.push(createMoveThenShootPlan(unit, destination, target, preview));
      if (plans.length >= ENEMY_AI_LIMITS.maxPlans) {
        return plans.sort(comparePlans);
      }
    }
  }

  for (const target of targets) {
    const plan = createOverwatchPlan(unit, target);
    if (plan) {
      plans.push(plan);
    }
  }

  return plans.slice(0, ENEMY_AI_LIMITS.maxPlans).sort(comparePlans);
}

export function chooseEnemyPlan(
  state,
  { level = LEVEL_DEFINITION, unitId = state?.activeUnitId } = {},
) {
  const unit = state && Array.isArray(state.units) ? getUnit(state, unitId) : null;
  if (!canPlan(state, unit)) {
    return null;
  }

  const plans = enumerateEnemyPlans(state, { level, unitId });
  const attack = plans.find((plan) => plan.expectedDamage > 0);
  if (attack) {
    return attack;
  }

  const defensivePlans = plans
    .filter((plan) => plan.action === ACTIONS.OVERWATCH)
    .sort(compareDefensivePlans(unit));
  if (defensivePlans.length > 0) {
    return defensivePlans[0];
  }

  return {
    unitId: unit.id,
    action: "relinquish",
    cost: 0,
    expectedDamage: 0,
    reason: "no-useful-action",
    sequence: [],
  };
}

export function createEnemyIntentViewModel(plan, state = null) {
  if (!plan?.unitId || !plan.action) {
    return null;
  }

  const base = {
    unitId: plan.unitId,
    action: plan.action,
    cost: plan.cost ?? 0,
    totalCost: plan.totalCost ?? plan.cost ?? 0,
    targetId: plan.targetId ?? null,
    originCell: findUnitCell(state, plan.unitId),
    sequence: Array.isArray(plan.sequence)
      ? plan.sequence.map((step) => step.action)
      : [],
  };

  if (plan.action === ACTIONS.SHOOT) {
    return {
      ...base,
      targetCell: findUnitCell(state, plan.targetId),
      preview: createShotIntentPreview(plan.preview),
    };
  }

  if (plan.action === ACTIONS.MOVE) {
    const followUp = plan.followUp
      ? {
          action: plan.followUp.action,
          targetId: plan.followUp.targetId ?? null,
          targetCell: findUnitCell(state, plan.followUp.targetId),
          cost: plan.followUp.cost ?? 0,
          preview: createShotIntentPreview(plan.followUp.preview),
        }
      : null;

    return {
      ...base,
      destination: plan.destination ? cloneCell(plan.destination) : null,
      path: clonePath(plan.path),
      followUp,
    };
  }

  if (plan.action === ACTIONS.OVERWATCH) {
    return {
      ...base,
      targetCell: plan.targetCell ? cloneCell(plan.targetCell) : null,
      direction: plan.direction ? { ...plan.direction } : null,
      range: plan.range ?? OVERWATCH_PROFILE.range,
      widthRatio: plan.widthRatio ?? null,
      halfAngle: plan.halfAngle ?? null,
    };
  }

  return {
    ...base,
    reason: plan.reason ?? null,
  };
}

function rejectEnemyOverwatch(state, plan, reason) {
  return {
    accepted: false,
    reason,
    state,
    cost: 0,
    commitment: null,
    events: [
      {
        type: "enemy-overwatch-rejected",
        unitId: plan?.unitId ?? null,
        reason,
      },
    ],
  };
}

function directionMatches(first, second) {
  const length = Math.hypot(first?.column ?? 0, first?.row ?? 0);
  return (
    Math.abs(length - 1) < 1e-9 &&
    Math.abs(first.column - second.column) < 1e-9 &&
    Math.abs(first.row - second.row) < 1e-9
  );
}

export function resolveEnemyOverwatch(
  state,
  plan,
  { level = LEVEL_DEFINITION } = {},
) {
  if (!state || !Array.isArray(state.units)) {
    throw new TypeError("resolveEnemyOverwatch requires a battle state.");
  }
  if (state.phase !== BATTLE_PHASES.ENEMY || state.result !== null) {
    return rejectEnemyOverwatch(state, plan, "wrong-phase");
  }
  if (!plan || plan.action !== ACTIONS.OVERWATCH) {
    return rejectEnemyOverwatch(state, plan, "invalid-overwatch-plan");
  }

  const unit = getUnit(state, plan.unitId);
  if (!unit || unit.team !== TEAMS.ENEMY) {
    return rejectEnemyOverwatch(state, plan, "invalid-enemy");
  }
  if (unit.id !== state.activeUnitId) {
    return rejectEnemyOverwatch(state, plan, "enemy-not-active");
  }
  if (unit.health <= 0) {
    return rejectEnemyOverwatch(state, plan, "enemy-dead");
  }
  if (unit.actionPoints <= 0) {
    return rejectEnemyOverwatch(state, plan, "insufficient-action-points");
  }
  if (unit.overwatch) {
    return rejectEnemyOverwatch(state, plan, "enemy-locked");
  }
  if (
    state.pendingConfirmation !== null ||
    state.pendingAction !== null ||
    state.pendingResolution != null
  ) {
    return rejectEnemyOverwatch(state, plan, "resolution-pending");
  }
  if (!isCellInBounds(plan.targetCell, level)) {
    return rejectEnemyOverwatch(state, plan, "invalid-target-cell");
  }

  const direction = getOverwatchDirection(unit.cell, plan.targetCell);
  if (!direction) {
    return rejectEnemyOverwatch(state, plan, "invalid-overwatch-direction");
  }
  const suppliedDirectionLength = Math.hypot(
    plan.direction?.column ?? 0,
    plan.direction?.row ?? 0,
  );
  if (suppliedDirectionLength <= 1e-9) {
    return rejectEnemyOverwatch(state, plan, "invalid-overwatch-direction");
  }
  if (!directionMatches(plan.direction, direction)) {
    return rejectEnemyOverwatch(state, plan, "overwatch-direction-mismatch");
  }
  if (plan.cost !== unit.actionPoints) {
    return rejectEnemyOverwatch(state, plan, "overwatch-cost-mismatch");
  }

  const pendingAction = {
    unitId: unit.id,
    action: ACTIONS.OVERWATCH,
    targetCell: cloneCell(plan.targetCell),
    direction: { ...direction },
  };
  const commitment = createOverwatchCommitment(unit, pendingAction);
  const units = state.units.map((candidate) =>
    candidate.id === unit.id
      ? {
          ...candidate,
          actionPoints: 0,
          activity: null,
          overwatch: commitment,
        }
      : candidate,
  );
  const intent = {
    type: "enemy-intent-declared",
    unitId: unit.id,
    action: ACTIONS.OVERWATCH,
    cost: commitment.committedActionPoints,
    targetCell: cloneCell(commitment.targetCell),
    direction: { ...commitment.direction },
  };
  const committed = {
    type: "overwatch-committed",
    unitId: unit.id,
    team: TEAMS.ENEMY,
    cost: commitment.committedActionPoints,
    shotsRemaining: commitment.shotsRemaining,
    originCell: cloneCell(commitment.originCell),
    targetCell: cloneCell(commitment.targetCell),
    direction: { ...commitment.direction },
    range: commitment.range,
    widthRatio: commitment.widthRatio,
    halfAngle: commitment.halfAngle,
  };

  return {
    accepted: true,
    state: {
      ...state,
      units,
      pendingAction: null,
    },
    cost: commitment.committedActionPoints,
    commitment: {
      ...commitment,
      originCell: cloneCell(commitment.originCell),
      targetCell: cloneCell(commitment.targetCell),
      direction: { ...commitment.direction },
    },
    events: [intent, committed],
  };
}
