import assert from "node:assert/strict";
import test from "node:test";

import * as rules from "../../src/game/rules/index.js";

function requireAiApi() {
  for (const name of ["enumerateEnemyPlans", "chooseEnemyPlan", "createEnemyIntentViewModel"]) {
    assert.equal(
      typeof rules[name],
      "function",
      `Rules API must export ${name}().`,
    );
  }
  return {
    enumerateEnemyPlans: rules.enumerateEnemyPlans,
    chooseEnemyPlan: rules.chooseEnemyPlan,
    createEnemyIntentViewModel: rules.createEnemyIntentViewModel,
  };
}

function requireEnemyOverwatchResolver() {
  assert.equal(
    typeof rules.resolveEnemyOverwatch,
    "function",
    "Rules API must export resolveEnemyOverwatch().",
  );
  return rules.resolveEnemyOverwatch;
}

function startEnemyTurn(state = rules.createInitialBattle({ seed: 12345 })) {
  let transition = rules.dispatchBattleCommand(state, {
    type: "REQUEST_END_TURN",
  });
  if (transition.state.pendingConfirmation === "end-turn") {
    transition = rules.dispatchBattleCommand(transition.state, {
      type: "CONFIRM_END_TURN",
    });
  }
  assert.equal(transition.state.phase, "enemy");
  return transition.state;
}

function setUnit(state, unitId, changes) {
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.id === unitId ? { ...unit, ...changes } : unit,
    ),
  };
}

function scenarioState({
  enemyCell = { column: 2, row: 6 },
  enemyActionPoints = 3,
  enemyWeaponId = "balanced",
  playerCell = { column: 2, row: 1 },
  random = rules.createScriptedRandom([0, 0]),
} = {}) {
  let state = startEnemyTurn();
  const defaults = {
    "player-1": { health: 10, cell: playerCell },
    "player-2": { health: 0, cell: { column: 0, row: 0 } },
    "player-3": { health: 0, cell: { column: 12, row: 0 } },
    "enemy-1": {
      health: 10,
      cell: enemyCell,
      actionPoints: enemyActionPoints,
      weaponId: enemyWeaponId,
    },
    "enemy-2": {
      health: 0,
      cell: { column: 0, row: 7 },
      actionPoints: 0,
    },
    "enemy-3": {
      health: 0,
      cell: { column: 12, row: 7 },
      actionPoints: 0,
    },
  };

  for (const [unitId, changes] of Object.entries(defaults)) {
    state = setUnit(state, unitId, changes);
  }

  return {
    ...state,
    activeUnitId: "enemy-1",
    enemyActivationOrder: ["enemy-1"],
    enemyActivationIndex: 0,
    random,
  };
}

function levelWithCovers(cells = []) {
  return {
    ...rules.LEVEL_DEFINITION,
    covers:
      cells.length === 0
        ? []
        : [{ id: "test-cover", cells: cells.map((cell) => ({ ...cell })) }],
  };
}

function expectedDamage(preview) {
  return preview.hitProbability * ((preview.minDamage + preview.maxDamage) / 2);
}

function assertNear(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `${message}: expected ${expected}, received ${actual}`,
  );
}

test("candidate plans use shared legal actions and reject obstacle-blocked shots", () => {
  const { enumerateEnemyPlans } = requireAiApi();
  const level = levelWithCovers([{ column: 6, row: 3 }]);
  let state = scenarioState({ enemyCell: { column: 6, row: 6 } });
  state = setUnit(state, "player-1", {
    health: 10,
    cell: { column: 6, row: 1 },
  });
  state = setUnit(state, "player-2", {
    health: 10,
    cell: { column: 10, row: 5 },
  });
  const plans = enumerateEnemyPlans(state, { level });
  const immediateShots = plans.filter((plan) => plan.action === "shoot");
  const movePlans = plans.filter((plan) => plan.action === "move");
  const overwatchPlan = plans.find((plan) => plan.action === "overwatch");
  const blockedPreview = rules.getAttackPreview(
    state,
    "enemy-1",
    "player-1",
    { level },
  );
  const visiblePreview = rules.getAttackPreview(
    state,
    "enemy-1",
    "player-2",
    { level },
  );
  const reachable = new Map(
    rules
      .getReachableDestinations(state, "enemy-1", { level })
      .map((entry) => [
        `${entry.cell.column},${entry.cell.row}`,
        entry.minimumActionPoints,
      ]),
  );

  assert.equal(blockedPreview.reason, "line-of-sight-blocked");
  assert.equal(
    immediateShots.some((plan) => plan.targetId === "player-1"),
    false,
  );
  const visibleShot = immediateShots.find(
    (plan) => plan.targetId === "player-2",
  );
  assert.deepEqual(visibleShot.preview, visiblePreview);
  assert.equal(visibleShot.cost, visiblePreview.apCost);

  assert.ok(movePlans.length > 0);
  for (const plan of movePlans) {
    assert.equal(
      plan.cost,
      reachable.get(`${plan.destination.column},${plan.destination.row}`),
    );
  }

  assert.ok(overwatchPlan);
  assert.equal(overwatchPlan.cost, 3);
  assertNear(
    Math.hypot(
      overwatchPlan.direction.column,
      overwatchPlan.direction.row,
    ),
    1,
    "Overwatch direction is normalized",
  );
  assert.deepEqual(
    plans.map((plan) => plan.unitId).filter((id) => id !== "enemy-1"),
    [],
  );
});

