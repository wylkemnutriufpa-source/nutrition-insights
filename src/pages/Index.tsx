import { useEffect, useState, useCallback, useRef } from "react";
import { useExperienceMode } from "@/hooks/useExperienceMode";
import GuidedTour, { PROFESSIONAL_TOUR_STEPS, PATIENT_TOUR_STEPS } from "@/components/common/GuidedTour";
import { motion, AnimatePresence } from "framer-motion";
import PatientGridDashboard from "@/components/dashboard/PatientGridDashboard";
import FitJourneyTimeline from "@/components/timeline/FitJourneyTimeline";
import ProStrategicDashboard from "@/components/dashboard/ProStrategicDashboard";
import { useLayoutPreference } from "@/hooks/useLayoutPreference";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useWorkspaceContext } from "@/hooks/useWorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AIInsightsPanel from "@/components/dashboard/AIInsightsPanel";
import AttentionPatientsPanel from "@/components/dashboard/AttentionPatientsPanel";
import PatientEvolutionCharts from "@/components/dashboard/PatientEvolutionCharts";
import RiskPanel from "@/components/dashboard/RiskPanel";
import HealthScoreRing, { calculateHealthScore } from "@/components/dashboard/HealthScoreRing";
import AdherenceAnalytics from "@/components/dashboard/AdherenceAnalytics";
import DashboardAdvancedCharts from "@/components/dashboard/DashboardAdvancedCharts";
import AnalyticsDashboard from "@/components/dashboard/AnalyticsDashboard";
import AIStrategyCenter from "@/components/dashboard/AIStrategyCenter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import SystemUsageCard from "@/components/dashboard/SystemUsageCard";
import NutritionCopilot from "@/components/dashboard/NutritionCopilot";
import ChurnRiskPanel from "@/components/dashboard/ChurnRiskPanel";
import StagnationAlerts from "@/components/dashboard/StagnationAlerts";
import ClinicalRiskDashboardContent from "@/components/dashboard/ClinicalRiskDashboardContent";
import PendingApprovalsModal, { usePendingApprovals } from "@/components/patient/PendingApprovalsModal";
import CinematicIntro from "@/components/landing/CinematicIntro";
import BrainLoader from "@/components/common/BrainLoader";

