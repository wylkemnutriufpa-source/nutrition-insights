/**
 * FitJourney Governance Core (V3 Readiness)
 * 
 * Centralized Rules Engine for:
 * - Versioning
 * - System Readiness (Degraded Mode)
 * - Navigation Guards & Redirects
 * - Experience Mode & Workspace Governance
 */

// APP_VERSION removido para evitar lógica de version mismatch auto-healing

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
  hasActivePipeline?: boolean;
  mode: string;
  role: 'patient' | 'professional';
  isReady: boolean;
  isDegraded: boolean;
  isHybrid?: boolean;
  isPatientContext?: boolean;
  isProfessionalContext?: boolean;
  isNutritionist?: boolean;
  isPersonal?: boolean;
  isAdmin?: boolean;
  versionMismatch?: boolean;
  isTransitioning?: boolean;
}

// ── Route Classification ──────────────────────────────────────

export const PUBLIC_ROUTES = [
  "/landing", "/cadastro", "/register", "/auth", "/reset-password", "/confirm", "/p/", "/program/", "/pricing", "/privacy", "/terms"
];

export const ONBOARDING_ALLOWED_ROUTES = [
  "/onboarding", "/onboarding-pipeline", "/consent", "/auth", "/reset-password", "/settings", "/privacy", "/terms", "/support", "/erro-vinculo"
];

const UNIVERSAL_ROUTES = [
  "/", "/settings", "/notifications", "/chat", "/appointments", "/ranking", "/shopping-list", "/ambassador", "/apresentacao", 
  "/checkin-panel", "/checklist", "/feedbacks", "/fitness-anamnesis", "/global-tips", "/health-quiz", "/human-performance", 
  "/library", "/metabolic-twin", "/my-public-profile", "/my-referrals", "/onboarding", "/planner", "/protocolos-fitoterapicos", 
  "/protocols", "/recipe-builder", "/security-dashboard", "/user-guide", "/weekly-goals", "/weekly-report", "/weight-trajectory", 
  "/body-analysis", "/water-calculator", "/weight-calculator", "/hard-fail-linkage", "/consent", "/status"
];

const PROFESSIONAL_ONLY_ROUTES = [
  "/patients", "/diet-templates", "/onboarding-pipeline", "/meal-plans", "/editor-v2", "/meal-plan-editor-v2", "/dieta-v2", 
  "/meal-plan-editor-v3", "/dieta-v3", "/protocols", "/programs", "/clinical", "/clinical-workspace", "/clinical-brain", 
  "/clinical-pipeline", "/team", "/meals", "/recipes", "/financial", "/integrations", "/branding", "/diet-builder", 
  "/food-database", "/workspace", "/operational", "/in-office", "/invite-patient", "/population-intelligence", 
  "/population-nutrition", "/professional-guide", "/professional/crm", "/protocol-transitions", "/therapeutic-intelligence", 
  "/personal", "/store", "/automation", "/campaigns", "/lab-interpreter", "/mission-control", "/technical-sheets", "/admin",
  "/coach", "/cockpit-premium", "/global-ai", "/hybrid-plan-builder", "/intelligence-settings", "/mobile-qa", 
  "/patient-diagnostic", "/patient-overview", "/plan-audit", "/preview-patient"
];

const PATIENT_ONLY_ROUTES = [
  "/my-diet", "/my-workouts", "/body-projection", "/client/dashboard", "/journey", "/achievements", "/challenges", "/checkin", 
  "/workouts", "/meal-plans", "/supplements", "/dieta", "/analyze"
];

const ADMIN_ROUTES = [
  "/admin", "/platform-governance", "/security-dashboard", "/system-diagnostics", "/system-health-live", "/qa-checklist", 
  "/audit-logs", "/clinical-rules"
];

