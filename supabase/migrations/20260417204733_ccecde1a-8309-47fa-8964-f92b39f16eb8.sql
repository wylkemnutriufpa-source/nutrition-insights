-- 1. Criar vínculo de tenant faltante (nutricionista identificado pelo meal_plan)
INSERT INTO public.user_tenants (user_id, tenant_id, role)
VALUES (
  'fe72f66d-98e4-4504-b150-02ea49211983',
  '20081963-8db9-4a6c-8181-6a820b86e12f',
  'patient'
)
ON CONFLICT DO NOTHING;

-- 2. Rodar fix definitivo
DO $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.fix_patient_integrity_v2('fe72f66d-98e4-4504-b150-02ea49211983'::uuid);

  INSERT INTO public.runtime_patient_fixes (patient_id, status, issues, actions, context)
  VALUES (
    'fe72f66d-98e4-4504-b150-02ea49211983',
    COALESCE(v_result->>'status','error'),
    jsonb_build_array('orphan_patient_manual_fix'),
    v_result,
    'manual_fix_dilcilene_2026_04_17'
  );

  RAISE NOTICE 'Dilcilene fix result: %', v_result;
END $$;