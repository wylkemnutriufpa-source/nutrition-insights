import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import MetabolicRadar from "@/components/dashboard/MetabolicRadar";
import { AnamnesisInsightsFull } from "@/components/patient/AnamnesisInsightsCard";
import PatientCalculators from "@/components/patient/PatientCalculators";
import PatientAgenda from "@/components/patient/PatientAgenda";
import BodyEvolutionCard from "@/components/patient/BodyEvolutionCard";
import HealthScoreRing, { calculateHealthScore } from "@/components/dashboard/HealthScoreRing";
import ConsultationCompare from "@/components/patient/ConsultationCompare";
import PatientCheckinsTab from "@/components/patient/PatientCheckinsTab";
import PatientChecklistView from "@/components/patient/PatientChecklistView";
import SmartAlertsBanner from "@/components/patient/SmartAlertsBanner";
import PlanScheduler from "@/components/plans/PlanScheduler";
import {
  ArrowLeft, User, Calendar, FileText, ListChecks, Play,
  Clock, Activity, Plus, MessageSquare, AlertTriangle, CheckCircle2,
  TrendingUp, Zap, Heart, Brain, BookOpen, Scale, Calculator, CalendarDays, CreditCard, Send, UtensilsCrossed, X, Maximize2, ChefHat
} from "lucide-react";

interface PatientProfile {
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: any;
  created_at: string;
  created_by: string | null;
}

interface Anamnesis {
  id: string;
  answers: any;
  computed_tmb: number | null;
  computed_kcal_target: number | null;
  computed_protein: number | null;
  computed_carbs: number | null;
  computed_fat: number | null;
  status: string;
  created_at: string;
}

interface MealPlan {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

interface PatientProtocol {
  id: string;
  protocol_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  protocol_title?: string;
}

export default function PatientDetail() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [anamnesis, setAnamnesis] = useState<Anamnesis | null>(null);
  const [patientProtocols, setPatientProtocols] = useState<PatientProtocol[]>([]);
  const [protocols, setProtocols] = useState<any[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [checklistStats, setChecklistStats] = useState({ total: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  // Activation dialog
  const [activateOpen, setActivateOpen] = useState(false);
  const [activateForm, setActivateForm] = useState({
    protocol_id: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    status: "active",
  });

  // Timeline note dialog
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: "", description: "", event_type: "note" });

  // Plan management
  const [planOpen, setPlanOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [patientSubscription, setPatientSubscription] = useState<any>(null);
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [planForm, setPlanForm] = useState({
    plan_name: "",
    started_at: new Date().toISOString().split("T")[0],
    expires_at: "",
  });

  // Feedback scheduling
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    days: "3",
    message: "Como você está se sentindo com o plano alimentar? Gostaria de compartilhar seu progresso?",
  });

  const fetchAll = useCallback(async () => {
    if (!patientId || !user) return;
    setLoading(true);

    const [profileRes, timelineRes, anamnesisRes, ppRes, protocolsRes, checkRes, subRes, plansRes, mealPlansRes, recipesRes] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url, phone").eq("user_id", patientId).single(),
      supabase.from("patient_timeline").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(50),
      supabase.from("patient_anamnesis").select("*").eq("user_id", patientId).order("created_at", { ascending: false }).limit(1),
      supabase.from("patient_protocols").select("*").eq("patient_id", patientId).eq("nutritionist_id", user.id).order("created_at", { ascending: false }),
      supabase.from("protocols").select("id, title").eq("created_by", user.id),
      supabase.from("checklist_tasks").select("id, completed").eq("patient_id", patientId).eq("date", new Date().toISOString().split("T")[0]),
      supabase.from("subscriptions").select("*").eq("user_id", patientId).order("created_at", { ascending: false }).limit(1),
      supabase.from("pricing_plans").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("meal_plans").select("*").eq("patient_id", patientId).eq("nutritionist_id", user.id).order("created_at", { ascending: false }),
      supabase.from("recipes").select("*").eq("nutritionist_id", user.id).eq("is_shared", true).order("created_at", { ascending: false }),
    ]);

