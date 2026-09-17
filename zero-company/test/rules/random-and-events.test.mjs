import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialBattle,
  createScriptedRandom,
  createSeededRandom,
  dispatchBattleCommand,
  nextRandom,
  resetRandomSource,
} from "../../src/game/rules/index.js";

function draw(source, count) {
  const values = [];
  let nextSource = source;

  for (let index = 0; index < count; index += 1) {
    const result = nextRandom(nextSource);
    values.push(result.value);
    nextSource = result.source;
  }

  return { values, source: nextSource };
}

test("seeded random draws are deterministic, immutable, and serializable", () => {
  const original = createSeededRandom(42);
  const firstRun = draw(original, 4);
  const secondRun = draw(createSeededRandom(42), 4);

  assert.deepEqual(firstRun.values, secondRun.values);
  assert.deepEqual(original, createSeededRandom(42));
  assert.equal(firstRun.source.draws, 4);
  assert.deepEqual(JSON.parse(JSON.stringify(firstRun.source)), firstRun.source);
});

test("scripted random draws use the script before deterministic fallback", () => {
  const original = createScriptedRandom([0.1, 0.9], { seed: 7 });
  const firstRun = draw(original, 4);
  const secondRun = draw(resetRandomSource(firstRun.source), 4);

  assert.deepEqual(firstRun.values.slice(0, 2), [0.1, 0.9]);
  assert.deepEqual(secondRun.values, firstRun.values);
  assert.equal(firstRun.source.index, 2);
  assert.equal(firstRun.source.fallback.draws, 2);
});

test("commands emit semantic events and reject invalid intent without mutation", () => {
  const initial = createInitialBattle({ seed: 42 });
  const rejected = dispatchBattleCommand(initial, { type: "NOT_A_COMMAND" });

  assert.equal(rejected.accepted, false);
  assert.equal(rejected.reason, "unknown-command");
  assert.equal(rejected.state, initial);
  assert.deepEqual(rejected.events, [
    {
      type: "command-rejected",
      command: "NOT_A_COMMAND",
      reason: "unknown-command",
    },
  ]);

  const requested = dispatchBattleCommand(initial, { type: "REQUEST_END_TURN" });
  assert.equal(requested.accepted, true);
  assert.deepEqual(requested.events, [
    { type: "end-turn-confirmation-requested" },
  ]);
});
