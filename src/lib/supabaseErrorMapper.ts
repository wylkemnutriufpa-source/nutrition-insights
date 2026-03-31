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
