import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import BrainLoader from "@/components/common/BrainLoader";

export default function Welcome() {
  const { roles, authStatus, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");
  const navigatedRef = useRef(false);

  useEffect(() => {
    // Navega APENAS UMA VEZ, e só quando temos certeza absoluta do estado
    if (navigatedRef.current) return;
    if (loading) return;
    if (authStatus === "loading") return;

    if (authStatus === "unauthenticated") {
      navigatedRef.current = true;
      navigate("/auth", { replace: true });
      return;
    }

    if (authStatus === "authenticated") {
      // Aguarda roles OU profile estarem carregados — sem isso, não navega
      if (roles.length === 0 && !profile) {
        return; // permanece em loading visual
      }

      navigatedRef.current = true;

      if (roles.includes("nutritionist") || roles.includes("personal") || roles.includes("admin")) {
        navigate(nextPath || "/admin/dashboard", { replace: true });
        return;
      }

      if (roles.includes("patient")) {
        navigate(nextPath || "/client/dashboard", { replace: true });
        return;
      }

      // Sem role definida mas com profile: assume paciente como destino seguro
      navigate(nextPath || "/client/dashboard", { replace: true });
    }
  }, [roles, authStatus, profile, loading, navigate, nextPath]);

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
