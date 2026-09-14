import { readFile } from "node:fs/promises";
import test from "node:test";

const appRoot = new URL("../", import.meta.url);

test("documents the Phaser 4 platformer and loads its game module", async () => {
  const page = await readFile(new URL("index.html", appRoot), "utf8");

  if (!page.includes("<title>Phaser 4 Platformer</title>")) {
    throw new Error("The browser title must identify the Phaser platformer.");
  }
  if (!page.includes('id="content_layer"')) {
    throw new Error("The page needs a dedicated game-engine layer.");
  }
  if (!page.includes('id="ui_layer"')) {
    throw new Error("The page needs a separate HTML UI layer.");
  }
  if (!page.includes('src="/src/main.js"')) {
    throw new Error("The page must load the Phaser game module.");
  }
});

test("maps keyboard and canvas controls to a movable Phaser square", async () => {
  const game = await readFile(new URL("src/main.js", appRoot), "utf8");

  for (const requiredSnippet of [
    "import * as Phaser from \"phaser\"",
    "this.add.rectangle",
    "KeyCodes.LEFT",
    "KeyCodes.A",
    "KeyCodes.RIGHT",
    "KeyCodes.D",
    "KeyCodes.UP",
    "KeyCodes.W",
    "KeyCodes.DOWN",
    "KeyCodes.S",
    "KeyCodes.C",
    "KeyCodes.V",
    "Action 1 (c)",
    "Action 2 (v)",
  ]) {
    if (!game.includes(requiredSnippet)) {
      throw new Error(`The game is missing its required control: ${requiredSnippet}`);
    }
  }
});
