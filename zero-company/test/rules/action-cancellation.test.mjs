import assert from "node:assert/strict";
import test from "node:test";

import {
  COMMANDS,
  createInitialBattle,
  dispatchBattleCommand,
} from "../../src/game/rules/index.js";

function dispatch(state, command) {
  return dispatchBattleCommand(state, command);
}

function beginAction(state, unitId, action) {
  const outcome = dispatch(state, {
    type: "BEGIN_ACTION",
    unitId,
    action,
  });
  assert.equal(outcome.accepted, true);
  return outcome.state;
}

function withoutTargetingState(state) {
  const snapshot = structuredClone(state);
  delete snapshot.pendingAction;
  delete snapshot.selectedUnitId;
  return snapshot;
}

test("BEGIN_ACTION switches Move to Shoot without spending or mutation", () => {
  const moving = beginAction(
    createInitialBattle({ seed: 12345 }),
    "player-1",
    "move",
  );
  const outcome = dispatch(moving, {
    type: "BEGIN_ACTION",
    unitId: "player-1",
    action: "shoot",
  });

  assert.equal(outcome.accepted, true);
  assert.deepEqual(outcome.state.pendingAction, {
    unitId: "player-1",
    action: "shoot",
  });
  assert.deepEqual(withoutTargetingState(outcome.state), withoutTargetingState(moving));
  assert.deepEqual(outcome.events.map((event) => event.type), [
    "action-targeting-cancelled",
    "action-targeting-started",
  ]);
  assert.deepEqual(outcome.events[0], {
    type: "action-targeting-cancelled",
    unitId: "player-1",
    action: "move",
    reason: "action-switched",
  });
});

test("BEGIN_ACTION switches Shoot to Move without spending or mutation", () => {
  const shooting = beginAction(
    createInitialBattle({ seed: 12345 }),
    "player-2",
    "shoot",
  );
  const outcome = dispatch(shooting, {
    type: "BEGIN_ACTION",
    unitId: "player-2",
    action: "move",
  });

  assert.equal(outcome.accepted, true);
  assert.deepEqual(outcome.state.pendingAction, {
    unitId: "player-2",
    action: "move",
  });
  assert.deepEqual(withoutTargetingState(outcome.state), withoutTargetingState(shooting));
  assert.equal(outcome.events[0].reason, "action-switched");
});

test("CANCEL_ACTION can clear targeting while selecting another friendly", () => {
  assert.equal(COMMANDS.CANCEL_ACTION, "CANCEL_ACTION");
  const moving = beginAction(
    createInitialBattle({ seed: 12345 }),
    "player-1",
    "move",
  );
  const outcome = dispatch(moving, {
    type: "CANCEL_ACTION",
    selectedUnitId: "player-2",
  });

  assert.equal(outcome.accepted, true);
  assert.equal(outcome.state.pendingAction, null);
  assert.equal(outcome.state.selectedUnitId, "player-2");
  assert.deepEqual(withoutTargetingState(outcome.state), withoutTargetingState(moving));
  assert.deepEqual(outcome.events, [
    {
      type: "action-targeting-cancelled",
      unitId: "player-1",
      action: "move",
      reason: "selection-changed",
      selectedUnitId: "player-2",
    },
  ]);
});

test("invalid and wrong-phase cancellation leave the complete state unchanged", () => {
  const initial = createInitialBattle({ seed: 12345 });
  const noPendingAction = dispatch(initial, { type: "CANCEL_ACTION" });

  assert.equal(noPendingAction.accepted, false);
  assert.equal(noPendingAction.reason, "action-not-pending");
  assert.equal(noPendingAction.state, initial);

  const moving = beginAction(initial, "player-1", "move");
  const invalidSelection = dispatch(moving, {
    type: "CANCEL_ACTION",
    selectedUnitId: "enemy-1",
  });
  assert.equal(invalidSelection.accepted, false);
  assert.equal(invalidSelection.reason, "selection-not-friendly");
  assert.equal(invalidSelection.state, moving);

  const requested = dispatch(initial, { type: "REQUEST_END_TURN" });
  const enemyTurn = dispatch(requested.state, { type: "CONFIRM_END_TURN" }).state;
  const impossiblePendingState = {
    ...enemyTurn,
    pendingAction: { unitId: "player-1", action: "move" },
  };
  const wrongPhase = dispatch(impossiblePendingState, { type: "CANCEL_ACTION" });

  assert.equal(wrongPhase.accepted, false);
  assert.equal(wrongPhase.reason, "wrong-phase");
  assert.equal(wrongPhase.state, impossiblePendingState);
});
