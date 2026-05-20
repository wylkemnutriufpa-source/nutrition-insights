import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MealCard from "@/components/meals/MealCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, UtensilsCrossed } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Tables, Database } from "@/integrations/supabase/types";

type Meal = Tables<"meals">;
type MealType = Database["public"]["Enums"]["tipo_refeicao"];

export default function Meals() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    tipo_refeicao: "Almoço" as MealType,
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const mealTypes: { value: any; label: string }[] = [
    { value: "Café da Manhã", label: t("meals.breakfast") },
    { value: "Lanche da Manhã", label: t("meals.morningSnack") },
    { value: "Almoço", label: t("meals.lunch") },
    { value: "Lanche da Tarde", label: t("meals.afternoonSnack") },
    { value: "Jantar", label: t("meals.dinner") },
    { value: "Ceia", label: t("meals.eveningSnack") },
  ];

  const fetchMeals = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false });
    setMeals(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMeals(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const xpEarned = 10;

    const { error } = await supabase.from("meals").insert({
      user_id: user.id,
      title: form.title,
      description: form.description || null,
      tipo_refeicao: form.tipo_refeicao,
      calories: form.calories ? parseInt(form.calories) : null,
      protein: form.protein ? parseFloat(form.protein) : null,
      carbs: form.carbs ? parseFloat(form.carbs) : null,
      fat: form.fat ? parseFloat(form.fat) : null,
      xp_earned: xpEarned,
    } as any);

    if (error) {
      toast.error(t("meals.registerError") + error.message);
    } else {
      const { data: stats } = await supabase
        .from("player_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (stats) {
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const newStreak = stats.last_meal_date === yesterday || stats.last_meal_date === today
          ? (stats.last_meal_date === today ? stats.current_streak : stats.current_streak + 1)
          : 1;
        const newXp = stats.total_xp + xpEarned;
        const newLevel = Math.floor(newXp / 100) + 1;

        await supabase.from("player_stats").update({
          total_xp: newXp,
          level: newLevel,
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, stats.longest_streak),
          meals_logged: stats.meals_logged + 1,
          last_meal_date: today,
        }).eq("user_id", user.id);
      }

      toast.success(t("meals.registered"));
      setOpen(false);
      setForm({ title: "", description: "", tipo_refeicao: "Almoço", calories: "", protein: "", carbs: "", fat: "" });
      fetchMeals();
    }
    setSubmitting(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">{t("meals.title")}</h1>
            <p className="text-muted-foreground text-sm">{t("meals.subtitle")}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2 shadow-glow">
                <Plus className="w-4 h-4" /> {t("meals.newMeal")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">{t("meals.registerMeal")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>{t("common.type")}</Label>
                  <Select value={form.tipo_refeicao} onValueChange={(v) => setForm({ ...form, tipo_refeicao: v as MealType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {mealTypes.map((mt) => (
                        <SelectItem key={mt.value} value={mt.value}>{mt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("common.title")}</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("meals.titlePlaceholder")} required />
                </div>
                <div>
                  <Label>{t("common.description")} ({t("common.optional")})</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("meals.descriptionPlaceholder")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("common.calories")}</Label>
                    <Input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} placeholder="kcal" />
                  </div>
                  <div>
                    <Label>{t("common.protein")} (g)</Label>
                    <Input type="number" step="0.1" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("common.carbs")} (g)</Label>
                    <Input type="number" step="0.1" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("common.fat")} (g)</Label>
                    <Input type="number" step="0.1" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                  {submitting ? t("common.registering") : t("meals.registerMeal")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : meals.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <UtensilsCrossed className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-display font-semibold text-lg mb-1">{t("meals.noMeals")}</h3>
            <p className="text-muted-foreground">{t("meals.noMealsDescription")}</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {meals.map((meal) => (
              <MealCard
                key={meal.id}
                title={meal.title}
                mealType={meal.tipo_refeicao}
                loggedAt={meal.logged_at}
                calories={meal.meta_calorias}
                protein={meal.meta_proteinas}
                carbs={meal.meta_carboidratos}
                fat={meal.meta_gorduras}
                aiScore={meal.ai_score}
                aiFeedback={meal.ai_feedback}
                imageUrl={meal.image_url}
                xpEarned={meal.xp_earned}
              />
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}