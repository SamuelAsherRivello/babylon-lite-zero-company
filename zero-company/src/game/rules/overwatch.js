import { BATTLE_PHASES, TEAMS } from "./contracts.js";
import { applyTerminalResult } from "./battleResult.js";
import { queryAttack, resolveAttack } from "./combat.js";
import { LEVEL_DEFINITION } from "./level.js";

export const OVERWATCH_PROFILE = Object.freeze({
  range: 6,
  halfAngle: Math.PI / 4,
});

const EPSILON = 1e-9;

function cloneCell(cell) {
  return { column: cell.column, row: cell.row };
}

function normalizeComponent(value) {
  return Object.is(value, -0) ? 0 : value;
}

export function getOverwatchDirection(originCell, targetCell) {
  const column = targetCell.column - originCell.column;
  const row = targetCell.row - originCell.row;
  const length = Math.hypot(column, row);

  if (length === 0) {
    return null;
  }

  return {
    column: normalizeComponent(column / length),
    row: normalizeComponent(row / length),
  };
}

export function createOverwatchCommitment(unit, pendingAction) {
  const committedActionPoints = unit.actionPoints;

  return {
    ownerId: unit.id,
    originCell: cloneCell(unit.cell),
    targetCell: cloneCell(pendingAction.targetCell),
    direction: { ...pendingAction.direction },
    range: OVERWATCH_PROFILE.range,
    halfAngle: OVERWATCH_PROFILE.halfAngle,
    committedActionPoints,
    shotsRemaining: committedActionPoints,
  };
}

export function isCellInOverwatchCone(commitment, cell) {
  if (!commitment?.originCell || !commitment?.direction || !cell) {
    return false;
  }

  const column = cell.column - commitment.originCell.column;
  const row = cell.row - commitment.originCell.row;
  const distance = Math.hypot(column, row);
  if (distance <= EPSILON || distance + EPSILON >= commitment.range) {
    return false;
  }

  const directionLength = Math.hypot(
    commitment.direction.column,
    commitment.direction.row,
  );
  if (directionLength <= EPSILON) {
    return false;
  }

  const dot =
    (column * commitment.direction.column + row * commitment.direction.row) /
    (distance * directionLength);
  return dot + EPSILON >= Math.cos(commitment.halfAngle);
}

function phaseForTeam(team) {
  return team === TEAMS.PLAYER
    ? BATTLE_PHASES.PLAYER
    : team === TEAMS.ENEMY
      ? BATTLE_PHASES.ENEMY
      : null;
}

function ineligible(reason, preview = null) {
  return { eligible: false, reason, preview };
}

export function getOverwatchReactionEligibility(
  state,
  {
    reactorId,
    moverId,
    completedCell,
    level = LEVEL_DEFINITION,
  },
) {
  if (state.result !== null || state.phase === BATTLE_PHASES.RESULT) {
    return ineligible("battle-complete");
  }

  const reactor = state.units.find((unit) => unit.id === reactorId);
  const mover = state.units.find((unit) => unit.id === moverId);
  if (!reactor) {
    return ineligible("unknown-reactor");
  }
  if (!mover) {
    return ineligible("unknown-mover");
  }
  if (reactor.health <= 0) {
    return ineligible("reactor-dead");
  }
  if (mover.health <= 0) {
    return ineligible("mover-dead");
  }
  if (!reactor.overwatch) {
    return ineligible("overwatch-not-committed");
  }
  if (reactor.overwatch.shotsRemaining <= 0) {
    return ineligible("overwatch-exhausted");
  }
  if (reactor.team === mover.team) {
    return ineligible("mover-not-opposing");
  }
  if (state.phase !== phaseForTeam(mover.team)) {
    return ineligible("not-opponent-phase");
  }
  if (!isCellInOverwatchCone(reactor.overwatch, completedCell)) {
    return ineligible("outside-overwatch-cone");
  }

  const preview = queryAttack({
    level,
    weaponId: reactor.weaponId,
    shooterCell: reactor.cell,
    targetCell: completedCell,
    units: state.units,
  });
  if (preview.blocked) {
    return ineligible("line-of-sight-blocked", preview);
  }
  if (!preview.selectable) {
    return ineligible("attack-not-selectable", preview);
  }

  return {
    eligible: true,
    reason: null,
    reactorId,
    moverId,
    preview,
  };
}

function clonePath(path) {
  return path.map(cloneCell);
}

function noReactions(state, remainingPath) {
  return {
    state,
    reactions: [],
    events: [],
    movementStopped: false,
    remainingPath: clonePath(remainingPath),
  };
}

