import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import MetabolicRadar from "@v1/components/dashboard/MetabolicRadar";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Textarea } from "@v1/components/ui/textarea";
import { Badge } from "@v1/components/ui/badge";
import { Progress } from "@v1/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@v1/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@v1/components/ui/tabs";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import {
  ArrowLeft, Users, Calendar, Target, Rocket, Trophy,
  UserPlus, Plus, Clock, MessageSquare, AlertTriangle,
  CheckCircle2, Activity, Zap, TrendingUp, Crown,
  Shield, BarChart3, Settings2, Play, FileText
} from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const TAG_COLORS: Record<string, string> = {
  challenge: "bg-destructive/10 text-destructive",
  transformation: "bg-primary/10 text-primary",
  detox: "bg-success/10 text-success",
  general: "bg-muted text-muted-foreground",
  seasonal: "bg-warning/10 text-warning",
};
const TAG_LABELS: Record<string, string> = {
  challenge: "🔥 Desafio", transformation: "✨ Transformação",
  detox: "🌿 Detox", seasonal: "☀️ Sazonal", general: "📋 Geral",
};

interface ProgramData {
  id: string; title: string; description: string | null; tag: string;
  start_date: string; end_date: string | null; is_active: boolean;
  max_patients: number | null; protocol_id: string | null; created_by: string;
}

interface EnrolledPatient {
  id: string; patient_id: string; status: string;
  name: string; avatar_url: string | null;
  checklistToday: number; checklistDone: number;
  xp: number; level: number; streak: number;
  anamnesis: any | null;
  riskFactors: string[];
}

interface TimelineEvent {
  id: string; event_type: string; title: string;
  description: string | null; created_at: string; created_by: string | null;
}

