
-- Feature Registry: banco interno de funcionalidades auto-alimentado
CREATE TABLE public.feature_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  name text NOT NULL,
  short_description text NOT NULL,
  clinical_impact text,
  target_audience text NOT NULL DEFAULT 'both' CHECK (target_audience IN ('professional', 'patient', 'both')),
  journey_priority integer NOT NULL DEFAULT 50,
  icon_name text NOT NULL DEFAULT 'Sparkles',
  gradient text NOT NULL DEFAULT 'from-primary to-accent',
  emoji text NOT NULL DEFAULT '✨',
  experience_type text NOT NULL DEFAULT 'feature' CHECK (experience_type IN ('analysis', 'gamification', 'automation', 'ai', 'adherence', 'monitoring', 'feature', 'protocol')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'beta', 'hidden')),
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_highlight boolean NOT NULL DEFAULT false,
  display_order integer,
  cta_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_registry ENABLE ROW LEVEL SECURITY;

-- Everyone can read active features
CREATE POLICY "Anyone can read active features"
  ON public.feature_registry FOR SELECT
  USING (true);

-- Only admins can manage features
CREATE POLICY "Admins can manage features"
  ON public.feature_registry FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_feature_registry_status ON public.feature_registry(status);
CREATE INDEX idx_feature_registry_audience ON public.feature_registry(target_audience);
CREATE INDEX idx_feature_registry_order ON public.feature_registry(journey_priority, display_order);

-- Trigger for updated_at
CREATE TRIGGER update_feature_registry_updated_at
  BEFORE UPDATE ON public.feature_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with ALL existing features
