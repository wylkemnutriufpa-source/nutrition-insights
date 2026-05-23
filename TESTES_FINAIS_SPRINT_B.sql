-- TODOS os testes numa única query (retorna 5 linhas)
SELECT teste, template_title, best_kcal_key FROM (
  SELECT 'T1_sem_frango_diabetes' AS teste, template_title, best_kcal_key
  FROM public.select_sovereign_template(
    'lose_weight', 1500, 'female', 'moderate',
    ARRAY['sem_frango','intolerante_lactose']::text[], ARRAY['diabetes']::text[]
  )
  UNION ALL
  SELECT 'T2_vegetariana_saude', template_title, best_kcal_key
  FROM public.select_sovereign_template(
    'maintain', 1800, 'female', 'light',
    ARRAY['vegetariano']::text[], ARRAY[]::text[]
  )
  UNION ALL
  SELECT 'T3_hipertrofia_normal', template_title, best_kcal_key
  FROM public.select_sovereign_template(
    'gain_muscle', 2800, 'male', 'active',
    ARRAY[]::text[], ARRAY[]::text[]
  )
  UNION ALL
  SELECT 'T4_bariatrica', template_title, best_kcal_key
  FROM public.select_sovereign_template(
    'lose_weight', 1200, 'female', 'sedentary',
    ARRAY[]::text[], ARRAY['bariatrica']::text[]
  )
  UNION ALL
  SELECT 'T5_sem_peixe', template_title, best_kcal_key
  FROM public.select_sovereign_template(
    'lose_weight', 1500, 'female', 'light',
    ARRAY['sem_peixe']::text[], ARRAY[]::text[]
  )
) t ORDER BY teste;