test("expected damage is primary and planning never reads future random results", () => {
  const { chooseEnemyPlan } = requireAiApi();
  let favorable = scenarioState({
    enemyCell: { column: 5, row: 5 },
    enemyActionPoints: 1,
    random: rules.createScriptedRandom([0, 0]),
  });
  favorable = setUnit(favorable, "player-1", {
    cell: { column: 5, row: 4 },
  });
  favorable = setUnit(favorable, "player-2", {
    health: 10,
    cell: { column: 5, row: 1 },
  });
  const unfavorable = {
    ...structuredClone(favorable),
    random: rules.createScriptedRandom([0.999, 0.999]),
  };
  const favorableRandomBefore = structuredClone(favorable.random);
  const unfavorableRandomBefore = structuredClone(unfavorable.random);
  const first = chooseEnemyPlan(favorable, { level: levelWithCovers() });
  const second = chooseEnemyPlan(unfavorable, { level: levelWithCovers() });
  const preview = rules.getAttackPreview(
    favorable,
    "enemy-1",
    "player-1",
    { level: levelWithCovers() },
  );

  assert.equal(first.action, "shoot");
  assert.equal(first.targetId, "player-1");
  assertNear(
    first.expectedDamage,
    expectedDamage(preview),
    "Plan uses probability-weighted average damage",
  );
  assert.deepEqual(first, second);
  assert.deepEqual(favorable.random, favorableRandomBefore);
  assert.deepEqual(unfavorable.random, unfavorableRandomBefore);
});

test("enemy shoot plans convert to serializable intent without consuming random", () => {
  const { chooseEnemyPlan, createEnemyIntentViewModel } = requireAiApi();
  const level = levelWithCovers();
  let state = scenarioState({
    enemyCell: { column: 2, row: 3 },
    enemyActionPoints: 1,
    enemyWeaponId: "short",
    playerCell: { column: 2, row: 2 },
  });
  state = setUnit(state, "player-2", {
    health: 10,
    cell: { column: 2, row: 0 },
  });
  const randomBefore = structuredClone(state.random);
  const plan = chooseEnemyPlan(state, { level });
  const intent = createEnemyIntentViewModel(plan, state);

  assert.equal(intent.action, "shoot");
  assert.equal(intent.unitId, "enemy-1");
  assert.equal(intent.targetId, "player-1");
  assert.equal(intent.cost, 1);
  assert.deepEqual(intent.originCell, { column: 2, row: 3 });
  assert.deepEqual(intent.targetCell, { column: 2, row: 2 });
  assert.equal(intent.preview.hitProbability, plan.preview.hitProbability);
  assert.equal(intent.preview.maxDamage, plan.preview.maxDamage);
  assert.deepEqual(intent.sequence, ["shoot"]);
  assert.doesNotThrow(() => JSON.stringify(intent));
  assert.deepEqual(state.random, randomBefore);
});

