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

function beginOverwatch(state, unitId = "player-1") {
  return rules.dispatchBattleCommand(state, {
    type: "BEGIN_ACTION",
    unitId,
    action: "overwatch",
  });
}

function aimOverwatch(state, unitId, targetCell) {
  return rules.dispatchBattleCommand(state, {
    type: "AIM_OVERWATCH",
    unitId,
    targetCell,
  });
}

function openLevel() {
  return { ...rules.LEVEL_DEFINITION, covers: [] };
}

function makeCommitment({
  ownerId,
  originCell,
  direction = { column: 0, row: 1 },
  shotsRemaining = 1,
}) {
  return {
    ownerId,
    originCell: { ...originCell },
    targetCell: {
      column: originCell.column + direction.column * 5,
      row: originCell.row + direction.row * 5,
    },
    direction: { ...direction },
    range: 6,
    halfAngle: Math.PI / 4,
    committedActionPoints: shotsRemaining,
    shotsRemaining,
  };
}

function reactionState({ shotsRemaining = 1, moverHealth = 10 } = {}) {
  const createScriptedRandom = requireExport("createScriptedRandom");
  let state = rules.createInitialBattle({ seed: 12345 });
  state = setUnit(state, "player-1", {
    cell: { column: 2, row: 1 },
    actionPoints: 0,
    overwatch: makeCommitment({
      ownerId: "player-1",
      originCell: { column: 2, row: 1 },
      shotsRemaining,
    }),
  });
  state = setUnit(state, "enemy-1", {
    cell: { column: 2, row: 4 },
    health: moverHealth,
  });
  return {
    ...state,
    phase: "enemy",
    activeUnitId: "enemy-1",
    enemyActivationOrder: ["enemy-1", "enemy-2", "enemy-3"],
    enemyActivationIndex: 0,
    random: createScriptedRandom([0, 0.999, 0, 0.999, 0, 0.999]),
  };
}

test("selecting Overwatch starts a preview without spending AP", () => {
  const initial = rules.createInitialBattle({ seed: 12345 });
  const apBefore = getUnit(initial, "player-1").actionPoints;
  const outcome = beginOverwatch(initial);

  assert.equal(outcome.accepted, true);
  assert.deepEqual(outcome.state.pendingAction, {
    unitId: "player-1",
    action: "overwatch",
    targetCell: null,
    direction: null,
  });
  assert.equal(getUnit(outcome.state, "player-1").actionPoints, apBefore);
  assert.equal(getUnit(outcome.state, "player-1").overwatch, null);
});

test("repeated floor retargeting updates direction without spending AP", () => {
  const initial = beginOverwatch(
    rules.createInitialBattle({ seed: 12345 }),
  ).state;
  const first = aimOverwatch(initial, "player-1", { column: 2, row: 6 });
  const second = aimOverwatch(first.state, "player-1", {
    column: 6,
    row: 1,
  });

  assert.equal(first.accepted, true);
  assert.deepEqual(first.state.pendingAction.direction, { column: 0, row: 1 });
  assert.equal(second.accepted, true);
  assert.deepEqual(second.state.pendingAction.targetCell, { column: 6, row: 1 });
  assert.deepEqual(second.state.pendingAction.direction, { column: 1, row: 0 });
  assert.equal(getUnit(second.state, "player-1").actionPoints, 3);
  assert.deepEqual(second.events, [
    {
      type: "overwatch-preview-updated",
      unitId: "player-1",
      targetCell: { column: 6, row: 1 },
      direction: { column: 1, row: 0 },
    },
  ]);
});

