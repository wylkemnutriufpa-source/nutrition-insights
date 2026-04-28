import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Dumbbell, Loader2, UserCheck, Save } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTenant } from "@/lib/tenantContext";
import { useAppState } from "@/hooks/useAppState";

import { getTenantIdForInsert } from "@/lib/tenantQueryHelpers";
import {
  OrbitalSingleSelect,
  OrbitalMultiSelect,
  OrbitalSlider,
  OrbitalNumberInput,
  OrbitalTextInput,
  OrbitalTimeInput,
  OrbitalHeader,
} from "@/components/onboarding/OrbitalAnamnesisInputs";

// ──── Types ────
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

// ──── Complete Fitness Anamnesis Questions ────
const questions: Question[] = [
  // ── SEÇÃO 1: OBJETIVO & PERFIL PESSOAL ──
  {
    id: "fitness_goal",
    title: "Qual é o seu objetivo principal de treino?",
    subtitle: "Escolha o que mais importa pra você agora",
    type: "single",
    options: [
      { label: "Hipertrofia", emoji: "💪", value: "hypertrophy" },
      { label: "Emagrecimento", emoji: "🔥", value: "fat_loss" },
      { label: "Força máxima", emoji: "🏋️", value: "strength" },
      { label: "Condicionamento", emoji: "🫀", value: "conditioning" },
      { label: "Saúde / Bem-estar", emoji: "🌿", value: "health" },
      { label: "Reabilitação", emoji: "🩹", value: "rehab" },
    ],
  },
  {
    id: "secondary_goal",
    title: "Tem algum objetivo secundário?",
    subtitle: "Selecione todos que se aplicam",
    type: "multi",
    options: [
      { label: "Melhorar postura", emoji: "🧍", value: "posture" },
      { label: "Flexibilidade", emoji: "🤸", value: "flexibility" },
      { label: "Resistência", emoji: "⏱️", value: "endurance" },
      { label: "Preparação esportiva", emoji: "🏅", value: "sport_prep" },
      { label: "Ganhar mobilidade", emoji: "🔄", value: "mobility" },
      { label: "Nenhum", emoji: "➖", value: "none" },
    ],
  },
  {
    id: "sex",
    title: "Qual seu sexo biológico?",
    subtitle: "Importante para periodização e carga",
    type: "single",
    options: [
      { label: "Masculino", emoji: "♂️", value: "male" },
      { label: "Feminino", emoji: "♀️", value: "female" },
    ],
  },
  {
    id: "age",
    title: "Qual a sua idade?",
    subtitle: "Fundamental para prescrição segura",
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

  // ── SEÇÃO 2: HISTÓRICO DE TREINO ──
  {
    id: "training_experience",
    title: "Há quanto tempo treina?",
    subtitle: "Considere treino com alguma regularidade",
    type: "single",
    options: [
      { label: "Nunca treinei", emoji: "🆕", value: "never" },
      { label: "Menos de 6 meses", emoji: "🌱", value: "beginner" },
      { label: "6 meses a 2 anos", emoji: "📈", value: "intermediate" },
      { label: "2 a 5 anos", emoji: "💪", value: "advanced" },
      { label: "Mais de 5 anos", emoji: "🏆", value: "elite" },
    ],
  },
  {
    id: "current_frequency",
    title: "Quantas vezes treina por semana atualmente?",
    subtitle: "Sua frequência real, não a ideal",
    type: "single",
    options: [
      { label: "Não treino", emoji: "0️⃣", value: "0" },
      { label: "1-2x por semana", emoji: "1️⃣", value: "1-2" },
      { label: "3-4x por semana", emoji: "3️⃣", value: "3-4" },
      { label: "5-6x por semana", emoji: "5️⃣", value: "5-6" },
      { label: "Todos os dias", emoji: "7️⃣", value: "7" },
    ],
  },
  {
    id: "desired_frequency",
    title: "Quantas vezes por semana QUER treinar?",
    subtitle: "Sua meta de frequência semanal",
    type: "single",
    options: [
      { label: "2x por semana", emoji: "2️⃣", value: "2" },
      { label: "3x por semana", emoji: "3️⃣", value: "3" },
      { label: "4x por semana", emoji: "4️⃣", value: "4" },
      { label: "5x por semana", emoji: "5️⃣", value: "5" },
      { label: "6x por semana", emoji: "6️⃣", value: "6" },
    ],
  },
  {
    id: "session_duration",
    title: "Quanto tempo disponível por treino?",
    subtitle: "Tempo total incluindo aquecimento",
    type: "single",
    options: [
      { label: "30-45 min", emoji: "⏱️", value: "30-45" },
      { label: "45-60 min", emoji: "⏰", value: "45-60" },
      { label: "60-90 min", emoji: "🕐", value: "60-90" },
      { label: "Mais de 90 min", emoji: "🕑", value: "90+" },
    ],
  },
  {
    id: "preferred_time",
    title: "Em qual horário prefere treinar?",
    subtitle: "Isso influencia a intensidade do treino",
    type: "single",
    options: [
      { label: "Manhã cedo (5h-8h)", emoji: "🌅", value: "early_morning" },
      { label: "Manhã (8h-12h)", emoji: "☀️", value: "morning" },
      { label: "Tarde (12h-17h)", emoji: "🌤️", value: "afternoon" },
      { label: "Noite (17h-21h)", emoji: "🌙", value: "evening" },
      { label: "Noite tarde (21h+)", emoji: "🌃", value: "late_night" },
    ],
  },
  {
    id: "training_location",
    title: "Onde você treina?",
    subtitle: "Isso define os equipamentos disponíveis",
    type: "single",
    options: [
      { label: "Academia completa", emoji: "🏢", value: "full_gym" },
      { label: "Academia básica", emoji: "🏠", value: "basic_gym" },
      { label: "Home gym", emoji: "🏡", value: "home_gym" },
      { label: "Ao ar livre", emoji: "🌳", value: "outdoor" },
      { label: "Misto", emoji: "🔄", value: "mixed" },
    ],
  },
  {
    id: "available_equipment",
    title: "Quais equipamentos você tem acesso?",
    subtitle: "Selecione todos disponíveis",
    type: "multi",
    options: [
      { label: "Barras e anilhas", emoji: "🏋️", value: "barbells" },
      { label: "Halteres", emoji: "💪", value: "dumbbells" },
      { label: "Máquinas/cabos", emoji: "⚙️", value: "machines" },
      { label: "Elásticos", emoji: "🔗", value: "bands" },
      { label: "Kettlebells", emoji: "🔔", value: "kettlebells" },
      { label: "Peso corporal", emoji: "🧍", value: "bodyweight" },
    ],
  },

  // ── SEÇÃO 3: EXERCÍCIOS & PREFERÊNCIAS ──
  {
    id: "preferred_training_type",
    title: "Que tipo de treino mais gosta?",
    subtitle: "Selecione todos que curte",
    type: "multi",
    options: [
      { label: "Musculação", emoji: "🏋️", value: "weight_training" },
      { label: "Funcional/CrossFit", emoji: "🔥", value: "functional" },
      { label: "Calistenia", emoji: "🤸", value: "calisthenics" },
      { label: "Cardio (corrida, bike)", emoji: "🏃", value: "cardio" },
      { label: "HIIT", emoji: "⚡", value: "hiit" },
      { label: "Yoga/Pilates", emoji: "🧘", value: "yoga_pilates" },
    ],
  },
  {
    id: "disliked_exercises",
    title: "Exercícios que NÃO gosta ou evita?",
    subtitle: "Vamos substituir por alternativas",
    type: "text",
    placeholder: "Ex: agachamento com barra, burpees, corrida...",
  },
  {
    id: "favorite_exercises",
    title: "Exercícios favoritos?",
    subtitle: "Vamos incluir no seu treino 😎",
    type: "text",
    placeholder: "Ex: supino, leg press, pull-up, deadlift...",
  },

  // ── SEÇÃO 4: SAÚDE & LIMITAÇÕES FÍSICAS ──
  {
    id: "injuries_current",
    title: "Tem alguma lesão ou dor ATUAL?",
    subtitle: "Selecione todas que se aplicam",
    type: "multi",
    options: [
      { label: "Ombro", emoji: "🦾", value: "shoulder" },
      { label: "Joelho", emoji: "🦵", value: "knee" },
      { label: "Lombar", emoji: "🔙", value: "lower_back" },
      { label: "Cervical", emoji: "🔝", value: "neck" },
      { label: "Punho/cotovelo", emoji: "✋", value: "wrist_elbow" },
      { label: "Nenhuma", emoji: "✅", value: "none" },
    ],
  },
  {
    id: "injury_details",
    title: "Detalhe suas lesões ou limitações",
    subtitle: "Diagnósticos, cirurgias, restrições médicas...",
    type: "text",
    placeholder: "Ex: Hérnia L4-L5, artroscopia no joelho direito em 2022, tendinite no ombro...",
  },
  {
    id: "health_conditions",
    title: "Condições de saúde relevantes?",
    subtitle: "Selecione todas que se aplicam",
    type: "multi",
    options: [
      { label: "Hipertensão", emoji: "❤️‍🩹", value: "hypertension" },
      { label: "Diabetes", emoji: "💉", value: "diabetes" },
      { label: "Asma", emoji: "🫁", value: "asthma" },
      { label: "Cardiopatia", emoji: "🫀", value: "heart_disease" },
      { label: "Artrite/Artrose", emoji: "🦴", value: "arthritis" },
      { label: "Nenhuma", emoji: "✅", value: "none" },
    ],
  },
  {
    id: "medications",
    title: "Usa algum medicamento ou suplemento?",
    subtitle: "Inclua tudo que toma regularmente",
    type: "text",
    placeholder: "Ex: Losartana, Whey Protein, Creatina, Anti-inflamatório...",
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

  // ── SEÇÃO 5: AVALIAÇÃO FÍSICA SUBJETIVA ──
  {
    id: "body_fat_perception",
    title: "Como avalia seu percentual de gordura?",
    subtitle: "Percepção pessoal aproximada",
    type: "single",
    options: [
      { label: "Muito acima", emoji: "📈", value: "very_high" },
      { label: "Acima do ideal", emoji: "↗️", value: "above" },
      { label: "Na média", emoji: "➡️", value: "average" },
      { label: "Abaixo", emoji: "↘️", value: "below" },
      { label: "Definido", emoji: "💎", value: "lean" },
    ],
  },
  {
    id: "weak_muscle_groups",
    title: "Quais grupos musculares considera mais fracos?",
    subtitle: "Selecione até 3 que quer priorizar",
    type: "multi",
    options: [
      { label: "Peito", emoji: "🫁", value: "chest" },
      { label: "Costas", emoji: "🔙", value: "back" },
      { label: "Ombros", emoji: "🦾", value: "shoulders" },
      { label: "Braços", emoji: "💪", value: "arms" },
      { label: "Pernas", emoji: "🦵", value: "legs" },
      { label: "Glúteos", emoji: "🍑", value: "glutes" },
    ],
  },
  {
    id: "strong_muscle_groups",
    title: "E os grupos que considera mais fortes?",
    subtitle: "Selecione todos que se destacam",
    type: "multi",
    options: [
      { label: "Peito", emoji: "🫁", value: "chest" },
      { label: "Costas", emoji: "🔙", value: "back" },
      { label: "Ombros", emoji: "🦾", value: "shoulders" },
      { label: "Braços", emoji: "💪", value: "arms" },
      { label: "Pernas", emoji: "🦵", value: "legs" },
      { label: "Glúteos", emoji: "🍑", value: "glutes" },
    ],
  },

  // ── SEÇÃO 6: BENCHMARKS DE FORÇA ──
  {
    id: "squat_max",
    title: "Qual sua carga máxima no agachamento?",
    subtitle: "Peso máximo que faz com boa forma (estimativa OK)",
    type: "number",
    min: 0,
    max: 400,
    unit: "kg",
    placeholder: "Ex: 80 (0 se nunca fez)",
  },
  {
    id: "bench_max",
    title: "Carga máxima no supino reto?",
    subtitle: "Peso estimado de 1RM",
    type: "number",
    min: 0,
    max: 300,
    unit: "kg",
    placeholder: "Ex: 60 (0 se nunca fez)",
  },
  {
    id: "deadlift_max",
    title: "Carga máxima no levantamento terra?",
    subtitle: "Peso estimado de 1RM",
    type: "number",
    min: 0,
    max: 400,
    unit: "kg",
    placeholder: "Ex: 100 (0 se nunca fez)",
  },

  // ── SEÇÃO 7: RECUPERAÇÃO & ESTILO DE VIDA ──
  {
    id: "sleep_hours",
    title: "Quantas horas dorme por noite?",
    subtitle: "Média dos últimos dias",
    type: "slider",
    min: 3,
    max: 12,
    step: 0.5,
    unit: "horas",
  },
  {
    id: "sleep_quality",
    title: "Qualidade do sono?",
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
    id: "stress_level",
    title: "Qual seu nível de estresse?",
    subtitle: "Trabalho, vida pessoal, rotina geral",
    type: "single",
    options: [
      { label: "Muito alto", emoji: "🤯", value: "very_high" },
      { label: "Alto", emoji: "😰", value: "high" },
      { label: "Moderado", emoji: "😐", value: "moderate" },
      { label: "Baixo", emoji: "😊", value: "low" },
      { label: "Muito baixo", emoji: "🧘", value: "very_low" },
    ],
  },
  {
    id: "energy_level",
    title: "Como está seu nível de energia ao longo do dia?",
    subtitle: "No geral, como se sente",
    type: "single",
    options: [
      { label: "Muito baixo", emoji: "😩", value: "very_low" },
      { label: "Baixo", emoji: "😔", value: "low" },
      { label: "Normal", emoji: "😊", value: "normal" },
      { label: "Alto", emoji: "⚡", value: "high" },
    ],
  },
  {
    id: "water_intake",
    title: "Quantos litros de água por dia?",
    subtitle: "Hidratação é crucial para performance",
    type: "slider",
    min: 0.5,
    max: 6,
    step: 0.5,
    unit: "litros",
  },
  {
    id: "nutrition_quality",
    title: "Como avalia sua alimentação atual?",
    subtitle: "Seja honesto(a)",
    type: "single",
    options: [
      { label: "Péssima", emoji: "🍕", value: "terrible" },
      { label: "Ruim", emoji: "🍔", value: "bad" },
      { label: "Regular", emoji: "😐", value: "regular" },
      { label: "Boa", emoji: "🥗", value: "good" },
      { label: "Excelente", emoji: "💚", value: "excellent" },
    ],
  },
  {
    id: "smoking_alcohol",
    title: "Hábitos que podem afetar a performance?",
    subtitle: "Selecione todos que se aplicam",
    type: "multi",
    options: [
      { label: "Fumo", emoji: "🚬", value: "smoking" },
      { label: "Álcool frequente", emoji: "🍺", value: "alcohol_frequent" },
      { label: "Álcool social", emoji: "🥂", value: "alcohol_social" },
      { label: "Pouco sono", emoji: "😴", value: "poor_sleep" },
      { label: "Trabalho sedentário", emoji: "💻", value: "sedentary_work" },
      { label: "Nenhum", emoji: "✅", value: "none" },
    ],
  },

  // ── SEÇÃO 8: MOTIVAÇÃO & EXPECTATIVAS ──
  {
    id: "motivation",
    title: "O que mais te motiva a treinar?",
    subtitle: "Última pergunta! Escolha sua motivação principal",
    type: "single",
    options: [
      { label: "Estética", emoji: "✨", value: "aesthetics" },
      { label: "Saúde", emoji: "❤️", value: "health" },
      { label: "Performance", emoji: "🏆", value: "performance" },
      { label: "Saúde mental", emoji: "🧠", value: "mental_health" },
      { label: "Competição", emoji: "🥇", value: "competition" },
      { label: "Autoestima", emoji: "🦸", value: "self_esteem" },
    ],
  },
];

// Old OptionCard and SliderInput removed — now using Orbital components from OrbitalAnamnesisInputs

// ──── Main page ────
export default function FitnessAnamnesis() {
  const { user, isPersonal } = useAuth();
  const { tenantId } = useTenant();
  const { isReady, isDegraded } = useAppState();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const forStudentId = searchParams.get("studentId");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const targetUserId = forStudentId || user?.id;
  const isPersonalMode = isPersonal && !!forStudentId;

  const q = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  // Fetch student name
  useEffect(() => {
    if (isPersonalMode && forStudentId) {
      supabase.from("profiles").select("full_name").eq("user_id", forStudentId).maybeSingle()
        .then(({ data }) => setStudentName(data?.full_name || "Aluno"));
    }
  }, [isPersonalMode, forStudentId]);

  // Load existing draft
  useEffect(() => {
    if (!targetUserId) return;
    supabase
      .from("patient_anamnesis")
      .select("id, status, answers")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const record = data?.[0];
        if (!record) return;
        const savedAnswers = record.answers as Record<string, any>;
        // Only load if it's a fitness anamnesis (has fitness_goal key)
        if (savedAnswers && savedAnswers.fitness_goal) {
          if (record.status === "completed") {
            setCompleted(true);
            setDraftId(record.id);
            setAnswers(savedAnswers);
          } else if (record.status === "draft") {
            setDraftId(record.id);
            if (Object.keys(savedAnswers).length > 0) {
              setAnswers(savedAnswers);
              const lastIdx = questions.findIndex((q) => !(q.id in savedAnswers));
              if (lastIdx > 0) setStep(lastIdx);
              else if (lastIdx === -1) setStep(questions.length - 1);
              toast.info("Rascunho restaurado! Continue de onde parou 📝");
            }
          }
        }
      });
  }, [targetUserId]);

  const handleEditAnamnesis = () => {
    setCompleted(false);
    setStep(0);
    toast.info("Modo edição ativado! Revise suas respostas ✏️");
  };

  const performAutoSave = useCallback(async (currentAnswers: Record<string, any>) => {
    if (!targetUserId || !user || Object.keys(currentAnswers).length === 0) return;
    
    // BLOQUEIO DE AÇÃO CRÍTICA
    if (!isReady || isDegraded) {
      console.warn("[FJ:FitnessAnamnesis] Autosave blocked: System not ready or degraded", { isReady, isDegraded });
      return;
    }

    setAutoSaveStatus("saving");
    try {
      if (draftId) {
        await supabase.from("patient_anamnesis").update({ answers: currentAnswers, updated_at: new Date().toISOString() }).eq("id", draftId);
      } else {
        if (!tenantId) {
          console.warn("[FJ:FitnessAnamnesis] Autosave deferred: tenant_id unresolved.");
          setAutoSaveStatus("idle");
          return;
        }
        const { data } = await supabase.from("patient_anamnesis").insert({ user_id: targetUserId, answers: currentAnswers, status: "draft", ...getTenantIdForInsert(tenantId) }).select("id").single();
        if (data) setDraftId(data.id);
      }
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    } catch {
      setAutoSaveStatus("idle");
    }
  }, [targetUserId, user, draftId, tenantId]);

  useEffect(() => {
    if (Object.keys(answers).length === 0 || completed) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => performAutoSave(answers), 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [answers, performAutoSave, completed]);

  const setAnswer = (value: any) => setAnswers((prev) => ({ ...prev, [q.id]: value }));


  const canNext = () => {
    const val = answers[q.id];
    if (!val) return false;
    if (q.type === "multi" && Array.isArray(val) && val.length === 0) return false;
    if (q.type === "number" && (!val || isNaN(Number(val)))) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!user || !targetUserId) return;
    
    // BLOQUEIO DE AÇÃO CRÍTICA
    if (!isReady || isDegraded) {
      console.warn("[FJ:FitnessAnamnesis] Submit blocked: System not ready or degraded", { isReady, isDegraded });
      toast.error("O sistema ainda está carregando dados vitais ou em modo limitado. Aguarde um momento.");
      return;
    }

    setSubmitting(true);

    const payload = {
      user_id: targetUserId,
      answers,
      status: "completed",
      ...getTenantIdForInsert(tenantId),
    } as any;

    let error;
    if (draftId) {
      ({ error } = await supabase.from("patient_anamnesis").update(payload).eq("id", draftId));
    } else {
      ({ error } = await supabase.from("patient_anamnesis").insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      setSubmitting(false);
      return;
    }

    toast.success("Anamnese de treino salva com sucesso! 🏋️");
    setSubmitting(false);
    setCompleted(true);
  };

  if (completed) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div className="flex flex-col items-center text-center mb-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center mb-6 shadow-glow">
                <Dumbbell className="w-12 h-12 text-primary-foreground" />
              </motion.div>
              <h1 className="font-display text-3xl font-bold mb-2">Anamnese de Treino Concluída! 💪</h1>
              <p className="text-muted-foreground max-w-md">
                Todos os dados foram coletados. O personal trainer agora tem as informações necessárias para montar seu treino personalizado.
              </p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass rounded-xl p-4 text-center">
                <span className="text-2xl">🎯</span>
                <p className="font-display font-bold text-sm mt-1 capitalize">
                  {answers.fitness_goal === "hypertrophy" ? "Hipertrofia" : answers.fitness_goal === "fat_loss" ? "Emagrecimento" : answers.fitness_goal === "strength" ? "Força" : answers.fitness_goal === "conditioning" ? "Condicionamento" : answers.fitness_goal === "health" ? "Saúde" : "Reabilitação"}
                </p>
                <p className="text-xs text-muted-foreground">Objetivo</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <span className="text-2xl">📅</span>
                <p className="font-display font-bold text-sm mt-1">{answers.desired_frequency || "?"}x/sem</p>
                <p className="text-xs text-muted-foreground">Frequência</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <span className="text-2xl">💪</span>
                <p className="font-display font-bold text-sm mt-1 capitalize">
                  {answers.training_experience === "never" ? "Iniciante" : answers.training_experience === "beginner" ? "< 6 meses" : answers.training_experience === "intermediate" ? "Intermediário" : answers.training_experience === "advanced" ? "Avançado" : "Elite"}
                </p>
                <p className="text-xs text-muted-foreground">Experiência</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={handleEditAnamnesis} variant="outline" className="w-full gap-2">✏️ Revisar / Editar Respostas</Button>
              <Button onClick={() => navigate(isPersonalMode ? `/personal/students` : "/")} className="w-full gradient-primary shadow-glow">
                {isPersonalMode ? "Voltar aos Alunos" : "Voltar ao Dashboard"}
              </Button>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Personal Mode Banner */}
        {isPersonalMode && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Modo Personal — Preenchendo para: <span className="text-primary">{studentName}</span></p>
              <p className="text-xs text-muted-foreground">Preencha a anamnese de treino com base nas respostas do aluno.</p>
            </div>
          </motion.div>
        )}

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Pergunta {step + 1} de {questions.length}</span>
            <div className="flex items-center gap-3">
              {autoSaveStatus === "saving" && <span className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</span>}
              {autoSaveStatus === "saved" && <span className="flex items-center gap-1 text-xs text-success"><Save className="w-3 h-3" /> Salvo</span>}
              <span className="text-sm font-medium text-primary">{Math.round(progress)}%</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="space-y-6">

            {q.type === "single" && q.options && (
              <OrbitalSingleSelect
                title={q.title}
                subtitle={q.subtitle}
                options={q.options}
                value={answers[q.id]}
                onChange={(v) => setAnswer(v)}
              />
            )}

            {q.type === "multi" && q.options && (
              <OrbitalMultiSelect
                title={q.title}
                subtitle={q.subtitle}
                options={q.options}
                value={answers[q.id] || []}
                onChange={(v) => setAnswer(v)}
              />
            )}

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

            {q.type === "text" && (
              <OrbitalTextInput
                title={q.title}
                subtitle={q.subtitle}
                value={answers[q.id] || ""}
                onChange={(v) => setAnswer(v)}
                placeholder={q.placeholder}
              />
            )}

            {q.type === "time" && (
              <OrbitalTimeInput
                title={q.title}
                subtitle={q.subtitle}
                value={answers[q.id] || ""}
                onChange={(v) => setAnswer(v)}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </Button>
            <Button variant="outline" size="sm" onClick={async () => {
              await performAutoSave(answers);
              toast.success("Rascunho salvo! Você pode continuar depois 💾");
              navigate(isPersonalMode ? "/personal/students" : "/");
            }} className="gap-1.5 text-muted-foreground">
              <Save className="w-4 h-4" /> Salvar e sair
            </Button>
          </div>

          {step < questions.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()} className="gradient-primary gap-1 shadow-glow">
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canNext() || submitting} className="gradient-primary gap-2 shadow-glow">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Dumbbell className="w-4 h-4" /> Concluir Anamnese</>}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
