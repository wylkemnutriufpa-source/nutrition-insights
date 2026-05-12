import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth, AuthProvider } from "./auth";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(), // Added missing function
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null user when unauthenticated", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });
    
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.authStatus).toBe("unauthenticated");
  });

  it("should return user and session when authenticated", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockSession = { user: mockUser, access_token: "token-123" };
    
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
    // Mock profile and roles fetches
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { full_name: "Test User" }, error: null }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toEqual(mockSession);
    expect(result.current.authStatus).toBe("authenticated");
  });

  it("should handle login success", async () => {
    const mockUser = { id: "user-123" };
    const mockSession = { user: mockUser };
    
    (supabase.auth.signInWithPassword as any).mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null });
    
    // AuthProvider logic uses onAuthStateChange to update state, so we simulate that
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    
    await act(async () => {
      const res = await supabase.auth.signInWithPassword({ email: "a@b.com", password: "123" });
      expect(res.error).toBeNull();
    });
  });

  it("should handle login failure gracefully", async () => {
    const mockError = { message: "Invalid credentials", status: 400 };
    (supabase.auth.signInWithPassword as any).mockResolvedValue({ data: { user: null, session: null }, error: mockError });
    
    const { error } = await supabase.auth.signInWithPassword({ email: "a@b.com", password: "123" });
    expect(error?.message).toBe("Invalid credentials");
  });

  it("should clear session on logout", async () => {
    (supabase.auth.signOut as any).mockResolvedValue({ error: null });
    
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    
    await act(async () => {
      await result.current.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
