
-- Menu items configuration table (source of truth for navigation)
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  label_key text NOT NULL,
  route text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT 'LayoutDashboard',
  category text NOT NULL DEFAULT 'PRINCIPAL',
  order_default int NOT NULL DEFAULT 100,
  role_visibility text[] NOT NULL DEFAULT '{patient,nutritionist,personal,admin}',
  premium_only boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  icon_color text,
  color text,
  premium_priority_boost boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User menu usage tracking table
CREATE TABLE public.user_menu_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  clicks_count int NOT NULL DEFAULT 0,
  last_access_at timestamptz NOT NULL DEFAULT now(),
  usage_score numeric NOT NULL DEFAULT 0,
  UNIQUE(user_id, menu_item_id)
);

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_menu_usage ENABLE ROW LEVEL SECURITY;

-- menu_items: readable by all authenticated users
CREATE POLICY "Anyone can read active menu items"
  ON public.menu_items FOR SELECT
  TO authenticated
  USING (true);

-- menu_items: only admins can modify
CREATE POLICY "Admins can manage menu items"
  ON public.menu_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_menu_usage: users can read/write their own
CREATE POLICY "Users can read own menu usage"
  ON public.user_menu_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can upsert own menu usage"
  ON public.user_menu_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own menu usage"
  ON public.user_menu_usage FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admin can see all usage
CREATE POLICY "Admins can read all menu usage"
  ON public.user_menu_usage FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RPC to track menu click (upsert + recalculate score)
CREATE OR REPLACE FUNCTION public.track_menu_click(_menu_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _recent_clicks int;
  _total_clicks int;
  _score numeric;
BEGIN
  -- Upsert usage record
  INSERT INTO public.user_menu_usage (user_id, menu_item_id, clicks_count, last_access_at)
  VALUES (auth.uid(), _menu_item_id, 1, now())
  ON CONFLICT (user_id, menu_item_id) DO UPDATE SET
    clicks_count = user_menu_usage.clicks_count + 1,
    last_access_at = now();

  -- Get updated values
  SELECT clicks_count INTO _total_clicks
  FROM public.user_menu_usage
  WHERE user_id = auth.uid() AND menu_item_id = _menu_item_id;

  -- Count recent clicks (last 7 days) from same user for this item
  -- We approximate: if last_access_at is within 7 days, boost recency
  SELECT CASE 
    WHEN last_access_at >= now() - interval '7 days' THEN LEAST(clicks_count, 50)
    ELSE 0
  END INTO _recent_clicks
  FROM public.user_menu_usage
  WHERE user_id = auth.uid() AND menu_item_id = _menu_item_id;

  -- Calculate score: clicks_count * 0.6 + recent_relevance * 0.4
  _score := (_total_clicks * 0.6) + (_recent_clicks * 0.4);

  UPDATE public.user_menu_usage
  SET usage_score = _score
  WHERE user_id = auth.uid() AND menu_item_id = _menu_item_id;
END;
$$;

-- Index for performance
CREATE INDEX idx_user_menu_usage_user ON public.user_menu_usage(user_id);
CREATE INDEX idx_menu_items_active ON public.menu_items(is_active);
