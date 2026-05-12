import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import XPBar from "@/components/gamification/XPBar";
import StreakCounter from "@/components/gamification/StreakCounter";
import MealCard from "@/components/meals/MealCard";
import { UtensilsCrossed, Users, TrendingUp, Target, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Meal = Tables<"meals">;
type PlayerStats = Tables<"player_stats">;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

function PatientDashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("player_stats").select("*").eq("user_id", user.id).single()
      .then(({ data }) => setStats(data));
    supabase.from("meals").select("*").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(6)
      .then(({ data }) => setMeals(data || []));
  }, [user]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Meu Dashboard</h1>
          <p className="text-muted-foreground text-sm">Acompanhe seu progresso</p>
        </div>
        <div className="flex gap-2">
          <Link to="/analyze">
            <Button className="gradient-primary shadow-glow gap-2">
              <Sparkles className="w-4 h-4" /> Analisar Refeição
            </Button>
          </Link>
          <Link to="/meals">
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> Registrar
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Gamification bar */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <XPBar totalXp={stats?.total_xp || 0} level={stats?.level || 1} />
        <StreakCounter current={stats?.current_streak || 0} longest={stats?.longest_streak || 0} />
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Refeições" value={stats?.meals_logged || 0} icon={UtensilsCrossed} gradient />
        <StatsCard title="Nível" value={stats?.level || 1} icon={TrendingUp} />
        <StatsCard title="XP Total" value={stats?.total_xp || 0} icon={Target} />
        <StatsCard title="Streak" value={`${stats?.current_streak || 0}d`} icon={Target} />
      </motion.div>

      {/* Recent meals */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg">Refeições Recentes</h2>
          <Link to="/meals" className="text-sm text-primary hover:underline">Ver todas</Link>
        </div>
        {meals.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma refeição registrada ainda.</p>
            <Link to="/meals">
              <Button className="mt-4 gradient-primary">Registrar primeira refeição</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function NutritionistDashboardContent() {
  const { user } = useAuth();
  const [patientCount, setPatientCount] = useState(0);
  const [mealCount, setMealCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("nutritionist_patients").select("id", { count: "exact" })
      .eq("nutritionist_id", user.id).eq("status", "active")
      .then(({ count }) => setPatientCount(count || 0));
    // Count recent meals from patients
    supabase.from("nutritionist_patients").select("patient_id").eq("nutritionist_id", user.id).eq("status", "active")
      .then(async ({ data }) => {
        if (!data || data.length === 0) return;
        const ids = data.map(d => d.patient_id);
        const { count } = await supabase.from("meals").select("id", { count: "exact" })
          .in("user_id", ids);
        setMealCount(count || 0);
      });
  }, [user]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard Profissional</h1>
          <p className="text-muted-foreground text-sm">Visão geral dos seus pacientes</p>
        </div>
        <Link to="/patients">
          <Button className="gradient-primary gap-2">
            <Plus className="w-4 h-4" /> Novo Paciente
          </Button>
        </Link>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Pacientes Ativos" value={patientCount} icon={Users} gradient />
        <StatsCard title="Refeições Registradas" value={mealCount} icon={UtensilsCrossed} />
        <StatsCard title="Planos Ativos" value="-" icon={TrendingUp} />
      </motion.div>

      <motion.div variants={item} className="glass rounded-xl p-8 text-center">
        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-display font-semibold text-lg mb-1">Gerencie seus pacientes</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Adicione pacientes, crie planos alimentares e acompanhe o progresso deles.
        </p>
        <Link to="/patients">
          <Button variant="outline">Ver Pacientes</Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}

export default function Index() {
  const { isNutritionist, loading } = useAuth();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {isNutritionist ? <NutritionistDashboardContent /> : <PatientDashboardContent />}
    </DashboardLayout>
  );
}
