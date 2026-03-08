import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import XPBar from "@/components/gamification/XPBar";
import StreakCounter from "@/components/gamification/StreakCounter";
import SmartTips from "@/components/patient/SmartTips";
import { SmartPlanCard } from "@/components/patient/AnamnesisInsightsCard";
import MetabolicRadar from "@/components/dashboard/MetabolicRadar";
import {
  UtensilsCrossed, Users, TrendingUp, Target, Sparkles, Plus,
  CheckCircle2, Circle, AlertTriangle, Activity, FileText, Rocket,
  Calendar, ArrowRight, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type PlayerStats = Tables<"player_stats">;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

// ──── Patient Dashboard ────
function PatientDashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [checklistTasks, setChecklistTasks] = useState<any[]>([]);
  const [anamnesis, setAnamnesis] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      supabase.from("player_stats").select("*").eq("user_id", user.id).single(),
      supabase.from("checklist_tasks").select("*").eq("patient_id", user.id).eq("date", today).order("category"),
      supabase.from("patient_anamnesis").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
    ]).then(([statsRes, checkRes, anamRes]) => {
      setStats(statsRes.data);
      setChecklistTasks(checkRes.data || []);
      setAnamnesis(anamRes.data?.[0] || null);
    });
  }, [user]);

  const completedTasks = checklistTasks.filter((t) => t.completed).length;
  const checklistProgress = checklistTasks.length > 0 ? (completedTasks / checklistTasks.length) * 100 : 0;

  const toggleTask = async (task: any) => {
    const newCompleted = !task.completed;
    await supabase.from("checklist_tasks").update({
      completed: newCompleted,
      completed_at: newCompleted ? new Date().toISOString() : null,
    }).eq("id", task.id);
    setChecklistTasks((prev) =>
      prev.map((t) => t.id === task.id ? { ...t, completed: newCompleted } : t)
    );
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
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
        </div>
      </motion.div>

      {/* Gamification */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <XPBar totalXp={stats?.total_xp || 0} level={stats?.level || 1} />
        <StreakCounter current={stats?.current_streak || 0} longest={stats?.longest_streak || 0} />
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Refeições" value={stats?.meals_logged || 0} icon={UtensilsCrossed} gradient />
        <StatsCard title="Nível" value={stats?.level || 1} icon={TrendingUp} />
        <StatsCard title="XP Total" value={stats?.total_xp || 0} icon={Target} />
        <StatsCard title="Streak" value={`${stats?.current_streak || 0}d`} icon={Target} />
      </motion.div>

      {/* Today's Checklist */}
      <motion.div variants={item} className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" /> Checklist de Hoje
          </h2>
          <Link to="/checklist" className="text-sm text-primary hover:underline flex items-center gap-1">
            Ver tudo <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {checklistTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa para hoje. Aguarde seu protocolo!</p>
        ) : (
          <>
            <Progress value={checklistProgress} className="h-2 mb-3" />
            <div className="space-y-2">
              {checklistTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    task.completed ? "bg-success/5 opacity-60" : "bg-card hover:bg-muted"
                  }`}
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-lg">{task.icon}</span>
                  <span className={`text-sm ${task.completed ? "line-through text-muted-foreground" : "font-medium"}`}>
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* Smart Plan Card */}
      <motion.div variants={item}>
        <SmartPlanCard />
      </motion.div>

      {/* Radar + Tips side by side */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetabolicRadar anamnesis={anamnesis} />
        <SmartTips />
      </motion.div>
    </motion.div>
  );
}

// ──── Nutritionist Dashboard ────
function NutritionistDashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patientCount, setPatientCount] = useState(0);
  const [protocolCount, setProtocolCount] = useState(0);
  const [programCount, setProgramCount] = useState(0);
  const [riskPatients, setRiskPatients] = useState<{ id: string; name: string; risks: string[] }[]>([]);
  const [recentTimeline, setRecentTimeline] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    // Counts
    supabase.from("nutritionist_patients").select("id, patient_id", { count: "exact" })
      .eq("nutritionist_id", user.id).eq("status", "active")
      .then(async ({ count, data }) => {
        setPatientCount(count || 0);

        // Check risk factors for patients
        if (data) {
          const riskyPatients: typeof riskPatients = [];
          for (const p of data.slice(0, 20)) {
            const { data: anam } = await supabase.from("patient_anamnesis")
              .select("answers").eq("user_id", p.patient_id).limit(1);
            const { data: profile } = await supabase.from("profiles")
              .select("full_name").eq("user_id", p.patient_id).single();

            if (anam?.[0]?.answers) {
              const a = anam[0].answers as Record<string, any>;
              const risks: string[] = [];
              if (a.health_conditions?.some((c: string) => c !== "none")) risks.push("Condição de saúde");
              if (a.activity_level === "sedentary") risks.push("Sedentário");
              if (a.feeling === "terrible" || a.feeling === "bad") risks.push("Insatisfeito");
              if (risks.length > 0) {
                riskyPatients.push({ id: p.patient_id, name: profile?.full_name || "Paciente", risks });
              }
            }
          }
          setRiskPatients(riskyPatients);
        }
      });

    supabase.from("protocols").select("id", { count: "exact" }).eq("created_by", user.id)
      .then(({ count }) => setProtocolCount(count || 0));

    supabase.from("programs").select("id", { count: "exact" }).eq("created_by", user.id).eq("is_active", true)
      .then(({ count }) => setProgramCount(count || 0));
  }, [user]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard Profissional</h1>
          <p className="text-muted-foreground text-sm">Visão geral dos seus pacientes e programas</p>
        </div>
        <div className="flex gap-2">
          <Link to="/patients">
            <Button className="gradient-primary gap-2">
              <Plus className="w-4 h-4" /> Novo Paciente
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Pacientes Ativos" value={patientCount} icon={Users} gradient />
        <StatsCard title="Protocolos" value={protocolCount} icon={FileText} />
        <StatsCard title="Programas Ativos" value={programCount} icon={Rocket} />
        <StatsCard title="Alertas" value={riskPatients.length} icon={AlertTriangle} />
      </motion.div>

      {/* Risk Panel */}
      <motion.div variants={item} className="glass rounded-xl p-5">
        <h2 className="font-display font-semibold flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-warning" /> Painel de Risco
        </h2>
        {riskPatients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum paciente em risco identificado. ✅</p>
        ) : (
          <div className="space-y-2">
            {riskPatients.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/patients/${p.id}`)}
                className="flex items-center gap-4 p-3 rounded-lg bg-card border border-border hover:border-warning/30 cursor-pointer transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <span className="font-bold text-warning">{p.name[0]}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{p.name}</p>
                  <div className="flex gap-2 mt-0.5">
                    {p.risks.map((r, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning">{r}</span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/protocols" className="glass rounded-xl p-5 hover:border-primary/30 transition-all group">
          <FileText className="w-8 h-8 text-primary mb-3" />
          <h3 className="font-display font-semibold">Protocolos</h3>
          <p className="text-sm text-muted-foreground mt-1">Crie e gerencie protocolos de atendimento</p>
          <span className="text-primary text-sm mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
            Acessar <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
        <Link to="/programs" className="glass rounded-xl p-5 hover:border-primary/30 transition-all group">
          <Rocket className="w-8 h-8 text-accent mb-3" />
          <h3 className="font-display font-semibold">Programas</h3>
          <p className="text-sm text-muted-foreground mt-1">Projetos como "Biquíni Branco" e desafios</p>
          <span className="text-primary text-sm mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
            Acessar <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
        <Link to="/meal-plans" className="glass rounded-xl p-5 hover:border-primary/30 transition-all group">
          <UtensilsCrossed className="w-8 h-8 text-success mb-3" />
          <h3 className="font-display font-semibold">Planos Alimentares</h3>
          <p className="text-sm text-muted-foreground mt-1">Monte e ajuste planos para seus pacientes</p>
          <span className="text-primary text-sm mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
            Acessar <ArrowRight className="w-3 h-3" />
          </span>
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
