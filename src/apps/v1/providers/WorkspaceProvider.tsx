import { useAuth } from "@/lib/auth";
import { WorkspaceContext, useWorkspaceContextState } from "@/hooks/useWorkspaceContext";
import React from "react";

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const { isNutritionist, isPersonal, isAdmin, isPatient, loading } = useAuth();
  const isProRole = isNutritionist || isPersonal || isAdmin;
  const workspaceCtx = useWorkspaceContextState(isProRole, isPatient, loading);

  return (
    <WorkspaceContext.Provider value={workspaceCtx}>
      {children}
    </WorkspaceContext.Provider>
  );
};
