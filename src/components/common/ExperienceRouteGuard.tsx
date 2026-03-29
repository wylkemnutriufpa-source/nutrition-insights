import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getVisibleRoutes, useExperienceMode } from "@/hooks/useExperienceMode";

const ALL_EXPERIENCE_ROUTES = [...getVisibleRoutes("advanced")];

function matchesRouteOrChild(pathname: string, route: string) {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isExperienceControlledPath(pathname: string) {
  return ALL_EXPERIENCE_ROUTES.some((route) => matchesRouteOrChild(pathname, route));
}

function isAllowedPathForMode(pathname: string, mode: ReturnType<typeof useExperienceMode>["mode"]) {
  return [...getVisibleRoutes(mode)].some((route) => matchesRouteOrChild(pathname, route));
}

/**
 * Automatically redirects to "/" if the current route is not allowed
 * by the active experience mode. Place inside <BrowserRouter>.
 */
export default function ExperienceRouteGuard() {
  const { mode } = useExperienceMode();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isExperienceControlledPath(location.pathname)) {
      return;
    }

    if (!isAllowedPathForMode(location.pathname, mode)) {
      console.warn("[ExperienceRouteGuard] Blocking route", location.pathname, "for mode", mode);
      navigate("/", { replace: true });
    }
  }, [location.pathname, mode, navigate]);

  return null;
}
