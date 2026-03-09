
-- Enum para gateways de pagamento
CREATE TYPE public.payment_gateway AS ENUM ('stripe', 'mercado_pago', 'pagseguro', 'pix', 'manual');

-- Tabela de planos de assinatura (definição dos planos)
CREATE TABLE public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC,
  currency TEXT NOT NULL DEFAULT 'BRL',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_patients INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de pagamentos (histórico)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id),
  gateway payment_gateway NOT NULL,
  gateway_payment_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Políticas para pricing_plans (público pode ver planos ativos)
CREATE POLICY "Anyone can view active plans" ON public.pricing_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage plans" ON public.pricing_plans
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Políticas para payments
CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage payments" ON public.payments
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir planos padrão
INSERT INTO public.pricing_plans (name, slug, description, price_monthly, price_yearly, features, max_patients, is_featured, sort_order) VALUES
('Free', 'free', 'Comece gratuitamente', 0, 0, '["Até 3 pacientes", "Planos alimentares básicos", "Chat com pacientes"]'::jsonb, 3, false, 1),
('Profissional', 'pro', 'Para nutricionistas em crescimento', 97, 970, '["Até 30 pacientes", "Planos alimentares ilimitados", "Análise de IA", "Relatórios automáticos", "Suporte prioritário"]'::jsonb, 30, true, 2),
('Premium', 'premium', 'Para clínicas e equipes', 197, 1970, '["Pacientes ilimitados", "Todas as funcionalidades Pro", "Branding personalizado", "API de integração", "Suporte dedicado"]'::jsonb, NULL, false, 3);
