
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { Navigate, useLocation } from "react-router-dom";

export default function WorkspaceRouteGuard({ children }: { children: React.ReactNode }) {
  const { isPatientContext, isProfessionalContext } = useWorkspaceContext();
  const { isPatient, isNutritionist, isPersonal, isAdmin, roles, authStatus, loading } = useAuth();
  const location = useLocation();

  // [DEBUG] Monitor redirecionamento
  console.log(`[DEBUG] WorkspaceRouteGuard check | path: ${location.pathname} | authStatus: ${authStatus} | roles: ${roles}`);

  // Se ainda está carregando o estado básico ou roles ainda não foram consolidadas
  if (authStatus === "loading" || (authStatus === "authenticated" && roles === null)) {
    console.log(`[DEBUG] WorkspaceRouteGuard waiting for auth/roles...`);
    return null;
  }

  const isAuthRoute = ["/auth", "/welcome", "/auth/confirm", "/reset-password"].some(p => location.pathname.startsWith(p));
  if (isAuthRoute) {
    console.log(`[DEBUG] WorkspaceRouteGuard allowing auth route: ${location.pathname}`);
    return <>{children}</>;
  }

  const isPro = isNutritionist || isPersonal || isAdmin;

  // 1. Proteção de Admin/Profissional
  if (location.pathname.startsWith("/admin")) {
    if (!isPro) {
      console.log(`[DEBUG] WorkspaceRouteGuard redirecting to /client/dashboard | reason: pro role required for /admin`);
      return <Navigate to="/client/dashboard" replace />;
    }
  }

  // 2. Proteção de Client (Paciente)
  if (location.pathname.startsWith("/client")) {
    if (!isPatient && isPro) {
      console.log(`[DEBUG] WorkspaceRouteGuard redirecting to /admin/dashboard | reason: patient role missing for /client`);
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  // 3. Rotas específicas que devem ser exclusivas de nutricionista/profissional
  const proOnlyPaths = [
    "/patients", 
    "/diet-builder", 
    "/meal-plans", 
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
    console.log(`[DEBUG] WorkspaceRouteGuard redirecting to /client/dashboard | reason: pro role required for restricted path: ${location.pathname}`);
    return <Navigate to="/client/dashboard" replace />;
  }

  // 4. Rotas específicas que devem ser exclusivas de paciente
  const patientOnlyPaths = ["/journey", "/patient-plan", "/checkin", "/meals"];
  if (patientOnlyPaths.some(p => location.pathname.startsWith(p)) && !isPro && !isPatient && roles !== null && roles.length > 0) {
    console.log(`[DEBUG] WorkspaceRouteGuard redirecting to /welcome | reason: no valid role found for patient features`);
    return <Navigate to="/welcome" replace />;
  }

  console.log(`[DEBUG] WorkspaceRouteGuard allowing route: ${location.pathname}`);
  return <>{children}</>;
}
