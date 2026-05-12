import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@v1/lib/auth";
import { supabase } from "@v1/integrations/supabase/client";
import DashboardLayout from "@v1/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@v1/components/ui/card";
import { Button } from "@v1/components/ui/button";
import { Input } from "@v1/components/ui/input";
import { Label } from "@v1/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@v1/components/ui/select";
import { Progress } from "@v1/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@v1/components/ui/dialog";
import { toast } from "sonner";
import { Target, Plus, TrendingUp, CheckCircle2, Loader2, Trophy } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const categories = [
  { value: "nutrition", label: "Nutrição", icon: "🥗" },
  { value: "hydration", label: "Hidratação", icon: "💧" },
  { value: "exercise", label: "Exercício", icon: "🏃" },
  { value: "sleep", label: "Sono", icon: "😴" },
  { value: "habit", label: "Hábito", icon: "✅" },
];

interface WeeklyGoal {
  id: string;
  nutritionist_id: string;
  patient_id: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  unit: string;
  category: string;
  icon: string;
  week_start: string;
  created_at: string;
  updated_at: string;
}

export default function WeeklyGoals() {
  const { user, isNutritionist } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [form, setForm] = useState({ title: "", description: "", target_value: "7", unit: "vezes", category: "nutrition", icon: "🎯" });

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const { data: patients = [] } = useQuery({
    queryKey: ["goal-patients", user?.id],
    queryFn: async () => {
      if (!user || !isNutritionist) return [];
      const { data: links } = await supabase.from("nutritionist_patients").select("patient_id").eq("nutritionist_id", user.id).eq("status", "active");
      if (!links?.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", links.map(l => l.patient_id));
      return profiles || [];
    },
    enabled: !!user && isNutritionist,
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["weekly-goals", user?.id, isNutritionist],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase.from("weekly_goals").select("*").gte("week_start", weekStartStr).order("created_at", { ascending: false });
      if (isNutritionist) {
        query = query.eq("nutritionist_id", user.id);
      } else {
        query = query.eq("patient_id", user.id);
      }
      const { data } = await query;
      return (data || []) as WeeklyGoal[];
    },
    enabled: !!user,
  });

  const createGoal = async () => {
    if (!user || !form.title || !selectedPatient) return;
    setSaving(true);
    const cat = categories.find(c => c.value === form.category);
    const { error } = await supabase.from("weekly_goals").insert({
      nutritionist_id: user.id,
      patient_id: selectedPatient,
      title: form.title,
      description: form.description || null,
      target_value: Number(form.target_value),
      unit: form.unit,
      category: form.category,
      icon: cat?.icon || "🎯",
      week_start: weekStartStr,
    });
    if (error) { toast.error("Erro ao criar meta"); }
    else { toast.success("Meta criada!"); setOpen(false); setForm({ title: "", description: "", target_value: "7", unit: "vezes", category: "nutrition", icon: "🎯" }); queryClient.invalidateQueries({ queryKey: ["weekly-goals"] }); }
    setSaving(false);
  };

  const incrementGoal = async (goalId: string, current: number) => {
    await supabase.from("weekly_goals").update({ current_value: current + 1, updated_at: new Date().toISOString() }).eq("id", goalId);
    queryClient.invalidateQueries({ queryKey: ["weekly-goals"] });
    toast.success("+1 progresso!");
  };

  const completedGoals = goals.filter((g) => g.current_value >= g.target_value).length;
  const overallProgress = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;

  return (
    <DashboardLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" /> Metas Semanais
            </h1>
            <p className="text-sm text-muted-foreground">Semana de {new Date(weekStartStr).toLocaleDateString("pt-BR")}</p>
          </div>
          {isNutritionist && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary shadow-glow gap-2"><Plus className="w-4 h-4" /> Nova Meta</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Criar Meta Semanal</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Paciente</Label>
                    <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{patients.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || "Sem nome"}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Título</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Beber 2L de água por dia" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Meta</Label><Input type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))} /></div>
                    <div><Label>Unidade</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createGoal} disabled={saving || !form.title || !selectedPatient} className="w-full gradient-primary">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar Meta"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </motion.div>

        {/* Overview */}
        <motion.div variants={item} className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold flex items-center gap-2"><Trophy className="w-5 h-5 text-accent" /> Progresso Geral</h2>
            <span className="text-sm font-medium text-primary">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3 mb-2" />
          <p className="text-xs text-muted-foreground">{completedGoals} de {goals.length} metas concluídas esta semana</p>
        </motion.div>

        {/* Goals Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : goals.length === 0 ? (
          <motion.div variants={item} className="glass rounded-xl p-10 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{isNutritionist ? "Crie metas para seus pacientes." : "Seu nutricionista ainda não definiu metas para esta semana."}</p>
          </motion.div>
        ) : (
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
              const done = goal.current_value >= goal.target_value;
              return (
                <Card key={goal.id} className={`glass border-border transition-all ${done ? "border-primary/30 bg-primary/5" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{goal.icon}</span>
                        <div>
                          <h3 className="font-medium text-sm">{goal.title}</h3>
                          {goal.description && <p className="text-xs text-muted-foreground">{goal.description}</p>}
                        </div>
                      </div>
                      {done && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                    </div>
                    <Progress value={pct} className="h-2 mb-2" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{goal.current_value}/{goal.target_value} {goal.unit}</span>
                      {!isNutritionist && !done && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => incrementGoal(goal.id, goal.current_value)}>
                          <TrendingUp className="w-3 h-3" /> +1
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
