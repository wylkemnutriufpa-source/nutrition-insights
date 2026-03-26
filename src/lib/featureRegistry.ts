/**
 * Registro central de features do sistema.
 * Para adicionar uma nova feature, basta adicionar uma entrada aqui.
 * Ela aparecerá automaticamente no painel de controle do admin.
 */

import {
  Brain, Bot, ChefHat, Sparkles, Camera, FileText,
  Users, Utensils, ClipboardCheck, Target, Dumbbell, Pill,
  MessageSquare, Calendar, Bell, BookOpen,
  ShoppingCart, Heart, Upload, FileUp, UserPlus,
  BarChart3, DollarSign, Activity, Trophy, Zap,
  FlaskConical, Flame, TrendingUp, Scale, Gauge, Shield,
  Workflow, Eye, Beaker, Layers, RefreshCw, GitBranch,
  Microscope, LineChart, PieChart, Shuffle, Waypoints,
  ScanLine, AlertTriangle, Lightbulb, Rocket, Crown,
  Map, Compass, BookMarked, Presentation, Globe,
  TestTube, Timer, Play, Repeat, LayoutGrid, Megaphone,
} from "lucide-react";

export type FeatureTier = "basic" | "premium" | "coming_soon";

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
  /** Tier padrão: basic (todos), premium (só plano premium), coming_soon */
  defaultTier?: FeatureTier;
  /** Versão em que foi adicionada (para badge "Nova") */
  addedVersion?: string;
}

