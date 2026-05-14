import React from "react";
import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import { useFeatureFlag } from "@/lib/featureFlags";

/**
 * SandboxV3Guard — ISOLAMENTO ABSOLUTO
 * Bloqueia qualquer acesso que não seja ADMIN_MASTER 
 * e garante que a flag V3_SANDBOX_ENABLED esteja ativa.
 */
export function SandboxV3Guard({ children }: { children: React.ReactNode }) {
  const { authStatus, isAdminMaster, loading: authLoading } = useAuth();
  const { enabled: sandboxEnabled, loading: flagLoading } = useFeatureFlag("V3_SANDBOX_ENABLED");

  if (authLoading || flagLoading) {
    return null;
  }

  // Regra Soberana: Somente Admin Master vê o Sandbox
  if (authStatus !== "authenticated" || !isAdminMaster || !sandboxEnabled) {
    console.error("[SANDBOX-V3] Acesso bloqueado: Role ou Flag insuficiente.");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
