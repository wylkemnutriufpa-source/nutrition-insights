
-- ============================================================
-- AUDITORIA SINGLE DAY: Hardening da trigger e modelo de dados
-- ============================================================

-- 1) Coluna master_item_id: vínculo direto réplica → master
ALTER TABLE public.meal_plan_items
  ADD COLUMN IF NOT EXISTS master_item_id uuid REFERENCES public.meal_plan_items(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_mpi_master_item ON public.meal_plan_items(master_item_id);
CREATE INDEX IF NOT EXISTS idx_mpi_plan_day_master ON public.meal_plan_items(meal_plan_id, day_of_week, master_item_id);

COMMENT ON COLUMN public.meal_plan_items.master_item_id IS
  'Para planos single_day: réplicas (day_of_week 1-6) apontam para o item master (day_of_week=0). NULL para items master ou planos weekly.';

-- 2) Backfill defensivo para planos single_day existentes:
--    associa réplicas órfãs ao master mais provável (mesmo meal_plan_id + meal_type + ordem de criação)
WITH ranked AS (
  SELECT
    id, meal_plan_id, meal_type, day_of_week, created_at,
    row_number() OVER (
      PARTITION BY meal_plan_id, meal_type, day_of_week
      ORDER BY created_at, id
    ) AS rn
  FROM public.meal_plan_items
  WHERE master_item_id IS NULL
    AND meal_plan_id IN (SELECT id FROM public.meal_plans WHERE plan_mode::text = 'single_day')
),
masters AS (
  SELECT id AS master_id, meal_plan_id, meal_type, rn
  FROM ranked
  WHERE day_of_week = 0
),
replicas AS (
  SELECT id, meal_plan_id, meal_type, rn
  FROM ranked
  WHERE day_of_week BETWEEN 1 AND 6
)
UPDATE public.meal_plan_items mpi
SET master_item_id = m.master_id
FROM replicas r
JOIN masters m
  ON m.meal_plan_id = r.meal_plan_id
 AND m.meal_type = r.meal_type
 AND m.rn = r.rn
WHERE mpi.id = r.id;

-- 3) Reescrever trigger usando master_item_id (sem dependência de is_template_day)
DROP TRIGGER IF EXISTS tr_sync_single_day_items ON public.meal_plan_items;

CREATE OR REPLACE FUNCTION public.fn_sync_single_day_plan_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_plan_mode text;
  v_affected integer := 0;
  v_op text := TG_OP;
  v_plan_id uuid := COALESCE(NEW.meal_plan_id, OLD.meal_plan_id);
  v_master_id uuid := COALESCE(NEW.id, OLD.id);
  v_day integer := COALESCE(NEW.day_of_week, OLD.day_of_week);