export const FEATURE_REGISTRY: FeatureDefinition[] = [
  // IA & Automação
  { name: "ia_plan", label: "Análise com IA", description: "Análise de refeições e corpo com inteligência artificial", icon: Brain, category: "IA & Automação", defaultTier: "premium" },
  { name: "automations", label: "Automações", description: "Motor de automação inteligente com regras personalizadas", icon: Bot, category: "IA & Automação", defaultTier: "premium" },
  { name: "recipe_generator", label: "Gerador de Receitas IA", description: "Geração automática de receitas com IA", icon: ChefHat, category: "IA & Automação", defaultTier: "premium" },
  { name: "chat", label: "Chat com Nutricionista", description: "Acompanhamento em tempo real com seu nutricionista", icon: MessageSquare, category: "Comunicação", defaultTier: "basic" },
  { name: "ai_body_analysis", label: "Análise Corporal IA", description: "Análise de composição corporal por fotos com IA", icon: Camera, category: "IA & Automação", defaultTier: "premium" },
  { name: "ai_anamnesis", label: "Anamnese Inteligente", description: "Insights automáticos de anamnese com IA", icon: Brain, category: "IA & Automação", defaultTier: "premium" },
  { name: "weekly_report_ai", label: "Relatório Semanal IA", description: "Geração automática de relatórios semanais", icon: FileText, category: "IA & Automação", defaultTier: "premium" },
  { name: "behavioral_analysis", label: "Análise Comportamental IA", description: "Detecta padrões de adesão e dispara automações de suporte personalizado", icon: Activity, category: "IA & Automação", defaultTier: "premium", addedVersion: "2.5" },
  { name: "nutrition_copilot", label: "Nutrition Copilot", description: "Assistente clínico IA com fila de prioridade, alertas, padrões comportamentais e feed de inteligência", icon: Brain, category: "IA & Automação", defaultTier: "premium", addedVersion: "3.0" },
  { name: "churn_prediction", label: "Predição de Abandono", description: "Detecta pacientes em risco de abandonar o programa com score de churn e ações sugeridas", icon: Activity, category: "IA & Automação", defaultTier: "premium", addedVersion: "3.0" },
  { name: "adherence_gamification", label: "Gamificação de Adesão", description: "Sistema de streak, pontos por tarefa, badges de conquistas e mensagens motivacionais IA para pacientes", icon: Trophy, category: "IA & Automação", defaultTier: "premium", addedVersion: "3.0" },
  { name: "ranking_global", label: "Ranking Global", description: "Ranking competitivo de engajamento entre pacientes com categorias, períodos e badges de prestígio", icon: Trophy, category: "IA & Automação", defaultTier: "premium", addedVersion: "3.5" },

  // Gestão de Pacientes
  { name: "patients", label: "Gestão de Pacientes", description: "Cadastro e acompanhamento de pacientes", icon: Users, category: "Gestão de Pacientes", defaultTier: "basic" },
  { name: "meal_plans", label: "Planos Alimentares", description: "Criação e gestão de planos alimentares", icon: Utensils, category: "Gestão de Pacientes", defaultTier: "basic" },
  { name: "protocols", label: "Protocolos", description: "Criação de protocolos clínicos personalizados", icon: ClipboardCheck, category: "Gestão de Pacientes", defaultTier: "basic" },
  { name: "programs", label: "Programas", description: "Programas estruturados com fases e metas", icon: Target, category: "Gestão de Pacientes", defaultTier: "premium" },
  { name: "physical_assessment", label: "Avaliação Física", description: "Registro completo de avaliações antropométricas", icon: Dumbbell, category: "Gestão de Pacientes", defaultTier: "basic" },
  { name: "supplements", label: "Suplementos", description: "Prescrição e gestão de suplementos", icon: Pill, category: "Gestão de Pacientes", defaultTier: "basic" },
  { name: "checkin_panel", label: "Painel de Check-ins", description: "Revisão de check-ins dos pacientes", icon: ClipboardCheck, category: "Gestão de Pacientes", defaultTier: "basic" },
  { name: "import_patients", label: "Importação de Pacientes", description: "Importação em massa de pacientes via CSV", icon: UserPlus, category: "Gestão de Pacientes", defaultTier: "basic" },
  { name: "document_upload", label: "Upload de Documentos", description: "Upload e gestão de documentos do paciente (PDFs, exames, laudos)", icon: FileUp, category: "Gestão de Pacientes", defaultTier: "basic" },

  // Comunicação
  { name: "chat", label: "Chat", description: "Comunicação direta com pacientes via chat", icon: MessageSquare, category: "Comunicação", defaultTier: "basic" },
  { name: "appointments", label: "Agenda", description: "Agendamento de consultas e compromissos", icon: Calendar, category: "Comunicação", defaultTier: "basic" },
  { name: "planner", label: "Meu Planejador", description: "Calendário integrado de compromissos, lembretes, pagamentos e metas compartilhado entre profissional e paciente", icon: Calendar, category: "Comunicação", defaultTier: "basic", addedVersion: "4.0" },
  { name: "notifications_push", label: "Push Notifications", description: "Envio de notificações push para pacientes", icon: Bell, category: "Comunicação", defaultTier: "premium" },
  { name: "feedbacks", label: "Feedbacks", description: "Sistema de feedback bidirecional", icon: MessageSquare, category: "Comunicação", defaultTier: "basic" },
  { name: "global_tips", label: "Dicas Globais", description: "Publicação de dicas para todos os pacientes", icon: BookOpen, category: "Comunicação", defaultTier: "basic" },

  // Ferramentas
  { name: "food_database", label: "Banco de Alimentos", description: "Acesso completo ao banco de alimentos TACO", icon: Utensils, category: "Ferramentas", defaultTier: "basic" },
  { name: "recipes", label: "Receitas", description: "Biblioteca de receitas compartilhadas", icon: ChefHat, category: "Ferramentas", defaultTier: "basic" },
  { name: "shopping_list", label: "Lista de Compras", description: "Geração de lista de compras para pacientes", icon: ShoppingCart, category: "Ferramentas", defaultTier: "basic" },
  { name: "diet_templates", label: "Templates de Dieta", description: "Templates pré-configurados de dietas", icon: BookOpen, category: "Ferramentas", defaultTier: "basic" },
  { name: "branding", label: "Branding", description: "Personalização visual da marca", icon: Heart, category: "Ferramentas", defaultTier: "premium" },

  // Relatórios & Financeiro
  { name: "reports", label: "Relatórios", description: "Geração de relatórios detalhados", icon: BarChart3, category: "Relatórios & Financeiro", defaultTier: "basic" },
  { name: "financial", label: "Financeiro", description: "Painel financeiro completo com gráficos", icon: DollarSign, category: "Relatórios & Financeiro", defaultTier: "premium" },
  { name: "system_usage_gamification", label: "Gamificação de Uso", description: "Painel de progresso de exploração do sistema com dicas e níveis", icon: Trophy, category: "Relatórios & Financeiro", defaultTier: "premium", addedVersion: "2.5" },
  { name: "progress_simulation", label: "Simulação de Progresso", description: "Projeção de evolução do paciente baseada em adesão atual vs otimizada", icon: Activity, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "3.0" },
  { name: "clinical_intelligence", label: "Inteligência Clínica", description: "Dashboard de inteligência clínica com insights avançados", icon: Activity, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "3.0" },
  { name: "ai_strategy_center", label: "IA Estratégica", description: "Centro estratégico com diagnóstico da clínica, oportunidades e plano de ação semanal", icon: Brain, category: "IA & Automação", defaultTier: "premium", addedVersion: "3.5" },
  { name: "clinical_decision_support", label: "Suporte à Decisão Clínica", description: "Alertas e recomendações clínicas baseadas em dados do paciente", icon: Heart, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "3.0" },
  { name: "public_profile", label: "Perfil Público", description: "Página pública do nutricionista com bio, programas e captação de leads", icon: Users, category: "Crescimento", defaultTier: "premium", addedVersion: "3.5" },
  { name: "program_landing", label: "Landing de Programas", description: "Páginas públicas de programas para captação de pacientes", icon: Target, category: "Crescimento", defaultTier: "premium", addedVersion: "3.5" },
  { name: "patient_referrals", label: "Indicações de Pacientes", description: "Sistema de indicação com links rastreáveis para pacientes compartilharem", icon: UserPlus, category: "Crescimento", defaultTier: "premium", addedVersion: "3.5" },
  { name: "lead_generation", label: "Captação de Leads", description: "Formulário de captação de leads integrado às páginas públicas", icon: Upload, category: "Crescimento", defaultTier: "premium", addedVersion: "3.5" },
  { name: "growth_dashboard", label: "Dashboard de Crescimento", description: "Métricas de crescimento da rede: profissionais, pacientes, leads e indicações", icon: BarChart3, category: "Crescimento", defaultTier: "premium", addedVersion: "3.5" },
  { name: "weekly_goals", label: "Metas Semanais", description: "Definição e acompanhamento de metas semanais", icon: Target, category: "Gestão de Pacientes", defaultTier: "basic" },
  { name: "patient_checkin", label: "Check-in do Paciente", description: "Formulário de check-in semanal com peso, fotos e feedback", icon: ClipboardCheck, category: "Gestão de Pacientes", defaultTier: "basic" },
  { name: "patient_journey", label: "Jornada do Paciente", description: "Timeline visual da jornada e conquistas do paciente", icon: Heart, category: "Gestão de Pacientes", defaultTier: "basic" },
  { name: "health_quiz", label: "Quiz de Saúde", description: "Questionário interativo de avaliação de saúde", icon: Heart, category: "Ferramentas", defaultTier: "basic" },
  { name: "weight_calculator", label: "Calculadora de Peso", description: "Calculadora de peso ideal e composição corporal", icon: Dumbbell, category: "Ferramentas", defaultTier: "basic" },
  { name: "water_calculator", label: "Calculadora de Água", description: "Cálculo de necessidade hídrica diária", icon: Heart, category: "Ferramentas", defaultTier: "basic" },
  { name: "onboarding_pipeline", label: "Onboarding Automático", description: "Pipeline automatizado: anamnese → dados corporais → preferências → pré-plano IA → aprovação profissional", icon: Zap, category: "IA & Automação", defaultTier: "premium", addedVersion: "4.0" },

  // Inteligência Metabólica
  { name: "metabolic_classification", label: "Classificação Metabólica", description: "Motor de classificação automática do perfil de resposta metabólica do paciente", icon: FlaskConical, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "5.0" },
  { name: "metabolic_phase_engine", label: "Motor de Fase Metabólica", description: "Classificação automática da fase metabólica atual e estratégia calórica por fase", icon: Flame, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "5.0" },
  { name: "caloric_strategy_engine", label: "Estratégia Calórica Adaptativa", description: "Ajuste automático de calorias e macros baseado na fase metabólica e adesão", icon: Gauge, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "5.0" },
  { name: "body_projection_engine", label: "Projeção Corporal Futura", description: "Motor de projeção de evolução de peso e composição corporal com curvas realistas", icon: TrendingUp, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.5" },
  { name: "weight_history_analysis", label: "Análise de Histórico de Peso", description: "Análise retroativa de padrões de peso incluindo efeito sanfona e estagnação", icon: LineChart, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.5" },
  { name: "digital_twin", label: "Digital Twin Corporal", description: "Gêmeo digital do paciente com projeção visual de transformação futura", icon: ScanLine, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.5" },

  // Motor Clínico Avançado
  { name: "clinical_pipeline", label: "Pipeline Clínico Diário", description: "Pipeline automatizado de análise diária de snapshots, riscos e sinais clínicos", icon: Workflow, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.0" },
  { name: "clinical_alerts_engine", label: "Motor de Alertas Clínicos", description: "Detecção e gestão de alertas clínicos com severidade e resolução", icon: AlertTriangle, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.0" },
  { name: "behavioral_recovery", label: "Recuperação Comportamental", description: "Ações de recuperação automáticas para pacientes em risco de abandono", icon: Shield, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.0" },
  { name: "intervention_simulator", label: "Simulador de Intervenções", description: "Simulação de intervenções clínicas com projeção de resultados e riscos", icon: Beaker, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.5" },
  { name: "clinical_experiments", label: "Experimentos Clínicos", description: "Framework de experimentos A/B com grupos, outcomes e insights estatísticos", icon: Microscope, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.5" },
  { name: "action_recommendations", label: "Recomendações de Ação", description: "Motor de recomendações clínicas priorizadas por urgência e impacto esperado", icon: Lightbulb, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.0" },
  { name: "engagement_signals", label: "Sinais de Engajamento", description: "Detecção de sinais de engajamento e desengajamento em tempo real", icon: Eye, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.0" },
  { name: "clinical_daily_snapshots", label: "Snapshots Clínicos Diários", description: "Fotografia diária do estado clínico de cada paciente com scores e tendências", icon: Camera, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.0" },

  // Gestão de Portfolio
  { name: "clinic_portfolio", label: "Portfolio da Clínica", description: "Visão consolidada do portfolio de pacientes com health score e classificação", icon: PieChart, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.5" },
  { name: "clinical_evolution_metrics", label: "Métricas de Evolução Clínica", description: "KPIs de eficácia de protocolos, velocidade de transformação e estabilidade metabólica", icon: BarChart3, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.5" },
  { name: "cluster_protocol_matrix", label: "Matriz Cluster-Protocolo", description: "Análise cruzada de clusters metabólicos vs protocolos com taxa de sucesso", icon: Layers, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.5" },

  // Substituições e Templates
  { name: "food_substitutions", label: "Grupos de Substituição", description: "Grupos de substituição alimentar com equivalência nutricional", icon: Shuffle, category: "Ferramentas", defaultTier: "basic", addedVersion: "4.0" },
  { name: "diet_template_engine", label: "Motor de Templates de Dieta", description: "Templates avançados com variações calóricas, distribuição por refeição e estratégia semanal", icon: BookMarked, category: "Ferramentas", defaultTier: "premium", addedVersion: "4.0" },

  // Avaliação Corporal
  { name: "body_assessment_photos", label: "Fotos de Avaliação", description: "Registro e comparação de fotos corporais com análise de progresso", icon: Camera, category: "Gestão de Pacientes", defaultTier: "basic", addedVersion: "4.0" },
  { name: "body_projection_snapshots", label: "Snapshots de Projeção", description: "Histórico versionado de projeções corporais com métricas e narrativas", icon: GitBranch, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.5" },

  // Crescimento e Operações
  { name: "executive_command", label: "Centro de Comando Executivo", description: "Dashboard executivo com CEI, PSI, ILI e recomendações estratégicas de escala", icon: Rocket, category: "Crescimento", defaultTier: "premium", addedVersion: "4.5" },
  { name: "affiliate_system", label: "Sistema de Afiliados", description: "Programa de afiliados com tiers, comissões, payouts e métricas de conversão", icon: Crown, category: "Crescimento", defaultTier: "premium", addedVersion: "4.0" },
  { name: "booking_payments", label: "Pagamentos de Consulta", description: "Sistema de pagamento integrado para agendamento de consultas", icon: DollarSign, category: "Relatórios & Financeiro", defaultTier: "premium", addedVersion: "4.0" },

  // Organizações
  { name: "organizations", label: "Organizações Multi-Profissional", description: "Gestão de clínicas com múltiplos profissionais, papéis e metodologias compartilhadas", icon: Users, category: "Crescimento", defaultTier: "premium", addedVersion: "4.0" },
  { name: "clinical_methodologies", label: "Metodologias Clínicas", description: "Framework de metodologias clínicas customizáveis por organização", icon: Compass, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.5" },
  { name: "clinical_rules_engine", label: "Motor de Regras Clínicas", description: "Regras clínicas configuráveis com sinais, condições e recomendações automáticas", icon: Waypoints, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "4.5" },

  // Apresentação e Guias
  { name: "feature_guide", label: "Guia de Funcionalidades", description: "Apresentação cinematográfica e interativa das funcionalidades do sistema", icon: Presentation, category: "Ferramentas", defaultTier: "basic", addedVersion: "4.0" },
  { name: "feature_marketing", label: "Marketing de Features", description: "Geração automática de assets de marketing para cada funcionalidade", icon: Globe, category: "Crescimento", defaultTier: "premium", addedVersion: "4.5" },

  // Aprendizado Global
  { name: "global_learning", label: "Aprendizado Clínico Global", description: "Motor de aprendizado que ajusta parâmetros do sistema com base em evidências agregadas", icon: RefreshCw, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "5.0" },

  // Prestige & Gamificação Avançada
  { name: "prestige_plans", label: "Planos Prestige", description: "Sistema de planos de prestígio com badges, crowns e identidade visual no ranking", icon: Crown, category: "IA & Automação", defaultTier: "premium", addedVersion: "4.0" },
  { name: "prestige_management", label: "Gestão de Prestígio", description: "Atribuição manual e automática de prestígio por paciente e por programa com sincronização em lote", icon: Crown, category: "Gestão de Pacientes", defaultTier: "premium", addedVersion: "5.0" },
  { name: "missions_challenges", label: "Missões e Desafios", description: "Sistema de missões e desafios com XP, conquistas e objetivos personalizados", icon: Target, category: "IA & Automação", defaultTier: "premium", addedVersion: "4.0" },

  // Paciente App
  { name: "patient_magic_journey", label: "Magic Journey Story", description: "Narrativa clínica personalizada da jornada do paciente com IA", icon: Map, category: "IA & Automação", defaultTier: "premium", addedVersion: "4.5" },
  { name: "patient_feature_explorer", label: "Explorador de Funcionalidades", description: "Painel gamificado de descoberta de funcionalidades pelo paciente", icon: Compass, category: "Ferramentas", defaultTier: "basic", addedVersion: "4.0" },

  // Auto-ajuste Clínico
  { name: "clinical_auto_adjustment", label: "Auto-Ajuste Clínico", description: "Ajustes automáticos de protocolo com guardrails e reversão controlada", icon: RefreshCw, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "5.0" },

  // Cockpit Operacional
  { name: "operational_cost_cockpit", label: "Cockpit de Custos Operacionais", description: "Projeção financeira determinística com simulação de escala para 200-2000 pacientes", icon: DollarSign, category: "Analytics & Relatórios", defaultTier: "premium", addedVersion: "5.0" },

  // Exames Laboratoriais
  { name: "lab_exams", label: "Exames Laboratoriais", description: "Importação, extração automática e interpretação clínica de exames laboratoriais com 25+ marcadores", icon: TestTube, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "6.0" },
  { name: "lab_marker_evolution", label: "Evolução de Marcadores", description: "Gráficos de evolução histórica de marcadores laboratoriais por categoria clínica", icon: LineChart, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "6.0" },
  { name: "lab_clinical_alerts", label: "Alertas de Exames", description: "Semáforo clínico automático (Normal/Alerta/Crítico) para valores laboratoriais fora da faixa", icon: AlertTriangle, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "6.0" },

  // Personal Trainer
  { name: "personal_trainer_dashboard", label: "Dashboard Personal Trainer", description: "Painel inteligente com KPIs de adesão, RPE médio, inatividade e alertas de treino", icon: Dumbbell, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },
  { name: "workout_templates", label: "Templates de Treino", description: "12 templates profissionais editáveis: Hipertrofia, Emagrecimento, Flexibilidade (3 níveis cada)", icon: LayoutGrid, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },
  { name: "workout_periodization", label: "Periodização Avançada", description: "Periodização linear, ondulatória e em blocos com progressão automática de carga", icon: Repeat, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },
  { name: "workout_timers", label: "Timers Inteligentes", description: "Cronômetros de descanso e bi-sets com alertas sonoros e progressão automática", icon: Timer, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },
  { name: "workout_pr_detection", label: "Detecção de PRs", description: "Detecção automática de recordes pessoais de carga com histórico e celebração", icon: Trophy, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },
  { name: "workout_cardio", label: "Cardio & Zonas de FC", description: "Prescrição de cardio por zonas de frequência cardíaca com protocolos HIIT", icon: Activity, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },
  { name: "workout_calendar", label: "Calendário de Treinos", description: "Calendário visual de aderência mensal com status por treino", icon: Calendar, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },
  { name: "workout_pdf_export", label: "Exportação de Treinos PDF", description: "Geração de PDF profissional com plano de treino completo do aluno", icon: FileText, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },
  { name: "workout_load_history", label: "Histórico de Evolução de Carga", description: "Gráficos de evolução de volume e peso por exercício e grupo muscular", icon: TrendingUp, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },
  { name: "workout_assessment_comparison", label: "Comparativo de Avaliações", description: "Deltas históricos e tendências entre avaliações físicas com gráficos", icon: BarChart3, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },
  { name: "workout_challenges", label: "Desafios de Treino", description: "Gamificação com metas de treino, XP e conquistas específicas para alunos", icon: Target, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },
  { name: "workout_pre_plan_ai", label: "Pré-Plano de Treino IA", description: "Geração automática de treino via anamnese com segurança biomecânica e alertas de dor", icon: Brain, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },
  { name: "workout_multimedia", label: "Vídeos de Execução", description: "Biblioteca de vídeos demonstrativos de exercícios integrada ao treino", icon: Play, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },
  { name: "cross_professional_alerts", label: "Alertas Multidisciplinares", description: "Sincronização de alertas de dor e fadiga entre Personal Trainer e Nutricionista", icon: Bell, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },

  // IFJ — Inteligência FitJourney
  { name: "ifj_intelligence", label: "Inteligência FitJourney (IFJ)", description: "Motor de engajamento comportamental com prompts personalizados, push notifications e aprendizado contínuo", icon: Brain, category: "IA & Automação", defaultTier: "premium", addedVersion: "5.0" },
  { name: "ifj_scheduled_messages", label: "Mensagens Agendadas IFJ", description: "Agendamento de mensagens comportamentais por dia da semana e faixa horária", icon: Megaphone, category: "IA & Automação", defaultTier: "premium", addedVersion: "5.5" },
  { name: "ifj_workout_intelligence", label: "IFJ Workout Intelligence", description: "Feedback pós-treino com mapa de dor, sugestões de substituição e aprendizado por aluno", icon: Dumbbell, category: "Personal Trainer", defaultTier: "premium", addedVersion: "6.0" },

  // Campanhas
  { name: "campaign_center", label: "Central de Campanhas", description: "Criação e envio de campanhas segmentadas por público, canal e agendamento", icon: Megaphone, category: "Comunicação", defaultTier: "premium", addedVersion: "5.0" },

  // Control Tower
  { name: "control_tower", label: "Torre de Controle Clínica", description: "Centro de comando cinemático com radar de prioridades e matriz de saúde da carteira", icon: Rocket, category: "Inteligência Clínica", defaultTier: "premium", addedVersion: "5.0" },

  // Patient Overview
  { name: "patient_overview", label: "Meu Painel (Paciente)", description: "Dashboard premium do paciente com momentum de adesão, conquistas e próximos passos", icon: BarChart3, category: "Gestão de Pacientes", defaultTier: "premium", addedVersion: "5.0" },

  // IFJ Advanced Modules v7.0
  { name: "ifj_conversational_copilot", label: "IFJ Copiloto Conversacional", description: "Chat inteligente para consultar dados clínicos de pacientes via linguagem natural", icon: Bot, category: "Inteligência IFJ", defaultTier: "premium", addedVersion: "7.0" },
  { name: "ifj_predictive_briefing", label: "IFJ Briefing Preditivo", description: "Previsões semanais de risco de abandono, platôs e quedas de adesão", icon: BarChart3, category: "Inteligência IFJ", defaultTier: "premium", addedVersion: "7.0" },
  { name: "ifj_patient_coach", label: "IFJ Coach do Paciente", description: "Assistente pessoal de IA para pacientes com conhecimento do plano alimentar", icon: Heart, category: "Inteligência IFJ", defaultTier: "premium", addedVersion: "7.0" },
  { name: "ifj_narrative_report", label: "IFJ Relatório Narrativo", description: "Geração automática de relatórios clínicos narrativos com IA", icon: FileText, category: "Inteligência IFJ", defaultTier: "premium", addedVersion: "7.0" },
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