    setProfile(profileRes.data);
    setTimeline(timelineRes.data || []);
    setAnamnesis(anamnesisRes.data?.[0] || null);
    setProtocols(protocolsRes.data || []);
    setChecklistStats({
      total: checkRes.data?.length || 0,
      completed: checkRes.data?.filter((t: any) => t.completed).length || 0,
    });

    // Enrich patient protocols with title
    if (ppRes.data && protocolsRes.data) {
      const enriched = ppRes.data.map((pp: any) => ({
        ...pp,
        protocol_title: protocolsRes.data?.find((p: any) => p.id === pp.protocol_id)?.title || "Protocolo",
      }));
      setPatientProtocols(enriched);
    }

    setPatientSubscription(subRes.data?.[0] || null);
    setPricingPlans(plansRes.data || []);
    setMealPlans(mealPlansRes.data || []);
    setRecipes(recipesRes.data || []);

    // Pre-fill plan form if subscription exists
    if (subRes.data?.[0]) {
      setPlanForm({
        plan_name: subRes.data[0].plan_name,
        started_at: subRes.data[0].started_at?.split("T")[0] || "",
        expires_at: subRes.data[0].expires_at?.split("T")[0] || "",
      });
    }

    setLoading(false);
  }, [patientId, user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const activateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patientId) return;

    const { data, error } = await supabase.from("patient_protocols").insert({
      patient_id: patientId,
      protocol_id: activateForm.protocol_id,
      nutritionist_id: user.id,
      status: activateForm.status,
      start_date: activateForm.start_date,
      end_date: activateForm.end_date || null,
    }).select().single();

    if (error) { toast.error(error.message); return; }

    // If active, sync checklist tasks
    if (activateForm.status === "active" && data) {
      await supabase.rpc("sync_protocol_checklist", { _patient_protocol_id: data.id });
    }

    // Add timeline event
    await supabase.from("patient_timeline").insert({
      patient_id: patientId,
      event_type: "protocol",
      title: `Protocolo ${activateForm.status === "active" ? "ativado" : "programado"}`,
      description: protocols.find(p => p.id === activateForm.protocol_id)?.title,
      created_by: user.id,
    });

    toast.success(activateForm.status === "active" ? "Protocolo ativado! Checklist sincronizado." : "Protocolo programado!");
    setActivateOpen(false);
    fetchAll();
  };

  const addTimelineNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patientId) return;

    const { error } = await supabase.from("patient_timeline").insert({
      patient_id: patientId,
      event_type: noteForm.event_type,
      title: noteForm.title,
      description: noteForm.description || null,
      created_by: user.id,
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Nota adicionada!");
      setNoteOpen(false);
      setNoteForm({ title: "", description: "", event_type: "note" });
      fetchAll();
    }
  };

  const syncChecklist = async (ppId: string) => {
    const { data } = await supabase.rpc("sync_protocol_checklist", { _patient_protocol_id: ppId });
    toast.success(`${data || 0} tarefas sincronizadas para hoje!`);
  };

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patientId) return;

    if (patientSubscription) {
      const { error } = await supabase.from("subscriptions").update({
        plan_name: planForm.plan_name,
        started_at: planForm.started_at,
        expires_at: planForm.expires_at || null,
      }).eq("id", patientSubscription.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Plano atualizado!");
    } else {
      const { error } = await supabase.from("subscriptions").insert({
        user_id: patientId,
        plan_name: planForm.plan_name,
        started_at: planForm.started_at,
        expires_at: planForm.expires_at || null,
        status: "active",
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Plano atribuído!");
    }
    setPlanOpen(false);
    fetchAll();
  };

  const scheduleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !patientId) return;

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + parseInt(feedbackForm.days));

    const { error } = await supabase.from("notifications").insert({
      user_id: patientId,
      title: "📋 Feedback solicitado",
      message: feedbackForm.message,
      type: "feedback",
      action_url: "/feedbacks",
      metadata: { scheduled_by: user.id, scheduled_for: scheduledDate.toISOString() },
    });

    if (error) { toast.error(error.message); return; }

    await supabase.from("patient_timeline").insert({
      patient_id: patientId,
      event_type: "note",
      title: `Feedback agendado para ${scheduledDate.toLocaleDateString("pt-BR")}`,
      description: feedbackForm.message,
      created_by: user.id,
    });

    toast.success(`Feedback agendado para daqui ${feedbackForm.days} dias!`);
    setFeedbackOpen(false);
    fetchAll();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const eventTypeConfig: Record<string, { icon: any; color: string }> = {
    protocol: { icon: FileText, color: "text-primary" },
    note: { icon: MessageSquare, color: "text-info" },
    alert: { icon: AlertTriangle, color: "text-warning" },
    achievement: { icon: CheckCircle2, color: "text-success" },
    measurement: { icon: TrendingUp, color: "text-accent" },
  };

  // Compute risk score from anamnesis
  const riskFactors: { label: string; level: "low" | "medium" | "high" }[] = [];
  if (anamnesis?.answers) {
    const a = anamnesis.answers;
    if (a.health_conditions?.includes("diabetes")) riskFactors.push({ label: "Diabetes", level: "high" });
    if (a.health_conditions?.includes("hypertension")) riskFactors.push({ label: "Hipertensão", level: "high" });
    if (a.health_conditions?.includes("high_cholesterol")) riskFactors.push({ label: "Colesterol alto", level: "medium" });
    if (a.activity_level === "sedentary") riskFactors.push({ label: "Sedentarismo", level: "medium" });
    if (a.water_intake && a.water_intake < 6) riskFactors.push({ label: "Baixa hidratação", level: "medium" });
    if (a.feeling === "terrible" || a.feeling === "bad") riskFactors.push({ label: "Insatisfação alimentar", level: "medium" });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Smart Alerts */}
        <SmartAlertsBanner patientId={patientId!} onAction={(action) => setOpenSection(action)} />
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {(profile?.full_name || "P")[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold">{profile?.full_name || "Paciente"}</h1>
            <p className="text-sm text-muted-foreground">
              Checklist hoje: {checklistStats.completed}/{checklistStats.total} tarefas •
              {patientProtocols.filter(p => p.status === "active").length} protocolos ativos
            </p>
          </div>
          <HealthScoreRing
            score={calculateHealthScore({
              hasAnamnesis: anamnesis?.status === "completed",
              checklistCompletion: checklistStats.total > 0 ? Math.round((checklistStats.completed / checklistStats.total) * 100) : 0,
              mealsLogged: 0,
              weightEntries: 0,
              currentStreak: 0,
              daysAsPatient: 30,
            })}
            label="Health Score"
            size="md"
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate(`/physical-assessment?patientId=${patientId}`)}
            >
              <Activity className="w-4 h-4" />
              Avaliação Física
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate(`/diet-templates?patientId=${patientId}`)}
            >
              <BookOpen className="w-4 h-4" />
              Modelos de Dieta
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate(`/anamnesis?patientId=${patientId}`)}
            >
              <Heart className="w-4 h-4" />
              {anamnesis ? "Editar Anamnese" : "Preencher Anamnese"}
            </Button>
            <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary gap-2 shadow-glow">
                  <Play className="w-4 h-4" /> Ativar Protocolo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Ativar Protocolo</DialogTitle>
                </DialogHeader>
                <form onSubmit={activateProtocol} className="space-y-4">
                  <div>
                    <Label>Protocolo</Label>
                    <Select value={activateForm.protocol_id} onValueChange={(v) => setActivateForm({ ...activateForm, protocol_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {protocols.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={activateForm.status} onValueChange={(v) => setActivateForm({ ...activateForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">🟢 Ativo agora</SelectItem>
                        <SelectItem value="scheduled">📅 Programado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Início</Label>
                      <Input type="date" value={activateForm.start_date} onChange={(e) => setActivateForm({ ...activateForm, start_date: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Fim (opcional)</Label>
                      <Input type="date" value={activateForm.end_date} onChange={(e) => setActivateForm({ ...activateForm, end_date: e.target.value })} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full gradient-primary" disabled={!activateForm.protocol_id}>
                    {activateForm.status === "active" ? "Ativar e Sincronizar" : "Programar"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Section Cards Grid */}
        {(() => {
          const sections = [
            { key: "overview", label: "Visão Geral", icon: AlertTriangle, color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
            { key: "ai-insights", label: "IA Insights", icon: Brain, color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
            { key: "assessment", label: "Avaliação Física", icon: Activity, color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
            { key: "agenda", label: "Agenda", icon: CalendarDays, color: "from-info/20 to-info/5", iconColor: "text-info" },
            { key: "calculators", label: "Calculadoras", icon: Calculator, color: "from-success/20 to-success/5", iconColor: "text-success" },
            { key: "timeline", label: "Timeline", icon: Clock, color: "from-muted-foreground/20 to-muted-foreground/5", iconColor: "text-muted-foreground" },
            { key: "plan", label: "Plano", icon: CreditCard, color: "from-primary/20 to-primary/5", iconColor: "text-primary" },
            { key: "protocols", label: "Protocolos", icon: FileText, color: "from-accent/20 to-accent/5", iconColor: "text-accent" },
            { key: "checkins", label: "Check-ins", icon: MessageSquare, color: "from-warning/20 to-warning/5", iconColor: "text-warning" },
            { key: "meal-plans", label: "Planos Alimentares", icon: UtensilsCrossed, color: "from-success/20 to-success/5", iconColor: "text-success" },
            { key: "radar", label: "Radar Metabólico", icon: TrendingUp, color: "from-destructive/20 to-destructive/5", iconColor: "text-destructive" },
            { key: "recipes", label: "Receitas", icon: ChefHat, color: "from-primary/20 to-accent/5", iconColor: "text-primary" },
          ];

          return (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {sections.map((s) => {
                  const Icon = s.icon;
                  return (
                    <motion.button
                      key={s.key}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setOpenSection(s.key)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-gradient-to-br ${s.color} hover:shadow-md transition-all group cursor-pointer text-center`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-card shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                        <Icon className={`w-5 h-5 ${s.iconColor}`} />
                      </div>
                      <span className="text-xs font-medium text-foreground">{s.label}</span>
                      <Maximize2 className="absolute top-2 right-2 w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  );
                })}
              </div>

              {/* Overview Modal */}
              <Dialog open={openSection === "overview"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Visão Geral</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass rounded-xl p-5 md:col-span-2">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-warning" /> Diagnóstico Inteligente
                      </h3>
                      {riskFactors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sem fatores de risco identificados. ✅</p>
                      ) : (
                        <div className="space-y-2">
                          {riskFactors.map((rf, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                              <div className={`w-3 h-3 rounded-full ${
                                rf.level === "high" ? "bg-destructive" : rf.level === "medium" ? "bg-warning" : "bg-success"
                              }`} />
                              <span className="text-sm font-medium">{rf.label}</span>
                              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                                rf.level === "high" ? "bg-destructive/10 text-destructive" :
                                rf.level === "medium" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                              }`}>
                                {rf.level === "high" ? "Alto" : rf.level === "medium" ? "Médio" : "Baixo"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="glass rounded-xl p-5">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-3">
                        <Heart className="w-5 h-5 text-primary" /> Anamnese
                      </h3>
                      {anamnesis ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">TMB</span><span className="font-medium">{anamnesis.computed_tmb} kcal</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Meta calórica</span><span className="font-medium">{anamnesis.computed_kcal_target} kcal</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Proteína</span><span className="font-medium">{anamnesis.computed_protein}g</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Carboidratos</span><span className="font-medium">{anamnesis.computed_carbs}g</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Gorduras</span><span className="font-medium">{anamnesis.computed_fat}g</span></div>
                          <div className="pt-2 border-t border-border">
                            <span className="text-xs text-muted-foreground">Objetivo: {anamnesis.answers?.goal || "—"}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Anamnese não preenchida.</p>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* AI Insights Modal */}
              <Dialog open={openSection === "ai-insights"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">IA Insights</DialogTitle></DialogHeader>
                  <AnamnesisInsightsFull userId={patientId!} />
                </DialogContent>
              </Dialog>

              {/* Assessment Modal */}
              <Dialog open={openSection === "assessment"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Avaliação Física</DialogTitle></DialogHeader>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-xl font-bold flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary" /> Evolução Física
                      </h2>
                      <Button
                        onClick={() => { setOpenSection(null); navigate(`/physical-assessment?patientId=${patientId}`); }}
                        className="gradient-primary gap-2 shadow-glow"
                      >
                        <Scale className="w-4 h-4" /> Nova Avaliação
                      </Button>
                    </div>
                    <BodyEvolutionCard patientId={patientId!} />
                    <div className="border-t border-border pt-6">
                      <h3 className="font-display text-lg font-semibold mb-4">Comparativo entre Consultas</h3>
                      <ConsultationCompare patientId={patientId!} />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Agenda Modal */}
              <Dialog open={openSection === "agenda"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Agenda</DialogTitle></DialogHeader>
                  <PatientAgenda patientId={patientId!} />
                </DialogContent>
              </Dialog>

              {/* Calculators Modal */}
              <Dialog open={openSection === "calculators"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Calculadoras</DialogTitle></DialogHeader>
                  <PatientCalculators anamnesis={anamnesis} />
                </DialogContent>
              </Dialog>

              {/* Timeline Modal */}
              <Dialog open={openSection === "timeline"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Timeline</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Nota</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="font-display">Adicionar Nota</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={addTimelineNote} className="space-y-4">
                            <div>
                              <Label>Tipo</Label>
                              <Select value={noteForm.event_type} onValueChange={(v) => setNoteForm({ ...noteForm, event_type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="note">📝 Nota</SelectItem>
                                  <SelectItem value="alert">⚠️ Alerta</SelectItem>
                                  <SelectItem value="measurement">📏 Medição</SelectItem>
                                  <SelectItem value="achievement">🏆 Conquista</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Título</Label>
                              <Input value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} required />
                            </div>
                            <div>
                              <Label>Descrição</Label>
                              <Textarea value={noteForm.description} onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })} />
                            </div>
                            <Button type="submit" className="w-full gradient-primary">Salvar</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {timeline.length === 0 ? (
                      <div className="glass rounded-xl p-12 text-center">
                        <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">Nenhum evento na timeline.</p>
                      </div>
                    ) : (
                      <div className="relative pl-8 space-y-4">
                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
                        {timeline.map((event) => {
                          const config = eventTypeConfig[event.event_type] || eventTypeConfig.note;
                          const Icon = config.icon;
                          return (
                            <motion.div key={event.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="relative">
                              <div className="absolute -left-5 w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center">
                                <Icon className={`w-3 h-3 ${config.color}`} />
                              </div>
                              <div className="glass rounded-xl p-4 ml-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-sm">{event.title}</h4>
                                  <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleDateString("pt-BR")}</span>
                                </div>
                                {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Plan Modal */}
              <Dialog open={openSection === "plan"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Plano</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass rounded-xl p-5">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-4">
                        <CreditCard className="w-5 h-5 text-primary" /> Plano Atual
                      </h3>
                      {patientSubscription ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Plano</span>
                            <span className="font-medium text-sm">{patientSubscription.plan_name}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge className={
                              patientSubscription.status === "active" ? "bg-emerald-500/10 text-emerald-500" :
                              patientSubscription.status === "expired" ? "bg-red-500/10 text-red-500" :
                              "bg-muted text-muted-foreground"
                            }>
                              {patientSubscription.status === "active" ? "Ativo" :
                               patientSubscription.status === "expired" ? "Expirado" :
                               patientSubscription.status === "trial" ? "Trial" : patientSubscription.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Início</span>
                            <span className="text-sm">{new Date(patientSubscription.started_at).toLocaleDateString("pt-BR")}</span>
                          </div>
                          {patientSubscription.expires_at && (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Vencimento</span>
                                <span className="text-sm">{new Date(patientSubscription.expires_at).toLocaleDateString("pt-BR")}</span>
                              </div>
                              {(() => {
                                const days = Math.ceil((new Date(patientSubscription.expires_at).getTime() - Date.now()) / 86400000);
                                if (days > 0 && days <= 7) {
                                  return (
                                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4 text-warning" />
                                      <span className="text-xs text-warning font-medium">Mensalidade vence em {days} dia{days > 1 ? "s" : ""}!</span>
                                    </div>
                                  );
                                }
                                if (days <= 0) {
                                  return (
                                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4 text-destructive" />
                                      <span className="text-xs text-destructive font-medium">Mensalidade vencida!</span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </>
                          )}
                          <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setPlanOpen(true)}>
                            Editar Plano
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <CreditCard className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-3">Nenhum plano atribuído</p>
                          <Button size="sm" className="gradient-primary" onClick={() => setPlanOpen(true)}>
                            <Plus className="w-4 h-4 mr-1" /> Atribuir Plano
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="glass rounded-xl p-5">
                      <h3 className="font-display font-semibold flex items-center gap-2 mb-4">
                        <Send className="w-5 h-5 text-primary" /> Agendar Feedback
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">Envie um lembrete para o paciente dar feedback sobre o acompanhamento.</p>
                      <form onSubmit={scheduleFeedback} className="space-y-3">
                        <div>
                          <Label>Enviar daqui a (dias)</Label>
                          <Select value={feedbackForm.days} onValueChange={(v) => setFeedbackForm({ ...feedbackForm, days: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 dia</SelectItem>
                              <SelectItem value="2">2 dias</SelectItem>
                              <SelectItem value="3">3 dias</SelectItem>
                              <SelectItem value="5">5 dias</SelectItem>
                              <SelectItem value="7">7 dias</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Mensagem</Label>
                          <Textarea value={feedbackForm.message} onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })} rows={3} />
                        </div>
                        <Button type="submit" className="w-full gradient-primary gap-2">
                          <Send className="w-4 h-4" /> Agendar Feedback
                        </Button>
                      </form>
                    </div>
                  </div>
                  <Dialog open={planOpen} onOpenChange={setPlanOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-display">{patientSubscription ? "Editar Plano" : "Atribuir Plano"}</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={savePlan} className="space-y-4">
                        <div>
                          <Label>Plano</Label>
                          {pricingPlans.length > 0 ? (
                            <Select value={planForm.plan_name} onValueChange={(v) => setPlanForm({ ...planForm, plan_name: v })}>
                              <SelectTrigger><SelectValue placeholder="Selecione um plano..." /></SelectTrigger>
                              <SelectContent>
                                {pricingPlans.map((p) => (
                                  <SelectItem key={p.id} value={p.name}>{p.name} — R$ {Number(p.price_monthly).toFixed(2)}/mês</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input value={planForm.plan_name} onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })} placeholder="Nome do plano" required />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label>Data Início</Label><Input type="date" value={planForm.started_at} onChange={(e) => setPlanForm({ ...planForm, started_at: e.target.value })} required /></div>
                          <div><Label>Data Fim</Label><Input type="date" value={planForm.expires_at} onChange={(e) => setPlanForm({ ...planForm, expires_at: e.target.value })} /></div>
                        </div>
                        <Button type="submit" className="w-full gradient-primary" disabled={!planForm.plan_name}>
                          {patientSubscription ? "Atualizar Plano" : "Atribuir Plano"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </DialogContent>
              </Dialog>

              {/* Protocols Modal */}
              <Dialog open={openSection === "protocols"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Protocolos</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    {patientProtocols.length === 0 ? (
                      <div className="glass rounded-xl p-8 text-center">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">Nenhum protocolo ativado.</p>
                      </div>
                    ) : (
                      patientProtocols.map((pp) => (
                        <div key={pp.id} className="glass rounded-xl p-4 flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${
                            pp.status === "active" ? "bg-success" : pp.status === "scheduled" ? "bg-warning" : "bg-muted-foreground"
                          }`} />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{pp.protocol_title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {pp.status === "active" ? "Ativo" : pp.status === "scheduled" ? "Programado" : pp.status} •
                              Início: {new Date(pp.start_date).toLocaleDateString("pt-BR")}
                              {pp.end_date && ` • Fim: ${new Date(pp.end_date).toLocaleDateString("pt-BR")}`}
                            </p>
                          </div>
                          {pp.status === "active" && (
                            <Button size="sm" variant="outline" onClick={() => syncChecklist(pp.id)} className="gap-1">
                              <Zap className="w-3 h-3" /> Sync
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Checkins Modal */}
              <Dialog open={openSection === "checkins"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Check-ins</DialogTitle></DialogHeader>
                  <PatientCheckinsTab patientId={patientId!} />
                </DialogContent>
              </Dialog>

              {/* Meal Plans Modal */}
              <Dialog open={openSection === "meal-plans"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Planos Alimentares</DialogTitle></DialogHeader>
                  <div className="space-y-6">
                    <div className="flex items-center justify-end">
                      <Button
                        onClick={() => { setOpenSection(null); navigate(`/meal-plans?patientId=${patientId}`); }}
                        className="gradient-primary gap-2 shadow-glow"
                      >
                        <Plus className="w-4 h-4" /> Criar Plano
                      </Button>
                    </div>
                    {mealPlans.length === 0 ? (
                      <div className="glass rounded-xl p-12 text-center">
                        <UtensilsCrossed className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="font-display text-lg font-semibold mb-2">Nenhum plano alimentar</h3>
                        <p className="text-sm text-muted-foreground mb-4">Crie um plano alimentar para este paciente.</p>
                        <Button onClick={() => { setOpenSection(null); navigate(`/meal-plans?patientId=${patientId}`); }} className="gradient-primary">
                          <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Plano
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {mealPlans.map((plan) => (
                          <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl overflow-hidden">
                            <div className="p-5 border-b border-border">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${plan.is_active ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
                                  <div>
                                    <h3 className="font-display font-semibold">{plan.title}</h3>
                                    <p className="text-xs text-muted-foreground">
                                      {plan.is_active ? "Ativo" : "Inativo"} •
                                      Início: {new Date(plan.start_date).toLocaleDateString("pt-BR")}
                                      {plan.end_date && ` • Fim: ${new Date(plan.end_date).toLocaleDateString("pt-BR")}`}
                                    </p>
                                  </div>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => { setOpenSection(null); navigate(`/meal-plan/${plan.id}`); }}>
                                  <FileText className="w-3.5 h-3.5 mr-1" /> Ver Plano
                                </Button>
                              </div>
                              {plan.description && <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>}
                            </div>
                            <div className="p-5 bg-secondary/20">
                              <PlanScheduler mealPlanId={plan.id} planTitle={plan.title} />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Radar Modal */}
              <Dialog open={openSection === "radar"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Radar Metabólico</DialogTitle></DialogHeader>
                  <MetabolicRadar anamnesis={anamnesis} />
                </DialogContent>
              </Dialog>

              {/* Recipes Modal */}
              <Dialog open={openSection === "recipes"} onOpenChange={(v) => !v && setOpenSection(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Receitas Compartilhadas</DialogTitle></DialogHeader>
                  {recipes.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Nenhuma receita compartilhada ainda.</p>
                      <p className="text-xs mt-1">Compartilhe receitas na seção Receitas do painel.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {recipes.map((recipe) => (
                        <div key={recipe.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
                          {recipe.image_url && (
                            <img src={recipe.image_url} alt={recipe.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                          )}
                          <h4 className="font-semibold text-sm">{recipe.title}</h4>
                          {recipe.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>}
                          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                            {recipe.calories_per_serving && <span>{recipe.calories_per_serving} kcal</span>}
                            {recipe.prep_time_minutes && <span>{recipe.prep_time_minutes} min preparo</span>}
                            {recipe.difficulty && <Badge variant="secondary" className="text-[10px]">{recipe.difficulty}</Badge>}
                          </div>
                          {recipe.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {recipe.tags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </>
          );
        })()}
      </div>
    </DashboardLayout>
  );
}
