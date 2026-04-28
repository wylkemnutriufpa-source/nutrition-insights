/**
 * Hook that checks if a patient must complete onboarding before accessing the system.
 * Returns whether the patient should be redirected to /onboarding.
 */
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { usePatientJourneyStatus, getUserRouteByStatus } from "@/hooks/usePatientJourneyStatus";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export type OnboardingRequirement = "none" | "must_complete" | "loading" | "error_no_link";

// Routes the patient is allowed to visit even when onboarding is mandatory
const ONBOARDING_ALLOWED_ROUTES = [
  "/onboarding",
  "/onboarding-pipeline",
  "/consent",
  "/auth",
  "/reset-password",
  "/settings",
  "/privacy-policy",
  "/termos-de-uso",
  "/support",
  "/erro-vinculo"
];

export function isOnboardingAllowedRoute(pathname: string): boolean {
  // Normalize path to check prefix
  const path = pathname === "/" ? "/" : pathname;
  return ONBOARDING_ALLOWED_ROUTES.some(route => path.startsWith(route));
}

// Redirect tracker for Anti-Loop Hard Protection
const redirectHistory: Record<string, { from: string, to: string, count: number }> = {};

export function useOnboardingGuard() {
  const { status: journeyStatus, loading: journeyLoading } = usePatientJourneyStatus();
  const { loading: authLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isRedirecting = useRef(false);

  useEffect(() => {
    // Stage 1: Wait for status
    if (journeyLoading || authLoading || !user) return;

    // Stage 2: Centralized Decision
    const targetPath = getUserRouteByStatus(journeyStatus);
    const currentPath = location.pathname;

    // Stage 3: Anti-Loop Protection
    if (currentPath === targetPath || isOnboardingAllowedRoute(currentPath)) {
      return;
    }

    // Loop Trava (Hard Protection)
    const loopKey = `${user.id}:${currentPath}:${targetPath}`;
    const history = redirectHistory[loopKey] || { from: currentPath, to: targetPath, count: 0 };
    
    if (history.count >= 2) {
      console.warn("[OnboardingRedirect] LOOP DETECTED AND BLOCKED", { from: currentPath, to: targetPath, status: journeyStatus });
      return;
    }

    // Stage 4: Execution
    console.log("[OnboardingRedirect]", {
      from: currentPath,
      to: targetPath,
      status: journeyStatus,
      blocked: false,
      reason: currentPath === targetPath ? "same_route" : "redirecting"
    });

    history.count++;
    redirectHistory[loopKey] = history;
    
    navigate(targetPath, { replace: true });

  }, [journeyStatus, journeyLoading, authLoading, location.pathname, user, navigate]);

  const requirement: OnboardingRequirement = useMemo(() => {
    if (journeyLoading || authLoading) return "loading";
    if (isOnboardingAllowedRoute(location.pathname)) return "none";
    if (journeyStatus === "no_link" || journeyStatus === null) return "error_no_link";
    
    const targetPath = getUserRouteByStatus(journeyStatus);
    if (location.pathname !== targetPath && !isOnboardingAllowedRoute(location.pathname)) {
        return "must_complete";
    }

    return "none";
  }, [journeyStatus, journeyLoading, authLoading, location.pathname]);

  return { requirement };
}
