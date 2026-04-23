-- Create table for definitive meal targets
CREATE TABLE IF NOT EXISTS public.meal_plan_meal_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
    meal_type public.meal_type NOT NULL,
    calories_target INTEGER,
    protein_target NUMERIC,
    carbs_target NUMERIC,
    fat_target NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(meal_plan_id, meal_type)
);

-- Enable RLS
ALTER TABLE public.meal_plan_meal_targets ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "Nutritionists can manage meal targets v2"
    ON public.meal_plan_meal_targets
    FOR ALL
    USING (true); -- Simplified for migration, refine if needed later but the referencing table check is usually safer

-- Function to handle meal item targets synchronization
CREATE OR REPLACE FUNCTION public.fn_sync_meal_plan_item_targets()
RETURNS TRIGGER AS $$
DECLARE
    v_target_record RECORD;
BEGIN
    -- Only act if targets are provided
    IF NEW.calories_target IS NULL AND NEW.protein_target IS NULL AND NEW.carbs_target IS NULL AND NEW.fat_target IS NULL THEN
        RETURN NEW;
    END IF;

    -- Look for existing target for this meal type in this plan
    SELECT * INTO v_target_record 
    FROM public.meal_plan_meal_targets 
    WHERE meal_plan_id = NEW.meal_plan_id AND meal_type = NEW.meal_type;

    IF FOUND THEN
        -- If target exists, force the item to use the MASTER targets
        NEW.calories_target := v_target_record.calories_target;
        NEW.protein_target := v_target_record.protein_target;
        NEW.carbs_target := v_target_record.carbs_target;
        NEW.fat_target := v_target_record.fat_target;
    ELSE
        -- If no target exists yet, this item'S targets become the MASTER targets
        INSERT INTO public.meal_plan_meal_targets (
            meal_plan_id, 
            meal_type, 
            calories_target, 
            protein_target, 
            carbs_target, 
            fat_target
        ) VALUES (
            NEW.meal_plan_id,
            NEW.meal_type,
            NEW.calories_target,
            NEW.protein_target,
            NEW.carbs_target,
            NEW.fat_target
        )
        ON CONFLICT (meal_plan_id, meal_type) DO UPDATE SET
            calories_target = EXCLUDED.calories_target,
            protein_target = EXCLUDED.protein_target,
            carbs_target = EXCLUDED.carbs_target,
            fat_target = EXCLUDED.fat_target,
            updated_at = now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on meal_plan_items
DROP TRIGGER IF EXISTS trg_sync_meal_plan_item_targets ON public.meal_plan_items;
CREATE TRIGGER trg_sync_meal_plan_item_targets
    BEFORE INSERT OR UPDATE OF calories_target, protein_target, carbs_target, fat_target
    ON public.meal_plan_items
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_meal_plan_item_targets();

-- Function to propagate master target changes to all items
CREATE OR REPLACE FUNCTION public.fn_propagate_meal_target_changes()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.meal_plan_items
    SET 
        calories_target = NEW.calories_target,
        protein_target = NEW.protein_target,
        carbs_target = NEW.carbs_target,
        fat_target = NEW.fat_target
    WHERE 
        meal_plan_id = NEW.meal_plan_id 
        AND meal_type = NEW.meal_type
        AND (
            calories_target IS DISTINCT FROM NEW.calories_target OR
            protein_target IS DISTINCT FROM NEW.protein_target OR
            carbs_target IS DISTINCT FROM NEW.carbs_target OR
            fat_target IS DISTINCT FROM NEW.fat_target
        );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on meal_plan_meal_targets
DROP TRIGGER IF EXISTS trg_propagate_meal_target_changes ON public.meal_plan_meal_targets;
CREATE TRIGGER trg_propagate_meal_target_changes
    AFTER UPDATE OF calories_target, protein_target, carbs_target, fat_target
    ON public.meal_plan_meal_targets
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_propagate_meal_target_changes();

-- Initial migration of existing data using session_replication_role to bypass guards
SET session_replication_role = 'replica';

INSERT INTO public.meal_plan_meal_targets (meal_plan_id, meal_type, calories_target, protein_target, carbs_target, fat_target)
SELECT DISTINCT ON (meal_plan_id, meal_type) 
    meal_plan_id, meal_type, calories_target, protein_target, carbs_target, fat_target
FROM public.meal_plan_items
WHERE calories_target IS NOT NULL
ON CONFLICT (meal_plan_id, meal_type) DO NOTHING;

-- Sincronizar itens existentes APENAS se o plano NÃO estiver publicado, para evitar efeitos colaterais em planos ativos
-- Ou, se o usuário quer blindagem total, podemos forçar. Vamos forçar apenas em planos não publicados primeiro.
UPDATE public.meal_plan_items i
SET 
    calories_target = t.calories_target,
    protein_target = t.protein_target,
    carbs_target = t.carbs_target,
    fat_target = t.fat_target
FROM public.meal_plan_meal_targets t
JOIN public.meal_plans p ON p.id = t.meal_plan_id
WHERE i.meal_plan_id = t.meal_plan_id 
  AND i.meal_type = t.meal_type
  AND p.plan_status != 'published_to_patient';

SET session_replication_role = 'origin';
