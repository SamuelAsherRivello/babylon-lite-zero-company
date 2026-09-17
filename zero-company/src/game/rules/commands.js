import {
  ACTIONS,
  BATTLE_PHASES,
  COMMANDS,
  END_TURN_CONFIRMATION,
  MAX_ACTION_POINTS,
  TEAMS,
} from "./contracts.js";
import {
  getAvailableActions,
  getLivingUnitIds,
  getUnit,
  hasUsablePlayerActionPoints,
} from "./selectors.js";
import { isCellInBounds } from "./level.js";
import {
  createOverwatchCommitment,
  getOverwatchDirection,
} from "./overwatch.js";
import { restartBattle } from "./state.js";

function event(type, details = {}) {
  return { type, ...details };
}

function accepted(state, events = []) {
  return { accepted: true, state, events };
}

function rejected(state, command, reason) {
  return {
    accepted: false,
    reason,
    state,
    events: [event("command-rejected", { command: command?.type ?? null, reason })],
  };
}

function refreshSide(units, team) {
  return units.map((unit) => {
    if (unit.team !== team) {
      return unit;
    }
    return {
      ...unit,
      actionPoints: unit.health > 0 ? MAX_ACTION_POINTS : 0,
      activity: null,
      overwatch: null,
    };
  });
}

function beginEnemyTurn(state) {
  const units = refreshSide(state.units, TEAMS.ENEMY);
  const activationOrder = getLivingUnitIds({ ...state, units }, TEAMS.ENEMY);
  const activeUnitId = activationOrder[0] ?? null;
  const events = [
    event("phase-changed", { phase: BATTLE_PHASES.ENEMY }),
    event("action-points-refreshed", {
      team: TEAMS.ENEMY,
      amount: MAX_ACTION_POINTS,
    }),
  ];

  if (activeUnitId) {
    events.push(event("enemy-activation-started", { unitId: activeUnitId }));
  }

  return accepted(
    {
      ...state,
      phase: BATTLE_PHASES.ENEMY,
      units,
      activeUnitId,
      enemyActivationOrder: activationOrder,
      enemyActivationIndex: activeUnitId ? 0 : -1,
      pendingConfirmation: null,
      pendingAction: null,
    },
    events,
  );
}

function beginPlayerTurn(state, priorEvents = []) {
  return accepted(
    {
      ...state,
      phase: BATTLE_PHASES.PLAYER,
      round: state.round + 1,
      units: refreshSide(state.units, TEAMS.PLAYER),
      activeUnitId: null,
      enemyActivationOrder: [],
      enemyActivationIndex: -1,
      pendingConfirmation: null,
      pendingAction: null,
    },
    [
      ...priorEvents,
      event("phase-changed", { phase: BATTLE_PHASES.PLAYER }),
      event("action-points-refreshed", {
        team: TEAMS.PLAYER,
        amount: MAX_ACTION_POINTS,
      }),
    ],
  );
}

function requestEndTurn(state, command) {
  if (state.phase !== BATTLE_PHASES.PLAYER || state.result !== null) {
    return rejected(state, command, "wrong-phase");
  }

  if (hasUsablePlayerActionPoints(state)) {
    return accepted(
      {
        ...state,
        pendingConfirmation: END_TURN_CONFIRMATION,
      },
      [event("end-turn-confirmation-requested")],
    );
  }

  return beginEnemyTurn(state);
}

function confirmEndTurn(state, command) {
  if (
    state.phase !== BATTLE_PHASES.PLAYER ||
    state.pendingConfirmation !== END_TURN_CONFIRMATION
  ) {
    return rejected(state, command, "confirmation-not-pending");
  }
  return beginEnemyTurn(state);
}

function cancelEndTurn(state, command) {
  if (
    state.phase !== BATTLE_PHASES.PLAYER ||
    state.pendingConfirmation !== END_TURN_CONFIRMATION
  ) {
    return rejected(state, command, "confirmation-not-pending");
  }
  return accepted(
    { ...state, pendingConfirmation: null },
    [event("end-turn-confirmation-cancelled")],
  );
}

