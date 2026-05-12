import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Badge } from "@v1/components/ui/badge";
import { Progress } from "@v1/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@v1/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { toast } from "sonner";
import {
  ArrowLeft, Users, Calendar, Target, Trophy, UserPlus, Brain,
  TrendingDown, Activity, Zap, Crown, BarChart3, Sparkles,
  ChevronRight, CheckCircle2, AlertTriangle, Flame, Heart,
  Scale, Ruler, PieChart, Shield, Lock, Clock, Settings
} from "lucide-react";
import BiquiniBrancoProtocol from "@v1/components/biquini/BiquiniBrancoProtocol";
import BiquiniEnrollmentStatus from "@v1/components/biquini/BiquiniEnrollmentStatus";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const PHASE_DATA = [
  {
    number: 1, title: "Reset Metabólico", icon: "🔄", color: "from-blue-500 to-cyan-500",
    objective: "Melhorar hábitos alimentares, regular fome e energia",
    weeks: "Semanas 1-2",
    tips: ["Equilibrar horários das refeições", "Aumentar consumo de fibras", "Hidratar adequadamente", "Reduzir ultraprocessados"],
    habits: ["Tomar 2L de água/dia", "3 refeições + 2 lanches", "Dormir 7-8h", "Registrar todas as refeições"],
  },
  {
    number: 2, title: "Déficit Estratégico", icon: "📉", color: "from-orange-500 to-red-500",
    objective: "Iniciar redução de gordura de forma sustentável",
    weeks: "Semanas 3-5",
    tips: ["Déficit calórico moderado (300-500kcal)", "Priorizar proteínas", "Manter volume alimentar com vegetais", "Ajustar carboidratos ao treino"],
    habits: ["Atingir meta proteica diária", "30min atividade física", "Controlar porções", "Evitar líquidos calóricos"],
  },
  {
    number: 3, title: "Definição Corporal", icon: "✨", color: "from-purple-500 to-pink-500",
    objective: "Otimizar composição corporal e manter consistência",
    weeks: "Semanas 6-9",
    tips: ["Periodizar carboidratos", "Aumentar intensidade do treino", "Focar em alimentos termogênicos", "Monitorar medidas semanalmente"],
    habits: ["Treinar 4-5x/semana", "Registrar medidas semanais", "Preparar marmitas", "Manter streak de adesão"],
  },
  {
    number: 4, title: "Manutenção Inteligente", icon: "🏆", color: "from-emerald-500 to-green-500",
    objective: "Consolidar resultados e evitar efeito rebote",
    weeks: "Semanas 10-12",
    tips: ["Reverse diet gradual", "Manter hábitos consolidados", "Flexibilidade consciente", "Planejar sustentabilidade"],
    habits: ["Manter rotina alimentar", "Continuar atividade física", "Autoavaliação semanal", "Celebrar conquistas"],
  },
];

interface EnrolledPatient {
  id: string;
  patient_id: string;
  current_phase: number;
  name: string;
  avatar_url: string | null;
  streak: number;
  xp: number;
  level: number;
  progress: any[];
}

interface AIInsight {
  overall_status: string;
  status_label: string;
  insights: string[];
  recommendations: string[];
  phase_advice: string;
  motivation_message: string;
}

