import { createContext, useContext, useState, useCallback, useMemo } from "react";

export type WorkspaceContextType = "professional" | "patient";

const STORAGE_KEY = "fj_workspace_context";

export interface WorkspaceContextValue {
  /** Current active workspace context */
  activeContext: WorkspaceContextType;
  /** Switch between professional and patient contexts */
  setContext: (ctx: WorkspaceContextType) => void;
  /** Whether the user has both professional and patient roles */
  isHybridUser: boolean;
  /** Whether the user is currently in professional context */
  isProfessionalContext: boolean;
  /** Whether the user is currently in patient context */
  isPatientContext: boolean;
}

export const WorkspaceContext = createContext<WorkspaceContextValue>({
  activeContext: "professional",
  setContext: () => {},
  isHybridUser: false,
  isProfessionalContext: true,
  isPatientContext: false,
});

export function useWorkspaceContext() {
  return useContext(WorkspaceContext);
}

export function useWorkspaceContextState(isProRole: boolean, isPatient: boolean) {
  const isHybridUser = isProRole && isPatient;

  const [activeContext, setActiveContextState] = useState<WorkspaceContextType>(() => {
    if (!isHybridUser) return isProRole ? "professional" : "patient";
    const saved = localStorage.getItem(STORAGE_KEY) as WorkspaceContextType;
    return saved === "patient" ? "patient" : "professional";
  });

  const setContext = useCallback((ctx: WorkspaceContextType) => {
    setActiveContextState(ctx);
    localStorage.setItem(STORAGE_KEY, ctx);
    // Notify theme sync
    window.dispatchEvent(new CustomEvent("fj:workspace-context-change", { detail: ctx }));
  }, []);

  // If not hybrid, force the correct context
  const effectiveContext = isHybridUser ? activeContext : (isProRole ? "professional" : "patient");

  const value = useMemo<WorkspaceContextValue>(() => ({
    activeContext: effectiveContext,
    setContext,
    isHybridUser,
    isProfessionalContext: effectiveContext === "professional",
    isPatientContext: effectiveContext === "patient",
  }), [effectiveContext, setContext, isHybridUser]);

  return value;
}
