-- 1. Adicionar coluna de controle no profile (Blindagem de Continuidade)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_anamnesis_completed BOOLEAN DEFAULT false;

-- 2. Função de reconciliação mestre
CREATE OR REPLACE FUNCTION public.fn_reconcile_journey_on_anamnesis()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a anamnese foi concluída
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
        -- Atualiza o perfil
        UPDATE public.profiles 
           SET is_anamnesis_completed = true 
         WHERE user_id = NEW.user_id;

        -- Atualiza o vínculo do nutricionista para evitar loops
        UPDATE public.nutritionist_patients 
           SET journey_status = 'onboarding_completed'
         WHERE patient_id = NEW.user_id 
           AND status = 'active'
           AND journey_status IN ('lead_created', 'awaiting_consent', 'onboarding_active');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger na tabela de anamnese
DROP TRIGGER IF EXISTS trg_reconcile_journey_on_anamnesis ON public.patient_anamnesis;
CREATE TRIGGER trg_reconcile_journey_on_anamnesis
AFTER INSERT OR UPDATE ON public.patient_anamnesis
FOR EACH ROW
EXECUTE FUNCTION public.fn_reconcile_journey_on_anamnesis();

-- 4. Backup: Garantir que quem já concluiu anamnese tenha o flag no profile
UPDATE public.profiles p
   SET is_anamnesis_completed = true
  FROM public.patient_anamnesis a
 WHERE a.user_id = p.user_id
   AND a.status = 'completed';
