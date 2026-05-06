
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

export default function WorkspaceRouteGuard({ children }: { children: React.ReactNode }) {
  const { isPatientContext, isProfessionalContext } = useWorkspaceContext();
  const { isPatient, isNutritionist, isPersonal, isAdmin, roles, authStatus, loading } = useAuth();
  const location = useLocation();

  // [RASTREADOR]
  useEffect(() => {
    const isPro = isNutritionist || isPersonal || isAdmin;
    const isAuthRoute = ["/auth", "/welcome", "/auth/confirm", "/reset-password"].some(p => location.pathname.startsWith(p));
    
    if (!loading && authStatus === "authenticated" && roles !== null && !isAuthRoute) {
      if (location.pathname.startsWith("/admin") && !isPro) {
        console.warn(`[RASTREADOR] Redirect para /client/dashboard disparado por: WorkspaceRouteGuard (Admin protection)`);
        console.log(`[RASTREADOR] Estado: user=${!!roles}, roles=${roles}, path=${location.pathname}, isPro=${isPro}`);
      }

      const proOnlyPaths = ["/patients", "/diet-builder", "/meal-plans", "/editor-v3", "/editor-v2", "/automation", "/financial", "/diet-templates", "/food-database", "/clinical-intelligence", "/library", "/planner", "/team", "/import-patients", "/branding", "/clinical-risk", "/therapeutic-intelligence", "/clinical-orchestration", "/weight-trajectory", "/physical-assessment", "/checkin-panel", "/in-office"];
      if (proOnlyPaths.some(p => location.pathname.startsWith(p)) && !isPro) {
        console.warn(`[RASTREADOR] Redirect para /client/dashboard disparado por: WorkspaceRouteGuard (Pro-only paths)`);
        console.log(`[RASTREADOR] Estado: roles=${roles}, path=${location.pathname}`);
      }
    }
  }, [location.pathname, isNutritionist, isPersonal, isAdmin, loading, authStatus, roles]);

  if (authStatus === "loading" || (authStatus === "authenticated" && roles === null)) {
    return null;
  }

  const isAuthRoute = ["/auth", "/welcome", "/auth/confirm", "/reset-password"].some(p => location.pathname.startsWith(p));
  if (isAuthRoute) {
    return <>{children}</>;
  }

  const isPro = isNutritionist || isPersonal || isAdmin;

  // 1. Proteção de Admin/Profissional
  if (location.pathname.startsWith("/admin")) {
    if (!isPro) {
      console.warn(`[RASTREADOR] Bloqueio WorkspaceRouteGuard: tentativa de acessar /admin sem ser PRO. Redirecionando para /client/dashboard.`);
      return <Navigate to="/client/dashboard" replace />;
    }
  }

  // 2. Proteção de Client (Paciente)
  if (location.pathname.startsWith("/client")) {
    if (!isPatient && isPro) {
      console.warn(`[RASTREADOR] Bloqueio WorkspaceRouteGuard: tentativa de acessar /client sendo PRO (e não paciente). Redirecionando para /dashboard.`);
      return <Navigate to="/dashboard" replace />;
    }
  }

  const proOnlyPaths = [
    "/patients", 
    "/diet-builder", 
    "/meal-plans", 
    "/editor-v3",
    "/editor-v2",
    "/automation",
    "/financial",
    "/diet-templates",
    "/food-database",
    "/clinical-intelligence",
    "/library",
    "/planner",
    "/team",
    "/import-patients",
    "/branding",
    "/clinical-risk",
    "/therapeutic-intelligence",
    "/clinical-orchestration",
    "/weight-trajectory",
    "/physical-assessment",
    "/checkin-panel",
    "/in-office"
  ];
  if (proOnlyPaths.some(p => location.pathname.startsWith(p)) && !isPro) {
    return <Navigate to="/client/dashboard" replace />;
  }

  const patientOnlyPaths = ["/journey", "/patient-meal-plan", "/checkin", "/meals"];
  if (patientOnlyPaths.some(p => location.pathname.startsWith(p)) && !isPro && !isPatient && roles !== null && roles.length > 0) {
    console.warn(`[RASTREADOR] Redirect para /welcome disparado por: WorkspaceRouteGuard (Patient only paths)`);
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
}
