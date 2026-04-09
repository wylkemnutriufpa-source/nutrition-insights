
-- Move "Minha Dieta" to be the FIRST item for patients, in PRINCIPAL category
UPDATE public.menu_items 
SET category = 'PRINCIPAL', 
    order_default = 0,
    icon = 'UtensilsCrossed',
    icon_color = 'text-emerald-500'
WHERE id = 'da6a9aa5-7101-43e2-bac6-4b6d8dfbf672';
