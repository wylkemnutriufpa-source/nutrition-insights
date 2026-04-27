import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { normalizeWeightInput, normalizeHeightInput } from "@/lib/normalizeInputs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Scale, Ruler, Camera, CheckCircle2, ArrowRight, ArrowLeft,
  Upload, AlertTriangle, Sparkles, Target, Heart, Moon,
  Droplets, Activity, Brain
} from "lucide-react";

interface Props {
  programId: string;
  enrollmentId: string;
  onComplete: () => void;
}

const STEPS = [
  { title: "Peso & Altura", icon: Scale, desc: "Dados obrigatórios" },
  { title: "Medidas Corporais", icon: Ruler, desc: "Opcional mas recomendado" },
  { title: "Perguntas Clínicas", icon: Heart, desc: "Perfil clínico rápido" },
  { title: "Fotos Corporais", icon: Camera, desc: "Frente, lado e costas" },
  { title: "Resultado", icon: Sparkles, desc: "Cálculos e ativação" },
];

export default function BiquiniOnboardingWizard({ programId, enrollmentId, onComplete }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 — Weight & Height
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  // Step 2 — Measurements
  const [hasMeasurements, setHasMeasurements] = useState<boolean | null>(null);
  const [measurements, setMeasurements] = useState({
    waist: "", abdomen: "", hip: "", thigh: "", arm: "", bust: "",
  });

  // Step 3 — Clinical questions
  const [clinical, setClinical] = useState({
    main_goal: "",
    activity_level: "",
    fluid_retention: "",
    bloating: "",
    sleep_quality: "",
    constipation: "",
    biggest_difficulty: "",
    menstrual_regularity: "",
  });

  // Step 4 — Photos
  const [photos, setPhotos] = useState<{ front: File | null; side: File | null; back: File | null }>({
    front: null, side: null, back: null,
  });
  const [photoPreview, setPhotoPreview] = useState<{ front: string; side: string; back: string }>({
    front: "", side: "", back: "",
  });

  // Step 5 — Calculated results
  const [results, setResults] = useState<any>(null);

  const handlePhotoChange = (position: "front" | "side" | "back", file: File | null) => {
    if (!file) return;
    setPhotos(prev => ({ ...prev, [position]: file }));
    const url = URL.createObjectURL(file);
    setPhotoPreview(prev => ({ ...prev, [position]: url }));
  };

  const canAdvance = () => {
    switch (step) {
      case 0: return parseFloat(weight) > 0 && parseFloat(height) > 0;
      case 1: return hasMeasurements !== null;
      case 2: return clinical.main_goal && clinical.activity_level;
      case 3: return photos.front && photos.side && photos.back;
      case 4: return true;
      default: return false;
    }
  };

  const calculateMetrics = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100; // cm to m
    const bmi = +(w / (h * h)).toFixed(1);
    // Harris-Benedict for women
    const tmb = +(655.1 + 9.563 * w + 1.85 * parseFloat(height) - 4.676 * 30).toFixed(0); // age ~30
    const activityFactors: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
    };
    const factor = activityFactors[clinical.activity_level] || 1.375;
    const get = +(tmb * factor).toFixed(0);
    const deficit = 400;
    const kcalTarget = get - deficit;
    const protein = +(w * 1.8).toFixed(0);
    const fat = +(w * 0.9).toFixed(0);
    const proteinKcal = protein * 4;
    const fatKcal = fat * 9;
    const carbKcal = Math.max(0, kcalTarget - proteinKcal - fatKcal);
    const carbs = +(carbKcal / 4).toFixed(0);

    return { bmi, tmb, get, kcalTarget, protein, carbs, fat };
  };

  const handleNext = async () => {
    if (step === 3) {
      // Calculate and show results
      const calc = calculateMetrics();
      setResults(calc);
      setStep(4);
      return;
    }
    if (step === 4) {
      await finishOnboarding();
      return;
    }
    setStep(s => s + 1);
  };

  const uploadPhoto = async (file: File, position: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${enrollmentId}/${position}.${ext}`;
    const { error } = await supabase.storage.from("enrollment-photos").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = await supabase.storage.from("enrollment-photos").createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  };

  const finishOnboarding = async () => {
    if (!user || !results) return;
    setSaving(true);

    try {
      // Upload photos
      const [frontUrl, sideUrl, backUrl] = await Promise.all([
        uploadPhoto(photos.front!, "front"),
        uploadPhoto(photos.side!, "side"),
        uploadPhoto(photos.back!, "back"),
      ]);

      // Save enrollment photos
      await (supabase as any).from("enrollment_photos").insert({
        enrollment_id: enrollmentId,
        patient_id: user.id,
        phase: 1,
        photo_front_url: frontUrl,
        photo_side_url: sideUrl,
        photo_back_url: backUrl,
      });

      const now = new Date();
      const weightDue = new Date(now.getTime() + 15 * 86400000);
      const reviewDue = new Date(now.getTime() + 30 * 86400000);

      // Update enrollment with all data
      await (supabase as any).from("program_enrollments").update({
        status: "protocol_1_active",
        current_phase: 1,
        initial_weight: parseFloat(weight),
        initial_height: parseFloat(height),
        initial_bmi: results.bmi,
        initial_tmb: results.tmb,
        initial_get: results.get,
        initial_kcal_target: results.kcalTarget,
        initial_protein: results.protein,
        initial_carbs: results.carbs,
        initial_fat: results.fat,
        has_measurements: hasMeasurements,
        measurements: hasMeasurements ? measurements : {},
        clinical_questions: clinical,
        onboarding_completed_at: now.toISOString(),
        last_weight_at: now.toISOString(),
        last_photos_at: now.toISOString(),
        next_weight_due_at: weightDue.toISOString(),
        next_full_review_due_at: reviewDue.toISOString(),
      }).eq("id", enrollmentId);

      // Create initial protocol cycle
      await (supabase as any).from("protocol_cycles").insert({
        enrollment_id: enrollmentId,
        phase: 1,
        protocol_name: "Reset Metabólico",
        status: "active",
        started_at: now.toISOString(),
      });

      // Send notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Protocolo 1 Ativado! 🔄",
        message: `Seu Protocolo 1 — Reset Metabólico foi ativado com sucesso. Próxima atualização de peso em 15 dias. Avaliação completa em 30 dias.`,
        type: "program",
        action_url: "/client/dashboard",
      } as any);

      toast.success("Onboarding completo! Protocolo 1 ativado! 🎉");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar dados");
    } finally {
      setSaving(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Etapa {step + 1} de {STEPS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between">
          {STEPS.map((s, i) => (
            <div key={i} className={`flex flex-col items-center gap-1 ${i <= step ? "text-primary" : "text-muted-foreground/40"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/20 border-2 border-primary" : "bg-muted"}`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              <span className="text-[10px] hidden sm:block">{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* STEP 0: Weight & Height */}
          {step === 0 && (
            <Card className="glass shadow-card">
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <Scale className="w-12 h-12 mx-auto text-primary mb-3" />
                  <h3 className="font-display text-xl font-bold">Peso e Altura</h3>
                  <p className="text-sm text-muted-foreground">Dados obrigatórios para iniciar o programa</p>
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  <div>
                    <Label>Peso (kg)</Label>
                    <Input type="number" step="0.1" placeholder="65.0" value={weight} onChange={e => setWeight(e.target.value)} />
                  </div>
                  <div>
                    <Label>Altura (cm)</Label>
                    <Input type="number" placeholder="165" value={height} onChange={e => setHeight(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 1: Measurements */}
          {step === 1 && (
            <Card className="glass shadow-card">
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <Ruler className="w-12 h-12 mx-auto text-primary mb-3" />
                  <h3 className="font-display text-xl font-bold">Medidas Corporais</h3>
                  <p className="text-sm text-muted-foreground">Você possui suas medidas corporais atuais?</p>
                </div>

                {hasMeasurements === null && (
                  <div className="flex gap-3 justify-center">
                    <Button size="lg" variant="outline" className="gap-2 px-8" onClick={() => setHasMeasurements(true)}>
                      <CheckCircle2 className="w-5 h-5 text-primary" /> Sim, tenho
                    </Button>
                    <Button size="lg" variant="outline" className="gap-2 px-8" onClick={() => setHasMeasurements(false)}>
                      Não tenho, pular
                    </Button>
                  </div>
                )}

                {hasMeasurements === true && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
                    {[
                      { key: "waist", label: "Cintura (cm)" },
                      { key: "abdomen", label: "Abdômen (cm)" },
                      { key: "hip", label: "Quadril (cm)" },
                      { key: "thigh", label: "Coxa (cm)" },
                      { key: "arm", label: "Braço (cm)" },
                      { key: "bust", label: "Busto (cm)" },
                    ].map(f => (
                      <div key={f.key}>
                        <Label className="text-xs">{f.label}</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={(measurements as any)[f.key]}
                          onChange={e => setMeasurements(prev => ({ ...prev, [f.key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {hasMeasurements === false && (
                  <div className="text-center p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground">Sem problema! Você pode adicionar depois. Siga para a próxima etapa.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Clinical Questions */}
          {step === 2 && (
            <Card className="glass shadow-card">
              <CardContent className="p-6 space-y-4">
                <div className="text-center mb-2">
                  <Heart className="w-12 h-12 mx-auto text-primary mb-3" />
                  <h3 className="font-display text-xl font-bold">Perfil Clínico Rápido</h3>
                  <p className="text-sm text-muted-foreground">Informações para personalizar seu protocolo</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                  <div>
                    <Label className="text-xs">Objetivo principal *</Label>
                    <Select value={clinical.main_goal} onValueChange={v => setClinical(p => ({ ...p, main_goal: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lose_fat">Perder gordura</SelectItem>
                        <SelectItem value="tone">Tonificar</SelectItem>
                        <SelectItem value="health">Melhorar saúde</SelectItem>
                        <SelectItem value="define">Definição corporal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Nível de atividade física *</Label>
                    <Select value={clinical.activity_level} onValueChange={v => setClinical(p => ({ ...p, activity_level: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary">Sedentária</SelectItem>
                        <SelectItem value="light">Leve (1-2x/sem)</SelectItem>
                        <SelectItem value="moderate">Moderado (3-4x/sem)</SelectItem>
                        <SelectItem value="active">Ativo (5-6x/sem)</SelectItem>
                        <SelectItem value="very_active">Muito ativo (diário)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Retenção de líquido?</Label>
                    <Select value={clinical.fluid_retention} onValueChange={v => setClinical(p => ({ ...p, fluid_retention: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não</SelectItem>
                        <SelectItem value="mild">Leve</SelectItem>
                        <SelectItem value="moderate">Moderado</SelectItem>
                        <SelectItem value="severe">Intenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Sensação de inchaço?</Label>
                    <Select value={clinical.bloating} onValueChange={v => setClinical(p => ({ ...p, bloating: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Nunca</SelectItem>
                        <SelectItem value="sometimes">Às vezes</SelectItem>
                        <SelectItem value="often">Frequente</SelectItem>
                        <SelectItem value="daily">Diário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Qualidade do sono?</Label>
                    <Select value={clinical.sleep_quality} onValueChange={v => setClinical(p => ({ ...p, sleep_quality: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">Boa</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="poor">Ruim</SelectItem>
                        <SelectItem value="insomnia">Insônia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Constipação?</Label>
                    <Select value={clinical.constipation} onValueChange={v => setClinical(p => ({ ...p, constipation: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">Não</SelectItem>
                        <SelectItem value="occasional">Ocasional</SelectItem>
                        <SelectItem value="frequent">Frequente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Ciclo menstrual regular?</Label>
                    <Select value={clinical.menstrual_regularity} onValueChange={v => setClinical(p => ({ ...p, menstrual_regularity: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="irregular">Irregular</SelectItem>
                        <SelectItem value="absent">Ausente</SelectItem>
                        <SelectItem value="na">Não se aplica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-xs">Maior dificuldade atual</Label>
                    <Textarea
                      placeholder="Ex: compulsão noturna, falta de tempo para cozinhar..."
                      value={clinical.biggest_difficulty}
                      onChange={e => setClinical(p => ({ ...p, biggest_difficulty: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Photos */}
          {step === 3 && (
            <Card className="glass shadow-card">
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <Camera className="w-12 h-12 mx-auto text-primary mb-3" />
                  <h3 className="font-display text-xl font-bold">Fotos Corporais</h3>
                  <p className="text-sm text-muted-foreground">Obrigatório: frente, lado e costas</p>
                </div>

                <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">📸 Instruções:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>Use traje de banho ou roupa curta</li>
                    <li>Postura neutra, braços ao lado do corpo</li>
                    <li>Boa iluminação, fundo claro</li>
                    <li>Mantenha a mesma distância da câmera</li>
                  </ul>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {(["front", "side", "back"] as const).map(position => (
                    <div key={position} className="space-y-2">
                      <Label className="text-xs text-center block capitalize">
                        {position === "front" ? "📷 Frente" : position === "side" ? "📷 Lado" : "📷 Costas"}
                      </Label>
                      <label className="block cursor-pointer">
                        <div className={`aspect-[3/4] rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors ${photoPreview[position] ? "border-primary" : "border-border hover:border-primary/50"}`}>
                          {photoPreview[position] ? (
                            <img src={photoPreview[position]} alt={position} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center p-2">
                              <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                              <p className="text-[10px] text-muted-foreground">Enviar</p>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handlePhotoChange(position, e.target.files?.[0] || null)}
                        />
                      </label>
                      {photos[position] && (
                        <Badge variant="secondary" className="text-[10px] w-full justify-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Enviada
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 4: Results */}
          {step === 4 && results && (
            <Card className="glass shadow-card">
              <CardContent className="p-6 space-y-6">
                <div className="text-center">
                  <Sparkles className="w-12 h-12 mx-auto text-primary mb-3" />
                  <h3 className="font-display text-xl font-bold">Seus Resultados</h3>
                  <p className="text-sm text-muted-foreground">Calculados automaticamente para o Protocolo 1</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                  {[
                    { label: "IMC", value: results.bmi, unit: "", color: "text-blue-500" },
                    { label: "TMB", value: results.tmb, unit: "kcal", color: "text-orange-500" },
                    { label: "GET", value: results.get, unit: "kcal", color: "text-emerald-500" },
                    { label: "Meta Calórica", value: results.kcalTarget, unit: "kcal", color: "text-pink-500" },
                  ].map(m => (
                    <div key={m.label} className="p-3 rounded-xl bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className={`font-display text-lg font-bold ${m.color}`}>{m.value}</p>
                      {m.unit && <p className="text-[10px] text-muted-foreground">{m.unit}</p>}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                  {[
                    { label: "Proteína", value: `${results.protein}g`, color: "text-red-500" },
                    { label: "Carboidrato", value: `${results.carbs}g`, color: "text-amber-500" },
                    { label: "Gordura", value: `${results.fat}g`, color: "text-blue-500" },
                  ].map(m => (
                    <div key={m.label} className="p-3 rounded-xl bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className={`font-display text-lg font-bold ${m.color}`}>{m.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 p-4 text-center">
                  <p className="text-sm font-medium">🔄 Protocolo 1 — Reset Metabólico</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Será ativado ao confirmar. Próxima pesagem em 15 dias. Avaliação completa em 30 dias.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canAdvance() || saving}
          className="gap-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Salvando...
            </>
          ) : step === 4 ? (
            <>Ativar Protocolo 1 <Sparkles className="w-4 h-4" /></>
          ) : (
            <>Próximo <ArrowRight className="w-4 h-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
