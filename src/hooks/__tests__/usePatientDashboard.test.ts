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

import { usePatientDashboard } from "../queries/usePatientDashboard";

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

describe("usePatientDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = null;
  });

  it("returns RPC stats with combined data", async () => {
    mockAuth.user = { id: "p1" };
    mockSupabase.rpc.mockResolvedValue({
      data: {
        stats: { level: 5, xp: 100 },
        unread_messages: 3,
        next_appointment: { id: "apt1", appointment_date: "2025-06-01" },
      },
      error: null,
    });

    const chain = setupChain({ data: [], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const { result } = renderHook(() => usePatientDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.unreadMessages).toBe(3);
    expect(result.current.data?.nextAppointment).toEqual({ id: "apt1", appointment_date: "2025-06-01" });
    expect(result.current.data?.checklistTasks).toEqual([]);
  });

  it("falls back when RPC errors", async () => {
    mockAuth.user = { id: "p1" };
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: "fail" } });

    const chain = setupChain({ data: [], error: null, count: 0 });
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const { result } = renderHook(() => usePatientDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.unreadMessages).toBe(0);
  });

  it("handles null stats without breaking", async () => {
    mockAuth.user = { id: "p1" };
    mockSupabase.rpc.mockResolvedValue({
      data: {
        stats: null, unread_messages: 0, next_appointment: null,
      },
      error: null,
    });
    const chain = setupChain({ data: [], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const { result } = renderHook(() => usePatientDashboard(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.stats).toBeNull();
    expect(result.current.data?.nextAppointment).toBeNull();
  });

  it("does not fetch when user is null", () => {
    mockAuth.user = null;
    const { result } = renderHook(() => usePatientDashboard(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
