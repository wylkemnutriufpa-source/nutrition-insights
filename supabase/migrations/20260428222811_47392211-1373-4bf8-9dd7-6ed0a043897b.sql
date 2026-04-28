CREATE OR REPLACE FUNCTION public.sync_onboarding_pipeline_from_anamnesis()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 DECLARE
   v_weight numeric;
   v_height numeric;
 BEGIN
   -- Só processa se a anamnese foi marcada como completa
   IF NEW.user_id IS NULL OR COALESCE(NEW.status, '') <> 'completed' THEN
     RETURN NEW;
   END IF;

   -- Extração segura de peso/altura para o pipeline
   IF COALESCE(NEW.answers->>'weight', '') ~ '^[0-9]+([.,][0-9]+)?$' THEN
     v_weight := REPLACE(NEW.answers->>'weight', ',', '.')::numeric;
   END IF;

   IF COALESCE(NEW.answers->>'height', '') ~ '^[0-9]+([.,][0-9]+)?$' THEN
     v_height := REPLACE(NEW.answers->>'height', ',', '.')::numeric;
   END IF;

   -- 1. Atualiza o pipeline (passo a passo)
   UPDATE public.onboarding_pipelines op
   SET anamnesis_completed = true,
       status = CASE 
         WHEN op.status = 'pending_anamnesis' THEN 'pending_body_data'
         ELSE op.status 
       END,
       weight = COALESCE(v_weight, op.weight),
       height = COALESCE(v_height, op.height),
       updated_at = now()
   WHERE op.patient_id = NEW.user_id
     AND COALESCE(op.release_status, 'released') = 'released'
     AND op.status NOT IN ('completed', 'superseded_by_published_plan');

   -- 2. HARD FIX: Transição automática journey_status -> 'active'
   -- Isso garante que o Governance permita que o paciente saia do loop de onboarding
   -- mesmo que o pipeline ainda tenha passos pendentes (eles serão sugeridos via dashboard)
   UPDATE public.nutritionist_patients
   SET journey_status = 'active',
       updated_at = now()
   WHERE patient_id = NEW.user_id
     AND status = 'active'
     AND journey_status IN ('onboarding_active', 'lead_created', 'awaiting_consent');

   RETURN NEW;
 END;
 $function$;