/**
 * Unified route map: feature_key → app route
 * Used by Guide Engine slides, ProfessionalGuide, UserGuide, etc.
 */

// Professional feature routes
export const PROFESSIONAL_ROUTE_MAP: Record<string, string> = {
  // Static slide IDs
  overview: "/dashboard",
  cockpit: "/clinical-risk",
  editor: "/editor-v2",
  results: "/reports",
  engine: "/meal-plans",
  // DB feature_keys (professional)
  ai_meal_analysis: "/analyze-meal",
  ai_recipe_generator: "/recipes",
  ai_anamnesis: "/anamnesis",
  clinical_intelligence: "/clinical-intelligence",
  clinical_brain: "/clinical-intelligence",
  automation_center: "/automation",
  patients_management: "/patients",
  meal_plan_editor: "/meal-plans",
  meal_plan_editor_v2: "/editor-v2",
  protocols: "/protocols",
  programs: "/programs",
  onboarding_pipeline: "/patients",
  patient_import: "/import-patients",
  chat: "/chat",
  whatsapp_integration: "/settings/whatsapp",
  notifications: "/notifications",
  appointments: "/appointments",
  food_database: "/food-database",
  recipes: "/recipes",
  shopping_list: "/shopping-list",
  body_analysis: "/body-analysis",
  branding: "/branding",
  supplements: "/supplements",
  reports: "/reports",
  financial: "/financial",
  crm: "/professional/crm",
  clinical_risk: "/clinical-risk",
  growth_dashboard: "/reports",
  clinical_cockpit: "/clinical-risk",
  clinical_alerts: "/clinical-risk",
  dashboard: "/dashboard",
  meal_plans: "/meal-plans",
  patient_management: "/patients",
};

// Patient feature routes
export const PATIENT_ROUTE_MAP: Record<string, string> = {
  // Static slide IDs
  routine: "/checklist",
  "meal-plan": "/my-diet",
  progress: "/checkin",
  interpret: "/achievements",
  support: "/chat",
  // DB feature_keys (patient)
  meal_logging: "/meals",
  meal_plan_view: "/my-diet",
  meal_adherence: "/my-diet",
  shopping_list: "/shopping-list",
  favorite_recipes: "/recipes",
  ai_meal_analysis: "/analyze-meal",
  ai_recipe_generator: "/recipes",
  ai_body_analysis: "/body-analysis",
  chat: "/chat",
  ai_anamnesis_insights: "/anamnesis",
  checklist: "/checklist",
  achievements: "/achievements",
  challenges: "/challenges",
  ranking: "/ranking",
  weekly_goals: "/weekly-goals",
  journey: "/journey",
  gamification_xp: "/achievements",
  checkin: "/checkin",
  feedback: "/feedbacks",
  notifications: "/notifications",
  planner: "/planner",
  anamnesis: "/anamnesis",
  physical_assessment_view: "/body-projection",
  supplements_view: "/supplements",
  health_quiz: "/health-quiz",
  weight_calculator: "/weight-calculator",
  water_calculator: "/water-calculator",
  weekly_report: "/weekly-report",
  onboarding_pipeline: "/onboarding",
  prestige_view: "/achievements",
};

/**
 * Resolve a feature_key or slide ID to a route.
 * Tries professional map first, then patient map.
 */
export function resolveFeatureRoute(featureKey: string, audience?: "professional" | "patient"): string | null {
  if (audience === "patient") {
    return PATIENT_ROUTE_MAP[featureKey] ?? PROFESSIONAL_ROUTE_MAP[featureKey] ?? null;
  }
  if (audience === "professional") {
    return PROFESSIONAL_ROUTE_MAP[featureKey] ?? PATIENT_ROUTE_MAP[featureKey] ?? null;
  }
  return PROFESSIONAL_ROUTE_MAP[featureKey] ?? PATIENT_ROUTE_MAP[featureKey] ?? null;
}
