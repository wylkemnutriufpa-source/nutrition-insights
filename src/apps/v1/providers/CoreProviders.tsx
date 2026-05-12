import { Toaster } from "@v1/components/ui/toaster";
import { Toaster as Sonner } from "@v1/components/ui/sonner";
import { TooltipProvider } from "@v1/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@v1/lib/auth";
import { WorkspaceProvider } from "./WorkspaceProvider";
import { ExperienceProvider } from "./ExperienceProvider";
import { CommandPaletteProvider } from "@v1/components/common/CommandPalette";
import { BrowserRouter } from "react-router-dom";

import { Helmet, HelmetProvider } from "react-helmet-async";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: false, // Deterministic: fail fast
      refetchOnWindowFocus: false,
    },
  },
});

export const CoreProviders = ({ children }: { children: React.ReactNode }) => {
  console.log("[CoreProviders] Initializing simplified deterministic tree.");

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="v1-wrapper">
            <AuthProvider>
              <ExperienceProvider>
                <WorkspaceProvider>
                  <CommandPaletteProvider>
                    <Helmet>
                      <title>FitJourney</title>
                    </Helmet>
                    {children}
                    <Toaster />
                    <Sonner />
                  </CommandPaletteProvider>
                </WorkspaceProvider>
              </ExperienceProvider>
            </AuthProvider>

          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};