-- Reparo de snapshots já salvos com quantity_display placeholder "1 g"
-- Substitui pelo clinical_mass_g real (ou 100g default) sem alterar nenhum macro.
CREATE OR REPLACE FUNCTION public.repair_quantity_display_in_snapshot(snap jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  result jsonb := snap;
  day_idx int;
  meal_idx int;
  item_idx int;
  sub_idx int;
  qd text;
  cm numeric;
  new_qd text;
  days jsonb;
  meals jsonb;
  items jsonb;
  subs jsonb;
BEGIN
  IF snap IS NULL OR snap->'days' IS NULL THEN RETURN snap; END IF;
  days := snap->'days';
  FOR day_idx IN 0..jsonb_array_length(days)-1 LOOP
    meals := days->day_idx->'meals';
    IF meals IS NULL THEN CONTINUE; END IF;
    FOR meal_idx IN 0..jsonb_array_length(meals)-1 LOOP
      items := meals->meal_idx->'items';
      IF items IS NULL THEN CONTINUE; END IF;
      FOR item_idx IN 0..jsonb_array_length(items)-1 LOOP
        qd := items->item_idx->>'quantity_display';
        cm := NULLIF(items->item_idx->>'clinical_mass_g','')::numeric;
        IF qd IS NULL OR qd = '' OR qd ~* '^1\s*g?$' THEN
          new_qd := COALESCE(CASE WHEN cm > 1 THEN round(cm)::text || ' g' END, '100 g');
          result := jsonb_set(result, ARRAY['days', day_idx::text, 'meals', meal_idx::text, 'items', item_idx::text, 'quantity_display'], to_jsonb(new_qd));
        END IF;
        subs := items->item_idx->'substitutions';
        IF subs IS NOT NULL THEN
          FOR sub_idx IN 0..jsonb_array_length(subs)-1 LOOP
            qd := subs->sub_idx->>'quantity_display';
            cm := NULLIF(subs->sub_idx->>'clinical_mass_g','')::numeric;
            IF qd IS NULL OR qd = '' OR qd ~* '^1\s*g?$' THEN
              new_qd := COALESCE(CASE WHEN cm > 1 THEN round(cm)::text || ' g' END, '100 g');
              result := jsonb_set(result, ARRAY['days', day_idx::text, 'meals', meal_idx::text, 'items', item_idx::text, 'substitutions', sub_idx::text, 'quantity_display'], to_jsonb(new_qd));
            END IF;
          END LOOP;
          -- refresh items snapshot
          items := result->'days'->day_idx->'meals'->meal_idx->'items';
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  RETURN result;
END $$;

UPDATE public.meal_plans
SET snapshot = public.repair_quantity_display_in_snapshot(snapshot)
WHERE snapshot::text ~* '"1\s*g?"';

DROP FUNCTION public.repair_quantity_display_in_snapshot(jsonb);