import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenantContext";
import { withTenantFilter } from "@/lib/tenantQueryHelpers";
import { FEATURE_REGISTRY, type FeatureDefinition } from "@/lib/featureRegistry";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Trophy, Lightbulb, ChevronRight, Sparkles, Star, Zap,
  CheckCircle2, Lock, Clock,
} from "lucide-react";
import { Link } from "react-router-dom";

type FeatureStatus = "enabled" | "disabled" | "coming_soon";

// Map feature names to routes for quick navigation
const FEATURE_ROUTES: Record<string, string> = {
  ia_plan: "/analyze",
  automations: "/automation",
  recipe_generator: "/recipes",
  ai_body_analysis: "/body-analysis",
  ai_anamnesis: "/anamnesis",
  weekly_report_ai: "/weekly-report",
  behavioral_analysis: "/automation",
  nutrition_copilot: "/",
  churn_prediction: "/",
  adherence_gamification: "/achievements",
  patients: "/patients",
  meal_plans: "/meal-plans",
  protocols: "/protocols",
  programs: "/programs",
  physical_assessment: "/physical-assessment",
  supplements: "/supplements",
  checkin_panel: "/checkin-panel",
  import_patients: "/import-patients",
  document_upload: "/patients",
  chat: "/chat",
  appointments: "/appointments",
  notifications_push: "/settings",
  feedbacks: "/feedbacks",
  global_tips: "/global-tips",
  food_database: "/food-database",
  recipes: "/recipes",
  shopping_list: "/shopping-list",
  diet_templates: "/diet-templates",
  branding: "/branding",
  reports: "/reports",
  financial: "/financial",
  system_usage_gamification: "/",
  progress_simulation: "/",
  clinical_intelligence: "/clinical-intelligence",
  ai_strategy_center: "/",
  clinical_decision_support: "/patients",
  public_profile: "/my-public-profile",
  program_landing: "/programs",
  patient_referrals: "/my-referrals",
  lead_generation: "/my-public-profile",
  growth_dashboard: "/admin/growth",
  weekly_goals: "/weekly-goals",
  patient_checkin: "/checkin",
  patient_journey: "/journey",
  health_quiz: "/health-quiz",
  weight_calculator: "/weight-calculator",
  water_calculator: "/water-calculator",
};

