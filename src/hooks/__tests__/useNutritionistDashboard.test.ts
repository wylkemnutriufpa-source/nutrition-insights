import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

const mockSupabase: any = {
  from: vi.fn(),
  rpc: vi.fn(),
  channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
  removeChannel: vi.fn(),
};

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));

const mockAuth: any = { user: null };
vi.mock("@/lib/auth", () => ({ useAuth: () => mockAuth }));

import { useNutritionistDashboard } from "../queries/useNutritionistDashboard";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: any) => createElement(QueryClientProvider, { client: qc }, children);
}

function setupChain(resolvedValue: any) {
  const chain: any = {};
  ["select", "eq", "neq", "in", "is", "gte", "lte", "order", "limit", "head"].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  chain.then = (r: any, e: any) => Promise.resolve(resolvedValue).then(r, e);
  return chain;
}

describe("useNutritionistDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = null;
  });

  it("returns successful RPC data with correct shape", async () => {
    mockAuth.user = { id: "n1" };
    mockSupabase.rpc.mockResolvedValue({
      data: {
        patient_count: 10, protocol_count: 3, program_count: 2,
        meal_plan_count: 5, appointments_today: 1, unread_chats: 4, pending_checkins: 2,
      },
      error: null,
    });

    // from() calls for patientIds, programsList, timeline
    const chain = setupChain({ data: [], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const { result } = renderHook(() => useNutritionistDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.patientCount).toBe(10);
    expect(result.current.data?.protocolCount).toBe(3);
    expect(result.current.data?.unreadChats).toBe(4);
    expect(result.current.data?.patientIds).toEqual([]);
  });

  it("falls back to legacy queries when RPC fails", async () => {
    mockAuth.user = { id: "n1" };
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: "RPC not found" } });

    const chain = setupChain({ data: [], error: null, count: 0 });
    mockSupabase.from.mockReturnValue(chain);

    const { result } = renderHook(() => useNutritionistDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.patientCount).toBe(0);
    expect(result.current.data?.recentTimeline).toEqual([]);
  });

  it("handles all-zero counters without error", async () => {
    mockAuth.user = { id: "n1" };
    mockSupabase.rpc.mockResolvedValue({
      data: {
        patient_count: 0, protocol_count: 0, program_count: 0,
        meal_plan_count: 0, appointments_today: 0, unread_chats: 0, pending_checkins: 0,
      },
      error: null,
    });
    const chain = setupChain({ data: [], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const { result } = renderHook(() => useNutritionistDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.patientCount).toBe(0);
    expect(result.current.data?.programsList).toEqual([]);
  });

  it("does not fetch when user is null", () => {
    mockAuth.user = null;
    const { result } = renderHook(() => useNutritionistDashboard(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
