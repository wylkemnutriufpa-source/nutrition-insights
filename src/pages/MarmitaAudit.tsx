import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function MarmitaAudit() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);

  const fetchInconsistentPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("meal_plans")
        .select(`
          id,
          title,
          patient_id,
          profiles!meal_plans_patient_id_fkey(full_name),
          meal_plan_items(id, title, edit_metadata)
        `)
        .eq("plan_status", "published_to_patient");

      if (error) throw error;

      const inconsistent = data.filter(plan => {
        const items = plan.meal_plan_items || [];
        return items.some((item: any) => {
          const meta = item.edit_metadata || {};
          if (meta.is_fixed) {
            const subs = meta.substitutions_json || [];
            const hasGeneric = subs.some((s: string) => 
              s.toLowerCase().includes("marmita do dia") || 
              s.toLowerCase().includes("marmita dia")
            );
            return subs.length < 3 || subs.length > 4 || hasGeneric;
          }
          return false;
        });
      });

      setPlans(inconsistent);
    } catch (err: any) {
      toast.error("Erro ao buscar planos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInconsistentPlans();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Auditoria de Marmitas</h1>
            <p className="text-muted-foreground">Localize planos que ainda não seguem o padrão "1 Principal + 3-4 Substituições"</p>
          </div>
          <Button onClick={fetchInconsistentPlans} variant="outline" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : plans.length === 0 ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
              <h3 className="text-lg font-bold text-emerald-900">Tudo em conformidade!</h3>
              <p className="text-emerald-700">Não foram encontrados planos publicados com "marmita do dia" ou fora do padrão.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {plans.map((plan) => (
              <Card key={plan.id} className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.profiles?.full_name || "Paciente"}</CardTitle>
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                      Inconsistente
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Plano: {plan.title}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {plan.meal_plan_items.map((item: any) => {
                      const meta = item.edit_metadata || {};
                      if (!meta.is_fixed) return null;
                      const subs = meta.substitutions_json || [];
                      const isGeneric = subs.some((s: string) => s.toLowerCase().includes("marmita do dia"));
                      
                      if (subs.length < 3 || subs.length > 4 || isGeneric) {
                        return (
                          <div key={item.id} className="flex items-start gap-2 text-sm bg-white p-3 rounded-md border border-amber-200">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">{item.title}</p>
                              <p className="text-xs text-amber-800">
                                {isGeneric ? "⚠️ Contém 'marmita do dia'" : ""}
                                {subs.length < 3 ? `⚠️ Poucas substituições (${subs.length})` : ""}
                                {subs.length > 4 ? `⚠️ Muitas substituições (${subs.length})` : ""}
                              </p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="ml-auto h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                              onClick={() => window.open(`/editor/${plan.id}`, '_blank')}
                            >
                              <Search className="w-3.5 h-3.5 mr-1" /> Ajustar
                            </Button>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
