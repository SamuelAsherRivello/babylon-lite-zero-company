import test from "node:test";
import assert from "node:assert/strict";
import { getInstructionText } from "../src/instructions.js";

const player = (availableActions = ["move", "shoot", "overwatch"]) => ({
  team: "player",
  availableActions,
});

const baseBattle = {
  phase: "player",
  result: null,
  pendingConfirmation: null,
  pendingAction: null,
};

function instruction({ selectedUnit = player(), loadState = { status: "ready" }, ...overrides } = {}) {
  return getInstructionText({
    battle: { ...baseBattle, ...overrides },
    selectedUnit,
    loadState,
  });
}

test("guides the normal player flow", () => {
  assert.equal(instruction(), "Choose an action");
  assert.equal(
    getInstructionText({
      battle: baseBattle,
      selectedUnit: { team: "enemy", availableActions: [] },
      loadState: { status: "ready" },
    }),
    "Click a blue player",
  );
  assert.equal(
    getInstructionText({
      battle: baseBattle,
      selectedUnit: { team: "player", availableActions: [] },
      loadState: { status: "ready" },
    }),
    "Click a blue player",
  );
});

test("guides each pending action until a target is staged", () => {
  assert.equal(instruction({ pendingAction: { action: "move" } }), "Click a floor tile");
  assert.equal(instruction({ pendingAction: { action: "shoot" } }), "Click a red enemy");
  assert.equal(instruction({ pendingAction: { action: "overwatch" } }), "Click a floor tile");
});

test("guides confirmation for staged actions and End Turn", () => {
  assert.equal(
    instruction({ pendingAction: { action: "move", targetCell: { column: 1, row: 1 } } }),
    "Choose Confirm",
  );
  assert.equal(
    instruction({ pendingAction: { action: "shoot", targetId: "enemy-1" } }),
    "Choose Confirm",
  );
  assert.equal(
    instruction({
      pendingAction: {
        action: "overwatch",
        targetCell: { column: 1, row: 1 },
        direction: { x: 1, z: 0 },
      },
    }),
    "Choose Confirm",
  );
  assert.equal(instruction({ pendingConfirmation: "end-turn" }), "Choose Confirm");
});

test("prioritizes loading, terminal, presentations, and enemy turns", () => {
  assert.equal(
    getInstructionText({ battle: baseBattle, loadState: { status: "error" } }),
    "Restart the battle",
  );
  assert.equal(
    getInstructionText({ battle: { ...baseBattle, phase: "result" }, loadState: { status: "ready" } }),
    "Restart the battle",
  );
  assert.equal(
    getInstructionText({ battle: baseBattle, presentationBusy: true, loadState: { status: "ready" } }),
    "Wait for the action to finish",
  );
  assert.equal(
    getInstructionText({ battle: { ...baseBattle, phase: "enemy" }, loadState: { status: "ready" } }),
    "Watch the enemy action",
  );
});

test("loading in progress is announced", () => {
  assert.equal(
    getInstructionText({ battle: baseBattle, loadState: { status: "loading" } }),
    "Preparing battlefield",
  );
});

test("invalid targeting keeps the same guidance when state is unchanged", () => {
  const before = instruction({ pendingAction: { action: "shoot" } });
  const after = instruction({ pendingAction: { action: "shoot" } });
  assert.equal(after, before);
});