import PatientProgressSimulation from "@/components/dashboard/PatientProgressSimulation";
import PortfolioIntelligencePanel from "@/components/dashboard/PortfolioIntelligencePanel";
import FitJourneyIntelligencePanel from "@/components/dashboard/FitJourneyIntelligencePanel";
import { PremiumControlTowerBanner } from "@/components/premium/PremiumBanners";
import SetupWizard from "@/components/professional/SetupWizard";
import PatientRevenueSimulator from "@/components/dashboard/PatientRevenueSimulator";
import OnlinePatientsWidget from "@/components/dashboard/OnlinePatientsWidget";
import ChatDashboardWidget from "@/components/chat/ChatDashboardWidget";
import { TreatmentInsightsPanel } from "@/components/dashboard/TreatmentInsightsPanel";
import ExpandablePanel from "@/components/common/ExpandablePanel";
import PatientMomentumSummary from "@/components/dashboard/PatientMomentumSummary";
import InlineExperienceToggle from "@/components/dashboard/InlineExperienceToggle";
import {
  UtensilsCrossed, Users, TrendingUp, Target, Plus,
  CheckCircle2, AlertTriangle, Activity, FileText, Rocket,
  Calendar, ArrowRight, ClipboardList, Heart, Brain,
  BarChart3, Shield, ChefHat, MessageSquare, Bot, Pill, Stethoscope, Sparkles, UserPlus,
  Link2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

// Legacy PatientDashboardContent removed — patients now use PatientGridDashboard exclusively

// ──── Nutritionist Dashboard 3.0 — Clinical Command Center ────
function NutritionistDashboardContent() {
  const { user } = useAuth();
  const { minMode, isBasic } = useExperienceMode();
  const navigate = useNavigate();
  const [patientCount, setPatientCount] = useState(0);
  const [protocolCount, setProtocolCount] = useState(0);
  const [programCount, setProgramCount] = useState(0);
  const [mealPlanCount, setMealPlanCount] = useState(0);
  const [appointmentsToday, setAppointmentsToday] = useState(0);
  const [pendingCheckins, setPendingCheckins] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [sessionProfiles, setSessionProfiles] = useState<Record<string, string>>({});

  // Pending approvals modal
  const pendingApprovalsCount = usePendingApprovals();
  const [approvalsModalOpen, setApprovalsModalOpen] = useState(false);

  // Auto-open modal ONCE per session — stable, never re-opens after dismiss or first show
  const APPROVALS_DISMISSED_KEY = "fj_approvals_dismissed_v3";
  const hasAutoOpened = useRef(false);
  useEffect(() => {
    // Only auto-open once, ever, during this component's lifetime
    if (hasAutoOpened.current) return;
    if (pendingApprovalsCount <= 0) return;
    // Check sessionStorage — if dismissed this session, never reopen
    if (sessionStorage.getItem(APPROVALS_DISMISSED_KEY) === "true") {
      hasAutoOpened.current = true; // Mark so we don't keep checking
      return;
    }
    hasAutoOpened.current = true;
    setApprovalsModalOpen(true);
  }, [pendingApprovalsCount]);

  const handleApprovalsModalChange = (open: boolean) => {
    setApprovalsModalOpen(open);
    if (!open) {
      sessionStorage.setItem(APPROVALS_DISMISSED_KEY, "true");
    }
  };

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
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);

  // Program performance
  const [programPerformance, setProgramPerformance] = useState<{ id: string; title: string; patientCount: number; avgAdherence: number }[]>([]);

  const fetchingRef = useRef(false);
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const fetchDashboard = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    if (fetchingRef.current) return; // prevent concurrent/loop calls
    fetchingRef.current = true;

    try {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

      const [patientsRes, protocolsRes, programsRes, plansRes, aptsRes, chatsRes, pendingRes, programsListRes, sessionsRes] = await Promise.all([
        supabase.from("nutritionist_patients").select("id, patient_id", { count: "exact" }).eq("nutritionist_id", userId).eq("status", "active"),
        supabase.from("protocols").select("id", { count: "exact" }).eq("created_by", userId),
        supabase.from("programs").select("id", { count: "exact" }).eq("created_by", userId).eq("is_active", true),
        supabase.from("meal_plans").select("id", { count: "exact" }).eq("nutritionist_id", userId).eq("is_active", true),
        supabase.from("patient_appointments").select("id", { count: "exact" }).eq("nutritionist_id", userId).gte("appointment_date", todayStart.toISOString()).lte("appointment_date", todayEnd.toISOString()),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("receiver_id", userId).eq("is_read", false),
        supabase.from("patient_checkins").select("id", { count: "exact", head: true }).eq("nutritionist_id", userId).eq("status", "pending"),
        supabase.from("programs").select("id, title").eq("created_by", userId).eq("is_active", true).limit(5),
        supabase.from("in_office_sessions" as any).select("*").eq("nutritionist_id", userId).is("completed_at", null).order("created_at", { ascending: false }),
      ]);

      setPatientCount(patientsRes.count || 0);
      setProtocolCount(protocolsRes.count || 0);
      setProgramCount(programsRes.count || 0);
      setMealPlanCount(plansRes.count || 0);
      setAppointmentsToday(aptsRes.count || 0);
      setUnreadChats(chatsRes.count || 0);
      setPendingCheckins(pendingRes.count || 0);

      setActiveSessions(sessionsRes.data || []);
      if (sessionsRes.data && sessionsRes.data.length > 0) {
        const sIds = sessionsRes.data.map((s: any) => s.patient_id);
        const { data: pData } = await supabase.from("profiles").select("user_id, full_name").in("user_id", sIds);
        const m: Record<string, string> = {};
        (pData || []).forEach(p => { m[p.user_id] = p.full_name; });
        setSessionProfiles(m);
      }

      // Fetch timeline filtered by nutritionist's patients with patient names
      const patientIds = (patientsRes.data || []).map((p: any) => p.patient_id);
      if (patientIds.length > 0) {
        const [timelineRes, profilesRes] = await Promise.all([
          supabase.from("patient_timeline").select("*").in("patient_id", patientIds).order("created_at", { ascending: false }).limit(15),
          supabase.from("profiles").select("user_id, full_name").in("user_id", patientIds),
        ]);
        const nameMap: Record<string, string> = {};
        (profilesRes.data || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });
        const enriched = (timelineRes.data || []).map((ev: any) => ({
          ...ev,
          patient_name: nameMap[ev.patient_id] || "Paciente",
        }));
        setRecentTimeline(enriched);
      } else {
        setRecentTimeline([]);
      }

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

      // Process patients for health scores & risk panel — batch queries instead of per-patient loop
      const patientIds2 = patientsRes.data?.map(p => p.patient_id) || [];
      const limitedIds = patientIds2.slice(0, 30);
      if (limitedIds.length > 0) {
        const periodDate = new Date(Date.now() - evolutionPeriod * 86400000).toISOString();

        // Batch all patient data in parallel (6 bulk queries instead of 30×6 individual)
        const [allProfiles, allAnamnesis, allStats, allChecks, allMeals, allAssess] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name").in("user_id", limitedIds),
          supabase.from("patient_anamnesis").select("user_id, answers, status").in("user_id", limitedIds).order("created_at", { ascending: false }),
          supabase.from("player_stats").select("user_id, current_streak, meals_logged, level").in("user_id", limitedIds),
          supabase.from("checklist_tasks").select("patient_id, completed").in("patient_id", limitedIds).gte("date", periodDate.split("T")[0]),
          supabase.from("meals").select("user_id, logged_at").in("user_id", limitedIds).gte("logged_at", periodDate),
          supabase.from("physical_assessments").select("patient_id, weight, assessment_date").in("patient_id", limitedIds).order("assessment_date", { ascending: false }),
        ]);

        // Index data by patient
        const profileMap: Record<string, string> = {};
        (allProfiles.data || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });
        const anamMap: Record<string, any> = {};
        (allAnamnesis.data || []).forEach((a: any) => { if (!anamMap[a.user_id]) anamMap[a.user_id] = a; }); // first = latest
        const statsMap: Record<string, any> = {};
        (allStats.data || []).forEach((s: any) => { statsMap[s.user_id] = s; });
        const checkMap: Record<string, { total: number; completed: number }> = {};
        (allChecks.data || []).forEach((c: any) => {
          if (!checkMap[c.patient_id]) checkMap[c.patient_id] = { total: 0, completed: 0 };
          checkMap[c.patient_id].total++;
          if (c.completed) checkMap[c.patient_id].completed++;
        });
        const mealMap: Record<string, { count: number; last?: string }> = {};
        (allMeals.data || []).forEach((m: any) => {
          if (!mealMap[m.user_id]) mealMap[m.user_id] = { count: 0 };
          mealMap[m.user_id].count++;
          if (!mealMap[m.user_id].last || m.logged_at > mealMap[m.user_id].last!) mealMap[m.user_id].last = m.logged_at;
        });
        const assessMap: Record<string, { weight: number; date: string }> = {};
        (allAssess.data || []).forEach((a: any) => { if (!assessMap[a.patient_id]) assessMap[a.patient_id] = { weight: a.weight, date: a.assessment_date }; });

        const patientDataForAI: any[] = [];
        const riskList: typeof riskPatients = [];
        let totalScore = 0, totalWeight = 0, weightCount = 0, totalCheckins = 0, totalAdherence = 0, adherenceCount = 0;

        for (const pid of limitedIds) {
          const name = profileMap[pid]?.trim();
          if (!name) continue;
          const anam = anamMap[pid];
          const stats = statsMap[pid];
          const checks = checkMap[pid] || { total: 0, completed: 0 };
          const checkCompletion = checks.total > 0 ? Math.round((checks.completed / checks.total) * 100) : 0;
          const meals = mealMap[pid] || { count: 0 };
          const assess = assessMap[pid];

          const score = calculateHealthScore({
            hasAnamnesis: anam?.status === "completed",
            checklistCompletion: checkCompletion,
            mealsLogged: meals.count,
            weightEntries: assess ? 1 : 0,
            currentStreak: stats?.current_streak || 0,
            daysAsPatient: 30,
          });

          totalScore += score;
          totalCheckins += meals.count + checks.completed;
          if (checks.total > 0) { totalAdherence += checkCompletion; adherenceCount++; }
          if (assess?.weight) { totalWeight += Number(assess.weight); weightCount++; }

          const risks: string[] = [];
          if (anam?.answers) {
            const a = anam.answers as Record<string, any>;
            if (a.health_conditions?.some((c: string) => c !== "none")) risks.push("Condição de saúde");
            if (a.activity_level === "sedentary") risks.push("Sedentário");
            if (a.feeling === "terrible" || a.feeling === "bad") risks.push("Insatisfeito");
            if (a.sleep_quality === "bad" || a.sleep_quality === "terrible") risks.push("Sono ruim");
          }
          if (checkCompletion < 30 && checks.total > 0) risks.push("Baixa adesão");
          if (meals.count === 0) risks.push("Sem registros");
          if (stats?.current_streak === 0 && stats?.meals_logged > 5) risks.push("Perdeu streak");

          const lastActivity = meals.last || assess?.date || undefined;
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
            meals_last_period: meals.count,
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
          avgScore: limitedIds.length > 0 ? Math.round(totalScore / limitedIds.length) : 0,
        });

        if (patientDataForAI.length > 0) {
          fetchAIInsights(patientDataForAI);
        }
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [evolutionPeriod]); // stable — uses ref for userId

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDashboard(); }, [user?.id, evolutionPeriod]);

  const quickActions = [
    { label: "Modo Consultório", icon: Stethoscope, to: "/in-office", color: "bg-primary/20 text-primary hover:bg-primary/30 shadow-md shadow-primary/5 border border-primary/20" },
    { label: "Link Rápido", icon: Link2, to: "/settings", color: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20" },
    { label: "Convidar Paciente", icon: UserPlus, to: "/invite-patient", color: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/20" },
    { label: "Novo Paciente", icon: Users, to: "/patients", color: "bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary" },
    { label: "Nova Consulta", icon: Calendar, to: "/appointments", color: "bg-muted/50 text-muted-foreground hover:bg-info/10 hover:text-info" },
  ];

  const timelineEventIcons: Record<string, { icon: any; color: string }> = {
    checkin: { icon: CheckCircle2, color: "text-success" },
    program: { icon: Rocket, color: "text-accent" },
    appointment: { icon: Calendar, color: "text-info" },
    assessment: { icon: Activity, color: "text-primary" },
    note: { icon: FileText, color: "text-muted-foreground" },
  };

  const [activeTab, setActiveTab] = useState("clinical");

   return (
    <div className="space-y-6">
      {/* FitJourney Timeline — PRO+ */}
      {minMode("pro") && <FitJourneyTimeline maxHeight="500px" />}

      {/* Pending Approvals Modal */}
      <PendingApprovalsModal open={approvalsModalOpen} onOpenChange={handleApprovalsModalChange} />

      {/* Pending approvals banner */}
      {pendingApprovalsCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 cursor-pointer"
          onClick={() => setApprovalsModalOpen(true)}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium">
              {pendingApprovalsCount} plano{pendingApprovalsCount > 1 ? "s" : ""} pendente{pendingApprovalsCount > 1 ? "s" : ""} de aprovação
            </span>
          </div>
          <Button size="sm" variant="outline">
            Revisar agora <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      )}

      {/* Active Session Resume Banner */}
      {activeSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-primary shadow-lg shadow-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-white"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Atendimento em andamento</p>
              <h3 className="text-lg font-bold font-display">{sessionProfiles[activeSessions[0].patient_id] || "Paciente"}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="secondary" 
              className="w-full sm:w-auto gap-2"
              onClick={() => navigate(`/in-office/${activeSessions[0].patient_id}`)}
            >
              Retomar Consulta <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* ── Quick Access: Other Views — PRO+ ── */}
      {minMode("pro") && (
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "analytics", icon: BarChart3, label: "Analytics", desc: "Visão estratégica" },
          { key: "strategy", icon: Brain, label: "IA Estratégica", desc: "Diagnóstico com IA" },
          { key: "risk", icon: Shield, label: "Risco Clínico", desc: "Monitoramento de alertas" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(activeTab === tab.key ? "clinical" : tab.key)}
            className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border transition-all duration-200 ${
              activeTab === tab.key
                ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
                : "border-border/50 bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-muted/30"
            }`}
          >
            <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.key ? "text-primary" : ""}`} />
            {tab.label}
          </button>
        ))}
      </div>
      )}

      {minMode("pro") && activeTab === "analytics" ? (
        <AnalyticsDashboard />
      ) : minMode("pro") && activeTab === "strategy" ? (
        <AIStrategyCenter />
      ) : minMode("pro") && activeTab === "risk" ? (
        <ClinicalRiskDashboardContent />
      ) : null}

      {/* ── Clinical Dashboard — Always visible as main content ── */}
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ── Premium Header ── */}
      <motion.div variants={item} className="relative overflow-hidden rounded-2xl gradient-border particles-bg">
        <div className="glass-premium rounded-2xl p-6 shimmer-sweep relative z-0">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-muted-foreground mb-1"
              >
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </motion.p>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                {isBasic ? "Meu Painel" : "Dashboard Clínico"}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {isBasic ? "Visão geral dos seus pacientes" : "Central de Comando · Inteligência Clínica"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {unreadChats > 0 && (
                <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => navigate("/chat")}>
                  <MessageSquare className="w-4 h-4" />
                  {unreadChats} mensagem{unreadChats > 1 ? "s" : ""}
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                </Button>
              )}
            </div>
          </div>
        </div>
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

      {/* ── Setup Wizard & Focus — BASIC+ ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={item}>
          <SetupWizard />
        </motion.div>
        {minMode("pro") && (
          <motion.div variants={item} className="glass-premium rounded-xl p-5 shimmer-sweep flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-bold">Foco Clínico</h2>
                <p className="text-xs text-muted-foreground">Prioridades automáticas para hoje</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-xs font-medium">Pacientes Críticos</span>
                </div>
                <span className="text-xs font-bold">{riskPatients.filter(p => p.score < 30).length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-xs font-medium">Check-ins Pendentes</span>
                </div>
                <span className="text-xs font-bold">{pendingCheckins}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-info" />
                  <span className="text-xs font-medium">Consultas Agendadas</span>
                </div>
                <span className="text-xs font-bold">{appointmentsToday}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── FitJourney Intelligence — PRO+ ── */}
      {minMode("pro") && (
        <motion.div variants={item}>
          <FitJourneyIntelligencePanel />
        </motion.div>
      )}

      {/* ── Premium Control Tower Banner — ADVANCED ── */}
      {minMode("advanced") && (
        <motion.div variants={item}>
          <PremiumControlTowerBanner />
        </motion.div>
      )}

      {/* ── Portfolio Intelligence — PRO+ ── */}
      {minMode("pro") && (
        <motion.div variants={item}>
          <PortfolioIntelligencePanel />
        </motion.div>
      )}

      {/* ── 1️⃣ Daily Overview Cards ── */}
      <motion.div variants={item} className={`grid grid-cols-2 sm:grid-cols-3 ${isBasic ? "lg:grid-cols-4" : "lg:grid-cols-6"} gap-3`}>
        <DailyMetricCard label="Pacientes" value={patientCount} icon={Users} color="primary" onClick={() => navigate("/patients")} />
        <DailyMetricCard label="Consultas Hoje" value={appointmentsToday} icon={Calendar} color="info" onClick={() => navigate("/appointments")} />
        {minMode("pro") && <DailyMetricCard label="Programas Ativos" value={programCount} icon={Rocket} color="accent" onClick={() => navigate("/programs")} />}
        {minMode("pro") && <DailyMetricCard label="Protocolos" value={protocolCount} icon={FileText} color="warning" onClick={() => navigate("/protocols")} />}
        <DailyMetricCard label="Check-ins Pendentes" value={pendingCheckins} icon={ClipboardList} color="destructive" pulse={pendingCheckins > 0} onClick={() => navigate("/checkin-panel")} />
        {minMode("pro") && <OnlinePatientsWidget variant="card" showPremiumTag={true} />}
        <ChatDashboardWidget />
      </motion.div>

      {/* ── 3️⃣ AI Daily Briefing — PRO+ ── */}
      {minMode("pro") && (
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
      )}

      {/* ── Nutrition Copilot — PRO+ ── */}
      {minMode("pro") && (
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
      )}

      {/* ── Main Grid: Attention + Insights + Risk — PRO+ ── */}
      {minMode("pro") && (
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ExpandablePanel title="Precisam de Atenção"><AttentionPatientsPanel patients={attentionPatients} loading={aiLoading} /></ExpandablePanel>
          <ExpandablePanel title="Insights da IA"><AIInsightsPanel insights={aiInsights} loading={aiLoading} /></ExpandablePanel>
          <ExpandablePanel title="Painel de Risco"><RiskPanel patients={riskPatients} /></ExpandablePanel>
        </motion.div>
      )}

      {/* ── Momentum dos Pacientes — PRO+ ── */}
      {minMode("pro") && (
        <motion.div variants={item}>
          <ExpandablePanel title="Momentum dos Pacientes">
            <PatientMomentumSummary />
          </ExpandablePanel>
        </motion.div>
      )}

      {/* ── Insights Comportamentais — PRO+ ── */}
      {minMode("pro") && (
        <motion.div variants={item}>
          <ExpandablePanel title="Insights Comportamentais">
            <TreatmentInsightsPanel />
          </ExpandablePanel>
        </motion.div>
      )}

      {/* ── Patient Retention Risk — ADVANCED ── */}
      {minMode("advanced") && (
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
      )}

      {/* ── Stagnation Alerts — ADVANCED ── */}
      {minMode("advanced") && (
        <motion.div variants={item}>
          <ExpandablePanel title="Alertas de Estagnação">
            <StagnationAlerts />
          </ExpandablePanel>
        </motion.div>
      )}

      {/* ── Patient Progress Simulation — ADVANCED ── */}
      {minMode("advanced") && (
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
      )}

      {/* ── Simulador de Faturamento — ADVANCED ── */}
      {minMode("advanced") && (
        <motion.div variants={item}>
          <ExpandablePanel title="Simulador de Faturamento — Pacientes">
            <PatientRevenueSimulator />
          </ExpandablePanel>
        </motion.div>
      )}

      {/* ── 5️⃣ Activity Feed + 7️⃣ Program Performance ── */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Feed */}
        <div className="glass-premium rounded-xl p-5 shimmer-sweep">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-info" />
              </div>
              <div>
                <h2 className="font-display font-semibold">Atividade Recente</h2>
                <p className="text-xs text-muted-foreground">Últimos eventos dos pacientes</p>
              </div>
            </div>
            {recentTimeline.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setTimelineModalOpen(true)}>
                Ver tudo <ArrowRight className="w-3 h-3" />
              </Button>
            )}
          </div>
          {recentTimeline.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade registrada.</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {recentTimeline.slice(0, 5).map((ev, i) => {
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
                      <p className="text-sm font-medium truncate">
                        {ev.patient_name && <span className="text-primary">{ev.patient_name}</span>}
                        {ev.patient_name ? " — " : ""}{ev.title}
                      </p>
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

        {/* Timeline Expanded Modal */}
        <Dialog open={timelineModalOpen} onOpenChange={setTimelineModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-info" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold">Atividades Recentes</h2>
                <p className="text-xs text-muted-foreground">{recentTimeline.length} eventos registrados</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 py-2">
              {recentTimeline.map((ev, i) => {
                const conf = timelineEventIcons[ev.event_type] || timelineEventIcons.note;
                const Icon = conf.icon;
                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className={`w-4 h-4 ${conf.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {ev.patient_name && (
                          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{ev.patient_name}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(ev.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1">{ev.title}</p>
                      {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Program Performance */}
        <div className="glass-premium rounded-xl p-5 shimmer-sweep">
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

      {/* ── 6️⃣ Evolution Analytics — PRO+ ── */}
      {minMode("pro") && (
        <motion.div variants={item}>
          <ExpandablePanel title="Evolução Geral">
            <PatientEvolutionCharts
              data={evolutionData}
              activePeriod={evolutionPeriod}
              onPeriodChange={(days) => setEvolutionPeriod(days)}
            />
          </ExpandablePanel>
        </motion.div>
      )}

      {/* ── Adherence Analytics — PRO+ ── */}
      {minMode("pro") && (
        <motion.div variants={item}>
          <ExpandablePanel title="Análise de Adesão">
            <AdherenceAnalytics
              patientCount={patientCount}
              riskPatients={riskPatients}
              evolutionData={evolutionData}
            />
          </ExpandablePanel>
        </motion.div>
      )}

      {/* ── Advanced Analytics Charts — ADVANCED ── */}
      {minMode("advanced") && (
        <motion.div variants={item}>
          <ExpandablePanel title="Analytics Avançados">
            <DashboardAdvancedCharts
              riskPatients={riskPatients}
              evolutionData={evolutionData}
              programPerformance={programPerformance}
              patientCount={patientCount}
            />
          </ExpandablePanel>
        </motion.div>
      )}

      {/* ── Health Score — PRO+ ── */}
      {minMode("pro") && riskPatients.length > 0 && (
        <motion.div variants={item}>
          <ExpandablePanel title="Health Score dos Pacientes">
            <div className="glass-premium rounded-xl p-5 shimmer-sweep">
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

      {/* ── System Usage Gamification — ADVANCED ── */}
      {minMode("advanced") && (
        <motion.div variants={item}>
          <SystemUsageCard />
        </motion.div>
      )}

      {/* ── 9️⃣ Module Shortcut Grid (Premium) ── */}
      <motion.div variants={item}>
        <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-8 h-[2px] gradient-primary rounded-full" />
          Módulos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { to: "/patients", icon: Users, label: "Pacientes", color: "text-primary", bg: "bg-gradient-to-br from-primary/15 to-primary/5", min: "basic" as const },
            { to: "/appointments", icon: Calendar, label: "Agenda", color: "text-accent", bg: "bg-gradient-to-br from-accent/15 to-accent/5", min: "basic" as const },
            { to: "/meal-plans", icon: UtensilsCrossed, label: "Planos", color: "text-success", bg: "bg-gradient-to-br from-success/15 to-success/5", min: "basic" as const },
            { to: "/recipes", icon: ChefHat, label: "Receitas", color: "text-warning", bg: "bg-gradient-to-br from-warning/15 to-warning/5", min: "basic" as const },
            { to: "/protocols", icon: Shield, label: "Protocolos", color: "text-primary", bg: "bg-gradient-to-br from-primary/15 to-primary/5", min: "pro" as const },
            { to: "/programs", icon: Rocket, label: "Programas", color: "text-accent", bg: "bg-gradient-to-br from-accent/15 to-accent/5", min: "pro" as const },
            { to: "/reports", icon: BarChart3, label: "Relatórios", color: "text-primary", bg: "bg-gradient-to-br from-primary/15 to-primary/5", min: "pro" as const },
            { to: "/supplements", icon: Pill, label: "Suplementos", color: "text-warning", bg: "bg-gradient-to-br from-warning/15 to-warning/5", min: "pro" as const },
            { to: "/diet-templates", icon: FileText, label: "Templates", color: "text-info", bg: "bg-gradient-to-br from-info/15 to-info/5", min: "pro" as const },
            { to: "/automation", icon: Bot, label: "Automação", color: "text-info", bg: "bg-gradient-to-br from-info/15 to-info/5", min: "advanced" as const },
            { to: "/global-tips", icon: MessageSquare, label: "Dicas", color: "text-success", bg: "bg-gradient-to-br from-success/15 to-success/5", min: "basic" as const },
          ].filter(mod => minMode(mod.min)).map((mod, i) => (
            <Link key={mod.to} to={mod.to}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ y: -4, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="glass-premium rounded-xl p-4 flex items-center gap-3 cursor-pointer metric-glow transition-all duration-300 h-[72px] group"
              >
                <div className={`w-10 h-10 rounded-xl ${mod.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <mod.icon className={`w-5 h-5 ${mod.color}`} />
                </div>
                <p className="font-display font-semibold text-sm">{mod.label}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
    </div>
  );
}

// ── Daily Metric Card (Premium) ──
function DailyMetricCard({ label, value, icon: Icon, color, pulse, onClick }: {
  label: string; value: number; icon: any; color: string; pulse?: boolean; onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`glass-premium rounded-xl p-4 cursor-pointer metric-glow transition-all duration-300 shimmer-sweep`}
    >
      <div className="flex items-center justify-between mb-2">
        <motion.div
          whileHover={{ rotate: 8 }}
          className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center`}
        >
          <Icon className={`w-5 h-5 text-${color}`} />
        </motion.div>
        {pulse && value > 0 && (
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${color} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-${color}`} />
          </span>
        )}
      </div>
      <motion.p
        key={value}
        initial={{ scale: 1.15, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="font-display font-bold text-2xl counter-animate"
      >
        {value}
      </motion.p>
      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{label}</p>
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
  const { user, isNutritionist, isPersonal, isAdmin, loading } = useAuth();
  const { isPatientContext, isHybridUser } = useWorkspaceContext();
  const { minMode } = useExperienceMode();
  const [showTour, setShowTour] = useState(false);
  const { proView, setProView } = useLayoutPreference();
  const navigate = useNavigate();
  const location = useLocation();
  const [showIntro, setShowIntro] = useState(false);

  const isProRole = isNutritionist || isPersonal || isAdmin;
  // For hybrid users, respect workspace context; for pure roles, use role check
  const isPatient = isHybridUser ? isPatientContext : (!isProRole && !isAdmin);

  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const tourKey = isProRole ? "tour_professional_completed" : "tour_patient_completed";
  const onboardingKey = isProRole ? "fitjourney_professional_onboarding_completed" : "patient_onboarding_completed";
  const INTRO_STORAGE_KEY = "fj_intro_seen";

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const forceIntro = searchParams.get("intro") === "1";
    const hasSeenIntro = sessionStorage.getItem(INTRO_STORAGE_KEY) === "1";
    
    // Mostramos a intro se for forçado VIA URL ou se for o primeiro acesso logado do usuário nesta sessão
    if (forceIntro || (!hasSeenIntro && !loading && user)) {
      setShowIntro(true);
    }
  }, [location.search, loading, user]);

  // Auto-trigger tour after onboarding — with 30min cooldown
  useEffect(() => {
    if (loading || showIntro) return;
    const onboardingDone = localStorage.getItem(onboardingKey) === "true";
    const tourDone = localStorage.getItem(tourKey) === "true";
    if (tourDone || !onboardingDone) return;

    const dismissedAt = localStorage.getItem(`${tourKey}_dismissed_at`);
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < 30 * 60 * 1000) return;
    }

    const timer = setTimeout(() => setShowTour(true), 1500);
    return () => clearTimeout(timer);
  }, [loading, onboardingKey, tourKey, showIntro]);

  if (showIntro) {
    return (
      <CinematicIntro 
        onComplete={() => {
          setShowIntro(false);
          sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
          if (location.search.includes("intro=1")) {
            navigate("/", { replace: true });
          }
        }} 
      />
    );
  }

  if (loading && !showIntro) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <BrainLoader text="Iniciando FitJourney..." />
        </div>
      </DashboardLayout>
    );
  }

  const renderContent = () => {
    if (isPatient) {
      return <PatientGridDashboard />;
    }

    // Professional / Admin view with toggle
    return (
      <div className="space-y-6">
        {/* Experience mode inline toggle */}
        {minMode("pro") && <InlineExperienceToggle />}
        {/* View mode toggle — PRO+ only */}
        {minMode("pro") && (
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <Button
                variant={proView === "clinical-list" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 gap-1.5 text-xs"
                onClick={() => setProView("clinical-list")}
              >
                <ListIcon className="w-3.5 h-3.5" />
                Lista Clínica
              </Button>
              <Button
                variant={proView === "strategic-dashboard" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 gap-1.5 text-xs"
                onClick={() => setProView("strategic-dashboard")}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Dashboard
              </Button>
            </div>
          </div>
        )}

        {minMode("pro") && proView === "strategic-dashboard" ? (
          <ProStrategicDashboard />
        ) : (
          <NutritionistDashboardContent />
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      {renderContent()}
      {showTour && (
        <GuidedTour
          steps={isProRole ? PROFESSIONAL_TOUR_STEPS : PATIENT_TOUR_STEPS}
          storageKey={tourKey}
          onComplete={() => {
            setShowTour(false);
            localStorage.setItem(`${tourKey}_dismissed_at`, String(Date.now()));
          }}
        />
      )}
    </DashboardLayout>
  );
}
