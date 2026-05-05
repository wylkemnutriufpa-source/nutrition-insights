
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { Navigate, useLocation } from "react-router-dom";

export default function WorkspaceRouteGuard({ children }: { children: React.ReactNode }) {
  const { isPatientContext, isProfessionalContext } = useWorkspaceContext();
  const { isPatient, isNutritionist, isPersonal, isAdmin, roles, authStatus, loading } = useAuth();
  const location = useLocation();

  // Se ainda está carregando o estado básico ou roles ainda não foram consolidadas
  if (authStatus === "loading" || (authStatus === "authenticated" && roles === null)) {
    return null;
  }

  const isAuthRoute = ["/auth", "/welcome", "/auth/confirm", "/reset-password"].some(p => location.pathname.startsWith(p));
  if (isAuthRoute) return <>{children}</>;

  const isPro = isNutritionist || isPersonal || isAdmin;

  // 1. Proteção de Admin/Profissional
  if (location.pathname.startsWith("/admin")) {
    if (!isPro) {
      console.log("[NAV] WorkspaceRouteGuard redirecting to /client/dashboard", {
        from: location.pathname,
        roles,
        reason: "pro role required for /admin path"
      });
      return <Navigate to="/client/dashboard" replace />;
    }
  }

  // 2. Proteção de Client (Paciente)
  if (location.pathname.startsWith("/client")) {
    // Hybrid users or pro users acting as professionals shouldn't be redirected to /admin
    // ONLY redirect if the user DOES NOT have the patient role AND has a pro role.
    if (!isPatient && isPro) {
      console.log("[NAV] WorkspaceRouteGuard redirecting to /admin/dashboard", {
        from: location.pathname,
        roles,
        reason: "patient role missing for /client path, redirecting pro to admin"
      });
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  // 3. Rotas específicas que devem ser exclusivas de nutricionista
  const proOnlyPaths = ["/patients", "/diet-builder", "/meal-plans/editor", "/analyze-meal"];
  if (proOnlyPaths.some(p => location.pathname.startsWith(p)) && !isPro) {
    console.log("[NAV] WorkspaceRouteGuard redirecting to /client/dashboard", {
      from: location.pathname,
      roles,
      reason: "pro role required for nutritionist features"
    });
    return <Navigate to="/client/dashboard" replace />;
  }

  // 4. Rotas específicas que devem ser exclusivas de paciente
  const patientOnlyPaths = ["/journey", "/patient-plan", "/checkin", "/meals"];
  if (patientOnlyPaths.some(p => location.pathname.startsWith(p)) && !isPro && !isPatient && roles !== null && roles.length > 0) {
    console.log("[NAV] WorkspaceRouteGuard redirecting to /welcome", {
      from: location.pathname,
      roles,
      reason: "no valid role found for patient features"
    });
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
}
