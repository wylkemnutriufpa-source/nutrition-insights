/**
 * FitJourney — Structured Monitoring & Error Tracking
 * 
 * Centralized error logging with structured metadata.
 * All critical errors flow through here for consistency.
 */

interface ErrorLog {
  level: "error" | "warn" | "info";
  section: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const ERROR_BUFFER: ErrorLog[] = [];
const MAX_BUFFER = 50;

function createLog(level: ErrorLog["level"], section: string, message: string, metadata?: Record<string, unknown>): ErrorLog {
  return {
    level,
    section,
    message,
    metadata,
    timestamp: new Date().toISOString(),
  };
}

/** Log a structured error */
export function logError(section: string, message: string, metadata?: Record<string, unknown>) {
  const entry = createLog("error", section, message, metadata);
  ERROR_BUFFER.push(entry);
  if (ERROR_BUFFER.length > MAX_BUFFER) ERROR_BUFFER.shift();
  console.error(`[FJ:${section}]`, message, metadata ?? "");

  // Dispatch custom event for global error handling UI
  window.dispatchEvent(new CustomEvent('fj-runtime-error', { 
    detail: entry 
  }));
}

/** Log a structured warning */
export function logWarn(section: string, message: string, metadata?: Record<string, unknown>) {
  const entry = createLog("warn", section, message, metadata);
  ERROR_BUFFER.push(entry);
  if (ERROR_BUFFER.length > MAX_BUFFER) ERROR_BUFFER.shift();
  console.warn(`[FJ:${section}]`, message, metadata ?? "");
}

/** Get recent error logs for debugging */
export function getRecentErrors(): readonly ErrorLog[] {
  return [...ERROR_BUFFER];
}

/** Install global unhandled error/rejection handlers */
export function installGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    logError("global", event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    logError("promise", reason);
  });
}
