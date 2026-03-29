/**
 * vitest.unit.config.ts
 *
 * Unit-test configuration for CI.
 * Excludes all tests that require a live HTTP server, real database, or Redis.
 * These integration tests remain runnable locally with `pnpm test`.
 *
 * Exclusion criteria:
 *   - Makes real HTTP calls to http://localhost (fetch/axios to running server)
 *   - Starts a real Express server (supertest / app.listen)
 *   - Requires a live DATABASE_URL connection (requireDb / drizzle)
 *   - Requires a live Redis connection (REDIS_URL)
 */
import { defineConfig } from "vitest/config";
import path from "path";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: path.resolve(import.meta.dirname, ".env") });

const templateRoot = path.resolve(import.meta.dirname);

// Tests that make real HTTP calls to localhost (need a running dev server)
const HTTP_INTEGRATION_TESTS = [
  "server/auth-flow.test.ts",
  "server/e2e-dispatch.test.ts",
  "server/e2e-job-ending.test.ts",
  "server/e2e-onboarding.test.ts",
  "server/e2e-settings.test.ts",
  "server/e2e-transaction.test.ts",
  "server/express-routes.test.ts",
  "server/guest-e2e-flow.test.ts",
  "server/guest-router.test.ts",
  "server/guest-settings.test.ts",
  "server/migrated-routes.test.ts",
  "server/owasp-headers-cors.test.ts",
  "server/password-reset.test.ts",
  "server/property-qr.test.ts",
  "server/sse.test.ts",
  "server/users-invite.test.ts",
];

// Tests that require a live DATABASE_URL connection
const DB_INTEGRATION_TESTS = [
  "server/admin-config.test.ts",
  "server/cms.test.ts",
  "server/cmsPublic.test.ts",
  "server/e2e-provisioning.test.ts",
  "server/fo-portal.test.ts",
  "server/owasp-body-jti-2fa.test.ts",
  "server/phase48-admin-2fa.test.ts",
  "server/secret-chamber.test.ts",
  "server/sprint11.test.ts",
  "server/sprint6.test.ts",
];

// Tests that require Redis or a live server + DB combination
const INFRA_INTEGRATION_TESTS = [
  "server/autoConfirmWorker.test.ts",
  "server/dual-auth.test.ts",
  "server/owasp-2fa.test.ts",
  "server/owasp-2fa-recovery.test.ts",
  "server/redis-connectivity.test.ts",
  "server/redis-enhancements.test.ts",
  "server/sprint7.test.ts",
  "server/sprint8.test.ts",
  "server/sprint10.test.ts",
];

const ALL_INTEGRATION_TESTS = [
  ...HTTP_INTEGRATION_TESTS,
  ...DB_INTEGRATION_TESTS,
  ...INFRA_INTEGRATION_TESTS,
];

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
    exclude: ALL_INTEGRATION_TESTS,
    fileParallelism: false,
    testTimeout: 15000,
  },
});
