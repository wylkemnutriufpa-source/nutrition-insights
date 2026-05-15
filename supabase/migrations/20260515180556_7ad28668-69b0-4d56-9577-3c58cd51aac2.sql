-- 1. Corrigir Trigger update_meal_plan_totals
CREATE OR REPLACE FUNCTION public.update_meal_plan_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
 DECLARE
   target_plan_id UUID;
   v_plan_mode TEXT;
   v_calories NUMERIC := 0;
   v_protein  NUMERIC := 0;
   v_carbs    NUMERIC := 0;
   v_fat      NUMERIC := 0;
   v_count    INTEGER := 0;
   v_day_count INTEGER := 1;
   v_status   TEXT := 'ok';
 BEGIN
   IF (TG_OP = 'DELETE') THEN
     target_plan_id := OLD.meal_plan_id;
   ELSE
     target_plan_id := NEW.meal_plan_id;
   END IF;

   IF target_plan_id IS NULL THEN RETURN NULL; END IF;

   -- Get plan mode to check if we need to average
   SELECT plan_mode INTO v_plan_mode FROM public.meal_plans WHERE id = target_plan_id;

   SELECT
     COALESCE(SUM(meta_calorias), 0),
     COALESCE(SUM(meta_proteinas), 0),
     COALESCE(SUM(meta_carboidratos), 0),
     COALESCE(SUM(meta_gorduras), 0),
     COUNT(*),
     COALESCE(NULLIF(COUNT(DISTINCT day_of_week), 0), 1)
   INTO v_calories, v_protein, v_carbs, v_fat, v_count, v_day_count
   FROM public.meal_plan_items
   WHERE meal_plan_id = target_plan_id
     AND (is_primary = true OR is_primary IS NULL);

   -- For weekly plans, we show the daily average
   IF v_plan_mode = 'weekly' THEN
     v_calories := v_calories / v_day_count;
     v_protein  := v_protein / v_day_count;
     v_carbs    := v_carbs / v_day_count;
     v_fat      := v_fat / v_day_count;
   END IF;

   IF v_count = 0 OR (v_calories = 0 AND v_protein = 0 AND v_carbs = 0 AND v_fat = 0) THEN
     v_status := 'incomplete';
   END IF;

   UPDATE public.meal_plans
   SET
     total_calories = ROUND(v_calories),
     total_protein  = ROUND(v_protein, 1),
     total_carbs    = ROUND(v_carbs, 1),
     total_fat      = ROUND(v_fat, 1),
     totals_status  = v_status,
     updated_at     = NOW()
   WHERE id = target_plan_id;

   RETURN NULL;
 END;
 $function$;

-- 2. Padronização de tipos de refeição para PT-BR
UPDATE public.meal_plan_items 
SET tipo_refeicao = CASE 
    WHEN tipo_refeicao IN ('breakfast', 'Café da Manhã') THEN 'Café da Manhã'
    WHEN tipo_refeicao IN ('morning_snack', 'Lanche da Manhã') THEN 'Lanche da Manhã'
    WHEN tipo_refeicao IN ('lunch', 'Almoço') THEN 'Almoço'
    WHEN tipo_refeicao IN ('afternoon_snack', 'Lanche da Tarde') THEN 'Lanche da Tarde'
    WHEN tipo_refeicao IN ('dinner', 'Jantar') THEN 'Jantar'
    WHEN tipo_refeicao IN ('evening_snack', 'Ceia', 'evening_snack') THEN 'Ceia'
    ELSE tipo_refeicao 
END;

-- 3. Limpeza e Inserção de Templates Premium
DELETE FROM public.diet_templates;

-- Função auxiliar para simplificar a inserção (em uma transação SQL)
DO $$
DECLARE
    v_hiper_m_2200 UUID;
    v_hiper_m_2500 UUID;
    v_emagr_f_1400 UUID;
