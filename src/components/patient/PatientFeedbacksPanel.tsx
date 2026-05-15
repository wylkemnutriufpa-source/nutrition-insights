import { useState, useEffect } from "react";
import StorageImage from "@/components/common/StorageImage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera, MessageSquare, Scale, Heart, Star,
  ChevronDown, ChevronUp, Eye, Clock, CheckCircle2,
  AlertTriangle, Utensils, Dumbbell, X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  patientId: string;
}

interface CheckIn {
  id: string;
  weight: number | null;
  feedback: string | null;
  difficulty: string | null;
  photo_front_url: string | null;
  photo_side_url: string | null;
  photo_back_url: string | null;
  status: string;
  nutri_notes: string | null;
  nutri_action: string | null;
  created_at: string;
}

interface MealFeedback {
  id: string;
  tipo_refeicao: string;
  rating: string | number | null;
  comment: string | null;
  created_at: string;
}

interface TrainingFeedback {
  id: string;
  exercise_name: string | null;
  feedback_type: string;
  pain_level: number | null;
  pain_location: string | null;
  difficulty_rating: number | null;
  notes: string | null;
  created_at: string;
}

interface WorkoutFeedback {
  id: string;
  overall_feeling: string;
  fatigue_level: number | null;
  sleep_quality: number | null;
  motivation_level: number | null;
  pain_areas: any;
  notes: string | null;
  processed: boolean;
  created_at: string;
}

const difficultyLabels: Record<string, { label: string; color: string }> = {
  easy: { label: "Fácil", color: "bg-success/20 text-success" },
  medium: { label: "Moderado", color: "bg-warning/20 text-warning" },
  hard: { label: "Difícil", color: "bg-destructive/20 text-destructive" },
};

const feelingLabels: Record<string, { label: string; emoji: string }> = {
  terrible: { label: "Péssimo", emoji: "😫" },
  bad: { label: "Ruim", emoji: "😟" },
  neutral: { label: "Normal", emoji: "😐" },
  good: { label: "Bom", emoji: "😊" },
  great: { label: "Ótimo", emoji: "🤩" },
};

const mealTypeLabels: Record<string, string> = {
  breakfast: "☀️ Café da Manhã",
  morning_snack: "🍎 Lanche Manhã",
  lunch: "🍽️ Almoço",
  afternoon_snack: "🥤 Lanche Tarde",
  dinner: "🌙 Jantar",
  supper: "🍵 Ceia",
};

