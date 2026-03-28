import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useExperienceMode } from "@/hooks/useExperienceMode";

/**
 * Automatically redirects to "/" if the current route is not allowed
 * by the active experience mode. Place inside <BrowserRouter>.
 */
export default function ExperienceRouteGuard() {
  const { isRouteAllowed, mode } = useExperienceMode();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isRouteAllowed(location.pathname)) {
      navigate("/", { replace: true });
    }
  }, [location.pathname, mode, isRouteAllowed, navigate]);

  return null;
}
