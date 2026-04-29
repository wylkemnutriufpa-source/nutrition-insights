import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import BrainLoader from "@/components/common/BrainLoader";

export default function Welcome() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");

  useEffect(() => {
    // Se ainda está carregando o auth básico (usuário/sessão), espera
    if (loading && !user) return;

    // Se não tem usuário após carregar, volta pro login
    if (!loading && !user) {
      navigate("/auth", { replace: true });
      return;
    }

    // Se temos usuário, decidimos o destino
    const checkRedirection = () => {
      // 1. Verificar Intenção Capturada (Regra de Ouro do Onboarding)
      const isInvited = localStorage.getItem("fj_invited") === "true";
      const invitedUserType = localStorage.getItem("fj_user_type");

      if (isInvited && invitedUserType === "patient") {
        console.log("[Welcome] Intenção de paciente detectada. Indo para consentimento.");
        navigate("/consent", { replace: true });
        return;
      }

      // 2. Se não é convite, aguardamos roles se estiverem carregando (apenas se user existir)
      if (loading && user) {
        console.log("[Welcome] Aguardando metadados (roles)...");
        return;
      }

      // 3. Decisão baseada em Roles
      if (roles.includes("nutritionist") || roles.includes("personal") || (roles as string[]).includes("admin")) {
        console.log("[Welcome] Perfil profissional/admin detectado.");
        navigate(nextPath || "/admin/dashboard", { replace: true });
        return;
      }

      if (roles.includes("patient")) {
        console.log("[Welcome] Perfil paciente detectado.");
        navigate(nextPath || "/client/dashboard", { replace: true });
        return;
      }

      // 4. Fallback de Segurança (Regra 5: Não redirecionar para "/" se logado)
      // Se chegamos aqui, o usuário está logado mas o sistema ainda não processou as roles.
      // Em vez de "/" (que causaria loop), mantemos no loading até que as roles apareçam
      // ou o timeout de 10s do AuthProvider resolva.
      console.log("[Welcome] Usuário logado sem roles definidas. Aguardando sincronização...");
    };

    checkRedirection();
  }, [user, roles, loading, navigate]);

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
