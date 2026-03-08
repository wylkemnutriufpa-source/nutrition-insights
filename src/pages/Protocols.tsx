import { useEffect, useState } from "react";
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
import { toast } from "sonner";
import {
  Plus, FileText, Trash2, GripVertical, Clock, ListChecks,
  ChevronRight, Sparkles, Users, Calendar, Play, Pause
} from "lucide-react";

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

const CATEGORIES = [
  { value: "nutrition", label: "🥗 Nutrição" },
  { value: "fitness", label: "💪 Fitness" },
  { value: "wellness", label: "🧘 Bem-estar" },
  { value: "sleep", label: "😴 Sono" },
  { value: "hydration", label: "💧 Hidratação" },
  { value: "mindset", label: "🧠 Mindset" },
];

const TASK_ICONS = ["✅", "💧", "🏃", "🥗", "💊", "😴", "🧘", "📝", "⏰", "🍎"];

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

  const fetchProtocols = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("protocols")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      // Get task counts
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
  };

  const fetchTasks = async (protocolId: string) => {
    const { data } = await supabase
      .from("protocol_tasks")
      .select("*")
      .eq("protocol_id", protocolId)
      .order("sort_order");
    setTasks(data || []);
  };

  useEffect(() => { fetchProtocols(); }, [user]);

  useEffect(() => {
    if (selectedProtocol) fetchTasks(selectedProtocol.id);
  }, [selectedProtocol]);

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
    if (selectedProtocol?.id === protocolId) {
      setSelectedProtocol(null);
      setTasks([]);
    }
    fetchProtocols();
    toast.success("Protocolo removido");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <FileText className="w-7 h-7 text-primary" /> Protocolos
            </h1>
            <p className="text-muted-foreground text-sm">{protocols.length} protocolos criados</p>
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
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Protocolo Detox 21 dias" required />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o objetivo do protocolo..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
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
                        <span className="flex items-center gap-1">
                          <ListChecks className="w-3 h-3" /> {p.task_count} tarefas
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {p.duration_days}d
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteProtocol(p.id); }}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
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
                <div className="glass rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="font-display text-lg font-bold">{selectedProtocol.title}</h2>
                      {selectedProtocol.description && (
                        <p className="text-sm text-muted-foreground mt-1">{selectedProtocol.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{CATEGORIES.find(c => c.value === selectedProtocol.category)?.label}</span>
                        <span>{selectedProtocol.duration_days} dias</span>
                      </div>
                    </div>
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
                                <button
                                  key={icon}
                                  type="button"
                                  onClick={() => setTaskForm({ ...taskForm, icon })}
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border-2 transition-all ${
                                    taskForm.icon === icon ? "border-primary bg-primary/10" : "border-border"
                                  }`}
                                >
                                  {icon}
                                </button>
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

                {/* Task list */}
                <div className="space-y-2">
                  {tasks.length === 0 ? (
                    <div className="glass rounded-xl p-8 text-center">
                      <ListChecks className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Adicione tarefas ao protocolo</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {tasks.map((task, i) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="glass rounded-xl p-4 flex items-center gap-3"
                        >
                          <span className="text-xl">{task.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{task.category}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{task.frequency === "daily" ? "Diária" : "Semanal"}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteTask(task.id)}
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
                <p className="text-muted-foreground text-sm">Clique em um protocolo para ver e editar suas tarefas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
