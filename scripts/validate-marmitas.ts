
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function validateMarmitas() {
  console.log("🚀 Starting Marmita Shielding Validation...");
  
  const { data: marmitas, error } = await supabase
    .from("meal_recipes")
    .select(`
      id, 
      name, 
      protein_type, 
      visual_library_item_id,
      meal_visual_library (image_url)
    `);

  if (error) {
    console.error("❌ Failed to fetch marmitas:", error);
    Deno.exit(1);
  }

  console.log(`📊 Found ${marmitas.length} marmitas to validate.`);

  const results = [];
  let totalErrors = 0;

  for (const m of marmitas) {
    const errors = [];
    
    // Check protein_type
    if (!m.protein_type) errors.push("Missing protein_type");
    
    // Check visual_library association
    if (!m.visual_library_item_id) errors.push("Missing visual_library_item_id");
    
    // Check image_url
    const imageUrl = m.meal_visual_library?.image_url;
    if (!imageUrl) {
      errors.push("Missing image_url in visual library");
    } else if (imageUrl.startsWith("http")) {
      // Validate external URL
      try {
        const resp = await fetch(imageUrl, { method: "HEAD" });
        if (!resp.ok) errors.push(`Image URL broken (${resp.status}): ${imageUrl}`);
      } catch (e) {
        errors.push(`Image URL unreachable: ${imageUrl}`);
      }
    }

    if (errors.length > 0) {
      console.error(`❌ ERROR in "${m.name}" (${m.id}):`, errors.join(", "));
      totalErrors++;
    }

    results.push({
      name: m.name,
      id: m.id,
      protein_type: m.protein_type,
      image_url: imageUrl,
      valid: errors.length === 0,
      errors
    });
  }

  console.log("\n--- VALIDATION SUMMARY ---");
  console.log(`✅ Valid: ${marmitas.length - totalErrors}`);
  console.log(`❌ Invalid: ${totalErrors}`);
  console.log("--------------------------\n");

  if (totalErrors > 0) {
    console.error("⚠️ SHIELDING FAILED: Some marmitas are broken.");
    // Deno.exit(1); // Don't exit yet, let's see the full report
  } else {
    console.log("💎 SHIELDING SUCCESS: All marmitas are compliant.");
  }
}

validateMarmitas();
