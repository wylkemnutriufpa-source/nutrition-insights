-- 1) Remover "(test)" do título do item residual
UPDATE public.meal_plan_items 
SET title = 'Ovos mexidos'
WHERE id = 'b5d0c1ee-56b3-4164-bb65-4ad2d94e310a'
  AND title = 'Ovos mexidos (test)';

-- 2) Padronizar plan_mode para single_day (todos os itens estão no day_of_week=0)
UPDATE public.meal_plans
SET plan_mode = 'single_day',
    updated_at = now()
WHERE id = 'a48e5b9f-9457-4bb0-bad3-731f7b5f2c9b'
  AND plan_mode = 'weekly';

-- 3) Recalcular totais via RPC existente (não-bloqueante)
SELECT public.calculate_plan_totals('a48e5b9f-9457-4bb0-bad3-731f7b5f2c9b'::uuid);
