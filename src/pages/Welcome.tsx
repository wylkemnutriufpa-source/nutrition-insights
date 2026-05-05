import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, AuthStatus } from "@/lib/auth";
import { BrainLoaderScreen } from "@/components/common/BrainLoader";

/**
 * Função utilitária para blindagem da navegação.
 * Garante que só navegamos quando o estado está 100% consolidado.
 */
function isNavigationReady(authStatus: AuthStatus, roles: string[] | null) {
  return authStatus === "authenticated" && roles !== null;
}

export default function Welcome() {
  const { roles, authStatus, loading, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");
  const navigatedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Blindagem contra múltiplas navegações
    if (navigatedRef.current) return;

    // 2. Se ainda está carregando, aguarda
    if (authStatus === "loading" || loading) return;

    // 3. Se não está autenticado, vai para login
    if (authStatus === "unauthenticated") {
      console.log("[NAV] Welcome -> Redirecting to /auth (Not authenticated)");
      navigatedRef.current = true;
      navigate("/auth", { replace: true });
      return;
    }

    // 4. Se está autenticado mas sem roles (stuck detection)
    if (authStatus === "authenticated" && roles === null) {
      const timer = setTimeout(() => {
        console.warn("[NAV] Welcome -> Roles still null after 5s, forcing refresh...");
        refreshProfile().catch(err => {
          console.error("[NAV] Welcome -> Refresh failed:", err);
          setError("Falha ao carregar permissões. Tente novamente.");
        });
      }, 5000);
      return () => clearTimeout(timer);
    }

    // 5. Se roles consolidado, decide destino
    if (isNavigationReady(authStatus, roles)) {
      navigatedRef.current = true;
      
      // Fallback: se roles vazio, trata como paciente
      const effectiveRoles = roles.length === 0 ? ["patient"] : roles;

      // Prioridade Pro
      if (effectiveRoles.includes("nutritionist") || effectiveRoles.includes("personal") || effectiveRoles.includes("admin")) {
        const target = nextPath || "/admin/dashboard";
        console.log("[NAV] Welcome -> Admin/Pro Flow", { roles: effectiveRoles, target });
        navigate(target, { replace: true });
        return;
      }

      // Flow Paciente
      if (effectiveRoles.includes("patient")) {
        // Garantir que temos o estado mais recente do banco
        const pState = (profile as any)?.patient_state || "onboarding_slides";
        const onboardingCompleted = (profile as any)?.onboarding_completed;
        
        // Regra de Ouro: se pState for null, concluído ou active_plan, vai para dashboard
        let target = "/client/dashboard";
        
        if (pState === "onboarding_slides") target = "/onboarding/paciente";
        else if (pState === "anamnesis") target = "/anamnesis";
        else if (pState === "collecting_profile") target = "/client/dashboard"; // Fallback
        
        // Se onboarding_completed for true, SEMPRE vai para dashboard (segurança extra)
        if (onboardingCompleted) {
          target = "/client/dashboard";
        }
        
        const isDefaultPath = nextPath === "/" || nextPath === "/dashboard" || nextPath === "/index";
        const finalTarget = (nextPath && !isDefaultPath) ? nextPath : target;
        
        console.log("[NAV] Welcome -> Patient Flow", { 
          state: pState, 
          target: finalTarget, 
          onboardingCompleted
        });
        
        navigate(finalTarget, { replace: true });
        return;
      }

      // Último recurso
      console.log("[NAV] Welcome -> Default Fallback", { roles: effectiveRoles });
      navigate(nextPath || "/client/dashboard", { replace: true });
    }
  }, [roles, authStatus, loading, navigate, nextPath, profile, refreshProfile]);

  // Mensagens de etapa baseadas no estado real do auth/roles
  const stageMessages =
    authStatus === "loading" || loading
      ? [
          "Verificando sua sessão…",
          "Carregando autenticação…",
          "Validando credenciais…",
        ]
      : authStatus === "authenticated" && roles === null
      ? [
          "Carregando suas permissões…",
          "Sincronizando perfil clínico…",
          "Preparando seu workspace…",
        ]
      : [
          "Quase lá…",
          "Direcionando para sua jornada…",
        ];

  return <BrainLoaderScreen messages={stageMessages} visible />;
}
