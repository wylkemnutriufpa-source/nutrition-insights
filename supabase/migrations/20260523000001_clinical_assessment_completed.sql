-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FASE 3: Introduzir clinical_assessment_completed como verdade única
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ESTRATÉGIA: Camada de compatibilidade de 30 dias.
-- NÃO deletar flags antigas. Apenas adicionar a nova e migrar silenciosamente.
-- Após 30 dias: amputar legado.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Adicionar coluna nova na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS clinical_assessment_completed BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.clinical_assessment_completed IS 
'VERDADE ÚNICA: Paciente completou a avaliação clínica (anamnese). 
Substitui: onboarding_completed, intake_completed, questionnaire_completed.
Introduzido em: 23/05/2026. Legado removido após 30 dias (23/06/2026).';

-- 2. Migrar pacientes ATIVOS que já têm anamnese completa
-- (sem reset, sem invalidação — apenas sync silencioso)
UPDATE public.profiles p
SET clinical_assessment_completed = true
WHERE p.clinical_assessment_completed = false
  AND EXISTS (
    SELECT 1 
    FROM public.patient_anamnesis pa
    WHERE pa.user_id = p.user_id
      AND pa.status = 'completed'
  );

-- 3. Pacientes com plano ativo também são considerados avaliados
-- (se têm plano, passaram pela anamnese em algum momento)
UPDATE public.profiles p
SET clinical_assessment_completed = true
WHERE p.clinical_assessment_completed = false
  AND p.onboarding_completed = true;

-- 4. Criar função que é chamada quando anamnese é concluída
-- (mantém sincronizados: clinical_assessment_completed + legado por 30 dias)
CREATE OR REPLACE FUNCTION public.sync_clinical_assessment_on_anamnesis_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Quando anamnese muda para 'completed', marcar avaliação clínica completa
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    UPDATE public.profiles
    SET 
      clinical_assessment_completed = true,
      -- Camada de compatibilidade: manter onboarding_completed em sync por 30 dias
      onboarding_completed = true,
      patient_state = CASE 
        WHEN patient_state IN ('anamnesis', 'onboarding_slides', 'collecting_profile')
        THEN 'active_plan'
        ELSE patient_state
      END
    WHERE user_id = NEW.user_id;
    
    -- Sincronizar pipeline se existir
    UPDATE public.onboarding_pipelines
    SET 
      anamnesis_completed = true,
      status = CASE 
        WHEN status = 'pending_anamnesis' THEN 'completed'
        ELSE status
      END
    WHERE patient_id = NEW.user_id
      AND status NOT IN ('completed', 'superseded_by_active_plan', 'superseded_by_published_plan');
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Criar trigger na tabela patient_anamnesis
DROP TRIGGER IF EXISTS on_anamnesis_completed ON public.patient_anamnesis;
CREATE TRIGGER on_anamnesis_completed
  AFTER UPDATE ON public.patient_anamnesis
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_clinical_assessment_on_anamnesis_complete();

-- 6. Verificar resultado da migração
SELECT 
  COUNT(*) AS total_pacientes,
  COUNT(*) FILTER (WHERE clinical_assessment_completed = true) AS avaliacao_completa,
  COUNT(*) FILTER (WHERE clinical_assessment_completed = false) AS sem_avaliacao,
  COUNT(*) FILTER (WHERE onboarding_completed = true) AS onboarding_completo_legado
FROM public.profiles
WHERE user_id IS NOT NULL;
