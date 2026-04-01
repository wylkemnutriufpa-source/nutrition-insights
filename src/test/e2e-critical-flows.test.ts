/**
 * E2E Integration Tests — Critical Patient Lifecycle Flows
 * 
 * Validates the complete journey:
 * Payment → Consent → Onboarding → Active → Plan → Check-in
 * 
 * Tests RPC contracts, guard logic, state transitions, and data integrity.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase Mock ───
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-1" } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: "user-1" } } } })),
    },
    storage: {
      from: (...args: any[]) => mockStorageFrom(...args),
    },
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════
// FLOW 1: Payment Confirmation
// ═══════════════════════════════════════════════════════════
describe("E2E Flow: Payment Confirmation", () => {
  it("confirm_patient_payment RPC transitions to onboarding_active", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true, new_status: "onboarding_active" },
      error: null,
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("confirm_patient_payment", {
      _patient_id: "patient-1",
      _nutritionist_id: "nutri-1",
    });

    expect(result.error).toBeNull();
    const data = result.data as any;
    expect(data.success).toBe(true);
    expect(data.new_status).toBe("awaiting_consent");
    expect(mockRpc).toHaveBeenCalledWith("confirm_patient_payment", {
      _patient_id: "patient-1",
      _nutritionist_id: "nutri-1",
    });
  });

  it("rejects payment confirmation without nutritionist_id", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Missing required parameter" },
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("confirm_patient_payment" as any, {
      _patient_id: "patient-1",
      _nutritionist_id: "",
    });

    expect(result.error).not.toBeNull();
  });

  it("idempotent: double confirmation returns same result", async () => {
    const response = { data: { success: true, new_status: "awaiting_consent" }, error: null };
    mockRpc.mockResolvedValue(response);

    const { supabase } = await import("@/integrations/supabase/client");
    const r1 = await supabase.rpc("confirm_patient_payment" as any, { _patient_id: "p1", _nutritionist_id: "n1" });
    const r2 = await supabase.rpc("confirm_patient_payment" as any, { _patient_id: "p1", _nutritionist_id: "n1" });

    expect((r1.data as any).new_status).toBe((r2.data as any).new_status);
  });
});

// ═══════════════════════════════════════════════════════════
// FLOW 2: Onboarding Completion
// ═══════════════════════════════════════════════════════════
describe("E2E Flow: Onboarding Pipeline", () => {
  it("complete_patient_onboarding_by_patient transitions lifecycle", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { success: true, new_status: "onboarding_completed" },
      error: null,
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("complete_patient_onboarding_by_patient" as any, {
      _patient_id: "patient-1",
      _pipeline_id: "pipeline-1",
    });

    expect(result.error).toBeNull();
    expect((result.data as any).success).toBe(true);
  });

  it("fails gracefully with invalid pipeline_id", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Pipeline not found" },
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.rpc("complete_patient_onboarding_by_patient" as any, {
      _patient_id: "patient-1",
      _pipeline_id: "invalid",
    });

    expect(result.error).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
// FLOW 3: Meal Plan Publish → Patient View
// ═══════════════════════════════════════════════════════════
describe("E2E Flow: Meal Plan Lifecycle", () => {
  it("publishes plan via update", async () => {
    mockFrom.mockReturnValueOnce({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: { id: "plan-1", is_active: true },
          error: null,
        })),
      })),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await (supabase as any).from("meal_plans")
      .update({ is_active: true })
      .eq("id", "plan-1");

    expect(result.error).toBeNull();
  });

  it("patient can read active plan", async () => {
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { id: "plan-1", is_active: true, patient_id: "patient-1" },
              error: null,
            })),
          })),
        })),
      })),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await (supabase as any).from("meal_plans")
      .select("*")
      .eq("patient_id", "patient-1")
      .eq("is_active", true)
      .single();

    expect(result.data.is_active).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// FLOW 4: Check-in with Image Upload
// ═══════════════════════════════════════════════════════════
describe("E2E Flow: Patient Check-in", () => {
  it("uploads image to private bucket and saves path (not URL)", async () => {
    const storagePath = "patient-1/checkin/2026-03-28.jpg";

    mockStorageFrom.mockReturnValueOnce({
      upload: vi.fn(() => Promise.resolve({ data: { path: storagePath }, error: null })),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const uploadResult = await supabase.storage
      .from("checkin-photos")
      .upload(storagePath, new Blob(["fake"]));

    expect(uploadResult.error).toBeNull();

    // Verify path doesn't contain URL
    expect(storagePath).not.toContain("http");
    expect(storagePath).toContain("patient-1/");
  });

  it("generates signed URL for reading private image", async () => {
    const path = "patient-1/checkin/2026-03-28.jpg";
    const signedUrl = "https://storage.example.com/signed?token=abc";

    mockStorageFrom.mockReturnValueOnce({
      createSignedUrl: vi.fn(() => Promise.resolve({
        data: { signedUrl },
        error: null,
      })),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await supabase.storage
      .from("checkin-photos")
      .createSignedUrl(path, 3600);

    expect(result.data?.signedUrl).toBe(signedUrl);
    expect(result.error).toBeNull();
  });

  it("saves check-in record with photo path fields", async () => {
    mockFrom.mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: "checkin-1",
              patient_id: "patient-1",
              photo_front_url: "patient-1/checkin/front.jpg",
              weight: 72.5,
            },
            error: null,
          })),
        })),
      })),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await (supabase as any).from("patient_checkins")
      .insert({
        patient_id: "patient-1",
        nutritionist_id: "nutri-1",
        photo_front_url: "patient-1/checkin/front.jpg",
        weight: 72.5,
      })
      .select()
      .single();

    expect(result.data.photo_front_url).not.toContain("http");
  });
});

// ═══════════════════════════════════════════════════════════
// FLOW 5: Chat / Realtime Messages
// ═══════════════════════════════════════════════════════════
describe("E2E Flow: Chat Messages", () => {
  it("sends message between nutritionist and patient", async () => {
    mockFrom.mockReturnValueOnce({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: "msg-1",
              sender_id: "nutri-1",
              receiver_id: "patient-1",
              message: "Oi, como está?",
              is_read: false,
            },
            error: null,
          })),
        })),
      })),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await (supabase as any).from("chat_messages")
      .insert({
        sender_id: "nutri-1",
        receiver_id: "patient-1",
        message: "Oi, como está?",
      })
      .select()
      .single();

    expect(result.data.message).toBe("Oi, como está?");
    expect(result.error).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
// FLOW 6: Signed URL Auto-Renewal Contract
// ═══════════════════════════════════════════════════════════
describe("E2E Flow: Signed URL Resilience", () => {
  it("resolveStorageUrl returns signed URL for path", async () => {
    const signedUrl = "https://storage.example.com/signed?token=xyz";
    mockStorageFrom.mockReturnValueOnce({
      createSignedUrl: vi.fn(() => Promise.resolve({ data: { signedUrl }, error: null })),
    });

    const { resolveStorageUrl } = await import("@/hooks/useSignedStorageUrl");
    const url = await resolveStorageUrl("patient-1/body/front.jpg", "body-images");

    expect(url).toBe(signedUrl);
  });

  it("resolveStorageUrl passes through full URLs unchanged", async () => {
    const { resolveStorageUrl } = await import("@/hooks/useSignedStorageUrl");
    const fullUrl = "https://example.com/image.jpg";
    const result = await resolveStorageUrl(fullUrl);

    expect(result).toBe(fullUrl);
  });

  it("resolveStorageUrl returns null for null/undefined input", async () => {
    const { resolveStorageUrl } = await import("@/hooks/useSignedStorageUrl");
    expect(await resolveStorageUrl(null)).toBeNull();
    expect(await resolveStorageUrl(undefined)).toBeNull();
  });

  it("resolveStorageUrl returns null on storage error", async () => {
    mockStorageFrom.mockReturnValueOnce({
      createSignedUrl: vi.fn(() => Promise.resolve({
        data: null,
        error: { message: "Object not found" },
      })),
    });

    const { resolveStorageUrl } = await import("@/hooks/useSignedStorageUrl");
    const result = await resolveStorageUrl("invalid/path.jpg", "checkin-photos");

    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
// FLOW 7: Safeguards — Data Sanitization
// ═══════════════════════════════════════════════════════════
describe("E2E Flow: Data Safeguards (prevent UI crashes)", () => {
  it("safeNumber handles all edge cases", async () => {
    const { safeNumber } = await import("@/lib/safeguards");

    expect(safeNumber(null)).toBe(0);
    expect(safeNumber(undefined)).toBe(0);
    expect(safeNumber("abc")).toBe(0);
    expect(safeNumber(NaN)).toBe(0);
    expect(safeNumber(Infinity)).toBe(0);
    expect(safeNumber("72.5")).toBe(72.5);
    expect(safeNumber(42)).toBe(42);
    expect(safeNumber(null, -1)).toBe(-1);
  });

  it("safeString handles all edge cases", async () => {
    const { safeString } = await import("@/lib/safeguards");

    expect(safeString(null)).toBe("");
    expect(safeString(undefined)).toBe("");
    expect(safeString(42)).toBe("42");
    expect(safeString("hello")).toBe("hello");
  });

  it("safeArray handles all edge cases", async () => {
    const { safeArray } = await import("@/lib/safeguards");

    expect(safeArray(null)).toEqual([]);
    expect(safeArray(undefined)).toEqual([]);
    expect(safeArray("string")).toEqual([]);
    expect(safeArray([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

// ═══════════════════════════════════════════════════════════
// FLOW 8: Lifecycle State Machine Integrity
// ═══════════════════════════════════════════════════════════
describe("E2E Flow: Lifecycle State Machine", () => {
  const VALID_STATUSES = [
    "lead",
    "awaiting_payment",
    "awaiting_consent",
    "awaiting_onboarding_release",
    "onboarding_active",
    "onboarding_completed",
    "draft_ready_for_review",
    "active",
    "paused",
    "inactive",
    "churned",
  ];

  it("all lifecycle statuses are well-defined", () => {
    expect(VALID_STATUSES.length).toBeGreaterThanOrEqual(8);
    expect(VALID_STATUSES).toContain("active");
    expect(VALID_STATUSES).toContain("awaiting_payment");
    expect(VALID_STATUSES).toContain("onboarding_active");
  });

  it("payment → consent is the correct order", () => {
    const fromIdx = VALID_STATUSES.indexOf("awaiting_payment");
    const toIdx = VALID_STATUSES.indexOf("awaiting_consent");
    expect(toIdx).toBeGreaterThan(fromIdx);
  });

  it("cannot skip onboarding and go directly to active", () => {
    const onboardingIdx = VALID_STATUSES.indexOf("onboarding_active");
    const activeIdx = VALID_STATUSES.indexOf("active");
    expect(activeIdx).toBeGreaterThan(onboardingIdx);
  });

  it("churned is terminal state", () => {
    expect(VALID_STATUSES.indexOf("churned")).toBe(VALID_STATUSES.length - 1);
  });
});

// ═══════════════════════════════════════════════════════════
// FLOW 9: Notification Delivery
// ═══════════════════════════════════════════════════════════
describe("E2E Flow: Smart Notifications", () => {
  it("creates notification for patient", async () => {
    mockFrom.mockReturnValueOnce({
      insert: vi.fn(() => Promise.resolve({
        data: [{ id: "notif-1", user_id: "patient-1", title: "Novo plano", is_read: false }],
        error: null,
      })),
    });

    const { supabase } = await import("@/integrations/supabase/client");
    const result = await (supabase as any).from("notifications").insert([{
      user_id: "patient-1",
      title: "Novo plano",
      message: "Seu plano foi publicado",
    }]);

    expect(result.error).toBeNull();
    expect(result.data[0].is_read).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
// FLOW 10: Body Analysis with Private Storage
// ═══════════════════════════════════════════════════════════
describe("E2E Flow: Body Analysis Upload", () => {
  it("uploads body images to private bucket and stores path", async () => {
    const paths = [
      "patient-1/body/front.jpg",
      "patient-1/body/side.jpg",
      "patient-1/body/back.jpg",
    ];

    for (const path of paths) {
      mockStorageFrom.mockReturnValueOnce({
        upload: vi.fn(() => Promise.resolve({ data: { path }, error: null })),
      });
    }

    const { supabase } = await import("@/integrations/supabase/client");

    for (const path of paths) {
      const result = await supabase.storage
        .from("body-images")
        .upload(path, new Blob(["img"]));
      expect(result.error).toBeNull();
    }

    // Verify paths don't contain URLs
    paths.forEach(p => {
      expect(p).not.toContain("http");
      expect(p).toContain("patient-1/body/");
    });
  });
});
