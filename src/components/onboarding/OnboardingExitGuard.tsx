/**
 * Modal that warns patients when they try to leave onboarding before completing it.
 * Uses beforeunload for browser close/refresh protection.
 * NOTE: In-app navigation blocking via useBlocker requires a data router (createBrowserRouter).
 * Since the app uses BrowserRouter, we only guard browser-level navigation here.
 */
import { useEffect } from "react";

interface OnboardingExitGuardProps {
  /** Whether the guard should be active (incomplete onboarding) */
  enabled: boolean;
  /** Whether user has started filling (to distinguish first access vs returning) */
  hasStartedFilling?: boolean;
}

export default function OnboardingExitGuard({
  enabled,
}: OnboardingExitGuardProps) {
  // Browser close / tab close / refresh guard
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);

  // In-app navigation is already guarded by PaymentGuardedPatientRoute
  // which redirects back to /onboarding if onboarding is incomplete.
  // No modal needed here — the route guard handles it.

  return null;
}
