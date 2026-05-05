import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { ExperienceProvider, useExperienceContext } from "./ExperienceProvider";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import React, { ReactNode } from "react";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

describe("ExperienceProvider", () => {
  const mockUser = { id: "user-123" };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ExperienceProvider>{children}</ExperienceProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      experienceMode: "basic",
      experienceRole: "nutritionist",
      setMode: vi.fn(),
      loading: false,
      user: mockUser,
    });
  });

  // Test 1: Provider carrega modo inicial do perfil do usuário
  it("should initialize with values from auth context", () => {
    const { result } = renderHook(() => useExperienceContext(), { wrapper });
    expect(result.current.mode).toBe("basic");
    expect(result.current.role).toBe("nutritionist");
  });

  // Test 2: Ao simular mudança no banco (mock do canal Realtime), contexto atualiza
  it("should update mode when realtime event occurs", async () => {
    let callback: (payload: any) => void = () => {};
    (supabase.channel as any).mockReturnValue({
      on: vi.fn((event, config, cb) => {
        callback = cb;
        return { subscribe: vi.fn() };
      }),
    });

    const { result } = renderHook(() => useExperienceContext(), { wrapper });
    
    act(() => {
      callback({ new: { experience_mode: "pro" } });
    });

    expect(result.current.mode).toBe("pro");
    expect(result.current.isPro).toBe(true);
  });

  // Test 3: Fallback quando perfil não tem campo experience_mode → modo padrão
  it("should ignore invalid modes from realtime and keep current", () => {
    let callback: (payload: any) => void = () => {};
    (supabase.channel as any).mockReturnValue({
      on: vi.fn((event, config, cb) => {
        callback = cb;
        return { subscribe: vi.fn() };
      }),
    });

    const { result } = renderHook(() => useExperienceContext(), { wrapper });
    
    act(() => {
      callback({ new: { experience_mode: "invalid-mode" } });
    });

    expect(result.current.mode).toBe("basic");
  });

  // Test 4: Troca de modo → isRouteAllowed reflete nova permissão
  it("should update route permissions when mode changes", async () => {
    const { result } = renderHook(() => useExperienceContext(), { wrapper });
    
    // In basic mode, 'analytics' is likely false for nutritionist (based on useExperienceMode logic)
    expect(result.current.isRouteAllowed("analytics")).toBe(false);

    await act(async () => {
      await result.current.setMode("pro");
    });

    expect(result.current.mode).toBe("pro");
    expect(result.current.isRouteAllowed("analytics")).toBe(true);
  });

  // Test 5: Troca de modo otimista
  it("should update mode state immediately (optimistic) and call auth setMode", async () => {
    const { setMode: authSetMode } = useAuth();
    const { result } = renderHook(() => useExperienceContext(), { wrapper });
    
    await act(async () => {
      await result.current.setMode("advanced");
    });

    expect(result.current.mode).toBe("advanced");
    expect(authSetMode).toHaveBeenCalledWith("advanced");
  });

  // Test 6: Múltiplos componentes consomem o contexto e atualizam juntos
  it("should sync updates across multiple context consumers", async () => {
    // We use a shared wrapper to ensure both hooks are under the SAME provider instance
    const { result: hook1 } = renderHook(() => useExperienceContext(), { wrapper });
    const { result: hook2 } = renderHook(() => useExperienceContext(), { wrapper });

    await act(async () => {
      await hook1.current.setMode("pro");
    });

    expect(hook1.current.mode).toBe("pro");
    expect(hook2.current.mode).toBe("pro");
  });

  // Test 7: Desmontagem do Provider → listener é limpo
  it("should remove supabase channel on unmount", () => {
    const mockChannel = { some: "channel" };
    (supabase.channel as any).mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => mockChannel),
    });

    const { unmount } = renderHook(() => useExperienceContext(), { wrapper });
    unmount();

    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  // Test 8: Estado de erro quando Supabase falha no setMode
  it("should throw if auth.setMode fails", async () => {
    const error = new Error("DB Failure");
    (useAuth as any).mockReturnValue({
      experienceMode: "basic",
      experienceRole: "nutritionist",
      setMode: vi.fn().mockRejectedValue(error),
      user: mockUser,
    });

    const { result } = renderHook(() => useExperienceContext(), { wrapper });
    
    await expect(result.current.setMode("pro")).rejects.toThrow("DB Failure");
  });

  // Test 9: isRouteAllowed para rotas padrão
  it("should always allow dashboard or empty routes", () => {
    const { result } = renderHook(() => useExperienceContext(), { wrapper });
    expect(result.current.isRouteAllowed("")).toBe(true);
    expect(result.current.isRouteAllowed("/")).toBe(true);
    expect(result.current.isRouteAllowed("dashboard")).toBe(true);
  });

  // Test 10: isLoading reflete estado do auth
  it("should reflect loading state from auth context", () => {
    (useAuth as any).mockReturnValue({
      experienceMode: "basic",
      experienceRole: "nutritionist",
      loading: true,
      user: mockUser,
    });

    const { result } = renderHook(() => useExperienceContext(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  // Test 11: minMode logic integration
  it("should correctly evaluate minMode requirements", async () => {
    const { result } = renderHook(() => useExperienceContext(), { wrapper });
    
    expect(result.current.minMode("pro")).toBe(false);

    await act(async () => {
      await result.current.setMode("pro");
    });

    expect(result.current.minMode("pro")).toBe(true);
    expect(result.current.minMode("advanced")).toBe(false);
  });
});
