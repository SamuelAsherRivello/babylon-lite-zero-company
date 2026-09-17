import assert from "node:assert/strict";
import test from "node:test";

const rulesModuleUrl = new URL("../../src/game/rules/index.js", import.meta.url);
let rulesModule = null;
let missingRulesMessage = "";

try {
  rulesModule = await import(rulesModuleUrl.href);
} catch (error) {
  const normalizedMessage = String(error?.message ?? error).replaceAll("\\", "/");
  const expectedMissingModule =
    error?.code === "ERR_MODULE_NOT_FOUND" &&
    normalizedMessage.includes("/src/game/rules/index.js");

  if (!expectedMissingModule) {
    throw error;
  }

  missingRulesMessage = normalizedMessage;
}

function requireRulesApi(...exportNames) {
  assert.ok(
    rulesModule,
    `Production rules API is not implemented at src/game/rules/index.js. ${missingRulesMessage}`,
  );

  for (const exportName of exportNames) {
    assert.equal(
      typeof rulesModule[exportName],
      "function",
      `Rules API must export ${exportName}().`,
    );
  }

  return rulesModule;
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function withUnits(state, updateUnit) {
  return {
    ...state,
    units: state.units.map((unit) => updateUnit({ ...unit })),
  };
}

function dispatch(api, state, command) {
  const outcome = api.dispatchBattleCommand(state, command);
  assert.ok(outcome && typeof outcome === "object", "Commands return an outcome.");
  assert.ok(outcome.state, "Command outcomes include the next serializable state.");
  assert.ok(Array.isArray(outcome.events), "Command outcomes include semantic events.");
  return outcome;
}

function startEnemyTurn(api, state) {
  const requested = dispatch(api, state, { type: "REQUEST_END_TURN" });

  if (requested.state.pendingConfirmation === "end-turn") {
    return dispatch(api, requested.state, { type: "CONFIRM_END_TURN" }).state;
  }

  return requested.state;
}

test("opens immediately in the player phase", () => {
  const api = requireRulesApi("createInitialBattle");
  const state = api.createInitialBattle({ seed: 12345 });

  assert.equal(state.phase, "player");
  assert.equal(state.result, null);
  assert.equal(state.activeUnitId, null);
  assert.equal(state.pendingConfirmation, null);
  assert.ok(Array.isArray(state.units));
});

test("creates the exact three-player versus three-enemy roster", () => {
  const api = requireRulesApi("createInitialBattle");
  const state = api.createInitialBattle({ seed: 12345 });
  const players = state.units.filter((unit) => unit.team === "player");
  const enemies = state.units.filter((unit) => unit.team === "enemy");

  assert.equal(state.units.length, 6);
  assert.deepEqual(
    players.map((unit) => unit.id),
    ["player-1", "player-2", "player-3"],
  );
  assert.deepEqual(
    enemies.map((unit) => unit.id),
    ["enemy-1", "enemy-2", "enemy-3"],
  );
  assert.equal(new Set(state.units.map((unit) => unit.id)).size, 6);
  assert.deepEqual(
    players.map((unit) => unit.actionPoints),
    [3, 3, 3],
  );
});

test("refreshes every living unit to three AP at the start of its side turn", () => {
  const api = requireRulesApi("createInitialBattle", "dispatchBattleCommand");
  const initial = api.createInitialBattle({ seed: 12345 });
  const spentPlayers = withUnits(initial, (unit) => {
    if (unit.team === "player") {
      unit.actionPoints = Number(unit.id.at(-1)) - 1;
    }
    return unit;
  });
  let state = startEnemyTurn(api, spentPlayers);

  assert.equal(state.phase, "enemy");
  assert.deepEqual(
    state.units
      .filter((unit) => unit.team === "enemy" && unit.health > 0)
      .map((unit) => unit.actionPoints),
    [3, 3, 3],
  );

  for (let activation = 0; activation < 3; activation += 1) {
    state = dispatch(api, state, { type: "RELINQUISH_ACTIVE_ENEMY" }).state;
  }

  assert.equal(state.phase, "player");
  assert.deepEqual(
    state.units
      .filter((unit) => unit.team === "player" && unit.health > 0)
      .map((unit) => unit.actionPoints),
    [3, 3, 3],
  );
});

test("permits player commands only for living players during the player phase", () => {
  const api = requireRulesApi(
    "createInitialBattle",
    "dispatchBattleCommand",
    "getAvailableActions",
    "getUnitInspection",
  );
  const initial = api.createInitialBattle({ seed: 12345 });

  assert.deepEqual(
    [...api.getAvailableActions(initial, "player-1")].sort(),
    ["move", "overwatch", "shoot"],
  );
  assert.deepEqual(api.getAvailableActions(initial, "enemy-1"), []);

  const enemyTurn = startEnemyTurn(api, initial);
  assert.deepEqual(api.getAvailableActions(enemyTurn, "player-1"), []);
  assert.equal(api.getUnitInspection(enemyTurn, "player-1").id, "player-1");

  const rejected = dispatch(api, enemyTurn, {
    type: "BEGIN_ACTION",
    unitId: "player-1",
    action: "move",
  });
  assert.equal(rejected.accepted, false);
  assert.deepEqual(rejected.state, enemyTurn);
});

test("activates living enemies sequentially in stable roster order", () => {
  const api = requireRulesApi("createInitialBattle", "dispatchBattleCommand");
  let state = startEnemyTurn(api, api.createInitialBattle({ seed: 12345 }));

  assert.equal(state.phase, "enemy");
  assert.equal(state.activeUnitId, "enemy-1");

  state = dispatch(api, state, { type: "RELINQUISH_ACTIVE_ENEMY" }).state;
  assert.equal(state.activeUnitId, "enemy-2");

  state = dispatch(api, state, { type: "RELINQUISH_ACTIVE_ENEMY" }).state;
  assert.equal(state.activeUnitId, "enemy-3");

  state = dispatch(api, state, { type: "RELINQUISH_ACTIVE_ENEMY" }).state;
  assert.equal(state.phase, "player");
  assert.equal(state.activeUnitId, null);
});

test("derives exactly one status using the required precedence", () => {
  const api = requireRulesApi("deriveUnitStatus");
  const overwatch = { remainingShots: 2 };

  assert.equal(
    api.deriveUnitStatus({ health: 0, activity: "taking-damage", overwatch }),
    "Dead",
  );
  assert.equal(
    api.deriveUnitStatus({ health: 5, activity: "taking-damage", overwatch }),
    "Taking Damage",
  );
  assert.equal(
    api.deriveUnitStatus({ health: 5, activity: "moving", overwatch }),
    "Moving",
  );
  assert.equal(
    api.deriveUnitStatus({ health: 5, activity: "shooting", overwatch }),
    "Shooting",
  );
  assert.equal(
    api.deriveUnitStatus({ health: 5, activity: null, overwatch }),
    "Overwatch",
  );
  assert.equal(
    api.deriveUnitStatus({ health: 5, activity: null, overwatch: null }),
    "Idle",
  );
});

test("keeps dead units inspectable and movement-blocking without actions", () => {
  const api = requireRulesApi(
    "createInitialBattle",
    "getUnitInspection",
    "isCellOccupied",
  );
  const initial = api.createInitialBattle({ seed: 12345 });
  const deadState = withUnits(initial, (unit) => {
    if (unit.id === "player-1") {
      unit.health = 0;
      unit.activity = "moving";
    }
    return unit;
  });
  const deadUnit = deadState.units.find((unit) => unit.id === "player-1");
  const inspection = api.getUnitInspection(deadState, "player-1");

  assert.equal(inspection.id, "player-1");
  assert.equal(inspection.health, 0);
  assert.equal(inspection.status, "Dead");
  assert.deepEqual(inspection.availableActions, []);
  assert.equal(api.isCellOccupied(deadState, deadUnit.cell), true);
});

test("requires end-turn confirmation regardless of usable player AP", () => {
  const api = requireRulesApi("createInitialBattle", "dispatchBattleCommand");
  const initial = api.createInitialBattle({ seed: 12345 });
  const requested = dispatch(api, initial, { type: "REQUEST_END_TURN" });

  assert.equal(requested.state.phase, "player");
  assert.equal(requested.state.pendingConfirmation, "end-turn");

  const cancelled = dispatch(api, requested.state, { type: "CANCEL_END_TURN" });
  assert.equal(cancelled.state.phase, "player");
  assert.equal(cancelled.state.pendingConfirmation, null);
  assert.deepEqual(cancelled.state.units, initial.units);

  const confirmed = dispatch(api, requested.state, { type: "CONFIRM_END_TURN" });
  assert.equal(confirmed.state.phase, "enemy");

  const noUsableAp = withUnits(initial, (unit) => {
    if (unit.team === "player") {
      unit.actionPoints = 0;
    }
    if (unit.id === "player-1") {
      unit.health = 0;
      unit.actionPoints = 3;
    }
    return unit;
  });
  const noApRequested = dispatch(api, noUsableAp, { type: "REQUEST_END_TURN" });

  assert.equal(noApRequested.state.phase, "player");
  assert.equal(noApRequested.state.pendingConfirmation, "end-turn");
  const noApConfirmed = dispatch(api, noApRequested.state, {
    type: "CONFIRM_END_TURN",
  });
  assert.equal(noApConfirmed.state.phase, "enemy");
});

test("keeps battle state JSON-serializable and restart restores the seeded opening", () => {
  const api = requireRulesApi("createInitialBattle", "dispatchBattleCommand");
  const initial = api.createInitialBattle({ seed: 8675309 });
  const enemyTurn = startEnemyTurn(api, initial);
  const changed = withUnits(enemyTurn, (unit) => {
    if (unit.id === "player-2") {
      unit.health = 1;
      unit.actionPoints = 0;
    }
    return unit;
  });
  const restarted = dispatch(api, changed, { type: "RESTART" }).state;
  const serialized = JSON.stringify(restarted);

  assert.deepEqual(restarted, initial);
  assert.deepEqual(JSON.parse(serialized), initial);
  assert.equal(serialized.includes("function"), false);
});
