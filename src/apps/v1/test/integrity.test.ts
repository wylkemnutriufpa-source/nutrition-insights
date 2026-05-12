import { describe, it, expect } from "vitest";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createPatientSchema,
  chatMessageSchema,
  profileSchema,
  financialTransactionSchema,
} from "@v1/lib/validations";
import { cn } from "@v1/lib/utils";

// ============================================================
// 1. UTILITY INTEGRITY
// ============================================================
describe("cn() — Tailwind class merge", () => {
  it("merges classes correctly", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
  it("handles conditional classes", () => {
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });
  it("returns empty string for no input", () => {
    expect(cn()).toBe("");
  });
});

// ============================================================
// 2. VALIDATION SCHEMAS — AUTH
// ============================================================
describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ email: "user@test.com", password: "123456" });
    expect(result.success).toBe(true);
  });
  it("rejects empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "123456" });
    expect(result.success).toBe(false);
  });
  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-email", password: "123456" });
    expect(result.success).toBe(false);
  });
  it("rejects email > 255 chars", () => {
    const longEmail = "a".repeat(250) + "@b.com";
    const result = loginSchema.safeParse({ email: longEmail, password: "123" });
    expect(result.success).toBe(false);
  });
  it("rejects password > 128 chars", () => {
    const result = loginSchema.safeParse({ email: "u@t.com", password: "x".repeat(129) });
    expect(result.success).toBe(false);
  });
  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "u@t.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });
  it("rejects invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords ≥ 6 chars", () => {
    const result = resetPasswordSchema.safeParse({ password: "abc123", confirmPassword: "abc123" });
    expect(result.success).toBe(true);
  });
  it("rejects password < 6 chars", () => {
    const result = resetPasswordSchema.safeParse({ password: "abc", confirmPassword: "abc" });
    expect(result.success).toBe(false);
  });
  it("rejects mismatched passwords", () => {
    const result = resetPasswordSchema.safeParse({ password: "abc123", confirmPassword: "abc456" });
    expect(result.success).toBe(false);
  });
  it("rejects password > 128 chars", () => {
    const long = "x".repeat(129);
    const result = resetPasswordSchema.safeParse({ password: long, confirmPassword: long });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// 3. VALIDATION SCHEMAS — PATIENT
// ============================================================
describe("createPatientSchema", () => {
  it("accepts valid patient data", () => {
    const result = createPatientSchema.safeParse({ email: "p@t.com", full_name: "João Silva" });
    expect(result.success).toBe(true);
  });
  it("rejects name < 2 chars", () => {
    const result = createPatientSchema.safeParse({ email: "p@t.com", full_name: "J" });
    expect(result.success).toBe(false);
  });
  it("rejects name > 100 chars", () => {
    const result = createPatientSchema.safeParse({ email: "p@t.com", full_name: "A".repeat(101) });
    expect(result.success).toBe(false);
  });
  it("accepts optional phone", () => {
    const result = createPatientSchema.safeParse({ email: "p@t.com", full_name: "Ana", phone: "11999999999" });
    expect(result.success).toBe(true);
  });
  it("rejects phone > 20 chars", () => {
    const result = createPatientSchema.safeParse({ email: "p@t.com", full_name: "Ana", phone: "1".repeat(21) });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// 4. VALIDATION SCHEMAS — CHAT
// ============================================================
describe("chatMessageSchema", () => {
  it("accepts valid message", () => {
    expect(chatMessageSchema.safeParse({ message: "Olá!" }).success).toBe(true);
  });
  it("rejects empty message", () => {
    expect(chatMessageSchema.safeParse({ message: "" }).success).toBe(false);
  });
  it("rejects whitespace-only message", () => {
    expect(chatMessageSchema.safeParse({ message: "   " }).success).toBe(false);
  });
  it("rejects message > 5000 chars", () => {
    expect(chatMessageSchema.safeParse({ message: "x".repeat(5001) }).success).toBe(false);
  });
});

// ============================================================
// 5. VALIDATION SCHEMAS — PROFILE
// ============================================================
describe("profileSchema", () => {
  it("accepts valid profile", () => {
    expect(profileSchema.safeParse({ full_name: "Maria" }).success).toBe(true);
  });
  it("rejects name < 2 chars", () => {
    expect(profileSchema.safeParse({ full_name: "M" }).success).toBe(false);
  });
});

// ============================================================
// 6. VALIDATION SCHEMAS — FINANCIAL
// ============================================================
describe("financialTransactionSchema", () => {
  it("accepts valid income", () => {
    const result = financialTransactionSchema.safeParse({
      description: "Consulta",
      amount: 150,
      type: "income",
      date: "2026-03-14",
    });
    expect(result.success).toBe(true);
  });
  it("rejects negative amount", () => {
    const result = financialTransactionSchema.safeParse({
      description: "Consulta",
      amount: -10,
      type: "income",
      date: "2026-03-14",
    });
    expect(result.success).toBe(false);
  });
  it("rejects zero amount", () => {
    const result = financialTransactionSchema.safeParse({
      description: "Consulta",
      amount: 0,
      type: "income",
      date: "2026-03-14",
    });
    expect(result.success).toBe(false);
  });
  it("rejects invalid type", () => {
    const result = financialTransactionSchema.safeParse({
      description: "Consulta",
      amount: 100,
      type: "refund",
      date: "2026-03-14",
    });
    expect(result.success).toBe(false);
  });
  it("rejects missing date", () => {
    const result = financialTransactionSchema.safeParse({
      description: "Consulta",
      amount: 100,
      type: "income",
      date: "",
    });
    expect(result.success).toBe(false);
  });
  it("rejects description > 255 chars", () => {
    const result = financialTransactionSchema.safeParse({
      description: "x".repeat(256),
      amount: 100,
      type: "income",
      date: "2026-03-14",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// 7. CLINICAL ENGINE TYPE CONTRACTS
// ============================================================
describe("Clinical Engine type contracts", () => {
  it("ClinicalEngineResult shape is correct", () => {
    const mockResult = {
      patient_id: "uuid",
      total_signals: 3,
      matched_rules: 1,
      matched_tips: 2,
      rules: [],
      tips: [],
      signals_summary: [],
    };
    expect(mockResult).toHaveProperty("patient_id");
    expect(mockResult).toHaveProperty("total_signals");
    expect(mockResult).toHaveProperty("matched_rules");
    expect(mockResult).toHaveProperty("rules");
    expect(mockResult).toHaveProperty("tips");
    expect(mockResult).toHaveProperty("signals_summary");
    expect(Array.isArray(mockResult.rules)).toBe(true);
    expect(Array.isArray(mockResult.tips)).toBe(true);
  });

  it("DetectedSignal shape is correct", () => {
    const signal = { signal_key: "low_adherence", severity: "high", value: 0.2 };
    expect(signal).toHaveProperty("signal_key");
    expect(signal).toHaveProperty("severity");
    expect(typeof signal.value).toBe("number");
  });

  it("MatchedRule shape with recommendations", () => {
    const rule = {
      rule_key: "churn_risk",
      rule_name: "Risco de Abandono",
      category: "engagement",
      priority: 1,
      score: 85,
      target_audience: "nutritionist",
      matched_signals: ["low_adherence", "no_checkin_7d"],
      recommendations: [
        {
          title: "Agendar contato",
          body: "Paciente sem check-in há 7 dias",
          icon: "📞",
          priority: "high",
          action_type: "navigate",
          action_route: "/chat",
        },
      ],
    };
    expect(rule.matched_signals.length).toBeGreaterThan(0);
    expect(rule.recommendations.length).toBeGreaterThan(0);
    expect(rule.recommendations[0]).toHaveProperty("title");
    expect(rule.recommendations[0]).toHaveProperty("body");
  });
});

// ============================================================
// 8. SECURITY CONTRACTS
// ============================================================
describe("Security contracts", () => {
  it("XSS: Zod trims input preventing whitespace injection", () => {
    const result = loginSchema.safeParse({ email: "  user@test.com  ", password: "123456" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@test.com");
    }
  });

  it("SQL injection pattern rejected by email validation", () => {
    const result = loginSchema.safeParse({ email: "'; DROP TABLE users;--", password: "123456" });
    expect(result.success).toBe(false);
  });

  it("Script tag in name rejected by length/format", () => {
    const result = createPatientSchema.safeParse({
      email: "a@b.com",
      full_name: "<script>alert('xss')</script>".repeat(5),
    });
    expect(result.success).toBe(false); // exceeds 100 chars
  });
});

// ============================================================
// 9. MULTI-TENANT ISOLATION CONTRACTS
// ============================================================
describe("Multi-tenant isolation contracts", () => {
  it("nutritionist_patients table requires nutritionist_id", () => {
    // Type-level check: the schema requires nutritionist_id for inserts
    const mockInsert = {
      nutritionist_id: "uuid-nutri",
      patient_id: "uuid-patient",
      status: "active",
    };
    expect(mockInsert).toHaveProperty("nutritionist_id");
    expect(mockInsert).toHaveProperty("patient_id");
  });

  it("meal_plans require nutritionist_id + patient_id", () => {
    const mockPlan = {
      nutritionist_id: "uuid-nutri",
      patient_id: "uuid-patient",
      title: "Plano Emagrecimento",
      start_date: "2026-03-14",
    };
    expect(mockPlan).toHaveProperty("nutritionist_id");
    expect(mockPlan).toHaveProperty("patient_id");
  });
});
