import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const repositoryRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/github-repository-template/",
  root: "project-name",
  server: {
    fs: {
      allow: [repositoryRoot],
    },
  },
});
