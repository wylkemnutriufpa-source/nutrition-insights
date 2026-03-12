import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Dumbbell, Plus, Trash2, ChevronDown, ChevronUp, Copy, Search,
  Target, Calendar, Pause, Play, CheckCircle2
} from "lucide-react";

const OBJECTIVES = [
  { value: "hypertrophy", label: "Hipertrofia" },
  { value: "fat_loss", label: "Emagrecimento" },
  { value: "conditioning", label: "Condicionamento" },
  { value: "strength", label: "Força" },
  { value: "rehab", label: "Reabilitação" },
  { value: "general", label: "Geral" },
];

const MUSCLE_GROUPS = [
  "Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Pernas",
  "Quadríceps", "Posterior", "Glúteos", "Core", "Panturrilha", "Cardio", "Outro"
];

interface Exercise {
  id?: string;
  name: string;
  sets: number;
  reps: string;
  load_kg: number | null;
  rest_seconds: number;
  notes: string;
  muscle_group: string;
  media_url: string;
  sort_order: number;
}

interface Routine {
  id?: string;
  name: string;
  description: string;
  day_of_week: number | null;
  estimated_duration: number;
  exercises: Exercise[];
  sort_order: number;
}

const defaultExercise = (): Exercise => ({
  name: "", sets: 3, reps: "12", load_kg: null, rest_seconds: 60,
  notes: "", muscle_group: "Outro", media_url: "", sort_order: 0,
});

const defaultRoutine = (idx: number): Routine => {
  const labels = ["A", "B", "C", "D", "E", "F"];
  return {
    name: `Treino ${labels[idx] || idx + 1}`,
    description: "",
    day_of_week: null,
    estimated_duration: 60,
    exercises: [defaultExercise()],
    sort_order: idx,
  };
};

