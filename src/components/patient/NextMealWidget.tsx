import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { supabase } from "@/integrations/supabase/client";
import { UtensilsCrossed, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { safeNum, fmtMacro } from "@/lib/formatMacros";

interface MealSlot {
  tipo_refeicao: string;
  time_label: string;
  items_summary: string;
  total_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const MEAL_ORDER = ["Café da Manhã", "Lanche da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia"];
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  morning_snack: "Lanche da Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da Tarde",
  dinner: "Jantar",
  evening_snack: "Ceia",
};
const MEAL_TIMES: Record<string, string> = {
  breakfast: "07:00",
  morning_snack: "10:00",
  lunch: "12:30",
  afternoon_snack: "15:30",
  dinner: "19:00",
  evening_snack: "21:00",
};

export default function NextMealWidget() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [nextMeal, setNextMeal] = useState<(MealSlot & { isNow?: boolean }) | null>(null);
  // totalsStatus removido: O paciente não precisa saber de estados internos de cálculo do editor.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadNextMeal(user.id);
  }, [user?.id]);

  const loadNextMeal = async (userId: string) => {
    try {
      const { data: plan } = await withTenantFilter(
        supabase
          .from("meal_plans")
          .select("id, totals_status, plan_mode")
          .eq("patient_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1),
        tenantId
      ).maybeSingle();

      if (!plan) { setLoading(false); return; }
      // totalsStatus ignorado no Patient App

      // Get current day of week (0=Sunday, 5=Friday)
      const now_dow = new Date().getDay();

      const itemsQuery = supabase
        .from("meal_plan_items")
        .select("tipo_refeicao, title, description, meta_calorias, meta_proteinas, meta_carboidratos, meta_gorduras, day_of_week, is_primary")
        .eq("meal_plan_id", plan.id);
      
      // Se não for single_day, filtra por dia
      if (plan.plan_mode !== 'single_day') {
        itemsQuery.or(`day_of_week.eq.${now_dow},day_of_week.is.null`);
      }

      const { data: items } = await itemsQuery;

      if (!items || items.length === 0) { setLoading(false); return; }

      // Group by tipo_refeicao
      const grouped: Record<string, typeof items> = {};
      items.forEach((item) => {
        const key = item.tipo_refeicao || "other";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });

      // Find next meal based on current time
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      let selectedMeal: string | null = null;
      for (const mealType of MEAL_ORDER) {
        if (!grouped[mealType]) continue;
        const timeStr = MEAL_TIMES[mealType] || "12:00";
        const [h, m] = timeStr.split(":").map(Number);
        const mealMinutes = h * 60 + m;
        if (mealMinutes >= currentMinutes - 30 && mealMinutes <= currentMinutes + 60) {
          selectedMeal = mealType;
          break;
        }
      }
      if (!selectedMeal) selectedMeal = MEAL_ORDER.find((mt) => grouped[mt]) || null;
      if (!selectedMeal || !grouped[selectedMeal]) { setLoading(false); return; }

      const mealItems = grouped[selectedMeal];
      // 🛡️ SOBERANIA V3: Filtramos apenas itens primários para evitar explosão de macros
      // Itens que são substituições (is_primary: false ou possuem substitution_group_id) são ignorados nos macros.
      const primaryMealItems = mealItems.filter(i => {
        const item = i as any;
        if (item.is_primary === false) return false;
        if (item.is_primary === true) return true;
        if (item.substitution_group_id) return false;
        return true;
      });
      const totalKcal = primaryMealItems.reduce((s, i) => s + safeNum(i?.meta_calorias), 0);
      const totalProtein = primaryMealItems.reduce((s, i) => s + safeNum(i?.meta_proteinas), 0);
      const totalCarbs = primaryMealItems.reduce((s, i) => s + safeNum(i?.meta_carboidratos), 0);
      const totalFat = primaryMealItems.reduce((s, i) => s + safeNum(i?.meta_gorduras), 0);
      const summary = primaryMealItems.slice(0, 3).map((i) => i?.title || "Alimento").join(", ");

      const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      const mealHTime = MEAL_TIMES[selectedMeal] || "12:00";
      const [mh, mm] = mealHTime.split(":").map(Number);
      const isNow = Math.abs((mh * 60 + mm) - nowMinutes) <= 30;

      setNextMeal({
        tipo_refeicao: selectedMeal,
        time_label: mealHTime,
        items_summary: summary + (mealItems.length > 3 ? ` +${mealItems.length - 3}` : ""),
        total_kcal: Math.round(totalKcal),
        protein_g: Math.round(totalProtein),
        carbs_g: Math.round(totalCarbs),
        fat_g: Math.round(totalFat),
        isNow
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading || !nextMeal) return null;

  return (
    <Link to="/my-diet">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`rounded-2xl border ${nextMeal.isNow ? "border-primary bg-primary/5 shadow-md shadow-primary/5" : "border-border/50 bg-card"} p-4 cursor-pointer hover:border-primary/20 transition-all group`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                {nextMeal.isNow ? "É hora de..." : "Próxima refeição"}
              </p>
              {nextMeal?.time_label && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {nextMeal.time_label}
                </span>
              )}
            </div>
            <h4 className="font-display font-bold text-sm">
              {(nextMeal?.tipo_refeicao && MEAL_LABELS[nextMeal.tipo_refeicao]) || nextMeal?.tipo_refeicao || "Refeição"}
            </h4>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {nextMeal.items_summary}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>

        {/* Macro pills with zero-protection fallbacks using fmtMacro default behavior */}
        <div className="flex flex-col gap-2 mt-3">
          <div className="flex gap-2" data-macro-tile="next-meal">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold" data-macro="kcal" data-macro-value="kcal">
              {fmtMacro(nextMeal.total_kcal, "...")} kcal
            </span>
            <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold" data-macro="protein" data-macro-value="protein">
              P {fmtMacro(nextMeal.protein_g, "...")}g
            </span>
            <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-[10px] font-semibold" data-macro="carbs" data-macro-value="carbs">
              C {fmtMacro(nextMeal.carbs_g, "...")}g
            </span>
            <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold" data-macro="fat" data-macro-value="fat">
              G {fmtMacro(nextMeal.fat_g, "...")}g
            </span>
          </div>
          
          {/* Status de sincronização removido para evitar que o app do paciente "pense" */}
        </div>
      </motion.div>
    </Link>
  );
}
