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
  meal_type: string;
  time_label: string;
  items_summary: string;
  total_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const MEAL_ORDER = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "supper"];
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  morning_snack: "Lanche da Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da Tarde",
  dinner: "Jantar",
  supper: "Ceia",
};
const MEAL_TIMES: Record<string, string> = {
  breakfast: "07:00",
  morning_snack: "10:00",
  lunch: "12:30",
  afternoon_snack: "15:30",
  dinner: "19:00",
  supper: "21:00",
};

export default function NextMealWidget() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [nextMeal, setNextMeal] = useState<MealSlot | null>(null);
  const [totalsStatus, setTotalsStatus] = useState<string>("ok");
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
          .select("id, totals_status")
          .eq("patient_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1),
        tenantId
      ).maybeSingle();

      if (!plan) { setLoading(false); return; }
      setTotalsStatus(plan.totals_status || "ok");

      const dayOfWeek = (new Date().getDay() + 6) % 7;

      const { data: items } = await supabase
        .from("meal_plan_items")
        .select("meal_type, title, description, calories_target, protein_target, carbs_target, fat_target")
        .eq("meal_plan_id", plan.id)
        .eq("day_of_week", dayOfWeek);

      if (!items || items.length === 0) { setLoading(false); return; }

      // Group by meal_type
      const grouped: Record<string, typeof items> = {};
      items.forEach((item) => {
        const key = item.meal_type || "other";
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
        if (h * 60 + m >= currentMinutes - 30) {
          selectedMeal = mealType;
          break;
        }
      }
      if (!selectedMeal) selectedMeal = MEAL_ORDER.find((mt) => grouped[mt]) || null;
      if (!selectedMeal || !grouped[selectedMeal]) { setLoading(false); return; }

      const mealItems = grouped[selectedMeal];
      const totalKcal = mealItems.reduce((s, i) => s + safeNum(i?.calories_target), 0);
      const totalProtein = mealItems.reduce((s, i) => s + safeNum(i?.protein_target), 0);
      const totalCarbs = mealItems.reduce((s, i) => s + safeNum(i?.carbs_target), 0);
      const totalFat = mealItems.reduce((s, i) => s + safeNum(i?.fat_target), 0);
      const summary = mealItems.slice(0, 3).map((i) => i?.title || "Alimento").join(", ");

      setNextMeal({
        meal_type: selectedMeal,
        time_label: MEAL_TIMES[selectedMeal] || "",
        items_summary: summary + (mealItems.length > 3 ? ` +${mealItems.length - 3}` : ""),
        total_kcal: Math.round(totalKcal),
        protein_g: Math.round(totalProtein),
        carbs_g: Math.round(totalCarbs),
        fat_g: Math.round(totalFat),
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
        className="rounded-2xl border border-border/50 bg-card p-4 cursor-pointer hover:border-primary/20 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Próxima refeição
              </p>
              {nextMeal?.time_label && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {nextMeal.time_label}
                </span>
              )}
            </div>
            <h4 className="font-display font-bold text-sm">
              {(nextMeal?.meal_type && MEAL_LABELS[nextMeal.meal_type]) || nextMeal?.meal_type || "Refeição"}
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
          
          {(totalsStatus === "incomplete" || nextMeal.total_kcal === 0) && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/5 rounded-lg border border-amber-500/10">
              <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
              <span className="text-[9px] text-amber-600 font-medium">Sincronizando macros...</span>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
