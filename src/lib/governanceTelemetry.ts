/**
 * FitJourney — Governance Telemetry
 *
 * Lightweight, in-memory ring buffer recording:
 *  - Every patient_state transition (state_change)
 *  - Every navigation decision produced by the governance engine (decision)
 *
 * Zero external dependencies. Used to diagnose redirect loops and
 * conflicts between page-level navigation and the global SystemStateGuard.
 */

import type { SystemDecision, GovernanceContext } from "./governance";

export interface StateChangeEvent {
  kind: "state_change";
  ts: number;
  userId?: string | null;
  from: string | null | undefined;
  to: string | null | undefined;
  source: string; // e.g. "realtime", "rpc", "manual", "consent"
}

export interface DecisionEvent {
  kind: "decision";
  ts: number;
  userId?: string | null;
  pathname: string;
  state: string | null | undefined;
  hasConsent?: boolean;
  decision: SystemDecision["type"];
  target?: string;
  reason: string;
}

export type GovernanceTelemetryEvent = StateChangeEvent | DecisionEvent;

const MAX = 200;
const buffer: GovernanceTelemetryEvent[] = [];
const listeners = new Set<(e: GovernanceTelemetryEvent) => void>();

function push(event: GovernanceTelemetryEvent) {
  buffer.push(event);
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
  listeners.forEach((l) => {
    try {
      l(event);
    } catch {
      /* ignore */
    }
  });
}

export function recordStateChange(params: {
  userId?: string | null;
  from: string | null | undefined;
  to: string | null | undefined;
  source: string;
}) {
  push({ kind: "state_change", ts: Date.now(), ...params });
}

export function recordDecision(ctx: GovernanceContext, decision: SystemDecision) {
  push({
    kind: "decision",
    ts: Date.now(),
    userId: ctx.user?.id ?? null,
    pathname: ctx.pathname,
    state: ctx.journeyStatus,
    hasConsent: ctx.hasConsent,
    decision: decision.type,
    target: decision.target,
    reason: decision.reason,
  });
}

export function getTelemetry(): GovernanceTelemetryEvent[] {
  return [...buffer];
}

export function clearTelemetry() {
  buffer.length = 0;
}

export function subscribeTelemetry(fn: (e: GovernanceTelemetryEvent) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Detects a redirect loop: more than `threshold` REDIRECT/BLOCK decisions
 * for the same user within `windowMs`.
 */
export function detectLoop(userId?: string | null, windowMs = 2000, threshold = 5): boolean {
  const now = Date.now();
  const recent = buffer.filter(
    (e) =>
      e.kind === "decision" &&
      (e as DecisionEvent).userId === userId &&
      now - e.ts <= windowMs &&
      ((e as DecisionEvent).decision === "REDIRECT" || (e as DecisionEvent).decision === "BLOCK")
  );
  return recent.length > threshold;
}