INSERT INTO public.feature_registry (feature_key, name, short_description, clinical_impact, target_audience, journey_priority, icon_name, gradient, emoji, experience_type, bullets, cta_text, display_order) VALUES
-- PROFESSIONAL SLIDES
('cockpit', 'Cockpit Clínico', 'Dashboard inteligente para decisões rápidas', 'Reduz tempo de triagem e prioriza atendimentos críticos', 'professional', 10, 'LayoutDashboard', 'from-primary to-accent', '🎯', 'monitoring', '["Painel de pacientes que precisam de atenção imediata","Score de adesão e momentum de cada paciente","Alertas clínicos automáticos baseados em dados reais","Visão consolidada de toda sua carteira de pacientes"]', 'Explorar Cockpit', 1),
('meal_editor', 'Editor de Planos Premium', 'Monte planos alimentares em minutos', 'Aumenta produtividade e precisão na prescrição', 'professional', 20, 'Utensils', 'from-warning to-destructive', '📋', 'feature', '["Editor visual em grade semanal drag-and-drop","Biblioteca de refeições com inserção rápida","Geração automática via Motor FitJourney™","Controle de macros e calorias em tempo real"]', 'Abrir Editor', 2),
('clinical_engine', 'Motor Clínico FitJourney™', 'Inteligência determinística a seu favor', 'Gera planos respeitando objetivo, restrições e preferências', 'professional', 30, 'Sparkles', 'from-accent to-warning', '⚡', 'automation', '["Gera planos alimentares completos automaticamente","Respeita objetivo, restrições e preferências do paciente","Escala porções para bater metas calóricas com precisão","Planos nascem como rascunho para revisão profissional"]', 'Gerar Plano', 3),
('analytics', 'Dashboard de Resultados', 'Acompanhe a evolução de cada paciente', 'Permite decisões baseadas em dados reais de evolução', 'professional', 40, 'BarChart3', 'from-success to-info', '📊', 'analysis', '["Gráficos de peso, composição corporal e adesão","Comparativo entre consultas e protocolos","Relatórios automáticos semanais e mensais","Exportação em PDF para entrega ao paciente"]', 'Ver Analytics', 4),
('clinical_alerts', 'Alertas Clínicos Inteligentes', 'Nunca perca um paciente em risco', 'Identifica automaticamente abandono, estagnação e regressão', 'professional', 15, 'AlertTriangle', 'from-destructive to-warning', '🚨', 'monitoring', '["Detecção automática de risco de abandono","Alertas de estagnação prolongada","Sinalização de regressão de peso","Priorização inteligente de atendimentos"]', 'Ver Alertas', 5),
('protocols', 'Protocolos Nutricionais', 'Padronize e escale seu atendimento', 'Permite replicar metodologias comprovadas com consistência', 'professional', 50, 'FileText', 'from-info to-primary', '📑', 'protocol', '["Crie protocolos reutilizáveis com fases e tarefas","Aplique em múltiplos pacientes com um clique","Acompanhe performance de cada protocolo","Checklist automático gerado por fase"]', 'Ver Protocolos', 6),
('automation', 'Central de Automação', 'Regras inteligentes que trabalham por você', 'Reduz carga operacional e aumenta consistência do acompanhamento', 'professional', 60, 'Zap', 'from-accent to-primary', '🤖', 'automation', '["Crie regras automáticas de acompanhamento","Dispare ações baseadas em comportamento do paciente","Notificações inteligentes sem esforço manual","Escale seu atendimento sem perder qualidade"]', 'Configurar Automação', 7),
('chat', 'Chat Integrado', 'Comunicação direta com seus pacientes', 'Melhora vínculo terapêutico e resolve dúvidas rapidamente', 'both', 25, 'MessageCircle', 'from-primary to-info', '💬', 'feature', '["Chat em tempo real com notificações","Envio de imagens e fotos de refeições","Respostas rápidas pré-configuradas","Indicador de status online do profissional"]', 'Abrir Chat', 8),
('gamification', 'Gamificação e Ranking', 'Motivação que transforma resultados', 'Pacientes engajados têm 3x mais adesão ao plano', 'both', 35, 'Trophy', 'from-warning to-accent', '🏆', 'gamification', '["Sistema de pontos por ações saudáveis","Ranking entre pacientes do mesmo profissional","Conquistas e medalhas por consistência","Missões diárias personalizadas"]', 'Ver Ranking', 9),
('biquini_branco', 'Protocolo Biquíni Branco', 'Programa premium de transformação', 'Protocolo estruturado com fases progressivas de resultado', 'both', 70, 'Flame', 'from-destructive to-warning', '🔥', 'protocol', '["Programa com fases automáticas de progressão","Checklist específico por fase do protocolo","Acompanhamento intensivo com alertas","Transformação visual com antes e depois"]', 'Conhecer Protocolo', 10),
-- PATIENT SLIDES
('daily_routine', 'Sua Rotina Diária', 'O FitJourney organiza seu dia', 'Estrutura comportamental que aumenta adesão em até 40%', 'patient', 10, 'CalendarCheck', 'from-primary to-accent', '☀️', 'adherence', '["Checklist diário com tarefas personalizadas","Lembretes de refeições, água e suplementos","Missões e desafios para manter a motivação","Tudo acessível direto no celular"]', 'Começar Rotina', 1),
('meal_plan_view', 'Seu Plano Alimentar', 'Siga o plano com clareza total', 'Facilita execução do plano e reduz erros alimentares', 'patient', 20, 'Apple', 'from-success to-info', '🥗', 'feature', '["Toque em qualquer refeição para ver detalhes completos","Ingredientes, porções e modo de preparo na palma da mão","Substituições sugeridas quando precisar trocar algo","Macros e calorias calculados automaticamente"]', 'Ver Meu Plano', 2),
('progress_tracking', 'Registre Seu Progresso', 'Cada registro conta para sua evolução', 'Pacientes que registram progresso perdem 2x mais peso', 'patient', 30, 'TrendingUp', 'from-warning to-destructive', '📈', 'monitoring', '["Faça check-in de peso e medidas regularmente","Registre refeições e ganhe pontos no ranking","Foto de evolução corporal com comparativo","Seu nutricionista acompanha tudo em tempo real"]', 'Registrar Progresso', 3),
('results_view', 'Entenda Seus Resultados', 'Dados que fazem sentido', 'Visualização clara aumenta motivação e persistência', 'patient', 40, 'Target', 'from-info to-primary', '🏆', 'analysis', '["Gráficos simples de evolução de peso e adesão","Score de saúde e momentum da sua jornada","Conquistas e medalhas por consistência","Relatórios semanais com resumo do progresso"]', 'Ver Resultados', 4),
('support_system', 'Como o Sistema Te Ajuda', 'Inteligência que cuida de você', 'Suporte contínuo reduz abandono em até 60%', 'patient', 50, 'HeartPulse', 'from-accent to-success', '💚', 'ai', '["Alertas inteligentes para não sair do caminho","Dicas personalizadas baseadas no seu perfil","Comunicação direta com seu nutricionista via chat","Gamificação para tornar a jornada prazerosa"]', 'Explorar Recursos', 5),
('prestige', 'Sistema Prestige', 'Reconhecimento que inspira', 'Badges e status elevam engajamento e senso de pertencimento', 'patient', 45, 'Crown', 'from-warning to-accent', '👑', 'gamification', '["Planos de prestígio com badges exclusivos","Destaque no ranking com moldura especial","Pódio dos melhores do mês","Status visível para toda a comunidade"]', 'Ver Prestige', 6);