// Tips for each feature to encourage exploration
const FEATURE_TIPS: Record<string, string> = {
  ia_plan: "Analise refeições dos pacientes com IA e receba feedback nutricional automático.",
  automations: "Crie regras automáticas para engajar pacientes quando detectar padrões negativos.",
  recipe_generator: "Gere receitas personalizadas com IA baseadas nas restrições do paciente.",
  
  ai_body_analysis: "Analise composição corporal por fotos e acompanhe a evolução visual.",
  ai_anamnesis: "Extraia insights automáticos das anamneses para planos mais precisos.",
  weekly_report_ai: "Relatórios semanais gerados automaticamente com progresso dos pacientes.",
  behavioral_analysis: "Detecte padrões de adesão e dispare suporte automático nos momentos certos.",
  nutrition_copilot: "Assistente clínico IA com fila de prioridade e alertas inteligentes.",
  churn_prediction: "Identifique pacientes em risco de abandono antes que aconteça.",
  adherence_gamification: "Engaje pacientes com streak, badges e pontos por adesão.",
  patients: "Cadastre e gerencie todos os seus pacientes em um só lugar.",
  meal_plans: "Crie planos alimentares completos com macros calculados automaticamente.",
  protocols: "Monte protocolos clínicos reutilizáveis com tarefas diárias.",
  programs: "Estruture programas com fases, metas e acompanhamento em grupo.",
  physical_assessment: "Registre avaliações antropométricas completas com cálculos automáticos.",
  supplements: "Prescreva e acompanhe suplementação de cada paciente.",
  checkin_panel: "Revise check-ins dos pacientes com fotos, peso e feedback.",
  import_patients: "Importe pacientes em massa via arquivo CSV.",
  document_upload: "Faça upload de exames, laudos e documentos dos pacientes.",
  chat: "Comunique-se diretamente com seus pacientes via chat integrado.",
  appointments: "Organize sua agenda de consultas com lembretes automáticos.",
  notifications_push: "Envie notificações push para manter seus pacientes engajados.",
  feedbacks: "Receba e responda feedbacks dos pacientes sobre o tratamento.",
  global_tips: "Publique dicas nutricionais para todos os seus pacientes.",
  food_database: "Consulte valores nutricionais de alimentos da tabela TACO.",
  recipes: "Gerencie uma biblioteca de receitas saudáveis.",
  shopping_list: "Gere listas de compras automáticas baseadas nos planos alimentares.",
  diet_templates: "Use templates de dieta pré-configurados para agilizar prescrições.",
  branding: "Personalize a identidade visual do seu consultório no sistema.",
  reports: "Gere relatórios detalhados de progresso dos pacientes.",
  financial: "Controle receitas, despesas e fluxo de caixa do consultório.",
  system_usage_gamification: "Acompanhe quanto do sistema você já explorou.",
  progress_simulation: "Simule a evolução do paciente com diferentes cenários de adesão.",
  clinical_intelligence: "Dashboard de inteligência clínica com insights avançados.",
  ai_strategy_center: "Centro estratégico com diagnóstico da clínica e plano de ação IA.",
  clinical_decision_support: "Alertas e recomendações clínicas baseadas em dados do paciente.",
  public_profile: "Ative sua página pública para captar novos pacientes.",
  program_landing: "Crie landing pages públicas para seus programas.",
  patient_referrals: "Permita que pacientes indiquem novos clientes com links rastreáveis.",
  lead_generation: "Capture leads diretamente das suas páginas públicas.",
  growth_dashboard: "Visualize métricas de crescimento da sua rede profissional.",
  weekly_goals: "Defina e acompanhe metas semanais com seus pacientes.",
  patient_checkin: "Check-in semanal do paciente com peso, fotos e feedback.",
  patient_journey: "Acompanhe toda a jornada e conquistas do paciente.",
  health_quiz: "Questionário interativo de avaliação de saúde.",
  weight_calculator: "Calcule peso ideal e composição corporal.",
  water_calculator: "Calcule a necessidade hídrica diária do paciente.",
};

// Milestones for gamification
function getLevel(percentage: number): { level: number; title: string; color: string } {
  if (percentage >= 90) return { level: 5, title: "Expert 🏆", color: "text-amber-500" };
  if (percentage >= 70) return { level: 4, title: "Avançado ⭐", color: "text-primary" };
  if (percentage >= 50) return { level: 3, title: "Intermediário 🚀", color: "text-info" };
  if (percentage >= 25) return { level: 2, title: "Explorador 🔍", color: "text-success" };
  return { level: 1, title: "Iniciante 🌱", color: "text-muted-foreground" };
}

