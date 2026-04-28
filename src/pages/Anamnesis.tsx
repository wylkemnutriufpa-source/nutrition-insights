import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NeuralStepTransition } from "@/components/ui/neural-transitions";
import { ProgressPulse } from "@/components/ui/micro-interactions";
import { useAuth } from "@/lib/auth";
import { useConsentGuard } from "@/hooks/useConsentGuard";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Sparkles, Check, Heart, Brain, Loader2, UserCheck, Save, Lock, AlertTriangle, ArrowRight, History, RefreshCcw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTenant } from "@/lib/tenantContext";
import { useAppState } from "@/hooks/useAppState";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { getBackupValidity, getConflictVersionKey, fjLog, validateSystemState } from "@/utils/dataSafety";


import { SmartPlanCard } from "@/components/patient/AnamnesisInsightsCard";
import OnboardingExitGuard from "@/components/onboarding/OnboardingExitGuard";
import { getActiveAdaptiveBlocks, extractClinicalFlags, type AdaptiveBlock } from "@/lib/adaptiveAnamnesisBlocks";
import { processAnamnesisFlags } from "@/lib/clinicalFlags";
import { RadialOrbitalSelector, type OrbitalOption as RadialOption } from "@/components/ui/radial-orbital-selector";
import {
  OrbitalMultiSelect,
  OrbitalSlider,
  OrbitalNumberInput,
  OrbitalTextInput,
  OrbitalTimeInput,
} from "@/components/onboarding/OrbitalAnamnesisInputs";