export default function ProgramDetail() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [program, setProgram] = useState<ProgramData | null>(null);
  const [patients, setPatients] = useState<EnrolledPatient[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [protocols, setProtocols] = useState<{ id: string; title: string }[]>([]);
  const [allPatients, setAllPatients] = useState<{ id: string; name: string }[]>([]);
  const [joinRequests, setJoinRequests] = useState<{ id: string; patient_id: string; patient_name: string; message: string | null; status: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollPatientId, setEnrollPatientId] = useState("");
  const [enrollSearch, setEnrollSearch] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: "", description: "", event_type: "note" });

  const fetchAll = useCallback(async () => {
    if (!programId || !user) return;
    setLoading(true);

    // Program data
    const { data: prog } = await supabase.from("programs").select("*").eq("id", programId).maybeSingle();
    if (!prog) { setLoading(false); return; }
    setProgram(prog);

    // Enrolled patients
    const { data: enrolled } = await supabase.from("program_patients")
      .select("id, patient_id, status").eq("program_id", programId).eq("status", "active");

    const today = new Date().toISOString().split("T")[0];
    const enrichedPatients: EnrolledPatient[] = [];

    for (const ep of (enrolled || [])) {
      const [profileRes, statsRes, checkRes, anamRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", ep.patient_id).maybeSingle(),
        supabase.from("player_stats").select("total_xp, level, current_streak").eq("user_id", ep.patient_id).maybeSingle(),
        supabase.from("checklist_tasks").select("id, completed").eq("patient_id", ep.patient_id).eq("date", today),
        supabase.from("patient_anamnesis").select("answers, computed_tmb, computed_kcal_target, computed_protein, computed_carbs, computed_fat")
          .eq("user_id", ep.patient_id).order("created_at", { ascending: false }).limit(1),
      ]);

      const anamnesis = anamRes.data?.[0] || null;
      const risks: string[] = [];
      if (anamnesis?.answers) {
        const a = anamnesis.answers as Record<string, any>;
        if (a.health_conditions?.some((c: string) => c !== "none")) risks.push("Condição de saúde");
        if (a.activity_level === "sedentary") risks.push("Sedentário");
        if (a.feeling === "terrible" || a.feeling === "bad") risks.push("Insatisfeito");
        if (a.water_intake && a.water_intake < 6) risks.push("Baixa hidratação");
      }

      enrichedPatients.push({
        id: ep.id, patient_id: ep.patient_id, status: ep.status,
        name: profileRes.data?.full_name || "Paciente",
        avatar_url: profileRes.data?.avatar_url || null,
        xp: statsRes.data?.total_xp || 0,
        level: statsRes.data?.level || 1,
        streak: statsRes.data?.current_streak || 0,
        checklistToday: checkRes.data?.length || 0,
        checklistDone: checkRes.data?.filter((t: any) => t.completed).length || 0,
        anamnesis,
        riskFactors: risks,
      });
    }

    setPatients(enrichedPatients.sort((a, b) => b.xp - a.xp));

    // Timeline
    const { data: tl } = await supabase.from("program_timeline" as any)
      .select("*").eq("program_id", programId).order("created_at", { ascending: false }).limit(50);
    setTimeline((tl as any[]) || []);

    // Protocols & all available patients for enrollment
    const [protRes, allPtRes] = await Promise.all([
      supabase.from("protocols").select("id, title").eq("created_by", user.id),
      supabase.from("nutritionist_patients").select("patient_id").eq("nutritionist_id", user.id).eq("status", "active"),
    ]);
    setProtocols(protRes.data || []);

    if (allPtRes.data) {
      const pts = await Promise.all(
        allPtRes.data.map(async (d: any) => {
          const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", d.patient_id).maybeSingle();
          return { id: d.patient_id, name: p?.full_name || "Paciente" };
        })
      );
      setAllPatients(pts);
    }

    // Join requests
    const { data: joinReqs } = await supabase
      .from("program_join_requests")
      .select("*")
      .eq("program_id", programId)
      .order("created_at", { ascending: false });

    if (joinReqs) {
      const reqPatientIds = [...new Set(joinReqs.map((r: any) => r.patient_id))];
      const { data: reqProfiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", reqPatientIds);
      const nameMap = new Map(reqProfiles?.map((p: any) => [p.user_id, p.full_name]) || []);
      setJoinRequests(joinReqs.map((r: any) => ({
        ...r,
        patient_name: nameMap.get(r.patient_id) || "Paciente",
      })));
    }

    setLoading(false);
  }, [programId, user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime for timeline
  useEffect(() => {
    if (!programId) return;
    const channel = supabase.channel(`program-tl-${programId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "program_timeline", filter: `program_id=eq.${programId}` },
        () => { fetchAll(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [programId, fetchAll]);

  const enrollPatient = async (patientId: string) => {
    if (!patientId || !programId) return;
    const { error } = await supabase.from("program_patients").insert({ program_id: programId, patient_id: patientId });
    if (error) {
      if (error.code === "23505") toast.info("Paciente já inscrito");
      else toast.error(error.message);
      return;
    }
    await supabase.from("program_timeline" as any).insert({
      program_id: programId, event_type: "enrollment",
      title: "Novo paciente inscrito",
      description: allPatients.find(p => p.id === patientId)?.name,
      created_by: user?.id,
    });
    toast.success("Paciente inscrito! 🎉");
    fetchAll();
  };

  const removePatient = async (enrollmentId: string, patientName: string) => {
    const { error } = await supabase.from("program_patients").delete().eq("id", enrollmentId);
    if (error) { toast.error(error.message); return; }
    await supabase.from("program_timeline" as any).insert({
      program_id: programId, event_type: "enrollment",
      title: "Paciente removido",
      description: patientName,
      created_by: user?.id,
    });
    toast.success(`${patientName} removido do programa.`);
    fetchAll();
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programId || !user) return;
    await supabase.from("program_timeline" as any).insert({
      program_id: programId, event_type: noteForm.event_type,
      title: noteForm.title, description: noteForm.description || null,
      created_by: user.id,
    });
    toast.success("Nota adicionada!");
    setNoteOpen(false); setNoteForm({ title: "", description: "", event_type: "note" });
    fetchAll();
  };

  const approveJoinRequest = async (requestId: string, patientId: string, patientName: string) => {
    if (!programId || !user) return;
    await supabase.from("program_join_requests").update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq("id", requestId);
    await supabase.from("program_patients").insert({ program_id: programId, patient_id: patientId });
    await supabase.from("program_timeline" as any).insert({
      program_id: programId, event_type: "enrollment",
      title: "Solicitação aprovada", description: patientName, created_by: user.id,
    });
    toast.success(`✅ ${patientName} aprovado e inscrito!`);
    fetchAll();
  };

  const rejectJoinRequest = async (requestId: string) => {
    await supabase.from("program_join_requests").update({ status: "rejected", reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", requestId);
    toast.success("Solicitação recusada.");
    setJoinRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: "rejected" } : r));
  };

  const activateProtocolForAll = async (protocolId: string) => {
    if (!user || !programId) return;
    let count = 0;
    for (const pt of patients) {
      const { data } = await supabase.from("patient_protocols").insert({
        patient_id: pt.patient_id, protocol_id: protocolId,
        nutritionist_id: user.id, status: "active",
        start_date: new Date().toISOString().split("T")[0],
      }).select().single();
      if (data) {
        await supabase.rpc("sync_protocol_checklist", { _patient_protocol_id: data.id });
        count++;
      }
    }
    await supabase.from("program_timeline" as any).insert({
      program_id: programId, event_type: "protocol",
      title: `Protocolo ativado para ${count} pacientes`,
      description: protocols.find(p => p.id === protocolId)?.title,
      created_by: user.id,
    });
    toast.success(`Protocolo ativado para ${count} pacientes!`);
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

  // ── Computed metrics ──
  const daysProgress = (() => {
    const now = new Date();
    const start = new Date(program.start_date);
    if (!program.end_date) return null;
    const end = new Date(program.end_date);
    const total = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
    const elapsed = Math.max(0, (now.getTime() - start.getTime()) / 86400000);
    return Math.min(100, Math.round((elapsed / total) * 100));
  })();

  const totalChecklist = patients.reduce((s, p) => s + p.checklistToday, 0);
  const doneChecklist = patients.reduce((s, p) => s + p.checklistDone, 0);
  const adherence = totalChecklist > 0 ? Math.round((doneChecklist / totalChecklist) * 100) : 0;
  const avgXp = patients.length > 0 ? Math.round(patients.reduce((s, p) => s + p.xp, 0) / patients.length) : 0;
  const riskCount = patients.filter(p => p.riskFactors.length > 0).length;

  // ── Average metabolic radar ──
  const computeAvgRadar = () => {
    const patientsWithAnamnesis = patients.filter(p => p.anamnesis?.answers);
    if (patientsWithAnamnesis.length === 0) return null;

    const activityScore: Record<string, number> = { sedentary: 20, light: 40, moderate: 70, intense: 95 };
    const motivationScore: Record<string, number> = { terrible: 15, bad: 30, ok: 50, good: 75, great: 95 };

    let totals = { activity: 0, hydration: 0, sleep: 0, nutrition: 0, motivation: 0, exercise: 0 };
    for (const pt of patientsWithAnamnesis) {
      const a = pt.anamnesis.answers;
      totals.activity += activityScore[a.activity_level] || 40;
      totals.hydration += Math.min(100, ((a.water_intake || 4) / 12) * 100);

      let sleepScore = 50;
      if (a.wake_time && a.sleep_time) {
        const [wh] = a.wake_time.split(":").map(Number);
        const [sh] = a.sleep_time.split(":").map(Number);
        let hours = wh - sh; if (hours <= 0) hours += 24;
        sleepScore = (hours >= 7 && hours <= 9) ? 90 : (hours >= 6 && hours <= 10) ? 60 : 30;
      }
      totals.sleep += sleepScore;

      let nutritionScore = 70;
      const restrictions = a.restrictions || [];
      const conditions = a.health_conditions || [];
      if (restrictions.includes("none") && conditions.includes("none")) nutritionScore = 90;
      if (conditions.some((c: string) => c !== "none")) nutritionScore -= 20;
      totals.nutrition += Math.max(10, Math.min(100, nutritionScore));

      totals.motivation += motivationScore[a.feeling] || 50;

      const exerciseTypes = a.exercise_type || [];
      totals.exercise += exerciseTypes.includes("none") ? 10 : Math.min(100, exerciseTypes.length * 30);
    }

    const n = patientsWithAnamnesis.length;
    return [
      { metric: "Atividade", value: Math.round(totals.activity / n) },
      { metric: "Hidratação", value: Math.round(totals.hydration / n) },
      { metric: "Sono", value: Math.round(totals.sleep / n) },
      { metric: "Nutrição", value: Math.round(totals.nutrition / n) },
      { metric: "Motivação", value: Math.round(totals.motivation / n) },
      { metric: "Exercícios", value: Math.round(totals.exercise / n) },
    ];
  };
  const avgRadar = computeAvgRadar();
  const avgRadarScore = avgRadar ? Math.round(avgRadar.reduce((s, d) => s + d.value, 0) / avgRadar.length) : 0;

  const eventIcons: Record<string, any> = {
    protocol: FileText, note: MessageSquare, alert: AlertTriangle,
    achievement: CheckCircle2, enrollment: UserPlus, automation: Settings2,
  };
  const eventColors: Record<string, string> = {
    protocol: "text-primary", note: "text-info", alert: "text-warning",
    achievement: "text-success", enrollment: "text-accent", automation: "text-muted-foreground",
  };

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* ── HEADER ── */}
        <motion.div variants={item}>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="gradient-primary p-6 relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/v1/programs")}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <Badge className={`${TAG_COLORS[program.tag] || TAG_COLORS.general} border-0 mb-1`}>
                      {TAG_LABELS[program.tag] || program.tag}
                    </Badge>
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">{program.title}</h1>
                    {program.description && (
                      <p className="text-primary-foreground/70 text-sm mt-1 max-w-xl">{program.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={enrollOpen} onOpenChange={(v) => { setEnrollOpen(v); if (!v) setEnrollSearch(""); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground gap-1 border-0">
                        <UserPlus className="w-4 h-4" /> Gerenciar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md max-h-[80vh]">
                      <DialogHeader><DialogTitle className="font-display">Gerenciar Pacientes</DialogTitle></DialogHeader>
                      <Input
                        placeholder="Buscar por nome..."
                        value={enrollSearch}
                        onChange={(e) => setEnrollSearch(e.target.value)}
                        className="mb-3"
                        autoFocus
                      />
                      <div className="max-h-[50vh] overflow-y-auto space-y-1 pr-1">
                        {allPatients
                          .filter(ap => {
                            const q = enrollSearch.toLowerCase().trim();
                            if (!q) return true;
                            return ap.name.toLowerCase().includes(q);
                          })
                          .sort((a, b) => {
                            const aEnrolled = patients.some(p => p.patient_id === a.id);
                            const bEnrolled = patients.some(p => p.patient_id === b.id);
                            if (aEnrolled && !bEnrolled) return -1;
                            if (!aEnrolled && bEnrolled) return 1;
                            return a.name.localeCompare(b.name);
                          })
                          .map(ap => {
                            const enrolled = patients.find(p => p.patient_id === ap.id);
                            const isEnrolled = !!enrolled;
                            return (
                              <button
                                key={ap.id}
                                onClick={() => {
                                  if (isEnrolled) {
                                    removePatient(enrolled!.id, ap.name);
                                  } else {
                                    enrollPatient(ap.id);
                                  }
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                  isEnrolled
                                    ? "border-primary/30 bg-primary/5 hover:bg-destructive/10 hover:border-destructive/30"
                                    : "border-border/50 bg-card hover:border-primary/30 hover:bg-primary/5"
                                }`}
                              >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  isEnrolled ? "border-primary bg-primary" : "border-muted-foreground/30"
                                }`}>
                                  {isEnrolled && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-primary">{ap.name[0]?.toUpperCase()}</span>
                                </div>
                                <span className="text-sm font-medium truncate flex-1">{ap.name}</span>
                                {isEnrolled && (
                                  <Badge variant="outline" className="text-[10px] shrink-0 border-primary/30 text-primary">Inscrito</Badge>
                                )}
                              </button>
                            );
                          })}
                        {allPatients.filter(ap => {
                          const q = enrollSearch.toLowerCase().trim();
                          if (!q) return true;
                          return ap.name.toLowerCase().includes(q);
                        }).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-6">Nenhum paciente encontrado.</p>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground text-center mt-2">
                        {patients.length} inscrito{patients.length !== 1 ? "s" : ""} • Clique para adicionar ou remover
                      </p>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Progress bar */}
              {daysProgress !== null && (
                <div className="relative mt-5">
                  <div className="flex justify-between text-xs text-primary-foreground/60 mb-1">
                    <span>{new Date(program.start_date).toLocaleDateString("pt-BR")}</span>
                    <span>{daysProgress}% concluído</span>
                    <span>{program.end_date ? new Date(program.end_date).toLocaleDateString("pt-BR") : ""}</span>
                  </div>
                  <div className="h-2 rounded-full bg-primary-foreground/20 overflow-hidden">
                    <div className="h-full rounded-full bg-primary-foreground/80 transition-all" style={{ width: `${daysProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── METRICS ── */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Pacientes", value: patients.length, max: program.max_patients, icon: Users, color: "text-primary" },
            { label: "Adesão Hoje", value: `${adherence}%`, icon: CheckCircle2, color: "text-success" },
            { label: "XP Médio", value: avgXp, icon: Zap, color: "text-accent" },
            { label: "Alertas", value: riskCount, icon: AlertTriangle, color: "text-warning" },
            { label: "Radar Médio", value: avgRadarScore || "—", icon: Activity, color: "text-info" },
          ].map((m, i) => (
            <div key={i} className="glass rounded-xl p-4 text-center">
              <m.icon className={`w-5 h-5 mx-auto mb-1 ${m.color}`} />
              <p className="font-display font-bold text-xl">{m.value}{m.max ? <span className="text-sm text-muted-foreground font-normal">/{m.max}</span> : ""}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </motion.div>

        {/* ── TABS ── */}
        <Tabs defaultValue="patients" className="w-full">
          <TabsList className="w-full justify-start bg-card border border-border flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="patients" className="gap-1"><Users className="w-3.5 h-3.5" /> Pacientes</TabsTrigger>
            <TabsTrigger value="requests" className="gap-1 relative">
              <UserPlus className="w-3.5 h-3.5" /> Solicitações
              {joinRequests.filter(r => r.status === "pending").length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {joinRequests.filter(r => r.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-1"><Crown className="w-3.5 h-3.5" /> Ranking</TabsTrigger>
            <TabsTrigger value="radar" className="gap-1"><Activity className="w-3.5 h-3.5" /> Radar Médio</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1"><Clock className="w-3.5 h-3.5" /> Timeline</TabsTrigger>
            <TabsTrigger value="protocols" className="gap-1"><FileText className="w-3.5 h-3.5" /> Protocolos</TabsTrigger>
            <TabsTrigger value="automations" className="gap-1"><Settings2 className="w-3.5 h-3.5" /> Automações</TabsTrigger>
          </TabsList>

          {/* ── PATIENTS LIST ── */}
          <TabsContent value="patients" className="mt-4 space-y-3">
            {patients.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum paciente inscrito ainda.</p>
              </div>
            ) : (
              patients.map((pt, idx) => {
                const checkPct = pt.checklistToday > 0 ? Math.round((pt.checklistDone / pt.checklistToday) * 100) : 0;
                return (
                  <motion.div key={pt.id} variants={item}
                    onClick={() => navigate(`/patients/${pt.patient_id}`)}
                    className="glass rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary text-lg">{pt.name[0]}</span>
                      </div>
                      {idx < 3 && (
                        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          idx === 0 ? "bg-accent text-accent-foreground" : idx === 1 ? "bg-muted-foreground/30 text-foreground" : "bg-warning/40 text-foreground"
                        }`}>
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{pt.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {pt.xp} XP</span>
                        <span>Nível {pt.level}</span>
                        <span>🔥 {pt.streak}d</span>
                      </div>
                    </div>
                    <div className="w-32 hidden md:block">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Checklist</span><span>{checkPct}%</span>
                      </div>
                      <Progress value={checkPct} className="h-1.5" />
                    </div>
                    {pt.riskFactors.length > 0 && (
                      <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                    )}
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          {/* ── JOIN REQUESTS ── */}
          <TabsContent value="requests" className="mt-4 space-y-3">
            {joinRequests.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma solicitação de participação.</p>
              </div>
            ) : (
              joinRequests.map((req) => (
                <div
                  key={req.id}
                  className={`glass rounded-xl p-4 flex items-center gap-4 transition-all ${
                    req.status === "pending" ? "border-warning/30" : req.status === "approved" ? "border-primary/20 opacity-60" : "border-destructive/20 opacity-40"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">{req.patient_name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{req.patient_name}</p>
                    {req.message && <p className="text-xs text-muted-foreground mt-0.5">{req.message}</p>}
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  {req.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveJoinRequest(req.id, req.patient_id, req.patient_name)} className="gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aceitar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectJoinRequest(req.id)} className="gap-1 text-destructive hover:text-destructive">
                        <AlertTriangle className="w-3.5 h-3.5" /> Recusar
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="outline" className={req.status === "approved" ? "text-primary" : "text-destructive"}>
                      {req.status === "approved" ? "Aprovado" : "Recusado"}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* ── RANKING ── */}
          <TabsContent value="ranking" className="mt-4">
            <div className="glass rounded-xl overflow-hidden">
              {/* Top 3 podium */}
              {patients.length >= 1 && (
                <div className="gradient-primary p-6">
                  <h3 className="font-display font-semibold text-primary-foreground mb-4 flex items-center gap-2">
                    <Crown className="w-5 h-5" /> Pódio do Programa
                  </h3>
                  <div className="flex items-end justify-center gap-4">
                    {[1, 0, 2].map(rank => {
                      const pt = patients[rank];
                      if (!pt) return <div key={rank} className="w-24" />;
                      const isFirst = rank === 0;
                      return (
                        <div key={rank} className={`text-center ${isFirst ? "order-2" : rank === 1 ? "order-1" : "order-3"}`}>
                          <div className={`mx-auto mb-2 rounded-full flex items-center justify-center border-2 ${
                            isFirst ? "w-20 h-20 border-accent bg-primary-foreground/20" :
                            "w-16 h-16 border-primary-foreground/30 bg-primary-foreground/10"
                          }`}>
                            <span className={`font-bold text-primary-foreground ${isFirst ? "text-2xl" : "text-xl"}`}>
                              {pt.name[0]}
                            </span>
                          </div>
                          {isFirst && <span className="text-2xl">👑</span>}
                          <p className="text-primary-foreground font-medium text-sm mt-1 truncate max-w-[100px]">{pt.name}</p>
                          <p className="text-primary-foreground/70 text-xs">{pt.xp} XP</p>
                          <div className={`mt-2 rounded-t-lg ${isFirst ? "h-20 bg-primary-foreground/20" : "h-12 bg-primary-foreground/10"}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full ranking list */}
              <div className="p-4 space-y-2">
                {patients.map((pt, i) => (
                  <div key={pt.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? "bg-accent/20 text-accent" : i === 1 ? "bg-muted text-foreground" : i === 2 ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{pt.name}</p>
                      <p className="text-xs text-muted-foreground">Nível {pt.level} • 🔥 {pt.streak}d streak</p>
                    </div>
                    <span className="font-display font-bold text-sm">{pt.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── AVERAGE RADAR ── */}
          <TabsContent value="radar" className="mt-4">
            <div className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" /> Radar Metabólico Médio
                </h3>
                {avgRadar && (
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    avgRadarScore >= 70 ? "bg-success/10 text-success" :
                    avgRadarScore >= 40 ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  }`}>
                    Score: {avgRadarScore}
                  </div>
                )}
              </div>
              {!avgRadar ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum paciente preencheu a anamnese ainda.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={avgRadar} cx="50%" cy="50%" outerRadius="75%">
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Média" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {avgRadar.map(d => (
                      <div key={d.metric} className="text-center p-2 rounded-lg bg-card">
                        <p className="text-xs text-muted-foreground">{d.metric}</p>
                        <p className={`font-bold text-sm ${d.value >= 70 ? "text-success" : d.value >= 40 ? "text-warning" : "text-destructive"}`}>
                          {d.value}%
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* ── TIMELINE ── */}
          <TabsContent value="timeline" className="mt-4">
            <div className="flex justify-end mb-4">
              <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Nota</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-display">Nota do Programa</DialogTitle></DialogHeader>
                  <form onSubmit={addNote} className="space-y-4">
                    <div>
                      <Label>Tipo</Label>
                      <Select value={noteForm.event_type} onValueChange={v => setNoteForm({ ...noteForm, event_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="note">📝 Nota</SelectItem>
                          <SelectItem value="alert">⚠️ Alerta</SelectItem>
                          <SelectItem value="achievement">🏆 Marco</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Título</Label><Input value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} required /></div>
                    <div><Label>Descrição</Label><Textarea value={noteForm.description} onChange={e => setNoteForm({ ...noteForm, description: e.target.value })} /></div>
                    <Button type="submit" className="w-full gradient-primary">Salvar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {timeline.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Timeline vazia. Adicione notas ou inscreva pacientes.</p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border" />
                {timeline.map(ev => {
                  const Icon = eventIcons[ev.event_type] || MessageSquare;
                  const color = eventColors[ev.event_type] || "text-muted-foreground";
                  return (
                    <div key={ev.id} className="relative flex gap-4">
                      <div className={`absolute -left-3.5 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center`}>
                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                      </div>
                      <div className="glass rounded-lg p-3 flex-1 ml-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{ev.title}</p>
                          <span className="text-xs text-muted-foreground">{new Date(ev.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        {ev.description && <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── PROTOCOLS ── */}
          <TabsContent value="protocols" className="mt-4 space-y-4">
            <div className="glass rounded-xl p-5">
              <h3 className="font-display font-semibold flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-primary" /> Ativar Protocolo para Todos
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Selecione um protocolo para ativá-lo em massa para todos os {patients.length} pacientes do programa.
              </p>
              {protocols.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum protocolo criado. <button onClick={() => navigate("/v1/protocols")} className="text-primary underline">Criar protocolo</button></p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {protocols.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <span className="font-medium text-sm">{p.title}</span>
                      </div>
                      <Button size="sm" className="gap-1" onClick={() => activateProtocolForAll(p.id)}>
                        <Play className="w-3.5 h-3.5" /> Ativar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── AUTOMATIONS ── */}
          <TabsContent value="automations" className="mt-4">
            <div className="glass rounded-xl p-5">
              <h3 className="font-display font-semibold flex items-center gap-2 mb-4">
                <Settings2 className="w-5 h-5 text-primary" /> Automações do Programa
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                  <div>
                    <p className="font-medium text-sm">Sync Checklist Automático</p>
                    <p className="text-xs text-muted-foreground">Sincroniza tarefas diárias dos protocolos ativos para cada paciente</p>
                  </div>
                  <Badge className="bg-success/10 text-success border-0">Ativo</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                  <div>
                    <p className="font-medium text-sm">Alerta de Risco</p>
                    <p className="text-xs text-muted-foreground">Identifica pacientes sedentários, insatisfeitos ou com condições de saúde</p>
                  </div>
                  <Badge className="bg-success/10 text-success border-0">Ativo</Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                  <div>
                    <p className="font-medium text-sm">Ranking Automático</p>
                    <p className="text-xs text-muted-foreground">Ranking por XP atualizado em tempo real</p>
                  </div>
                  <Badge className="bg-success/10 text-success border-0">Ativo</Badge>
                </div>
                {program.protocol_id && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                    <div>
                      <p className="font-medium text-sm">Protocolo Vinculado</p>
                      <p className="text-xs text-muted-foreground">
                        {protocols.find(p => p.id === program.protocol_id)?.title || "Protocolo"} — ativado automaticamente ao inscrever paciente
                      </p>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-0">Configurado</Badge>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
}
