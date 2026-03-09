
-- Site settings table for admin to edit all platform content
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  setting_type text NOT NULL DEFAULT 'text',
  category text NOT NULL DEFAULT 'general',
  label text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings (needed for landing page)
CREATE POLICY "Anyone can view site settings"
ON public.site_settings FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage site settings"
ON public.site_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default settings
INSERT INTO public.site_settings (setting_key, setting_value, setting_type, category, label) VALUES
  ('brand_name', '"NutriFlow"', 'text', 'branding', 'Nome da Marca'),
  ('brand_tagline', '"Plataforma #1 para Nutricionistas Modernos"', 'text', 'branding', 'Tagline'),
  ('brand_logo_url', '""', 'text', 'branding', 'URL do Logo'),
  ('primary_color', '"#10b981"', 'text', 'branding', 'Cor Primária'),
  ('accent_color', '"#f59e0b"', 'text', 'branding', 'Cor de Destaque'),
  ('hero_title', '"Transforme seu consultório com IA e Gamificação"', 'text', 'landing', 'Título do Hero'),
  ('hero_subtitle', '"Gerencie pacientes, crie planos alimentares personalizados com IA, e engaje seus clientes com gamificação — tudo em uma plataforma completa e intuitiva."', 'text', 'landing', 'Subtítulo do Hero'),
  ('hero_cta_text', '"Começar Gratuitamente"', 'text', 'landing', 'Texto do Botão CTA'),
  ('hero_badge_text', '"Plataforma #1 para Nutricionistas Modernos"', 'text', 'landing', 'Badge do Hero'),
  ('stats', '[{"value":"500+","label":"Nutricionistas"},{"value":"10k+","label":"Pacientes ativos"},{"value":"60%","label":"Mais adesão"},{"value":"99.9%","label":"Uptime"}]', 'json', 'landing', 'Estatísticas'),
  ('pricing_plans', '[{"name":"Starter","price":"Grátis","period":"para sempre","popular":false,"features":["Até 5 pacientes","Planos alimentares","Checklist de hábitos","Chat básico","Banco de alimentos TACO"],"cta":"Começar Grátis"},{"name":"Pro","price":"R$ 97","period":"/mês","popular":true,"features":["Pacientes ilimitados","IA completa (análise, receitas, planos)","Avaliação física + corporal","Gamificação avançada","Relatórios semanais","Suplementação","Branding personalizado","Suporte prioritário"],"cta":"Assinar Pro"},{"name":"Clínica","price":"R$ 197","period":"/mês","popular":false,"features":["Tudo do Pro","Multi-nutricionistas","Programas em grupo","Central de automação","Financeiro integrado","API personalizada","Onboarding dedicado"],"cta":"Falar com Vendas"}]', 'json', 'landing', 'Planos de Preço'),
  ('testimonials_landing', '[{"name":"Dra. Ana Costa","role":"Nutricionista Esportiva","text":"O NutriFlow revolucionou meu atendimento. A IA me economiza 3h por dia e meus pacientes adoram a gamificação!","rating":5,"avatar":"AC"},{"name":"Dr. Carlos Silva","role":"Nutricionista Clínico","text":"Meus pacientes nunca foram tão engajados. A adesão ao tratamento subiu 60% com os streaks e desafios.","rating":5,"avatar":"CS"},{"name":"Dra. Mariana Luz","role":"Nutricionista Funcional","text":"Relatórios profissionais com 1 clique, análise corporal por IA, chat integrado. Tudo que eu precisava em um só lugar.","rating":5,"avatar":"ML"},{"name":"Dr. Rafael Mendes","role":"Nutricionista Comportamental","text":"O AutoBot responde meus pacientes 24/7 sobre dúvidas de nutrição. É como ter um assistente que nunca dorme.","rating":5,"avatar":"RM"}]', 'json', 'landing', 'Depoimentos da Landing'),
  ('faqs', '[{"q":"Preciso instalar alguma coisa?","a":"Não! NutriFlow é 100% web e PWA. Funciona no navegador e pode ser instalado como app no celular."},{"q":"Meus pacientes precisam pagar?","a":"Não. Apenas o profissional paga pelo plano. Pacientes acessam gratuitamente com login próprio."},{"q":"A IA substitui o nutricionista?","a":"Jamais! A IA é sua assistente — analisa dados, gera sugestões e economiza tempo. Todas as decisões clínicas são suas."},{"q":"Meus dados estão seguros?","a":"Sim. Usamos criptografia de ponta, autenticação robusta e Row-Level Security. Cada paciente só acessa seus próprios dados."},{"q":"Posso personalizar com minha marca?","a":"Sim! No plano Pro você personaliza cores, logo e nome da marca. Seus pacientes veem sua identidade visual."},{"q":"Tem suporte?","a":"Sim! Chat in-app e email para todos. Suporte prioritário para planos Pro e Clínica."}]', 'json', 'landing', 'Perguntas Frequentes'),
  ('footer_text', '"Plataforma completa para nutricionistas modernos. Gerencie pacientes, planos alimentares e evolução com inteligência artificial."', 'text', 'landing', 'Texto do Footer'),
  ('social_links', '{"instagram":"","youtube":"","linkedin":"","whatsapp":""}', 'json', 'branding', 'Links das Redes Sociais'),
  ('meta_title', '"NutriFlow — Plataforma de Nutrição com IA e Gamificação"', 'text', 'seo', 'Meta Title'),
  ('meta_description', '"Gerencie pacientes, crie planos alimentares com IA, engaje com gamificação. A plataforma #1 para nutricionistas modernos."', 'text', 'seo', 'Meta Description');
