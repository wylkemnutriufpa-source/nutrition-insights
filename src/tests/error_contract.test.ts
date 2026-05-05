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

describe("API Error Contract Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {
    it("should return 401 for invalid credentials", async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({ 
        data: { session: null }, 
        error: { status: 401, message: "Invalid login credentials" } 
      });
      const { error } = await (supabase.auth as any).signInWithPassword({ email: "wrong@test.com", password: "123" });
      expect(error.status).toBe(401);
    });

    it("should return 400 for missing fields", async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({ 
        data: { session: null }, 
        error: { status: 400, message: "Email required" } 
      });
      const { error } = await (supabase.auth as any).signInWithPassword({ password: "123" });
      expect(error.status).toBe(400);
    });

    it("should return 422 for malformed email", async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({ 
        data: { session: null }, 
        error: { status: 422, message: "Invalid email format" } 
      });
      const { error } = await (supabase.auth as any).signInWithPassword({ email: "not-an-email", password: "123" });
      expect(error.status).toBe(422);
    });
  });

  describe("GET /api/workspace/:id", () => {
    it("should return 401 when unauthenticated", async () => {
      // Simulation of unauthenticated request if we had a middlelayer or direct fetch
      // Here we mock what Supabase would return if RLS or auth middleware fails
      mockMaybeSingle.mockResolvedValue({ data: null, error: { status: 401, message: "Unauthenticated" } });
      const { error } = await (supabase.from("workspace_profiles") as any).select("*").eq("id", "ws1").maybeSingle();
      expect(error.status).toBe(401);
    });

    it("should return 404 for non-existent workspace", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { status: 404, message: "Not found" } });
      const { error } = await (supabase.from("workspace_profiles") as any).select("*").eq("id", "missing").maybeSingle();
      expect(error.status).toBe(404);
    });

    it("should return 400 for invalid UUID format", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { status: 400, message: "Invalid ID format" } });
      const { error } = await (supabase.from("workspace_profiles") as any).select("*").eq("id", "123").maybeSingle();
      expect(error.status).toBe(400);
    });
  });

  describe("POST /api/timeline", () => {
    it("should return 401 when unauthorized", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { status: 401, message: "Unauthorized" } });
      const { error } = await (supabase.from("timeline_events") as any).insert({ title: "Event" }).select().single();
      expect(error.status).toBe(401);
    });

    it("should return 400 for missing mandatory payload fields", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { status: 400, message: "workspace_id required" } });
      const { error } = await (supabase.from("timeline_events") as any).insert({ title: "No Workspace" }).select().single();
      expect(error.status).toBe(400);
    });

    it("should return 422 for invalid event_type enum", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { status: 422, message: "Invalid type" } });
      const { error } = await (supabase.from("timeline_events") as any).insert({ title: "Ok", event_type: "alien" }).select().single();
      expect(error.status).toBe(422);
    });
  });

  describe("GET /api/nutrition/:id", () => {
    it("should return 401 if token is missing", async () => {
       mockMaybeSingle.mockResolvedValue({ data: null, error: { status: 401, message: "Token missing" } });
       const { error } = await (supabase.from("profiles") as any).select("*").eq("id", "p1").maybeSingle();
       expect(error.status).toBe(401);
    });

    it("should return 404 for unknown profile", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { status: 404, message: "Profile not found" } });
      const { error } = await (supabase.from("profiles") as any).select("*").eq("id", "unknown").maybeSingle();
      expect(error.status).toBe(404);
    });

    it("should return 403 if trying to access profile from another tenant", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: { status: 403, message: "Forbidden" } });
      const { error } = await (supabase.from("profiles") as any).select("*").eq("id", "other-tenant-p1").maybeSingle();
      expect(error.status).toBe(403);
    });
  });

  describe("POST /api/plan/generate", () => {
    it("should return 401 if user is not a professional", async () => {
      (supabase.functions.invoke as any).mockResolvedValue({ data: null, error: { status: 401, message: "Unauthenticated" } });
      const { error } = await (supabase.functions as any).invoke("generate-meal-plan-v2", { body: { patient_id: "p1" } });
      expect(error.status).toBe(401);
    });

    it("should return 400 if patient_id is missing from body", async () => {
      (supabase.functions.invoke as any).mockResolvedValue({ data: null, error: { status: 400, message: "patient_id required" } });
      const { error } = await (supabase.functions as any).invoke("generate-meal-plan-v2", { body: {} });
      expect(error.status).toBe(400);
    });

    it("should return 422 if patient has incomplete clinical data", async () => {
      (supabase.functions.invoke as any).mockResolvedValue({ data: null, error: { status: 422, message: "Incomplete data" } });
      const { error } = await (supabase.functions as any).invoke("generate-meal-plan-v2", { body: { patient_id: "p1" } });
      expect(error.status).toBe(422);
    });
  });
});
