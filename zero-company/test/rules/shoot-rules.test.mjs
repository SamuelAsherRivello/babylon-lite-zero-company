import assert from "node:assert/strict";
import test from "node:test";

import * as rules from "../../src/game/rules/index.js";

function requireExport(name, type = "function") {
  assert.ok(name in rules, `Rules API must export ${name}.`);
  assert.equal(typeof rules[name], type, `${name} must be a ${type}.`);
  return rules[name];
}

function getUnit(state, unitId) {
  return state.units.find((unit) => unit.id === unitId);
}

function setUnit(state, unitId, changes) {
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.id === unitId ? { ...unit, ...changes } : unit,
    ),
  };
}

function beginPlayerShot({
  shooterId,
  targetId,
  shooterCell = { column: 0, row: 0 },
  targetCell = { column: 1, row: 0 },
  randomValues = [0, 0],
  shooterChanges = {},
  targetChanges = {},
}) {
  const createInitialBattle = requireExport("createInitialBattle");
  const createScriptedRandom = requireExport("createScriptedRandom");
  const dispatchBattleCommand = requireExport("dispatchBattleCommand");
  let state = createInitialBattle({ seed: 12345 });
  state = setUnit(state, shooterId, { cell: shooterCell, ...shooterChanges });
  state = setUnit(state, targetId, { cell: targetCell, ...targetChanges });
  state = { ...state, random: createScriptedRandom(randomValues) };
  const targeting = dispatchBattleCommand(state, {
    type: "BEGIN_ACTION",
    unitId: shooterId,
    action: "shoot",
  });
  assert.equal(targeting.accepted, true);
  return targeting.state;
}

test("short and balanced shots cost one AP while long shots cost two", () => {
  const getAttackPreview = requireExport("getAttackPreview");
  const resolveShoot = requireExport("resolveShoot");
  const cases = [
    { shooterId: "player-1", targetId: "enemy-1", cost: 1 },
    { shooterId: "player-2", targetId: "enemy-2", cost: 1 },
    { shooterId: "player-3", targetId: "enemy-3", cost: 2 },
  ];

  for (const shot of cases) {
    const state = beginPlayerShot(shot);
    const shooterBefore = structuredClone(getUnit(state, shot.shooterId));
    const preview = getAttackPreview(state, shot.shooterId, shot.targetId);
    const outcome = resolveShoot(state, shot);
    const shooterAfter = getUnit(outcome.state, shot.shooterId);

    assert.equal(preview.selectable, true);
    assert.equal(preview.apCost, shot.cost);
    assert.equal(outcome.accepted, true);
    assert.equal(outcome.cost, shot.cost);
    assert.equal(shooterAfter.actionPoints, shooterBefore.actionPoints - shot.cost);
    assert.deepEqual(shooterAfter.cell, shooterBefore.cell);
  }
});

test("a miss spends AP and one random draw without damaging the target", () => {
  const resolveShoot = requireExport("resolveShoot");
  const state = beginPlayerShot({
    shooterId: "player-2",
    targetId: "enemy-2",
    randomValues: [0.999],
  });
  const healthBefore = getUnit(state, "enemy-2").health;
  const outcome = resolveShoot(state, {
    shooterId: "player-2",
    targetId: "enemy-2",
  });

  assert.equal(outcome.accepted, true);
  assert.equal(outcome.hit, false);
  assert.equal(outcome.damage, 0);
  assert.equal(getUnit(outcome.state, "enemy-2").health, healthBefore);
  assert.equal(getUnit(outcome.state, "player-2").actionPoints, 2);
  assert.equal(outcome.state.random.index, 1);
  assert.deepEqual(outcome.events.map((event) => event.type), [
    "shot-started",
    "shot-missed",
    "shot-resolved",
  ]);
});

test("a hit spends AP, consumes two draws, and emits bounded damage", () => {
  const resolveShoot = requireExport("resolveShoot");
  const state = beginPlayerShot({
    shooterId: "player-1",
    targetId: "enemy-1",
    randomValues: [0, 0.999],
  });
  const healthBefore = getUnit(state, "enemy-1").health;
  const outcome = resolveShoot(state, {
    shooterId: "player-1",
    targetId: "enemy-1",
  });

  assert.equal(outcome.hit, true);
  assert.equal(outcome.damage, outcome.preview.maxDamage);
  assert.equal(
    getUnit(outcome.state, "enemy-1").health,
    healthBefore - outcome.damage,
  );
  assert.equal(outcome.state.random.index, 2);
  assert.deepEqual(outcome.events.map((event) => event.type), [
    "shot-started",
    "shot-hit",
    "unit-damaged",
    "shot-resolved",
  ]);
});

