/**
 * ═══════════════════════════════════════════════════════════
 * CONSTITUIÇÃO CLÍNICA DO FITJOURNEY
 * ═══════════════════════════════════════════════════════════
 *
 * Este arquivo é a "lei fundamental" do sistema clínico.
 * Todas as regras, limites e parâmetros seguros estão aqui.
 * Nenhum motor pode ultrapassar esses limites.
 *
 * Versão: 1.0.0
 * Última revisão: 2026-03-16
 * ═══════════════════════════════════════════════════════════
 */

// ── LIMITES DE PERDA DE PESO ────────────────────────────────
export const WEIGHT_LOSS_LIMITS = {
  /** Perda máxima recomendada por semana (kg) */
  MAX_WEEKLY_LOSS_KG: 1.0,
  /** Perda máxima aceitável por semana (kg) — acima disso = alerta */
  ALERT_WEEKLY_LOSS_KG: 1.5,
  /** Perda máxima por mês (kg) */
  MAX_MONTHLY_LOSS_KG: 4.0,
  /** Ganho máximo semanal em bulking (kg) */
  MAX_WEEKLY_GAIN_KG: 0.5,
} as const;

// ── LIMITES DE DÉFICIT CALÓRICO ─────────────────────────────
export const CALORIC_DEFICIT_LIMITS = {
  /** Déficit máximo seguro (% do TDEE) */
  MAX_DEFICIT_PERCENT: 25,
  /** Déficit moderado recomendado (%) */
  RECOMMENDED_DEFICIT_PERCENT: 15,
  /** Déficit mínimo para perda (%) */
  MIN_EFFECTIVE_DEFICIT_PERCENT: 8,
  /** Calorias mínimas absolutas — mulheres */
  MIN_CALORIES_FEMALE: 1200,
  /** Calorias mínimas absolutas — homens */
  MIN_CALORIES_MALE: 1500,
  /** Déficit agressivo que dispara alerta (%) */
  AGGRESSIVE_DEFICIT_THRESHOLD: 20,
} as const;

// ── JANELAS DE DETECÇÃO ─────────────────────────────────────
export const DETECTION_WINDOWS = {
  /** Dias mínimos sem atividade para sinal de inatividade leve */
  INACTIVITY_WARNING_DAYS: 7,
  /** Dias sem atividade para alerta crítico */
  INACTIVITY_CRITICAL_DAYS: 14,
  /** Semanas mínimas para detectar platô de peso */
  PLATEAU_MIN_WEEKS: 3,
  /** Variação máxima (kg) para considerar platô */
  PLATEAU_TOLERANCE_KG: 0.5,
  /** Dias sem refeição registrada para alerta */
  NO_MEAL_WARNING_DAYS: 3,
  /** Dias sem refeição para alerta crítico */
  NO_MEAL_CRITICAL_DAYS: 7,
  /** Dias mínimos de dados para projeções confiáveis */
  MIN_DATA_DAYS_FOR_PROJECTIONS: 14,
  /** Dias mínimos para cálculos de tendência */
  MIN_DATA_DAYS_FOR_TRENDS: 7,
} as const;

// ── INTERVALOS DE AJUSTE ────────────────────────────────────
export const ADJUSTMENT_INTERVALS = {
  /** Horas mínimas entre ajustes automáticos do mesmo tipo */
  MIN_HOURS_BETWEEN_AUTO_ADJUSTMENTS: 168, // 7 dias
  /** Dias mínimos de observação antes de ajuste calórico */
  MIN_OBSERVATION_DAYS_BEFORE_CALORIC_CHANGE: 14,
  /** Máximo de ajuste calórico por ciclo (%) */
  MAX_CALORIC_ADJUSTMENT_PERCENT: 5,
  /** Cooldown entre alertas do mesmo tipo (horas) */
  ALERT_COOLDOWN_HOURS: 24,
  /** Dias mínimos entre transições de protocolo */
  MIN_DAYS_BETWEEN_PROTOCOL_TRANSITIONS: 14,
} as const;

