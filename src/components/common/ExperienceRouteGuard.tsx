import { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getVisibleRoutes, useExperienceMode } from "@/hooks/useExperienceMode";

function matchesRouteOrChild(pathname: string, route: string) {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}

/**
 * Automatically redirects to "/" if the current route is not allowed
 * by the active experience mode + role. Place inside <BrowserRouter>.
 */
export default function ExperienceRouteGuard() {
  const { mode, role } = useExperienceMode();
  const location = useLocation();
  const navigate = useNavigate();

  const allControlledRoutes = useMemo(() => [...getVisibleRoutes("advanced", role)], [role]);
  const allowedRoutes = useMemo(() => [...getVisibleRoutes(mode, role)], [mode, role]);

  useEffect(() => {
    const isControlled = allControlledRoutes.some((r) => matchesRouteOrChild(location.pathname, r));
    if (!isControlled) return;

    const isAllowed = allowedRoutes.some((r) => matchesRouteOrChild(location.pathname, r));
    if (!isAllowed) {
      console.warn("[ExperienceRouteGuard] Blocking route", location.pathname, "for mode", mode, "role", role);
      navigate("/", { replace: true });
    }
  }, [location.pathname, mode, role, allControlledRoutes, allowedRoutes, navigate]);

  return null;
}
