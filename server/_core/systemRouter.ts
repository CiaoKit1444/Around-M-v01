import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { overseer } from "../overseer";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /**
   * Port Overseer — live health snapshot across all registered services.
   * Runs a fresh health check on every call (results are also cached in the
   * Overseer singleton for the background monitoring interval).
   */
  overseerStatus: adminProcedure.query(async () => {
    const snapshot = await overseer.healthCheck();
    return snapshot;
  }),

  /**
   * Port Overseer — config validation + service registry + raw YAML.
   * Useful for the admin UI config viewer tab.
   */
  overseerConfig: adminProcedure.query(() => {
    const issues = overseer.validateConfig();
    const rawConfig = overseer.getRawConfig();
    const rawYaml = overseer.getRawYaml();
    return {
      issues,
      configVersion: rawConfig.version,
      updatedAt: rawConfig.updated_at,
      environment: process.env.NODE_ENV || "development",
      configuredServices: overseer.getRegistry().map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        envVar: s.envVar,
        envValue: s.envVar ? (process.env[s.envVar] ? "set" : "missing") : "n/a",
      })),
      portMap: overseer.portMap,
      rawYaml,
    };
  }),
});