// ── LIMITES DE CONFIANÇA ────────────────────────────────────
export const CONFIDENCE_THRESHOLDS = {
  /** Score mínimo para automação segura */
  MIN_AUTOMATION_CONFIDENCE: 70,
  /** Score mínimo para projeções confiáveis */
  MIN_PROJECTION_CONFIDENCE: 60,
  /** Score mínimo para simulações acionáveis */
  MIN_SIMULATION_CONFIDENCE: 50,
  /** Amostra mínima para insights populacionais */
  MIN_COHORT_SIZE: 20,
  /** Máximo de recalibração por ciclo (%) */
  MAX_RECALIBRATION_PERCENT: 5,
  /** Amostra mínima para recalibração */
  MIN_RECALIBRATION_SAMPLE: 15,
} as const;

// ── LIMITES DE ADESÃO ───────────────────────────────────────
export const ADHERENCE_THRESHOLDS = {
  /** Adesão crítica (%) — abaixo disso = risco alto */
  CRITICAL_ADHERENCE: 30,
  /** Adesão baixa (%) */
  LOW_ADHERENCE: 50,
  /** Adesão moderada (%) */
  MODERATE_ADHERENCE: 70,
  /** Adesão boa (%) */
  GOOD_ADHERENCE: 85,
  /** Adesão excelente (%) */
  EXCELLENT_ADHERENCE: 95,
} as const;

// ── LIMITES DE RISCO ────────────────────────────────────────
export const RISK_THRESHOLDS = {
  /** Score de risco baixo (0-100) */
  LOW_RISK_MAX: 30,
  /** Score de risco moderado */
  MODERATE_RISK_MAX: 60,
  /** Score de risco alto */
  HIGH_RISK_MAX: 80,
  /** Acima disso = crítico */
  CRITICAL_RISK_MIN: 80,
} as const;

// ── LIMITES DE GAMIFICAÇÃO ──────────────────────────────────
export const GAMIFICATION_LIMITS = {
  /** Máximo de pontos por dia (total) */
  MAX_DAILY_POINTS: 200,
  /** Burst máximo aceitável (completions em 1 min) */
  MAX_BURST_1MIN: 3,
  /** Burst máximo em 5 min */
  MAX_BURST_5MIN: 8,
  /** Cooldown entre mesma ação de pontuação (segundos) */
  MIN_ACTION_INTERVAL_SECONDS: 10,
} as const;

// ── LIMITES DE PROCESSAMENTO ────────────────────────────────
export const PROCESSING_LIMITS = {
  /** Máximo de pacientes por lote de processamento */
  MAX_BATCH_SIZE: 50,
  /** Timeout máximo de edge function (ms) */
  EDGE_FUNCTION_TIMEOUT_MS: 25000,
  /** Limite de rows do Supabase por query */
  SUPABASE_ROW_LIMIT: 1000,
  /** Intervalo de refresh do ranking cache (min) */
  RANKING_CACHE_REFRESH_MIN: 30,
} as const;

