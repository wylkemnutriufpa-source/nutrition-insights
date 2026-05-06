-- Garante que o item de menu da dieta tenha a feature correta vinculada
UPDATE public.menu_items 
SET feature = 'diet' 
WHERE route = '/patient-meal-plan' OR label = 'Minha Dieta';
