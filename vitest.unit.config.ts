/**
 * vitest.unit.config.ts
 *
 * Unit-test configuration for CI.
 * Uses an EXPLICIT INCLUDE list of only pure unit tests that need no live server,
 * database, or Redis. This is more reliable than an exclude list.
 *
 * Integration tests remain runnable locally with `pnpm test`.
 */
import { defineConfig } from "vitest/config";
import path from "path";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: path.resolve(import.meta.dirname, ".env") });

const templateRoot = path.resolve(import.meta.dirname);

/**
 * PURE UNIT TESTS — no live server, no DB, no Redis required.
 * Each file listed here must pass in a cold CI environment.
 */
const UNIT_TESTS = [
  "server/auth.logout.test.ts",
  "server/contingency.test.ts",
  "server/foSearch.test.ts",
  "server/operable.test.ts",
  "server/owasp-ratelimit-pwd-domain.test.ts",
  "server/owasp-security.test.ts",
  "server/requestsRouter.test.ts",
  "server/sprint15.test.ts",
  "server/sprint16.test.ts",
  "server/stubPaymentGateway.test.ts",
];

// Convert to absolute paths
const UNIT_TESTS_ABS = UNIT_TESTS.map((p) => path.resolve(templateRoot, p));

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
    include: UNIT_TESTS_ABS,
    fileParallelism: false,
    testTimeout: 15000,
  },
});
