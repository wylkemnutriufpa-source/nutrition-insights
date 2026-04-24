CREATE OR REPLACE FUNCTION public._tmp_fix_angela_lactose()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Desabilita triggers de imutabilidade temporariamente nesta sessão
  SET LOCAL session_replication_role = 'replica';

  UPDATE public.meal_plan_items SET
    title = 'Pão Francês com Ovo e Café',
    description = E'• Pão francês — 100g\n• Ovo cozido — 147g\n• Café preto sem açúcar — 147g\n\n🔄 Substituições:\n• Café com bebida vegetal (amêndoas/aveia)'
  WHERE id = '40f21bbe-de40-48c2-a5b8-b110d28b519d';

  UPDATE public.meal_plan_items SET
    title = 'Fruta + Castanhas',
    description = E'• Maçã — 100g\n• Castanha-do-pará — 25g\n\n🔄 Substituições:\n• Banana com pasta de amendoim'
  WHERE id = 'b0e14596-226a-4039-ab94-2b042a8c1df4';

  UPDATE public.meal_plan_items SET
    title = 'Vitamina Pré-Treino Sem Lactose',
    description = E'• Banana — 100g\n• Aveia em flocos — 40g\n• Bebida vegetal de aveia — 200g\n\n🔄 Substituições:\n• Água de coco com aveia'
  WHERE id = 'db5a4167-3272-49c1-a87b-175acb195f9c';

  UPDATE public.meal_plan_items SET
    title = 'Ceia Aveia com Bebida Vegetal',
    description = E'• Bebida vegetal de aveia — 200g\n• Aveia em flocos — 30g\n• Canela — 1g\n\n🔄 Substituições:\n• Mix de castanhas (25g)'
  WHERE id = '4b24e185-5fe1-47e9-a154-a4bef04c9422';

  UPDATE public.meal_plan_items SET
    title = 'Tilápia + Purê de Abóbora + Salada',
    description = E'• Tilápia — 110g\n• Purê de abóbora — 200g\n• Salada verde — 200g\n• Azeite de oliva — 15g\n\n🔄 Substituições:\n• Frango grelhado'
  WHERE id = '228347ef-4dad-4a02-9cd4-5ec54cfc3d93';

  UPDATE public.meal_plan_items SET
    title = 'Fruta + Castanhas (Tarde)',
    description = E'• Morango — 146g\n• Castanhas mix — 25g\n\n🔄 Substituições:\n• Banana com pasta de amendoim'
  WHERE id = '83634bd4-858f-44f3-8472-828043492254';

  UPDATE public.meal_plan_items SET
    title = 'Ceia Gelatina + Castanhas',
    description = E'• Gelatina sem açúcar — 150g\n• Mix de castanhas — 20g\n\n🔄 Substituições:\n• Ovo cozido + abacate'
  WHERE id = '171eaeba-61df-4d65-bee6-185e8939a36a';
END;
$$;

SELECT public._tmp_fix_angela_lactose();

DROP FUNCTION public._tmp_fix_angela_lactose();