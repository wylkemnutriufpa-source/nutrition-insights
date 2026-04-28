#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { execSync } from "node:child_process";
import { generateSnapshotData } from "./generate-schema-snapshot.mjs";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const snapshotPath = path.join(projectRoot, "src", "integrations", "supabase", "schema-snapshot.json");
const migrationsDir = path.join(projectRoot, "supabase", "migrations");

// Check environments
const IS_CI = !!process.env.CI || !!process.env.GITHUB_ACTIONS;
const IS_DEV = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
const IS_PROD = process.env.NODE_ENV === "production";

console.log("Checking schema snapshot consistency...");

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

let hasDiff = false;
const diffResults = [];

// Compare tables and columns
const allTables = new Set([...Object.keys(current.tables || {}), ...Object.keys(fresh.tables || {})]);

for (const table of allTables) {
  const currentCols = current.tables?.[table] || [];
  const freshCols = fresh.tables?.[table] || [];
  
  const missingInSnapshot = freshCols.filter(c => !currentCols.includes(c));
  const extraInSnapshot = currentCols.filter(c => !freshCols.includes(c));
  
  if (missingInSnapshot.length > 0 || extraInSnapshot.length > 0) {
    hasDiff = true;
    if (missingInSnapshot.length > 0) {
      diffResults.push({
        table,
        type: "MISSING_IN_SNAPSHOT",
        columns: missingInSnapshot.join(", "),
        instruction: "Update snapshot to include new columns"
      });
    }
    if (extraInSnapshot.length > 0) {
      diffResults.push({
        table,
        type: "EXTRA_IN_SNAPSHOT",
        columns: extraInSnapshot.join(", "),
        instruction: "Update snapshot to remove deleted columns"
      });
    }
  }
}

// Check for missing migration files even if schema matches (e.g. data only migrations or migrations that don't affect tracked tables)
if (lastSnapshotMigration !== lastActualMigration) {
  hasDiff = true;
}

if (hasDiff) {
  console.error("\n✗ SCHEMA SNAPSHOT OUTDATED!");

  // Find range of missing migrations
  const startIndex = lastSnapshotMigration ? migrations.indexOf(lastSnapshotMigration) + 1 : 0;
  const missingMigrations = migrations.slice(startIndex);

  if (missingMigrations.length > 0) {
    const range = `${missingMigrations[0].split("_")[0]} → ${missingMigrations[missingMigrations.length - 1].split("_")[0]}`;
    console.error(`\nMissing migrations: ${range}`);
    console.error(`Last applied: ${lastSnapshotMigration || "None"}`);
    console.error(`Current expected: ${lastActualMigration}`);
  }

  if (diffResults.length > 0) {
    console.table(diffResults);
  }

  // Generate diff artifact for CI
  const diffFile = path.join(projectRoot, "schema.diff");
  const diffContent = `
Snapshot Outdated Diff
=====================
Last Snapshot Migration: ${lastSnapshotMigration}
Last Actual Migration: ${lastActualMigration}

Schema Diffs:
${JSON.stringify(diffResults, null, 2)}
  `.trim();
  fs.writeFileSync(diffFile, diffContent);
  console.log(`\nArtifact generated: ${diffFile}`);

  // Auto-update logic
  if ((IS_DEV || IS_CI) && !IS_PROD) {
    console.log("\nAuto-updating snapshot (Dev/CI mode)...");
    try {
      execSync("npm run schema:update", { stdio: "inherit" });
      console.log("✓ Snapshot updated successfully.");
      
      // If CI, we still want to fail to force the user to commit the snapshot
      if (IS_CI) {
        console.error("\nFAILING CI: Snapshot was updated automatically but MUST be committed to the repository.");
        console.error("Please run 'npm run schema:update' locally and commit the changes.");
        process.exit(1);
      }
      
      process.exit(0);
    } catch (error) {
      console.error("Failed to auto-update snapshot:", error.message);
      process.exit(1);
    }
  }

  console.error("\nExecute: npm run schema:update\n");
  process.exit(1);
} else {
  console.log("✓ Schema snapshot is up to date.");
  process.exit(0);
}
