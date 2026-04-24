
-- 1. BACKFILL plan_mode
UPDATE public.meal_plans SET plan_mode = 'weekly' WHERE plan_mode IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='meal_plans'
      AND column_name='plan_mode' AND is_nullable='YES'
  ) THEN
    ALTER TABLE public.meal_plans ALTER COLUMN plan_mode SET DEFAULT 'weekly';
    ALTER TABLE public.meal_plans ALTER COLUMN plan_mode SET NOT NULL;
  END IF;
END$$;

-- 2. LOGS ESTRUTURADOS
CREATE TABLE IF NOT EXISTS public.single_day_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID,
  master_item_id UUID,
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  affected_rows INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  error_detail TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sd_sync_logs_plan ON public.single_day_sync_logs(meal_plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sd_sync_logs_status ON public.single_day_sync_logs(status, created_at DESC);

ALTER TABLE public.single_day_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read sync logs of their plans" ON public.single_day_sync_logs;
CREATE POLICY "Owners can read sync logs of their plans"
ON public.single_day_sync_logs
FOR SELECT
TO authenticated
USING (
  meal_plan_id IS NULL OR EXISTS (
    SELECT 1 FROM public.meal_plans mp
    WHERE mp.id = single_day_sync_logs.meal_plan_id
      AND (mp.nutritionist_id = auth.uid() OR mp.patient_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "System inserts sync logs" ON public.single_day_sync_logs;
CREATE POLICY "System inserts sync logs"
ON public.single_day_sync_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. TRIGGER BLINDADA
CREATE OR REPLACE FUNCTION public.fn_sync_single_day_plan_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_mode text;
  v_is_master_item boolean;
  v_affected integer := 0;
  v_op text := TG_OP;
  v_plan_id uuid := COALESCE(NEW.meal_plan_id, OLD.meal_plan_id);
  v_master_id uuid := COALESCE(NEW.id, OLD.id);
BEGIN
  SELECT plan_mode::text INTO v_plan_mode FROM public.meal_plans WHERE id = v_plan_id;

  IF v_plan_mode IS DISTINCT FROM 'single_day' THEN
    RETURN NULL;
  END IF;

  v_is_master_item := (COALESCE(NEW.day_of_week, OLD.day_of_week) = 0);
  IF NOT v_is_master_item THEN
    RETURN NULL;
  END IF;

  BEGIN
    IF TG_OP = 'INSERT' THEN
      FOR i IN 1..6 LOOP
        INSERT INTO public.meal_plan_items (
          meal_plan_id, title, description, meal_type, day_of_week,
          calories_target, protein_target, carbs_target, fat_target,
          visual_library_item_id, image_url, substitution_group_id,
          is_primary, is_template_day, tenant_id
        ) VALUES (
          NEW.meal_plan_id, NEW.title, NEW.description, NEW.meal_type, i,
          NEW.calories_target, NEW.protein_target, NEW.carbs_target, NEW.fat_target,
          NEW.visual_library_item_id, NEW.image_url, NEW.substitution_group_id,
          NEW.is_primary, true, NEW.tenant_id
        );
        v_affected := v_affected + 1;
      END LOOP;

    ELSIF TG_OP = 'UPDATE' THEN
      UPDATE public.meal_plan_items
      SET title = NEW.title, description = NEW.description,
          calories_target = NEW.calories_target, protein_target = NEW.protein_target,
          carbs_target = NEW.carbs_target, fat_target = NEW.fat_target,
          visual_library_item_id = NEW.visual_library_item_id,
          image_url = NEW.image_url, is_primary = NEW.is_primary
      WHERE meal_plan_id = NEW.meal_plan_id
        AND meal_type = NEW.meal_type
        AND day_of_week BETWEEN 1 AND 6
        AND is_template_day = true;
      GET DIAGNOSTICS v_affected = ROW_COUNT;

    ELSIF TG_OP = 'DELETE' THEN
      DELETE FROM public.meal_plan_items
      WHERE meal_plan_id = OLD.meal_plan_id
        AND meal_type = OLD.meal_type
        AND day_of_week BETWEEN 1 AND 6
        AND is_template_day = true;
      GET DIAGNOSTICS v_affected = ROW_COUNT;
    END IF;

    INSERT INTO public.single_day_sync_logs (
      meal_plan_id, master_item_id, operation, status, affected_rows, payload
    ) VALUES (
      v_plan_id, v_master_id, v_op, 'ok', v_affected,
      jsonb_build_object(
        'meal_type', COALESCE(NEW.meal_type::text, OLD.meal_type::text),
        'title', COALESCE(NEW.title, OLD.title)
      )
    );
    RETURN NULL;

  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.single_day_sync_logs (
      meal_plan_id, master_item_id, operation, status, affected_rows,
      error_message, error_detail, payload
    ) VALUES (
      v_plan_id, v_master_id, v_op, 'error', v_affected,
      SQLERRM, SQLSTATE,
      jsonb_build_object(
        'meal_type', COALESCE(NEW.meal_type::text, OLD.meal_type::text),
        'title', COALESCE(NEW.title, OLD.title)
      )
    );
    RAISE WARNING '[fn_sync_single_day_plan_items] % falhou: %', v_op, SQLERRM;
    RETURN NULL;
  END;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_single_day_items ON public.meal_plan_items;
CREATE TRIGGER tr_sync_single_day_items
AFTER INSERT OR UPDATE OR DELETE ON public.meal_plan_items
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_single_day_plan_items();

-- 4. RPC DE VALIDAÇÃO
CREATE OR REPLACE FUNCTION public.validate_single_day_consistency(p_plan_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
  v_master_count integer;
  v_inconsistent jsonb;
BEGIN
  SELECT plan_mode::text INTO v_mode FROM public.meal_plans WHERE id = p_plan_id;

  IF v_mode IS DISTINCT FROM 'single_day' THEN
    RETURN jsonb_build_object('valid', true, 'mode', COALESCE(v_mode, 'unknown'), 'reason', 'not_single_day');
  END IF;

  SELECT count(*) INTO v_master_count
  FROM public.meal_plan_items
  WHERE meal_plan_id = p_plan_id AND day_of_week = 0;

  WITH master AS (
    SELECT meal_type, title, calories_target, protein_target, carbs_target, fat_target
    FROM public.meal_plan_items
    WHERE meal_plan_id = p_plan_id AND day_of_week = 0
  ),
  replicas AS (
    SELECT day_of_week, meal_type, title, calories_target, protein_target, carbs_target, fat_target
    FROM public.meal_plan_items
    WHERE meal_plan_id = p_plan_id AND day_of_week BETWEEN 1 AND 6
  ),
  diff AS (
    SELECT d AS day_of_week, m.meal_type::text AS meal_type, m.title, 'missing_in_day'::text AS issue
    FROM master m CROSS JOIN generate_series(1, 6) d
    WHERE NOT EXISTS (
      SELECT 1 FROM replicas r
      WHERE r.day_of_week = d AND r.meal_type = m.meal_type AND r.title = m.title
        AND COALESCE(r.calories_target, -1) = COALESCE(m.calories_target, -1)
        AND COALESCE(r.protein_target, -1) = COALESCE(m.protein_target, -1)
        AND COALESCE(r.carbs_target, -1) = COALESCE(m.carbs_target, -1)
        AND COALESCE(r.fat_target, -1) = COALESCE(m.fat_target, -1)
    )
    UNION ALL
    SELECT r.day_of_week, r.meal_type::text, r.title, 'extra_in_day'::text
    FROM replicas r
    WHERE NOT EXISTS (
      SELECT 1 FROM master m
      WHERE m.meal_type = r.meal_type AND m.title = r.title
        AND COALESCE(m.calories_target, -1) = COALESCE(r.calories_target, -1)
        AND COALESCE(m.protein_target, -1) = COALESCE(r.protein_target, -1)
        AND COALESCE(m.carbs_target, -1) = COALESCE(r.carbs_target, -1)
        AND COALESCE(m.fat_target, -1) = COALESCE(r.fat_target, -1)
    )
  )
  SELECT COALESCE(jsonb_agg(diff.*), '[]'::jsonb) INTO v_inconsistent FROM diff;

  RETURN jsonb_build_object(
    'valid', (v_inconsistent = '[]'::jsonb),
    'mode', 'single_day',
    'master_items', v_master_count,
    'inconsistencies', v_inconsistent
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_single_day_consistency(UUID) TO authenticated;
