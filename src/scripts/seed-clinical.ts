
import { deployClinicalLibrary, runClinicalAudit } from "../lib/clinicalDataEngine";

async function main() {
  console.log("Starting Clinical Library Build...");
  runClinicalAudit();
  const success = await deployClinicalLibrary();
  console.log("Process finished.");
}

main().catch(console.error);
