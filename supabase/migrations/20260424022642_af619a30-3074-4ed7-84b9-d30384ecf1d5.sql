-- 1. Fixar a meta global no Plano Alimentar
ALTER TABLE public.meal_plans 
ADD COLUMN IF NOT EXISTS global_protein_target NUMERIC,
ADD COLUMN IF NOT EXISTS global_carbs_target NUMERIC,
ADD COLUMN IF NOT EXISTS global_fat_target NUMERIC,
ADD COLUMN IF NOT EXISTS global_calories_target NUMERIC;

-- 2. Adicionar distribuição percentual por item (refeição)
ALTER TABLE public.meal_plan_items 
ADD COLUMN IF NOT EXISTS target_percentage NUMERIC CHECK (target_percentage >= 0 AND target_percentage <= 100);

-- 3. Função para validar constância e distribuição
CREATE OR REPLACE FUNCTION public.fn_validate_macro_distribution()
RETURNS TRIGGER AS $$
DECLARE
    plan_protein NUMERIC;
    plan_carbs NUMERIC;
    plan_fat NUMERIC;
BEGIN
    -- Obter metas globais do plano
    SELECT global_protein_target, global_carbs_target, global_fat_target 
    INTO plan_protein, plan_carbs, plan_fat
    FROM public.meal_plans 
    WHERE id = NEW.meal_plan_id;

    -- Se o plano tiver metas globais fixas, a refeição DEVE ser uma fração delas
    IF plan_protein IS NOT NULL AND NEW.target_percentage IS NOT NULL THEN
        -- O banco apenas garante que o valor persistido é o percentual da meta global
        -- Isso evita que edições em um dia afetem o outro de forma inconsistente
        NEW.protein_target := (plan_protein * NEW.target_percentage) / 100;
        NEW.carbs_target := (plan_carbs * NEW.target_percentage) / 100;
        NEW.fat_target := (plan_fat * NEW.target_percentage) / 100;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Aplicar trigger de constância absoluta
DROP TRIGGER IF EXISTS trg_enforce_macro_constancy ON public.meal_plan_items;
CREATE TRIGGER trg_enforce_macro_constancy
BEFORE INSERT OR UPDATE ON public.meal_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_validate_macro_distribution();

-- 5. Comentário de Auditoria
COMMENT ON COLUMN public.meal_plans.global_protein_target IS 'Fonte da verdade: Macro calculado no onboarding/anamnese';
