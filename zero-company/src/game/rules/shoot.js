import { BATTLE_PHASES, TEAMS } from "./contracts.js";
import { applyTerminalResult } from "./battleResult.js";
import { queryAttack, resolveAttack } from "./combat.js";
import { LEVEL_DEFINITION } from "./level.js";
import { getUnit } from "./selectors.js";
import { getWeaponDefinition } from "./weapons.js";

function unavailablePreview({
  shooterId,
  targetId,
  weaponId = null,
  apCost = 0,
  availableActionPoints = 0,
  reason,
}) {
  return {
    shooterId,
    targetId,
    weaponId,
    apCost,
    availableActionPoints,
    distance: null,
    blocked: false,
    hasLineOfSight: false,
    selectable: false,
    hitProbability: 0,
    minDamage: 0,
    maxDamage: 0,
    reason,
  };
}

function shooterAvailabilityReason(state, shooter) {
  if (state.result !== null) {
    return "battle-complete";
  }
  if (state.pendingConfirmation !== null) {
    return "input-locked";
  }
  if (shooter.health <= 0) {
    return "shooter-dead";
  }
  if (shooter.overwatch) {
    return "shooter-locked";
  }
  if (
    state.phase === BATTLE_PHASES.PLAYER &&
    shooter.team === TEAMS.PLAYER
  ) {
    return null;
  }
  if (
    state.phase === BATTLE_PHASES.ENEMY &&
    shooter.team === TEAMS.ENEMY &&
    state.activeUnitId === shooter.id
  ) {
    return null;
  }
  return "shooter-not-active";
}

export function getAttackPreview(
  state,
  shooterId,
  targetId,
  { level = LEVEL_DEFINITION } = {},
) {
  const shooter = getUnit(state, shooterId);
  const target = getUnit(state, targetId);
  const weapon = shooter ? getWeaponDefinition(shooter.weaponId) : null;
  const context = {
    shooterId,
    targetId,
    weaponId: shooter?.weaponId ?? null,
    apCost: weapon?.apCost ?? 0,
    availableActionPoints: shooter?.actionPoints ?? 0,
  };

  if (!shooter) {
    return unavailablePreview({ ...context, reason: "unknown-shooter" });
  }
  if (!weapon) {
    return unavailablePreview({ ...context, reason: "unknown-weapon" });
  }

  const shooterReason = shooterAvailabilityReason(state, shooter);
  if (shooterReason) {
    return unavailablePreview({ ...context, reason: shooterReason });
  }
  if (!target) {
    return unavailablePreview({ ...context, reason: "unknown-target" });
  }
  if (target.team === shooter.team) {
    return unavailablePreview({ ...context, reason: "target-not-opposing" });
  }
  if (target.health <= 0) {
    return unavailablePreview({ ...context, reason: "target-dead" });
  }
  if (shooter.actionPoints < weapon.apCost) {
    return unavailablePreview({
      ...context,
      reason: "insufficient-action-points",
    });
  }

  const combatPreview = queryAttack({
    level,
    weaponId: shooter.weaponId,
    shooterCell: shooter.cell,
    targetCell: target.cell,
    units: state.units,
  });
  const reason = combatPreview.blocked
    ? "line-of-sight-blocked"
    : combatPreview.selectable
      ? null
      : "target-not-selectable";

  return {
    ...combatPreview,
    shooterId,
    targetId,
    availableActionPoints: shooter.actionPoints,
    selectable: combatPreview.selectable && reason === null,
    reason,
  };
}

function rejectShot(state, shooterId, targetId, reason, preview = null) {
  return {
    accepted: false,
    reason,
    state,
    cost: 0,
    hit: false,
    damage: 0,
    preview,
    events: [
      { type: "shot-rejected", shooterId, targetId, reason },
    ],
  };
}

function playerIsTargetingShoot(state, shooterId) {
  return (
    state.pendingAction?.unitId === shooterId &&
    state.pendingAction?.action === "shoot"
  );
}

export function resolveShoot(
  state,
  { shooterId, targetId, level = LEVEL_DEFINITION },
) {
  if (
    state.phase === BATTLE_PHASES.PLAYER &&
    !playerIsTargetingShoot(state, shooterId)
  ) {
    return rejectShot(state, shooterId, targetId, "shoot-not-targeting");
  }

  const preview = getAttackPreview(state, shooterId, targetId, { level });
  if (!preview.selectable) {
    return rejectShot(state, shooterId, targetId, preview.reason, preview);
  }

  const shooter = getUnit(state, shooterId);
  const target = getUnit(state, targetId);
  const resolution = resolveAttack({
    level,
    weaponId: shooter.weaponId,
    shooterCell: shooter.cell,
    targetCell: target.cell,
    units: state.units,
    randomSource: state.random,
  });
  const targetHealth = Math.max(0, target.health - resolution.damage);
  const defeated = targetHealth === 0 && target.health > 0;
  const remainingActionPoints = shooter.actionPoints - preview.apCost;
  const units = state.units.map((unit) => {
    if (unit.id === shooterId) {
      return {
        ...unit,
        actionPoints: remainingActionPoints,
        activity: null,
      };
    }
    if (unit.id === targetId) {
      return {
        ...unit,
        health: targetHealth,
        activity: null,
        overwatch: defeated ? null : unit.overwatch,
      };
    }
    return unit;
  });
  const events = [
    {
      type: "shot-started",
      shooterId,
      targetId,
      cost: preview.apCost,
      preview,
    },
  ];

  if (!resolution.hit) {
    events.push({
      type: "shot-missed",
      shooterId,
      targetId,
      hitRoll: resolution.hitRoll,
      hitProbability: preview.hitProbability,
    });
  } else {
    events.push(
      {
        type: "shot-hit",
        shooterId,
        targetId,
        hitRoll: resolution.hitRoll,
        hitProbability: preview.hitProbability,
        damage: resolution.damage,
      },
      {
        type: "unit-damaged",
        unitId: targetId,
        sourceUnitId: shooterId,
        amount: resolution.damage,
        previousHealth: target.health,
        health: targetHealth,
      },
    );
    if (defeated) {
      events.push({
        type: "unit-defeated",
        unitId: targetId,
        sourceUnitId: shooterId,
      });
    }
  }

  events.push({
    type: "shot-resolved",
    shooterId,
    targetId,
    hit: resolution.hit,
    damage: resolution.damage,
    remainingActionPoints,
  });

  const resolvedState = {
    ...state,
    units,
    random: resolution.randomSource,
    pendingAction: null,
  };
  const terminal = applyTerminalResult(resolvedState);
  events.push(...terminal.events);

  return {
    accepted: true,
    state: terminal.state,
    cost: preview.apCost,
    hit: resolution.hit,
    damage: resolution.damage,
    preview,
    events,
  };
}