function reactionEvents({
  reactor,
  mover,
  resolution,
  previousHealth,
  health,
  remainingShots,
  completedCell,
}) {
  const shared = {
    reactorId: reactor.id,
    moverId: mover.id,
    shooterId: reactor.id,
    targetId: mover.id,
  };
  const events = [
    {
      type: "overwatch-reaction-started",
      ...shared,
      completedCell: cloneCell(completedCell),
      preview: resolution.preview,
    },
  ];

  if (resolution.hit) {
    events.push(
      {
        type: "shot-hit",
        ...shared,
        reaction: true,
        hitRoll: resolution.hitRoll,
        hitProbability: resolution.preview.hitProbability,
        damage: resolution.damage,
      },
      {
        type: "unit-damaged",
        unitId: mover.id,
        sourceUnitId: reactor.id,
        reaction: true,
        amount: resolution.damage,
        previousHealth,
        health,
      },
    );
    if (health === 0) {
      events.push({
        type: "unit-defeated",
        unitId: mover.id,
        sourceUnitId: reactor.id,
        reaction: true,
      });
    }
  } else {
    events.push({
      type: "shot-missed",
      ...shared,
      reaction: true,
      hitRoll: resolution.hitRoll,
      hitProbability: resolution.preview.hitProbability,
    });
  }

  events.push({
    type: "overwatch-reaction-resolved",
    ...shared,
    hit: resolution.hit,
    damage: resolution.damage,
    remainingShots,
  });
  return events;
}

export function resolveOverwatchReactions(
  state,
  {
    moverId,
    completedCell,
    remainingPath = [],
    stepCompleted = false,
    level = LEVEL_DEFINITION,
  },
) {
  if (!stepCompleted) {
    return noReactions(state, remainingPath);
  }

  const mover = state.units.find((unit) => unit.id === moverId);
  if (!mover || mover.health <= 0) {
    return noReactions(state, remainingPath);
  }

  let nextState = state;
  const reactions = [];
  const events = [];
  let movementStopped = false;
  let nextRemainingPath = clonePath(remainingPath);

  for (const rosterUnit of state.units) {
    const eligibility = getOverwatchReactionEligibility(nextState, {
      reactorId: rosterUnit.id,
      moverId,
      completedCell,
      level,
    });
    if (!eligibility.eligible) {
      continue;
    }

    const reactor = nextState.units.find((unit) => unit.id === rosterUnit.id);
    const currentMover = nextState.units.find((unit) => unit.id === moverId);
    const resolution = resolveAttack({
      level,
      weaponId: reactor.weaponId,
      shooterCell: reactor.cell,
      targetCell: completedCell,
      units: nextState.units,
      randomSource: nextState.random,
    });
    const remainingShots = reactor.overwatch.shotsRemaining - 1;
    const health = Math.max(0, currentMover.health - resolution.damage);
    const defeated = health === 0;
    const units = nextState.units.map((unit) => {
      if (unit.id === reactor.id) {
        return {
          ...unit,
          activity: null,
          overwatch: {
            ...unit.overwatch,
            shotsRemaining: remainingShots,
          },
        };
      }
      if (unit.id === moverId) {
        return {
          ...unit,
          health,
          activity: defeated ? null : unit.activity,
          overwatch: defeated ? null : unit.overwatch,
        };
      }
      return unit;
    });
    const reaction = {
      reactorId: reactor.id,
      moverId,
      completedCell: cloneCell(completedCell),
      preview: resolution.preview,
      hit: resolution.hit,
      damage: resolution.damage,
      hitRoll: resolution.hitRoll,
      damageRoll: resolution.damageRoll,
      remainingShots,
    };
    reactions.push(reaction);
    events.push(
      ...reactionEvents({
        reactor,
        mover: currentMover,
        resolution,
        previousHealth: currentMover.health,
        health,
        remainingShots,
        completedCell,
      }),
    );

    nextState = {
      ...nextState,
      units,
      random: resolution.randomSource,
    };

    if (defeated) {
      movementStopped = true;
      nextRemainingPath = [];
      nextState = {
        ...nextState,
        pendingAction: null,
        pendingResolution: null,
      };
      events.push({
        type: "movement-interrupted",
        unitId: moverId,
        reason: "unit-defeated",
      });
      const terminal = applyTerminalResult(nextState);
      nextState = terminal.state;
      events.push(...terminal.events);
      break;
    }
  }

  if (reactions.length === 0) {
    return noReactions(state, remainingPath);
  }

  return {
    state: nextState,
    reactions,
    events,
    movementStopped,
    remainingPath: nextRemainingPath,
  };
}
