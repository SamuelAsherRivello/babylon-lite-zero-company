import { readFile } from "node:fs/promises";
import test from "node:test";

const appRoot = new URL("../", import.meta.url);

test("documents the plain safe-area template", async () => {
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
  if (!page.includes("inset: 5%")) {
    throw new Error("The page must preserve the 5% safe area.");
  }
  if (!page.includes('id="version"')) {
    throw new Error("The page must show the version footer.");
  }
  if (!page.includes("https://github.com/SamuelAsherRivello/github-repository-template")) {
    throw new Error("The page must link to the template repository.");
  }
  if (page.includes('src="/src/main.js"')) {
    throw new Error("The safe-area template should not load an application module.");
  }
});
