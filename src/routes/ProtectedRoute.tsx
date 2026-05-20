import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, Navigate } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authStatus, roles, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      console.warn(`[RASTREADOR] Redirect para /auth disparado por: ProtectedRoute`);
      console.log(`[RASTREADOR] Estado: user=${!!user}, roles=${roles}, path=${location.pathname}`);
    }
  }, [authStatus, roles, location.pathname, user]);

  if (authStatus === "loading" || (authStatus === "authenticated" && roles === null)) {
    return <PageLoader />;
  }

  
  if (authStatus !== "authenticated") {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }
  
  return <>{children}</>;
}
