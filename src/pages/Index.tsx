import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import XPBar from "@/components/gamification/XPBar";
import StreakCounter from "@/components/gamification/StreakCounter";
import { DailyScoreCard, WeeklyProgressBar, AIMotivationCard } from "@/components/gamification/AdherenceGamification";
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
import AdherenceAnalytics from "@/components/dashboard/AdherenceAnalytics";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import SystemUsageCard from "@/components/dashboard/SystemUsageCard";
import NutritionCopilot from "@/components/dashboard/NutritionCopilot";
import ChurnRiskPanel from "@/components/dashboard/ChurnRiskPanel";
import PatientProgressSimulation from "@/components/dashboard/PatientProgressSimulation";
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

      {/* AI Motivation */}
      <motion.div variants={item}>
        <AIMotivationCard streak={stats?.current_streak || 0} checklistProgress={checklistProgress} />
      </motion.div>

      {/* Gamification */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExpandablePanel title="XP"><XPBar totalXp={stats?.total_xp || 0} level={stats?.level || 1} /></ExpandablePanel>
        <ExpandablePanel title="Streak"><StreakCounter current={stats?.current_streak || 0} longest={stats?.longest_streak || 0} /></ExpandablePanel>
      </motion.div>

      {/* Daily Score + Weekly Progress */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DailyScoreCard tasks={checklistTasks.map(t => ({ category: t.category, completed: t.completed }))} />
        {user && <WeeklyProgressBar userId={user.id} />}
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
        <ExpandablePanel title="Radar Metabólico"><MetabolicRadar anamnesis={anamnesis} /></ExpandablePanel>
        <ExpandablePanel title="Dicas Inteligentes"><SmartTips /></ExpandablePanel>
      </motion.div>
    </motion.div>
    </>
  );
}

