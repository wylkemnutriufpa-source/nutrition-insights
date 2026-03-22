import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { UtensilsCrossed, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface MealSlot {
  meal_type: string;
  time_label: string;
  items_summary: string;
  total_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const MEAL_ORDER = ["cafe_da_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"];
const MEAL_LABELS: Record<string, string> = {
  cafe_da_manha: "Café da Manhã",
  lanche_manha: "Lanche da Manhã",
  almoco: "Almoço",
  lanche_tarde: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia",
};
const MEAL_TIMES: Record<string, string> = {
  cafe_da_manha: "07:00",
  lanche_manha: "10:00",
  almoco: "12:30",
  lanche_tarde: "15:30",
  jantar: "19:00",
  ceia: "21:00",
};

export default function NextMealWidget() {
  const { user } = useAuth();
  const [nextMeal, setNextMeal] = useState<MealSlot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    loadNextMeal(user.id);
  }, [user?.id]);

  const loadNextMeal = async (userId: string) => {
    try {
      // Get active meal plan
      const { data: plan } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("patient_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!plan) {
        setLoading(false);
        return;
      }

      // Get today's day index (0 = Monday)
      const dayIndex = (new Date().getDay() + 6) % 7; // JS Sunday=0 → Monday=0

      const { data: items } = await supabase
        .from("meal_plan_items")
        .select("meal_type, food_name, quantity_g, calories, protein_g, carbs_g, fat_g")
        .eq("meal_plan_id", plan.id)
        .eq("day_index", dayIndex);

      if (!items || items.length === 0) {
        setLoading(false);
        return;
      }

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
        const mealMinutes = h * 60 + m;
        if (mealMinutes >= currentMinutes - 30) {
          selectedMeal = mealType;
          break;
        }
      }

      // If no future meal, show first meal of day
      if (!selectedMeal) {
        selectedMeal = MEAL_ORDER.find((mt) => grouped[mt]) || null;
      }

      if (!selectedMeal || !grouped[selectedMeal]) {
        setLoading(false);
        return;
      }

      const mealItems = grouped[selectedMeal];
      const totalKcal = mealItems.reduce((s, i) => s + (i.calories || 0), 0);
      const totalProtein = mealItems.reduce((s, i) => s + (i.protein_g || 0), 0);
      const totalCarbs = mealItems.reduce((s, i) => s + (i.carbs_g || 0), 0);
      const totalFat = mealItems.reduce((s, i) => s + (i.fat_g || 0), 0);
      const summary = mealItems
        .slice(0, 3)
        .map((i) => i.food_name)
        .join(", ");

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
              {nextMeal.time_label && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {nextMeal.time_label}
                </span>
              )}
            </div>
            <h4 className="font-display font-bold text-sm">
              {MEAL_LABELS[nextMeal.meal_type] || nextMeal.meal_type}
            </h4>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {nextMeal.items_summary}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>

        {/* Macro pills */}
        <div className="flex gap-2 mt-3">
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
            {nextMeal.total_kcal} kcal
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-semibold">
            P {nextMeal.protein_g}g
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-semibold">
            C {nextMeal.carbs_g}g
          </span>
          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-semibold">
            G {nextMeal.fat_g}g
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
