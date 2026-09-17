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

test("cancelling End Turn abandons prior targeting without gameplay mutation", () => {
  const initial = createInitialBattle({ seed: 12345 });
  const targeting = dispatch(initial, {
    type: "BEGIN_ACTION",
    unitId: "player-1",
    action: "move",
  });
  const gameplayBeforeRequest = {
    phase: targeting.phase,
    round: targeting.round,
    result: targeting.result,
    units: structuredClone(targeting.units),
    random: structuredClone(targeting.random),
  };
  const confirmation = dispatch(targeting, { type: "REQUEST_END_TURN" });

  assert.equal(confirmation.pendingConfirmation, "end-turn");
  assert.equal(confirmation.pendingAction, null);

  const cancelled = dispatch(confirmation, { type: "CANCEL_END_TURN" });
  assert.equal(cancelled.pendingConfirmation, null);
  assert.equal(cancelled.pendingAction, null);
  assert.deepEqual(
    {
      phase: cancelled.phase,
      round: cancelled.round,
      result: cancelled.result,
      units: cancelled.units,
      random: cancelled.random,
    },
    gameplayBeforeRequest,
  );
});
