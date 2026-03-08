import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Sparkles, Check, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

// ──── Card components for each question type ────
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
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="text-center">
        <span className="text-5xl font-display font-bold text-primary">{value}</span>
        <span className="text-xl text-muted-foreground ml-2">{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const q = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  // Check if already completed
  useEffect(() => {
    if (!user) return;
    supabase
      .from("patient_anamnesis")
      .select("id, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.status === "completed") setCompleted(true);
      });
  }, [user]);

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
    if (!user) return;
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
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      intense: 1.725,
    };
    const multiplier = activityMultipliers[answers.activity_level] || 1.375;
    let kcalTarget = Math.round(tmb * multiplier);

    // Adjust based on goal
    if (answers.goal === "lose_weight") kcalTarget = Math.round(kcalTarget * 0.8);
    else if (answers.goal === "gain_muscle") kcalTarget = Math.round(kcalTarget * 1.15);

    // Macro split
    const protein = Math.round((kcalTarget * 0.3) / 4);
    const carbs = Math.round((kcalTarget * 0.45) / 4);
    const fat = Math.round((kcalTarget * 0.25) / 9);

    const { error } = await supabase.from("patient_anamnesis").insert({
      user_id: user.id,
      answers,
      computed_tmb: Math.round(tmb),
      computed_kcal_target: kcalTarget,
      computed_protein: protein,
      computed_carbs: carbs,
      computed_fat: fat,
      status: "completed",
    });

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Anamnese concluída! 🎉");
      setCompleted(true);
    }
    setSubmitting(false);
  };

  if (completed) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center mb-6 shadow-glow"
          >
            <Heart className="w-12 h-12 text-primary-foreground" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold mb-2">Anamnese concluída!</h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            Seu nutricionista receberá seus dados e criará um plano personalizado com base nas suas respostas.
          </p>
          <Button onClick={() => navigate("/")} className="gradient-primary shadow-glow">
            Voltar ao Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Pergunta {step + 1} de {questions.length}
            </span>
            <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
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

            {/* Single select */}
            {q.type === "single" && q.options && (
              <div className={`grid gap-3 ${q.options.length <= 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}>
                {q.options.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    opt={opt}
                    selected={answers[q.id] === opt.value}
                    onClick={() => setAnswer(opt.value)}
                  />
                ))}
              </div>
            )}

            {/* Multi select */}
            {q.type === "multi" && q.options && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {q.options.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    opt={opt}
                    selected={(answers[q.id] || []).includes(opt.value)}
                    onClick={() => toggleMulti(opt.value)}
                  />
                ))}
              </div>
            )}

            {/* Slider */}
            {q.type === "slider" && (
              <SliderInput
                value={answers[q.id] ?? q.min ?? 1}
                onChange={(v) => setAnswer(v)}
                min={q.min || 0}
                max={q.max || 100}
                step={q.step || 1}
                unit={q.unit || ""}
              />
            )}

            {/* Number input */}
            {q.type === "number" && (
              <div className="max-w-xs mx-auto space-y-2">
                <div className="relative">
                  <input
                    type="number"
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={q.placeholder}
                    min={q.min}
                    max={q.max}
                    className="w-full text-center text-4xl font-display font-bold bg-card border-2 border-border rounded-2xl px-6 py-4 focus:border-primary focus:outline-none transition-colors"
                  />
                  {q.unit && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                      {q.unit}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Text input */}
            {q.type === "text" && (
              <div className="max-w-md mx-auto">
                <textarea
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={q.placeholder}
                  rows={3}
                  className="w-full bg-card border-2 border-border rounded-2xl px-4 py-3 focus:border-primary focus:outline-none transition-colors resize-none text-sm"
                />
              </div>
            )}

            {/* Time input */}
            {q.type === "time" && (
              <div className="max-w-xs mx-auto">
                <input
                  type="time"
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full text-center text-4xl font-display font-bold bg-card border-2 border-border rounded-2xl px-6 py-4 focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Button>

          {step < questions.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
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
              {submitting ? "Finalizando..." : "Concluir Anamnese"}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
