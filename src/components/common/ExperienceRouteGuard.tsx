import { useExperienceMode } from "@/hooks/useExperienceMode";
import { ReactNode } from "react";

/**
 * ExperienceRouteGuard simplificado.
 * Conforme instrução, NÃO bloqueia acesso nem redireciona.
 * Serve para que componentes filhos saibam o modo atual.
 */
export default function ExperienceRouteGuard({ children, feature }: { children: ReactNode; feature?: string }) {
  const { isFeatureEnabled } = useExperienceMode();
  
  if (feature && !isFeatureEnabled(feature)) {
    console.warn(`[ExperienceMode] Feature "${feature}" is blocked for current mode.`);
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Shield className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">Funcionalidade restrita</h2>
        <p className="text-muted-foreground max-w-md">
          Esta funcionalidade não está disponível no seu plano ou modo de experiência atual.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
