import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialBattle,
  dispatchBattleCommand,
} from "../../src/game/rules/index.js";

function dispatch(state, command) {
  const outcome = dispatchBattleCommand(state, command);
  assert.equal(outcome.accepted, true);
  return outcome.state;
}

test("cancelling End Turn restores the complete pre-request action state", () => {
  const initial = createInitialBattle({ seed: 12345 });
  const targeting = dispatch(initial, {
    type: "BEGIN_ACTION",
    unitId: "player-1",
    action: "move",
  });
  const beforeRequest = structuredClone(targeting);
  const confirmation = dispatch(targeting, { type: "REQUEST_END_TURN" });

  assert.equal(confirmation.pendingConfirmation, "end-turn");

  const cancelled = dispatch(confirmation, { type: "CANCEL_END_TURN" });
  assert.deepEqual(cancelled, beforeRequest);
});
