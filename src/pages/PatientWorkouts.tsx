import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Dumbbell, CheckCircle2, Clock, Flame, AlertTriangle, Trophy } from "lucide-react";

export default function PatientWorkouts() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Completion form
  const [effort, setEffort] = useState(5);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [painReport, setPainReport] = useState("");
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, { load_kg: string; reps_done: string; sets_done: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: plansData } = await supabase
        .from("workout_plans")
        .select("*, workout_routines(*, workout_exercises(*))")
        .eq("student_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setPlans(plansData || []);

      const { data: historyData } = await supabase
        .from("workout_completions")
        .select("*, workout_routines(name)")
        .eq("student_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(20);
      setHistory(historyData || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const startWorkout = (routine: any) => {
    setSelectedRoutine(routine);
    setExercises(routine.workout_exercises || []);
    const logs: Record<string, any> = {};
    (routine.workout_exercises || []).forEach((ex: any) => {
      logs[ex.id] = { load_kg: ex.load_kg?.toString() || "", reps_done: ex.reps, sets_done: ex.sets.toString() };
    });
    setExerciseLogs(logs);
    setEffort(5);
    setDuration("");
    setNotes("");
    setPainReport("");
    setCompletionOpen(true);
  };

  const submitCompletion = async () => {
    if (!user || !selectedRoutine) return;
    setSubmitting(true);
    try {
      const plan = plans.find(p => p.workout_routines?.some((r: any) => r.id === selectedRoutine.id));
      if (!plan) { toast.error("Plano não encontrado"); return; }

      const { data: completion, error } = await supabase.from("workout_completions").insert({
        student_id: user.id,
        routine_id: selectedRoutine.id,
        plan_id: plan.id,
        duration_minutes: duration ? parseInt(duration) : null,
        perceived_effort: effort,
        notes,
        pain_report: painReport || null,
      }).select().single();

      if (error || !completion) { toast.error("Erro ao registrar treino"); setSubmitting(false); return; }

      // Log exercises
      const logs = Object.entries(exerciseLogs).map(([exId, log]) => ({
        completion_id: completion.id,
        exercise_id: exId,
        load_kg: log.load_kg ? parseFloat(log.load_kg) : null,
        reps_done: log.reps_done,
        sets_done: log.sets_done ? parseInt(log.sets_done) : null,
      }));

      if (logs.length > 0) {
        await supabase.from("workout_exercise_logs").insert(logs);
      }

      toast.success("🏋️ Treino registrado! +20 pontos");
      setCompletionOpen(false);
      // Refresh history
      const { data: historyData } = await supabase
        .from("workout_completions")
        .select("*, workout_routines(name)")
        .eq("student_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(20);
      setHistory(historyData || []);
    } catch { toast.error("Erro inesperado"); }
    setSubmitting(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Meus Treinos</h1>
          <p className="text-muted-foreground text-sm">Siga seu plano e registre seus treinos</p>
        </div>

        {/* Active plans */}
        {plans.map(plan => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                {plan.title}
              </CardTitle>
              {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(plan.workout_routines || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((routine: any) => (
                  <Card key={routine.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => startWorkout(routine)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg">{routine.name}</h3>
                        <Badge variant="outline">{(routine.workout_exercises || []).length} exercícios</Badge>
                      </div>
                      <div className="space-y-1.5">
                        {(routine.workout_exercises || []).slice(0, 4).map((ex: any) => (
                          <p key={ex.id} className="text-sm text-muted-foreground">
                            • {ex.name} — {ex.sets}x{ex.reps}
                          </p>
                        ))}
                        {(routine.workout_exercises || []).length > 4 && (
                          <p className="text-xs text-muted-foreground">+{(routine.workout_exercises || []).length - 4} mais</p>
                        )}
                      </div>
                      <Button size="sm" className="w-full mt-3">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Iniciar Treino
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {plans.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum plano de treino atribuído. Converse com seu personal!</p>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-warning" />
                Histórico de Treinos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{h.workout_routines?.name || "Treino"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.completed_at).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
                        {h.duration_minutes && ` • ${h.duration_minutes}min`}
                      </p>
                    </div>
                    {h.perceived_effort && (
                      <Badge variant={h.perceived_effort >= 8 ? "destructive" : "default"}>
                        <Flame className="w-3 h-3 mr-1" /> {h.perceived_effort}/10
                      </Badge>
                    )}
                    {h.pain_report && <AlertTriangle className="w-4 h-4 text-warning" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Dialog */}
        <Dialog open={completionOpen} onOpenChange={setCompletionOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5" />
                {selectedRoutine?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Exercise logs */}
              <div className="space-y-3">
                {exercises.sort((a: any, b: any) => a.sort_order - b.sort_order).map((ex: any) => (
                  <div key={ex.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <p className="font-semibold text-sm">{ex.name}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Séries</label>
                        <Input
                          type="number"
                          value={exerciseLogs[ex.id]?.sets_done || ""}
                          onChange={e => setExerciseLogs({ ...exerciseLogs, [ex.id]: { ...exerciseLogs[ex.id], sets_done: e.target.value } })}
                          placeholder={String(ex.sets)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Reps</label>
                        <Input
                          value={exerciseLogs[ex.id]?.reps_done || ""}
                          onChange={e => setExerciseLogs({ ...exerciseLogs, [ex.id]: { ...exerciseLogs[ex.id], reps_done: e.target.value } })}
                          placeholder={ex.reps}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Carga (kg)</label>
                        <Input
                          type="number"
                          value={exerciseLogs[ex.id]?.load_kg || ""}
                          onChange={e => setExerciseLogs({ ...exerciseLogs, [ex.id]: { ...exerciseLogs[ex.id], load_kg: e.target.value } })}
                          placeholder={ex.load_kg?.toString() || "0"}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Effort */}
              <div>
                <label className="text-sm font-medium">Esforço percebido: {effort}/10</label>
                <Slider value={[effort]} onValueChange={v => setEffort(v[0])} min={1} max={10} step={1} className="mt-2" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Duração (min)</label>
                  <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="45" />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-warning" /> Dor/Desconforto
                  </label>
                  <Input value={painReport} onChange={e => setPainReport(e.target.value)} placeholder="Nenhum" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Como foi o treino?" rows={2} />
              </div>

              <Button onClick={submitCompletion} disabled={submitting} className="w-full" size="lg">
                {submitting ? "Registrando..." : "✅ Registrar Treino Completo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
