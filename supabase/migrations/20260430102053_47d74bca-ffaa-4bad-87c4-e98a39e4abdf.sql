-- ============================================================
-- Editor V3 — Camada de Drafts (auto-save isolado da clínica)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.v3_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  nutritionist_id uuid NOT NULL,
  tenant_id uuid NOT NULL,

  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  meta_kcal numeric,
  meta_protein numeric,
  meta_carbs numeric,
  meta_fat numeric,

  draft_status text NOT NULL DEFAULT 'editing'
    CHECK (draft_status IN ('editing','promoted','discarded')),

  promoted_meal_plan_id uuid,
  promoted_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v3_drafts_patient ON public.v3_drafts(patient_id);
CREATE INDEX IF NOT EXISTS idx_v3_drafts_nutritionist ON public.v3_drafts(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_v3_drafts_tenant ON public.v3_drafts(tenant_id);

-- 1 só draft "editing" por par (nutricionista, paciente)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_v3_drafts_editing_per_pair
  ON public.v3_drafts(nutritionist_id, patient_id)
  WHERE draft_status = 'editing';

-- updated_at automático
CREATE OR REPLACE FUNCTION public.v3_drafts_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_v3_drafts_touch ON public.v3_drafts;
CREATE TRIGGER trg_v3_drafts_touch
BEFORE UPDATE ON public.v3_drafts
FOR EACH ROW EXECUTE FUNCTION public.v3_drafts_touch_updated_at();

-- ============================================================
-- RLS — Isolamento multi-tenant inviolável
-- ============================================================
ALTER TABLE public.v3_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "v3_drafts_select_owner_or_admin"
ON public.v3_drafts FOR SELECT
TO authenticated
USING (
  nutritionist_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "v3_drafts_insert_owner_bound_patient"
ON public.v3_drafts FOR INSERT
TO authenticated
WITH CHECK (
  nutritionist_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.nutritionist_patients np
    WHERE np.nutritionist_id = auth.uid()
      AND np.patient_id = v3_drafts.patient_id
  )
);

CREATE POLICY "v3_drafts_update_owner"
ON public.v3_drafts FOR UPDATE
TO authenticated
USING (nutritionist_id = auth.uid())
WITH CHECK (nutritionist_id = auth.uid());

CREATE POLICY "v3_drafts_delete_owner_or_admin"
ON public.v3_drafts FOR DELETE
TO authenticated
USING (
  nutritionist_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
