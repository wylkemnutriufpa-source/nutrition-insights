import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExperienceModeState } from "../useExperienceMode";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
      })),
    })),
  },
}));

describe("useExperienceModeState", () => {
  const mockUser = { id: "test-user-id" };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });
  });

  it("should initialize with 'basic' mode by default", () => {
    const { result } = renderHook(() => useExperienceModeState("patient"));
    expect(result.current.mode).toBe("basic");
  });

  it("should load mode from localStorage", () => {
    localStorage.setItem("fj_experience_mode", "pro");
    const { result } = renderHook(() => useExperienceModeState("professional"));
    expect(result.current.mode).toBe("pro");
  });

  it("should update mode and persist to localStorage and DB", async () => {
    const { result } = renderHook(() => useExperienceModeState("professional"));

    // Mock successful profile check (not locked)
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { experience_mode_locked: false } }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    });

    await act(async () => {
      await result.current.setMode("advanced");
    });

    expect(result.current.mode).toBe("advanced");
    expect(localStorage.getItem("fj_experience_mode")).toBe("advanced");
    expect(supabase.from).toHaveBeenCalledWith("profiles");
  });

  it("should fallback to previous mode if DB update fails", async () => {
    const { result } = renderHook(() => useExperienceModeState("professional"));

    // Mock profile check success but update failure
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { experience_mode_locked: false } }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: new Error("Network error") }),
      })),
    });

    try {
      await act(async () => {
        await result.current.setMode("advanced");
      });
    } catch (e) {
      // Expected
    }

    expect(result.current.mode).toBe("basic"); // Remained basic or fell back
    expect(result.current.failedMode).toBe("advanced");
  });

  it("should block mode change if profile is locked", async () => {
    const { result } = renderHook(() => useExperienceModeState("patient"));

    // Mock profile locked
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { experience_mode_locked: true } }),
        })),
      })),
    });

    let caughtError: any;
    try {
      await act(async () => {
        await result.current.setMode("pro");
      });
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError?.code).toBe("MODE_LOCKED");
    expect(result.current.mode).toBe("basic");
  });

  it("should allow 'basic' even if locked", async () => {
    localStorage.setItem("fj_experience_mode", "pro");
    const { result } = renderHook(() => useExperienceModeState("patient"));
    expect(result.current.mode).toBe("pro");

    // Mock profile locked
    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { experience_mode_locked: true } }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    });

    await act(async () => {
      await result.current.setMode("basic");
    });

    expect(result.current.mode).toBe("basic");
  });
});
