import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { pageContent, renderTemplatePage } from "../src/app.js";

test("renders the starter page message", () => {
  const elements = new Map([
    ["page-title", { textContent: "" }],
    ["page-message", { textContent: "" }],
  ]);
  const document = {
    getElementById: (id) => elements.get(id) ?? null,
  };

  renderTemplatePage(document);

  assert.equal(elements.get("page-title").textContent, pageContent.title);
  assert.equal(elements.get("page-message").textContent, pageContent.message);
});

test("uses the repository version file in the Vite entry page footer", async () => {
  const page = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(page, /<div id="project_title">project-name<\/div>/);
  assert.match(page, /target="_blank" rel="noopener noreferrer"/);
  assert.match(page, /<footer id="footer"><span id="version"><\/span><\/footer>/);
  assert.match(page, /import versionText from "\.\.\/version\.txt\?raw"/);
});
