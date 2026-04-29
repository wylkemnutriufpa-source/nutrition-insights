/**
 * FitJourney — Self-Healing Layer (BLOCO 6)
 * 
 * Mecanismos de autocorreção para degradação elegante.
 * O sistema deve degradar com elegância, nunca quebrar.
 */

import { logWarn } from "@/lib/monitoring";
import { safeString, safeArray } from "@/lib/safeguards";
import { normalizeLifecycleStatus } from "@/lib/compatibilityGuard";

// ========== Route Recovery ==========

const isDev = process.env.NODE_ENV === "development";

/** Map of old/broken routes → correct routes */
const ROUTE_REDIRECTS: Record<string, string> = {
  "/home": "/dashboard",
  "/index": "/dashboard",
  "/meus-planos": "/meals",
  "/planos": "/meal-plans",
  "/plano": "/meal-plans",
  "/receita": "/recipes",
  "/configuracoes": "/settings",
  "/config": "/settings",
  "/perfil": "/settings",
  "/profile": "/settings",
  "/paciente": "/patients",
  "/nutricionista": "/dashboard",
  "/admin": "/admin/dashboard",
  "/whatsapp": "/settings/whatsapp",
  "/anamnese": "/anamnesis",
  "/avaliacao": "/physical-assessment",
  "/consultas": "/appointments",
  "/agenda": "/appointments",
  "/mensagens": "/chat",
  "/check-in": "/checklist",
  "/protocolo": "/protocols",
  "/programa": "/programs",
  "/financeiro": "/financial",
  "/relatorios": "/reports",
  "/suplemento": "/supplements",
  "/alimentacao": "/meals",
};

/** Resolve a potentially broken/legacy route to the correct one */
export function resolveRoute(path: string): string | null {
  const normalized = path.toLowerCase().replace(/\/+$/, "");
  const redirect = ROUTE_REDIRECTS[normalized];
  
  if (redirect) {
    if (isDev) {
      console.warn("[SELF-HEALING DESATIVADO] Rota não encontrada (redirecionamento interceptado):", path);
      return null;
    }
    logWarn("SelfHealing:Route", `Rota "${path}" redirecionada para "${redirect}"`);
    return redirect;
  }
  return null;
}

// ========== Notification Target Recovery ==========

/** Map notification types to valid routes */
const NOTIFICATION_ROUTES: Record<string, string> = {
  new_patient: "/patients",
  new_message: "/chat",
  new_checkin: "/patients",
  plan_published: "/meals",
  plan_updated: "/meals",
  appointment: "/appointments",
  payment: "/financial",
  onboarding: "/onboarding",
  alert: "/notifications",
  clinical_alert: "/patients",
  achievement: "/achievements",
  challenge: "/challenges",
  feedback: "/feedbacks",
  whatsapp: "/settings/whatsapp",
};

/** Get safe navigation target for a notification */
export function resolveNotificationTarget(
  type: string | null | undefined,
  targetUrl: string | null | undefined
): string {
  // If we have a valid target URL, use it
  if (targetUrl && typeof targetUrl === "string" && targetUrl.startsWith("/")) {
    // Validate the route exists or has a redirect
    const redirect = resolveRoute(targetUrl);
    return redirect || targetUrl;
  }

  // Resolve by notification type
  const route = NOTIFICATION_ROUTES[safeString(type, "alert")];
  if (route) return route;

  // Fallback: notifications center
  logWarn("SelfHealing:Notification", `Tipo "${type}" sem target, abrindo notificações`);
  return "/notifications";
}

// ========== Recipe Data Recovery ==========

interface SafeRecipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  description: string;
}

