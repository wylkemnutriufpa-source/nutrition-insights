import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import XPBar from "@/components/gamification/XPBar";
import StreakCounter from "@/components/gamification/StreakCounter";
import SmartTips from "@/components/patient/SmartTips";
import { SmartPlanCard } from "@/components/patient/AnamnesisInsightsCard";
import MetabolicRadar from "@/components/dashboard/MetabolicRadar";
import SubscriptionCard from "@/components/patient/SubscriptionCard";
import PatientEvolutionSummary from "@/components/patient/PatientEvolutionSummary";
import PushNotificationBanner from "@/components/notifications/PushNotificationBanner";
import HealthAlertsBanner from "@/components/patient/HealthAlertsBanner";
import AIInsightsPanel from "@/components/dashboard/AIInsightsPanel";
import AttentionPatientsPanel from "@/components/dashboard/AttentionPatientsPanel";
import PatientEvolutionCharts from "@/components/dashboard/PatientEvolutionCharts";
import RiskPanel from "@/components/dashboard/RiskPanel";
import HealthScoreRing, { calculateHealthScore } from "@/components/dashboard/HealthScoreRing";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ExpandablePanel from "@/components/common/ExpandablePanel";
import {
  UtensilsCrossed, Users, TrendingUp, Target, Sparkles, Plus,
  CheckCircle2, Circle, AlertTriangle, Activity, FileText, Rocket,
  Calendar, ArrowRight, Clock, ClipboardList, Heart, Brain,
  BarChart3, Shield, ChefHat, MessageSquare, Bot, Pill
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [checklistTasks, setChecklistTasks] = useState<any[]>([]);
  const [anamnesis, setAnamnesis] = useState<any>(null);
  const [showAnamnesisModal, setShowAnamnesisModal] = useState(false);
  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const [recentMeals, setRecentMeals] = useState<any[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      supabase.from("player_stats").select("*").eq("user_id", user.id).single(),
      supabase.from("checklist_tasks").select("*").eq("patient_id", user.id).eq("date", today).order("category"),
      supabase.from("patient_anamnesis").select("*").eq("user_id", user.id).eq("status", "completed").order("created_at", { ascending: false }).limit(1),
      supabase.from("patient_appointments").select("*").eq("patient_id", user.id).gte("appointment_date", new Date().toISOString()).order("appointment_date").limit(1),
      supabase.from("meals").select("*").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(3),
      supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false),
    ]).then(([statsRes, checkRes, anamRes, aptRes, mealsRes, msgRes]) => {
      setStats(statsRes.data);
      setChecklistTasks(checkRes.data || []);
      const anam = anamRes.data?.[0] || null;
      setAnamnesis(anam);
      if (!anam) setShowAnamnesisModal(true);
      setNextAppointment(aptRes.data?.[0] || null);
      setRecentMeals(mealsRes.data || []);
      setUnreadMessages(msgRes.count || 0);
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
    <>
      {/* Anamnesis Reminder Modal */}
      <Dialog open={showAnamnesisModal} onOpenChange={setShowAnamnesisModal}>
        <DialogContent className="sm:max-w-md text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-4"
          >
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-5 shadow-glow">
              <ClipboardList className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Preencha sua Anamnese!</h2>
            <p className="text-muted-foreground text-sm max-w-sm mb-2">
              Para que seu nutricionista possa criar um <span className="font-semibold text-primary">plano alimentar personalizado</span> e gerar <span className="font-semibold text-primary">dicas inteligentes</span> para você, é fundamental preencher a anamnese.
            </p>
            <div className="space-y-2 text-left w-full mt-3 mb-5">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <Brain className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm">A IA analisa suas respostas e gera um plano personalizado</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <Heart className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm">Dicas de nutrição, sono, exercício e hidratação</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <Target className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm">Recomendações baseadas no seu perfil e objetivos</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              ⚠️ Seu plano alimentar só será elaborado após o preenchimento da anamnese.
            </p>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setShowAnamnesisModal(false)}>
                Depois
              </Button>
              <Button
                className="flex-1 gradient-primary shadow-glow gap-2"
                onClick={() => { setShowAnamnesisModal(false); navigate("/anamnesis"); }}
              >
                <Sparkles className="w-4 h-4" /> Preencher Agora
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Push notification banner */}
      <PushNotificationBanner />
      <HealthAlertsBanner />

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
        <ExpandablePanel title="XP"><XPBar totalXp={stats?.total_xp || 0} level={stats?.level || 1} /></ExpandablePanel>
        <ExpandablePanel title="Streak"><StreakCounter current={stats?.current_streak || 0} longest={stats?.longest_streak || 0} /></ExpandablePanel>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Refeições" value={stats?.meals_logged || 0} icon={UtensilsCrossed} gradient />
        <StatsCard title="Nível" value={stats?.level || 1} icon={TrendingUp} />
        <StatsCard title="XP Total" value={stats?.total_xp || 0} icon={Target} />
        <StatsCard title="Streak" value={`${stats?.current_streak || 0}d`} icon={Target} />
      </motion.div>

      {/* Today's Checklist */}
      <motion.div variants={item}>
        <ExpandablePanel title="Checklist de Hoje">
          <div className="glass rounded-xl p-5">
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
                      onClick={(e) => { e.stopPropagation(); toggleTask(task); }}
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
          </div>
        </ExpandablePanel>
      </motion.div>

      {/* Next Appointment + Chat */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-5">
          <h2 className="font-display font-semibold flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-primary" /> Próxima Consulta
          </h2>
          {nextAppointment ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-primary">{new Date(nextAppointment.appointment_date).getDate()}</span>
                <span className="text-[10px] text-muted-foreground uppercase">{new Date(nextAppointment.appointment_date).toLocaleDateString("pt-BR", { month: "short" })}</span>
              </div>
              <div>
                <p className="font-medium text-sm">{nextAppointment.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(nextAppointment.appointment_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} • {nextAppointment.duration_minutes}min
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma consulta agendada.</p>
          )}
          <Link to="/appointments" className="text-primary text-xs mt-3 flex items-center gap-1 hover:underline">
            Ver agenda <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <Link to="/chat" className="glass rounded-xl p-5 hover:border-primary/30 transition-colors">
          <h2 className="font-display font-semibold flex items-center gap-2 mb-3">
            💬 Chat
            {unreadMessages > 0 && <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">{unreadMessages} nova{unreadMessages > 1 ? "s" : ""}</span>}
          </h2>
          <p className="text-sm text-muted-foreground">Converse com seu nutricionista em tempo real.</p>
        </Link>
      </motion.div>

      {/* Patient Evolution Summary */}
      <motion.div variants={item}>
        <ExpandablePanel title="Evolução do Paciente">
          <PatientEvolutionSummary />
        </ExpandablePanel>
      </motion.div>

      {/* Subscription Card */}
      <motion.div variants={item}>
        <ExpandablePanel title="Assinatura">
          <SubscriptionCard />
        </ExpandablePanel>
      </motion.div>

      {/* Smart Plan Card */}
      <motion.div variants={item}>
        <ExpandablePanel title="Plano Inteligente">
          <SmartPlanCard />
        </ExpandablePanel>
      </motion.div>

      {/* Radar + Tips side by side */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetabolicRadar anamnesis={anamnesis} />
        <SmartTips />
      </motion.div>
    </motion.div>
    </>
  );
}

// ──── Nutritionist Dashboard 2.0 ────
function NutritionistDashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patientCount, setPatientCount] = useState(0);
  const [protocolCount, setProtocolCount] = useState(0);
  const [programCount, setProgramCount] = useState(0);
  const [mealPlanCount, setMealPlanCount] = useState(0);
  const [appointmentsToday, setAppointmentsToday] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);

  // AI-powered
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [attentionPatients, setAttentionPatients] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);

  // Risk & scores
  const [riskPatients, setRiskPatients] = useState<{ id: string; name: string; score: number; risks: string[] }[]>([]);
  
  // Evolution
  const [evolutionPeriod, setEvolutionPeriod] = useState(7);
  const [evolutionData, setEvolutionData] = useState({ avgWeight: null as number | null, avgAdherence: 0, totalCheckins: 0, avgScore: 0 });

  // Recent timeline
  const [recentTimeline, setRecentTimeline] = useState<any[]>([]);

  const fetchDashboard = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    // Parallel fetches for counts
    const [patientsRes, protocolsRes, programsRes, plansRes, aptsRes, chatsRes] = await Promise.all([
      supabase.from("nutritionist_patients").select("id, patient_id", { count: "exact" }).eq("nutritionist_id", user.id).eq("status", "active"),
      supabase.from("protocols").select("id", { count: "exact" }).eq("created_by", user.id),
      supabase.from("programs").select("id", { count: "exact" }).eq("created_by", user.id).eq("is_active", true),
      supabase.from("meal_plans").select("id", { count: "exact" }).eq("nutritionist_id", user.id).eq("is_active", true),
      supabase.from("patient_appointments").select("id", { count: "exact" }).eq("nutritionist_id", user.id).gte("appointment_date", todayStart.toISOString()).lte("appointment_date", todayEnd.toISOString()),
      supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false),
    ]);

    setPatientCount(patientsRes.count || 0);
    setProtocolCount(protocolsRes.count || 0);
    setProgramCount(programsRes.count || 0);
    setMealPlanCount(plansRes.count || 0);
    setAppointmentsToday(aptsRes.count || 0);
    setUnreadChats(chatsRes.count || 0);

    // Process patients for health scores & risk panel
    const patientIds = patientsRes.data?.map(p => p.patient_id) || [];
    if (patientIds.length > 0) {
      const patientDataForAI: any[] = [];
      const riskList: typeof riskPatients = [];
      let totalScore = 0;
      let totalWeight = 0;
      let weightCount = 0;
      let totalCheckins = 0;
      let totalAdherence = 0;
      let adherenceCount = 0;

      const periodDate = new Date(Date.now() - evolutionPeriod * 86400000).toISOString();

      for (const pid of patientIds.slice(0, 30)) {
        const [profileRes, anamRes, statsRes, checkRes, mealsRes, assessRes] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("user_id", pid).single(),
          supabase.from("patient_anamnesis").select("answers, status").eq("user_id", pid).order("created_at", { ascending: false }).limit(1),
          supabase.from("player_stats").select("*").eq("user_id", pid).single(),
          supabase.from("checklist_tasks").select("id, completed").eq("patient_id", pid).gte("date", periodDate.split("T")[0]),
          supabase.from("meals").select("id").eq("user_id", pid).gte("logged_at", periodDate),
          supabase.from("physical_assessments").select("weight").eq("patient_id", pid).order("assessment_date", { ascending: false }).limit(1),
        ]);

        const name = profileRes.data?.full_name || "Paciente";
        const anam = anamRes.data?.[0];
        const stats = statsRes.data;
        const checkTotal = checkRes.data?.length || 0;
        const checkCompleted = checkRes.data?.filter((t: any) => t.completed).length || 0;
        const checkCompletion = checkTotal > 0 ? Math.round((checkCompleted / checkTotal) * 100) : 0;
        const mealCount = mealsRes.data?.length || 0;
        const weight = assessRes.data?.[0]?.weight;

        // Calculate health score
        const score = calculateHealthScore({
          hasAnamnesis: anam?.status === "completed",
          checklistCompletion: checkCompletion,
          mealsLogged: mealCount,
          weightEntries: weight ? 1 : 0,
          currentStreak: stats?.current_streak || 0,
          daysAsPatient: 30,
        });

        totalScore += score;
        totalCheckins += mealCount + checkCompleted;
        if (checkTotal > 0) { totalAdherence += checkCompletion; adherenceCount++; }
        if (weight) { totalWeight += Number(weight); weightCount++; }

        // Determine risks
        const risks: string[] = [];
        if (anam?.answers) {
          const a = anam.answers as Record<string, any>;
          if (a.health_conditions?.some((c: string) => c !== "none")) risks.push("Condição de saúde");
          if (a.activity_level === "sedentary") risks.push("Sedentário");
          if (a.feeling === "terrible" || a.feeling === "bad") risks.push("Insatisfeito");
          if (a.sleep_quality === "bad" || a.sleep_quality === "terrible") risks.push("Sono ruim");
        }
        if (checkCompletion < 30 && checkTotal > 0) risks.push("Baixa adesão");
        if (mealCount === 0) risks.push("Sem registros");
        if (stats?.current_streak === 0 && stats?.meals_logged > 5) risks.push("Perdeu streak");

        riskList.push({ id: pid, name, score, risks });

        // Prepare data for AI
        patientDataForAI.push({
          patient_id: pid,
          name,
          score,
          anamnesis_status: anam?.status || "pending",
          anamnesis_answers: anam?.answers ? {
            activity_level: (anam.answers as any).activity_level,
            feeling: (anam.answers as any).feeling,
            sleep_quality: (anam.answers as any).sleep_quality,
            health_conditions: (anam.answers as any).health_conditions,
            goal: (anam.answers as any).goal,
          } : null,
          checklist_completion: checkCompletion,
          meals_last_period: mealCount,
          streak: stats?.current_streak || 0,
          level: stats?.level || 1,
          risks,
        });
      }

      // Sort by score (lowest first = most at risk)
      riskList.sort((a, b) => a.score - b.score);
      setRiskPatients(riskList);

      // Evolution data
      setEvolutionData({
        avgWeight: weightCount > 0 ? totalWeight / weightCount : null,
        avgAdherence: adherenceCount > 0 ? Math.round(totalAdherence / adherenceCount) : 0,
        totalCheckins,
        avgScore: patientIds.length > 0 ? Math.round(totalScore / Math.min(patientIds.length, 30)) : 0,
      });

      // Fetch AI insights (non-blocking)
      if (patientDataForAI.length > 0) {
        fetchAIInsights(patientDataForAI);
      }
    }
  }, [user, evolutionPeriod]);

  const fetchAIInsights = async (patientData: any[]) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("clinical-insights", {
        body: { patients: patientData },
      });

      if (error) throw error;
      if (data) {
        setAiInsights(data.insights || []);
        setAttentionPatients(data.attention_needed || []);
        setAiSummary(data.summary || null);
      }
    } catch (err) {
      console.error("AI insights error:", err);
      // Generate fallback local insights
      const localInsights = generateLocalInsights(patientData);
      setAiInsights(localInsights.insights);
      setAttentionPatients(localInsights.attention);
    }
    setAiLoading(false);
  };

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Dashboard Clínico</h1>
          <p className="text-muted-foreground text-sm">Painel inteligente · {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/patients">
            <Button className="gradient-primary shadow-glow gap-2">
              <Plus className="w-4 h-4" /> Novo Paciente
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatsCard title="Pacientes" value={patientCount} icon={Users} gradient />
        <StatsCard title="Consultas Hoje" value={appointmentsToday} icon={Calendar} />
        <StatsCard title="Planos Ativos" value={mealPlanCount} icon={UtensilsCrossed} />
        <StatsCard title="Protocolos" value={protocolCount} icon={FileText} />
        <StatsCard title="Programas" value={programCount} icon={Rocket} />
        <div className="glass rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-all" onClick={() => navigate("/chat")}>
          <MessageSquare className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Chat</p>
            <p className="font-display font-bold text-lg">{unreadChats > 0 ? unreadChats : "—"}</p>
          </div>
          {unreadChats > 0 && <span className="w-2 h-2 rounded-full bg-primary animate-pulse ml-auto" />}
        </div>
      </motion.div>

      {/* AI Summary Banner */}
      {aiSummary && (
        <motion.div variants={item} className="glass rounded-xl p-4 border-primary/20 flex items-center gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Resumo da IA</p>
            <p className="text-xs text-muted-foreground">{aiSummary.total_analyzed} pacientes analisados · {aiSummary.high_risk_count} em risco alto · Principal preocupação: {aiSummary.top_concern}</p>
          </div>
          {aiSummary.avg_adherence_estimate && (
            <div className="text-center px-4">
              <p className="font-display text-xl font-bold text-primary">{aiSummary.avg_adherence_estimate}%</p>
              <p className="text-[10px] text-muted-foreground">Adesão estimada</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Main Grid: Attention + Insights + Risk */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AttentionPatientsPanel patients={attentionPatients} loading={aiLoading} />
        <AIInsightsPanel insights={aiInsights} loading={aiLoading} />
        <RiskPanel patients={riskPatients} />
      </motion.div>

      {/* Evolution Charts */}
      <motion.div variants={item}>
        <PatientEvolutionCharts
          data={evolutionData}
          activePeriod={evolutionPeriod}
          onPeriodChange={(days) => setEvolutionPeriod(days)}
        />
      </motion.div>

      {/* Patient Health Scores Overview */}
      {riskPatients.length > 0 && (
        <motion.div variants={item} className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Health Score dos Pacientes</h2>
              <p className="text-xs text-muted-foreground">Score de 0-100 baseado em adesão, registros e consistência</p>
            </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {riskPatients.slice(0, 8).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/patients/${p.id}`)}
                className="flex flex-col items-center gap-1 min-w-[80px] cursor-pointer hover:opacity-80 transition-opacity"
              >
                <HealthScoreRing score={p.score} size="sm" />
                <p className="text-xs font-medium truncate max-w-[80px] text-center">{p.name.split(" ")[0]}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions Grid */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: "/protocols", icon: FileText, label: "Protocolos", desc: "Criar e gerenciar", color: "text-primary" },
          { to: "/programs", icon: Rocket, label: "Programas", desc: "Projetos em grupo", color: "text-accent" },
          { to: "/meal-plans", icon: UtensilsCrossed, label: "Planos", desc: "Alimentares", color: "text-success" },
          { to: "/supplements", icon: Pill, label: "Suplementos", desc: "Prescrever", color: "text-info" },
          { to: "/recipes", icon: ChefHat, label: "Receitas", desc: "Criar e compartilhar", color: "text-warning" },
          { to: "/automation", icon: Bot, label: "Automação", desc: "Regras inteligentes", color: "text-primary" },
          { to: "/reports", icon: BarChart3, label: "Relatórios", desc: "Gerar com IA", color: "text-accent" },
          { to: "/appointments", icon: Calendar, label: "Agenda", desc: `${appointmentsToday} hoje`, color: "text-info" },
        ].map((action) => (
          <Link key={action.to} to={action.to} className="glass rounded-xl p-4 hover:border-primary/30 transition-all group">
            <action.icon className={`w-6 h-6 ${action.color} mb-2 group-hover:scale-110 transition-transform`} />
            <p className="font-display font-semibold text-sm">{action.label}</p>
            <p className="text-[10px] text-muted-foreground">{action.desc}</p>
          </Link>
        ))}
      </motion.div>
    </motion.div>
  );
}

// Local fallback insights when AI is unavailable
function generateLocalInsights(patients: any[]) {
  const insights: any[] = [];
  const attention: any[] = [];

  const lowAdherence = patients.filter(p => p.checklist_completion < 30 && p.checklist_completion >= 0);
  const noMeals = patients.filter(p => p.meals_last_period === 0);
  const badSleep = patients.filter(p => p.anamnesis_answers?.sleep_quality === "bad" || p.anamnesis_answers?.sleep_quality === "terrible");
  const sedentary = patients.filter(p => p.anamnesis_answers?.activity_level === "sedentary");
  const lostStreak = patients.filter(p => p.streak === 0 && p.score > 20);

  if (lowAdherence.length > 0) {
    insights.push({ title: "Baixa adesão ao checklist", description: `${lowAdherence.length} paciente(s) com menos de 30% de adesão ao checklist.`, category: "adherence", severity: "warning", affected_count: lowAdherence.length });
    lowAdherence.forEach(p => attention.push({ patient_id: p.patient_id, patient_name: p.name, reason: "Baixa adesão ao checklist", priority: "high" }));
  }
  if (noMeals.length > 0) {
    insights.push({ title: "Sem registros alimentares", description: `${noMeals.length} paciente(s) não registraram refeições recentemente.`, category: "nutrition", severity: "critical", affected_count: noMeals.length });
    noMeals.forEach(p => attention.push({ patient_id: p.patient_id, patient_name: p.name, reason: "Ausência de registros alimentares", priority: "high" }));
  }
  if (badSleep.length > 0) {
    insights.push({ title: "Qualidade de sono ruim", description: `${badSleep.length} paciente(s) relataram sono ruim na anamnese.`, category: "sleep", severity: "warning", affected_count: badSleep.length });
  }
  if (sedentary.length > 0) {
    insights.push({ title: "Pacientes sedentários", description: `${sedentary.length} paciente(s) com nível sedentário de atividade.`, category: "metabolism", severity: "info", affected_count: sedentary.length });
  }
  if (lostStreak.length > 0) {
    insights.push({ title: "Streaks perdidos", description: `${lostStreak.length} paciente(s) perderam seus streaks de consistência.`, category: "adherence", severity: "warning", affected_count: lostStreak.length });
  }
  if (insights.length === 0) {
    insights.push({ title: "Tudo em ordem!", description: "Seus pacientes estão com boa adesão e progresso.", category: "progress", severity: "info" });
  }

  return { insights, attention };
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
