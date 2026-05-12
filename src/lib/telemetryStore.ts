/**
 * Realtime Telemetry Store — FitJourney Debug Center
 * 
 * In-memory store for tracking realtime events, invalidations, and refetches.
 * Zero LLM, zero AI — pure deterministic telemetry.
 */
import { create } from "zustand";

// ── Types ──────────────────────────────────────────

export interface RealtimeEvent {
  id: string;
  type: "realtime";
  table: string;
  event: "INSERT" | "UPDATE" | "DELETE";
  user_id: string | null;
  received_at: number;
  latency_ms: number | null;
  payload_size: number;
}

export interface InvalidationEvent {
  id: string;
  type: "invalidation";
  trigger: "realtime" | "focus" | "manual";
  query_keys: string[];
  timestamp: number;
}

export interface RefetchEvent {
  id: string;
  type: "refetch";
  queryKey: string;
  started_at: number;
  finished_at: number;
  duration_ms: number;
  success: boolean;
}

export type TelemetryEvent = RealtimeEvent | InvalidationEvent | RefetchEvent;

export interface ConnectionStatus {
  connected: boolean;
  activeChannels: number;
  lastEventAt: number | null;
}

// ── Store ──────────────────────────────────────────

const MAX_EVENTS = 200;

interface TelemetryState {
  events: TelemetryEvent[];
  connection: ConnectionStatus;
  enabled: boolean;

  // Actions
  addRealtimeEvent: (e: Omit<RealtimeEvent, "id" | "type">) => void;
  addInvalidation: (e: Omit<InvalidationEvent, "id" | "type">) => void;
  addRefetch: (e: Omit<RefetchEvent, "id" | "type">) => void;
  setConnection: (c: Partial<ConnectionStatus>) => void;
  clearEvents: () => void;
  setEnabled: (v: boolean) => void;
}

let _counter = 0;
const uid = () => `evt_${Date.now()}_${++_counter}`;

export const useTelemetryStore = create<TelemetryState>((set) => ({
  events: [],
  connection: { connected: false, activeChannels: 0, lastEventAt: null },
  enabled: false,

  addRealtimeEvent: (e) =>
    set((s) => {
      if (!s.enabled) return s;
      const ev: RealtimeEvent = { ...e, id: uid(), type: "realtime" };
      const events = [ev, ...s.events].slice(0, MAX_EVENTS);
      return {
        events,
        connection: { ...s.connection, lastEventAt: Date.now() },
      };
    }),

  addInvalidation: (e) =>
    set((s) => {
      if (!s.enabled) return s;
      const ev: InvalidationEvent = { ...e, id: uid(), type: "invalidation" };
      const events = [ev, ...s.events].slice(0, MAX_EVENTS);
      return { events };
    }),

  addRefetch: (e) =>
    set((s) => {
      if (!s.enabled) return s;
      const ev: RefetchEvent = { ...e, id: uid(), type: "refetch" };
      const events = [ev, ...s.events].slice(0, MAX_EVENTS);
      return { events };
    }),

  setConnection: (c) =>
    set((s) => ({
      connection: { ...s.connection, ...c },
    })),

  clearEvents: () => set({ events: [] }),
  setEnabled: (v) => set({ enabled: v }),
}));

// ── Computed helpers ───────────────────────────────

export function getRecentStats(events: TelemetryEvent[], windowMs = 60_000) {
  const cutoff = Date.now() - windowMs;

  const realtimeEvents = events.filter(
    (e): e is RealtimeEvent => e.type === "realtime" && e.received_at > cutoff
  );
  const invalidations = events.filter(
    (e): e is InvalidationEvent => e.type === "invalidation" && e.timestamp > cutoff
  );
  const refetches = events.filter(
    (e): e is RefetchEvent => e.type === "refetch" && e.started_at > cutoff
  );

  const latencies = realtimeEvents
    .map((e) => e.latency_ms)
    .filter((l): l is number => l !== null);

  return {
    realtimeCount: realtimeEvents.length,
    invalidationCount: invalidations.length,
    refetchCount: refetches.length,
    avgLatency: latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0,
    maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
  };
}
