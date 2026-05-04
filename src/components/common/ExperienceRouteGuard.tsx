import { useExperienceMode } from "@/hooks/useExperienceMode";
import { ReactNode } from "react";

/**
 * ExperienceRouteGuard simplificado.
 * Conforme instrução, NÃO bloqueia acesso nem redireciona.
 * Serve para que componentes filhos saibam o modo atual.
 */
export default function ExperienceRouteGuard({ children, feature }: { children: ReactNode; feature?: string }) {
  const { isFeatureEnabled } = useExperienceMode();
  
  // No modo recuperação total, não bloqueamos rotas.
  // Mas se quisermos apenas esconder o conteúdo (mantendo a rota), poderíamos fazer:
  // if (feature && !isFeatureEnabled(feature)) return null;

  return <>{children}</>;
}
