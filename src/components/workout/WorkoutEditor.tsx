import { useState, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { getTenantIdForInsert } from "@/lib/tenantQueryHelpers";
import { toast } from "sonner";
import ExerciseLibrary from "./ExerciseLibrary";
import ExerciseVideoLibrary from "./ExerciseVideoLibrary";
import {
  Plus, Trash2, Copy, GripVertical, ChevronDown, ChevronUp,
  BookOpen, Save, Zap, Layers, Play, Dumbbell, Link2, Unlink, Film
} from "lucide-react";

const MUSCLE_GROUPS = [
  "Peito", "Costas", "Ombros", "Bíceps", "Tríceps", "Pernas",
  "Quadríceps", "Posterior", "Glúteos", "Core", "Panturrilha", "Cardio", "Outro"
];

const GROUP_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  single: { label: "", color: "", icon: "" },
  biset: { label: "BISET", color: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: "⚡" },
  triset: { label: "TRISET", color: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: "🔥" },
  circuit: { label: "CIRCUITO", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: "🔄" },
};

interface EditorExercise {
  tempId: string;
  name: string;
  muscle_group: string;
  sets: number;
  reps: string;
  load_kg: number | null;
  rest_seconds: number;
  notes: string;
  video_url: string;
  rpe: number | null;
  cadence: string;
  method_label: string;
  group_id: string | null;
  group_type: string;
  group_order: number;
  exercise_library_id: string | null;
  sort_order: number;
}

interface EditorRoutine {
  tempId: string;
  name: string;
  description: string;
  day_of_week: number | null;
  estimated_duration: number;
  exercises: EditorExercise[];
  collapsed: boolean;
}

interface WorkoutEditorProps {
  students: { student_id: string; full_name: string }[];
  onSaved: () => void;
  onCancel: () => void;
  initialData?: any;
}

let tempCounter = 0;
const genTempId = () => `temp-${++tempCounter}-${Date.now()}`;

const newExercise = (sortOrder = 0): EditorExercise => ({
  tempId: genTempId(),
  name: "", muscle_group: "Outro", sets: 3, reps: "12",
  load_kg: null, rest_seconds: 60, notes: "", video_url: "",
  rpe: null, cadence: "", method_label: "",
  group_id: null, group_type: "single", group_order: 0,
  exercise_library_id: null, sort_order: sortOrder,
});

const LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const newRoutine = (idx: number): EditorRoutine => ({
  tempId: genTempId(),
  name: `Treino ${LABELS[idx] || idx + 1}`,
  description: "",
  day_of_week: null,
  estimated_duration: 60,
  exercises: [newExercise()],
  collapsed: false,
});

