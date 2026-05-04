import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import { WorkspaceProvider } from "./WorkspaceProvider";
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
          <BrowserRouter>
            <AuthProvider>
              <WorkspaceProvider>
                <Helmet>
                  <title>FitJourney</title>
                </Helmet>
                {children}
                <Toaster />
                <Sonner />
              </WorkspaceProvider>
            </AuthProvider>

          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};