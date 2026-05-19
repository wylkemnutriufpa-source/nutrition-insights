import { supabase } from "./src/integrations/supabase/client";

async function testApplyTemplate() {
  const patientId = "85a64e6a-db29-46e2-8a2c-c743496a0ffb"; // Silvia Luz
  const nutritionistId = "67f47696-a778-4ada-9ff9-9615fb7a7c48"; // Likely nutritionist ID
  
  console.log("Checking Silvia Luz relationship...");
  const { data: np } = await supabase
    .from("nutritionist_patients")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();
    
  console.log("Relationship:", np);
  
  console.log("Fetching templates...");
  const { data: v3Templates } = await supabase.from("v3_diet_templates").select("*");
  console.log("V3 Templates found:", v3Templates?.length);
  
  const { data: v2Templates } = await supabase.from("diet_templates").select("*").eq("is_active", true);
  console.log("V2 Templates found:", v2Templates?.length);
}

testApplyTemplate();
