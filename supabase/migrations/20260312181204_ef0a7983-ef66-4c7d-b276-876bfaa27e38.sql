
-- Affiliate metrics cache for dashboard performance
CREATE TABLE IF NOT EXISTS public.affiliate_metrics_cache (
  affiliate_id uuid PRIMARY KEY REFERENCES public.affiliates(id) ON DELETE CASCADE,
  total_earnings numeric DEFAULT 0,
  monthly_earnings numeric DEFAULT 0,
  pending_earnings numeric DEFAULT 0,
  total_referrals integer DEFAULT 0,
  active_referrals integer DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  ranking_position integer,
  tier_name text DEFAULT 'Bronze',
  tier_level integer DEFAULT 1,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.affiliate_metrics_cache ENABLE ROW LEVEL SECURITY;

-- Affiliates can read their own metrics
CREATE POLICY "Users can view own affiliate metrics"
  ON public.affiliate_metrics_cache FOR SELECT
  USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

-- Admin can view all
CREATE POLICY "Admins can view all affiliate metrics"
  ON public.affiliate_metrics_cache FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can upsert (for cron job)
CREATE POLICY "Service can manage affiliate metrics"
  ON public.affiliate_metrics_cache FOR ALL
  USING (true)
  WITH CHECK (true);

-- Affiliate risk flags for anti-fraud
CREATE TABLE IF NOT EXISTS public.affiliate_risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliates(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.affiliate_referrals(id) ON DELETE SET NULL,
  flag_type text NOT NULL, -- 'self_referral', 'same_ip', 'rapid_signup', 'early_cancel', 'suspicious_pattern'
  severity text DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  description text,
  metadata jsonb DEFAULT '{}',
  resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.affiliate_risk_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage risk flags"
  ON public.affiliate_risk_flags FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to refresh affiliate metrics cache
CREATE OR REPLACE FUNCTION public.refresh_affiliate_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Upsert metrics for all active affiliates
  INSERT INTO public.affiliate_metrics_cache (
    affiliate_id, total_earnings, monthly_earnings, pending_earnings,
    total_referrals, active_referrals, conversion_rate, tier_name, tier_level, updated_at
  )
  SELECT
    a.id,
    COALESCE((SELECT SUM(commission_amount) FROM affiliate_commissions WHERE affiliate_id = a.id AND status IN ('approved','paid')), 0),
    COALESCE((SELECT SUM(commission_amount) FROM affiliate_commissions WHERE affiliate_id = a.id AND status IN ('approved','paid') AND created_at >= date_trunc('month', now())), 0),
    COALESCE((SELECT SUM(commission_amount) FROM affiliate_commissions WHERE affiliate_id = a.id AND status = 'pending'), 0),
    COALESCE((SELECT COUNT(*) FROM affiliate_referrals WHERE affiliate_id = a.id), 0)::integer,
    COALESCE((SELECT COUNT(*) FROM affiliate_referrals WHERE affiliate_id = a.id AND status = 'paying'), 0)::integer,
    CASE
      WHEN (SELECT COUNT(*) FROM affiliate_referrals WHERE affiliate_id = a.id) > 0
      THEN ROUND((SELECT COUNT(*) FROM affiliate_referrals WHERE affiliate_id = a.id AND status = 'paying')::numeric / (SELECT COUNT(*) FROM affiliate_referrals WHERE affiliate_id = a.id)::numeric * 100, 1)
      ELSE 0
    END,
    COALESCE((SELECT tier_name FROM get_affiliate_commission_tier(a.id) LIMIT 1), 'Bronze'),
    COALESCE((SELECT tier_level FROM get_affiliate_commission_tier(a.id) LIMIT 1), 1),
    now()
  FROM affiliates a
  WHERE a.is_active = true
  ON CONFLICT (affiliate_id) DO UPDATE SET
    total_earnings = EXCLUDED.total_earnings,
    monthly_earnings = EXCLUDED.monthly_earnings,
    pending_earnings = EXCLUDED.pending_earnings,
    total_referrals = EXCLUDED.total_referrals,
    active_referrals = EXCLUDED.active_referrals,
    conversion_rate = EXCLUDED.conversion_rate,
    tier_name = EXCLUDED.tier_name,
    tier_level = EXCLUDED.tier_level,
    updated_at = now();

  -- Update ranking positions
  WITH ranked AS (
    SELECT affiliate_id, ROW_NUMBER() OVER (ORDER BY total_earnings DESC) as pos
    FROM affiliate_metrics_cache
  )
  UPDATE affiliate_metrics_cache amc
  SET ranking_position = r.pos
  FROM ranked r
  WHERE amc.affiliate_id = r.affiliate_id;
END;
$$;
