
import { seedPremiumV3Templates } from "../src/lib/seedV3Templates";

async function main() {
  console.log("🚀 Starting Premium V3 Template Injection...");
  try {
    const success = await seedPremiumV3Templates();
    if (success) {
      console.log("✅ Templates V3 Premium successfully injected!");
    } else {
      console.log("❌ Failed to inject templates.");
      process.exit(1);
    }
  } catch (e) {
    console.error("💥 Error during injection:", e);
    process.exit(1);
  }
}

main();
