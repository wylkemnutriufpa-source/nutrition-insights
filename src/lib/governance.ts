/**
 * FitJourney Governance Core (V3 Readiness)
 * 
 * Centralized Rules Engine for:
 * - Versioning
 * - System Readiness (Degraded Mode)
 * - Navigation Guards & Redirects
 * - Experience Mode & Workspace Governance
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
      return '/onboarding/paciente';
  }
}

export const PUBLIC_ROUTES = [
  "/landing", "/cadastro", "/register", "/auth", "/reset-password", "/confirm", "/p/", "/program/", "/pricing", "/privacy", "/terms"
];

export function logDecision(decision: SystemDecision, context?: GovernanceContext) {
  const color = decision.type === 'ALLOW' ? 'color: #10b981' : decision.type === 'REDIRECT' ? 'color: #f59e0b' : 'color: #ef4444';
  console.groupCollapsed(`%c[FJ:Governance] [${decision.type}] ${decision.reason}`, color);
  if (context) console.log("Context:", context);
  if (decision.target) console.log("Target:", decision.target);
  if (decision.metadata) console.log("Metadata:", decision.metadata);
  console.groupEnd();
}

/**
 * EMERGENCY BYPASS: Always allow all navigation in incident mode.
 * All previous rules are currently suspended to restore access.
 */
export function getSystemDecision(ctx: GovernanceContext): SystemDecision {
  return { type: 'ALLOW', reason: 'Critical Incident Mode: Bypass Enabled' };
}
