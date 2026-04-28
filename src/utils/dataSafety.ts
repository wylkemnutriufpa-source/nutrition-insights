import { logAudit, getSessionCorrelationId } from "@/lib/auditLog";

export type BackupValidity = "valid" | "expired" | "invalid";

export const BACKUP_TTL_DAYS = 30;

/**
 * Log levels for auditable tracing.
 */
export const FJ_LOG_TAGS = {
  CRITICAL: "[FJ:CRITICAL]",
  SYNC: "[FJ:SYNC]",
  LINKAGE: "[FJ:LINKAGE]",
  SECURITY: "[FJ:SECURITY]",
  UX: "[FJ:UX]"
} as const;

/**
 * Standardized logging with auditable tags.
 */
export const fjLog = (tag: keyof typeof FJ_LOG_TAGS, message: string, data?: any) => {
  const fullTag = FJ_LOG_TAGS[tag];
  const timestamp = new Date().toISOString();
  
  // Format for audit persistence
  const logEntry = {
    timestamp,
    tag,
    message,
    ...data
  };

  console.log(`${fullTag} [${timestamp}] ${message}`, data || "");
  
  if (tag === "CRITICAL") {
    console.error(`${fullTag} CRITICAL ERROR DETECTED:`, message, data);
  }

  // Future: persist to FJ_AUDIT_LOGS table via edge function
  // For now, ensure it stands out in dev tools
  if ((window as any).__FJ_DEBUG__) {
    (window as any).__FJ_LOGS__ = (window as any).__FJ_LOGS__ || [];
    (window as any).__FJ_LOGS__.push(logEntry);
  }
};

/**
 * Centralized TTL logic for backup validity.
 * Exactly 30 days is valid, 30 days + 1ms is expired.
 */
export const getBackupValidity = (timestamp: string | number | null): BackupValidity => {
  if (!timestamp) return "invalid";
  
  const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (isNaN(ts)) return "invalid";

  const thirtyDaysMs = BACKUP_TTL_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const age = now - ts;

  if (age < 0) return "valid"; // Future timestamp (unlikely but safe)
  const validity = age <= thirtyDaysMs ? "valid" : "expired";
  
  if (validity === "expired") {
    fjLog("SECURITY", `Backup expired (age: ${Math.floor(age / (1000 * 60 * 60 * 24))} days)`);
  }
  
  return validity;
};

/**
 * Generates a unique version key for anamnesis conflict resolution.
 */
export const getConflictVersionKey = (userId: string, tenantId: string, serverUpdatedAt: string, localUpdatedAt: string): string => {
  const sTs = new Date(serverUpdatedAt).getTime();
  const lTs = new Date(localUpdatedAt).getTime();
  return `fj_anamnesis_resolved_${userId}_${tenantId}_${sTs}_${lTs}`;
};

/**
 * Global Guard to detect inconsistent system states.
 * Fails fast to prevent data corruption or orphaned users.
 */
export const validateSystemState = (state: { 
  tenantId?: string | null; 
  userId?: string | null;
  hasInconsistentConflict?: boolean;
}) => {
  if (!state.userId) {
    fjLog("CRITICAL", "User ID missing in system state validation");
    return { valid: false, reason: "UNAUTHENTICATED" };
  }
  
  if (!state.tenantId) {
    fjLog("CRITICAL", `Tenant ID missing for user ${state.userId}`, { state });
    return { valid: false, reason: "MISSING_TENANT" };
  }
  
  if (state.hasInconsistentConflict) {
    fjLog("CRITICAL", `Inconsistent conflict state detected for user ${state.userId}`);
    return { valid: false, reason: "INCONSISTENT_CONFLICT" };
  }
  
  return { valid: true };
};