// ──── Nutritionist Dashboard 3.0 — Clinical Command Center ────
function NutritionistDashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patientCount, setPatientCount] = useState(0);
  const [protocolCount, setProtocolCount] = useState(0);
  const [programCount, setProgramCount] = useState(0);
  const [mealPlanCount, setMealPlanCount] = useState(0);
  const [appointmentsToday, setAppointmentsToday] = useState(0);
  const [pendingCheckins, setPendingCheckins] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);

  // AI-powered
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [attentionPatients, setAttentionPatients] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);

  // Risk & scores
  const [riskPatients, setRiskPatients] = useState<{ id: string; name: string; score: number; risks: string[]; lastActivity?: string }[]>([]);

  // Evolution
  const [evolutionPeriod, setEvolutionPeriod] = useState(7);
  const [evolutionData, setEvolutionData] = useState({ avgWeight: null as number | null, avgAdherence: 0, totalCheckins: 0, avgScore: 0 });

  // Recent timeline
  const [recentTimeline, setRecentTimeline] = useState<any[]>([]);

  // Program performance
  const [programPerformance, setProgramPerformance] = useState<{ id: string; title: string; patientCount: number; avgAdherence: number }[]>([]);

  const fetchDashboard = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [patientsRes, protocolsRes, programsRes, plansRes, aptsRes, chatsRes, pendingRes, timelineRes, programsListRes] = await Promise.all([
      supabase.from("nutritionist_patients").select("id, patient_id", { count: "exact" }).eq("nutritionist_id", user.id).eq("status", "active"),
      supabase.from("protocols").select("id", { count: "exact" }).eq("created_by", user.id),
      supabase.from("programs").select("id", { count: "exact" }).eq("created_by", user.id).eq("is_active", true),
      supabase.from("meal_plans").select("id", { count: "exact" }).eq("nutritionist_id", user.id).eq("is_active", true),
      supabase.from("patient_appointments").select("id", { count: "exact" }).eq("nutritionist_id", user.id).gte("appointment_date", todayStart.toISOString()).lte("appointment_date", todayEnd.toISOString()),
      supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false),
      supabase.from("patient_checkins").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id).eq("status", "pending"),
      supabase.from("patient_timeline").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("programs").select("id, title").eq("created_by", user.id).eq("is_active", true).limit(5),
    ]);

    setPatientCount(patientsRes.count || 0);
    setProtocolCount(protocolsRes.count || 0);
    setProgramCount(programsRes.count || 0);
    setMealPlanCount(plansRes.count || 0);
    setAppointmentsToday(aptsRes.count || 0);
    setUnreadChats(chatsRes.count || 0);
    setPendingCheckins(pendingRes.count || 0);
    setRecentTimeline(timelineRes.data || []);

    // Program performance
    if (programsListRes.data && programsListRes.data.length > 0) {
      const perfList: typeof programPerformance = [];
      for (const prog of programsListRes.data) {
        const { count } = await supabase.from("program_patients").select("id", { count: "exact", head: true }).eq("program_id", prog.id).eq("status", "active");
        const { data: progressData } = await supabase.from("program_patient_progress").select("adherence_score").eq("program_id", prog.id);
        const scores = (progressData || []).filter(p => p.adherence_score != null).map(p => p.adherence_score as number);
        const avgAdh = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        perfList.push({ id: prog.id, title: prog.title, patientCount: count || 0, avgAdherence: avgAdh });
      }
      setProgramPerformance(perfList);
    }

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
          supabase.from("meals").select("id, logged_at").eq("user_id", pid).gte("logged_at", periodDate),
          supabase.from("physical_assessments").select("weight, assessment_date").eq("patient_id", pid).order("assessment_date", { ascending: false }).limit(1),
        ]);

        const name = profileRes.data?.full_name || "Paciente";
        const anam = anamRes.data?.[0];
        const stats = statsRes.data;
        const checkTotal = checkRes.data?.length || 0;
        const checkCompleted = checkRes.data?.filter((t: any) => t.completed).length || 0;
        const checkCompletion = checkTotal > 0 ? Math.round((checkCompleted / checkTotal) * 100) : 0;
        const mealCount = mealsRes.data?.length || 0;
        const weight = assessRes.data?.[0]?.weight;
        const lastMeal = mealsRes.data?.[0]?.logged_at;
        const lastAssess = assessRes.data?.[0]?.assessment_date;

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

        const lastActivity = lastMeal || lastAssess || undefined;
        riskList.push({ id: pid, name, score, risks, lastActivity });

        patientDataForAI.push({
          patient_id: pid, name, score,
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

      riskList.sort((a, b) => a.score - b.score);
      setRiskPatients(riskList);

      setEvolutionData({
        avgWeight: weightCount > 0 ? totalWeight / weightCount : null,
        avgAdherence: adherenceCount > 0 ? Math.round(totalAdherence / adherenceCount) : 0,
        totalCheckins,
        avgScore: patientIds.length > 0 ? Math.round(totalScore / Math.min(patientIds.length, 30)) : 0,
      });

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
      const localInsights = generateLocalInsights(patientData);
      setAiInsights(localInsights.insights);
      setAttentionPatients(localInsights.attention);
    }
    setAiLoading(false);
  };

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const quickActions = [
    { label: "Novo Paciente", icon: Users, to: "/patients", color: "bg-primary/10 text-primary hover:bg-primary/20" },
    { label: "Nova Consulta", icon: Calendar, to: "/appointments", color: "bg-info/10 text-info hover:bg-info/20" },
    { label: "Criar Programa", icon: Rocket, to: "/programs", color: "bg-accent/10 text-accent hover:bg-accent/20" },
    { label: "Criar Protocolo", icon: FileText, to: "/protocols", color: "bg-warning/10 text-warning hover:bg-warning/20" },
  ];

  const timelineEventIcons: Record<string, { icon: any; color: string }> = {
    checkin: { icon: CheckCircle2, color: "text-success" },
    program: { icon: Rocket, color: "text-accent" },
    appointment: { icon: Calendar, color: "text-info" },
    assessment: { icon: Activity, color: "text-primary" },
    note: { icon: FileText, color: "text-muted-foreground" },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ── Header ── */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Dashboard Clínico</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} · Central de Comando
          </p>
        </div>
        {unreadChats > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/chat")}>
            <MessageSquare className="w-4 h-4" />
            {unreadChats} mensagem{unreadChats > 1 ? "s" : ""}
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </Button>
        )}
      </motion.div>

      {/* ── 2️⃣ Action Shortcuts ── */}
      <motion.div variants={item} className="flex flex-wrap gap-2">
        {quickActions.map((a) => (
          <Link key={a.to} to={a.to}>
            <Button variant="outline" size="sm" className={`gap-2 rounded-full border-none transition-colors ${a.color}`}>
              <a.icon className="w-4 h-4" />
              {a.label}
            </Button>
          </Link>
        ))}
      </motion.div>

      {/* ── 1️⃣ Daily Overview Cards ── */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <DailyMetricCard label="Pacientes" value={patientCount} icon={Users} color="primary" onClick={() => navigate("/patients")} />
        <DailyMetricCard label="Consultas Hoje" value={appointmentsToday} icon={Calendar} color="info" onClick={() => navigate("/appointments")} />
        <DailyMetricCard label="Programas Ativos" value={programCount} icon={Rocket} color="accent" onClick={() => navigate("/programs")} />
        <DailyMetricCard label="Protocolos" value={protocolCount} icon={FileText} color="warning" onClick={() => navigate("/protocols")} />
        <DailyMetricCard label="Check-ins Pendentes" value={pendingCheckins} icon={ClipboardList} color="destructive" pulse={pendingCheckins > 0} onClick={() => navigate("/checkin-panel")} />
      </motion.div>

      {/* ── 3️⃣ AI Daily Briefing (expandable) ── */}
      <motion.div variants={item}>
        <BriefingExpandable
          aiSummary={aiSummary}
          aiLoading={aiLoading}
          aiInsights={aiInsights}
          attentionPatients={attentionPatients}
          pendingCheckins={pendingCheckins}
          appointmentsToday={appointmentsToday}
          riskPatients={riskPatients}
        />
      </motion.div>

      {/* ── Nutrition Copilot ── */}
      <motion.div variants={item}>
        <NutritionCopilot
          patients={riskPatients.map(p => ({
            id: p.id,
            name: p.name,
            score: p.score,
            risks: p.risks,
            lastActivity: p.lastActivity,
          }))}
          attentionPatients={attentionPatients}
          aiInsights={aiInsights}
          aiSummary={aiSummary}
          aiLoading={aiLoading}
          appointmentsToday={appointmentsToday}
          pendingCheckins={pendingCheckins}
          patientCount={patientCount}
          evolutionData={evolutionData}
        />
      </motion.div>

      {/* ── Main Grid: Attention + Insights + Risk ── */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ExpandablePanel title="Precisam de Atenção"><AttentionPatientsPanel patients={attentionPatients} loading={aiLoading} /></ExpandablePanel>
        <ExpandablePanel title="Insights da IA"><AIInsightsPanel insights={aiInsights} loading={aiLoading} /></ExpandablePanel>
        <ExpandablePanel title="Painel de Risco"><RiskPanel patients={riskPatients} /></ExpandablePanel>
      </motion.div>

      {/* ── Patient Retention Risk (Churn Prediction) ── */}
      <motion.div variants={item}>
        <ExpandablePanel title="Risco de Abandono">
          <ChurnRiskPanel
            patients={riskPatients.map(p => ({
              id: p.id,
              name: p.name,
              score: p.score,
              risks: p.risks,
              lastActivity: p.lastActivity,
            }))}
            loading={aiLoading}
          />
        </ExpandablePanel>
      </motion.div>

      {/* ── Patient Progress Simulation ── */}
      <motion.div variants={item}>
        <ExpandablePanel title="Simulação de Progresso">
          <PatientProgressSimulation
            patients={riskPatients.map(p => ({
              id: p.id,
              name: p.name,
              currentWeight: evolutionData.avgWeight,
              adherence: p.score,
              streak: 0,
            }))}
            loading={aiLoading}
          />
        </ExpandablePanel>
      </motion.div>

      {/* ── 5️⃣ Activity Feed + 7️⃣ Program Performance ── */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Feed */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-info" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Atividade Recente</h2>
              <p className="text-xs text-muted-foreground">Últimos eventos dos pacientes</p>
            </div>
          </div>
          {recentTimeline.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade registrada.</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {recentTimeline.slice(0, 8).map((ev, i) => {
                const conf = timelineEventIcons[ev.event_type] || timelineEventIcons.note;
                const Icon = conf.icon;
                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className={`w-3.5 h-3.5 ${conf.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      {ev.description && <p className="text-xs text-muted-foreground truncate">{ev.description}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-1">
                      {new Date(ev.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Program Performance */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Performance dos Programas</h2>
              <p className="text-xs text-muted-foreground">{programPerformance.length} programa{programPerformance.length !== 1 ? "s" : ""} ativo{programPerformance.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          {programPerformance.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Crie programas para acompanhar a performance.</p>
              <Link to="/programs">
                <Button variant="outline" size="sm" className="mt-3 gap-2"><Plus className="w-4 h-4" />Criar Programa</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {programPerformance.map((prog, i) => (
                <motion.div
                  key={prog.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => navigate(`/programs/${prog.id}`)}
                  className="p-3 rounded-lg bg-muted/20 border border-border/50 cursor-pointer hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold truncate">{prog.title}</p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{prog.patientCount} pacientes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={prog.avgAdherence} className="h-2 flex-1" />
                    <span className={`text-xs font-bold ${prog.avgAdherence >= 70 ? "text-success" : prog.avgAdherence >= 40 ? "text-warning" : "text-destructive"}`}>
                      {prog.avgAdherence}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── 6️⃣ Evolution Analytics ── */}
      <motion.div variants={item}>
        <ExpandablePanel title="Evolução Geral">
          <PatientEvolutionCharts
            data={evolutionData}
            activePeriod={evolutionPeriod}
            onPeriodChange={(days) => setEvolutionPeriod(days)}
          />
        </ExpandablePanel>
      </motion.div>

      {/* ── Adherence Analytics ── */}
      <motion.div variants={item}>
        <ExpandablePanel title="Análise de Adesão">
          <AdherenceAnalytics
            patientCount={patientCount}
            riskPatients={riskPatients}
            evolutionData={evolutionData}
          />
        </ExpandablePanel>
      </motion.div>


      {riskPatients.length > 0 && (
        <motion.div variants={item}>
          <ExpandablePanel title="Health Score dos Pacientes">
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold">Health Score</h2>
                  <p className="text-xs text-muted-foreground">Score 0-100 · adesão, registros e consistência</p>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {riskPatients.slice(0, 10).map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/patients/${p.id}`); }}
                    className="flex flex-col items-center gap-1 min-w-[80px] cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <HealthScoreRing score={p.score} size="sm" />
                    <p className="text-xs font-medium truncate max-w-[80px] text-center">{p.name.split(" ")[0]}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </ExpandablePanel>
        </motion.div>
      )}

      {/* ── System Usage Gamification ── */}
      <motion.div variants={item}>
        <SystemUsageCard />
      </motion.div>

      {/* ── 9️⃣ Module Shortcut Grid ── */}
      <motion.div variants={item}>
        <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Módulos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: "/protocols", icon: Shield, label: "Protocolos", color: "text-primary", bg: "bg-primary/10" },
            { to: "/programs", icon: Rocket, label: "Programas", color: "text-accent", bg: "bg-accent/10" },
            { to: "/meal-plans", icon: UtensilsCrossed, label: "Planos", color: "text-success", bg: "bg-success/10" },
            { to: "/recipes", icon: ChefHat, label: "Receitas", color: "text-warning", bg: "bg-warning/10" },
            { to: "/diet-templates", icon: FileText, label: "Templates", color: "text-info", bg: "bg-info/10" },
            { to: "/global-tips", icon: MessageSquare, label: "Dicas", color: "text-success", bg: "bg-success/10" },
            { to: "/automation", icon: Bot, label: "Automação", color: "text-info", bg: "bg-info/10" },
            { to: "/reports", icon: BarChart3, label: "Relatórios", color: "text-primary", bg: "bg-primary/10" },
            { to: "/appointments", icon: Calendar, label: "Agenda", color: "text-accent", bg: "bg-accent/10" },
            { to: "/supplements", icon: Pill, label: "Suplementos", color: "text-warning", bg: "bg-warning/10" },
          ].map((mod) => (
            <Link key={mod.to} to={mod.to}>
              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                className="glass rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/20 transition-all h-[72px]"
              >
                <div className={`w-10 h-10 rounded-lg ${mod.bg} flex items-center justify-center flex-shrink-0`}>
                  <mod.icon className={`w-5 h-5 ${mod.color}`} />
                </div>
                <p className="font-display font-semibold text-sm">{mod.label}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Daily Metric Card ──
function DailyMetricCard({ label, value, icon: Icon, color, pulse, onClick }: {
  label: string; value: number; icon: any; color: string; pulse?: boolean; onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      onClick={onClick}
      className={`glass rounded-xl p-4 cursor-pointer hover:border-${color}/30 transition-all`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg bg-${color}/10 flex items-center justify-center`}>
          <Icon className={`w-4.5 h-4.5 text-${color}`} />
        </div>
        {pulse && value > 0 && <span className={`w-2.5 h-2.5 rounded-full bg-${color} animate-pulse`} />}
      </div>
      <p className="font-display font-bold text-2xl">{value}</p>
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
    </motion.div>
  );
}

// ── Briefing Expandable ──
function BriefingExpandable({ aiSummary, aiLoading, aiInsights, attentionPatients, pendingCheckins, appointmentsToday, riskPatients }: {
  aiSummary: any; aiLoading: boolean; aiInsights: any[]; attentionPatients: any[];
  pendingCheckins: number; appointmentsToday: number; riskPatients: any[];
}) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const highRisk = riskPatients.filter(p => p.score < 30);
  const inactive = riskPatients.filter(p => {
    if (!p.lastActivity) return true;
    return Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / 86400000) >= 3;
  });

  return (
    <div
      className={`rounded-xl border transition-all cursor-pointer ${expanded ? "border-primary/30 bg-gradient-to-br from-primary/5 via-card to-accent/5" : "border-primary/20 bg-gradient-to-r from-primary/5 via-card to-accent/5"}`}
      onClick={() => setExpanded(prev => !prev)}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-display font-bold text-base">Briefing Diário da IA</h2>
              {aiLoading && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary animate-pulse">Analisando...</span>}
              <span className="text-[10px] text-muted-foreground ml-auto">{expanded ? "▲ Recolher" : "▼ Expandir"}</span>
            </div>
            {aiSummary ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">{aiSummary.high_risk_count || 0} paciente{(aiSummary.high_risk_count || 0) !== 1 ? "s" : ""} requer{(aiSummary.high_risk_count || 0) === 1 ? "" : "em"} atenção hoje.</span>
                {" "}{pendingCheckins > 0 ? `${pendingCheckins} check-in${pendingCheckins > 1 ? "s" : ""} pendente${pendingCheckins > 1 ? "s" : ""}. ` : "Todos os check-ins em dia. "}
                {appointmentsToday > 0 ? `${appointmentsToday} consulta${appointmentsToday > 1 ? "s" : ""} agendada${appointmentsToday > 1 ? "s" : ""}.` : "Nenhuma consulta hoje."}
                {aiSummary.top_concern ? ` Principal preocupação: ${aiSummary.top_concern}.` : ""}
              </p>
            ) : !aiLoading ? (
              <p className="text-sm text-muted-foreground">Cadastre pacientes com anamnese para ativar o briefing inteligente.</p>
            ) : null}
          </div>
          {aiSummary?.avg_adherence_estimate && (
            <div className="text-center px-3 flex-shrink-0 hidden sm:block">
              <p className="font-display text-2xl font-bold text-primary">{aiSummary.avg_adherence_estimate}%</p>
              <p className="text-[10px] text-muted-foreground">Adesão geral</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-border/30 pt-4" onClick={(e) => e.stopPropagation()}>
              {/* Quick metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg bg-destructive/10 p-3 text-center">
                  <p className="font-display font-bold text-lg text-destructive">{highRisk.length}</p>
                  <p className="text-[10px] text-muted-foreground">Alto Risco</p>
                </div>
                <div className="rounded-lg bg-warning/10 p-3 text-center">
                  <p className="font-display font-bold text-lg text-warning">{inactive.length}</p>
                  <p className="text-[10px] text-muted-foreground">Inativos (3d+)</p>
                </div>
                <div className="rounded-lg bg-info/10 p-3 text-center">
                  <p className="font-display font-bold text-lg text-info">{pendingCheckins}</p>
                  <p className="text-[10px] text-muted-foreground">Check-ins Pendentes</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 text-center">
                  <p className="font-display font-bold text-lg text-primary">{appointmentsToday}</p>
                  <p className="text-[10px] text-muted-foreground">Consultas Hoje</p>
                </div>
              </div>

              {/* AI Insights feed */}
              {aiInsights.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Insights da IA</p>
                  <div className="space-y-1.5">
                    {aiInsights.map((ins, i) => (
                      <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg border ${
                        ins.severity === "critical" ? "bg-destructive/5 border-destructive/20" :
                        ins.severity === "warning" ? "bg-warning/5 border-warning/20" : "bg-info/5 border-info/20"
                      }`}>
                        <Brain className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                          ins.severity === "critical" ? "text-destructive" : ins.severity === "warning" ? "text-warning" : "text-info"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{ins.title}</p>
                          <p className="text-[11px] text-muted-foreground">{ins.description}</p>
                        </div>
                        {ins.affected_count && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-card text-muted-foreground">{ins.affected_count}p</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attention patients */}
              {attentionPatients.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pacientes que precisam de ação</p>
                  <div className="space-y-1.5">
                    {attentionPatients.slice(0, 5).map((p: any, i: number) => (
                      <div
                        key={i}
                        onClick={() => navigate(`/patients/${p.patient_id}`)}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/50 cursor-pointer hover:border-primary/30 transition-all"
                      >
                        <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${
                          p.priority === "high" ? "text-destructive" : p.priority === "medium" ? "text-warning" : "text-info"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{p.patient_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{p.reason}</p>
                        </div>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


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
