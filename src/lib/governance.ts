/**
 * FitJourney Governance Core (V3 Readiness)
 * 
 * Centralized Rules Engine for:
 * - Versioning
 * - System Readiness (Degraded Mode)
 * - Navigation Guards & Redirects
 * - Experience Mode & Workspace Governance
 */

import { APP_VERSION } from "./versionCheck";

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
}

// ── Route Classification ──────────────────────────────────────

export const PUBLIC_ROUTES = [
  "/landing", "/cadastro", "/register", "/auth", "/reset-password", "/confirm", "/p/", "/program/", "/pricing", "/politica-de-privacidade", "/termos-de-uso"
];

export const ONBOARDING_ALLOWED_ROUTES = [
  "/onboarding", "/onboarding-pipeline", "/consent", "/auth", "/reset-password", "/settings", "/privacy-policy", "/termos-de-uso", "/support", "/erro-vinculo"
];

const UNIVERSAL_ROUTES = [
  "/", "/settings", "/notifications", "/chat", "/appointments", "/ranking"
];

const PROFESSIONAL_ONLY_ROUTES = [
  "/patients", "/diet-templates", "/onboarding-pipeline", "/meal-plans", "/editor-v2", "/protocols", "/programs", "/clinical-workspace", "/clinical-brain", "/clinical-pipeline", "/team"
];

const PATIENT_ONLY_ROUTES = [
  "/my-diet", "/my-workouts", "/body-projection", "/client/dashboard", "/checklist", "/anamnesis", "/onboarding", "/checkin", "/consent"
];

const ADMIN_ROUTES = [
  "/admin", "/platform-governance", "/security-dashboard", "/system-diagnostics", "/system-health-live"
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
  const { pathname, user, profile, isReady, isDegraded, versionMismatch } = ctx;

  // 1. Versioning Rule (Critical)
  if (versionMismatch && isReady) {
    return { type: 'RELOAD', reason: 'Version mismatch detected', metadata: { local: APP_VERSION } };
  }

  // 2. Degraded Mode Rule
  if (isDegraded && !pathname.startsWith('/auth')) {
    return { type: 'BLOCK', reason: 'System in degraded mode', target: '/diagnostic' };
  }

  // 3. Public Path Access
  if (isInList(pathname, PUBLIC_ROUTES)) {
    return { type: 'ALLOW', reason: 'Public path access' };
  }

  // 4. Auth Guard
  if (!user && !isInList(pathname, UNIVERSAL_ROUTES)) {
    return { type: 'REDIRECT', target: '/auth', reason: 'Unauthorized access' };
  }

  if (!user) return { type: 'ALLOW', reason: 'Public allowed' };

  // 5. Profile Readiness
  if (profile?.is_orphan && !isInList(pathname, ["/settings", "/auth"])) {
    return { type: 'REDIRECT', target: '/settings', reason: 'Orphan user profile incomplete' };
  }

  // 6. Role & Workspace Governance
  const isProRole = ctx.isNutritionist || ctx.isPersonal || ctx.isAdmin;

  // Admin access
  if (isInList(pathname, ADMIN_ROUTES) && !ctx.isAdmin) {
    return { type: 'REDIRECT', target: '/', reason: 'Non-admin accessing admin route' };
  }

  // Hybrid Context check
  if (ctx.isHybrid) {
    if (ctx.isPatientContext && isInList(pathname, PROFESSIONAL_ONLY_ROUTES)) {
      return { type: 'REDIRECT', target: '/', reason: 'Patient context accessing pro route' };
    }
    if (ctx.isProfessionalContext && isInList(pathname, PATIENT_ONLY_ROUTES)) {
      // Exception for onboarding
      const isOnboarding = ['onboarding_active', 'lead_created', 'awaiting_consent'].includes(ctx.journeyStatus || '');
      if (isOnboarding && pathname.startsWith('/anamnesis')) return { type: 'ALLOW', reason: 'Onboarding override' };
      
      return { type: 'REDIRECT', target: '/', reason: 'Pro context accessing patient route' };
    }
  } else {
    // Pure Role Check
    if (ctx.role === 'patient' && !isProRole && isInList(pathname, PROFESSIONAL_ONLY_ROUTES)) {
      return { type: 'REDIRECT', target: '/', reason: 'Patient role accessing pro route' };
    }
    if (ctx.role === 'professional' && !ctx.profile?.is_patient && isInList(pathname, PATIENT_ONLY_ROUTES)) {
      return { type: 'REDIRECT', target: '/', reason: 'Pro role accessing patient route' };
    }
  }

  // 7. Patient Journey Specifics
  if (ctx.role === 'patient') {
    const isOnboarding = ['onboarding_active', 'lead_created', 'awaiting_consent'].includes(ctx.journeyStatus || '');
    if (isOnboarding && pathname.startsWith('/anamnesis')) {
      return { type: 'ALLOW', reason: 'Onboarding anamnesis override' };
    }

    if (isOnboarding && !pathname.startsWith('/onboarding') && !pathname.startsWith('/consent') && !isInList(pathname, UNIVERSAL_ROUTES)) {
      const target = ctx.journeyStatus === 'onboarding_active' ? '/onboarding' : '/consent';
      return { type: 'REDIRECT', target, reason: 'Enforcing patient onboarding' };
    }
  }

  return { type: 'ALLOW', reason: 'Rule chain completed' };
}