function matchRoute(pathname: string, route: string): boolean {
  if (route === "/") return pathname === "/";
  if (route.endsWith("/")) return pathname.startsWith(route) || pathname === route.slice(0, -1);
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isInList(pathname: string, routes: string[]): boolean {
  return routes.some(r => matchRoute(pathname, r));
}

export function logDecision(decision: SystemDecision) {
  console.info(`[FJ:SystemDecision] [${decision.type}] ${decision.reason}`, decision.metadata || '');
}

/**
 * The Central Source of Truth for all navigation and state decisions.
 */
export function getSystemDecision(ctx: GovernanceContext): SystemDecision {
  if (!ctx) return { type: 'ALLOW', reason: 'Empty context' };
  
  const { pathname = '/', user, profile, isReady, isDegraded, versionMismatch } = ctx;
  const safePathname = typeof pathname === 'string' ? pathname : '/';

  // Regra de Versioning removida para garantir estabilidade por previsibilidade.


  // 2. Degraded Mode Rule
  if (isDegraded && !safePathname.startsWith('/auth')) {
    return { type: 'BLOCK', reason: 'System in degraded mode', target: '/status' };
  }

  // 3. Public Path Access
  if (isInList(safePathname, PUBLIC_ROUTES)) {
    return { type: 'ALLOW', reason: 'Public path access' };
  }

  // 4. Auth Guard
  const isUniversal = isInList(safePathname, UNIVERSAL_ROUTES);
  if (!user && !isUniversal) {
    return { type: 'REDIRECT', target: '/auth', reason: 'Unauthorized access' };
  }

  if (!user) return { type: 'ALLOW', reason: 'Public allowed' };

  // 5. Hard Fail Guard: Profile Consistency (Critical)
  if (isReady && !isInList(safePathname, PUBLIC_ROUTES) && !isInList(safePathname, ONBOARDING_ALLOWED_ROUTES) && safePathname !== '/welcome') {
    const isPro = ctx.isAdmin || ctx.isNutritionist || ctx.isPersonal;
    
    // Se não tem tenant, bloqueia ou redireciona para reconciliação
    if (!profile?.tenant_id) {
      if (isPro) {
        // Profissionais sem tenant vão para o Welcome para auto-reconciliação
        return { 
          type: 'REDIRECT', 
          reason: 'Professional missing tenant, redirecting to reconciliation', 
          target: '/welcome' 
        };
      } else {
        // Pacientes sem tenant vão para o Hard Fail (não têm como se auto-resolver)
        return { 
          type: 'BLOCK', 
          reason: 'Critical: Patient missing tenant linkage', 
          target: '/hard-fail-linkage' 
        };
      }
    }
  }

  // 6. Profile Readiness (Orphan)
  if (profile?.is_orphan && !isInList(safePathname, ["/settings", "/auth"])) {
    return { type: 'REDIRECT', target: '/settings', reason: 'Orphan user profile incomplete' };
  }

  // 6. Role & Workspace Governance
  const isProRole = ctx.isNutritionist || ctx.isPersonal || ctx.isAdmin;

  // Admin access
  if (isInList(safePathname, ADMIN_ROUTES) && !ctx.isAdmin && !ctx.isNutritionist) {
    return { type: 'REDIRECT', target: '/', reason: 'Non-admin accessing admin route' };
  }

  // Hybrid Context check
  if (ctx.isHybrid) {
    // Nutritionists and Admins have more freedom even in patient context
    const isPro = ctx.isNutritionist || ctx.isAdmin;
    
    if (ctx.isPatientContext && isInList(safePathname, PROFESSIONAL_ONLY_ROUTES) && !isPro) {
      return { type: 'REDIRECT', target: '/', reason: 'Patient context accessing pro route' };
    }
    if (ctx.isProfessionalContext && isInList(safePathname, PATIENT_ONLY_ROUTES)) {
      // Exception for onboarding and health professionals viewing patient data
      const isOnboarding = ['onboarding_active', 'lead_created', 'awaiting_consent'].includes(ctx.journeyStatus || '');
      if (isOnboarding && safePathname.startsWith('/anamnesis')) return { type: 'ALLOW', reason: 'Onboarding override' };
      
      // Allow professionals to see patient routes if they are also patients OR if it's a shared route
      if (!ctx.profile?.is_patient && !isPro) {
        return { type: 'REDIRECT', target: '/', reason: 'Pro context accessing patient route' };
      }
    }
  } else {
    // Pure Role Check
    if (ctx.role === 'patient' && !isProRole && isInList(safePathname, PROFESSIONAL_ONLY_ROUTES)) {
      return { type: 'REDIRECT', target: '/', reason: 'Patient role accessing pro route' };
    }
    if (ctx.role === 'professional' && !ctx.profile?.is_patient && !isProRole && isInList(safePathname, PATIENT_ONLY_ROUTES)) {
      return { type: 'REDIRECT', target: '/', reason: 'Pro role accessing patient route' };
    }
  }

  // 7. Deterministic Patient State Governance (V5)
  if (ctx.role === 'patient') {
    const state = ctx.journeyStatus;
    
    // Redirect chain based on Single Source of Truth
    switch (state) {
      case 'onboarding_slides':
        if (!matchRoute(safePathname, '/onboarding/paciente')) {
          return { type: 'REDIRECT', target: '/onboarding/paciente', reason: 'Enforcing slides step' };
        }
        break;
      case 'anamnesis':
        if (!matchRoute(safePathname, '/anamnesis')) {
          return { type: 'REDIRECT', target: '/anamnesis', reason: 'Enforcing anamnesis step' };
        }
        break;
      case 'collecting_profile':
        if (!matchRoute(safePathname, '/body-analysis')) {
          return { type: 'REDIRECT', target: '/body-analysis', reason: 'Enforcing profile step' };
        }
        break;
      case 'ready_for_plan':
      case 'plan_generated':
      case 'active_plan':
        const isDashboardPath = safePathname === '/' || safePathname === '/client/dashboard' || safePathname === '/my-diet' || safePathname.startsWith('/patient/plan');
        if (!isDashboardPath) {
          return { type: 'REDIRECT', target: '/client/dashboard', reason: 'Accessing dashboard context' };
        }
        break;
      default:
        // No valid state, but role is patient - likely new user
        if (!matchRoute(safePathname, '/onboarding/paciente')) {
          return { type: 'REDIRECT', target: '/onboarding/paciente', reason: 'Missing patient state' };
        }
    }
  }

  return { type: 'ALLOW', reason: 'Rule chain completed' };
}
