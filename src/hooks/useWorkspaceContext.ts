import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";


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
  const context = useContext(WorkspaceContext);
  return context;
}

export function useWorkspaceContextState(isProRole: boolean, isPatient: boolean, authLoading: boolean) {
  const isHybridUser = isProRole && isPatient;

  // Read saved context from localStorage ONCE on mount — never let loading states overwrite it
  const [activeContext, setActiveContextState] = useState<WorkspaceContextType>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as WorkspaceContextType;
    if (saved === "patient" || saved === "professional") return saved;
    // No saved preference — default to professional
    return "professional";
  });

  // Track whether we've done the initial role-based resolution
  const hasResolvedRef = useRef(false);

  // Once auth finishes loading for the first time, resolve the context if no saved preference exists
  useEffect(() => {
    if (authLoading || hasResolvedRef.current) return;
    hasResolvedRef.current = true;

    const saved = localStorage.getItem(STORAGE_KEY) as WorkspaceContextType;
    if (saved === "patient" || saved === "professional") {
      // User has an explicit preference — respect it, but validate it makes sense
      if (!isHybridUser) {
        // Not hybrid: force correct context based on role
        const correctCtx = isProRole ? "professional" : "patient";
        if (saved !== correctCtx) {
          setActiveContextState(correctCtx);
          localStorage.setItem(STORAGE_KEY, correctCtx);
        }
      }
      // If hybrid, always respect saved preference
      return;
    }

    // No saved preference — set based on role
    const defaultCtx = isProRole ? "professional" : "patient";
    setActiveContextState(defaultCtx);
    localStorage.setItem(STORAGE_KEY, defaultCtx);
  }, [authLoading, isProRole, isPatient, isHybridUser]);

  const setContext = useCallback((ctx: WorkspaceContextType) => {
    setActiveContextState(ctx);
    localStorage.setItem(STORAGE_KEY, ctx);
    window.dispatchEvent(new CustomEvent("fj:workspace-context-change", { detail: ctx }));
  }, []);

  // During loading, use the saved/initial context — don't override based on incomplete role data
  const effectiveContext = authLoading
    ? activeContext
    : (isHybridUser ? activeContext : (isProRole ? "professional" : "patient"));

  const value = useMemo<WorkspaceContextValue>(() => ({
    activeContext: effectiveContext,
    setContext,
    isHybridUser,
    isProfessionalContext: effectiveContext === "professional",
    isPatientContext: effectiveContext === "patient",
  }), [effectiveContext, setContext, isHybridUser]);

  return value;
}
