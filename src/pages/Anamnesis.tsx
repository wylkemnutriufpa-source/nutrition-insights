import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Sparkles, Check, Heart, Brain, Loader2, UserCheck, Save, Lock, AlertTriangle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SmartPlanCard } from "@/components/patient/AnamnesisInsightsCard";
import { getActiveAdaptiveBlocks, extractClinicalFlags, type AdaptiveBlock } from "@/lib/adaptiveAnamnesisBlocks";

// ──── Question definitions ────
interface Option {
  label: string;
  emoji: string;
  value: string;
}

interface Question {
  id: string;
  title: string;
  subtitle: string;
  type: "single" | "multi" | "slider" | "number" | "text" | "time";
  options?: Option[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
}

const questions: Question[] = [
  {
    id: "goal",
    title: "Qual é o seu objetivo principal?",
    subtitle: "Escolha o que mais importa pra você agora",
    type: "single",
    options: [
      { label: "Emagrecer", emoji: "🔥", value: "lose_weight" },
      { label: "Ganhar massa", emoji: "💪", value: "gain_muscle" },
      { label: "Manter peso", emoji: "⚖️", value: "maintain" },
      { label: "Saúde geral", emoji: "🌿", value: "health" },
    ],
  },
  {
    id: "sex",
    title: "Qual seu sexo biológico?",
    subtitle: "Precisamos disso para calcular sua taxa metabólica",
    type: "single",
    options: [
      { label: "Masculino", emoji: "♂️", value: "male" },
      { label: "Feminino", emoji: "♀️", value: "female" },
    ],
  },
  {
    id: "age",
    title: "Qual a sua idade?",
    subtitle: "Arraste o slider para selecionar",
    type: "slider",
    min: 14,
    max: 80,
    step: 1,
    unit: "anos",
  },
  {
    id: "weight",
    title: "Qual o seu peso atual?",
    subtitle: "Pode ser aproximado",
    type: "number",
    min: 30,
    max: 250,
    unit: "kg",
    placeholder: "Ex: 72",
  },
  {
    id: "height",
    title: "Qual a sua altura?",
    subtitle: "Em centímetros",
    type: "number",
    min: 100,
    max: 230,
    unit: "cm",
    placeholder: "Ex: 170",
  },
  {
    id: "activity_level",
    title: "Qual seu nível de atividade?",
    subtitle: "Pense na sua rotina semanal",
    type: "single",
    options: [
      { label: "Sedentário", emoji: "🛋️", value: "sedentary" },
      { label: "Leve (1-2x/sem)", emoji: "🚶", value: "light" },
      { label: "Moderado (3-5x/sem)", emoji: "🏃", value: "moderate" },
      { label: "Intenso (6-7x/sem)", emoji: "🏋️", value: "intense" },
    ],
  },
  {
    id: "exercise_type",
    title: "Que tipo de exercício você pratica?",
    subtitle: "Selecione todos que se aplicam",
    type: "multi",
    options: [
      { label: "Musculação", emoji: "🏋️", value: "weight_training" },
      { label: "Corrida", emoji: "🏃", value: "running" },
      { label: "Natação", emoji: "🏊", value: "swimming" },
      { label: "Yoga/Pilates", emoji: "🧘", value: "yoga" },
      { label: "Esportes coletivos", emoji: "⚽", value: "team_sports" },
      { label: "Nenhum", emoji: "😴", value: "none" },
    ],
  },
  // ──── NEW: Energy, Sleep, Digestion ────
  {
    id: "energy_level",
    title: "Como está seu nível de energia?",
    subtitle: "No geral, como você se sente ao longo do dia",
    type: "single",
    options: [
      { label: "Muito baixo", emoji: "😩", value: "very_low" },
      { label: "Baixo", emoji: "😔", value: "low" },
      { label: "Normal", emoji: "😊", value: "normal" },
      { label: "Alto", emoji: "⚡", value: "high" },
    ],
  },
  {
    id: "sleep_quality",
    title: "Como é a qualidade do seu sono?",
    subtitle: "Pense nas últimas semanas",
    type: "single",
    options: [
      { label: "Péssima", emoji: "😵", value: "terrible" },
      { label: "Ruim", emoji: "😴", value: "bad" },
      { label: "Regular", emoji: "😐", value: "regular" },
      { label: "Boa", emoji: "😌", value: "good" },
      { label: "Excelente", emoji: "💤", value: "excellent" },
    ],
  },
  {
    id: "digestion",
    title: "Como está sua digestão?",
    subtitle: "Intestino, gases, inchaço...",
    type: "single",
    options: [
      { label: "Muito ruim", emoji: "😣", value: "very_bad" },
      { label: "Irregular", emoji: "🔄", value: "irregular" },
      { label: "Normal", emoji: "👍", value: "normal" },
      { label: "Excelente", emoji: "✨", value: "excellent" },
    ],
  },
  {
    id: "hunger_compulsion",
    title: "Sente fome excessiva ou compulsão?",
    subtitle: "Episódios de comer demais sem controle",
    type: "single",
    options: [
      { label: "Sempre", emoji: "🍕", value: "always" },
      { label: "Frequente", emoji: "😰", value: "frequent" },
      { label: "Às vezes", emoji: "🤔", value: "sometimes" },
      { label: "Raramente", emoji: "😌", value: "rarely" },
      { label: "Nunca", emoji: "✅", value: "never" },
    ],
  },
  // ──── NEW: Symptoms ────
  {
    id: "symptoms",
    title: "Apresenta algum desses sintomas?",
    subtitle: "Selecione todos que se aplicam",
    type: "multi",
    options: [
      { label: "Inchaço", emoji: "🎈", value: "bloating" },
      { label: "Fadiga", emoji: "😩", value: "fatigue" },
      { label: "Dor de cabeça", emoji: "🤕", value: "headache" },
      { label: "Ansiedade", emoji: "😰", value: "anxiety" },
      { label: "Insônia", emoji: "🌙", value: "insomnia" },
      { label: "Nenhum", emoji: "✅", value: "none" },
    ],
  },
  {
    id: "restrictions",
    title: "Tem alguma restrição alimentar?",
    subtitle: "Selecione todas que se aplicam",
    type: "multi",
    options: [
      { label: "Vegetariano", emoji: "🥬", value: "vegetarian" },
      { label: "Vegano", emoji: "🌱", value: "vegan" },
      { label: "Sem glúten", emoji: "🌾", value: "gluten_free" },
      { label: "Sem lactose", emoji: "🥛", value: "lactose_free" },
      { label: "Low carb", emoji: "🥑", value: "low_carb" },
      { label: "Nenhuma", emoji: "✅", value: "none" },
    ],
  },
  {
    id: "allergies",
    title: "Possui alguma alergia alimentar?",
    subtitle: "Selecione todas que se aplicam",
    type: "multi",
    options: [
      { label: "Amendoim", emoji: "🥜", value: "peanut" },
      { label: "Frutos do mar", emoji: "🦐", value: "seafood" },
      { label: "Ovos", emoji: "🥚", value: "eggs" },
      { label: "Soja", emoji: "🫘", value: "soy" },
      { label: "Leite", emoji: "🥛", value: "milk" },
      { label: "Nenhuma", emoji: "✅", value: "none" },
    ],
  },
  {
    id: "health_conditions",
    title: "Alguma condição de saúde?",
    subtitle: "Isso nos ajuda a personalizar seu plano",
    type: "multi",
    options: [
      { label: "Diabetes", emoji: "💉", value: "diabetes" },
      { label: "Hipertensão", emoji: "❤️‍🩹", value: "hypertension" },
      { label: "Colesterol alto", emoji: "🫀", value: "high_cholesterol" },
      { label: "Hipotireoidismo", emoji: "🦋", value: "hypothyroidism" },
      { label: "Nenhuma", emoji: "✅", value: "none" },
    ],
  },
  // ──── NEW: Clinical history, meds, limitations, pregnancy ────
  {
    id: "clinical_history",
    title: "Histórico clínico relevante?",
    subtitle: "Cirurgias, internações, doenças passadas...",
    type: "text",
    placeholder: "Ex: Cirurgia bariátrica em 2020, gastrite crônica...",
  },
  {
    id: "medications",
    title: "Usa algum medicamento atualmente?",
    subtitle: "Inclua suplementos também",
    type: "text",
    placeholder: "Ex: Puran T4, Metformina, Ômega 3...",
  },
  {
    id: "physical_limitations",
    title: "Tem alguma limitação física?",
    subtitle: "Lesões, dores articulares, mobilidade...",
    type: "text",
    placeholder: "Ex: Hérnia lombar, tendinite no ombro...",
  },
  {
    id: "pregnancy_status",
    title: "Gestação ou pós-parto?",
    subtitle: "Selecione se aplicável",
    type: "single",
    options: [
      { label: "Não se aplica", emoji: "➖", value: "not_applicable" },
      { label: "Gestante", emoji: "🤰", value: "pregnant" },
      { label: "Pós-parto (<6m)", emoji: "👶", value: "postpartum_recent" },
      { label: "Pós-parto (6m+)", emoji: "🍼", value: "postpartum_late" },
    ],
  },
  {
    id: "wake_time",
    title: "Que horas você costuma acordar?",
    subtitle: "Sua rotina influencia os horários das refeições",
    type: "time",
    placeholder: "06:30",
  },
  {
    id: "sleep_time",
    title: "Que horas você costuma dormir?",
    subtitle: "Sono é fundamental para resultados",
    type: "time",
    placeholder: "23:00",
  },
  {
    id: "water_intake",
    title: "Quantos copos de água por dia?",
    subtitle: "1 copo ≈ 250ml",
    type: "slider",
    min: 1,
    max: 15,
    step: 1,
    unit: "copos",
  },
  {
    id: "cooking_preference",
    title: "Como você prefere suas refeições?",
    subtitle: "Isso define a complexidade das receitas",
    type: "single",
    options: [
      { label: "Praticidade total", emoji: "⚡", value: "quick" },
      { label: "Caseira simples", emoji: "🏠", value: "homemade" },
      { label: "Gourmet elaborada", emoji: "👨‍🍳", value: "gourmet" },
      { label: "Tanto faz", emoji: "🤷", value: "any" },
    ],
  },
  {
    id: "budget",
    title: "Qual seu orçamento mensal com alimentação?",
    subtitle: "Isso ajuda a sugerir alimentos acessíveis",
    type: "single",
    options: [
      { label: "Econômico", emoji: "💰", value: "low" },
      { label: "Moderado", emoji: "💳", value: "medium" },
      { label: "Sem limite", emoji: "💎", value: "high" },
    ],
  },
  {
    id: "meals_per_day",
    title: "Quantas refeições faz por dia hoje?",
    subtitle: "Sem contar lanches rápidos",
    type: "single",
    options: [
      { label: "2-3 refeições", emoji: "2️⃣", value: "2-3" },
      { label: "4-5 refeições", emoji: "4️⃣", value: "4-5" },
      { label: "6+ refeições", emoji: "6️⃣", value: "6+" },
    ],
  },
  // ──── Meal Schedule / Timing ────
  {
    id: "breakfast_time",
    title: "Que horas você toma café da manhã?",
    subtitle: "Horário habitual da sua primeira refeição",
    type: "time",
    placeholder: "07:00",
  },
  {
    id: "has_morning_snack",
    title: "Você faz lanche da manhã?",
    subtitle: "Costuma comer algo entre o café e o almoço?",
    type: "single",
    options: [
      { label: "Sim, sempre", emoji: "✅", value: "always" },
      { label: "Às vezes", emoji: "🤔", value: "sometimes" },
      { label: "Não faço", emoji: "❌", value: "never" },
    ],
  },
  {
    id: "morning_snack_time",
    title: "Que horas faz o lanche da manhã?",
    subtitle: "Horário aproximado",
    type: "time",
    placeholder: "10:00",
  },
  {
    id: "lunch_time",
    title: "Que horas você almoça?",
    subtitle: "Horário habitual do almoço",
    type: "time",
    placeholder: "12:30",
  },
  {
    id: "has_afternoon_snack",
    title: "Você faz lanche da tarde?",
    subtitle: "Costuma comer algo entre o almoço e o jantar?",
    type: "single",
    options: [
      { label: "Sim, 1 lanche", emoji: "1️⃣", value: "one" },
      { label: "Sim, 2 lanches", emoji: "2️⃣", value: "two" },
      { label: "Às vezes", emoji: "🤔", value: "sometimes" },
      { label: "Não faço", emoji: "❌", value: "never" },
    ],
  },
  {
    id: "afternoon_snack_time",
    title: "Que horas faz o lanche da tarde?",
    subtitle: "Horário aproximado do(s) lanche(s)",
    type: "time",
    placeholder: "15:30",
  },
  {
    id: "has_dinner",
    title: "Você janta?",
    subtitle: "Costuma fazer uma refeição principal à noite?",
    type: "single",
    options: [
      { label: "Sim, sempre", emoji: "✅", value: "always" },
      { label: "Às vezes", emoji: "🤔", value: "sometimes" },
      { label: "Não janto", emoji: "❌", value: "never" },
    ],
  },
  {
    id: "dinner_time",
    title: "Que horas você janta?",
    subtitle: "Horário habitual do jantar",
    type: "time",
    placeholder: "19:30",
  },
  {
    id: "has_supper",
    title: "Você faz ceia?",
    subtitle: "Come algo antes de dormir?",
    type: "single",
    options: [
      { label: "Sim, sempre", emoji: "✅", value: "always" },
      { label: "Às vezes", emoji: "🤔", value: "sometimes" },
      { label: "Não faço", emoji: "❌", value: "never" },
    ],
  },
  {
    id: "supper_time",
    title: "Que horas faz a ceia?",
    subtitle: "Horário aproximado",
    type: "time",
    placeholder: "21:30",
  },
  {
    id: "disliked_foods",
    title: "Alimentos que você NÃO gosta?",
    subtitle: "Escreva separado por vírgula",
    type: "text",
    placeholder: "Ex: berinjela, jiló, fígado...",
  },
  {
    id: "favorite_foods",
    title: "Alimentos favoritos?",
    subtitle: "Vamos incluir no seu plano 😋",
    type: "text",
    placeholder: "Ex: frango, arroz, banana, abacate...",
  },
  {
    id: "feeling",
    title: "Como você se sente com sua alimentação?",
    subtitle: "Seja honesto(a), é só pra gente entender melhor",
    type: "single",
    options: [
      { label: "Péssimo", emoji: "😢", value: "terrible" },
      { label: "Ruim", emoji: "😕", value: "bad" },
      { label: "Ok", emoji: "😐", value: "ok" },
      { label: "Bem", emoji: "😊", value: "good" },
      { label: "Ótimo", emoji: "🤩", value: "great" },
    ],
  },
  {
    id: "motivation",
    title: "O que mais te motiva a mudar?",
    subtitle: "Última pergunta! Escolha sua motivação principal",
    type: "single",
    options: [
      { label: "Saúde", emoji: "❤️", value: "health" },
      { label: "Estética", emoji: "✨", value: "aesthetics" },
      { label: "Performance", emoji: "🏆", value: "performance" },
      { label: "Autoestima", emoji: "🦸", value: "self_esteem" },
    ],
  },
];

// ──── Card components ────
function OptionCard({
  opt,
  selected,
  onClick,
}: {
  opt: Option;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
        selected
          ? "border-primary bg-primary/10 shadow-glow"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-primary-foreground" />
        </motion.div>
      )}
      <span className="text-3xl">{opt.emoji}</span>
      <span className="text-sm font-medium text-foreground">{opt.label}</span>
    </motion.button>
  );
}

