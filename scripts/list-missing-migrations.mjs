#!/usr/bin/env node
import fs from "node:fs";
import path from "node:url";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const snapshotPath = join(projectRoot, "src", "integrations", "supabase", "schema-snapshot.json");
const migrationsDir = join(projectRoot, "supabase", "migrations");

function listMissing() {
  if (!fs.existsSync(snapshotPath)) {
    console.log("Status: OUTDATED\n\nMissing: ALL (snapshot missing)\n\nCount: unknown\n\nFix:\nnpm run schema:update");
    process.exit(1);
  }

  const current = JSON.parse(fs.readFileSync(snapshotPath, "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, ""));
  const migrations = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  const lastSnapshotMigration = current.lastMigration;
  const startIndex = lastSnapshotMigration ? migrations.indexOf(lastSnapshotMigration) + 1 : 0;
  const missingMigrations = migrations.slice(startIndex);

  if (missingMigrations.length === 0) {
    console.log("Status: UP-TO-DATE\n\nMissing: NONE\n\nCount: 0");
    process.exit(0);
  }

  console.log("Status: OUTDATED\n");
  console.log("Missing:");
  missingMigrations.forEach(m => console.log(`- ${m}`));
  console.log(`\nCount: ${missingMigrations.length}`);
  console.log("\nFix:\nnpm run schema:update");
  process.exit(1);
}

listMissing();
