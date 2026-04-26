/**
 * WorkspaceRouteGuard — Global route enforcement based on:
 * 1. Auth Role (nutritionist, personal, admin, patient)
 * 2. Workspace Context (professional vs patient — for hybrid users)
 * 3. Feature permissions & subscription status
 *
 * RULES:
 * ─────────────────────────────────────────────────────────
 * PATIENT CONTEXT → blocks professional routes:
 *   /admin, /patients, /diet-templates, /onboarding-pipeline,
 *   /meal-plans, /editor-v2, /protocols, /programs, /branding,
 *   /reports, /financial, /automation, /control-tower, /team,
 *   /clinical-*, /coach-bodybuilder, /invite-patient, etc.
 *
 * PROFESSIONAL CONTEXT → blocks patient-only routes:
 *   /my-diet, /my-workouts, /my-story, /body-projection,
 *   /patient-overview, /patient-intelligence, /client/dashboard,
 *   /meals, /achievements, /challenges, /checkin, /journey, etc.
 *
 * ADMIN routes → only accessible by admin role (any context)
 * NUTRITIONIST routes → only nutritionist or admin
 * PERSONAL routes → only personal or admin
 * PATIENT routes → only patient role (or hybrid in patient context)
 *
 * Fallback: redirects to "/" which renders the correct dashboard.
 * ─────────────────────────────────────────────────────────
 */
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";

// ── Route Classification ──────────────────────────────────────

/** Routes that require professional context (blocked when workspace = patient) */
const PROFESSIONAL_ONLY_ROUTES = [
  "/patients",
  "/diet-templates",
  "/onboarding-pipeline",
  "/meal-plans",
  "/editor-v2",
  "/protocols",
  "/protocolos-fitoterapicos",
  "/programs",
  "/branding",
  "/reports",
  "/financial",
  "/automation",
  "/clinical-automation",
  "/control-tower",
  "/clinical-workspace",
  "/clinical-intelligence",
  "/clinical-risk",
  "/clinical-analytics",
  "/clinical-brain",
  "/clinical-pipeline",
  "/clinical-orchestration",
  "/clinical-lab",
  "/lab-interpreter",
  "/clinical-simulation",
  "/clinical-predictions",
  "/therapeutic-intelligence",
  "/protocol-transitions",
  "/human-performance",
  "/population-intelligence",
  "/physiological-intelligence",
  "/population-nutrition",
  "/weight-trajectory",
  "/metabolic-twin",
  "/coach-bodybuilder",
  "/invite-patient",
  "/team",
  "/workspace-editor",
  "/intelligence-settings",
  "/weekly-report",
  "/checkin-panel",
  "/food-database",
  "/body-analysis",
  "/physical-assessment",
  "/professional/crm",
  "/my-public-profile",
  "/integrations",
  "/professional-guide",
  "/global-tips",
  "/settings/whatsapp",
  "/personal/dashboard",
  "/personal/students",
  "/personal/workouts",
];

/** Routes exclusive to nutritionists/admins — personal trainers CANNOT access */
const NUTRITIONIST_ONLY_ROUTES = [
  "/cockpit",
  "/clinical-workspace",
  "/editor-v2",
  "/meal-plans",
  "/diet-templates",
  "/onboarding-pipeline",
  "/protocols",
  "/protocolos-fitoterapicos",
  "/clinical-automation",
  "/clinical-brain",
  "/clinical-orchestration",
  "/clinical-lab",
  "/lab-interpreter",
  "/clinical-simulation",
  "/clinical-predictions",
  "/therapeutic-intelligence",
  "/protocol-transitions",
  "/population-intelligence",
  "/physiological-intelligence",
  "/population-nutrition",
  "/weight-trajectory",
  "/metabolic-twin",
  "/clinical-analytics",
  "/clinical-intelligence",
  "/clinical-risk",
  "/coach-bodybuilder",
  "/branding",
  "/professional/crm",
  "/my-public-profile",
  "/food-database",
  "/weekly-report",
];

/** Routes exclusive to patient context (blocked in professional context) */
const PATIENT_ONLY_ROUTES = [
  "/my-diet",
  "/my-workouts",
  "/my-story",
  "/body-projection",
  "/patient-overview",
  "/patient-intelligence",
  "/client/dashboard",
  "/meals",
  "/achievements",
  "/challenges",
  "/checklist",
  "/anamnesis",
  "/onboarding",
  "/analyze",
  "/shopping-list",
  "/journey",
  "/library",
  "/weight-calculator",
  "/water-calculator",
  "/health-quiz",
  "/checkin",
  "/consent",
  "/payment-required",
];

