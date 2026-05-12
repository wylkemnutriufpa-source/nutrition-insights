import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  AlertCircle, CheckCircle2, RefreshCw, 
  ArrowRight, Search, ChefHat, Info, Utensils
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface AuditedPlan {
  id: string;
  title: string;
  patient_name: string;
  patient_id: string;
  status: "ok" | "invalid" | "legacy";
  issues: string[];
  marmitaItems: {
    title: string;
    meal_type: string;
    subCount: number;
    hasGeneric: boolean;
  }[];
}

export default function MarmitaAudit() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<AuditedPlan[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "invalid">("all");

  const runAudit = useCallback(async () => {
    setLoading(true);
    try {
      const { data: plansData, error: plansErr } = await supabase
        .from("meal_plans")
        .select(`
          id, title, patient_id, 
          profiles:patient_id (full_name),
          items:meal_plan_items (id, title, is_primary, meal_type, edit_metadata)
        `)
        .eq("plan_status", "published_to_patient")
        .order("created_at", { ascending: false });

      if (plansErr) throw plansErr;

      const audited: AuditedPlan[] = (plansData || []).map((plan: any) => {
        const issues: string[] = [];
        const items = plan.items || [];
        const marmitaItems: any[] = [];

        items.forEach((item: any) => {
          const meta = item.edit_metadata || {};
          // A marmita é identificada se for marcada como fixa ou se o título contiver "marmita"
          const isMarmita = meta.is_fixed || item.title.toLowerCase().includes("marmita");
          
          if (isMarmita) {
            const subs = meta.substitutions_json || [];
            const genericTerms = ["marmita do dia", "marmita dia", "ver no app", "conferir"];
            const hasGeneric = subs.some((s: string) => genericTerms.some(term => s.toLowerCase().includes(term)));
            
            const subCount = subs.length;
            const itemIssues: string[] = [];
            
            if (hasGeneric) itemIssues.push(`${item.meal_type}: Contém termo genérico ("marmita do dia")`);
            if (subCount < 3 || subCount > 4) itemIssues.push(`${item.meal_type}: Deve ter 3-4 substituições (tem ${subCount})`);
            
            if (itemIssues.length > 0) {
              issues.push(...itemIssues);
              marmitaItems.push({
                title: item.title,
                meal_type: item.meal_type,
                subCount,
                hasGeneric
              });
            }
          }
        });

        return {
          id: plan.id,
          title: plan.title,
          patient_id: plan.patient_id,
          patient_name: plan.profiles?.full_name || "Sem nome",
          status: issues.length > 0 ? "invalid" : "ok",
          issues,
          marmitaItems
        };
      });

      setPlans(audited);
    } catch (err: any) {
      toast.error("Erro ao auditar planos: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runAudit();
  }, [runAudit]);

  const filtered = plans.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                         p.patient_name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || p.status === "invalid";
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Auditoria de Marmitas</h1>
            <p className="text-muted-foreground">Padrão obrigatório: 1 Prato Principal + 3-4 Substituições (sem genéricos).</p>
          </div>
          <Button onClick={runAudit} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Auditar Agora
          </Button>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-primary">Regra de Negócio:</p>
                <p className="text-muted-foreground">
                  Toda marmita fixa deve ter o prato principal definido e exatamente de 3 a 4 opções de substituição reais. 
                  O uso do termo "Marmita do dia" é proibido pois confunde o paciente sobre o que comer.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por plano ou paciente..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant={filter === "all" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFilter("all")}
            >
              Todos ({plans.length})
            </Button>
            <Button 
              variant={filter === "invalid" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFilter("invalid")}
              className={filter === "invalid" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Fora do Padrão ({plans.filter(p => p.status === "invalid").length})
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {filtered.map(plan => (
            <Card key={plan.id} className={plan.status === "invalid" ? "border-destructive/50 bg-destructive/5" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-bold">
                    {plan.patient_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.title}</p>
                </div>
                <Badge variant={plan.status === "ok" ? "default" : "destructive"}>
                  {plan.status === "ok" ? "OK" : "ESTRUTURA INVÁLIDA"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.issues.length > 0 && (
                    <div className="space-y-2">
                      {plan.marmitaItems.map((item, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-destructive/20 shadow-sm">
                          <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                            <Utensils className="w-4 h-4 text-primary" /> {item.title} ({item.meal_type})
                          </h4>
                          <ul className="text-xs space-y-1">
                            {item.hasGeneric && (
                              <li className="flex items-center gap-1 text-destructive font-semibold">
                                <AlertCircle className="w-3 h-3" /> Contém termo "Marmita do dia"
                              </li>
                            )}
                            {(item.subCount < 3 || item.subCount > 4) && (
                              <li className="flex items-center gap-1 text-destructive">
                                <AlertCircle className="w-3 h-3" /> Quantidade de substituições incorreta: {item.subCount} (esperado: 3-4)
                              </li>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(`/meal-plan-editor/${plan.id}`, "_blank")}
                    >
                      Corrigir no Editor
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed border-muted">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3 opacity-50" />
              <p className="text-muted-foreground">Tudo certo! Nenhum plano fora do padrão encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
