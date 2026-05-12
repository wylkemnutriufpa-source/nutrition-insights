import { useAuth } from "@/lib/auth";
import React from "react";

  const { isNutritionist, isPersonal, isAdmin, isPatient, loading } = useAuth();
  const isProRole = isNutritionist || isPersonal || isAdmin;

  return (
    <WorkspaceContext.Provider value={workspaceCtx}>
      {children}
    </WorkspaceContext.Provider>
  );
};
