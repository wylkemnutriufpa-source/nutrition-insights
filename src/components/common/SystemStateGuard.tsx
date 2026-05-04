
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { NeuroEntryExperience } from "@/components/system-entry";
import { AnimatePresence } from "framer-motion";

/**
 * SystemStateGuard: Gerencia o estado visual de inicialização e transição
 * para o dashboard. Monitora a carga de dados do perfil e assinaturas.
 */
export function SystemStateGuard({ children }: { children: React.ReactNode }) {
  const { authStatus, loading: authLoading, profile } = useAuth();
  const [showExperience, setShowExperience] = useState(false);
  
  const dataReady = !authLoading && !!profile;

  // Se o usuário está autenticado e o perfil está pronto, mas ainda não mostramos a experiência
  useEffect(() => {
    if (authStatus === "authenticated" && dataReady && !sessionStorage.getItem("fj_entry_completed")) {
      setShowExperience(true);
    }
  }, [authStatus, dataReady]);

  const handleComplete = () => {
    sessionStorage.setItem("fj_entry_completed", "true");
    setShowExperience(false);
  };

  return (
    <>
      <AnimatePresence>
        {showExperience && (
          <NeuroEntryExperience 
            dataReady={dataReady} 
            onComplete={handleComplete} 
          />
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
