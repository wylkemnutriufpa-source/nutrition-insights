/**
 * FitJourney Governance - Versão Mínima Segura
 * 
 * Centraliza apenas Auth e Acesso Básico.
 * Bloqueios de onboarding e estados complexos permanecem desativados.
 */

export type SystemDecisionType = 'ALLOW' | 'REDIRECT' | 'BLOCK' | 'RELOAD';

export interface SystemDecision {
  type: SystemDecisionType;
  target?: string;
  reason: string;
  metadata?: Record<string, any>;
}

export interface GovernanceContext {
  pathname: string;
  user: any | null;
  profile: any | null;
  journeyStatus: string | null;
  anamnesisStatus?: 'pending' | 'completed' | null;
  hasConsent?: boolean;
  mode: string;
  role: 'patient' | 'professional';
  isReady: boolean;
  isDegraded: boolean;
  isNutritionist?: boolean;
  isPersonal?: boolean;
  isAdmin?: boolean;
  isTransitioning?: boolean;
  isHybrid?: boolean; // Mantido para compatibilidade com outros componentes
  versionMismatch?: boolean; // Mantido para compatibilidade com outros componentes
}

export const PUBLIC_ROUTES = [
  "/landing", "/cadastro", "/register", "/auth", "/reset-password", "/confirm", "/p/", "/program/", "/pricing", "/privacy", "/terms"
];

function matchRoute(pathname: string, route: string): boolean {
  if (route === "/") return pathname === "/";
  if (route.endsWith("/")) return pathname.startsWith(route) || pathname === route.slice(0, -1);
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isInList(pathname: string, routes: string[]): boolean {
  return routes.some(r => matchRoute(pathname, r));
}

export function logDecision(decision: SystemDecision, context?: GovernanceContext) {
  const color = decision.type === 'ALLOW' ? 'color: #10b981' : decision.type === 'REDIRECT' ? 'color: #f59e0b' : 'color: #ef4444';
  console.groupCollapsed(`%c[FJ:Governance] [${decision.type}] ${decision.reason}`, color);
  if (context) console.log("Context:", context);
  if (decision.target) console.log("Target:", decision.target);
  console.groupEnd();
}

/**
 * GOVERNANÇA MÍNIMA:
 * 1. Se não autenticado e rota privada -> Login
 * 2. Caso contrário -> Permitir (Acesso Livre)
 */
export function getSystemDecision(ctx: GovernanceContext): SystemDecision {
  const { pathname = '/', user } = ctx;
  const safePathname = typeof pathname === 'string' ? pathname : '/';

  // 1. Rotas Públicas sempre permitidas
  if (isInList(safePathname, PUBLIC_ROUTES)) {
    return { type: 'ALLOW', reason: 'Public route' };
  }

  // 2. Se não tem usuário e não é pública -> Login
  if (!user) {
    return { type: 'REDIRECT', target: '/auth', reason: 'Unauthenticated user on private route' };
  }

  // 3. Todo o resto é permitido (Bypass de onboarding e estados complexos)
  return { type: 'ALLOW', reason: 'Auth verified: Minimal access granted' };
}
