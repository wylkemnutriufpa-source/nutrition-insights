
CREATE OR REPLACE FUNCTION public.get_nutritionist_patients_plan_audit()
RETURNS TABLE (
  patient_id uuid,
  patient_name text,
  published_count int,
  approved_count int,
  draft_count int,
  total_plans int,
  latest_plan_id uuid,
  latest_plan_status text,
  latest_validation_status text,
  latest_updated_at timestamptz,
  audit_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_patients AS (
    SELECT DISTINCT np.patient_id
    FROM public.nutritionist_patients np
    WHERE np.nutritionist_id = auth.uid()
  ),
  plan_agg AS (
    SELECT
      mp.patient_id,
      COUNT(*) FILTER (WHERE mp.plan_status = 'published_to_patient')::int AS pub,
      COUNT(*) FILTER (WHERE mp.plan_status = 'approved')::int AS appr,
      COUNT(*) FILTER (WHERE mp.plan_status IN ('draft','draft_auto_generated','draft_auto_corrected'))::int AS dr,
      COUNT(*)::int AS tot
    FROM public.meal_plans mp
    WHERE mp.patient_id IN (SELECT patient_id FROM my_patients)
    GROUP BY mp.patient_id
  ),
  latest_plan AS (
    SELECT DISTINCT ON (mp.patient_id)
      mp.patient_id,
      mp.id,
      mp.plan_status,
      mp.overall_validation_status,
      mp.updated_at
    FROM public.meal_plans mp
    WHERE mp.patient_id IN (SELECT patient_id FROM my_patients)
    ORDER BY mp.patient_id, mp.updated_at DESC NULLS LAST
  )
  SELECT
    mp_p.patient_id,
    pr.full_name AS patient_name,
    COALESCE(pa.pub, 0),
    COALESCE(pa.appr, 0),
    COALESCE(pa.dr, 0),
    COALESCE(pa.tot, 0),
    lp.id AS latest_plan_id,
    lp.plan_status AS latest_plan_status,
    lp.overall_validation_status AS latest_validation_status,
    lp.updated_at AS latest_updated_at,
    CASE
      WHEN COALESCE(pa.pub, 0) > 0 THEN 'OK_PUBLICADO'
      WHEN COALESCE(pa.appr, 0) > 0 THEN 'APROVADO_NAO_PUBLICADO'
      WHEN COALESCE(pa.dr, 0) > 0 THEN 'SO_RASCUNHO'
      ELSE 'SEM_PLANO'
    END AS audit_status
  FROM my_patients mp_p
  LEFT JOIN public.profiles pr ON pr.user_id = mp_p.patient_id
  LEFT JOIN plan_agg pa ON pa.patient_id = mp_p.patient_id
  LEFT JOIN latest_plan lp ON lp.patient_id = mp_p.patient_id
  ORDER BY 
    CASE
      WHEN COALESCE(pa.pub, 0) > 0 THEN 3
      WHEN COALESCE(pa.appr, 0) > 0 THEN 1
      WHEN COALESCE(pa.dr, 0) > 0 THEN 2
      ELSE 4
    END,
    pr.full_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_nutritionist_patients_plan_audit() TO authenticated;
