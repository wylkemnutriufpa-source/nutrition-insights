import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import BrainLoader from "@/components/common/BrainLoader";

export default function Welcome() {
  const { roles, authStatus, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");

  useEffect(() => {
    if (authStatus === "loading") return;

    if (authStatus === "unauthenticated") {
      navigate("/auth", { replace: true });
      return;
    }

    if (authStatus === "authenticated") {
      // Deterministic navigation based ONLY on roles loaded from database
      if (roles.includes("nutritionist") || roles.includes("personal") || roles.includes("admin")) {
        navigate(nextPath || "/admin/dashboard", { replace: true });
        return;
      }

      if (roles.includes("patient")) {
        navigate(nextPath || "/client/dashboard", { replace: true });
        return;
      }

      // Fallback para quando o usuário está logado mas ainda não tem perfil/roles carregados
      // Se já carregou o status de auth mas os dados estão vazios, assumimos paciente como padrão seguro
      if (roles.length === 0) {
        console.log("[Welcome] Sem roles identificadas, direcionando para visão segura de paciente.");
        navigate(nextPath || "/client/dashboard", { replace: true });
        return;
      }
    }
  }, [roles, authStatus, profile, navigate, nextPath]);

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
