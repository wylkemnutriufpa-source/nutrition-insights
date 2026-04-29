import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth";
import { TenantProvider } from "@/lib/tenantContext";
import { ExperienceModeContext, useExperienceModeState, useExperienceMode } from "@/hooks/useExperienceMode";
import { useEffect, useState } from "react";
import { AppStateProvider } from "@/hooks/useAppState";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { GlobalErrorBoundary, CriticalErrorBoundary } from "@/components/common/GlobalErrorBoundary";
import { CelebrationProvider } from "@/components/common/SuccessCelebration";
import { CommandPaletteProvider } from "@/components/common/CommandPalette";
import { UpdateBanner } from "@/components/common/UpdateBanner";
import { UpdateBanner } from "@/components/common/UpdateBanner";
import { BuildVersionTag } from "@/components/common/BuildVersionTag";
import { BrowserRouter, useLocation } from "react-router-dom";
import { SystemShieldProvider, useSystemShield } from "@/components/common/SystemShield";
import { SectionalErrorBoundary } from "@/components/common/SectionalErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
  },
});

function ExperienceModeProvider({ children }: { children: React.ReactNode }) {
  const { isPatient, isNutritionist, isPersonal, isAdmin } = useAuth();
  const isProRole = isNutritionist || isPersonal || isAdmin;
  const role = (isPatient && !isProRole) ? "patient" : "professional";
  const value = useExperienceModeState(role);
  return <ExperienceModeContext.Provider value={value}>{children}</ExperienceModeContext.Provider>;
}

function ExperienceThemeSync() {
  const { mode } = useExperienceMode();
  const { isNutritionist, isPersonal, isAdmin, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    const role = (isNutritionist || isPersonal || isAdmin) ? "professional" : "patient";
    document.documentElement.setAttribute("data-experience-mode", mode);
    document.documentElement.setAttribute("data-experience-role", role);
  }, [mode, isNutritionist, isPersonal, isAdmin, loading]);
  return null;
}

function RouterBootTracker() {
  const shield = useSystemShield();
  const location = useLocation();
  
  useEffect(() => {
    if (shield && location.pathname) {
      shield.reportBootStatus("isRouterActive", true);
    }
  }, [location, shield]);
  
  return null;
}

// StabilityMonitor removido para garantir comportamento fail-fast e previsível.


export const CoreProviders = ({ children }: { children: React.ReactNode }) => {
  console.log("[CoreProviders] Inicializando árvore de componentes.");
  
  if (!children) {
    console.error("[CoreProviders] CRÍTICO: Children está NULO!");
  }

  return (
    <CriticalErrorBoundary>
      <SystemShieldProvider>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <BrowserRouter>
                <RouterBootTracker />
                <AuthProvider>
                  <TenantProvider>
                    <AppStateProvider>
                      <ExperienceModeProvider>
                        <CelebrationProvider>
                          <CommandPaletteProvider>
                            <ExperienceThemeSync />
                            <Toaster />
                            <Sonner />
                            <GlobalErrorBoundary />
                            <UpdateBanner />
                            <BuildVersionTag />
                            <Helmet>
                              <title>FitJourney</title>
                            </Helmet>
                            <SectionalErrorBoundary name="Aplicação">
                              {children || (
                                <div className="min-h-screen flex items-center justify-center bg-black text-red-500 font-mono p-10 text-center border-4 border-red-600">
                                  <div>
                                    <h1 className="text-3xl font-bold mb-4 underline">FALHA CRÍTICA DE RENDERIZAÇÃO</h1>
                                    <p>O aplicativo tentou renderizar um conteúdo vazio (null).</p>
                                    <p className="mt-4 text-xs opacity-70">Verifique os logs do console para mais detalhes.</p>
                                    <button 
                                      onClick={() => window.location.reload()}
                                      className="mt-8 px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                                    >
                                      RECARREGAR FORÇADO
                                    </button>
                                  </div>
                                </div>
                              )}
                            </SectionalErrorBoundary>
                          </CommandPaletteProvider>
                        </CelebrationProvider>
                      </ExperienceModeProvider>
                    </AppStateProvider>
                  </TenantProvider>
                </AuthProvider>
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </HelmetProvider>
      </SystemShieldProvider>
    </CriticalErrorBoundary>
  );
};
