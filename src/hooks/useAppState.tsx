import { createContext, useContext, ReactNode } from "react";

interface AppStateContextType {
  isReady: boolean;
  isDegraded: boolean;
  isLoading: boolean;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children, value }: { children: ReactNode; value: AppStateContextType }) {
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
}
