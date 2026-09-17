import assert from "node:assert/strict";
import test from "node:test";

import * as rules from "../../src/game/rules/index.js";

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

function beginShoot(state, unitId) {
  const outcome = rules.dispatchBattleCommand(state, {
    type: "BEGIN_ACTION",
    unitId,
    action: "shoot",
  });
  assert.equal(outcome.accepted, true);
  return outcome.state;
}

function startEnemyTurn(state) {
  let outcome = rules.dispatchBattleCommand(state, {
    type: "REQUEST_END_TURN",
  });
  if (outcome.state.pendingConfirmation === "end-turn") {
    outcome = rules.dispatchBattleCommand(outcome.state, {
      type: "CONFIRM_END_TURN",
    });
  }
  assert.equal(outcome.state.phase, "enemy");
  return outcome.state;
}

function resolveVictory(options = { seed: 12345 }) {
  let state = rules.createInitialBattle(options);
  state = setUnit(state, "enemy-1", {
    cell: { column: 2, row: 2 },
    health: 1,
  });
  state = setUnit(state, "enemy-2", { health: 0 });
  state = setUnit(state, "enemy-3", { health: 0 });
  state = {
    ...state,
    random: rules.createScriptedRandom([0, 0]),
  };
  state = beginShoot(state, "player-1");
  return rules.resolveShoot(state, {
    shooterId: "player-1",
    targetId: "enemy-1",
    level: openLevel(),
  });
}

function resolveDefeat(options = { seed: 12345 }) {
  let state = rules.createInitialBattle(options);
  state = setUnit(state, "player-1", { health: 1 });
  state = setUnit(state, "player-2", { health: 0 });
  state = setUnit(state, "player-3", { health: 0 });
  state = setUnit(state, "enemy-1", {
    cell: { column: 2, row: 2 },
  });
  state = startEnemyTurn(state);
  state = {
    ...state,
    random: rules.createScriptedRandom([0, 0]),
  };
  return rules.resolveShoot(state, {
    shooterId: "enemy-1",
    targetId: "player-1",
    level: openLevel(),
  });
}

function assertTerminalState(outcome, result) {
  assert.equal(outcome.accepted, true);
  assert.equal(outcome.state.phase, "result");
  assert.equal(outcome.state.result, result);
  assert.equal(outcome.state.activeUnitId, null);
  assert.deepEqual(outcome.state.enemyActivationOrder, []);
  assert.equal(outcome.state.enemyActivationIndex, -1);
  assert.equal(outcome.state.pendingConfirmation, null);
  assert.equal(outcome.state.pendingAction, null);
  assert.equal(outcome.state.pendingResolution, null);
  assert.equal(
    outcome.events.filter((event) => event.type === "battle-ended").length,
    1,
  );
}

test("the last enemy defeated by a normal shot immediately produces victory", () => {
  const outcome = resolveVictory({ seed: 24680 });
  const defeated = getUnit(outcome.state, "enemy-1");
  const inspection = rules.getUnitInspection(outcome.state, "enemy-1");

  assertTerminalState(outcome, "victory");
  assert.equal(defeated.health, 0);
  assert.deepEqual(defeated.cell, { column: 2, row: 2 });
  assert.equal(inspection.status, "Dead");
  assert.deepEqual(inspection.cell, defeated.cell);
  assert.deepEqual(inspection.availableActions, []);
});

test("the last player defeated by a normal enemy shot immediately produces defeat", () => {
  const outcome = resolveDefeat({ seed: 13579 });
  const defeated = getUnit(outcome.state, "player-1");
  const inspection = rules.getUnitInspection(outcome.state, "player-1");

  assertTerminalState(outcome, "defeat");
  assert.equal(defeated.health, 0);
  assert.deepEqual(defeated.cell, { column: 2, row: 1 });
  assert.equal(inspection.status, "Dead");
  assert.deepEqual(inspection.cell, defeated.cell);
  assert.deepEqual(inspection.availableActions, []);
});

