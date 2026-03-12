
-- Affiliate type enum
CREATE TYPE public.affiliate_type AS ENUM ('regular', 'nutritionist', 'premium_ambassador', 'custom');
-- Commission type enum
CREATE TYPE public.commission_type AS ENUM ('first_payment', 'recurring');
-- Commission status enum
CREATE TYPE public.commission_status AS ENUM ('pending', 'approved', 'paid', 'reversed', 'cancelled');
-- Referral status enum
CREATE TYPE public.referral_status AS ENUM ('lead', 'registered', 'paying', 'cancelled');
-- Payout status enum
CREATE TYPE public.payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');

-- Affiliates table
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  affiliate_type affiliate_type NOT NULL DEFAULT 'regular',
  first_payment_commission_percent NUMERIC(5,2) NOT NULL DEFAULT 30.00,
  recurring_commission_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Affiliate referrals table
CREATE TABLE public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_email TEXT NOT NULL,
  referred_type TEXT NOT NULL DEFAULT 'other',
  referral_code_used TEXT NOT NULL,
  referred_plan TEXT,
  status referral_status NOT NULL DEFAULT 'lead',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ,
  UNIQUE(referred_email)
);

-- Affiliate commissions table
CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES public.affiliate_referrals(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  stripe_subscription_id TEXT,
  commission_type commission_type NOT NULL,
  gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_percent NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status commission_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  UNIQUE(stripe_invoice_id, commission_type)
);

-- Affiliate payouts table
CREATE TABLE public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payout_method TEXT NOT NULL DEFAULT 'manual',
  payout_reference TEXT,
  payout_status payout_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can do everything
CREATE POLICY "Admins full access on affiliates" ON public.affiliates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access on affiliate_referrals" ON public.affiliate_referrals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access on affiliate_commissions" ON public.affiliate_commissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access on affiliate_payouts" ON public.affiliate_payouts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Affiliates can view their own data
CREATE POLICY "Affiliates view own record" ON public.affiliates FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Affiliates view own referrals" ON public.affiliate_referrals FOR SELECT TO authenticated USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Affiliates view own commissions" ON public.affiliate_commissions FOR SELECT TO authenticated USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Affiliates view own payouts" ON public.affiliate_payouts FOR SELECT TO authenticated USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON public.affiliates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to lookup affiliate by referral code (public/anon safe)
CREATE OR REPLACE FUNCTION public.lookup_affiliate_by_code(_code text)
RETURNS TABLE(affiliate_id uuid, affiliate_name text, affiliate_type affiliate_type)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT id, full_name, affiliate_type
  FROM public.affiliates
  WHERE referral_code = _code AND is_active = true
  LIMIT 1
$$;