// ──── Question definitions ────
interface Option {
  label: string;
  emoji: string;
  value: string;
  description?: string;
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
      { label: "Emagrecer", emoji: "🔥", value: "lose_weight", description: "Redução de gordura corporal com preservação de massa magra e saúde metabólica" },
      { label: "Ganhar massa", emoji: "💪", value: "gain_muscle", description: "Foco em hipertrofia muscular com aporte calórico e proteico estratégico" },
      { label: "Manter peso", emoji: "⚖️", value: "maintain", description: "Equilíbrio e manutenção da composição corporal atual com bons hábitos" },
      { label: "Saúde geral", emoji: "🌿", value: "health", description: "Bem-estar, energia e prevenção de problemas clínicos para qualidade de vida" },
    ],
  },
  {
    id: "sex",
    title: "Qual seu sexo biológico?",
    subtitle: "Precisamos disso para calcular sua taxa metabólica",
    type: "single",
    options: [
      { label: "Masculino", emoji: "♂️", value: "male", description: "Cálculos de TMB e necessidades calóricas baseados no perfil masculino" },
      { label: "Feminino", emoji: "♀️", value: "female", description: "Cálculos adaptados ao perfil feminino, incluindo ciclo hormonal" },
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
      { label: "Sedentário", emoji: "🛋️", value: "sedentary", description: "Pouca ou nenhuma atividade física, rotina predominantemente sentada" },
      { label: "Leve (1-2x/sem)", emoji: "🚶", value: "light", description: "Caminhadas leves ou exercícios esporádicos durante a semana" },
      { label: "Moderado (3-5x/sem)", emoji: "🏃", value: "moderate", description: "Treinos regulares com intensidade moderada ao longo da semana" },
      { label: "Intenso (6-7x/sem)", emoji: "🏋️", value: "intense", description: "Treinos de alta intensidade quase todos os dias da semana" },
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
      { label: "Muito baixo", emoji: "😩", value: "very_low", description: "Cansaço constante, dificuldade para realizar atividades do dia a dia" },
      { label: "Baixo", emoji: "😔", value: "low", description: "Sente fadiga frequente, especialmente à tarde ou após refeições" },
      { label: "Normal", emoji: "😊", value: "normal", description: "Energia estável durante o dia, sem grandes oscilações" },
      { label: "Alto", emoji: "⚡", value: "high", description: "Energia constante e disposição para atividades físicas e mentais" },
    ],
  },
  {
    id: "sleep_quality",
    title: "Como é a qualidade do seu sono?",
    subtitle: "Pense nas últimas semanas",
    type: "single",
    options: [
      { label: "Péssima", emoji: "😵", value: "terrible", description: "Insônia frequente, acordar várias vezes ou não descansar" },
      { label: "Ruim", emoji: "😴", value: "bad", description: "Dificuldade para dormir ou acordar cansado(a) com frequência" },
      { label: "Regular", emoji: "😐", value: "regular", description: "Consegue dormir, mas nem sempre acorda descansado(a)" },
      { label: "Boa", emoji: "😌", value: "good", description: "Dorme bem na maioria das noites e acorda disposto(a)" },
      { label: "Excelente", emoji: "💤", value: "excellent", description: "Sono profundo e reparador, acorda com energia total" },
    ],
  },
  {
    id: "digestion",
    title: "Como está sua digestão?",
    subtitle: "Intestino, gases, inchaço...",
    type: "single",
    options: [
      { label: "Muito ruim", emoji: "😣", value: "very_bad", description: "Desconforto digestivo constante, constipação ou diarreia frequente" },
      { label: "Irregular", emoji: "🔄", value: "irregular", description: "Intestino instável, alterna entre funcionamento normal e irregular" },
      { label: "Normal", emoji: "👍", value: "normal", description: "Digestão funcional sem grandes queixas no dia a dia" },
      { label: "Excelente", emoji: "✨", value: "excellent", description: "Intestino regular, sem gases, inchaço ou desconfortos" },
    ],
  },
  {
    id: "hunger_compulsion",
    title: "Sente fome excessiva ou compulsão?",
    subtitle: "Episódios de comer demais sem controle",
    type: "single",
    options: [
      { label: "Sempre", emoji: "🍕", value: "always", description: "Compulsão constante, dificuldade de parar de comer em todas as refeições" },
      { label: "Frequente", emoji: "😰", value: "frequent", description: "Episódios frequentes de comer demais, especialmente em momentos de estresse" },
      { label: "Às vezes", emoji: "🤔", value: "sometimes", description: "Acontece ocasionalmente, geralmente em situações específicas" },
      { label: "Raramente", emoji: "😌", value: "rarely", description: "Controle alimentar na maioria das situações, episódios raros" },
      { label: "Nunca", emoji: "✅", value: "never", description: "Controle total da saciedade e comportamento alimentar equilibrado" },
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
      { label: "Nenhuma", emoji: "✅", value: "none" },
    ],
  },
  {
    id: "dietary_strategy",
    title: "Segue alguma estratégia alimentar?",
    subtitle: "Selecione se aplica",
    type: "multi",
    options: [
      { label: "Low Carb", emoji: "🥑", value: "low_carb" },
      { label: "Cetogênica", emoji: "🥓", value: "ketogenic" },
      { label: "Jejum Intermitente", emoji: "⏰", value: "intermittent_fasting" },
      { label: "Anti-inflamatória", emoji: "🍃", value: "anti_inflammatory" },
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
      { label: "Não se aplica", emoji: "➖", value: "not_applicable", description: "Não está em período gestacional ou pós-parto" },
      { label: "Gestante", emoji: "🤰", value: "pregnant", description: "Atualmente grávida — o plano será adaptado para gestação" },
      { label: "Pós-parto (<6m)", emoji: "👶", value: "postpartum_recent", description: "Até 6 meses após o parto — foco em recuperação e amamentação" },
      { label: "Pós-parto (6m+)", emoji: "🍼", value: "postpartum_late", description: "Mais de 6 meses após o parto — retomada progressiva" },
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
      { label: "Praticidade total", emoji: "⚡", value: "quick", description: "Refeições rápidas e simples, mínimo tempo na cozinha" },
      { label: "Caseira simples", emoji: "🏠", value: "homemade", description: "Preparações caseiras fáceis com ingredientes acessíveis" },
      { label: "Gourmet elaborada", emoji: "👨‍🍳", value: "gourmet", description: "Receitas elaboradas com técnicas e ingredientes sofisticados" },
      { label: "Tanto faz", emoji: "🤷", value: "any", description: "Flexível para qualquer tipo de preparo e complexidade" },
    ],
  },
  {
    id: "budget",
    title: "Qual seu orçamento mensal com alimentação?",
    subtitle: "Isso ajuda a sugerir alimentos acessíveis",
    type: "single",
    options: [
      { label: "Econômico", emoji: "💰", value: "low", description: "Prioridade em alimentos acessíveis e de bom custo-benefício" },
      { label: "Moderado", emoji: "💳", value: "medium", description: "Equilíbrio entre qualidade e preço, com flexibilidade" },
      { label: "Sem limite", emoji: "💎", value: "high", description: "Liberdade total para escolher os melhores ingredientes" },
    ],
  },
  {
    id: "meals_per_day",
    title: "Quantas refeições faz por dia hoje?",
    subtitle: "Sem contar lanches rápidos",
    type: "single",
    options: [
      { label: "2-3 refeições", emoji: "2️⃣", value: "2-3", description: "Poucas refeições ao dia — pode indicar jejuns longos" },
      { label: "4-5 refeições", emoji: "4️⃣", value: "4-5", description: "Frequência alimentar equilibrada com boa distribuição" },
      { label: "6+ refeições", emoji: "6️⃣", value: "6+", description: "Alta frequência alimentar — comum em rotinas de treino" },
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
      { label: "Sim, sempre", emoji: "✅", value: "always", description: "Sempre faz um lanche entre o café da manhã e o almoço" },
      { label: "Às vezes", emoji: "🤔", value: "sometimes", description: "Faz lanche da manhã em alguns dias, dependendo da rotina" },
      { label: "Não faço", emoji: "❌", value: "never", description: "Não costuma comer nada entre o café e o almoço" },
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
      { label: "Sim, 1 lanche", emoji: "1️⃣", value: "one", description: "Faz um lanche entre o almoço e jantar" },
      { label: "Sim, 2 lanches", emoji: "2️⃣", value: "two", description: "Faz dois lanches durante a tarde para manter energia" },
      { label: "Às vezes", emoji: "🤔", value: "sometimes", description: "Lanche da tarde ocasional, sem rotina fixa" },
      { label: "Não faço", emoji: "❌", value: "never", description: "Não come nada entre o almoço e o jantar" },
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
      { label: "Sim, sempre", emoji: "✅", value: "always", description: "Janta todos os dias com uma refeição completa" },
      { label: "Às vezes", emoji: "🤔", value: "sometimes", description: "Janta em alguns dias, dependendo do horário e fome" },
      { label: "Não janto", emoji: "❌", value: "never", description: "Não costuma jantar — última refeição é o lanche da tarde" },
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
      { label: "Sim, sempre", emoji: "✅", value: "always", description: "Sempre faz uma pequena refeição antes de dormir" },
      { label: "Às vezes", emoji: "🤔", value: "sometimes", description: "Come antes de dormir em alguns dias da semana" },
      { label: "Não faço", emoji: "❌", value: "never", description: "Não come nada após o jantar até a manhã seguinte" },
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
      { label: "Péssimo", emoji: "😢", value: "terrible", description: "Insatisfação total com hábitos alimentares atuais" },
      { label: "Ruim", emoji: "😕", value: "bad", description: "Sabe que precisa melhorar muito a alimentação" },
      { label: "Ok", emoji: "😐", value: "ok", description: "Alimentação razoável, mas sente que pode evoluir" },
      { label: "Bem", emoji: "😊", value: "good", description: "Satisfeito(a) com a maioria das escolhas alimentares" },
      { label: "Ótimo", emoji: "🤩", value: "great", description: "Alimentação excelente, busca refinamento e otimização" },
    ],
  },
  {
    id: "motivation",
    title: "O que mais te motiva a mudar?",
    subtitle: "Última pergunta! Escolha sua motivação principal",
    type: "single",
    options: [
      { label: "Saúde", emoji: "❤️", value: "health", description: "Prevenção de doenças e melhora de exames e indicadores" },
      { label: "Estética", emoji: "✨", value: "aesthetics", description: "Melhorar aparência física e composição corporal" },
      { label: "Performance", emoji: "🏆", value: "performance", description: "Maximizar rendimento em treinos e atividades físicas" },
      { label: "Autoestima", emoji: "🦸", value: "self_esteem", description: "Sentir-se melhor consigo mesmo(a) e mais confiante" },
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
  const { user, isNutritionist, isPatient } = useAuth();
  const { tenantId } = useTenant();
  const { isReady, isDegraded } = useAppState();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasConsent, loading: consentLoading } = useConsentGuard();

  const forPatientId = searchParams.get("patientId");
  const isPipelineFromUrl = searchParams.get("pipeline") === "true";
  const [hasActivePipeline, setHasActivePipeline] = useState(false);
  const isPipelineMode = isPipelineFromUrl || hasActivePipeline;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  // Route protection: patients must accept consent before anamnesis
  useEffect(() => {
    if (isPatient && !consentLoading && !hasConsent) {
      toast.error("Você precisa aceitar o termo de consentimento antes de iniciar a anamnese.");
      navigate("/consent", { replace: true });
    }
  }, [isPatient, consentLoading, hasConsent, navigate]);
  const [analyzing, setAnalyzing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [patientName, setPatientName] = useState<string>("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const { status: autoSaveStatus, lastAction, updateStatus: setAutoSaveStatus } = useSyncStatus();
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showManualRestoreModal, setShowManualRestoreModal] = useState(false);
  const [backupExpired, setBackupExpired] = useState(false);
  const [serverVersion, setServerVersion] = useState<{ answers: Record<string, any>, updated_at: string, id: string } | null>(null);
  const [localBackup, setLocalBackup] = useState<{ answers: Record<string, any>, updated_at: string } | null>(null);
  const [showAdaptiveBlocks, setShowAdaptiveBlocks] = useState(false);
  const [adaptiveStep, setAdaptiveStep] = useState(0);
  const [onboardingBlocked, setOnboardingBlocked] = useState(false);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(tenantId ?? null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);

  const addLog = useCallback((msg: string) => {
    console.log(`[FJ:Anamnesis] ${msg}`);
  }, []);

  // The target user: either the patient themselves or the patient being filled by nutritionist
  const targetUserId = forPatientId || user?.id;
  const isNutritionistMode = isNutritionist && !!forPatientId;

  const q = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  // Resolve a guaranteed tenant_id for writes.
  // `patient_anamnesis.tenant_id` is NOT NULL, so onboarding cannot depend only
  // on the async tenant context; fall back to the target profile tenant.
  useEffect(() => {
    if (tenantId) {
      setResolvedTenantId(tenantId);
      return;
    }
    if (!targetUserId) return;

    supabase
      .from("profiles")
      .select("tenant_id, full_name")
      .eq("user_id", targetUserId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("[FJ:Anamnesis] failed to resolve profile tenant:", error);
          return;
        }
        if (data?.tenant_id) setResolvedTenantId(data.tenant_id);
        if (data?.full_name) setPatientName(data.full_name);
      });
  }, [tenantId, targetUserId, isNutritionistMode]);

  // Fetch patient name if nutritionist mode
  useEffect(() => {
    if (isNutritionistMode && forPatientId && !patientName) {
      supabase.from("profiles").select("full_name").eq("user_id", forPatientId).maybeSingle()
        .then(({ data }) => setPatientName(data?.full_name || "Paciente"));
    }
  }, [isNutritionistMode, forPatientId, patientName]);

  // 🛡️ ANTI-LOOP HARDENING (v3.0):
  // Regra clínica nova: "consent aceito ⇒ paciente PODE preencher anamnese".
  // Removemos o bloqueio por release_status / journey_status / lifecycle.
  // O guard de consent (PatientReadyGuard / useConsentGuard) já protege a rota.
  // Mantemos apenas best-effort de sincronizar release_status caso esteja
  // dessincronizado, mas NUNCA setamos onboardingBlocked=true.
  useEffect(() => {
    if (isNutritionistMode || !targetUserId) return;
    setOnboardingBlocked(false);

    (async () => {
      try {
        const { data: npData } = await supabase
          .from("nutritionist_patients")
          .select("journey_status")
          .eq("patient_id", targetUserId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const js = (npData as any)?.journey_status;
        const releasedStatuses = [
          "onboarding_active", "onboarding_completed", "draft_ready_for_review",
          "plan_published", "active_followup", "clinical_followup_active", "active",
        ];

        if (js && releasedStatuses.includes(js)) {
          void supabase
            .from("onboarding_pipelines" as any)
            .update({ release_status: "released" } as any)
            .eq("patient_id", targetUserId)
            .neq("release_status", "released");
        }
      } catch (e) {
        console.warn("[FJ:Anamnesis] release-sync best-effort failed (ignorado):", e);
      }
    })();
  }, [targetUserId, isNutritionistMode]);

  // Load existing draft, local backup and version on mount
  useEffect(() => {
    if (!targetUserId) return;
    (async () => {
      // 1. Get local backup
      const backupKey = `fj_anamnesis_backup_${targetUserId}`;
      let localData: { answers: Record<string, any>, updated_at: string } | null = null;
      try {
        const stored = localStorage.getItem(backupKey);
        if (stored) {
          localData = JSON.parse(stored);
          // Centralized TTL Check V4.6
          const validity = getBackupValidity(localData!.updated_at);
          if (validity === "expired") {
            setBackupExpired(true);
            localData = null; // Don't use expired data for auto-restore
          } else if (validity === "invalid") {
            localData = null;
          }
        }
      } catch (e) {
        console.warn("[FJ:Anamnesis] failed to read local backup:", e);
      }
      setLocalBackup(localData);

      // 2. Get server data
      const [{ data: anamnesisRows }, { data: pipelineData }] = await Promise.all([
        supabase
          .from("patient_anamnesis")
          .select("id, status, answers, created_at, updated_at")
          .eq("user_id", targetUserId)
          .in("status", ["completed", "draft"])
          .order("updated_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("onboarding_pipelines" as any)
          .select("status, anamnesis_completed, created_at, updated_at")
          .eq("patient_id", targetUserId)
          .not("status", "in", '("completed","superseded_by_active_plan","superseded_by_published_plan","superseded_by_reset")')
          .order("updated_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const latestAnamnesis = anamnesisRows?.[0] as any;
      const latestPipeline = pipelineData as any;

      // Detect active pipeline
      if (latestPipeline && !isNutritionistMode) {
        setHasActivePipeline(true);
      }

      // CONFLICT DETECTION (Hardening V4.6)
      if (latestAnamnesis && localData && resolvedTenantId) {
        const serverUpdatedAt = latestAnamnesis.updated_at || latestAnamnesis.created_at;
        const localUpdatedAt = localData.updated_at;
        
        // Versioned Decision Key V4.6
        const resolutionKey = getConflictVersionKey(targetUserId, resolvedTenantId, serverUpdatedAt, localUpdatedAt);
        const resolution = localStorage.getItem(resolutionKey);

        if (resolution) {
          addLog(`Conflito já resolvido via versão: ${resolution}`);
          if (resolution === "restaurar_servidor") {
            setAnswers(latestAnamnesis.answers);
          } else {
            setAnswers(localData.answers);
          }
          setDraftId(latestAnamnesis.id);
          return;
        }

        // If they differ by more than 2 seconds
        const serverTS = new Date(serverUpdatedAt).getTime();
        const localTS = new Date(localUpdatedAt).getTime();
        if (Math.abs(serverTS - localTS) > 2000) {
          setServerVersion({ 
            answers: latestAnamnesis.answers as Record<string, any>, 
            updated_at: serverUpdatedAt,
            id: latestAnamnesis.id
          });
          setShowConflictModal(true);
          setAnswers(localData.answers);
          setDraftId(latestAnamnesis.id);
          return;
        }
      }

      // No conflict or no data scenarios
      if (!latestAnamnesis) {
        if (localData) {
          setAnswers(localData.answers);
          const lastIdx = questions.findIndex((q) => !(q.id in localData!.answers));
          if (lastIdx > 0) setStep(lastIdx);
          else if (lastIdx === -1) setStep(questions.length - 1);
          toast.info("Dados restaurados do backup local! ⚡");
        }
        return;
      }

      // Use latestAnamnesis (standard behavior)
      setDraftId(latestAnamnesis.id);
      const savedAnswers = latestAnamnesis.answers as Record<string, any>;
      if (savedAnswers) setAnswers(savedAnswers);

      if (latestAnamnesis.status === "completed") {
        setCompleted(true);
      } else if (latestAnamnesis.status === "draft") {
        if (savedAnswers && Object.keys(savedAnswers).length > 0) {
          const lastIdx = questions.findIndex((q) => !(q.id in savedAnswers));
          if (lastIdx > 0) setStep(lastIdx);
          else if (lastIdx === -1) setStep(questions.length - 1);
          toast.info("Rascunho restaurado! Continue de onde parou 📝");
        }
      }
    })();
  }, [targetUserId]);

  const handleEditAnamnesis = () => {
    setCompleted(false);
    setAnalyzing(false);
    setStep(0);
    toast.info("Modo edição ativado! Revise suas respostas ✏️");
  };

  // Backup local automatico
  const saveLocalBackup = useCallback((currentAnswers: Record<string, any>) => {
    if (!targetUserId) return;
    try {
      localStorage.setItem(`fj_anamnesis_backup_${targetUserId}`, JSON.stringify({
        answers: currentAnswers,
        updated_at: new Date().toISOString()
      }));
    } catch (e) {
      console.warn("[FJ:Anamnesis] backup fail:", e);
    }
  }, [targetUserId]);

  const logSafetyAction = useCallback((type: string) => {
    if (!targetUserId) return;
    setAutoSaveStatus("success", type);
  }, [targetUserId, setAutoSaveStatus]);

  // Autosave function — defensive: maybeSingle, explicit error logging, no silent loops
  const performAutoSave = useCallback(async (currentAnswers: Record<string, any>) => {
    if (!targetUserId || !user || Object.keys(currentAnswers).length === 0) return;

    // BLOQUEIO DE AÇÃO CRÍTICA
    if (!isReady || isDegraded) {
      console.warn("[FJ:Anamnesis] Autosave blocked: System not ready or in degraded mode", { isReady, isDegraded });
      return;
    }

    if (!resolvedTenantId) {
      console.warn("[FJ:Anamnesis] Autosave deferred: tenant_id unresolved.");
      return;
    }

    setAutoSaveStatus("syncing");

    try {
      let error;
      if (draftId) {
        const { error: updateError } = await supabase
          .from("patient_anamnesis")
          .update({ 
            answers: currentAnswers, 
            updated_at: new Date().toISOString(),
            tenant_id: resolvedTenantId // Ensure tenant_id is always set
          })
          .eq("id", draftId);
        error = updateError;
      } else {
        const insertPayload: any = {
          user_id: targetUserId,
          answers: currentAnswers,
          status: "draft",
          tenant_id: resolvedTenantId,
        };

        const { data, error: insertError } = await supabase
          .from("patient_anamnesis")
          .insert(insertPayload)
          .select("id")
          .maybeSingle();
        error = insertError;
        if (data?.id) setDraftId(data.id);
      }

      if (error) {
        console.error("[FJ:Anamnesis] autosave failed:", error);
        setAutoSaveStatus("error");
        
        // Retry logic (max 3 retries)
        if (retryCount.current < 3) {
          retryCount.current += 1;
          setTimeout(() => performAutoSave(currentAnswers), 3000 * retryCount.current);
        } else {
          toast.error("Erro ao salvar rascunho. Verifique sua conexão.");
        }
        return;
      }

      retryCount.current = 0;
      setAutoSaveStatus("success", "autosave");
    } catch (e) {
      console.error("[FJ:Anamnesis] autosave threw:", e);
      setAutoSaveStatus("error");
    }
  }, [targetUserId, user, draftId, resolvedTenantId, isReady, isDegraded]);

  // Debounced autosave on answers change — wait for first user interaction (not just mount)
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
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);
    saveLocalBackup(newAnswers);
  };

  const toggleMulti = (value: string) => {
    const current: string[] = answers[q.id] || [];
    let newAnswers;
    if (value === "none") {
      newAnswers = { ...answers, [q.id]: ["none"] };
    } else {
      const filtered = current.filter((v) => v !== "none");
      if (filtered.includes(value)) {
        newAnswers = { ...answers, [q.id]: filtered.filter((v) => v !== value) };
      } else {
        newAnswers = { ...answers, [q.id]: [...filtered, value] };
      }
    }
    setAnswers(newAnswers);
    saveLocalBackup(newAnswers);
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

    // BLOQUEIO DE AÇÃO CRÍTICA: Impedir finalização se o estado não estiver pronto ou degradado
    if (!isReady || isDegraded) {
      console.warn("[FJ:Anamnesis] Submit blocked: System not ready or degraded", { isReady, isDegraded });
      toast.error("O sistema está operando em modo limitado ou ainda carregando. Aguarde a sincronização completa.");
      return;
    }

    setSubmitting(true);

    // ── Robust input parsing with unit normalization ──
    const sex = answers.sex;
    const age = Math.max(1, Math.round(Number(answers.age) || 25));
    let weight = Number(answers.weight) || 0;
    let height = Number(answers.height) || 0;

    // Normalize height: if < 3, user entered meters (e.g. 1.62) → convert to cm
    if (height > 0 && height < 3) height = height * 100;
    // Normalize weight: if > 300, user may have entered grams → convert to kg
    if (weight > 300) weight = weight / 1000;

    // Sanity validation — block absurd values
    const MIN_WEIGHT = 20; const MAX_WEIGHT = 300;
    const MIN_HEIGHT = 80; const MAX_HEIGHT = 250;
    const MIN_AGE = 1; const MAX_AGE = 120;

    if (weight < MIN_WEIGHT || weight > MAX_WEIGHT) {
      toast.error(`Peso inválido (${weight} kg). Informe entre ${MIN_WEIGHT} e ${MAX_WEIGHT} kg.`);
      setSubmitting(false); return;
    }
    if (height < MIN_HEIGHT || height > MAX_HEIGHT) {
      toast.error(`Altura inválida (${height} cm). Informe entre ${MIN_HEIGHT} e ${MAX_HEIGHT} cm.`);
      setSubmitting(false); return;
    }
    if (age < MIN_AGE || age > MAX_AGE) {
      toast.error(`Idade inválida (${age}). Informe entre ${MIN_AGE} e ${MAX_AGE} anos.`);
      setSubmitting(false); return;
    }

    // Compute TMB (Harris-Benedict Revised)
    let tmb: number;
    if (sex === "male") {
      tmb = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
    } else {
      tmb = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
    }

    // TMB sanity check (realistic adult range: 800–3500 kcal)
    if (tmb < 800 || tmb > 3500) {
      console.warn(`[FJ:Anamnesis] TMB fora de faixa: ${Math.round(tmb)} kcal (peso=${weight}, altura=${height}, idade=${age}, sexo=${sex})`);
    }

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, intense: 1.725,
    };
    const multiplier = activityMultipliers[answers.activity_level] || 1.375;
    let kcalTarget = Math.round(tmb * multiplier);

    if (answers.goal === "lose_weight") kcalTarget = Math.round(kcalTarget * 0.8);
    else if (answers.goal === "gain_muscle") kcalTarget = Math.round(kcalTarget * 1.15);

    // Enforce clinical calorie floors
    const kcalFloor = sex === "male" ? 1500 : 1200;
    if (kcalTarget < kcalFloor) {
      console.warn(`[FJ:Anamnesis] Meta calórica ${kcalTarget} abaixo do piso clínico ${kcalFloor}. Ajustando.`);
      kcalTarget = kcalFloor;
    }

    const protein = Math.round((kcalTarget * 0.3) / 4);
    const carbs = Math.round((kcalTarget * 0.45) / 4);
    const fat = Math.round((kcalTarget * 0.25) / 9);

    console.info(`[FJ:Anamnesis] Cálculo: peso=${weight}kg, altura=${height}cm, idade=${age}, sexo=${sex}, TMB=${Math.round(tmb)}, TDEE=${Math.round(tmb * multiplier)}, meta=${kcalTarget}, P=${protein}g C=${carbs}g G=${fat}g`);

    // Extract clinical flags from adaptive blocks
    const clinicalFlags = extractClinicalFlags(answers);

    if (!resolvedTenantId) {
      toast.error("Não foi possível identificar seu espaço clínico. Recarregue a página e tente novamente.");
      setSubmitting(false);
      return;
    }

    const payload = {
      user_id: targetUserId,
      tenant_id: resolvedTenantId,
      answers: { ...answers, _extracted_clinical_flags: clinicalFlags },
      computed_tmb: Math.round(tmb),
      computed_tdee: Math.round(tmb * multiplier),
      computed_kcal_target: kcalTarget,
      computed_protein: protein,
      computed_carbs: carbs,
      computed_fat: fat,
      status: "completed",
    };

    let anamData: any;
    if (draftId) {
      const { data, error } = await supabase
        .from("patient_anamnesis")
        .update(payload)
        .eq("id", draftId)
        .select()
        .maybeSingle();
      if (error || !data) {
        console.error("[FJ:Anamnesis] submit UPDATE failed:", error);
        toast.error("Erro ao salvar: " + (error?.message || "registro não encontrado"));
        setSubmitting(false);
        return;
      }
      anamData = data;
    } else {
      const { data, error } = await supabase
        .from("patient_anamnesis")
        .insert(payload)
        .select()
        .maybeSingle();
      if (error || !data) {
        console.error("[FJ:Anamnesis] submit INSERT failed:", error);
        toast.error("Erro ao salvar: " + (error?.message || "falha ao criar anamnese"));
        setSubmitting(false);
        return;
      }
      anamData = data;
    }

    // Sync onboarding pipeline FIRST so the patient leaves step 1 immediately,
    // even if AI/secondary automations are slow or temporarily failing.
    const { data: syncedPipeline, error: pipelineSyncError } = await supabase
      .from("onboarding_pipelines" as any)
      .update({
        anamnesis_completed: true,
        status: "pending_body_data",
        weight: weight,
        height: height,
      } as any)
      .eq("patient_id", targetUserId)
      .in("status", ["pending_anamnesis", "in_progress"])
      .select("id")
      .maybeSingle();

    if (pipelineSyncError) {
      console.error("[FJ:Anamnesis] pipeline sync failed:", pipelineSyncError);
    }

    if (syncedPipeline && !isPipelineMode) {
      setHasActivePipeline(true);
    }

    setSubmitting(false);
    setCompleted(true);

    // In onboarding pipeline mode, never keep the patient blocked waiting for AI.
    if (isPipelineMode && !isNutritionistMode) {
      setAnalyzing(false);
      toast.success("Anamnese salva! Indo para a próxima etapa do onboarding. ✅");

      void (async () => {
        try {
          const flagResult = await processAnamnesisFlags(targetUserId, anamData.id);
          console.log(`[ClinicalFlags] ${flagResult.flags_generated} flags geradas`);

          const { data: taskResult } = await supabase.functions.invoke("generate-behavioral-tasks", {
            body: { patient_id: targetUserId },
          });
          if (taskResult) {
            console.log(`[BehavioralTasks] ${taskResult.tasks_generated} tarefas, ${taskResult.messages_generated} mensagens geradas`);
          }
        } catch (e: any) {
          console.error("Flag/task processing error:", e);
        }

        try {
          const { data: aiData, error: aiError } = await supabase.functions.invoke("analyze-anamnesis", {
            body: { anamnesis_id: anamData.id },
          });
          if (aiError) throw aiError;
          if (aiData?.error) throw new Error(aiData.error);
          setAiResult(aiData);
        } catch (e: any) {
          console.error("AI analysis error:", e);
        }
      })();

      return;
    }

    toast.success("Anamnese salva! Gerando análise inteligente... 🧠");
    setAnalyzing(true);

    try {
      const flagResult = await processAnamnesisFlags(targetUserId, anamData.id);
      console.log(`[ClinicalFlags] ${flagResult.flags_generated} flags geradas`);

      const { data: taskResult } = await supabase.functions.invoke("generate-behavioral-tasks", {
        body: { patient_id: targetUserId },
      });
      if (taskResult) {
        console.log(`[BehavioralTasks] ${taskResult.tasks_generated} tarefas, ${taskResult.messages_generated} mensagens geradas`);
      }
    } catch (e: any) {
      console.error("Flag/task processing error:", e);
    }

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

    // Notify professional that everything is ready for evaluation
    try {
      const { data: nutriData } = await supabase
        .from("nutritionist_patients")
        .select("nutritionist_id")
        .eq("patient_id", targetUserId)
        .maybeSingle();

      if (nutriData?.nutritionist_id) {
        await supabase.from("notifications").insert({
          user_id: nutriData.nutritionist_id,
          title: "Anamnese e Análise Prontas! 🎯",
          message: `${patientName || "Seu paciente"} concluiu o onboarding e a análise clínica de IA já está disponível.`,
          type: "anamnesis_completed",
          entity_type: "patient",
          entity_id: targetUserId,
          target_route: `/patients/${targetUserId}`,
        } as any);
      }
    } catch (err) {
      console.error("Error sending final anamnesis notification:", err);
    }
  };

  // Pipeline mode: auto-redirect back to onboarding pipeline after completion
  const [pipelineCountdown, setPipelineCountdown] = useState(5);
  useEffect(() => {
    if (!completed || analyzing || !isPipelineMode || isNutritionistMode) return;
    const timer = setInterval(() => {
      setPipelineCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/onboarding-pipeline", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [completed, analyzing, isPipelineMode, isNutritionistMode, navigate]);

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
                <h1 className="font-display text-3xl font-bold mb-2">
                  {isPipelineMode && !isNutritionistMode
                    ? "Etapa 1 concluída do onboarding ✅"
                    : "Anamnese Inteligente Concluída!"}
                </h1>
                <p className="text-muted-foreground max-w-md">
                  {isPipelineMode && !isNutritionistMode
                    ? "Ótimo! Sua anamnese foi salva, mas o onboarding ainda não terminou. Agora siga para as próximas etapas obrigatórias."
                    : aiResult
                    ? `${aiResult.summary || "Sua análise foi gerada com sucesso."}`
                    : "Seu nutricionista receberá seus dados e criará um plano personalizado."}
                </p>
              </div>

              {/* Pipeline mode: prominent continue banner */}
              {isPipelineMode && !isNutritionistMode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center space-y-2"
                >
                  <p className="text-sm font-medium text-primary">
                    ⏳ Redirecionando para a próxima etapa em {pipelineCountdown}s...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Você ainda precisa concluir: Dados Corporais, Preferências e depois aguardar o andamento do plano.
                  </p>
                </motion.div>
              )}

              {/* Show smart plan card if AI was successful */}
              {(!isPipelineMode || isNutritionistMode) && <SmartPlanCard />}

              {/* AI Stats */}
              {aiResult && (!isPipelineMode || isNutritionistMode) && (
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
                {isPipelineMode && !isNutritionistMode ? (
                  <>
                    <Button onClick={() => navigate("/onboarding-pipeline", { replace: true })} className="w-full gradient-primary shadow-glow gap-2">
                      <ArrowRight className="w-4 h-4" /> Continuar Onboarding — Próxima Etapa
                    </Button>
                    <Button onClick={handleEditAnamnesis} variant="outline" className="w-full gap-2">
                      ✏️ Revisar / Editar Respostas
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleEditAnamnesis} variant="outline" className="w-full gap-2">
                      ✏️ Revisar / Editar Respostas
                    </Button>
                    {!isNutritionistMode && hasActivePipeline ? (
                      <Button onClick={() => navigate("/onboarding-pipeline", { replace: true })} className="w-full gradient-primary shadow-glow gap-2">
                        <ArrowRight className="w-4 h-4" /> Continuar Onboarding — Próxima Etapa
                      </Button>
                    ) : (
                      <Button onClick={() => navigate(isNutritionistMode ? `/patients/${forPatientId}` : "/")} className="w-full gradient-primary shadow-glow">
                        {isNutritionistMode ? "Voltar ao Paciente" : "Voltar ao Dashboard"}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  const exitGuardEnabled = !completed && !isNutritionistMode && !submitting && !analyzing;
  const hasStartedFilling = step > 0 || Object.keys(answers).length > 0;

  return (
    <DashboardLayout>
      <OnboardingExitGuard enabled={exitGuardEnabled} />
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
              {autoSaveStatus === "syncing" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                </span>
              )}
              {autoSaveStatus === "success" && (
                <span className="flex items-center gap-1 text-xs text-success">
                  <Save className="w-3 h-3" /> Salvo
                </span>
              )}
              {autoSaveStatus === "error" && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="w-3 h-3" /> Erro ao salvar
                </span>
              )}
              <ProgressPulse trigger={step}>
                <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
              </ProgressPulse>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question — All orbital themed */}
        <NeuralStepTransition stepKey={q.id}>
          <div className="space-y-6">
            {/* Single select: RadialOrbitalSelector for ALL */}
            {q.type === "single" && q.options && (
              <RadialOrbitalSelector
                title={q.title}
                subtitle={q.subtitle}
                options={q.options.map(opt => ({
                  id: opt.value,
                  label: opt.label,
                  description: opt.description || "",
                  emoji: opt.emoji,
                }))}
                value={answers[q.id]}
                onChange={(v) => setAnswer(v)}
                showConfirmButton={false}
              />
            )}

            {/* Multi select: orbital toggles */}
            {q.type === "multi" && q.options && (
              <OrbitalMultiSelect
                title={q.title}
                subtitle={q.subtitle}
                options={q.options}
                value={answers[q.id]}
                onChange={(v) => setAnswer(v)}
              />
            )}

            {/* Slider: orbital ring gauge */}
            {q.type === "slider" && (
              <OrbitalSlider
                title={q.title}
                subtitle={q.subtitle}
                value={answers[q.id] ?? q.min ?? 1}
                onChange={(v) => setAnswer(v)}
                min={q.min || 0}
                max={q.max || 100}
                step={q.step || 1}
                unit={q.unit || ""}
              />
            )}

            {/* Number: orbital glow input */}
            {q.type === "number" && (
              <OrbitalNumberInput
                title={q.title}
                subtitle={q.subtitle}
                value={answers[q.id] || ""}
                onChange={(v) => setAnswer(v)}
                min={q.min}
                max={q.max}
                unit={q.unit}
                placeholder={q.placeholder}
              />
            )}

            {/* Text: orbital glow textarea */}
            {q.type === "text" && (
              <OrbitalTextInput
                title={q.title}
                subtitle={q.subtitle}
                value={answers[q.id] || ""}
                onChange={(v) => setAnswer(v)}
                placeholder={q.placeholder}
              />
            )}

            {/* Time: orbital clock input */}
            {q.type === "time" && (
              <OrbitalTimeInput
                title={q.title}
                subtitle={q.subtitle}
                value={answers[q.id] || ""}
                onChange={(v) => setAnswer(v)}
                placeholder={q.placeholder}
              />
            )}
          </div>
        </NeuralStepTransition>

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
              onClick={() => {
                if (backupExpired) {
                  toast.error("Este backup expirou (>30 dias) e não pode ser restaurado.");
                  return;
                }
                if (!localBackup) {
                  toast.error("Não há backup local disponível para restaurar.");
                  return;
                }
                setShowManualRestoreModal(true);
              }}
              disabled={backupExpired || !localBackup}
              className={`gap-1.5 transition-all duration-300 ${backupExpired ? 'opacity-50 grayscale' : 'text-muted-foreground hover:text-primary'}`}
            >
              <RefreshCcw className={`w-4 h-4 ${backupExpired ? '' : 'group-hover:rotate-180 transition-transform duration-500'}`} /> 
              {backupExpired ? "Backup expirado" : "Restaurar backup"}
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

            {/* Advanced Sync Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/50 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {autoSaveStatus === "syncing" ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  Sincronizando...
                </>
              ) : autoSaveStatus === "success" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  Salvo automaticamente
                </>
              ) : autoSaveStatus === "error" ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  Erro ao sincronizar
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                  Proteção de dados ativa
                </>
              )}
            </div>
          </div>

          {lastAction && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground italic">
              <History className="w-3 h-3" />
              Última ação: {lastAction.type.replace(/_/g, ' ')} há {Math.round((Date.now() - new Date(lastAction.timestamp).getTime()) / 60000)} min
            </div>
          )}

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
          ) : !showAdaptiveBlocks && activeAdaptiveBlocks.length > 0 ? (
            <Button
              onClick={() => {
                setShowAdaptiveBlocks(true);
                setAdaptiveStep(0);
              }}
              disabled={!canNext()}
              className="gradient-primary gap-2 shadow-glow"
            >
              <Brain className="w-4 h-4" />
              Avaliação Personalizada →
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

        {/* Adaptive Blocks Phase */}
        {showAdaptiveBlocks && activeAdaptiveBlocks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-6"
          >
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <h3 className="font-display font-bold text-lg flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-primary" />
                Avaliação Adaptativa Personalizada
              </h3>
              <p className="text-sm text-muted-foreground">
                Com base nas suas respostas, identificamos áreas que merecem atenção especial.
                Responda os blocos abaixo para uma análise mais precisa.
              </p>
            </div>

            {activeAdaptiveBlocks.map((block, bIdx) => (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: bIdx * 0.1 }}
                className="space-y-4 p-5 rounded-xl border border-border bg-card/50"
              >
                <h4 className="font-display font-semibold text-base">{block.label}</h4>
                {block.questions.map((aq) => (
                  <div key={aq.id} className="space-y-2">
                    <p className="text-sm font-medium">{aq.title}</p>
                    <p className="text-xs text-muted-foreground">{aq.subtitle}</p>

                    {aq.type === "single" && aq.options && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {aq.options.map((opt) => (
                          <OptionCard
                            key={opt.value}
                            opt={opt}
                            selected={answers[aq.id] === opt.value}
                            onClick={() => setAnswers((prev) => ({ ...prev, [aq.id]: opt.value }))}
                          />
                        ))}
                      </div>
                    )}

                    {aq.type === "multi" && aq.options && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {aq.options.map((opt) => {
                          const current: string[] = answers[aq.id] || [];
                          const selected = current.includes(opt.value);
                          return (
                            <OptionCard
                              key={opt.value}
                              opt={opt}
                              selected={selected}
                              onClick={() => {
                                if (opt.value === "none") {
                                  setAnswers((prev) => ({ ...prev, [aq.id]: ["none"] }));
                                } else {
                                  const filtered = current.filter((v) => v !== "none");
                                  setAnswers((prev) => ({
                                    ...prev,
                                    [aq.id]: selected ? filtered.filter((v) => v !== opt.value) : [...filtered, opt.value],
                                  }));
                                }
                              }}
                            />
                          );
                        })}
                      </div>
                    )}

                    {aq.type === "slider" && (
                      <SliderInput
                        value={answers[aq.id] ?? aq.min ?? 1}
                        onChange={(v) => setAnswers((prev) => ({ ...prev, [aq.id]: v }))}
                        min={aq.min || 0} max={aq.max || 100} step={aq.step || 1} unit={aq.unit || ""}
                      />
                    )}

                    {aq.type === "text" && (
                      <textarea
                        value={answers[aq.id] || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [aq.id]: e.target.value }))}
                        placeholder={aq.placeholder} rows={2}
                        className="w-full bg-card border-2 border-border rounded-xl px-3 py-2 focus:border-primary focus:outline-none transition-colors resize-none text-sm"
                      />
                    )}
                  </div>
                ))}
              </motion.div>
            ))}

            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="gradient-primary gap-2 shadow-glow"
              >
                <Sparkles className="w-4 h-4" />
                {submitting ? "Salvando..." : "Concluir Anamnese Completa ✨"}
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      <AlertDialog open={showConflictModal} onOpenChange={setShowConflictModal}>
        <AlertDialogContent className="max-w-md border-primary/20 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-display">
              <History className="w-5 h-5 text-primary" />
              Conflito de Versão
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2">
              <p>
                Encontramos uma versão diferente das suas respostas no servidor. 
                Qual versão você deseja manter?
              </p>
              
              <div className="grid gap-3 pt-2">
                <div className="p-3 rounded-xl border border-border bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Versão Local (Atual)</p>
                  <p className="text-sm font-medium">
                    {localBackup ? new Date(localBackup.updated_at).toLocaleString('pt-BR') : "Sem data"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dados salvos neste dispositivo.
                  </p>
                </div>
                
                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Versão do Servidor</p>
                  <p className="text-sm font-medium">
                    {serverVersion ? new Date(serverVersion.updated_at).toLocaleString('pt-BR') : "Sem data"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dados salvos na nuvem.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel 
              onClick={() => {
                setShowConflictModal(false);
                if (serverVersion && localBackup && resolvedTenantId) {
                  const resolutionKey = getConflictVersionKey(targetUserId, resolvedTenantId, serverVersion.updated_at, localBackup.updated_at);
                  localStorage.setItem(resolutionKey, "manter_local");
                }
                logSafetyAction("manter_local");
                toast.success("Mantendo versão local! 🏠");
              }}
              className="sm:flex-1"
            >
              Manter Local
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (serverVersion && localBackup && resolvedTenantId) {
                  setAnswers(serverVersion.answers);
                  saveLocalBackup(serverVersion.answers);
                  setShowConflictModal(false);
                  const resolutionKey = getConflictVersionKey(targetUserId, resolvedTenantId, serverVersion.updated_at, localBackup.updated_at);
                  localStorage.setItem(resolutionKey, "restaurar_servidor");
                  logSafetyAction("restaurar_servidor");
                  toast.success("Versão do servidor restaurada! ☁️");
                }
              }}
              className="sm:flex-1 gradient-primary shadow-glow"
            >
              Restaurar Servidor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showManualRestoreModal} onOpenChange={setShowManualRestoreModal}>
        <AlertDialogContent className="max-w-md border-primary/20 bg-background/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-display">
              <RefreshCcw className="w-5 h-5 text-primary" />
              Restaurar Backup Local
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá sobrescrever suas respostas atuais com a versão salva localmente em:
              <span className="block mt-2 font-medium text-foreground">
                {localBackup ? new Date(localBackup.updated_at).toLocaleString('pt-BR') : "Data desconhecida"}
              </span>
              Tem certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (localBackup) {
                  setAnswers(localBackup.answers);
                  setShowManualRestoreModal(false);
                  logSafetyAction("restaurar_manual_local");
                  toast.success("Respostas restauradas do backup local! ⚡");
                }
              }}
              className="gradient-primary shadow-glow"
            >
              Confirmar Restauração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
