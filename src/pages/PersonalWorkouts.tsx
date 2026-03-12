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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Dumbbell, Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";

interface Exercise {
  id?: string;
  name: string;
  sets: number;
  reps: string;
  load_kg: number | null;
  rest_seconds: number;
  notes: string;
  sort_order: number;
}

interface Routine {
  id?: string;
  name: string;
  description: string;
  exercises: Exercise[];
  sort_order: number;
}

export default function PersonalWorkouts() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [studentId, setStudentId] = useState("");
  const [routines, setRoutines] = useState<Routine[]>([
    { name: "Treino A", description: "", exercises: [{ name: "", sets: 3, reps: "12", load_kg: null, rest_seconds: 60, notes: "", sort_order: 0 }], sort_order: 0 },
  ]);
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

  const addRoutine = () => {
    const letters = ["A", "B", "C", "D", "E", "F"];
    const idx = routines.length;
    setRoutines([...routines, {
      name: `Treino ${letters[idx] || idx + 1}`,
      description: "",
      exercises: [{ name: "", sets: 3, reps: "12", load_kg: null, rest_seconds: 60, notes: "", sort_order: 0 }],
      sort_order: idx,
    }]);
  };

  const addExercise = (rIdx: number) => {
    const updated = [...routines];
    updated[rIdx].exercises.push({ name: "", sets: 3, reps: "12", load_kg: null, rest_seconds: 60, notes: "", sort_order: updated[rIdx].exercises.length });
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

  const removeRoutine = (rIdx: number) => {
    setRoutines(routines.filter((_, i) => i !== rIdx));
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
      }).select().single();

      if (planErr || !plan) { toast.error("Erro ao criar plano"); setSaving(false); return; }

      for (const routine of routines) {
        const { data: r, error: rErr } = await supabase.from("workout_routines").insert({
          plan_id: plan.id,
          name: routine.name,
          description: routine.description,
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
          sort_order: i,
        }));

        if (exercises.length > 0) {
          await supabase.from("workout_exercises").insert(exercises);
        }
      }

      toast.success("Plano de treino criado!");
      setCreateOpen(false);
      setTitle(""); setDescription(""); setStudentId("");
      setRoutines([{ name: "Treino A", description: "", exercises: [{ name: "", sets: 3, reps: "12", load_kg: null, rest_seconds: 60, notes: "", sort_order: 0 }], sort_order: 0 }]);
      load();
    } catch { toast.error("Erro inesperado"); }
    setSaving(false);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Planos de Treino</h1>
            <p className="text-muted-foreground text-sm">{plans.length} planos criados</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Plano</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Plano de Treino</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Input placeholder="Nome do plano (ex: Hipertrofia 12 semanas)" value={title} onChange={e => setTitle(e.target.value)} />
                <Textarea placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
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

                {/* Routines */}
                <div className="space-y-4">
                  {routines.map((routine, rIdx) => (
                    <Card key={rIdx}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Input
                            className="text-lg font-bold border-none p-0 h-auto focus-visible:ring-0"
                            value={routine.name}
                            onChange={e => { const u = [...routines]; u[rIdx].name = e.target.value; setRoutines(u); }}
                          />
                          {routines.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removeRoutine(rIdx)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {routine.exercises.map((ex, eIdx) => (
                          <div key={eIdx} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-4">
                              <Input placeholder="Exercício" value={ex.name} onChange={e => updateExercise(rIdx, eIdx, "name", e.target.value)} />
                            </div>
                            <div className="col-span-1">
                              <Input type="number" placeholder="Séries" value={ex.sets} onChange={e => updateExercise(rIdx, eIdx, "sets", parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="col-span-2">
                              <Input placeholder="Reps" value={ex.reps} onChange={e => updateExercise(rIdx, eIdx, "reps", e.target.value)} />
                            </div>
                            <div className="col-span-2">
                              <Input type="number" placeholder="Carga (kg)" value={ex.load_kg ?? ""} onChange={e => updateExercise(rIdx, eIdx, "load_kg", e.target.value ? parseFloat(e.target.value) : null)} />
                            </div>
                            <div className="col-span-2">
                              <Input type="number" placeholder="Descanso (s)" value={ex.rest_seconds} onChange={e => updateExercise(rIdx, eIdx, "rest_seconds", parseInt(e.target.value) || 60)} />
                            </div>
                            <div className="col-span-1">
                              <Button variant="ghost" size="icon" onClick={() => removeExercise(rIdx, eIdx)} disabled={routine.exercises.length <= 1}>
                                <Trash2 className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addExercise(rIdx)} className="w-full">
                          <Plus className="w-3 h-3 mr-1" /> Exercício
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  <Button variant="outline" onClick={addRoutine} className="w-full">
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Rotina
                  </Button>
                </div>

                <Button onClick={savePlan} disabled={saving || !title.trim() || !studentId} className="w-full">
                  {saving ? "Salvando..." : "Criar Plano de Treino"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Plans list */}
        <div className="space-y-3">
          {plans.map(plan => (
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
                        {profiles[plan.student_id]?.full_name || "Aluno"} • {new Date(plan.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={plan.is_active ? "default" : "secondary"}>
                      {plan.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    {expandedPlan === plan.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {expandedPlan === plan.id && planDetails[plan.id] && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    {planDetails[plan.id].map((routine: any) => (
                      <div key={routine.id} className="space-y-2">
                        <h4 className="font-semibold text-sm text-primary">{routine.name}</h4>
                        <div className="space-y-1">
                          {(routine.workout_exercises || []).map((ex: any) => (
                            <div key={ex.id} className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg px-3 py-2">
                              <span className="font-medium flex-1">{ex.name}</span>
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
          ))}
          {plans.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum plano de treino criado ainda.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