export default function PatientFeedbacksPanel({ patientId }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [mealFeedbacks, setMealFeedbacks] = useState<MealFeedback[]>([]);
  const [trainingFeedbacks, setTrainingFeedbacks] = useState<TrainingFeedback[]>([]);
  const [workoutFeedbacks, setWorkoutFeedbacks] = useState<WorkoutFeedback[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"checkins" | "meals" | "training" | "workout">("checkins");

  useEffect(() => {
    loadAll();
  }, [patientId]);

  const loadAll = async () => {
    setLoading(true);
    const [checkinsRes, mealRes, trainingRes, workoutRes] = await Promise.all([
      supabase.from("patient_checkins").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(50),
      supabase.from("meal_feedback").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("training_feedback").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(50),
      (supabase as any).from("workout_session_feedback").select("*").eq("student_id", patientId).order("created_at", { ascending: false }).limit(50),
    ]);
    setCheckins((checkinsRes.data || []) as CheckIn[]);
    setMealFeedbacks((mealRes.data || []) as MealFeedback[]);
    setTrainingFeedbacks((trainingRes.data || []) as TrainingFeedback[]);
    setWorkoutFeedbacks((workoutRes.data || []) as WorkoutFeedback[]);
    setLoading(false);
  };

  const tabs = [
    { key: "checkins" as const, label: "Check-ins", icon: Camera, count: checkins.length },
    { key: "meals" as const, label: "Refeições", icon: Utensils, count: mealFeedbacks.length },
    { key: "training" as const, label: "Treino", icon: Dumbbell, count: trainingFeedbacks.length },
    { key: "workout" as const, label: "Pós-Treino", icon: Heart, count: workoutFeedbacks.length },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  const totalCount = checkins.length + mealFeedbacks.length + trainingFeedbacks.length + workoutFeedbacks.length;

  if (totalCount === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Nenhum feedback recebido ainda</p>
        <p className="text-xs mt-1">Os feedbacks do paciente aparecerão aqui (check-ins, refeições, treinos)</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1.5 p-1 rounded-lg bg-muted/40">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                activeTab === t.key
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              {t.count > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 min-w-[18px]">
                  {t.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Check-ins tab */}
      {activeTab === "checkins" && (
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 pr-2">
            {checkins.map(ci => {
              const hasPhotos = ci.photo_front_url || ci.photo_side_url || ci.photo_back_url;
              const isExpanded = expandedId === ci.id;
              const diff = difficultyLabels[ci.difficulty || ""] || null;

              return (
                <div
                  key={ci.id}
                  className={`rounded-xl border border-border bg-card overflow-hidden transition-all ${
                    hasPhotos ? "ring-1 ring-primary/20" : ""
                  }`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : ci.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      hasPhotos ? "bg-primary/10" : "bg-muted"
                    }`}>
                      {hasPhotos ? <Camera className="w-5 h-5 text-primary" /> : <MessageSquare className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">Check-in</span>
                        {ci.weight && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Scale className="w-2.5 h-2.5" /> {ci.weight}kg
                          </Badge>
                        )}
                        {diff && <Badge className={`text-[10px] ${diff.color}`}>{diff.label}</Badge>}
                        {hasPhotos && (
                          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 gap-1">
                            <Camera className="w-2.5 h-2.5" /> Fotos
                          </Badge>
                        )}
                        <Badge variant={ci.status === "reviewed" ? "default" : "secondary"} className="text-[10px]">
                          {ci.status === "reviewed" ? "✅ Revisado" : "⏳ Pendente"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {ci.feedback || "Sem comentário"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(ci.created_at), "dd MMM", { locale: ptBR })}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                      {ci.feedback && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Feedback do paciente:</p>
                          <p className="text-sm">{ci.feedback}</p>
                        </div>
                      )}

                      {/* Photos grid */}
                      {hasPhotos && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <Camera className="w-3 h-3" /> Fotos enviadas:
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { url: ci.photo_front_url, label: "Frente" },
                              { url: ci.photo_side_url, label: "Lateral" },
                              { url: ci.photo_back_url, label: "Costas" },
                            ].filter(p => p.url).map((photo, i) => (
                              <button
                                key={i}
                                onClick={() => setLightboxUrl(photo.url)}
                                className="relative group rounded-lg overflow-hidden border border-border aspect-[3/4] bg-muted"
                              >
                                <StorageImage
                                  src={photo.url!}
                                  bucket="checkin-photos"
                                  alt={photo.label}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                  <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                                  {photo.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Professional notes */}
                      {ci.nutri_notes && (
                        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                          <p className="text-xs font-medium text-primary mb-1">Notas do profissional:</p>
                          <p className="text-sm">{ci.nutri_notes}</p>
                        </div>
                      )}
                      {ci.nutri_action && (
                        <div className="bg-success/5 rounded-lg p-3 border border-success/10">
                          <p className="text-xs font-medium text-success mb-1">Ação tomada:</p>
                          <p className="text-sm">{ci.nutri_action}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {checkins.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum check-in registrado</p>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Meals tab */}
      {activeTab === "meals" && (
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2 pr-2">
            {mealFeedbacks.map(mf => (
              <div key={mf.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <Utensils className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{mealTypeLabels[mf.tipo_refeicao] || mf.tipo_refeicao}</span>
                    {mf.rating && (
                      <span className="flex items-center gap-0.5 text-xs text-warning">
                        <Star className="w-3 h-3 fill-warning" /> {mf.rating}/5
                      </span>
                    )}
                  </div>
                  {mf.comment && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{mf.comment}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {format(new Date(mf.created_at), "dd MMM", { locale: ptBR })}
                </span>
              </div>
            ))}
            {mealFeedbacks.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum feedback de refeição</p>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Training tab */}
      {activeTab === "training" && (
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2 pr-2">
            {trainingFeedbacks.map(tf => (
              <div key={tf.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Dumbbell className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{tf.exercise_name || "Exercício"}</span>
                    <Badge variant="outline" className="text-[10px]">{tf.feedback_type}</Badge>
                    {tf.pain_level && tf.pain_level > 0 && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> Dor {tf.pain_level}/10
                      </Badge>
                    )}
                  </div>
                  {tf.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tf.notes}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {format(new Date(tf.created_at), "dd MMM", { locale: ptBR })}
                </span>
              </div>
            ))}
            {trainingFeedbacks.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum feedback de treino individual</p>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Workout session feedback tab */}
      {activeTab === "workout" && (
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 pr-2">
            {workoutFeedbacks.map(wf => {
              const feel = feelingLabels[wf.overall_feeling] || { label: wf.overall_feeling, emoji: "❓" };
              const pains = Array.isArray(wf.pain_areas) ? wf.pain_areas : [];

              return (
                <div key={wf.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{feel.emoji}</span>
                      <span className="text-sm font-medium">{feel.label}</span>
                      {wf.fatigue_level && (
                        <Badge variant="outline" className="text-[10px]">Fadiga {wf.fatigue_level}/10</Badge>
                      )}
                      {!wf.processed && (
                        <Badge className="text-[10px] bg-warning/20 text-warning animate-pulse">Novo</Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(wf.created_at), "dd MMM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {pains.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pains.map((p: any, i: number) => (
                        <Badge key={i} variant="destructive" className="text-[10px] gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> {p.area} ({p.intensity})
                        </Badge>
                      ))}
                    </div>
                  )}
                  {wf.notes && <p className="text-xs text-muted-foreground">{wf.notes}</p>}
                </div>
              );
            })}
            {workoutFeedbacks.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">Nenhum feedback pós-treino</p>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Photo Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="sm:max-w-2xl p-1 bg-black/95">
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
          >
            <X className="w-4 h-4" />
          </button>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Foto do check-in"
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
