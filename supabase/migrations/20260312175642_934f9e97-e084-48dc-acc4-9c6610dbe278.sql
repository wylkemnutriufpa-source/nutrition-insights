
-- Function to calculate affiliate commission tier based on converted referral count
CREATE OR REPLACE FUNCTION public.get_affiliate_commission_tier(_affiliate_id uuid)
RETURNS TABLE(
  tier_name text,
  tier_level integer,
  first_payment_percent numeric,
  recurring_percent numeric,
  total_converted integer,
  next_tier_at integer,
  is_premium boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _count integer;
  _tier_name text;
  _tier_level integer;
  _first numeric;
  _recurring numeric;
  _next integer;
  _premium boolean;
BEGIN
  -- Count referrals with status 'paying' or 'registered' (converted)
  SELECT count(*) INTO _count
  FROM public.affiliate_referrals
  WHERE affiliate_id = _affiliate_id
  AND status IN ('paying', 'registered');

  -- Tier calculation
  IF _count >= 100 THEN
    _tier_name := 'Premium';
    _tier_level := 6;
    _first := 40;
    _recurring := 10;
    _next := NULL;
    _premium := true;
  ELSIF _count >= 80 THEN
    _tier_name := 'Diamante';
    _tier_level := 5;
    _first := 28;
    _recurring := 6;
    _next := 100;
    _premium := false;
  ELSIF _count >= 60 THEN
    _tier_name := 'Platina';
    _tier_level := 4;
    _first := 26;
    _recurring := 6;
    _next := 80;
    _premium := false;
  ELSIF _count >= 40 THEN
    _tier_name := 'Ouro';
    _tier_level := 3;
    _first := 24;
    _recurring := 5;
    _next := 60;
    _premium := false;
  ELSIF _count >= 20 THEN
    _tier_name := 'Prata';
    _tier_level := 2;
    _first := 22;
    _recurring := 5;
    _next := 40;
    _premium := false;
  ELSE
    _tier_name := 'Bronze';
    _tier_level := 1;
    _first := 20;
    _recurring := 5;
    _next := 20;
    _premium := false;
  END IF;

  RETURN QUERY SELECT _tier_name, _tier_level, _first, _recurring, _count, _next, _premium;
END;
$$;
