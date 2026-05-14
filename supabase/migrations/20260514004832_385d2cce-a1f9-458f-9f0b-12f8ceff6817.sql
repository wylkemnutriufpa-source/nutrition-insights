-- Add cluster_slug to v3_library_items
ALTER TABLE public.v3_library_items ADD COLUMN IF NOT EXISTS cluster_slug TEXT;

-- Update existing items with coherent clusters
UPDATE public.v3_library_items SET cluster_slug = 'cafe_tradicional' WHERE slug = 'pao-com-ovo';
UPDATE public.v3_library_items SET cluster_slug = 'almoco_tradicional' WHERE slug = 'frango-com-arroz';
UPDATE public.v3_library_items SET cluster_slug = 'lanche_pratico' WHERE slug = 'iogurte-com-frutas';
UPDATE public.v3_library_items SET cluster_slug = 'cafe_proteico' WHERE slug = 'omelete-de-queijo';
UPDATE public.v3_library_items SET cluster_slug = 'lanche_leve' WHERE slug = 'salada-verde-livre';