export default function BiquiniBrancoDetail() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [program, setProgram] = useState<any>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [patients, setPatients] = useState<EnrolledPatient[]>([]);
  const [allPatients, setAllPatients] = useState<{ id: string; name: string }[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollPatientId, setEnrollPatientId] = useState("");
  const [progressOpen, setProgressOpen] = useState<string | null>(null);
  const [progressForm, setProgressForm] = useState({ weight: "", waist: "", hip: "", adherence: "80", notes: "" });
  const [selectedPatient, setSelectedPatient] = useState<EnrolledPatient | null>(null);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [prestigePlans, setPrestigePlans] = useState<any[]>([]);
  const [selectedPrestigePlanId, setSelectedPrestigePlanId] = useState<string>("");
  const [syncingPrestige, setSyncingPrestige] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!programId || !user) return;
    setLoading(true);

    const [progRes, prestigeRes] = await Promise.all([
      supabase.from("programs").select("*").eq("id", programId).maybeSingle(),
      supabase.from("prestige_plans").select("*").eq("is_active", true).order("display_order"),
    ]);
    const prog = progRes.data;
    if (!prog) { setLoading(false); return; }
    setProgram(prog);
    setPrestigePlans(prestigeRes.data || []);
    setSelectedPrestigePlanId((prog as any).prestige_plan_id || "");

    // Fetch phases
    const { data: ph } = await (supabase as any).from("program_phases").select("*").eq("program_id", programId).order("phase_number");
    setPhases(ph || []);

    // Enrolled patients
    const { data: enrolled } = await supabase.from("program_patients").select("*").eq("program_id", programId).eq("status", "active");

    const enriched: EnrolledPatient[] = [];
    for (const ep of (enrolled || [])) {
      const [profileRes, statsRes, progressRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", ep.patient_id).maybeSingle(),
        supabase.from("player_stats").select("total_xp, level, current_streak").eq("user_id", ep.patient_id).maybeSingle(),
        (supabase as any).from("program_patient_progress").select("*").eq("program_id", programId).eq("patient_id", ep.patient_id).order("week_number"),
      ]);

      enriched.push({
        id: ep.id,
        patient_id: ep.patient_id,
        current_phase: (ep as any).current_phase || 1,
        name: profileRes.data?.full_name || "Paciente",
        avatar_url: profileRes.data?.avatar_url || null,
        streak: statsRes.data?.current_streak || 0,
        xp: statsRes.data?.total_xp || 0,
        level: statsRes.data?.level || 1,
        progress: progressRes.data || [],
      });
    }
    setPatients(enriched);

    // Fetch enrollments
    const { data: enrollData } = await (supabase as any)
      .from("program_enrollments")
      .select("*")
      .eq("program_id", programId);
    setEnrollments(enrollData || []);

    // All available patients
    const { data: allPtRes } = await supabase.from("nutritionist_patients").select("patient_id").eq("nutritionist_id", user.id).eq("status", "active");
    if (allPtRes) {
      const pts = await Promise.all(
        allPtRes.map(async (d: any) => {
          const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", d.patient_id).maybeSingle();
          return { id: d.patient_id, name: p?.full_name || "Paciente" };
        })
      );
      setAllPatients(pts);
    }

    setLoading(false);
  }, [programId, user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const enrollPatient = async () => {
    if (!enrollPatientId || !programId) return;
    const { error } = await supabase.from("program_patients").insert({ program_id: programId, patient_id: enrollPatientId });
    if (error) {
      if (error.code === "23505") toast.info("Paciente já inscrita");
      else toast.error(error.message);
    } else {
      // Also create program enrollment for automation tracking
      await (supabase as any).from("program_enrollments").insert({
        program_id: programId,
        patient_id: enrollPatientId,
        professional_id: user!.id,
        status: "pending_onboarding",
        current_phase: 1,
      });
      toast.success("Paciente inscrita no Projeto Biquíni Branco! 👙✨");
      setEnrollOpen(false);
      setEnrollPatientId("");
      fetchAll();
    }
  };

  const saveProgress = async (patientId: string) => {
    if (!programId) return;
    const patient = patients.find(p => p.patient_id === patientId);
    const weekNum = (patient?.progress.length || 0) + 1;

    const { error } = await (supabase as any).from("program_patient_progress").insert({
      program_id: programId,
      patient_id: patientId,
      phase_id: phases.find(p => p.phase_number === (patient?.current_phase || 1))?.id || null,
      week_number: weekNum,
      weight: progressForm.weight ? parseFloat(progressForm.weight) : null,
      waist: progressForm.waist ? parseFloat(progressForm.waist) : null,
      hip: progressForm.hip ? parseFloat(progressForm.hip) : null,
      adherence_score: parseInt(progressForm.adherence),
      notes: progressForm.notes || null,
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Progresso registrado! 📊");
      setProgressOpen(null);
      setProgressForm({ weight: "", waist: "", hip: "", adherence: "80", notes: "" });
      fetchAll();
    }
  };

  const advancePhase = async (patientId: string, currentPhase: number) => {
    if (currentPhase >= 4) return;
    await (supabase as any).from("program_patients")
      .update({ current_phase: currentPhase + 1 })
      .eq("program_id", programId)
      .eq("patient_id", patientId);
    toast.success(`Paciente avançou para a Fase ${currentPhase + 1}! 🎉`);
    fetchAll();
  };

  const getAIInsights = async (patient: EnrolledPatient) => {
    setSelectedPatient(patient);
    setLoadingAI(true);
    setAiInsight(null);

    try {
      const { data, error } = await supabase.functions.invoke("program-insights", {
        body: {
          patient_name: patient.name,
          current_phase: PHASE_DATA[patient.current_phase - 1]?.title || "Fase 1",
          weight_history: patient.progress.map(p => p.weight).filter(Boolean),
          waist_history: patient.progress.map(p => p.waist).filter(Boolean),
          adherence_history: patient.progress.map(p => p.adherence_score),
          habits_data: { streak: patient.streak, xp: patient.xp, level: patient.level },
        },
      });
      if (error) throw error;
      setAiInsight(data);
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar insights");
    } finally {
      setLoadingAI(false);
    }
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

  if (!program) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Programa não encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/v1/programs")}>Voltar</Button>
        </div>
      </DashboardLayout>
    );
  }

  const daysProgress = (() => {
    const now = new Date();
    const start = new Date(program.start_date);
    if (!program.end_date) return 0;
    const end = new Date(program.end_date);
    const total = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
    const elapsed = Math.max(0, (now.getTime() - start.getTime()) / 86400000);
    return Math.min(100, Math.round((elapsed / total) * 100));
  })();

  const avgAdherence = patients.length > 0
    ? Math.round(patients.reduce((s, p) => s + (p.progress.length > 0 ? p.progress[p.progress.length - 1].adherence_score : 0), 0) / patients.length)
    : 0;

  const statusColor: Record<string, string> = { on_track: "text-success", attention: "text-warning", at_risk: "text-destructive" };
  const statusBg: Record<string, string> = { on_track: "bg-success/10", attention: "bg-warning/10", at_risk: "bg-destructive/10" };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* ── PREMIUM HEADER ── */}
        <motion.div variants={item}>
          <div className="rounded-2xl overflow-hidden relative">
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 p-6 md:p-8 relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-50" />
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate("/v1/programs")}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <Badge className="bg-white/20 text-white border-0 mb-2">👙 Programa Premium</Badge>
                    <h1 className="font-display text-2xl md:text-4xl font-bold text-white">Projeto Biquíni Branco</h1>
                    <p className="text-white/80 text-sm mt-1 max-w-lg">
                      Programa de transformação corporal feminina • {program.end_date
                        ? `${Math.ceil((new Date(program.end_date).getTime() - new Date(program.start_date).getTime()) / (7 * 86400000))} semanas`
                        : "12 semanas"}
                    </p>
                  </div>
                </div>
                <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 gap-1">
                      <UserPlus className="w-4 h-4" /> Inscrever Paciente
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle className="font-display">Inscrever no Biquíni Branco</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <Select value={enrollPatientId} onValueChange={setEnrollPatientId}>
                        <SelectTrigger><SelectValue placeholder="Selecione a paciente..." /></SelectTrigger>
                        <SelectContent>
                          {allPatients.filter(ap => !patients.some(p => p.patient_id === ap.id)).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={enrollPatient} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white" disabled={!enrollPatientId}>
                        Inscrever no Programa
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Progress bar */}
              <div className="relative mt-6">
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>{new Date(program.start_date).toLocaleDateString("pt-BR")}</span>
                  <span>{daysProgress}% concluído</span>
                  <span>{program.end_date ? new Date(program.end_date).toLocaleDateString("pt-BR") : ""}</span>
                </div>
                <div className="h-3 rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${daysProgress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full bg-white/80"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── METRICS ── */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Pacientes", value: patients.length, icon: Users, color: "text-pink-500", bg: "bg-pink-500/10" },
            { label: "Adesão Média", value: `${avgAdherence}%`, icon: Target, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Progresso", value: `${daysProgress}%`, icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Fase Média", value: patients.length > 0 ? (patients.reduce((s, p) => s + p.current_phase, 0) / patients.length).toFixed(1) : "—", icon: Crown, color: "text-amber-500", bg: "bg-amber-500/10" },
          ].map(m => (
            <Card key={m.label} className="glass shadow-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center`}>
                  <m.icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <div>
                  <p className="font-display text-xl font-bold">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <Tabs defaultValue="phases" className="space-y-4">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="phases" className="gap-1"><Sparkles className="w-4 h-4" /> Fases</TabsTrigger>
            <TabsTrigger value="patients" className="gap-1"><Users className="w-4 h-4" /> Pacientes</TabsTrigger>
            <TabsTrigger value="enrollment" className="gap-1"><Settings className="w-4 h-4" /> Automação</TabsTrigger>
            <TabsTrigger value="evolution" className="gap-1"><BarChart3 className="w-4 h-4" /> Evolução</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1"><Brain className="w-4 h-4" /> Insights IA</TabsTrigger>
            <TabsTrigger value="protocol" className="gap-1"><Shield className="w-4 h-4" /> Protocolo Exclusivo</TabsTrigger>
            <TabsTrigger value="prestige" className="gap-1"><Crown className="w-4 h-4" /> Prestígio</TabsTrigger>
          </TabsList>

          {/* ── PRESTIGE TAB ── */}
          <TabsContent value="prestige" className="space-y-4">
            <Card className="glass shadow-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" /> Prestígio do Programa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Vincule um plano de prestígio a este programa. Todos os pacientes inscritos receberão automaticamente o prestígio ao entrar no programa.
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs mb-1 block">Prestígio vinculado</Label>
                    <Select
                      value={selectedPrestigePlanId || "none"}
                      onValueChange={async (v) => {
                        const planId = v === "none" ? null : v;
                        setSelectedPrestigePlanId(v === "none" ? "" : v);
                        await (supabase as any).from("programs").update({ prestige_plan_id: planId }).eq("id", programId);
                        const sp = prestigePlans.find(p => p.id === planId);
                        toast.success(planId ? `${sp?.badge_icon || "👑"} Prestígio "${sp?.name}" vinculado ao programa!` : "Prestígio desvinculado do programa");
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione um prestígio..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">❌ Sem Prestígio</SelectItem>
                        {prestigePlans.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.badge_icon || "⭐"} {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedPrestigePlanId && (
                  <div className="border border-amber-500/20 rounded-xl p-4 bg-gradient-to-r from-amber-500/5 to-primary/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{prestigePlans.find(p => p.id === selectedPrestigePlanId)?.badge_icon || "⭐"}</span>
                        <div>
                          <p className="font-semibold text-sm">{prestigePlans.find(p => p.id === selectedPrestigePlanId)?.name}</p>
                          <p className="text-xs text-muted-foreground">{patients.length} pacientes inscritos</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                        disabled={syncingPrestige}
                        onClick={async () => {
                          setSyncingPrestige(true);
                          try {
                            const { data, error } = await supabase.rpc("sync_program_prestige", {
                              _program_id: programId,
                              _assigned_by: user!.id,
                            });
                            if (error) throw error;
                            const result = data as any;
                            const skipped = result.patients_skipped || 0;
                            const msg = skipped > 0
                              ? `👑 Prestígio aplicado a ${result.patients_updated} pacientes! (${skipped} mantiveram prestígio superior)`
                              : `👑 Prestígio aplicado a ${result.patients_updated} pacientes!`;
                            toast.success(msg);
                          } catch (e: any) {
                            toast.error(e.message || "Erro ao sincronizar");
                          } finally {
                            setSyncingPrestige(false);
                          }
                        }}
                      >
                        {syncingPrestige ? "Sincronizando..." : "Sincronizar Todos"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ✅ Novos inscritos recebem automaticamente este prestígio. Use "Sincronizar Todos" para aplicar retroativamente aos já inscritos.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PHASES TAB ── */}
          <TabsContent value="phases" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PHASE_DATA.map((phase) => (
                <motion.div key={phase.number} variants={item}>
                  <Card className="glass shadow-card overflow-hidden hover:shadow-glow transition-shadow">
                    <div className={`bg-gradient-to-r ${phase.color} p-4 text-white`}>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{phase.icon}</span>
                        <div>
                          <p className="text-xs font-medium text-white/70">{phase.weeks}</p>
                          <h3 className="font-display font-bold text-lg">Fase {phase.number}: {phase.title}</h3>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <p className="text-sm text-muted-foreground">{phase.objective}</p>

                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1.5">📋 Recomendações Nutricionais</p>
                        <ul className="space-y-1">
                          {phase.tips.map(tip => (
                            <li key={tip} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /> {tip}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1.5">✅ Hábitos da Fase</p>
                        <ul className="space-y-1">
                          {phase.habits.map(h => (
                            <li key={h} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <Target className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" /> {h}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Patients in this phase */}
                      {patients.filter(p => p.current_phase === phase.number).length > 0 && (
                        <div className="pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold mb-1.5">Pacientes nesta fase:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {patients.filter(p => p.current_phase === phase.number).map(p => (
                              <Badge key={p.id} variant="secondary" className="text-xs">{p.name}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ── PATIENTS TAB ── */}
          <TabsContent value="patients" className="space-y-4">
            {patients.length === 0 ? (
              <Card className="glass shadow-card p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-display font-semibold mb-1">Nenhuma paciente inscrita</h3>
                <p className="text-sm text-muted-foreground mb-4">Inscreva pacientes para começar o programa</p>
                <Button onClick={() => setEnrollOpen(true)} className="bg-gradient-to-r from-pink-500 to-rose-500 text-white gap-1">
                  <UserPlus className="w-4 h-4" /> Inscrever Paciente
                </Button>
              </Card>
            ) : (
              patients.map(patient => {
                const phaseData = PHASE_DATA[patient.current_phase - 1];
                const lastProgress = patient.progress[patient.progress.length - 1];
                const phaseProgress = Math.min(100, (patient.current_phase / 4) * 100);

                return (
                  <motion.div key={patient.id} variants={item}>
                    <Card className="glass shadow-card overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row">
                          {/* Patient info */}
                          <div className="flex-1 p-4 md:p-5 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-lg">
                                  {patient.name[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <h3 className="font-display font-semibold">{patient.name}</h3>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-500" />{patient.streak} dias</span>
                                    <span className="flex items-center gap-0.5"><Zap className="w-3 h-3 text-amber-500" />{patient.xp} XP</span>
                                    <span className="flex items-center gap-0.5"><Crown className="w-3 h-3 text-purple-500" />Nv.{patient.level}</span>
                                  </div>
                                </div>
                              </div>
                              <Badge className={`bg-gradient-to-r ${phaseData?.color} text-white border-0`}>
                                {phaseData?.icon} Fase {patient.current_phase}
                              </Badge>
                            </div>

                            {/* Phase progress */}
                            <div>
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Progresso no programa</span>
                                <span>{phaseProgress}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all" style={{ width: `${phaseProgress}%` }} />
                              </div>
                            </div>

                            {/* Last progress data */}
                            {lastProgress && (
                              <div className="grid grid-cols-3 gap-2">
                                {lastProgress.weight && (
                                  <div className="p-2 rounded-lg bg-muted/50 text-center">
                                    <Scale className="w-4 h-4 mx-auto text-blue-500 mb-0.5" />
                                    <p className="text-sm font-bold">{lastProgress.weight}kg</p>
                                    <p className="text-[10px] text-muted-foreground">Peso</p>
                                  </div>
                                )}
                                {lastProgress.waist && (
                                  <div className="p-2 rounded-lg bg-muted/50 text-center">
                                    <Ruler className="w-4 h-4 mx-auto text-pink-500 mb-0.5" />
                                    <p className="text-sm font-bold">{lastProgress.waist}cm</p>
                                    <p className="text-[10px] text-muted-foreground">Cintura</p>
                                  </div>
                                )}
                                {lastProgress.adherence_score != null && (
                                  <div className="p-2 rounded-lg bg-muted/50 text-center">
                                    <Target className="w-4 h-4 mx-auto text-emerald-500 mb-0.5" />
                                    <p className="text-sm font-bold">{lastProgress.adherence_score}%</p>
                                    <p className="text-[10px] text-muted-foreground">Adesão</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                              <Dialog open={progressOpen === patient.patient_id} onOpenChange={(v) => setProgressOpen(v ? patient.patient_id : null)}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="gap-1 text-xs">
                                    <BarChart3 className="w-3 h-3" /> Registrar Progresso
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader><DialogTitle className="font-display">Registrar Progresso — Semana {(patient.progress.length || 0) + 1}</DialogTitle></DialogHeader>
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                      <div><Label className="text-xs">Peso (kg)</Label><Input type="number" step="0.1" value={progressForm.weight} onChange={e => setProgressForm({ ...progressForm, weight: e.target.value })} /></div>
                                      <div><Label className="text-xs">Cintura (cm)</Label><Input type="number" step="0.1" value={progressForm.waist} onChange={e => setProgressForm({ ...progressForm, waist: e.target.value })} /></div>
                                      <div><Label className="text-xs">Quadril (cm)</Label><Input type="number" step="0.1" value={progressForm.hip} onChange={e => setProgressForm({ ...progressForm, hip: e.target.value })} /></div>
                                    </div>
                                    <div>
                                      <Label className="text-xs">Adesão ao plano (%)</Label>
                                      <Input type="number" min="0" max="100" value={progressForm.adherence} onChange={e => setProgressForm({ ...progressForm, adherence: e.target.value })} />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Observações</Label>
                                      <Input value={progressForm.notes} onChange={e => setProgressForm({ ...progressForm, notes: e.target.value })} placeholder="Ex: paciente relatou melhora na disposição" />
                                    </div>
                                    <Button onClick={() => saveProgress(patient.patient_id)} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                                      Salvar Progresso
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              {patient.current_phase < 4 && (
                                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => advancePhase(patient.patient_id, patient.current_phase)}>
                                  <ChevronRight className="w-3 h-3" /> Avançar Fase
                                </Button>
                              )}

                              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => getAIInsights(patient)}>
                                <Brain className="w-3 h-3" /> Insights IA
                              </Button>

                              <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => navigate(`/patients/${patient.patient_id}`)}>
                                Ver Perfil <ChevronRight className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          {/* ── ENROLLMENT AUTOMATION TAB ── */}
          <TabsContent value="enrollment" className="space-y-4">
            <Card className="glass shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Painel de Automação — Biquíni Branco
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Acompanhe o status automatizado de cada paciente no programa. O sistema monitora prazos, bloqueia protocolos vencidos e notifica automaticamente.
                </p>

                {enrollments.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma inscrição com automação ativa.</p>
                    <p className="text-xs text-muted-foreground">Inscreva pacientes para iniciar o fluxo automatizado.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: "Total", value: enrollments.length, color: "text-primary", bg: "bg-primary/10" },
                        { label: "Ativos", value: enrollments.filter(e => e.status.includes("active")).length, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                        { label: "Bloqueados", value: enrollments.filter(e => e.status === "protocol_locked").length, color: "text-destructive", bg: "bg-destructive/10" },
                        { label: "Pendentes", value: enrollments.filter(e => e.status.includes("awaiting") || e.status === "pending_onboarding").length, color: "text-amber-500", bg: "bg-amber-500/10" },
                      ].map(s => (
                        <div key={s.label} className={`p-3 rounded-xl ${s.bg} text-center`}>
                          <p className={`font-display text-xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Enrollment list */}
                    {enrollments.map(enrollment => {
                      const patientName = patients.find(p => p.patient_id === enrollment.patient_id)?.name 
                        || allPatients.find(p => p.id === enrollment.patient_id)?.name 
                        || "Paciente";

                      return (
                        <BiquiniEnrollmentStatus
                          key={enrollment.id}
                          enrollment={{
                            ...enrollment,
                            id: enrollment.id,
                            status: enrollment.status,
                            current_phase: enrollment.current_phase,
                            blocked_reason: enrollment.blocked_reason,
                            next_weight_due_at: enrollment.next_weight_due_at,
                            next_full_review_due_at: enrollment.next_full_review_due_at,
                            initial_weight: enrollment.initial_weight,
                            initial_kcal_target: enrollment.initial_kcal_target,
                            onboarding_completed_at: enrollment.onboarding_completed_at,
                            started_at: enrollment.started_at,
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Manual automation trigger */}
                <div className="pt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={async () => {
                      try {
                        const { error } = await supabase.functions.invoke("biquini-automation");
                        if (error) throw error;
                        toast.success("Automação executada com sucesso!");
                        fetchAll();
                      } catch (e: any) {
                        toast.error(e.message || "Erro ao executar automação");
                      }
                    }}
                  >
                    <Zap className="w-4 h-4" /> Executar Automação Agora
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── EVOLUTION TAB ── */}
          <TabsContent value="evolution" className="space-y-4">
            {patients.filter(p => p.progress.length > 0).length === 0 ? (
              <Card className="glass shadow-card p-8 text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-display font-semibold mb-1">Sem dados de evolução</h3>
                <p className="text-sm text-muted-foreground">Registre o progresso das pacientes para ver gráficos</p>
              </Card>
            ) : (
              patients.filter(p => p.progress.length > 0).map(patient => (
                <Card key={patient.id} className="glass shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-sm">
                        {patient.name[0]?.toUpperCase()}
                      </div>
                      {patient.name} — Evolução
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Weight chart */}
                      {patient.progress.some(p => p.weight) && (
                        <div>
                          <p className="text-xs font-semibold mb-2 flex items-center gap-1"><Scale className="w-3 h-3" /> Peso (kg)</p>
                          <ResponsiveContainer width="100%" height={150}>
                            <AreaChart data={patient.progress.filter(p => p.weight)}>
                              <defs>
                                <linearGradient id={`weight-${patient.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="week_number" tick={{ fontSize: 10 }} tickFormatter={v => `S${v}`} />
                              <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} />
                              <Tooltip />
                              <Area type="monotone" dataKey="weight" stroke="hsl(var(--primary))" fill={`url(#weight-${patient.id})`} strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Waist chart */}
                      {patient.progress.some(p => p.waist) && (
                        <div>
                          <p className="text-xs font-semibold mb-2 flex items-center gap-1"><Ruler className="w-3 h-3" /> Cintura (cm)</p>
                          <ResponsiveContainer width="100%" height={150}>
                            <AreaChart data={patient.progress.filter(p => p.waist)}>
                              <defs>
                                <linearGradient id={`waist-${patient.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="week_number" tick={{ fontSize: 10 }} tickFormatter={v => `S${v}`} />
                              <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 1', 'dataMax + 1']} />
                              <Tooltip />
                              <Area type="monotone" dataKey="waist" stroke="#ec4899" fill={`url(#waist-${patient.id})`} strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Adherence chart */}
                      <div>
                        <p className="text-xs font-semibold mb-2 flex items-center gap-1"><Target className="w-3 h-3" /> Adesão (%)</p>
                        <ResponsiveContainer width="100%" height={150}>
                          <AreaChart data={patient.progress}>
                            <defs>
                              <linearGradient id={`adh-${patient.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="week_number" tick={{ fontSize: 10 }} tickFormatter={v => `S${v}`} />
                            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                            <Tooltip />
                            <Area type="monotone" dataKey="adherence_score" stroke="#10b981" fill={`url(#adh-${patient.id})`} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── AI INSIGHTS TAB ── */}
          <TabsContent value="ai" className="space-y-4">
            <Card className="glass shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Insights Inteligentes do Programa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Selecione uma paciente para gerar insights personalizados com IA</p>

                <div className="flex flex-wrap gap-2">
                  {patients.map(p => (
                    <Button
                      key={p.id}
                      size="sm"
                      variant={selectedPatient?.id === p.id ? "default" : "outline"}
                      onClick={() => getAIInsights(p)}
                      disabled={loadingAI}
                      className="gap-1"
                    >
                      {p.name}
                    </Button>
                  ))}
                </div>

                {loadingAI && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Analisando dados com IA...</span>
                  </div>
                )}

                {aiInsight && !loadingAI && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Status */}
                    <div className={`rounded-xl p-4 ${statusBg[aiInsight.overall_status] || "bg-muted/50"} border border-border/50`}>
                      <div className="flex items-center gap-2 mb-2">
                        {aiInsight.overall_status === "on_track" && <CheckCircle2 className="w-5 h-5 text-success" />}
                        {aiInsight.overall_status === "attention" && <AlertTriangle className="w-5 h-5 text-warning" />}
                        {aiInsight.overall_status === "at_risk" && <AlertTriangle className="w-5 h-5 text-destructive" />}
                        <h3 className={`font-display font-semibold ${statusColor[aiInsight.overall_status]}`}>{aiInsight.status_label}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground italic">"{aiInsight.motivation_message}"</p>
                    </div>

                    {/* Insights */}
                    <div>
                      <h4 className="font-display font-semibold text-sm mb-2 flex items-center gap-1"><Sparkles className="w-4 h-4 text-primary" /> Insights</h4>
                      <ul className="space-y-1.5">
                        {aiInsight.insights.map((ins, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs flex-shrink-0 mt-0.5">{i + 1}</span>
                            {ins}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h4 className="font-display font-semibold text-sm mb-2 flex items-center gap-1"><Heart className="w-4 h-4 text-pink-500" /> Recomendações</h4>
                      <ul className="space-y-1.5">
                        {aiInsight.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0 mt-0.5" /> {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Phase advice */}
                    <div className="rounded-xl bg-gradient-to-r from-pink-500/10 to-rose-500/10 p-4 border border-pink-500/20">
                      <h4 className="font-display font-semibold text-sm mb-1 flex items-center gap-1"><Trophy className="w-4 h-4 text-amber-500" /> Conselho para a Fase Atual</h4>
                      <p className="text-sm text-muted-foreground">{aiInsight.phase_advice}</p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── EXCLUSIVE PROTOCOL TAB ── */}
          <TabsContent value="protocol" className="space-y-4">
            <BiquiniBrancoProtocol />
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
}
