import assert from "node:assert/strict";
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