test("lethal damage clamps health to zero and emits defeat", () => {
  const deriveUnitStatus = requireExport("deriveUnitStatus");
  const resolveShoot = requireExport("resolveShoot");
  const state = beginPlayerShot({
    shooterId: "player-3",
    targetId: "enemy-3",
    randomValues: [0, 0.999],
    targetChanges: { health: 1 },
  });
  const outcome = resolveShoot(state, {
    shooterId: "player-3",
    targetId: "enemy-3",
  });
  const defeated = getUnit(outcome.state, "enemy-3");

  assert.equal(defeated.health, 0);
  assert.equal(deriveUnitStatus(defeated), "Dead");
  assert.deepEqual(outcome.events.map((event) => event.type), [
    "shot-started",
    "shot-hit",
    "unit-damaged",
    "unit-defeated",
    "shot-resolved",
  ]);
});

test("insufficient weapon AP rejects without changing state or randomness", () => {
  const getAttackPreview = requireExport("getAttackPreview");
  const resolveShoot = requireExport("resolveShoot");
  const targeting = beginPlayerShot({
    shooterId: "player-3",
    targetId: "enemy-3",
  });
  const state = setUnit(targeting, "player-3", { actionPoints: 1 });
  const preview = getAttackPreview(state, "player-3", "enemy-3");
  const outcome = resolveShoot(state, {
    shooterId: "player-3",
    targetId: "enemy-3",
  });

  assert.equal(preview.selectable, false);
  assert.equal(preview.reason, "insufficient-action-points");
  assert.equal(outcome.accepted, false);
  assert.equal(outcome.reason, "insufficient-action-points");
  assert.equal(outcome.state, state);
  assert.equal(outcome.state.random.index, 0);
});

test("cover-blocked and cancelled targeting cannot resolve a shot", () => {
  const createInitialBattle = requireExport("createInitialBattle");
  const dispatchBattleCommand = requireExport("dispatchBattleCommand");
  const getAttackPreview = requireExport("getAttackPreview");
  const resolveShoot = requireExport("resolveShoot");
  const initial = createInitialBattle({ seed: 12345 });
  const targeting = dispatchBattleCommand(initial, {
    type: "BEGIN_ACTION",
    unitId: "player-1",
    action: "shoot",
  }).state;
  const blockedPreview = getAttackPreview(targeting, "player-1", "enemy-1");
  const blocked = resolveShoot(targeting, {
    shooterId: "player-1",
    targetId: "enemy-1",
  });

  assert.equal(blockedPreview.blocked, true);
  assert.equal(blockedPreview.selectable, false);
  assert.equal(blocked.reason, "line-of-sight-blocked");
  assert.equal(blocked.state, targeting);

  const valid = beginPlayerShot({
    shooterId: "player-1",
    targetId: "enemy-1",
  });
  const cancelledState = { ...valid, pendingAction: null };
  const cancelled = resolveShoot(cancelledState, {
    shooterId: "player-1",
    targetId: "enemy-1",
  });

  assert.equal(cancelled.accepted, false);
  assert.equal(cancelled.reason, "shoot-not-targeting");
  assert.equal(cancelled.state, cancelledState);
});

test("friendly and defeated targets are invalid", () => {
  const getAttackPreview = requireExport("getAttackPreview");
  const resolveShoot = requireExport("resolveShoot");
  const state = beginPlayerShot({
    shooterId: "player-1",
    targetId: "enemy-1",
  });
  const friendly = getAttackPreview(state, "player-1", "player-2");
  const deadState = setUnit(state, "enemy-1", { health: 0 });
  const dead = resolveShoot(deadState, {
    shooterId: "player-1",
    targetId: "enemy-1",
  });

  assert.equal(friendly.selectable, false);
  assert.equal(friendly.reason, "target-not-opposing");
  assert.equal(dead.accepted, false);
  assert.equal(dead.reason, "target-dead");
});

test("only the active enemy can shoot during the enemy phase", () => {
  const createInitialBattle = requireExport("createInitialBattle");
  const createScriptedRandom = requireExport("createScriptedRandom");
  const dispatchBattleCommand = requireExport("dispatchBattleCommand");
  const resolveShoot = requireExport("resolveShoot");
  const initial = createInitialBattle({ seed: 12345 });
  const requested = dispatchBattleCommand(initial, { type: "REQUEST_END_TURN" });
  let enemyTurn = dispatchBattleCommand(requested.state, {
    type: "CONFIRM_END_TURN",
  }).state;
  enemyTurn = setUnit(enemyTurn, "enemy-1", {
    cell: { column: 0, row: 0 },
  });
  enemyTurn = setUnit(enemyTurn, "player-1", {
    cell: { column: 1, row: 0 },
  });
  enemyTurn = setUnit(enemyTurn, "enemy-2", {
    cell: { column: 0, row: 1 },
  });
  enemyTurn = {
    ...enemyTurn,
    random: createScriptedRandom([0, 0]),
  };

  const inactive = resolveShoot(enemyTurn, {
    shooterId: "enemy-2",
    targetId: "player-1",
  });
  const active = resolveShoot(enemyTurn, {
    shooterId: "enemy-1",
    targetId: "player-1",
  });

  assert.equal(inactive.accepted, false);
  assert.equal(inactive.reason, "shooter-not-active");
  assert.equal(active.accepted, true);
});
