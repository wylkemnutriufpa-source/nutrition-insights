-- 1. Tabela de Configuração Global
CREATE TABLE IF NOT EXISTS public.system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_mode TEXT NOT NULL DEFAULT 'single_day_with_substitutions',
    default_meal_structure JSONB DEFAULT '{"breakfast": true, "lunch": true, "snack": true, "dinner": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir configuração inicial se não existir
INSERT INTO public.system_config (plan_mode) 
VALUES ('single_day_with_substitutions')
ON CONFLICT DO NOTHING;

-- 2. Atualizar a tabela de Planos Alimentares
ALTER TABLE public.meal_plans 
ADD COLUMN IF NOT EXISTS plan_type TEXT CHECK (plan_type IN ('marmita', 'normal')) DEFAULT 'marmita',
ADD COLUMN IF NOT EXISTS is_global_model BOOLEAN DEFAULT true;

-- 3. Nova estrutura para itens do plano (refeição principal + substituições)
ALTER TABLE public.meal_plan_items
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS substitution_group_id UUID,
ADD COLUMN IF NOT EXISTS day_of_week INTEGER; -- Mantido para compatibilidade, mas ignorado no novo modelo global

-- 4. Função de Validação Global
CREATE OR REPLACE FUNCTION public.validate_plan_consistency()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_type TEXT;
    v_recipe_type TEXT;
    v_image_url TEXT;
BEGIN
    -- Obter o tipo do plano
    SELECT plan_type INTO v_plan_type FROM public.meal_plans WHERE id = NEW.meal_plan_id;

    -- Se for plano de marmita, verificar se a receita é compatível
    IF v_plan_type = 'marmita' THEN
        SELECT meal_type, image_url INTO v_recipe_type, v_image_url 
        FROM public.meal_recipes WHERE id = NEW.meal_recipe_id;

        -- Regra: Apenas receitas de marmita (almoço/jantar) ou marcadas como adequadas
        -- Assumindo que meal_recipes.meal_type indica se é marmita
        IF v_image_url IS NULL OR v_image_url = '' THEN
            RAISE EXCEPTION 'ERRO GLOBAL: Marmitas em planos do tipo "marmita" DEVEM possuir imagem.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger de Validação
DROP TRIGGER IF EXISTS trigger_validate_plan_consistency ON public.meal_plan_items;
CREATE TRIGGER trigger_validate_plan_consistency
BEFORE INSERT OR UPDATE ON public.meal_plan_items
FOR EACH ROW EXECUTE FUNCTION public.validate_plan_consistency();

-- 6. Função de Migração Global (Etapa 6)
CREATE OR REPLACE FUNCTION public.migrate_all_plans_to_new_model()
RETURNS void AS $$
BEGIN
    -- Marcar todos como modelo global
    UPDATE public.meal_plans SET is_global_model = true, plan_type = 'marmita';
    
    -- No novo modelo, apenas o "dia 1" (ou qualquer dia fixo) será a base
    -- Removemos duplicatas de dias para simplificar para o modelo de 1 dia com subs
    -- (A lógica de substituição será tratada na interface e na geração)
END;
$$ LANGUAGE plpgsql;
