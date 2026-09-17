import assert from "node:assert/strict";
import test from "node:test";

import {
  COMMANDS,
  createInitialBattle,
  dispatchBattleCommand,
  getAttackPreview,
  getReachableDestinations,
} from "../../src/game/rules/index.js";

function dispatch(state, command) {
  return dispatchBattleCommand(state, command);
}

function beginAction(state, unitId, action) {
  const outcome = dispatch(state, {
    type: COMMANDS.BEGIN_ACTION,
    unitId,
    action,
  });
  assert.equal(outcome.accepted, true);
  return outcome.state;
}

function gameplaySnapshot(state) {
  return {
    phase: state.phase,
    round: state.round,
    result: state.result,
    units: state.units,
    random: state.random,
  };
}

function withOpenShootTargets(state) {
  return {
    ...state,
    units: state.units.map((unit) => {
      if (unit.id === "enemy-1") {
        return { ...unit, cell: { column: 5, row: 1 } };
      }
      if (unit.id === "enemy-2") {
        return { ...unit, cell: { column: 7, row: 1 } };
      }
      return unit;
    }),
  };
}

test("Move stages and retargets valid destinations without gameplay mutation", () => {
  const initial = createInitialBattle({ seed: 12345 });
  let state = beginAction(initial, "player-2", "move");
  const destinations = getReachableDestinations(state, "player-2");
  assert.ok(destinations.length >= 2);
  const before = structuredClone(gameplaySnapshot(state));

  const first = dispatch(state, {
    type: COMMANDS.AIM_MOVE,
    unitId: "player-2",
    targetCell: destinations[0].cell,
  });
  assert.equal(first.accepted, true);
  assert.deepEqual(first.state.pendingAction.targetCell, destinations[0].cell);
  assert.equal(first.state.pendingAction.cost, destinations[0].cost);
  assert.deepEqual(gameplaySnapshot(first.state), before);

  const second = dispatch(first.state, {
    type: COMMANDS.AIM_MOVE,
    unitId: "player-2",
    targetCell: destinations[1].cell,
  });
  assert.equal(second.accepted, true);
  assert.deepEqual(second.state.pendingAction.targetCell, destinations[1].cell);
  assert.equal(second.state.pendingAction.cost, destinations[1].cost);
  assert.deepEqual(gameplaySnapshot(second.state), before);
});

test("Move rejects invalid staging and Cancel clears the complete operation", () => {
  const initial = createInitialBattle({ seed: 12345 });
  const targeting = beginAction(initial, "player-2", "move");
  const invalid = dispatch(targeting, {
    type: COMMANDS.AIM_MOVE,
    unitId: "player-2",
    targetCell: { column: -1, row: 0 },
  });
  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reason, "invalid-move-destination");
  assert.equal(invalid.state, targeting);

  const destination = getReachableDestinations(targeting, "player-2")[0];
  const aimed = dispatch(targeting, {
    type: COMMANDS.AIM_MOVE,
    unitId: "player-2",
    targetCell: destination.cell,
  }).state;
  const cancelled = dispatch(aimed, { type: COMMANDS.CANCEL_ACTION });
  assert.equal(cancelled.accepted, true);
  assert.equal(cancelled.state.pendingAction, null);
  assert.deepEqual(gameplaySnapshot(cancelled.state), gameplaySnapshot(initial));
});

