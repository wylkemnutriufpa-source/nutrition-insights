
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const patientId = "ef4e3fce-568f-4160-bd19-0f524f723fe5";
const nutritionistId = "67f47696-a778-4ada-9ff9-9615fb7a7c48";

console.log(`Triggering V3 generation for patient ${patientId}...`);

const startTime = Date.now();
const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
  body: {
    patientId,
    nutritionistId,
    generationMode: "smart",
    isPipeline: false
  }
});
const duration = Date.now() - startTime;

if (error) {
  console.error("Error triggering V3 generation:", error);
  Deno.exit(1);
}

console.log("V3 Generation Success!");
console.log("Execution Time:", duration, "ms");
console.log("Result:", JSON.stringify(data, null, 2));
