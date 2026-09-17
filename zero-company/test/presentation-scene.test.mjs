import assert from "node:assert/strict";
import test from "node:test";

import {
  createPresentationFailureGate,
  createPresentationQueue,
  createShotFeedbackTimeline,
  getPresentationTimings,
  resolvePresentationStatus,
  sampleUnitPresentationPose,
} from "../src/game/presentationScene.js";

test("forced presentation failure is scoped to one matching DEV playback", () => {
  const gate = createPresentationFailureGate("shot");

  assert.equal(gate.consume("move"), false);
  assert.equal(gate.pending, "shot");
  assert.equal(gate.consume("shot"), true);
  assert.equal(gate.pending, null);
  assert.equal(gate.consume("shot"), false);
});

test("presentation status applies the required precedence", () => {
  assert.equal(resolvePresentationStatus({ health: 0, activity: "moving", overwatch: {} }), "dead");
  assert.equal(resolvePresentationStatus({ health: 1, activity: "taking-damage", overwatch: {} }), "taking-damage");
  assert.equal(resolvePresentationStatus({ health: 1, activity: "moving", overwatch: {} }), "moving");
  assert.equal(resolvePresentationStatus({ health: 1, activity: "shooting", overwatch: {} }), "shooting");
  assert.equal(resolvePresentationStatus({ health: 1, activity: null, overwatch: {} }), "overwatch");
  assert.equal(resolvePresentationStatus({ health: 1, activity: null, overwatch: null }), "idle");
});

test("reduced motion shortens feedback and removes nonessential oscillation", () => {
  const standard = getPresentationTimings(false);
  const reduced = getPresentationTimings(true);

  assert.ok(reduced.moveStepMs < standard.moveStepMs);
  assert.ok(reduced.shotMs < standard.shotMs);
  assert.ok(reduced.deadSettleMs < standard.deadSettleMs);

  const idle = sampleUnitPresentationPose({ status: "idle", elapsed: 0.7 });
  const reducedIdle = sampleUnitPresentationPose({
    status: "idle",
    elapsed: 0.7,
    reducedMotion: true,
  });
  assert.notEqual(idle.positionY, 0);
  assert.equal(reducedIdle.positionY, 0);
  assert.equal(reducedIdle.rotationZ, 0);
});

test("presentation poses distinguish moving, shooting, damage, overwatch, and dead", () => {
  const moving = sampleUnitPresentationPose({ status: "moving", elapsed: 0.1 });
  const shooting = sampleUnitPresentationPose({
    status: "shooting",
    elapsed: 0.1,
    stateElapsed: 0.1,
  });
  const damaged = sampleUnitPresentationPose({
    status: "taking-damage",
    elapsed: 0.1,
    stateElapsed: 0.1,
  });
  const overwatch = sampleUnitPresentationPose({ status: "overwatch", elapsed: 0.4 });
  const settling = sampleUnitPresentationPose({
    status: "dead",
    elapsed: 0.1,
    stateElapsed: 0.08,
  });
  const settled = sampleUnitPresentationPose({
    status: "dead",
    elapsed: 1,
    stateElapsed: 1,
  });

  assert.ok(moving.positionY > 0);
  assert.ok(shooting.positionZ < 0);
  assert.ok(damaged.emissive.r > damaged.emissive.g);
  assert.notEqual(overwatch.rotationY, 0);
  assert.ok(Math.abs(settling.rotationZ) < Math.abs(settled.rotationZ));
  assert.equal(settled.rotationZ, -1.42);
});

test("shot feedback timeline keeps facing, muzzle, tracer, impact, and completion ordered", () => {
  assert.deepEqual(createShotFeedbackTimeline(true), [
    "shot-facing",
    "muzzle-flash",
    "tracer-visible",
    "impact-visible",
    "shot-complete",
  ]);
  assert.deepEqual(createShotFeedbackTimeline(false), [
    "shot-facing",
    "muzzle-flash",
    "tracer-visible",
    "miss-visible",
    "shot-complete",
  ]);
});

test("presentation queue preserves order and continues after failed feedback", async () => {
  const events = [];
  const queue = createPresentationQueue({
    onFailure: (label) => events.push(`${label}:fallback`),
  });

  const first = queue.enqueue("first", async () => {
    events.push("first:start");
    await Promise.resolve();
    events.push("first:end");
  });
  const failed = queue.enqueue("failed", () => {
    events.push("failed:start");
    throw new Error("visual feedback unavailable");
  });
  const last = queue.enqueue("last", () => {
    events.push("last:start");
  });

  assert.equal(await first, true);
  assert.equal(await failed, false);
  assert.equal(await last, true);
  assert.deepEqual(events, [
    "first:start",
    "first:end",
    "failed:start",
    "failed:fallback",
    "last:start",
  ]);
});
