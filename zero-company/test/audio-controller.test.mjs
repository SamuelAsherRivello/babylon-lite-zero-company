import assert from "node:assert/strict";
import test from "node:test";

import {
  AUDIO_EFFECTS,
  createAudioController,
  MUTE_STORAGE_KEY,
} from "../src/game/audioController.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
}

test("defines exactly four local gameplay effects", () => {
  assert.deepEqual(Object.keys(AUDIO_EFFECTS), ["step", "shot", "impact", "overwatch"]);
});

test("audio stays silent until unlocked and mute persists", async () => {
  const storage = createStorage();
  const played = [];
  const controller = createAudioController({
    baseUrl: "/babylon-lite-zero-company/",
    storage,
    createAudio: (url) => ({
      play: async () => played.push(url),
    }),
  });

  assert.equal(await controller.play("shot"), false);
  controller.unlock();
  assert.equal(await controller.play("shot"), true);
  assert.deepEqual(played, [
    "/babylon-lite-zero-company/assets/audio/shot.wav",
  ]);
  assert.equal(controller.setMuted(true), true);
  assert.equal(storage.values.get(MUTE_STORAGE_KEY), "true");
  assert.equal(await controller.play("impact"), false);
  assert.equal(played.length, 1);
});

test("blocked playback fails closed without throwing or replaying", async () => {
  let attempts = 0;
  const controller = createAudioController({
    storage: createStorage(),
    createAudio: () => ({
      play: async () => {
        attempts += 1;
        throw new Error("blocked");
      },
    }),
  });
  controller.unlock();

  assert.equal(await controller.play("overwatch"), false);
  assert.equal(attempts, 1);
});
