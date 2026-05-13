/**
 * 📖 BÍBLIA OPERACIONAL DO FITJOURNEY
 * ====================================
 * 
 * Este arquivo é a LEI do sistema. Toda lógica deve respeitar estes princípios.
 * 
 * 🔥 REGRA MÁXIMA: Paciente é entidade única global. Sem duplicatas. Sem efeito tardio.
 * 
 * PRINCÍPIO 1 — PACIENTE ÚNICO GLOBAL
 *   - EMAIL é identificador principal
 *   - Se email existe → bloquear cadastro, sugerir vínculo
 *   - Nunca duplicar registro
 * 
 * PRINCÍPIO 2 — VÍNCULO MULTIPROFISSIONAL
 *   - Paciente pode ter Nutricionista + Personal + Médico
 *   - Profissional solicita acesso, profissional atual aceita
 *   - Sem duplicar registro
 * 
 * PRINCÍPIO 3 — ORIGEM NÃO MUDA REGRA
 *   - Cadastro manual, importação, convite, auto-cadastro → mesmo pipeline
 *   - invited → awaiting_payment → onboarding_active (consent é etapa 1 do onboarding) → 
 *     onboarding_completed → draft_ready_for_review → plan_published → active_followup
 *   - Nunca pular estados
 * 
 * PRINCÍPIO 4 — AÇÃO CRÍTICA TEM EFEITO IMEDIATO
 *   - Confirmar pagamento, liberar onboarding, publicar plano, aceitar vínculo
 *   - Devem alterar: banco + UI + permissões + timeline INSTANTANEAMENTE
 *   - Sem refresh. Sem delay perceptível.
 * 
 * PRINCÍPIO 5 — LOGIN SEMPRE POSSÍVEL
 *   - Se paciente está ACTIVE → SEMPRE consegue logar
 *   - Bloqueios só por: pagamento vencido, plano cancelado, conta suspensa
 *   - Nunca por bug de fluxo
 * 
 * PRINCÍPIO 6 — IMPORTAÇÃO SEGURA
 *   - Verificar duplicatas, normalizar email, senha padrão forte (Fit@2026!)
 *   - Nunca criar senha impossível ou paciente invisível
 * 
 * PRINCÍPIO 7 — PERFIL ÚNICO / DASHBOARD UNIFICADO
 *   - 1 perfil clínico global por paciente
 *   - Cada profissional vê suas abas (Nutri, Treino, Avaliação)
 * 
 * PRINCÍPIO 8 — STATUS É LEI
 *   - Status controla: acesso, botões, automações, notificações, ranking, IA
 *   - Nunca: paciente ACTIVE sem acesso ou INVITED com dashboard liberado
 * 
 * PRINCÍPIO 9 — SISTEMA À PROVA DE USUÁRIO
 *   - Usuário vai errar email, duplicar, clicar 5x, importar errado
 *   - Sistema deve prevenir antes de quebrar
 * 
 * PRINCÍPIO 10 — EXPERIÊNCIA PREMIUM
 *   - Instantâneo, inteligente, confiável, organizado, clínico, tecnológico
 *   - "Esse software pensa por mim"
 */

// ─── CRITICAL ACTION TYPES ──────────────────────────────────────────────────

export type CriticalAction = 
  | "confirm_payment"
  | "release_onboarding"
  | "publish_plan"
  | "activate_patient"
  | "accept_professional_link"
  | "reset_password"
  | "deactivate_patient";

// ─── IDEMPOTENCY GUARD ──────────────────────────────────────────────────────

const activeActions = new Map<string, number>();
const ACTION_COOLDOWN_MS = 2000;

/**
 * Prevents duplicate clicks on critical actions.
 * Returns true if the action is allowed, false if it's a duplicate.
 */
export function acquireActionLock(action: CriticalAction, entityId: string): boolean {
  const key = `${action}:${entityId}`;
  const now = Date.now();
  const lastExecution = activeActions.get(key);
  
  if (lastExecution && now - lastExecution < ACTION_COOLDOWN_MS) {
    console.warn(`[Bible] Action "${action}" for "${entityId}" blocked — cooldown active`);
    return false;
  }
  
  activeActions.set(key, now);
  return true;
}

/**
 * Releases the action lock (call on error to allow retry).
 */
export function releaseActionLock(action: CriticalAction, entityId: string): void {
  activeActions.delete(`${action}:${entityId}`);
}

// ─── JOURNEY STATUS PROGRESSION ─────────────────────────────────────────────

export const JOURNEY_PROGRESSION = [
  "invited",
  "awaiting_payment",
  "onboarding_active",
  "onboarding_completed",
  "draft_ready_for_review",
  "plan_published",
  "active_followup",
] as const;

/**
 * Check if a status is at or past a given checkpoint.
 */
export function isAtOrPast(currentStatus: string, checkpoint: string): boolean {
  const currentIdx = JOURNEY_PROGRESSION.indexOf(currentStatus as any);
  const checkpointIdx = JOURNEY_PROGRESSION.indexOf(checkpoint as any);
  if (currentIdx === -1 || checkpointIdx === -1) {
    // Legacy "active" maps to active_followup
    if (currentStatus === "active") return true;
    return false;
  }
  return currentIdx >= checkpointIdx;
}

// ─── DEFAULT PASSWORD POLICY ────────────────────────────────────────────────

// SECURITY: hardcoded default password removed. Use generateTemporaryPassword() from src/lib/passwords.ts

// ─── SYSTEM CONSTANTS ───────────────────────────────────────────────────────

export const SYSTEM_VERSION = "1.0.0";
export const BIBLE_VERSION = "1.0.0";