/** Normalize recipe data from any format (legacy or new) */
export function normalizeRecipeData(raw: unknown): SafeRecipe {
  if (!raw || typeof raw !== "object") {
    return { title: "Receita", ingredients: [], instructions: [], description: "" };
  }

  const obj = raw as Record<string, unknown>;

  // Normalize ingredients (can be string[], object[], or string)
  const rawIngredients = obj.ingredients ?? obj.ingredientes ?? [];
  const ingredients = safeArray(rawIngredients).map((item: unknown) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      const i = item as Record<string, unknown>;
      const parts = [
        safeString(i.quantidade ?? i.quantity ?? i.amount, ""),
        safeString(i.unidade ?? i.unit, ""),
        safeString(i.nome ?? i.name ?? i.ingredient, ""),
      ].filter(Boolean);
      return parts.join(" ") || "Ingrediente";
    }
    return String(item);
  });

  // Normalize instructions (can be string[], object[], or string)
  const rawInstructions = obj.instructions ?? obj.instrucoes ?? obj.steps ?? [];
  const instructions = safeArray(rawInstructions).map((item: unknown) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      const i = item as Record<string, unknown>;
      return safeString(i.text ?? i.step ?? i.instruction ?? i.descricao, "Passo");
    }
    return String(item);
  });

  return {
    title: safeString(obj.title ?? obj.titulo ?? obj.name ?? obj.nome, "Receita"),
    ingredients,
    instructions,
    description: safeString(obj.description ?? obj.descricao ?? obj.summary, ""),
  };
}

// ========== Status Recovery ==========

/** Normalize any patient status to a valid lifecycle state */
export { normalizeLifecycleStatus } from "@/lib/compatibilityGuard";

/** Normalize meal plan status */
export function normalizePlanStatus(raw: unknown): string {
  const STATUS_MAP: Record<string, string> = {
    "draft": "draft",
    "rascunho": "draft",
    "published": "published",
    "publicado": "published",
    "archived": "archived",
    "arquivado": "archived",
    "active": "published",
    "inactive": "archived",
  };
  const s = safeString(raw, "draft").toLowerCase().trim();
  const mapped = STATUS_MAP[s];
  if (!mapped) {
    logWarn("SelfHealing:PlanStatus", `Status desconhecido: "${s}"`);
    return "draft";
  }
  return mapped;
}

// ========== External Integration Recovery ==========

/** Queue a failed integration action for retry instead of crashing */
const FAILED_QUEUE_KEY = "fj_failed_integrations";

interface FailedAction {
  type: string;
  payload: Record<string, unknown>;
  failedAt: string;
  retryCount: number;
}

export function enqueueFailedAction(type: string, payload: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(FAILED_QUEUE_KEY);
    const queue: FailedAction[] = raw ? JSON.parse(raw) : [];
    queue.push({
      type,
      payload,
      failedAt: new Date().toISOString(),
      retryCount: 0,
    });
    // Keep max 50 items
    if (queue.length > 50) queue.splice(0, queue.length - 50);
    localStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(queue));
    logWarn("SelfHealing:Queue", `Ação "${type}" enfileirada para retry`);
  } catch { /* storage full */ }
}

export function getFailedActions(): FailedAction[] {
  try {
    const raw = localStorage.getItem(FAILED_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearFailedActions() {
  try { localStorage.removeItem(FAILED_QUEUE_KEY); } catch { /* ignore */ }
}

// ========== Edge Function Recovery ==========

/** Call an edge function with self-healing: retry + graceful fallback */
export async function safeEdgeFunctionCall<T>(
  functionName: string,
  payload: Record<string, unknown>,
  fallback: T,
  options?: { retries?: number; timeoutMs?: number }
): Promise<{ data: T; fromFallback: boolean }> {
  const { retries = 2, timeoutMs = 15000 } = options ?? {};
  const { supabase } = await import("@/integrations/supabase/client");

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
      });

      clearTimeout(timer);

      if (error) {
        logWarn("SelfHealing:EdgeFn", `${functionName} tentativa ${attempt + 1} falhou: ${error.message}`);
        if (attempt === retries) {
          enqueueFailedAction(`edge:${functionName}`, payload);
          return { data: fallback, fromFallback: true };
        }
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      return { data: data as T, fromFallback: false };
    } catch (err) {
      logWarn("SelfHealing:EdgeFn", `${functionName} exceção na tentativa ${attempt + 1}`);
      if (attempt === retries) {
        enqueueFailedAction(`edge:${functionName}`, payload);
        return { data: fallback, fromFallback: true };
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  return { data: fallback, fromFallback: true };
}
