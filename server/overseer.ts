/**
 * Port Overseer — Global Configuration Checkpoint
 *
 * Loads its canonical configuration from `overseer.config.yaml` at the project
 * root. That YAML file is the single source of truth for:
 *
 *   1. Service registry  — every process in the stack, its role, and base URL
 *   2. Port governance   — authoritative port assignments, conflict detection
 *   3. Health monitoring — live reachability checks for all registered services
 *   4. Config validation — required env vars, format checks, and drift detection
 *   5. Startup gate      — blocks traffic until critical services are confirmed
 *
 * Usage:
 *   import { overseer } from "./overseer";
 *   const backendUrl = overseer.resolve("bff");   // → "http://localhost:3000"
 *   const snapshot    = await overseer.healthCheck(); // → OverseerSnapshot
 *   const issues      = overseer.validateConfig();    // → ConfigIssue[]
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import axios from "axios";

// ── YAML Schema Types ─────────────────────────────────────────────────────────

interface YamlHealthProbe {
  path?: string;
  method?: string;
  expected_status?: number;
  timeout_ms?: number;
  inferred_from?: string;
  skip?: boolean;
}

interface YamlServiceEntry {
  id: string;
  name: string;
  role: string;
  description?: string;
  url_default: string;
  url_env_var?: string;
  health?: YamlHealthProbe;
  critical: boolean;
  tags?: string[];
}

interface YamlEnvRequirement {
  key: string;
  description: string;
  service?: string;
  critical: boolean;
  format?: string;
  example?: string;
  validator?: "starts_with_http" | "min_length_16" | "contains_scheme";
}

interface YamlStartupGate {
  enabled: boolean;
  strict: boolean;
  timeout_ms: number;
  retry_attempts: number;
  retry_delay_ms: number;
  required_services: string[];
}

interface YamlMonitoring {
  enabled: boolean;
  interval_ms: number;
  alert_on_degraded: boolean;
  alert_on_unreachable: boolean;
}

interface OverseerConfig {
  version: string;
  updated_at: string;
  ports: Record<string, number>;
  services: YamlServiceEntry[];
  env_requirements: YamlEnvRequirement[];
  startup_gate: YamlStartupGate;
  monitoring: YamlMonitoring;
}

// ── Public Types ──────────────────────────────────────────────────────────────

export type ServiceRole =
  | "bff"
  | "core-api"
  | "database"
  | "cache"
  | "browser"
  | "runtime"
  | "external";

export type ServiceStatus = "healthy" | "degraded" | "unreachable" | "unknown";

export interface ServiceDefinition {
  id: string;
  name: string;
  role: string;
  description?: string;
  url: string;
  envVar?: string;
  healthPath?: string;
  healthMethod?: string;
  expectedStatus?: number;
  healthTimeoutMs?: number;
  inferredFrom?: string;
  skipHealth?: boolean;
  critical: boolean;
  tags: string[];
}

export interface ServiceHealth {
  id: string;
  name: string;
  role: string;
  url: string;
  status: ServiceStatus;
  latencyMs?: number;
  lastChecked: Date;
  error?: string;
  responseData?: unknown;
}

export interface ConfigIssue {
  severity: "error" | "warning" | "info";
  service?: string;
  key: string;
  message: string;
  expected?: string;
  actual?: string;
}

export interface OverseerSnapshot {
  timestamp: Date;
  configVersion: string;
  services: ServiceHealth[];
  configIssues: ConfigIssue[];
  portMap: Record<string, number>;
  overallStatus: ServiceStatus;
  criticalServicesHealthy: boolean;
  environment: string;
  version: string;
}

// ── Config Loader ─────────────────────────────────────────────────────────────

function loadConfig(): OverseerConfig {
  const configPath = path.resolve(process.cwd(), "overseer.config.yaml");
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `[Overseer] Configuration file not found: ${configPath}\n` +
      `Create overseer.config.yaml at the project root to define the service registry.`
    );
  }
  const raw = fs.readFileSync(configPath, "utf-8");
  const parsed = yaml.load(raw) as OverseerConfig;
  console.log(
    `[Overseer] Loaded config v${parsed.version} (updated: ${parsed.updated_at}) — ` +
    `${parsed.services.length} services, ${Object.keys(parsed.ports).length} ports`
  );
  return parsed;
}

// ── Validator Functions ───────────────────────────────────────────────────────

const VALIDATORS: Record<string, (v: string) => boolean> = {
  starts_with_http: (v) => v.startsWith("http://") || v.startsWith("https://"),
  min_length_16: (v) => v.trim().length >= 16,
  contains_scheme: (v) => /^[a-z][a-z0-9+\-.]*:\/\//.test(v),
};

// ── Overseer Class ────────────────────────────────────────────────────────────

class PortOverseer {
  private config: OverseerConfig;
  private registry: Map<string, ServiceDefinition> = new Map();
  private lastSnapshot: OverseerSnapshot | null = null;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.config = loadConfig();
    this._buildRegistry();
  }

  /** Rebuild the in-memory registry from the loaded YAML config. */
  private _buildRegistry(): void {
    this.registry.clear();
    for (const svc of this.config.services) {
      // Resolve URL: env var takes precedence over default
      let url = svc.url_default;
      if (svc.url_env_var) {
        const envVal = process.env[svc.url_env_var];
        if (envVal) {
          // For PORT-only env vars, reconstruct the full URL
          if (svc.url_env_var === "PORT") {
            url = `http://localhost:${envVal}`;
          } else {
            url = envVal;
          }
        }
      }

      const def: ServiceDefinition = {
        id: svc.id,
        name: svc.name,
        role: svc.role,
        description: svc.description,
        url,
        envVar: svc.url_env_var,
        healthPath: svc.health?.path,
        healthMethod: svc.health?.method ?? "GET",
        expectedStatus: svc.health?.expected_status ?? 200,
        healthTimeoutMs: svc.health?.timeout_ms ?? 5000,
        inferredFrom: svc.health?.inferred_from,
        skipHealth: svc.health?.skip ?? false,
        critical: svc.critical,
        tags: svc.tags ?? [],
      };
      this.registry.set(svc.id, def);
    }
  }

  /**
   * Resolve the base URL for a registered service.
   * This is the primary API — use this instead of hardcoding URLs.
   */
  resolve(serviceId: string): string {
    const svc = this.registry.get(serviceId);
    if (!svc) {
      throw new Error(
        `[Overseer] Unknown service: "${serviceId}". ` +
        `Add it to overseer.config.yaml before resolving.`
      );
    }
    return svc.url;
  }

  /** Get the authoritative port number for a named service. */
  port(serviceId: string): number {
    return this.config.ports[serviceId] ?? 0;
  }

  /** Get the full port allocation table. */
  get portMap(): Record<string, number> {
    return { ...this.config.ports };
  }

  /** Get the loaded config version. */
  get configVersion(): string {
    return this.config.version;
  }

  /** Register an additional service at runtime (dynamic discovery). */
  register(definition: ServiceDefinition): void {
    this.registry.set(definition.id, definition);
    console.log(`[Overseer] Runtime-registered service: ${definition.id} → ${definition.url}`);
  }

  /**
   * Reload the YAML config from disk (hot-reload without restart).
   */
  reload(): void {
    this.config = loadConfig();
    this._buildRegistry();
    console.log(`[Overseer] Config reloaded — v${this.config.version}`);
  }

  /**
   * Perform a health check on a single service.
   */
  async checkService(serviceId: string): Promise<ServiceHealth> {
    const svc = this.registry.get(serviceId);
    if (!svc) {
      return {
        id: serviceId,
        name: serviceId,
        role: "external",
        url: "unknown",
        status: "unknown",
        lastChecked: new Date(),
        error: `Service "${serviceId}" not registered in overseer.config.yaml`,
      };
    }

    // Skipped or inferred services
    if (svc.skipHealth || svc.inferredFrom || !svc.healthPath) {
      return {
        id: svc.id,
        name: svc.name,
        role: svc.role,
        url: svc.url,
        status: "unknown",
        lastChecked: new Date(),
        error: svc.inferredFrom
          ? `Status inferred from "${svc.inferredFrom}" — no direct HTTP probe`
          : "No HTTP health endpoint configured",
      };
    }

    const start = Date.now();
    try {
      const response = await axios({
        method: (svc.healthMethod ?? "GET") as string,
        url: `${svc.url}${svc.healthPath}`,
        timeout: svc.healthTimeoutMs ?? 5000,
        validateStatus: () => true,
      });
      const latencyMs = Date.now() - start;
      const isHealthy =
        response.status === (svc.expectedStatus ?? 200) || response.status < 400;

      return {
        id: svc.id,
        name: svc.name,
        role: svc.role,
        url: svc.url,
        status: isHealthy ? "healthy" : "degraded",
        latencyMs,
        lastChecked: new Date(),
        responseData: typeof response.data === "object" ? response.data : undefined,
      };
    } catch (err) {
      return {
        id: svc.id,
        name: svc.name,
        role: svc.role,
        url: svc.url,
        status: "unreachable",
        latencyMs: Date.now() - start,
        lastChecked: new Date(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Validate all required environment variables against the YAML spec.
   */
  validateConfig(): ConfigIssue[] {
    const issues: ConfigIssue[] = [];

    for (const req of this.config.env_requirements) {
      const value = process.env[req.key];

      if (!value || value.trim() === "") {
        issues.push({
          severity: req.critical ? "error" : "warning",
          service: req.service,
          key: req.key,
          message: `${req.description} is not set`,
          expected: req.format ?? req.example,
        });
        continue;
      }

      if (req.validator) {
        const fn = VALIDATORS[req.validator];
        if (fn && !fn(value)) {
          issues.push({
            severity: "warning",
            service: req.service,
            key: req.key,
            message: `${req.description} has an unexpected format`,
            actual: value.substring(0, 60) + (value.length > 60 ? "…" : ""),
            expected: req.format ?? req.example,
          });
        }
      }
    }

    // Port conflict detection from YAML port table
    const usedPorts = new Map<number, string>();
    for (const [name, port] of Object.entries(this.config.ports)) {
      if (usedPorts.has(port)) {
        issues.push({
          severity: "error",
          key: `PORT_CONFLICT:${port}`,
          message: `Port ${port} is assigned to both "${usedPorts.get(port)}" and "${name}" in overseer.config.yaml`,
        });
      } else {
        usedPorts.set(port, name);
      }
    }

    return issues;
  }

  /**
   * Run a full health check across all registered services.
   */
  async healthCheck(): Promise<OverseerSnapshot> {
    const services = await Promise.all(
      Array.from(this.registry.values()).map((svc) => this.checkService(svc.id))
    );

    const configIssues = this.validateConfig();

    const criticalDefs = Array.from(this.registry.values()).filter((s) => s.critical);
    const criticalHealth = services.filter((s) =>
      criticalDefs.some((cd) => cd.id === s.id)
    );

    const hasUnreachableCritical = criticalHealth.some((s) => s.status === "unreachable");
    const hasDegradedCritical = criticalHealth.some((s) => s.status === "degraded");
    const hasConfigErrors = configIssues.some((i) => i.severity === "error");

    let overallStatus: ServiceStatus = "healthy";
    if (hasUnreachableCritical || hasConfigErrors) overallStatus = "unreachable";
    else if (hasDegradedCritical) overallStatus = "degraded";

    const snapshot: OverseerSnapshot = {
      timestamp: new Date(),
      configVersion: this.config.version,
      services,
      configIssues,
      portMap: this.portMap,
      overallStatus,
      criticalServicesHealthy: !hasUnreachableCritical && !hasDegradedCritical,
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
    };

    this.lastSnapshot = snapshot;
    return snapshot;
  }

  /** Get the last cached snapshot (non-blocking). */
  getLastSnapshot(): OverseerSnapshot | null {
    return this.lastSnapshot;
  }

  /** Get all registered service definitions. */
  getRegistry(): ServiceDefinition[] {
    return Array.from(this.registry.values());
  }

  /** Get the raw YAML config (for the admin UI config viewer). */
  getRawConfig(): OverseerConfig {
    return this.config;
  }

  /** Get the raw YAML source string (for the admin UI YAML viewer). */
  getRawYaml(): string {
    const configPath = path.resolve(process.cwd(), "overseer.config.yaml");
    return fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf-8") : "";
  }

  /** Start periodic background health checks. */
  startMonitoring(): void {
    if (!this.config.monitoring.enabled || this.intervalHandle) return;
    const interval = this.config.monitoring.interval_ms;
    this.intervalHandle = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (err) {
        console.error("[Overseer] Background health check failed:", err);
      }
    }, interval);
    console.log(`[Overseer] Monitoring started (interval: ${interval}ms)`);
  }

  /** Stop background monitoring. */
  stopMonitoring(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Run the startup gate: probe required services before accepting traffic.
   * Returns true if all required services are reachable (or gate is disabled).
   */
  async runStartupGate(): Promise<boolean> {
    const gate = this.config.startup_gate;
    if (!gate.enabled) return true;

    console.log("[Overseer] Running startup gate checks...");
    for (const serviceId of gate.required_services) {
      let healthy = false;
      for (let attempt = 1; attempt <= gate.retry_attempts; attempt++) {
        const health = await this.checkService(serviceId);
        if (health.status === "healthy") {
          console.log(`[Overseer] ✓ ${serviceId} is healthy (attempt ${attempt})`);
          healthy = true;
          break;
        }
        console.warn(
          `[Overseer] ✗ ${serviceId} not healthy (attempt ${attempt}/${gate.retry_attempts}): ${health.error ?? health.status}`
        );
        if (attempt < gate.retry_attempts) {
          await new Promise((r) => setTimeout(r, gate.retry_delay_ms));
        }
      }

      if (!healthy) {
        const msg = `[Overseer] Required service "${serviceId}" is not reachable after ${gate.retry_attempts} attempts`;
        if (gate.strict) {
          throw new Error(msg);
        } else {
          console.warn(msg + " — starting in degraded mode");
          return false;
        }
      }
    }

    console.log("[Overseer] All startup gate checks passed ✓");
    return true;
  }
}

// ── Singleton Export ──────────────────────────────────────────────────────────

export const overseer = new PortOverseer();
