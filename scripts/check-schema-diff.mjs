#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const diffFile = path.join(projectRoot, "schema.diff");

function checkDiff() {
  console.log("Checking schema.diff consistency...");
  
  if (!fs.existsSync(diffFile)) {
    console.error("\n✗ schema.diff inválido ou ausente.");
    console.error("Execute:\npnpm schema:verify");
    process.exit(1);
  }

  // We also run verify to ensure the diff matches current state
  try {
    // Run verify but capture output to see if it reports outdated
    // We pass an env var to verify to skip the auto-update if it were enabled
    execSync("pnpm schema:verify", { stdio: "pipe", env: { ...process.env, SKIP_AUTO_UPDATE: "true" } });
    
    // If verify passes, but diff exists, it might be an old diff from a previous failure.
    // In strict CI, we might want to ensure diff is clean, but usually if verify passes, we are good.
    console.log("✓ Schema is consistent.");
    process.exit(0);
  } catch (error) {
    console.error("\n✗ Schema inconsistente detectado.");
    console.error("schema.diff deve ser revisado.");
    console.error("Execute:\npnpm schema:update");
    process.exit(1);
  }
}

checkDiff();