export default function PersonalWorkouts() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("general");
  const [studentId, setStudentId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [routines, setRoutines] = useState<Routine[]>([defaultRoutine(0)]);
  const [saving, setSaving] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [planDetails, setPlanDetails] = useState<Record<string, any>>({});

  const load = async () => {
    if (!user) return;
    const [plansRes, studentsRes] = await Promise.all([
      supabase.from("workout_plans").select("*").eq("personal_id", user.id).order("created_at", { ascending: false }),
      supabase.from("personal_trainer_students").select("*").eq("personal_id", user.id).eq("status", "active"),
    ]);
    setPlans(plansRes.data || []);
    setStudents(studentsRes.data || []);

    const ids = [...new Set([...(plansRes.data || []).map(p => p.student_id), ...(studentsRes.data || []).map(s => s.student_id)])];
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("*").in("user_id", ids);
      const map: Record<string, any> = {};
      profs?.forEach(p => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const addRoutine = () => setRoutines([...routines, defaultRoutine(routines.length)]);

  const duplicateRoutine = (rIdx: number) => {
    const source = routines[rIdx];
    const labels = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const newR: Routine = {
      ...JSON.parse(JSON.stringify(source)),
      name: `Treino ${labels[routines.length] || routines.length + 1} (cópia)`,
      sort_order: routines.length,
    };
    setRoutines([...routines, newR]);
  };

  const addExercise = (rIdx: number) => {
    const updated = [...routines];
    updated[rIdx].exercises.push({ ...defaultExercise(), sort_order: updated[rIdx].exercises.length });
    setRoutines(updated);
  };

  const updateExercise = (rIdx: number, eIdx: number, field: string, value: any) => {
    const updated = [...routines];
    (updated[rIdx].exercises[eIdx] as any)[field] = value;
    setRoutines(updated);
  };

  const removeExercise = (rIdx: number, eIdx: number) => {
    const updated = [...routines];
    updated[rIdx].exercises.splice(eIdx, 1);
    setRoutines(updated);
  };

  const removeRoutine = (rIdx: number) => setRoutines(routines.filter((_, i) => i !== rIdx));

  const moveExercise = (rIdx: number, eIdx: number, dir: -1 | 1) => {
    const updated = [...routines];
    const target = eIdx + dir;
    if (target < 0 || target >= updated[rIdx].exercises.length) return;
    [updated[rIdx].exercises[eIdx], updated[rIdx].exercises[target]] =
      [updated[rIdx].exercises[target], updated[rIdx].exercises[eIdx]];
    setRoutines(updated);
  };

  const savePlan = async () => {
    if (!title.trim() || !studentId || !user) return;
    setSaving(true);
    try {
      const { data: plan, error: planErr } = await supabase.from("workout_plans").insert({
        personal_id: user.id,
        student_id: studentId,
        title,
        description,
        objective,
        start_date: startDate || null,
        end_date: endDate || null,
        status: "active",
      }).select().single();

      if (planErr || !plan) { toast.error("Erro ao criar plano"); setSaving(false); return; }

      for (const routine of routines) {
        const { data: r, error: rErr } = await supabase.from("workout_routines").insert({
          plan_id: plan.id,
          name: routine.name,
          description: routine.description,
          day_of_week: routine.day_of_week,
          estimated_duration: routine.estimated_duration,
          sort_order: routine.sort_order,
        }).select().single();

        if (rErr || !r) continue;

        const exercises = routine.exercises.filter(e => e.name.trim()).map((e, i) => ({
          routine_id: r.id,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          load_kg: e.load_kg,
          rest_seconds: e.rest_seconds,
          notes: e.notes,
          muscle_group: e.muscle_group,
          media_url: e.media_url || null,
          sort_order: i,
        }));

        if (exercises.length > 0) {
          await supabase.from("workout_exercises").insert(exercises);
        }
      }

      toast.success("Plano de treino criado!");
      setCreateOpen(false);
      resetForm();
      load();
    } catch { toast.error("Erro inesperado"); }
    setSaving(false);
  };

  const resetForm = () => {
    setTitle(""); setDescription(""); setObjective("general");
    setStudentId(""); setStartDate(""); setEndDate("");
    setRoutines([defaultRoutine(0)]);
  };

  const togglePlanStatus = async (planId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await supabase.from("workout_plans").update({ status: newStatus, is_active: newStatus === "active" }).eq("id", planId);
    toast.success(newStatus === "active" ? "Plano ativado" : "Plano pausado");
    load();
  };

  const loadPlanDetails = async (planId: string) => {
    if (planDetails[planId]) {
      setExpandedPlan(expandedPlan === planId ? null : planId);
      return;
    }
    const { data: routinesData } = await supabase.from("workout_routines").select("*, workout_exercises(*)").eq("plan_id", planId).order("sort_order");
    setPlanDetails({ ...planDetails, [planId]: routinesData || [] });
    setExpandedPlan(planId);
  };

  const filteredPlans = plans.filter(p => {
    const matchSearch = !searchTerm || p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (profiles[p.student_id]?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Planos de Treino</h1>
            <p className="text-muted-foreground text-sm">{plans.length} planos criados</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Plano</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Plano de Treino</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input placeholder="Nome do plano (ex: Hipertrofia 12 semanas)" value={title} onChange={e => setTitle(e.target.value)} />
                  <Select value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
                    <SelectContent>
                      {students.map(s => (
                        <SelectItem key={s.student_id} value={s.student_id}>
                          {profiles[s.student_id]?.full_name || "Aluno"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Select value={objective} onValueChange={setObjective}>
                    <SelectTrigger><SelectValue placeholder="Objetivo" /></SelectTrigger>
                    <SelectContent>
                      {OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="Início" />
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="Fim" />
                </div>

                <Textarea placeholder="Descrição / observações (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />

                {/* Routines */}
                <div className="space-y-4">
                  {routines.map((routine, rIdx) => (
                    <Card key={rIdx} className="border-primary/20">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            className="text-lg font-bold border-none p-0 h-auto focus-visible:ring-0 flex-1"
                            value={routine.name}
                            onChange={e => { const u = [...routines]; u[rIdx].name = e.target.value; setRoutines(u); }}
                          />
                          <div className="flex items-center gap-1.5">
                            <Select value={routine.day_of_week?.toString() || "none"} onValueChange={v => { const u = [...routines]; u[rIdx].day_of_week = v === "none" ? null : parseInt(v); setRoutines(u); }}>
                              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue placeholder="Dia" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Livre</SelectItem>
                                {DAYS.map((d, i) => <SelectItem key={i} value={i.toString()}>{d}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              className="w-20 h-8 text-xs"
                              placeholder="min"
                              value={routine.estimated_duration}
                              onChange={e => { const u = [...routines]; u[rIdx].estimated_duration = parseInt(e.target.value) || 60; setRoutines(u); }}
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateRoutine(rIdx)} title="Duplicar rotina">
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            {routines.length > 1 && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRoutine(rIdx)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {routine.exercises.map((ex, eIdx) => (
                          <div key={eIdx} className="grid grid-cols-12 gap-1.5 items-center text-sm">
                            <div className="col-span-3">
                              <Input placeholder="Exercício" value={ex.name} onChange={e => updateExercise(rIdx, eIdx, "name", e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="col-span-2">
                              <Select value={ex.muscle_group} onValueChange={v => updateExercise(rIdx, eIdx, "muscle_group", v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {MUSCLE_GROUPS.map(mg => <SelectItem key={mg} value={mg}>{mg}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-1">
                              <Input type="number" placeholder="Sér" value={ex.sets} onChange={e => updateExercise(rIdx, eIdx, "sets", parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                            </div>
                            <div className="col-span-1">
                              <Input placeholder="Reps" value={ex.reps} onChange={e => updateExercise(rIdx, eIdx, "reps", e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="col-span-1">
                              <Input type="number" placeholder="kg" value={ex.load_kg ?? ""} onChange={e => updateExercise(rIdx, eIdx, "load_kg", e.target.value ? parseFloat(e.target.value) : null)} className="h-8 text-sm" />
                            </div>
                            <div className="col-span-1">
                              <Input type="number" placeholder="s" value={ex.rest_seconds} onChange={e => updateExercise(rIdx, eIdx, "rest_seconds", parseInt(e.target.value) || 60)} className="h-8 text-sm" />
                            </div>
                            <div className="col-span-3 flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveExercise(rIdx, eIdx, -1)} disabled={eIdx === 0}>
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveExercise(rIdx, eIdx, 1)} disabled={eIdx === routine.exercises.length - 1}>
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeExercise(rIdx, eIdx)} disabled={routine.exercises.length <= 1}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addExercise(rIdx)} className="w-full h-8">
                          <Plus className="w-3 h-3 mr-1" /> Exercício
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  <Button variant="outline" onClick={addRoutine} className="w-full">
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Rotina
                  </Button>
                </div>

                <Button onClick={savePlan} disabled={saving || !title.trim() || !studentId} className="w-full" size="lg">
                  {saving ? "Salvando..." : "✅ Criar Plano de Treino"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por aluno ou plano..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="paused">Pausados</SelectItem>
              <SelectItem value="draft">Rascunhos</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Plans list */}
        <div className="space-y-3">
          {filteredPlans.map(plan => {
            const objLabel = OBJECTIVES.find(o => o.value === plan.objective)?.label || plan.objective;
            const statusConfig: Record<string, { color: string; icon: any }> = {
              active: { color: "bg-primary/10 text-primary", icon: Play },
              paused: { color: "bg-warning/10 text-warning", icon: Pause },
              draft: { color: "bg-muted text-muted-foreground", icon: Target },
              completed: { color: "bg-accent/10 text-accent", icon: CheckCircle2 },
            };
            const sc = statusConfig[plan.status] || statusConfig.active;

            return (
              <Card key={plan.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => loadPlanDetails(plan.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{plan.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {profiles[plan.student_id]?.full_name || "Aluno"} • {objLabel}
                          {plan.start_date && ` • ${new Date(plan.start_date).toLocaleDateString("pt-BR")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={sc.color}>
                        {plan.status === "active" ? "Ativo" : plan.status === "paused" ? "Pausado" : plan.status === "completed" ? "Concluído" : "Rascunho"}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); togglePlanStatus(plan.id, plan.status); }}>
                        {plan.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      {expandedPlan === plan.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {expandedPlan === plan.id && planDetails[plan.id] && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      {planDetails[plan.id].map((routine: any) => (
                        <div key={routine.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-primary">{routine.name}</h4>
                            {routine.estimated_duration && <Badge variant="outline" className="text-xs">{routine.estimated_duration}min</Badge>}
                            {routine.day_of_week != null && <Badge variant="outline" className="text-xs">{DAYS[routine.day_of_week]}</Badge>}
                          </div>
                          <div className="space-y-1">
                            {(routine.workout_exercises || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((ex: any) => (
                              <div key={ex.id} className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg px-3 py-2">
                                <span className="font-medium flex-1">{ex.name}</span>
                                {ex.muscle_group && ex.muscle_group !== "other" && <Badge variant="secondary" className="text-xs">{ex.muscle_group}</Badge>}
                                <span className="text-muted-foreground">{ex.sets}x{ex.reps}</span>
                                {ex.load_kg && <span className="text-muted-foreground">{ex.load_kg}kg</span>}
                                <span className="text-muted-foreground">{ex.rest_seconds}s</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {filteredPlans.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{searchTerm || filterStatus !== "all" ? "Nenhum plano encontrado com esses filtros." : "Nenhum plano de treino criado ainda."}</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
