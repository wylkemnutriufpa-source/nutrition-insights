/**
 * FitJourney — Compatibility Guard (BLOCO 2)
 * 
 * Camada de proteção contra quebras de contrato de dados.
 * Valida e normaliza dados entre frontend ↔ banco ↔ edge functions.
 * 
 * REGRA: Quando um campo muda, este guard garante fallback seguro.
 */

import { logWarn } from "@/lib/monitoring";
import { safeNumber, safeString, safeArray, safeBool, safeObject } from "@/lib/safeguards";

// ========== Status Maps (legado → atual) ==========

/** Mapeamento de status legados para atuais */
const LIFECYCLE_STATUS_MAP: Record<string, string> = {
  // Legado → Atual
  "new": "lead_created",
  "pending": "awaiting_payment",
  "active": "clinical_followup_active",
  "inactive": "clinical_followup_active",
  "awaiting_onboarding": "awaiting_onboarding_release",
  "onboarding": "onboarding_active",
  "completed_onboarding": "onboarding_completed",
  "followup": "clinical_followup_active",
  // Atuais (passam direto)
  "lead_created": "lead_created",
  "awaiting_payment": "awaiting_payment",
  "awaiting_onboarding_release": "awaiting_onboarding_release",
  "onboarding_active": "onboarding_active",
  "onboarding_completed": "onboarding_completed",
  "clinical_followup_active": "clinical_followup_active",
  "paused": "paused",
  "discharged": "discharged",
};

/** Normaliza status de lifecycle — nunca retorna valor desconhecido */
export function normalizeLifecycleStatus(raw: unknown): string {
  const s = safeString(raw, "lead_created").toLowerCase().trim();
  const mapped = LIFECYCLE_STATUS_MAP[s];
  if (!mapped) {
    logWarn("CompatibilityGuard", `Status desconhecido: "${s}", usando fallback`, { raw: s });
    return "lead_created";
  }
  return mapped;
}

// ========== Field Name Maps (legado → atual) ==========

const FIELD_ALIASES: Record<string, Record<string, string>> = {
  profiles: {
    "name": "full_name",
    "firstName": "full_name",
    "first_name": "full_name",
    "avatar": "avatar_url",
    "photo": "avatar_url",
  },
  meal_plans: {
    "plan_name": "name",
    "title": "name",
    "plan_status": "status",
    "is_published": "status", // boolean → status mapping handled separately
  },
  nutritionist_patients: {
    "nutritionist": "nutritionist_id",
    "patient": "patient_id",
    "professional_id": "nutritionist_id",
  },
};

/** Resolve um nome de campo, considerando aliases legados */
export function resolveFieldName(table: string, field: string): string {
  const aliases = FIELD_ALIASES[table];
  if (!aliases) return field;
  return aliases[field] || field;
}

// ========== Contract Validators ==========

interface ContractField {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object" | "uuid" | "date";
  required: boolean;
  fallback?: unknown;
}

interface DataContract {
  table: string;
  fields: ContractField[];
}

/** Core data contracts for critical tables */
export const DATA_CONTRACTS: DataContract[] = [
  {
    table: "profiles",
    fields: [
      { name: "id", type: "uuid", required: true },
      { name: "full_name", type: "string", required: true, fallback: "Sem nome" },
      { name: "email", type: "string", required: true, fallback: "" },
      { name: "avatar_url", type: "string", required: false, fallback: null },
      { name: "phone", type: "string", required: false, fallback: null },
    ],
  },
  {
    table: "meal_plans",
    fields: [
      { name: "id", type: "uuid", required: true },
      { name: "name", type: "string", required: true, fallback: "Plano sem nome" },
      { name: "status", type: "string", required: true, fallback: "draft" },
      { name: "patient_id", type: "uuid", required: true },
      { name: "nutritionist_id", type: "uuid", required: true },
    ],
  },
  {
    table: "nutritionist_patients",
    fields: [
      { name: "id", type: "uuid", required: true },
      { name: "nutritionist_id", type: "uuid", required: true },
      { name: "patient_id", type: "uuid", required: true },
      { name: "status", type: "string", required: true, fallback: "active" },
    ],
  },
  {
    table: "patient_lifecycle_state",
    fields: [
      { name: "patient_id", type: "uuid", required: true },
      { name: "current_state", type: "string", required: true, fallback: "lead_created" },
    ],
  },
  {
    table: "recipes",
    fields: [
      { name: "id", type: "uuid", required: true },
      { name: "title", type: "string", required: true, fallback: "Receita" },
      { name: "ingredients", type: "array", required: false, fallback: [] },
      { name: "instructions", type: "array", required: false, fallback: [] },
    ],
  },
  {
    table: "notifications",
    fields: [
      { name: "id", type: "uuid", required: true },
      { name: "title", type: "string", required: true, fallback: "Notificação" },
      { name: "type", type: "string", required: true, fallback: "info" },
      { name: "user_id", type: "uuid", required: true },
    ],
  },
];

/** Validate a record against its contract, auto-fixing where possible */
export function validateContract<T extends Record<string, unknown>>(
  table: string,
  record: unknown
): { data: T; warnings: string[] } {
  const contract = DATA_CONTRACTS.find((c) => c.table === table);
  const obj = safeObject(record);
  const warnings: string[] = [];

  if (!contract) {
    return { data: obj as T, warnings: [] };
  }

  const result: Record<string, unknown> = { ...obj };

  for (const field of contract.fields) {
    // Check field aliases
    if (!(field.name in result)) {
      const aliases = FIELD_ALIASES[table];
      if (aliases) {
        for (const [alias, target] of Object.entries(aliases)) {
          if (target === field.name && alias in result) {
            result[field.name] = result[alias];
            warnings.push(`Campo legado "${alias}" mapeado para "${field.name}"`);
            break;
          }
        }
      }
    }

    const value = result[field.name];

    // Missing required field
    if (field.required && (value === null || value === undefined || value === "")) {
      if (field.fallback !== undefined) {
        result[field.name] = field.fallback;
        warnings.push(`Campo obrigatório "${field.name}" ausente, usando fallback`);
      } else {
        warnings.push(`Campo obrigatório "${field.name}" ausente, sem fallback`);
      }
      continue;
    }

    // Type coercion
    if (value !== null && value !== undefined) {
      switch (field.type) {
        case "number":
          result[field.name] = safeNumber(value, field.fallback as number ?? 0);
          break;
        case "string":
        case "uuid":
          result[field.name] = safeString(value, field.fallback as string ?? "");
          break;
        case "boolean":
          result[field.name] = safeBool(value, field.fallback as boolean ?? false);
          break;
        case "array":
          result[field.name] = safeArray(value, field.fallback as unknown[] ?? []);
          break;
        case "object":
          result[field.name] = safeObject(value);
          break;
      }
    }
  }

  if (warnings.length > 0) {
    logWarn("CompatibilityGuard", `Contrato ${table}: ${warnings.length} correções`, {
      warnings: warnings.slice(0, 5),
    });
  }

  return { data: result as T, warnings };
}

/** Validate an array of records */
export function validateContractArray<T extends Record<string, unknown>>(
  table: string,
  records: unknown
): { data: T[]; totalWarnings: number } {
  const arr = safeArray(records);
  let totalWarnings = 0;
  const data = arr.map((record) => {
    const { data: validated, warnings } = validateContract<T>(table, record);
    totalWarnings += warnings.length;
    return validated;
  });
  return { data, totalWarnings };
}
