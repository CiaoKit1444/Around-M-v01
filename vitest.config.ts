import { defineConfig } from "vitest/config";
import path from "path";
import { config as loadDotenv } from "dotenv";

// Load .env so JWT_SECRET and DATABASE_URL are available in test processes
loadDotenv({ path: path.resolve(import.meta.dirname, ".env") });

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    // E2E tests share the live database — run all test files serially to
    // prevent concurrent writes from interfering with each other.
    fileParallelism: false,
    testTimeout: 15000,
  },
});
