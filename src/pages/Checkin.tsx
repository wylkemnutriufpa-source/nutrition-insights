import { useState, useEffect } from "react";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { normalizeWeightInput } from "@/lib/normalizeInputs";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Camera, Scale, MessageSquare, ArrowLeft, Upload, CheckCircle2,
  Smile, Meh, Frown, Send, Clock, User, Image, Ruler, Activity,
  TrendingUp, TrendingDown, Minus
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

interface PhysicalAssessment {
  id: string;
  assessment_date: string;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  body_fat_percentage: number | null;
  lean_mass: number | null;
  fat_mass: number | null;
  neck: number | null;
  chest: number | null;
  waist: number | null;
  abdomen: number | null;
  hip: number | null;
  right_arm: number | null;
  left_arm: number | null;
  right_forearm: number | null;
  left_forearm: number | null;
  right_thigh: number | null;
  left_thigh: number | null;
  right_calf: number | null;
  left_calf: number | null;
  bmr: number | null;
  tdee: number | null;
  calories_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
  goal_weight: number | null;
  goal_body_fat: number | null;
  notes: string | null;
  method: string | null;
}

function MetricCard({ label, value, unit, prev, icon: Icon }: { label: string; value: number | null; unit: string; prev?: number | null; icon?: any }) {
  if (value === null || value === undefined) return null;
  const diff = prev != null ? value - prev : null;
  return (
    <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-lg font-bold">{typeof value === 'number' ? value.toFixed(1) : value}</span>
        <span className="text-xs text-muted-foreground mb-0.5">{unit}</span>
        {diff !== null && diff !== 0 && (
          <Badge variant="outline" className={`ml-auto text-[10px] ${diff < 0 ? 'text-emerald-500 border-emerald-500/30' : 'text-red-500 border-red-500/30'}`}>
            {diff > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
            {diff > 0 ? '+' : ''}{diff.toFixed(1)}
          </Badge>
        )}
      </div>
    </div>
  );
}

function MeasurementRow({ label, value, prev }: { label: string; value: number | null; prev?: number | null }) {
  if (value === null || value === undefined) return null;
  const diff = prev != null ? value - prev : null;
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{value.toFixed(1)} cm</span>
        {diff !== null && diff !== 0 && (
          <span className={`text-[10px] font-medium ${diff < 0 ? 'text-emerald-500' : diff > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
            ({diff > 0 ? '+' : ''}{diff.toFixed(1)})
          </span>
        )}
      </div>
    </div>
  );
}

import { useExperienceUI } from "@/hooks/useExperienceUI";

export default function Checkin() {
  const { isBasic } = useExperienceUI();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nutritionistId, setNutritionistId] = useState<string | null>(null);
  const [history, setHistory] = useState<CheckinHistory[]>([]);
  const [assessments, setAssessments] = useState<PhysicalAssessment[]>([]);
  const [activeTab, setActiveTab] = useState("checkin");

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

      // Get physical assessments
      const { data: pa } = await supabase
        .from("physical_assessments")
        .select("*")
        .eq("patient_id", user.id)
        .order("assessment_date", { ascending: false })
        .limit(10);
      
      setAssessments((pa as PhysicalAssessment[]) || []);

      // Auto-select tab if assessments exist but no checkins
      if ((pa?.length || 0) > 0 && (checkins?.length || 0) === 0) {
        setActiveTab("assessment");
      }

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
      const [frontUrl, sideUrl, backUrl] = await Promise.all([
        photoFront ? uploadPhoto(photoFront, "front") : Promise.resolve(null),
        photoSide ? uploadPhoto(photoSide, "side") : Promise.resolve(null),
        photoBack ? uploadPhoto(photoBack, "back") : Promise.resolve(null),
      ]);

      const { error } = await supabase.from("patient_checkins").insert({
        patient_id: user.id,
        nutritionist_id: nutritionistId,
        weight: weight ? normalizeWeightInput(weight).value : null,
        feedback: feedback.trim() || null,
        difficulty,
        photo_front_url: frontUrl,
        photo_side_url: sideUrl,
        photo_back_url: backUrl,
      });

      if (error) throw error;

      toast.success("Check-in enviado! Seu nutricionista irá revisar.");
      clearDraft();
      setWeight(""); setFeedback(""); setDifficulty("medium");
      setPhotoFront(null); setPhotoSide(null); setPhotoBack(null);
      setPreviewFront(null); setPreviewSide(null); setPreviewBack(null);

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

  const latestAssessment = assessments[0] || null;
  const previousAssessment = assessments[1] || null;

  const measurements = latestAssessment ? [
    { label: "Pescoço", value: latestAssessment.neck, prev: previousAssessment?.neck },
    { label: "Peitoral", value: latestAssessment.chest, prev: previousAssessment?.chest },
    { label: "Cintura", value: latestAssessment.waist, prev: previousAssessment?.waist },
    { label: "Abdômen", value: latestAssessment.abdomen, prev: previousAssessment?.abdomen },
    { label: "Quadril", value: latestAssessment.hip, prev: previousAssessment?.hip },
    { label: "Braço D", value: latestAssessment.right_arm, prev: previousAssessment?.right_arm },
    { label: "Braço E", value: latestAssessment.left_arm, prev: previousAssessment?.left_arm },
    { label: "Antebraço D", value: latestAssessment.right_forearm, prev: previousAssessment?.right_forearm },
    { label: "Antebraço E", value: latestAssessment.left_forearm, prev: previousAssessment?.left_forearm },
    { label: "Coxa D", value: latestAssessment.right_thigh, prev: previousAssessment?.right_thigh },
    { label: "Coxa E", value: latestAssessment.left_thigh, prev: previousAssessment?.left_thigh },
    { label: "Panturrilha D", value: latestAssessment.right_calf, prev: previousAssessment?.right_calf },
    { label: "Panturrilha E", value: latestAssessment.left_calf, prev: previousAssessment?.left_calf },
  ].filter(m => m.value !== null) : [];

  return (
    <DashboardLayout>
      <motion.div className="p-4 sm:p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display">Avaliação & Check-in</h1>
            <p className="text-sm text-muted-foreground">Sua evolução física e check-ins semanais</p>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="assessment" className="gap-2">
              <Ruler className="w-4 h-4" />
              Avaliação Física
              {assessments.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{assessments.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="checkin" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Check-in Semanal
            </TabsTrigger>
          </TabsList>

          {/* PHYSICAL ASSESSMENT TAB */}
          <TabsContent value="assessment" className="space-y-4 mt-4">
            {assessments.length === 0 ? (
              <Card className="shadow-card border-border/50">
                <CardContent className="py-12 text-center">
                  <Ruler className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Nenhuma avaliação física registrada</p>
                  <p className="text-sm text-muted-foreground mt-1">Seu profissional irá registrar suas medidas.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Latest Assessment Summary */}
                <Card className="shadow-card border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-lg flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Última Avaliação
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {new Date(latestAssessment!.assessment_date).toLocaleDateString("pt-BR")}
                      </Badge>
                    </div>
                    {latestAssessment!.method && (
                      <p className="text-xs text-muted-foreground">Método: {latestAssessment!.method}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <MetricCard label="Peso" value={latestAssessment!.weight} unit="kg" prev={previousAssessment?.weight} icon={Scale} />
                      <MetricCard label="IMC" value={latestAssessment!.bmi} unit="" prev={previousAssessment?.bmi} icon={Activity} />
                      <MetricCard label="% Gordura" value={latestAssessment!.body_fat_percentage} unit="%" prev={previousAssessment?.body_fat_percentage} />
                      <MetricCard label="Massa Magra" value={latestAssessment!.lean_mass} unit="kg" prev={previousAssessment?.lean_mass} />
                      <MetricCard label="Massa Gorda" value={latestAssessment!.fat_mass} unit="kg" prev={previousAssessment?.fat_mass} />
                      <MetricCard label="TMB" value={latestAssessment!.bmr} unit="kcal" prev={previousAssessment?.bmr} />
                    </div>

                    {/* Goals */}
                    {(latestAssessment!.goal_weight || latestAssessment!.calories_target) && (
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                        <p className="text-xs font-semibold text-primary mb-2">🎯 Metas & Targets</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                          {latestAssessment!.goal_weight && (
                            <div><span className="text-muted-foreground text-xs">Meta Peso:</span><br /><strong>{latestAssessment!.goal_weight} kg</strong></div>
                          )}
                          {latestAssessment!.calories_target && (
                            <div><span className="text-muted-foreground text-xs">Calorias:</span><br /><strong>{Math.round(latestAssessment!.calories_target)} kcal</strong></div>
                          )}
                          {latestAssessment!.protein_target && (
                            <div><span className="text-muted-foreground text-xs">Proteína:</span><br /><strong>{Math.round(latestAssessment!.protein_target)}g</strong></div>
                          )}
                          {latestAssessment!.goal_body_fat && (
                            <div><span className="text-muted-foreground text-xs">Meta %GC:</span><br /><strong>{latestAssessment!.goal_body_fat}%</strong></div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Measurements */}
                    {measurements.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Ruler className="w-4 h-4 text-muted-foreground" /> Perímetros
                        </p>
                        <div className="grid sm:grid-cols-2 gap-x-6">
                          {measurements.map(m => (
                            <MeasurementRow key={m.label} label={m.label} value={m.value} prev={m.prev} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {latestAssessment!.notes && (
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                        <p className="text-sm">{latestAssessment!.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Assessment History */}
                {assessments.length > 1 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Histórico de Avaliações
                    </h3>
                    {assessments.slice(1).map((a) => (
                      <Card key={a.id} className="shadow-card border-border/50">
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">
                                {new Date(a.assessment_date).toLocaleDateString("pt-BR")}
                              </Badge>
                              {a.weight && <span className="text-sm"><strong>{a.weight} kg</strong></span>}
                              {a.body_fat_percentage && <span className="text-xs text-muted-foreground">{a.body_fat_percentage}% GC</span>}
                              {a.bmi && <span className="text-xs text-muted-foreground">IMC {a.bmi}</span>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* WEEKLY CHECKIN TAB */}
          <TabsContent value="checkin" className="mt-4">
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

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-muted-foreground" /> Peso atual (kg)
                      </Label>
                      <Input type="number" step="0.1" placeholder="Ex: 72.5" value={weight} onChange={(e) => setWeight(e.target.value)} />
                    </div>

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
                              difficulty === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                            }`}
                          >
                            <RadioGroupItem value={opt.value} className="sr-only" />
                            <opt.icon className={`w-6 h-6 ${opt.color}`} />
                            <span className="text-sm font-medium">{opt.label}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label>Feedback / Dificuldades</Label>
                      <Textarea placeholder="Conte como foi sua semana, dificuldades, dúvidas..." rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                    </div>

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
                            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && photo.setter(e.target.files[0])} />
                          </label>
                        ))}
                      </div>
                    </div>

                    <Button onClick={handleSubmit} disabled={submitting || !nutritionistId} className="w-full gap-2">
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
                                <span className="text-sm font-medium">{getDifficultyLabel(checkin.difficulty)}</span>
                                {checkin.weight && (
                                  <Badge variant="secondary" className="text-xs">{checkin.weight} kg</Badge>
                                )}
                                <Badge variant="outline" className={checkin.status === "reviewed" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}>
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
                                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
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
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
}