export default function SystemUsageCard() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [usedFeatures, setUsedFeatures] = useState<Set<string>>(new Set());
  const [featureStatuses, setFeatureStatuses] = useState<Record<string, FeatureStatus>>({});
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Get feature statuses from professional_feature_usage
      const { data: featureRows } = await supabase
        .from("professional_feature_usage" as any)
        .select("feature_name, status")
        .eq("nutritionist_id", user.id);

      const statuses: Record<string, FeatureStatus> = {};
      (featureRows || []).forEach((r: any) => {
        statuses[r.feature_name] = r.status as FeatureStatus;
      });
      setFeatureStatuses(statuses);

      // Detect which features the nutritionist has actually used
      // by checking if they have data in the corresponding tables
      const used = new Set<string>();

      const checks = await Promise.all([
        supabase.from("nutritionist_patients").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id),
        withTenantFilter(supabase.from("meal_plans").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id), tenantId),
        supabase.from("protocols").select("id", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("programs").select("id", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("physical_assessments").select("id", { count: "exact", head: true }).eq("assessor_id", user.id),
        supabase.from("patient_supplements").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id),
        supabase.from("patient_checkins").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }).eq("sender_id", user.id),
        supabase.from("patient_appointments").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id),
        supabase.from("feedbacks").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id),
        supabase.from("global_tips").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id),
        supabase.from("recipes").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id),
        supabase.from("branding_settings").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id),
        supabase.from("financial_transactions").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id),
        withTenantFilter(supabase.from("automation_rules").select("id", { count: "exact", head: true }).eq("nutritionist_id", user.id), tenantId),
      ]);

      const featureMap = [
        "patients", "meal_plans", "protocols", "programs",
        "physical_assessment", "supplements", "checkin_panel",
        "chat", "appointments", "feedbacks", "global_tips",
        "recipes", "branding", "financial", "automations",
      ];

      checks.forEach((res, i) => {
        if ((res.count || 0) > 0) used.add(featureMap[i]);
      });

      // If automations used, behavioral_analysis is also "used"
      if (used.has("automations")) used.add("behavioral_analysis");
      // IA features — check if there are meals with ai_analyzed
      const { count: aiMeals } = await supabase.from("meals").select("id", { count: "exact", head: true }).eq("ai_analyzed", true);
      if ((aiMeals || 0) > 0) used.add("ia_plan");

      setUsedFeatures(used);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const totalFeatures = FEATURE_REGISTRY.length;
  const usedCount = usedFeatures.size;
  const percentage = Math.round((usedCount / totalFeatures) * 100);
  const remaining = totalFeatures - usedCount;
  const { level, title, color } = getLevel(percentage);

  // Get unused features for suggestions
  const unusedFeatures = FEATURE_REGISTRY.filter(
    f => !usedFeatures.has(f.name) && featureStatuses[f.name] !== "disabled" && featureStatuses[f.name] !== "coming_soon"
  );
  const displayedUnused = showAll ? unusedFeatures : unusedFeatures.slice(0, 3);

  if (loading) {
    return (
      <div className="glass rounded-xl p-5 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4" />
        <div className="h-4 bg-muted rounded w-full mb-2" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm">Exploração do Sistema</h3>
            <p className="text-xs text-muted-foreground">
              Nível {level}: <span className={color}>{title}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold text-primary">{percentage}%</p>
          <p className="text-[10px] text-muted-foreground">explorado</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress value={percentage} className="h-3" />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{usedCount} de {totalFeatures} funcionalidades utilizadas</span>
          <span>{remaining} para explorar</span>
        </div>
      </div>

      {/* Milestone badges */}
      <div className="flex gap-2 flex-wrap">
        {[25, 50, 75, 100].map(milestone => (
          <Badge
            key={milestone}
            variant={percentage >= milestone ? "default" : "outline"}
            className={`text-[10px] gap-1 ${percentage >= milestone ? "bg-primary/90" : "opacity-50"}`}
          >
            {percentage >= milestone ? <Star className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
            {milestone}%
          </Badge>
        ))}
      </div>

      {/* Feature suggestions */}
      {unusedFeatures.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-warning" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explore também</p>
          </div>
          <div className="space-y-1.5">
            {displayedUnused.map((f, i) => (
              <motion.div
                key={f.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to={FEATURE_ROUTES[f.name] || "/"}>
                        <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer group">
                          <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                            <f.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{f.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{f.description}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </div>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[240px]">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-xs">{FEATURE_TIPS[f.name] || f.description}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            ))}
          </div>
          {unusedFeatures.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs gap-1"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Mostrar menos" : `Ver todas (${unusedFeatures.length} restantes)`}
              <Zap className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}

      {/* Completion celebration */}
      {percentage === 100 && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-center"
        >
          <p className="text-sm font-bold">🎉 Parabéns! Você explorou 100% do sistema!</p>
          <p className="text-xs text-muted-foreground mt-0.5">Você é um Expert FitJourney!</p>
        </motion.div>
      )}
    </div>
  );
}