test("an immediate adjacent best shot is selected as the first action", () => {
  const { chooseEnemyPlan } = requireAiApi();
  let state = scenarioState({
    enemyCell: { column: 2, row: 3 },
    enemyActionPoints: 1,
    enemyWeaponId: "short",
    playerCell: { column: 2, row: 2 },
  });
  state = setUnit(state, "player-2", {
    health: 10,
    cell: { column: 2, row: 0 },
  });
  const decision = chooseEnemyPlan(state, { level: levelWithCovers() });

  assert.equal(decision.unitId, "enemy-1");
  assert.equal(decision.action, "shoot");
  assert.equal(decision.targetId, "player-1");
  assert.equal(decision.cost, 1);
  assert.deepEqual(
    decision.sequence.map((step) => step.action),
    ["shoot"],
  );
});

test("the planner moves closer before shooting when that improves expected damage", () => {
  const { chooseEnemyPlan, createEnemyIntentViewModel } = requireAiApi();
  const level = levelWithCovers();
  const state = scenarioState({
    enemyCell: { column: 2, row: 6 },
    enemyActionPoints: 3,
    enemyWeaponId: "balanced",
    playerCell: { column: 2, row: 1 },
  });
  const immediate = rules.getAttackPreview(
    state,
    "enemy-1",
    "player-1",
    { level },
  );
  const decision = chooseEnemyPlan(state, { level });

  assert.equal(decision.action, "move");
  assert.deepEqual(decision.destination, { column: 2, row: 2 });
  assert.equal(decision.cost, 2);
  assert.deepEqual(
    decision.sequence.map((step) => step.action),
    ["move", "shoot"],
  );
  assert.equal(decision.sequence[1].targetId, "player-1");
  assert.equal(decision.sequence[1].cost, 1);
  assert.ok(decision.expectedDamage > expectedDamage(immediate));
  assert.equal(
    decision.sequence.reduce((sum, step) => sum + step.cost, 0),
    3,
  );

  const stateBefore = structuredClone(state);
  const intent = createEnemyIntentViewModel(decision, state);
  assert.equal(intent.action, "move");
  assert.equal(intent.cost, 2);
  assert.equal(intent.totalCost, 3);
  assert.deepEqual(intent.destination, { column: 2, row: 2 });
  assert.deepEqual(intent.path.at(-1), { column: 2, row: 2 });
  assert.deepEqual(intent.sequence, ["move", "shoot"]);
  assert.equal(intent.followUp.action, "shoot");
  assert.equal(intent.followUp.targetId, "player-1");
  assert.deepEqual(intent.followUp.targetCell, { column: 2, row: 1 });
  assert.equal(intent.followUp.preview.maxDamage, decision.followUp.preview.maxDamage);
  assert.doesNotThrow(() => JSON.stringify(intent));
  assert.deepEqual(state, stateBefore);
});

test("the planner can move to flank when cover defense suppresses a shot", () => {
  const { chooseEnemyPlan } = requireAiApi();
  const level = levelWithCovers([{ column: 5, row: 3 }]);
  const state = scenarioState({
    enemyCell: { column: 4, row: 4 },
    enemyActionPoints: 3,
    enemyWeaponId: "balanced",
    playerCell: { column: 6, row: 4 },
  });
  const immediate = rules.getAttackPreview(
    state,
    "enemy-1",
    "player-1",
    { level },
  );
  const decision = chooseEnemyPlan(state, { level });

  assert.equal(immediate.selectable, true);
  assert.equal(immediate.coverDefense.active, true);
  assert.equal(decision.action, "move");
  assert.equal(decision.followUp.targetId, "player-1");
  assert.equal(decision.followUp.preview.coverDefense.active, false);
  assert.ok(decision.expectedDamage > expectedDamage(immediate));
});

