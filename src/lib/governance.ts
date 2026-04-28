/**
 * FitJourney Governance Core (V3 Readiness)
 * 
 * Centralized Rules Engine for:
 * - Versioning
 * - System Readiness (Degraded Mode)
 * - Navigation Guards & Redirects
 * - Experience Mode Governance
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
  versionMismatch?: boolean;
}

export function logDecision(decision: SystemDecision) {
  console.info(`[FJ:SystemDecision] [${decision.type}] ${decision.reason}`, decision.metadata || '');
}

/**
 * The Central Source of Truth for all navigation and state decisions.
 * Consolidates rules from auth, journey, and experience modes.
 */
export function getSystemDecision(ctx: GovernanceContext): SystemDecision {
  // 1. Versioning Rule (Critical)
  if (ctx.versionMismatch && ctx.isReady) {
    return { type: 'RELOAD', reason: 'Version mismatch detected', metadata: { local: APP_VERSION } };
  }

  // 2. Degraded Mode Rule
  if (ctx.isDegraded && !ctx.pathname.startsWith('/auth')) {
    return { type: 'BLOCK', reason: 'System in degraded mode', target: '/diagnostic' };
  }

  // 3. Auth Guard
  if (!ctx.user && !['/auth', '/', '/cadastro', '/confirm'].some(p => ctx.pathname.startsWith(p))) {
    return { type: 'REDIRECT', target: '/auth', reason: 'Unauthorized access attempt' };
  }

  if (!ctx.user) return { type: 'ALLOW', reason: 'Public access allowed' };

  // 4. Orphan/Profile Guard
  if (ctx.profile?.is_orphan && !['/settings', '/auth', '/help'].some(p => ctx.pathname.startsWith(p))) {
    return { type: 'REDIRECT', target: '/settings', reason: 'Orphan user - missing profile data' };
  }

  // 5. Patient Journey Guard
  if (ctx.role === 'patient') {
    const isPublicPath = ['/', '/auth', '/settings'].some(p => ctx.pathname.startsWith(p));
    if (isPublicPath) return { type: 'ALLOW', reason: 'Public patient path' };

    // Onboarding Loop Protection
    const isOnboarding = ['lead_created', 'awaiting_consent', 'onboarding_active'].includes(ctx.journeyStatus || '');
    if (isOnboarding && ctx.pathname.startsWith('/anamnesis')) {
      return { type: 'ALLOW', reason: 'Onboarding override for anamnesis' };
    }

    if (isOnboarding && !ctx.pathname.startsWith('/onboarding') && !ctx.pathname.startsWith('/consent')) {
      const target = ctx.journeyStatus === 'onboarding_active' ? '/onboarding' : '/consent';
      return { type: 'REDIRECT', target, reason: 'Enforcing onboarding flow' };
    }
    
    if (ctx.journeyStatus === 'no_link' && !ctx.pathname.startsWith('/help')) {
      return { type: 'BLOCK', reason: 'Patient without clinical link' };
    }
  }

  // 6. Professional / Admin Guard
  if (ctx.role === 'professional' && ctx.pathname.startsWith('/client/dashboard')) {
    return { type: 'REDIRECT', target: '/', reason: 'Professional attempted to access patient dashboard' };
  }

  return { type: 'ALLOW', reason: 'Default allow' };
}
