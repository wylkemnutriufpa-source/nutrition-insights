CREATE OR REPLACE FUNCTION public.fn_sync_single_day_plan_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_mode text;
    v_is_master_item boolean;
BEGIN
    -- Obter o modo do plano
    SELECT plan_mode::text INTO v_plan_mode 
    FROM public.meal_plans 
    WHERE id = COALESCE(NEW.meal_plan_id, OLD.meal_plan_id);

    -- Só agir se for single_day
    IF v_plan_mode != 'single_day' THEN
        RETURN NULL;
    END IF;

    -- Verificar se é um item do dia 0 (Master)
    v_is_master_item := (COALESCE(NEW.day_of_week, OLD.day_of_week) = 0);

    IF TG_OP = 'INSERT' AND v_is_master_item THEN
        -- Replicar novo item para os outros 6 dias
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
        END LOOP;

    ELSIF TG_OP = 'UPDATE' AND v_is_master_item THEN
        -- Atualizar réplicas nos dias 1-6 baseadas na estrutura master
        -- (Usamos o meal_type e title original/novo para localizar, mas idealmente seria por um sync_token se tivéssemos)
        -- Para simplificar agora, replicamos as propriedades para todos os itens do mesmo meal_type nos outros dias
        -- que foram marcados como template_day
        UPDATE public.meal_plan_items
        SET 
            title = NEW.title,
            description = NEW.description,
            calories_target = NEW.calories_target,
            protein_target = NEW.protein_target,
            carbs_target = NEW.carbs_target,
            fat_target = NEW.fat_target,
            visual_library_item_id = NEW.visual_library_item_id,
            image_url = NEW.image_url,
            is_primary = NEW.is_primary
        WHERE 
            meal_plan_id = NEW.meal_plan_id 
            AND meal_type = NEW.meal_type
            AND day_of_week BETWEEN 1 AND 6
            AND is_template_day = true;

    ELSIF TG_OP = 'DELETE' AND v_is_master_item THEN
        -- Remover réplicas
        DELETE FROM public.meal_plan_items
        WHERE 
            meal_plan_id = OLD.meal_plan_id 
            AND meal_type = OLD.meal_type
            AND day_of_week BETWEEN 1 AND 6
            AND is_template_day = true;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_single_day_items ON public.meal_plan_items;
CREATE TRIGGER tr_sync_single_day_items
AFTER INSERT OR UPDATE OR DELETE ON public.meal_plan_items
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_single_day_plan_items();