BEGIN
  SELECT plan_mode::text INTO v_plan_mode
  FROM public.meal_plans WHERE id = v_plan_id;

  -- Apenas planos single_day disparam sincronização
  IF v_plan_mode IS DISTINCT FROM 'single_day' THEN
    RETURN NULL;
  END IF;

  -- Só processar items master (day_of_week = 0). Réplicas não disparam recursão.
  IF v_day IS DISTINCT FROM 0 THEN
    RETURN NULL;
  END IF;

  BEGIN
    IF TG_OP = 'INSERT' THEN
      -- Replicar nos dias 1..6 vinculando ao master via master_item_id
      INSERT INTO public.meal_plan_items (
        meal_plan_id, title, description, meal_type, day_of_week,
        calories_target, protein_target, carbs_target, fat_target,
        visual_library_item_id, image_url, substitution_group_id,
        is_primary, tenant_id, master_item_id
      )
      SELECT
        NEW.meal_plan_id, NEW.title, NEW.description, NEW.meal_type, d,
        NEW.calories_target, NEW.protein_target, NEW.carbs_target, NEW.fat_target,
        NEW.visual_library_item_id, NEW.image_url, NEW.substitution_group_id,
        NEW.is_primary, NEW.tenant_id, NEW.id
      FROM generate_series(1, 6) AS d;
      GET DIAGNOSTICS v_affected = ROW_COUNT;

    ELSIF TG_OP = 'UPDATE' THEN
      -- Atualizar APENAS as réplicas vinculadas a este master (1:1, sem colisão)
      UPDATE public.meal_plan_items
      SET title = NEW.title,
          description = NEW.description,
          meal_type = NEW.meal_type,
          calories_target = NEW.calories_target,
          protein_target = NEW.protein_target,
          carbs_target = NEW.carbs_target,
          fat_target = NEW.fat_target,
          visual_library_item_id = NEW.visual_library_item_id,
          image_url = NEW.image_url,
          substitution_group_id = NEW.substitution_group_id,
          is_primary = NEW.is_primary
      WHERE master_item_id = NEW.id
        AND day_of_week BETWEEN 1 AND 6;
      GET DIAGNOSTICS v_affected = ROW_COUNT;

      -- Auto-cura: se o item foi promovido a master mas as réplicas não existem, recriar
      IF v_affected = 0 THEN
        INSERT INTO public.meal_plan_items (
          meal_plan_id, title, description, meal_type, day_of_week,
          calories_target, protein_target, carbs_target, fat_target,
          visual_library_item_id, image_url, substitution_group_id,
          is_primary, tenant_id, master_item_id
        )
        SELECT
          NEW.meal_plan_id, NEW.title, NEW.description, NEW.meal_type, d,
          NEW.calories_target, NEW.protein_target, NEW.carbs_target, NEW.fat_target,
          NEW.visual_library_item_id, NEW.image_url, NEW.substitution_group_id,
          NEW.is_primary, NEW.tenant_id, NEW.id
        FROM generate_series(1, 6) AS d
        WHERE NOT EXISTS (
          SELECT 1 FROM public.meal_plan_items WHERE master_item_id = NEW.id
        );
        GET DIAGNOSTICS v_affected = ROW_COUNT;
      END IF;

    ELSIF TG_OP = 'DELETE' THEN
      -- Deletar APENAS réplicas vinculadas (ON DELETE CASCADE também cobre, mas explícito = log preciso)
      DELETE FROM public.meal_plan_items
      WHERE master_item_id = OLD.id;
      GET DIAGNOSTICS v_affected = ROW_COUNT;
    END IF;

    INSERT INTO public.single_day_sync_logs (
      meal_plan_id, master_item_id, operation, status, affected_rows, payload
    ) VALUES (
      v_plan_id, v_master_id, v_op, 'ok', v_affected,
      jsonb_build_object(
        'meal_type', COALESCE(NEW.meal_type::text, OLD.meal_type::text),
        'title', COALESCE(NEW.title, OLD.title),
        'origin', 'master_day_0'
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
$function$;

-- Recriar trigger com WHEN clause: só dispara em UPDATE quando colunas relevantes mudam
CREATE TRIGGER tr_sync_single_day_items_ins
AFTER INSERT ON public.meal_plan_items
FOR EACH ROW
WHEN (NEW.day_of_week = 0)
EXECUTE FUNCTION public.fn_sync_single_day_plan_items();

CREATE TRIGGER tr_sync_single_day_items_upd
AFTER UPDATE ON public.meal_plan_items
FOR EACH ROW
WHEN (
  NEW.day_of_week = 0 AND (
    NEW.title IS DISTINCT FROM OLD.title OR
    NEW.description IS DISTINCT FROM OLD.description OR
    NEW.meal_type IS DISTINCT FROM OLD.meal_type OR
    NEW.calories_target IS DISTINCT FROM OLD.calories_target OR
    NEW.protein_target IS DISTINCT FROM OLD.protein_target OR
    NEW.carbs_target IS DISTINCT FROM OLD.carbs_target OR
    NEW.fat_target IS DISTINCT FROM OLD.fat_target OR
    NEW.visual_library_item_id IS DISTINCT FROM OLD.visual_library_item_id OR
    NEW.image_url IS DISTINCT FROM OLD.image_url OR
    NEW.substitution_group_id IS DISTINCT FROM OLD.substitution_group_id OR
    NEW.is_primary IS DISTINCT FROM OLD.is_primary
  )
)
EXECUTE FUNCTION public.fn_sync_single_day_plan_items();

CREATE TRIGGER tr_sync_single_day_items_del
AFTER DELETE ON public.meal_plan_items
FOR EACH ROW
WHEN (OLD.day_of_week = 0)
EXECUTE FUNCTION public.fn_sync_single_day_plan_items();

-- 4) Atualizar validate_single_day_consistency para usar master_item_id (1:1 preciso)
CREATE OR REPLACE FUNCTION public.validate_single_day_consistency(p_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_mode text;
  v_master_count integer;
  v_replica_count integer;
  v_inconsistent jsonb;
BEGIN
  SELECT plan_mode::text INTO v_mode FROM public.meal_plans WHERE id = p_plan_id;

  IF v_mode IS DISTINCT FROM 'single_day' THEN
    RETURN jsonb_build_object('valid', true, 'mode', COALESCE(v_mode, 'unknown'), 'reason', 'not_single_day');
  END IF;

  SELECT count(*) INTO v_master_count
  FROM public.meal_plan_items
  WHERE meal_plan_id = p_plan_id AND day_of_week = 0;

  SELECT count(*) INTO v_replica_count
  FROM public.meal_plan_items
  WHERE meal_plan_id = p_plan_id AND day_of_week BETWEEN 1 AND 6;

  -- Cada master deve ter exatamente 6 réplicas vinculadas
  WITH issues AS (
    -- Masters com contagem incorreta de réplicas
    SELECT
      m.id AS master_id, m.meal_type::text AS meal_type, m.title,
      'wrong_replica_count'::text AS issue,
      0 AS day_of_week,
      jsonb_build_object('expected', 6, 'found', count(r.id)) AS detail
    FROM public.meal_plan_items m
    LEFT JOIN public.meal_plan_items r
      ON r.master_item_id = m.id AND r.day_of_week BETWEEN 1 AND 6
    WHERE m.meal_plan_id = p_plan_id AND m.day_of_week = 0
    GROUP BY m.id, m.meal_type, m.title
    HAVING count(r.id) <> 6

    UNION ALL

    -- Réplicas com drift de macros/título em relação ao master
    SELECT
      m.id, m.meal_type::text, m.title,
      'drift'::text,
      r.day_of_week,
      jsonb_build_object(
        'replica_id', r.id,
        'master_title', m.title, 'replica_title', r.title,
        'master_kcal', m.calories_target, 'replica_kcal', r.calories_target
      )
    FROM public.meal_plan_items m
    JOIN public.meal_plan_items r ON r.master_item_id = m.id
    WHERE m.meal_plan_id = p_plan_id AND m.day_of_week = 0
      AND (
        r.title IS DISTINCT FROM m.title OR
        r.meal_type IS DISTINCT FROM m.meal_type OR
        COALESCE(r.calories_target, -1) <> COALESCE(m.calories_target, -1) OR
        COALESCE(r.protein_target, -1) <> COALESCE(m.protein_target, -1) OR
        COALESCE(r.carbs_target, -1) <> COALESCE(m.carbs_target, -1) OR
        COALESCE(r.fat_target, -1) <> COALESCE(m.fat_target, -1)
      )

    UNION ALL

    -- Réplicas órfãs (sem master vinculado em day=0)
    SELECT
      r.id, r.meal_type::text, r.title,
      'orphan_replica'::text,
      r.day_of_week,
      jsonb_build_object('replica_id', r.id, 'master_item_id', r.master_item_id)
    FROM public.meal_plan_items r
    WHERE r.meal_plan_id = p_plan_id
      AND r.day_of_week BETWEEN 1 AND 6
      AND (r.master_item_id IS NULL
           OR NOT EXISTS (
             SELECT 1 FROM public.meal_plan_items mm
             WHERE mm.id = r.master_item_id AND mm.day_of_week = 0
           ))
  )
  SELECT COALESCE(jsonb_agg(issues.*), '[]'::jsonb) INTO v_inconsistent FROM issues;

  RETURN jsonb_build_object(
    'valid', (v_inconsistent = '[]'::jsonb),
    'mode', 'single_day',
    'master_items', v_master_count,
    'replica_items', v_replica_count,
    'expected_replicas', v_master_count * 6,
    'inconsistencies', v_inconsistent
  );
END;
$function$;

-- 5) RPC de reparo: força reconstrução das réplicas a partir do master
CREATE OR REPLACE FUNCTION public.repair_single_day_plan(p_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_mode text;
  v_owner uuid;
  v_deleted integer := 0;
  v_inserted integer := 0;
BEGIN
  SELECT plan_mode::text, nutritionist_id INTO v_mode, v_owner
  FROM public.meal_plans WHERE id = p_plan_id;

  IF v_mode IS DISTINCT FROM 'single_day' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_single_day');
  END IF;

  IF v_owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_owner');
  END IF;

  -- Deletar tudo dos dias 1..6 (réplicas) — CASCADE limpa qualquer vínculo
  DELETE FROM public.meal_plan_items
  WHERE meal_plan_id = p_plan_id AND day_of_week BETWEEN 1 AND 6;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Reinserir a partir do master (day_of_week=0) com vínculo master_item_id
  INSERT INTO public.meal_plan_items (
    meal_plan_id, title, description, meal_type, day_of_week,
    calories_target, protein_target, carbs_target, fat_target,
    visual_library_item_id, image_url, substitution_group_id,
    is_primary, tenant_id, master_item_id
  )
  SELECT
    m.meal_plan_id, m.title, m.description, m.meal_type, d,
    m.calories_target, m.protein_target, m.carbs_target, m.fat_target,
    m.visual_library_item_id, m.image_url, m.substitution_group_id,
    m.is_primary, m.tenant_id, m.id
  FROM public.meal_plan_items m
  CROSS JOIN generate_series(1, 6) AS d
  WHERE m.meal_plan_id = p_plan_id AND m.day_of_week = 0;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  INSERT INTO public.single_day_sync_logs (
    meal_plan_id, operation, status, affected_rows, payload
  ) VALUES (
    p_plan_id, 'REPAIR', 'ok', v_inserted,
    jsonb_build_object('deleted', v_deleted, 'inserted', v_inserted)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'deleted', v_deleted,
    'inserted', v_inserted
  );
END;
$function$;
