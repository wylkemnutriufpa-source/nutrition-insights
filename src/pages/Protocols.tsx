import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Plus, FileText, Trash2, Clock, ListChecks,
  ChevronRight, Users, Play, Pause, UserPlus,
  BarChart3, CheckCircle2, XCircle, Calendar, TrendingUp
} from "lucide-react";

// ── Types ──
interface Protocol {
  id: string;
  title: string;
  description: string | null;
  category: string;
  duration_days: number;
  is_template: boolean;
  created_by: string;
  created_at: string;
  task_count?: number;
}

interface ProtocolTask {
  id: string;
  protocol_id: string;
  title: string;
  description: string | null;
  category: string;
  frequency: string;
  sort_order: number;
  icon: string;
}

interface PatientProtocol {
  id: string;
  patient_id: string;
  protocol_id: string;
  nutritionist_id: string;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
  patient_name?: string;
  adherence?: number;
}

interface PatientOption {
  id: string;
  full_name: string;
}

const CATEGORIES = [
  { value: "nutrition", label: "🥗 Nutrição" },
  { value: "fitness", label: "💪 Fitness" },
  { value: "wellness", label: "🧘 Bem-estar" },
  { value: "sleep", label: "😴 Sono" },
  { value: "hydration", label: "💧 Hidratação" },
  { value: "mindset", label: "🧠 Mindset" },
];

const TASK_ICONS = ["✅", "💧", "🏃", "🥗", "💊", "😴", "🧘", "📝", "⏰", "🍎", "🫖", "🚫", "🌿", "🧊"];

