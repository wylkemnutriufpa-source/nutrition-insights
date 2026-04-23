-- Adicionar colunas de inteligência clínica na tabela de planos se não existirem
ALTER TABLE public.meal_plans 
ADD COLUMN IF NOT EXISTS clinical_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_alerts JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS clinical_status TEXT DEFAULT 'pending_evaluation';

-- Função para calcular o score e validar a qualidade clínica
CREATE OR REPLACE FUNCTION public.validate_clinical_quality(p_plan_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_calories FLOAT := 0;
    v_total_protein FLOAT := 0;
    v_meal_data RECORD;
    v_alerts JSONB := '[]'::jsonb;
    v_score INTEGER := 100;
    v_meal_count INTEGER := 0;
    v_subst_issues INTEGER := 0;
BEGIN
    -- 1. Obter totais do plano a partir dos itens (meals)
    SELECT 
        COALESCE(SUM(calories), 0),
        COALESCE(SUM(protein), 0),
        COUNT(*)
    INTO v_total_calories, v_total_protein, v_meal_count
    FROM public.meal_plan_items
    WHERE plan_id = p_plan_id;

    IF v_meal_count = 0 THEN
        RETURN jsonb_build_object('score', 0, 'alerts', '["Plano sem refeições"]'::jsonb);
    END IF;

    -- 2. Validar Distribuição por Refeição
    FOR v_meal_data IN 
        SELECT name, calories, protein 
        FROM public.meal_plan_items 
        WHERE plan_id = p_plan_id
    LOOP
        -- Distribuição de Proteína (Alerta se > 40% do total em uma única refeição)
        IF v_total_protein > 0 THEN
            IF (v_meal_data.protein / v_total_protein) > 0.4 THEN
                v_alerts := v_alerts || jsonb_build_array('Concentração excessiva de proteína no ' || v_meal_data.name);
                v_score := v_score - 15;
            END IF;
        END IF;

        -- Coerência Calórica (Café 15-35%, Almoço 25-45%)
        IF v_total_calories > 0 THEN
            IF v_meal_data.name ILIKE '%café%' OR v_meal_data.name ILIKE '%desjejum%' THEN
                IF (v_meal_data.calories / v_total_calories) NOT BETWEEN 0.15 AND 0.35 THEN
                    v_alerts := v_alerts || jsonb_build_array('Distribuição calórica do café da manhã fora do padrão sugerido');
                    v_score := v_score - 5;
                END IF;
            ELSIF v_meal_data.name ILIKE '%almoço%' THEN
                IF (v_meal_data.calories / v_total_calories) NOT BETWEEN 0.25 AND 0.45 THEN
                    v_alerts := v_alerts || jsonb_build_array('Almoço com densidade calórica atípica');
                    v_score := v_score - 10;
                END IF;
            END IF;
        END IF;
    END LOOP;

    -- 3. Validar Substituições (Margem de 5%)
    -- Nota: Verificamos substituições vinculadas aos itens do plano
    SELECT COUNT(*) INTO v_subst_issues
    FROM public.meal_plan_substitutions s
    JOIN public.meal_plan_items i ON s.meal_plan_item_id = i.id
    WHERE i.plan_id = p_plan_id
    AND (
        ABS(s.calories - i.calories) / NULLIF(i.calories, 0) > 0.05 OR
        ABS(s.protein - i.protein) / NULLIF(i.protein, 0) > 0.05
    );

    IF v_subst_issues > 0 THEN
        v_alerts := v_alerts || jsonb_build_array(v_subst_issues || ' substituição(ões) com variação de macros superior a 5%');
        v_score := v_score - (v_subst_issues * 5);
    END IF;

    -- Ajuste final do score
    v_score := GREATEST(0, LEAST(100, v_score));

    -- Atualizar o plano com os resultados
    UPDATE public.meal_plans
    SET 
        clinical_score = v_score,
        quality_alerts = v_alerts,
        clinical_status = CASE 
            WHEN v_score >= 90 THEN 'excellent'
            WHEN v_score >= 70 THEN 'good'
            ELSE 'suboptimal'
        END
    WHERE id = p_plan_id;

    -- Log na auditoria se existir a tabela
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clinical_plan_audit_logs') THEN
        INSERT INTO public.clinical_plan_audit_logs (
            plan_id,
            validation_status,
            issues
        ) VALUES (
            p_plan_id,
            CASE WHEN v_score >= 70 THEN 'passed' ELSE 'warning' END,
            v_alerts
        );
    END IF;

    RETURN jsonb_build_object('score', v_score, 'alerts', v_alerts);
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar qualidade sempre que o plano for publicado
CREATE OR REPLACE FUNCTION public.trigger_validate_quality()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.validate_clinical_quality(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_plan_quality_update ON public.meal_plans;
CREATE TRIGGER on_plan_quality_update
AFTER UPDATE OF plan_status ON public.meal_plans
FOR EACH ROW
WHEN (NEW.plan_status = 'published')
EXECUTE FUNCTION public.trigger_validate_quality();
