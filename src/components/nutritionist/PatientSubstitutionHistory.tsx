import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRightLeft, Flame, Beef, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";

interface SubstitutionRecord {
  id: string;
  original_food: string;
  substituted_food: string;
  substitution_category: string;
  original_calories: number;
  substituted_calories: number;
  original_protein: number;
  substituted_protein: number;
  created_at: string;
}

interface Props {
  patientId: string;
  mealPlanId?: string;
}

export default function PatientSubstitutionHistory({ patientId, mealPlanId }: Props) {
  const [records, setRecords] = useState<SubstitutionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      let query = supabase
        .from("patient_meal_substitutions" as any)
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (mealPlanId) {
        query = query.eq("meal_plan_id", mealPlanId);
      }

      const { data } = await query;
      setRecords((data || []) as unknown as SubstitutionRecord[]);
      setLoading(false);
    }
    fetch();
  }, [patientId, mealPlanId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">Nenhuma substituição registrada</p>
        <p className="text-xs mt-1">O paciente ainda não fez substituições no plano.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Histórico de Substituições</h3>
        </div>
        <Badge variant="outline" className="text-[10px]">{records.length} registros</Badge>
      </div>

      <ScrollArea className="max-h-[400px]">
        <div className="space-y-2">
          {records.map(r => {
            const calDiff = r.substituted_calories - r.original_calories;
            const protDiff = r.substituted_protein - r.original_protein;

            return (
              <div key={r.id} className="rounded-xl border border-border/50 bg-card/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <Badge variant="outline" className="text-[9px] ml-auto">{r.substitution_category}</Badge>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-muted-foreground line-through">{r.original_food}</span>
                  <ArrowRightLeft className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-semibold">{r.substituted_food}</span>
                </div>

                <div className="flex items-center gap-3 mt-2 text-[10px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Flame className="w-3 h-3 text-orange-400" />
                    {r.original_calories} → {r.substituted_calories}
                    <span className={`font-medium ${calDiff > 20 ? "text-orange-500" : calDiff < -20 ? "text-emerald-500" : "text-muted-foreground"}`}>
                      ({calDiff > 0 ? "+" : ""}{calDiff})
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Beef className="w-3 h-3 text-red-400" />
                    {r.original_protein}g → {r.substituted_protein}g
                    <span className={`font-medium ${protDiff > 3 ? "text-emerald-500" : protDiff < -3 ? "text-orange-500" : "text-muted-foreground"}`}>
                      ({protDiff > 0 ? "+" : ""}{protDiff.toFixed(0)}g)
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
