import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { triggerConfetti } from "@/lib/confetti";
import {
  Dumbbell, CheckCircle2, Clock, Flame, AlertTriangle, Trophy,
  Play, Target, Zap, Timer, ChevronRight
} from "lucide-react";

export default function PatientWorkouts() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Workout execution state
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [completedExIds, setCompletedExIds] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedMin, setElapsedMin] = useState(0);

  // Completion form
  const [effort, setEffort] = useState(5);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [painReport, setPainReport] = useState("");
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, { load_kg: string; reps_done: string; sets_done: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [plansRes, historyRes] = await Promise.all([
        supabase
          .from("workout_plans")
          .select("*, workout_routines(*, workout_exercises(*))")
          .eq("student_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("workout_completions")
          .select("*, workout_routines(name)")
          .eq("student_id", user.id)
          .order("completed_at", { ascending: false })
          .limit(20),
      ]);
      setPlans(plansRes.data || []);
      setHistory(historyRes.data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  // Timer
  useEffect(() => {
    if (!startTime || !completionOpen) return;
    const interval = setInterval(() => {
      setElapsedMin(Math.floor((Date.now() - startTime.getTime()) / 60000));
    }, 10000);
    return () => clearInterval(interval);
  }, [startTime, completionOpen]);

  const startWorkout = (routine: any) => {
    setSelectedRoutine(routine);
    const sorted = (routine.workout_exercises || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
    setExercises(sorted);
    const logs: Record<string, any> = {};
    sorted.forEach((ex: any) => {
      logs[ex.id] = { load_kg: ex.load_kg?.toString() || "", reps_done: ex.reps, sets_done: ex.sets.toString() };
    });
    setExerciseLogs(logs);
    setEffort(5);
    setDuration("");
    setNotes("");
    setPainReport("");
    setCurrentExIdx(0);
    setCompletedExIds(new Set());
    setStartTime(new Date());
    setCompletionOpen(true);
  };

  const toggleExerciseComplete = (exId: string) => {
    setCompletedExIds(prev => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId);
      else next.add(exId);
      return next;
    });
  };

  const progressPercent = exercises.length > 0 ? Math.round((completedExIds.size / exercises.length) * 100) : 0;

  const submitCompletion = async () => {
    if (!user || !selectedRoutine) return;
    setSubmitting(true);
    try {
      const plan = plans.find(p => p.workout_routines?.some((r: any) => r.id === selectedRoutine.id));
      if (!plan) { toast.error("Plano não encontrado"); setSubmitting(false); return; }

      const actualDuration = duration ? parseInt(duration) : (startTime ? Math.max(1, Math.floor((Date.now() - startTime.getTime()) / 60000)) : null);

      const { data: completion, error } = await supabase.from("workout_completions").insert({
        student_id: user.id,
        routine_id: selectedRoutine.id,
        plan_id: plan.id,
        duration_minutes: actualDuration,
        perceived_effort: effort,
        notes,
        pain_report: painReport || null,
        discomfort_flag: !!painReport,
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

      setCompletionOpen(false);
      setShowReward(true);
      triggerConfetti();

      setTimeout(() => setShowReward(false), 3000);

      // Refresh
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

  // Weekly stats
  const weeklyCount = history.filter(h => {
    const d = new Date(h.completed_at);
    return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const streakDays = (() => {
    if (history.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const hasWorkout = history.some(h => {
        const d = new Date(h.completed_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === checkDate.getTime();
      });
      if (hasWorkout) streak++;
      else if (i > 0) break;
    }
    return streak;
  })();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="glass-premium rounded-2xl p-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-primary" /> Meus Treinos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Siga seu plano e registre seus treinos</p>
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Semana</p>
                  <p className="font-bold">{weeklyCount} treinos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Streak</p>
                  <p className="font-bold">{streakDays} dias</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reward animation */}
        <AnimatePresence>
          {showReward && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-background/90 backdrop-blur-md rounded-3xl p-10 text-center shadow-2xl border border-primary/30">
                <motion.div animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }} transition={{ duration: 0.6 }}>
                  <Trophy className="w-16 h-16 text-warning mx-auto mb-4" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-1">Treino Completo! 🔥</h2>
                <p className="text-primary font-semibold text-lg">+20 pontos</p>
                <p className="text-muted-foreground text-sm mt-2">Continue assim!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active plans */}
        {plans.map(plan => (
          <Card key={plan.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                {plan.title}
              </CardTitle>
              {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
              {plan.objective && plan.objective !== "general" && (
                <Badge variant="outline" className="w-fit mt-1">{plan.objective}</Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(plan.workout_routines || []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((routine: any) => {
                  const todayCompleted = history.some(h =>
                    h.routine_id === routine.id &&
                    new Date(h.completed_at).toDateString() === new Date().toDateString()
                  );
                  return (
                    <motion.div key={routine.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                      <Card
                        className={`cursor-pointer transition-all ${todayCompleted ? "border-primary/40 bg-primary/5" : "hover:border-primary/30"}`}
                        onClick={() => !todayCompleted && startWorkout(routine)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-lg">{routine.name}</h3>
                            <div className="flex items-center gap-1.5">
                              {routine.estimated_duration && (
                                <Badge variant="outline" className="text-xs"><Timer className="w-3 h-3 mr-1" />{routine.estimated_duration}min</Badge>
                              )}
                              <Badge variant={todayCompleted ? "default" : "outline"}>
                                {(routine.workout_exercises || []).length} ex
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {(routine.workout_exercises || []).sort((a: any, b: any) => a.sort_order - b.sort_order).slice(0, 4).map((ex: any) => (
                              <p key={ex.id} className="text-sm text-muted-foreground flex items-center gap-1">
                                <ChevronRight className="w-3 h-3" /> {ex.name} — {ex.sets}x{ex.reps}
                                {ex.muscle_group && ex.muscle_group !== "other" && ex.muscle_group !== "Outro" && (
                                  <span className="text-xs text-muted-foreground/60">({ex.muscle_group})</span>
                                )}
                              </p>
                            ))}
                            {(routine.workout_exercises || []).length > 4 && (
                              <p className="text-xs text-muted-foreground">+{(routine.workout_exercises || []).length - 4} mais</p>
                            )}
                          </div>
                          <Button size="sm" className="w-full mt-3" variant={todayCompleted ? "outline" : "default"} disabled={todayCompleted}>
                            {todayCompleted ? (
                              <><CheckCircle2 className="w-4 h-4 mr-1 text-primary" /> Concluído Hoje</>
                            ) : (
                              <><Play className="w-4 h-4 mr-1" /> Iniciar Treino</>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
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

        {/* Workout Execution Dialog */}
        <Dialog open={completionOpen} onOpenChange={setCompletionOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5" />
                {selectedRoutine?.name}
              </DialogTitle>
            </DialogHeader>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{completedExIds.size}/{exercises.length} exercícios</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" /> {elapsedMin}min
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>

            <div className="space-y-3 mt-2">
              {/* Exercise logs */}
              {exercises.map((ex: any, idx: number) => {
                const isCompleted = completedExIds.has(ex.id);
                return (
                  <motion.div
                    key={ex.id}
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: isCompleted ? 0.5 : 1 }}
                    className={`p-3 rounded-lg border transition-all ${isCompleted ? "bg-primary/5 border-primary/30" : "bg-muted/50 border-transparent"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleExerciseComplete(ex.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? "bg-primary border-primary" : "border-muted-foreground/30"}`}
                        >
                          {isCompleted && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                        </button>
                        <p className={`font-semibold text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}>{ex.name}</p>
                      </div>
                      {ex.muscle_group && ex.muscle_group !== "other" && ex.muscle_group !== "Outro" && (
                        <Badge variant="secondary" className="text-xs">{ex.muscle_group}</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Séries</label>
                        <Input
                          type="number"
                          className="h-8"
                          value={exerciseLogs[ex.id]?.sets_done || ""}
                          onChange={e => setExerciseLogs({ ...exerciseLogs, [ex.id]: { ...exerciseLogs[ex.id], sets_done: e.target.value } })}
                          placeholder={String(ex.sets)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Reps</label>
                        <Input
                          className="h-8"
                          value={exerciseLogs[ex.id]?.reps_done || ""}
                          onChange={e => setExerciseLogs({ ...exerciseLogs, [ex.id]: { ...exerciseLogs[ex.id], reps_done: e.target.value } })}
                          placeholder={ex.reps}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Carga (kg)</label>
                        <Input
                          type="number"
                          className="h-8"
                          value={exerciseLogs[ex.id]?.load_kg || ""}
                          onChange={e => setExerciseLogs({ ...exerciseLogs, [ex.id]: { ...exerciseLogs[ex.id], load_kg: e.target.value } })}
                          placeholder={ex.load_kg?.toString() || "0"}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Effort */}
              <div className="pt-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Flame className="w-4 h-4 text-warning" /> Esforço percebido: <span className="text-primary font-bold">{effort}/10</span>
                </label>
                <Slider value={[effort]} onValueChange={v => setEffort(v[0])} min={1} max={10} step={1} className="mt-2" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Duração (min)
                  </label>
                  <Input
                    type="number"
                    value={duration || (startTime ? Math.max(1, elapsedMin).toString() : "")}
                    onChange={e => setDuration(e.target.value)}
                    placeholder={startTime ? `~${elapsedMin}` : "45"}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" /> Dor/Desconforto
                  </label>
                  <Input value={painReport} onChange={e => setPainReport(e.target.value)} placeholder="Nenhum" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Como foi o treino?" rows={2} />
              </div>

              <Button onClick={submitCompletion} disabled={submitting} className="w-full" size="lg">
                {submitting ? "Registrando..." : `✅ Completar Treino (${completedExIds.size}/${exercises.length})`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
