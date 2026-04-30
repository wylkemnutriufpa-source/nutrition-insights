#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const diffFile = path.join(projectRoot, "schema.diff");

console.log("Checking schema.diff consistency...");

// Run verify first to determine if schema is consistent
let verifyPassed = false;
try {
  execSync("node scripts/verify-snapshot.mjs", { 
    stdio: "pipe", 
    env: { ...process.env, SKIP_AUTO_UPDATE: "true" },
    cwd: projectRoot
  });
  verifyPassed = true;
} catch (error) {
  verifyPassed = false;
}

if (verifyPassed) {
  // Schema is consistent — diff file should NOT exist (or is irrelevant)
  console.log("✓ Schema consistent. No diff needed.");
  process.exit(0);
}

// Schema is inconsistent — diff file MUST exist
if (!fs.existsSync(diffFile)) {
  console.error("\n✗ schema.diff inválido ou ausente.");
  console.error("Execute:\nnpm run schema:verify");
  process.exit(1);
}

console.error("\n✗ Schema inconsistente detectado.");
console.error("Revise schema.diff e execute:\nnpm run schema:update");
process.exit(1);
