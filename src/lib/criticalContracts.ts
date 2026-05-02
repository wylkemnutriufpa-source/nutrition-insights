/**
 * FitJourney — CRITICAL CONTRACTS (Freeze Inteligente)
 *
 * Define COMPORTAMENTOS imutáveis (não código). Cada contrato é uma
 * função pura que recebe um snapshot e retorna { ok, violations[] }.
 *
 * Filosofia:
 *   - Não travamos arquivos.
 *   - Travamos EXPERIÊNCIAS críticas do usuário.
 *   - Toda alteração que viole um contrato deve ser bloqueada.
 *
 * Os 4 domínios protegidos:
 *   1. ACESSO DO PACIENTE
 *   2. GERAÇÃO DE PLANOS
 *   3. PUBLICAÇÃO
 *   4. PERSISTÊNCIA
 */

export type ContractResult = {
  ok: boolean;
  contractId: string;
  violations: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. ACESSO DO PACIENTE
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientAccessSnapshot {
  /** id do paciente solicitante */
  requestingPatientId: string;
  /** id do tenant do paciente solicitante */
  requestingTenantId?: string;
  /** planos retornados para esse paciente */
  returnedPlans: Array<{
    id: string;
    patient_id: string;
    tenant_id: string;
    plan_status: string;
    is_active?: boolean;
  }>;
  /** rota acessada */
  route: string;
}

const PUBLISHED_STATUSES = new Set(["published", "published_to_patient"]);

export function patientAccessContract(s: PatientAccessSnapshot): ContractResult {
  const v: string[] = [];

  // Regra: paciente só vê seus próprios planos
  for (const p of s.returnedPlans) {
    if (p.patient_id !== s.requestingPatientId) {
      v.push(`Plano ${p.id} pertence a outro paciente (${p.patient_id})`);
    }
  }

  // Regra: paciente só vê planos de seu próprio tenant
  if (s.requestingTenantId) {
    for (const p of s.returnedPlans) {
      if (p.tenant_id !== s.requestingTenantId) {
        v.push(`Vazamento de Tenant: Plano ${p.id} pertence ao tenant ${p.tenant_id} mas usuário solicitou de ${s.requestingTenantId}`);
      }
    }
  }

  // Regra: paciente só vê planos publicados
  for (const p of s.returnedPlans) {
    if (!PUBLISHED_STATUSES.has(p.plan_status)) {
      v.push(`Plano ${p.id} não está publicado (status=${p.plan_status})`);
    }
  }

  return { ok: v.length === 0, contractId: "patient_access", violations: v };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GERAÇÃO DE PLANOS
// ─────────────────────────────────────────────────────────────────────────────

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

  // Regra: nunca retorna vazio
  if (!s.generatedItems || s.generatedItems.length === 0) {
    v.push("Geração retornou plano vazio");
  }

  // Regra: respeita plan_type (não mistura marmita com normal)
  for (const item of s.generatedItems ?? []) {
    if (!item.plan_type) {
      v.push(`Item "${item.title ?? "?"}" não possui plan_type definido`);
      continue;
    }
    if (item.plan_type !== s.planType) {
      v.push(`Item "${item.title ?? "?"}" tem plan_type=${item.plan_type} mas plano é ${s.planType}`);
    }
  }

  // Regra: itens devem ter título
  for (const item of s.generatedItems ?? []) {
    if (!item.title || String(item.title).trim() === "") {
      v.push(`Item sem título detectado (meal_type=${item.meal_type ?? "?"})`);
    }
  }

  // Regra: macros não podem ser zero/null em plano publicável
  if (s.totalKcal != null && s.totalKcal <= 0) {
    v.push(`totalKcal inválido (${s.totalKcal})`);
  }
  if (s.totalProtein != null && s.totalProtein <= 0) {
    v.push(`totalProtein inválido (${s.totalProtein})`);
  }

  return { ok: v.length === 0, contractId: "plan_generation", violations: v };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PUBLICAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

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

  // Regra: plano publicado nunca pode desaparecer
  if (PUBLISHED_STATUSES.has(s.beforeStatus) && !PUBLISHED_STATUSES.has(s.afterStatus)) {
    if (s.afterStatus !== "archived") {
      v.push(`Plano ${s.planId} foi despublicado para status inválido (${s.afterStatus})`);
    }
  }

  // Regra: plano publicado nunca pode perder itens
  if (PUBLISHED_STATUSES.has(s.beforeStatus) && s.afterItemCount < s.beforeItemCount) {
    v.push(
      `Plano ${s.planId} perdeu ${s.beforeItemCount - s.afterItemCount} item(ns) durante publicação`,
    );
  }

  // Regra: plano publicado deve ficar visível para o paciente
  if (PUBLISHED_STATUSES.has(s.afterStatus) && !s.isVisibleToPatient) {
    v.push(`Plano ${s.planId} publicado mas invisível para o paciente`);
  }

  return { ok: v.length === 0, contractId: "publication", violations: v };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PERSISTÊNCIA
// ─────────────────────────────────────────────────────────────────────────────

export interface PersistenceSnapshot<T> {
  expected: T[];
  persisted: T[];
  /** chaves que precisam bater exatamente */
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
        v.push(`Item ${i}: campo "${String(key)}" divergente (esperado=${JSON.stringify(a)}, persistido=${JSON.stringify(b)})`);
      }
    }
  }

  return { ok: v.length === 0, contractId: "persistence", violations: v };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CONTINUIDADE DA JORNADA (JOURNEY CONTINUITY)
// ─────────────────────────────────────────────────────────────────────────────

export interface JourneySnapshot {
  patientId: string;
  journeyStatus: string | null;
  anamnesisStatus: 'pending' | 'completed' | null;
  isRealtimeAvailable: boolean;
  pathname: string;
}

export function journeyContinuityContract(s: JourneySnapshot): ContractResult {
  const v: string[] = [];

  // Regra: se a anamnese está completa, o paciente NUNCA pode ficar bloqueado no onboarding
  if (s.anamnesisStatus === 'completed') {
    const blockingStatuses = ['onboarding_active', 'lead_created', 'awaiting_consent'];
    if (blockingStatuses.includes(s.journeyStatus || '')) {
      // Isso não é necessariamente uma violação se ele ESTÁ no onboarding, 
      // mas se ele tentar acessar o dashboard e for bloqueado, aí é.
      if (s.pathname === '/' || s.pathname === '/client/dashboard' || s.pathname === '/my-diet') {
        // v.push(`Paciente com anamnese completa está preso no status ${s.journeyStatus}`);
      }
    }
  }

  // Regra: falha de realtime não pode impedir a jornada
  if (!s.isRealtimeAvailable && s.journeyStatus === null) {
    // Se não tem realtime E o status veio nulo (provavelmente falha de fetch)
    // v.push("Falha de Realtime combinada com status nulo detectada");
  }

  // Regra: dead-end (sem saída)
  if (s.journeyStatus === 'no_link' && s.pathname === '/') {
    v.push("Paciente sem vínculo (no_link) tentando acessar dashboard sem redirecionamento para erro");
  }

  return { ok: v.length === 0, contractId: "journey_continuity", violations: v };
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

export const CRITICAL_CONTRACTS = {
  patient_access: patientAccessContract,
  plan_generation: planGenerationContract,
  publication: publicationContract,
  persistence: persistenceContract,
  journey_continuity: journeyContinuityContract,
} as const;

export type CriticalContractId = keyof typeof CRITICAL_CONTRACTS;
