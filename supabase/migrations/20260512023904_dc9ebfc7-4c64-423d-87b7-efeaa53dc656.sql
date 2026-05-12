-- Onda 1: Fundação Determinística — colunas de snapshot imutável
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS snapshot JSONB NULL,
  ADD COLUMN IF NOT EXISTS snapshot_schema_version TEXT NULL,
  ADD COLUMN IF NOT EXISTS snapshot_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS snapshot_generated_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.meal_plans.snapshot IS
  'Imutável MealPlanSnapshot v1 — gerado no momento de Salvar e Publicar. Nenhuma camada deve recalcular a partir dele nesta fase.';
COMMENT ON COLUMN public.meal_plans.snapshot_schema_version IS
  'Versão do contrato do snapshot (ex: "1.0.0"). Permite migrações retroativas seguras.';
COMMENT ON COLUMN public.meal_plans.snapshot_hash IS
  'SHA-256 hex do payload canônico do snapshot. Detecta adulteração.';
COMMENT ON COLUMN public.meal_plans.snapshot_generated_at IS
  'Timestamp da geração do snapshot (no momento da publicação).';

-- RPC server-authoritative para persistir snapshot.
-- SECURITY DEFINER: valida ownership do plano antes de gravar.
CREATE OR REPLACE FUNCTION public.persist_meal_plan_snapshot(
  _plan_id UUID,
  _snapshot JSONB,
  _schema_version TEXT,
  _engine_version TEXT,
  _snapshot_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  SELECT nutritionist_id INTO v_owner
  FROM public.meal_plans
  WHERE id = _plan_id;

  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'plan_not_found');
  END IF;

  IF v_owner <> v_caller AND NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF _snapshot IS NULL OR jsonb_typeof(_snapshot) <> 'object' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_snapshot');
  END IF;

  UPDATE public.meal_plans
  SET
    snapshot = _snapshot,
    snapshot_schema_version = _schema_version,
    snapshot_hash = _snapshot_hash,
    snapshot_generated_at = now(),
    engine_version = COALESCE(_engine_version, engine_version)
  WHERE id = _plan_id;

  RETURN jsonb_build_object(
    'success', true,
    'plan_id', _plan_id,
    'snapshot_hash', _snapshot_hash,
    'schema_version', _schema_version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.persist_meal_plan_snapshot(UUID, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.persist_meal_plan_snapshot(UUID, JSONB, TEXT, TEXT, TEXT) TO authenticated;