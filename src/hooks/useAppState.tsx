import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";

interface AppStateContextType {
  isReady: boolean;
  isDegraded: boolean;
  isLoading: boolean;
  isOrphan: boolean;
}

const AppStateContext = createContext<AppStateContextType>({
  isReady: false,
  isDegraded: false,
  isLoading: true,
  isOrphan: false,
});

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isDegraded, setIsDegraded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isOrphan = useMemo(() => profile?.is_orphan === true, [profile]);

  useEffect(() => {
    if (authLoading) return;

    if (user && profile) {
      setIsReady(true);
      setIsLoading(false);
      setIsDegraded(false);
    } else if (!user) {
      setIsReady(true);
      setIsLoading(false);
    } else {
      const timeout = setTimeout(() => {
        setIsDegraded(true);
        setIsLoading(false);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [user, profile, authLoading]);

  useEffect(() => {
    (window as any).__FJ_READY__ = isReady;
  }, [isReady]);

  return (
    <AppStateContext.Provider value={{ isReady, isDegraded, isLoading, isOrphan }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) throw new Error("useAppState must be used within AppStateProvider");
  return context;
}
