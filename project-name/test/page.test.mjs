import { readFile } from "node:fs/promises";
import test from "node:test";

const appRoot = new URL("../", import.meta.url);

test("documents the browser platformer and loads its game module", async () => {
  const page = await readFile(new URL("index.html", appRoot), "utf8");

  if (!page.includes("<title>Browser Platformer</title>")) {
    throw new Error("The browser title must identify the platformer.");
  }
  if (!page.includes('id="content_layer"')) {
    throw new Error("The page needs a dedicated game-engine layer.");
  }
  if (!page.includes('id="ui_layer"')) {
    throw new Error("The page needs a separate HTML UI layer.");
  }
  if (!page.includes('src="/src/main.js"')) {
    throw new Error("The page must load the game module.");
  }
});

test("maps keyboard and canvas controls to a movable square", async () => {
  const game = await readFile(new URL("src/main.js", appRoot), "utf8");

  for (const requiredSnippet of [
    "const canvas = document.createElement(\"canvas\")",
    "keys.has(\"arrowleft\")",
    "keys.has(\"a\")",
    "keys.has(\"arrowright\")",
    "keys.has(\"d\")",
    "keys.has(\"arrowup\")",
    "keys.has(\"w\")",
    "keys.has(\"arrowdown\")",
    "keys.has(\"s\")",
    "keys.has(\"c\")",
    "keys.has(\"v\")",
    "Action 1 (c)",
    "Action 2 (v)",
  ]) {
    if (!game.includes(requiredSnippet)) {
      throw new Error(`The game is missing its required control: ${requiredSnippet}`);
    }
  }
});
