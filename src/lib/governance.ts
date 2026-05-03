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
  hasConsent?: boolean;
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

/**
 * resolveRoute — Single Source of Truth for patient flow navigation.
 *
 * Returns the ONE route the patient is currently allowed to be on,
 * given their state. Components must NEVER decide their own redirects.
 *
 * Order is deterministic and exhaustive: every patient state maps to
 * exactly one canonical route. No exceptions, no bypasses.
 */
export type PatientFlowState =
  | 'awaiting_consent'
  | 'onboarding_slides'
  | 'anamnesis'
  | 'collecting_profile'
  | 'ready_for_plan'
  | 'plan_generated'
  | 'active_plan';

export function resolveRoute(state: PatientFlowState | string | null | undefined): string {
  switch (state) {
    case 'awaiting_consent':
      return '/consent';
    case 'onboarding_slides':
      return '/onboarding/paciente';
    case 'anamnesis':
      return '/anamnesis';
    case 'collecting_profile':
      return '/body-analysis';
    case 'ready_for_plan':
    case 'plan_generated':
    case 'active_plan':
      return '/client/dashboard';
    default:
      // Unknown / null state: send to slides so the user gets a deterministic entry.
      return '/onboarding/paciente';
  }
}

/**
 * Routes that belong to the canonical patient flow (one per state).
 * Used to detect "is the patient on their assigned step?" without ad-hoc bypasses.
 */
const PATIENT_FLOW_ROUTES = new Set<string>([
  '/consent',
  '/onboarding',
  '/onboarding/paciente',
  '/anamnesis',
  '/body-analysis',
  '/client/dashboard',
  '/my-diet',
  '/',
]);

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

export function logDecision(decision: SystemDecision, context?: GovernanceContext) {
  const color = decision.type === 'ALLOW' ? 'color: #10b981' : decision.type === 'REDIRECT' ? 'color: #f59e0b' : 'color: #ef4444';
  console.groupCollapsed(`%c[FJ:Governance] [${decision.type}] ${decision.reason}`, color);
  if (context) console.log("Context:", context);
  if (decision.target) console.log("Target:", decision.target);
  if (decision.metadata) console.log("Metadata:", decision.metadata);
  console.groupEnd();
}

/**
 * The Central Source of Truth for all navigation and state decisions.
 */
export function getSystemDecision(ctx: GovernanceContext): SystemDecision {
  if (!ctx) return { type: 'ALLOW', reason: 'Empty context' };
  
  const { pathname = '/', user, profile, isReady, isDegraded, versionMismatch, isTransitioning } = ctx;
  const safePathname = typeof pathname === 'string' ? pathname : '/';

  // 1. Transition Guard (Critical SSOT)
  if (isTransitioning) {
    return { type: 'ALLOW', reason: 'System is transitioning state' };
  }

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
    
    // Safety Bypass: Always allow onboarding-specific and universal utility routes
    // This prevents loops where Anamnesis redirects to Consent but Governance redirects back to Anamnesis.
    if (isInList(safePathname, ONBOARDING_ALLOWED_ROUTES) || isInList(safePathname, UNIVERSAL_ROUTES)) {
      return { type: 'ALLOW', reason: 'Bypassing state enforcement for allowed route' };
    }

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
