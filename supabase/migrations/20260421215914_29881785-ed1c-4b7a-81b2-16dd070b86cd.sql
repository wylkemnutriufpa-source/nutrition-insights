-- Create a function to notify professionals when a patient requires medical review
CREATE OR REPLACE FUNCTION public.notify_medical_review_required()
RETURNS TRIGGER AS $$
DECLARE
    professional_record RECORD;
BEGIN
    -- Only notify if requires_medical_review is true and it was either newly inserted or changed from false
    IF (NEW.requires_medical_review = true AND (TG_OP = 'INSERT' OR OLD.requires_medical_review = false)) THEN
        -- Find all professionals linked to this patient
        FOR professional_record IN 
            SELECT professional_id 
            FROM public.patient_professional_links 
            WHERE patient_id = NEW.patient_id AND status = 'active'
            UNION
            SELECT nutritionist_id as professional_id
            FROM public.nutritionist_patients
            WHERE patient_id = NEW.patient_id AND status = 'active'
        LOOP
            -- Insert notification for each professional
            INSERT INTO public.notifications (
                user_id,
                title,
                message,
                type,
                metadata
            ) VALUES (
                professional_record.professional_id,
                '⚠️ Revisão Médica Requerida',
                'Um aluno respondeu positivamente à triagem PAR-Q e requer sua atenção antes de iniciar treinos intensos.',
                'clinical_alert',
                jsonb_build_object(
                    'patient_id', NEW.patient_id,
                    'assessment_id', NEW.id,
                    'source', 'trainer_assessment'
                )
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on trainer_assessments
DROP TRIGGER IF EXISTS trigger_notify_medical_review ON public.trainer_assessments;
CREATE TRIGGER trigger_notify_medical_review
AFTER INSERT OR UPDATE ON public.trainer_assessments
FOR EACH ROW
EXECUTE FUNCTION public.notify_medical_review_required();
