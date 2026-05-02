import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import OnboardingPaciente from "@/pages/OnboardingPaciente";
import OnboardingProfissional from "@/pages/OnboardingProfissional";
import PageLoader from "./common/PageLoader";

export default function OnboardingEntry() {
  const { isNutritionist, isPersonal, isAdmin, isPatient, authStatus } = useAuth();

  if (authStatus === "loading") return <PageLoader />;

  if (isAdmin || isNutritionist || isPersonal) {
    return <OnboardingProfissional />;
  }

  if (isPatient) {
    return <OnboardingPaciente />;
  }

  // Fallback
  return <Navigate to="/" replace />;
}
