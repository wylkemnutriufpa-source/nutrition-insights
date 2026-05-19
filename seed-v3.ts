
import { seedPremiumV3Templates } from "./src/lib/seedV3Templates";

async function run() {
  console.log("Starting seeding...");
  const success = await seedPremiumV3Templates();
  console.log("Seeding finished. Success:", success);
  process.exit(success ? 0 : 1);
}

run();
