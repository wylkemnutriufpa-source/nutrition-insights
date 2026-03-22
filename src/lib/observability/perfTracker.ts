/**
 * FitJourney — Performance Tracker
 * Measures execution time of critical flows.
 */
import { supabase } from "@/integrations/supabase/client";

interface PerfEntry {
  flow_name: string;
  user_role?: string;
  execution_time_ms: number;
  queries_count?: number;
  api_calls_count?: number;
  success: boolean;
}

const PERF_QUEUE: PerfEntry[] = [];
let perfTimer: ReturnType<typeof setTimeout> | null = null;

async function flushPerf() {
  if (PERF_QUEUE.length === 0) return;
  const batch = PERF_QUEUE.splice(0, 20);
  try {
    await (supabase as any).from("system_performance_logs").insert(batch);
  } catch {
    console.warn("[PerfTracker] flush failed");
  }
}

function schedulePerfFlush() {
  if (perfTimer) return;
  perfTimer = setTimeout(() => {
    perfTimer = null;
    void flushPerf();
  }, 10000);
}

/** Start measuring a flow — returns a finish function */
export function startPerfTrace(flowName: string, userRole?: string) {
  const start = performance.now();
  let queriesCount = 0;
  let apiCallsCount = 0;

  return {
    addQuery: () => { queriesCount++; },
    addApiCall: () => { apiCallsCount++; },
    finish: (success = true) => {
      const elapsed = Math.round(performance.now() - start);
      PERF_QUEUE.push({
        flow_name: flowName,
        user_role: userRole,
        execution_time_ms: elapsed,
        queries_count: queriesCount,
        api_calls_count: apiCallsCount,
        success,
      });
      schedulePerfFlush();
      return elapsed;
    },
  };
}

/** One-shot performance log */
export function logPerf(flowName: string, durationMs: number, success = true) {
  PERF_QUEUE.push({
    flow_name: flowName,
    execution_time_ms: Math.round(durationMs),
    success,
  });
  schedulePerfFlush();
}

if (typeof window !== "undefined") {
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushPerf();
  });
}
