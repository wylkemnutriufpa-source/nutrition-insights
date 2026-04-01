/**
 * Supabase Error Mapper — Maps database-level errors to user-friendly messages.
 * Centralizes error handling for tenant resolution failures and other DB exceptions.
 */

interface MappedError {
  /** User-facing message (translated, friendly) */
  userMessage: string;
  /** Technical key for logging/tracking */
  errorKey: string;
  /** Whether this is a configuration issue vs user error */
  isSystemError: boolean;
}

const ERROR_MAP: Record<string, MappedError> = {
  TENANT_RESOLUTION_FAILED: {
    userMessage: "Erro de configuração: sua conta não está vinculada a uma clínica ativa. Entre em contato com o suporte.",
    errorKey: "tenant_resolution_failed",
    isSystemError: true,
  },
  EMPTY_PLAN: {
    userMessage: "Não é possível publicar ou aprovar um plano sem refeições. Adicione itens ao plano primeiro.",
    errorKey: "empty_plan",
    isSystemError: false,
  },
  VALIDATION_REQUIRED: {
    userMessage: "O plano precisa ser validado e aprovado pelo Motor Clínico antes de ser publicado.",
    errorKey: "validation_required",
    isSystemError: false,
  },
  PLAN_NOT_FOUND: {
    userMessage: "Plano alimentar não encontrado.",
    errorKey: "plan_not_found",
    isSystemError: false,
  },
  "violates row-level security": {
    userMessage: "Sem permissão para realizar esta ação. Verifique se está logado corretamente.",
    errorKey: "rls_violation",
    isSystemError: false,
  },
  "violates not-null constraint": {
    userMessage: "Dados incompletos. Preencha todos os campos obrigatórios.",
    errorKey: "not_null_violation",
    isSystemError: false,
  },
  "violates foreign key constraint": {
    userMessage: "Referência inválida. O registro vinculado não existe ou foi removido.",
    errorKey: "fk_violation",
    isSystemError: false,
  },
  "duplicate key value violates unique constraint": {
    userMessage: "Este registro já existe. Não é possível criar duplicatas.",
    errorKey: "unique_violation",
    isSystemError: false,
  },
  // Edge Function error codes
  ANAMNESIS_MISSING: {
    userMessage: "Anamnese concluída não encontrada. O paciente precisa preencher a anamnese antes de gerar o plano.",
    errorKey: "anamnesis_missing",
    isSystemError: false,
  },
  ANAMNESIS_QUERY_ERROR: {
    userMessage: "Erro ao buscar dados da anamnese. Tente novamente.",
    errorKey: "anamnesis_query_error",
    isSystemError: true,
  },
  BODY_DATA_MISSING: {
    userMessage: "Peso e altura válidos são obrigatórios para gerar o plano. Verifique a anamnese do paciente.",
    errorKey: "body_data_missing",
    isSystemError: false,
  },
  GOAL_MISSING: {
    userMessage: "Objetivo do paciente não definido. Verifique a anamnese do paciente.",
    errorKey: "goal_missing",
    isSystemError: false,
  },
  PATIENT_ID_MISSING: {
    userMessage: "ID do paciente não informado. Tente novamente.",
    errorKey: "patient_id_missing",
    isSystemError: false,
  },
  TENANT_NOT_FOUND: {
    userMessage: "Erro de configuração: clínica não encontrada. Entre em contato com o suporte.",
    errorKey: "tenant_not_found",
    isSystemError: true,
  },
};

/**
 * Parses a Supabase/Postgres error and returns a user-friendly mapped error if recognized.
 * Returns null if the error is not in our map (caller should use default handling).
 */
export function mapSupabaseError(error: unknown): MappedError | null {
  if (!error) return null;

  const message = typeof error === "object" && error !== null
    ? (error as any).message || (error as any).details || String(error)
    : String(error);

  for (const [key, mapped] of Object.entries(ERROR_MAP)) {
    if (message.includes(key)) {
      console.warn(`[ErrorMapper] Matched known error: ${key}`, { original: message });
      return mapped;
    }
  }

  return null;
}

/**
 * Returns a user-friendly error string from any Supabase error.
 * First checks our known error map, then falls back to the raw message.
 */
export function friendlySupabaseError(error: unknown, fallback = "Ocorreu um erro inesperado. Tente novamente."): string {
  const mapped = mapSupabaseError(error);
  if (mapped) return mapped.userMessage;

  if (typeof error === "object" && error !== null) {
    const msg = (error as any).message;
    if (typeof msg === "string" && msg.length > 0 && msg.length < 200) return msg;
  }

  return fallback;
}
