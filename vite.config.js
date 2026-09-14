import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const repositoryRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: "phaser4-platformer",
  server: {
    fs: {
      allow: [repositoryRoot],
    },
  },
});
