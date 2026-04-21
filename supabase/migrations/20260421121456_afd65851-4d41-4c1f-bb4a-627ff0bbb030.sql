
-- ═══════════════════════════════════════════════════════════════
-- 1) Marcar todas as marmitas existentes como FIXAS (congeladas)
-- ═══════════════════════════════════════════════════════════════
UPDATE public.meal_recipes
SET is_fixed = true,
    is_scalable = false,
    updated_at = now()
WHERE is_active = true
  AND is_fixed = false;

-- ═══════════════════════════════════════════════════════════════
-- 2) Copiar marmitas para `recipes` (aba "Receitas" do sistema)
--    Pula entradas que já existam para o mesmo nutricionista+título.
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.recipes (
  nutritionist_id,
  title,
  description,
  ingredients,
  instructions,
  prep_time_minutes,
  cook_time_minutes,
  servings,
  difficulty,
  category,
  tags,
  is_shared
)
SELECT
  mr.nutritionist_id,
  mr.name,
  CASE mr.meal_type
    WHEN 'almoço' THEN 'Marmita congelada — almoço pronto para descongelar e consumir.'
    WHEN 'jantar' THEN 'Marmita congelada — jantar pronto para descongelar e consumir.'
    ELSE 'Marmita congelada pronta para descongelar e consumir.'
  END AS description,
  -- Converte foods_json [{name, grams}] em ingredients [{name, quantity, unit}]
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', f->>'name',
          'quantity', COALESCE((f->>'grams')::numeric, 0),
          'unit', 'g'
        )
      )
      FROM jsonb_array_elements(mr.foods_json) f
    ),
    '[]'::jsonb
  ) AS ingredients,
  jsonb_build_array(
    'Descongelar a marmita na geladeira por algumas horas ou no micro-ondas em modo descongelar.',
    'Aquecer no micro-ondas por 3 a 5 minutos ou em panela até ficar bem quente.',
    'Servir imediatamente.'
  ) AS instructions,
  5  AS prep_time_minutes,
  5  AS cook_time_minutes,
  1  AS servings,
  'easy' AS difficulty,
  'marmita' AS category,
  ARRAY['marmita', 'congelada', 'fixa', mr.meal_type] AS tags,
  false AS is_shared
FROM public.meal_recipes mr
WHERE mr.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.recipes r
    WHERE r.nutritionist_id = mr.nutritionist_id
      AND lower(r.title) = lower(mr.name)
  );

-- ═══════════════════════════════════════════════════════════════
-- 3) Criar template oficial "Marmitas Fixas Semanais"
--    category='marmita' evita o trigger tg_validate_practical_template
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.diet_templates (
  name,
  slug,
  description,
  icon,
  category,
  conditions,
  base_calories,
  macro_ratio,
  meals,
  tags,
  is_active,
  goal_category,
  diet_style,
  complexity_level,
  food_access_level,
  clinical_tags,
  template_generation
)
VALUES (
  'Marmitas Fixas Semanais',
  'marmitas-fixas-semanais-v1',
  'Cardápio para pacientes que consomem marmitas congeladas pré-prontas. As marmitas são fixas (não escalam) e o motor ajusta apenas café da manhã, lanches e ceia para fechar a meta calórica.',
  '🍱',
  'marmita',
  ARRAY[]::text[],
  1800,
  '{"fat": 30, "carbs": 40, "protein": 30}'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'meal_type', 'breakfast',
      'title', 'Café da Manhã',
      'time', '07:00',
      'foods', jsonb_build_array(
        jsonb_build_object('name', 'Tapioca com queijo branco', 'portion', '1 unidade média', 'substitutions', ARRAY['Pão integral com ovo', 'Cuscuz com ovo']),
        jsonb_build_object('name', 'Café com leite desnatado', 'portion', '200 ml'),
        jsonb_build_object('name', 'Fruta da estação', 'portion', '1 porção', 'substitutions', ARRAY['Mamão', 'Banana', 'Maçã'])
      )
    ),
    jsonb_build_object(
      'meal_type', 'morning_snack',
      'title', 'Lanche da Manhã',
      'time', '10:00',
      'foods', jsonb_build_array(
        jsonb_build_object('name', 'Iogurte natural com aveia', 'portion', '170 g + 1 colher sopa', 'substitutions', ARRAY['Fruta com castanhas'])
      )
    ),
    jsonb_build_object(
      'meal_type', 'lunch',
      'title', 'Almoço (Marmita Fixa)',
      'time', '12:30',
      'foods', jsonb_build_array(
        jsonb_build_object('name', 'Marmita congelada do dia (almoço)', 'portion', '1 marmita completa', 'substitutions', ARRAY['Rotacionar entre as marmitas cadastradas no banco do nutricionista'])
      )
    ),
    jsonb_build_object(
      'meal_type', 'afternoon_snack',
      'title', 'Lanche da Tarde',
      'time', '16:00',
      'foods', jsonb_build_array(
        jsonb_build_object('name', 'Fruta + castanhas', 'portion', '1 unidade + 15 g', 'substitutions', ARRAY['Iogurte natural', 'Whey protein com fruta'])
      )
    ),
    jsonb_build_object(
      'meal_type', 'dinner',
      'title', 'Jantar (Marmita Fixa)',
      'time', '19:30',
      'foods', jsonb_build_array(
        jsonb_build_object('name', 'Marmita congelada do dia (jantar)', 'portion', '1 marmita completa', 'substitutions', ARRAY['Rotacionar entre as marmitas cadastradas no banco do nutricionista'])
      )
    ),
    jsonb_build_object(
      'meal_type', 'evening_snack',
      'title', 'Ceia',
      'time', '22:00',
      'foods', jsonb_build_array(
        jsonb_build_object('name', 'Chá calmante + 1 fruta leve', 'portion', '200 ml + 1 unidade pequena', 'substitutions', ARRAY['Iogurte natural', 'Leite morno'])
      )
    )
  ),
  ARRAY['marmita', 'congelada', 'pratico', 'rotina'],
  true,
  'manutencao',
  'pratico',
  'simples',
  'facil',
  ARRAY['rotina_corrida', 'meal_prep'],
  'official_v2'
)
ON CONFLICT (slug) DO NOTHING;