const OBJECTIVES = [
  { value: "hypertrophy", label: "Hipertrofia" },
  { value: "fat_loss", label: "Emagrecimento" },
  { value: "conditioning", label: "Condicionamento" },
  { value: "strength", label: "Força" },
  { value: "rehab", label: "Reabilitação" },
  { value: "mobility", label: "Mobilidade" },
  { value: "general", label: "Geral" },
];

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function WorkoutEditor({ students, onSaved, onCancel }: WorkoutEditorProps) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("general");
  const [studentId, setStudentId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [routines, setRoutines] = useState<EditorRoutine[]>([newRoutine(0)]);
  const [saving, setSaving] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState<{ rIdx: number; eIdx: number } | null>(null);
  const [videoLibOpen, setVideoLibOpen] = useState(false);
  const [videoTarget, setVideoTarget] = useState<{ rIdx: number; eIdx: number } | null>(null);

  // ── Routine Management ──
  const addRoutine = () => setRoutines([...routines, newRoutine(routines.length)]);

  const duplicateRoutine = (rIdx: number) => {
    const source = routines[rIdx];
    const clone: EditorRoutine = {
      ...JSON.parse(JSON.stringify(source)),
      tempId: genTempId(),
      name: `${source.name} (cópia)`,
      exercises: source.exercises.map((e) => ({ ...JSON.parse(JSON.stringify(e)), tempId: genTempId() })),
    };
    setRoutines([...routines, clone]);
  };

  const removeRoutine = (rIdx: number) => {
    if (routines.length <= 1) return;
    setRoutines(routines.filter((_, i) => i !== rIdx));
  };

  const toggleCollapse = (rIdx: number) => {
    const u = [...routines];
    u[rIdx].collapsed = !u[rIdx].collapsed;
    setRoutines(u);
  };

  // ── Exercise Management ──
  const addExercise = (rIdx: number) => {
    const u = [...routines];
    u[rIdx].exercises.push(newExercise(u[rIdx].exercises.length));
    setRoutines(u);
  };

  const updateExercise = (rIdx: number, eIdx: number, field: string, value: any) => {
    const u = [...routines];
    (u[rIdx].exercises[eIdx] as any)[field] = value;
    setRoutines(u);
  };

  const removeExercise = (rIdx: number, eIdx: number) => {
    const u = [...routines];
    if (u[rIdx].exercises.length <= 1) return;
    u[rIdx].exercises.splice(eIdx, 1);
    setRoutines(u);
  };

  const moveExercise = (rIdx: number, eIdx: number, dir: -1 | 1) => {
    const u = [...routines];
    const target = eIdx + dir;
    if (target < 0 || target >= u[rIdx].exercises.length) return;
    [u[rIdx].exercises[eIdx], u[rIdx].exercises[target]] =
      [u[rIdx].exercises[target], u[rIdx].exercises[eIdx]];
    setRoutines(u);
  };

  // ── Grouping (biset/triset/circuit) ──
  const groupExercises = (rIdx: number, startIdx: number, endIdx: number) => {
    const u = [...routines];
    const count = endIdx - startIdx + 1;
    const groupId = genTempId();
    const groupType = count === 2 ? "biset" : count === 3 ? "triset" : "circuit";

    for (let i = startIdx; i <= endIdx; i++) {
      u[rIdx].exercises[i].group_id = groupId;
      u[rIdx].exercises[i].group_type = groupType;
      u[rIdx].exercises[i].group_order = i - startIdx;
    }
    setRoutines(u);
  };

  const ungroupExercise = (rIdx: number, eIdx: number) => {
    const u = [...routines];
    const groupId = u[rIdx].exercises[eIdx].group_id;
    if (!groupId) return;
    u[rIdx].exercises.forEach((ex) => {
      if (ex.group_id === groupId) {
        ex.group_id = null;
        ex.group_type = "single";
        ex.group_order = 0;
      }
    });
    setRoutines(u);
  };

  const linkToNext = (rIdx: number, eIdx: number) => {
    const u = [...routines];
    const current = u[rIdx].exercises[eIdx];
    const next = u[rIdx].exercises[eIdx + 1];
    if (!next) return;

    if (current.group_id && current.group_id === next.group_id) {
      // Already grouped
      return;
    }

    if (current.group_id) {
      // Add next to existing group
      const members = u[rIdx].exercises.filter((e) => e.group_id === current.group_id);
      next.group_id = current.group_id;
      next.group_order = members.length;
      const count = members.length + 1;
      const groupType = count === 2 ? "biset" : count === 3 ? "triset" : "circuit";
      u[rIdx].exercises.filter((e) => e.group_id === current.group_id).forEach((e) => {
        e.group_type = groupType;
      });
    } else {
      // New group
      const groupId = genTempId();
      current.group_id = groupId;
      current.group_type = "biset";
      current.group_order = 0;
      next.group_id = groupId;
      next.group_type = "biset";
      next.group_order = 1;
    }
    setRoutines(u);
  };

  // ── Library Selection ──
  const openLibrary = (rIdx: number, eIdx: number) => {
    setLibraryTarget({ rIdx, eIdx });
    setLibraryOpen(true);
  };

  const selectFromLibrary = (exercise: any) => {
    if (!libraryTarget) return;
    const { rIdx, eIdx } = libraryTarget;
    const u = [...routines];
    u[rIdx].exercises[eIdx] = {
      ...u[rIdx].exercises[eIdx],
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      video_url: exercise.video_url || "",
      exercise_library_id: exercise.id,
    };
    setRoutines(u);
    setLibraryOpen(false);
    setLibraryTarget(null);
  };

  // ── Save ──
  const savePlan = async () => {
    if (!title.trim() || !studentId || !user) {
      toast.error("Preencha nome e aluno");
      return;
    }
    setSaving(true);

    try {
      const { data: plan, error: planErr } = await supabase.from("workout_plans").insert({
        personal_id: user.id,
        student_id: studentId,
        title,
        description,
        objective,
        start_date: startDate || new Date().toISOString().split("T")[0],
        end_date: endDate || null,
        status: "active",
        ...getTenantIdForInsert(tenantId),
      }).select().single();

      if (planErr || !plan) throw planErr || new Error("Erro ao criar plano");

      for (const routine of routines) {
        const { data: r, error: rErr } = await supabase.from("workout_routines").insert({
          plan_id: plan.id,
          name: routine.name,
          description: routine.description,
          day_of_week: routine.day_of_week,
          estimated_duration: routine.estimated_duration,
          sort_order: routines.indexOf(routine),
        }).select().single();

        if (rErr || !r) continue;

        const exercisesToInsert = routine.exercises.filter((e) => e.name.trim()).map((e, i) => ({
          routine_id: r.id,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          load_kg: e.load_kg,
          rest_seconds: e.rest_seconds,
          notes: e.notes || null,
          muscle_group: e.muscle_group,
          video_url: e.video_url || null,
          sort_order: i,
          group_id: e.group_id,
          group_type: e.group_type,
          group_order: e.group_order,
          exercise_library_id: e.exercise_library_id,
          rpe: e.rpe,
          cadence: e.cadence || null,
          method_label: e.method_label || null,
        }));

        if (exercisesToInsert.length > 0) {
          await supabase.from("workout_exercises").insert(exercisesToInsert);
        }
      }

      toast.success("Plano de treino criado! 🎯");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar");
    }
    setSaving(false);
  };

  // ── Render ──
  const getGroupMembers = (routine: EditorRoutine, groupId: string | null) => {
    if (!groupId) return [];
    return routine.exercises.filter((e) => e.group_id === groupId);
  };

  const renderedGroups = new Set<string>();

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <Card className="border-primary/20 bg-card">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              placeholder="Nome do plano (ex: Hipertrofia 12 semanas)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-semibold"
            />
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.student_id} value={s.student_id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={objective} onValueChange={setObjective}>
              <SelectTrigger><SelectValue placeholder="Objetivo" /></SelectTrigger>
              <SelectContent>
                {OBJECTIVES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="Início" />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="Fim" />
            <Textarea placeholder="Observações" value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 min-h-0 resize-none" />
          </div>
        </CardContent>
      </Card>

      {/* Routines */}
      {routines.map((routine, rIdx) => (
        <Card key={routine.tempId} className="border-primary/10 overflow-hidden">
          {/* Routine Header */}
          <CardHeader className="pb-2 bg-muted/30 cursor-pointer" onClick={() => toggleCollapse(rIdx)}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Badge className="bg-primary text-primary-foreground font-bold">{LABELS[rIdx] || rIdx + 1}</Badge>
                <Input
                  className="text-base font-bold border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
                  value={routine.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { const u = [...routines]; u[rIdx].name = e.target.value; setRoutines(u); }}
                />
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={routine.day_of_week?.toString() || "none"}
                  onValueChange={(v) => { const u = [...routines]; u[rIdx].day_of_week = v === "none" ? null : parseInt(v); setRoutines(u); }}
                >
                  <SelectTrigger className="w-20 h-7 text-[10px]"><SelectValue placeholder="Dia" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Livre</SelectItem>
                    {DAYS.map((d, i) => <SelectItem key={i} value={i.toString()}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateRoutine(rIdx)}>
                  <Copy className="w-3 h-3" />
                </Button>
                {routines.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRoutine(rIdx)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                )}
                {routine.collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </div>
            </div>
          </CardHeader>

          <AnimatePresence>
            {!routine.collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="p-3 space-y-1.5">
                  {/* Column Headers */}
                  <div className="grid grid-cols-12 gap-1 px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-1"></div>
                    <div className="col-span-3">Exercício</div>
                    <div className="col-span-1">Grupo</div>
                    <div className="col-span-1 text-center">Sér</div>
                    <div className="col-span-1 text-center">Reps</div>
                    <div className="col-span-1 text-center">Carga</div>
                    <div className="col-span-1 text-center">Desc</div>
                    <div className="col-span-3"></div>
                  </div>

                  {routine.exercises.map((ex, eIdx) => {
                    const isGrouped = !!ex.group_id && ex.group_type !== "single";
                    const isGroupStart = isGrouped && ex.group_order === 0;
                    const groupMembers = isGrouped ? getGroupMembers(routine, ex.group_id) : [];
                    const isGroupEnd = isGrouped && eIdx < routine.exercises.length - 1 &&
                      routine.exercises[eIdx + 1]?.group_id !== ex.group_id;
                    const groupConfig = GROUP_LABELS[ex.group_type] || GROUP_LABELS.single;

                    return (
                      <motion.div
                        key={ex.tempId}
                        layout
                        className={`relative rounded-lg transition-all ${
                          isGrouped
                            ? `border-l-2 ${ex.group_type === "biset" ? "border-l-blue-500" : ex.group_type === "triset" ? "border-l-purple-500" : "border-l-amber-500"} ml-2`
                            : ""
                        }`}
                      >
                        {/* Group badge */}
                        {isGroupStart && groupConfig.label && (
                          <div className="flex items-center gap-1.5 pl-3 pt-1 pb-0.5">
                            <Badge className={`text-[10px] py-0 px-1.5 ${groupConfig.color}`}>
                              {groupConfig.icon} {groupConfig.label}
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => ungroupExercise(rIdx, eIdx)}>
                              <Unlink className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </div>
                        )}

                        <div
                          className="grid grid-cols-12 gap-1 items-center py-1 px-1 hover:bg-muted/30 rounded-md group"
                          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-primary/40", "bg-primary/5"); }}
                          onDragLeave={(e) => { e.currentTarget.classList.remove("ring-2", "ring-primary/40", "bg-primary/5"); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove("ring-2", "ring-primary/40", "bg-primary/5");
                            const videoData = e.dataTransfer.getData("application/exercise-video");
                            if (videoData) {
                              try {
                                const video = JSON.parse(videoData);
                                const u = [...routines];
                                const ex = u[rIdx].exercises[eIdx];
                                if (!ex.name.trim()) ex.name = video.title;
                                ex.video_url = video.video_url;
                                ex.muscle_group = video.muscle_group;
                                setRoutines(u);
                                toast.success(`Vídeo "${video.title}" vinculado ao exercício!`);
                              } catch {}
                            }
                          }}
                        >
                          {/* Drag handle */}
                          <div className="col-span-1 flex items-center gap-0.5">
                            <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
                            <span className="text-[10px] text-muted-foreground font-mono w-4 text-center">{eIdx + 1}</span>
                          </div>

                          {/* Name */}
                          <div className="col-span-3 flex gap-1">
                            <Input
                              placeholder="Exercício"
                              value={ex.name}
                              onChange={(e) => updateExercise(rIdx, eIdx, "name", e.target.value)}
                              className="h-8 text-xs font-medium"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => openLibrary(rIdx, eIdx)}
                              title="Buscar na biblioteca"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-primary" />
                            </Button>
                          </div>

                          {/* Muscle Group */}
                          <div className="col-span-1">
                            <Select value={ex.muscle_group} onValueChange={(v) => updateExercise(rIdx, eIdx, "muscle_group", v)}>
                              <SelectTrigger className="h-8 text-[10px] px-1.5"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {MUSCLE_GROUPS.map((mg) => <SelectItem key={mg} value={mg}>{mg}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Sets */}
                          <div className="col-span-1">
                            <Input type="number" min={1} value={ex.sets || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateExercise(rIdx, eIdx, "sets", val === "" ? "" : Math.max(1, parseInt(val) || 1));
                              }}
                              onBlur={() => {
                                if (!ex.sets || ex.sets < 1) updateExercise(rIdx, eIdx, "sets", 3);
                              }}
                              className="h-8 text-xs text-center" />
                          </div>

                          {/* Reps */}
                          <div className="col-span-1">
                            <Input placeholder="12" value={ex.reps}
                              onChange={(e) => updateExercise(rIdx, eIdx, "reps", e.target.value)}
                              className="h-8 text-xs text-center" />
                          </div>

                          {/* Load */}
                          <div className="col-span-1">
                            <Input type="number" placeholder="kg" value={ex.load_kg ?? ""}
                              onChange={(e) => updateExercise(rIdx, eIdx, "load_kg", e.target.value ? parseFloat(e.target.value) : null)}
                              className="h-8 text-xs text-center" />
                          </div>

                          {/* Rest */}
                          <div className="col-span-1">
                            <Input type="number" placeholder="60s" value={ex.rest_seconds}
                              onChange={(e) => updateExercise(rIdx, eIdx, "rest_seconds", parseInt(e.target.value) || 60)}
                              className="h-8 text-xs text-center" />
                          </div>

                          {/* Actions */}
                          <div className="col-span-3 flex gap-0.5 justify-end">
                            {ex.video_url && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Vídeo">
                                <Play className="w-3 h-3 text-primary" />
                              </Button>
                            )}
                            {eIdx < routine.exercises.length - 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => linkToNext(rIdx, eIdx)}
                                title="Agrupar com próximo (biset/triset)"
                              >
                                <Link2 className="w-3 h-3 text-blue-400" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveExercise(rIdx, eIdx, -1)} disabled={eIdx === 0}>
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveExercise(rIdx, eIdx, 1)} disabled={eIdx === routine.exercises.length - 1}>
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeExercise(rIdx, eIdx)} disabled={routine.exercises.length <= 1}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Add exercise */}
                  <Button variant="outline" size="sm" onClick={() => addExercise(rIdx)} className="w-full h-8 border-dashed">
                    <Plus className="w-3 h-3 mr-1" /> Exercício
                  </Button>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      ))}

      {/* Add routine */}
      <Button variant="outline" onClick={addRoutine} className="w-full border-dashed">
        <Plus className="w-4 h-4 mr-1" /> Adicionar Rotina ({LABELS[routines.length] || routines.length + 1})
      </Button>

      {/* Action bar */}
      <div className="flex gap-2 sticky bottom-0 bg-background/80 backdrop-blur-sm p-3 -mx-3 border-t border-border/50">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={savePlan} disabled={saving || !title.trim() || !studentId} className="flex-1 gap-1.5">
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar Plano"}
        </Button>
      </div>

      {/* Exercise Library Modal */}
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar da Biblioteca</DialogTitle>
          </DialogHeader>
          <ExerciseLibrary selectable onSelect={selectFromLibrary} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