test("defensive Overwatch covers the approach lane when no attack can deal damage", () => {
  const { chooseEnemyPlan, createEnemyIntentViewModel } = requireAiApi();
  const level = levelWithCovers([{ column: 6, row: 3 }]);
  const state = scenarioState({
    enemyCell: { column: 6, row: 6 },
    enemyActionPoints: 1,
    playerCell: { column: 6, row: 1 },
  });
  const decision = chooseEnemyPlan(state, { level });

  assert.equal(decision.unitId, "enemy-1");
  assert.equal(decision.action, "overwatch");
  assert.equal(decision.cost, 1);
  assert.equal(decision.expectedDamage, 0);
  assert.deepEqual(decision.targetCell, { column: 6, row: 1 });
  assert.deepEqual(decision.direction, { column: 0, row: -1 });
  assert.deepEqual(
    decision.sequence.map((step) => step.action),
    ["overwatch"],
  );

  const stateBefore = structuredClone(state);
  const intent = createEnemyIntentViewModel(decision, state);
  assert.equal(intent.action, "overwatch");
  assert.equal(intent.cost, 1);
  assert.deepEqual(intent.originCell, { column: 6, row: 6 });
  assert.deepEqual(intent.targetCell, { column: 6, row: 1 });
  assert.deepEqual(intent.direction, { column: 0, row: -1 });
  assert.equal(intent.range, rules.OVERWATCH_PROFILE.range);
  assert.equal(intent.widthRatio, decision.widthRatio);
  assert.equal(intent.halfAngle, decision.halfAngle);
  assert.deepEqual(intent.sequence, ["overwatch"]);
  assert.deepEqual(state, stateBefore);
});

test("equal-utility plans use stable unit and cell tie-breaking", () => {
  const { chooseEnemyPlan } = requireAiApi();
  let state = scenarioState({
    enemyCell: { column: 6, row: 6 },
    enemyActionPoints: 1,
  });
  state = setUnit(state, "player-1", {
    health: 10,
    cell: { column: 4, row: 2 },
  });
  state = setUnit(state, "player-2", {
    health: 10,
    cell: { column: 8, row: 2 },
  });
  const snapshots = Array.from({ length: 5 }, () =>
    chooseEnemyPlan(structuredClone(state), { level: levelWithCovers() }),
  );

  for (const decision of snapshots) {
    assert.deepEqual(decision, snapshots[0]);
  }
  assert.equal(snapshots[0].action, "shoot");
  assert.equal(snapshots[0].targetId, "player-1");
});

test(
  "no useful legal action produces a bounded serializable relinquish decision",
  { timeout: 250 },
  () => {
    const { chooseEnemyPlan, createEnemyIntentViewModel } = requireAiApi();
    let state = scenarioState({ enemyActionPoints: 3 });
    state = setUnit(state, "player-1", { health: 0 });
    const stateBefore = structuredClone(state);
    const decision = chooseEnemyPlan(state, { level: levelWithCovers() });

    assert.deepEqual(decision, {
      unitId: "enemy-1",
      action: "relinquish",
      cost: 0,
      expectedDamage: 0,
      reason: "no-useful-action",
      sequence: [],
    });
    assert.doesNotThrow(() => JSON.stringify(decision));
    assert.deepEqual(createEnemyIntentViewModel(decision, state), {
      unitId: "enemy-1",
      action: "relinquish",
      cost: 0,
      totalCost: 0,
      targetId: null,
      originCell: { column: 2, row: 6 },
      sequence: [],
      reason: "no-useful-action",
    });
    assert.deepEqual(state, stateBefore);
  },
);

test("only the active enemy plans, following stable activation order", () => {
  const { enumerateEnemyPlans, chooseEnemyPlan } = requireAiApi();
  let state = startEnemyTurn();
  const stateBefore = structuredClone(state);
  const first = chooseEnemyPlan(state);
  const inactivePlans = enumerateEnemyPlans(state, { unitId: "enemy-2" });

  assert.equal(state.activeUnitId, "enemy-1");
  assert.equal(first.unitId, "enemy-1");
  assert.deepEqual(inactivePlans, []);
  assert.deepEqual(state, stateBefore);

  state = rules.dispatchBattleCommand(state, {
    type: "RELINQUISH_ACTIVE_ENEMY",
  }).state;
  const second = chooseEnemyPlan(state);
  assert.equal(state.activeUnitId, "enemy-2");
  assert.equal(second.unitId, "enemy-2");
});

