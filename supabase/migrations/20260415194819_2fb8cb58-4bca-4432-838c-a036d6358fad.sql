-- Fix Angela's anamnesis: has valid answers but stuck in 'draft'
UPDATE public.patient_anamnesis 
SET status = 'completed' 
WHERE id = 'ed48fcc4-68af-43d9-ab43-c26976a147d7' 
AND status = 'draft' 
AND answers IS NOT NULL;

-- Also fix any other patients with the same issue (answers exist but status = draft)
UPDATE public.patient_anamnesis 
SET status = 'completed' 
WHERE status = 'draft' 
AND answers IS NOT NULL 
AND jsonb_typeof(answers) = 'object'
AND (answers)::text != '{}'
AND (answers)::text != 'null';