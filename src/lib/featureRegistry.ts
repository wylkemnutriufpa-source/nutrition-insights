/**
 * Registro central de features do sistema.
 * Para adicionar uma nova feature, basta adicionar uma entrada aqui.
 * Ela aparecerá automaticamente no painel de controle do admin.
 */

import {
  Brain, Bot, ChefHat, Sparkles, Camera, FileText,
  Users, Utensils, ClipboardCheck, Target, Dumbbell, Pill,
  MessageSquare, Calendar, Bell, BookOpen,
  ShoppingCart, Heart,
  BarChart3, DollarSign, Activity, Trophy,
} from "lucide-react";

export interface FeatureDefinition {
  /** Chave única da feature (slug) */
  name: string;
  /** Nome legível */
  label: string;
  /** Descrição curta */
  description: string;
  /** Ícone lucide-react */
  icon: React.ComponentType<{ className?: string }>;
  /** Categoria para agrupamento */
  category: string;
  /** Versão em que foi adicionada (para badge "Nova") */
  addedVersion?: string;
}

export const FEATURE_REGISTRY: FeatureDefinition[] = [
  // IA & Automação
  { name: "ia_plan", label: "Análise com IA", description: "Análise de refeições e corpo com inteligência artificial", icon: Brain, category: "IA & Automação" },
  { name: "automations", label: "Automações", description: "Motor de automação inteligente com regras personalizadas", icon: Bot, category: "IA & Automação" },
  { name: "recipe_generator", label: "Gerador de Receitas IA", description: "Geração automática de receitas com IA", icon: ChefHat, category: "IA & Automação" },
  { name: "autobot", label: "AutoBot (Chat IA)", description: "Assistente virtual com IA para pacientes", icon: Sparkles, category: "IA & Automação" },
  { name: "ai_body_analysis", label: "Análise Corporal IA", description: "Análise de composição corporal por fotos com IA", icon: Camera, category: "IA & Automação" },
  { name: "ai_anamnesis", label: "Anamnese Inteligente", description: "Insights automáticos de anamnese com IA", icon: Brain, category: "IA & Automação" },
  { name: "weekly_report_ai", label: "Relatório Semanal IA", description: "Geração automática de relatórios semanais", icon: FileText, category: "IA & Automação" },
  { name: "behavioral_analysis", label: "Análise Comportamental IA", description: "Detecta padrões de adesão e dispara automações de suporte personalizado", icon: Activity, category: "IA & Automação", addedVersion: "2.5" },
  { name: "nutrition_copilot", label: "Nutrition Copilot", description: "Assistente clínico IA com fila de prioridade, alertas, padrões comportamentais e feed de inteligência", icon: Brain, category: "IA & Automação", addedVersion: "3.0" },
  { name: "churn_prediction", label: "Predição de Abandono", description: "Detecta pacientes em risco de abandonar o programa com score de churn e ações sugeridas", icon: Activity, category: "IA & Automação", addedVersion: "3.0" },
  { name: "adherence_gamification", label: "Gamificação de Adesão", description: "Sistema de streak, pontos por tarefa, badges de conquistas e mensagens motivacionais IA para pacientes", icon: Trophy, category: "IA & Automação", addedVersion: "3.0" },

  // Gestão de Pacientes
  { name: "patients", label: "Gestão de Pacientes", description: "Cadastro e acompanhamento de pacientes", icon: Users, category: "Gestão de Pacientes" },
  { name: "meal_plans", label: "Planos Alimentares", description: "Criação e gestão de planos alimentares", icon: Utensils, category: "Gestão de Pacientes" },
  { name: "protocols", label: "Protocolos", description: "Criação de protocolos clínicos personalizados", icon: ClipboardCheck, category: "Gestão de Pacientes" },
  { name: "programs", label: "Programas", description: "Programas estruturados com fases e metas", icon: Target, category: "Gestão de Pacientes" },
  { name: "physical_assessment", label: "Avaliação Física", description: "Registro completo de avaliações antropométricas", icon: Dumbbell, category: "Gestão de Pacientes" },
  { name: "supplements", label: "Suplementos", description: "Prescrição e gestão de suplementos", icon: Pill, category: "Gestão de Pacientes" },
  { name: "checkin_panel", label: "Painel de Check-ins", description: "Revisão de check-ins dos pacientes", icon: ClipboardCheck, category: "Gestão de Pacientes" },

  // Comunicação
  { name: "chat", label: "Chat", description: "Comunicação direta com pacientes via chat", icon: MessageSquare, category: "Comunicação" },
  { name: "appointments", label: "Agenda", description: "Agendamento de consultas e compromissos", icon: Calendar, category: "Comunicação" },
  { name: "notifications_push", label: "Push Notifications", description: "Envio de notificações push para pacientes", icon: Bell, category: "Comunicação" },
  { name: "feedbacks", label: "Feedbacks", description: "Sistema de feedback bidirecional", icon: MessageSquare, category: "Comunicação" },
  { name: "global_tips", label: "Dicas Globais", description: "Publicação de dicas para todos os pacientes", icon: BookOpen, category: "Comunicação" },

  // Ferramentas
  { name: "food_database", label: "Banco de Alimentos", description: "Acesso completo ao banco de alimentos TACO", icon: Utensils, category: "Ferramentas" },
  { name: "recipes", label: "Receitas", description: "Biblioteca de receitas compartilhadas", icon: ChefHat, category: "Ferramentas" },
  { name: "shopping_list", label: "Lista de Compras", description: "Geração de lista de compras para pacientes", icon: ShoppingCart, category: "Ferramentas" },
  { name: "diet_templates", label: "Templates de Dieta", description: "Templates pré-configurados de dietas", icon: BookOpen, category: "Ferramentas" },
  { name: "branding", label: "Branding", description: "Personalização visual da marca", icon: Heart, category: "Ferramentas" },

  // Relatórios & Financeiro
  { name: "reports", label: "Relatórios", description: "Geração de relatórios detalhados", icon: BarChart3, category: "Relatórios & Financeiro" },
  { name: "financial", label: "Financeiro", description: "Painel financeiro completo com gráficos", icon: DollarSign, category: "Relatórios & Financeiro" },
  { name: "system_usage_gamification", label: "Gamificação de Uso", description: "Painel de progresso de exploração do sistema com dicas e níveis", icon: Trophy, category: "Relatórios & Financeiro", addedVersion: "2.5" },
];

/** Retorna os nomes de todas as features registradas */
export function getAllFeatureNames(): string[] {
  return FEATURE_REGISTRY.map(f => f.name);
}

/** Agrupa features por categoria */
export function getFeaturesByCategory(): Record<string, FeatureDefinition[]> {
  const cats: Record<string, FeatureDefinition[]> = {};
  FEATURE_REGISTRY.forEach(f => {
    if (!cats[f.category]) cats[f.category] = [];
    cats[f.category].push(f);
  });
  return cats;
}
