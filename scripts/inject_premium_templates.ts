
import { seedPremiumV3Templates } from "./src/lib/seedV3Templates";

async function main() {
  console.log("🚀 Starting Premium V3 Template Injection...");
  const success = await seedPremiumV3Templates();
  if (success) {
    console.log("✅ Templates V3 Premium successfully injected!");
  } else {
    console.log("❌ Failed to inject templates.");
    process.exit(1);
  }
}

main();
