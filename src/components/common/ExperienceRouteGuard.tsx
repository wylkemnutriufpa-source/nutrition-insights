
import { useLocation } from "react-router-dom";

/**
 * ExperienceRouteGuard simplificado.
 * Conforme instrução, NÃO bloqueia acesso nem redireciona.
 * Mantido apenas para compatibilidade de exportação se necessário.
 */
export default function ExperienceRouteGuard({ children }: { children: React.ReactNode }) {
  // Apenas renderiza os filhos sem nenhuma trava.
  return <>{children}</>;
}