test("a second Overwatch command commits every remaining AP as shots", () => {
  for (const actionPoints of [1, 2, 3]) {
    let state = rules.createInitialBattle({ seed: 12345 });
    state = setUnit(state, "player-1", { actionPoints });
    state = beginOverwatch(state).state;
    state = aimOverwatch(state, "player-1", { column: 2, row: 6 }).state;
    const confirmed = beginOverwatch(state);
    const unit = getUnit(confirmed.state, "player-1");
    const inspection = rules.getUnitInspection(confirmed.state, "player-1");

    assert.equal(confirmed.accepted, true);
    assert.equal(unit.actionPoints, 0);
    assert.equal(unit.overwatch.committedActionPoints, actionPoints);
    assert.equal(unit.overwatch.shotsRemaining, actionPoints);
    assert.equal(inspection.actionPoints, 0);
    assert.equal(inspection.status, "Overwatch");
    assert.deepEqual(inspection.overwatch, unit.overwatch);
    assert.equal(confirmed.state.pendingAction, null);
    assert.deepEqual(rules.getAvailableActions(confirmed.state, "player-1"), []);
    assert.equal(
      confirmed.events.some((event) => event.type === "overwatch-committed"),
      true,
    );
  }
});

test("CONFIRM_OVERWATCH commits the latest retargeted preview", () => {
  assert.equal(rules.COMMANDS.CONFIRM_OVERWATCH, "CONFIRM_OVERWATCH");
  let state = rules.createInitialBattle({ seed: 12345 });
  state = setUnit(state, "player-1", { actionPoints: 2 });
  state = beginOverwatch(state).state;
  state = aimOverwatch(state, "player-1", { column: 2, row: 6 }).state;
  state = aimOverwatch(state, "player-1", { column: 6, row: 1 }).state;

  const outcome = rules.dispatchBattleCommand(state, {
    type: "CONFIRM_OVERWATCH",
    unitId: "player-1",
  });
  const unit = getUnit(outcome.state, "player-1");

  assert.equal(outcome.accepted, true);
  assert.equal(unit.actionPoints, 0);
  assert.equal(unit.overwatch.committedActionPoints, 2);
  assert.equal(unit.overwatch.shotsRemaining, 2);
  assert.deepEqual(unit.overwatch.originCell, { column: 2, row: 1 });
  assert.deepEqual(unit.overwatch.targetCell, { column: 6, row: 1 });
  assert.deepEqual(unit.overwatch.direction, { column: 1, row: 0 });
  assert.equal(unit.overwatch.range, 6);
  assert.equal(unit.overwatch.halfAngle, Math.PI / 4);
  assert.equal(outcome.state.pendingAction, null);
});

test("cone eligibility uses ground-plane cell centers and obstacle-only LOS", () => {
  const isCellInOverwatchCone = requireExport("isCellInOverwatchCone");
  const getOverwatchReactionEligibility = requireExport(
    "getOverwatchReactionEligibility",
  );
  const commitment = makeCommitment({
    ownerId: "player-1",
    originCell: { column: 2, row: 1 },
  });

  assert.equal(
    isCellInOverwatchCone(commitment, { column: 2, row: 4 }),
    true,
  );
  assert.equal(
    isCellInOverwatchCone(commitment, { column: 6, row: 1 }),
    false,
  );
  assert.equal(
    isCellInOverwatchCone(commitment, { column: 2, row: 7 }),
    false,
  );

  let state = reactionState();
  state = setUnit(state, "player-2", {
    cell: { column: 2, row: 2 },
    health: 10,
  });
  state = setUnit(state, "enemy-2", {
    cell: { column: 2, row: 3 },
    health: 0,
  });
  const clear = getOverwatchReactionEligibility(state, {
    reactorId: "player-1",
    moverId: "enemy-1",
    completedCell: { column: 2, row: 4 },
    level: openLevel(),
  });
  const blockedLevel = {
    ...openLevel(),
    covers: [
      {
        id: "blocking-cover",
        cells: [{ column: 2, row: 3 }],
      },
    ],
  };
  const blocked = getOverwatchReactionEligibility(state, {
    reactorId: "player-1",
    moverId: "enemy-1",
    completedCell: { column: 2, row: 4 },
    level: blockedLevel,
  });

  assert.equal(clear.eligible, true, "Living and dead characters do not block LOS.");
  assert.equal(blocked.eligible, false);
  assert.equal(blocked.reason, "line-of-sight-blocked");
});

