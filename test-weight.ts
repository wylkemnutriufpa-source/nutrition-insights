
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testWeightPrioritization(patientUserId: string) {
  console.log(`Testing weight prioritization for ${patientUserId}...`);

  // 1. Fetch Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, user_id, current_weight_kg')
    .eq('user_id', patientUserId)
    .single();

  // 2. Fetch Weight History
  const { data: weightHistory } = await supabase
    .from('patient_weight_history')
    .select('weight, measurement_date')
    .eq('patient_id', patientUserId)
    .order('measurement_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Fetch Assessment
  const { data: assessment } = await supabase
    .from('physical_assessments')
    .select('weight, assessment_date')
    .eq('patient_id', patientUserId)
    .order('assessment_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('Profile weight:', profile?.current_weight_kg);
  console.log('Weight history:', weightHistory);
  console.log('Assessment weight:', assessment?.weight);

  let weight = Number(profile?.current_weight_kg || 0);
  let source = 'profile';

  if (weight <= 0) {
    if (weightHistory?.weight) {
      weight = Number(weightHistory.weight);
      source = 'weight_history';
    } else if (assessment?.weight) {
      weight = Number(assessment.weight);
      source = 'assessment';
    } else {
      weight = 70;
      source = 'fallback';
    }
  }

  console.log(`Final weight: ${weight}kg (Source: ${source})`);
}

testWeightPrioritization('96631b8f-d02d-4fba-8605-6f59db22f3f6');
