import { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getVisibleRoutes, useExperienceMode } from "@/hooks/useExperienceMode";
import { usePatientJourneyStatus } from "@/hooks/usePatientJourneyStatus";

function matchesRouteOrChild(pathname: string, route: string) {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}

/**
 * Automatically redirects to "/" if the current route is not allowed
 * by the active experience mode + role. Place inside <BrowserRouter>.
 * 
 * SPECIAL EXCEPTION: During onboarding_active, /anamnesis is ALWAYS allowed.
 */
export default function ExperienceRouteGuard() {
  const { mode, role } = useExperienceMode();
  const { status: journeyStatus } = usePatientJourneyStatus();
  const location = useLocation();
  const navigate = useNavigate();

  const allControlledRoutes = useMemo(() => [...getVisibleRoutes("advanced", role)], [role]);
  const allowedRoutes = useMemo(() => [...getVisibleRoutes(mode, role)], [mode, role]);

  useEffect(() => {
    // Stage 1: Check if route is controlled by experience modes
    const isControlled = allControlledRoutes.some((r) => matchesRouteOrChild(location.pathname, r));
    if (!isControlled) return;

    // Stage 2: Onboarding Override (CRITICAL ANTI-LOOP)
    // If the patient is in active onboarding, they MUST be able to access /anamnesis
    const isOnboardingFlow = journeyStatus === "onboarding_active" || journeyStatus === "lead_created" || journeyStatus === "awaiting_consent";
    if (isOnboardingFlow && location.pathname.startsWith("/anamnesis")) {
      console.log("[ExperienceRouteGuard] [GuardOverride] Onboarding bypass active for /anamnesis");
      return;
    }

    // Stage 3: Normal mode validation
    const isAllowed = allowedRoutes.some((r) => matchesRouteOrChild(location.pathname, r));
    if (!isAllowed) {
      console.warn("[ExperienceRouteGuard] Blocking route", location.pathname, "for mode", mode, "role", role);
      navigate("/", { replace: true });
    }
  }, [location.pathname, mode, role, allControlledRoutes, allowedRoutes, navigate, journeyStatus]);

  return null;
}
