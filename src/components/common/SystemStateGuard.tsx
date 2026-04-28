import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { validateSystemState, fjLog } from "@/utils/dataSafety";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";
import FitJourneyLogo from "@/components/common/FitJourneyLogo";

/**
 * Global Guard to ensure the system is in a consistent state.
 * Prevents access if tenant_id or other critical properties are missing.
 */
export function SystemStateGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isPatient } = useAuth();
  const { tenantId, isLoading: tenantLoading } = useTenant();
  const [error, setError] = useState<{ reason: string } | null>(null);

  useEffect(() => {
    if (authLoading || tenantLoading || !user) return;

    // We only strictly enforce for patients in this context
    if (isPatient) {
      const result = validateSystemState({ userId: user.id, tenantId });
      if (!result.valid) {
        fjLog("CRITICAL", `System state guard failed: ${result.reason}`);
        setError({ reason: result.reason || "UNKNOWN" });
      } else {
        setError(null);
      }
    }
  }, [user, tenantId, authLoading, tenantLoading, isPatient]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-6 animate-in fade-in zoom-in-95">
          <div className="mb-8 flex justify-center"><FitJourneyLogo size="lg" /></div>
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto" />
          <Card className="border-destructive/20 bg-destructive/5 backdrop-blur-sm shadow-2xl">
            <CardContent className="pt-8 pb-8 space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Acesso Bloqueado</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Detectamos uma inconsistência crítica no seu perfil de acesso. 
                Isso pode acontecer se sua conta não estiver corretamente vinculada a um profissional.
              </p>
              
              <div className="p-3 bg-background border border-border rounded-lg text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Detalhes Técnicos</p>
                <p className="text-xs font-mono break-all text-destructive">REASON: {error.reason}</p>
                <p className="text-xs font-mono break-all text-muted-foreground mt-1">USER_ID: {user?.id}</p>
              </div>

              <div className="grid gap-3 pt-4">
                <Button onClick={() => window.location.reload()} className="w-full h-12 gap-2">
                  <RefreshCw className="w-4 h-4" /> Recarregar Sistema
                </Button>
                <Button variant="outline" onClick={() => window.location.href = "/auth"} className="w-full h-12">
                  Voltar ao Login
                </Button>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Se o problema persistir, entre em contato com seu nutricionista.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}