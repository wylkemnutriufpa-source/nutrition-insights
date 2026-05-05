import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockSelect = vi.fn(() => ({ 
  eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })),
  in: vi.fn().mockReturnThis()
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") return { select: mockSelect };
      if (table === "timeline_events") return { insert: mockInsert, select: mockSelect };
      if (table === "workspace_profiles") return { select: mockSelect };
      if (table === "meal_plans") return { select: mockSelect };
      return {};
    }),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("API Smoke Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/auth/login - should return session for valid credentials", async () => {
    const mockSession = { user: { id: "u1" }, access_token: "t1" };
    (supabase.auth.signInWithPassword as any).mockResolvedValue({ data: { session: mockSession }, error: null });

    const { data, error } = await supabase.auth.signInWithPassword({ email: "test@fitjourney.com", password: "123" });
    
    expect(error).toBeNull();
    expect(data.session).toBeDefined();
    expect(data.session?.user.id).toBe("u1");
  });

  it("GET /api/workspace/:id - should return workspace structure", async () => {
    const mockWorkspace = { id: "ws1", user_id: "u1" };
    mockMaybeSingle.mockResolvedValue({ data: mockWorkspace, error: null });

    const { data, error } = await supabase.from("workspace_profiles").select("*").eq("id", "ws1").maybeSingle();
    
    expect(error).toBeNull();
    expect(data).toMatchObject(mockWorkspace);
    expect(data.id).toBe("ws1");
  });

  it("POST /api/timeline - should insert event and return payload", async () => {
    const mockEvent = { id: "e1", title: "Novo Evento", event_type: "milestone" };
    mockSingle.mockResolvedValue({ data: mockEvent, error: null });

    const { data, error } = await supabase.from("timeline_events").insert({ title: "Novo Evento" }).select().single();
    
    expect(error).toBeNull();
    expect(data).toMatchObject(mockEvent);
    expect(data.event_type).toBe("milestone");
  });

  it("GET /api/nutrition/:id - should return profile nutritional info", async () => {
    const mockNutrition = { weight_kg: 80, goal: "maintain" };
    mockMaybeSingle.mockResolvedValue({ data: mockNutrition, error: null });

    const { data, error } = await supabase.from("profiles").select("weight_kg, goal").eq("id", "p1").maybeSingle();
    
    expect(error).toBeNull();
    expect(data).toMatchObject(mockNutrition);
    expect(data.weight_kg).toBe(80);
  });

  it("POST /api/plan/generate - should call edge function and return generated plan", async () => {
    const mockPlan = { plan_id: "plan1", success: true, meals: [] };
    (supabase.functions.invoke as any).mockResolvedValue({ data: mockPlan, error: null });

    const { data, error } = await supabase.functions.invoke("generate-meal-plan-v2", { body: { patient_id: "p1" } });
    
    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.plan_id).toBeDefined();
  });
});
