import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { BrainLoaderScreen } from "@/components/common/BrainLoader";
import { supabase } from "@/integrations/supabase/client";

export function RootRouter() {
  const { roles, authStatus, loading, profile, refreshProfile, user } = useAuth();
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

  // 3. Aguarda dados ficarem prontos (Auth Status + Roles + Invite Processing)
  if (authStatus === "loading" || loading || (authStatus === "authenticated" && roles === null) || processingInvite) {
    const msgs = processingInvite ? ["Vinculando convite...", "Preparando seu espaço..."] : ["Verificando sua sessão...", "Carregando autenticação..."];
    return <BrainLoaderScreen messages={msgs} visible />;
  }

  // 4. Se não autenticado, login
  if (authStatus === "unauthenticated") {
    console.warn(`[RASTREADOR] Redirect para /auth disparado por: RootRouter`);
    return <Navigate to="/auth" replace />;
  }

  // 5. Decisão de destino
  const effectiveRoles = roles && roles.length > 0 ? roles : ["patient"];
  const isProRole = effectiveRoles.includes("nutritionist") || effectiveRoles.includes("personal") || effectiveRoles.includes("admin");
  const savedContext = localStorage.getItem("fj_workspace_context");

  // Flow Profissional
  if (isProRole && savedContext !== "patient") {
    const target = (nextPath && nextPath !== "/admin/dashboard") ? nextPath : "/dashboard";
    console.warn(`[RASTREADOR] Redirect para ${target} disparado por: RootRouter (Pro Flow)`);
    return <Navigate to={target} replace />;
  }

  // Flow Paciente
  if (effectiveRoles.includes("patient")) {
    const pState = (profile as any)?.patient_state;
    const onboardingCompleted = (profile as any)?.onboarding_completed;
    
    console.log("[NAV] RootRouter -> Analyzing patient state", { pState, onboardingCompleted });

    if (onboardingCompleted === true) {
      return <Navigate to="/client/dashboard" replace />;
    }

    let target = "/client/dashboard";
    
    // Regras unificadas, garantindo que não caia no limbo
    if (!pState || pState === "onboarding_slides") target = "/onboarding/paciente";
    else if (pState === "anamnesis") target = "/anamnesis";
    else if (pState === "collecting_profile" || pState === "active_plan" || pState === "plan_generated" || pState === "ready_for_plan") {
      target = "/client/dashboard";
    }

    const isDefaultPath = nextPath === "/" || nextPath === "/dashboard" || nextPath === "/index" || nextPath === "/client/dashboard";
    const isAdminPath = nextPath?.startsWith("/admin/");
    const finalTarget = (nextPath && !isDefaultPath && !isAdminPath) ? nextPath : target;
    
    return <Navigate to={finalTarget} replace />;
  }

  // Fallback absoluto
  return <Navigate to={nextPath || "/client/dashboard"} replace />;
}