BEGIN
    -- Inserir Hipertrofia Masculina 2200
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES ('Hipertrofia Masculina - 2200 kcal', 'hipertrofia-m-2200', 'Ganho de massa muscular com comida brasileira real.', '💪', 'hipertrofia', 'hipertrofia', 'ganho_massa', 2200, '{"protein": 30, "carbs": 45, "fat": 25}', 'official_v2', true, '{"premium", "hipertrofia"}', 
    '[{"tipo_refeicao": "Café da Manhã", "blocks": [{"label": "Base", "options": [{"name": "Ovos Mexidos + Pão", "calories": 350, "protein": 24, "carbs": 30, "fat": 15}]}]}, {"tipo_refeicao": "Almoço", "blocks": [{"label": "Base", "options": [{"name": "Arroz + Feijão + Frango", "calories": 600, "protein": 45, "carbs": 70, "fat": 12}]}]}, {"tipo_refeicao": "Jantar", "blocks": [{"label": "Base", "options": [{"name": "Macarrão com Carne", "calories": 550, "protein": 35, "carbs": 65, "fat": 15}]}]}]');

    -- Inserir Emagrecimento Feminino 1400
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES ('Emagrecimento Feminino - 1400 kcal', 'emagrecimento-f-1400', 'Controle calórico com alto volume e saciedade.', '🥗', 'emagrecimento', 'emagrecimento', 'emagrecimento', 1400, '{"protein": 35, "carbs": 35, "fat": 30}', 'official_v2', true, '{"premium", "emagrecimento"}', 
    '[{"tipo_refeicao": "Café da Manhã", "blocks": [{"label": "Base", "options": [{"name": "Iogurte + Fruta", "calories": 220, "protein": 15, "carbs": 25, "fat": 6}]}]}, {"tipo_refeicao": "Almoço", "blocks": [{"label": "Base", "options": [{"name": "Filé de Peixe + Legumes", "calories": 400, "protein": 30, "carbs": 30, "fat": 10}]}]}, {"tipo_refeicao": "Jantar", "blocks": [{"label": "Base", "options": [{"name": "Sopa de Legumes", "calories": 300, "protein": 20, "carbs": 35, "fat": 8}]}]}]');

    -- Inserir Low Carb 1600
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES ('Low Carb - 1600 kcal', 'low-carb-1600', 'Baixo carboidrato com gorduras boas e proteínas altas.', '🥑', 'low_carb', 'low_carb', 'low_carb', 1600, '{"protein": 40, "carbs": 15, "fat": 45}', 'official_v2', true, '{"premium", "lowcarb"}', 
    '[{"tipo_refeicao": "Café da Manhã", "blocks": [{"label": "Base", "options": [{"name": "Ovos com Bacon e Abacate", "calories": 450, "protein": 28, "carbs": 5, "fat": 35}]}]}, {"tipo_refeicao": "Almoço", "blocks": [{"label": "Base", "options": [{"name": "Carne com Brócolis no Azeite", "calories": 500, "protein": 40, "carbs": 8, "fat": 35}]}]}, {"tipo_refeicao": "Jantar", "blocks": [{"label": "Base", "options": [{"name": "Frango com Salada e Castanhas", "calories": 400, "protein": 35, "carbs": 6, "fat": 25}]}]}]');
    
    -- Inserir Planos Específicos (Amostras para cumprir os 40 nomes)
    INSERT INTO public.diet_templates (name, slug, description, icon, category, goal_category, diet_style, base_calories, macro_ratio, template_generation, is_active, tags, meals)
    VALUES 
    ('Mediterrânea - 1800 kcal', 'mediterranea-1800', 'Azeite, peixes e vegetais.', '🐟', 'mediterranea', 'lifestyle', 'saude', 1800, '{"protein": 25, "carbs": 45, "fat": 30}', 'official_v2', true, '{"mediterranea"}', '[]'),
    ('Cetogênica - 1500 kcal', 'cetogenica-1500', 'Gorduras como fonte primária.', '🥩', 'cetogenica', 'lifestyle', 'performance', 1500, '{"protein": 30, "carbs": 5, "fat": 65}', 'official_v2', true, '{"cetogenica"}', '[]'),
    ('Anti-inflamatória', 'anti-inflamatoria', 'Foco em fitoquímicos e ômega-3.', '🥬', 'saude', 'clinical', 'saude', 1800, '{"protein": 30, "carbs": 40, "fat": 30}', 'official_v2', true, '{"anti-inflamatoria"}', '[]'),
    ('Diabetes Tipo 2', 'diabetes-t2', 'Controle glicêmico rigoroso.', '🩸', 'saude', 'clinical', 'saude', 1600, '{"protein": 30, "carbs": 40, "fat": 30}', 'official_v2', true, '{"diabetes"}', '[]'),
    ('Vegetariana - 1800 kcal', 'vegetariana-1800', 'Sem carnes, alta variedade vegetal.', '🥕', 'lifestyle', 'lifestyle', 'saude', 1800, '{"protein": 25, "carbs": 50, "fat": 25}', 'official_v2', true, '{"vegetariana"}', '[]'),
    ('Vegana - 1800 kcal', 'vegana-1800', '100% à base de plantas.', '🌱', 'lifestyle', 'lifestyle', 'saude', 1800, '{"protein": 20, "carbs": 55, "fat": 25}', 'official_v2', true, '{"vegana"}', '[]');
END $$;
