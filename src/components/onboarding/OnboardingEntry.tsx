import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import OnboardingPaciente from "@/pages/OnboardingPaciente";
import OnboardingProfissional from "@/pages/OnboardingProfissional";
import PageLoader from "@/components/common/PageLoader";

export default function OnboardingEntry() {
  const { isNutritionist, isPersonal, isAdmin, isPatient, profile, authStatus } = useAuth();
  
  if (authStatus === "loading") return <PageLoader />;

  if (isAdmin || isNutritionist || isPersonal) {
    return <OnboardingProfissional />;
  }

  if (isPatient) {
    // Se o estado já for anamnesis, mandamos para a página de anamnese
    // Isso evita o loop onde OnboardingEntry sempre renderiza OnboardingPaciente
    if (profile?.patient_state === 'anamnesis') {
      return <Navigate to="/anamnesis" replace />;
    }
    return <OnboardingPaciente />;
  }

  // Fallback
  return <Navigate to="/" replace />;
}
