-- Adiciona coluna unique_code se não existir em invitations
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'invitations' AND column_name = 'unique_code') THEN
        ALTER TABLE public.invitations ADD COLUMN unique_code TEXT UNIQUE;
        
        -- Preenche com um valor aleatório para registros existentes (apenas para não quebrar a restrição UNIQUE se formos aplicar depois)
        UPDATE public.invitations SET unique_code = SUBSTR(MD5(id::text), 1, 8) WHERE unique_code IS NULL;
    END IF;
END $$;

-- Garante que unique_code tenha um índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_invitations_unique_code ON public.invitations(unique_code);

-- Adiciona coluna unique_code se não existir em onboarding_tokens (que parece ser a tabela de 'links de onboarding')
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'onboarding_tokens' AND column_name = 'unique_code') THEN
        ALTER TABLE public.onboarding_tokens ADD COLUMN unique_code TEXT UNIQUE;
        
        -- Preenche registros existentes
        UPDATE public.onboarding_tokens SET unique_code = SUBSTR(MD5(id::text), 1, 8) WHERE unique_code IS NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_unique_code ON public.onboarding_tokens(unique_code);
