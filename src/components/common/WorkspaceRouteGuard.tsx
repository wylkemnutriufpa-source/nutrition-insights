
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { Navigate, useLocation } from "react-router-dom";

export default function WorkspaceRouteGuard({ children }: { children: React.ReactNode }) {
  const { isPatientContext, isProfessionalContext } = useWorkspaceContext();
  const location = useLocation();

  // Simple validation to ensure user is in the correct context for the route
  const isAuthRoute = ["/auth", "/welcome", "/auth/confirm", "/reset-password"].some(p => location.pathname.startsWith(p));
  if (isAuthRoute) return <>{children}</>;

  if (location.pathname.startsWith("/admin") && !isProfessionalContext) {
     return <Navigate to="/client/dashboard" replace />;
  }

  if (location.pathname.startsWith("/client") && !isPatientContext) {
     return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}
