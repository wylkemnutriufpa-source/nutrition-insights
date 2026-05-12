/**
 * Registro de features disponíveis para PACIENTES.
 * Cada feature pode ser habilitada/desabilitada por plano de prestígio.
 */

import {
  Brain, ChefHat, Sparkles, Camera, ClipboardCheck,
  Target, Trophy, Heart, MessageSquare, Dumbbell,
  BookOpen, ShoppingCart, Utensils, BarChart3, Zap,
  Star, Crown, Bell,
} from "lucide-react";

export interface PatientFeatureDefinition {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

export const PATIENT_FEATURE_REGISTRY: PatientFeatureDefinition[] = [
  // Alimentação
  { key: "meal_logging", label: "Registro de Refeições", description: "Registrar refeições diárias com macros", icon: Utensils, category: "Alimentação" },
  { key: "meal_plan_view", label: "Ver Plano Alimentar", description: "Visualizar plano alimentar prescrito", icon: BookOpen, category: "Alimentação" },
  { key: "meal_adherence", label: "Adesão ao Plano", description: "Marcar itens do plano alimentar como concluídos", icon: ClipboardCheck, category: "Alimentação" },
  { key: "shopping_list", label: "Lista de Compras", description: "Gerar lista de compras a partir do plano", icon: ShoppingCart, category: "Alimentação" },
  { key: "favorite_recipes", label: "Receitas Favoritas", description: "Salvar receitas como favoritas", icon: Heart, category: "Alimentação" },

  // IA & Análises
  { key: "ai_meal_analysis", label: "Análise de Refeição IA", description: "Análise nutricional de refeições com IA", icon: Brain, category: "IA & Análises" },
  { key: "ai_recipe_generator", label: "Gerador de Receitas IA", description: "Gerar receitas personalizadas com IA", icon: ChefHat, category: "IA & Análises" },
  { key: "ai_body_analysis", label: "Análise Corporal IA", description: "Análise de composição corporal por fotos", icon: Camera, category: "IA & Análises" },
  { key: "chat", label: "Chat com Nutricionista", description: "Converse em tempo real com seu profissional", icon: MessageSquare, category: "Comunicação" },
  { key: "ai_anamnesis_insights", label: "Insights de Anamnese", description: "Ver insights gerados por IA da anamnese", icon: Brain, category: "IA & Análises" },

  // Engajamento
  { key: "checklist", label: "Checklist Diário", description: "Checklist de tarefas e hábitos diários", icon: ClipboardCheck, category: "Engajamento" },
  { key: "achievements", label: "Conquistas", description: "Sistema de conquistas e badges", icon: Trophy, category: "Engajamento" },
  { key: "challenges", label: "Desafios", description: "Participar de desafios de saúde", icon: Target, category: "Engajamento" },
  { key: "ranking", label: "Ranking Global", description: "Participar do ranking de engajamento", icon: Crown, category: "Engajamento" },
  { key: "weekly_goals", label: "Metas Semanais", description: "Definir e acompanhar metas semanais", icon: Star, category: "Engajamento" },
  { key: "journey", label: "Jornada", description: "Visualizar timeline da jornada", icon: Heart, category: "Engajamento" },
  { key: "gamification_xp", label: "Sistema de XP", description: "Ganhar XP por ações e subir de nível", icon: Zap, category: "Engajamento" },

  // Comunicação
  { key: "checkin", label: "Check-in Semanal", description: "Enviar check-in com peso, fotos e feedback", icon: ClipboardCheck, category: "Comunicação" },
  { key: "feedback", label: "Feedbacks", description: "Enviar feedbacks ao nutricionista", icon: MessageSquare, category: "Comunicação" },
  { key: "notifications", label: "Notificações", description: "Receber notificações e alertas", icon: Bell, category: "Comunicação" },
  { key: "planner", label: "Meu Planejador", description: "Calendário pessoal com lembretes do nutricionista", icon: ClipboardCheck, category: "Comunicação" },

  // Saúde & Ferramentas
  { key: "anamnesis", label: "Anamnese", description: "Preencher formulário de anamnese", icon: ClipboardCheck, category: "Saúde & Ferramentas" },
  { key: "physical_assessment_view", label: "Ver Avaliação Física", description: "Visualizar dados de avaliações físicas", icon: Dumbbell, category: "Saúde & Ferramentas" },
  { key: "supplements_view", label: "Ver Suplementos", description: "Visualizar prescrição de suplementos", icon: Heart, category: "Saúde & Ferramentas" },
  { key: "health_quiz", label: "Quiz de Saúde", description: "Questionário interativo de saúde", icon: Heart, category: "Saúde & Ferramentas" },
  { key: "weight_calculator", label: "Calculadora de Peso", description: "Calcular peso ideal e composição", icon: Dumbbell, category: "Saúde & Ferramentas" },
  { key: "water_calculator", label: "Calculadora de Água", description: "Calcular necessidade hídrica", icon: Heart, category: "Saúde & Ferramentas" },
  { key: "weekly_report", label: "Relatório Semanal", description: "Ver relatório semanal de progresso", icon: BarChart3, category: "Saúde & Ferramentas" },
  { key: "onboarding_pipeline", label: "Onboarding Automático", description: "Pipeline guiado: anamnese, dados corporais, preferências e plano IA", icon: Zap, category: "Saúde & Ferramentas" },

  // Prestígio
  { key: "prestige_view", label: "Meu Prestígio", description: "Visualizar seu nível de prestígio, badge e benefícios exclusivos", icon: Crown, category: "Engajamento" },

  // Treino (Personal Trainer)
  { key: "workout_plan_view", label: "Ver Plano de Treino", description: "Visualizar treino prescrito pelo personal com séries, reps e carga", icon: Dumbbell, category: "Treino" },
  { key: "workout_log", label: "Registrar Treino", description: "Registrar execução de treinos com carga e repetições reais", icon: ClipboardCheck, category: "Treino" },
  { key: "workout_feedback", label: "Feedback Pós-Treino", description: "Reportar dor, fadiga, desconforto e motivação após cada treino", icon: MessageSquare, category: "Treino" },
  { key: "workout_timer", label: "Timer de Descanso", description: "Cronômetro inteligente durante o treino com alertas sonoros", icon: Target, category: "Treino" },
  { key: "workout_history", label: "Histórico de Treinos", description: "Ver evolução de carga e volume por exercício", icon: BarChart3, category: "Treino" },
  { key: "workout_prs", label: "Meus Recordes", description: "Visualizar recordes pessoais de carga por exercício", icon: Trophy, category: "Treino" },
  { key: "workout_calendar", label: "Calendário de Treinos", description: "Calendário mensal com aderência e status dos treinos", icon: Star, category: "Treino" },
  { key: "workout_videos", label: "Vídeos de Exercícios", description: "Assistir demonstrações de execução correta", icon: Heart, category: "Treino" },

  // Exames
  { key: "lab_exams_view", label: "Ver Exames", description: "Visualizar resultados de exames laboratoriais com semáforo clínico", icon: Heart, category: "Saúde & Ferramentas" },
  { key: "lab_marker_history", label: "Evolução de Marcadores", description: "Gráficos de evolução dos marcadores laboratoriais ao longo do tempo", icon: BarChart3, category: "Saúde & Ferramentas" },

  // IFJ
  { key: "ifj_prompts", label: "IFJ Prompts", description: "Receber prompts inteligentes e motivacionais da Inteligência FitJourney", icon: Brain, category: "IA & Análises" },
  { key: "ifj_push_notifications", label: "Notificações IFJ", description: "Notificações push personalizadas por horário e comportamento", icon: Bell, category: "IA & Análises" },

  // Meu Painel
  { key: "patient_overview", label: "Meu Painel", description: "Dashboard premium com momentum, conquistas e próximos passos", icon: Crown, category: "Engajamento" },
];

export function getPatientFeaturesByCategory(): Record<string, PatientFeatureDefinition[]> {
  const cats: Record<string, PatientFeatureDefinition[]> = {};
  PATIENT_FEATURE_REGISTRY.forEach(f => {
    if (!cats[f.category]) cats[f.category] = [];
    cats[f.category].push(f);
  });
  return cats;
}