function beginAction(state, command) {
  if (!Object.values(ACTIONS).includes(command.action)) {
    return rejected(state, command, "unknown-action");
  }

  const priorAction = state.pendingAction;
  if (
    command.action === ACTIONS.OVERWATCH &&
    priorAction?.unitId === command.unitId &&
    priorAction.action === ACTIONS.OVERWATCH
  ) {
    return confirmOverwatch(state, command);
  }

  if (!getAvailableActions(state, command.unitId).includes(command.action)) {
    return rejected(state, command, "action-not-available");
  }

  const events = [];
  if (
    priorAction &&
    (priorAction.unitId !== command.unitId || priorAction.action !== command.action)
  ) {
    events.push(
      event("action-targeting-cancelled", {
        unitId: priorAction.unitId,
        action: priorAction.action,
        reason:
          priorAction.unitId === command.unitId
            ? "action-switched"
            : "selection-changed",
        ...(priorAction.unitId === command.unitId
          ? {}
          : { selectedUnitId: command.unitId }),
      }),
    );
  }
  events.push(
    event("action-targeting-started", {
      unitId: command.unitId,
      action: command.action,
    }),
  );

  return accepted(
    {
      ...state,
      selectedUnitId: command.unitId,
      pendingAction:
        command.action === ACTIONS.OVERWATCH
          ? {
              unitId: command.unitId,
              action: command.action,
              targetCell: null,
              direction: null,
            }
          : { unitId: command.unitId, action: command.action },
    },
    events,
  );
}

function aimOverwatch(state, command) {
  if (state.phase !== BATTLE_PHASES.PLAYER || state.result !== null) {
    return rejected(state, command, "wrong-phase");
  }
  if (state.pendingConfirmation !== null) {
    return rejected(state, command, "input-locked");
  }

  const pendingAction = state.pendingAction;
  if (
    pendingAction?.action !== ACTIONS.OVERWATCH ||
    pendingAction.unitId !== command.unitId
  ) {
    return rejected(state, command, "overwatch-not-targeting");
  }
  if (!isCellInBounds(command.targetCell)) {
    return rejected(state, command, "invalid-target-cell");
  }

  const unit = getUnit(state, command.unitId);
  const direction = getOverwatchDirection(unit.cell, command.targetCell);
  if (!direction) {
    return rejected(state, command, "invalid-overwatch-direction");
  }

  const targetCell = { ...command.targetCell };
  return accepted(
    {
      ...state,
      pendingAction: {
        ...pendingAction,
        targetCell,
        direction,
      },
    },
    [
      event("overwatch-preview-updated", {
        unitId: unit.id,
        targetCell,
        direction: { ...direction },
      }),
    ],
  );
}

function confirmOverwatch(state, command) {
  if (state.phase !== BATTLE_PHASES.PLAYER || state.result !== null) {
    return rejected(state, command, "wrong-phase");
  }
  if (state.pendingConfirmation !== null) {
    return rejected(state, command, "input-locked");
  }

  const pendingAction = state.pendingAction;
  const unitId = command.unitId ?? pendingAction?.unitId;
  if (
    pendingAction?.action !== ACTIONS.OVERWATCH ||
    pendingAction.unitId !== unitId
  ) {
    return rejected(state, command, "overwatch-not-targeting");
  }
  if (!pendingAction.targetCell || !pendingAction.direction) {
    return rejected(state, command, "overwatch-not-aimed");
  }

  const unit = getUnit(state, unitId);
  if (!getAvailableActions(state, unitId).includes(ACTIONS.OVERWATCH)) {
    return rejected(state, command, "action-not-available");
  }

  const commitment = createOverwatchCommitment(unit, pendingAction);
  const units = state.units.map((candidate) =>
    candidate.id === unitId
      ? {
          ...candidate,
          actionPoints: 0,
          activity: null,
          overwatch: commitment,
        }
      : candidate,
  );

  return accepted(
    {
      ...state,
      units,
      pendingAction: null,
    },
    [
      event("overwatch-committed", {
        unitId,
        cost: commitment.committedActionPoints,
        shotsRemaining: commitment.shotsRemaining,
        originCell: { ...commitment.originCell },
        targetCell: { ...commitment.targetCell },
        direction: { ...commitment.direction },
        range: commitment.range,
        halfAngle: commitment.halfAngle,
      }),
    ],
  );
}

