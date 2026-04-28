#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { generateSnapshotData } from "./generate-schema-snapshot.mjs";

const startTime = Date.now();
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const snapshotPath = path.join(projectRoot, "src", "integrations", "supabase", "schema-snapshot.json");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");

function getStatus() {
  if (!fs.existsSync(snapshotPath)) {
    console.log("-----------------------------------");
    console.log("SCHEMA STATUS: OUTDATED (Missing Snapshot)");
    console.log("-----------------------------------");
    console.log("Fix:\npnpm schema:update");
    console.log("-----------------------------------");
    process.exit(1);
  }

  const current = JSON.parse(fs.readFileSync(snapshotPath, "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, ""));
  const migrations = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  const lastSnapshotMigration = current.lastMigration;
  const lastActualMigration = migrations[migrations.length - 1];
  const startIndex = lastSnapshotMigration ? migrations.indexOf(lastSnapshotMigration) + 1 : 0;
  const missingMigrations = migrations.slice(startIndex);
  
  const status = missingMigrations.length > 0 ? "OUTDATED" : "UP-TO-DATE";

  console.log("-----------------------------------");
  console.log(`SCHEMA STATUS: ${status}`);
  console.log("-----------------------------------");
  console.log("");
  console.log(`Snapshot: ${lastSnapshotMigration || "None"}`);
  console.log(`Latest:   ${lastActualMigration || "None"}`);
  console.log("");
  console.log(`Missing Count: ${missingMigrations.length}`);
  console.log("");
  
  if (missingMigrations.length > 0) {
    console.log("Missing:");
    missingMigrations.forEach(m => console.log(`- ${m}`));
    console.log("");
  }

  console.log("-----------------------------------");
  if (status === "OUTDATED") {
    console.log("Fix:");
    console.log("pnpm schema:update");
    console.log("-----------------------------------");
    process.exit(1);
  }
}

getStatus();
