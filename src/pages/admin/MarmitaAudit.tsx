import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Utensils, AlertCircle, CheckCircle2, RefreshCw, 
  ArrowRight, Search, LayoutGrid, Filter, ChefHat
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface AuditedPlan {
  id: string;
  title: string;
  patient_name: string;
  patient_id: string;
  status: "ok" | "invalid" | "legacy";
  issues: string[];
  meals: {
    type: string;
    items: { title: string; is_primary: boolean }[];
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
        .order("created_at", { ascending: false });

      if (plansErr) throw plansErr;

      const audited: AuditedPlan[] = (plansData || []).map((plan: any) => {
        const issues: string[] = [];
        const items = plan.items || [];
        
        // Group by meal type
        const mealGroups: Record<string, any[]> = {};
        items.forEach((item: any) => {
          if (!mealGroups[item.meal_type]) mealGroups[item.meal_type] = [];
          mealGroups[item.meal_type].push(item);
        });

        const mealsWithMarmita = Object.entries(mealGroups).filter(([type, g]) => 
          g.some(i => i.title.toLowerCase().includes("marmita") || i.edit_metadata?.is_fixed)
        );

        mealsWithMarmita.forEach(([type, g]) => {
          const primary = g.filter(i => i.is_primary).length;
          const subs = g.filter(i => !i.is_primary).length;
          const hasGenericMarmita = g.some(i => i.title.toLowerCase().includes("marmita do dia"));

          if (hasGenericMarmita) issues.push(`${type}: Contém "Marmita do dia"`);
          if (primary !== 1) issues.push(`${type}: Deve ter exatamente 1 prato principal (tem ${primary})`);
          if (subs < 3 || subs > 4) issues.push(`${type}: Deve ter 3-4 substituições (tem ${subs})`);
        });

        let status: "ok" | "invalid" | "legacy" = "ok";
        if (issues.length > 0) status = "invalid";
        else if (mealsWithMarmita.length === 0) status = "ok";

        return {
          id: plan.id,
          title: plan.title,
          patient_id: plan.patient_id,
          patient_name: plan.profiles?.full_name || "Sem nome",
          status,
          issues,
          meals: Object.entries(mealGroups).map(([type, g]) => ({
            type,
            items: g.map(i => ({ title: i.title, is_primary: i.is_primary }))
          }))
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

  const fixPlan = async (planId: string) => {
    toast.loading("Corrigindo plano...", { id: planId });
    try {
      // 1. Fetch recipes for substitutions
      const { data: recipes } = await supabase
        .from("recipes")
        .select("title")
        .eq("category", "marmita")
        .limit(10);

      if (!recipes || recipes.length < 5) throw new Error("Não há receitas de marmita suficientes no sistema.");

      // 2. Get the plan items to fix
      const { data: items } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", planId);

      const itemsToUpdate = (items || []).filter(i => 
        i.title.toLowerCase().includes("marmita do dia") || 
        (i.meal_type === "dinner" && i.title.toLowerCase().includes("marmita"))
      );

      for (const item of itemsToUpdate) {
        // Replace with a specific recipe if it's generic
        if (item.title.toLowerCase().includes("marmita do dia")) {
          const recipe = recipes[Math.floor(Math.random() * recipes.length)];
          await supabase
            .from("meal_plan_items")
            .update({ title: recipe.title, is_primary: true })
            .eq("id", item.id);
        }
      }

      toast.success("Plano corrigido com sucesso!", { id: planId });
      runAudit();
    } catch (err: any) {
      toast.error("Erro ao corrigir: " + err.message, { id: planId });
    }
  };

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
            <p className="text-muted-foreground">Validação estrutural: 1 Prato Principal + 3-4 Substituições.</p>
          </div>
          <Button onClick={runAudit} disabled={loading} className="gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Auditar Agora
          </Button>
        </div>

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
              Inválidos ({plans.filter(p => p.status === "invalid").length})
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {filtered.map(plan => (
            <Card key={plan.id} className={plan.status === "invalid" ? "border-destructive/50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium">
                    {plan.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Paciente: {plan.patient_name}</p>
                </div>
                <Badge variant={plan.status === "ok" ? "default" : "destructive"}>
                  {plan.status === "ok" ? "OK" : "ESTRUTURA INVÁLIDA"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.issues.length > 0 && (
                    <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                      <h4 className="text-xs font-semibold text-destructive flex items-center gap-1 mb-1">
                        <AlertCircle className="w-3 h-3" /> Problemas Detectados
                      </h4>
                      <ul className="text-xs space-y-1">
                        {plan.issues.map((issue, i) => (
                          <li key={i} className="flex items-center gap-1 text-destructive/80">
                            • {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => fixPlan(plan.id)}
                    >
                      <ChefHat className="w-3.5 h-3.5 mr-1" />
                      Auto-Corrigir Estrutura
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => window.open(`/meal-plan-editor-v2/${plan.patient_id}?planId=${plan.id}`, "_blank")}
                    >
                      Abrir Editor
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed border-muted">
              <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-20" />
              <p className="text-muted-foreground">Nenhum plano com problemas encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
