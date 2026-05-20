
DO $$
DECLARE
  v_snapshot jsonb := '{"1800": {"days": [{"day_of_week": 1, "meals": [{"id": "f239ea1a-4e83-495d-b394-af1560494742", "name": "Café da Manhã", "time": "08:00", "items": [{"id": "9550ed75-b861-4290-a5a0-2b54c5937520", "kcal": 220, "name": "Ovos Mexidos", "fat": 15, "carbs": 1, "protein": 18, "imageUrl": "https://vkrcobprntictsxqmjjl.supabase.co/storage/v1/object/public/meal-visual-library/ovo-mexido.jpg", "quantity": 1, "instanceId": "ecb84c4a-2a0d-498d-a324-a3006b5ebb3d", "clinical_mass_g": 100, "quantity_display": "3 ovos"}]}]}]}}';
BEGIN
  UPDATE v3_diet_templates SET plan_snapshot = v_snapshot, sovereign_validated = true WHERE slug = 'anti-inflamatorio-premium';
END $$;
