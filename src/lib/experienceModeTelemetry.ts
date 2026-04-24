/**
 * Experience Mode telemetry, audit logging & offline queue.
 * - Generates correlation IDs to track a mode-change attempt end-to-end
 *   across logs, telemetry, audit DB and toasts.
 * - Persists failed attempts in an offline queue (localStorage) and replays
 *   them when the network comes back.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ExperienceMode } from "@/hooks/useExperienceMode";

const QUEUE_KEY = "fj_experience_mode_queue";

export type AuditOutcome =
  | "success"
  | "blocked"
  | "failed"
  | "offline_queued"
  | "offline_replayed";

export interface AuditEntry {
  correlationId: string;
  attemptedMode: ExperienceMode;
  previousMode?: ExperienceMode;
  outcome: AuditOutcome;
  reason?: string;
  errorCode?: string;
  unlockDate?: string | null;
  metadata?: Record<string, any>;
}

export interface QueuedAttempt {
  correlationId: string;
  attemptedMode: ExperienceMode;
  previousMode: ExperienceMode;
  queuedAt: number;
  retries: number;
}

export function generateCorrelationId(): string {
  // Short readable id: emc-<timestamp>-<random>
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `emc-${ts}-${rnd}`;
}

/** Structured console log with correlationId for end-to-end tracing. */
export function logTelemetry(
  level: "info" | "warn" | "error",
  correlationId: string,
  message: string,
  data?: Record<string, any>
) {
  const payload = { correlationId, ...data };
  const prefix = `[ExperienceMode][${correlationId}]`;
  if (level === "error") console.error(prefix, message, payload);
  else if (level === "warn") console.warn(prefix, message, payload);
  else console.log(prefix, message, payload);
}

/** Persist an audit entry to DB. Best-effort: never throws. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logTelemetry("warn", entry.correlationId, "Skipping audit: no user");
      return;
    }
    const { error } = await supabase
      .from("experience_mode_audit_log" as any)
      .insert({
        user_id: user.id,
        correlation_id: entry.correlationId,
        attempted_mode: entry.attemptedMode,
        previous_mode: entry.previousMode ?? null,
        outcome: entry.outcome,
        reason: entry.reason ?? null,
        error_code: entry.errorCode ?? null,
        unlock_date: entry.unlockDate ?? null,
        metadata: entry.metadata ?? {},
      });
    if (error) {
      logTelemetry("warn", entry.correlationId, "Audit insert failed", { error: error.message });
    }
  } catch (err: any) {
    logTelemetry("warn", entry.correlationId, "Audit insert threw", { error: err?.message });
  }
}

// ─── Offline queue ───────────────────────────────────────────────

export function readQueue(): QueuedAttempt[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedAttempt[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueAttempt(item: Omit<QueuedAttempt, "queuedAt" | "retries">) {
  const queue = readQueue();
  // Dedup by attemptedMode (keep latest)
  const filtered = queue.filter((q) => q.attemptedMode !== item.attemptedMode);
  filtered.push({ ...item, queuedAt: Date.now(), retries: 0 });
  writeQueue(filtered);
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export function removeFromQueue(correlationId: string) {
  writeQueue(readQueue().filter((q) => q.correlationId !== correlationId));
}

/**
 * Drain the offline queue by replaying each attempt.
 * The replay function must perform the actual DB update; it should throw on failure.
 */
export async function drainQueue(
  replay: (item: QueuedAttempt) => Promise<void>
): Promise<{ replayed: number; failed: number }> {
  if (!navigator.onLine) return { replayed: 0, failed: 0 };
  const queue = readQueue();
  if (queue.length === 0) return { replayed: 0, failed: 0 };
  let replayed = 0;
  let failed = 0;
  const remaining: QueuedAttempt[] = [];
  for (const item of queue) {
    try {
      await replay(item);
      await recordAudit({
        correlationId: item.correlationId,
        attemptedMode: item.attemptedMode,
        previousMode: item.previousMode,
        outcome: "offline_replayed",
        reason: "Offline queue drained on reconnect",
      });
      replayed++;
    } catch (err: any) {
      failed++;
      remaining.push({ ...item, retries: item.retries + 1 });
      logTelemetry("warn", item.correlationId, "Queue replay failed", { error: err?.message });
    }
  }
  writeQueue(remaining);
  return { replayed, failed };
}

/** Build a human-readable block reason for toasts. */
export function buildBlockReason(opts: {
  attemptedMode: ExperienceMode;
  unlockDate?: string | null;
  baseReason?: string;
}): { title: string; description: string } {
  const modeLabel = opts.attemptedMode === "pro" ? "Profissional" : "Avançado";
  const condition = "Complete a atualização clínica obrigatória para liberar.";
  let description = opts.baseReason || `O modo ${modeLabel} ainda não está disponível para sua conta.`;
  description += ` ${condition}`;
  if (opts.unlockDate) {
    const date = new Date(opts.unlockDate);
    if (!isNaN(date.getTime())) {
      description += ` Liberação prevista para ${date.toLocaleDateString("pt-BR")}.`;
    }
  }
  return {
    title: `Modo ${modeLabel} bloqueado`,
    description,
  };
}
