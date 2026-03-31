
-- Simulation runs table for the automated user simulator
CREATE TABLE public.simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_by UUID REFERENCES auth.users(id),
  mode TEXT NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'smoke_test')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  scenarios_total INTEGER NOT NULL DEFAULT 0,
  scenarios_passed INTEGER NOT NULL DEFAULT 0,
  scenarios_failed INTEGER NOT NULL DEFAULT 0,
  scenarios_skipped INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  results_json JSONB DEFAULT '[]'::jsonb,
  warnings TEXT[] DEFAULT '{}',
  errors TEXT[] DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Simulation scenario results (detail per scenario)
CREATE TABLE public.simulation_scenario_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  scenario_group TEXT NOT NULL,
  scenario_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'passed', 'failed', 'skipped')),
  duration_ms INTEGER,
  error_message TEXT,
  error_detail TEXT,
  affected_route TEXT,
  affected_function TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rate limiting: max 10 runs per day per user
CREATE TABLE public.simulation_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  run_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, run_date)
);

-- RLS
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_scenario_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies: only authenticated users can manage their own simulation data
CREATE POLICY "Users can view own simulation runs" ON public.simulation_runs
  FOR SELECT TO authenticated USING (executed_by = auth.uid());

CREATE POLICY "Users can insert own simulation runs" ON public.simulation_runs
  FOR INSERT TO authenticated WITH CHECK (executed_by = auth.uid());

CREATE POLICY "Users can update own simulation runs" ON public.simulation_runs
  FOR UPDATE TO authenticated USING (executed_by = auth.uid());

CREATE POLICY "Users can view own scenario results" ON public.simulation_scenario_results
  FOR SELECT TO authenticated USING (
    run_id IN (SELECT id FROM public.simulation_runs WHERE executed_by = auth.uid())
  );

CREATE POLICY "Users can insert own scenario results" ON public.simulation_scenario_results
  FOR INSERT TO authenticated WITH CHECK (
    run_id IN (SELECT id FROM public.simulation_runs WHERE executed_by = auth.uid())
  );

CREATE POLICY "Users can manage own rate limits" ON public.simulation_rate_limits
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Function to check/increment rate limit
CREATE OR REPLACE FUNCTION public.check_simulation_rate_limit()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_per_day INTEGER := 10;
BEGIN
  INSERT INTO simulation_rate_limits (user_id, run_date, run_count)
  VALUES (auth.uid(), CURRENT_DATE, 1)
  ON CONFLICT (user_id, run_date)
  DO UPDATE SET run_count = simulation_rate_limits.run_count + 1
  RETURNING run_count INTO current_count;
  
  RETURN current_count <= max_per_day;
END;
$$;
