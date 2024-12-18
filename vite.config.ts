import { defineConfig } from "vite";

export default defineConfig({
  base: `/${import.meta.url.split("/").at(-2)}`,
  root: "src",
  build: {
    target: "esnext",
    outDir: "../dist",
    emptyOutDir: true,
  },
});
