-- Remove ALL seed/test points data
DELETE FROM public.patient_points;

-- Clear ranking cache
DELETE FROM public.patient_ranking_cache;

-- Clear ranking snapshots
DELETE FROM public.ranking_snapshots;