test("reactions resolve only after an opponent completes a movement step", () => {
  const resolveOverwatchReactions = requireExport("resolveOverwatchReactions");
  const state = reactionState();
  const beforeStep = resolveOverwatchReactions(state, {
    moverId: "enemy-1",
    completedCell: { column: 2, row: 4 },
    remainingPath: [{ column: 2, row: 5 }],
    stepCompleted: false,
    level: openLevel(),
  });
  const afterStep = resolveOverwatchReactions(state, {
    moverId: "enemy-1",
    completedCell: { column: 2, row: 4 },
    remainingPath: [{ column: 2, row: 5 }],
    stepCompleted: true,
    level: openLevel(),
  });

  assert.equal(beforeStep.state, state);
  assert.deepEqual(beforeStep.reactions, []);
  assert.equal(afterStep.reactions.length, 1);
  assert.equal(afterStep.reactions[0].reactorId, "player-1");
});

test("one committed AP permits at most one reaction shot", () => {
  const resolveOverwatchReactions = requireExport("resolveOverwatchReactions");
  const state = reactionState({ shotsRemaining: 1 });
  const first = resolveOverwatchReactions(state, {
    moverId: "enemy-1",
    completedCell: { column: 2, row: 4 },
    remainingPath: [{ column: 2, row: 5 }],
    stepCompleted: true,
    level: openLevel(),
  });
  const movedAgain = setUnit(first.state, "enemy-1", {
    cell: { column: 2, row: 5 },
  });
  const second = resolveOverwatchReactions(movedAgain, {
    moverId: "enemy-1",
    completedCell: { column: 2, row: 5 },
    remainingPath: [],
    stepCompleted: true,
    level: openLevel(),
  });

  assert.equal(first.reactions.length, 1);
  assert.equal(getUnit(first.state, "player-1").overwatch.shotsRemaining, 0);
  assert.deepEqual(second.reactions, []);
});

test("multiple eligible reactors fire in stable roster order", () => {
  const resolveOverwatchReactions = requireExport("resolveOverwatchReactions");
  let state = reactionState({ shotsRemaining: 1 });
  state = setUnit(state, "player-2", {
    cell: { column: 3, row: 1 },
    actionPoints: 0,
    overwatch: makeCommitment({
      ownerId: "player-2",
      originCell: { column: 3, row: 1 },
      direction: { column: -1 / Math.sqrt(10), row: 3 / Math.sqrt(10) },
      shotsRemaining: 1,
    }),
  });
  const outcome = resolveOverwatchReactions(state, {
    moverId: "enemy-1",
    completedCell: { column: 2, row: 4 },
    remainingPath: [],
    stepCompleted: true,
    level: openLevel(),
  });

  assert.deepEqual(
    outcome.reactions.map((reaction) => reaction.reactorId),
    ["player-1", "player-2"],
  );
});

test("cone misses and cover-blocked LOS consume no shot or random draw", () => {
  const resolveOverwatchReactions = requireExport("resolveOverwatchReactions");
  const state = reactionState({ shotsRemaining: 2 });
  const randomBefore = structuredClone(state.random);
  const coneMissState = setUnit(state, "enemy-1", {
    cell: { column: 6, row: 1 },
  });
  const coneMiss = resolveOverwatchReactions(coneMissState, {
    moverId: "enemy-1",
    completedCell: { column: 6, row: 1 },
    remainingPath: [],
    stepCompleted: true,
    level: openLevel(),
  });
  const blocked = resolveOverwatchReactions(state, {
    moverId: "enemy-1",
    completedCell: { column: 2, row: 4 },
    remainingPath: [],
    stepCompleted: true,
    level: {
      ...openLevel(),
      covers: [
        { id: "blocking-cover", cells: [{ column: 2, row: 3 }] },
      ],
    },
  });

  assert.deepEqual(coneMiss.reactions, []);
  assert.deepEqual(blocked.reactions, []);
  assert.equal(getUnit(coneMiss.state, "player-1").overwatch.shotsRemaining, 2);
  assert.equal(getUnit(blocked.state, "player-1").overwatch.shotsRemaining, 2);
  assert.deepEqual(coneMiss.state.random, randomBefore);
  assert.deepEqual(blocked.state.random, randomBefore);
});

