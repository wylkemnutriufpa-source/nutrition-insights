
import { seedPremiumV3Templates } from "./src/lib/seedV3Templates";

async function run() {
  console.log("Starting Template Compilation...");
  const success = await seedPremiumV3Templates();
  if (success) {
    console.log("Templates compiled and seeded successfully!");
  } else {
    console.error("Failed to compile templates.");
    process.exit(1);
  }
}

run();
