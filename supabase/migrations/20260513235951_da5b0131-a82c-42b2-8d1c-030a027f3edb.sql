-- Tabela de Itens da Biblioteca V3
CREATE TABLE public.v3_library_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    meal_type TEXT[], -- Array para suportar múltiplos tipos (ex: lunch, dinner)
    category TEXT,
    objective_tags TEXT[],
    kcal_base DECIMAL DEFAULT 0,
    protein_base DECIMAL DEFAULT 0,
    carbs_base DECIMAL DEFAULT 0,
    fats_base DECIMAL DEFAULT 0,
    portion_mode TEXT DEFAULT 'standard', -- 'standard' ou 'free'
    substitutions_group TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Imagens (Variantes Visuais)
CREATE TABLE public.v3_library_images (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    item_slug TEXT NOT NULL REFERENCES public.v3_library_items(slug) ON DELETE CASCADE,
    image_asset TEXT NOT NULL,
    variant_index INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Aliases (Sinônimos e Correções Semânticas)
CREATE TABLE public.v3_library_aliases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    alias TEXT NOT NULL UNIQUE,
    canonical_slug TEXT NOT NULL REFERENCES public.v3_library_items(slug) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Clusters Clínicos
CREATE TABLE public.v3_clusters (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cluster_slug TEXT NOT NULL UNIQUE,
    cluster_name TEXT NOT NULL,
    meal_type TEXT[],
    objective TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Substituições Soberanas
CREATE TABLE public.v3_substitutions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    source_slug TEXT NOT NULL REFERENCES public.v3_library_items(slug) ON DELETE CASCADE,
    target_slug TEXT NOT NULL REFERENCES public.v3_library_items(slug) ON DELETE CASCADE,
    equivalence_type TEXT DEFAULT 'full', -- 'full', 'partial', 'clinical'
    meal_type TEXT,
    score INTEGER DEFAULT 100,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(source_slug, target_slug)
);

-- Enable RLS
ALTER TABLE public.v3_library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_library_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_library_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_substitutions ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública (ou autenticada conforme padrão do projeto)
CREATE POLICY "Leitura pública v3_library_items" ON public.v3_library_items FOR SELECT USING (true);
CREATE POLICY "Leitura pública v3_library_images" ON public.v3_library_images FOR SELECT USING (true);
CREATE POLICY "Leitura pública v3_library_aliases" ON public.v3_library_aliases FOR SELECT USING (true);
CREATE POLICY "Leitura pública v3_clusters" ON public.v3_clusters FOR SELECT USING (true);
CREATE POLICY "Leitura pública v3_substitutions" ON public.v3_substitutions FOR SELECT USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_v3_library_items_updated_at
    BEFORE UPDATE ON public.v3_library_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
