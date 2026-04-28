#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { generateSnapshotData } from "./generate-schema-snapshot.mjs";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const snapshotPath = path.join(projectRoot, "src", "integrations", "supabase", "schema-snapshot.json");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");

console.log("Checking schema status...");

if (!fs.existsSync(snapshotPath)) {
  console.error("✗ Snapshot file missing!");
  process.exit(1);
}

const currentRaw = fs.readFileSync(snapshotPath, "utf8");
const current = JSON.parse(currentRaw.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, ""));
const fresh = generateSnapshotData();

const migrations = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith(".sql"))
  .sort();

const lastSnapshotMigration = current.lastMigration;
const lastActualMigration = migrations[migrations.length - 1];

const isOutdated = lastSnapshotMigration !== lastActualMigration;

console.log(`\nStatus: ${isOutdated ? "OUTDATED" : "OK"}`);
console.log(`Snapshot: ${lastSnapshotMigration || "Nenhum"}`);
console.log(`Latest:   ${lastActualMigration || "Nenhum"}`);

if (isOutdated) {
  const startIndex = lastSnapshotMigration ? migrations.indexOf(lastSnapshotMigration) + 1 : 0;
  const missingMigrations = migrations.slice(startIndex);
  
  console.log("\nMissing:");
  missingMigrations.forEach(m => console.log(`- ${m}`));
  
  console.log("\nFix:");
  console.log("pnpm schema:update");
  process.exit(1);
}

process.exit(0);
