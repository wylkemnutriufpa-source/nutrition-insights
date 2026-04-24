
-- ════════════════════════════════════════════════════════════════════════════
-- FREEZE INTELIGENTE — CAMADA DE BACKEND
-- Tabela de log + trigger SQL que protege contrato de publicação
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Tabela para registrar violações de contrato
CREATE TABLE IF NOT EXISTS public.contract_violations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id text NOT NULL,
  source text NOT NULL,
  violations jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_violations_log ENABLE ROW LEVEL SECURITY;

-- Apenas admins veem
DROP POLICY IF EXISTS "Admins can view contract violations" ON public.contract_violations_log;
CREATE POLICY "Admins can view contract violations"
  ON public.contract_violations_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role escreve (edge functions usam service role)
DROP POLICY IF EXISTS "Service role can insert violations" ON public.contract_violations_log;
CREATE POLICY "Service role can insert violations"
  ON public.contract_violations_log FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_contract_violations_contract
  ON public.contract_violations_log (contract_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- 2) Trigger de contrato de publicação em meal_plans
--    Garante que um plano publicado:
--      - nunca volta para status não-publicado (exceto archived)
--      - sempre tem itens (>0) ao ser publicado
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_assert_publication_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_published_statuses text[] := ARRAY['published', 'published_to_patient'];
  v_item_count integer;
  v_violations text[] := ARRAY[]::text[];
BEGIN
  -- Só checa em UPDATE de status
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Status mudou?
  IF NEW.plan_status IS NOT DISTINCT FROM OLD.plan_status THEN
    RETURN NEW;
  END IF;

  -- Regra 1: plano publicado nunca pode "desaparecer" para status inválido
  IF OLD.plan_status = ANY(v_published_statuses)
     AND NOT (NEW.plan_status = ANY(v_published_statuses))
     AND NEW.plan_status <> 'archived' THEN
    v_violations := array_append(
      v_violations,
      format('Plano %s tentou sair de %s para status inválido %s',
             NEW.id, OLD.plan_status, NEW.plan_status)
    );
  END IF;

  -- Regra 2: ao publicar, deve ter pelo menos 1 item
  IF NEW.plan_status = ANY(v_published_statuses)
     AND NOT (OLD.plan_status = ANY(v_published_statuses)) THEN
    SELECT COUNT(*) INTO v_item_count
    FROM public.meal_plan_items
    WHERE meal_plan_id = NEW.id;

    IF v_item_count = 0 THEN
      v_violations := array_append(
        v_violations,
        format('Plano %s não pode ser publicado sem itens', NEW.id)
      );
    END IF;
  END IF;

  -- Se houve violação, registra e bloqueia
  IF array_length(v_violations, 1) > 0 THEN
    BEGIN
      INSERT INTO public.contract_violations_log (contract_id, source, violations, metadata)
      VALUES (
        'publication',
        'fn_assert_publication_contract',
        to_jsonb(v_violations),
        jsonb_build_object(
          'plan_id', NEW.id,
          'old_status', OLD.plan_status,
          'new_status', NEW.plan_status,
          'patient_id', NEW.patient_id
        )
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RAISE EXCEPTION 'CONTRACT_VIOLATION[publication]: %', array_to_string(v_violations, ' | ')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assert_publication_contract ON public.meal_plans;
CREATE TRIGGER trg_assert_publication_contract
  BEFORE UPDATE OF plan_status ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_assert_publication_contract();

COMMENT ON FUNCTION public.fn_assert_publication_contract() IS
  'FREEZE INTELIGENTE — Contrato de publicação. Protege regra: plano publicado nunca desaparece nem pode ser publicado vazio.';

COMMENT ON TABLE public.contract_violations_log IS
  'FREEZE INTELIGENTE — Log de violações de contrato (frontend e backend).';
