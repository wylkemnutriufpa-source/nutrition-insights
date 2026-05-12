/**
 * Adaptive Anamnesis — Conditional question blocks that appear based on patient responses.
 * 
 * Each block defines:
 *  - trigger: condition based on previous answers
 *  - domain: clinical domain for structured flags
 *  - questions: additional questions shown when triggered
 */

interface Option {
  label: string;
  emoji: string;
  value: string;
}

interface AdaptiveQuestion {
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

export interface AdaptiveBlock {
  id: string;
  domain: string;
  label: string;
  triggerFn: (answers: Record<string, any>) => boolean;
  questions: AdaptiveQuestion[];
}

export const ADAPTIVE_BLOCKS: AdaptiveBlock[] = [
  // ── Digestive Advanced (triggered by gastritis/digestion issues) ──
  {
    id: "digestive_advanced",
    domain: "digestivo",
    label: "🔬 Avaliação Digestiva Avançada",
    triggerFn: (a) => {
      const digestion = a.digestion;
      const conditions = a.health_conditions || [];
      const symptoms = a.symptoms || [];
      const history = (a.clinical_history || "").toLowerCase();
      return (
        digestion === "very_bad" ||
        digestion === "irregular" ||
        symptoms.includes("bloating") ||
        history.includes("gastrite") ||
        history.includes("refluxo") ||
        history.includes("sii") ||
        history.includes("intestino") ||
        conditions.includes("ibs")
      );
    },
    questions: [
      {
        id: "digestive_frequency",
        title: "Com que frequência sente desconforto digestivo?",
        subtitle: "Inchaço, gases, azia, refluxo...",
        type: "single",
        options: [
          { label: "Diariamente", emoji: "😫", value: "daily" },
          { label: "Várias vezes/semana", emoji: "😣", value: "several_weekly" },
          { label: "1-2x por semana", emoji: "😕", value: "weekly" },
          { label: "Raramente", emoji: "😌", value: "rarely" },
        ],
      },
      {
        id: "digestive_triggers",
        title: "O que piora seus sintomas digestivos?",
        subtitle: "Selecione todos que se aplicam",
        type: "multi",
        options: [
          { label: "Alimentos gordurosos", emoji: "🍟", value: "fatty_foods" },
          { label: "Lactose", emoji: "🥛", value: "lactose" },
          { label: "Glúten", emoji: "🌾", value: "gluten" },
          { label: "Cafeína", emoji: "☕", value: "caffeine" },
          { label: "Estresse", emoji: "😰", value: "stress" },
          { label: "Não sei identificar", emoji: "🤷", value: "unknown" },
        ],
      },
      {
        id: "bowel_regularity",
        title: "Como está a regularidade intestinal?",
        subtitle: "Frequência de evacuação",
        type: "single",
        options: [
          { label: "Constipação frequente", emoji: "🚫", value: "constipated" },
          { label: "Irregular (alterna)", emoji: "🔄", value: "irregular" },
          { label: "Regular (1-2x/dia)", emoji: "✅", value: "regular" },
          { label: "Diarreia frequente", emoji: "⚠️", value: "diarrhea" },
        ],
      },
    ],
  },

  // ── Performance (triggered by weight training) ──
  {
    id: "performance_metabolic",
    domain: "performance_fisica",
    label: "💪 Performance Metabólica",
    triggerFn: (a) => {
      const exercises = a.exercise_type || [];
      const activity = a.activity_level;
      return (
        exercises.includes("weight_training") ||
        activity === "intense" ||
        a.goal === "gain_muscle"
      );
    },
    questions: [
      {
        id: "training_frequency",
        title: "Quantas vezes por semana treina musculação?",
        subtitle: "Sessões de treino resistido",
        type: "single",
        options: [
          { label: "1-2x", emoji: "1️⃣", value: "1-2" },
          { label: "3-4x", emoji: "3️⃣", value: "3-4" },
          { label: "5-6x", emoji: "5️⃣", value: "5-6" },
          { label: "7x (diário)", emoji: "7️⃣", value: "7" },
        ],
      },
      {
        id: "training_duration",
        title: "Duração média do treino?",
        subtitle: "Em minutos",
        type: "single",
        options: [
          { label: "30-45 min", emoji: "⏱️", value: "30-45" },
          { label: "45-60 min", emoji: "⏰", value: "45-60" },
          { label: "60-90 min", emoji: "🕐", value: "60-90" },
          { label: "90+ min", emoji: "💪", value: "90+" },
        ],
      },
      {
        id: "supplement_usage",
        title: "Usa suplementos esportivos?",
        subtitle: "Selecione todos que usa",
        type: "multi",
        options: [
          { label: "Whey Protein", emoji: "🥤", value: "whey" },
          { label: "Creatina", emoji: "💊", value: "creatine" },
          { label: "Pré-treino", emoji: "⚡", value: "preworkout" },
          { label: "BCAA", emoji: "🧪", value: "bcaa" },
          { label: "Nenhum", emoji: "❌", value: "none" },
        ],
      },
      {
        id: "post_workout_meal",
        title: "Faz refeição pós-treino?",
        subtitle: "Dentro de 1h após treinar",
        type: "single",
        options: [
          { label: "Sempre, planejada", emoji: "✅", value: "always_planned" },
          { label: "Às vezes", emoji: "🤔", value: "sometimes" },
          { label: "Raramente", emoji: "😕", value: "rarely" },
          { label: "Nunca", emoji: "❌", value: "never" },
        ],
      },
    ],
  },

  // ── Behavioral / Eating Anxiety (triggered by compulsion/anxiety) ──
  {
    id: "behavioral_eating",
    domain: "comportamental_alimentar",
    label: "🧠 Perfil Comportamental Alimentar",
    triggerFn: (a) => {
      const hunger = a.hunger_compulsion;
      const symptoms = a.symptoms || [];
      return (
        hunger === "always" ||
        hunger === "frequent" ||
        symptoms.includes("anxiety") ||
        a.feeling === "terrible" ||
        a.feeling === "bad"
      );
    },
    questions: [
      {
        id: "emotional_eating",
        title: "Come por motivos emocionais?",
        subtitle: "Ansiedade, estresse, tristeza...",
        type: "single",
        options: [
          { label: "Frequentemente", emoji: "😰", value: "frequently" },
          { label: "Às vezes", emoji: "🤔", value: "sometimes" },
          { label: "Raramente", emoji: "😊", value: "rarely" },
          { label: "Nunca", emoji: "✅", value: "never" },
        ],
      },
      {
        id: "binge_episodes",
        title: "Tem episódios de comer em excesso?",
        subtitle: "Perder controle sobre quantidade",
        type: "single",
        options: [
          { label: "Semanalmente", emoji: "🔴", value: "weekly" },
          { label: "Quinzenalmente", emoji: "🟡", value: "biweekly" },
          { label: "Mensalmente", emoji: "🟢", value: "monthly" },
          { label: "Nunca/Raramente", emoji: "✅", value: "rarely" },
        ],
      },
      {
        id: "night_eating",
        title: "Come durante a noite/madrugada?",
        subtitle: "Depois do horário habitual de dormir",
        type: "single",
        options: [
          { label: "Sim, frequentemente", emoji: "🌙", value: "frequently" },
          { label: "Às vezes", emoji: "🤔", value: "sometimes" },
          { label: "Não", emoji: "✅", value: "never" },
        ],
      },
      {
        id: "eating_disorder_history",
        title: "Já teve diagnóstico de transtorno alimentar?",
        subtitle: "Anorexia, bulimia, TCAP...",
        type: "single",
        options: [
          { label: "Sim, em tratamento", emoji: "💊", value: "current_treatment" },
          { label: "Sim, no passado", emoji: "📋", value: "past" },
          { label: "Suspeita, sem diagnóstico", emoji: "🤔", value: "suspected" },
          { label: "Não", emoji: "✅", value: "no" },
        ],
      },
    ],
  },

  // ── Micronutrients / Vitamin D (triggered by low sun exposure, fatigue) ──
  {
    id: "micronutrients",
    domain: "micronutrientes",
    label: "☀️ Micronutrientes & Vitamina D",
    triggerFn: (a) => {
      const symptoms = a.symptoms || [];
      const energy = a.energy_level;
      return (
        symptoms.includes("fatigue") ||
        energy === "very_low" ||
        energy === "low"
      );
    },
    questions: [
      {
        id: "sun_exposure",
        title: "Quanto tempo de sol por dia?",
        subtitle: "Exposição solar sem proteção",
        type: "single",
        options: [
          { label: "Menos de 10 min", emoji: "🏠", value: "minimal" },
          { label: "10-20 min", emoji: "⛅", value: "low" },
          { label: "20-30 min", emoji: "🌤️", value: "moderate" },
          { label: "30+ min", emoji: "☀️", value: "good" },
        ],
      },
      {
        id: "iron_symptoms",
        title: "Apresenta sinais de deficiência de ferro?",
        subtitle: "Palidez, unhas quebradiças, queda de cabelo...",
        type: "single",
        options: [
          { label: "Sim, vários sinais", emoji: "🔴", value: "multiple" },
          { label: "Alguns sinais", emoji: "🟡", value: "some" },
          { label: "Não identifico", emoji: "🟢", value: "none" },
        ],
      },
      {
        id: "recent_blood_work",
        title: "Fez exame de sangue recentemente?",
        subtitle: "Nos últimos 6 meses",
        type: "single",
        options: [
          { label: "Sim, tudo normal", emoji: "✅", value: "normal" },
          { label: "Sim, com alterações", emoji: "⚠️", value: "altered" },
          { label: "Não fez", emoji: "❌", value: "not_done" },
        ],
      },
    ],
  },

  // ── Sleep & Recovery (triggered by poor sleep quality / insomnia) ──
  {
    id: "sleep_recovery",
    domain: "sono_recuperacao",
    label: "💤 Sono & Recuperação",
    triggerFn: (a) => {
      const sleep = a.sleep_quality;
      const symptoms = a.symptoms || [];
      return (
        sleep === "terrible" ||
        sleep === "bad" ||
        symptoms.includes("insomnia")
      );
    },
    questions: [
      {
        id: "sleep_hours",
        title: "Quantas horas dorme por noite?",
        subtitle: "Em média",
        type: "slider",
        min: 3,
        max: 12,
        step: 0.5,
        unit: "horas",
      },
      {
        id: "sleep_latency",
        title: "Quanto tempo leva para pegar no sono?",
        subtitle: "Após deitar",
        type: "single",
        options: [
          { label: "Menos de 15 min", emoji: "😴", value: "quick" },
          { label: "15-30 min", emoji: "🤔", value: "moderate" },
          { label: "30-60 min", emoji: "😕", value: "long" },
          { label: "Mais de 1 hora", emoji: "😩", value: "very_long" },
        ],
      },
      {
        id: "wake_ups",
        title: "Acorda durante a noite?",
        subtitle: "Despertares involuntários",
        type: "single",
        options: [
          { label: "Nunca/raramente", emoji: "✅", value: "rarely" },
          { label: "1-2 vezes", emoji: "🤔", value: "sometimes" },
          { label: "3+ vezes", emoji: "😫", value: "frequently" },
        ],
      },
      {
        id: "caffeine_cutoff",
        title: "Última cafeína do dia?",
        subtitle: "Café, chá verde, energético...",
        type: "single",
        options: [
          { label: "Manhã (até 12h)", emoji: "☀️", value: "morning" },
          { label: "Tarde (12h-17h)", emoji: "🌤️", value: "afternoon" },
          { label: "Noite (após 17h)", emoji: "🌙", value: "evening" },
          { label: "Não consumo", emoji: "❌", value: "none" },
        ],
      },
    ],
  },

  // ── Hydration (triggered by low water intake) ──
  {
    id: "hydration_advanced",
    domain: "hidratacao",
    label: "💧 Hidratação",
    triggerFn: (a) => {
      const water = a.water_intake;
      return water !== undefined && water < 6;
    },
    questions: [
      {
        id: "dehydration_signs",
        title: "Apresenta sinais de desidratação?",
        subtitle: "Selecione todos que se aplicam",
        type: "multi",
        options: [
          { label: "Boca seca frequente", emoji: "👄", value: "dry_mouth" },
          { label: "Urina escura", emoji: "🟡", value: "dark_urine" },
          { label: "Dor de cabeça", emoji: "🤕", value: "headache" },
          { label: "Pele seca", emoji: "🤲", value: "dry_skin" },
          { label: "Nenhum", emoji: "✅", value: "none" },
        ],
      },
      {
        id: "hydration_barriers",
        title: "Por que não bebe mais água?",
        subtitle: "Principal motivo",
        type: "single",
        options: [
          { label: "Esqueço", emoji: "🤷", value: "forget" },
          { label: "Não gosto", emoji: "😕", value: "dislike" },
          { label: "Sem acesso fácil", emoji: "🚰", value: "access" },
          { label: "Prefiro outros líquidos", emoji: "🥤", value: "other_drinks" },
        ],
      },
    ],
  },
];

/**
 * Given current answers, returns which adaptive blocks should be shown.
 */
export function getActiveAdaptiveBlocks(answers: Record<string, any>): AdaptiveBlock[] {
  return ADAPTIVE_BLOCKS.filter((block) => block.triggerFn(answers));
}

/**
 * Extracts structured clinical flags from answers for all triggered blocks.
 */
export function extractClinicalFlags(answers: Record<string, any>): Record<string, any> {
  const flags: Record<string, any> = {};
  const activeBlocks = getActiveAdaptiveBlocks(answers);

  for (const block of activeBlocks) {
    flags[block.domain] = {
      triggered: true,
      block_id: block.id,
      answers: {} as Record<string, any>,
    };
    for (const q of block.questions) {
      if (answers[q.id] !== undefined) {
        flags[block.domain].answers[q.id] = answers[q.id];
      }
    }
  }

  return flags;
}
