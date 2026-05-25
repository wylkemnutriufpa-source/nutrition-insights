import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useConsentGuard } from "@/hooks/useConsentGuard";
import { BrainLoaderScreen } from "@/components/common/BrainLoader";
import { supabase } from "@/integrations/supabase/client";

export function RootRouter() {
  const { roles, authStatus, loading, profile, refreshProfile, user } = useAuth();
  const { hasConsent, loading: consentLoading } = useConsentGuard();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");
  const [error, setError] = useState<string | null>(null);

  // Define if we should block navigation for invitation/direct linkage processing
  const [processingInvite, setProcessingInvite] = useState(() => {
    return !!localStorage.getItem("fitjourney_invite_code") || !!localStorage.getItem("fitjourney_nutri_id");
  });

  // 1. Trace boot sequence
  useEffect(() => {
    console.log(`[BOOT:RootRouter] authStatus: ${authStatus} | loading: ${loading} | roles: ${roles ? `[${roles.join(", ")}]` : "null"}`);
  }, [authStatus, loading, roles]);


  useEffect(() => {
    async function processContext() {
      // Se não estamos processando convite, ou não temos usuário logado, ou já processamos roles e não é paciente
      if (!processingInvite || !user?.id || !roles || !roles.includes("patient")) {
        // Safety switch: se roles existem e não é paciente, não temos o que vincular aqui
        if (roles && !roles.includes("patient")) {
          localStorage.removeItem("fitjourney_invite_code");
          localStorage.removeItem("fitjourney_nutri_id");
          setProcessingInvite(false);
        }
        return;
      }

      const pendingCode = localStorage.getItem("fitjourney_invite_code");
      const pendingNutriId = localStorage.getItem("fitjourney_nutri_id");

      if (!pendingCode && !pendingNutriId) {
        setProcessingInvite(false);
        return;
      }

      try {
        if (pendingCode) {
          console.log("[RootRouter] Processando convite pendente:", pendingCode);
          const { data } = await supabase.rpc("complete_invitation" as any, {
            _code: pendingCode,
            _patient_user_id: user.id,
          });

          if (data) {
            console.log("[RootRouter] Convite vinculado com sucesso!");
            localStorage.removeItem("fitjourney_invite_code");
          }
        } else if (pendingNutriId) {
          console.log("[RootRouter] Processando vínculo direto pendente:", pendingNutriId);
          
          // Verificamos se já existe vínculo para não duplicar chamadas
          const { data: existingLink } = await supabase
            .from("nutritionist_patients")
            .select("id")
            .eq("patient_id", user.id)
            .eq("nutritionist_id", pendingNutriId)
            .maybeSingle();

          if (!existingLink) {
            const { data: canonData, error: canonErr } = await supabase.rpc("create_patient_canonical" as any, {
              _patient_id: user.id,
              _full_name: profile?.full_name || user.email?.split("@")[0] || "Paciente",
              _email: user.email,
              _nutritionist_id: pendingNutriId,
              _source: "social_login_recovery",
              _metadata: { correlation_id: crypto.randomUUID() }
            });

            if (canonErr) throw canonErr;
            console.log("[RootRouter] Vínculo direto realizado via create_patient_canonical!");
          }
          
          localStorage.removeItem("fitjourney_nutri_id");
        }
        
        // Sempre atualiza o profile após um vínculo bem-sucedido
        await refreshProfile();
      } catch (err) {
        console.error("[RootRouter] Erro ao vincular contexto pendente:", err);
        // Em caso de erro persistente, limpamos para não travar o usuário no loader infinitamente
        localStorage.removeItem("fitjourney_invite_code");
        localStorage.removeItem("fitjourney_nutri_id");
      } finally {
        setProcessingInvite(false);
      }
    }
    
    processContext();
  }, [processingInvite, user?.id, roles, authStatus, refreshProfile, profile?.full_name, user?.email]);

  // Se tem erro, exibe o fallback
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          Recarregar
        </button>
      </div>
    );
  }

  // 3. Aguarda dados ficarem prontos com safety timeout
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      if (authStatus === "authenticated") setTimedOut(true);
    }, 5000);
    return () => clearTimeout(t);
  }, [authStatus]);

  if (!timedOut && (authStatus === "loading" || loading || (authStatus === "authenticated" && roles === null) || processingInvite)) {
    const msgs = processingInvite ? ["Vinculando convite...", "Preparando seu espaço..."] : ["Verificando sua sessão...", "Carregando autenticação..."];
    return <BrainLoaderScreen messages={msgs} visible />;
  }


  // 4. Se não autenticado, login
  if (authStatus === "unauthenticated") {
    console.warn(`[RASTREADOR] Redirect para /auth disparado por: RootRouter`);
    return <Navigate to="/auth" replace />;
  }

  // 5. GOVERNANÇA DE ROLE SOBERANA (Anti-contaminação)
  const isProRole = roles?.some(r => ["nutritionist", "personal", "admin", "admin_master", "lojista"].includes(r));
  const isPatientRole = roles?.includes("patient");
  const savedContext = localStorage.getItem("fj_workspace_context");

  // Flow Profissional - Bloqueio de contaminação Patient
  if (isProRole && savedContext !== "patient") {
    // Se for admin, o target default deve ser /admin/dashboard se ele estiver tentando acessar algo admin
    // ou se não houver um nextPath definido.
    const isAdmin = roles?.some(r => ["admin", "admin_master"].includes(r));
    let defaultTarget = "/dashboard";
    
    if (isAdmin) {
      // Se for admin, preferimos o dashboard de admin se ele não tiver um nextPath específico de nutri
      defaultTarget = "/admin/dashboard";
    }

    const target = (nextPath && !nextPath.startsWith("/client")) ? nextPath : defaultTarget;
    console.warn(`[RASTREADOR] Redirect para ${target} disparado por: RootRouter (Pro Flow)`);
    return <Navigate to={target} replace />;
  }

  // Flow Paciente (Soberania do Onboarding Linear)
  if (isPatientRole) {
    const pState = (profile as any)?.patient_state;
    const onboardingCompleted = (profile as any)?.onboarding_completed;
    // 🛡️ FASE 3: Nova verdade única — camada de compatibilidade com legado (30 dias)
    const clinicalAssessmentCompleted = (profile as any)?.clinical_assessment_completed;
    
    console.log("[NAV] RootRouter -> Analyzing patient state", { pState, onboardingCompleted, clinicalAssessmentCompleted, hasConsent });

    // 1. Consentimento é a primeira barreira absoluta
    if (!hasConsent) {
      return <Navigate to="/consent" replace />;
    }

    // 2. SOBERANIA: Se avaliação clínica completa OU onboarding completo (legado) OU estado avançado → DASHBOARD.
    const isAdvancedState = pState === "ready_for_plan" || pState === "plan_generated" || pState === "active_plan";
    const isAssessmentDone = clinicalAssessmentCompleted === true || onboardingCompleted === true || isAdvancedState;
    
    if (isAssessmentDone) {
      const finalTarget = (nextPath && nextPath !== "/" && !nextPath.startsWith("/admin")) ? nextPath : "/client/dashboard";
      return <Navigate to={finalTarget} replace />;
    }

    // 3. Estados iniciais do Onboarding
    if (!pState || pState === "onboarding_slides") {
      const skipSlides = localStorage.getItem("fitjourney_skip_slides") === "true" || searchParams.get("skip_slides") === "true";
      if (skipSlides) return <Navigate to="/anamnesis" replace />;
      return <Navigate to="/onboarding/paciente" replace />;
    }
    
    // 4. FASE 2: pState 'anamnesis' vai direto para /anamnesis (sem passar pelo pipeline de 6 steps)
    if (pState === "anamnesis") {
      return <Navigate to="/anamnesis" replace />;
    }

    if (pState === "collecting_profile") {
      return <Navigate to="/client/dashboard" replace />;
    }

    // Fallback: Dashboard
    return <Navigate to="/client/dashboard" replace />;
  }

  // Fallback absoluto
  return <Navigate to={nextPath || "/client/dashboard"} replace />;
}
