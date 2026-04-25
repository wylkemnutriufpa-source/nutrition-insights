/**
 * FitJourney — CRITICAL CONTRACTS (Backend / Edge Functions)
 *
 * Espelha src/lib/criticalContracts.ts no servidor.
 * Toda edge function que TOCA em planos/itens/publicação deve validar
 * contratos antes de responder ou persistir.
 *
 * Filosofia: protege EXPERIÊNCIA, não código.
 */

export type ContractResult = {
  ok: boolean;
  contractId: string;
  violations: string[];
};

const PUBLISHED_STATUSES = new Set(["published", "published_to_patient"]);

// ─── 1. ACESSO DO PACIENTE ───────────────────────────────────────────────────
export interface PatientAccessSnapshot {
  requestingPatientId: string;
  returnedPlans: Array<{
    id: string;
    patient_id: string;
    plan_status: string;
    is_active?: boolean;
  }>;
  route?: string;
}

export function patientAccessContract(s: PatientAccessSnapshot): ContractResult {
  const v: string[] = [];
  for (const p of s.returnedPlans) {
    if (p.patient_id !== s.requestingPatientId) {
      v.push(`Plano ${p.id} pertence a outro paciente (${p.patient_id})`);
    }
    if (!PUBLISHED_STATUSES.has(p.plan_status)) {
      v.push(`Plano ${p.id} não está publicado (status=${p.plan_status})`);
    }
  }
  return { ok: v.length === 0, contractId: "patient_access", violations: v };
}

// ─── 2. GERAÇÃO DE PLANOS ────────────────────────────────────────────────────
export interface PlanGenerationSnapshot {
  planType: "normal" | "marmita" | string;
  generatedItems: Array<{
    title?: string | null;
    meal_type?: string | null;
    plan_type?: string | null;
    calories_target?: number | null;
    protein_target?: number | null;
  }>;
  totalKcal?: number | null;
  totalProtein?: number | null;
}

export function planGenerationContract(s: PlanGenerationSnapshot): ContractResult {
  const v: string[] = [];

  if (!s.generatedItems || s.generatedItems.length === 0) {
    v.push("Geração retornou plano vazio");
  }

  for (const item of s.generatedItems ?? []) {
    if (!item.plan_type) {
      v.push(`Item "${item.title ?? "?"}" não possui plan_type definido`);
      continue;
    }
    if (item.plan_type !== s.planType) {
      v.push(
        `Item "${item.title ?? "?"}" tem plan_type=${item.plan_type} mas plano é ${s.planType}`,
      );
    }
    if (!item.title || String(item.title).trim() === "") {
      v.push(`Item sem título detectado (meal_type=${item.meal_type ?? "?"})`);
    }
  }

  if (s.totalKcal != null && s.totalKcal <= 0) {
    v.push(`totalKcal inválido (${s.totalKcal})`);
  }
  if (s.totalProtein != null && s.totalProtein <= 0) {
    v.push(`totalProtein inválido (${s.totalProtein})`);
  }

  return { ok: v.length === 0, contractId: "plan_generation", violations: v };
}

// ─── 3. PUBLICAÇÃO ───────────────────────────────────────────────────────────
export interface PublicationSnapshot {
  planId: string;
  beforeStatus: string;
  afterStatus: string;
  beforeItemCount: number;
  afterItemCount: number;
  isVisibleToPatient: boolean;
}

export function publicationContract(s: PublicationSnapshot): ContractResult {
  const v: string[] = [];

  if (PUBLISHED_STATUSES.has(s.beforeStatus) && !PUBLISHED_STATUSES.has(s.afterStatus)) {
    if (s.afterStatus !== "archived") {
      v.push(`Plano ${s.planId} foi despublicado para status inválido (${s.afterStatus})`);
    }
  }

  if (PUBLISHED_STATUSES.has(s.beforeStatus) && s.afterItemCount < s.beforeItemCount) {
    v.push(
      `Plano ${s.planId} perdeu ${s.beforeItemCount - s.afterItemCount} item(ns) durante publicação`,
    );
  }

  if (PUBLISHED_STATUSES.has(s.afterStatus) && !s.isVisibleToPatient) {
    v.push(`Plano ${s.planId} publicado mas invisível para o paciente`);
  }

  return { ok: v.length === 0, contractId: "publication", violations: v };
}

// ─── 4. PERSISTÊNCIA ─────────────────────────────────────────────────────────
export interface PersistenceSnapshot<T> {
  expected: T[];
  persisted: T[];
  keysToCompare: (keyof T)[];
}

export function persistenceContract<T>(s: PersistenceSnapshot<T>): ContractResult {
  const v: string[] = [];
  if (s.expected.length !== s.persisted.length) {
    v.push(`Contagem divergente: esperado=${s.expected.length}, persistido=${s.persisted.length}`);
  }
  const minLen = Math.min(s.expected.length, s.persisted.length);
  for (let i = 0; i < minLen; i++) {
    for (const key of s.keysToCompare) {
      const a = s.expected[i]?.[key];
      const b = s.persisted[i]?.[key];
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        v.push(
          `Item ${i}: campo "${String(key)}" divergente (esperado=${JSON.stringify(a)}, persistido=${JSON.stringify(b)})`,
        );
      }
    }
  }
  return { ok: v.length === 0, contractId: "persistence", violations: v };
}

// ─── ASSERT + LOG ────────────────────────────────────────────────────────────
export class ContractViolationError extends Error {
  constructor(
    public readonly contractId: string,
    public readonly violations: string[],
  ) {
    super(`Contract "${contractId}" violado: ${violations.join("; ")}`);
    this.name = "ContractViolationError";
  }
}

export interface ContractLogger {
  // deno-lint-ignore no-explicit-any
  from: (table: string) => any;
}

/**
 * Loga violação no banco (best-effort) e lança erro se ok=false.
 */
export async function assertContract(
  result: ContractResult,
  ctx: { client?: ContractLogger; source: string; metadata?: Record<string, unknown> },
): Promise<void> {
  if (result.ok) return;

  console.error(
    `[CRITICAL CONTRACT VIOLATION] ${result.contractId} @ ${ctx.source}`,
    result.violations,
  );

  if (ctx.client) {
    try {
      await ctx.client.from("contract_violations_log").insert({
        contract_id: result.contractId,
        source: ctx.source,
        violations: result.violations,
        metadata: ctx.metadata ?? {},
      });
    } catch (err) {
      console.warn("[contract] failed to log violation:", err);
    }
  }

  throw new ContractViolationError(result.contractId, result.violations);
}
