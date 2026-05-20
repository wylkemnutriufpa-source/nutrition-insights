import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, Navigate } from "react-router-dom";
import PageLoader from "@/components/common/PageLoader";

// Timeout máximo esperando roles resolverem (ms).
// Após esse tempo, se o usuário está autenticado mas roles ainda é null,
// tratamos como roles vazias e deixamos o app continuar.
const ROLES_TIMEOUT_MS = 6000;

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authStatus, roles, user, isLoaded } = useAuth();
  const location = useLocation();
  const [rolesTimedOut, setRolesTimedOut] = useState(false);

  // Escape hatch: se roles não resolver em ROLES_TIMEOUT_MS, desbloqueia
  useEffect(() => {
    if (authStatus !== "authenticated" || roles !== null || isLoaded) return;
    const t = setTimeout(() => {
      console.warn("[ProtectedRoute] Roles timeout — desbloqueando app com roles vazias.");
      setRolesTimedOut(true);
    }, ROLES_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [authStatus, roles, isLoaded]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      console.warn(`[RASTREADOR] Redirect para /auth disparado por: ProtectedRoute`);
      console.log(`[RASTREADOR] Estado: user=${!!user}, roles=${roles}, path=${location.pathname}`);
    }
  }, [authStatus, roles, location.pathname, user]);

  // Aguarda auth + roles, mas com escape hatch por timeout ou isLoaded
  const waitingForRoles =
    authStatus === "authenticated" && roles === null && !isLoaded && !rolesTimedOut;

  if (authStatus === "loading" || waitingForRoles) {
    return <PageLoader />;
  }

  if (authStatus !== "authenticated") {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  return <>{children}</>;
}
