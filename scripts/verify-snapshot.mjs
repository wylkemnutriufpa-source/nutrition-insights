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
const IS_CI = !!process.env.CI || !!process.env.GITHUB_ACTIONS || !!process.env.VERCEL;
const IS_DEV = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

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

// Check for missing migration files
if (lastSnapshotMigration !== lastActualMigration) {
  hasDiff = true;
}

if (hasDiff) {
  console.error("\n✗ SCHEMA SNAPSHOT OUTDATED!");

  // Find missing migrations
  const startIndex = lastSnapshotMigration ? migrations.indexOf(lastSnapshotMigration) + 1 : 0;
  const missingMigrations = migrations.slice(startIndex);

  if (missingMigrations.length > 0) {
    console.error(`\nMigrations faltantes:`);
    missingMigrations.forEach(m => console.error(`- ${m}`));
    console.error(`\nÚltimo aplicado: ${lastSnapshotMigration || "Nenhum"}`);
    console.error(`Último disponível: ${lastActualMigration}`);
  }

  if (diffResults.length > 0) {
    console.table(diffResults);
  }

  // Generate diff artifact
  const diffFile = path.join(projectRoot, "schema.diff");
  const diffContent = JSON.stringify({
    lastSnapshotMigration,
    lastActualMigration,
    missingMigrations,
    diffResults
  }, null, 2);
  fs.writeFileSync(diffFile, diffContent);
  console.log(`\nArtifact generated: ${diffFile}`);

  // Auto-update logic (ONLY DEV)
  if (IS_DEV && !IS_CI) {
    console.log("\nAmbiente local detectado. Executando auto-update...");
    try {
      execSync("pnpm schema:update", { stdio: "inherit" });
      console.log("✓ Snapshot atualizado automaticamente.");
      process.exit(0);
    } catch (error) {
      console.error("Erro ao atualizar snapshot:", error.message);
      process.exit(1);
    }
  }

  // NO CI: FAIL HARD
  if (IS_CI) {
    console.error("\n[CI FAIL] Snapshot inconsistente detectado no CI.");
    console.error("Não é permitido atualizar o snapshot no CI.");
    console.error("Execute 'pnpm schema:update' localmente e realize o commit do arquivo 'schema-snapshot.json'.");
    process.exit(1);
  }

  console.error("\nExecute: pnpm schema:update\n");
  process.exit(1);
} else {
  console.log("✓ Schema snapshot is up to date.");
  process.exit(0);
}
