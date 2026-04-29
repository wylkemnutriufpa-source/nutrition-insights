import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth";
import { TenantProvider } from "@/lib/tenantContext";
import { ExperienceModeContext, useExperienceModeState, useExperienceMode } from "@/hooks/useExperienceMode";
import { useEffect } from "react";
import { AppStateProvider } from "@/hooks/useAppState";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { GlobalErrorBoundary, CriticalErrorBoundary } from "@/components/common/GlobalErrorBoundary";
import { CelebrationProvider } from "@/components/common/SuccessCelebration";
import { CommandPaletteProvider } from "@/components/common/CommandPalette";
import { MobileAutoFixer } from "@/components/common/MobileAutoFixer";
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

export const CoreProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <CriticalErrorBoundary>
      <SystemShieldProvider>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <BrowserRouter>
                <RouterBootTracker />
                <AuthProvider>
                  {/* Tenant and Experience are dependent on Auth, so they must be nested inside */}
                  <TenantProvider>
                    <ExperienceModeProvider>
                      <AppStateProvider>
                        <CelebrationProvider>
                          <CommandPaletteProvider>
                            <ExperienceThemeSync />
                            <Toaster />
                            <Sonner />
                            <MobileAutoFixer />
                            <GlobalErrorBoundary />
                            <UpdateBanner />
                            <BuildVersionTag />
                            <Helmet>
                              <title>FitJourney</title>
                            </Helmet>
                            {/* 
                              Bootloader Pattern: Children are only rendered 
                              when the environment is stable enough.
                            */}
                            <SectionalErrorBoundary name="Aplicação">
                              {children}
                            </SectionalErrorBoundary>
                          </CommandPaletteProvider>
                        </CelebrationProvider>
                      </AppStateProvider>
                    </ExperienceModeProvider>
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
