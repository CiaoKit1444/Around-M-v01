/**
 * Audit Service
 *
 * Single source of truth for writing audit events.
 * Extracted from server/routes/admin.ts.
 *
 * Domain: audit
 */
import { getDb } from "../../db";
import { pepprAuditEvents } from "../../../drizzle/schema";

export interface AuditEventParams {
  actorType?: string;
  actorId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Write an audit event record.
 * Never throws — failures are logged to console only.
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(pepprAuditEvents).values({
      actorType: params.actorType || "USER",
      actorId: params.actorId || null,
      action: params.action,
      resourceType: params.resourceType || null,
      resourceId: params.resourceId || null,
      details: params.details || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
  } catch (e) {
    console.error("[Audit] Failed to log event:", e);
  }
}
