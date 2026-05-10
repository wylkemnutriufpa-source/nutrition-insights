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
    const skipSlides = new URLSearchParams(window.location.search).get('skip_slides');
    
    // Se o estado já for anamnesis ou se o link for para pular slides, mandamos para a página de anamnese
    if (profile?.patient_state === 'anamnesis' || skipSlides === 'true') {
      // Se estamos pulando slides mas o estado no banco ainda é slides, atualizamos
      if (profile?.patient_state === 'onboarding_slides' && skipSlides === 'true') {
        supabase.from("profiles").update({ patient_state: 'anamnesis' }).eq("user_id", user?.id).then(() => {
          console.log("[FJ:Onboarding] Estado atualizado para anamnesis via skip_slides");
        });
      }
      return <Navigate to="/anamnesis" replace />;
    }
    return <OnboardingPaciente />;
  }

  // Fallback
  return <Navigate to="/" replace />;
}
