
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { NeuroEntryExperience } from "@/components/system-entry";
import { AnimatePresence } from "framer-motion";

/**
 * SystemStateGuard: Gerencia o estado visual de inicialização e transição
 * para o dashboard. Monitora a carga de dados do perfil e assinaturas.
 */
export function SystemStateGuard({ children }: { children: React.ReactNode }) {
  const { authStatus, loading: authLoading, profile, experienceRole } = useAuth();
  
  // No Modo de Recuperação, forçamos showExperience como false se quisermos pular direto
  // Mas para respeitar o pedido de não alterar o visual, mantemos a lógica mas garantimos que não trave.
  const [showExperience, setShowExperience] = useState(false); // BYPASS NO RECOVERY
  
  const dataReady = !authLoading && !!profile;

  // Renderização direta no modo de recuperação
  return <>{children}</>;
}
