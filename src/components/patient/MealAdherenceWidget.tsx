import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, MinusCircle, AlertCircle, TrendingUp,
  TrendingDown, Minus, Utensils, Coffee, Apple, Cookie, Moon, Sun,
} from "lucide-react";

interface MealAdherenceWidgetProps {
  patientId: string;
}

interface CompletionRow {
  adherence_status: string;
  date: string;
  meal_plan_item_id: string;
}

interface MealPlanItemRow {
  id: string;
  tipo_refeicao: string;
  meal_plan_id: string;
}

const MEAL_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  breakfast: { label: "Café", icon: <Coffee className="w-3.5 h-3.5" /> },
  morning_snack: { label: "Lanche AM", icon: <Apple className="w-3.5 h-3.5" /> },
  lunch: { label: "Almoço", icon: <Utensils className="w-3.5 h-3.5" /> },
  afternoon_snack: { label: "Lanche PM", icon: <Cookie className="w-3.5 h-3.5" /> },
  dinner: { label: "Jantar", icon: <Moon className="w-3.5 h-3.5" /> },
  evening_snack: { label: "Ceia", icon: <Sun className="w-3.5 h-3.5" /> },
};

export default function MealAdherenceWidget({ patientId }: MealAdherenceWidgetProps) {
  const [adherence7d, setAdherence7d] = useState<number | null>(null);
  const [adherencePrev7d, setAdherencePrev7d] = useState<number | null>(null);
  const [perMealType, setPerMealType] = useState<Record<string, { followed: number; total: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdherence();
  }, [patientId]);

  async function fetchAdherence() {
    setLoading(true);
    const today = new Date();
    const d7 = new Date(today);
    d7.setDate(d7.getDate() - 7);
    const d14 = new Date(today);
    d14.setDate(d14.getDate() - 14);

    const todayStr = today.toISOString().split("T")[0];
    const d7Str = d7.toISOString().split("T")[0];
    const d14Str = d14.toISOString().split("T")[0];

    // Get active meal plan
    const { data: planData } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("patient_id", patientId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!planData) {
      setLoading(false);
      return;
    }

    // Fetch items and completions in parallel
    const [itemsRes, comp7dRes, compPrev7dRes] = await Promise.all([
      supabase
        .from("meal_plan_items")
        .select("id, tipo_refeicao, meal_plan_id")
        .eq("meal_plan_id", planData.id),
      supabase
        .from("meal_item_completions")
        .select("adherence_status, date, meal_plan_item_id")
        .eq("patient_id", patientId)
        .eq("meal_plan_id", planData.id)
        .gte("date", d7Str)
        .lte("date", todayStr),
      supabase
        .from("meal_item_completions")
        .select("adherence_status, date, meal_plan_item_id")
        .eq("patient_id", patientId)
        .eq("meal_plan_id", planData.id)
        .gte("date", d14Str)
        .lt("date", d7Str),
    ]);

    const items = (itemsRes.data || []) as MealPlanItemRow[];
    const comp7d = (comp7dRes.data || []) as CompletionRow[];
    const compPrev = (compPrev7dRes.data || []) as CompletionRow[];

    // Items per day (7 days × items per day_of_week)
    const itemsPerDay = items.length / 7; // approximate
    const totalExpected7d = Math.max(1, items.length); // items cover all 7 days

    // Calculate 7d adherence
    const followed7d = comp7d.filter(c => c.adherence_status === "followed").length;
    const partial7d = comp7d.filter(c => c.adherence_status === "partial").length;
    const pct7d = totalExpected7d > 0 ? ((followed7d * 100 + partial7d * 50) / (totalExpected7d * 100)) * 100 : 0;
    setAdherence7d(Math.min(100, Math.round(pct7d)));

    // Previous 7d
    const followedPrev = compPrev.filter(c => c.adherence_status === "followed").length;
    const partialPrev = compPrev.filter(c => c.adherence_status === "partial").length;
    const pctPrev = totalExpected7d > 0 ? ((followedPrev * 100 + partialPrev * 50) / (totalExpected7d * 100)) * 100 : 0;
    setAdherencePrev7d(Math.min(100, Math.round(pctPrev)));

    // Per meal type
    const itemTypeMap = new Map(items.map(i => [i.id, i.tipo_refeicao]));
    const mealTypeStats: Record<string, { followed: number; total: number }> = {};

    for (const item of items) {
      if (!mealTypeStats[item.tipo_refeicao]) {
        mealTypeStats[item.tipo_refeicao] = { followed: 0, total: 0 };
      }
      mealTypeStats[item.tipo_refeicao].total++;
    }

    for (const comp of comp7d) {
      const mealType = itemTypeMap.get(comp.meal_plan_item_id);
      if (mealType && mealTypeStats[mealType]) {
        if (comp.adherence_status === "followed") {
          mealTypeStats[mealType].followed++;
        } else if (comp.adherence_status === "partial") {
          mealTypeStats[mealType].followed += 0.5;
        }
      }
    }

    setPerMealType(mealTypeStats);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="glass rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-32 mb-3" />
        <div className="h-3 bg-muted rounded w-full mb-2" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    );
  }

  if (adherence7d === null) {
    return (
      <div className="glass rounded-xl p-4 text-center">
        <Utensils className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">Sem dados de adesão registrados</p>
      </div>
    );
  }

  const trend = adherencePrev7d !== null ? adherence7d - adherencePrev7d : 0;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-display font-semibold text-sm flex items-center gap-2">
          <Utensils className="w-4 h-4 text-primary" />
          Adesão Alimentar
        </h4>
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-foreground">{adherence7d}%</span>
          <div className={`flex items-center gap-0.5 text-[10px] font-medium ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {Math.abs(trend)}%
          </div>
        </div>
      </div>

      <Progress
        value={adherence7d}
        className="h-2.5"
      />

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Últimos 7 dias</span>
        <div className="flex gap-2">
          <span className="flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> Seguido</span>
          <span className="flex items-center gap-0.5"><MinusCircle className="w-2.5 h-2.5 text-amber-500" /> Parcial</span>
          <span className="flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5 text-red-500" /> Não seguido</span>
        </div>
      </div>

      {/* Per meal type breakdown */}
      {Object.keys(perMealType).length > 0 && (
        <div className="pt-2 border-t border-border/50 space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Por Refeição</p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(perMealType)
              .sort(([a], [b]) => {
                const order = ["Café da Manhã", "Lanche da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia"];
                return order.indexOf(a) - order.indexOf(b);
              })
              .map(([type, stats]) => {
                const pct = stats.total > 0 ? Math.round((stats.followed / stats.total) * 100) : 0;
                const config = MEAL_TYPE_CONFIG[type] || { label: type, icon: <Utensils className="w-3.5 h-3.5" /> };
                return (
                  <div key={type} className="flex items-center gap-2 p-1.5 rounded-lg bg-secondary/30">
                    <span className="text-primary">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-medium truncate">{config.label}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 ${
                            pct >= 70 ? "border-emerald-500/30 text-emerald-600" :
                            pct >= 40 ? "border-amber-500/30 text-amber-600" :
                            "border-red-500/30 text-red-600"
                          }`}
                        >
                          {pct}%
                        </Badge>
                      </div>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Consistency trend */}
      <div className="pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Tendência vs semana anterior</span>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              trend > 5 ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5" :
              trend < -5 ? "border-red-500/30 text-red-600 bg-red-500/5" :
              "border-border text-muted-foreground"
            }`}
          >
            {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} {trend > 0 ? "Melhorando" : trend < 0 ? "Caindo" : "Estável"}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}
