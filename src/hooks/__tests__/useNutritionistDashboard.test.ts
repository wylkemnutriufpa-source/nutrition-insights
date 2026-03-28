import { describe, it, expect } from "vitest";

describe("NutritionistDashboard data transformation", () => {
  // Simulates RPC → hook output transformation
  function transformRpcResult(stats: Record<string, any>, patientIds: string[], programsList: any[], timeline: any[]) {
    return {
      patientCount: stats.patient_count || 0,
      protocolCount: stats.protocol_count || 0,
      programCount: stats.program_count || 0,
      mealPlanCount: stats.meal_plan_count || 0,
      appointmentsToday: stats.appointments_today || 0,
      unreadChats: stats.unread_chats || 0,
      pendingCheckins: stats.pending_checkins || 0,
      patientIds,
      programsList: programsList || [],
      recentTimeline: timeline || [],
    };
  }

  // Simulates legacy fallback transformation
  function transformLegacyResult(counts: Record<string, number | null>, patientIds: string[], programsList: any[], timeline: any[]) {
    return {
      patientCount: counts.patients || 0,
      protocolCount: counts.protocols || 0,
      programCount: counts.programs || 0,
      mealPlanCount: counts.plans || 0,
      appointmentsToday: counts.apts || 0,
      unreadChats: counts.chats || 0,
      pendingCheckins: counts.pending || 0,
      patientIds,
      programsList: programsList || [],
      recentTimeline: timeline || [],
    };
  }

  it("transforms RPC result correctly", () => {
    const result = transformRpcResult(
      { patient_count: 10, protocol_count: 3, program_count: 2, meal_plan_count: 5, appointments_today: 1, unread_chats: 4, pending_checkins: 2 },
      ["p1", "p2"], [{ id: "prog1", title: "T1" }], [],
    );
    expect(result.patientCount).toBe(10);
    expect(result.unreadChats).toBe(4);
    expect(result.patientIds).toEqual(["p1", "p2"]);
    expect(result.programsList).toHaveLength(1);
  });

  it("handles all-zero counters", () => {
    const result = transformRpcResult(
      { patient_count: 0, protocol_count: 0, program_count: 0, meal_plan_count: 0, appointments_today: 0, unread_chats: 0, pending_checkins: 0 },
      [], [], [],
    );
    expect(result.patientCount).toBe(0);
    expect(result.patientIds).toEqual([]);
    expect(result.recentTimeline).toEqual([]);
  });

  it("handles null/undefined RPC fields gracefully", () => {
    const result = transformRpcResult({}, [], [], []);
    expect(result.patientCount).toBe(0);
    expect(result.protocolCount).toBe(0);
    expect(result.programsList).toEqual([]);
  });

  it("legacy fallback produces same shape as RPC path", () => {
    const rpc = transformRpcResult({ patient_count: 5, protocol_count: 2, program_count: 1, meal_plan_count: 3, appointments_today: 0, unread_chats: 1, pending_checkins: 0 }, ["p1"], [], []);
    const legacy = transformLegacyResult({ patients: 5, protocols: 2, programs: 1, plans: 3, apts: 0, chats: 1, pending: 0 }, ["p1"], [], []);

    // Same keys
    expect(Object.keys(rpc).sort()).toEqual(Object.keys(legacy).sort());
    // Same values
    expect(rpc.patientCount).toBe(legacy.patientCount);
    expect(rpc.unreadChats).toBe(legacy.unreadChats);
  });

  // --- Timeline enrichment ---
  it("enriches timeline with patient names", () => {
    const events = [
      { patient_id: "p1", event_type: "checkin", created_at: "2025-06-01" },
      { patient_id: "p2", event_type: "meal", created_at: "2025-06-01" },
    ];
    const nameMap: Record<string, string> = { p1: "João", p2: "Maria" };
    const enriched = events.map((ev) => ({ ...ev, patient_name: nameMap[ev.patient_id] || "Paciente" }));

    expect(enriched[0].patient_name).toBe("João");
    expect(enriched[1].patient_name).toBe("Maria");
  });

  it("falls back to 'Paciente' for unknown IDs", () => {
    const events = [{ patient_id: "p99", event_type: "checkin", created_at: "2025-06-01" }];
    const nameMap: Record<string, string> = {};
    const enriched = events.map((ev) => ({ ...ev, patient_name: nameMap[ev.patient_id] || "Paciente" }));
    expect(enriched[0].patient_name).toBe("Paciente");
  });
});
