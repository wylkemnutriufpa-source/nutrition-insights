import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
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
    // Mock successful profile check (not locked)
    (supabase.from as any).mockImplementation((table) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: table === "profiles" ? { experience_mode_locked: false } : null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));

    const { result } = renderHook(() => useExperienceModeState("professional"));

    await act(async () => {
      await result.current.setMode("advanced");
    });

    expect(result.current.mode).toBe("advanced");
    expect(localStorage.getItem("fj_experience_mode")).toBe("advanced");
  });

  it("should fallback to previous mode if DB update fails", async () => {
    // Mock profile check success but update failure
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { experience_mode_locked: false } }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: new Error("Network error") }),
      })),
    }));

    const { result } = renderHook(() => useExperienceModeState("professional"));

    await act(async () => {
      try {
        await result.current.setMode("advanced");
      } catch (e) {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.mode).toBe("basic");
      expect(result.current.failedMode).toBe("advanced");
    });
  });

  it("should block mode change if profile is locked", async () => {
    // Mock profile locked
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { experience_mode_locked: true } }),
        })),
      })),
    }));

    const { result } = renderHook(() => useExperienceModeState("patient"));

    let caughtError: any;
    await act(async () => {
      try {
        await result.current.setMode("pro");
      } catch (e) {
        caughtError = e;
      }
    });

    expect(caughtError?.code).toBe("MODE_LOCKED");
    expect(result.current.mode).toBe("basic");
  });

  it("should allow 'basic' even if locked", async () => {
    localStorage.setItem("fj_experience_mode", "pro");
    
    // Mock profile locked
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { experience_mode_locked: true } }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));

    const { result } = renderHook(() => useExperienceModeState("patient"));
    expect(result.current.mode).toBe("pro");

    await act(async () => {
      await result.current.setMode("basic");
    });

    expect(result.current.mode).toBe("basic");
  });

  it("should sync mode across instances via BroadcastChannel", async () => {
    const { result } = renderHook(() => useExperienceModeState("patient"));
    
    // Simulate a message from another tab
    await act(async () => {
      const channel = new BroadcastChannel("experience_mode_sync");
      channel.postMessage({ type: "MODE_UPDATE", mode: "pro" });
      
      // We need to wait a bit for the message to be processed
      // BroadcastChannel is async even on the same thread
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.mode).toBe("pro");
  });

  it("should persist failedMode in sessionStorage", async () => {
    // Mock update failure
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { experience_mode_locked: false } }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: new Error("Fail") }),
      })),
    }));

    const { result } = renderHook(() => useExperienceModeState("patient"));
    
    await act(async () => {
      try { await result.current.setMode("advanced"); } catch(e) {}
    });

    expect(sessionStorage.getItem("fj_experience_mode_failed")).toBe("advanced");
  });

  it("should block and show unlock_date when locked", async () => {
    const unlockDate = new Date(Date.now() + 86400000).toISOString();
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { experience_mode_locked: true, unlock_date: unlockDate } }),
        })),
      })),
    }));

    const { result } = renderHook(() => useExperienceModeState("patient"));
    
    let caughtError: any;
    await act(async () => {
      try { await result.current.setMode("pro"); } catch(e) { caughtError = e; }
    });

    expect(caughtError.code).toBe("MODE_LOCKED");
    expect(caughtError.unlock_date).toBe(unlockDate);
  });
});
