import { useAuth } from "@v1/lib/auth";
import { Navigate } from "react-router-dom";
import OnboardingPaciente from "@v1/pages/OnboardingPaciente";
import OnboardingProfissional from "@v1/pages/OnboardingProfissional";
import PageLoader from "@v1/components/common/PageLoader";

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
  return <Navigate to="/v1/" replace />;
}
