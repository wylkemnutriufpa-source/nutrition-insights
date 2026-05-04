
import { useLocation, Navigate } from "react-router-dom";
import { useExperienceMode } from "@/hooks/useExperienceMode";

export default function ExperienceRouteGuard({ children }: { children: React.ReactNode }) {
  const { isRouteAllowed } = useExperienceMode();
  const location = useLocation();
  
  // Public or always visible routes bypass the check
  const isPublic = [
    "/auth", "/auth/confirm", "/reset-password", "/invitation", "/convite",
    "/landing", "/privacy", "/terms", "/status", "/status-page"
  ].some(p => location.pathname.startsWith(p));

  if (isPublic) return <>{children}</>;
  
  if (!isRouteAllowed(location.pathname)) {
    console.warn(`[ExperienceRouteGuard] Route blocked: ${location.pathname}`);
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}
