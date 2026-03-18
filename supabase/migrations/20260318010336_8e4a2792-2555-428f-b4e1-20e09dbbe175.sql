-- ═══════════════════════════════════════════════════════════
-- CLINICAL MILESTONES — Automated post-delivery protocol
-- ═══════════════════════════════════════════════════════════

-- 1. Milestone definitions (day 7, 15, 30, 45, 60)
CREATE TABLE public.clinical_milestone_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_key text UNIQUE NOT NULL,
  day_offset integer NOT NULL,
  label text NOT NULL,
  description text,
  actions jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_milestone_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read milestone defs"
  ON public.clinical_milestone_definitions FOR SELECT
  TO authenticated USING (true);

-- Seed milestone definitions
INSERT INTO public.clinical_milestone_definitions (milestone_key, day_offset, label, description, actions) VALUES
('day_7', 7, 'Primeira Leitura Comportamental', 
 'Avaliação inicial de adesão e engajamento após entrega do plano.',
 '["compute_adherence_score","classify_initial_risk","generate_silent_alert","update_lifecycle"]'::jsonb),
('day_15', 15, 'Verificação de Tendência', 
 'Análise de tendência de peso e consistência comportamental.',
 '["compute_weight_trend","evaluate_checklist_consistency","flag_stagnation","adjust_priority"]'::jsonb),
('day_30', 30, 'Análise Clínica Completa', 
 'Marco crítico: classificação metabólica, comportamental e de risco.',
 '["full_clinical_analysis","metabolic_classification","suggest_plan_adjustment","activate_retention_if_needed","update_lifecycle"]'::jsonb),
('day_45', 45, 'Zona de Abandono', 
 'Detecção de queda progressiva e ativação de protocolo de retenção.',
 '["dropout_deep_analysis","activate_retention_protocol","push_emotional","suggest_reconsultation"]'::jsonb),
('day_60', 60, 'Reavaliação Estratégica', 
 'Avaliação de eficácia do plano e decisão de manutenção/transição.',
 '["plan_efficacy_evaluation","maintenance_transition_check","protocol_transition_suggestion","update_lifecycle"]'::jsonb);

-- 2. Patient milestone evaluations (one per patient per milestone)
CREATE TABLE public.patient_clinical_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_key text NOT NULL REFERENCES public.clinical_milestone_definitions(milestone_key),
  plan_id uuid,
  plan_delivered_at timestamptz NOT NULL,
  milestone_due_at timestamptz NOT NULL,
  evaluated_at timestamptz,
  status text NOT NULL DEFAULT 'pending',  -- pending, evaluated, skipped
  
  -- Computed metrics at evaluation time
  adherence_score numeric,
  weight_delta numeric,
  checklist_completion_rate numeric,
  engagement_index numeric,
  dropout_risk_score numeric,
  days_since_last_checkin integer,
  login_frequency numeric,
  
  -- Classification result
  classification text,  -- positive_progress, stagnation, behavioral_risk, dropout_risk, metabolic_unexpected, maintenance_ready
  risk_level text,      -- stable, attention, risk, critical
  
  -- Actions taken
  actions_executed jsonb DEFAULT '[]',
  alerts_generated integer DEFAULT 0,
  lifecycle_state_before text,
  lifecycle_state_after text,
  
  -- Audit
  engine_version text DEFAULT '1.0.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(patient_id, milestone_key, plan_id)
);

ALTER TABLE public.patient_clinical_milestones ENABLE ROW LEVEL SECURITY;

-- Professionals can see their patients' milestones
CREATE POLICY "Professionals see own patients milestones"
  ON public.patient_clinical_milestones FOR SELECT
  TO authenticated
  USING (
    patient_id IN (
      SELECT np.patient_id FROM public.nutritionist_patients np
      WHERE np.nutritionist_id = auth.uid() AND np.status = 'active'
    )
    OR patient_id = auth.uid()
  );

-- Index for fast milestone queries
CREATE INDEX idx_milestones_pending ON public.patient_clinical_milestones (status, milestone_due_at) WHERE status = 'pending';
CREATE INDEX idx_milestones_patient ON public.patient_clinical_milestones (patient_id, milestone_key);

-- 3. Trigger: when plan is published → seed milestones + update lifecycle
CREATE OR REPLACE FUNCTION public.seed_clinical_milestones_on_plan_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _def record;
  _delivery_time timestamptz := now();
BEGIN
  -- Only trigger on publish
  IF NEW.plan_status = 'published_to_patient' 
     AND (OLD.plan_status IS NULL OR OLD.plan_status != 'published_to_patient') THEN
    
    -- Seed milestone evaluations for each active definition
    FOR _def IN SELECT * FROM public.clinical_milestone_definitions WHERE is_active = true LOOP
      INSERT INTO public.patient_clinical_milestones (
        patient_id, milestone_key, plan_id, plan_delivered_at, milestone_due_at
      ) VALUES (
        NEW.patient_id, _def.milestone_key, NEW.id, _delivery_time,
        _delivery_time + (_def.day_offset || ' days')::interval
      )
      ON CONFLICT (patient_id, milestone_key, plan_id) DO NOTHING;
    END LOOP;

    -- Update lifecycle state
    INSERT INTO public.patient_lifecycle_states (patient_id, lifecycle_state, has_active_plan, last_plan_delivery_at, has_pending_onboarding, updated_at)
    VALUES (NEW.patient_id, 'plan_delivered', true, _delivery_time, false, now())
    ON CONFLICT (patient_id) DO UPDATE SET
      lifecycle_state = CASE 
        WHEN patient_lifecycle_states.lifecycle_state IN ('closed', 'paused') THEN patient_lifecycle_states.lifecycle_state
        ELSE 'plan_delivered'::patient_lifecycle_status
      END,
      has_active_plan = true,
      last_plan_delivery_at = _delivery_time,
      has_pending_onboarding = false,
      updated_at = now();

    -- Supersede any open onboarding pipeline
    UPDATE public.onboarding_pipelines
    SET status = 'superseded_by_published_plan'
    WHERE patient_id = NEW.patient_id
    AND status NOT IN ('completed', 'superseded_by_published_plan');

    -- Timeline event
    INSERT INTO public.patient_timeline (patient_id, event_type, title, description, metadata)
    VALUES (
      NEW.patient_id, 'plan_delivered', 'Plano alimentar entregue',
      'Plano publicado e marcos clínicos automáticos ativados.',
      jsonb_build_object('plan_id', NEW.id, 'milestones_seeded', true)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger (drop if exists to avoid duplicate)
DROP TRIGGER IF EXISTS trg_seed_milestones_on_publish ON public.meal_plans;
CREATE TRIGGER trg_seed_milestones_on_publish
  AFTER UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_clinical_milestones_on_plan_delivery();

-- Also for INSERT (direct publish)
DROP TRIGGER IF EXISTS trg_seed_milestones_on_insert ON public.meal_plans;
CREATE TRIGGER trg_seed_milestones_on_insert
  AFTER INSERT ON public.meal_plans
  FOR EACH ROW
  WHEN (NEW.plan_status = 'published_to_patient')
  EXECUTE FUNCTION public.seed_clinical_milestones_on_plan_delivery();