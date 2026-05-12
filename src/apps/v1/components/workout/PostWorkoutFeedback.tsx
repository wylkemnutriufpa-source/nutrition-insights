import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Heart, Frown, Meh, Smile, SmilePlus, Zap,
  Moon, Brain, AlertTriangle, CheckCircle2, Send
} from "lucide-react";

const BODY_AREAS = [
  { key: "shoulder_left", label: "Ombro E", x: 28, y: 22 },
  { key: "shoulder_right", label: "Ombro D", x: 72, y: 22 },
  { key: "chest", label: "Peito", x: 50, y: 28 },
  { key: "upper_back", label: "Costas Superior", x: 50, y: 25 },
  { key: "lower_back", label: "Lombar", x: 50, y: 42 },
  { key: "bicep_left", label: "Bíceps E", x: 20, y: 35 },
  { key: "bicep_right", label: "Bíceps D", x: 80, y: 35 },
  { key: "elbow_left", label: "Cotovelo E", x: 17, y: 42 },
  { key: "elbow_right", label: "Cotovelo D", x: 83, y: 42 },
  { key: "wrist_left", label: "Punho E", x: 14, y: 52 },
  { key: "wrist_right", label: "Punho D", x: 86, y: 52 },
  { key: "hip_left", label: "Quadril E", x: 35, y: 48 },
  { key: "hip_right", label: "Quadril D", x: 65, y: 48 },
  { key: "knee_left", label: "Joelho E", x: 38, y: 65 },
  { key: "knee_right", label: "Joelho D", x: 62, y: 65 },
  { key: "ankle_left", label: "Tornozelo E", x: 38, y: 85 },
  { key: "ankle_right", label: "Tornozelo D", x: 62, y: 85 },
  { key: "neck", label: "Pescoço", x: 50, y: 15 },
  { key: "abs", label: "Abdômen", x: 50, y: 38 },
];

const FEELINGS = [
  { value: "terrible", icon: Frown, label: "Péssimo", color: "text-destructive" },
  { value: "bad", icon: Frown, label: "Ruim", color: "text-orange-500" },
  { value: "neutral", icon: Meh, label: "Normal", color: "text-muted-foreground" },
  { value: "good", icon: Smile, label: "Bom", color: "text-emerald-500" },
  { value: "great", icon: SmilePlus, label: "Ótimo", color: "text-primary" },
];