function cancelAction(state, command) {
  if (state.phase !== BATTLE_PHASES.PLAYER) {
    return rejected(state, command, "wrong-phase");
  }
  if (state.pendingConfirmation !== null) {
    return rejected(state, command, "input-locked");
  }
  if (!state.pendingAction) {
    return rejected(state, command, "action-not-pending");
  }

  let selectedUnitId = state.selectedUnitId;
  let reason = "cancelled";
  if (command.selectedUnitId !== undefined) {
    const selectedUnit = getUnit(state, command.selectedUnitId);
    if (selectedUnit?.team !== TEAMS.PLAYER) {
      return rejected(state, command, "selection-not-friendly");
    }
    selectedUnitId = selectedUnit.id;
    reason = "selection-changed";
  }

  return accepted(
    {
      ...state,
      selectedUnitId,
      pendingAction: null,
    },
    [
      event("action-targeting-cancelled", {
        unitId: state.pendingAction.unitId,
        action: state.pendingAction.action,
        reason,
        ...(command.selectedUnitId === undefined ? {} : { selectedUnitId }),
      }),
    ],
  );
}

function relinquishActiveEnemy(state, command) {
  if (state.phase !== BATTLE_PHASES.ENEMY || !state.activeUnitId) {
    return rejected(state, command, "enemy-activation-not-active");
  }

  const completedUnitId = state.activeUnitId;
  const units = state.units.map((unit) =>
    unit.id === completedUnitId
      ? { ...unit, actionPoints: 0, activity: null }
      : unit,
  );
  let nextIndex = state.enemyActivationIndex + 1;
  let nextUnitId = null;

  while (nextIndex < state.enemyActivationOrder.length) {
    const candidateId = state.enemyActivationOrder[nextIndex];
    const candidate = getUnit({ ...state, units }, candidateId);
    if (candidate?.health > 0) {
      nextUnitId = candidateId;
      break;
    }
    nextIndex += 1;
  }

  const completedEvent = event("enemy-activation-ended", {
    unitId: completedUnitId,
    reason: "relinquished",
  });

  if (!nextUnitId) {
    return beginPlayerTurn({ ...state, units }, [completedEvent]);
  }

  return accepted(
    {
      ...state,
      units,
      activeUnitId: nextUnitId,
      enemyActivationIndex: nextIndex,
    },
    [completedEvent, event("enemy-activation-started", { unitId: nextUnitId })],
  );
}

export function dispatchBattleCommand(state, command) {
  if (!state || !Array.isArray(state.units)) {
    throw new TypeError("dispatchBattleCommand requires a battle state.");
  }
  if (!command || typeof command.type !== "string") {
    return rejected(state, command, "invalid-command");
  }

  if (command.type === COMMANDS.RESTART) {
    return accepted(restartBattle(state), [event("battle-restarted")]);
  }

  switch (command.type) {
    case COMMANDS.REQUEST_END_TURN:
      return requestEndTurn(state, command);
    case COMMANDS.CONFIRM_END_TURN:
      return confirmEndTurn(state, command);
    case COMMANDS.CANCEL_END_TURN:
      return cancelEndTurn(state, command);
    case COMMANDS.BEGIN_ACTION:
      return beginAction(state, command);
    case COMMANDS.AIM_OVERWATCH:
      return aimOverwatch(state, command);
    case COMMANDS.CONFIRM_OVERWATCH:
      return confirmOverwatch(state, command);
    case COMMANDS.CANCEL_ACTION:
      return cancelAction(state, command);
    case COMMANDS.RELINQUISH_ACTIVE_ENEMY:
      return relinquishActiveEnemy(state, command);
    default:
      return rejected(state, command, "unknown-command");
  }
}
