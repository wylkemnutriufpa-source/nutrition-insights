/**
 * Experience Mode telemetry, audit logging & offline queue.
 * - Generates correlation IDs to track a mode-change attempt end-to-end
 *   across logs, telemetry, audit DB and toasts.
 * - Persists failed attempts in an offline queue (localStorage) and replays
 *   them when the network comes back.
 * - Enforces a max queue size and a TTL to expire stale attempts.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ExperienceMode } from "@/hooks/useExperienceMode";

const QUEUE_KEY = "fj_experience_mode_queue";

/** Maximum number of attempts kept in the offline queue. */
export const QUEUE_MAX_SIZE = 20;
/** Time-to-live for a queued attempt (24 hours). */
export const QUEUE_TTL_MS = 24 * 60 * 60 * 1000;
/** Default DB call timeout (slow network protection). */
export const DB_TIMEOUT_MS = 8000;
/** Max automatic retries on transient failures (timeouts / 5xx). */
export const DB_MAX_RETRIES = 2;

export type AuditOutcome =
  | "success"
  | "blocked"
  | "failed"
  | "offline_queued"
  | "offline_replayed"
  | "queue_expired"
  | "queue_overflow";

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

export interface QueueStats {
  size: number;
  isFull: boolean;
  hasExpired: boolean;
  oldestQueuedAt: number | null;
}

export function generateCorrelationId(): string {
  const ts = Date.now().toString(36);
  const rnd = crypto.randomUUID();
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

// ─── Slow-network helpers ─────────────────────────────────────────

/** Wrap a promise with a timeout. Throws an Error tagged with code TIMEOUT. */
export function withTimeout<T>(p: Promise<T>, ms: number = DB_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      const err: any = new Error(`Tempo excedido (${ms}ms)`);
      err.code = "TIMEOUT";
      reject(err);
    }, ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * Retry a promise-returning fn on TIMEOUT / network errors.
 * Stops immediately on MODE_LOCKED / NOT_AUTH (non-transient).
 */
export async function withRetries<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; correlationId: string; baseDelayMs?: number } = { correlationId: "" }
): Promise<T> {
  const max = opts.maxRetries ?? DB_MAX_RETRIES;
  const base = opts.baseDelayMs ?? 300;
  let attempt = 0;
  let lastErr: any;
  while (attempt <= max) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const code = err?.code;
      const transient = code === "TIMEOUT" || code === "NETWORK" || code === "DB_ERROR";
      if (!transient || attempt === max) {
        if (attempt > 0) {
          err.retries = attempt;
        }
        throw err;
      }
      const delay = base * Math.pow(2, attempt);
      logTelemetry("warn", opts.correlationId, "Transient failure — retrying", {
        attempt: attempt + 1,
        nextDelayMs: delay,
        code,
      });
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
  throw lastErr;
}

// ─── Offline queue ────────────────────────────────────────────────

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

/**
 * Remove expired items, returning the kept queue and the dropped ones.
 * Audits each expired item.
 */
export async function pruneExpired(now: number = Date.now()): Promise<{
  kept: QueuedAttempt[];
  expired: QueuedAttempt[];
}> {
  const queue = readQueue();
  const kept: QueuedAttempt[] = [];
  const expired: QueuedAttempt[] = [];
  for (const item of queue) {
    if (now - item.queuedAt > QUEUE_TTL_MS) expired.push(item);
    else kept.push(item);
  }
  if (expired.length > 0) {
    writeQueue(kept);
    for (const it of expired) {
      logTelemetry("warn", it.correlationId, "Queued attempt expired (TTL)", {
        ageMs: now - it.queuedAt,
      });
      await recordAudit({
        correlationId: it.correlationId,
        attemptedMode: it.attemptedMode,
        previousMode: it.previousMode,
        outcome: "queue_expired",
        reason: `Tentativa offline expirou após ${Math.round(QUEUE_TTL_MS / 3600000)}h`,
      });
    }
  }
  return { kept, expired };
}

export function getQueueStats(now: number = Date.now()): QueueStats {
  const queue = readQueue();
  const oldest = queue.reduce<number | null>(
    (min, q) => (min === null || q.queuedAt < min ? q.queuedAt : min),
    null
  );
  return {
    size: queue.length,
    isFull: queue.length >= QUEUE_MAX_SIZE,
    hasExpired: oldest !== null && now - oldest > QUEUE_TTL_MS,
    oldestQueuedAt: oldest,
  };
}

/**
 * Enqueue an attempt. Returns metadata about the enqueue result.
 * - dedupes by attemptedMode (keeps latest)
 * - drops the oldest item (and audits it as queue_overflow) when full
 */
export async function enqueueAttempt(item: Omit<QueuedAttempt, "queuedAt" | "retries">): Promise<{
  enqueued: boolean;
  droppedForOverflow: QueuedAttempt | null;
}> {
  // Always prune first so TTL expirations are reflected
  await pruneExpired();
  const queue = readQueue();
  const filtered = queue.filter((q) => q.attemptedMode !== item.attemptedMode);
  filtered.push({ ...item, queuedAt: Date.now(), retries: 0 });
  let dropped: QueuedAttempt | null = null;
  while (filtered.length > QUEUE_MAX_SIZE) {
    const removed = filtered.shift()!;
    dropped = removed;
    logTelemetry("warn", removed.correlationId, "Queue overflow — dropping oldest attempt");
    await recordAudit({
      correlationId: removed.correlationId,
      attemptedMode: removed.attemptedMode,
      previousMode: removed.previousMode,
      outcome: "queue_overflow",
      reason: `Fila offline excedeu o máximo de ${QUEUE_MAX_SIZE} tentativas`,
    });
  }
  writeQueue(filtered);
  return { enqueued: true, droppedForOverflow: dropped };
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export function removeFromQueue(correlationId: string) {
  writeQueue(readQueue().filter((q) => q.correlationId !== correlationId));
}

/**
 * Drain the offline queue by replaying each attempt.
 * Prunes expired items first.
 */
export async function drainQueue(
  replay: (item: QueuedAttempt) => Promise<void>
): Promise<{ replayed: number; failed: number; expired: number }> {
  if (!navigator.onLine) return { replayed: 0, failed: 0, expired: 0 };
  const { kept, expired } = await pruneExpired();
  if (kept.length === 0) return { replayed: 0, failed: 0, expired: expired.length };
  let replayed = 0;
  let failed = 0;
  const remaining: QueuedAttempt[] = [];
  for (const item of kept) {
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
  return { replayed, failed, expired: expired.length };
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
