export interface ReadinessScreening {
  medical_advice_avoid: boolean;
  chest_pain: boolean;
  dizziness: boolean;
  heart_condition: boolean;
  high_bp_diabetes: boolean;
  pregnancy: boolean;
  adaptation_needed: boolean;
  needs_medical_clearance: boolean;
}

export interface PainLocation {
  area: string;
  intensity: number; // 1-10
  side?: "left" | "right" | "both";
}

export interface TrainerAnamnesisData {
  // Synced
  synced_patient_data: {
    name?: string;
    age?: number;
    sex?: string;
    weight?: number;
    height?: number;
    goal?: string;
    flags?: string[];
    restrictions?: string[];
  };

  // Step 1: Readiness
  readiness_screening: ReadinessScreening;
  requires_medical_review: boolean;
  medical_clearance: boolean;
  medical_clearance_notes: string;

  // Step 2: Pain / Injury
  current_pain: boolean;
  pain_locations: PainLocation[];
  injuries: string;
  surgeries: string;
  specific_conditions: string[];
  movements_to_avoid: string[];
  movements_that_worsen: string[];
  does_physiotherapy: boolean;
  has_medical_report: boolean;

  // Step 3: Training History
  has_trained_before: boolean;
  training_years: number | null;
  last_training_period: string;
  perceived_level: string;
  modalities_practiced: string[];
  previous_frequency: number | null;
  liked_exercises: string;
  disliked_exercises: string;
  training_difficulties: string;

  // Step 4: Availability
  weekly_availability: number;
  available_hours: string[];
  session_duration: number;
  training_location: string;
  training_modality: string;
  available_equipment: string[];
  work_routine: string;
  sleep_quality: string;
  energy_level: string;

  // Step 5: Goals
  primary_goal: string;
  secondary_goals: string[];

  // Step 6: Coaching Style
  coaching_intensity: string;
  wants_reminders: boolean;
  wants_video_tutorials: boolean;
  wants_post_workout_feedback: boolean;
  plan_flexibility: string;

  // Step 7: Notes
  notes: string;

  // Meta
  wizard_step: number;
  is_complete: boolean;
}

export const INITIAL_READINESS: ReadinessScreening = {
  medical_advice_avoid: false,
  chest_pain: false,
  dizziness: false,
  heart_condition: false,
  high_bp_diabetes: false,
  pregnancy: false,
  adaptation_needed: false,
  needs_medical_clearance: false,
};

export const INITIAL_DATA: TrainerAnamnesisData = {
  synced_patient_data: {},
  readiness_screening: INITIAL_READINESS,
  requires_medical_review: false,
  medical_clearance: false,
  medical_clearance_notes: "",
  current_pain: false,
  pain_locations: [],
  injuries: "",
  surgeries: "",
  specific_conditions: [],
  movements_to_avoid: [],
  movements_that_worsen: [],
  does_physiotherapy: false,
  has_medical_report: false,
  has_trained_before: false,
  training_years: null,
  last_training_period: "",
  perceived_level: "beginner",
  modalities_practiced: [],
  previous_frequency: null,
  liked_exercises: "",
  disliked_exercises: "",
  training_difficulties: "",
  weekly_availability: 3,
  available_hours: [],
  session_duration: 60,
  training_location: "gym",
  training_modality: "presencial",
  available_equipment: [],
  work_routine: "",
  sleep_quality: "",
  energy_level: "",
  primary_goal: "",
  secondary_goals: [],
  coaching_intensity: "moderate",
  wants_reminders: true,
  wants_video_tutorials: true,
  wants_post_workout_feedback: true,
  plan_flexibility: "flexible",
  notes: "",
  wizard_step: 0,
  is_complete: false,
};

export const CONDITIONS_LIST = [
  "Hérnia de disco", "Lombalgia", "Escoliose", "Condromalácia",
  "Tendinite", "Bursite", "Artrose", "Fibromialgia",
  "Síndrome do impacto", "Fascite plantar"
];

export const MODALITIES = [
  "Musculação", "Funcional", "Crossfit", "Calistenia", "HIIT",
  "Natação", "Corrida", "Ciclismo", "Pilates", "Yoga",
  "Artes Marciais", "Dança", "Outro"
];

export const EQUIPMENT_OPTIONS = [
  "Academia completa", "Home gym básico", "Apenas peso corporal",
  "Halteres", "Barra e anilhas", "Elásticos", "Kettlebell",
  "TRX", "Corda", "Step", "Bola suíça"
];

export const GOAL_OPTIONS = [
  { key: "fat_loss", label: "Emagrecimento", icon: "🔥" },
  { key: "hypertrophy", label: "Hipertrofia", icon: "💪" },
  { key: "conditioning", label: "Condicionamento", icon: "🫁" },
  { key: "mobility", label: "Mobilidade", icon: "🧘" },
  { key: "rehab", label: "Reabilitação", icon: "🩹" },
  { key: "performance", label: "Performance", icon: "⚡" },
  { key: "posture", label: "Postura", icon: "🧍" },
  { key: "quality_of_life", label: "Qualidade de vida", icon: "🌿" },
];

export const HOURS_OPTIONS = [
  "05:00-07:00", "07:00-09:00", "09:00-11:00", "11:00-13:00",
  "13:00-15:00", "15:00-17:00", "17:00-19:00", "19:00-21:00", "21:00-23:00"
];

export const STEP_TITLES = [
  "Dados Sincronizados",
  "Prontidão para Exercício",
  "Dor, Lesões e Limitações",
  "Histórico de Treino",
  "Disponibilidade e Estrutura",
  "Objetivo do Treino",
  "Estilo de Acompanhamento",
];
