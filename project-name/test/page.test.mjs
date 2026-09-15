import { readFile } from "node:fs/promises";
import test from "node:test";
import viteConfig from "../../vite.config.js";

const appRoot = new URL("../", import.meta.url);

test("builds for the GitHub Pages project path", () => {
  if (viteConfig.base !== "/github-repository-template/") {
    throw new Error("The GitHub Pages build must use the repository project path as its Vite base.");
  }
});

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
  if (!page.includes(".corner {")) {
    throw new Error("The page must define a reusable corner style.");
  }
  for (const cornerClass of ["corner_top_left", "corner_top_right", "corner_bottom_left", "corner_bottom_right"]) {
    if (!page.includes(`class="corner ${cornerClass}"`)) {
      throw new Error(`The page must include a ${cornerClass} corner instance.`);
    }
  }
  if (!page.includes('id="version"')) {
    throw new Error("The page must show the version footer.");
  }
  if (!page.includes("textContent = `v${versionNumber}`")) {
    throw new Error("The version corner must display versions in v0.0.0 format.");
  }
  if (!page.includes(">Settings<")) {
    throw new Error("The page must include a lower-left Settings section.");
  }
  if (!page.includes(".corner_body") || !page.includes(".corner_title")) {
    throw new Error("The page must define shared corner body and title text styles.");
  }
  if (!page.includes('id="settings_title" class="corner_title"')) {
    throw new Error("The Settings heading must use the bold corner title style.");
  }
  if (!page.includes('id="fullscreen_toggle" class="corner_body settings_option"')) {
    throw new Error("The fullscreen setting must use the shared corner body style.");
  }
  if (!page.includes(">Fullscreen<")) {
    throw new Error("The Settings section must include the Fullscreen option line.");
  }
  if (page.includes("Fullscreen (")) {
    throw new Error("The Fullscreen setting must not wrap the checkbox emoji in parentheses.");
  }
  if (!page.includes(">☐<") || !page.includes("☑")) {
    throw new Error("The fullscreen setting must use empty and checked checkbox emoji.");
  }
  if (!page.includes("localStorage.setItem(fullscreenStorageKey")) {
    throw new Error("The fullscreen setting must persist its preference locally.");
  }
  if (!page.includes("requestFullscreen") || !page.includes("exitFullscreen")) {
    throw new Error("The fullscreen setting must toggle the browser fullscreen API.");
  }
  if (!page.includes("https://github.com/SamuelAsherRivello/github-repository-template")) {
    throw new Error("The page must link to the template repository.");
  }
  if (page.includes('src="/src/main.js"')) {
    throw new Error("The safe-area template should not load an application module.");
  }
});
