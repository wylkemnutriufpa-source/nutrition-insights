/**
 * FitJourney — Structured Monitoring & Error Tracking
 * 
 * Centralized error logging with structured metadata.
 * All critical errors flow through here for consistency.
 */

export type ErrorCategory = "auth_error" | "data_error" | "render_error" | "routing_error" | "global" | "logic_error";

interface ErrorLog {
  level: "error" | "warn" | "info";
  category: ErrorCategory;
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

function createLog(
  level: ErrorLog["level"], 
  category: ErrorCategory,
  section: string, 
  message: string, 
  metadata?: Record<string, unknown>,
  stack?: string
): ErrorLog {
  // Try to get userId from localStorage or other sync source if available
  const userId = localStorage.getItem('sb-vkrcobprntictsxqmjjl-auth-token') 
    ? JSON.parse(localStorage.getItem('sb-vkrcobprntictsxqmjjl-auth-token') || '{}')?.user?.id 
    : undefined;

  return {
    level,
    category,
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

  // Handle overloaded signatures
  if (typeof category_or_section === "string" && ["auth_error", "data_error", "render_error", "routing_error", "global", "logic_error"].includes(category_or_section)) {
    // New signature: logError(category, section, message, metadata, stack)
    category = category_or_section as ErrorCategory;
    section = section_or_message;
    message = message_or_metadata as string;
    metadata = metadata_or_stack as Record<string, unknown>;
    stack = maybe_stack;
  } else {
    // Legacy signature: logError(section, message, metadata)
    section = category_or_section;
    message = section_or_message;
    metadata = message_or_metadata as Record<string, unknown>;
    stack = metadata_or_stack as string;
  }

  const entry = createLog("error", category, section, message, metadata, stack);
  // ... keep existing code
  const entry = createLog("error", category, section, message, metadata, stack);
  ERROR_BUFFER.push(entry);
  if (ERROR_BUFFER.length > MAX_BUFFER) ERROR_BUFFER.shift();
  
  // Console logging (only for non-production or explicitly allowed)
  console.error(`[FJ:${category}:${section}]`, message, {
    correlationId: entry.correlationId,
    route: entry.route,
    metadata,
    stack: stack?.split('\n').slice(0, 3).join('\n') // Short stack in console
  });

  // SEND TO EXTERNAL MONITORING (Future Sentry/Endpoint Integration)
  // For now, we dispatch to a custom event that can be picked up by a listener
  window.dispatchEvent(new CustomEvent('fj-telemetry-log', { 
    detail: entry 
  }));
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
