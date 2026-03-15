
-- ═══════════════════════════════════════════════════════════
-- FASE 13: Physiological Signal Intelligence Layer
-- PHYSIO_ENGINE v1.0.0
-- ═══════════════════════════════════════════════════════════

-- BLOCO 1: Wearable Devices
CREATE TABLE IF NOT EXISTS public.wearable_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  device_type text NOT NULL DEFAULT 'manual',
  provider text,
  device_identifier text,
  connected_at timestamptz DEFAULT now(),
  last_sync_at timestamptz,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.wearable_devices ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wearable_patient ON public.wearable_devices(patient_id);

-- BLOCO 2: Physiological Signals
CREATE TABLE IF NOT EXISTS public.patient_physiological_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  signal_date date NOT NULL DEFAULT CURRENT_DATE,
  resting_heart_rate numeric,
  heart_rate_variability numeric,
  sleep_duration_minutes numeric,
  sleep_quality_score numeric,
  steps integer,
  active_calories numeric,
  training_load_score numeric,
  readiness_score numeric,
  stress_index numeric,
  body_temperature_delta numeric,
  source_device text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, signal_date, source_device)
);

ALTER TABLE public.patient_physiological_signals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_physio_signals_patient_date ON public.patient_physiological_signals(patient_id, signal_date DESC);

-- BLOCO 5: Physiology Snapshots
CREATE TABLE IF NOT EXISTS public.patient_physiology_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  rpi numeric DEFAULT 0,
  psi numeric DEFAULT 0,
  training_load_balance text DEFAULT 'optimal',
  physiological_risk_level text DEFAULT 'low',
  has_physiological_data boolean DEFAULT false,
  resting_hr_trend text,
  hrv_trend text,
  sleep_trend text,
  metadata jsonb DEFAULT '{}',
  engine_version text DEFAULT '1.0.0',
  created_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, snapshot_date)
);

ALTER TABLE public.patient_physiology_snapshots ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_physio_snapshots_patient ON public.patient_physiology_snapshots(patient_id, snapshot_date DESC);

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

-- Wearable Devices: patients see own, nutritionists see their patients
CREATE POLICY "Patients view own devices" ON public.wearable_devices
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Nutritionists view patient devices" ON public.wearable_devices
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'nutritionist') AND
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = wearable_devices.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active')
  );

CREATE POLICY "Patients manage own devices" ON public.wearable_devices
  FOR ALL TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Physiological Signals: patients see own, nutritionists see their patients
CREATE POLICY "Patients view own signals" ON public.patient_physiological_signals
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Nutritionists view patient signals" ON public.patient_physiological_signals
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'nutritionist') AND
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = patient_physiological_signals.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active')
  );

CREATE POLICY "Patients insert own signals" ON public.patient_physiological_signals
  FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());

-- Physiology Snapshots: same pattern
CREATE POLICY "Patients view own snapshots" ON public.patient_physiology_snapshots
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Nutritionists view patient snapshots" ON public.patient_physiology_snapshots
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'nutritionist') AND
    EXISTS (SELECT 1 FROM public.nutritionist_patients np WHERE np.patient_id = patient_physiology_snapshots.patient_id AND np.nutritionist_id = auth.uid() AND np.status = 'active')
  );

-- System-level insert/update for edge functions (service role bypasses RLS)
