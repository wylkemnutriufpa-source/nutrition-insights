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

  // Define if we should block navigation for invitation processing
  const [processingInvite, setProcessingInvite] = useState(() => {
    return !!localStorage.getItem("fitjourney_invite_code");
  });

  // 1. Resolve stuck roles
  useEffect(() => {
    if (authStatus === "authenticated" && roles === null) {
      const timer = setTimeout(() => {
        console.warn("[NAV] RootRouter -> Roles still null after 5s, forcing refresh...");
        refreshProfile().catch(() => {
          setError("Falha ao carregar permissões. Tente novamente.");
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [authStatus, roles, refreshProfile]);

  useEffect(() => {
    async function processInvite() {
      if (!processingInvite || !user?.id || !roles || !roles.includes("patient")) {
        if (!processingInvite || (roles && !roles.includes("patient")) || authStatus === "unauthenticated") {
          setProcessingInvite(false);
        }
        return;
      }

      const pendingCode = localStorage.getItem("fitjourney_invite_code");
      if (!pendingCode) {
        setProcessingInvite(false);
        return;
      }

      console.log("[RootRouter] Processando convite pendente:", pendingCode);
      try {
        const { data } = await supabase.rpc("complete_invitation" as any, {
          _code: pendingCode,
          _patient_user_id: user.id,
        });

        if (data) {
          console.log("[RootRouter] Convite vinculado com sucesso!");
          localStorage.removeItem("fitjourney_invite_code");
          await refreshProfile();
        }
      } catch (err) {
        console.error("[RootRouter] Erro ao vincular convite pendente:", err);
        localStorage.removeItem("fitjourney_invite_code");
      } finally {
        setProcessingInvite(false);
      }
    }
    
    processInvite();
  }, [processingInvite, user?.id, roles, authStatus, refreshProfile]);

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

  // 3. Aguarda dados ficarem prontos (Auth Status + Roles + Invite Processing + Consent)
  if (authStatus === "loading" || loading || (authStatus === "authenticated" && roles === null) || processingInvite || (authStatus === "authenticated" && consentLoading)) {
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
    
    console.log("[NAV] RootRouter -> Analyzing patient state", { pState, onboardingCompleted, hasConsent });

    // 1. Consentimento é a primeira barreira absoluta
    if (!hasConsent) {
      return <Navigate to="/consent" replace />;
    }

    // 2. NOVA GOVERNANÇA SOBERANA: Se onboarding está completo OU se existe pState avançado, DASHBOARD.
    // Não bloqueamos mais o dashboard por flags se o pState indica que o paciente já passou das fases iniciais.
    const isAdvancedState = pState === "ready_for_plan" || pState === "plan_generated" || pState === "active_plan";
    
    if (onboardingCompleted === true || isAdvancedState) {
      const finalTarget = (nextPath && nextPath !== "/" && !nextPath.startsWith("/admin")) ? nextPath : "/client/dashboard";
      return <Navigate to={finalTarget} replace />;
    }

    // 3. Estados intermediários do Onboarding (Apenas se pState for inicial)
    if (!pState || pState === "onboarding_slides") {
      return <Navigate to="/onboarding/paciente" replace />;
    }
    
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
