
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
  const [showExperience, setShowExperience] = useState(true);
  
  // O estado "dataReady" indica que o perfil essencial e dados do sistema foram carregados
  const dataReady = !authLoading && !!profile;

  // Se já completou a experiência nesta sessão do componente
  const handleComplete = () => {
    setShowExperience(false);
  };

  // Se o usuário não está logado, não mostramos a experiência neuro (vamos para /auth)
  if (authStatus === "unauthenticated") {
    return <>{children}</>;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {showExperience && (
          <NeuroEntryExperience
            key="neuro-entry-guard"
            dataReady={dataReady}
            userRole={experienceRole}
            onComplete={handleComplete}
          />
        )}
      </AnimatePresence>

      <div className={showExperience ? "invisible h-0 overflow-hidden" : "visible"}>
        {children}
      </div>
    </>
  );
}
