import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAIUsage } from "./useAIUsage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
}));

describe("useAIUsage", () => {
  const mockUser = { id: "user-123" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return free limit for free users", async () => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      subscription: { subscription_tier: "free" },
    });

    const mockUsage = { allowed: true, used: 2, max_uses: 5, period_type: "daily" };
    (supabase.rpc as any).mockResolvedValue({ data: JSON.stringify(mockUsage), error: null });

    const { result } = renderHook(() => useAIUsage("ai_assistant"));
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.max_uses).toBe(5);
    expect(result.current.usageLabel).toBe("2/5 hoje");
  });

  it("should return higher limits for pro users", async () => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      subscription: { subscription_tier: "pro" },
    });

    const mockUsage = { allowed: true, used: 10, max_uses: 100, period_type: "monthly" };
    (supabase.rpc as any).mockResolvedValue({ data: mockUsage, error: null }); // Test both string and object

    const { result } = renderHook(() => useAIUsage("ai_assistant"));
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.max_uses).toBe(100);
    expect(result.current.usageLabel).toBe("10/100 este mês");
  });

  it("should succeed when usage is under limit", async () => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      subscription: { subscription_tier: "free" },
    });

    const mockUsage = { allowed: true, used: 1, max_uses: 5 };
    (supabase.rpc as any).mockResolvedValue({ data: mockUsage, error: null });

    const { result } = renderHook(() => useAIUsage("ai_assistant"));
    
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const success = await result.current.recordUsage();
      expect(success).toBe(true);
    });
  });

  it("should return allowed=false when quota is exceeded", async () => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      subscription: { subscription_tier: "free" },
    });

    const mockUsage = { allowed: false, used: 5, max_uses: 5, next_available: "2026-05-06T00:00:00Z" };
    (supabase.rpc as any).mockResolvedValue({ data: mockUsage, error: null });

    const { result } = renderHook(() => useAIUsage("ai_assistant"));
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allowed).toBe(false);
    expect(result.current.nextAvailableLabel).toBeDefined();
  });

  it("should fallback to free plan when subscription tier is missing", async () => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      subscription: null,
    });

    const mockUsage = { allowed: true, used: 0, max_uses: 5 };
    (supabase.rpc as any).mockResolvedValue({ data: mockUsage, error: null });

    const { result } = renderHook(() => useAIUsage("ai_assistant"));
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(supabase.rpc).toHaveBeenCalledWith("check_ai_usage", expect.objectContaining({ _plan_tier: "free" }));
  });
});