test("same-side movement and the owner's phase cannot trigger reactions", () => {
  const resolveOverwatchReactions = requireExport("resolveOverwatchReactions");
  const state = reactionState({ shotsRemaining: 2 });
  const randomBefore = structuredClone(state.random);
  const sameSideState = setUnit(state, "player-2", {
    cell: { column: 2, row: 4 },
  });
  const sameSide = resolveOverwatchReactions(sameSideState, {
    moverId: "player-2",
    completedCell: { column: 2, row: 4 },
    remainingPath: [],
    stepCompleted: true,
    level: openLevel(),
  });
  const ownerPhaseState = {
    ...state,
    phase: "player",
    activeUnitId: null,
  };
  const ownerPhase = resolveOverwatchReactions(ownerPhaseState, {
    moverId: "enemy-1",
    completedCell: { column: 2, row: 4 },
    remainingPath: [],
    stepCompleted: true,
    level: openLevel(),
  });

  for (const outcome of [sameSide, ownerPhase]) {
    assert.deepEqual(outcome.reactions, []);
    assert.equal(
      getUnit(outcome.state, "player-1").overwatch.shotsRemaining,
      2,
    );
    assert.deepEqual(outcome.state.random, randomBefore);
  }
});

test("Overwatch expires when the owner's next side turn starts", () => {
  let state = rules.createInitialBattle({ seed: 12345 });
  const commitment = makeCommitment({
    ownerId: "player-1",
    originCell: getUnit(state, "player-1").cell,
    shotsRemaining: 2,
  });
  state = setUnit(state, "player-1", {
    actionPoints: 0,
    overwatch: commitment,
  });

  assert.deepEqual(getUnit(state, "player-1").overwatch, commitment);
  assert.equal(getUnit(state, "player-1").overwatch.shotsRemaining, 2);

  let transition = rules.dispatchBattleCommand(state, {
    type: "REQUEST_END_TURN",
  });
  if (transition.state.pendingConfirmation === "end-turn") {
    transition = rules.dispatchBattleCommand(transition.state, {
      type: "CONFIRM_END_TURN",
    });
  }
  state = transition.state;
  for (let index = 0; index < 3; index += 1) {
    state = rules.dispatchBattleCommand(state, {
      type: "RELINQUISH_ACTIVE_ENEMY",
    }).state;
  }

  assert.equal(state.phase, "player");
  assert.equal(getUnit(state, "player-1").actionPoints, 3);
  assert.equal(getUnit(state, "player-1").overwatch, null);
});

test("lethal reaction stops movement, clears queued activity, and ends battle", () => {
  const resolveOverwatchReactions = requireExport("resolveOverwatchReactions");
  let state = reactionState({ shotsRemaining: 1, moverHealth: 1 });
  state = setUnit(state, "enemy-2", { health: 0 });
  state = setUnit(state, "enemy-3", { health: 0 });
  state = {
    ...state,
    pendingResolution: {
      type: "move",
      unitId: "enemy-1",
      remainingPath: [
        { column: 2, row: 5 },
        { column: 2, row: 6 },
      ],
    },
  };
  const outcome = resolveOverwatchReactions(state, {
    moverId: "enemy-1",
    completedCell: { column: 2, row: 4 },
    remainingPath: state.pendingResolution.remainingPath,
    stepCompleted: true,
    level: openLevel(),
  });

  assert.equal(getUnit(outcome.state, "enemy-1").health, 0);
  assert.equal(outcome.movementStopped, true);
  assert.deepEqual(outcome.remainingPath, []);
  assert.equal(outcome.state.pendingResolution, null);
  assert.equal(outcome.state.result, "victory");
  assert.equal(outcome.state.phase, "result");
  assert.equal(
    outcome.events.some((event) => event.type === "battle-ended"),
    true,
  );
});
