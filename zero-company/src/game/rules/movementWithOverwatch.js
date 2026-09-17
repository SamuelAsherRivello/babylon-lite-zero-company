import { LEVEL_DEFINITION } from "./level.js";
import { resolveMove } from "./movement.js";
import { resolveOverwatchReactions } from "./overwatch.js";

function cloneCell(cell) {
  return { column: cell.column, row: cell.row };
}

function placeMover(state, unitId, cell, activity) {
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.id === unitId
        ? { ...unit, cell: cloneCell(cell), activity }
        : unit,
    ),
  };
}

export function resolveMoveWithOverwatch(
  state,
  { unitId, destination, level = LEVEL_DEFINITION },
) {
  const movement = resolveMove(state, { unitId, destination, level });
  if (!movement.accepted) {
    return {
      ...movement,
      reactions: [],
      movementStopped: false,
    };
  }

  const originalUnit = state.units.find((unit) => unit.id === unitId);
  const plannedPath = movement.path.map(cloneCell);
  const moveStarted = movement.events.find(
    (event) => event.type === "move-started",
  );
  const moveSteps = movement.events.filter((event) => event.type === "move-step");
  const moveCompleted = movement.events.find(
    (event) => event.type === "move-completed",
  );
  const events = moveStarted ? [moveStarted] : [];
  const reactions = [];
  const traversedPath = [];
  let nextState = placeMover(
    movement.state,
    unitId,
    originalUnit.cell,
    "moving",
  );

  for (let index = 0; index < plannedPath.length; index += 1) {
    const completedCell = plannedPath[index];
    const remainingPath = plannedPath.slice(index + 1).map(cloneCell);
    nextState = placeMover(nextState, unitId, completedCell, "moving");
    nextState = {
      ...nextState,
      pendingResolution: {
        type: "move",
        unitId,
        remainingPath,
      },
    };
    traversedPath.push(cloneCell(completedCell));
    if (moveSteps[index]) {
      events.push(moveSteps[index]);
    }

    const reactionOutcome = resolveOverwatchReactions(nextState, {
      moverId: unitId,
      completedCell,
      remainingPath,
      stepCompleted: true,
      level,
    });
    nextState = reactionOutcome.state;
    reactions.push(...reactionOutcome.reactions);
    events.push(...reactionOutcome.events);

    if (reactionOutcome.movementStopped || nextState.result !== null) {
      return {
        accepted: true,
        state: nextState,
        cost: movement.cost,
        path: traversedPath,
        reactions,
        events,
        movementStopped: true,
      };
    }
  }

  nextState = placeMover(nextState, unitId, destination, null);
  nextState = {
    ...nextState,
    pendingResolution: null,
  };
  if (moveCompleted) {
    events.push(moveCompleted);
  }

  return {
    accepted: true,
    state: nextState,
    cost: movement.cost,
    path: traversedPath,
    reactions,
    events,
    movementStopped: false,
  };
}
