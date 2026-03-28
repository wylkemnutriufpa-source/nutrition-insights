import { Navigate } from "react-router-dom";
import { useExperienceMode } from "@/hooks/useExperienceMode";

interface ExperienceRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps a route to redirect to "/" if the current experience mode
 * does not allow accessing the current path.
 */
export default function ExperienceRouteGuard({ children }: ExperienceRouteGuardProps) {
  const { isRouteAllowed } = useExperienceMode();
  const currentPath = window.location.pathname;

  if (!isRouteAllowed(currentPath)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
