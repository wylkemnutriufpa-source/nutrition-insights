
-- Step 1: Deactivate all mismatched trigger map entries
UPDATE anamnese_trigger_map SET is_active = false WHERE question_key IN (
  'anxiety_level', 'bowel_frequency', 'caffeine_cups', 'diet_history',
  'digestive_conditions', 'eating_triggers', 'iron_status', 'meal_regularity',
  'metabolic_conditions', 'morning_fatigue', 'stress_level', 'sugar_craving_frequency',
  'sun_exposure_minutes', 'training_frequency', 'training_type', 'vitamin_d_status',
  'binge_episodes', 'dehydration_signs'
);

-- Step 2: Insert new triggers matching actual frontend keys
-- Base question keys
INSERT INTO anamnese_trigger_map (question_key, answer_condition, generated_flag, priority, is_active) VALUES
  ('exercise_type', '{"operator": "includes", "value": "weight_training"}', 'strength_training_active', 3, true),
  ('exercise_type', '{"operator": "includes", "value": "none"}', 'low_training_frequency', 4, true),
  ('hunger_compulsion', '{"operator": "equals", "value": "always"}', 'binge_eating_risk', 1, true),
  ('hunger_compulsion', '{"operator": "equals", "value": "frequent"}', 'emotional_eating_pattern', 2, true),
  ('digestion', '{"operator": "equals", "value": "very_bad"}', 'has_gastritis', 2, true),
  ('digestion', '{"operator": "equals", "value": "irregular"}', 'has_constipation', 3, true),
  ('energy_level', '{"operator": "equals", "value": "very_low"}', 'suspected_vitamin_d_deficiency', 3, true),
  ('energy_level', '{"operator": "equals", "value": "low"}', 'wakes_tired', 4, true),
  ('health_conditions', '{"operator": "includes", "value": "diabetes"}', 'suspected_insulin_resistance', 2, true),
  ('feeling', '{"operator": "equals", "value": "terrible"}', 'high_stress_level', 3, true),
  ('activity_level', '{"operator": "equals", "value": "sedentary"}', 'disorganized_routine', 3, true),
  -- Adaptive block keys
  ('bowel_regularity', '{"operator": "equals", "value": "constipated"}', 'has_constipation', 3, true),
  ('digestive_triggers', '{"operator": "includes", "value": "lactose"}', 'lactose_intolerance', 2, true),
  ('digestive_frequency', '{"operator": "equals", "value": "daily"}', 'has_reflux', 2, true),
  ('sun_exposure', '{"operator": "equals", "value": "minimal"}', 'low_sun_exposure', 4, true),
  ('iron_symptoms', '{"operator": "equals", "value": "multiple"}', 'suspected_iron_deficiency', 2, true),
  ('emotional_eating', '{"operator": "equals", "value": "frequently"}', 'anxiety_eating', 3, true),
  ('binge_episodes', '{"operator": "equals", "value": "weekly"}', 'binge_eating_risk', 1, true),
  ('dehydration_signs', '{"operator": "includes_any", "values": ["dry_mouth", "dark_urine", "headache"]}', 'dehydration_symptoms', 4, true),
  ('sleep_hours', '{"operator": "less_than", "value": 6}', 'poor_sleep_quality', 3, true),
  ('caffeine_cutoff', '{"operator": "equals", "value": "evening"}', 'excess_caffeine', 4, true),
  ('training_frequency', '{"operator": "equals", "value": "5-6"}', 'high_intensity_training', 3, true)
ON CONFLICT DO NOTHING;
