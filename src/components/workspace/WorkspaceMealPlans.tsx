import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Clock, CheckCircle2 } from "lucide-react";

interface Props { search: string; }

export default function WorkspaceMealPlans({ search }: Props) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("id, title, plan_status, is_active, created_at, patient_id")
        .eq("nutritionist_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[WorkspaceMealPlans] Falha ao buscar planos:", error);
        setPlans([]);
        setLoading(false);
        return;
      }

      const rows = data || [];
      const patientIds = Array.from(new Set(rows.map((r: any) => r.patient_id).filter(Boolean)));
      let nameMap = new Map<string, string>();
      if (patientIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", patientIds);
        (profiles || []).forEach((p: any) => nameMap.set(p.user_id, p.full_name));
      }

      setPlans(rows.map((r: any) => ({ ...r, patient_name: nameMap.get(r.patient_id) || "Sem paciente" })));
      setLoading(false);
    };
    fetchPlans();
  }, [user?.id]);

  const filtered = plans.filter((p: any) => {
    if (!search) return true;
    const name = p.title || "";
    const patient = p.patient_name || "";
    return name.toLowerCase().includes(search.toLowerCase()) || patient.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) return <div className="text-sm text-muted-foreground py-8 text-center">Carregando planos...</div>;

  const stateColors: Record<string, string> = {
    published_to_patient: "bg-emerald-500/10 text-emerald-500",
    published: "bg-emerald-500/10 text-emerald-500",
    approved: "bg-sky-500/10 text-sky-500",
    under_professional_review: "bg-amber-500/10 text-amber-500",
    draft_auto_corrected: "bg-amber-500/10 text-amber-500",
    draft_auto_generated: "bg-muted text-muted-foreground",
    draft: "bg-muted text-muted-foreground",
    archived: "bg-muted text-muted-foreground",
  };

  const stateLabels: Record<string, string> = {
    published_to_patient: "publicado",
    published: "publicado",
    approved: "aprovado",
    under_professional_review: "em revisão",
    draft_auto_corrected: "rascunho corrigido",
    draft_auto_generated: "rascunho gerado",
    draft: "rascunho",
    archived: "arquivado",
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{filtered.length} planos encontrados</p>
      <div className="grid gap-2">
        {filtered.map((plan: any) => {
          const patient = plan.patient_name || "Sem paciente";
          const state = plan.plan_status || "draft";
          const isPublished = state === "published" || state === "published_to_patient";
          return (
            <Link
              key={plan.id}
              to={`/meal-plan/${plan.id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {isPublished ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <UtensilsCrossed className="w-4 h-4 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{plan.title || "Plano sem nome"}</p>
                <p className="text-xs text-muted-foreground">{patient}</p>
              </div>
              <Badge className={`text-[10px] ${stateColors[state] || stateColors.draft}`}>
                {stateLabels[state] || state}
              </Badge>
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