test("enemy Overwatch execution commits all remaining 1, 2, or 3 AP", () => {
  const resolveEnemyOverwatch = requireEnemyOverwatchResolver();
  const { enumerateEnemyPlans } = requireAiApi();
  const level = levelWithCovers();

  for (const actionPoints of [1, 2, 3]) {
    const state = scenarioState({ enemyActionPoints: actionPoints });
    const stateBefore = structuredClone(state);
    const plan = enumerateEnemyPlans(state, { level }).find(
      (candidate) =>
        candidate.action === "overwatch" &&
        candidate.targetId === "player-1",
    );
    const outcome = resolveEnemyOverwatch(state, plan, { level });
    const unit = outcome.state.units.find((candidate) =>
      candidate.id === "enemy-1",
    );

    assert.ok(plan, "The shared planner offers directional Overwatch.");
    assert.equal(outcome.accepted, true);
    assert.equal(outcome.cost, actionPoints);
    assert.equal(unit.actionPoints, 0);
    assert.equal(unit.overwatch.committedActionPoints, actionPoints);
    assert.equal(unit.overwatch.shotsRemaining, actionPoints);
    assert.deepEqual(unit.overwatch.originCell, stateBefore.units[3].cell);
    assert.deepEqual(unit.overwatch.targetCell, plan.targetCell);
    assert.deepEqual(unit.overwatch.direction, plan.direction);
    assert.deepEqual(outcome.commitment, unit.overwatch);
    assert.equal(outcome.state.activeUnitId, "enemy-1");
    assert.deepEqual(
      outcome.events.map((event) => event.type),
      ["enemy-intent-declared", "overwatch-committed"],
    );
    assert.deepEqual(state, stateBefore, "Planning execution remains pure.");
    assert.doesNotThrow(() => JSON.stringify(outcome));
  }
});

test("enemy Overwatch rejects inactive enemies and the player phase unchanged", () => {
  const resolveEnemyOverwatch = requireEnemyOverwatchResolver();
  const enemyTurn = startEnemyTurn();
  const inactivePlan = {
    unitId: "enemy-2",
    action: "overwatch",
    targetCell: { column: 6, row: 1 },
    direction: { column: 0, row: -1 },
    cost: 3,
  };
  const inactive = resolveEnemyOverwatch(enemyTurn, inactivePlan);

  assert.equal(inactive.accepted, false);
  assert.equal(inactive.reason, "enemy-not-active");
  assert.equal(inactive.state, enemyTurn);
  assert.equal(inactive.cost, 0);

  const playerTurn = rules.createInitialBattle({ seed: 12345 });
  const wrongPhasePlan = {
    unitId: "enemy-1",
    action: "overwatch",
    targetCell: { column: 2, row: 1 },
    direction: { column: 0, row: -1 },
    cost: 0,
  };
  const wrongPhase = resolveEnemyOverwatch(playerTurn, wrongPhasePlan);

  assert.equal(wrongPhase.accepted, false);
  assert.equal(wrongPhase.reason, "wrong-phase");
  assert.equal(wrongPhase.state, playerTurn);
  assert.equal(wrongPhase.cost, 0);
});

test("enemy Overwatch rejects zero AP and invalid target directions without mutation", () => {
  const resolveEnemyOverwatch = requireEnemyOverwatchResolver();
  const state = scenarioState({ enemyActionPoints: 3 });
  const unit = state.units.find((candidate) => candidate.id === "enemy-1");
  const invalidPlans = [
    {
      plan: {
        unitId: unit.id,
        action: "overwatch",
        targetCell: { ...unit.cell },
        direction: { column: 0, row: 0 },
        cost: 3,
      },
      reason: "invalid-overwatch-direction",
    },
    {
      plan: {
        unitId: unit.id,
        action: "overwatch",
        targetCell: { column: -1, row: 1 },
        direction: { column: -1, row: -1 },
        cost: 3,
      },
      reason: "invalid-target-cell",
    },
    {
      plan: {
        unitId: unit.id,
        action: "overwatch",
        targetCell: { column: 2, row: 1 },
        direction: { column: 1, row: 0 },
        cost: 3,
      },
      reason: "overwatch-direction-mismatch",
    },
  ];

  for (const { plan, reason } of invalidPlans) {
    const outcome = resolveEnemyOverwatch(state, plan);
    assert.equal(outcome.accepted, false);
    assert.equal(outcome.reason, reason);
    assert.equal(outcome.state, state);
    assert.equal(outcome.cost, 0);
  }

  const noApState = setUnit(state, "enemy-1", { actionPoints: 0 });
  const noAp = resolveEnemyOverwatch(noApState, {
    unitId: "enemy-1",
    action: "overwatch",
    targetCell: { column: 2, row: 1 },
    direction: { column: 0, row: -1 },
    cost: 0,
  });
  assert.equal(noAp.accepted, false);
  assert.equal(noAp.reason, "insufficient-action-points");
  assert.equal(noAp.state, noApState);
});
