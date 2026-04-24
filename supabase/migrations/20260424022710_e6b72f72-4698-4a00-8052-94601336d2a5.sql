-- Ajustar função de validação para ser mandatória e ignorar overrides manuais quando houver meta global
CREATE OR REPLACE FUNCTION public.fn_validate_macro_distribution()
RETURNS TRIGGER AS $$
DECLARE
    plan_protein NUMERIC;
    plan_carbs NUMERIC;
    plan_fat NUMERIC;
    plan_kcal NUMERIC;
BEGIN
    SELECT global_protein_target, global_carbs_target, global_fat_target, global_calories_target 
    INTO plan_protein, plan_carbs, plan_fat, plan_kcal
    FROM public.meal_plans 
    WHERE id = NEW.meal_plan_id;

    -- Se existe uma meta global, o percentual manda.
    -- Se o nutricionista quiser mudar a refeição, ele deve mudar o target_percentage
    -- ou a meta global do plano.
    IF plan_protein IS NOT NULL AND NEW.target_percentage IS NOT NULL THEN
        NEW.protein_target := (plan_protein * NEW.target_percentage) / 100;
        NEW.carbs_target := (plan_carbs * NEW.target_percentage) / 100;
        NEW.fat_target := (plan_fat * NEW.target_percentage) / 100;
        NEW.calories_target := (plan_kcal * NEW.target_percentage) / 100;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
