/**
 * FitJourney — Structured Monitoring & Error Tracking
 * 
 * Centralized error logging with structured metadata, batching, and retries.
 */
import { supabase } from "@/integrations/supabase/client";

export type ErrorCategory = "auth_error" | "data_error" | "render_error" | "routing_error" | "global" | "logic_error";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface ErrorLog {
  level: "error" | "warn" | "info";
  category: ErrorCategory;
  severity: Severity;
  section: string;
  message: string;
  stack?: string;
  route: string;
  userId?: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const ERROR_BUFFER: ErrorLog[] = [];
const MAX_BUFFER = 100;
const BATCH_SIZE = 5;
const FLUSH_INTERVAL = 10000; // 10 seconds
const RETRY_DELAY = 30000; // 30 seconds for local retries

let flushTimeout: ReturnType<typeof setTimeout> | null = null;

// Persistent session correlation ID
const SESSION_CORRELATION_ID = (() => {
  const key = 'fj_session_correlation_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `sid-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`;
    sessionStorage.setItem(key, id);
  }
  return id;
})();

const CATEGORY_SEVERITY: Record<ErrorCategory, Severity> = {
  auth_error: "CRITICAL",
  routing_error: "HIGH",
  render_error: "MEDIUM",
  data_error: "LOW",
  global: "MEDIUM",
  logic_error: "LOW",
};

function createLog(
  level: ErrorLog["level"], 
  category: ErrorCategory,
  section: string, 
  message: string, 
  metadata?: Record<string, unknown>,
  stack?: string
): ErrorLog {
  const userId = localStorage.getItem('sb-vkrcobprntictsxqmjjl-auth-token') 
    ? JSON.parse(localStorage.getItem('sb-vkrcobprntictsxqmjjl-auth-token') || '{}')?.user?.id 
    : undefined;

  return {
    level,
    category,
    severity: CATEGORY_SEVERITY[category] || "LOW",
    section,
    message,
    stack,
    route: window.location.pathname,
    userId,
    correlationId: SESSION_CORRELATION_ID,
    metadata,
    timestamp: new Date().toISOString(),
  };
}

async function flushLogs() {
  if (ERROR_BUFFER.length === 0) return;

  const logsToSend = [...ERROR_BUFFER];
  ERROR_BUFFER.length = 0;

  try {
    const { error } = await supabase.from('system_logs').insert(
      logsToSend.map(log => ({
        level: log.level,
        category: log.category,
        severity: log.severity,
        section: log.section,
        message: log.message,
        stack: log.stack,
        route: log.route,
        user_id: log.userId,
        correlation_id: log.correlationId,
        metadata: (log.metadata as any), // Cast for Json compatibility
        created_at: log.timestamp
      }))
    );

    if (error) throw error;
  } catch (err) {
    console.warn("[Monitoring] Failed to flush logs, storing in localStorage for retry", err);
    const existingRetries = JSON.parse(localStorage.getItem('fj_failed_logs') || '[]');
    localStorage.setItem('fj_failed_logs', JSON.stringify([...existingRetries, ...logsToSend].slice(-200)));
  }
}

function scheduleFlush() {
  if (flushTimeout) return;
  flushTimeout = setTimeout(async () => {
    flushTimeout = null;
    await flushLogs();
  }, FLUSH_INTERVAL);
}

// Initial retry of failed logs
setTimeout(async () => {
  const failed = JSON.parse(localStorage.getItem('fj_failed_logs') || '[]');
  if (failed.length > 0) {
    localStorage.removeItem('fj_failed_logs');
    ERROR_BUFFER.push(...failed);
    await flushLogs();
  }
}, 5000);

/** Log a structured error */
export function logError(
  category_or_section: ErrorCategory | string,
  section_or_message: string, 
  message_or_metadata?: string | Record<string, unknown>, 
  metadata_or_stack?: Record<string, unknown> | string,
  maybe_stack?: string
) {
  let category: ErrorCategory = "logic_error";
  let section: string;
  let message: string;
  let metadata: Record<string, unknown> | undefined;
  let stack: string | undefined;

  if (typeof category_or_section === "string" && ["auth_error", "data_error", "render_error", "routing_error", "global", "logic_error"].includes(category_or_section)) {
    category = category_or_section as ErrorCategory;
    section = section_or_message;
    message = message_or_metadata as string;
    metadata = metadata_or_stack as Record<string, unknown>;
    stack = maybe_stack;
  } else {
    section = category_or_section;
    message = section_or_message;
    metadata = message_or_metadata as Record<string, unknown>;
    stack = metadata_or_stack as string;
  }

  const entry = createLog("error", category, section, message, metadata, stack);
  ERROR_BUFFER.push(entry);
  if (ERROR_BUFFER.length > MAX_BUFFER) ERROR_BUFFER.shift();
  
  console.error(`[FJ:${category}:${section}]`, message, {
    correlationId: entry.correlationId,
    route: entry.route,
    metadata,
    stack: stack?.split('\n').slice(0, 3).join('\n')
  });

  if (ERROR_BUFFER.length >= BATCH_SIZE) {
    flushLogs();
  } else {
    scheduleFlush();
  }

  window.dispatchEvent(new CustomEvent('fj-telemetry-log', { detail: entry }));
}

/** Log a structured warning */
export function logWarn(
  category_or_section: ErrorCategory | string, 
  section_or_message: string, 
  message_or_metadata?: string | Record<string, unknown>, 
  maybe_metadata?: Record<string, unknown>
) {
  let category: ErrorCategory = "logic_error";
  let section: string;
  let message: string;
  let metadata: Record<string, unknown> | undefined;

  if (typeof category_or_section === "string" && ["auth_error", "data_error", "render_error", "routing_error", "global", "logic_error"].includes(category_or_section)) {
    category = category_or_section as ErrorCategory;
    section = section_or_message;
    message = message_or_metadata as string;
    metadata = maybe_metadata;
  } else {
    section = category_or_section;
    message = section_or_message;
    metadata = message_or_metadata as Record<string, unknown>;
  }

  const entry = createLog("warn", category, section, message, metadata);
  ERROR_BUFFER.push(entry);
  if (ERROR_BUFFER.length > MAX_BUFFER) ERROR_BUFFER.shift();
  console.warn(`[FJ:${category}:${section}]`, message, metadata ?? "");
  scheduleFlush();
}

/** Get recent error logs for debugging */
export function getRecentErrors(): readonly ErrorLog[] {
  return [...ERROR_BUFFER];
}

/** Install global unhandled error/rejection handlers */
export function installGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    logError("global", "window", event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }, event.error?.stack);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    const stack = event.reason instanceof Error ? event.reason.stack : undefined;
    logError("global", "promise", reason, undefined, stack);
  });
}
