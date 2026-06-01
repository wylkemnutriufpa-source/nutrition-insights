
import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { Navigate, useLocation } from "react-router-dom";
import PageLoader from "@/components/common/PageLoader";

export default function WorkspaceRouteGuard({ children }: { children: React.ReactNode }) {
  const { isPatientContext, isProfessionalContext } = useWorkspaceContext();
  const { isPatient, isNutritionist, isPersonal, isAdmin, isAdminMaster, roles, authStatus, loading, isLoaded } = useAuth();
  const location = useLocation();

  // [RASTREADOR]
  useEffect(() => {
    const isPro = isNutritionist || isPersonal || isAdmin || isAdminMaster;
    const isAuthRoute = ["/auth", "/auth/confirm", "/reset-password"].some(p => location.pathname.startsWith(p));
    
    if (!loading && authStatus === "authenticated" && roles !== null && !isAuthRoute) {
      if (location.pathname.startsWith("/admin") && !isPro) {
        console.warn(`[RASTREADOR] Redirect para /client/dashboard disparado por: WorkspaceRouteGuard (Admin protection)`);
        console.log(`[RASTREADOR] Estado: user=${!!roles}, roles=${roles}, path=${location.pathname}, isPro=${isPro}`);
      }

      const proOnlyPaths = ["/patients", "/meal-plans", "/editor-v3", "/editor-v2", "/automation", "/financial", "/diet-templates", "/food-database", "/clinical-intelligence", "/library", "/planner", "/team", "/import-patients", "/branding", "/clinical-risk", "/therapeutic-intelligence", "/clinical-orchestration", "/weight-trajectory", "/physical-assessment", "/checkin-panel", "/in-office"];
      if (proOnlyPaths.some(p => location.pathname.startsWith(p)) && !isPro) {
        console.warn(`[RASTREADOR] Redirect para /client/dashboard disparado por: WorkspaceRouteGuard (Pro-only paths)`);
        console.log(`[RASTREADOR] Estado: roles=${roles}, path=${location.pathname}`);
      }
    }
  }, [location.pathname, isNutritionist, isPersonal, isAdmin, loading, authStatus, roles]);

  // Aguarda auth + roles resolverem de verdade.
  // Rotas profissionais não podem decidir permissão com roles=null/[] vindos de timeout temporário.
  if (authStatus === "loading" || (authStatus === "authenticated" && roles === null)) {
    return <PageLoader />;
  }

  const isAuthRoute = ["/auth", "/auth/confirm", "/reset-password"].some(p => location.pathname.startsWith(p));
  if (isAuthRoute) {
    return <>{children}</>;
  }

  const isPro = isNutritionist || isPersonal || isAdmin || isAdminMaster;

  // 0. Bloqueio Absoluto V2 - Reforçado
  if (location.pathname.includes("/v2") || location.pathname.includes("dashboard-v2")) {
    console.warn(`[SEGURANÇA] Bloqueio WorkspaceRouteGuard: tentativa de acessar rota V2 (${location.pathname}). Redirecionando para sistema principal.`);
    return <Navigate to="/dashboard" replace />;
  }

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

  const patientOnlyPaths = ["/journey", "/patient-meal-plan", "/patient-plan", "/patient/plan", "/checkin", "/meals", "/recipes", "/water-calculator", "/weight-calculator", "/patient-overview", "/checklist", "/appointments", "/anamnesis", "/achievements", "/challenges", "/shopping-list", "/body-analysis", "/body-projection", "/checkin-panel", "/weekly-goals", "/weekly-report", "/weight-trajectory"];
  
  // BLOQUEIO SOBERANO: Profissionais (Pro) NUNCA acessam caminhos de paciente
  // EXCEÇÃO: /anamnesis?patientId=XXX é acesso do nutricionista à anamnese do paciente (modo nutri)
  const isNutriAnamnesis = location.pathname.startsWith("/anamnesis") && 
    (location.search.includes("patientId=") || location.search.includes("patientid="));

  if (patientOnlyPaths.some(p => location.pathname.startsWith(p)) && isPro && !isPatient && !isNutriAnamnesis) {
    console.warn(`[RASTREADOR] Bloqueio WorkspaceRouteGuard: tentativa de acesso Pro -> Patient Path (${location.pathname}). Redirecionando para /dashboard.`);
    return <Navigate to="/dashboard" replace />;
  }

  // Proteção para usuários sem role (não deveria acontecer, mas guardamos)
  if (patientOnlyPaths.some(p => location.pathname.startsWith(p)) && !isPro && !isPatient && roles !== null && roles.length > 0) {
    console.warn(`[RASTREADOR] Redirect para / disparado por: WorkspaceRouteGuard (Patient only paths - Orphaned)`);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
