-- ============================================================
-- Onda 1: Template Slots — Schema ADITIVO
-- ============================================================
-- Adiciona fundação para Weekly Composer sem alterar fluxos
-- atuais. Templates legados (foods_structure) seguem intactos.
-- ============================================================

-- 1. Adicionar colunas opcionais (nullable, sem default destrutivo)
ALTER TABLE public.nutritionist_meal_templates
  ADD COLUMN IF NOT EXISTS slots jsonb,
  ADD COLUMN IF NOT EXISTS slots_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS composition_mode text NOT NULL DEFAULT 'legacy';

-- 2. Constraint de domínio para composition_mode (apenas valores conhecidos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'nutritionist_meal_templates_composition_mode_check'
  ) THEN
    ALTER TABLE public.nutritionist_meal_templates
      ADD CONSTRAINT nutritionist_meal_templates_composition_mode_check
      CHECK (composition_mode IN ('legacy', 'slots'));
  END IF;
END $$;

-- 3. Função de validação estrutural (somente quando slots preenchido)
CREATE OR REPLACE FUNCTION public.validate_meal_template_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  slot jsonb;
  pool jsonb;
  target_g_val numeric;
  role_val text;
BEGIN
  -- Modo legacy sem slots: nada a validar (compat retroativa total)
  IF NEW.slots IS NULL THEN
    IF NEW.composition_mode = 'slots' THEN
      RAISE EXCEPTION 'composition_mode=slots requer coluna slots preenchida';
    END IF;
    RETURN NEW;
  END IF;

  -- Slots deve ser array
  IF jsonb_typeof(NEW.slots) <> 'array' THEN
    RAISE EXCEPTION 'slots deve ser um array JSON, recebido %', jsonb_typeof(NEW.slots);
  END IF;

  IF jsonb_array_length(NEW.slots) = 0 THEN
    RAISE EXCEPTION 'slots não pode ser array vazio';
  END IF;

  -- Validar cada slot
  FOR slot IN SELECT * FROM jsonb_array_elements(NEW.slots)
  LOOP
    IF jsonb_typeof(slot) <> 'object' THEN
      RAISE EXCEPTION 'cada slot deve ser objeto JSON';
    END IF;

    -- role obrigatório (texto não vazio)
    role_val := slot->>'role';
    IF role_val IS NULL OR length(trim(role_val)) = 0 THEN
      RAISE EXCEPTION 'slot.role é obrigatório e não pode ser vazio';
    END IF;

    -- pool obrigatório (array não vazio)
    pool := slot->'pool';
    IF pool IS NULL OR jsonb_typeof(pool) <> 'array' OR jsonb_array_length(pool) = 0 THEN
      RAISE EXCEPTION 'slot.pool (role=%) deve ser array não vazio', role_val;
    END IF;

    -- target_g obrigatório (numérico > 0)
    BEGIN
      target_g_val := (slot->>'target_g')::numeric;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'slot.target_g (role=%) deve ser numérico', role_val;
    END;

    IF target_g_val IS NULL OR target_g_val <= 0 THEN
      RAISE EXCEPTION 'slot.target_g (role=%) deve ser > 0', role_val;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 4. Trigger BEFORE INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_validate_meal_template_slots
  ON public.nutritionist_meal_templates;

CREATE TRIGGER trg_validate_meal_template_slots
  BEFORE INSERT OR UPDATE OF slots, composition_mode
  ON public.nutritionist_meal_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_meal_template_slots();

-- 5. Comentários documentando contrato
COMMENT ON COLUMN public.nutritionist_meal_templates.slots IS
  'Onda 1 — Estrutura de composição (papéis + pool + target_g). NULL = template legacy usando foods_structure. Validado por trg_validate_meal_template_slots.';
COMMENT ON COLUMN public.nutritionist_meal_templates.slots_version IS
  'Versão do schema de slots para migrações futuras. Default 1.';
COMMENT ON COLUMN public.nutritionist_meal_templates.composition_mode IS
  'legacy = usa foods_structure (default, retroativo). slots = usa coluna slots para composição weekly real. Não muda comportamento atual sem opt-in explícito.';