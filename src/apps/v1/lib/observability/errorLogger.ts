/**
 * FitJourney — Centralized Error Logger
 * Captures and persists structured errors to system_error_logs.
 * Fire-and-forget: never blocks the UI.
 */
import { supabase } from "@v1/integrations/supabase/client";

type Severity = "low" | "medium" | "high" | "critical";

interface ErrorLogEntry {
  module: string;
  error_message: string;
  action_attempted?: string;
  page_route?: string;
  stack_trace?: string;
  severity?: Severity;
  auto_recovered?: boolean;
}

const LOG_QUEUE: ErrorLogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000;
const MAX_QUEUE = 20;

async function flush() {
  if (LOG_QUEUE.length === 0) return;
  const batch = LOG_QUEUE.splice(0, MAX_QUEUE);

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id ?? null;
    const role = sessionData?.session?.user?.user_metadata?.role ?? "unknown";

    const rows = batch.map((entry) => ({
      user_id: userId,
      role,
      module: entry.module,
      page_route: entry.page_route ?? window.location.pathname,
      action_attempted: entry.action_attempted ?? null,
      error_message: entry.error_message.slice(0, 2000),
      stack_trace: entry.stack_trace?.slice(0, 4000) ?? null,
      severity: entry.severity ?? "medium",
      auto_recovered: entry.auto_recovered ?? false,
    }));

    await (supabase as any).from("system_error_logs").insert(rows);
  } catch {
    // Observability must never crash the app
    console.warn("[ErrorLogger] flush failed");
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL);
}

/** Log an error to the observability layer */
export function logSystemError(entry: ErrorLogEntry) {
  LOG_QUEUE.push(entry);
  if (LOG_QUEUE.length >= MAX_QUEUE) {
    void flush();
  } else {
    scheduleFlush();
  }
}

/** Convenience: capture an Error object */
export function captureError(
  module: string,
  error: unknown,
  opts?: { action?: string; severity?: Severity; recovered?: boolean }
) {
  const err = error instanceof Error ? error : new Error(String(error));
  logSystemError({
    module,
    error_message: err.message,
    stack_trace: err.stack,
    action_attempted: opts?.action,
    severity: opts?.severity ?? "medium",
    auto_recovered: opts?.recovered ?? false,
  });
}

/** Flush remaining logs before page unload */
if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
}
