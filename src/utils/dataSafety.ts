export type BackupValidity = "valid" | "expired" | "invalid";

export const BACKUP_TTL_DAYS = 30;

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
  return age <= thirtyDaysMs ? "valid" : "expired";
};

/**
 * Generates a unique version key for anamnesis conflict resolution.
 */
export const getConflictVersionKey = (userId: string, tenantId: string, serverUpdatedAt: string, localUpdatedAt: string): string => {
  const sTs = new Date(serverUpdatedAt).getTime();
  const lTs = new Date(localUpdatedAt).getTime();
  return `fj_anamnesis_resolved_${userId}_${tenantId}_${sTs}_${lTs}`;
};
