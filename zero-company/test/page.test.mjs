import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import viteConfig from "../../vite.config.js";
import {
  CHARACTER_MODEL_RELATIVE_PATH,
  createPresentationDescriptors,
} from "../src/game/descriptors.js";

const appRoot = new URL("../", import.meta.url);

async function readAppFile(relativePath) {
  return readFile(new URL(relativePath, appRoot), "utf8");
}

test("builds for the GitHub Pages project path", () => {
  assert.equal(viteConfig.base, "/babylon-lite-zero-company/");
});

test("defines the exact presentation inventory from one local model", () => {
  const descriptors = createPresentationDescriptors("/test-base/");
  const players = descriptors.units.filter((unit) => unit.team === "player");
  const enemies = descriptors.units.filter((unit) => unit.team === "enemy");

  assert.equal(players.length, 3);
  assert.equal(enemies.length, 3);
  assert.equal(descriptors.covers.length, 3);
  assert.equal(descriptors.model.url, `/test-base/${CHARACTER_MODEL_RELATIVE_PATH}`);
  assert.equal(new Set(descriptors.units.map((unit) => unit.id)).size, 6);
  assert.equal(Object.isFrozen(descriptors), true);
  assert.equal(Object.isFrozen(descriptors.units), true);
});

test("bundles a valid self-contained GLB character", async () => {
  const model = await readFile(new URL(`../public/${CHARACTER_MODEL_RELATIVE_PATH}`, import.meta.url));
  assert.equal(model.subarray(0, 4).toString("ascii"), "glTF");
  assert.equal(model.readUInt32LE(4), 2);
  assert.equal(model.readUInt32LE(8), model.length);

  const jsonLength = model.readUInt32LE(12);
  const jsonType = model.readUInt32LE(16);
  assert.equal(jsonType, 0x4e4f534a);
  const gltf = JSON.parse(model.subarray(20, 20 + jsonLength).toString("utf8").trim());
  assert.equal(gltf.scenes.length, 1);
  assert.equal(gltf.nodes.length, 19);
  assert.equal(gltf.meshes.length, 3);
  assert.equal(gltf.materials.length, 3);
  assert.equal(gltf.images?.length ?? 0, 0);
  assert.equal(gltf.textures?.length ?? 0, 0);
  assert.equal(gltf.buffers.some((buffer) => "uri" in buffer), false);
});

test("uses a disposable scene lifecycle with local asset failure handling", async () => {
  const lifecycle = await readAppFile("src/game/sceneLifecycle.js");
  assert.match(lifecycle, /SceneLoader\.ImportMeshAsync/);
  assert.match(lifecycle, /callbacks\.onLoadingChange\(\{ status: "loading"/);
  assert.match(lifecycle, /status: "error"/);
  assert.match(lifecycle, /window\.removeEventListener\("resize", resize\)/);
  assert.match(lifecycle, /cameraController\.dispose\(\)/);
  assert.match(lifecycle, /engine\.dispose\(\)/);
  assert.match(lifecycle, /if \(disposed\)/);
});

test("renders the complete nonfunctional tactical interface", async () => {
  const page = await readAppFile("index.html");
  const app = await readAppFile("src/App.jsx");
  const styles = await readAppFile("src/style.css");

  assert.match(page, /<title>Zero Company<\/title>/);
  assert.match(page, /id="content_layer"/);
  assert.match(page, /id="ui_layer"/);
  assert.match(app, /PLAYER TURN/);
  for (const action of ["Move", "Shoot", "Overwatch", "End Turn"]) {
    assert.match(app, new RegExp(`label: "${action}"`));
  }
  assert.match(app, /aria-disabled="true"/);
  assert.match(app, /const ignorePresentationAction = \(\) => \{\};/);
  assert.match(app, /className="unit-health"/);
  assert.match(app, /className="ap-dots"/);
  assert.match(app, /aria-label="Overwatch"/);
  assert.match(styles, /grid-template-columns: repeat\(4, 78px\)/);
});

test("preserves the four corner roles and release version", async () => {
  const app = await readAppFile("src/App.jsx");
  for (const cornerClass of ["corner_top_left", "corner_top_right", "corner_bottom_left", "corner_bottom_right"]) {
    assert.match(app, new RegExp(`className="corner ${cornerClass}"`));
  }
  assert.match(app, /id="project_title"/);
  assert.match(app, /View the repository on GitHub/);
  assert.match(app, /id="settings"/);
  assert.match(app, /id="version"/);
  assert.match(app, /v\{versionNumber\}/);
});

test("defines the required responsive frame and input mappings", async () => {
  const app = await readAppFile("src/App.jsx");
  const camera = await readAppFile("src/game/cameraController.js");
  const styles = await readAppFile("src/style.css");

  assert.match(styles, /width: min\(100vw, calc\(100vh \* 16 \/ 9\)\)/);
  assert.match(styles, /height: min\(100vh, calc\(100vw \* 9 \/ 16\)\)/);
  assert.match(styles, /background: #080a0c/);
  assert.match(app, /\(orientation: portrait\) and \(pointer: coarse\)/);
  assert.match(app, /Rotate device/);
  assert.match(app, /inputEnabled=\{!portraitBlocked\}/);
  assert.match(camera, /event\.button === 2/);
  assert.match(camera, /addEventListener\("wheel"/);
  assert.match(camera, /pointer\.pointerType === "touch"/);
  assert.match(camera, /touchGesture\.distance \/ nextDistance/);
  assert.match(camera, /addEventListener\("contextmenu"/);
});
