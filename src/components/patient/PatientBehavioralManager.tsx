import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Archive, Pencil, ListChecks, MessageCircle, Sparkles, Shield } from "lucide-react";
import { DOMAIN_CONFIG } from "@/lib/clinicalFlags";

interface Task {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  priority: number;
  status: string;
  source_flag: string | null;
  generated_by: string;
  created_at: string;
}

interface Message {
  id: string;
  title: string;
  body: string;
  channel: string;
  priority: number;
  status: string;
  source_flag: string | null;
  generated_by: string;
  created_at: string;
}

interface Props {
  patientId: string;
}

export default function PatientBehavioralManager({ patientId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", frequency: "daily", priority: "5" });
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [tasksRes, msgsRes] = await Promise.all([
      supabase
        .from("patient_behavioral_tasks")
        .select("*")
        .eq("patient_id", patientId)
        .in("status", ["pending", "completed", "skipped"])
        .order("priority", { ascending: false }),
      supabase
        .from("patient_clinical_messages")
        .select("*")
        .eq("patient_id", patientId)
        .eq("status", "active")
        .order("priority", { ascending: false }),
    ]);
    setTasks((tasksRes.data as Task[]) || []);
    setMessages((msgsRes.data as Message[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [patientId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-behavioral-tasks", {
        body: { patient_id: patientId },
      });
      if (error) throw error;
      toast.success(`${data.tasks_generated} tarefas e ${data.messages_generated} mensagens geradas!`);
      fetchData();
    } catch (e: any) {
      toast.error("Erro ao gerar: " + (e.message || "Falha"));
    }
    setGenerating(false);
  };

  const archiveTask = async (id: string) => {
    await supabase.from("patient_behavioral_tasks").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id);
    setTasks(prev => prev.filter(t => t.id !== id));
    toast.success("Tarefa arquivada");
  };

  const archiveMessage = async (id: string) => {
    await supabase.from("patient_clinical_messages").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id);
    setMessages(prev => prev.filter(m => m.id !== id));
    toast.success("Mensagem arquivada");
  };

  const addManualTask = async () => {
    if (!newTask.title.trim()) return;
    const { error } = await supabase.from("patient_behavioral_tasks").insert({
      patient_id: patientId,
      title: newTask.title.trim(),
      description: newTask.description.trim() || null,
      frequency: newTask.frequency,
      priority: parseInt(newTask.priority),
      status: "pending",
      generated_by: "professional",
      due_date: new Date().toISOString().split("T")[0],
    });
    if (error) { toast.error("Erro ao criar tarefa"); return; }
    toast.success("Tarefa criada!");
    setAddTaskOpen(false);
    setNewTask({ title: "", description: "", frequency: "daily", priority: "5" });
    fetchData();
  };

  const flagIcon = (flag: string | null) => {
    if (!flag) return "📋";
    for (const [key, config] of Object.entries(DOMAIN_CONFIG)) {
      if (flag.includes(key.slice(0, 4))) return config.icon;
    }
    return "📋";
  };

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Checklist & Mensagens Inteligentes
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            {generating ? "Gerando..." : "Gerar Automático"}
          </Button>
          <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Tarefa Manual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Tarefa Comportamental</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Título da tarefa" value={newTask.title} onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))} />
                <Input placeholder="Descrição (opcional)" value={newTask.description} onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={newTask.frequency} onValueChange={v => setNewTask(prev => ({ ...prev, frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diária</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="as_needed">Sob demanda</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newTask.priority} onValueChange={v => setNewTask(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9">Alta</SelectItem>
                      <SelectItem value="5">Média</SelectItem>
                      <SelectItem value="2">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addManualTask} className="w-full">Criar Tarefa</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <ListChecks className="w-3.5 h-3.5" /> Tarefas ({tasks.length})
        </p>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3 rounded-xl bg-muted/30">Nenhuma tarefa ativa. Clique em "Gerar Automático".</p>
        ) : (
          tasks.map((task, idx) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
            >
              <span className="text-base shrink-0">{flagIcon(task.source_flag)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant={task.status === "completed" ? "default" : "outline"} className="text-[10px] py-0">
                    {task.status === "pending" ? "Pendente" : task.status === "completed" ? "Concluída" : "Pulada"}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] py-0">
                    {task.generated_by === "rule_engine" ? "✨ Auto" : "👤 Manual"}
                  </Badge>
                  {task.source_flag && (
                    <span className="text-[10px] text-muted-foreground">{task.source_flag}</span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => archiveTask(task.id)} title="Arquivar">
                <Archive className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          ))
        )}
      </div>

      {/* Messages */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" /> Mensagens Ativas ({messages.length})
        </p>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3 rounded-xl bg-muted/30">Nenhuma mensagem ativa.</p>
        ) : (
          messages.map((msg, idx) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="p-3 rounded-xl border border-border bg-card space-y-1"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{msg.title}</p>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => archiveMessage(msg.id)} title="Arquivar">
                  <Archive className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{msg.body}</p>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] py-0">{msg.channel}</Badge>
                {msg.source_flag && <span className="text-[10px] text-muted-foreground">{msg.source_flag}</span>}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
