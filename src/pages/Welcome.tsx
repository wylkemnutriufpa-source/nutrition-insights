import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth, AuthStatus } from "@/lib/auth";
import { BrainLoaderScreen } from "@/components/common/BrainLoader";

/**
 * Função utilitária para blindagem da navegação.
 * Garante que só navegamos quando o estado está 100% consolidado.
 */
function isNavigationReady(authStatus: AuthStatus, roles: string[]) {
  return authStatus === "authenticated" && roles.length > 0;
}

export default function Welcome() {
  const { roles, authStatus, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");
  const navigatedRef = useRef(false);

  useEffect(() => {
    // 1. Blindagem contra múltiplas navegações no mesmo ciclo
    if (navigatedRef.current) return;

    // 2. Se ainda está carregando o estado básico do auth, aguarda
    if (authStatus === "loading" || loading) return;

    // 3. Se não está autenticado, vai para login imediatamente
    if (authStatus === "unauthenticated") {
      navigatedRef.current = true;
      navigate("/auth", { replace: true });
      return;
    }

    // 4. Se está autenticado, aguarda a blindagem de roles
    if (isNavigationReady(authStatus, roles)) {
      navigatedRef.current = true;

      // Prioridade: Admin/Nutri/Personal
      if (roles.includes("nutritionist") || roles.includes("personal") || roles.includes("admin")) {
        navigate(nextPath || "/admin/dashboard", { replace: true });
        return;
      }

      // Fallback: Paciente
      if (roles.includes("patient")) {
        navigate(nextPath || "/client/dashboard", { replace: true });
        return;
      }

      // Se por algum motivo chegou aqui com roles mas nenhuma mapeada, 
      // evita loop ficando no loading ou tratando como erro (não faz nada)
      if (import.meta.env.DEV) {
        console.warn("[Welcome] Roles detected but no route match:", roles);
      }
    }
  }, [roles, authStatus, loading, navigate, nextPath]);

  // Mensagens de etapa baseadas no estado real do auth/roles
  const stageMessages =
    authStatus === "loading" || loading
      ? [
          "Verificando sua sessão…",
          "Carregando autenticação…",
          "Validando credenciais…",
        ]
      : authStatus === "authenticated" && roles.length === 0
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
