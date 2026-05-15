-- physical_assessments
ALTER TABLE public.physical_assessments RENAME COLUMN calories_target TO meta_calorias;
ALTER TABLE public.physical_assessments RENAME COLUMN protein_target TO meta_proteinas;
ALTER TABLE public.physical_assessments RENAME COLUMN carbs_target TO meta_carboidratos;
ALTER TABLE public.physical_assessments RENAME COLUMN fat_target TO meta_gorduras;
