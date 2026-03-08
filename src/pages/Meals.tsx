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
import type { Tables, Database } from "@/integrations/supabase/types";

type Meal = Tables<"meals">;
type MealType = Database["public"]["Enums"]["meal_type"];

const mealTypes: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "☕ Café da manhã" },
  { value: "morning_snack", label: "🍌 Lanche da manhã" },
  { value: "lunch", label: "🍽️ Almoço" },
  { value: "afternoon_snack", label: "🍎 Lanche da tarde" },
  { value: "dinner", label: "🌙 Jantar" },
  { value: "evening_snack", label: "🫖 Ceia" },
];

export default function Meals() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    meal_type: "lunch" as MealType,
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });
  const [submitting, setSubmitting] = useState(false);

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

    const xpEarned = 10; // base XP for logging

    const { error } = await supabase.from("meals").insert({
      user_id: user.id,
      title: form.title,
      description: form.description || null,
      meal_type: form.meal_type,
      calories: form.calories ? parseInt(form.calories) : null,
      protein: form.protein ? parseFloat(form.protein) : null,
      carbs: form.carbs ? parseFloat(form.carbs) : null,
      fat: form.fat ? parseFloat(form.fat) : null,
      xp_earned: xpEarned,
    });

    if (error) {
      toast.error("Erro ao registrar: " + error.message);
    } else {
      // Update player stats
      const { data: stats } = await supabase
        .from("player_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

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

      toast.success(`Refeição registrada! +${xpEarned} XP 🎉`);
      setOpen(false);
      setForm({ title: "", description: "", meal_type: "lunch", calories: "", protein: "", carbs: "", fat: "" });
      fetchMeals();
    }
    setSubmitting(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Minhas Refeições</h1>
            <p className="text-muted-foreground text-sm">Registre e acompanhe suas refeições</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2 shadow-glow">
                <Plus className="w-4 h-4" /> Nova Refeição
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">Registrar Refeição</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.meal_type} onValueChange={(v) => setForm({ ...form, meal_type: v as MealType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {mealTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Arroz, feijão e frango" required />
                </div>
                <div>
                  <Label>Descrição (opcional)</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes da refeição..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Calorias</Label>
                    <Input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} placeholder="kcal" />
                  </div>
                  <div>
                    <Label>Proteínas (g)</Label>
                    <Input type="number" step="0.1" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} />
                  </div>
                  <div>
                    <Label>Carboidratos (g)</Label>
                    <Input type="number" step="0.1" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} />
                  </div>
                  <div>
                    <Label>Gorduras (g)</Label>
                    <Input type="number" step="0.1" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                  {submitting ? "Registrando..." : "Registrar Refeição"}
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
            <h3 className="font-display font-semibold text-lg mb-1">Nenhuma refeição registrada</h3>
            <p className="text-muted-foreground">Comece registrando sua primeira refeição para ganhar XP!</p>
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
                mealType={meal.meal_type}
                loggedAt={meal.logged_at}
                calories={meal.calories}
                protein={meal.protein}
                carbs={meal.carbs}
                fat={meal.fat}
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
