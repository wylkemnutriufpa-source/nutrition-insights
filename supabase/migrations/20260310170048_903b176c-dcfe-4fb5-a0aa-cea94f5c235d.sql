
-- Seed 10 demo patients directly into patient_points and ranking_cache
DO $$
DECLARE
  fake_ids uuid[] := ARRAY[
    'a0000001-0000-0000-0000-000000000001'::uuid,
    'a0000001-0000-0000-0000-000000000002'::uuid,
    'a0000001-0000-0000-0000-000000000003'::uuid,
    'a0000001-0000-0000-0000-000000000004'::uuid,
    'a0000001-0000-0000-0000-000000000005'::uuid,
    'a0000001-0000-0000-0000-000000000006'::uuid,
    'a0000001-0000-0000-0000-000000000007'::uuid,
    'a0000001-0000-0000-0000-000000000008'::uuid,
    'a0000001-0000-0000-0000-000000000009'::uuid,
    'a0000001-0000-0000-0000-000000000010'::uuid
  ];
  names text[] := ARRAY[
    'AnaFit', 'BrunoStrong', 'CarlaHealth', 'DiegoShape',
    'ElenaVida', 'FelipePower', 'GabiNutri', 'HugoMeta',
    'IsaWellness', 'JoaoFoco'
  ];
  plan_slugs text[] := ARRAY[
    'elite', 'pro', 'basic', 'premium', 'pro',
    'basic', 'elite', 'basic', 'premium', 'pro'
  ];
  i int;
  uid uuid;
  action text;
  pts int;
  ts timestamptz;
  j int;
BEGIN
  FOR i IN 1..10 LOOP
    uid := fake_ids[i];

    -- Generate 20-50 random point entries over the last 30 days
    FOR j IN 1..floor(random()*30 + 20)::int LOOP
      action := (ARRAY[
        'checklist_complete', 'meal_logged', 'training_done',
        'checkin_submitted', 'recipe_saved', 'water_goal',
        'supplement_taken', 'meal_plan_followed'
      ])[floor(random()*8 + 1)::int];
      
      pts := CASE
        WHEN action = 'checklist_complete' THEN floor(random()*15 + 5)::int
        WHEN action = 'meal_logged' THEN floor(random()*10 + 5)::int
        WHEN action = 'training_done' THEN floor(random()*20 + 10)::int
        WHEN action = 'checkin_submitted' THEN floor(random()*25 + 15)::int
        WHEN action = 'recipe_saved' THEN floor(random()*5 + 3)::int
        WHEN action = 'water_goal' THEN floor(random()*8 + 2)::int
        WHEN action = 'supplement_taken' THEN floor(random()*5 + 2)::int
        ELSE floor(random()*10 + 5)::int
      END;

      ts := now() - (random() * interval '30 days');

      INSERT INTO public.patient_points (patient_id, action_key, points, earned_at, metadata)
      VALUES (uid, action, pts, ts, '{}');
    END LOOP;
  END LOOP;
END $$;

-- Populate ranking cache for the demo patients
WITH point_sums AS (
  SELECT
    patient_id,
    SUM(points) as total
  FROM public.patient_points
  WHERE patient_id IN (
    'a0000001-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000002',
    'a0000001-0000-0000-0000-000000000003',
    'a0000001-0000-0000-0000-000000000004',
    'a0000001-0000-0000-0000-000000000005',
    'a0000001-0000-0000-0000-000000000006',
    'a0000001-0000-0000-0000-000000000007',
    'a0000001-0000-0000-0000-000000000008',
    'a0000001-0000-0000-0000-000000000009',
    'a0000001-0000-0000-0000-000000000010'
  )
  GROUP BY patient_id
),
demo_info AS (
  SELECT * FROM (VALUES
    ('a0000001-0000-0000-0000-000000000001'::uuid, 'AnaFit', 'elite'),
    ('a0000001-0000-0000-0000-000000000002'::uuid, 'BrunoStrong', 'pro'),
    ('a0000001-0000-0000-0000-000000000003'::uuid, 'CarlaHealth', 'basic'),
    ('a0000001-0000-0000-0000-000000000004'::uuid, 'DiegoShape', 'premium'),
    ('a0000001-0000-0000-0000-000000000005'::uuid, 'ElenaVida', 'pro'),
    ('a0000001-0000-0000-0000-000000000006'::uuid, 'FelipePower', 'basic'),
    ('a0000001-0000-0000-0000-000000000007'::uuid, 'GabiNutri', 'elite'),
    ('a0000001-0000-0000-0000-000000000008'::uuid, 'HugoMeta', 'basic'),
    ('a0000001-0000-0000-0000-000000000009'::uuid, 'IsaWellness', 'premium'),
    ('a0000001-0000-0000-0000-000000000010'::uuid, 'JoaoFoco', 'pro')
  ) AS t(id, name, plan_slug)
)
INSERT INTO public.patient_ranking_cache (patient_id, display_name, total_points, plan_slug, plan_color, crown_enabled, badge_icon, rank_position)
SELECT
  d.id,
  d.name,
  COALESCE(ps.total, 0),
  d.plan_slug,
  pp.color,
  pp.crown_enabled,
  pp.badge_icon,
  ROW_NUMBER() OVER (ORDER BY COALESCE(ps.total, 0) DESC)
FROM demo_info d
LEFT JOIN point_sums ps ON ps.patient_id = d.id
LEFT JOIN public.prestige_plans pp ON pp.slug = d.plan_slug AND pp.is_active = true
ON CONFLICT (patient_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  total_points = EXCLUDED.total_points,
  plan_slug = EXCLUDED.plan_slug,
  plan_color = EXCLUDED.plan_color,
  crown_enabled = EXCLUDED.crown_enabled,
  badge_icon = EXCLUDED.badge_icon,
  rank_position = EXCLUDED.rank_position,
  updated_at = now();
