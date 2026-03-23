-- Backfill: Move low_carb from restrictions to dietary_strategy in patient_anamnesis
-- This updates the JSONB answers field for all existing anamnesis records

UPDATE patient_anamnesis
SET answers = jsonb_set(
  jsonb_set(
    answers,
    '{restrictions}',
    COALESCE(
      (SELECT jsonb_agg(elem)
       FROM jsonb_array_elements_text(answers->'restrictions') AS elem
       WHERE elem != 'low_carb'),
      '[]'::jsonb
    )
  ),
  '{dietary_strategy}',
  CASE
    WHEN answers->'restrictions' @> '"low_carb"'::jsonb
    THEN COALESCE(answers->'dietary_strategy', '[]'::jsonb) || '"low_carb"'::jsonb
    ELSE COALESCE(answers->'dietary_strategy', '[]'::jsonb)
  END
)
WHERE answers ? 'restrictions'
  AND answers->'restrictions' @> '"low_carb"'::jsonb;