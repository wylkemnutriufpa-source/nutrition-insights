import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Clock, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { getPlanStatusMeta } from "@/lib/planStatusLabels";
import { classifyPlanLoadError, type ClassifiedPlanLoadError } from "@/lib/planLoadErrorClassifier";

interface Props { search: string; }

export default function WorkspaceMealPlans({ search }: Props) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ClassifiedPlanLoadError | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("meal_plans")
      .select("id, title, plan_status, is_active, created_at, patient_id")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (fetchError) {
      console.error("[WorkspaceMealPlans] Falha ao buscar planos:", fetchError);
      setError(classifyPlanLoadError(fetchError));
      setPlans([]);
      setLoading(false);
      return;
    }

    const rows = data || [];
    const patientIds = Array.from(new Set(rows.map((r: any) => r.patient_id).filter(Boolean)));
    const nameMap = new Map<string, string>();
    if (patientIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds);
      (profiles || []).forEach((p: any) => nameMap.set(p.user_id, p.full_name));
    }

    setPlans(rows.map((r: any) => ({ ...r, patient_name: nameMap.get(r.patient_id) || "Sem paciente" })));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  const filtered = plans.filter((p: any) => {
    if (!search) return true;
    const name = p.title || "";
    const patient = p.patient_name || "";
    return name.toLowerCase().includes(search.toLowerCase()) || patient.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Carregando planos...</div>;

  if (error) {
    return (
      <div
        data-testid="workspace-meal-plans-error"
        data-error-kind={error.kind}
        className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center"
      >
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium text-destructive">{error.title}</p>
          <p className="text-xs text-muted-foreground">{error.description}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void fetchPlans()}
          data-testid="workspace-meal-plans-retry"
        >
          <RefreshCw className="mr-2 h-3 w-3" aria-hidden />
          {error.retryLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground" data-testid="workspace-meal-plans-count">
        {filtered.length} planos encontrados
      </p>
      <div className="grid gap-2">
        {filtered.map((plan: any) => {
          const patient = plan.patient_name || "Sem paciente";
          const meta = getPlanStatusMeta(plan.plan_status);
          const isPublished = meta.bucket === "published";
          return (
            <Link
              key={plan.id}
              to={`/meal-plans/${plan.id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {isPublished
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <UtensilsCrossed className="w-4 h-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{plan.title || "Plano sem nome"}</p>
                <p className="text-xs text-muted-foreground">{patient}</p>
              </div>
              <Badge className={`text-[10px] ${meta.badgeClass}`}>{meta.label}</Badge>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {new Date(plan.created_at).toLocaleDateString("pt-BR")}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
