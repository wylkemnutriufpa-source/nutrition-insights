import {
  LayoutDashboard, Users, Utensils, BarChart3, Sparkles,
  CalendarCheck, Apple, TrendingUp, Target, HeartPulse,
  type LucideIcon
} from "lucide-react";

export interface PresentationSlide {
  id: string;
  title: string;
  subtitle: string;
  bullets: string[];
  icon: LucideIcon;
  gradient: string;
  emoji: string;
}

/**
 * Static fallback slides — used when DB is unavailable.
 * The Guide Engine (useFeatureGuide) fetches live slides from feature_registry.
 */
export const PROFESSIONAL_SLIDES: PresentationSlide[] = [
  {
    id: "overview",
    title: "Visão Geral do FitJourney",
    subtitle: "Sua plataforma clínica inteligente",
    bullets: [
      "Gerencie pacientes, planos alimentares e protocolos em um só lugar",
      "Motor de inteligência clínica que analisa adesão e evolução",
      "Alertas automáticos de risco de abandono e estagnação",
      "IA opcional para análise de refeições e geração de receitas",
    ],
    icon: LayoutDashboard,
    gradient: "from-primary to-accent",
    emoji: "🚀",
  },
  {
    id: "cockpit",
    title: "Cockpit Clínico",
    subtitle: "Dashboard inteligente para decisões rápidas",
    bullets: [
      "Painel de pacientes que precisam de atenção imediata",
      "Score de adesão e momentum de cada paciente",
      "Alertas clínicos automáticos baseados em dados reais",
      "Visão consolidada de toda sua carteira de pacientes",
    ],
    icon: Users,
    gradient: "from-info to-primary",
    emoji: "🎯",
  },
  {
    id: "editor",
    title: "Editor de Planos Premium",
    subtitle: "Monte planos alimentares em minutos",
    bullets: [
      "Editor visual em grade semanal drag-and-drop",
      "Biblioteca de refeições com inserção rápida",
      "Geração automática via Motor FitJourney™",
      "Controle de macros e calorias em tempo real",
    ],
    icon: Utensils,
    gradient: "from-warning to-destructive",
    emoji: "📋",
  },
  {
    id: "results",
    title: "Dashboard de Resultados",
    subtitle: "Acompanhe a evolução de cada paciente",
    bullets: [
      "Gráficos de peso, composição corporal e adesão",
      "Comparativo entre consultas e protocolos",
      "Relatórios automáticos semanais e mensais",
      "Exportação em PDF para entrega ao paciente",
    ],
    icon: BarChart3,
    gradient: "from-success to-info",
    emoji: "📊",
  },
  {
    id: "engine",
    title: "Motor Automático FitJourney™",
    subtitle: "Inteligência determinística a seu favor",
    bullets: [
      "Gera planos alimentares completos automaticamente",
      "Respeita objetivo, restrições e preferências do paciente",
      "Escala porções para bater metas calóricas com precisão",
      "Planos nascem como rascunho para revisão profissional",
    ],
    icon: Sparkles,
    gradient: "from-accent to-warning",
    emoji: "⚡",
  },
];

export const PATIENT_SLIDES: PresentationSlide[] = [
  {
    id: "routine",
    title: "Sua Rotina Diária",
    subtitle: "O FitJourney organiza seu dia",
    bullets: [
      "Checklist diário com tarefas personalizadas",
      "Lembretes de refeições, água e suplementos",
      "Missões e desafios para manter a motivação",
      "Tudo acessível direto no celular",
    ],
    icon: CalendarCheck,
    gradient: "from-primary to-accent",
    emoji: "☀️",
  },
  {
    id: "meal-plan",
    title: "Seu Plano Alimentar",
    subtitle: "Siga o plano com clareza total",
    bullets: [
      "Toque em qualquer refeição para ver detalhes completos",
      "Ingredientes, porções e modo de preparo na palma da mão",
      "Substituições sugeridas quando precisar trocar algo",
      "Macros e calorias calculados automaticamente",
    ],
    icon: Apple,
    gradient: "from-success to-info",
    emoji: "🥗",
  },
  {
    id: "progress",
    title: "Registre Seu Progresso",
    subtitle: "Cada registro conta para sua evolução",
    bullets: [
      "Faça check-in de peso e medidas regularmente",
      "Registre refeições e ganhe pontos no ranking",
      "Foto de evolução corporal com comparativo",
      "Seu nutricionista acompanha tudo em tempo real",
    ],
    icon: TrendingUp,
    gradient: "from-warning to-destructive",
    emoji: "📈",
  },
  {
    id: "interpret",
    title: "Entenda Seus Resultados",
    subtitle: "Dados que fazem sentido",
    bullets: [
      "Gráficos simples de evolução de peso e adesão",
      "Score de saúde e momentum da sua jornada",
      "Conquistas e medalhas por consistência",
      "Relatórios semanais com resumo do progresso",
    ],
    icon: Target,
    gradient: "from-info to-primary",
    emoji: "🏆",
  },
  {
    id: "support",
    title: "Como o Sistema Te Ajuda",
    subtitle: "Inteligência que cuida de você",
    bullets: [
      "Alertas inteligentes para não sair do caminho",
      "Dicas personalizadas baseadas no seu perfil",
      "Comunicação direta com seu nutricionista via chat",
      "Gamificação para tornar a jornada prazerosa",
    ],
    icon: HeartPulse,
    gradient: "from-accent to-success",
    emoji: "💚",
  },
];
