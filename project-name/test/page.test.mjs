import { readFile } from "node:fs/promises";
import test from "node:test";

const appRoot = new URL("../", import.meta.url);

test("documents the template and loads its application module", async () => {
  const page = await readFile(new URL("index.html", appRoot), "utf8");

  if (!page.includes("<title>GitHub Repository Template</title>")) {
    throw new Error("The browser title must identify the template.");
  }
  if (!page.includes('id="content_layer"')) {
    throw new Error("The page needs a dedicated application content layer.");
  }
  if (!page.includes('id="ui_layer"')) {
    throw new Error("The page needs a separate HTML UI layer.");
  }
  if (!page.includes('src="/src/main.js"')) {
    throw new Error("The page must load the application module.");
  }
});

test("renders the neutral starter content", async () => {
  const app = await readFile(new URL("src/main.js", appRoot), "utf8");

  for (const requiredSnippet of [
    "const contentLayer = document.getElementById(\"content_layer\")",
    "GitHub Repository Template",
    "Ready for your next project.",
    "template-card",
  ]) {
    if (!app.includes(requiredSnippet)) {
      throw new Error(`The starter page is missing required content: ${requiredSnippet}`);
    }
  }
});
