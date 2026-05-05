
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { Navigate, useLocation } from "react-router-dom";

export default function WorkspaceRouteGuard({ children }: { children: React.ReactNode }) {
  const { isPatientContext, isProfessionalContext } = useWorkspaceContext();
  const { isPatient, isNutritionist, isPersonal, isAdmin, roles, authStatus } = useAuth();
  const location = useLocation();

  // Se ainda está carregando, não faz nada
  if (authStatus === "loading") return null;

  const isAuthRoute = ["/auth", "/welcome", "/auth/confirm", "/reset-password"].some(p => location.pathname.startsWith(p));
  if (isAuthRoute) return <>{children}</>;

  const isPro = isNutritionist || isPersonal || isAdmin;

  // 1. Proteção de Admin/Profissional
  if (location.pathname.startsWith("/admin")) {
    if (!isPro) {
      // Se não tem role pro, vai para dashboard de cliente
      return <Navigate to="/client/dashboard" replace />;
    }
    // Se tem role pro mas está no contexto paciente (hybrid user), força contexto pro
    if (!isProfessionalContext) {
      // Idealmente aqui dispararíamos uma mudança de contexto, mas como estamos no render, 
      // o Navigate apenas previne acesso indevido se o guard estivesse bloqueando.
      // Como queremos "Garantir que cada rota respeite a role", se ele é pro e está em /admin, ok.
    }
  }

  // 2. Proteção de Client (Paciente)
  if (location.pathname.startsWith("/client")) {
    if (!isPatient && isPro) {
      // Se ele é apenas pro, redireciona para admin
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  // 3. Rotas específicas que devem ser exclusivas de nutricionista
  const proOnlyPaths = ["/patients", "/diet-builder", "/meal-plans/editor", "/analyze-meal"];
  if (proOnlyPaths.some(p => location.pathname.startsWith(p)) && !isPro) {
    return <Navigate to="/client/dashboard" replace />;
  }

  // 4. Rotas específicas que devem ser exclusivas de paciente
  const patientOnlyPaths = ["/journey", "/patient-plan", "/checkin", "/meals"];
  if (patientOnlyPaths.some(p => location.pathname.startsWith(p)) && !isPro && !isPatient) {
    // Caso bizarro sem role, vai para welcome
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
}
