/**
 * Session Context Persistence
 * Salva a rota e contexto do usuário para restaurar quando voltar ao app
 * (ex: após chamada telefônica, troca de app, etc.)
 */

const SESSION_KEY = "fitjourney_session_context";
const INACTIVITY_THRESHOLD = 30_000; // 30s — considera "saiu" após 30s inativo

export interface SessionContext {
  route: string;
  routeLabel: string;
  timestamp: number;
  userId?: string;
}

// Mapa de rotas para labels amigáveis em pt-BR
const ROUTE_LABELS: Record<string, string> = {
  "/": "Início",
  "/meals": "Refeições",
  "/achievements": "Conquistas",
  "/challenges": "Desafios",
  "/checklist": "Checklist Diário",
  "/journey": "Minha Jornada",
  "/anamnesis": "Anamnese",
  "/settings": "Configurações",
  "/notifications": "Notificações",
  "/chat": "Chat",
  "/recipes": "Receitas",
  "/shopping-list": "Lista de Compras",
  "/supplements": "Suplementos",
  "/weekly-goals": "Metas Semanais",
  "/weekly-report": "Relatório Semanal",
  "/checkin": "Check-in",
  "/body-analysis": "Análise Corporal",
  "/physical-assessment": "Avaliação Física",
  "/feedbacks": "Feedbacks",
  "/analyze-meal": "Análise de Refeição",
  "/patient-meal-plan": "Meu Plano Alimentar",
  "/patients": "Pacientes",
  "/meal-plans": "Planos Alimentares",
  "/protocols": "Protocolos",
  "/programs": "Programas",
  "/reports": "Relatórios",
  "/appointments": "Consultas",
  "/clinical-intelligence": "Inteligência Clínica",
  "/automation-center": "Automações",
  "/financial": "Financeiro",
  "/clinical-workspace": "Workspace",
  "/onboarding-pipeline": "Pipeline",
  "/curiosidades": "Curiosidades",
  "/planner": "Planejador",
  "/workouts": "Treinos",
  "/patient-intelligence": "Inteligência FitJourney",
  "/intelligence-settings": "Inteligência FitJourney",
};

function getRouteLabel(route: string): string {
  // Exact match first
  if (ROUTE_LABELS[route]) return ROUTE_LABELS[route];
  
  // Try base path
  const base = "/" + route.split("/").filter(Boolean)[0];
  if (ROUTE_LABELS[base]) return ROUTE_LABELS[base];
  
  // Dynamic routes
  if (route.startsWith("/patients/")) return "Detalhe do Paciente";
  if (route.startsWith("/meal-plans/")) return "Editor de Plano";
  if (route.startsWith("/programs/")) return "Detalhe do Programa";
  
  return "Página";
}

export function saveSessionContext(route: string, userId?: string) {
  // Ignorar rotas que não fazem sentido restaurar
  const ignoreRoutes = ["/auth", "/landing", "/consent", "/payment-required", "/reset-password"];
  if (ignoreRoutes.some(r => route.startsWith(r))) return;
  
  const ctx: SessionContext = {
    route,
    routeLabel: getRouteLabel(route),
    timestamp: Date.now(),
    userId,
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(ctx));
  } catch {}
}

export function getSessionContext(): SessionContext | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionContext;
  } catch {
    return null;
  }
}

export function clearSessionContext() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

/**
 * Verifica se o usuário "saiu" (ficou inativo por mais de INACTIVITY_THRESHOLD)
 * e voltou em uma rota diferente da que estava.
 */
export function checkShouldRestore(currentRoute: string, userId?: string): SessionContext | null {
  const ctx = getSessionContext();
  if (!ctx) return null;
  
  // Deve ser o mesmo usuário
  if (ctx.userId && userId && ctx.userId !== userId) {
    clearSessionContext();
    return null;
  }
  
  // Se está na mesma rota, não precisa restaurar
  if (ctx.route === currentRoute) return null;
  
  // Se saiu há menos de INACTIVITY_THRESHOLD, é navegação normal
  const elapsed = Date.now() - ctx.timestamp;
  if (elapsed < INACTIVITY_THRESHOLD) return null;
  
  // Saiu há mais de 30s e voltou em rota diferente → oferecer restauração
  return ctx;
}
