UPDATE profiles 
SET fit_intelligence_enabled = true 
WHERE user_id IN (
  SELECT pp.patient_id 
  FROM patient_prestige pp
  JOIN prestige_plans prp ON prp.id = pp.plan_id
  WHERE pp.is_active = true AND prp.display_order >= 4
) AND (fit_intelligence_enabled = false OR fit_intelligence_enabled IS NULL);