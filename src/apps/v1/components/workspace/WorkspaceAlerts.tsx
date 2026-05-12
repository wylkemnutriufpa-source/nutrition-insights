import { useEffect, useState } from "react";
import { supabase } from "@v1/integrations/supabase/client";
import { useAuth } from "@v1/lib/auth";
import { useTenant } from "@v1/lib/tenantContext";
import { withTenantFilter } from "@v1/lib/tenantQueryHelpers";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@v1/components/ui/badge";
import { Button } from "@v1/components/ui/button";

interface Props { search: string; }

export default function WorkspaceAlerts({ search }: Props) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      const { data } = await withTenantFilter(
        supabase
          .from("clinical_alerts")
          .select("*, profiles!clinical_alerts_patient_id_fkey(full_name)")
          .eq("nutritionist_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(30),
        tenantId
      );
      setAlerts(data || []);
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const resolve = async (id: string) => {
    await supabase.from("clinical_alerts").update({ is_active: false, resolved_at: new Date().toISOString(), resolved_by: user?.id }).eq("id", id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Carregando alertas...</div>;

  const severityColors: Record<string, string> = {
    critical: "bg-destructive/10 text-destructive border-destructive/30",
    high: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    medium: "bg-sky-500/10 text-sky-500 border-sky-500/30",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{alerts.length} alertas ativos</p>
      <div className="grid gap-2">
        {alerts.map((a: any) => {
          const patient = (a.profiles as any)?.full_name || "Paciente";
          return (
            <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl border ${severityColors[a.severity] || severityColors.low}`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.title}</p>
                <p className="text-xs opacity-70">{patient} • {a.description?.slice(0, 60)}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">{a.severity}</Badge>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => resolve(a.id)}>
                <CheckCircle2 className="w-3 h-3" /> Resolver
              </Button>
            </div>
          );
        })}
        {alerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">🎉 Nenhum alerta ativo!</p>}
      </div>
    </div>
  );
}
