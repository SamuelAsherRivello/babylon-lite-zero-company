import assert from "node:assert/strict";
import test from "node:test";

import * as rules from "../../src/game/rules/index.js";

function requireResolver() {
  assert.equal(
    typeof rules.resolveMoveWithOverwatch,
    "function",
    "Rules API must export resolveMoveWithOverwatch().",
  );
  return rules.resolveMoveWithOverwatch;
}

function setUnit(state, unitId, changes) {
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.id === unitId ? { ...unit, ...changes } : unit,
    ),
  };
}

function getUnit(state, unitId) {
  return state.units.find((unit) => unit.id === unitId);
}

function openLevel() {
  return { ...rules.LEVEL_DEFINITION, covers: [] };
}

function commitment(ownerId, originCell, direction, shotsRemaining) {
  const widthRatio = rules.getOverwatchConeWidthRatio(shotsRemaining);
  return {
    ownerId,
    originCell: { ...originCell },
    targetCell: {
      column: originCell.column + direction.column * 5,
      row: originCell.row + direction.row * 5,
    },
    direction: { ...direction },
    range: rules.OVERWATCH_PROFILE.range,
    widthRatio,
    halfAngle: rules.getOverwatchHalfAngle(shotsRemaining),
    committedActionPoints: shotsRemaining,
    shotsRemaining,
  };
}

function startEnemyTurn(state) {
  let transition = rules.dispatchBattleCommand(state, {
    type: "REQUEST_END_TURN",
  });
  if (transition.state.pendingConfirmation === "end-turn") {
    transition = rules.dispatchBattleCommand(transition.state, {
      type: "CONFIRM_END_TURN",
    });
  }
  return transition.state;
}

test("a surviving multi-step move carries reactions, randomness, and shot capacity", () => {
  const resolveMoveWithOverwatch = requireResolver();
  const level = openLevel();
  let state = rules.createInitialBattle({ seed: 12345 });
  state = setUnit(state, "enemy-1", {
    actionPoints: 0,
    overwatch: commitment(
      "enemy-1",
      { column: 2, row: 6 },
      { column: 0, row: -1 },
      2,
    ),
  });
  state = {
    ...state,
    random: rules.createScriptedRandom([0.999, 0, 0]),
  };
  const stateBefore = structuredClone(state);
  const destination = { column: 2, row: 3 };
  const displayed = rules
    .getReachableDestinations(state, "player-1", { level })
    .find((entry) =>
      rules.cellsEqual(entry.cell, destination),
    );
  const outcome = resolveMoveWithOverwatch(state, {
    unitId: "player-1",
    destination,
    level,
  });
  const mover = getUnit(outcome.state, "player-1");
  const reactor = getUnit(outcome.state, "enemy-1");
  const stepIndexes = outcome.events
    .map((event, index) => (event.type === "move-step" ? index : -1))
    .filter((index) => index >= 0);
  const reactionIndexes = outcome.events
    .map((event, index) =>
      event.type === "overwatch-reaction-started" ? index : -1,
    )
    .filter((index) => index >= 0);

  assert.equal(outcome.accepted, true);
  assert.equal(outcome.cost, displayed.minimumActionPoints);
  assert.deepEqual(outcome.path, [
    { column: 2, row: 2 },
    { column: 2, row: 3 },
  ]);
  assert.equal(outcome.reactions.length, 2);
  assert.equal(outcome.reactions[0].hit, false);
  assert.equal(outcome.reactions[1].hit, true);
  assert.equal(outcome.movementStopped, false);
  assert.deepEqual(mover.cell, destination);
  assert.ok(mover.health > 0);
  assert.equal(mover.actionPoints, 3 - displayed.minimumActionPoints);
  assert.equal(reactor.overwatch.shotsRemaining, 0);
  assert.equal(outcome.state.random.index, 3);
  assert.equal(outcome.events.at(-1).type, "move-completed");
  assert.ok(
    stepIndexes[0] < reactionIndexes[0] &&
      reactionIndexes[0] < stepIndexes[1] &&
      stepIndexes[1] < reactionIndexes[1],
  );
  assert.deepEqual(state, stateBefore);
  assert.doesNotThrow(() => JSON.stringify(outcome));
});

