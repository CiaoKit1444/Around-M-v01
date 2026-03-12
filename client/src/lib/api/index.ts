/**
 * API barrel — re-export everything for clean imports.
 *
 * Usage:
 *   import { partnersApi, type Partner } from "@/lib/api";
 */
export * from "./types";
export * from "./endpoints";
export { default as api } from "./client";