function SliderInput({
  value, onChange, min, max, step, unit,
}: {
  value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; unit: string;
}) {
  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="text-center">
        <span className="text-5xl font-display font-bold text-primary">{value}</span>
        <span className="text-xl text-muted-foreground ml-2">{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
}

// ──── Main page ────
export default function Anamnesis() {
  const { user, isNutritionist } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forPatientId = searchParams.get("patientId");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [patientName, setPatientName] = useState<string>("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showAdaptiveBlocks, setShowAdaptiveBlocks] = useState(false);
  const [adaptiveStep, setAdaptiveStep] = useState(0);
  const [onboardingBlocked, setOnboardingBlocked] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The target user: either the patient themselves or the patient being filled by nutritionist
  const targetUserId = forPatientId || user?.id;
  const isNutritionistMode = isNutritionist && !!forPatientId;

  const q = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  // Fetch patient name if nutritionist mode
  useEffect(() => {
    if (isNutritionistMode && forPatientId) {
      supabase.from("profiles").select("full_name").eq("user_id", forPatientId).maybeSingle()
        .then(({ data }) => setPatientName(data?.full_name || "Paciente"));
    }
  }, [isNutritionistMode, forPatientId]);

  // Check if onboarding is released for patient (non-nutritionist mode)
  useEffect(() => {
    if (isNutritionistMode || !targetUserId) return;
    supabase
      .from("onboarding_pipelines")
      .select("release_status")
      .eq("patient_id", targetUserId)
      .not("status", "in", '("completed","superseded_by_active_plan","superseded_by_published_plan")')
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).release_status !== "released") {
          setOnboardingBlocked(true);
        }
      });
  }, [targetUserId, isNutritionistMode]);

  // Load existing draft on mount
  useEffect(() => {
    if (!targetUserId) return;
    supabase
      .from("patient_anamnesis")
      .select("id, status, answers")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.status === "completed") {
          setCompleted(true);
          setDraftId(data[0].id);
          const savedAnswers = data[0].answers as Record<string, any>;
          if (savedAnswers) setAnswers(savedAnswers);
        } else if (data?.[0]?.status === "draft") {
          // Restore draft
          setDraftId(data[0].id);
          const savedAnswers = data[0].answers as Record<string, any>;
          if (savedAnswers && Object.keys(savedAnswers).length > 0) {
            setAnswers(savedAnswers);
            // Jump to last answered question
            const lastIdx = questions.findIndex((q) => !(q.id in savedAnswers));
            if (lastIdx > 0) setStep(lastIdx);
            else if (lastIdx === -1) setStep(questions.length - 1);
            toast.info("Rascunho restaurado! Continue de onde parou 📝");
          }
        }
      });
  }, [targetUserId]);

  const handleEditAnamnesis = () => {
    setCompleted(false);
    setAnalyzing(false);
    setStep(0);
    toast.info("Modo edição ativado! Revise suas respostas ✏️");
  };

  // Autosave function
  const performAutoSave = useCallback(async (currentAnswers: Record<string, any>) => {
    if (!targetUserId || !user || Object.keys(currentAnswers).length === 0) return;
    setAutoSaveStatus("saving");

    try {
      if (draftId) {
        await supabase
          .from("patient_anamnesis")
          .update({ answers: currentAnswers, updated_at: new Date().toISOString() })
          .eq("id", draftId);
      } else {
        const { data } = await supabase
          .from("patient_anamnesis")
          .insert({
            user_id: targetUserId,
            answers: currentAnswers,
            status: "draft",
          })
          .select("id")
          .single();
        if (data) setDraftId(data.id);
      }
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    } catch {
      setAutoSaveStatus("idle");
    }
  }, [targetUserId, user, draftId]);

  // Debounced autosave on answers change
  useEffect(() => {
    if (Object.keys(answers).length === 0 || completed) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      performAutoSave(answers);
    }, 1500);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [answers, performAutoSave, completed]);

  const setAnswer = (value: any) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
  };

  const toggleMulti = (value: string) => {
    const current: string[] = answers[q.id] || [];
    if (value === "none") {
      setAnswer(["none"]);
      return;
    }
    const filtered = current.filter((v) => v !== "none");
    if (filtered.includes(value)) {
      setAnswer(filtered.filter((v) => v !== value));
    } else {
      setAnswer([...filtered, value]);
    }
  };

  const canNext = () => {
    const val = answers[q.id];
    if (!val) return false;
    if (q.type === "multi" && Array.isArray(val) && val.length === 0) return false;
    if (q.type === "number" && (!val || isNaN(Number(val)))) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!user || !targetUserId) return;
    setSubmitting(true);

    // Compute TMB (Harris-Benedict)
    const sex = answers.sex;
    const age = answers.age || 25;
    const weight = Number(answers.weight) || 70;
    const height = Number(answers.height) || 170;
    let tmb: number;

    if (sex === "male") {
      tmb = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
    } else {
      tmb = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
    }

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, intense: 1.725,
    };
    const multiplier = activityMultipliers[answers.activity_level] || 1.375;
    let kcalTarget = Math.round(tmb * multiplier);

    if (answers.goal === "lose_weight") kcalTarget = Math.round(kcalTarget * 0.8);
    else if (answers.goal === "gain_muscle") kcalTarget = Math.round(kcalTarget * 1.15);

    const protein = Math.round((kcalTarget * 0.3) / 4);
    const carbs = Math.round((kcalTarget * 0.45) / 4);
    const fat = Math.round((kcalTarget * 0.25) / 9);

    // Extract clinical flags from adaptive blocks
    const clinicalFlags = extractClinicalFlags(answers);

    const payload = {
      user_id: targetUserId,
      answers,
      computed_tmb: Math.round(tmb),
      computed_kcal_target: kcalTarget,
      computed_protein: protein,
      computed_carbs: carbs,
      computed_fat: fat,
      clinical_flags: clinicalFlags,
      status: "completed",
    };

    let anamData: any;
    if (draftId) {
      // Update existing draft to completed
      const { data, error } = await supabase
        .from("patient_anamnesis")
        .update(payload)
        .eq("id", draftId)
        .select()
        .single();
      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        setSubmitting(false);
        return;
      }
      anamData = data;
    } else {
      const { data, error } = await supabase
        .from("patient_anamnesis")
        .insert(payload)
        .select()
        .single();
      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        setSubmitting(false);
        return;
      }
      anamData = data;
    }

    toast.success("Anamnese salva! Gerando análise inteligente... 🧠");
    setSubmitting(false);
    setAnalyzing(true);

    // Trigger AI analysis
    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke("analyze-anamnesis", {
        body: { anamnesis_id: anamData.id },
      });

      if (aiError) throw aiError;
      if (aiData?.error) throw new Error(aiData.error);

      setAiResult(aiData);
      toast.success(`Análise concluída! ${aiData.tips_count} dicas e ${aiData.recommendations_count} recomendações geradas! ✨`);
    } catch (e: any) {
      console.error("AI analysis error:", e);
      toast.error("Anamnese salva, mas a análise de IA falhou: " + (e.message || "Erro desconhecido"));
    }

    setAnalyzing(false);
    setCompleted(true);

    // Update onboarding pipeline if active
    const isPipelineMode = searchParams.get("pipeline") === "true";
    if (isPipelineMode) {
      await supabase
        .from("onboarding_pipelines" as any)
        .update({
          anamnesis_completed: true,
          status: "pending_body_data",
          weight: weight,
          height: height,
        } as any)
        .eq("patient_id", targetUserId);
    }
  };

  // Blocked state — onboarding not released
  if (onboardingBlocked && !isNutritionistMode) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center">
            <Lock className="w-10 h-10 text-warning" />
          </div>
          <h1 className="font-display text-2xl font-bold">Aguardando Ativação Clínica</h1>
          <p className="text-muted-foreground max-w-md">
            Seu nutricionista precisa liberar o onboarding antes que você possa preencher a anamnese.
            Isso garante que sua jornada seja personalizada e alinhada ao seu plano de atendimento.
          </p>
          <div className="p-4 rounded-xl bg-muted/30 border border-border text-sm text-muted-foreground">
            <AlertTriangle className="w-4 h-4 inline mr-1.5 text-warning" />
            Entre em contato com seu profissional caso já tenha realizado o pagamento.
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Voltar ao Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Compute active adaptive blocks based on current answers
  const activeAdaptiveBlocks = getActiveAdaptiveBlocks(answers);
  const allAdaptiveQuestions = activeAdaptiveBlocks.flatMap((b) => b.questions);

  if (completed) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
              {analyzing ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center min-h-[60vh] text-center"
                >
              <div className="relative mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary"
                />
                <Brain className="w-10 h-10 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Analisando sua anamnese...</h2>
              <p className="text-muted-foreground max-w-md">
                Nossa IA está processando suas respostas para criar um plano personalizado com dicas,
                recomendações e focos iniciais de tratamento.
              </p>
              <div className="flex items-center gap-2 mt-4 text-sm text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando com inteligência artificial...
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center mb-6 shadow-glow"
                >
                  <Heart className="w-12 h-12 text-primary-foreground" />
                </motion.div>
                <h1 className="font-display text-3xl font-bold mb-2">Anamnese Inteligente Concluída!</h1>
                <p className="text-muted-foreground max-w-md">
                  {aiResult
                    ? `${aiResult.summary || "Sua análise foi gerada com sucesso."}`
                    : "Seu nutricionista receberá seus dados e criará um plano personalizado."}
                </p>
              </div>

              {/* Show smart plan card if AI was successful */}
              <SmartPlanCard />

              {/* AI Stats */}
              {aiResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-3 gap-3"
                >
                  <div className="glass rounded-xl p-4 text-center">
                    <span className="text-2xl">💡</span>
                    <p className="font-display font-bold text-xl mt-1">{aiResult.tips_count}</p>
                    <p className="text-xs text-muted-foreground">Dicas geradas</p>
                  </div>
                  <div className="glass rounded-xl p-4 text-center">
                    <span className="text-2xl">🎯</span>
                    <p className="font-display font-bold text-xl mt-1">{aiResult.recommendations_count}</p>
                    <p className="text-xs text-muted-foreground">Recomendações</p>
                  </div>
                  <div className="glass rounded-xl p-4 text-center">
                    <span className="text-2xl">
                      {aiResult.risk_level === "high" ? "🔴" : aiResult.risk_level === "medium" ? "🟡" : "🟢"}
                    </span>
                    <p className="font-display font-bold text-xl mt-1 capitalize">
                      {aiResult.risk_level === "high" ? "Alto" : aiResult.risk_level === "medium" ? "Médio" : "Baixo"}
                    </p>
                    <p className="text-xs text-muted-foreground">Nível atenção</p>
                  </div>
                </motion.div>
              )}

              <div className="flex flex-col gap-3">
                <Button onClick={handleEditAnamnesis} variant="outline" className="w-full gap-2">
                  ✏️ Revisar / Editar Respostas
                </Button>
                <Button onClick={() => navigate(isNutritionistMode ? `/patients/${forPatientId}` : "/")} className="w-full gradient-primary shadow-glow">
                  {isNutritionistMode ? "Voltar ao Paciente" : "Voltar ao Dashboard"}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Nutritionist Mode Banner */}
        {isNutritionistMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3"
          >
            <UserCheck className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Modo Profissional — Preenchendo para: <span className="text-primary">{patientName}</span></p>
              <p className="text-xs text-muted-foreground">Consulta presencial: preencha a anamnese com base nas respostas do paciente.</p>
            </div>
          </motion.div>
        )}

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Pergunta {step + 1} de {questions.length}
            </span>
            <div className="flex items-center gap-3">
              {autoSaveStatus === "saving" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                </span>
              )}
              {autoSaveStatus === "saved" && (
                <span className="flex items-center gap-1 text-xs text-success">
                  <Save className="w-3 h-3" /> Salvo
                </span>
              )}
              <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-bold mb-1">{q.title}</h2>
              <p className="text-muted-foreground">{q.subtitle}</p>
            </div>

            {q.type === "single" && q.options && (
              <div className={`grid gap-3 ${q.options.length <= 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}>
                {q.options.map((opt) => (
                  <OptionCard key={opt.value} opt={opt} selected={answers[q.id] === opt.value} onClick={() => setAnswer(opt.value)} />
                ))}
              </div>
            )}

            {q.type === "multi" && q.options && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {q.options.map((opt) => (
                  <OptionCard key={opt.value} opt={opt} selected={(answers[q.id] || []).includes(opt.value)} onClick={() => toggleMulti(opt.value)} />
                ))}
              </div>
            )}

            {q.type === "slider" && (
              <SliderInput
                value={answers[q.id] ?? q.min ?? 1}
                onChange={(v) => setAnswer(v)}
                min={q.min || 0} max={q.max || 100} step={q.step || 1} unit={q.unit || ""}
              />
            )}

            {q.type === "number" && (
              <div className="max-w-xs mx-auto space-y-2">
                <div className="relative">
                  <input
                    type="number" value={answers[q.id] || ""} onChange={(e) => setAnswer(e.target.value)}
                    placeholder={q.placeholder} min={q.min} max={q.max}
                    className="w-full text-center text-4xl font-display font-bold bg-card border-2 border-border rounded-2xl px-6 py-4 focus:border-primary focus:outline-none transition-colors"
                  />
                  {q.unit && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">{q.unit}</span>
                  )}
                </div>
              </div>
            )}

            {q.type === "text" && (
              <div className="max-w-md mx-auto">
                <textarea
                  value={answers[q.id] || ""} onChange={(e) => setAnswer(e.target.value)}
                  placeholder={q.placeholder} rows={3}
                  className="w-full bg-card border-2 border-border rounded-2xl px-4 py-3 focus:border-primary focus:outline-none transition-colors resize-none text-sm"
                />
              </div>
            )}

            {q.type === "time" && (
              <div className="max-w-xs mx-auto">
                <input
                  type="time" value={answers[q.id] || ""} onChange={(e) => setAnswer(e.target.value)}
                  className="w-full text-center text-4xl font-display font-bold bg-card border-2 border-border rounded-2xl px-6 py-4 focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                // Skip back over conditional time questions that were skipped
                const prevStep = step - 1;
                const prevQ = questions[prevStep];
                const shouldSkip = (
                  (prevQ?.id === "morning_snack_time" && answers.has_morning_snack === "never") ||
                  (prevQ?.id === "afternoon_snack_time" && answers.has_afternoon_snack === "never") ||
                  (prevQ?.id === "dinner_time" && answers.has_dinner === "never") ||
                  (prevQ?.id === "supper_time" && answers.has_supper === "never")
                );
                setStep(Math.max(0, shouldSkip ? prevStep - 1 : prevStep));
              }}
              disabled={step === 0}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await performAutoSave(answers);
                toast.success("Rascunho salvo! Você pode continuar depois 💾");
                if (isNutritionistMode && forPatientId) {
                  navigate(`/patients/${forPatientId}`);
                } else {
                  navigate("/");
                }
              }}
              className="gap-1.5 text-muted-foreground"
            >
              <Save className="w-4 h-4" /> Salvar e sair
            </Button>
          </div>

          {step < questions.length - 1 ? (
            <Button
              onClick={() => {
                // Skip conditional time questions when user says "never"
                const nextStep = step + 1;
                const nextQ = questions[nextStep];
                const shouldSkip = (
                  (nextQ?.id === "morning_snack_time" && answers.has_morning_snack === "never") ||
                  (nextQ?.id === "afternoon_snack_time" && answers.has_afternoon_snack === "never") ||
                  (nextQ?.id === "dinner_time" && answers.has_dinner === "never") ||
                  (nextQ?.id === "supper_time" && answers.has_supper === "never")
                );
                setStep(shouldSkip ? nextStep + 1 : nextStep);
              }}
              disabled={!canNext()}
              className="gradient-primary gap-1 shadow-glow"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canNext() || submitting}
              className="gradient-primary gap-2 shadow-glow"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? "Salvando..." : "Concluir Anamnese ✨"}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