test("lethal enemy Overwatch truncates a player path at the triggering cell", () => {
  const resolveMoveWithOverwatch = requireResolver();
  const level = openLevel();
  let state = rules.createInitialBattle({ seed: 12345 });
  state = setUnit(state, "player-1", { health: 1 });
  state = setUnit(state, "player-2", { health: 0 });
  state = setUnit(state, "player-3", { health: 0 });
  state = setUnit(state, "enemy-1", {
    actionPoints: 0,
    overwatch: commitment(
      "enemy-1",
      { column: 2, row: 6 },
      { column: 0, row: -1 },
      1,
    ),
  });
  state = {
    ...state,
    random: rules.createScriptedRandom([0, 0]),
  };
  const stateBefore = structuredClone(state);
  const outcome = resolveMoveWithOverwatch(state, {
    unitId: "player-1",
    destination: { column: 2, row: 4 },
    level,
  });
  const mover = getUnit(outcome.state, "player-1");

  assert.equal(outcome.accepted, true);
  assert.deepEqual(outcome.path, [{ column: 2, row: 2 }]);
  assert.equal(outcome.reactions.length, 1);
  assert.equal(outcome.movementStopped, true);
  assert.deepEqual(mover.cell, { column: 2, row: 2 });
  assert.equal(mover.health, 0);
  assert.equal(mover.activity, null);
  assert.equal(outcome.state.pendingResolution, null);
  assert.equal(outcome.state.pendingAction, null);
  assert.equal(outcome.state.phase, "result");
  assert.equal(outcome.state.result, "defeat");
  assert.equal(
    outcome.events.some((event) => event.type === "move-completed"),
    false,
  );
  assert.equal(
    outcome.events.some((event) => event.type === "battle-ended"),
    true,
  );
  assert.deepEqual(state, stateBefore);
});

test("lethal player Overwatch truncates an enemy path and preserves victory", () => {
  const resolveMoveWithOverwatch = requireResolver();
  const level = openLevel();
  let state = rules.createInitialBattle({ seed: 12345 });
  state = setUnit(state, "player-1", {
    actionPoints: 0,
    overwatch: commitment(
      "player-1",
      { column: 2, row: 1 },
      { column: 0, row: 1 },
      1,
    ),
  });
  state = setUnit(state, "enemy-1", { health: 1 });
  state = setUnit(state, "enemy-2", { health: 0 });
  state = setUnit(state, "enemy-3", { health: 0 });
  state = startEnemyTurn(state);
  state = setUnit(state, "player-1", {
    actionPoints: 0,
    overwatch: commitment(
      "player-1",
      { column: 2, row: 1 },
      { column: 0, row: 1 },
      1,
    ),
  });
  state = {
    ...state,
    random: rules.createScriptedRandom([0, 0]),
  };
  const stateBefore = structuredClone(state);
  const outcome = resolveMoveWithOverwatch(state, {
    unitId: "enemy-1",
    destination: { column: 2, row: 3 },
    level,
  });
  const mover = getUnit(outcome.state, "enemy-1");

  assert.equal(outcome.accepted, true);
  assert.deepEqual(outcome.path, [{ column: 2, row: 5 }]);
  assert.equal(outcome.reactions.length, 1);
  assert.equal(outcome.movementStopped, true);
  assert.deepEqual(mover.cell, { column: 2, row: 5 });
  assert.equal(mover.health, 0);
  assert.equal(mover.activity, null);
  assert.equal(outcome.state.pendingResolution, null);
  assert.equal(outcome.state.phase, "result");
  assert.equal(outcome.state.result, "victory");
  assert.equal(
    outcome.events.some((event) => event.type === "battle-ended"),
    true,
  );
  assert.deepEqual(state, stateBefore);
});