// ── FLUXO DE PROCESSAMENTO DIÁRIO ───────────────────────────
export const DAILY_PROCESSING_PIPELINE = [
  {
    order: 1,
    name: "Seed Daily Checklist",
    function: "seed-daily-checklist",
    schedule: "0 5 * * *", // 5h
    description: "Gera checklist diário para todos os pacientes ativos",
    dependencies: [],
  },
  {
    order: 2,
    name: "Detect Adherence Patterns",
    function: "detect-adherence-patterns",
    schedule: "0 6 * * *", // 6h
    description: "Calcula padrões de adesão baseado em checklist e refeições",
    dependencies: ["seed-daily-checklist"],
  },
  {
    order: 3,
    name: "Detect Patient Signals",
    function: "detect-patient-signals",
    schedule: "0 7 * * *", // 7h
    description: "Detecta sinais clínicos (inatividade, baixa adesão, streaks)",
    dependencies: ["detect-adherence-patterns"],
  },
  {
    order: 4,
    name: "Detect Clinical Alerts",
    function: "detect-clinical-alerts",
    schedule: "0 8 * * *", // 8h (a cada 6h)
    description: "Gera alertas clínicos baseados nos sinais detectados",
    dependencies: ["detect-patient-signals"],
  },
  {
    order: 5,
    name: "Clinical Rule Engine",
    function: "clinical-rule-engine",
    schedule: "on-demand",
    description: "Avalia regras e gera recomendações (chamado por demanda)",
    dependencies: ["detect-patient-signals"],
  },
  {
    order: 6,
    name: "Compute Behavioral Dropout Risk",
    function: "compute-behavioral-dropout-risk",
    schedule: "0 9 * * *", // 9h
    description: "Calcula risco de abandono por paciente",
    dependencies: ["detect-adherence-patterns", "detect-patient-signals"],
  },
  {
    order: 7,
    name: "Compute Therapeutic Adjustments",
    function: "compute-therapeutic-adjustments",
    schedule: "0 10 * * *", // 10h
    description: "Sugere ajustes terapêuticos baseados em evolução",
    dependencies: ["compute-behavioral-dropout-risk"],
  },
  {
    order: 8,
    name: "Compute Weight Trajectory",
    function: "compute-weight-trajectory-engine",
    schedule: "0 11 * * *", // 11h
    description: "Projeta trajetória de peso e detecta platôs",
    dependencies: ["detect-adherence-patterns"],
  },
  {
    order: 9,
    name: "Compute Metabolic Twin",
    function: "compute-metabolic-twin-engine",
    schedule: "0 12 * * *", // 12h
    description: "Atualiza digital twin metabólico individual",
    dependencies: ["compute-weight-trajectory-engine"],
  },
  {
    order: 10,
    name: "Compute Population Intelligence",
    function: "compute-population-nutrition-intelligence",
    schedule: "0 3 * * 0", // Domingos 3h (semanal)
    description: "Recalcula inteligência populacional e benchmarks",
    dependencies: ["compute-metabolic-twin-engine"],
  },
  {
    order: 11,
    name: "Global Adaptive Intelligence",
    function: "compute-global-adaptive-clinical-intelligence",
    schedule: "0 4 * * 0", // Domingos 4h (semanal)
    description: "Auto-calibra pesos e parâmetros dos motores",
    dependencies: ["compute-population-nutrition-intelligence"],
  },
  {
    order: 12,
    name: "Refresh Ranking Cache",
    function: "refresh_ranking_cache",
    schedule: "*/30 * * * *", // A cada 30min
    description: "Atualiza cache do ranking global",
    dependencies: [],
  },
] as const;

// ── VERSÕES DOS MOTORES ─────────────────────────────────────
export const ENGINE_VERSIONS = {
  CLINICAL_RULE_ENGINE: "1.0.0",
  BEHAVIORAL_DROPOUT: "1.0.0",
  THERAPEUTIC_ORCHESTRATION: "1.0.0",
  CLINICAL_SIMULATION: "1.0.0",
  CLINICAL_PREDICTION: "1.0.0",
  SAFE_AUTOMATION: "1.0.0",
  GLOBAL_ADAPTIVE: "1.0.0",
  WEIGHT_TRAJECTORY: "1.0.0",
  METABOLIC_TWIN: "1.0.0",
  POPULATION_NUTRITION: "1.0.0",
  PROTOCOL_MASTER: "2.1.0",
} as const;

// ── TOM DE VOZ DO SISTEMA ───────────────────────────────────
export const VOICE_GUIDELINES = {
  /** Tom geral: inteligência que cuida */
  TONE: "empathetic_intelligence",
  /** Nunca usar linguagem alarmista sem contexto */
  NEVER_ALARMIST: true,
  /** Sempre sugerir ação positiva junto com alerta */
  ALWAYS_SUGGEST_ACTION: true,
  /** Projeções devem usar "tendência" não "previsão" */
  USE_TREND_NOT_PREDICTION: true,
  /** Máximo de alertas simultâneos visíveis */
  MAX_VISIBLE_ALERTS: 5,
  /** Máximo de métricas no dashboard principal */
  MAX_DASHBOARD_METRICS: 8,
} as const;

// ── NARRATIVA DO PRODUTO ────────────────────────────────────
export const PRODUCT_NARRATIVE = {
  TAGLINE: "Inteligência que cuida da evolução de cada paciente",
  PITCH: "Uma plataforma de acompanhamento nutricional inteligente, que antecipa riscos, projeta evolução e adapta estratégias com base em dados reais.",
  DIFFERENTIALS: [
    "Motor clínico 100% determinístico",
    "Inteligência populacional proprietária",
    "Digital twin metabólico individual",
    "Automação segura com guardrails clínicos",
    "Protocolo FitJourney™ proprietário",
  ],
} as const;