export default function Protocols() {
  const { user } = useAuth();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [tasks, setTasks] = useState<ProtocolTask[]>([]);
  const [form, setForm] = useState({ title: "", description: "", category: "nutrition", duration_days: "30" });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", category: "habit", frequency: "daily", icon: "✅" });
  const [submitting, setSubmitting] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("catalog");

  // Patient assignment state
  const [assignOpen, setAssignOpen] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [assignForm, setAssignForm] = useState({ patient_id: "", start_date: new Date().toISOString().split("T")[0], duration: "" });
  const [patientProtocols, setPatientProtocols] = useState<PatientProtocol[]>([]);

  // ── Fetch protocols ──
  const fetchProtocols = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("protocols")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const enriched = await Promise.all(
        data.map(async (p: any) => {
          const { count } = await supabase
            .from("protocol_tasks")
            .select("id", { count: "exact" })
            .eq("protocol_id", p.id);
          return { ...p, task_count: count || 0 };
        })
      );
      setProtocols(enriched);
    }
    setLoading(false);
  }, [user]);

  const fetchTasks = useCallback(async (protocolId: string) => {
    const { data } = await supabase
      .from("protocol_tasks")
      .select("*")
      .eq("protocol_id", protocolId)
      .order("sort_order");
    setTasks(data || []);
  }, []);

  // ── Fetch patients for assignment ──
  const fetchPatients = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("nutritionist_patients")
      .select("patient_id")
      .eq("nutritionist_id", user.id)
      .eq("status", "active");

    if (data && data.length > 0) {
      const ids = data.map((d: any) => d.patient_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      setPatients((profiles || []).map((p: any) => ({ id: p.user_id, full_name: p.full_name })));
    }
  }, [user]);

  // ── Fetch patient protocols with adherence ──
  const fetchPatientProtocols = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("patient_protocols")
      .select("*")
      .eq("nutritionist_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      const patientIds = [...new Set(data.map((d: any) => d.patient_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds);

      const profileMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.user_id] = p.full_name;
        return acc;
      }, {});

      // Calc adherence for active ones
      const enriched = await Promise.all(
        data.map(async (pp: any) => {
          let adherence = 0;
          if (pp.status === "active") {
            const { count: total } = await supabase
              .from("checklist_tasks")
              .select("id", { count: "exact" })
              .eq("patient_id", pp.patient_id)
              .eq("patient_protocol_id", pp.id);

            const { count: done } = await supabase
              .from("checklist_tasks")
              .select("id", { count: "exact" })
              .eq("patient_id", pp.patient_id)
              .eq("patient_protocol_id", pp.id)
              .eq("completed", true);

            adherence = total && total > 0 ? Math.round(((done || 0) / total) * 100) : 0;
          }
          return { ...pp, patient_name: profileMap[pp.patient_id] || "Paciente", adherence };
        })
      );
      setPatientProtocols(enriched);
    }
  }, [user]);

  useEffect(() => { fetchProtocols(); fetchPatients(); fetchPatientProtocols(); }, [fetchProtocols, fetchPatients, fetchPatientProtocols]);
  useEffect(() => { if (selectedProtocol) fetchTasks(selectedProtocol.id); }, [selectedProtocol, fetchTasks]);

  // ── CRUD Handlers ──
  const handleCreateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase.from("protocols").insert({
      title: form.title,
      description: form.description || null,
      category: form.category,
      duration_days: parseInt(form.duration_days) || 30,
      created_by: user.id,
    }).select().single();

    if (error) toast.error(error.message);
    else {
      toast.success("Protocolo criado!");
      setCreateOpen(false);
      setForm({ title: "", description: "", category: "nutrition", duration_days: "30" });
      fetchProtocols();
      if (data) setSelectedProtocol({ ...data, task_count: 0 });
    }
    setSubmitting(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProtocol) return;
    setSubmitting(true);
    const { error } = await supabase.from("protocol_tasks").insert({
      protocol_id: selectedProtocol.id,
      title: taskForm.title,
      description: taskForm.description || null,
      category: taskForm.category,
      frequency: taskForm.frequency,
      icon: taskForm.icon,
      sort_order: tasks.length,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Tarefa adicionada!");
      setTaskDialogOpen(false);
      setTaskForm({ title: "", description: "", category: "habit", frequency: "daily", icon: "✅" });
      fetchTasks(selectedProtocol.id);
      fetchProtocols();
    }
    setSubmitting(false);
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("protocol_tasks").delete().eq("id", taskId);
    if (selectedProtocol) fetchTasks(selectedProtocol.id);
    fetchProtocols();
  };

  const deleteProtocol = async (protocolId: string) => {
    await supabase.from("protocols").delete().eq("id", protocolId);
    if (selectedProtocol?.id === protocolId) { setSelectedProtocol(null); setTasks([]); }
    fetchProtocols();
    toast.success("Protocolo removido");
  };

  // ── Assign protocol to patient ──
  const handleAssignProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProtocol) return;
    setSubmitting(true);

    const durationDays = parseInt(assignForm.duration) || selectedProtocol.duration_days;
    const startDate = assignForm.start_date;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);

    const { data: pp, error } = await supabase.from("patient_protocols").insert({
      patient_id: assignForm.patient_id,
      protocol_id: selectedProtocol.id,
      nutritionist_id: user.id,
      start_date: startDate,
      end_date: endDate.toISOString().split("T")[0],
      status: "active",
    }).select().single();

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    // Sync checklist tasks for today
    if (pp) {
      await supabase.rpc("sync_protocol_checklist", {
        _patient_protocol_id: pp.id,
        _date: new Date().toISOString().split("T")[0],
      });
    }

    toast.success("Protocolo ativado para o paciente!");
    setAssignOpen(false);
    setAssignForm({ patient_id: "", start_date: new Date().toISOString().split("T")[0], duration: "" });
    fetchPatientProtocols();
    setSubmitting(false);
  };

  // ── Toggle protocol status ──
  const toggleProtocolStatus = async (pp: PatientProtocol) => {
    const newStatus = pp.status === "active" ? "paused" : "active";
    await supabase.from("patient_protocols").update({ status: newStatus }).eq("id", pp.id);

    if (newStatus === "active") {
      // Re-sync checklist for today
      await supabase.rpc("sync_protocol_checklist", {
        _patient_protocol_id: pp.id,
        _date: new Date().toISOString().split("T")[0],
      });
    }

    toast.success(newStatus === "active" ? "Protocolo reativado!" : "Protocolo pausado");
    fetchPatientProtocols();
  };

  const removePatientProtocol = async (ppId: string) => {
    await supabase.from("patient_protocols").update({ status: "completed" }).eq("id", ppId);
    toast.success("Protocolo finalizado");
    fetchPatientProtocols();
  };

  // Filter patient protocols for selected protocol
  const selectedProtocolPatients = patientProtocols.filter(
    (pp) => selectedProtocol && pp.protocol_id === selectedProtocol.id
  );

  const activeProtocolsCount = patientProtocols.filter((pp) => pp.status === "active").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <FileText className="w-7 h-7 text-primary" /> Protocolos Nutricionais
            </h1>
            <p className="text-muted-foreground text-sm">
              {protocols.length} protocolos · {activeProtocolsCount} ativos em pacientes
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2 shadow-glow">
                <Plus className="w-4 h-4" /> Novo Protocolo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Criar Protocolo</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProtocol} className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Protocolo Anti-Inflamatório" required />
                </div>
                <div>
                  <Label>Descrição / Objetivo Clínico</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o objetivo clínico do protocolo..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duração (dias)</Label>
                    <Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} min={1} />
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                  {submitting ? "Criando..." : "Criar Protocolo"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-fit">
            <TabsTrigger value="catalog" className="gap-2"><FileText className="w-4 h-4" /> Catálogo</TabsTrigger>
            <TabsTrigger value="active" className="gap-2"><Users className="w-4 h-4" /> Pacientes Ativos</TabsTrigger>
          </TabsList>

          {/* ── CATALOG TAB ── */}
          <TabsContent value="catalog" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Protocol list */}
              <div className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : protocols.length === 0 ? (
                  <div className="glass rounded-xl p-8 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">Nenhum protocolo ainda</p>
                    <p className="text-muted-foreground text-xs mt-1">Crie seu primeiro protocolo nutricional</p>
                  </div>
                ) : (
                  protocols.map((p) => (
                    <motion.div
                      key={p.id}
                      whileHover={{ x: 4 }}
                      onClick={() => setSelectedProtocol(p)}
                      className={`glass rounded-xl p-4 cursor-pointer transition-all ${
                        selectedProtocol?.id === p.id ? "border-primary/50 bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-display font-semibold text-sm truncate">{p.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{CATEGORIES.find(c => c.value === p.category)?.label}</span>
                            <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" /> {p.task_count}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.duration_days}d</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); deleteProtocol(p.id); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Protocol detail + tasks */}
              <div className="lg:col-span-2">
                {selectedProtocol ? (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="glass rounded-xl p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h2 className="font-display text-lg font-bold">{selectedProtocol.title}</h2>
                          {selectedProtocol.description && (
                            <p className="text-sm text-muted-foreground mt-1">{selectedProtocol.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{CATEGORIES.find(c => c.value === selectedProtocol.category)?.label}</span>
                            <span>{selectedProtocol.duration_days} dias</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {selectedProtocolPatients.filter(p => p.status === "active").length} pacientes ativos
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="gap-1">
                                <UserPlus className="w-4 h-4" /> Aplicar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="font-display">Aplicar Protocolo ao Paciente</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleAssignProtocol} className="space-y-4">
                                <div className="glass rounded-lg p-3">
                                  <p className="font-medium text-sm">{selectedProtocol.title}</p>
                                  <p className="text-xs text-muted-foreground">{selectedProtocol.duration_days} dias · {tasks.length} tarefas</p>
                                </div>
                                <div>
                                  <Label>Paciente</Label>
                                  <Select value={assignForm.patient_id} onValueChange={(v) => setAssignForm({ ...assignForm, patient_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                                    <SelectContent>
                                      {patients.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label>Início</Label>
                                    <Input type="date" value={assignForm.start_date} onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })} />
                                  </div>
                                  <div>
                                    <Label>Duração (dias)</Label>
                                    <Input type="number" value={assignForm.duration} onChange={(e) => setAssignForm({ ...assignForm, duration: e.target.value })} placeholder={String(selectedProtocol.duration_days)} min={1} />
                                  </div>
                                </div>
                                <Button type="submit" className="w-full gradient-primary" disabled={submitting || !assignForm.patient_id}>
                                  {submitting ? "Ativando..." : "Ativar Protocolo"}
                                </Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                          <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="gradient-primary gap-1">
                                <Plus className="w-4 h-4" /> Tarefa
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="font-display">Adicionar Tarefa</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleAddTask} className="space-y-4">
                                <div>
                                  <Label>Ícone</Label>
                                  <div className="flex gap-2 flex-wrap mt-1">
                                    {TASK_ICONS.map((icon) => (
                                      <button key={icon} type="button" onClick={() => setTaskForm({ ...taskForm, icon })}
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border-2 transition-all ${
                                          taskForm.icon === icon ? "border-primary bg-primary/10" : "border-border"
                                        }`}
                                      >{icon}</button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <Label>Título da tarefa</Label>
                                  <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Ex: Beber 2L de água" required />
                                </div>
                                <div>
                                  <Label>Descrição (opcional)</Label>
                                  <Textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label>Categoria</Label>
                                    <Select value={taskForm.category} onValueChange={(v) => setTaskForm({ ...taskForm, category: v })}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="habit">Hábito</SelectItem>
                                        <SelectItem value="nutrition">Nutrição</SelectItem>
                                        <SelectItem value="exercise">Exercício</SelectItem>
                                        <SelectItem value="supplement">Suplemento</SelectItem>
                                        <SelectItem value="mindset">Mindset</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label>Frequência</Label>
                                    <Select value={taskForm.frequency} onValueChange={(v) => setTaskForm({ ...taskForm, frequency: v })}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="daily">Diária</SelectItem>
                                        <SelectItem value="weekly">Semanal</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <Button type="submit" className="w-full gradient-primary" disabled={submitting}>
                                  {submitting ? "Adicionando..." : "Adicionar Tarefa"}
                                </Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>

                    {/* Patients using this protocol */}
                    {selectedProtocolPatients.length > 0 && (
                      <div className="glass rounded-xl p-4">
                        <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" /> Pacientes com este protocolo
                        </h3>
                        <div className="space-y-2">
                          {selectedProtocolPatients.map((pp) => (
                            <div key={pp.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{pp.patient_name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                    pp.status === "active" ? "bg-emerald-500/10 text-emerald-500" :
                                    pp.status === "paused" ? "bg-amber-500/10 text-amber-500" :
                                    "bg-muted text-muted-foreground"
                                  }`}>
                                    {pp.status === "active" ? "Ativo" : pp.status === "paused" ? "Pausado" : "Finalizado"}
                                  </span>
                                  <span>{new Date(pp.start_date).toLocaleDateString("pt-BR")}</span>
                                  {pp.end_date && <span>→ {new Date(pp.end_date).toLocaleDateString("pt-BR")}</span>}
                                </div>
                              </div>
                              {pp.status !== "completed" && (
                                <div className="flex items-center gap-2">
                                  <div className="text-right mr-1">
                                    <span className={`text-sm font-bold ${
                                      (pp.adherence || 0) >= 80 ? "text-emerald-500" :
                                      (pp.adherence || 0) >= 50 ? "text-amber-500" : "text-destructive"
                                    }`}>{pp.adherence}%</span>
                                    <p className="text-[10px] text-muted-foreground">adesão</p>
                                  </div>
                                  <button onClick={() => toggleProtocolStatus(pp)}
                                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                                    title={pp.status === "active" ? "Pausar" : "Reativar"}
                                  >
                                    {pp.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                  </button>
                                  <button onClick={() => removePatientProtocol(pp.id)}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                    title="Finalizar"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Task list */}
                    <div className="space-y-2">
                      <h3 className="font-display font-semibold text-sm flex items-center gap-2 px-1">
                        <ListChecks className="w-4 h-4 text-primary" /> Tarefas do Protocolo ({tasks.length})
                      </h3>
                      {tasks.length === 0 ? (
                        <div className="glass rounded-xl p-8 text-center">
                          <ListChecks className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Adicione tarefas ao protocolo</p>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {tasks.map((task) => (
                            <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }} className="glass rounded-xl p-4 flex items-center gap-3"
                            >
                              <span className="text-xl">{task.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{task.title}</p>
                                {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{task.category}</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {task.frequency === "daily" ? "Diária" : "Semanal"}
                                  </span>
                                </div>
                              </div>
                              <button onClick={() => deleteTask(task.id)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="glass rounded-xl p-12 text-center">
                    <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display font-semibold text-lg mb-1">Selecione um protocolo</h3>
                    <p className="text-muted-foreground text-sm">Clique em um protocolo para ver tarefas e aplicar a pacientes</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── ACTIVE PATIENTS TAB ── */}
          <TabsContent value="active" className="mt-4">
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass rounded-xl p-4 text-center">
                  <Play className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                  <p className="text-2xl font-bold">{patientProtocols.filter(p => p.status === "active").length}</p>
                  <p className="text-xs text-muted-foreground">Protocolos Ativos</p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                  <TrendingUp className="w-6 h-6 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">
                    {patientProtocols.filter(p => p.status === "active").length > 0
                      ? Math.round(
                          patientProtocols
                            .filter(p => p.status === "active")
                            .reduce((sum, p) => sum + (p.adherence || 0), 0) /
                          patientProtocols.filter(p => p.status === "active").length
                        )
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Adesão Média</p>
                </div>
                <div className="glass rounded-xl p-4 text-center">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                  <p className="text-2xl font-bold">{patientProtocols.filter(p => p.status === "completed").length}</p>
                  <p className="text-xs text-muted-foreground">Finalizados</p>
                </div>
              </div>

              {/* Patient protocol list */}
              {patientProtocols.length === 0 ? (
                <div className="glass rounded-xl p-12 text-center">
                  <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-display font-semibold text-lg mb-1">Nenhum protocolo ativo</h3>
                  <p className="text-muted-foreground text-sm">Aplique protocolos aos seus pacientes na aba Catálogo</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patientProtocols.map((pp) => {
                    const protocol = protocols.find(p => p.id === pp.protocol_id);
                    return (
                      <motion.div key={pp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-xl p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-display font-semibold text-sm">{pp.patient_name}</p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                pp.status === "active" ? "bg-emerald-500/10 text-emerald-500" :
                                pp.status === "paused" ? "bg-amber-500/10 text-amber-500" :
                                "bg-muted text-muted-foreground"
                              }`}>
                                {pp.status === "active" ? "Ativo" : pp.status === "paused" ? "Pausado" : "Finalizado"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {protocol?.title || "Protocolo"} · {new Date(pp.start_date).toLocaleDateString("pt-BR")}
                              {pp.end_date && ` → ${new Date(pp.end_date).toLocaleDateString("pt-BR")}`}
                            </p>
                            {pp.status === "active" && (
                              <div className="mt-2 flex items-center gap-3">
                                <Progress value={pp.adherence || 0} className="h-2 flex-1" />
                                <span className={`text-xs font-bold min-w-[3ch] ${
                                  (pp.adherence || 0) >= 80 ? "text-emerald-500" :
                                  (pp.adherence || 0) >= 50 ? "text-amber-500" : "text-destructive"
                                }`}>{pp.adherence}%</span>
                              </div>
                            )}
                          </div>
                          {pp.status !== "completed" && (
                            <div className="flex gap-1">
                              <button onClick={() => toggleProtocolStatus(pp)}
                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                              >
                                {pp.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </button>
                              <button onClick={() => removePatientProtocol(pp.id)}
                                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
