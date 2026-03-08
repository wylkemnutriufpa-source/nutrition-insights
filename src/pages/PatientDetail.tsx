import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import MetabolicRadar from "@/components/dashboard/MetabolicRadar";
import { AnamnesisInsightsFull } from "@/components/patient/AnamnesisInsightsCard";
import PatientCalculators from "@/components/patient/PatientCalculators";
import PatientAgenda from "@/components/patient/PatientAgenda";
import {
  ArrowLeft, User, Calendar, FileText, ListChecks, Play,
  Clock, Activity, Plus, MessageSquare, AlertTriangle, CheckCircle2,
  TrendingUp, Zap, Heart, Brain, BookOpen, Scale, Calculator, CalendarDays
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

  const fetchAll = useCallback(async () => {
    if (!patientId || !user) return;
    setLoading(true);

    const [profileRes, timelineRes, anamnesisRes, ppRes, protocolsRes, checkRes] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url, phone").eq("user_id", patientId).single(),
      supabase.from("patient_timeline").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(50),
      supabase.from("patient_anamnesis").select("*").eq("user_id", patientId).order("created_at", { ascending: false }).limit(1),
      supabase.from("patient_protocols").select("*").eq("patient_id", patientId).eq("nutritionist_id", user.id).order("created_at", { ascending: false }),
      supabase.from("protocols").select("id, title").eq("created_by", user.id),
      supabase.from("checklist_tasks").select("id, completed").eq("patient_id", patientId).eq("date", new Date().toISOString().split("T")[0]),
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {(profile?.full_name || "P")[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">{profile?.full_name || "Paciente"}</h1>
            <p className="text-sm text-muted-foreground">
              Checklist hoje: {checklistStats.completed}/{checklistStats.total} tarefas •
              {patientProtocols.filter(p => p.status === "active").length} protocolos ativos
            </p>
          </div>
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
              {anamnesis ? "Refazer Anamnese" : "Preencher Anamnese"}
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

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start bg-card border border-border overflow-x-auto">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="ai-insights">
              <Brain className="w-3.5 h-3.5 mr-1" /> IA Insights
            </TabsTrigger>
            <TabsTrigger value="assessment">
              <Activity className="w-3.5 h-3.5 mr-1" /> Avaliação Física
            </TabsTrigger>
            <TabsTrigger value="agenda">
              <CalendarDays className="w-3.5 h-3.5 mr-1" /> Agenda
            </TabsTrigger>
            <TabsTrigger value="calculators">
              <Calculator className="w-3.5 h-3.5 mr-1" /> Calculadoras
            </TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="protocols">Protocolos</TabsTrigger>
            <TabsTrigger value="radar">Radar Metabólico</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Risk Panel */}
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

              {/* Anamnesis Summary */}
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
          </TabsContent>

          {/* AI Insights */}
          <TabsContent value="ai-insights" className="mt-4">
            <AnamnesisInsightsFull userId={patientId!} />
          </TabsContent>

          {/* Physical Assessment */}
          <TabsContent value="assessment" className="mt-4">
            <div className="glass rounded-xl p-8 text-center">
              <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-display font-semibold text-lg mb-2">Avaliação Física Completa</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Medidas corporais, dobras cutâneas, composição corporal e gasto energético.
              </p>
              <Button
                onClick={() => navigate(`/physical-assessment?patientId=${patientId}`)}
                className="gradient-primary gap-2 shadow-glow"
              >
                <Activity className="w-4 h-4" /> Abrir Avaliação Física
              </Button>
            </div>
          </TabsContent>

          {/* Agenda */}
          <TabsContent value="agenda" className="mt-4">
            <PatientAgenda patientId={patientId!} />
          </TabsContent>

          {/* Calculadoras */}
          <TabsContent value="calculators" className="mt-4">
            <PatientCalculators anamnesis={anamnesis} />
          </TabsContent>

          {/* Timeline */}
          <TabsContent value="timeline" className="mt-4">
            <div className="flex justify-end mb-4">
              <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Nota</Button>
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
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="relative"
                    >
                      <div className={`absolute -left-5 w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center`}>
                        <Icon className={`w-3 h-3 ${config.color}`} />
                      </div>
                      <div className="glass rounded-xl p-4 ml-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{event.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Protocols */}
          <TabsContent value="protocols" className="mt-4 space-y-3">
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
          </TabsContent>

          {/* Metabolic Radar */}
          <TabsContent value="radar" className="mt-4">
            <MetabolicRadar anamnesis={anamnesis} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
