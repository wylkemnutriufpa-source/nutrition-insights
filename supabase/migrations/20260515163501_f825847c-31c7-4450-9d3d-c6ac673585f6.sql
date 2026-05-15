-- Primeiro, vamos alterar a coluna para TEXT
ALTER TABLE public.meal_plan_items ALTER COLUMN meal_type TYPE TEXT;

-- Agora atualizamos os valores para PT-BR
UPDATE public.meal_plan_items SET meal_type = 'Café da Manhã' WHERE meal_type = 'breakfast';
UPDATE public.meal_plan_items SET meal_type = 'Lanche da Manhã' WHERE meal_type = 'morning_snack';
UPDATE public.meal_plan_items SET meal_type = 'Almoço' WHERE meal_type = 'lunch';
UPDATE public.meal_plan_items SET meal_type = 'Lanche da Tarde' WHERE meal_type = 'afternoon_snack';
UPDATE public.meal_plan_items SET meal_type = 'Jantar' WHERE meal_type = 'dinner';
UPDATE public.meal_plan_items SET meal_type = 'Ceia' WHERE meal_type = 'evening_snack';

-- Fazemos o mesmo para templates (já era TEXT, mas garantimos os valores)
UPDATE public.nutritionist_meal_templates SET meal_type = 'Café da Manhã' WHERE meal_type = 'breakfast';
UPDATE public.nutritionist_meal_templates SET meal_type = 'Lanche da Manhã' WHERE meal_type = 'morning_snack';
UPDATE public.nutritionist_meal_templates SET meal_type = 'Almoço' WHERE meal_type = 'lunch';
UPDATE public.nutritionist_meal_templates SET meal_type = 'Lanche da Tarde' WHERE meal_type = 'afternoon_snack';
UPDATE public.nutritionist_meal_templates SET meal_type = 'Jantar' WHERE meal_type = 'dinner';
UPDATE public.nutritionist_meal_templates SET meal_type = 'Ceia' WHERE meal_type = 'evening_snack';

-- E qualquer outra tabela que use meal_type como enum ou texto
-- Se houver uma tabela 'meals', atualizamos também
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'meals') THEN
        ALTER TABLE public.meals ALTER COLUMN meal_type TYPE TEXT;
        UPDATE public.meals SET meal_type = 'Café da Manhã' WHERE meal_type = 'breakfast';
        UPDATE public.meals SET meal_type = 'Lanche da Manhã' WHERE meal_type = 'morning_snack';
        UPDATE public.meals SET meal_type = 'Almoço' WHERE meal_type = 'lunch';
        UPDATE public.meals SET meal_type = 'Lanche da Tarde' WHERE meal_type = 'afternoon_snack';
        UPDATE public.meals SET meal_type = 'Jantar' WHERE meal_type = 'dinner';
        UPDATE public.meals SET meal_type = 'Ceia' WHERE meal_type = 'evening_snack';
    END IF;
END $$;
