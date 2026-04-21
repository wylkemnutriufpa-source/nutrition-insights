import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import confetti from "@/lib/confetti";
import PostWorkoutFeedback from "./PostWorkoutFeedback";
import {
  Dumbbell, CheckCircle2, Clock, Flame, AlertTriangle, Trophy,
  Play, Zap, Timer, ChevronRight, Video, Layers, X
} from "lucide-react";

const GROUP_BADGES: Record<string, { label: string; color: string; icon: string }> = {
  biset: { label: "BISET", color: "bg-blue-500/10 text-blue-400 border border-blue-500/30", icon: "⚡" },
  triset: { label: "TRISET", color: "bg-purple-500/10 text-purple-400 border border-purple-500/30", icon: "🔥" },
  circuit: { label: "CIRCUITO", color: "bg-amber-500/10 text-amber-400 border border-amber-500/30", icon: "🔄" },
};

export default function PatientWorkoutView() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedRoutine, setSelectedRoutine] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [lastCompletionId, setLastCompletionId] = useState<string | null>(null);
  const [lastRoutineIdForFeedback, setLastRoutineIdForFeedback] = useState<string | null>(null);
  const [lastPlanIdForFeedback, setLastPlanIdForFeedback] = useState<string | null>(null);

  // Workout execution state
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

  const [requiresMedicalReview, setRequiresMedicalReview] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [plansRes, historyRes, assessRes] = await Promise.all([
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
        supabase
          .from("trainer_assessments")
          .select("requires_medical_review")
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setPlans(plansRes.data || []);
      setHistory(historyRes.data || []);
      setRequiresMedicalReview(!!assessRes.data?.requires_medical_review);
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

      const logs = Object.entries(exerciseLogs).map(([exId, log]) => ({
        completion_id: completion.id,
        exercise_id: exId,
        load_kg: log.load_kg ? parseFloat(log.load_kg) : null,
        reps_done: log.reps_done,
        sets_done: log.sets_done ? parseInt(log.sets_done) : null,
      }));

      if (logs.length > 0) {
        await supabase.from("workout_exercise_logs").insert(logs);

        // Detect Personal Records (PRs)
        try {
          for (const log of logs) {
            if (!log.load_kg || log.load_kg <= 0) continue;
            const exercise = exercises.find((e: any) => e.id === log.exercise_id);
            if (!exercise) continue;

            // Check if this is a PR for this exercise
            const { data: previousLogs } = await supabase
              .from("workout_exercise_logs")
              .select("load_kg")
              .eq("exercise_id", log.exercise_id)
              .not("id", "in", `(${logs.map(() => completion.id).join(",")})`)
              .order("load_kg", { ascending: false })
              .limit(1);

            const previousBest = previousLogs?.[0]?.load_kg || 0;
            if (log.load_kg > previousBest) {
              await (supabase as any).from("workout_personal_records").insert({
                student_id: user.id,
                exercise_name: exercise.name,
                exercise_library_id: exercise.exercise_library_id || null,
                record_type: "load",
                value: log.load_kg,
                previous_value: previousBest || null,
                completion_id: completion.id,
              }).catch(() => {});
              toast.success(`🏆 Novo PR em ${exercise.name}: ${log.load_kg}kg!`);
            }
          }
        } catch {} // PR detection is non-blocking
      }

      // Submit pain feedback if any
      if (painReport) {
        await (supabase as any).from("training_feedback").insert({
          patient_id: user.id,
          completion_id: completion.id,
          feedback_type: "pain",
          pain_location: painReport,
          difficulty_rating: effort >= 8 ? 8 : 5,
          notes: `Dor/desconforto: ${painReport}`,
        }).catch(() => {});
      }

      setCompletionOpen(false);
      setShowReward(true);
      confetti();
      setTimeout(() => setShowReward(false), 3000);

      // Open feedback modal after a brief delay
      const activePlan = plans.find(p => p.workout_routines?.some((r: any) => r.id === selectedRoutine.id));
      setLastCompletionId(completion.id);
      setLastRoutineIdForFeedback(selectedRoutine.id);
      setLastPlanIdForFeedback(activePlan?.id || null);
      setTimeout(() => setFeedbackOpen(true), 3500);

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

  const weeklyCount = history.filter(h => (Date.now() - new Date(h.completed_at).getTime()) < 7 * 24 * 60 * 60 * 1000).length;

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

  // Group exercises by group_id for rendering
  const groupExercisesForRender = (exs: any[]) => {
    // If medical review is required, block all grouping (high intensity methods)
    if (requiresMedicalReview) {
      return exs.map(ex => ({ type: "single", exercises: [ex], groupId: null }));
    }

    const blocks: { type: string; exercises: any[]; groupId: string | null }[] = [];
    let currentGroupId: string | null = null;
    let currentBlock: any[] = [];

    exs.forEach((ex) => {
      const gid = ex.group_id || null;

      if (gid && gid === currentGroupId) {
        currentBlock.push(ex);
      } else {
        if (currentBlock.length > 0) {
          blocks.push({ type: currentBlock[0].group_type || "single", exercises: currentBlock, groupId: currentGroupId });
        }
        currentBlock = [ex];
        currentGroupId = gid;
      }
    });
    if (currentBlock.length > 0) {
      blocks.push({ type: currentBlock[0].group_type || "single", exercises: currentBlock, groupId: currentGroupId });
    }
    return blocks;
  };

  const getYouTubeEmbed = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  return (
    <div className="space-y-6">
      {/* Medical Review Warning */}
      {requiresMedicalReview && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-destructive">REVISÃO MÉDICA REQUERIDA</h4>
            <p className="text-xs text-destructive/80 mt-0.5 leading-relaxed">
              Sua avaliação física indicou alguns pontos que precisam de atenção. 
              Por segurança, métodos de alta intensidade (bisets, trisets e circuitos) foram bloqueados e você deve evitar exercícios de alta intensidade até que seu profissional faça a liberação.
            </p>
          </div>
        </div>
      )}

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
                const exList = (routine.workout_exercises || []).sort((a: any, b: any) => a.sort_order - b.sort_order);
                const hasGroups = exList.some((e: any) => e.group_type && e.group_type !== "single");

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
                              {exList.length} ex
                            </Badge>
                          </div>
                        </div>

                        {/* Exercise preview with group badges */}
                        <div className="space-y-1.5">
                          {exList.slice(0, 5).map((ex: any, i: number) => {
                            const groupInfo = ex.group_type && ex.group_type !== "single" ? GROUP_BADGES[ex.group_type] : null;
                            const isGroupStart = groupInfo && ex.group_order === 0;

                            return (
                              <div key={ex.id}>
                                {isGroupStart && groupInfo && (
                                  <Badge className={`text-[9px] py-0 px-1.5 mb-0.5 ${groupInfo.color}`}>
                                    {groupInfo.icon} {groupInfo.label}
                                  </Badge>
                                )}
                                <p className={`text-sm text-muted-foreground flex items-center gap-1 ${groupInfo ? "ml-3" : ""}`}>
                                  <ChevronRight className="w-3 h-3" /> {ex.name} — {ex.sets}x{ex.reps}
                                  {ex.video_url && <Video className="w-3 h-3 text-primary/50" />}
                                </p>
                              </div>
                            );
                          })}
                          {exList.length > 5 && (
                            <p className="text-xs text-muted-foreground">+{exList.length - 5} mais</p>
                          )}
                        </div>

                        {hasGroups && (
                          <div className="flex gap-1 mt-2">
                            <Layers className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">Contém métodos especiais</span>
                          </div>
                        )}

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
            {/* Exercise blocks with grouping */}
            {groupExercisesForRender(exercises).map((block) => {
              const groupInfo = block.type !== "single" ? GROUP_BADGES[block.type] : null;

              return (
                <div key={block.groupId || block.exercises[0]?.id} className={groupInfo ? "rounded-lg border border-border/50 overflow-hidden" : ""}>
                  {/* Group header */}
                  {groupInfo && (
                    <div className={`px-3 py-1.5 flex items-center gap-2 ${groupInfo.color}`}>
                      <Layers className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{groupInfo.icon} {groupInfo.label}</span>
                      <span className="text-[10px] opacity-70">({block.exercises.length} exercícios)</span>
                    </div>
                  )}

                  {block.exercises.map((ex: any) => {
                    const isCompleted = completedExIds.has(ex.id);
                    const restSeconds = ex.rest_seconds || 60;
                    return (
                      <motion.div
                        key={ex.id}
                        layout
                        initial={{ opacity: 0.8 }}
                        animate={{ 
                          opacity: isCompleted ? 0.6 : 1,
                          scale: isCompleted ? 0.98 : 1,
                        }}
                        transition={{ duration: 0.2 }}
                        className={`p-4 transition-all ${isCompleted ? "bg-primary/5 border-primary/20" : "bg-muted/30"} ${groupInfo ? "border-t border-border/30" : "rounded-xl border"}`}
                      >
                        {/* Exercise header with completion toggle */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleExerciseComplete(ex.id)}
                              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                                isCompleted 
                                  ? "bg-primary border-primary shadow-md shadow-primary/30" 
                                  : "border-muted-foreground/30 hover:border-primary/50"
                              }`}
                            >
                              {isCompleted && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                >
                                  <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                                </motion.div>
                              )}
                            </button>
                            <div>
                              <p className={`font-semibold text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                {ex.name}
                              </p>
                              {ex.muscle_group && ex.muscle_group !== "other" && ex.muscle_group !== "Outro" && (
                                <span className="text-[10px] text-muted-foreground">{ex.muscle_group}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {ex.video_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20"
                                onClick={(e) => { e.stopPropagation(); setVideoModal(ex.video_url); }}
                              >
                                <Video className="w-4 h-4 text-primary" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Prescription info badges */}
                        <div className="flex flex-wrap gap-1.5 mb-3 ml-10">
                          <Badge variant="outline" className="text-xs gap-1">
                            <Layers className="w-3 h-3" /> {ex.sets}x{ex.reps}
                          </Badge>
                          {ex.load_kg && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Dumbbell className="w-3 h-3" /> {ex.load_kg}kg
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs gap-1">
                            <Timer className="w-3 h-3" /> {restSeconds}s descanso
                          </Badge>
                          {ex.cadence && (
                            <Badge variant="outline" className="text-xs gap-1">
                              ⏱️ {ex.cadence}
                            </Badge>
                          )}
                          {ex.rpe && (
                            <Badge variant="outline" className="text-xs gap-1">
                              RPE {ex.rpe}
                            </Badge>
                          )}
                        </div>

                        {/* Method label */}
                        {ex.method_label && (
                          <div className="ml-10 mb-2">
                            <Badge variant="secondary" className="text-[10px]">{ex.method_label}</Badge>
                          </div>
                        )}

                        {/* Notes/Observations */}
                        {ex.notes && (
                          <div className="ml-10 mb-3 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50">
                            <p className="text-[11px] text-muted-foreground italic">
                              📝 {ex.notes}
                            </p>
                          </div>
                        )}

                        {/* Editable fields for the student */}
                        <div className="grid grid-cols-3 gap-2 ml-10">
                          <div>
                            <label className="text-[10px] text-muted-foreground font-medium">Séries</label>
                            <Input
                              type="number"
                              className="h-8 text-sm"
                              value={exerciseLogs[ex.id]?.sets_done || ""}
                              onChange={e => setExerciseLogs({ ...exerciseLogs, [ex.id]: { ...exerciseLogs[ex.id], sets_done: e.target.value } })}
                              placeholder={String(ex.sets)}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground font-medium">Repetições</label>
                            <Input
                              className="h-8 text-sm"
                              value={exerciseLogs[ex.id]?.reps_done || ""}
                              onChange={e => setExerciseLogs({ ...exerciseLogs, [ex.id]: { ...exerciseLogs[ex.id], reps_done: e.target.value } })}
                              placeholder={ex.reps}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground font-medium">Carga (kg)</label>
                            <Input
                              type="number"
                              className="h-8 text-sm"
                              value={exerciseLogs[ex.id]?.load_kg || ""}
                              onChange={e => setExerciseLogs({ ...exerciseLogs, [ex.id]: { ...exerciseLogs[ex.id], load_kg: e.target.value } })}
                              placeholder={ex.load_kg?.toString() || "0"}
                            />
                          </div>
                        </div>

                        {/* Completed feedback */}
                        {isCompleted && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="ml-10 mt-2"
                          >
                            <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                              ✅ Exercício concluído
                            </Badge>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
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
              {submitting ? "Registrando..." : progressPercent === 100 
                ? `🎉 Completar Treino — Todos concluídos!` 
                : `✅ Completar Treino (${completedExIds.size}/${exercises.length})`}
            </Button>
            {progressPercent === 100 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-xs text-primary font-medium"
              >
                Parabéns! Todos os exercícios foram marcados ✨
              </motion.p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <Dialog open={!!videoModal} onOpenChange={() => setVideoModal(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" /> Tutorial
            </DialogTitle>
          </DialogHeader>
          {videoModal && (
            <div className="aspect-video w-full">
              {getYouTubeEmbed(videoModal) ? (
                <iframe
                  src={getYouTubeEmbed(videoModal)!}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={videoModal} controls className="w-full h-full" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Post-Workout Feedback Modal */}
      {feedbackOpen && lastCompletionId && (
        <PostWorkoutFeedback
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          completionId={lastCompletionId}
          routineId={lastRoutineIdForFeedback || ""}
          planId={lastPlanIdForFeedback || ""}
          exercises={exercises}
        />
      )}
    </div>
  );
}
