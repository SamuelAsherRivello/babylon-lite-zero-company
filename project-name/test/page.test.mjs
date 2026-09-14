import { readFile } from "node:fs/promises";
import test from "node:test";

test("uses root-level template metadata in the Vite entry page", async () => {
  const page = await readFile(new URL("../index.html", import.meta.url), "utf8");

  if (!page.includes("<title>{project-name}</title>")) {
    throw new Error("The page title must use the project-name placeholder.");
  }
  if (!page.includes("<div id=\"project_title\">{project-name}</div>")) {
    throw new Error("The visible title must use the project-name placeholder.");
  }
  if (!page.includes("https://github.com/{github-owner}/{repository-name}")) {
    throw new Error("The repository link must be customized with the project.");
  }
  if (!page.includes('import versionText from "../version.txt?raw"')) {
    throw new Error("The page must read the repository root version file.");
  }
});
