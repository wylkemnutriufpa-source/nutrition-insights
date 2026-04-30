import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import BrainLoader from "@/components/common/BrainLoader";

export default function Welcome() {
  const { user, roles, authStatus, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");

  useEffect(() => {
    // Regra 1: Se está carregando, não faz nada
    if (authStatus === "loading") {
      console.log("[Welcome] Auth pendente. Aguardando...");
      return;
    }

    // Regra 1.1: Erro na autenticação
    if (authStatus === "error") {
      console.error("[Welcome] Erro de autenticação detectado.");
      return; // O AuthProvider ou AppRoutes já devem lidar com a UI de erro
    }

    // Regra 2: Sem usuário após carregar auth -> Login
    if (authStatus === "unauthenticated") {
      console.log("[Welcome] Usuário não autenticado. Redirecionando para /auth");
      navigate("/auth", { replace: true });
      return;
    }

    // Regra 3: Se temos usuário, decidimos o destino de forma determinística
    const checkRedirection = () => {
      // 3.1. Prioridade Máxima: Onboarding Intencional (localStorage)
      const isInvited = localStorage.getItem("fj_invited") === "true";
      const invitedUserType = localStorage.getItem("fj_user_type");

      if (isInvited && invitedUserType === "patient") {
        console.log("[Welcome] Intenção de convite detectada. Indo para /consent");
        navigate("/consent", { replace: true });
        return;
      }

      // 3.2. Hint dos metadados (para novos usuários)
      const metaRole = user?.user_metadata?.role;
      const isProHint = metaRole === "nutritionist" || metaRole === "personal";

      // 3.3. Aguardar carregamento completo de roles e perfil
      // Se não temos profile ou roles ainda, mas somos pro hint, esperamos
      if ((!profile || roles.length === 0) && isProHint) {
        console.log("[Welcome] Profissional detectado via metadata. Aguardando sincronização do banco...");
        return;
      }

      // Se temos usuário mas nada carregou e não temos hint, aguardamos um pouco mais
      if (!profile && authStatus === "authenticated") {
        console.log("[Welcome] Aguardando perfil...");
        return; 
      }

      // 3.4. Limpeza de estado se já temos profile + roles
      if (profile && roles.length > 0) {
        localStorage.removeItem("fj_invited");
        localStorage.removeItem("fj_user_type");
      }

      // 3.5. Decisão baseada em Roles (Profissional/Admin)
      if (roles.includes("nutritionist") || roles.includes("personal") || (roles as string[]).includes("admin")) {
        console.log("[Welcome] Role Profissional/Admin detectada.");
        navigate(nextPath || "/admin/dashboard", { replace: true });
        return;
      }

      // 3.6. Decisão baseada em Role (Paciente)
      if (roles.includes("patient")) {
        console.log("[Welcome] Role Paciente detectada.");
        navigate(nextPath || "/client/dashboard", { replace: true });
        return;
      }

      // 3.7. Fallback Determinístico para Profissional (Regra de Ouro)
      // Se o usuário veio pelo fluxo de registro profissional (metaRole), NUNCA vai para o fluxo de paciente
      if (isProHint) {
        console.log("[Welcome] Redirecionando profissional via metadata hint.");
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      // 3.8. Fallback de Segurança: Se logado mas sem role definida no banco e sem convite
      if (profile) {
        navigate("/client/dashboard", { replace: true });
      }
    };

    checkRedirection();
  }, [user, roles, authStatus, profile, navigate, nextPath]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="max-w-md w-full text-center space-y-8 p-6">
        <div className="flex justify-center">
          <BrainLoader />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-display animate-pulse">
            Sincronizando sua jornada...
          </h1>
          <p className="text-muted-foreground text-sm">
            Preparando seu ambiente personalizado.
          </p>
        </div>
      </div>
    </div>
  );
}
