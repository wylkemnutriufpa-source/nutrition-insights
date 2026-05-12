/**
 * Plan Load Error Classifier
 * ----------------------------------------------------------------
 * Classifica falhas de carregamento de planos em três categorias —
 * REDE, PERMISSÃO ou BACKEND — para que a UI exiba mensagens e
 * ações de retry específicas. Usado pelo painel de planos
 * (`MealPlans.tsx`) e pelo workspace (`WorkspaceMealPlans.tsx`).
 */

export type PlanLoadErrorKind = "network" | "permission" | "backend" | "unknown";

export interface ClassifiedPlanLoadError {
  kind: PlanLoadErrorKind;
  /** Mensagem curta (título). */
  title: string;
  /** Detalhe amigável para o usuário. */
  description: string;
  /** Texto do botão de retry. */
  retryLabel: string;
  /** Mensagem técnica original (para diagnóstico). */
  technicalMessage: string;
}

export function classifyPlanLoadError(error: unknown): ClassifiedPlanLoadError {
  const msg = extractMessage(error).toLowerCase();
  const code = extractCode(error).toLowerCase();

  // Network — offline, fetch failed, timeout
  if (
    !navigator?.onLine ||
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("networkerror") ||
    msg.includes("timeout") ||
    msg.includes("aborted")
  ) {
    return {
      kind: "network",
      title: "Sem conexão com o servidor",
      description:
        "Não conseguimos contatar o servidor. Verifique sua internet e tente novamente em alguns instantes.",
      retryLabel: "Tentar reconectar",
      technicalMessage: extractMessage(error),
    };
  }

  // Permission — RLS, 401, 403, JWT
  if (
    code === "42501" ||
    code === "pgrst301" ||
    code === "pgrst116" ||
    msg.includes("permission denied") ||
    msg.includes("rls") ||
    msg.includes("row-level security") ||
    msg.includes("jwt") ||
    msg.includes("not authenticated") ||
    msg.includes("forbidden") ||
    msg.includes("unauthorized")
  ) {
    return {
      kind: "permission",
      title: "Sem permissão para visualizar os planos",
      description:
        "Sua sessão pode ter expirado ou seu perfil não tem acesso a esses planos. Saia e entre novamente.",
      retryLabel: "Recarregar sessão",
      technicalMessage: extractMessage(error),
    };
  }

  // Backend — 5xx, schema, postgrest internal errors
  if (
    code.startsWith("5") ||
    code === "23503" ||
    code === "42p01" ||
    code === "42703" ||
    msg.includes("internal server error") ||
    msg.includes("does not exist") ||
    msg.includes("schema") ||
    msg.includes("relation") ||
    msg.includes("function")
  ) {
    return {
      kind: "backend",
      title: "Erro do servidor ao buscar planos",
      description:
        "O servidor respondeu com um erro inesperado. Já registramos o problema; tente novamente em instantes.",
      retryLabel: "Tentar novamente",
      technicalMessage: extractMessage(error),
    };
  }

  return {
    kind: "unknown",
    title: "Não conseguimos carregar seus planos",
    description: extractMessage(error) || "Erro desconhecido ao carregar planos.",
    retryLabel: "Tentar novamente",
    technicalMessage: extractMessage(error),
  };
}

function extractMessage(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const anyErr = err as any;
    return anyErr.message || anyErr.error_description || anyErr.error || JSON.stringify(err);
  }
  return String(err);
}

function extractCode(err: unknown): string {
  if (err && typeof err === "object") {
    const anyErr = err as any;
    return String(anyErr.code || anyErr.status || "");
  }
  return "";
}