const PAIN_INTENSITY = [
  { value: "mild", label: "Leve", color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" },
  { value: "moderate", label: "Moderada", color: "bg-orange-500/20 text-orange-600 border-orange-500/30" },
  { value: "severe", label: "Intensa", color: "bg-destructive/20 text-destructive border-destructive/30" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  completionId: string;
  routineId: string;
  planId: string;
  exercises: any[];
}

export default function PostWorkoutFeedback({ open, onClose, completionId, routineId, planId, exercises }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [feeling, setFeeling] = useState<string>("");
  const [painAreas, setPainAreas] = useState<{ area: string; intensity: string; exerciseRelated?: string }[]>([]);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedIntensity, setSelectedIntensity] = useState<string>("moderate");
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [fatigue, setFatigue] = useState(5);
  const [sleep, setSleep] = useState(3);
  const [motivation, setMotivation] = useState(3);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addPainArea = () => {
    if (!selectedArea) return;
    const existing = painAreas.find(p => p.area === selectedArea);
    if (existing) {
      setPainAreas(prev => prev.map(p => p.area === selectedArea
        ? { ...p, intensity: selectedIntensity, exerciseRelated: selectedExercise || undefined }
        : p
      ));
    } else {
      setPainAreas(prev => [...prev, {
        area: selectedArea,
        intensity: selectedIntensity,
        exerciseRelated: selectedExercise || undefined,
      }]);
    }
    setSelectedArea(null);
    setSelectedExercise("");
  };

  const removePainArea = (area: string) => {
    setPainAreas(prev => prev.filter(p => p.area !== area));
  };

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const discomfortExercises = painAreas
        .filter(p => p.exerciseRelated)
        .map(p => ({
          exercise: p.exerciseRelated,
          pain_area: p.area,
          intensity: p.intensity,
        }));

      await (supabase as any).from("workout_session_feedback").insert({
        student_id: user.id,
        completion_id: completionId,
        routine_id: routineId,
        plan_id: planId,
        overall_feeling: feeling || "neutral",
        pain_areas: painAreas,
        discomfort_exercises: discomfortExercises,
        fatigue_level: fatigue,
        sleep_quality: sleep,
        motivation_level: motivation,
        notes: notes || null,
      });

      // Trigger IFJ analysis if there's pain
      if (painAreas.length > 0) {
        try {
          await supabase.functions.invoke("workout-ifj-analyze", {
            body: {
              student_id: user.id,
              completion_id: completionId,
              pain_areas: painAreas,
              exercises: exercises.map(e => ({ id: e.id, name: e.name, muscle_group: e.muscle_group })),
            },
          });
        } catch (e) {
          console.error("IFJ analysis trigger failed:", e);
        }
      }

      toast.success("Feedback registrado! Obrigado por ajudar seu personal 💪");
      onClose();
    } catch (e) {
      toast.error("Erro ao enviar feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const areaLabel = (key: string) => BODY_AREAS.find(a => a.key === key)?.label || key;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Feedback Pós-Treino
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium mb-3">Como você se sentiu no treino?</p>
              <div className="flex gap-2 justify-center">
                {FEELINGS.map(f => {
                  const Icon = f.icon;
                  return (
                    <button
                      key={f.value}
                      onClick={() => setFeeling(f.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        feeling === f.value
                          ? "border-primary bg-primary/10 scale-105"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <Icon className={`w-7 h-7 ${f.color}`} />
                      <span className="text-[10px] font-medium">{f.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-warning" /> Nível de fadiga: <span className="text-primary font-bold">{fatigue}/10</span>
              </p>
              <Slider value={[fatigue]} onValueChange={v => setFatigue(v[0])} min={1} max={10} step={1} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium flex items-center gap-1 mb-2">
                  <Moon className="w-3.5 h-3.5" /> Sono: <span className="text-primary">{sleep}/5</span>
                </p>
                <Slider value={[sleep]} onValueChange={v => setSleep(v[0])} min={1} max={5} step={1} />
              </div>
              <div>
                <p className="text-sm font-medium flex items-center gap-1 mb-2">
                  <Brain className="w-3.5 h-3.5" /> Motivação: <span className="text-primary">{motivation}/5</span>
                </p>
                <Slider value={[motivation]} onValueChange={v => setMotivation(v[0])} min={1} max={5} step={1} />
              </div>
            </div>

            <Button onClick={() => setStep(2)} className="w-full">
              Próximo → Mapa de Dor
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium">Sentiu dor ou desconforto? Toque na região:</p>

            {/* Body map */}
            <div className="relative w-full aspect-[1/2] max-w-[220px] mx-auto bg-muted/30 rounded-2xl border border-border">
              {/* Simple body silhouette indicators */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-[85%] bg-muted/50 rounded-full" />
              </div>
              <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-10 h-10 bg-muted/50 rounded-full" />

              {BODY_AREAS.map(area => {
                const isActive = painAreas.some(p => p.area === area.key);
                const isSelected = selectedArea === area.key;
                const pain = painAreas.find(p => p.area === area.key);
                return (
                  <button
                    key={area.key}
                    onClick={() => setSelectedArea(isSelected ? null : area.key)}
                    className={`absolute w-5 h-5 rounded-full border-2 transition-all transform -translate-x-1/2 -translate-y-1/2 z-10 ${
                      isActive
                        ? pain?.intensity === "severe"
                          ? "bg-destructive border-destructive animate-pulse"
                          : pain?.intensity === "moderate"
                            ? "bg-orange-500 border-orange-500"
                            : "bg-yellow-500 border-yellow-500"
                        : isSelected
                          ? "bg-primary border-primary scale-125"
                          : "bg-background/80 border-muted-foreground/30 hover:border-primary hover:scale-110"
                    }`}
                    style={{ left: `${area.x}%`, top: `${area.y}%` }}
                    title={area.label}
                  />
                );
              })}
            </div>

            {/* Selected area config */}
            {selectedArea && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-3 border border-border">
                <p className="text-sm font-semibold">{areaLabel(selectedArea)}</p>
                <div className="flex gap-2">
                  {PAIN_INTENSITY.map(pi => (
                    <button
                      key={pi.value}
                      onClick={() => setSelectedIntensity(pi.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selectedIntensity === pi.value ? pi.color + " scale-105" : "bg-muted text-muted-foreground border-transparent"
                      }`}
                    >
                      {pi.label}
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Exercício que causou (opcional):</p>
                  <select
                    className="w-full text-sm rounded-md border bg-background px-2 py-1.5"
                    value={selectedExercise}
                    onChange={e => setSelectedExercise(e.target.value)}
                  >
                    <option value="">Não sei / Geral</option>
                    {exercises.map(ex => (
                      <option key={ex.id} value={ex.name}>{ex.name}</option>
                    ))}
                  </select>
                </div>
                <Button size="sm" onClick={addPainArea} className="w-full">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Marcar dor
                </Button>
              </div>
            )}

            {/* Pain list */}
            {painAreas.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Áreas marcadas:</p>
                {painAreas.map(p => (
                  <div key={p.area} className="flex items-center justify-between px-3 py-1.5 rounded-md bg-destructive/5 border border-destructive/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                      <span className="text-xs font-medium">{areaLabel(p.area)}</span>
                      <Badge variant="outline" className="text-[9px]">{p.intensity}</Badge>
                      {p.exerciseRelated && <span className="text-[10px] text-muted-foreground">→ {p.exerciseRelated}</span>}
                    </div>
                    <button onClick={() => removePainArea(p.area)} className="text-muted-foreground hover:text-destructive">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="text-xs text-muted-foreground mb-1">Observações extras:</p>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Algo mais que queira relatar..." rows={2} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Voltar</Button>
              <Button onClick={submit} disabled={submitting} className="flex-1 gap-1">
                <Send className="w-4 h-4" /> {submitting ? "Enviando..." : "Enviar Feedback"}
              </Button>
            </div>

            {painAreas.length === 0 && (
              <p className="text-center text-xs text-muted-foreground">Sem dores? Ótimo! Pode enviar assim mesmo 🎉</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
