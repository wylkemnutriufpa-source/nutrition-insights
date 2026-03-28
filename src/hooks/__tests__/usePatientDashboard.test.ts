import { describe, it, expect } from "vitest";

describe("PatientDashboard data transformation", () => {
  // Simulates RPC → hook output transformation
  function transformRpcResult(rpcStats: Record<string, any> | null, rpcError: boolean, checklistTasks: any[], anamnesis: any | null, meals: any[]) {
    const unreadMessages = rpcError ? 0 : (rpcStats?.unread_messages || 0);
    const stats = rpcError ? null : (rpcStats?.stats || null);
    const nextAppointment = rpcError ? null : (rpcStats?.next_appointment || null);

    return {
      stats,
      checklistTasks: checklistTasks || [],
      anamnesis: anamnesis || null,
      nextAppointment,
      recentMeals: meals || [],
      unreadMessages,
    };
  }

  // Simulates fallback transformation
  function transformFallbackResult(statsData: any, checklistTasks: any[], anamnesis: any, aptData: any, mealsData: any[], msgCount: number) {
    return {
      stats: statsData,
      checklistTasks: checklistTasks || [],
      anamnesis: anamnesis || null,
      nextAppointment: aptData || null,
      recentMeals: mealsData || [],
      unreadMessages: msgCount || 0,
    };
  }

  it("transforms successful RPC result", () => {
    const result = transformRpcResult(
      { stats: { level: 5, xp: 100 }, unread_messages: 3, next_appointment: { id: "apt1" } },
      false, [{ id: "t1" }], { id: "a1" }, [{ id: "m1" }],
    );
    expect(result.stats).toEqual({ level: 5, xp: 100 });
    expect(result.unreadMessages).toBe(3);
    expect(result.nextAppointment).toEqual({ id: "apt1" });
    expect(result.checklistTasks).toHaveLength(1);
    expect(result.anamnesis).toEqual({ id: "a1" });
    expect(result.recentMeals).toHaveLength(1);
  });

  it("handles RPC error with zero fallback", () => {
    const result = transformRpcResult(null, true, [], null, []);
    expect(result.stats).toBeNull();
    expect(result.unreadMessages).toBe(0);
    expect(result.nextAppointment).toBeNull();
    expect(result.checklistTasks).toEqual([]);
  });

  it("handles null stats from RPC", () => {
    const result = transformRpcResult(
      { stats: null, unread_messages: 0, next_appointment: null },
      false, [], null, [],
    );
    expect(result.stats).toBeNull();
    expect(result.nextAppointment).toBeNull();
  });

  it("RPC and fallback produce same shape", () => {
    const rpc = transformRpcResult(
      { stats: { level: 1 }, unread_messages: 2, next_appointment: { id: "a1" } },
      false, [{ id: "t1" }], { id: "an1" }, [{ id: "m1" }],
    );
    const fallback = transformFallbackResult(
      { level: 1 }, [{ id: "t1" }], { id: "an1" }, { id: "a1" }, [{ id: "m1" }], 2,
    );

    expect(Object.keys(rpc).sort()).toEqual(Object.keys(fallback).sort());
  });

  it("handles empty checklist, meals, and anamnesis", () => {
    const result = transformRpcResult(
      { stats: null, unread_messages: 0, next_appointment: null },
      false, [], null, [],
    );
    expect(result.checklistTasks).toEqual([]);
    expect(result.recentMeals).toEqual([]);
    expect(result.anamnesis).toBeNull();
  });

  it("handles undefined RPC fields without breaking", () => {
    const result = transformRpcResult({}, false, [], null, []);
    expect(result.stats).toBeNull();
    expect(result.unreadMessages).toBe(0);
    expect(result.nextAppointment).toBeNull();
  });
});
