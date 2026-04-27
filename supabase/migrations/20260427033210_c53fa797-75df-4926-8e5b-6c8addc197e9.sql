-- Telemetry table to track 404s and route errors (especially iOS Safari/PWA stale cache)
CREATE TABLE IF NOT EXISTS public.route_404_telemetry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pathname TEXT NOT NULL,
  full_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  is_ios BOOLEAN NOT NULL DEFAULT false,
  is_safari BOOLEAN NOT NULL DEFAULT false,
  is_standalone BOOLEAN NOT NULL DEFAULT false,
  has_service_worker BOOLEAN NOT NULL DEFAULT false,
  build_hash TEXT,
  user_id UUID,
  session_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_route_404_pathname ON public.route_404_telemetry (pathname);
CREATE INDEX IF NOT EXISTS idx_route_404_created ON public.route_404_telemetry (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_404_ios_safari ON public.route_404_telemetry (is_ios, is_safari) WHERE is_ios = true;

ALTER TABLE public.route_404_telemetry ENABLE ROW LEVEL SECURITY;

-- Anon clients can INSERT (they may be unauthenticated visitors hitting a 404)
CREATE POLICY "Anyone can log 404 telemetry"
  ON public.route_404_telemetry FOR INSERT
  TO public
  WITH CHECK (true);

-- Only admins can read aggregated data
CREATE POLICY "Admins can view 404 telemetry"
  ON public.route_404_telemetry FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public-route audit results (recurring health-check)
CREATE TABLE IF NOT EXISTS public.public_route_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pathname TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  ok BOOLEAN NOT NULL,
  notes TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_route_audits_checked ON public.public_route_audits (checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_route_audits_path ON public.public_route_audits (pathname, checked_at DESC);

ALTER TABLE public.public_route_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view public route audits"
  ON public.public_route_audits FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));