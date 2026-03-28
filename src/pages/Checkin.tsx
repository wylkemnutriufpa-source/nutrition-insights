import { useState, useEffect } from "react";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Camera, Scale, MessageSquare, ArrowLeft, Upload, CheckCircle2,
  Smile, Meh, Frown, Send, Clock, User, Image
} from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

interface CheckinHistory {
  id: string;
  weight: number | null;
  feedback: string | null;
  difficulty: string;
  status: string;
  created_at: string;
  nutri_notes: string | null;
}

export default function Checkin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nutritionistId, setNutritionistId] = useState<string | null>(null);
  const [history, setHistory] = useState<CheckinHistory[]>([]);

  // Form state
  const [weight, setWeight] = useState("");
  const [feedback, setFeedback] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [photoFront, setPhotoFront] = useState<File | null>(null);
  const [photoSide, setPhotoSide] = useState<File | null>(null);
  const [photoBack, setPhotoBack] = useState<File | null>(null);
  const [previewFront, setPreviewFront] = useState<string | null>(null);
  const [previewSide, setPreviewSide] = useState<string | null>(null);
  const [previewBack, setPreviewBack] = useState<string | null>(null);

  // Draft persistence
  const { loadDraft, saveDraft, clearDraft, hasDraft } = useFormDraft<{ weight: string; feedback: string; difficulty: string }>(
    `checkin_${user?.id || "anon"}`
  );

  // Restore draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      if (draft.weight) setWeight(draft.weight);
      if (draft.feedback) setFeedback(draft.feedback);
      if (draft.difficulty) setDifficulty(draft.difficulty);
    }
  }, [loadDraft]);

  // Auto-save on changes
  useEffect(() => {
    saveDraft({ weight, feedback, difficulty });
  }, [weight, feedback, difficulty, saveDraft]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      // Get patient's nutritionist
      const { data: np } = await supabase
        .from("nutritionist_patients")
        .select("nutritionist_id")
        .eq("patient_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      
      if (np) setNutritionistId(np.nutritionist_id);

      // Get check-in history
      const { data: checkins } = await supabase
        .from("patient_checkins")
        .select("id, weight, feedback, difficulty, status, created_at, nutri_notes")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      setHistory(checkins || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handlePhotoChange = (type: "front" | "side" | "back", file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "front") { setPhotoFront(file); setPreviewFront(reader.result as string); }
      if (type === "side") { setPhotoSide(file); setPreviewSide(reader.result as string); }
      if (type === "back") { setPhotoBack(file); setPreviewBack(reader.result as string); }
    };
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (file: File, type: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}-${type}.${ext}`;
    const { error } = await supabase.storage.from("checkin-photos").upload(path, file);
    if (error) { console.error(error); return null; }
    // Return path for DB storage, not signed URL
    return path;
  };

  const handleSubmit = async () => {
    if (!user || !nutritionistId) {
      toast.error("Você precisa estar vinculado a um nutricionista");
      return;
    }
    if (!feedback.trim() && !weight) {
      toast.error("Preencha pelo menos o peso ou um feedback");
      return;
    }

    setSubmitting(true);
    try {
      // Upload photos
      const [frontUrl, sideUrl, backUrl] = await Promise.all([
        photoFront ? uploadPhoto(photoFront, "front") : Promise.resolve(null),
        photoSide ? uploadPhoto(photoSide, "side") : Promise.resolve(null),
        photoBack ? uploadPhoto(photoBack, "back") : Promise.resolve(null),
      ]);

      // Insert check-in
      const { error } = await supabase.from("patient_checkins").insert({
        patient_id: user.id,
        nutritionist_id: nutritionistId,
        weight: weight ? parseFloat(weight) : null,
        feedback: feedback.trim() || null,
        difficulty,
        photo_front_url: frontUrl,
        photo_side_url: sideUrl,
        photo_back_url: backUrl,
      });

      if (error) throw error;

      toast.success("Check-in enviado! Seu nutricionista irá revisar.");
      clearDraft();
      // Reset form
      setWeight("");
      setFeedback("");
      setDifficulty("medium");
      setPhotoFront(null);
      setPhotoSide(null);
      setPhotoBack(null);
      setPreviewFront(null);
      setPreviewSide(null);
      setPreviewBack(null);

      // Refresh history
      const { data: checkins } = await supabase
        .from("patient_checkins")
        .select("id, weight, feedback, difficulty, status, created_at, nutri_notes")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setHistory(checkins || []);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar check-in");
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyIcon = (d: string) => {
    if (d === "easy") return <Smile className="w-5 h-5 text-emerald-500" />;
    if (d === "hard") return <Frown className="w-5 h-5 text-red-500" />;
    return <Meh className="w-5 h-5 text-amber-500" />;
  };

  const getDifficultyLabel = (d: string) => {
    if (d === "easy") return "Fácil";
    if (d === "hard") return "Difícil";
    return "Moderada";
  };

  return (
    <DashboardLayout>
      <motion.div className="p-4 sm:p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display">Check-in Semanal</h1>
            <p className="text-sm text-muted-foreground">Atualize seu progresso para seu nutricionista</p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <motion.div variants={fadeUp}>
            <Card className="shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Novo Check-in
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {!nutritionistId && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
                    Você não está vinculado a nenhum nutricionista ainda.
                  </div>
                )}

                {/* Weight */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-muted-foreground" /> Peso atual (kg)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 72.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>

                {/* Difficulty */}
                <div className="space-y-3">
                  <Label>Como está sendo seguir o plano esta semana?</Label>
                  <RadioGroup value={difficulty} onValueChange={setDifficulty} className="flex gap-4">
                    {[
                      { value: "easy", label: "Fácil", icon: Smile, color: "text-emerald-500" },
                      { value: "medium", label: "Moderado", icon: Meh, color: "text-amber-500" },
                      { value: "hard", label: "Difícil", icon: Frown, color: "text-red-500" },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                          difficulty === opt.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                        }`}
                      >
                        <RadioGroupItem value={opt.value} className="sr-only" />
                        <opt.icon className={`w-6 h-6 ${opt.color}`} />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                {/* Feedback */}
                <div className="space-y-2">
                  <Label>Feedback / Dificuldades</Label>
                  <Textarea
                    placeholder="Conte como foi sua semana, dificuldades, dúvidas..."
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>

                {/* Photos */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-muted-foreground" /> Fotos de evolução (opcional)
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Frente", preview: previewFront, setter: (f: File) => handlePhotoChange("front", f) },
                      { label: "Lado", preview: previewSide, setter: (f: File) => handlePhotoChange("side", f) },
                      { label: "Costas", preview: previewBack, setter: (f: File) => handlePhotoChange("back", f) },
                    ].map((photo) => (
                      <label
                        key={photo.label}
                        className="aspect-[3/4] rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center bg-muted/30 transition-colors overflow-hidden relative"
                      >
                        {photo.preview ? (
                          <img src={photo.preview} alt={photo.label} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Image className="w-6 h-6 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">{photo.label}</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => e.target.files?.[0] && photo.setter(e.target.files[0])}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !nutritionistId}
                  className="w-full gap-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Enviar Check-in
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* History */}
          <motion.div variants={fadeUp} className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Histórico de Check-ins
            </h2>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <Card className="shadow-card border-border/50">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum check-in enviado ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {history.map((checkin) => (
                  <Card key={checkin.id} className="shadow-card border-border/50">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getDifficultyIcon(checkin.difficulty)}
                            <span className="text-sm font-medium">
                              {getDifficultyLabel(checkin.difficulty)}
                            </span>
                            {checkin.weight && (
                              <Badge variant="secondary" className="text-xs">
                                {checkin.weight} kg
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={
                                checkin.status === "reviewed"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-amber-500/10 text-amber-500"
                              }
                            >
                              {checkin.status === "reviewed" ? "Revisado" : "Pendente"}
                            </Badge>
                          </div>
                          {checkin.feedback && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{checkin.feedback}</p>
                          )}
                          {checkin.nutri_notes && (
                            <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/20">
                              <p className="text-xs font-medium text-primary mb-1">Resposta do Nutricionista:</p>
                              <p className="text-sm text-foreground">{checkin.nutri_notes}</p>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(checkin.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