test("Restart from victory restores a byte-deep-equal seeded initial battle", () => {
  const options = { seed: 8675309 };
  const terminal = resolveVictory(options).state;
  assert.equal(terminal.phase, "result");
  assert.equal(terminal.result, "victory");
  const restarted = rules.dispatchBattleCommand(terminal, {
    type: "RESTART",
  });
  const fresh = rules.createInitialBattle(options);

  assert.equal(restarted.accepted, true);
  assert.deepEqual(restarted.state, fresh);
  assert.equal(JSON.stringify(restarted.state), JSON.stringify(fresh));
  assert.equal(restarted.state.phase, "player");
  assert.equal(rules.getUnitInspection(restarted.state, "player-2").status, "Idle");
});

test("Restart from defeat restores a byte-deep-equal scripted-random battle", () => {
  const options = {
    seed: 112233,
    randomSource: rules.createScriptedRandom([0.25, 0.75], { seed: 998877 }),
  };
  const terminal = resolveDefeat(options).state;
  assert.equal(terminal.phase, "result");
  assert.equal(terminal.result, "defeat");
  const restarted = rules.dispatchBattleCommand(terminal, {
    type: "RESTART",
  });
  const fresh = rules.createInitialBattle(options);

  assert.equal(restarted.accepted, true);
  assert.deepEqual(restarted.state, fresh);
  assert.equal(JSON.stringify(restarted.state), JSON.stringify(fresh));
  assert.deepEqual(
    restarted.state.units.map((unit) => ({
      id: unit.id,
      cell: unit.cell,
      health: unit.health,
      weaponId: unit.weaponId,
      actionPoints: unit.actionPoints,
      overwatch: unit.overwatch,
    })),
    fresh.units.map((unit) => ({
      id: unit.id,
      cell: unit.cell,
      health: unit.health,
      weaponId: unit.weaponId,
      actionPoints: unit.actionPoints,
      overwatch: unit.overwatch,
    })),
  );
  assert.equal(restarted.state.selectedUnitId, fresh.selectedUnitId);
  assert.deepEqual(restarted.state.random, fresh.random);
});

test("result state rejects queued damage, movement, Overwatch, and enemy progression", () => {
  const terminal = resolveVictory({ seed: 445566 }).state;
  const snapshot = structuredClone(terminal);
  const move = rules.resolveMove(terminal, {
    unitId: "player-2",
    destination: { column: 6, row: 2 },
    level: openLevel(),
  });
  const integratedMove = rules.resolveMoveWithOverwatch(terminal, {
    unitId: "player-2",
    destination: { column: 6, row: 2 },
    level: openLevel(),
  });
  const shot = rules.resolveShoot(terminal, {
    shooterId: "player-2",
    targetId: "enemy-2",
    level: openLevel(),
  });
  const playerOverwatch = rules.dispatchBattleCommand(terminal, {
    type: "BEGIN_ACTION",
    unitId: "player-2",
    action: "overwatch",
  });
  const enemyOverwatch = rules.resolveEnemyOverwatch(terminal, {
    unitId: "enemy-1",
    action: "overwatch",
    targetCell: { column: 2, row: 1 },
    direction: { column: 0, row: -1 },
    cost: 1,
  });
  const queuedReaction = rules.resolveOverwatchReactions(terminal, {
    moverId: "player-2",
    completedCell: { column: 6, row: 2 },
    remainingPath: [{ column: 6, row: 3 }],
    stepCompleted: true,
    level: openLevel(),
  });
  const enemyProgression = rules.dispatchBattleCommand(terminal, {
    type: "RELINQUISH_ACTIVE_ENEMY",
  });

  for (const outcome of [
    move,
    integratedMove,
    shot,
    playerOverwatch,
    enemyOverwatch,
    enemyProgression,
  ]) {
    assert.equal(outcome.accepted, false);
    assert.equal(outcome.state, terminal);
  }
  assert.equal(queuedReaction.state, terminal);
  assert.deepEqual(queuedReaction.reactions, []);
  assert.deepEqual(terminal, snapshot);
});
