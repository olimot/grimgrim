import { defineConfig } from "vite";

export default defineConfig({
  base: "",
  root: "src",
  build: {
    target: "esnext",
    outDir: "../dist",
    emptyOutDir: true,
  },
});