test("Shoot stages and retargets valid targets without consuming randomness", () => {
  const initial = withOpenShootTargets(createInitialBattle({ seed: 12345 }));
  let state = beginAction(initial, "player-2", "shoot");
  const validTargets = state.units
    .filter((unit) => unit.team === "enemy")
    .filter((unit) => getAttackPreview(state, "player-2", unit.id).selectable);
  assert.ok(validTargets.length >= 2);
  const before = structuredClone(gameplaySnapshot(state));

  const first = dispatch(state, {
    type: COMMANDS.AIM_SHOOT,
    unitId: "player-2",
    targetId: validTargets[0].id,
  });
  assert.equal(first.accepted, true);
  assert.equal(first.state.pendingAction.targetId, validTargets[0].id);
  assert.deepEqual(gameplaySnapshot(first.state), before);

  const second = dispatch(first.state, {
    type: COMMANDS.AIM_SHOOT,
    unitId: "player-2",
    targetId: validTargets[1].id,
  });
  assert.equal(second.accepted, true);
  assert.equal(second.state.pendingAction.targetId, validTargets[1].id);
  assert.deepEqual(gameplaySnapshot(second.state), before);
});

test("Shoot rejects invalid targets and Cancel preserves gameplay state", () => {
  const initial = withOpenShootTargets(createInitialBattle({ seed: 12345 }));
  const targeting = beginAction(initial, "player-2", "shoot");
  const invalid = dispatch(targeting, {
    type: COMMANDS.AIM_SHOOT,
    unitId: "player-2",
    targetId: "player-1",
  });
  assert.equal(invalid.accepted, false);
  assert.equal(invalid.reason, "invalid-shoot-target");
  assert.equal(invalid.state, targeting);

  const target = targeting.units
    .filter((unit) => unit.team === "enemy")
    .find((unit) => getAttackPreview(targeting, "player-2", unit.id).selectable);
  assert.ok(target);
  const aimed = dispatch(targeting, {
    type: COMMANDS.AIM_SHOOT,
    unitId: "player-2",
    targetId: target.id,
  }).state;
  const cancelled = dispatch(aimed, { type: COMMANDS.CANCEL_ACTION });
  assert.equal(cancelled.accepted, true);
  assert.equal(cancelled.state.pendingAction, null);
  assert.deepEqual(gameplaySnapshot(cancelled.state), gameplaySnapshot(initial));
});

test("End Turn always stages confirmation even when no player AP is usable", () => {
  const initial = createInitialBattle({ seed: 12345 });
  const noUsableAp = {
    ...initial,
    units: initial.units.map((unit) => (
      unit.team === "player" ? { ...unit, actionPoints: 0 } : unit
    )),
  };
  const requested = dispatch(noUsableAp, { type: COMMANDS.REQUEST_END_TURN });

  assert.equal(requested.accepted, true);
  assert.equal(requested.state.phase, "player");
  assert.equal(requested.state.pendingConfirmation, "end-turn");
  assert.deepEqual(requested.state.units, noUsableAp.units);

  const cancelled = dispatch(requested.state, { type: COMMANDS.CANCEL_END_TURN });
  assert.equal(cancelled.accepted, true);
  assert.equal(cancelled.state.phase, "player");
  assert.equal(cancelled.state.pendingConfirmation, null);

  const confirmed = dispatch(requested.state, { type: COMMANDS.CONFIRM_END_TURN });
  assert.equal(confirmed.accepted, true);
  assert.equal(confirmed.state.phase, "enemy");
});

test("pressing Overwatch again cannot commit an aimed operation", () => {
  const initial = createInitialBattle({ seed: 12345 });
  const targeting = beginAction(initial, "player-1", "overwatch");
  const aimed = dispatch(targeting, {
    type: COMMANDS.AIM_OVERWATCH,
    unitId: "player-1",
    targetCell: { column: 2, row: 6 },
  }).state;
  const repeated = dispatch(aimed, {
    type: COMMANDS.BEGIN_ACTION,
    unitId: "player-1",
    action: "overwatch",
  });

  assert.equal(repeated.accepted, false);
  assert.equal(repeated.reason, "action-already-targeting");
  assert.equal(repeated.state, aimed);
  assert.equal(repeated.state.units.find((unit) => unit.id === "player-1").actionPoints, 3);
  assert.equal(repeated.state.units.find((unit) => unit.id === "player-1").overwatch, null);
});