/** Lojista-only routes — only lojista and admin can access */
const LOJISTA_ONLY_ROUTES = [
  "/store",
  "/store/products",
  "/store/technical-sheets",
];

/** Admin-only routes */
const ADMIN_ROUTES = [
  "/admin",
  "/platform-governance",
  "/security-dashboard",
  "/system-diagnostics",
  "/system-health-live",
  "/ops-center",
  "/admin-operational-costs",
];

/** Routes always accessible regardless of context */
const UNIVERSAL_ROUTES = [
  "/",
  "/auth",
  "/reset-password",
  "/settings",
  "/notifications",
  "/chat",
  "/appointments",
  "/planner",
  "/weekly-goals",
  "/recipes",
  "/recipe-builder",
  "/feedbacks",
  "/supplements",
  "/user-guide",
  "/curiosidades",
  "/apresentacao",
  "/pricing",
  "/ranking",
  "/ambassador",
  "/my-referrals",
  "/onboarding-profissional",
  "/onboarding-paciente",
  "/fitness-anamnesis",
];

/** Public routes (no auth needed) */
const PUBLIC_ROUTES = [
  "/landing",
  "/landing-paciente",
  "/landing-personal",
  "/landing-afiliado",
  "/biquini-branco",
  "/demo/",
  "/cadastro",
  "/register",
  "/register-patient",
  "/auth",
  "/reset-password",
  "/p/",
  "/program/",
  "/pricing",
  "/politica-de-privacidade",
  "/termos-de-uso",
  "/exclusao-de-conta",
];

function matchRoute(pathname: string, route: string): boolean {
  if (route.endsWith("/")) return pathname.startsWith(route) || pathname === route.slice(0, -1);
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isInList(pathname: string, routes: string[]): boolean {
  return routes.some(r => matchRoute(pathname, r));
}

/**
 * WorkspaceRouteGuard: Place inside <BrowserRouter> after AuthProvider.
 * Silently redirects to "/" on access violation.
 */
export default function WorkspaceRouteGuard() {
  const { user, loading, isNutritionist, isPersonal, isAdmin, isPatient } = useAuth();
  const { isProfessionalContext, isPatientContext, isHybridUser } = useWorkspaceContext();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;

    const { pathname } = location;

    // Public routes — always allowed
    if (isInList(pathname, PUBLIC_ROUTES)) return;

    // Universal routes — always allowed for authenticated users
    if (isInList(pathname, UNIVERSAL_ROUTES)) return;

    const isProRole = isNutritionist || isPersonal || isAdmin;

    // ── Admin guard ──
    if (isInList(pathname, ADMIN_ROUTES) && !isAdmin) {
      console.warn("[WorkspaceRouteGuard] Non-admin accessing admin route:", pathname);
      navigate("/", { replace: true });
      return;
    }

    // ── Lojista-only guard — enforced by StoreRoute component ──

    // ── Nutritionist-only guard (block personal trainers from nutrition routes) ──
    if (isPersonal && !isNutritionist && !isAdmin && isInList(pathname, NUTRITIONIST_ONLY_ROUTES)) {
      console.warn("[WorkspaceRouteGuard] Personal trainer accessing nutritionist-only route:", pathname);
      navigate("/", { replace: true });
      return;
    }

    // ── Workspace context guards (only for hybrid users) ──
    if (isHybridUser) {
      if (isPatientContext && isInList(pathname, PROFESSIONAL_ONLY_ROUTES)) {
        console.warn("[WorkspaceRouteGuard] Patient context accessing pro route:", pathname);
        navigate("/", { replace: true });
        return;
      }
      if (isProfessionalContext && isInList(pathname, PATIENT_ONLY_ROUTES)) {
        console.warn("[WorkspaceRouteGuard] Pro context accessing patient route:", pathname);
        navigate("/", { replace: true });
        return;
      }
    }

    // ── Role-based guards (non-hybrid) ──
    if (!isHybridUser) {
      // Pure patient trying professional routes
      if (isPatient && !isProRole && isInList(pathname, PROFESSIONAL_ONLY_ROUTES)) {
        console.warn("[WorkspaceRouteGuard] Patient accessing pro route:", pathname);
        navigate("/", { replace: true });
        return;
      }
      // Pure professional trying patient-only routes
      if (isProRole && !isPatient && isInList(pathname, PATIENT_ONLY_ROUTES)) {
        console.warn("[WorkspaceRouteGuard] Pro accessing patient route:", pathname);
        navigate("/", { replace: true });
        return;
      }
    }
  }, [location.pathname, loading, user, isNutritionist, isPersonal, isAdmin, isPatient, isProfessionalContext, isPatientContext, isHybridUser, navigate]);

  return null;
}
