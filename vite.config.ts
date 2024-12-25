import { defineConfig } from "vite";

export default defineConfig({
  base: "",
  root: "src",
  build: {
    target: "esnext",
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "src/index.html",
        nested: "src/backoffice/index.html",
      },
    },
  },
});
